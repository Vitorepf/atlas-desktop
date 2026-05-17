/**
 * Atlas AI · Plan panel.
 *
 * Renderiza o plano. Duas fontes:
 *
 *   1. (legado) `thread.metadata` traz next_step/objective/risks/etc. e
 *      continua sendo mostrado para conversas antigas;
 *   2. (Atlas Dev plan-only) quando o composer em modo programming/dev|debug
 *      faz POST /ai/interactions/atlas-dev/plan, o resultado canônico
 *      (mini_spec + task_contract + projeções) entra aqui via `atlasDevPlan`.
 *
 * Nunca inventa: se o backend ainda não preencheu um campo, não inferimos
 * placeholder — preferimos vazio honesto. Plan-only NÃO chama provider, então
 * o painel também sinaliza explicitamente "plan · pronto" sem partir para /run.
 */
import { useCallback, useEffect, useState } from 'react'
import type {
  AiThreadDetail,
  AiTrace,
  AtlasAiMode,
  AtlasDevForgePromotionPreview,
  AtlasDevPlanResult,
} from '../types'
import { AtlasDevRunWorkbench } from '../../../components/atlasDev'
import { fetchAtlasDevReadiness } from '../../../components/atlasDev'
import type { PlanOnlyResult } from '../../../components/atlasDev'
import type { AtlasDevReadinessCheck, AtlasDevReadinessResponse } from '../../../components/atlasDev'

interface AtlasAiPlanPanelProps {
  thread: AiThreadDetail | null
  pendingTrace: AiTrace | null
  mode: AtlasAiMode
  atlasDevPlan?: AtlasDevPlanResult | null
  atlasDevPlanLoading?: boolean
  atlasDevPlanError?: string | null
  atlasDevPlanUnavailable?: boolean
}

function pickStringArray(meta: Record<string, unknown> | null | undefined, key: string): string[] {
  if (!meta) return []
  const v = meta[key]
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
}

function pickString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!meta) return null
  const v = meta[key]
  if (typeof v !== 'string' || v.trim() === '') return null
  return v.trim()
}

function acceptanceLine(
  ac: string | { id?: string; description?: string; verification?: string; verification_ref?: string | null },
  index: number,
): { id: string; description: string; verification?: string; ref?: string | null } {
  if (typeof ac === 'string') {
    return { id: String(index + 1), description: ac }
  }
  return {
    id: ac.id ?? String(index + 1),
    description: ac.description ?? '(sem descrição)',
    verification: ac.verification,
    ref: ac.verification_ref ?? null,
  }
}

function toRunPlan(plan: AtlasDevPlanResult | null | undefined): PlanOnlyResult | null {
  if (!plan) return null
  if (plan.routing_decision !== 'atlas_dev_fast_path') return null
  if (!plan.confirmation_token) return null
  const taskContractHash = plan.task_contract_hash ?? plan.task_contract?.task_contract_hash
  if (!taskContractHash) return null

  return {
    run_id: plan.run_id,
    task_contract_hash: taskContractHash,
    confirmation_token: plan.confirmation_token,
    workspace_hash: plan.workspace_hash ?? null,
    thread_id: plan.thread_id ?? null,
    confirmation_expires_at: plan.confirmation_expires_at ?? null,
    routing_decision: plan.routing_decision,
    ui_hints: plan.ui_hints
      ? {
          diff_preview: plan.ui_hints.diff_preview ?? null,
          expected_tests: plan.ui_hints.expected_tests ?? null,
          expected_files: plan.ui_hints.expected_files ?? null,
        }
      : null,
  }
}

