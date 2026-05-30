/**
 * Atlas AI · ContextPanel premium (Hyperflow-first).
 *
 * Seções nomeadas, separadas por hairline. A camada "Roteamento" agora
 * mostra a **decisão Hyperflow real** da execução quando disponível; o que o
 * front pediu vai como `hint`. Atlas Dev Runtime / Forge aparecem só quando
 * a execução canônica os carrega — front não força nenhum dos dois.
 *
 *   1. Identidade            · projeto, superfície, escopo
 *   2. Roteamento (front)    · hint pedido pelo composer
 *   3. Caminho escolhido     · execução canônica real (intent/domain/flow/...)
 *   4. Conversa ativa        · id, mensagens, status, último modelo
 *   5. Execução recente      · id, status, modelo, latência
 *   6. Atlas Dev Runtime     · só com pendingTrace.atlas_dev_runtime
 *   7. Forge handoff         · só com hyperflow.handoff_target.startsWith('forge')
 */
import { flowIdForMode, modelLabel, providerLabel } from '../contract'
import { humanizeRuntimeSignal, type RuntimeReadinessView } from '../runtimeReadinessView'
import { useHyperflowRuntime } from '../useHyperflowRuntime'
import { usePatamar4State, patamar4StatusLabel } from '../usePatamar4State'
import { useRuntimeReadiness } from '../useRuntimeReadiness'
import { AtlasAiRuntimeStatusPill } from './AtlasAiRuntimeStatusPill'
import type {
  AiThreadDetail,
  AiTrace,
  AtlasAiMode,
  AtlasAiProviderChoice,
  AtlasAiTask,
  AtlasDevPlanResult,
  AtlasDevRuntime,
} from '../types'

function labelMode(mode: AtlasAiMode): string {
  const labels: Partial<Record<AtlasAiMode, string>> = {
    auto: 'Atlas decide',
    general: 'Geral',
    conversation: 'Conversa',
    operational: 'Operacional',
    programming: 'Código',
    research: 'Pesquisa',
    finance: 'Finanças',
    marketing: 'Marketing',
    strategy: 'Estratégia',
    personal_development: 'Pessoal',
    cyber: 'Cyber',
    automation: 'Automação',
  }
  return labels[mode] ?? mode
}

function labelTask(task: AtlasAiTask): string {
  const labels: Partial<Record<AtlasAiTask, string>> = {
    auto: 'Atlas decide',
    plan: 'Plano',
    direct: 'Resposta direta',
    dev: 'Código',
    debug: 'Diagnóstico',
    review: 'Revisão',
  }
  return labels[task] ?? task.replace(/[._-]+/g, ' ')
}

function labelDecisionMode(decisionMode: 'atlas_decide' | 'manual_override'): string {
  return decisionMode === 'atlas_decide' ? 'Atlas escolhe' : 'Escolha manual'
}

function labelRuntimeStatus(status: string): string {
  if (status === 'ready') return 'pronto'
  if (status === 'partial') return 'atenção'
  if (status === 'blocked') return 'certificação pendente'
  if (status === 'loading') return 'verificando'
  return 'indisponível'
}

function labelThreadStatus(status: string | null | undefined): string {
  if (status === 'active') return 'ativa'
  if (status === 'archived') return 'arquivada'
  if (status === 'deleted') return 'removida'
  if (status === 'ready') return 'pronto'
  if (status === 'blocked') return 'atenção pendente'
  if (status === 'partial') return 'parcial'
  if (status === 'completed') return 'concluída'
  if (status === 'processing' || status === 'running') return 'em execução'
  if (status === 'queued') return 'na fila'
  return status ?? 'sem estado'
}

function humanizeCompactLabel(value: string): string {
  return value
    .replace(/^workspace_/i, '')
    .replace(/[._-]+/g, ' ')
    .trim()
}

function projectDisplayName(value: string | null | undefined, fallback: string | null): string {
  const raw = value?.trim() || fallback?.trim() || ''
  if (!raw) return 'não selecionado'
  const parts = raw.split(/[\\/]+/).filter(Boolean)
  const last = parts[parts.length - 1] ?? raw
  return last
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || raw
}

