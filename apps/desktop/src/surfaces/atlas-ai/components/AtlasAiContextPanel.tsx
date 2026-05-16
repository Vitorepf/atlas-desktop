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
  AtlasDevPlanResult,
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
  atlasDevPlan?: AtlasDevPlanResult | null
  atlasDevPlanLoading?: boolean
  atlasDevPlanError?: string | null
  atlasDevPlanUnavailable?: boolean
}

export function AtlasAiContextPanel({
  workspaceSlug,
  workspaceName,
  thread,
  pendingTrace,
  mode,
  task,
  provider,
  atlasDevPlan,
  atlasDevPlanLoading,
  atlasDevPlanError,
  atlasDevPlanUnavailable,
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

      <AtlasDevPlanContextSection
        plan={atlasDevPlan ?? null}
        loading={atlasDevPlanLoading ?? false}
        error={atlasDevPlanError ?? null}
        unavailable={atlasDevPlanUnavailable ?? false}
      />

      <p className="atlas-ai-context-note">
        Atlas AI é uma única inteligência. Conversa solta vive aqui — Obra nasce só quando
        risco, escopo ou duração crescer.
      </p>
    </section>
  )
}

interface AtlasDevPlanContextSectionProps {
  plan: AtlasDevPlanResult | null
  loading: boolean
  error: string | null
  unavailable: boolean
}

function AtlasDevPlanContextSection({ plan, loading, error, unavailable }: AtlasDevPlanContextSectionProps) {
  if (loading) {
    return (
      <div className="atlas-ai-context-section atlas-ai-context-plan">
        <h3>Atlas Dev · Contexto</h3>
        <p className="atlas-ai-empty-line atlas-ai-faint">consultando plano…</p>
      </div>
    )
  }

  if (unavailable) {
    return (
      <div className="atlas-ai-context-section atlas-ai-context-plan">
        <h3>Atlas Dev · Contexto</h3>
        <p className="atlas-ai-empty-line atlas-ai-faint">
          plan-only endpoint ainda não disponível · usando fluxo legado
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="atlas-ai-context-section atlas-ai-context-plan">
        <h3>Atlas Dev · Contexto</h3>
        <p className="atlas-ai-empty-line atlas-ai-faint">erro · {error}</p>
      </div>
    )
  }

  if (!plan) {
    return null
  }

  const retrieval = plan.context_retrieval_plan
  const projection = plan.open_brain_projection
  const truncation = projection?.truncation
  const budget = projection?.budget
  const selectedTiers = retrieval?.selected_tiers ?? []
  const requiredSources = retrieval?.required_sources ?? []
  const optionalSources = retrieval?.optional_sources ?? []
  const missingSources = [
    ...(retrieval?.missing_sources ?? []),
    ...(projection?.missing_sources ?? []),
  ]
  const memoryRefs = projection?.memory_refs ?? []
  const knowledgeRefs = projection?.knowledge_refs ?? []
  const codeRefs = projection?.code_refs ?? []

  return (
    <div className="atlas-ai-context-section atlas-ai-context-plan">
      <h3>Atlas Dev · Contexto</h3>
      <ul className="atlas-ai-context-list">
        <li><span>run</span><code>{plan.run_id}</code></li>
        <li><span>status</span><code>{plan.status}</code></li>
        {retrieval?.budget_chars !== undefined ? (
          <li><span>orçamento</span><code>{retrieval.budget_chars} chars</code></li>
        ) : null}
        {budget?.chars_used !== undefined && budget?.chars_used !== null ? (
          <li>
            <span>usado</span>
            <code>
              {budget.chars_used}/{budget.chars_requested ?? '—'} chars
            </code>
          </li>
        ) : null}
        {truncation ? (
          <li>
            <span>truncação</span>
            <code>{truncation.truncated ? `parcial · ${truncation.reasons?.join(', ') ?? 'sem razão'}` : 'completo'}</code>
          </li>
        ) : null}
      </ul>

      {selectedTiers.length > 0 ? (
        <div className="atlas-ai-context-subblock">
          <p className="atlas-ai-context-subblock-title">tiers selecionados</p>
          <ul className="atlas-ai-context-chip-list">
            {selectedTiers.map((tier) => (
              <li key={tier}><code>{tier}</code></li>
            ))}
          </ul>
        </div>
      ) : null}

      {memoryRefs.length > 0 ? (
        <div className="atlas-ai-context-subblock">
          <p className="atlas-ai-context-subblock-title">memory · {memoryRefs.length}</p>
          <ul className="atlas-ai-context-ref-list">
            {memoryRefs.slice(0, 6).map((r, i) => (
              <li key={`mr-${i}`}><code>{r.ref}</code><em>{r.reason}</em></li>
            ))}
          </ul>
        </div>
      ) : null}

      {knowledgeRefs.length > 0 ? (
        <div className="atlas-ai-context-subblock">
          <p className="atlas-ai-context-subblock-title">knowledge · {knowledgeRefs.length}</p>
          <ul className="atlas-ai-context-ref-list">
            {knowledgeRefs.slice(0, 6).map((r, i) => (
              <li key={`kr-${i}`}><code>{r.ref}</code><em>{r.reason}</em></li>
            ))}
          </ul>
        </div>
      ) : null}

      {codeRefs.length > 0 ? (
        <div className="atlas-ai-context-subblock">
          <p className="atlas-ai-context-subblock-title">code · {codeRefs.length}</p>
          <ul className="atlas-ai-context-ref-list">
            {codeRefs.slice(0, 6).map((r, i) => (
              <li key={`cr-${i}`}><code>{r.ref}</code><em>{r.reason}</em></li>
            ))}
          </ul>
        </div>
      ) : null}

      {requiredSources.length > 0 ? (
        <div className="atlas-ai-context-subblock">
          <p className="atlas-ai-context-subblock-title">required · {requiredSources.length}</p>
          <ul className="atlas-ai-context-mono-list">
            {requiredSources.slice(0, 8).map((s, i) => (
              <li key={`req-${i}`}><code>{s}</code></li>
            ))}
          </ul>
        </div>
      ) : null}

      {optionalSources.length > 0 ? (
        <div className="atlas-ai-context-subblock">
          <p className="atlas-ai-context-subblock-title">optional · {optionalSources.length}</p>
          <ul className="atlas-ai-context-mono-list">
            {optionalSources.slice(0, 8).map((s, i) => (
              <li key={`opt-${i}`}><code>{s}</code></li>
            ))}
          </ul>
        </div>
      ) : null}

      {missingSources.length > 0 ? (
        <div className="atlas-ai-context-subblock atlas-ai-context-warning">
          <p className="atlas-ai-context-subblock-title">missing · {missingSources.length}</p>
          <ul className="atlas-ai-context-mono-list">
            {missingSources.slice(0, 8).map((s, i) => (
              <li key={`miss-${i}`}><code>{s}</code></li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
