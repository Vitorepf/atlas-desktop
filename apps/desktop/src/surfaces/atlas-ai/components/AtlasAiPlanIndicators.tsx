/**
 * Atlas AI · Inline plan-only indicators.
 *
 * Linhas italic discretas, mesmo registro do AtlasAiOpenBrainBadge. Mostram
 * o que o plan-only produziu sem abrir o painel lateral:
 *
 *   open brain · parcial/completo/bloqueado
 *   escopo · N arquivos
 *   plan · pronto
 *
 * Suprimido quando o plano não existe ou está sem fontes — silêncio é
 * preferível a inventar status.
 */
import type { AtlasDevPlanResult } from '../types'

interface AtlasAiPlanIndicatorsProps {
  plan: AtlasDevPlanResult | null
}

function openBrainStatus(plan: AtlasDevPlanResult): { label: string; tone: 'good' | 'partial' | 'bad' | 'mute' } | null {
  const hint = plan.ui_hints?.open_brain_status
  if (hint === 'completo') return { label: 'completo', tone: 'good' }
  if (hint === 'parcial') return { label: 'parcial', tone: 'partial' }
  if (hint === 'bloqueado') return { label: 'bloqueado', tone: 'bad' }

  const truncation = plan.open_brain_projection?.truncation
  const missing =
    (plan.open_brain_projection?.missing_sources?.length ?? 0) +
    (plan.context_retrieval_plan?.missing_sources?.length ?? 0)
  const memory = plan.open_brain_projection?.memory_refs?.length ?? 0
  const knowledge = plan.open_brain_projection?.knowledge_refs?.length ?? 0
  const code = plan.open_brain_projection?.code_refs?.length ?? 0
  const anyRefs = memory + knowledge + code > 0

  if (!anyRefs && missing === 0 && !truncation) return null
  if (missing > 0 || truncation?.truncated) return { label: 'parcial', tone: 'partial' }
  return { label: 'completo', tone: 'good' }
}

function scopeFilesCount(plan: AtlasDevPlanResult): number {
  if (plan.ui_hints?.scope_files_count !== undefined) {
    return plan.ui_hints.scope_files_count
  }
  const fromSpec = plan.mini_spec?.allowed_files?.length ?? 0
  const fromContract = plan.task_contract?.allowed_files?.length ?? 0
  return Math.max(fromSpec, fromContract)
}

function planReady(plan: AtlasDevPlanResult): boolean {
  if (plan.ui_hints?.plan_ready !== undefined) return plan.ui_hints.plan_ready
  if (plan.status === 'ready') return true
  // Treat as ready when mini_spec + task_contract are both present.
  return !!plan.mini_spec?.goal && !!plan.task_contract
}

export function AtlasAiPlanIndicators({ plan }: AtlasAiPlanIndicatorsProps) {
  if (!plan) return null
  if (plan.status === 'unavailable') return null

  const ob = openBrainStatus(plan)
  const scope = scopeFilesCount(plan)
  const ready = planReady(plan)

  if (!ob && scope === 0 && !ready && plan.status === 'ready') {
    return null
  }

  return (
    <p className="atlas-ai-plan-indicators atlas-ai-faint" aria-label="Indicadores plan-only">
      {ob ? (
        <span className={`atlas-ai-plan-indicator tone-${ob.tone}`}>
          open brain · {ob.label}
        </span>
      ) : null}
      {scope > 0 ? (
        <span className="atlas-ai-plan-indicator">
          escopo · {scope} {scope === 1 ? 'arquivo' : 'arquivos'}
        </span>
      ) : null}
      {ready ? (
        <span className="atlas-ai-plan-indicator tone-good">plan · pronto</span>
      ) : plan.status === 'blocked' ? (
        <span className="atlas-ai-plan-indicator tone-bad">plan · bloqueado</span>
      ) : plan.status === 'forge_promotion_preview' ? (
        <span className="atlas-ai-plan-indicator tone-partial">plan · promoção sugerida</span>
      ) : null}
    </p>
  )
}
