import { flowIdForMode, providerLabel } from '../contract'
import type {
  AiThreadDetail,
  AiTrace,
  AtlasAiMode,
  AtlasAiProviderChoice,
  AtlasAiTask,
  AtlasDevRuntime,
} from '../types'

interface AtlasAiContextPanelProps {
  workspaceSlug: string | null
  workspaceName: string | null
  thread: AiThreadDetail | null
  pendingTrace: AiTrace | null
  mode: AtlasAiMode
  task: AtlasAiTask
  provider: AtlasAiProviderChoice
}

export function AtlasAiContextPanel({
  workspaceSlug,
  workspaceName,
  thread,
  pendingTrace,
  mode,
  task,
  provider,
}: AtlasAiContextPanelProps) {
  const flowId = flowIdForMode(mode, task)
  const promotionTarget = mode === 'programming' ? 'Intervenção Rápida / Candidato de Obra' : 'Obra Forge (apenas se complexidade exigir)'
  const devRuntime: AtlasDevRuntime | null = pendingTrace?.atlas_dev_runtime ?? null

  return (
    <section className="atlas-ai-context" aria-label="Contexto e trace">
      <header>
        <h3>Contexto</h3>
      </header>

      <dl className="atlas-ai-kv">
        <dt>Workspace</dt>
        <dd>
          {workspaceName ?? workspaceSlug ?? <span className="atlas-ai-faint">— não selecionado</span>}
        </dd>
        <dt>Surface</dt>
        <dd><code>atlas_desktop_ai</code></dd>
        <dt>Modo</dt>
        <dd>{mode}</dd>
        <dt>Tarefa</dt>
        <dd>{task}</dd>
        <dt>Flow</dt>
        <dd><code>{flowId}</code></dd>
        <dt>Provider</dt>
        <dd>{providerLabel(provider)}</dd>
        <dt>Decision mode</dt>
        <dd><code>{provider === 'auto' ? 'atlas_decide' : 'manual_override'}</code></dd>
        <dt>Obra exigida</dt>
        <dd>{mode === 'programming' ? 'não (Atlas Dev)' : 'não'}</dd>
        <dt>Promoção possível</dt>
        <dd>{promotionTarget}</dd>
      </dl>

      {devRuntime ? (
        <div className="atlas-ai-context-section">
          <h4>Atlas Dev Runtime</h4>
          <ul className="atlas-ai-context-list">
            <li><span>flow</span><code>{devRuntime.flow_id}</code></li>
            <li><span>task</span><code>{devRuntime.task}</code></li>
            <li><span>workspace</span><code>{devRuntime.workspace}</code></li>
            <li><span>decision</span><code>{devRuntime.decision_mode}</code></li>
            <li><span>provider</span><code>{devRuntime.provider ?? '—'}</code></li>
            <li>
              <span>artefatos</span>
              <code>{devRuntime.expected_artifacts.join(', ')}</code>
            </li>
            <li><span>open brain</span><code>{devRuntime.open_brain_status ?? devRuntime.open_brain_policy ?? '—'}</code></li>
            <li><span>schema</span><code>{devRuntime.schema_version}</code></li>
          </ul>
        </div>
      ) : null}

      <div className="atlas-ai-context-section">
        <h4>Thread</h4>
        {thread ? (
          <ul className="atlas-ai-context-list">
            <li><span>id</span><code>{thread.id}</code></li>
            <li><span>workspace</span><code>{thread.workspace ?? '—'}</code></li>
            <li><span>provider</span><code>{thread.last_provider ?? '—'}</code></li>
            <li><span>mensagens</span><code>{thread.message_count}</code></li>
            <li><span>status</span><code>{thread.status}</code></li>
          </ul>
        ) : (
          <p className="atlas-ai-empty-line">Sem thread carregada.</p>
        )}
      </div>

      <div className="atlas-ai-context-section">
        <h4>Trace recente</h4>
        {pendingTrace ? (
          <ul className="atlas-ai-context-list">
            <li><span>id</span><code>{pendingTrace.id}</code></li>
            <li><span>status</span><code>{pendingTrace.status}</code></li>
            <li><span>provider</span><code>{pendingTrace.provider ?? '—'}</code></li>
            <li><span>latency</span><code>{pendingTrace.latency_ms ?? '—'}ms</code></li>
          </ul>
        ) : (
          <p className="atlas-ai-empty-line">Nenhum trace ativo.</p>
        )}
      </div>

      <p className="atlas-ai-context-note">
        Atlas AI é uma única inteligência. Não exige Obra para bug pequeno, debug ou conversa
        técnica. Promova para Forge apenas quando a conversa crescer em risco, escopo ou
        duração.
      </p>
    </section>
  )
}