export function AtlasAiPlanPanel({
  thread,
  pendingTrace,
  mode,
  atlasDevPlan,
  atlasDevPlanLoading,
  atlasDevPlanError,
  atlasDevPlanUnavailable,
}: AtlasAiPlanPanelProps) {
  const meta = thread?.metadata ?? null

  const legacyNextStep =
    pickString(meta, 'suggested_next_step') ??
    pickString(meta, 'next_step') ??
    null

  const legacyObjective = pickString(meta, 'objective') ?? null
  const contextSummary = pickString(meta, 'context_summary') ?? null
  const successCriteria = pickStringArray(meta, 'suggested_success_criteria')
  const risks = pickStringArray(meta, 'risks')
  const openQuestions = pickStringArray(meta, 'open_questions')
  const knownFiles = pickStringArray(meta, 'known_files')

  /* Atlas Dev plan-only fields */
  const miniSpec = atlasDevPlan?.mini_spec
  const taskContract = atlasDevPlan?.task_contract
  const runPlan = toRunPlan(atlasDevPlan)
  const planObjective = miniSpec?.goal ?? legacyObjective
  const nonGoals = miniSpec?.non_goals ?? []
  const allowedFiles = miniSpec?.allowed_files ?? taskContract?.allowed_files ?? []
  const forbiddenFiles = miniSpec?.forbidden_files ?? taskContract?.forbidden_files ?? []
  const acceptanceCriteria = miniSpec?.acceptance_criteria ?? []
  const validationCommands = taskContract?.validation_commands ?? []
  const stopConditions = atlasDevPlan?.stop_conditions ?? []
  const escalationConditions =
    atlasDevPlan?.escalation_conditions ?? taskContract?.escalation_on ?? []

  const hasPlanArtifact =
    !!atlasDevPlan && (
      !!planObjective ||
      nonGoals.length > 0 ||
      allowedFiles.length > 0 ||
      forbiddenFiles.length > 0 ||
      acceptanceCriteria.length > 0 ||
      validationCommands.length > 0 ||
      stopConditions.length > 0 ||
      escalationConditions.length > 0
    )

  const hasLegacyAnything =
    legacyNextStep !== null ||
    legacyObjective !== null ||
    contextSummary !== null ||
    successCriteria.length > 0 ||
    risks.length > 0 ||
    openQuestions.length > 0 ||
    knownFiles.length > 0

  const hasAnything = hasPlanArtifact || hasLegacyAnything

  return (
    <section className="atlas-ai-plan" aria-label="Plano da conversa">
      {atlasDevPlanLoading ? (
        <p className="atlas-ai-plan-empty atlas-ai-faint">consultando plano…</p>
      ) : atlasDevPlanError ? (
        <p className="atlas-ai-plan-empty atlas-ai-faint">erro · {atlasDevPlanError}</p>
      ) : atlasDevPlanUnavailable ? (
        <p className="atlas-ai-plan-empty atlas-ai-faint">
          plan-only endpoint ainda não disponível · fluxo legado em uso
        </p>
      ) : null}

      {(atlasDevPlanUnavailable || atlasDevPlanError) && !atlasDevPlanLoading ? (
        <AtlasDevReadinessPanel />
      ) : null}

      {atlasDevPlan?.status === 'blocked' && atlasDevPlan.blocked ? (
        <article className="atlas-ai-plan-card is-warning">
          <header>Plano bloqueado</header>
          <p>{atlasDevPlan.blocked.message}</p>
          {atlasDevPlan.blocked.question ? (
            <p className="atlas-ai-plan-faint">{atlasDevPlan.blocked.question}</p>
          ) : null}
        </article>
      ) : null}

      {atlasDevPlan?.status === 'forge_promotion_preview' && atlasDevPlan.forge_promotion_preview ? (
        <ForgePromotionBanner preview={atlasDevPlan.forge_promotion_preview} />
      ) : null}

      {!thread && !atlasDevPlan ? (
        <p className="atlas-ai-plan-empty">
          o plano aparece quando você abre uma conversa
        </p>
      ) : !hasAnything ? (
        <p className="atlas-ai-plan-empty">
          ainda sem plano explícito · Atlas só promove quando você decide
        </p>
      ) : (
        <div className="atlas-ai-plan-stack">
          {planObjective ? (
            <article className="atlas-ai-plan-card is-primary">
              <header>Objetivo</header>
              <p>{planObjective}</p>
            </article>
          ) : null}

          {nonGoals.length > 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Não-objetivos</header>
              <ul className="atlas-ai-plan-list">
                {nonGoals.map((g, i) => <li key={`ng-${i}`}>{g}</li>)}
              </ul>
            </article>
          ) : null}

          {allowedFiles.length > 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Allowed files · {allowedFiles.length}</header>
              <ul className="atlas-ai-plan-list atlas-ai-plan-list-mono">
                {allowedFiles.slice(0, 12).map((f, i) => (
                  <li key={`al-${i}`}><code>{f}</code></li>
                ))}
              </ul>
            </article>
          ) : null}

          {forbiddenFiles.length > 0 ? (
            <article className="atlas-ai-plan-card is-warning">
              <header>Forbidden files · {forbiddenFiles.length}</header>
              <ul className="atlas-ai-plan-list atlas-ai-plan-list-mono">
                {forbiddenFiles.slice(0, 12).map((f, i) => (
                  <li key={`fb-${i}`}><code>{f}</code></li>
                ))}
              </ul>
            </article>
          ) : null}

          {acceptanceCriteria.length > 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Critérios de aceitação</header>
              <ul className="atlas-ai-plan-list">
                {acceptanceCriteria.map((raw, i) => {
                  const ac = acceptanceLine(raw, i)
                  return (
                    <li key={`ac-${ac.id}`}>
                      <strong>{ac.id}.</strong> {ac.description}
                      {ac.verification ? (
                        <span className="atlas-ai-plan-faint"> · {ac.verification}{ac.ref ? ` · ${ac.ref}` : ''}</span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </article>
          ) : null}

          {validationCommands.length > 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Validation commands</header>
              <ul className="atlas-ai-plan-list atlas-ai-plan-list-mono">
                {validationCommands.map((c, i) => (
                  <li key={`vc-${i}`}><code>{c}</code></li>
                ))}
              </ul>
            </article>
          ) : null}

          {stopConditions.length > 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Stop conditions</header>
              <ul className="atlas-ai-plan-list">
                {stopConditions.map((s, i) => <li key={`sc-${i}`}>{s}</li>)}
              </ul>
            </article>
          ) : null}

          {escalationConditions.length > 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Escalation conditions</header>
              <ul className="atlas-ai-plan-list">
                {escalationConditions.map((e, i) => <li key={`ec-${i}`}>{e}</li>)}
              </ul>
            </article>
          ) : null}

          {/* Legacy thread-metadata cards (kept for chat flows that don't use plan-only) */}
          {legacyNextStep ? (
            <article className="atlas-ai-plan-card">
              <header>Próximo passo</header>
              <p>{legacyNextStep}</p>
            </article>
          ) : null}

          {contextSummary ? (
            <article className="atlas-ai-plan-card">
              <header>Contexto resumido</header>
              <p>{contextSummary}</p>
            </article>
          ) : null}

          {successCriteria.length > 0 && acceptanceCriteria.length === 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Critérios de sucesso</header>
              <ul className="atlas-ai-plan-list">
                {successCriteria.map((s, i) => <li key={`scc-${i}`}>{s}</li>)}
              </ul>
            </article>
          ) : null}

          {risks.length > 0 ? (
            <article className="atlas-ai-plan-card is-warning">
              <header>Riscos</header>
              <ul className="atlas-ai-plan-list">
                {risks.map((r, i) => <li key={`rk-${i}`}>{r}</li>)}
              </ul>
            </article>
          ) : null}

          {openQuestions.length > 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Perguntas em aberto</header>
              <ul className="atlas-ai-plan-list">
                {openQuestions.map((q, i) => <li key={`oq-${i}`}>{q}</li>)}
              </ul>
            </article>
          ) : null}

          {knownFiles.length > 0 && allowedFiles.length === 0 ? (
            <article className="atlas-ai-plan-card">
              <header>Arquivos citados</header>
              <ul className="atlas-ai-plan-list atlas-ai-plan-list-mono">
                {knownFiles.slice(0, 12).map((f, i) => (
                  <li key={`kf-${i}`}><code>{f}</code></li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      )}

      {atlasDevPlan ? (
        <p className="atlas-ai-plan-footnote">
          Plan-only · run {atlasDevPlan.run_id} · status {atlasDevPlan.status} · provider não chamado
        </p>
      ) : pendingTrace && pendingTrace.status === 'completed' ? (
        <p className="atlas-ai-plan-footnote">
          Último trace concluído · provider {pendingTrace.provider ?? '—'} · latência{' '}
          {pendingTrace.latency_ms ?? '—'}ms · modo {mode}
        </p>
      ) : null}

      {runPlan ? (
        <AtlasDevRunWorkbench plan={runPlan} disabled={atlasDevPlanLoading ?? false} />
      ) : null}
    </section>
  )
}

function AtlasDevReadinessPanel() {
  const [readiness, setReadiness] = useState<AtlasDevReadinessResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      setReadiness(await fetchAtlasDevReadiness({ strict: true }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'falha ao consultar readiness')
      setReadiness(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const blockers = readiness?.checks.filter(isBlockingCheck) ?? []

  return (
    <article className="atlas-ai-plan-card is-warning">
      <header>Readiness Atlas Dev</header>
      {loading && !readiness ? (
        <p className="atlas-ai-plan-faint">verificando runtime...</p>
      ) : error ? (
        <p>{error}</p>
      ) : readiness ? (
        <>
          <p>
            status {readiness.status} · {readiness.summary.passed} ok · {readiness.summary.failed} bloqueios
          </p>
          {blockers.length > 0 ? (
            <ul className="atlas-ai-plan-list">
              {blockers.slice(0, 5).map((check) => (
                <li key={check.id}>
                  <strong>{check.id}</strong> · {check.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="atlas-ai-plan-faint">runtime pronto; gere um novo plano.</p>
          )}
        </>
      ) : null}
      <button
        type="button"
        className="atlas-ai-plan-action"
        disabled={loading}
        onClick={() => void refresh()}
      >
        {loading ? 'verificando' : 'verificar novamente'}
      </button>
    </article>
  )
}

function isBlockingCheck(check: AtlasDevReadinessCheck): boolean {
  return check.status === 'failed' || (check.severity === 'blocker' && check.status !== 'passed')
}

function ForgePromotionBanner({ preview }: { preview: AtlasDevForgePromotionPreview }) {
  return (
    <article className="atlas-ai-plan-card atlas-ai-plan-promotion">
      <header>Promoção para Forge sugerida</header>
      {preview.reason ? <p>{preview.reason}</p> : null}
      {preview.target ? (
        <p className="atlas-ai-plan-faint">target · {preview.target}</p>
      ) : null}
      {preview.recommended_action ? (
        <p className="atlas-ai-plan-faint">ação · {preview.recommended_action}</p>
      ) : null}
      <p className="atlas-ai-plan-faint">
        Obra NÃO foi criada automaticamente · você decide se promove.
      </p>
    </article>
  )
}
