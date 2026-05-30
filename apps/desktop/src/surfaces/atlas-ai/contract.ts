/**
 * Atlas AI · contract helpers shared by composer e history.
 *
 * **Hyperflow-first design.** The Desktop is a SURFACE, not the decider. It
 * collects an operator hint (`mode`/`task`) and ships it to the backend
 * Router Runtime / Atlas Decide / Programming Adapter. The canonical
 * domain/flow/runtime decision lives in the trace returned by the backend
 * — never inferred client-side as ground truth.
 *
 * `auto` is the default: when the operator does not pick a domain we send
 * `routing_domain=auto` + `routing_task=auto` and let the Hyperflow choose.
 * The local `UX_FLOW_MAP` exists ONLY as a soft local fallback for UI hints
 * when the backend has not returned a trace yet.
 *
 * Paridade com atlas-app/lib/atlasAiModeContract.ts: o backend desambigua
 * com defaults canônicos, então qualquer ausência aqui é tolerada.
 */
import type {
  AtlasComputeEffortChoice,
  AtlasAiFocus,
  AtlasAiMode,
  AtlasAiProvider,
  AtlasAiProviderChoice,
  AtlasAiTask,
} from './types'
import { atlasComputeEffortForPayload, normalizeAtlasComputeEffort } from '../../lib/rich-input'

export const ATLAS_AI_MODE_CONTRACT_VERSION = 2

/** Surfaces canônicos de Atlas AI. O backend trata surface_id≠atlas_code como
 * "não exige Obra"; usamos `atlas_desktop_ai` para distinguir do mobile. */
export const ATLAS_AI_SURFACE_ID = 'atlas_desktop_ai'
export const ATLAS_AI_APP_SURFACE = 'atlas_desktop_ai'

export const PROVIDER_OPTIONS: ReadonlyArray<{
  value: AtlasAiProviderChoice
  label: string
  sub: string
}> = [
  { value: 'auto', label: 'Auto (Atlas Decide)', sub: 'Atlas escolhe o melhor modelo pelo contexto' },
  { value: 'claude_cli', label: 'Claude', sub: 'Anthropic via Claude CLI · vision premium' },
  { value: 'codex_cli', label: 'Codex', sub: 'OpenAI via Codex CLI · raciocínio técnico' },
  { value: 'gemini_cli', label: 'Gemini', sub: 'Google Gemini · multimodal' },
  { value: 'claude_codex', label: 'Claude+Codex council', sub: 'Dois provedores em conselho · resposta consolidada' },
]

/**
 * 11 modos canônicos. `auto` é o default novo — o front NÃO assume domínio.
 * A ordem espelha a hierarquia que o operador encontra no menu (auto + geral
 * primeiro, domínios técnicos depois).
 */
export const MODE_OPTIONS: ReadonlyArray<{ value: AtlasAiMode; label: string; sub: string }> = [
  { value: 'auto', label: 'Auto (Atlas Decide)', sub: 'Atlas escolhe o melhor caminho pelo contexto' },
  { value: 'general', label: 'Geral', sub: 'pesquisa, ideias, conversa leve' },
  { value: 'conversation', label: 'Conversa', sub: 'troca livre, sem domínio técnico' },
  { value: 'operational', label: 'Operacional', sub: 'diagnóstico, próxima ação' },
  { value: 'programming', label: 'Programação', sub: 'Atlas Dev: bugs, debug, review, features' },
  { value: 'research', label: 'Pesquisa', sub: 'investigação técnica, mercado, literatura' },
  { value: 'finance', label: 'Finanças', sub: 'análise de carteira, custo, decisão financeira' },
  { value: 'marketing', label: 'Marketing', sub: 'campanha, copy, métricas' },
  { value: 'strategy', label: 'Estratégia', sub: 'objetivos, prioridade, escolha' },
  { value: 'personal_development', label: 'Pessoal', sub: 'metas, hábitos, organização' },
  { value: 'cyber', label: 'Cyber', sub: 'red/blue/purple, segurança defensiva' },
  { value: 'automation', label: 'Automação', sub: 'workflows, integrações, scripts' },
]

export const TASK_OPTIONS_AUTO: ReadonlyArray<{ value: AtlasAiTask; label: string; sub: string }> = [
  { value: 'auto', label: 'Auto', sub: 'Atlas decide a melhor ação pelo contexto' },
  { value: 'direct', label: 'Direto', sub: 'resposta imediata' },
  { value: 'plan', label: 'Plan', sub: 'pensar antes de responder' },
  { value: 'review', label: 'Review', sub: 'auditar/avaliar antes de agir' },
]

export const TASK_OPTIONS_PROGRAMMING: ReadonlyArray<{ value: AtlasAiTask; label: string; sub: string }> = [
  { value: 'dev', label: 'Dev', sub: 'feature pequena/média, ajuste, refator' },
  { value: 'debug', label: 'Debug', sub: 'isolar e corrigir bug' },
  { value: 'review', label: 'Review', sub: 'revisar diff, código ou plano' },
  { value: 'plan', label: 'Plan', sub: 'planejar antes de executar' },
]

export const TASK_OPTIONS_GENERAL: ReadonlyArray<{ value: AtlasAiTask; label: string; sub: string }> = [
  { value: 'direct', label: 'Direto', sub: 'resposta direta' },
  { value: 'plan', label: 'Plan', sub: 'pensar antes de responder' },
  { value: 'review', label: 'Review', sub: 'revisar/avaliar' },
]

export const TASK_OPTIONS_OPERATIONAL: ReadonlyArray<{ value: AtlasAiTask; label: string; sub: string }> = [
  { value: 'review', label: 'Review', sub: 'auditar estado, próxima ação' },
  { value: 'plan', label: 'Plan', sub: 'plano operacional curto' },
  { value: 'direct', label: 'Direto', sub: 'resposta direta operacional' },
]

export function taskOptionsForMode(mode: AtlasAiMode) {
  if (mode === 'auto') return TASK_OPTIONS_AUTO
  if (mode === 'programming') return TASK_OPTIONS_PROGRAMMING
  if (mode === 'operational') return TASK_OPTIONS_OPERATIONAL
  return TASK_OPTIONS_GENERAL
}

export function defaultTaskForMode(mode: AtlasAiMode): AtlasAiTask {
  if (mode === 'auto') return 'auto'
  if (mode === 'programming') return 'dev'
  if (mode === 'operational') return 'review'
  return 'direct'
}

export function isTaskAllowedForMode(task: AtlasAiTask, mode: AtlasAiMode): boolean {
  if (mode === 'auto') return task === 'auto' || task === 'direct' || task === 'plan' || task === 'review'
  if (mode === 'programming') return task === 'plan' || task === 'review' || task === 'dev' || task === 'debug'
  if (mode === 'operational') return task === 'direct' || task === 'plan' || task === 'review'
  return task === 'direct' || task === 'plan' || task === 'review'
}

export function focusForMode(mode: AtlasAiMode): AtlasAiFocus {
  return mode
}

/**
 * Soft local fallback for UI hints when the backend has not yet returned a
 * canonical `flow_id` for this trace. Backend always wins; the Desktop never
 * uses this as the source of truth.
 *
 * `auto` deliberately maps to `auto` (special token) so any consumer can tell
 * that the front did NOT pick a flow.
 */
const UX_FLOW_MAP: Record<AtlasAiMode, Partial<Record<AtlasAiTask, string>>> = {
  auto: {
    auto: 'auto',
    direct: 'auto',
    plan: 'auto',
    review: 'auto',
  },
  general: {
    direct: 'general.answer',
    plan: 'general.answer',
    review: 'general.answer',
  },
  conversation: {
    direct: 'general.answer',
    plan: 'general.answer',
    review: 'general.answer',
  },
  operational: {
    direct: 'operations.diagnostic',
    plan: 'operations.diagnostic',
    review: 'operations.diagnostic',
  },
  programming: {
    direct: 'programming.dev',
    plan: 'programming.dev',
    review: 'programming.review',
    dev: 'programming.dev',
    debug: 'programming.repair',
  },
  research: {
    direct: 'research.investigate',
    plan: 'research.investigate',
    review: 'research.investigate',
  },
  finance: {
    direct: 'finance.analyze',
    plan: 'finance.analyze',
    review: 'finance.analyze',
  },
  marketing: {
    direct: 'marketing.plan',
    plan: 'marketing.plan',
    review: 'marketing.plan',
  },
  strategy: {
    direct: 'strategy.decide',
    plan: 'strategy.decide',
    review: 'strategy.decide',
  },
  personal_development: {
    direct: 'personal_development.organize',
    plan: 'personal_development.organize',
    review: 'personal_development.organize',
  },
  cyber: {
    direct: 'cyber.defensive',
    plan: 'cyber.defensive',
    review: 'cyber.defensive',
  },
  automation: {
    direct: 'automation.workflow',
    plan: 'automation.workflow',
    review: 'automation.workflow',
  },
}

export function flowIdForMode(mode: AtlasAiMode, task: AtlasAiTask): string {
  return UX_FLOW_MAP[mode]?.[task] ?? UX_FLOW_MAP[mode]?.direct ?? 'auto'
}

