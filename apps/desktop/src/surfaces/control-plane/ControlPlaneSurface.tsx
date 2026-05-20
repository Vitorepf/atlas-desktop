/**
 * Atlas Control Plane surface · operational dashboard of the new Kernel.
 *
 * Consumes `atlas.ai.control_plane.snapshot.v1` from atlas-server and renders
 * mission, intent (router), domain, plan/work_orders, policy gates, tools,
 * evidence, approvals, blockers, certification, timeline and next action.
 *
 * Read-only by design. Never invents records — every section shows an honest
 * `missing/degraded/blocked` state when the backend reports it.
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-autonomous-control-plane.md
 *   - docs/engineering-knowledge-base/atlas-autonomous-intelligence-operating-system.md
 *   - app/Http/Controllers/AtlasAiControlPlaneController.php
 */
import { useMemo } from 'react'
import './control-plane.css'
import { SectionCard } from './components/SectionCard'
import { StatusBadge } from './components/StatusBadge'
import { useControlPlane } from './useControlPlane'
import type {
  ControlPlaneComponentSummary,
  ControlPlaneNextAction,
  ControlPlaneReadinessComponent,
  ControlPlaneRecentEvent,
  ControlPlaneSnapshot,
} from './types'

function formatTime(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatRelative(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return formatTime(iso)
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function ByStatusList({ byStatus }: { byStatus?: Record<string, number> }) {
  const entries = Object.entries(byStatus ?? {})
  if (entries.length === 0) {
    return <div className="cp-section-empty">no entries</div>
  }
  return (
    <dl className="cp-key-value">
      {entries.map(([key, count]) => (
        <div key={key} style={{ display: 'contents' }}>
          <dt>{key}</dt>
          <dd>{count}</dd>
        </div>
      ))}
    </dl>
  )
}

function MissionsSection({ summary }: { summary: ControlPlaneComponentSummary }) {
  const recent = Array.isArray(summary.recent) ? (summary.recent as ReadonlyArray<Record<string, unknown>>) : []
  const isEmpty = (summary.total ?? 0) === 0 && recent.length === 0
  return (
    <SectionCard
      title="Missions"
      status={summary.status}
      detail={summary.detail ?? `${summary.tables_present ?? 0}/${summary.tables_required ?? 6} tables present`}
      isEmpty={isEmpty}
      emptyMessage="no missions recorded yet"
    >
      <div className="cp-section-totals">
        <div>
          <div className="v">{summary.total ?? 0}</div>
          <div className="l">total</div>
        </div>
      </div>
      <ByStatusList byStatus={summary.by_status} />
      {recent.length > 0 ? (
        <ul className="cp-section-list">
          {recent.slice(0, 6).map((m) => {
            const rec = asRecord(m)
            const uuid = String(rec.uuid ?? rec.id ?? '—')
            const title = (rec.title as string | undefined) ?? '(untitled mission)'
            const status = (rec.status as string | undefined) ?? 'unknown'
            const risk = (rec.risk_level as string | undefined) ?? 'unknown'
            const createdAt = rec.created_at as string | undefined
            return (
              <li key={uuid}>
                <div className="cp-row-title">
                  <StatusBadge status={status} />
                  <span>{title}</span>
                </div>
                <div className="cp-row-meta">
                  {uuid.slice(0, 8)} · risk {risk} · {formatRelative(createdAt)}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </SectionCard>
  )
}

function RouterSection({ summary }: { summary: ControlPlaneComponentSummary }) {
  const total = summary.total ?? 0
  const byFlow = (summary.by_flow as Record<string, number> | undefined) ?? (summary.by_status as Record<string, number> | undefined)
  const recent = Array.isArray(summary.recent) ? (summary.recent as ReadonlyArray<Record<string, unknown>>) : []
  return (
    <SectionCard
      title="Intent · Router"
      status={summary.status}
      detail={summary.detail ?? 'flow decisions emitted by AtlasAiRouterService'}
      isEmpty={total === 0 && recent.length === 0}
      emptyMessage="router has not emitted a flow decision yet"
    >
      <div className="cp-section-totals">
        <div>
          <div className="v">{total}</div>
          <div className="l">decisions</div>
        </div>
      </div>
      <ByStatusList byStatus={byFlow} />
    </SectionCard>
  )
}

function DomainsSection({ summary }: { summary: ControlPlaneComponentSummary }) {
  const total = summary.total ?? 0
  const byStatus = summary.by_status
  const recent = Array.isArray(summary.recent) ? (summary.recent as ReadonlyArray<Record<string, unknown>>) : []
  return (
    <SectionCard
      title="Domains"
      status={summary.status}
      detail={summary.detail ?? 'domain manifests + handoffs (Meta 2)'}
      isEmpty={total === 0 && recent.length === 0}
      emptyMessage="no domain manifests registered yet"
    >
      <div className="cp-section-totals">
        <div>
          <div className="v">{total}</div>
          <div className="l">manifests</div>
        </div>
      </div>
      <ByStatusList byStatus={byStatus} />
    </SectionCard>
  )
}

function PolicySection({ summary }: { summary: ControlPlaneComponentSummary }) {
  const total = summary.total ?? 0
  const byProfile = (summary.by_profile as Record<string, number> | undefined) ?? summary.by_status
  return (
    <SectionCard
      title="Policy · Gates"
      status={summary.status}
      detail={summary.detail ?? 'permission, budget and safety gates (Meta 3)'}
      isEmpty={total === 0}
      emptyMessage="no policy profiles seeded yet"
    >
      <div className="cp-section-totals">
        <div>
          <div className="v">{total}</div>
          <div className="l">profiles</div>
        </div>
      </div>
      <ByStatusList byStatus={byProfile} />
    </SectionCard>
  )
}

function ToolsSection({ summary }: { summary: ControlPlaneComponentSummary }) {
  const total = summary.total ?? 0
  return (
    <SectionCard
      title="Tools"
      status={summary.status}
      detail={summary.detail ?? 'tool runs and decisions'}
      isEmpty={total === 0}
      emptyMessage="no tool runs recorded yet"
    >
      <div className="cp-section-totals">
        <div>
          <div className="v">{total}</div>
          <div className="l">runs</div>
        </div>
      </div>
      <ByStatusList byStatus={summary.by_status} />
    </SectionCard>
  )
}

function EvidenceSection({ summary }: { summary: ControlPlaneComponentSummary }) {
  const total = summary.total ?? 0
  const byKind = (summary.by_kind as Record<string, number> | undefined) ?? summary.by_status
  return (
    <SectionCard
      title="Evidence Packs"
      status={summary.status}
      detail={summary.detail ?? 'evidence packs + receipts (Meta 4)'}
      isEmpty={total === 0}
      emptyMessage="no evidence packs published yet"
    >
      <div className="cp-section-totals">
        <div>
          <div className="v">{total}</div>
          <div className="l">packs</div>
        </div>
      </div>
      <ByStatusList byStatus={byKind} />
    </SectionCard>
  )
}

function ApprovalsSection({ snapshot }: { snapshot: ControlPlaneSnapshot }) {
  const a = snapshot.approvals_summary
  const operator = snapshot.operator_approvals_summary
  const total = (a.total ?? 0) + (operator?.total ?? 0)
  const pending = (a.pending ?? 0) + (operator?.pending ?? 0)
  const approved = (operator?.approved ?? 0) + Number(a.by_status?.approved ?? 0)
  const byMode = operator?.by_mode ?? {}
  return (
    <SectionCard
      title="Approvals"
      status={pending > 0 ? 'degraded' : a.status}
      detail={operator ? 'policy approvals + external execution operator approvals' : (a.detail ?? 'pending operator decisions (Policy)')}
      isEmpty={total === 0}
      emptyMessage="no approval requests on record"
    >
      <div className="cp-section-totals">
        <div>
          <div className="v">{pending}</div>
          <div className="l">pending</div>
        </div>
        <div>
          <div className="v" style={{ opacity: 0.75 }}>
            {approved}
          </div>
          <div className="l">approved</div>
        </div>
        <div>
          <div className="v" style={{ opacity: 0.65 }}>
            {total}
          </div>
          <div className="l">total</div>
        </div>
      </div>
      <ByStatusList byStatus={a.by_status} />
      {operator ? (
        <>
          <div className="cp-row-meta">operator approvals · {operator.total ?? 0} total · {operator.pending ?? 0} pending</div>
          <ByStatusList byStatus={byMode} />
        </>
      ) : null}
    </SectionCard>
  )
}

function CertificationSection({ snapshot }: { snapshot: ControlPlaneSnapshot }) {
  const c = snapshot.certifications_summary
  const evidence = c.evidence_runtime
  const mission = c.mission_foundation
  const total = (evidence.total ?? 0) + (mission.total ?? 0)
  return (
    <SectionCard
      title="Certification"
      status={c.status}
      detail="evidence-runtime + mission-foundation certifications"
      isEmpty={total === 0}
      emptyMessage="no certifications recorded yet"
    >
      <div className="cp-section-totals">
        <div>
          <div className="v">{evidence.passed ?? 0}</div>
          <div className="l">evidence passed</div>
        </div>
        <div>
          <div className="v">{mission.passed ?? 0}</div>
          <div className="l">mission passed</div>
        </div>
      </div>
      <dl className="cp-key-value">
        <dt>Evidence runtime</dt>
        <dd>
          <StatusBadge status={evidence.status} /> {evidence.total ?? 0} total
        </dd>
        <dt>Mission foundation</dt>
        <dd>
          <StatusBadge status={mission.status} /> {mission.total ?? 0} total
        </dd>
      </dl>
    </SectionCard>
  )
}

function RuntimeIntelligenceSection({ snapshot }: { snapshot: ControlPlaneSnapshot }) {
  const runtime = snapshot.runtime_intelligence_summary
  const status = runtime?.status ?? 'missing'
  const summary = runtime?.summary ?? {}
  const external = runtime?.external_execution
  const externalSummary = asRecord(external?.summary)
  const unsafeExternal = asNumber(summary.external_execution_unsafe_enabled)
  const missingReceiptBindings = asNumber(summary.external_execution_missing_receipt_bindings)
  const pendingExternalApprovals = asNumber(summary.external_execution_pending_approval)
  const signatureCoverage = typeof externalSummary.signature_protection_coverage === 'number'
    ? `${Math.round(externalSummary.signature_protection_coverage * 100)}%`
    : '—'
  const sections = [
    ['APCR', runtime?.persistent_context],
    ['AEMOR', runtime?.aemor],
    ['ASEIF', runtime?.intelligence_factory],
    ['Swarm', runtime?.swarm_company],
    ['External', runtime?.external_execution],
  ] as const
  const isEmpty = !runtime || Object.keys(summary).length === 0
  const actionQueue = runtime?.action_queue ?? []

  return (
    <SectionCard
      title="Runtime Intelligence"
      status={status}
      detail={runtime?.schema_version ?? 'APCR · AEMOR · ASEIF · Swarm · external execution'}
      wide
      isEmpty={isEmpty}
      emptyMessage="runtime intelligence summary is not present in the backend snapshot"
    >
      <div className="cp-section-totals">
        <div>
          <div className="v">{asNumber(summary.system_blockers_count)}</div>
          <div className="l">system blockers</div>
        </div>
        <div>
          <div className="v">{asNumber(summary.operator_queue_count)}</div>
          <div className="l">operator queue</div>
        </div>
        <div>
          <div className="v">{asNumber(summary.clarification_queue_count)}</div>
          <div className="l">clarifications</div>
        </div>
        <div>
          <div className="v">{asNumber(summary.aemor_episodes_total)}</div>
          <div className="l">AEMOR episodes</div>
        </div>
        <div>
          <div className="v">{asNumber(summary.intelligence_factory_capabilities_total)}</div>
          <div className="l">capabilities</div>
        </div>
        <div>
          <div className="v">{asNumber(summary.swarm_company_roles_total)}</div>
          <div className="l">agent roles</div>
        </div>
        <div>
          <div className="v">{asNumber(summary.external_execution_mandates_total)}</div>
          <div className="l">mandates</div>
        </div>
        <div>
          <div className="v">{pendingExternalApprovals}</div>
          <div className="l">external approvals</div>
        </div>
        <div>
          <div className="v" style={{ color: unsafeExternal > 0 ? 'rgba(220, 110, 110, 0.95)' : undefined }}>
            {unsafeExternal}
          </div>
          <div className="l">unsafe enabled</div>
        </div>
        <div>
          <div className="v" style={{ color: missingReceiptBindings > 0 ? 'rgba(214, 177, 96, 0.96)' : undefined }}>
            {missingReceiptBindings}
          </div>
          <div className="l">receipt gaps</div>
        </div>
      </div>
      {external ? (
        <div className="cp-governance-strip">
          <div>
            <span className="k">External policy</span>
            <span className="v">blocked by default · manual handoff only</span>
          </div>
          <div>
            <span className="k">Signature coverage</span>
            <span className="v">{signatureCoverage}</span>
          </div>
          <div>
            <span className="k">Receipt bindings</span>
            <span className="v">
              {asNumber(externalSummary.receipt_binding_count)} bound · {missingReceiptBindings} missing
            </span>
          </div>
          <div>
            <span className="k">Unsafe execution</span>
            <span className="v">{unsafeExternal === 0 ? 'none enabled' : `${unsafeExternal} blocked`}</span>
          </div>
        </div>
      ) : null}
      <dl className="cp-key-value">
        {sections.map(([label, section]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt>{label}</dt>
            <dd>
              <StatusBadge status={section?.status ?? 'missing'} />{' '}
              {Object.entries((section?.summary as Record<string, unknown> | undefined) ?? {})
                .slice(0, 2)
                .map(([k, v]) => `${k}=${String(v)}`)
                .join(' · ') || 'no counters'}
            </dd>
          </div>
        ))}
      </dl>
      {actionQueue.length > 0 ? (
        <ul className="cp-section-list">
          {actionQueue.slice(0, 6).map((item, idx) => (
            <li key={`${item.kind}-${item.target_id ?? idx}`}>
              <div className="cp-row-title">
                <StatusBadge status={item.status} />
                <span>{item.kind}</span>
              </div>
              <div className="cp-row-meta">
                {item.detail}
                {item.target_id !== undefined && item.target_id !== null ? ` · ${String(item.target_id).slice(0, 12)}` : ''}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {runtime?.hash ? <div className="cp-row-meta">hash {runtime.hash}</div> : null}
    </SectionCard>
  )
}

function BlockersSection({ snapshot }: { snapshot: ControlPlaneSnapshot }) {
  const summary = snapshot.blockers_summary
  // The aggregate snapshot only exposes counts + by_source. Recent rows live in
  // the dedicated /blockers payload; here we render counts plus the slice that
  // already arrives bundled in `recent_events` if any are evidence blockers.
  const total = summary.total ?? 0
  const critical = summary.critical ?? 0
  return (
    <SectionCard
      title="Blockers"
      status={critical > 0 ? 'blocked' : total > 0 ? 'degraded' : 'ready'}
      detail="open blockers across evidence, missions, approvals and handoffs"
      wide
      isEmpty={total === 0}
      emptyMessage="no open blockers · system is unblocked"
    >
      <div className="cp-section-totals">
        <div>
          <div className="v">{total}</div>
          <div className="l">open</div>
        </div>
        <div>
          <div className="v" style={{ color: critical > 0 ? 'rgba(220, 110, 110, 0.95)' : undefined }}>
            {critical}
          </div>
          <div className="l">critical</div>
        </div>
      </div>
      <ByStatusList byStatus={summary.by_source} />
    </SectionCard>
  )
}

function TimelineSection({ events }: { events: ReadonlyArray<ControlPlaneRecentEvent> }) {
  return (
    <SectionCard
      title="Timeline · Recent Events"
      status={events.length > 0 ? 'ready' : 'missing'}
      detail="audit + mission events, newest first"
      wide
      isEmpty={events.length === 0}
      emptyMessage="no audit or mission events recorded yet"
    >
      <ul className="cp-section-list">
        {events.slice(0, 12).map((e, idx) => (
          <li key={`${e.source}-${e.target_id ?? idx}-${idx}`}>
            <div className="cp-row-title">
              <StatusBadge status={e.source === 'evidence' ? 'ready' : 'degraded'} label={e.source} />
              <span>{e.event_type}</span>
              <span className="cp-row-meta">
                · {e.target_type ?? '—'}
                {e.target_id !== undefined ? ` #${e.target_id}` : ''}
              </span>
            </div>
            <div className="cp-row-meta">{formatRelative(e.created_at)}</div>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

function NextActionsSection({ actions }: { actions: ReadonlyArray<ControlPlaneNextAction> }) {
  const meaningful = actions.filter((a) => a.kind !== 'idle')
  return (
    <SectionCard
      title="Next Actions"
      status={meaningful.length > 0 ? 'degraded' : 'ready'}
      detail="derived from blockers, readiness gaps and pending approvals"
      wide
      isEmpty={meaningful.length === 0}
      emptyMessage="no next actions · control plane reports idle"
    >
      <ul className="cp-section-list">
        {meaningful.slice(0, 12).map((a, idx) => (
          <li key={`${a.kind}-${a.component}-${idx}`}>
            <div className="cp-row-title">
              <span className="cp-priority" data-priority={a.priority}>
                {a.priority}
              </span>
              <span>{a.kind}</span>
              <span className="cp-row-meta">· {a.component}</span>
            </div>
            <div className="cp-row-meta">{a.detail}</div>
            {a.target_type ? (
              <div className="cp-row-meta">
                target: {a.target_type}
                {a.target_id !== undefined && a.target_id !== null ? ` #${a.target_id}` : ''}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

function ReadinessRibbon({ components, lastFetchedAt }: { components: ReadonlyArray<ControlPlaneReadinessComponent>; lastFetchedAt: string | null }) {
  const ready = components.filter((c) => c.status === 'ready').length
  const degraded = components.filter((c) => c.status === 'degraded').length
  const missing = components.filter((c) => c.status === 'missing').length
  return (
    <div className="cp-ribbon" role="status" aria-label="Atlas Control Plane readiness">
      <div className="cp-ribbon-item">
        <strong>{ready}</strong> ready
      </div>
      <div className="cp-ribbon-item">
        <strong>{degraded}</strong> degraded
      </div>
      <div className="cp-ribbon-item">
        <strong>{missing}</strong> missing
      </div>
      <div className="cp-ribbon-item">
        last fetched <strong>{formatRelative(lastFetchedAt)}</strong>
      </div>
      <div className="cp-ribbon-item" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {components.map((c) => (
          <span key={c.component} title={`${c.component} · ${c.status}`}>
            <StatusBadge status={c.status} label={c.component} />
          </span>
        ))}
      </div>
    </div>
  )
}

export function ControlPlaneSurface() {
  const { snapshot, loading, error, mode, lastFetchedAt, refresh } = useControlPlane()

  const isOffline = mode === 'offline'
  const hasError = error !== null
  const hasSnapshot = snapshot !== null

  const recentEvents = useMemo<ReadonlyArray<ControlPlaneRecentEvent>>(
    () => snapshot?.recent_events ?? [],
    [snapshot],
  )

  const nextActions = useMemo<ReadonlyArray<ControlPlaneNextAction>>(
    () => snapshot?.next_actions ?? [],
    [snapshot],
  )

  // Loading state · runs before the first response (mode !== offline).
  if (!hasSnapshot && loading) {
    return (
      <div className="cp-surface" aria-busy="true">
        <div className="cp-state">
          <div className="cp-state-inner">
            <p className="cp-state-title">Reading control plane…</p>
            <p className="cp-state-detail">GET /atlas/ai/control-plane</p>
          </div>
        </div>
      </div>
    )
  }

  // Offline state · honest empty state, never invents data.
  if (!hasSnapshot && isOffline) {
    return (
      <div className="cp-surface">
        <div className="cp-state">
          <div className="cp-state-inner">
            <StatusBadge status="missing" label="offline" />
            <p className="cp-state-title" style={{ marginTop: 12 }}>
              Atlas server not reachable
            </p>
            <p className="cp-state-detail">
              Control Plane requires the Atlas Kernel HTTP API. Start atlas-server (or set
              VITE_ATLAS_SERVER_URL) to load mission, domain, policy, evidence, tool and router state.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error state · backend reachable but rejected the call.
  if (!hasSnapshot && hasError) {
    return (
      <div className="cp-surface">
        <div className="cp-state">
          <div className="cp-state-inner">
            <StatusBadge status="blocked" label="error" />
            <p className="cp-state-title" style={{ marginTop: 12 }}>
              Control plane request failed
            </p>
            <p className="cp-state-detail">{error}</p>
            <button
              type="button"
              className="cp-refresh-button"
              style={{ marginTop: 12 }}
              onClick={() => void refresh()}
              disabled={loading}
            >
              {loading ? 'retrying…' : 'retry'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Safe-guard for the impossible-but-typed null branch.
  if (!snapshot) {
    return (
      <div className="cp-surface">
        <div className="cp-state">
          <div className="cp-state-inner">
            <p className="cp-state-title">No control plane snapshot</p>
            <p className="cp-state-detail">Backend returned an empty payload. Check kernel readiness.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cp-surface">
      <div className="cp-inner">
        <header className="cp-header">
          <div>
            <h2 className="cp-title">Atlas Control Plane</h2>
            <div className="cp-subtitle">{snapshot.schema}</div>
          </div>
          <div className="cp-header-actions">
            <StatusBadge status={snapshot.status} label={`overall: ${snapshot.status}`} />
            <span className="cp-subtitle">generated {formatTime(snapshot.generated_at)}</span>
            <button
              type="button"
              className="cp-refresh-button"
              onClick={() => void refresh()}
              disabled={loading}
              aria-label="Refresh control plane snapshot"
            >
              {loading ? 'refreshing…' : 'refresh'}
            </button>
          </div>
        </header>

        <ReadinessRibbon components={snapshot.readiness.components} lastFetchedAt={lastFetchedAt} />

        <div className="cp-grid">
          <MissionsSection summary={snapshot.missions_summary} />
          <DomainsSection summary={snapshot.domains_summary} />
          <RouterSection summary={snapshot.router_summary} />
          <PolicySection summary={snapshot.policies_summary} />
          <ToolsSection summary={snapshot.tools_summary} />
          <EvidenceSection summary={snapshot.evidence_summary} />
          <ApprovalsSection snapshot={snapshot} />
          <CertificationSection snapshot={snapshot} />
          <RuntimeIntelligenceSection snapshot={snapshot} />
          <BlockersSection snapshot={snapshot} />
          <TimelineSection events={recentEvents} />
          <NextActionsSection actions={nextActions} />
        </div>
      </div>
    </div>
  )
}
