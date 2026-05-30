/**
 * Mission Control Cockpit · Atlas Desktop surface (AP-702 / Problem #3).
 *
 * Reads the canonical AAEOS cockpit snapshot from atlas-server and
 * renders six editorial panels:
 *
 *   1. Phase Tracker            — 17 canonical phases + current/next.
 *   2. Gate Report              — universal-gate status (passed / blocked / exception).
 *   3. Blockers                 — open blockers by severity and owner.
 *   4. Department Map           — count of canonical departments (11+).
 *   5. Signature Pending        — flag when autonomy >= L4 needs operator approval.
 *   6. Raw Snapshot Audit       — collapsed JSON for evidence-ledger lineage audit.
 *
 * Read-only. No mutations from this surface.
 */
import { useState, type ReactElement } from 'react'

import './mission-control.css'
import { useMissionControl } from './useMissionControl'
import type { MissionControlPhase } from './types'

interface MissionControlSurfaceProps {
  intent?: string
}

export function MissionControlSurface({ intent }: MissionControlSurfaceProps): ReactElement {
  const { snapshot, loading, error, mode, refresh } = useMissionControl(intent)
  const [auditOpen, setAuditOpen] = useState<boolean>(false)

  if (mode === 'offline') {
    return (
      <section className="mission-control-surface mission-control-surface--offline">
        <header className="mission-control-surface__header">
          <h1 className="mission-control-surface__title">Mission Control</h1>
          <span className="mission-control-surface__mode">offline</span>
        </header>
        <p className="mission-control-surface__empty">
          Atlas server URL not configured. Set <code>VITE_ATLAS_SERVER_URL</code> to connect.
        </p>
      </section>
    )
  }

  if (error && !snapshot) {
    return (
      <section className="mission-control-surface mission-control-surface--error">
        <header className="mission-control-surface__header">
          <h1 className="mission-control-surface__title">Mission Control</h1>
          <button type="button" className="mission-control-surface__refresh" onClick={() => void refresh()}>
            retry
          </button>
        </header>
        <p className="mission-control-surface__empty">
          Failed to load cockpit snapshot: {error.message}
        </p>
      </section>
    )
  }

  if (!snapshot) {
    return (
      <section className="mission-control-surface mission-control-surface--loading">
        <header className="mission-control-surface__header">
          <h1 className="mission-control-surface__title">Mission Control</h1>
          <span className="mission-control-surface__mode">{loading ? 'loading…' : mode}</span>
        </header>
      </section>
    )
  }

  const cockpit = snapshot.cockpit
  const phases: MissionControlPhase[] = Array.isArray(cockpit.phases) ? cockpit.phases : []
  const blockers = cockpit.blockers ?? []
  const gate = cockpit.gate_report ?? {}

  return (
    <section className="mission-control-surface">
      <header className="mission-control-surface__header">
        <div className="mission-control-surface__title-block">
          <h1 className="mission-control-surface__title">Mission Control</h1>
          <span className="mission-control-surface__subtitle">
            intent <code>{cockpit.intent_id}</code> · autonomy {cockpit.autonomy_level}
            {snapshot.baseline ? ' · baseline' : ''}
          </span>
        </div>
        <div className="mission-control-surface__actions">
          <span className="mission-control-surface__mode">{mode}</span>
          <button type="button" className="mission-control-surface__refresh" onClick={() => void refresh()}>
            refresh
          </button>
        </div>
      </header>

      <div className="mission-control-surface__grid">
        <article className="mission-control-panel mission-control-panel--phases">
          <h2 className="mission-control-panel__title">Phase Tracker · 17 canonical</h2>
          <p className="mission-control-panel__meta">
            current: <strong>{cockpit.current_phase ?? '—'}</strong>
            {cockpit.next_phase ? <> · next: <strong>{cockpit.next_phase}</strong></> : null}
          </p>
          <ol className="mission-control-phase-list">
            {phases.map((p, i) => (
              <li
                key={`${p.phase}-${i}`}
                className={`mission-control-phase mission-control-phase--${p.status ?? 'pending'}`}
              >
                <span className="mission-control-phase__index">{String(i + 1).padStart(2, '0')}</span>
                <span className="mission-control-phase__name">{p.phase}</span>
                <span className="mission-control-phase__status">{p.status ?? 'pending'}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="mission-control-panel mission-control-panel--gates">
          <h2 className="mission-control-panel__title">Gate Report · 15 universal</h2>
          <p className="mission-control-panel__meta">status: <strong>{String(gate.status ?? 'unknown')}</strong></p>
          <ul className="mission-control-gate-list">
            <li>passed: {gate.passed?.length ?? 0}</li>
            <li>blocked: {gate.blocked?.length ?? 0}</li>
            <li>exception: {gate.exception?.length ?? 0}</li>
          </ul>
        </article>

        <article className="mission-control-panel mission-control-panel--blockers">
          <h2 className="mission-control-panel__title">Blockers</h2>
          {blockers.length === 0 ? (
            <p className="mission-control-panel__empty">No blockers open.</p>
          ) : (
            <ul className="mission-control-blocker-list">
              {blockers.map((b) => (
                <li key={b.id} className="mission-control-blocker">
                  <span className={`mission-control-blocker__severity mission-control-blocker__severity--${b.severity}`}>
                    {b.severity}
                  </span>
                  <span className="mission-control-blocker__id">{b.id}</span>
                  <span className="mission-control-blocker__owner">{b.owner}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="mission-control-panel mission-control-panel--departments">
          <h2 className="mission-control-panel__title">Departments</h2>
          <p className="mission-control-panel__big-number">{cockpit.department_count}</p>
          <p className="mission-control-panel__meta">canonical AAEOS departments configured</p>
        </article>

        <article
          className={`mission-control-panel mission-control-panel--signature${
            cockpit.operator_signature_required ? ' mission-control-panel--alert' : ''
          }`}
        >
          <h2 className="mission-control-panel__title">Operator Signature</h2>
          <p className="mission-control-panel__big-number">
            {cockpit.operator_signature_required ? 'required' : 'not required'}
          </p>
          <p className="mission-control-panel__meta">
            autonomy {cockpit.autonomy_level} · phase {cockpit.current_phase ?? '—'}
          </p>
        </article>

        <article className="mission-control-panel mission-control-panel--audit">
          <h2 className="mission-control-panel__title">Snapshot Audit</h2>
          <p className="mission-control-panel__meta">
            hash <code>{cockpit.snapshot_hash}</code>
          </p>
          <button
            type="button"
            className="mission-control-surface__refresh"
            onClick={() => setAuditOpen((v) => !v)}
          >
            {auditOpen ? 'collapse JSON' : 'expand JSON'}
          </button>
          {auditOpen ? (
            <pre className="mission-control-audit-json">{JSON.stringify(snapshot, null, 2)}</pre>
          ) : null}
        </article>
      </div>
    </section>
  )
}