export function domainIdForFlow(flowId: string): string {
  if (flowId === 'auto') return 'auto'
  const [domain] = flowId.split('.')
  return domain ?? 'auto'
}

export interface AtlasAiPayloadInput {
  mode: AtlasAiMode
  task: AtlasAiTask
  provider: AtlasAiProviderChoice
  computeEffort?: AtlasComputeEffortChoice | null
  workspaceSlug: string | null
  routingDomain?: string | null
  conversationContext?: unknown[]
}

export interface AtlasAiPayloadBuildResult {
  payload: Record<string, unknown>
  provider: AtlasAiProvider | undefined
}

function compactProviderSafeString(value: unknown, limit = 160): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ').slice(0, limit)
  if (!text || /\/Users\/|thread_id|source_thread_ids|raw[_ ]conversation|response_text|operator_input|full[_ ]message/i.test(text)) {
    return null
  }
  return text
}

function compactProviderSafeList(value: unknown, limit = 5): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(
    value
      .map((item) => compactProviderSafeString(item))
      .filter((item): item is string => Boolean(item)),
  )).slice(0, limit)
}

function compactObjectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function compactObjectRecords(value: unknown, limit: number): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value
      .map(compactObjectRecord)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .slice(0, limit)
    : []
}

function compactProviderSafeRankedItems(value: unknown, limit: number): Array<{ label: string; score: number; reason: string }> {
  return compactObjectRecords(value, limit * 2)
    .map((item) => {
      const label = compactProviderSafeString(item.label, 120)
      const reason = compactProviderSafeString(item.reason, 140)
      const score = compactPercent(item.score)
      if (!label || !reason || score === null) return null
      return { label, score, reason }
    })
    .filter((item): item is { label: string; score: number; reason: string } => Boolean(item))
    .slice(0, limit)
}

function compactPercent(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
}

function compactCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0
  return Math.floor(value)
}

