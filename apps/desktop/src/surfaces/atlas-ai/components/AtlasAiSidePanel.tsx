/**
 * Atlas AI · Right side panel premium.
 *
 * Toggle Contexto ↔ Plano. Contexto: roteamento, thread, trace (read-only
 * meta). Plano: TODO acionável extraído da thread atual (riscos, perguntas
 * abertas, suggested next step) — quando não há thread, mostra hint.
 *
 * Quando o operador está no hero (sem thread), o painel default é
 * "Contexto" — mostra rota Atlas decide / flow / decisão. Assim que uma
 * thread aparece, Plano se torna mais útil (vira tela secundária honesta,
 * sem inventar trabalho).
 *
 * Atlas Dev plan-only (Claude 17 slice): quando `atlasDevPlan` é fornecido,
 * Contexto/Plano renderizam os artefatos canônicos
 * (selected_tiers/budget/refs/missing_sources/truncation no Contexto;
 * objective/non_goals/allowed/forbidden/acceptance/validation/stop/escalation
 * no Plano), sem chamar provider.
 */
import { useState } from 'react'
import { AtlasAiContextPanel } from './AtlasAiContextPanel'
import { AtlasAiPlanPanel } from './AtlasAiPlanPanel'
import type {
  AiThreadDetail,
  AiTrace,
  AtlasAiMode,
  AtlasAiProviderChoice,
  AtlasAiTask,
  AtlasDevPlanResult,
} from '../types'

type SidePanelTab = 'context' | 'plan'

interface AtlasAiSidePanelProps {
  workspaceSlug: string | null
  workspaceName: string | null
  thread: AiThreadDetail | null
  pendingTrace: AiTrace | null
  mode: AtlasAiMode
  task: AtlasAiTask
  provider: AtlasAiProviderChoice
  atlasDevPlan?: AtlasDevPlanResult | null
  atlasDevPlanLoading?: boolean
  atlasDevPlanError?: string | null
  atlasDevPlanUnavailable?: boolean
}

export function AtlasAiSidePanel(props: AtlasAiSidePanelProps) {
  const preferredTab: SidePanelTab = props.atlasDevPlan || props.thread ? 'plan' : 'context'
  const [manualTab, setManualTab] = useState<SidePanelTab | null>(null)
  const tab = manualTab ?? preferredTab

  return (
    <div className="atlas-ai-side">
      <nav className="atlas-ai-side-tabs" role="tablist" aria-label="Painel lateral">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'context'}
          className={`atlas-ai-side-tab${tab === 'context' ? ' is-active' : ''}`}
          onClick={() => setManualTab('context')}
        >
          Contexto
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'plan'}
          className={`atlas-ai-side-tab${tab === 'plan' ? ' is-active' : ''}`}
          onClick={() => setManualTab('plan')}
        >
          Plano
        </button>
      </nav>

      <div className="atlas-ai-side-body" role="tabpanel">
        {tab === 'context' ? (
          <AtlasAiContextPanel
            workspaceSlug={props.workspaceSlug}
            workspaceName={props.workspaceName}
            thread={props.thread}
            pendingTrace={props.pendingTrace}
            mode={props.mode}
            task={props.task}
            provider={props.provider}
            atlasDevPlan={props.atlasDevPlan ?? null}
            atlasDevPlanLoading={props.atlasDevPlanLoading ?? false}
            atlasDevPlanError={props.atlasDevPlanError ?? null}
            atlasDevPlanUnavailable={props.atlasDevPlanUnavailable ?? false}
          />
        ) : (
          <AtlasAiPlanPanel
            thread={props.thread}
            pendingTrace={props.pendingTrace}
            mode={props.mode}
            atlasDevPlan={props.atlasDevPlan ?? null}
            atlasDevPlanLoading={props.atlasDevPlanLoading ?? false}
            atlasDevPlanError={props.atlasDevPlanError ?? null}
            atlasDevPlanUnavailable={props.atlasDevPlanUnavailable ?? false}
          />
        )}
      </div>
    </div>
  )
}