function handoffLabel(value: string | null | undefined): string {
  switch (value) {
    case 'atlas_dev':
      return 'Code'
    case 'atlas_forge':
      return 'Forge'
    case 'subagent_projection':
      return 'agentes'
    default:
      return value ? humanizeCompactLabel(value) : 'Atlas decide'
  }
}

function expectedArtifactLabel(value: string): string {
  switch (value) {
    case 'plan':
      return 'plano'
    case 'diff_or_reason':
      return 'mudança ou justificativa'
    case 'tests_or_reason':
      return 'testes ou justificativa'
    case 'risks':
      return 'riscos'
    default:
      return humanizeCompactLabel(value)
  }
}

function openBrainLabel(value: string | null | undefined): string {
  switch (value) {
    case 'complete':
    case 'completo':
    case 'ready':
      return 'completo'
    case 'partial':
    case 'parcial':
      return 'parcial'
    case 'blocked':
    case 'bloqueado':
    case 'failed_closed':
      return 'atenção pendente'
    case 'not_required':
      return 'não exigido'
    default:
      return value ? humanizeCompactLabel(value) : 'não informado'
  }
}

interface AtlasAiContextPanelProps {
  workspaceSlug: string | null
  workspaceName: string | null
  thread: AiThreadDetail | null
  pendingTrace: AiTrace | null
  mode: AtlasAiMode
  task: AtlasAiTask
  provider: AtlasAiProviderChoice
  runtimeReadiness?: RuntimeReadinessView | null
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
  runtimeReadiness: runtimeReadinessOverride,
  atlasDevPlan,
  atlasDevPlanLoading,
  atlasDevPlanError,
  atlasDevPlanUnavailable,
}: AtlasAiContextPanelProps) {
  const flowId = flowIdForMode(mode, task)
  const promotionTarget =
    mode === 'programming'
      ? 'Intervenção Rápida / Candidato'
      : mode === 'auto'
        ? 'Atlas decide pelo contexto'
        : 'Obra Forge (apenas se complexidade exigir)'
  const decisionMode = provider === 'auto' ? 'atlas_decide' : 'manual_override'
  const devRuntime: AtlasDevRuntime | null = pendingTrace?.atlas_dev_runtime ?? null
  const hyperflow = useHyperflowRuntime(pendingTrace)
  const liveRuntimeReadiness = useRuntimeReadiness()
  const runtimeReadiness = runtimeReadinessOverride ?? liveRuntimeReadiness
  const patamar4 = usePatamar4State()
  const showPatamar4Block = patamar4.status === 'ready' || patamar4.status === 'stale'
  const showForgeBlock = hyperflow.isForgeHandoff
  const policyRefs = hyperflow.raw?.policy_refs ?? null
  const evidenceRefs = hyperflow.raw?.evidence_refs ?? null
  const showRuntimeBlock = runtimeReadiness.status !== 'unavailable' && runtimeReadiness.status !== 'loading'

  return (
    <section className="atlas-ai-context" aria-label="Contexto operacional">
      <p className="atlas-ai-context-eyebrow">Contexto</p>

      <div className="atlas-ai-context-section">
        <h3>Identidade</h3>
        <dl className="atlas-ai-kv">
          <dt>Projeto</dt>
          <dd>
            {workspaceName ?? workspaceSlug ?? <span className="atlas-ai-faint">não selecionado</span>}
          </dd>
          <dt>Aplicativo</dt>
          <dd>Atlas Desktop</dd>
          <dt>Escopo</dt>
          <dd>
            {mode === 'programming'
              ? 'sessão de código'
              : mode === 'auto'
                ? 'Atlas decide pelo contexto'
                : 'conversa simples'}
          </dd>
        </dl>
      </div>

      <div className="atlas-ai-context-section">
        <h3>Caminho inicial</h3>
        <dl className="atlas-ai-kv">
          <dt>Modo</dt>
          <dd>{labelMode(mode)}</dd>
          <dt>Pedido</dt>
          <dd>{labelTask(task)}</dd>
          <dt>Caminho</dt>
          <dd>{flowId === 'auto' ? 'Atlas decide' : flowId.replace(/[._-]+/g, ' ')}</dd>
          <dt>Modelo</dt>
          <dd>{providerLabel(provider)}</dd>
          <dt>Decisão</dt>
          <dd>{labelDecisionMode(decisionMode)}</dd>
        </dl>
        <p className="atlas-ai-context-note atlas-ai-faint" style={{ marginTop: 4 }}>
          <em>Atlas coleta contexto, escolhe o melhor caminho e mostra a execução abaixo.</em>
        </p>
      </div>

      {hyperflow.isReady ? (
        <div className="atlas-ai-context-section atlas-ai-context-hyperflow">
          <h3>Caminho escolhido</h3>
          <ul className="atlas-ai-context-list">
            {hyperflow.intent ? (
              <li><span>intenção</span><code>{humanizeCompactLabel(hyperflow.intent)}</code></li>
            ) : null}
            {hyperflow.domainId ? (
              <li><span>domínio</span><code>{humanizeCompactLabel(hyperflow.domainId)}</code></li>
            ) : null}
            {hyperflow.flowId ? (
              <li><span>caminho</span><code>{humanizeCompactLabel(hyperflow.flowId)}</code></li>
            ) : null}
            {hyperflow.runtimeMode ? (
              <li><span>execução</span><code>{humanizeCompactLabel(hyperflow.runtimeMode)}</code></li>
            ) : null}
            {typeof hyperflow.confidence === 'number' ? (
              <li><span>confiança</span><code>{hyperflow.confidence.toFixed(2)}</code></li>
            ) : null}
            {hyperflow.dispatchStatus ? (
              <li><span>envio</span><code>{labelThreadStatus(hyperflow.dispatchStatus)}</code></li>
            ) : null}
            {hyperflow.raw?.decision_receipt_id || hyperflow.receiptHash ? (
              <li><span>recibo</span><code>registrado</code></li>
            ) : null}
            {hyperflow.handoffTarget ? (
              <li><span>destino</span><code>{handoffLabel(hyperflow.handoffTarget)}</code></li>
            ) : null}
            {policyRefs && policyRefs.length > 0 ? (
              <li>
                <span>regras</span>
                <code>{policyRefs.length} regra{policyRefs.length === 1 ? '' : 's'}</code>
              </li>
            ) : null}
            {evidenceRefs && evidenceRefs.length > 0 ? (
              <li>
                <span>evidências</span>
                <code>{evidenceRefs.length} ref(s)</code>
              </li>
            ) : null}
            {hyperflow.routingReasonSummary ? (
              <li>
                <span>razão</span>
                <code>{hyperflow.routingReasonSummary}</code>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {showRuntimeBlock ? (
        <div
          className={`atlas-ai-context-section atlas-ai-context-runtime atlas-ai-context-runtime-${runtimeReadiness.status}`}
        >
          <h3 className="atlas-ai-context-heading-with-pill">
            <span>Saúde do AWIS</span>
            <span className="atlas-ai-context-runtime-pill">
              <AtlasAiRuntimeStatusPill readiness={runtimeReadiness} />
            </span>
          </h3>
          <ul className="atlas-ai-context-list">
            <li>
              <span>estado</span>
              <code>{labelRuntimeStatus(runtimeReadiness.status)}</code>
            </li>
            {runtimeReadiness.raw?.summary ? (
              <li>
                <span>verificações</span>
                <code>
                  {runtimeReadiness.raw.summary.passed ?? 0}/{runtimeReadiness.raw.summary.total ?? 0} prontas
                </code>
              </li>
            ) : null}
            {runtimeReadiness.criticalFailed > 0 ? (
              <li>
                <span>críticos</span>
                <code>{runtimeReadiness.criticalFailed} pendente(s)</code>
              </li>
            ) : null}
            {runtimeReadiness.warnFailed > 0 ? (
              <li>
                <span>atenções</span>
                <code>{runtimeReadiness.warnFailed}</code>
              </li>
            ) : null}
            {runtimeReadiness.certificationHash ? (
              <li>
                <span>certificação</span>
                <code>registrada</code>
              </li>
            ) : null}
          </ul>
          {runtimeReadiness.blockers.length > 0 ? (
            <div className="atlas-ai-context-subblock atlas-ai-context-warning">
              <p className="atlas-ai-context-subblock-title">
                pendências críticas · {runtimeReadiness.blockers.length}
              </p>
              <ul className="atlas-ai-context-mono-list">
                {runtimeReadiness.blockers.slice(0, 6).map((id) => (
                  <li key={`blk-${id}`}>
                    <span title={id}>{humanizeRuntimeSignal(id)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {runtimeReadiness.warnings.length > 0 ? (
            <div className="atlas-ai-context-subblock">
              <p className="atlas-ai-context-subblock-title">
                atenções · {runtimeReadiness.warnings.length}
              </p>
              <ul className="atlas-ai-context-mono-list">
                {runtimeReadiness.warnings.slice(0, 6).map((id) => (
                  <li key={`warn-${id}`}>
                    <span title={id}>{humanizeRuntimeSignal(id)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="atlas-ai-context-note atlas-ai-faint" style={{ marginTop: 4 }}>
            <em>Leitura agregada de projeto, execução local, aprovações e aprendizado.</em>
          </p>
        </div>
      ) : null}

      {showPatamar4Block ? (
        <div className={`atlas-ai-context-section atlas-ai-context-patamar4 atlas-ai-context-patamar4-${patamar4.status}`}>
          <h3 className="atlas-ai-context-heading-with-pill">
            <span>Patamar 4 · substrato cognitivo</span>
            <span className="atlas-ai-context-runtime-pill">
              <code>{patamar4StatusLabel(patamar4.status)}</code>
            </span>
          </h3>
          <ul className="atlas-ai-context-list">
            <li><span>subsistemas</span><code>{patamar4.subsystemCount}</code></li>
            <li><span>grupos</span><code>{patamar4.groupCount}</code></li>
            <li><span>kernel</span><code>{patamar4.kernel.invariantCount} invariantes</code></li>
            {patamar4.kernel.violationCount > 0 ? (
              <li>
                <span>violações</span>
                <code>{patamar4.kernel.violationCount}</code>
              </li>
            ) : null}
            <li><span>ticks reconciliação</span><code>{patamar4.reconciliation.tickCount}</code></li>
            {Object.entries(patamar4.reconciliation.outcomeTally).map(([outcome, count]) =>
              count > 0 ? (
                <li key={`p4-outcome-${outcome}`}>
                  <span>{outcome.replace(/_/g, ' ')}</span>
                  <code>{count}</code>
                </li>
              ) : null,
            )}
            <li><span>admissão</span><code>{patamar4.admissionTicketCount} tickets</code></li>
            <li><span>TEOS-I4 árvores</span><code>{patamar4.teosI4TreeCount}</code></li>
            <li><span>swarm dispatches</span><code>{patamar4.swarmDispatchCount}</code></li>
            <li><span>TDC ativos</span><code>{patamar4.tdcActiveCapsules}</code></li>
            {patamar4.antifragility.wrapperMultiplierM !== null ? (
              <li>
                <span>antifragilidade M</span>
                <code>{patamar4.antifragility.wrapperMultiplierM.toFixed(2)}×</code>
              </li>
            ) : null}
            <li>
              <span>claim policy</span>
              <code>{patamar4.claimPolicySafe ? 'safe' : 'AT RISK'}</code>
            </li>
          </ul>
          <p className="atlas-ai-context-note atlas-ai-faint" style={{ marginTop: 4 }}>
            <em>Loop fechado: Kernel → Admission → CFA → Reconciliação → AURG → ASCB.</em>
          </p>
        </div>
      ) : null}

      <div className="atlas-ai-context-section">
        <h3>Evolução</h3>
        <dl className="atlas-ai-kv">
          <dt>Próximo passo</dt>
          <dd>{promotionTarget}</dd>
        </dl>
      </div>

      <div className="atlas-ai-context-section">
          <h3>Conversa</h3>
        {thread ? (
          <ul className="atlas-ai-context-list">
            <li><span>projeto</span><code>{projectDisplayName(thread.workspace, workspaceName ?? workspaceSlug)}</code></li>
              <li><span>modelo</span><code>{modelLabel(thread.last_provider)}</code></li>
            <li><span>mensagens</span><code>{thread.message_count}</code></li>
            <li><span>estado</span><code>{labelThreadStatus(thread.status)}</code></li>
          </ul>
        ) : (
          <p className="atlas-ai-empty-line">Sem conversa carregada.</p>
        )}
      </div>

      <div className="atlas-ai-context-section">
          <h3>Execução recente</h3>
        {pendingTrace ? (
          <ul className="atlas-ai-context-list">
            <li><span>recibo</span><code>{pendingTrace.id.slice(0, 16)}…</code></li>
            <li><span>estado</span><code>{labelThreadStatus(pendingTrace.status)}</code></li>
            <li><span>modelo</span><code>{modelLabel(pendingTrace.provider)}</code></li>
            <li><span>latência</span><code>{pendingTrace.latency_ms ?? '—'}ms</code></li>
          </ul>
        ) : (
          <p className="atlas-ai-empty-line">Nenhuma execução ativa.</p>
        )}
      </div>

      {showForgeBlock ? (
        <div className="atlas-ai-context-section atlas-ai-context-forge">
          <h3>Encaminhamento Forge</h3>
          <ul className="atlas-ai-context-list">
            <li><span>destino</span><code>{handoffLabel(hyperflow.handoffTarget)}</code></li>
            {hyperflow.handoffReason ? (
              <li><span>motivo</span><code>{humanizeCompactLabel(hyperflow.handoffReason)}</code></li>
            ) : null}
            {hyperflow.dispatchStatus ? (
              <li><span>envio</span><code>{labelThreadStatus(hyperflow.dispatchStatus)}</code></li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {devRuntime ? (
        <div className="atlas-ai-context-section">
          <h3>Execução de código</h3>
          <ul className="atlas-ai-context-list">
            <li><span>caminho</span><code title={devRuntime.flow_id}>{humanizeCompactLabel(devRuntime.flow_id)}</code></li>
            <li><span>pedido</span><code title={devRuntime.task}>{humanizeCompactLabel(devRuntime.task)}</code></li>
            <li><span>projeto</span><code>{projectDisplayName(devRuntime.workspace, workspaceName ?? workspaceSlug)}</code></li>
            <li><span>decisão</span><code title={devRuntime.decision_mode}>{labelDecisionMode(devRuntime.decision_mode)}</code></li>
            <li><span>modelo</span><code>{modelLabel(devRuntime.provider)}</code></li>
            <li><span>entregas</span><code>{devRuntime.expected_artifacts.map(expectedArtifactLabel).join(', ')}</code></li>
            <li><span>memória</span><code>{openBrainLabel(devRuntime.open_brain_status ?? devRuntime.open_brain_policy)}</code></li>
            <li><span>contrato</span><code>registrado</code></li>
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
        <h3>Contexto de código</h3>
        <p className="atlas-ai-empty-line atlas-ai-faint">consultando plano…</p>
      </div>
    )
  }

  if (unavailable) {
    return (
      <div className="atlas-ai-context-section atlas-ai-context-plan">
        <h3>Contexto de código</h3>
        <p className="atlas-ai-empty-line atlas-ai-faint">
          Plano técnico ainda não disponível no serviço local. Atlas continua pela conversa normal.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="atlas-ai-context-section atlas-ai-context-plan">
        <h3>Contexto de código</h3>
        <p className="atlas-ai-empty-line atlas-ai-faint" title={error}>
          Não consegui carregar o plano técnico agora. A conversa continua funcionando.
        </p>
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
      <h3>Contexto de código</h3>
      <ul className="atlas-ai-context-list">
        <li><span>recibo</span><code>{plan.run_id.slice(0, 16)}…</code></li>
        <li><span>estado</span><code>{labelThreadStatus(plan.status)}</code></li>
        {retrieval?.budget_chars !== undefined ? (
          <li><span>limite</span><code>{retrieval.budget_chars.toLocaleString('pt-BR')} caracteres</code></li>
        ) : null}
        {budget?.chars_used !== undefined && budget?.chars_used !== null ? (
          <li>
            <span>uso</span>
            <code>
              {budget.chars_used.toLocaleString('pt-BR')}/{budget.chars_requested?.toLocaleString('pt-BR') ?? '—'} caracteres
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
          <p className="atlas-ai-context-subblock-title">camadas selecionadas</p>
          <ul className="atlas-ai-context-chip-list">
            {selectedTiers.map((tier) => (
              <li key={tier}><span title={tier}>{humanizeCompactLabel(tier)}</span></li>
            ))}
          </ul>
        </div>
      ) : null}

      {memoryRefs.length > 0 ? (
        <div className="atlas-ai-context-subblock">
          <p className="atlas-ai-context-subblock-title">memória · {memoryRefs.length}</p>
          <ul className="atlas-ai-context-ref-list">
            {memoryRefs.slice(0, 6).map((r, i) => (
              <li key={`mr-${i}`}><code>{r.ref}</code><em>{r.reason}</em></li>
            ))}
          </ul>
        </div>
      ) : null}

      {knowledgeRefs.length > 0 ? (
        <div className="atlas-ai-context-subblock">
          <p className="atlas-ai-context-subblock-title">conhecimento · {knowledgeRefs.length}</p>
          <ul className="atlas-ai-context-ref-list">
            {knowledgeRefs.slice(0, 6).map((r, i) => (
              <li key={`kr-${i}`}><code>{r.ref}</code><em>{r.reason}</em></li>
            ))}
          </ul>
        </div>
      ) : null}

      {codeRefs.length > 0 ? (
        <div className="atlas-ai-context-subblock">
          <p className="atlas-ai-context-subblock-title">código · {codeRefs.length}</p>
          <ul className="atlas-ai-context-ref-list">
            {codeRefs.slice(0, 6).map((r, i) => (
              <li key={`cr-${i}`}><code>{r.ref}</code><em>{r.reason}</em></li>
            ))}
          </ul>
        </div>
      ) : null}

      {requiredSources.length > 0 ? (
        <div className="atlas-ai-context-subblock">
          <p className="atlas-ai-context-subblock-title">fontes principais · {requiredSources.length}</p>
          <ul className="atlas-ai-context-mono-list">
            {requiredSources.slice(0, 8).map((s, i) => (
              <li key={`req-${i}`}><span title={s}>{humanizeCompactLabel(s)}</span></li>
            ))}
          </ul>
        </div>
      ) : null}

      {optionalSources.length > 0 ? (
        <div className="atlas-ai-context-subblock">
          <p className="atlas-ai-context-subblock-title">fontes extras · {optionalSources.length}</p>
          <ul className="atlas-ai-context-mono-list">
            {optionalSources.slice(0, 8).map((s, i) => (
              <li key={`opt-${i}`}><span title={s}>{humanizeCompactLabel(s)}</span></li>
            ))}
          </ul>
        </div>
      ) : null}

      {missingSources.length > 0 ? (
        <div className="atlas-ai-context-subblock atlas-ai-context-warning">
          <p className="atlas-ai-context-subblock-title">faltando · {missingSources.length}</p>
          <ul className="atlas-ai-context-mono-list">
            {missingSources.slice(0, 8).map((s, i) => (
              <li key={`miss-${i}`}><span title={s}>{humanizeCompactLabel(s)}</span></li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