function awisRuntimeContextHint(conversationContext?: unknown[]): Record<string, unknown> | undefined {
  if (!conversationContext?.length) return undefined

  let providerCapsule: Record<string, unknown> | null = null
  let contextPack: Record<string, unknown> | null = null
  let taskContext: Record<string, unknown> | null = null

  for (const entry of conversationContext) {
    const item = compactObjectRecord(entry)
    const schema = typeof item?.schema_version === 'string' ? item.schema_version : null
    if (schema === 'atlas.awis.workspace_provider_capsule.v1') providerCapsule = item
    if (schema === 'atlas.awis.workspace_context_pack.v1') contextPack = item
    if (schema === 'atlas.awis.workspace_task_context_projection.v1') taskContext = item
  }

  if (!providerCapsule && !contextPack && !taskContext) return undefined

  const workspace = compactObjectRecord(contextPack?.workspace)
  const startupContract = compactObjectRecord(providerCapsule?.startup_contract)
  const goldenContext = compactObjectRecord(providerCapsule?.golden_context)
  const taskPacket = compactObjectRecord(providerCapsule?.task_packet)
  const taskPacketObjective = compactObjectRecord(taskPacket?.objective)
  const taskPacketContext = compactObjectRecord(taskPacket?.context)
  const bootstrapPlan =
    compactObjectRecord(providerCapsule?.bootstrap_plan) ??
    compactObjectRecord(taskPacketContext?.bootstrap_plan) ??
    compactObjectRecord(compactObjectRecord(taskContext?.recommended_context)?.bootstrap_plan)
  const bootstrapManifest = compactObjectRecord(contextPack?.bootstrap_manifest)
  const bootstrapManifestContextGold = compactObjectRecord(bootstrapManifest?.context_gold)
  const bootstrapManifestWorkspaceScope = compactObjectRecord(bootstrapManifest?.workspace_scope)
  const bootstrapManifestAutomation = compactObjectRecord(bootstrapManifest?.automation_plan)
  const bootstrapManifestLearning = compactObjectRecord(bootstrapManifest?.learning_contract)
  const bootstrapManifestEvidence = compactObjectRecord(bootstrapManifest?.evidence)
  const taskPacketWorkingSet = compactObjectRecord(taskPacketContext?.working_set)
  const taskPacketSpaceBrain = compactObjectRecords(taskPacketContext?.space_brain, 4)
  const taskPacketExecution = compactObjectRecord(taskPacket?.execution)
  const taskPacketCommandLanes = compactObjectRecord(taskPacketExecution?.command_lanes)
  const taskPacketRisk = compactObjectRecord(taskPacket?.risk)
  const taskPacketLearning = compactObjectRecord(taskPacket?.learning)
  const taskPacketAutomationPlan = compactObjectRecord(taskPacketLearning?.automation_plan)
  const startupReadiness = compactObjectRecord(startupContract?.readiness)
  const continueLearning = compactObjectRecord(providerCapsule?.continue_learning)
  const nextSession = compactObjectRecord(continueLearning?.next_session_contract)
  const taskFeedbackLoop = compactObjectRecord(continueLearning?.task_feedback_loop)
  const recoveryPlaybook = compactObjectRecord(continueLearning?.recovery_playbook)
  const continuityHandoff = compactObjectRecord(providerCapsule?.continuity_handoff)
  const recommendedContext = compactObjectRecord(taskContext?.recommended_context)
  const recommendedDependencyEdges = compactProviderSafeList(recommendedContext?.dependency_edges, 6)
  const recommendedCommandIntents = compactProviderSafeList(recommendedContext?.command_intents, 6)
  const recommendedCommandLanes =
    compactObjectRecord(recommendedContext?.command_lanes) ??
    compactObjectRecord(providerCapsule?.command_lanes)
  const workingSet = compactObjectRecord(recommendedContext?.working_set)
  const evidenceGate = compactObjectRecord(recommendedContext?.evidence_gate)
  const transferContract = compactObjectRecord(recommendedContext?.transfer_contract)
  const spaceProjection = compactObjectRecord(contextPack?.spaces)
  const contextKernel = compactObjectRecord(contextPack?.context_kernel)
  const kernelBudget = compactObjectRecord(contextKernel?.budget)
  const kernelPriorityLoad = compactObjectRecords(contextKernel?.priority_load, 6)
  const componentMemory = compactObjectRecord(contextPack?.component_memory)
  const strongestComponents = compactObjectRecords(componentMemory?.strongest_components, 5)
  const semanticIndex = compactObjectRecord(contextPack?.semantic_index)
  const semanticAliases = compactObjectRecords(semanticIndex?.query_aliases, 5)
  const semanticRetrievalPolicy = compactObjectRecord(semanticIndex?.retrieval_policy)
  const impactMap = compactObjectRecord(contextPack?.impact_map)
  const impactComponents = compactObjectRecords(impactMap?.component_impacts, 4)
  const taskRouter = compactObjectRecord(contextPack?.task_router)
  const taskRoutes = compactObjectRecords(taskRouter?.routes, 5)
  const livingGraph = compactObjectRecord(contextPack?.living_graph)
  const graphNodes = compactObjectRecords(livingGraph?.nodes, 6)
  const workspaceMesh = compactObjectRecord(contextPack?.workspace_mesh)
  const meshNextConversation = compactObjectRecord(workspaceMesh?.next_conversation)
  const currentTruthPack = compactObjectRecord(contextPack?.current_truth_pack)
  const currentTruth = compactObjectRecord(currentTruthPack?.current_truth)
  const currentTruthProof = compactObjectRecord(currentTruthPack?.proof)
  const currentTruthContract = compactObjectRecord(currentTruthPack?.trust_contract)
  const nextSessionBrain = compactObjectRecord(contextPack?.next_session_brain)
  const nextSessionContextLoading = compactObjectRecord(nextSessionBrain?.context_loading)
  const nextSessionTruthHints = compactObjectRecord(nextSessionContextLoading?.truth_hints)
  const repositoryConstellation = compactObjectRecord(contextPack?.repository_constellation)
  const constellationRepositories = compactObjectRecords(repositoryConstellation?.repositories, 5)
  const constellationNextConversation = compactObjectRecord(repositoryConstellation?.next_conversation)
  const preflight = compactObjectRecord(contextPack?.preflight)
  const preflightGates = compactObjectRecords(preflight?.gates, 6)
  const workspaceTwin = compactObjectRecord(contextPack?.workspace_twin)
  const workspaceTwinHashes = compactObjectRecord(workspaceTwin?.hashes)
  const retention = compactObjectRecord(contextPack?.retention)
  const retentionLifecycle = compactObjectRecord(retention?.lifecycle)
  const startupOrchestration = compactObjectRecord(contextPack?.startup_orchestration)
  const startupSequence = compactObjectRecords(startupOrchestration?.startup_sequence, 6)
  const automation = compactObjectRecord(contextPack?.automation)
  const automationAutopilot = compactObjectRecord(automation?.autopilot_context)
  const automationFeedbackLoop = compactObjectRecord(automation?.feedback_loop)
  const automationQueue = compactObjectRecords(automation?.maintenance_queue, 6)
  const selfImprovement = compactObjectRecord(contextPack?.self_improvement)
  const selfImprovementQueue = compactObjectRecords(selfImprovement?.improvement_queue, 6)
  const selfImprovementPolicy = compactObjectRecord(selfImprovement?.promotion_policy)
  const selfImprovementReview = compactObjectRecord(selfImprovement?.next_review)
  const adaptiveLearning = compactObjectRecord(contextPack?.adaptive_learning_plan)
  const adaptiveCycle = compactObjectRecord(adaptiveLearning?.autonomous_cycle)
  const adaptiveContextEconomy = compactObjectRecord(adaptiveLearning?.context_economy)
  const adaptiveRepositoryCompounding = compactObjectRecord(adaptiveLearning?.repository_compounding)
  const adaptiveHumanControl = compactObjectRecord(adaptiveLearning?.human_control)
  const adaptiveProof = compactObjectRecord(adaptiveLearning?.proof)
  const providerStrategy = compactObjectRecord(contextPack?.provider_strategy)
  const providerPreferred = compactObjectRecords(providerStrategy?.preferred, 5)
  const providerTaskPreferences = compactObjectRecords(providerStrategy?.task_preferences, 5)
  const executionDoctrine = compactObjectRecord(contextPack?.execution_doctrine)
  const doctrineDrivers = compactObjectRecords(executionDoctrine?.doctrine_drivers, 6)
  const doctrinePreflight = compactObjectRecord(executionDoctrine?.preflight)
  const doctrineCommandPolicy = compactObjectRecord(executionDoctrine?.command_policy)
  const doctrineLearning = compactObjectRecord(executionDoctrine?.learning_contract)
  const memoryFreshness = compactObjectRecord(contextPack?.memory_freshness)
  const freshnessEvidence = compactObjectRecord(memoryFreshness?.evidence)
  const freshnessPromotionGate = compactObjectRecord(memoryFreshness?.promotion_gate)
  const freshnessNextRefresh = compactObjectRecord(memoryFreshness?.next_refresh)
  const confidence = compactObjectRecord(contextPack?.confidence)
  const confidenceRanked = compactObjectRecord(confidence?.ranked)
  const confidencePolicy = compactObjectRecord(confidence?.decision_policy)
  const learningFlywheel = compactObjectRecord(contextPack?.learning_flywheel)
  const flywheelCycle = compactObjectRecord(learningFlywheel?.cycle)
  const flywheelAutomation = compactObjectRecord(learningFlywheel?.automation)
  const flywheelNextSession = compactObjectRecord(learningFlywheel?.next_session)
  const flywheelRepositoryLoop = compactObjectRecord(learningFlywheel?.repository_loop)
  const flywheelProof = compactObjectRecord(learningFlywheel?.proof)
  const launchContract = compactObjectRecord(contextPack?.launch_contract)
  const launchStartup = compactObjectRecord(launchContract?.startup_contract)
  const launchAutomation = compactObjectRecord(launchContract?.automation_contract)
  const launchRecovery = compactObjectRecord(launchContract?.recovery_contract)
  const launchHuman = compactObjectRecord(launchContract?.human_contract)
  const launchNextConversation = compactObjectRecord(launchContract?.next_conversation)
  const topology = compactObjectRecord(contextPack?.topology)
  const topologyExecutionMap = compactObjectRecord(topology?.execution_map)
  const topologyKnowledgeMap = compactObjectRecord(topology?.knowledge_map)
  const topologyWorkspaceMembers = compactProviderSafeList(topologyKnowledgeMap?.workspace_members, 6)
  const topologyWorkspaceDependencyEdges = compactProviderSafeList(topologyKnowledgeMap?.workspace_dependency_edges, 6)
  const memoryConsolidation = compactObjectRecord(contextPack?.memory_consolidation)
  const replayContract = compactObjectRecord(memoryConsolidation?.replay_contract)
  const workspaceRunbook = compactObjectRecord(contextPack?.workspace_runbook)
  const runbookProcedures = compactObjectRecords(workspaceRunbook?.procedures, 5)
  const runbookFailureResponse = compactObjectRecord(workspaceRunbook?.failure_response)
  const runbookNextSession = compactObjectRecord(workspaceRunbook?.next_session)
  const artifactReplay = compactObjectRecord(contextPack?.artifact_replay)
  const artifactColdStart = compactObjectRecord(artifactReplay?.cold_start_seed)
  const reusableStartupGold = compactObjectRecord(artifactReplay?.reusable_startup_gold)
  const taskSpaceBrain = compactObjectRecords(recommendedContext?.space_brain, 4)
  const projectedStrongSpaces = compactObjectRecords(spaceProjection?.strongest_spaces, 4)
  const learnedSpaces = projectedStrongSpaces
    .map((space) => {
      const learned = compactObjectRecord(space.learned_memory)
      const title = compactProviderSafeString(space.title, 80)
      if (!title || !learned) return null
      return {
        title,
        outcome_count: compactCount(learned.outcome_count),
        success_count: compactCount(learned.success_count),
        failure_count: compactCount(learned.failure_count),
        comparison_open_count: compactCount(learned.comparison_open_count),
        last_outcome_status: compactProviderSafeString(learned.last_outcome_status, 32),
        signals: compactProviderSafeList(learned.signals, 4),
        artifact_refs: compactProviderSafeList(learned.artifact_refs, 3),
      }
    })
    .filter((item): item is {
      title: string
      outcome_count: number
      success_count: number
      failure_count: number
      comparison_open_count: number
      last_outcome_status: string | null
      signals: string[]
      artifact_refs: string[]
    } => Boolean(item))
    .filter((item) => item.outcome_count > 0 || item.signals.length > 0 || item.artifact_refs.length > 0)
    .slice(0, 3)

  return {
    schema_version: 'atlas.awis.runtime_context_hint.v1',
    source: 'desktop_payload_compiler',
    provider_safe: true,
    workspace: {
      key: compactProviderSafeString(workspace?.key, 80),
      name: compactProviderSafeString(workspace?.name, 80),
      root_path_known: workspace?.root_path_known === true,
    },
    never_start_cold: startupContract?.never_start_cold === true,
    task_packet: {
      packet_hash: compactProviderSafeString(taskPacket?.packet_hash, 120),
      task_kind: compactProviderSafeString(taskPacket?.task_kind, 60),
      confidence: compactPercent(taskPacket?.confidence),
      objective: {
        label: compactProviderSafeString(taskPacketObjective?.label, 120),
        suggested_surface: compactProviderSafeString(taskPacketObjective?.suggested_surface, 40),
        workspace_key: compactProviderSafeString(taskPacketObjective?.workspace_key, 80),
        context_mode: compactProviderSafeString(taskPacketObjective?.context_mode, 32),
      },
      context: {
        load_first: compactProviderSafeList(taskPacketContext?.load_first, 6),
        use_as_summary: compactProviderSafeList(taskPacketContext?.use_as_summary, 5),
        bootstrap_manifest_hash: compactProviderSafeString(compactObjectRecord(taskPacketContext?.bootstrap_plan)?.manifest_hash, 120),
        bootstrap_load_first: compactProviderSafeList(compactObjectRecord(taskPacketContext?.bootstrap_plan)?.load_first, 4),
        bootstrap_validate_before_use: compactProviderSafeList(compactObjectRecord(taskPacketContext?.bootstrap_plan)?.validate_before_use, 4),
        files: compactProviderSafeList(taskPacketWorkingSet?.files, 5),
        docs: compactProviderSafeList(taskPacketWorkingSet?.docs, 5),
        commands: compactProviderSafeList(taskPacketWorkingSet?.commands, 4),
        spaces: compactProviderSafeList(taskPacketContext?.spaces, 4),
        space_brain: taskPacketSpaceBrain.map((space) => ({
          title: compactProviderSafeString(space.title, 80),
          state: compactProviderSafeString(space.state, 32),
          load_first: compactProviderSafeList(space.load_first, 3),
          carry_forward: compactProviderSafeList(space.carry_forward, 3),
          validate_before_use: compactProviderSafeList(space.validate_before_use, 3),
          artifact_refs: compactProviderSafeList(space.artifact_refs, 3),
          evidence: compactProviderSafeList(space.evidence, 3),
        })).filter((space) => space.title).slice(0, 3),
        artifacts: compactProviderSafeList(taskPacketContext?.artifacts, 4),
        related_workspaces: compactProviderSafeList(taskPacketContext?.related_workspaces, 4),
      },
      execution: {
        preflight_gates: compactProviderSafeList(taskPacketExecution?.preflight_gates, 5),
        validation_commands: compactProviderSafeList(taskPacketExecution?.validation_commands, 5),
        auto_validate: compactProviderSafeList(taskPacketCommandLanes?.auto_validate, 4),
        confirm_before_run: compactProviderSafeList(taskPacketCommandLanes?.confirm_before_run, 4),
        manual_only: compactProviderSafeList(taskPacketCommandLanes?.manual_only, 4),
        recovery: compactProviderSafeList(taskPacketExecution?.recovery, 4),
      },
      risk: {
        cautions: compactProviderSafeList(taskPacketRisk?.cautions, 5),
        human_boundary: compactProviderSafeList(taskPacketRisk?.human_boundary, 5),
        avoid_loading: compactProviderSafeList(taskPacketRisk?.avoid_loading, 5),
      },
      learning: {
        record: compactProviderSafeList(taskPacketLearning?.record, 5),
        promote_after_success: compactProviderSafeList(taskPacketLearning?.promote_after_success, 5),
        revalidate_after_failure: compactProviderSafeList(taskPacketLearning?.revalidate_after_failure, 5),
        archive_as_artifact: compactProviderSafeList(taskPacketLearning?.archive_as_artifact, 5),
        automation_plan: {
          safe_local: compactProviderSafeList(taskPacketAutomationPlan?.safe_local, 5),
          confirm_first: compactProviderSafeList(taskPacketAutomationPlan?.confirm_first, 5),
          observe_only: compactProviderSafeList(taskPacketAutomationPlan?.observe_only, 5),
          reason: compactProviderSafeString(taskPacketAutomationPlan?.reason, 180),
        },
      },
    },
    workspace_runbook: {
      readiness_score: compactPercent(workspaceRunbook?.readiness_score),
      runbook_hash: compactProviderSafeString(workspaceRunbook?.runbook_hash, 120),
      procedures: runbookProcedures.map((procedure) => ({
        title: compactProviderSafeString(procedure.title, 100),
        trigger: compactProviderSafeString(procedure.trigger, 120),
        load_first: compactProviderSafeList(procedure.load_first, 4),
        steps: compactProviderSafeList(procedure.steps, 4),
        validate_with: compactProviderSafeList(procedure.validate_with, 4),
        avoid: compactProviderSafeList(procedure.avoid, 3),
        success_evidence: compactProviderSafeList(procedure.success_evidence, 3),
        confidence: compactPercent(procedure.confidence),
      })).filter((procedure) => procedure.title || procedure.trigger).slice(0, 5),
      failure_response: {
        known_failure_signatures: compactProviderSafeList(runbookFailureResponse?.known_failure_signatures, 4),
        safe_retry: compactProviderSafeList(runbookFailureResponse?.safe_retry, 4),
        preserve_as_artifact: compactProviderSafeList(runbookFailureResponse?.preserve_as_artifact, 4),
        demote_or_revalidate: compactProviderSafeList(runbookFailureResponse?.demote_or_revalidate, 4),
      },
      next_session: {
        start_here: compactProviderSafeList(runbookNextSession?.start_here, 5),
        automate_when_safe: compactProviderSafeList(runbookNextSession?.automate_when_safe, 4),
        human_owns: compactProviderSafeList(runbookNextSession?.human_owns, 4),
      },
    },
    startup_contract: {
      launch_mode: compactProviderSafeString(startupContract?.launch_mode, 32),
      context_mode: compactProviderSafeString(startupContract?.context_mode, 32),
      prefer_summary: startupContract?.prefer_summary === true,
      bootstrap_manifest_hash: compactProviderSafeString(startupContract?.bootstrap_manifest_hash, 120),
      load_sequence: compactProviderSafeList(startupContract?.load_sequence, 6),
      revalidate_before_send: compactProviderSafeList(startupContract?.revalidate_before_send, 6),
      human_boundary: compactProviderSafeList(startupContract?.human_boundary, 4),
      readiness: {
        startup: compactPercent(startupReadiness?.startup),
        context_kernel: compactPercent(startupReadiness?.context_kernel),
        artifact_replay: compactPercent(startupReadiness?.artifact_replay),
        next_session_brain: compactPercent(startupReadiness?.next_session_brain),
      },
    },
    load_first: compactProviderSafeList(providerCapsule?.load_first, 6),
    use_as_summary: compactProviderSafeList(providerCapsule?.use_as_summary, 5),
    validate_with: compactProviderSafeList(providerCapsule?.validate_with, 5),
    avoid_loading: compactProviderSafeList(providerCapsule?.avoid_loading, 4),
    bootstrap_plan: {
      manifest_hash: compactProviderSafeString(bootstrapPlan?.manifest_hash, 120),
      launch_mode: compactProviderSafeString(bootstrapPlan?.launch_mode, 32),
      load_first: compactProviderSafeList(bootstrapPlan?.load_first, 6),
      summarize_first: compactProviderSafeList(bootstrapPlan?.summarize_first, 5),
      validate_before_use: compactProviderSafeList(bootstrapPlan?.validate_before_use, 5),
      never_load_raw: compactProviderSafeList(bootstrapPlan?.never_load_raw, 5),
      automation_hooks: compactProviderSafeList(bootstrapPlan?.automation_hooks, 5),
      learning_hooks: compactProviderSafeList(bootstrapPlan?.learning_hooks, 5),
      evidence: compactProviderSafeList(bootstrapPlan?.evidence, 5),
      reason: compactProviderSafeString(bootstrapPlan?.reason, 180),
    },
    bootstrap_manifest: {
      bootstrap_hash: compactProviderSafeString(bootstrapManifest?.bootstrap_hash, 120),
      launch_mode: compactProviderSafeString(bootstrapManifest?.launch_mode, 32),
      readiness_score: compactPercent(bootstrapManifest?.readiness_score),
      golden_boot_sequence: compactProviderSafeList(bootstrapManifest?.golden_boot_sequence, 6),
      load_first: compactProviderSafeList(bootstrapManifestContextGold?.load_first, 6),
      summarize_first: compactProviderSafeList(bootstrapManifestContextGold?.summarize_first, 5),
      validate_before_use: compactProviderSafeList(bootstrapManifestContextGold?.validate_before_use, 5),
      never_load_raw: compactProviderSafeList(bootstrapManifestContextGold?.never_load_raw, 5),
      repositories: compactProviderSafeList(bootstrapManifestWorkspaceScope?.repositories, 4),
      components: compactProviderSafeList(bootstrapManifestWorkspaceScope?.components, 5),
      spaces: compactProviderSafeList(bootstrapManifestWorkspaceScope?.spaces, 5),
      artifacts: compactProviderSafeList(bootstrapManifestWorkspaceScope?.artifacts, 5),
      before_send: compactProviderSafeList(bootstrapManifestAutomation?.before_send, 5),
      after_success: compactProviderSafeList(bootstrapManifestAutomation?.after_success, 5),
      after_failure: compactProviderSafeList(bootstrapManifestAutomation?.after_failure, 5),
      safe_maintenance: compactProviderSafeList(bootstrapManifestAutomation?.safe_maintenance, 5),
      capture_outcome: bootstrapManifestLearning?.capture_outcome === true,
      update_memory: bootstrapManifestLearning?.update_memory === true,
      update_spaces: bootstrapManifestLearning?.update_spaces === true,
      preserve_artifact: bootstrapManifestLearning?.preserve_artifact === true,
      promote_when: compactProviderSafeList(bootstrapManifestLearning?.promote_when, 5),
      revalidate_when: compactProviderSafeList(bootstrapManifestLearning?.revalidate_when, 5),
      human_boundary: compactProviderSafeList(bootstrapManifest?.human_boundary, 5),
      evidence_hashes: compactProviderSafeList(bootstrapManifestEvidence?.hashes, 5),
      proven_by: compactProviderSafeList(bootstrapManifestEvidence?.proven_by, 5),
      stale_or_guarded: compactProviderSafeList(bootstrapManifestEvidence?.stale_or_guarded, 5),
    },
    golden_context: {
      top_load: compactProviderSafeRankedItems(goldenContext?.top_load, 6),
      summary_gold: compactProviderSafeRankedItems(goldenContext?.summary_gold, 6),
      validation_gold: compactProviderSafeRankedItems(goldenContext?.validation_gold, 5),
      avoid_or_confirm: compactProviderSafeRankedItems(goldenContext?.avoid_or_confirm, 5),
      selection_reason: compactProviderSafeString(goldenContext?.selection_reason, 180),
      provider_safe: goldenContext?.provider_safe === true,
    },
    dependency_edges: recommendedDependencyEdges,
    workspace_members: topologyWorkspaceMembers,
    workspace_dependency_edges: topologyWorkspaceDependencyEdges,
    command_intents: recommendedCommandIntents,
    command_lanes: {
      auto_validate: compactProviderSafeList(recommendedCommandLanes?.auto_validate, 5),
      confirm_before_run: compactProviderSafeList(recommendedCommandLanes?.confirm_before_run, 4),
      manual_only: compactProviderSafeList(recommendedCommandLanes?.manual_only, 4),
      preferred_validation: compactProviderSafeList(recommendedCommandLanes?.preferred_validation, 4),
      reason: compactProviderSafeString(recommendedCommandLanes?.reason, 160),
    },
    continuity_handoff: {
      restore_priority: compactProviderSafeList(continuityHandoff?.restore_priority, 6),
      hot_context: compactProviderSafeList(continuityHandoff?.hot_context, 6),
      first_load: compactProviderSafeList(continuityHandoff?.first_load, 6),
      validate_with: compactProviderSafeList(continuityHandoff?.validate_with, 6),
      artifacts: compactProviderSafeList(continuityHandoff?.artifacts, 6),
      handoff_units: compactProviderSafeList(continuityHandoff?.handoff_units, 5),
      human_boundary: compactProviderSafeList(continuityHandoff?.human_boundary, 5),
    },
    context_kernel: {
      mode: compactProviderSafeString(kernelBudget?.mode, 32),
      priority_load: compactProviderSafeList(
        kernelPriorityLoad.map((item) => item.label),
        6,
      ),
      load_full: compactProviderSafeList(kernelBudget?.load_full, 5),
      summarize: compactProviderSafeList(kernelBudget?.summarize, 5),
      omit: compactProviderSafeList(kernelBudget?.omit, 5),
    },
    component_memory: {
      strongest: strongestComponents.map((component) => ({
        key: compactProviderSafeString(component.key, 80),
        role: compactProviderSafeString(component.role, 96),
        maturity: compactProviderSafeString(component.maturity, 32),
        confidence: compactPercent(component.confidence),
        load_first: compactProviderSafeList(component.load_first, 4),
        commands: compactProviderSafeList(component.commands, 4),
        docs: compactProviderSafeList(component.docs, 4),
        cautions: compactProviderSafeList(component.cautions, 3),
      })).filter((component) => component.key).slice(0, 4),
    },
    semantic_index: {
      readiness_score: compactPercent(semanticIndex?.readiness_score),
      aliases: semanticAliases.map((alias) => ({
        alias: compactProviderSafeString(alias.alias, 80),
        intent: compactProviderSafeString(alias.intent, 80),
        component_keys: compactProviderSafeList(alias.component_keys, 4),
        task_kinds: compactProviderSafeList(alias.task_kinds, 4),
        load: compactProviderSafeList(alias.load, 3),
        validate: compactProviderSafeList(alias.validate, 3),
        confidence: compactPercent(alias.confidence),
      })).filter((alias) => alias.alias).slice(0, 5),
      retrieval_policy: {
        load_full_when: compactProviderSafeList(semanticRetrievalPolicy?.load_full_when, 4),
        summarize_when: compactProviderSafeList(semanticRetrievalPolicy?.summarize_when, 4),
        revalidate_when: compactProviderSafeList(semanticRetrievalPolicy?.revalidate_when, 4),
        never_load_raw: compactProviderSafeList(semanticRetrievalPolicy?.never_load_raw, 4),
      },
    },
    task_router: {
      route_count: compactCount(taskRouter?.route_count),
      routes: taskRoutes.map((route) => ({
        route_key: compactProviderSafeString(route.route_key, 80),
        task_kind: compactProviderSafeString(route.task_kind, 60),
        policy: compactProviderSafeString(route.policy, 40),
        suggested_surface: compactProviderSafeString(route.suggested_surface, 40),
        load_first: compactProviderSafeList(route.load_first, 4),
        use_spaces: compactProviderSafeList(route.use_spaces, 3),
        use_components: compactProviderSafeList(route.use_components, 4),
        use_artifacts: compactProviderSafeList(route.use_artifacts, 3),
        validate_with: compactProviderSafeList(route.validate_with, 4),
        avoid_loading: compactProviderSafeList(route.avoid_loading, 3),
        confidence: compactPercent(route.confidence),
      })).filter((route) => route.route_key || route.task_kind).slice(0, 5),
    },
    impact_map: {
      readiness_score: compactPercent(impactMap?.readiness_score),
      component_impacts: impactComponents.map((impact) => ({
        component_key: compactProviderSafeString(impact.component_key, 80),
        affected_components: compactProviderSafeList(impact.affected_components, 4),
        validation_cascade: compactProviderSafeList(impact.validation_cascade, 4),
        risk: compactProviderSafeString(impact.risk, 32),
        reason: compactProviderSafeString(impact.reason, 120),
        confidence: compactPercent(impact.confidence),
      })).filter((impact) => impact.component_key).slice(0, 4),
    },
    living_graph: {
      readiness_score: compactPercent(livingGraph?.readiness_score),
      golden_path: compactProviderSafeList(livingGraph?.golden_path, 6),
      nodes: graphNodes.map((node) => ({
        kind: compactProviderSafeString(node.kind, 40),
        label: compactProviderSafeString(node.label, 96),
        role: compactProviderSafeString(node.role, 120),
        confidence: compactPercent(node.confidence),
        evidence: compactProviderSafeList(node.evidence, 3),
      })).filter((node) => node.label).slice(0, 6),
    },
    workspace_mesh: {
      readiness_score: compactPercent(workspaceMesh?.readiness_score),
      mesh_hash: compactProviderSafeString(workspaceMesh?.mesh_hash, 120),
      load_order: compactProviderSafeList(meshNextConversation?.load_order, 5),
      reuse_rules: compactProviderSafeList(meshNextConversation?.reuse_rules, 5),
      validate_with: compactProviderSafeList(meshNextConversation?.validate_with, 5),
      human_boundary: compactProviderSafeList(meshNextConversation?.human_boundary, 4),
    },
    current_truth_pack: {
      readiness_score: compactPercent(currentTruthPack?.readiness_score),
      truth_hash: compactProviderSafeString(currentTruthPack?.truth_hash, 120),
      must_keep: compactProviderSafeList(currentTruth?.must_keep, 6),
      active_components: compactProviderSafeList(currentTruth?.active_components, 5),
      active_spaces: compactProviderSafeList(currentTruth?.active_spaces, 5),
      active_artifacts: compactProviderSafeList(currentTruth?.active_artifacts, 5),
      proven_commands: compactProviderSafeList(currentTruth?.proven_commands, 5),
      evidence_refs: compactProviderSafeList(currentTruthProof?.evidence_refs, 5),
      validate_with: compactProviderSafeList(currentTruthProof?.validate_with, 5),
      trust_first: compactProviderSafeList(currentTruthContract?.trust_first, 5),
      verify_before_send: compactProviderSafeList(currentTruthContract?.verify_before_send, 5),
      evidence_mode: compactProviderSafeString(currentTruthContract?.evidence_mode, 32),
    },
    next_session_truth: {
      brain_hash: compactProviderSafeString(nextSessionBrain?.brain_hash, 120),
      evidence_mode: compactProviderSafeString(nextSessionTruthHints?.evidence_mode, 32),
      trust_first: compactProviderSafeList(nextSessionTruthHints?.trust_first, 5),
      verify_before_send: compactProviderSafeList(nextSessionTruthHints?.verify_before_send, 5),
      never_load_raw: compactProviderSafeList(nextSessionTruthHints?.never_load_raw, 5),
      refresh_when: compactProviderSafeList(nextSessionTruthHints?.refresh_when, 5),
      current_truth: compactProviderSafeList(nextSessionTruthHints?.current_truth, 5),
    },
    repository_constellation: {
      readiness_score: compactPercent(repositoryConstellation?.readiness_score),
      constellation_hash: compactProviderSafeString(repositoryConstellation?.constellation_hash, 120),
      repositories: constellationRepositories.map((repo) => ({
        key: compactProviderSafeString(repo.key, 80),
        role: compactProviderSafeString(repo.role, 96),
        stack: compactProviderSafeList(repo.stack, 4),
        maturity: compactProviderSafeString(repo.maturity, 32),
        commands: compactProviderSafeList(repo.commands, 4),
        connected_to: compactProviderSafeList(repo.connected_to, 4),
        load_when: compactProviderSafeList(repo.load_when, 3),
        validate_with: compactProviderSafeList(repo.validate_with, 3),
        confidence: compactPercent(repo.confidence),
      })).filter((repo) => repo.key).slice(0, 5),
      load_first: compactProviderSafeList(constellationNextConversation?.load_first, 5),
      validate_with: compactProviderSafeList(constellationNextConversation?.validate_with, 5),
      human_boundary: compactProviderSafeList(constellationNextConversation?.human_boundary, 4),
    },
    preflight: {
      mode: compactProviderSafeString(preflight?.mode, 32),
      gates: preflightGates.map((gate) => ({
        id: compactProviderSafeString(gate.id, 80),
        status: compactProviderSafeString(gate.status, 24),
        reason: compactProviderSafeString(gate.reason, 120),
      })).filter((gate) => gate.id || gate.status || gate.reason).slice(0, 5),
    },
    workspace_twin: {
      status: compactProviderSafeString(workspaceTwin?.status, 32),
      genome_hash: compactProviderSafeString(workspaceTwinHashes?.genome_hash, 120),
      code_map_hash: compactProviderSafeString(workspaceTwinHashes?.code_map_hash, 120),
      risk_map_hash: compactProviderSafeString(workspaceTwinHashes?.risk_map_hash, 120),
      command_registry_hash: compactProviderSafeString(workspaceTwinHashes?.command_registry_hash, 120),
    },
    working_set: {
      files: compactProviderSafeList(workingSet?.files, 5),
      docs: compactProviderSafeList(workingSet?.docs, 5),
      commands: compactProviderSafeList(workingSet?.commands, 4),
    },
    evidence_gate: {
      verify_before_trust: compactProviderSafeList(evidenceGate?.verify_before_trust, 5),
      human_boundary: compactProviderSafeList(evidenceGate?.human_boundary, 4),
    },
    transfer_contract: {
      workspace_hints: compactProviderSafeList(transferContract?.workspace_hints, 4),
      reuse: compactProviderSafeList(transferContract?.reuse, 5),
      validate_before_use: compactProviderSafeList(transferContract?.validate_before_use, 5),
      never_transfer: compactProviderSafeList(transferContract?.never_transfer, 4),
      reason: compactProviderSafeString(transferContract?.reason, 180),
    },
    space_context: {
      active_spaces: compactProviderSafeList(recommendedContext?.spaces, 4),
      strongest_spaces: compactProviderSafeList([
        ...projectedStrongSpaces.map((space) => space.title),
        ...taskSpaceBrain.map((space) => space.title),
      ], 5),
      load_first: compactProviderSafeList(taskSpaceBrain.flatMap((space) => (
        Array.isArray(space.load_first) ? space.load_first : []
      )), 6),
      carry_forward: compactProviderSafeList(taskSpaceBrain.flatMap((space) => (
        Array.isArray(space.carry_forward) ? space.carry_forward : []
      )), 6),
      validate_before_use: compactProviderSafeList(taskSpaceBrain.flatMap((space) => (
        Array.isArray(space.validate_before_use) ? space.validate_before_use : []
      )), 5),
      human_boundary: compactProviderSafeList(taskSpaceBrain.flatMap((space) => (
        Array.isArray(space.human_boundary) ? space.human_boundary : []
      )), 4),
      artifact_refs: compactProviderSafeList(taskSpaceBrain.flatMap((space) => (
        Array.isArray(space.artifact_refs) ? space.artifact_refs : []
      )), 4),
      learned_memory: learnedSpaces,
    },
    artifact_context: {
      replay_ready: artifactReplay !== null,
      latest_artifact_hash: compactProviderSafeString(artifactReplay?.latest_artifact_hash, 80),
      load_order: compactProviderSafeList(artifactColdStart?.load_order, 5),
      validate_with: compactProviderSafeList(artifactColdStart?.validate_with, 4),
      reusable_patterns: compactProviderSafeList(reusableStartupGold?.reusable_patterns, 5),
      strongest_spaces: compactProviderSafeList(reusableStartupGold?.strongest_spaces, 4),
      warnings: compactProviderSafeList(artifactColdStart?.warnings, 4),
    },
    replay_contract: {
      load_first: compactProviderSafeList(replayContract?.load_first, 6),
      use_as_summary: compactProviderSafeList(replayContract?.use_as_summary, 6),
      validate_before_trust: compactProviderSafeList(replayContract?.validate_before_trust, 6),
      archive_after_success: compactProviderSafeList(replayContract?.archive_after_success, 5),
      reason: compactProviderSafeString(replayContract?.reason, 180),
    },
    retention: {
      keep_hot: compactProviderSafeList(retentionLifecycle?.keep_hot, 5),
      promote: compactProviderSafeList(retentionLifecycle?.promote, 5),
      revalidate: compactProviderSafeList(retentionLifecycle?.revalidate, 5),
      drop_or_summarize: compactProviderSafeList(retentionLifecycle?.drop_or_summarize, 4),
    },
    startup_orchestration: {
      launch_mode: compactProviderSafeString(startupOrchestration?.launch_mode, 32),
      readiness_score: compactPercent(startupOrchestration?.readiness_score),
      sequence: startupSequence.map((item) => ({
        step: compactProviderSafeString(item.step, 40),
        label: compactProviderSafeString(item.label, 120),
        source: compactProviderSafeString(item.source, 40),
      })).filter((item) => item.step || item.label || item.source).slice(0, 5),
    },
    next_session: {
      first_load: compactProviderSafeList(nextSession?.first_load, 5),
      validate_with: compactProviderSafeList(nextSession?.validate_with, 4),
      promote_when: compactProviderSafeList(nextSession?.promote_when, 4),
      demote_when: compactProviderSafeList(nextSession?.demote_when, 4),
    },
    continue_learning: {
      record_outcome: continueLearning?.record_outcome === true,
      update_memory: continueLearning?.update_memory === true,
      update_space_pack: continueLearning?.update_space_pack === true,
      preserve_artifact_after_success: continueLearning?.preserve_artifact_after_success === true,
      maintenance_recent: compactProviderSafeList(continueLearning?.maintenance_recent, 5),
    },
    automation: {
      mode: compactProviderSafeString(automation?.mode, 32),
      automation_score: compactPercent(automation?.automation_score),
      maintenance_queue: automationQueue.map((item) => ({
        action: compactProviderSafeString(item.action, 48),
        label: compactProviderSafeString(item.label, 120),
        reason: compactProviderSafeString(item.reason, 140),
        priority: compactProviderSafeString(item.priority, 16),
        requires_human_confirmation: item.requires_human_confirmation === true,
      })).filter((item) => item.action || item.label || item.reason).slice(0, 5),
      before_send: compactProviderSafeList(automationAutopilot?.before_send, 5),
      after_send: compactProviderSafeList(automationAutopilot?.after_send, 5),
      on_startup: compactProviderSafeList(automationAutopilot?.on_startup, 5),
      metrics_to_watch: compactProviderSafeList(automationFeedbackLoop?.metrics_to_watch, 5),
      promote_when: compactProviderSafeList(automationFeedbackLoop?.promote_when, 5),
      demote_when: compactProviderSafeList(automationFeedbackLoop?.demote_when, 5),
    },
    self_improvement: {
      readiness_score: compactPercent(selfImprovement?.readiness_score),
      improvement_queue: selfImprovementQueue.map((item) => ({
        action: compactProviderSafeString(item.action, 48),
        label: compactProviderSafeString(item.label, 120),
        reason: compactProviderSafeString(item.reason, 140),
        priority: compactProviderSafeString(item.priority, 16),
        evidence: compactProviderSafeList(item.evidence, 3),
      })).filter((item) => item.action || item.label || item.reason).slice(0, 5),
      promote_when: compactProviderSafeList(selfImprovementPolicy?.promote_when, 5),
      demote_when: compactProviderSafeList(selfImprovementPolicy?.demote_when, 5),
      transfer_when: compactProviderSafeList(selfImprovementPolicy?.transfer_when, 5),
      metrics: compactProviderSafeList(selfImprovementReview?.metrics, 5),
      validate_with: compactProviderSafeList(selfImprovementReview?.validate_with, 5),
      human_confirmation_required: selfImprovementReview?.human_confirmation_required === true,
    },
    adaptive_learning: {
      readiness_score: compactPercent(adaptiveLearning?.readiness_score),
      mode: compactProviderSafeString(adaptiveLearning?.mode, 32),
      on_startup: compactProviderSafeList(adaptiveCycle?.on_startup, 5),
      before_send: compactProviderSafeList(adaptiveCycle?.before_send, 5),
      after_success: compactProviderSafeList(adaptiveCycle?.after_success, 5),
      after_failure: compactProviderSafeList(adaptiveCycle?.after_failure, 5),
      on_drift: compactProviderSafeList(adaptiveCycle?.on_drift, 5),
      promote_to_hot: compactProviderSafeList(adaptiveContextEconomy?.promote_to_hot, 5),
      summarize_only: compactProviderSafeList(adaptiveContextEconomy?.summarize_only, 5),
      retire_or_revalidate: compactProviderSafeList(adaptiveContextEconomy?.retire_or_revalidate, 5),
      artifact_candidates: compactProviderSafeList(adaptiveContextEconomy?.artifact_candidates, 5),
      local_focus: compactProviderSafeList(adaptiveRepositoryCompounding?.local_focus, 5),
      cross_repo_bridges: compactProviderSafeList(adaptiveRepositoryCompounding?.cross_repo_bridges, 5),
      transfer_rules: compactProviderSafeList(adaptiveRepositoryCompounding?.transfer_rules, 5),
      requires_confirmation: compactProviderSafeList(adaptiveHumanControl?.requires_confirmation, 5),
      human_owned: compactProviderSafeList(adaptiveHumanControl?.human_owned, 5),
      never_automate: compactProviderSafeList(adaptiveHumanControl?.never_automate, 5),
      evidence_refs: compactProviderSafeList(adaptiveProof?.evidence_refs, 5),
      validate_with: compactProviderSafeList(adaptiveProof?.validate_with, 5),
      outcome_metrics: compactProviderSafeList(adaptiveProof?.outcome_metrics, 5),
    },
    provider_strategy: {
      provider_count: compactCount(providerStrategy?.provider_count),
      preferred: providerPreferred.map((item) => ({
        provider: compactProviderSafeString(item.provider, 64),
        model: compactProviderSafeString(item.model, 80),
        policy: compactProviderSafeString(item.policy, 32),
        task_kinds: compactProviderSafeList(item.task_kinds, 4),
        success_rate: compactPercent(item.success_rate),
        reason: compactProviderSafeString(item.reason, 140),
      })).filter((item) => item.provider).slice(0, 4),
      task_preferences: providerTaskPreferences.map((item) => ({
        task_kind: compactProviderSafeString(item.task_kind, 60),
        preferred_provider: compactProviderSafeString(item.preferred_provider, 64),
        fallback_order: compactProviderSafeList(item.fallback_order, 4),
        avoid: compactProviderSafeList(item.avoid, 4),
        confidence: compactPercent(item.confidence),
        reason: compactProviderSafeString(item.reason, 140),
      })).filter((item) => item.task_kind || item.preferred_provider).slice(0, 4),
      fallback_order: compactProviderSafeList(providerStrategy?.fallback_order, 5),
      caution_signals: compactProviderSafeList(providerStrategy?.caution_signals, 5),
    },
    execution_doctrine: {
      maturity: compactProviderSafeString(executionDoctrine?.maturity, 32),
      doctrine_drivers: doctrineDrivers.map((item) => ({
        name: compactProviderSafeString(item.name, 40),
        applies_to: compactProviderSafeList(item.applies_to, 4),
        required: item.required === true,
        gate: compactProviderSafeString(item.gate, 120),
        reason: compactProviderSafeString(item.reason, 140),
      })).filter((item) => item.name || item.gate || item.reason).slice(0, 5),
      required_before_execution: compactProviderSafeList(doctrinePreflight?.required_before_execution, 5),
      human_responsibility: compactProviderSafeList(doctrinePreflight?.human_responsibility, 5),
      automation: compactProviderSafeList(doctrinePreflight?.automation, 5),
      trusted_commands: compactProviderSafeList(doctrineCommandPolicy?.trusted, 5),
      revalidate_commands: compactProviderSafeList(doctrineCommandPolicy?.revalidate, 5),
      avoid_commands: compactProviderSafeList(doctrineCommandPolicy?.avoid, 5),
      promote_after_success: compactProviderSafeList(doctrineLearning?.promote_after_success, 5),
      demote_after_failure: compactProviderSafeList(doctrineLearning?.demote_after_failure, 5),
    },
    memory_freshness: {
      freshness_score: compactPercent(memoryFreshness?.freshness_score),
      state: compactProviderSafeString(memoryFreshness?.state, 32),
      scan_age_days: compactCount(memoryFreshness?.scan_age_days),
      interaction_age_days: compactCount(memoryFreshness?.interaction_age_days),
      hot: compactProviderSafeList(freshnessEvidence?.hot, 5),
      revalidate: compactProviderSafeList(freshnessEvidence?.revalidate, 5),
      missing: compactProviderSafeList(freshnessEvidence?.missing, 5),
      can_promote_commands: freshnessPromotionGate?.can_promote_commands === true,
      can_promote_spaces: freshnessPromotionGate?.can_promote_spaces === true,
      required_before_promotion: compactProviderSafeList(freshnessPromotionGate?.required_before_promotion, 5),
      next_refresh: compactProviderSafeList(freshnessNextRefresh?.actions, 5),
      reason: compactProviderSafeString(freshnessNextRefresh?.reason, 140),
    },
    confidence: {
      confidence_score: compactPercent(confidence?.confidence_score),
      commands: compactObjectRecords(confidenceRanked?.commands, 4).map((item) => ({
        label: compactProviderSafeString(item.label, 120),
        score: compactPercent(item.score),
        evidence: compactProviderSafeList(item.evidence, 3),
        caution: compactProviderSafeString(item.caution, 120),
      })).filter((item) => item.label).slice(0, 4),
      spaces: compactObjectRecords(confidenceRanked?.spaces, 4).map((item) => ({
        label: compactProviderSafeString(item.label, 120),
        score: compactPercent(item.score),
        evidence: compactProviderSafeList(item.evidence, 3),
        caution: compactProviderSafeString(item.caution, 120),
      })).filter((item) => item.label).slice(0, 4),
      artifacts: compactObjectRecords(confidenceRanked?.artifacts, 4).map((item) => ({
        label: compactProviderSafeString(item.label, 120),
        score: compactPercent(item.score),
        evidence: compactProviderSafeList(item.evidence, 3),
        caution: compactProviderSafeString(item.caution, 120),
      })).filter((item) => item.label).slice(0, 4),
      transfers: compactObjectRecords(confidenceRanked?.transfers, 4).map((item) => ({
        label: compactProviderSafeString(item.label, 120),
        score: compactPercent(item.score),
        evidence: compactProviderSafeList(item.evidence, 3),
        caution: compactProviderSafeString(item.caution, 120),
      })).filter((item) => item.label).slice(0, 4),
      prefer: compactProviderSafeList(confidencePolicy?.prefer, 5),
      require_confirmation_for: compactProviderSafeList(confidencePolicy?.require_confirmation_for, 5),
      avoid_until_revalidated: compactProviderSafeList(confidencePolicy?.avoid_until_revalidated, 5),
    },
    learning_flywheel: {
      readiness_score: compactPercent(learningFlywheel?.readiness_score),
      compounding_score: compactPercent(learningFlywheel?.compounding_score),
      mode: compactProviderSafeString(learningFlywheel?.mode, 32),
      captured: compactProviderSafeList(flywheelCycle?.captured, 5),
      distilled: compactProviderSafeList(flywheelCycle?.distilled, 5),
      reused: compactProviderSafeList(flywheelCycle?.reused, 5),
      validated: compactProviderSafeList(flywheelCycle?.validated, 5),
      promoted: compactProviderSafeList(flywheelCycle?.promoted, 5),
      gaps: compactProviderSafeList(flywheelCycle?.gaps, 5),
      next_safe_automations: compactProviderSafeList(flywheelAutomation?.next_safe_automations, 5),
      requires_evidence: compactProviderSafeList(flywheelAutomation?.requires_evidence, 5),
      human_owned: compactProviderSafeList(flywheelAutomation?.human_owned, 5),
      load_first: compactProviderSafeList(flywheelNextSession?.load_first, 5),
      validate_with: compactProviderSafeList(flywheelNextSession?.validate_with, 5),
      update_after_send: compactProviderSafeList(flywheelNextSession?.update_after_send, 5),
      preserve_as_artifact: compactProviderSafeList(flywheelNextSession?.preserve_as_artifact, 5),
      local_reuse: compactProviderSafeList(flywheelRepositoryLoop?.local_reuse, 5),
      cross_workspace_reuse: compactProviderSafeList(flywheelRepositoryLoop?.cross_workspace_reuse, 5),
      bridge_candidates: compactProviderSafeList(flywheelRepositoryLoop?.bridge_candidates, 5),
      evidence_refs: compactProviderSafeList(flywheelProof?.evidence_refs, 5),
      never_promote: compactProviderSafeList(flywheelProof?.never_promote, 5),
      refresh_when: compactProviderSafeList(flywheelProof?.refresh_when, 5),
    },
    launch_contract: {
      readiness_score: compactPercent(launchContract?.readiness_score),
      launch_mode: compactProviderSafeString(launchContract?.launch_mode, 32),
      seed_hash: compactProviderSafeString(launchContract?.seed_hash, 120),
      first_load: compactProviderSafeList(launchStartup?.first_load, 5),
      validate_before_trust: compactProviderSafeList(launchStartup?.validate_before_trust, 5),
      summarize_only: compactProviderSafeList(launchStartup?.summarize_only, 5),
      avoid_loading: compactProviderSafeList(launchStartup?.avoid_loading, 5),
      promote_after_success: compactProviderSafeList(launchStartup?.promote_after_success, 5),
      demote_after_failure: compactProviderSafeList(launchStartup?.demote_after_failure, 5),
      before_send: compactProviderSafeList(launchAutomation?.before_send, 5),
      after_success: compactProviderSafeList(launchAutomation?.after_success, 5),
      after_failure: compactProviderSafeList(launchAutomation?.after_failure, 5),
      maintenance_actions: compactProviderSafeList(launchAutomation?.maintenance_actions, 5),
      recovery_demote: compactProviderSafeList(launchRecovery?.demote_context, 5),
      recovery_resume: compactProviderSafeList(launchRecovery?.safe_resume, 5),
      human_owns: compactProviderSafeList(launchHuman?.owns, 5),
      confirm_before: compactProviderSafeList(launchHuman?.confirm_before, 5),
      do_not_delegate: compactProviderSafeList(launchHuman?.do_not_delegate, 5),
      load_order: compactProviderSafeList(launchNextConversation?.load_order, 5),
      provider_note: compactProviderSafeString(launchNextConversation?.provider_note, 160),
    },
    topology: {
      test_commands: compactProviderSafeList(topologyExecutionMap?.test_commands, 5),
      build_commands: compactProviderSafeList(topologyExecutionMap?.build_commands, 5),
      dev_commands: compactProviderSafeList(topologyExecutionMap?.dev_commands, 5),
      check_commands: compactProviderSafeList(topologyExecutionMap?.check_commands, 5),
      load_first_docs: compactProviderSafeList(topologyKnowledgeMap?.load_first_docs, 5),
      doc_obligations: compactProviderSafeList(topologyKnowledgeMap?.doc_obligations, 5),
      doc_summaries: compactProviderSafeList(topologyKnowledgeMap?.doc_summaries, 5),
      internal_dependency_edges: compactProviderSafeList(topologyKnowledgeMap?.internal_dependency_edges, 5),
      workspace_members: topologyWorkspaceMembers,
      workspace_dependency_edges: topologyWorkspaceDependencyEdges,
      validation_entrypoints: compactProviderSafeList(topologyKnowledgeMap?.validation_entrypoints, 5),
      sensitive_zones: compactProviderSafeList(topologyKnowledgeMap?.sensitive_zones, 5),
      summarize_only: compactProviderSafeList(topologyKnowledgeMap?.summarize_only, 5),
    },
    feedback_loop: {
      record: compactProviderSafeList(taskFeedbackLoop?.record, 6),
      promote: compactProviderSafeList(taskFeedbackLoop?.promote, 5),
      revalidate: compactProviderSafeList(taskFeedbackLoop?.revalidate, 5),
      update_spaces: compactProviderSafeList(taskFeedbackLoop?.update_spaces, 4),
      update_artifacts: compactProviderSafeList(taskFeedbackLoop?.update_artifacts, 4),
      update_components: compactProviderSafeList(taskFeedbackLoop?.update_components, 5),
      update_relations: compactProviderSafeList(taskFeedbackLoop?.update_relations, 5),
      update_mesh: compactProviderSafeList(taskFeedbackLoop?.update_mesh, 5),
      reason: compactProviderSafeString(taskFeedbackLoop?.reason, 180),
    },
    recovery_playbook: {
      demote_context: compactProviderSafeList(recoveryPlaybook?.demote_context, 4),
      safe_resume: compactProviderSafeList(recoveryPlaybook?.safe_resume, 4),
      revalidate_with: compactProviderSafeList(recoveryPlaybook?.revalidate_with, 4),
    },
  }
}

