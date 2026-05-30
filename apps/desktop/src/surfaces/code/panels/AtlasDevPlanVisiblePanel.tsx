import { PanelTitle } from '@atlas/ui'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

/**
 * Gap2.F3+F4 — Plan Visible surface (canonical schema atlas.dev.plan_visible.v1).
 *
 * Renders the Atlas Dev A2 Plan Visible envelope persisted in
 * `atlas_programming_work_items.plan_json` AND ships the operator's
 * approval buttons ("ship" / "reject") per Gap2.F4 DoD. Slate dark by
 * default (canon per `atlas-desktop/CLAUDE.md`); uses only `--cc-*`
 * tokens; no mock data — empty fields render honest empty states.
 *
 * When `onApprove` / `onReject` are not provided, the buttons render
 * but show the canonical CLI command so the operator can always
 * complete the loop. This keeps the panel useful even before the
 * bridge integration lands.
 */

interface PlanVisibleEnvelope {
  schema_version?: string
  approval_status?: 'pending' | 'approved' | 'rejected'
  plan_hash?: string
  risk_band?: 'low' | 'medium' | 'high'
  run_id?: string
  target_files?: string[]
  tests_to_run?: string[]
  proposed_diff_summary?: string
  task_contract_hash?: string
}

interface AtlasDevPlanVisiblePanelProps {
  plan: PlanVisibleEnvelope | null | undefined
  taskId?: string | null
  busy?: boolean
  onApprove?: () => void | Promise<void>
  onReject?: () => void | Promise<void>
}

export function AtlasDevPlanVisiblePanel({
  plan,
  taskId,
  busy = false,
  onApprove,
  onReject,
}: AtlasDevPlanVisiblePanelProps) {
  if (!plan || plan.schema_version !== 'atlas.dev.plan_visible.v1') {
    return (
      <section data-testid="atlas-dev-plan-visible-panel">
        <PanelTitle label="Plan Visible" />
        <EmptyText>
          Plano ainda nao projetado. Rode <code>atlas-cli dev plan project</code>{' '}
          para criar.
        </EmptyText>
      </section>
    )
  }

  const status = plan.approval_status ?? 'pending'
  const risk = plan.risk_band ?? 'medium'
  const files = plan.target_files ?? []
  const tests = plan.tests_to_run ?? []
  const summary = plan.proposed_diff_summary ?? ''
  const hashShort = plan.plan_hash ? plan.plan_hash.slice(0, 12) : '—'

  const canApprove = status === 'pending'
  const taskIdShort = taskId ? taskId.slice(0, 8) : ''

  return (
    <section data-testid="atlas-dev-plan-visible-panel">
      <PanelTitle label="Plan Visible" meta={`risk ${risk}`} />

      <Row k="status" v={status} ok={status === 'approved'} />
      <Row k="risk band" v={risk} />
      <Row k="plan hash" v={hashShort} mono />

      <PanelTitle label="Diff Summary" />
      {summary === '' ? (
        <EmptyText>Sem summary persistido.</EmptyText>
      ) : (
        <EmptyText>
          <span data-testid="plan-summary">{summary}</span>
        </EmptyText>
      )}

      <PanelTitle label="Target Files" meta={String(files.length)} />
      {files.length === 0 ? (
        <EmptyText>Sem arquivos alvo declarados.</EmptyText>
      ) : (
        <div data-testid="plan-target-files">
          {files.map((file) => (
            <Row key={file} k={file} v="" mono />
          ))}
        </div>
      )}

      <PanelTitle label="Tests to Run" meta={String(tests.length)} />
      {tests.length === 0 ? (
        <EmptyText>
          {risk === 'low'
            ? 'Risco baixo — testes opcionais.'
            : 'Plano sem testes mas risk medium/high — provider bloqueado pelo gate.'}
        </EmptyText>
      ) : (
        <div data-testid="plan-tests-to-run">
          {tests.map((test) => (
            <Row key={test} k={test} v="" mono />
          ))}
        </div>
      )}

      {/* Gap2.F4 — Approval buttons. Operator decides ship/reject. */}
      {canApprove && (
        <div
          style={{ display: 'flex', gap: 8, marginTop: 12 }}
          data-testid="plan-approval-actions"
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (onApprove) {
                void onApprove()
              }
            }}
            style={btnPrimary}
            data-testid="plan-ship-button"
            aria-label="Ship plan (approve)"
          >
            Ship
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (onReject) {
                void onReject()
              }
            }}
            style={btnPrimary}
            data-testid="plan-reject-button"
            aria-label="Reject plan (cancel execution)"
          >
            Reject
          </button>
        </div>
      )}

      {canApprove && !onApprove && taskId && (
        <EmptyText>
          Aguardando aprovacao do operador. Use{' '}
          <code>atlas-cli dev plan approve --task={taskIdShort}…</code>{' '}
          ou <code>... reject ...</code>.
        </EmptyText>
      )}
      {status === 'rejected' && (
        <EmptyText>Plano rejeitado pelo operador. Provider invocation cancelada.</EmptyText>
      )}
      {status === 'approved' && (
        <EmptyText>Plano aprovado. Provider pode ser invocado.</EmptyText>
      )}
    </section>
  )
}
