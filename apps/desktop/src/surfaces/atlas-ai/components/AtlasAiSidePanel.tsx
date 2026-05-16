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
 */
import { useEffect, useState } from 'react'
import { AtlasAiContextPanel } from './AtlasAiContextPanel'
import { AtlasAiPlanPanel } from './AtlasAiPlanPanel'
import type { AiThreadDetail, AiTrace, AtlasAiMode, AtlasAiProviderChoice, AtlasAiTask } from '../types'

type SidePanelTab = 'context' | 'plan'

interface AtlasAiSidePanelProps {
  workspaceSlug: string | null
  workspaceName: string | null
  thread: AiThreadDetail | null
  pendingTrace: AiTrace | null
  mode: AtlasAiMode
  task: AtlasAiTask
  provider: AtlasAiProviderChoice
}

export function AtlasAiSidePanel(props: AtlasAiSidePanelProps) {
  const [tab, setTab] = useState<SidePanelTab>('context')

  // Quando uma thread é carregada, o operador costuma querer ver o Plano
  // primeiro (próximo passo, riscos). Sem thread, mantém Contexto.
  useEffect(() => {
    if (props.thread) {
      setTab('plan')
    } else {
      setTab('context')
    }
  }, [props.thread?.id])

  return (
    <div className="atlas-ai-side">
      <nav className="atlas-ai-side-tabs" role="tablist" aria-label="Painel lateral">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'context'}
          className={`atlas-ai-side-tab${tab === 'context' ? ' is-active' : ''}`}
          onClick={() => setTab('context')}
        >
          Contexto
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'plan'}
          className={`atlas-ai-side-tab${tab === 'plan' ? ' is-active' : ''}`}
          onClick={() => setTab('plan')}
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
          />
        ) : (
          <AtlasAiPlanPanel
            thread={props.thread}
            pendingTrace={props.pendingTrace}
            mode={props.mode}
          />
        )}
      </div>
    </div>
  )
}