/**
 * Constrói o payload que vai para POST /ai/interactions.
 *
 * Filosofia Hyperflow-first:
 *   - `auto` mode/task => front envia `routing_domain=auto` + `routing_task=auto`.
 *     Backend Router Runtime / Atlas Decide decide o resto.
 *   - Modo explícito => front envia o hint canônico do operador; backend
 *     ainda pode reroutar e o trace carrega a decisão real.
 *   - Programming-specific runtime policy só entra quando `mode==='programming'`
 *     explicitamente — `auto` NUNCA arrasta atlas_programming/permission_policy.
 */
export function buildInteractionPayload(input: AtlasAiPayloadInput): AtlasAiPayloadBuildResult {
  const focus = focusForMode(input.mode)
  const decisionMode = input.provider === 'auto' ? 'atlas_decide' : 'manual_override'
  const provider = input.provider === 'auto' ? undefined : input.provider
  const workflowMode = input.task === 'debug' ? 'dev' : input.task
  const flowId = flowIdForMode(input.mode, input.task)
  const domainId = domainIdForFlow(flowId)
  const computeEffort = normalizeAtlasComputeEffort(input.computeEffort)
  const requestedComputeEffort = atlasComputeEffortForPayload(computeEffort)

  // Auto-mode: front NÃO assume domínio. Operador explicitamente programming
  // mantém workspaceSlug como domínio de roteamento por compat com Atlas Dev.
  const routingDomain = input.routingDomain
    ?? (input.mode === 'auto' || input.task === 'auto'
      ? 'auto'
      : input.mode === 'programming' && input.workspaceSlug
        ? input.workspaceSlug
        : input.mode)

  const routingTask = input.task === 'auto' ? 'auto' : input.task
  const awisContextHint = awisRuntimeContextHint(input.conversationContext)

  const payload: Record<string, unknown> = {
    app_surface: ATLAS_AI_APP_SURFACE,
    surface_id: ATLAS_AI_SURFACE_ID,
    atlas_focus: focus,
    atlas_workflow_mode: workflowMode,
    atlas_mode: input.mode,
    routing_task: routingTask,
    routing_domain: routingDomain,
    decision_mode: decisionMode,
    flow_id: flowId,
    domain_id: domainId,
    workspace: input.workspaceSlug ?? undefined,
    atlas_mode_contract: modeContractForRouting(input.mode, input.task),
    quality_policy: qualityPolicyForMode(input.mode),
    operator_compute_effort: computeEffort,
    conversation_context: input.conversationContext ?? undefined,
    awis_runtime_context: awisContextHint,
  }

  if (requestedComputeEffort) {
    payload.compute_effort = requestedComputeEffort
    payload.policy_hints = {
      compute_effort: requestedComputeEffort,
    }
  }

  if (input.mode === 'programming') {
    Object.assign(payload, programmingRuntimePolicy(input.workspaceSlug))
  }

  if (provider) {
    payload.requested_provider = provider
    payload.operator_requested_provider = provider
  }

  return { payload, provider }
}

