/**
 * Atlas AI · ContextPanel premium.
 *
 * Quatro seções nomeadas, separadas por hairline. Cada seção tem um
 * eyebrow uppercase + dl/list. Termina com nota editorial italic
 * (princípio Atlas AI = uma única inteligência).
 *
 *   1. Identidade     · workspace, surface, escopo
 *   2. Roteamento     · modo, tarefa, flow, provider, decision_mode
 *   3. Thread ativa   · id, mensagens, status, último provider
 *   4. Trace          · id, status, provider, latência (quando ativo)
 *   5. Atlas Dev Runtime (opcional, só com pendingTrace.atlas_dev_runtime)
 */
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
  const promotionTarget =
    mode === 'programming'
      ? 'Intervenção Rápida / Candidato'
      : 'Obra Forge (apenas se complexidade exigir)'
  const decisionMode = provider === 'auto' ? 'atlas_decide' : 'manual_override'
  const devRuntime: AtlasDevRuntime | null = pendingTrace?.atlas_dev_runtime ?? null

  return (
    <section className="atlas-ai-context" aria-label="Contexto operacional">
      <p className="atlas-ai-context-eyebrow">Contexto</p>

      <div className="atlas-ai-context-section">
        <h3>Identidade</h3>
        <dl className="atlas-ai-kv">
          <dt>Workspace</dt>
          <dd>
            {workspaceName ?? workspaceSlug ?? <span className="atlas-ai-faint">não selecionado</span>}
          </dd>
          <dt>Surface</dt>
          <dd><code>atlas_desktop_ai</code></dd>
          <dt>Obra exigida</dt>
          <dd>{mode === 'programming' ? 'não · Atlas Dev' : 'não'}</dd>
        </dl>
      </div>

      <div className="atlas-ai-context-section">
        <h3>Roteamento</h3>
        <dl className="atlas-ai-kv">
          <dt>Modo</dt>
          <dd>{mode}</dd>
          <dt>Tarefa</dt>
          <dd>{task}</dd>
          <dt>Flow</dt>
          <dd><code>{flowId}</code></dd>
          <dt>Provider</dt>
          <dd>{providerLabel(provider)}</dd>
          <dt>Decisão</dt>
          <dd><code>{decisionMode}</code></dd>
        </dl>
      </div>

      <div className="atlas-ai-context-section">
        <h3>Promoção</h3>
        <dl className="atlas-ai-kv">
          <dt>Possível</dt>
          <dd>{promotionTarget}</dd>
        </dl>
      </div>

      <div className="atlas-ai-context-section">
        <h3>Thread</h3>
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
        <h3>Trace recente</h3>
        {pendingTrace ? (
          <ul className="atlas-ai-context-list">
            <li><span>id</span><code>{pendingTrace.id}</code></li>
            <li><span>status</span><code>{pendingTrace.status}</code></li>
            <li><span>provider</span><code>{pendingTrace.provider ?? '—'}</code></li>
            <li><span>latência</span><code>{pendingTrace.latency_ms ?? '—'}ms</code></li>
          </ul>
        ) : (
          <p className="atlas-ai-empty-line">Nenhum trace ativo.</p>
        )}
      </div>

      {devRuntime ? (
        <div className="atlas-ai-context-section">
          <h3>Atlas Dev Runtime</h3>
          <ul className="atlas-ai-context-list">
            <li><span>flow</span><code>{devRuntime.flow_id}</code></li>
            <li><span>task</span><code>{devRuntime.task}</code></li>
            <li><span>workspace</span><code>{devRuntime.workspace}</code></li>
            <li><span>decisão</span><code>{devRuntime.decision_mode}</code></li>
            <li><span>provider</span><code>{devRuntime.provider ?? '—'}</code></li>
            <li><span>artefatos</span><code>{devRuntime.expected_artifacts.join(', ')}</code></li>
            <li><span>open brain</span><code>{devRuntime.open_brain_status ?? devRuntime.open_brain_policy ?? '—'}</code></li>
            <li><span>schema</span><code>{devRuntime.schema_version}</code></li>
          </ul>
        </div>
      ) : null}

      <p className="atlas-ai-context-note">
        Atlas AI é uma única inteligência. Conversa solta vive aqui — Obra nasce só quando
        risco, escopo ou duração crescer.
      </p>
    </section>
  )
}
