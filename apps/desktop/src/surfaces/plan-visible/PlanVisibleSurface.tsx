/**
 * Plan-Visible Desktop surface (AP-703 / Patamar A5).
 *
 * Displays the canonical `atlas.dev.plan_visible.v1` projection for the
 * operator to review BEFORE approving provider execution. Two-pane:
 *   - left: list of work items with persisted plans (polled every 2s)
 *   - right: selected plan detail (target files / tests / risk band /
 *            proposed diff summary / approval status)
 *
 * Read-only. The approve/reject action is owned by a separate gate
 * surface (AP-704 future); this surface stops at "render the plan".
 */
import { useState, type ReactElement } from 'react'

import './plan-visible.css'
import { usePlanVisibleIndex, usePlanVisibleShow } from './usePlanVisible'
import type { PlanVisibleIndexEntry } from './types'

export function PlanVisibleSurface(): ReactElement {
  const { index, loading, error, mode, refresh } = usePlanVisibleIndex()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { plan, status, error: showError } = usePlanVisibleShow(selectedId)

  if (mode === 'offline') {
    return (
      <section className="plan-visible-surface plan-visible-surface--offline">
        <header className="plan-visible-surface__header">
          <h1 className="plan-visible-surface__title">Plan Visible</h1>
          <span className="plan-visible-surface__mode">offline</span>
        </header>
        <p className="plan-visible-surface__empty">
          Atlas server URL not configured. Set <code>VITE_ATLAS_SERVER_URL</code> to connect.
        </p>
      </section>
    )
  }

  const items: PlanVisibleIndexEntry[] = index?.items ?? []

  return (
    <section className="plan-visible-surface">
      <header className="plan-visible-surface__header">
        <div>
          <h1 className="plan-visible-surface__title">Plan Visible</h1>
          <span className="plan-visible-surface__subtitle">
            atlas dev · patamar A2 · {items.length} work item{items.length === 1 ? '' : 's'} with plan
          </span>
        </div>
        <div className="plan-visible-surface__actions">
          <span className="plan-visible-surface__mode">{loading ? 'loading…' : mode}</span>
          <button
            type="button"
            className="plan-visible-surface__refresh"
            onClick={() => void refresh()}
          >
            refresh
          </button>
        </div>
      </header>

      {error ? (
        <p className="plan-visible-surface__empty">Index error: {error.message}</p>
      ) : null}

      <div className="plan-visible-surface__layout">
        <aside className="plan-visible-list">
          {items.length === 0 ? (
            <p className="plan-visible-list__empty">No work items with persisted plan yet.</p>
          ) : (
            <ul>
              {items.map((entry) => (
                <li
                  key={entry.work_item_id}
                  className={`plan-visible-list-item${
                    selectedId === entry.work_item_id ? ' plan-visible-list-item--active' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(entry.work_item_id)}
                    className="plan-visible-list-item__button"
                  >
                    <span className="plan-visible-list-item__code">
                      {entry.work_item_code ?? entry.work_item_id.slice(0, 8)}
                    </span>
                    <span
                      className={`plan-visible-list-item__band plan-visible-list-item__band--${entry.plan_visible.risk_band}`}
                    >
                      {entry.plan_visible.risk_band}
                    </span>
                    <span className="plan-visible-list-item__status">
                      {entry.plan_visible.approval_status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="plan-visible-detail">
          {!selectedId ? (
            <p className="plan-visible-detail__empty">Select a work item to inspect the plan.</p>
          ) : status === 'not_found' ? (
            <p className="plan-visible-detail__empty">No plan persisted for this work item.</p>
          ) : status === 'error' ? (
            <p className="plan-visible-detail__empty">
              Failed to load plan: {showError?.message ?? 'unknown error'}
            </p>
          ) : plan ? (
            <article>
              <header className="plan-visible-detail__header">
                <h2 className="plan-visible-detail__title">Proposed Plan</h2>
                <span
                  className={`plan-visible-detail__band plan-visible-detail__band--${plan.plan_visible.risk_band}`}
                >
                  risk: {plan.plan_visible.risk_band}
                </span>
                <span
                  className={`plan-visible-detail__status plan-visible-detail__status--${plan.plan_visible.approval_status}`}
                >
                  {plan.plan_visible.approval_status}
                </span>
              </header>

              <p className="plan-visible-detail__summary">{plan.plan_visible.proposed_diff_summary}</p>

              <section className="plan-visible-detail__section">
                <h3>Target files</h3>
                {plan.plan_visible.target_files.length === 0 ? (
                  <p className="plan-visible-detail__empty">No target files declared.</p>
                ) : (
                  <ul className="plan-visible-detail__file-list">
                    {plan.plan_visible.target_files.map((f) => (
                      <li key={f}>
                        <code>{f}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="plan-visible-detail__section">
                <h3>Tests to run</h3>
                {plan.plan_visible.tests_to_run.length === 0 ? (
                  <p className="plan-visible-detail__empty">No tests declared.</p>
                ) : (
                  <ul className="plan-visible-detail__file-list">
                    {plan.plan_visible.tests_to_run.map((t) => (
                      <li key={t}>
                        <code>{t}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <footer className="plan-visible-detail__footer">
                <span>
                  run: <code>{plan.plan_visible.run_id}</code>
                </span>
                <span>
                  hash: <code>{plan.hash}</code>
                </span>
              </footer>
            </article>
          ) : (
            <p className="plan-visible-detail__empty">Loading plan…</p>
          )}
        </main>
      </div>
    </section>
  )
}