function modeContractForRouting(mode: AtlasAiMode, task: AtlasAiTask): Record<string, unknown> {
  if (mode === 'auto') {
    return {
      schema_version: ATLAS_AI_MODE_CONTRACT_VERSION,
      mode,
      objective:
        'atlas decide domínio e flow pelo contexto operacional sem que a surface assuma programação ou operacional por default',
      routing_task: task,
      memory_scope: 'auto_current_thread',
      expected_output: ['resposta_clara', 'evidencia_quando_aplicavel', 'proxima_acao_quando_util'],
      required_behaviors: ['route_via_router_runtime', 'no_surface_side_inference_as_truth'],
    }
  }
  if (mode === 'programming') {
    return {
      schema_version: ATLAS_AI_MODE_CONTRACT_VERSION,
      mode,
      objective:
        'resolver trabalho de engenharia com contexto, plano, execucao, verificacao e evidencias',
      routing_task: task,
      default_runtime: 'engineering_harness',
      memory_scope: 'engineering_and_current_thread',
      expected_output: ['diagnostico', 'plano', 'execucao', 'testes', 'riscos', 'proximos_passos'],
      required_behaviors: ['use_tools_when_needed', 'record_evidence', 'state_tests_or_reason'],
    }
  }
  if (mode === 'operational') {
    return {
      schema_version: ATLAS_AI_MODE_CONTRACT_VERSION,
      mode,
      objective: 'explicar situacao operacional, isolar causa, medir impacto e propor proxima acao',
      routing_task: task,
      memory_scope: 'operational_context_bundle_and_current_thread',
      expected_output: [
        'resumo',
        'evidencias',
        'risco',
        'acao_recomendada',
        'quando_promover_para_programacao',
      ],
      required_behaviors: ['use_context_bundle', 'separate_fact_from_hypothesis', 'recommend_next_action'],
    }
  }
  return {
    schema_version: ATLAS_AI_MODE_CONTRACT_VERSION,
    mode,
    objective:
      'conversa geral, pesquisa, ideias e organizacao sem herdar contexto operacional ou de codigo por acidente',
    routing_task: task,
    memory_scope: 'general_current_thread',
    expected_output: ['resposta_clara', 'perguntas_necessarias', 'proximos_passos_quando_util'],
    required_behaviors: ['keep_context_light', 'do_not_assume_operational_or_code_runtime'],
  }
}

