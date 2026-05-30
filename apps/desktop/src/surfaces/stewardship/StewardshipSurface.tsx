/**
 * Atlas Software Company Stewardship · Product Mode cockpit (AP-739).
 *
 * Read-only visual surface for the AP-739 Product Mode cockpit. It shows the
 * operator review queues, AP-759/AP-750 owner-runtime state and AP-owned
 * command anchors; it never executes, approves, dispatches, creates domains or
 * writes receipts.
 */
import { useMemo, type ReactElement, type ReactNode } from 'react'
import './stewardship.css'
import { cockpitIsSafe, statusTone, summarizeReviewQueue } from './model'
import { useStewardshipCockpit } from './useStewardshipCockpit'
import type { StewardshipCockpit, StewardshipReviewItem, StewardshipRuntimeSection } from './types'

function formatTime(iso?: string | null): string {
  if (!iso) return '--'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function value(value: unknown): string {
  if (value === null || value === undefined || value === '') return '--'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function path(source: unknown, keyPath: string): unknown {
  return keyPath.split('.').reduce<unknown>((current, key) => record(current)[key], source)
}

function count(source: unknown, keyPath: string): number {
  const current = path(source, keyPath)
  if (typeof current === 'number') return current
  if (Array.isArray(current)) return current.length
  return 0
}

function sectionStatus(section?: StewardshipRuntimeSection | null): string {
  return section?.status ?? 'not_reported'
}

function StatusPill({ status }: { status?: string | null }) {
  const tone = statusTone(status)
  return (
    <span className="stewardship-status" data-tone={tone}>
      {status ?? 'unknown'}
    </span>
  )
}

function Metric({ label, value: metricValue }: { label: string; value: string | number }) {
  return (
    <div className="stewardship-metric">
      <span className="stewardship-metric__value">{metricValue}</span>
      <span className="stewardship-metric__label">{label}</span>
    </div>
  )
}

function Section({
  title,
  status,
  children,
  wide,
}: {
  title: string
  status?: string | null
  children: ReactNode
  wide?: boolean
}) {
  return (
    <section className={`stewardship-section${wide ? ' stewardship-section--wide' : ''}`}>
      <header className="stewardship-section__header">
        <h2>{title}</h2>
        <StatusPill status={status} />
      </header>
      {children}
    </section>
  )
}

function KeyValue({ k, v }: { k: string; v: unknown }) {
  return (
    <div className="stewardship-kv">
      <dt>{k}</dt>
      <dd>{value(v)}</dd>
    </div>
  )
}

function PipelineCard({
  title,
  section,
  rows,
}: {
  title: string
  section?: StewardshipRuntimeSection | null
  rows: Array<[string, unknown]>
}) {
  const nextActions = (section?.next_actions ?? []).filter((item): item is string => typeof item === 'string')
  const blockers = (section?.blockers ?? []).filter((item): item is string => typeof item === 'string')

  return (
    <article className="stewardship-pipeline-card">
      <header className="stewardship-pipeline-card__header">
        <div>
          <span className="stewardship-review-item__ap">{section?.ap_contract ?? '--'}</span>
          <h3>{title}</h3>
        </div>
        <StatusPill status={sectionStatus(section)} />
      </header>
      <dl className="stewardship-list">
        {rows.map(([k, v]) => (
          <KeyValue key={k} k={k} v={v} />
        ))}
      </dl>
      {blockers.length > 0 ? (
        <ul className="stewardship-blockers">
          {blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}
      {nextActions.length > 0 ? (
        <ul className="stewardship-next-actions">
          {nextActions.slice(0, 2).map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function ReviewItem({ item }: { item: StewardshipReviewItem }) {
  return (
    <li className="stewardship-review-item">
      <div className="stewardship-review-item__top">
        <span className="stewardship-review-item__ap">{item.source_ap}</span>
        <StatusPill status={item.status} />
      </div>
      <h3>{item.title}</h3>
      <dl className="stewardship-review-item__meta">
        <KeyValue k="kind" v={item.kind} />
        <KeyValue k="area" v={item.target_area} />
        <KeyValue k="owner" v={item.target_owner} />
        <KeyValue k="risk" v={item.risk_level} />
        <KeyValue k="priority" v={item.priority_score} />
      </dl>
      {item.blockers && item.blockers.length > 0 ? (
        <ul className="stewardship-blockers">
          {item.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}
      {item.recommended_operator_action ? (
        <p className="stewardship-review-item__action">{item.recommended_operator_action}</p>
      ) : null}
    </li>
  )
}

function RuntimePipeline({ cockpit }: { cockpit: StewardshipCockpit }) {
  const controls = cockpit.product_mode_operational_controls
  const ownerSandbox = cockpit.owner_sandbox_runtime_runner
  const ownerResult = cockpit.owner_runtime_result_bridge

  return (
    <Section title="End-to-End Operating Pipeline" status={String(cockpit.health.overall ?? cockpit.status)} wide>
      <div className="stewardship-pipeline">
        <PipelineCard
          title="Outcome Evidence"
          section={cockpit.stewardship_outcome_history}
          rows={[
            ['evidence', cockpit.counters.outcome_evidence_items],
            ['morning inbox', cockpit.counters.outcome_morning_inbox_items],
            ['releases', cockpit.counters.release_outcome_count],
          ]}
        />
        <PipelineCard
          title="Domain Handoff"
          section={cockpit.domain_runtime_creation_handoff}
          rows={[
            ['ready', cockpit.counters.ready_domain_handoffs],
            ['blocked', cockpit.counters.blocked_domain_handoffs],
            ['packets', cockpit.counters.domain_handoff_packets],
          ]}
        />
        <PipelineCard
          title="Active Stewardship"
          section={cockpit.area_stewardship_active_operation}
          rows={[
            ['handoffs', cockpit.counters.area_active_handoff_packets],
            ['operations', cockpit.counters.area_active_operations],
            ['work orders', cockpit.counters.area_active_operation_work_orders],
          ]}
        />
        <PipelineCard
          title="Continuous Loop"
          section={cockpit.continuous_stewardship_loop}
          rows={[
            ['ready tick', cockpit.counters.continuous_loop_ready_to_tick],
            ['ticks', cockpit.counters.continuous_loop_ticks],
            ['locked', cockpit.counters.continuous_loop_locked],
          ]}
        />
        <PipelineCard
          title="Recurring Runner"
          section={cockpit.continuous_stewardship_scheduler}
          rows={[
            ['scheduled', cockpit.counters.continuous_scheduler_scheduled],
            ['runs', cockpit.counters.continuous_scheduler_runs],
            ['not due', cockpit.counters.continuous_scheduler_not_due],
          ]}
        />
        <PipelineCard
          title="Dev/Forge Release"
          section={cockpit.dev_forge_release}
          rows={[
            ['releases', cockpit.counters.dev_forge_releases],
            ['recorded', cockpit.counters.dev_forge_recorded_releases],
            ['blocked', cockpit.counters.dev_forge_release_blocked],
          ]}
        />
        <PipelineCard
          title="Owner Sandbox Run"
          section={ownerSandbox}
          rows={[
            ['owner', ownerSandbox?.target_owner],
            ['run', ownerSandbox?.owner_sandbox_run_id],
            ['exit', ownerSandbox?.exit_code],
            ['changed files', ownerSandbox?.changed_file_count],
          ]}
        />
        <PipelineCard
          title="Owner Result Bridge"
          section={ownerResult}
          rows={[
            ['owner', ownerResult?.target_owner],
            ['result', ownerResult?.owner_result_id],
            ['evidence', ownerResult?.evidence_item_count],
            ['portfolio areas', ownerResult?.portfolio_feed_area_count],
          ]}
        />
        <PipelineCard
          title="Executive Allocation"
          section={cockpit.executive_allocation_handoff}
          rows={[
            ['packets', cockpit.counters.executive_allocation_handoff_packets],
            ['ready', cockpit.counters.ready_executive_allocation_handoffs],
            ['blocked', cockpit.counters.blocked_executive_allocation_handoffs],
          ]}
        />
        <PipelineCard
          title="Product Controls"
          section={controls}
          rows={[
            ['repo', path(controls, 'repo_onboarding.repository')],
            ['tier', path(controls, 'autonomy_tiers.current_tier')],
            ['branch reviews', path(controls, 'branch_review_center.pending_review_count')],
            ['missing evidence', count(controls, 'evidence_inspector.missing_refs')],
          ]}
        />
      </div>
    </Section>
  )
}

function SafetyStrip({ cockpit }: { cockpit: StewardshipCockpit }) {
  const safe = cockpitIsSafe(cockpit)
  return (
    <div className="stewardship-safety" data-safe={safe ? 'yes' : 'no'}>
      <span>read only: {value(cockpit.read_only)}</span>
      <span>no new OS: {value(cockpit.stack.not_a_new_os)}</span>
      <span>Dev invoked: {value(cockpit.claim_policy.dev_invoked)}</span>
      <span>Forge invoked: {value(cockpit.claim_policy.forge_invoked)}</span>
      <span>domain created: {value(cockpit.claim_policy.domain_runtime_created)}</span>
    </div>
  )
}

export function StewardshipSurface(): ReactElement {
  const { cockpit, loading, error, mode, lastFetchedAt, refresh } = useStewardshipCockpit()
  const queueSummary = useMemo(
    () => summarizeReviewQueue(cockpit?.review_queue ?? []),
    [cockpit?.review_queue],
  )

  if (mode === 'offline') {
    return (
      <main className="stewardship-surface stewardship-surface--offline">
        <header className="stewardship-header">
          <div>
            <h1>Software Company Stewardship</h1>
            <p>Product Mode cockpit unavailable without Atlas server URL.</p>
          </div>
          <StatusPill status="offline" />
        </header>
      </main>
    )
  }

  if (error && !cockpit) {
    return (
      <main className="stewardship-surface stewardship-surface--error">
        <header className="stewardship-header">
          <div>
            <h1>Software Company Stewardship</h1>
            <p>{error.message}</p>
          </div>
          <button type="button" className="stewardship-button" onClick={() => void refresh()}>
            retry
          </button>
        </header>
      </main>
    )
  }

  if (!cockpit) {
    return (
      <main className="stewardship-surface stewardship-surface--loading">
        <header className="stewardship-header">
          <div>
            <h1>Software Company Stewardship</h1>
            <p>{loading ? 'loading cockpit...' : 'waiting for cockpit'}</p>
          </div>
          <StatusPill status={mode} />
        </header>
      </main>
    )
  }

  const counters = cockpit.counters
  const areaHealth = cockpit.area_focus.health as Record<string, unknown> | undefined
  const expansionSummary = cockpit.self_expanding_company.expansion_summary ?? {}

  return (
    <main className="stewardship-surface">
      <header className="stewardship-header">
        <div>
          <p className="stewardship-eyebrow">{cockpit.ap_contract} · Product Mode Cockpit</p>
          <h1>Software Company Stewardship</h1>
          <p>
            {cockpit.area_id} · {cockpit.portfolio_id} · hash {cockpit.surface_hash}
          </p>
        </div>
        <div className="stewardship-header__actions">
          <StatusPill status={String(cockpit.health.overall ?? cockpit.status)} />
          <span className="stewardship-mode">{loading ? 'loading' : mode}</span>
          <button type="button" className="stewardship-button" onClick={() => void refresh()}>
            refresh
          </button>
        </div>
      </header>

      <SafetyStrip cockpit={cockpit} />

      <section className="stewardship-metrics" aria-label="Stewardship counters">
        <Metric label="review queue" value={counters.review_queue_items} />
        <Metric label="executive pending" value={counters.executive_pending_review} />
        <Metric label="owner sandbox" value={counters.owner_sandbox_runtime_runs ?? 0} />
        <Metric label="owner results" value={counters.owner_runtime_results ?? 0} />
        <Metric label="product controls" value={counters.product_mode_control_blockers ?? 0} />
      </section>

      <div className="stewardship-grid">
        <Section title="Area Focus" status={String(areaHealth?.overall ?? cockpit.area_focus.status)}>
          <dl className="stewardship-list">
            <KeyValue k="findings" v={counters.area_findings} />
            <KeyValue k="inbox" v={counters.area_inbox_items} />
            <KeyValue k="WIP used" v={(cockpit.area_focus.budgets as Record<string, unknown> | undefined)?.wip_used} />
            <KeyValue k="WIP limit" v={(cockpit.area_focus.budgets as Record<string, unknown> | undefined)?.wip_limit} />
          </dl>
        </Section>

        <Section title="Executive Inbox" status={cockpit.executive_decision_inbox.status}>
          <dl className="stewardship-list">
            <KeyValue k="items" v={cockpit.executive_decision_inbox.item_count} />
            <KeyValue k="pending" v={cockpit.executive_decision_inbox.decision_summary.pending_operator_review} />
            <KeyValue k="accepted" v={cockpit.executive_decision_inbox.decision_summary.accepted_no_execution} />
            <KeyValue k="pack" v={String(cockpit.executive_decision_inbox.source_pack_hash ?? '').slice(0, 24)} />
          </dl>
        </Section>

        <Section title="New Area Gate" status={cockpit.new_area_proposal_gate.status}>
          <dl className="stewardship-list">
            <KeyValue k="proposals" v={cockpit.new_area_proposal_gate.proposal_count} />
            <KeyValue k="blocked review" v={cockpit.new_area_proposal_gate.decision_summary.blocked_awaiting_operator_review} />
            <KeyValue k="ready for gate" v={counters.ready_for_domain_runtime_creation_gate} />
            <KeyValue k="mode" v={cockpit.new_area_proposal_gate.mode} />
          </dl>
        </Section>

        <Section title="Self-Expanding" status={cockpit.self_expanding_company.status}>
          <dl className="stewardship-list">
            <KeyValue k="total candidates" v={expansionSummary.total_candidates} />
            <KeyValue k="existing handoffs" v={expansionSummary.existing_capability_handoffs} />
            <KeyValue k="new domains" v={expansionSummary.new_domain_candidates} />
            <KeyValue k="sensitive" v={expansionSummary.sensitive_candidates} />
          </dl>
        </Section>

        <RuntimePipeline cockpit={cockpit} />

        <Section title="Review Queue" status={queueSummary.blocked > 0 ? 'review' : cockpit.status} wide>
          <div className="stewardship-queue-summary">
            <span>{queueSummary.total} total</span>
            <span>{queueSummary.executive} executive</span>
            <span>{queueSummary.newArea} new area gate</span>
            <span>{queueSummary.selfExpanding} self-expanding</span>
            <span>{queueSummary.ownerSandbox} sandbox</span>
            <span>{queueSummary.ownerResult} result</span>
            <span>{queueSummary.allocation} allocation</span>
            <span>{queueSummary.controls} controls</span>
            <span>{queueSummary.blocked} blocked</span>
          </div>
          {cockpit.review_queue.length === 0 ? (
            <p className="stewardship-empty">No review items in the cockpit.</p>
          ) : (
            <ul className="stewardship-review-list">
              {cockpit.review_queue.map((item) => (
                <ReviewItem key={`${item.source_ap}:${item.id}`} item={item} />
              ))}
            </ul>
          )}
        </Section>

        <Section title="Operator Controls" status="read_only" wide>
          <dl className="stewardship-command-list">
            <KeyValue k="decision owner" v={cockpit.operator_controls.decision_recording_owner} />
            <KeyValue k="executive command" v={cockpit.operator_controls.executive_decision_command} />
            <KeyValue k="new area command" v={cockpit.operator_controls.new_area_decision_command} />
            <KeyValue k="owner sandbox plan" v={cockpit.operator_controls.owner_sandbox_runtime_plan_command} />
            <KeyValue k="owner result bridge" v={cockpit.operator_controls.owner_runtime_result_bridge_command} />
            <KeyValue k="allocation handoff" v={cockpit.operator_controls.executive_allocation_handoff_command} />
            <KeyValue k="product controls" v={cockpit.operator_controls.product_mode_controls_command} />
            <KeyValue k="last fetch" v={formatTime(lastFetchedAt)} />
          </dl>
          <ul className="stewardship-next-actions">
            {cockpit.next_actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </Section>
      </div>
    </main>
  )
}