function qualityPolicyForMode(mode: AtlasAiMode): Record<string, unknown> {
  if (mode === 'auto') {
    return {
      keep_context_light: true,
      let_router_runtime_decide: true,
    }
  }
  if (mode === 'programming') {
    return {
      require_plan: true,
      require_tests_or_reason: true,
      require_diff_or_reason: true,
      require_risk_summary: true,
    }
  }
  if (mode === 'operational') {
    return {
      require_evidence: true,
      require_uncertainty: true,
      require_next_actions: true,
      avoid_raw_json_as_primary_output: true,
    }
  }
  return {
    keep_context_light: true,
    avoid_operational_or_programming_assumptions: true,
  }
}

function programmingRuntimePolicy(workspace: string | null): Record<string, unknown> {
  return {
    capability_profile: 'atlas_programming',
    permission_policy: 'full_access',
    permission_mode: 'danger',
    tool_permissions: {
      mode: 'danger',
      workspace: workspace ?? undefined,
      confirmed: true,
      allow_unsandboxed_provider: true,
      source: 'atlas_desktop_ai_programming_mode',
    },
    programming_harness: {
      schema_version: ATLAS_AI_MODE_CONTRACT_VERSION,
      workspace_required: true,
      expected_artifacts: ['plan', 'diff_or_reason', 'tests_or_reason', 'risks'],
      escalation_policy: 'ask_before_destructive_or_external_write',
    },
  }
}

export function providerLabel(value: AtlasAiProviderChoice): string {
  return PROVIDER_OPTIONS.find((opt) => opt.value === value)?.label ?? value
}

export function modeLabel(value: AtlasAiMode | null | undefined): string {
  if (!value) return 'Atlas decide'
  const known: Record<AtlasAiMode, string> = {
    auto: 'Atlas decide',
    general: 'Geral',
    conversation: 'Conversa',
    operational: 'Operacional',
    programming: 'Programação',
    research: 'Pesquisa',
    finance: 'Finanças',
    marketing: 'Marketing',
    strategy: 'Estratégia',
    personal_development: 'Pessoal',
    cyber: 'Cyber',
    automation: 'Automação',
  }
  return known[value] ?? value.replace(/[_-]+/g, ' ')
}

export function modelLabel(value: string | null | undefined): string {
  const raw = value?.trim()
  if (!raw) return '—'
  const known: Record<string, string> = {
    atlas: 'Atlas',
    auto: 'Atlas Decide',
    claude_cli: 'Claude',
    codex_cli: 'Codex',
    gemini_cli: 'Gemini',
    claude_codex: 'Claude + Codex',
    openai: 'OpenAI',
    anthropic: 'Claude',
    gemini: 'Gemini',
  }
  const lower = raw.toLowerCase()
  if (known[lower]) return known[lower]
  if (lower.startsWith('gpt-')) return `OpenAI ${raw}`
  if (lower.startsWith('claude-')) return `Claude ${raw.replace(/^claude-/i, '')}`
  return raw.replace(/[_-]+/g, ' ')
}
