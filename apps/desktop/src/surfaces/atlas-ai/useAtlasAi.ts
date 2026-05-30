/**
 * useAtlasAi · stateful hook por trás da AtlasAiSurface.
 *
 * Responsabilidades:
 *   - listar/abrir/criar `ai_threads` reais (sem storage paralelo);
 *   - listar conversas cross-workspace e deixar o workspace ativo governar o composer;
 *   - construir payload via `contract.ts` (paridade com Atlas AI mobile);
 *   - postar `/ai/interactions` e fazer polling leve do trace até `completed`.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { bridge } from '../../lib/bridge'
import {
  atlasAiBridgeMode,
  type AtlasAiBridgeMode,
  AtlasDevPlanUnavailableError,
  createAiInteraction,
  createAiThread,
  deleteAiThread,
  getAiThread,
  getAiThreadMessages,
  getAiTrace,
  getAtlasAiRouterBootstrap,
  getAtlasAiRouterReadiness,
  getWorkspaceArtifactLakeEntry,
  getWorkspaceConversationFusion,
  listAiThreads,
  postAtlasDevPlan,
  updateAiThread,
} from './client'
import { buildInteractionPayload, defaultTaskForMode, isTaskAllowedForMode } from './contract'
import {
  workspaceMetadata,
  workspaceStorageValue,
  type AtlasAiWorkspaceScope,
} from './workspaceScope'
import type { AtlasComputeEffortChoice, AtlasRichInputPayload } from '../../lib/rich-input'
import type {
  AiThreadDetail,
  AiThreadMessage,
  AiThreadSummary,
  AiTrace,
  AtlasAiMode,
  AtlasAiProviderChoice,
  AtlasAiRouterBootstrap,
  AtlasAiRouterReadiness,
  AtlasAiTask,
  AtlasWorkspaceArtifactLakeEntry,
  AtlasWorkspaceConversationFusion,
  AtlasDevPlanResult,
} from './types'

export interface AtlasAiState {
  mode: AtlasAiBridgeMode
  workspaceSlug: string | null
  setWorkspaceSlug: (slug: string | null) => void
  workspacePath: string | null
  setWorkspacePath: (path: string | null) => void
  threadsLoading: boolean
  threads: AiThreadSummary[]
  threadsError: string | null
  modeFilter: AtlasAiMode | 'all'
  setModeFilter: (mode: AtlasAiMode | 'all') => void
  refreshThreads: (options?: { limit?: number; background?: boolean }) => Promise<void>
  conversationFusion: AtlasWorkspaceConversationFusion | null
  conversationFusionLoading: boolean
  conversationFusionError: string | null
  refreshConversationFusion: (threadIds?: string[], opts?: { persist?: boolean }) => Promise<AtlasWorkspaceConversationFusion | null>
  conversationFusionArtifact: AtlasWorkspaceArtifactLakeEntry | null
  conversationFusionArtifactLoading: boolean
  conversationFusionArtifactError: string | null
  inspectConversationFusionArtifact: (artifact?: string | null) => Promise<void>

  selectedThreadId: string | null
  selectThread: (id: string | null) => void
  prefetchThread: (id: string) => void
  threadDetail: AiThreadDetail | null
  threadDetailLoading: boolean
  threadDetailError: string | null
  threadOlderMessagesLoading: boolean
  threadHasOlderMessages: boolean
  threadOlderMessagesError: string | null
  loadOlderThreadMessages: () => Promise<void>

  composerMode: AtlasAiMode
  setComposerMode: (mode: AtlasAiMode) => void
  composerTask: AtlasAiTask
  setComposerTask: (task: AtlasAiTask) => void
  composerProvider: AtlasAiProviderChoice
  setComposerProvider: (provider: AtlasAiProviderChoice) => void
  composerComputeEffort: AtlasComputeEffortChoice
  setComposerComputeEffort: (effort: AtlasComputeEffortChoice) => void

  /** Bootstrap projection from Router Runtime (null if endpoint absent). */
  routerBootstrap: AtlasAiRouterBootstrap | null
  /** Readiness projection from Router Runtime (null if endpoint absent). */
  routerReadiness: AtlasAiRouterReadiness | null

  pendingTrace: AiTrace | null
  /** Último trace terminal observado pelo polling. Usado pelo AWIS para aprender
   * com o outcome real, não com o estado inicial do envio. */
  lastTerminalTrace: AiTrace | null
  /** Mensagem otimista do usuário — set ANTES dos awaits do send. Garante
   * feedback imediato (bolha + indicador) entre Enter e o trace aparecer. */
  pendingUserMessage: {
    threadId: string | null
    text: string
    attachmentCount: number
    startedAt: number
  } | null
  /** Texto streaming acumulado via SSE — aparece token-by-token na bolha. */
  streamingText: string
  sending: boolean
  sendError: string | null
  sendErrorThreadId: string | null

  /**
   * Atlas Dev plan-only state · populated when the composer fires
   * POST /ai/interactions/atlas-dev/plan ahead of the legacy interaction call.
   * Keyed by run_id; UI reads `currentPlan` for the active panel render.
   */
  atlasDevPlanLoading: boolean
  atlasDevPlanError: string | null
  atlasDevPlanUnavailable: boolean
  currentAtlasDevPlan: AtlasDevPlanResult | null
  atlasDevPlansByRun: Readonly<Record<string, AtlasDevPlanResult>>
  /** Soft cancel: para o polling + limpa optimistic. Backend pode continuar. */
  cancelPending: () => void
  send: (
    text: string,
    options?: {
      newThread?: boolean
      title?: string
      uploadedImageIds?: string[]
      uploadedDocumentIds?: string[]
      textBlocks?: Array<{
        file_name: string
        mime_type: string
        language: string | null
        content: string
        page_count?: number
      }>
      urlAttachments?: Array<{
        url: string
        kind: string
        title: string | null
        author: string | null
        duration_sec: number | null
        thumbnail_url: string | null
        ref_id: string | null
      }>
      /** Universal Rich Input Payload canon (`atlas.rich_input.payload.v1`). */
      richInputPayload?: AtlasRichInputPayload
      computeEffort?: AtlasComputeEffortChoice
      voiceConversation?: boolean
      conversationContext?: unknown[]
      /** Thread alvo explícita. Necessário para Workbench multi-conversa. */
      threadId?: string | null
    },
  ) => Promise<AiTrace | null>

  archiveSelectedThread: () => Promise<void>
  /** Arquiva qualquer thread por id (não muda seleção a menos que arquivar a selecionada). */
  archiveThread: (id: string) => Promise<void>
  /** Renomeia thread (PATCH /ai/threads/{id}). */
  renameThread: (id: string, title: string) => Promise<void>
  /** Apaga a thread permanentemente (DELETE /ai/threads/{id}). */
  closeThread: (id: string) => Promise<void>
  /** Move thread para o workspace AWIS ativo (usado por drag/drop e menu). */
  moveThreadToWorkspace: (id: string, scope: AtlasAiWorkspaceScope) => Promise<void>
  /** Baixa detalhe para usos fora da seleção; padrão é leve para Workbench. */
  fetchThreadDetail: (id: string, options?: { full?: boolean }) => Promise<AiThreadDetail | null>
}

const TRACE_POLL_INTERVAL_MS = 500
const TRACE_POLL_INITIAL_DELAY_MS = 250
const TRACE_POLL_TIMEOUT_MS = 120_000
const INITIAL_THREAD_MESSAGE_LIMIT = 6
const OLDER_THREAD_MESSAGE_PAGE_LIMIT = 6
const THREAD_LIST_FOREGROUND_LIMIT = 40
const THREAD_LIST_FULL_LIMIT = 100
const THREAD_DETAIL_SELECT_LOAD_DELAY_MS = 32
const THREADS_CACHE_STORAGE_KEY = 'atlas-desktop:atlas-ai:threads-cache:v1'
const THREAD_DETAIL_CACHE_STORAGE_KEY = 'atlas-desktop:atlas-ai:thread-detail-cache:v1'
const THREAD_DETAIL_CACHE_MAX_ENTRIES = 50
const THREAD_DETAIL_CACHE_MAX_MESSAGES = 18
const CACHE_PERSIST_DEBOUNCE_MS = 450
const STARTUP_BACKGROUND_DELAY_MS = 900
const PENDING_TRACE_RESUME_STORAGE_KEY = 'atlas-desktop:atlas-ai:pending-trace-resume:v1'
const PENDING_TRACE_RESUME_TTL_MS = 20 * 60 * 1000

interface PendingTraceResumeEntry {
  traceId: string
  threadId: string | null
  workspaceSlug: string | null
  createdAt: number
}

function readStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key)
  } catch {
    /* ignore */
  }
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage.getItem(key)
  } catch {
    /* ignore */
  }
  return null
}

function scheduleAtlasAiBackgroundWork(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    callback()
    return () => {}
  }
  let cancelled = false
  let timeoutId: number | null = null
  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number
    cancelIdleCallback?: (id: number) => void
  }
  const run = () => {
    if (cancelled) return
    callback()
  }
  if (typeof win.requestIdleCallback === 'function') {
    const idleId = win.requestIdleCallback(run, { timeout: STARTUP_BACKGROUND_DELAY_MS })
    return () => {
      cancelled = true
      win.cancelIdleCallback?.(idleId)
    }
  }
  timeoutId = window.setTimeout(run, STARTUP_BACKGROUND_DELAY_MS)
  return () => {
    cancelled = true
    if (timeoutId !== null) window.clearTimeout(timeoutId)
  }
}

function writeStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
      return
    }
  } catch {
    /* fallback below */
  }
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

function removeStorageItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key)
      return
    }
  } catch {
    /* fallback below */
  }
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function isSafePendingTraceResumeText(value: string | null): value is string {
  return typeof value === 'string' &&
    value.trim() !== '' &&
    !/\/Users\/|operator_input|response_text|raw[_ ]conversation|full[_ ]message/i.test(value)
}

function readPendingTraceResume(now = Date.now()): PendingTraceResumeEntry | null {
  try {
    const raw = readStorageItem(PENDING_TRACE_RESUME_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const traceId = typeof parsed.traceId === 'string' ? parsed.traceId.trim() : ''
    const threadId = typeof parsed.threadId === 'string' ? parsed.threadId.trim() : null
    const workspaceSlug = typeof parsed.workspaceSlug === 'string' ? parsed.workspaceSlug.trim() : null
    const createdAt = typeof parsed.createdAt === 'number' && Number.isFinite(parsed.createdAt)
      ? parsed.createdAt
      : 0
    if (!isSafePendingTraceResumeText(traceId)) return null
    if (threadId !== null && !isSafePendingTraceResumeText(threadId)) return null
    if (workspaceSlug !== null && !isSafePendingTraceResumeText(workspaceSlug)) return null
    if (createdAt <= 0 || now - createdAt > PENDING_TRACE_RESUME_TTL_MS) return null
    return {
      traceId,
      threadId,
      workspaceSlug,
      createdAt,
    }
  } catch {
    return null
  }
}

function savePendingTraceResume(input: Omit<PendingTraceResumeEntry, 'createdAt'>): void {
  if (!isSafePendingTraceResumeText(input.traceId)) return
  if (input.threadId !== null && !isSafePendingTraceResumeText(input.threadId)) return
  if (input.workspaceSlug !== null && !isSafePendingTraceResumeText(input.workspaceSlug)) return
  writeStorageItem(PENDING_TRACE_RESUME_STORAGE_KEY, JSON.stringify({
    schema_version: 1,
    traceId: input.traceId,
    threadId: input.threadId,
    workspaceSlug: input.workspaceSlug,
    createdAt: Date.now(),
  }))
}

function clearPendingTraceResume(traceId?: string | null): void {
  if (traceId) {
    const current = readPendingTraceResume()
    if (current && current.traceId !== traceId) return
  }
  removeStorageItem(PENDING_TRACE_RESUME_STORAGE_KEY)
}

function latestMessagesForCache(messages: AiThreadMessage[] = []): AiThreadMessage[] {
  return messages
    .slice()
    .sort((a, b) => a.position - b.position)
    .slice(-THREAD_DETAIL_CACHE_MAX_MESSAGES)
}

function compactThreadDetailForCache(detail: AiThreadDetail): AiThreadDetail {
  return {
    ...detail,
    messages: latestMessagesForCache(detail.messages ?? []),
  }
}

function provisionalThreadDetailFromSummary(thread: AiThreadSummary): AiThreadDetail {
  return {
    ...thread,
    messages: [],
    last_trace: null,
  }
}

function readThreadListCache(): AiThreadSummary[] {
  try {
    const raw = readStorageItem(THREADS_CACHE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { threads?: unknown }
    if (!Array.isArray(parsed.threads)) return []
    return parsed.threads
      .filter((thread): thread is AiThreadSummary => {
        return !!thread && typeof thread === 'object' && typeof (thread as AiThreadSummary).id === 'string'
      })
      .slice(0, 100)
  } catch {
    return []
  }
}

function writeThreadListCache(threads: AiThreadSummary[]): void {
  writeStorageItem(THREADS_CACHE_STORAGE_KEY, JSON.stringify({
    schema_version: 1,
    cached_at: Date.now(),
    threads: threads.slice(0, 100),
  }))
}

function readThreadDetailCache(): Map<string, AiThreadDetail> {
  const cache = new Map<string, AiThreadDetail>()
  try {
    const raw = readStorageItem(THREAD_DETAIL_CACHE_STORAGE_KEY)
    if (!raw) return cache
    const parsed = JSON.parse(raw) as { entries?: unknown }
    if (!Array.isArray(parsed.entries)) return cache
    for (const entry of parsed.entries) {
      if (!entry || typeof entry !== 'object') continue
      const detail = (entry as { detail?: unknown }).detail
      if (!detail || typeof detail !== 'object') continue
      const id = (detail as AiThreadDetail).id
      if (typeof id !== 'string' || id.trim() === '') continue
      cache.set(id, compactThreadDetailForCache(detail as AiThreadDetail))
    }
  } catch {
    return new Map()
  }
  return cache
}

function writeThreadDetailCache(cache: Map<string, AiThreadDetail>): void {
  const entries = Array.from(cache.entries())
    .slice(-THREAD_DETAIL_CACHE_MAX_ENTRIES)
    .map(([id, detail]) => ({
      id,
      cached_at: Date.now(),
      detail: compactThreadDetailForCache(detail),
    }))
  writeStorageItem(THREAD_DETAIL_CACHE_STORAGE_KEY, JSON.stringify({
    schema_version: 1,
    cached_at: Date.now(),
    entries,
  }))
}

function rememberThreadDetail(
  cache: Map<string, AiThreadDetail>,
  id: string,
  detail: AiThreadDetail,
  persist?: () => void,
): void {
  cache.delete(id)
  cache.set(id, detail)
  while (cache.size > THREAD_DETAIL_CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value
    if (typeof firstKey !== 'string') break
    cache.delete(firstKey)
  }
  persist?.()
}

function isAbortError(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { name?: unknown }).name === 'AbortError'
}

function mergeThreadMessages(current: AiThreadMessage[] = [], incoming: AiThreadMessage[] = []): AiThreadMessage[] {
  const byId = new Map<string, AiThreadMessage>()
  for (const message of current) byId.set(message.id, message)
  for (const message of incoming) byId.set(message.id, message)
  return Array.from(byId.values()).sort((a, b) => a.position - b.position)
}

function traceFailureMessage(trace: AiTrace): string {
  const failedJob = trace.job?.status === 'failed'
    ? trace.job
    : trace.jobs?.find((job) => job.status === 'failed') ?? trace.job ?? trace.jobs?.[0] ?? null
  const failedAttempt =
    failedJob?.attempt_history?.find((attempt) => attempt.status === 'failed') ??
    failedJob?.attempt_history?.[0] ??
    null
  const metadata = trace.metadata ?? {}
  const metadataMessage =
    typeof metadata.error_message === 'string'
      ? metadata.error_message
      : typeof metadata.error === 'string'
        ? metadata.error
        : typeof metadata.message === 'string'
          ? metadata.message
          : null
  const detail =
    failedJob?.error_message?.trim() ||
    failedAttempt?.error_message?.trim() ||
    metadataMessage?.trim() ||
    trace.response_text?.trim() ||
    null
  const action =
    trace.status === 'rejected'
      ? 'rejeitou'
      : trace.status === 'cancelled'
        ? 'cancelou'
        : 'não concluiu'
  return detail
    ? `Atlas ${action}: ${detail}`
    : `Atlas ${action} esta resposta. Tente de novo ou verifique o serviço local.`
}

function providerSafeStringList(value: unknown, limit = 4): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map((item) => item.trim().replace(/\s+/g, ' ').slice(0, 180))
    .filter((item) => !/\/Users\/|thread_id|source_thread_ids|raw[_ ]conversation|response_text|operator_input|full[_ ]message/i.test(item))
    .slice(0, limit)
}

function providerSafeString(value: unknown, limit = 140): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ').slice(0, limit)
  if (!text || /\/Users\/|thread_id|source_thread_ids|raw[_ ]conversation|response_text|operator_input|full[_ ]message/i.test(text)) return null
  return text
}

function providerSafePercent(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(100, Math.max(0, Math.round(value)))
}

function providerSafeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  return Math.floor(value)
}

function providerSafeRankedItems(value: unknown, limit: number): Array<{ label: string; score: number; reason: string }> {
  return arrayRecords(value)
    .map((item) => {
      const label = providerSafeString(item.label, 120)
      const reason = providerSafeString(item.reason, 140)
      const rawScore = typeof item.score === 'number' ? item.score : null
      const score = rawScore === null ? null : providerSafePercent(rawScore)
      if (!label || !reason || score === null) return null
      return { label, score, reason }
    })
    .filter((item): item is { label: string; score: number; reason: string } => Boolean(item))
    .slice(0, limit)
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function arrayRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(objectRecord).filter((item): item is Record<string, unknown> => Boolean(item))
    : []
}

function awisThreadMetadataFromContext(conversationContext?: unknown[]): Record<string, unknown> {
  if (!conversationContext?.length) return {}

  const schemaVersions = new Set<string>()
  let providerCapsule: Record<string, unknown> | null = null
  let contextPack: Record<string, unknown> | null = null
  let taskContext: Record<string, unknown> | null = null

  for (const entry of conversationContext) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const item = entry as Record<string, unknown>
    const schema = typeof item.schema_version === 'string' ? item.schema_version : null
    if (!schema?.startsWith('atlas.awis.')) continue
    schemaVersions.add(schema)
    if (schema === 'atlas.awis.workspace_provider_capsule.v1') providerCapsule = item
    if (schema === 'atlas.awis.workspace_context_pack.v1') contextPack = item
    if (schema === 'atlas.awis.workspace_task_context_projection.v1') taskContext = item
  }

  if (schemaVersions.size === 0) return {}

  const preflight = objectRecord(contextPack?.preflight)
  const twin = objectRecord(contextPack?.workspace_twin)
  const twinHashes = objectRecord(twin?.hashes)
  const spaces = objectRecord(contextPack?.spaces)
  const liveMemory = objectRecord(contextPack?.live_execution_memory)
  const contextKernel = objectRecord(contextPack?.context_kernel)
  const componentMemory = objectRecord(contextPack?.component_memory)
  const semanticIndex = objectRecord(contextPack?.semantic_index)
  const impactMap = objectRecord(contextPack?.impact_map)
  const taskRouter = objectRecord(contextPack?.task_router)
  const livingGraph = objectRecord(contextPack?.living_graph)
  const workspaceMesh = objectRecord(contextPack?.workspace_mesh)
  const currentTruthPack = objectRecord(contextPack?.current_truth_pack)
  const nextSessionBrain = objectRecord(contextPack?.next_session_brain)
  const repositoryConstellation = objectRecord(contextPack?.repository_constellation)
  const memoryConsolidation = objectRecord(contextPack?.memory_consolidation)
  const replayContract = objectRecord(memoryConsolidation?.replay_contract)
  const workspaceRunbook = objectRecord(contextPack?.workspace_runbook)
  const runbookProcedures = arrayRecords(workspaceRunbook?.procedures)
  const runbookFailureResponse = objectRecord(workspaceRunbook?.failure_response)
  const runbookNextSession = objectRecord(workspaceRunbook?.next_session)
  const retention = objectRecord(contextPack?.retention)
  const retentionLifecycle = objectRecord(retention?.lifecycle)
  const startupOrchestration = objectRecord(contextPack?.startup_orchestration)
  const automation = objectRecord(contextPack?.automation)
  const automationAutopilot = objectRecord(automation?.autopilot_context)
  const automationFeedbackLoop = objectRecord(automation?.feedback_loop)
  const automationQueue = arrayRecords(automation?.maintenance_queue)
  const selfImprovement = objectRecord(contextPack?.self_improvement)
  const selfImprovementQueue = arrayRecords(selfImprovement?.improvement_queue)
  const selfImprovementPolicy = objectRecord(selfImprovement?.promotion_policy)
  const selfImprovementReview = objectRecord(selfImprovement?.next_review)
  const adaptiveLearning = objectRecord(contextPack?.adaptive_learning_plan)
  const adaptiveCycle = objectRecord(adaptiveLearning?.autonomous_cycle)
  const adaptiveContextEconomy = objectRecord(adaptiveLearning?.context_economy)
  const adaptiveRepositoryCompounding = objectRecord(adaptiveLearning?.repository_compounding)
  const adaptiveHumanControl = objectRecord(adaptiveLearning?.human_control)
  const adaptiveProof = objectRecord(adaptiveLearning?.proof)
  const providerStrategy = objectRecord(contextPack?.provider_strategy)
  const executionDoctrine = objectRecord(contextPack?.execution_doctrine)
  const doctrinePreflight = objectRecord(executionDoctrine?.preflight)
  const doctrineCommandPolicy = objectRecord(executionDoctrine?.command_policy)
  const memoryFreshness = objectRecord(contextPack?.memory_freshness)
  const freshnessEvidence = objectRecord(memoryFreshness?.evidence)
  const confidence = objectRecord(contextPack?.confidence)
  const confidencePolicy = objectRecord(confidence?.decision_policy)
  const learningFlywheel = objectRecord(contextPack?.learning_flywheel)
  const flywheelAutomation = objectRecord(learningFlywheel?.automation)
  const flywheelNextSession = objectRecord(learningFlywheel?.next_session)
  const launchContract = objectRecord(contextPack?.launch_contract)
  const launchStartup = objectRecord(launchContract?.startup_contract)
  const launchAutomation = objectRecord(launchContract?.automation_contract)
  const topology = objectRecord(contextPack?.topology)
  const topologyExecutionMap = objectRecord(topology?.execution_map)
  const topologyKnowledgeMap = objectRecord(topology?.knowledge_map)
  const topologyWorkspaceMembers = providerSafeStringList(topologyKnowledgeMap?.workspace_members, 6)
  const topologyWorkspaceDependencyEdges = providerSafeStringList(topologyKnowledgeMap?.workspace_dependency_edges, 6)
  const startupContract = objectRecord(providerCapsule?.startup_contract)
  const goldenContext = objectRecord(providerCapsule?.golden_context)
  const continuityHandoff = objectRecord(providerCapsule?.continuity_handoff)
  const taskPacket = objectRecord(providerCapsule?.task_packet)
  const taskPacketObjective = objectRecord(taskPacket?.objective)
  const taskPacketContext = objectRecord(taskPacket?.context)
  const bootstrapPlan =
    objectRecord(providerCapsule?.bootstrap_plan) ??
    objectRecord(taskPacketContext?.bootstrap_plan) ??
    objectRecord(objectRecord(taskContext?.recommended_context)?.bootstrap_plan)
  const bootstrapManifest = objectRecord(contextPack?.bootstrap_manifest)
  const bootstrapManifestContextGold = objectRecord(bootstrapManifest?.context_gold)
  const bootstrapManifestWorkspaceScope = objectRecord(bootstrapManifest?.workspace_scope)
  const bootstrapManifestAutomation = objectRecord(bootstrapManifest?.automation_plan)
  const bootstrapManifestLearning = objectRecord(bootstrapManifest?.learning_contract)
  const bootstrapManifestEvidence = objectRecord(bootstrapManifest?.evidence)
  const taskPacketWorkingSet = objectRecord(taskPacketContext?.working_set)
  const taskPacketSpaceBrain = arrayRecords(taskPacketContext?.space_brain)
  const taskPacketExecution = objectRecord(taskPacket?.execution)
  const taskPacketCommandLanes = objectRecord(taskPacketExecution?.command_lanes)
  const taskPacketRisk = objectRecord(taskPacket?.risk)
  const taskPacketLearning = objectRecord(taskPacket?.learning)
  const taskPacketAutomationPlan = objectRecord(taskPacketLearning?.automation_plan)
  const startupReadiness = objectRecord(startupContract?.readiness)
  const startupSnapshot = objectRecord(contextPack?.startup_snapshot)
  const strongestSpaces = arrayRecords(spaces?.strongest_spaces)
  const learnedSpaces = strongestSpaces
    .map((space) => {
      const learned = objectRecord(space.learned_memory)
      const title = providerSafeString(space.title, 80)
      if (!title || !learned) return null
      return {
        title,
        outcome_count: providerSafeNumber(learned.outcome_count),
        success_count: providerSafeNumber(learned.success_count),
        failure_count: providerSafeNumber(learned.failure_count),
        comparison_open_count: providerSafeNumber(learned.comparison_open_count),
        last_outcome_status: providerSafeString(learned.last_outcome_status, 32),
        signals: providerSafeStringList(learned.signals, 4),
        artifact_refs: providerSafeStringList(learned.artifact_refs, 3),
      }
    })
    .filter((item): item is {
      title: string
      outcome_count: number | null
      success_count: number | null
      failure_count: number | null
      comparison_open_count: number | null
      last_outcome_status: string | null
      signals: string[]
      artifact_refs: string[]
    } => Boolean(item))
    .filter((item) =>
      (item.outcome_count ?? 0) > 0 ||
      item.signals.length > 0 ||
      item.artifact_refs.length > 0,
    )
    .slice(0, 3)
  const priorityLoad = arrayRecords(contextKernel?.priority_load)
  const kernelBudget = objectRecord(contextKernel?.budget)
  const preflightGates = arrayRecords(preflight?.gates)
  const strongestComponents = arrayRecords(componentMemory?.strongest_components)
  const componentRoutingHints = arrayRecords(componentMemory?.routing_hints)
  const semanticAliases = arrayRecords(semanticIndex?.query_aliases)
  const semanticStackMap = arrayRecords(semanticIndex?.stack_map)
  const semanticRetrievalPolicy = objectRecord(semanticIndex?.retrieval_policy)
  const impactComponents = arrayRecords(impactMap?.component_impacts)
  const impactCrossWorkspace = arrayRecords(impactMap?.cross_workspace_impacts)
  const taskRoutes = arrayRecords(taskRouter?.routes)
  const graphNodes = arrayRecords(livingGraph?.nodes)
  const graphEdges = arrayRecords(livingGraph?.edges)
  const meshRoutes = arrayRecords(workspaceMesh?.routes)
  const meshNextConversation = objectRecord(workspaceMesh?.next_conversation)
  const currentTruth = objectRecord(currentTruthPack?.current_truth)
  const currentTruthProof = objectRecord(currentTruthPack?.proof)
  const currentTruthNextConversation = objectRecord(currentTruthPack?.next_conversation)
  const currentTruthContract = objectRecord(currentTruthPack?.trust_contract)
  const nextSessionContextLoading = objectRecord(nextSessionBrain?.context_loading)
  const nextSessionTruthHints = objectRecord(nextSessionContextLoading?.truth_hints)
  const constellationRepositories = arrayRecords(repositoryConstellation?.repositories)
  const constellationBridges = arrayRecords(repositoryConstellation?.bridges)
  const constellationNextConversation = objectRecord(repositoryConstellation?.next_conversation)
  const constellationLearningLoop = objectRecord(repositoryConstellation?.learning_loop)
  const startupGold = objectRecord(startupSnapshot?.startup_gold)
  const liveStartupPacket = objectRecord(liveMemory?.startup_packet)
  const recommendedContext = objectRecord(taskContext?.recommended_context)
  const recommendedDependencyEdges = providerSafeStringList(recommendedContext?.dependency_edges, 6)
  const recommendedCommandIntents = providerSafeStringList(recommendedContext?.command_intents, 6)
  const recommendedCommandLanes =
    objectRecord(recommendedContext?.command_lanes) ??
    objectRecord(providerCapsule?.command_lanes)
  const spaceBrain = arrayRecords(recommendedContext?.space_brain)
  const folderFocus = objectRecord(recommendedContext?.folder_focus)
  const evidenceGate = objectRecord(recommendedContext?.evidence_gate)
  const contextBudget = objectRecord(recommendedContext?.context_budget)
  const workingSet = objectRecord(recommendedContext?.working_set)
  const impactRadius = objectRecord(recommendedContext?.impact_radius)
  const transferContract = objectRecord(recommendedContext?.transfer_contract)
  const learningHooks = objectRecord(taskContext?.learning_hooks)
  const taskNextSessionContract = objectRecord(learningHooks?.next_session_contract)
  const taskFeedbackLoop = objectRecord(learningHooks?.task_feedback_loop)
  const continueLearning = objectRecord(providerCapsule?.continue_learning)
  const capsuleNextSessionContract = objectRecord(continueLearning?.next_session_contract)
  const capsuleTaskFeedbackLoop = objectRecord(continueLearning?.task_feedback_loop)

  return {
    awis_context_applied: true,
    awis_context_schema_versions: Array.from(schemaVersions).slice(0, 6),
    awis_provider_safe: true,
    awis_task_kind: typeof taskContext?.task_kind === 'string'
      ? taskContext.task_kind
      : typeof providerCapsule?.task_kind === 'string'
        ? providerCapsule.task_kind
        : 'startup',
    awis_task_packet: {
      packet_hash: providerSafeString(taskPacket?.packet_hash, 120),
      task_kind: providerSafeString(taskPacket?.task_kind, 60),
      confidence: providerSafePercent(taskPacket?.confidence),
      objective: {
        label: providerSafeString(taskPacketObjective?.label, 120),
        suggested_surface: providerSafeString(taskPacketObjective?.suggested_surface, 40),
        workspace_key: providerSafeString(taskPacketObjective?.workspace_key, 80),
        context_mode: providerSafeString(taskPacketObjective?.context_mode, 32),
      },
      context: {
        load_first: providerSafeStringList(taskPacketContext?.load_first, 6),
        use_as_summary: providerSafeStringList(taskPacketContext?.use_as_summary, 5),
        bootstrap_manifest_hash: providerSafeString(objectRecord(taskPacketContext?.bootstrap_plan)?.manifest_hash, 120),
        bootstrap_load_first: providerSafeStringList(objectRecord(taskPacketContext?.bootstrap_plan)?.load_first, 4),
        bootstrap_validate_before_use: providerSafeStringList(objectRecord(taskPacketContext?.bootstrap_plan)?.validate_before_use, 4),
        files: providerSafeStringList(taskPacketWorkingSet?.files, 5),
        docs: providerSafeStringList(taskPacketWorkingSet?.docs, 5),
        commands: providerSafeStringList(taskPacketWorkingSet?.commands, 4),
        spaces: providerSafeStringList(taskPacketContext?.spaces, 4),
        space_brain: taskPacketSpaceBrain
          .map((space) => {
            const title = providerSafeString(space.title, 80)
            if (!title) return null
            return {
              title,
              state: providerSafeString(space.state, 32),
              load_first: providerSafeStringList(space.load_first, 3),
              carry_forward: providerSafeStringList(space.carry_forward, 3),
              validate_before_use: providerSafeStringList(space.validate_before_use, 3),
              artifact_refs: providerSafeStringList(space.artifact_refs, 3),
              evidence: providerSafeStringList(space.evidence, 3),
            }
          })
          .filter((space): space is {
            title: string
            state: string | null
            load_first: string[]
            carry_forward: string[]
            validate_before_use: string[]
            artifact_refs: string[]
            evidence: string[]
          } => Boolean(space))
          .slice(0, 3),
        artifacts: providerSafeStringList(taskPacketContext?.artifacts, 4),
        related_workspaces: providerSafeStringList(taskPacketContext?.related_workspaces, 4),
      },
      execution: {
        preflight_gates: providerSafeStringList(taskPacketExecution?.preflight_gates, 5),
        validation_commands: providerSafeStringList(taskPacketExecution?.validation_commands, 5),
        auto_validate: providerSafeStringList(taskPacketCommandLanes?.auto_validate, 4),
        confirm_before_run: providerSafeStringList(taskPacketCommandLanes?.confirm_before_run, 4),
        manual_only: providerSafeStringList(taskPacketCommandLanes?.manual_only, 4),
        recovery: providerSafeStringList(taskPacketExecution?.recovery, 4),
      },
      risk: {
        cautions: providerSafeStringList(taskPacketRisk?.cautions, 5),
        human_boundary: providerSafeStringList(taskPacketRisk?.human_boundary, 5),
        avoid_loading: providerSafeStringList(taskPacketRisk?.avoid_loading, 5),
      },
      learning: {
        record: providerSafeStringList(taskPacketLearning?.record, 5),
        promote_after_success: providerSafeStringList(taskPacketLearning?.promote_after_success, 5),
        revalidate_after_failure: providerSafeStringList(taskPacketLearning?.revalidate_after_failure, 5),
        archive_as_artifact: providerSafeStringList(taskPacketLearning?.archive_as_artifact, 5),
        automation_plan: {
          safe_local: providerSafeStringList(taskPacketAutomationPlan?.safe_local, 5),
          confirm_first: providerSafeStringList(taskPacketAutomationPlan?.confirm_first, 5),
          observe_only: providerSafeStringList(taskPacketAutomationPlan?.observe_only, 5),
          reason: providerSafeString(taskPacketAutomationPlan?.reason, 180),
        },
      },
    },
    awis_workspace_runbook: {
      readiness_score: providerSafePercent(workspaceRunbook?.readiness_score),
      runbook_hash: providerSafeString(workspaceRunbook?.runbook_hash, 120),
      procedures: runbookProcedures
        .map((procedure) => {
          const title = providerSafeString(procedure.title, 100)
          const trigger = providerSafeString(procedure.trigger, 120)
          if (!title && !trigger) return null
          return {
            title,
            trigger,
            load_first: providerSafeStringList(procedure.load_first, 4),
            steps: providerSafeStringList(procedure.steps, 4),
            validate_with: providerSafeStringList(procedure.validate_with, 4),
            avoid: providerSafeStringList(procedure.avoid, 3),
            success_evidence: providerSafeStringList(procedure.success_evidence, 3),
            confidence: providerSafePercent(procedure.confidence),
          }
        })
        .filter((item): item is {
          title: string | null
          trigger: string | null
          load_first: string[]
          steps: string[]
          validate_with: string[]
          avoid: string[]
          success_evidence: string[]
          confidence: number | null
        } => Boolean(item))
        .slice(0, 5),
      failure_response: {
        known_failure_signatures: providerSafeStringList(runbookFailureResponse?.known_failure_signatures, 4),
        safe_retry: providerSafeStringList(runbookFailureResponse?.safe_retry, 4),
        preserve_as_artifact: providerSafeStringList(runbookFailureResponse?.preserve_as_artifact, 4),
        demote_or_revalidate: providerSafeStringList(runbookFailureResponse?.demote_or_revalidate, 4),
      },
      next_session: {
        start_here: providerSafeStringList(runbookNextSession?.start_here, 5),
        automate_when_safe: providerSafeStringList(runbookNextSession?.automate_when_safe, 4),
        human_owns: providerSafeStringList(runbookNextSession?.human_owns, 4),
      },
    },
    awis_capsule_confidence: typeof providerCapsule?.confidence === 'number' ? providerCapsule.confidence : null,
    awis_preflight_mode: typeof preflight?.mode === 'string' ? preflight.mode : null,
    awis_preflight_gates: preflightGates
      .map((gate) => {
        const id = providerSafeString(gate.id, 80)
        const status = providerSafeString(gate.status, 24)
        const reason = providerSafeString(gate.reason, 120)
        if (!id && !status && !reason) return null
        return { id, status, reason }
      })
      .filter((item): item is { id: string | null; status: string | null; reason: string | null } => Boolean(item))
      .slice(0, 5),
    awis_twin_hash: providerSafeString(twinHashes?.genome_hash, 120),
    awis_twin_hashes: {
      genome: providerSafeString(twinHashes?.genome_hash, 120),
      code_map: providerSafeString(twinHashes?.code_map_hash, 120),
      risk_map: providerSafeString(twinHashes?.risk_map_hash, 120),
      commands: providerSafeString(twinHashes?.command_registry_hash, 120),
    },
    awis_load_first: providerSafeStringList(providerCapsule?.load_first),
    awis_validate_with: providerSafeStringList(providerCapsule?.validate_with),
    awis_summary_gold: providerSafeStringList(providerCapsule?.use_as_summary, 6),
    awis_bootstrap_plan: {
      manifest_hash: providerSafeString(bootstrapPlan?.manifest_hash, 120),
      launch_mode: providerSafeString(bootstrapPlan?.launch_mode, 32),
      load_first: providerSafeStringList(bootstrapPlan?.load_first, 6),
      summarize_first: providerSafeStringList(bootstrapPlan?.summarize_first, 5),
      validate_before_use: providerSafeStringList(bootstrapPlan?.validate_before_use, 5),
      never_load_raw: providerSafeStringList(bootstrapPlan?.never_load_raw, 5),
      automation_hooks: providerSafeStringList(bootstrapPlan?.automation_hooks, 5),
      learning_hooks: providerSafeStringList(bootstrapPlan?.learning_hooks, 5),
      evidence: providerSafeStringList(bootstrapPlan?.evidence, 5),
      reason: providerSafeString(bootstrapPlan?.reason, 180),
    },
    awis_bootstrap_manifest: {
      bootstrap_hash: providerSafeString(bootstrapManifest?.bootstrap_hash, 120),
      launch_mode: providerSafeString(bootstrapManifest?.launch_mode, 32),
      readiness_score: providerSafePercent(bootstrapManifest?.readiness_score),
      golden_boot_sequence: providerSafeStringList(bootstrapManifest?.golden_boot_sequence, 6),
      load_first: providerSafeStringList(bootstrapManifestContextGold?.load_first, 6),
      summarize_first: providerSafeStringList(bootstrapManifestContextGold?.summarize_first, 5),
      validate_before_use: providerSafeStringList(bootstrapManifestContextGold?.validate_before_use, 5),
      never_load_raw: providerSafeStringList(bootstrapManifestContextGold?.never_load_raw, 5),
      repositories: providerSafeStringList(bootstrapManifestWorkspaceScope?.repositories, 4),
      components: providerSafeStringList(bootstrapManifestWorkspaceScope?.components, 5),
      spaces: providerSafeStringList(bootstrapManifestWorkspaceScope?.spaces, 5),
      artifacts: providerSafeStringList(bootstrapManifestWorkspaceScope?.artifacts, 5),
      before_send: providerSafeStringList(bootstrapManifestAutomation?.before_send, 5),
      after_success: providerSafeStringList(bootstrapManifestAutomation?.after_success, 5),
      after_failure: providerSafeStringList(bootstrapManifestAutomation?.after_failure, 5),
      safe_maintenance: providerSafeStringList(bootstrapManifestAutomation?.safe_maintenance, 5),
      capture_outcome: bootstrapManifestLearning?.capture_outcome === true,
      update_memory: bootstrapManifestLearning?.update_memory === true,
      update_spaces: bootstrapManifestLearning?.update_spaces === true,
      preserve_artifact: bootstrapManifestLearning?.preserve_artifact === true,
      promote_when: providerSafeStringList(bootstrapManifestLearning?.promote_when, 5),
      revalidate_when: providerSafeStringList(bootstrapManifestLearning?.revalidate_when, 5),
      human_boundary: providerSafeStringList(bootstrapManifest?.human_boundary, 5),
      evidence_hashes: providerSafeStringList(bootstrapManifestEvidence?.hashes, 5),
      proven_by: providerSafeStringList(bootstrapManifestEvidence?.proven_by, 5),
      stale_or_guarded: providerSafeStringList(bootstrapManifestEvidence?.stale_or_guarded, 5),
    },
    awis_golden_context: {
      top_load: providerSafeRankedItems(goldenContext?.top_load, 6),
      summary_gold: providerSafeRankedItems(goldenContext?.summary_gold, 6),
      validation_gold: providerSafeRankedItems(goldenContext?.validation_gold, 5),
      avoid_or_confirm: providerSafeRankedItems(goldenContext?.avoid_or_confirm, 5),
      selection_reason: providerSafeString(goldenContext?.selection_reason, 180),
      provider_safe: goldenContext?.provider_safe === true,
    },
    awis_dependency_edges: recommendedDependencyEdges,
    awis_workspace_members: topologyWorkspaceMembers,
    awis_workspace_dependency_edges: topologyWorkspaceDependencyEdges,
    awis_command_intents: recommendedCommandIntents,
    awis_command_lanes: {
      auto_validate: providerSafeStringList(recommendedCommandLanes?.auto_validate, 5),
      confirm_before_run: providerSafeStringList(recommendedCommandLanes?.confirm_before_run, 4),
      manual_only: providerSafeStringList(recommendedCommandLanes?.manual_only, 4),
      preferred_validation: providerSafeStringList(recommendedCommandLanes?.preferred_validation, 4),
      reason: providerSafeString(recommendedCommandLanes?.reason, 160),
    },
    awis_never_start_cold: startupContract?.never_start_cold === true,
    awis_launch_mode: providerSafeString(startupContract?.launch_mode, 32),
    awis_bootstrap_manifest_hash: providerSafeString(startupContract?.bootstrap_manifest_hash, 120),
    awis_startup_context_mode: providerSafeString(startupContract?.context_mode, 32),
    awis_startup_prefer_summary: startupContract?.prefer_summary === true,
    awis_startup_load_sequence: providerSafeStringList(startupContract?.load_sequence, 6),
    awis_startup_revalidate_before_send: providerSafeStringList(startupContract?.revalidate_before_send, 6),
    awis_startup_human_boundary: providerSafeStringList(startupContract?.human_boundary, 4),
    awis_startup_readiness: {
      startup: providerSafePercent(startupReadiness?.startup),
      context_kernel: providerSafePercent(startupReadiness?.context_kernel),
      artifact_replay: providerSafePercent(startupReadiness?.artifact_replay),
      next_session_brain: providerSafePercent(startupReadiness?.next_session_brain),
    },
    awis_continuity_handoff: {
      restore_priority: providerSafeStringList(continuityHandoff?.restore_priority, 6),
      hot_context: providerSafeStringList(continuityHandoff?.hot_context, 6),
      first_load: providerSafeStringList(continuityHandoff?.first_load, 6),
      validate_with: providerSafeStringList(continuityHandoff?.validate_with, 6),
      artifacts: providerSafeStringList(continuityHandoff?.artifacts, 6),
      handoff_units: providerSafeStringList(continuityHandoff?.handoff_units, 5),
      human_boundary: providerSafeStringList(continuityHandoff?.human_boundary, 5),
    },
    awis_space_focus: strongestSpaces
      .map((space) => providerSafeString(space.title, 96))
      .filter((item): item is string => Boolean(item))
      .slice(0, 3),
    awis_space_continuity: providerSafeStringList(objectRecord(spaces?.continuity)?.carry_forward, 4),
    awis_space_learned_memory: learnedSpaces,
    awis_space_brain: spaceBrain
      .map((space) => {
        const title = providerSafeString(space.title, 80)
        const state = providerSafeString(space.state, 24)
        const load = providerSafeStringList(space.load_first, 2)
        const carry = providerSafeStringList(space.carry_forward, 2)
        const validate = providerSafeStringList(space.validate_before_use, 2)
        const automation = providerSafeStringList(space.automation_hooks, 2)
        const human = providerSafeStringList(space.human_boundary, 2)
        const artifacts = providerSafeStringList(space.artifact_refs, 2)
        const evidence = providerSafeStringList(space.evidence, 2)
        if (!title) return null
        return {
          title,
          state: state ?? 'vivo',
          load,
          carry,
          validate,
          automation,
          human,
          artifacts,
          evidence,
          confidence: typeof space.confidence === 'number' ? Math.min(100, Math.max(0, Math.round(space.confidence))) : null,
        }
      })
      .filter((item): item is {
        title: string
        state: string
        load: string[]
        carry: string[]
        validate: string[]
        automation: string[]
        human: string[]
        artifacts: string[]
        evidence: string[]
        confidence: number | null
      } => Boolean(item))
      .slice(0, 2),
    awis_live_memory_hash: providerSafeString(liveMemory?.memory_hash, 120),
    awis_live_load_first: providerSafeStringList(liveStartupPacket?.load_first, 4),
    awis_context_budget: providerSafeString(kernelBudget?.mode, 32),
    awis_priority_load: priorityLoad
      .map((item) => providerSafeString(item.label, 96))
      .filter((item): item is string => Boolean(item))
      .slice(0, 6),
    awis_component_memory: {
      strongest: strongestComponents
        .map((component) => {
          const key = providerSafeString(component.key, 80)
          if (!key) return null
          return {
            key,
            role: providerSafeString(component.role, 96),
            maturity: providerSafeString(component.maturity, 32),
            confidence: providerSafePercent(component.confidence),
            stack: providerSafeStringList(component.stack, 4),
            load_first: providerSafeStringList(component.load_first, 4),
            commands: providerSafeStringList(component.commands, 4),
            docs: providerSafeStringList(component.docs, 4),
            cautions: providerSafeStringList(component.cautions, 3),
          }
        })
        .filter((item): item is {
          key: string
          role: string | null
          maturity: string | null
          confidence: number | null
          stack: string[]
          load_first: string[]
          commands: string[]
          docs: string[]
          cautions: string[]
        } => Boolean(item))
        .slice(0, 4),
      routing_hints: componentRoutingHints
        .map((hint) => {
          const signal = providerSafeString(hint.signal, 80)
          const component = providerSafeString(hint.component, 80)
          if (!signal && !component) return null
          return { signal, component, confidence: providerSafePercent(hint.confidence) }
        })
        .filter((item): item is { signal: string | null; component: string | null; confidence: number | null } => Boolean(item))
        .slice(0, 5),
    },
    awis_semantic_index: {
      readiness_score: providerSafePercent(semanticIndex?.readiness_score),
      aliases: semanticAliases
        .map((alias) => {
          const label = providerSafeString(alias.alias, 80)
          if (!label) return null
          return {
            alias: label,
            intent: providerSafeString(alias.intent, 80),
            component_keys: providerSafeStringList(alias.component_keys, 4),
            task_kinds: providerSafeStringList(alias.task_kinds, 4),
            load: providerSafeStringList(alias.load, 3),
            validate: providerSafeStringList(alias.validate, 3),
            confidence: providerSafePercent(alias.confidence),
          }
        })
        .filter((item): item is {
          alias: string
          intent: string | null
          component_keys: string[]
          task_kinds: string[]
          load: string[]
          validate: string[]
          confidence: number | null
        } => Boolean(item))
        .slice(0, 5),
      stack_map: semanticStackMap
        .map((item) => {
          const stack = providerSafeString(item.stack, 60)
          if (!stack) return null
          return {
            stack,
            component_keys: providerSafeStringList(item.component_keys, 4),
            commands: providerSafeStringList(item.commands, 3),
            docs: providerSafeStringList(item.docs, 3),
          }
        })
        .filter((item): item is { stack: string; component_keys: string[]; commands: string[]; docs: string[] } => Boolean(item))
        .slice(0, 4),
      retrieval_policy: {
        load_full_when: providerSafeStringList(semanticRetrievalPolicy?.load_full_when, 4),
        summarize_when: providerSafeStringList(semanticRetrievalPolicy?.summarize_when, 4),
        revalidate_when: providerSafeStringList(semanticRetrievalPolicy?.revalidate_when, 4),
        never_load_raw: providerSafeStringList(semanticRetrievalPolicy?.never_load_raw, 4),
      },
    },
    awis_task_router: {
      route_count: providerSafeNumber(taskRouter?.route_count),
      routes: taskRoutes
        .map((route) => {
          const routeKey = providerSafeString(route.route_key, 80)
          const taskKind = providerSafeString(route.task_kind, 60)
          if (!routeKey && !taskKind) return null
          return {
            route_key: routeKey,
            task_kind: taskKind,
            policy: providerSafeString(route.policy, 40),
            suggested_surface: providerSafeString(route.suggested_surface, 40),
            load_first: providerSafeStringList(route.load_first, 4),
            use_spaces: providerSafeStringList(route.use_spaces, 3),
            use_components: providerSafeStringList(route.use_components, 4),
            use_artifacts: providerSafeStringList(route.use_artifacts, 3),
            validate_with: providerSafeStringList(route.validate_with, 4),
            avoid_loading: providerSafeStringList(route.avoid_loading, 3),
            confidence: providerSafePercent(route.confidence),
          }
        })
        .filter((item): item is {
          route_key: string | null
          task_kind: string | null
          policy: string | null
          suggested_surface: string | null
          load_first: string[]
          use_spaces: string[]
          use_components: string[]
          use_artifacts: string[]
          validate_with: string[]
          avoid_loading: string[]
          confidence: number | null
        } => Boolean(item))
        .slice(0, 5),
    },
    awis_impact_map: {
      readiness_score: providerSafePercent(impactMap?.readiness_score),
      component_impacts: impactComponents
        .map((impact) => {
          const componentKey = providerSafeString(impact.component_key, 80)
          if (!componentKey) return null
          return {
            component_key: componentKey,
            change_signals: providerSafeStringList(impact.change_signals, 4),
            affected_components: providerSafeStringList(impact.affected_components, 4),
            validation_cascade: providerSafeStringList(impact.validation_cascade, 4),
            risk: providerSafeString(impact.risk, 32),
            reason: providerSafeString(impact.reason, 120),
            confidence: providerSafePercent(impact.confidence),
          }
        })
        .filter((item): item is {
          component_key: string
          change_signals: string[]
          affected_components: string[]
          validation_cascade: string[]
          risk: string | null
          reason: string | null
          confidence: number | null
        } => Boolean(item))
        .slice(0, 4),
      cross_workspace: impactCrossWorkspace
        .map((impact) => {
          const workspaceHint = providerSafeString(impact.workspace_hint, 80)
          if (!workspaceHint) return null
          return {
            workspace_hint: workspaceHint,
            trigger_components: providerSafeStringList(impact.trigger_components, 3),
            reuse: providerSafeStringList(impact.reuse, 3),
            revalidate: providerSafeStringList(impact.revalidate, 3),
            confidence: providerSafePercent(impact.confidence),
          }
        })
        .filter((item): item is {
          workspace_hint: string
          trigger_components: string[]
          reuse: string[]
          revalidate: string[]
          confidence: number | null
        } => Boolean(item))
        .slice(0, 4),
    },
    awis_living_graph: {
      readiness_score: providerSafePercent(livingGraph?.readiness_score),
      golden_path: providerSafeStringList(livingGraph?.golden_path, 6),
      nodes: graphNodes
        .map((node) => {
          const label = providerSafeString(node.label, 96)
          if (!label) return null
          return {
            kind: providerSafeString(node.kind, 40),
            label,
            role: providerSafeString(node.role, 120),
            confidence: providerSafePercent(node.confidence),
            evidence: providerSafeStringList(node.evidence, 3),
          }
        })
        .filter((item): item is { kind: string | null; label: string; role: string | null; confidence: number | null; evidence: string[] } => Boolean(item))
        .slice(0, 6),
      edges: graphEdges
        .map((edge) => {
          const from = providerSafeString(edge.from, 80)
          const to = providerSafeString(edge.to, 80)
          if (!from || !to) return null
          return { from, to, reason: providerSafeString(edge.reason, 120), strength: providerSafePercent(edge.strength) }
        })
        .filter((item): item is { from: string; to: string; reason: string | null; strength: number | null } => Boolean(item))
        .slice(0, 6),
    },
    awis_workspace_mesh: {
      readiness_score: providerSafePercent(workspaceMesh?.readiness_score),
      mesh_hash: providerSafeString(workspaceMesh?.mesh_hash, 120),
      routes: meshRoutes
        .map((route) => {
          const workspaceHint = providerSafeString(route.workspace_hint, 80)
          if (!workspaceHint) return null
          return {
            workspace_hint: workspaceHint,
            relationship: providerSafeString(route.relationship, 60),
            load_when: providerSafeStringList(route.load_when, 3),
            reuse: providerSafeStringList(route.reuse, 3),
            validate_with: providerSafeStringList(route.validate_with, 3),
            never_transfer: providerSafeStringList(route.never_transfer, 3),
            linked_components: providerSafeStringList(route.linked_components, 3),
            linked_spaces: providerSafeStringList(route.linked_spaces, 3),
            confidence: providerSafePercent(route.confidence),
          }
        })
        .filter((item): item is {
          workspace_hint: string
          relationship: string | null
          load_when: string[]
          reuse: string[]
          validate_with: string[]
          never_transfer: string[]
          linked_components: string[]
          linked_spaces: string[]
          confidence: number | null
        } => Boolean(item))
        .slice(0, 4),
      next_conversation: {
        load_order: providerSafeStringList(meshNextConversation?.load_order, 5),
        reuse_rules: providerSafeStringList(meshNextConversation?.reuse_rules, 5),
        validate_with: providerSafeStringList(meshNextConversation?.validate_with, 5),
        human_boundary: providerSafeStringList(meshNextConversation?.human_boundary, 4),
      },
    },
    awis_current_truth_pack: {
      readiness_score: providerSafePercent(currentTruthPack?.readiness_score),
      truth_hash: providerSafeString(currentTruthPack?.truth_hash, 120),
      must_keep: providerSafeStringList(currentTruth?.must_keep, 6),
      active_components: providerSafeStringList(currentTruth?.active_components, 5),
      active_spaces: providerSafeStringList(currentTruth?.active_spaces, 5),
      active_artifacts: providerSafeStringList(currentTruth?.active_artifacts, 5),
      proven_commands: providerSafeStringList(currentTruth?.proven_commands, 5),
      mesh_routes: providerSafeStringList(currentTruth?.mesh_routes, 5),
      doc_rules: providerSafeStringList(currentTruth?.doc_rules, 5),
      evidence_refs: providerSafeStringList(currentTruthProof?.evidence_refs, 5),
      validate_with: providerSafeStringList(currentTruthProof?.validate_with, 5),
      stale_or_unproven: providerSafeStringList(currentTruthProof?.stale_or_unproven, 4),
      load_first: providerSafeStringList(currentTruthNextConversation?.load_first, 5),
      trust_first: providerSafeStringList(currentTruthContract?.trust_first, 5),
      verify_before_send: providerSafeStringList(currentTruthContract?.verify_before_send, 5),
      evidence_mode: providerSafeString(currentTruthContract?.evidence_mode, 32),
    },
    awis_next_session_truth: {
      brain_hash: providerSafeString(nextSessionBrain?.brain_hash, 120),
      evidence_mode: providerSafeString(nextSessionTruthHints?.evidence_mode, 32),
      trust_first: providerSafeStringList(nextSessionTruthHints?.trust_first, 5),
      verify_before_send: providerSafeStringList(nextSessionTruthHints?.verify_before_send, 5),
      never_load_raw: providerSafeStringList(nextSessionTruthHints?.never_load_raw, 5),
      refresh_when: providerSafeStringList(nextSessionTruthHints?.refresh_when, 5),
      current_truth: providerSafeStringList(nextSessionTruthHints?.current_truth, 5),
    },
    awis_repository_constellation: {
      readiness_score: providerSafePercent(repositoryConstellation?.readiness_score),
      constellation_hash: providerSafeString(repositoryConstellation?.constellation_hash, 120),
      repositories: constellationRepositories
        .map((repo) => {
          const key = providerSafeString(repo.key, 80)
          if (!key) return null
          return {
            key,
            role: providerSafeString(repo.role, 96),
            stack: providerSafeStringList(repo.stack, 4),
            maturity: providerSafeString(repo.maturity, 32),
            manifests: providerSafeStringList(repo.manifests, 4),
            docs: providerSafeStringList(repo.docs, 4),
            commands: providerSafeStringList(repo.commands, 4),
            connected_to: providerSafeStringList(repo.connected_to, 4),
            load_when: providerSafeStringList(repo.load_when, 3),
            validate_with: providerSafeStringList(repo.validate_with, 3),
            confidence: providerSafePercent(repo.confidence),
          }
        })
        .filter((item): item is {
          key: string
          role: string | null
          stack: string[]
          maturity: string | null
          manifests: string[]
          docs: string[]
          commands: string[]
          connected_to: string[]
          load_when: string[]
          validate_with: string[]
          confidence: number | null
        } => Boolean(item))
        .slice(0, 5),
      bridges: constellationBridges
        .map((bridge) => {
          const from = providerSafeString(bridge.from, 80)
          const to = providerSafeString(bridge.to, 80)
          if (!from || !to) return null
          return {
            from,
            to,
            reason: providerSafeString(bridge.reason, 120),
            shared_stack: providerSafeStringList(bridge.shared_stack, 4),
            validation_bridge: providerSafeStringList(bridge.validation_bridge, 4),
            context_bridge: providerSafeStringList(bridge.context_bridge, 4),
            confidence: providerSafePercent(bridge.confidence),
          }
        })
        .filter((item): item is {
          from: string
          to: string
          reason: string | null
          shared_stack: string[]
          validation_bridge: string[]
          context_bridge: string[]
          confidence: number | null
        } => Boolean(item))
        .slice(0, 5),
      next_conversation: {
        load_first: providerSafeStringList(constellationNextConversation?.load_first, 5),
        compare_when: providerSafeStringList(constellationNextConversation?.compare_when, 4),
        validate_with: providerSafeStringList(constellationNextConversation?.validate_with, 5),
        preserve_as_artifact: providerSafeStringList(constellationNextConversation?.preserve_as_artifact, 4),
        human_boundary: providerSafeStringList(constellationNextConversation?.human_boundary, 4),
      },
      learning_loop: {
        promote_when: providerSafeStringList(constellationLearningLoop?.promote_when, 4),
        revalidate_when: providerSafeStringList(constellationLearningLoop?.revalidate_when, 4),
        demote_when: providerSafeStringList(constellationLearningLoop?.demote_when, 4),
      },
    },
    awis_startup_gold: providerSafeStringList(startupGold?.strongest_spaces, 4),
    awis_replay_contract: {
      load_first: providerSafeStringList(replayContract?.load_first, 6),
      use_as_summary: providerSafeStringList(replayContract?.use_as_summary, 6),
      validate_before_trust: providerSafeStringList(replayContract?.validate_before_trust, 6),
      archive_after_success: providerSafeStringList(replayContract?.archive_after_success, 5),
      reason: providerSafeString(replayContract?.reason, 180),
    },
    awis_retention: {
      keep_hot: providerSafeStringList(retentionLifecycle?.keep_hot, 5),
      promote: providerSafeStringList(retentionLifecycle?.promote, 5),
      revalidate: providerSafeStringList(retentionLifecycle?.revalidate, 5),
      drop_or_summarize: providerSafeStringList(retentionLifecycle?.drop_or_summarize, 4),
    },
    awis_startup_orchestration: {
      launch_mode: providerSafeString(startupOrchestration?.launch_mode, 32),
      readiness_score: providerSafePercent(startupOrchestration?.readiness_score),
      sequence: arrayRecords(startupOrchestration?.startup_sequence)
        .map((step) => {
          const label = providerSafeString(step.label, 120)
          const source = providerSafeString(step.source, 40)
          if (!label && !source) return null
          return { label, source }
        })
        .filter((item): item is { label: string | null; source: string | null } => Boolean(item))
        .slice(0, 5),
    },
    awis_folder_focus: {
      primary_component: providerSafeString(folderFocus?.primary_component, 80),
      load_scope: providerSafeString(folderFocus?.load_scope, 32),
      include: providerSafeStringList(folderFocus?.include, 5),
      summarize: providerSafeStringList(folderFocus?.summarize, 4),
      avoid: providerSafeStringList(folderFocus?.avoid, 4),
      reason: providerSafeString(folderFocus?.reason, 140),
    },
    awis_task_context_budget: {
      mode: providerSafeString(contextBudget?.mode, 32),
      max_items: typeof contextBudget?.max_items === 'number' ? Math.min(12, Math.max(1, Math.round(contextBudget.max_items))) : null,
      load_full: providerSafeStringList(contextBudget?.load_full, 5),
      summarize: providerSafeStringList(contextBudget?.summarize, 5),
      omit: providerSafeStringList(contextBudget?.omit, 5),
      reason: providerSafeString(contextBudget?.reason, 140),
    },
    awis_evidence_gate: {
      trusted: providerSafeStringList(evidenceGate?.trusted, 6),
      verify_before_trust: providerSafeStringList(evidenceGate?.verify_before_trust, 6),
      missing_or_stale: providerSafeStringList(evidenceGate?.missing_or_stale, 4),
      human_boundary: providerSafeStringList(evidenceGate?.human_boundary, 4),
      reason: providerSafeString(evidenceGate?.reason, 140),
    },
    awis_working_set: {
      files: providerSafeStringList(workingSet?.files, 6),
      docs: providerSafeStringList(workingSet?.docs, 6),
      commands: providerSafeStringList(workingSet?.commands, 6),
      reason: providerSafeString(workingSet?.reason, 140),
    },
    awis_impact_radius: {
      primary_component: providerSafeString(impactRadius?.primary_component, 80),
      affected_components: providerSafeStringList(impactRadius?.affected_components, 6),
      validation_cascade: providerSafeStringList(impactRadius?.validation_cascade, 6),
      cross_workspace: providerSafeStringList(impactRadius?.cross_workspace, 4),
      risk: providerSafeString(impactRadius?.risk, 32),
      reason: providerSafeString(impactRadius?.reason, 140),
    },
    awis_transfer_contract: {
      workspace_hints: providerSafeStringList(transferContract?.workspace_hints, 4),
      reuse: providerSafeStringList(transferContract?.reuse, 5),
      validate_before_use: providerSafeStringList(transferContract?.validate_before_use, 5),
      never_transfer: providerSafeStringList(transferContract?.never_transfer, 4),
      reason: providerSafeString(transferContract?.reason, 140),
    },
    awis_next_session_contract: {
      first_load: providerSafeStringList(taskNextSessionContract?.first_load ?? capsuleNextSessionContract?.first_load, 6),
      validate_with: providerSafeStringList(taskNextSessionContract?.validate_with ?? capsuleNextSessionContract?.validate_with, 6),
      promote_when: providerSafeStringList(taskNextSessionContract?.promote_when ?? capsuleNextSessionContract?.promote_when, 5),
      demote_when: providerSafeStringList(taskNextSessionContract?.demote_when ?? capsuleNextSessionContract?.demote_when, 5),
      preserve_as_artifact: taskNextSessionContract?.preserve_as_artifact === true || continueLearning?.preserve_artifact_after_success === true,
    },
    awis_task_feedback_loop: {
      record: providerSafeStringList(taskFeedbackLoop?.record ?? capsuleTaskFeedbackLoop?.record, 6),
      promote: providerSafeStringList(taskFeedbackLoop?.promote ?? capsuleTaskFeedbackLoop?.promote, 5),
      revalidate: providerSafeStringList(taskFeedbackLoop?.revalidate ?? capsuleTaskFeedbackLoop?.revalidate, 5),
      update_spaces: providerSafeStringList(taskFeedbackLoop?.update_spaces ?? capsuleTaskFeedbackLoop?.update_spaces, 4),
      update_artifacts: providerSafeStringList(taskFeedbackLoop?.update_artifacts ?? capsuleTaskFeedbackLoop?.update_artifacts, 4),
      update_components: providerSafeStringList(taskFeedbackLoop?.update_components ?? capsuleTaskFeedbackLoop?.update_components, 5),
      update_relations: providerSafeStringList(taskFeedbackLoop?.update_relations ?? capsuleTaskFeedbackLoop?.update_relations, 5),
      update_mesh: providerSafeStringList(taskFeedbackLoop?.update_mesh ?? capsuleTaskFeedbackLoop?.update_mesh, 5),
      reason: providerSafeString(taskFeedbackLoop?.reason ?? capsuleTaskFeedbackLoop?.reason, 140),
    },
    awis_continue_learning: {
      record_outcome: continueLearning?.record_outcome === true,
      update_memory: continueLearning?.update_memory === true,
      update_space_pack: continueLearning?.update_space_pack === true,
      preserve_artifact_after_success: continueLearning?.preserve_artifact_after_success === true,
      maintenance_recent: providerSafeStringList(continueLearning?.maintenance_recent, 5),
    },
    awis_automation: {
      mode: providerSafeString(automation?.mode, 32),
      automation_score: providerSafePercent(automation?.automation_score),
      maintenance_queue: automationQueue
        .map((item) => {
          const action = providerSafeString(item.action, 48)
          const label = providerSafeString(item.label, 120)
          const reason = providerSafeString(item.reason, 140)
          if (!action && !label && !reason) return null
          return {
            action,
            label,
            reason,
            priority: providerSafeString(item.priority, 16),
            requires_human_confirmation: item.requires_human_confirmation === true,
          }
        })
        .filter((item): item is {
          action: string | null
          label: string | null
          reason: string | null
          priority: string | null
          requires_human_confirmation: boolean
        } => Boolean(item))
        .slice(0, 5),
      before_send: providerSafeStringList(automationAutopilot?.before_send, 5),
      after_send: providerSafeStringList(automationAutopilot?.after_send, 5),
      on_startup: providerSafeStringList(automationAutopilot?.on_startup, 5),
      metrics_to_watch: providerSafeStringList(automationFeedbackLoop?.metrics_to_watch, 5),
      promote_when: providerSafeStringList(automationFeedbackLoop?.promote_when, 5),
      demote_when: providerSafeStringList(automationFeedbackLoop?.demote_when, 5),
    },
    awis_self_improvement: {
      readiness_score: providerSafePercent(selfImprovement?.readiness_score),
      improvement_queue: selfImprovementQueue
        .map((item) => {
          const action = providerSafeString(item.action, 48)
          const label = providerSafeString(item.label, 120)
          const reason = providerSafeString(item.reason, 140)
          if (!action && !label && !reason) return null
          return {
            action,
            label,
            reason,
            priority: providerSafeString(item.priority, 16),
            evidence: providerSafeStringList(item.evidence, 3),
          }
        })
        .filter((item): item is {
          action: string | null
          label: string | null
          reason: string | null
          priority: string | null
          evidence: string[]
        } => Boolean(item))
        .slice(0, 5),
      promote_when: providerSafeStringList(selfImprovementPolicy?.promote_when, 5),
      demote_when: providerSafeStringList(selfImprovementPolicy?.demote_when, 5),
      transfer_when: providerSafeStringList(selfImprovementPolicy?.transfer_when, 5),
      metrics: providerSafeStringList(selfImprovementReview?.metrics, 5),
      validate_with: providerSafeStringList(selfImprovementReview?.validate_with, 5),
      human_confirmation_required: selfImprovementReview?.human_confirmation_required === true,
    },
    awis_adaptive_learning: {
      readiness_score: providerSafePercent(adaptiveLearning?.readiness_score),
      mode: providerSafeString(adaptiveLearning?.mode, 32),
      on_startup: providerSafeStringList(adaptiveCycle?.on_startup, 5),
      before_send: providerSafeStringList(adaptiveCycle?.before_send, 5),
      after_success: providerSafeStringList(adaptiveCycle?.after_success, 5),
      after_failure: providerSafeStringList(adaptiveCycle?.after_failure, 5),
      on_drift: providerSafeStringList(adaptiveCycle?.on_drift, 5),
      promote_to_hot: providerSafeStringList(adaptiveContextEconomy?.promote_to_hot, 5),
      summarize_only: providerSafeStringList(adaptiveContextEconomy?.summarize_only, 5),
      retire_or_revalidate: providerSafeStringList(adaptiveContextEconomy?.retire_or_revalidate, 5),
      artifact_candidates: providerSafeStringList(adaptiveContextEconomy?.artifact_candidates, 5),
      local_focus: providerSafeStringList(adaptiveRepositoryCompounding?.local_focus, 5),
      cross_repo_bridges: providerSafeStringList(adaptiveRepositoryCompounding?.cross_repo_bridges, 5),
      transfer_rules: providerSafeStringList(adaptiveRepositoryCompounding?.transfer_rules, 5),
      requires_confirmation: providerSafeStringList(adaptiveHumanControl?.requires_confirmation, 5),
      human_owned: providerSafeStringList(adaptiveHumanControl?.human_owned, 5),
      never_automate: providerSafeStringList(adaptiveHumanControl?.never_automate, 5),
      evidence_refs: providerSafeStringList(adaptiveProof?.evidence_refs, 5),
      validate_with: providerSafeStringList(adaptiveProof?.validate_with, 5),
      outcome_metrics: providerSafeStringList(adaptiveProof?.outcome_metrics, 5),
    },
    awis_provider_strategy: {
      provider_count: providerSafeNumber(providerStrategy?.provider_count),
      preferred: arrayRecords(providerStrategy?.preferred)
        .map((item) => {
          const provider = providerSafeString(item.provider, 64)
          if (!provider) return null
          return {
            provider,
            policy: providerSafeString(item.policy, 32),
            task_kinds: providerSafeStringList(item.task_kinds, 4),
            success_rate: providerSafePercent(item.success_rate),
          }
        })
        .filter((item): item is {
          provider: string
          policy: string | null
          task_kinds: string[]
          success_rate: number | null
        } => Boolean(item))
        .slice(0, 4),
      fallback_order: providerSafeStringList(providerStrategy?.fallback_order, 5),
      caution_signals: providerSafeStringList(providerStrategy?.caution_signals, 5),
    },
    awis_execution_doctrine: {
      maturity: providerSafeString(executionDoctrine?.maturity, 32),
      required_before_execution: providerSafeStringList(doctrinePreflight?.required_before_execution, 5),
      human_responsibility: providerSafeStringList(doctrinePreflight?.human_responsibility, 5),
      automation: providerSafeStringList(doctrinePreflight?.automation, 5),
      trusted_commands: providerSafeStringList(doctrineCommandPolicy?.trusted, 5),
      revalidate_commands: providerSafeStringList(doctrineCommandPolicy?.revalidate, 5),
      avoid_commands: providerSafeStringList(doctrineCommandPolicy?.avoid, 5),
    },
    awis_memory_freshness: {
      freshness_score: providerSafePercent(memoryFreshness?.freshness_score),
      state: providerSafeString(memoryFreshness?.state, 32),
      hot: providerSafeStringList(freshnessEvidence?.hot, 5),
      revalidate: providerSafeStringList(freshnessEvidence?.revalidate, 5),
      missing: providerSafeStringList(freshnessEvidence?.missing, 5),
    },
    awis_confidence: {
      confidence_score: providerSafePercent(confidence?.confidence_score),
      prefer: providerSafeStringList(confidencePolicy?.prefer, 5),
      require_confirmation_for: providerSafeStringList(confidencePolicy?.require_confirmation_for, 5),
      avoid_until_revalidated: providerSafeStringList(confidencePolicy?.avoid_until_revalidated, 5),
    },
    awis_learning_flywheel: {
      readiness_score: providerSafePercent(learningFlywheel?.readiness_score),
      compounding_score: providerSafePercent(learningFlywheel?.compounding_score),
      mode: providerSafeString(learningFlywheel?.mode, 32),
      next_safe_automations: providerSafeStringList(flywheelAutomation?.next_safe_automations, 5),
      requires_evidence: providerSafeStringList(flywheelAutomation?.requires_evidence, 5),
      load_first: providerSafeStringList(flywheelNextSession?.load_first, 5),
      validate_with: providerSafeStringList(flywheelNextSession?.validate_with, 5),
      update_after_send: providerSafeStringList(flywheelNextSession?.update_after_send, 5),
      preserve_as_artifact: providerSafeStringList(flywheelNextSession?.preserve_as_artifact, 5),
    },
    awis_launch_contract: {
      readiness_score: providerSafePercent(launchContract?.readiness_score),
      launch_mode: providerSafeString(launchContract?.launch_mode, 32),
      first_load: providerSafeStringList(launchStartup?.first_load, 5),
      validate_before_trust: providerSafeStringList(launchStartup?.validate_before_trust, 5),
      avoid_loading: providerSafeStringList(launchStartup?.avoid_loading, 5),
      before_send: providerSafeStringList(launchAutomation?.before_send, 5),
      after_success: providerSafeStringList(launchAutomation?.after_success, 5),
      after_failure: providerSafeStringList(launchAutomation?.after_failure, 5),
    },
    awis_topology: {
      test_commands: providerSafeStringList(topologyExecutionMap?.test_commands, 5),
      build_commands: providerSafeStringList(topologyExecutionMap?.build_commands, 5),
      check_commands: providerSafeStringList(topologyExecutionMap?.check_commands, 5),
      load_first_docs: providerSafeStringList(topologyKnowledgeMap?.load_first_docs, 5),
      workspace_members: topologyWorkspaceMembers,
      workspace_dependency_edges: topologyWorkspaceDependencyEdges,
      validation_entrypoints: providerSafeStringList(topologyKnowledgeMap?.validation_entrypoints, 5),
      sensitive_zones: providerSafeStringList(topologyKnowledgeMap?.sensitive_zones, 5),
    },
  }
}

function awisPlanConstraintsFromContext(conversationContext?: unknown[]): string[] {
  if (!conversationContext?.length) return []

  let providerCapsule: Record<string, unknown> | null = null
  let contextPack: Record<string, unknown> | null = null
  let taskContext: Record<string, unknown> | null = null

  for (const entry of conversationContext) {
    const item = objectRecord(entry)
    const schema = typeof item?.schema_version === 'string' ? item.schema_version : null
    if (schema === 'atlas.awis.workspace_provider_capsule.v1') providerCapsule = item
    if (schema === 'atlas.awis.workspace_context_pack.v1') contextPack = item
    if (schema === 'atlas.awis.workspace_task_context_projection.v1') taskContext = item
  }

  if (!providerCapsule && !contextPack && !taskContext) return []

  const startupContract = objectRecord(providerCapsule?.startup_contract)
  const goldenContext = objectRecord(providerCapsule?.golden_context)
  const continuityHandoff = objectRecord(providerCapsule?.continuity_handoff)
  const taskPacket = objectRecord(providerCapsule?.task_packet)
  const taskPacketObjective = objectRecord(taskPacket?.objective)
  const taskPacketContext = objectRecord(taskPacket?.context)
  const taskPacketWorkingSet = objectRecord(taskPacketContext?.working_set)
  const taskPacketExecution = objectRecord(taskPacket?.execution)
  const taskPacketCommandLanes = objectRecord(taskPacketExecution?.command_lanes)
  const taskPacketRisk = objectRecord(taskPacket?.risk)
  const taskPacketLearning = objectRecord(taskPacket?.learning)
  const taskPacketAutomationPlan = objectRecord(taskPacketLearning?.automation_plan)
  const recommendedContext = objectRecord(taskContext?.recommended_context)
  const bootstrapPlan =
    objectRecord(providerCapsule?.bootstrap_plan) ??
    objectRecord(taskPacketContext?.bootstrap_plan) ??
    objectRecord(recommendedContext?.bootstrap_plan)
  const bootstrapManifest = objectRecord(contextPack?.bootstrap_manifest)
  const bootstrapManifestContextGold = objectRecord(bootstrapManifest?.context_gold)
  const bootstrapManifestAutomation = objectRecord(bootstrapManifest?.automation_plan)
  const bootstrapManifestLearning = objectRecord(bootstrapManifest?.learning_contract)
  const bootstrapManifestEvidence = objectRecord(bootstrapManifest?.evidence)
  const recommendedDependencyEdges = providerSafeStringList(recommendedContext?.dependency_edges, 4)
  const recommendedCommandIntents = providerSafeStringList(recommendedContext?.command_intents, 4)
  const recommendedCommandLanes =
    objectRecord(recommendedContext?.command_lanes) ??
    objectRecord(providerCapsule?.command_lanes)
  const workingSet = objectRecord(recommendedContext?.working_set)
  const evidenceGate = objectRecord(recommendedContext?.evidence_gate)
  const transferContract = objectRecord(recommendedContext?.transfer_contract)
  const spaces = objectRecord(contextPack?.spaces)
  const startupSnapshot = objectRecord(contextPack?.startup_snapshot)
  const startupGold = objectRecord(startupSnapshot?.startup_gold)
  const memoryConsolidation = objectRecord(contextPack?.memory_consolidation)
  const replayContract = objectRecord(memoryConsolidation?.replay_contract)
  const workspaceRunbook = objectRecord(contextPack?.workspace_runbook)
  const runbookProcedures = arrayRecords(workspaceRunbook?.procedures)
  const runbookFailureResponse = objectRecord(workspaceRunbook?.failure_response)
  const runbookNextSession = objectRecord(workspaceRunbook?.next_session)
  const contextKernel = objectRecord(contextPack?.context_kernel)
  const kernelBudget = objectRecord(contextKernel?.budget)
  const preflight = objectRecord(contextPack?.preflight)
  const workspaceTwin = objectRecord(contextPack?.workspace_twin)
  const workspaceTwinHashes = objectRecord(workspaceTwin?.hashes)
  const retention = objectRecord(contextPack?.retention)
  const retentionLifecycle = objectRecord(retention?.lifecycle)
  const startupOrchestration = objectRecord(contextPack?.startup_orchestration)
  const componentMemory = objectRecord(contextPack?.component_memory)
  const semanticIndex = objectRecord(contextPack?.semantic_index)
  const taskRouter = objectRecord(contextPack?.task_router)
  const livingGraph = objectRecord(contextPack?.living_graph)
  const workspaceMesh = objectRecord(contextPack?.workspace_mesh)
  const meshNextConversation = objectRecord(workspaceMesh?.next_conversation)
  const currentTruthPack = objectRecord(contextPack?.current_truth_pack)
  const currentTruth = objectRecord(currentTruthPack?.current_truth)
  const currentTruthProof = objectRecord(currentTruthPack?.proof)
  const currentTruthContract = objectRecord(currentTruthPack?.trust_contract)
  const currentTruthNextConversation = objectRecord(currentTruthPack?.next_conversation)
  const repositoryConstellation = objectRecord(contextPack?.repository_constellation)
  const constellationNextConversation = objectRecord(repositoryConstellation?.next_conversation)
  const constellationLearningLoop = objectRecord(repositoryConstellation?.learning_loop)
  const impactMap = objectRecord(contextPack?.impact_map)
  const automation = objectRecord(contextPack?.automation)
  const automationAutopilot = objectRecord(automation?.autopilot_context)
  const automationFeedbackLoop = objectRecord(automation?.feedback_loop)
  const selfImprovement = objectRecord(contextPack?.self_improvement)
  const selfImprovementPolicy = objectRecord(selfImprovement?.promotion_policy)
  const selfImprovementReview = objectRecord(selfImprovement?.next_review)
  const adaptiveLearning = objectRecord(contextPack?.adaptive_learning_plan)
  const adaptiveCycle = objectRecord(adaptiveLearning?.autonomous_cycle)
  const adaptiveContextEconomy = objectRecord(adaptiveLearning?.context_economy)
  const adaptiveRepositoryCompounding = objectRecord(adaptiveLearning?.repository_compounding)
  const adaptiveHumanControl = objectRecord(adaptiveLearning?.human_control)
  const adaptiveProof = objectRecord(adaptiveLearning?.proof)
  const providerStrategy = objectRecord(contextPack?.provider_strategy)
  const executionDoctrine = objectRecord(contextPack?.execution_doctrine)
  const doctrinePreflight = objectRecord(executionDoctrine?.preflight)
  const doctrineCommandPolicy = objectRecord(executionDoctrine?.command_policy)
  const memoryFreshness = objectRecord(contextPack?.memory_freshness)
  const freshnessEvidence = objectRecord(memoryFreshness?.evidence)
  const freshnessPromotionGate = objectRecord(memoryFreshness?.promotion_gate)
  const freshnessNextRefresh = objectRecord(memoryFreshness?.next_refresh)
  const confidence = objectRecord(contextPack?.confidence)
  const confidencePolicy = objectRecord(confidence?.decision_policy)
  const learningFlywheel = objectRecord(contextPack?.learning_flywheel)
  const flywheelCycle = objectRecord(learningFlywheel?.cycle)
  const flywheelAutomation = objectRecord(learningFlywheel?.automation)
  const flywheelNextSession = objectRecord(learningFlywheel?.next_session)
  const flywheelRepositoryLoop = objectRecord(learningFlywheel?.repository_loop)
  const flywheelProof = objectRecord(learningFlywheel?.proof)
  const launchContract = objectRecord(contextPack?.launch_contract)
  const launchStartup = objectRecord(launchContract?.startup_contract)
  const launchAutomation = objectRecord(launchContract?.automation_contract)
  const launchHuman = objectRecord(launchContract?.human_contract)
  const launchNextConversation = objectRecord(launchContract?.next_conversation)
  const topology = objectRecord(contextPack?.topology)
  const topologyExecutionMap = objectRecord(topology?.execution_map)
  const topologyKnowledgeMap = objectRecord(topology?.knowledge_map)
  const topologyWorkspaceMembers = providerSafeStringList(topologyKnowledgeMap?.workspace_members, 4)
  const topologyWorkspaceDependencyEdges = providerSafeStringList(topologyKnowledgeMap?.workspace_dependency_edges, 4)
  const continueLearning = objectRecord(providerCapsule?.continue_learning)
  const nextSessionContract = objectRecord(continueLearning?.next_session_contract)
  const taskFeedbackLoop = objectRecord(continueLearning?.task_feedback_loop)
  const recoveryPlaybook = objectRecord(continueLearning?.recovery_playbook)

  const loadFirst = providerSafeStringList(providerCapsule?.load_first, 5)
  const summaryGold = providerSafeStringList(providerCapsule?.use_as_summary, 4)
  const validateWith = providerSafeStringList(providerCapsule?.validate_with, 4)
  const avoidLoading = providerSafeStringList(providerCapsule?.avoid_loading, 3)
  const taskPacketLoadFirst = providerSafeStringList(taskPacketContext?.load_first, 4)
  const taskPacketSummary = providerSafeStringList(taskPacketContext?.use_as_summary, 3)
  const taskPacketFiles = providerSafeStringList(taskPacketWorkingSet?.files, 4)
  const taskPacketCommands = providerSafeStringList(taskPacketWorkingSet?.commands, 3)
  const taskPacketValidation = providerSafeStringList(taskPacketExecution?.validation_commands, 4)
  const taskPacketPreflight = providerSafeStringList(taskPacketExecution?.preflight_gates, 4)
  const taskPacketAutoValidate = providerSafeStringList(taskPacketCommandLanes?.auto_validate, 3)
  const taskPacketHumanBoundary = providerSafeStringList(taskPacketRisk?.human_boundary, 3)
  const taskPacketAvoid = providerSafeStringList(taskPacketRisk?.avoid_loading, 3)
  const taskPacketLearningArchive = providerSafeStringList(taskPacketLearning?.archive_as_artifact, 3)
  const taskPacketAutomationSafe = providerSafeStringList(taskPacketAutomationPlan?.safe_local, 4)
  const taskPacketAutomationConfirm = providerSafeStringList(taskPacketAutomationPlan?.confirm_first, 4)
  const taskPacketAutomationObserve = providerSafeStringList(taskPacketAutomationPlan?.observe_only, 4)
  const bootstrapLoadFirst = providerSafeStringList(bootstrapPlan?.load_first, 4)
  const bootstrapSummarizeFirst = providerSafeStringList(bootstrapPlan?.summarize_first, 3)
  const bootstrapValidate = providerSafeStringList(bootstrapPlan?.validate_before_use, 4)
  const bootstrapNeverRaw = providerSafeStringList(bootstrapPlan?.never_load_raw, 3)
  const bootstrapAutomation = providerSafeStringList(bootstrapPlan?.automation_hooks, 3)
  const bootstrapLearning = providerSafeStringList(bootstrapPlan?.learning_hooks, 3)
  const bootstrapEvidence = providerSafeStringList(bootstrapPlan?.evidence, 3)
  const bootstrapManifestSequence = providerSafeStringList(bootstrapManifest?.golden_boot_sequence, 4)
  const bootstrapManifestLoad = providerSafeStringList(bootstrapManifestContextGold?.load_first, 4)
  const bootstrapManifestValidate = providerSafeStringList(bootstrapManifestContextGold?.validate_before_use, 4)
  const bootstrapManifestNeverRaw = providerSafeStringList(bootstrapManifestContextGold?.never_load_raw, 3)
  const bootstrapManifestBeforeSend = providerSafeStringList(bootstrapManifestAutomation?.before_send, 3)
  const bootstrapManifestAfterSuccess = providerSafeStringList(bootstrapManifestAutomation?.after_success, 3)
  const bootstrapManifestPromote = providerSafeStringList(bootstrapManifestLearning?.promote_when, 3)
  const bootstrapManifestProof = providerSafeStringList(bootstrapManifestEvidence?.proven_by, 3)
  const goldenTopLoad = providerSafeRankedItems(goldenContext?.top_load, 4).map((item) => item.label)
  const goldenSummary = providerSafeRankedItems(goldenContext?.summary_gold, 3).map((item) => item.label)
  const goldenValidation = providerSafeRankedItems(goldenContext?.validation_gold, 3).map((item) => item.label)
  const goldenAvoid = providerSafeRankedItems(goldenContext?.avoid_or_confirm, 3).map((item) => item.label)
  const workingFiles = providerSafeStringList(workingSet?.files, 4)
  const workingCommands = providerSafeStringList(workingSet?.commands, 3)
  const autoValidateCommands = providerSafeStringList(recommendedCommandLanes?.auto_validate, 4)
  const confirmBeforeRunCommands = providerSafeStringList(recommendedCommandLanes?.confirm_before_run, 3)
  const manualOnlyCommands = providerSafeStringList(recommendedCommandLanes?.manual_only, 3)
  const preferredValidationCommands = providerSafeStringList(recommendedCommandLanes?.preferred_validation, 3)
  const evidenceChecks = providerSafeStringList(evidenceGate?.verify_before_trust, 3)
  const coldGold = providerSafeStringList(startupGold?.load_first, 4)
  const replayLoadFirst = providerSafeStringList(replayContract?.load_first, 4)
  const replaySummary = providerSafeStringList(replayContract?.use_as_summary, 4)
  const replayValidate = providerSafeStringList(replayContract?.validate_before_trust, 4)
  const replayArchive = providerSafeStringList(replayContract?.archive_after_success, 3)
  const runbookStartHere = providerSafeStringList(runbookNextSession?.start_here, 4)
  const runbookAutomate = providerSafeStringList(runbookNextSession?.automate_when_safe, 3)
  const runbookHuman = providerSafeStringList(runbookNextSession?.human_owns, 3)
  const runbookLoadFirst = providerSafeStringList(runbookProcedures.flatMap((procedure) => (
    Array.isArray(procedure.load_first) ? procedure.load_first : []
  )), 4)
  const runbookSteps = providerSafeStringList(runbookProcedures.flatMap((procedure) => (
    Array.isArray(procedure.steps) ? procedure.steps : []
  )), 4)
  const runbookValidate = providerSafeStringList(runbookProcedures.flatMap((procedure) => (
    Array.isArray(procedure.validate_with) ? procedure.validate_with : []
  )), 4)
  const runbookAvoid = providerSafeStringList([
    ...runbookProcedures.flatMap((procedure) => (
      Array.isArray(procedure.avoid) ? procedure.avoid : []
    )),
    ...(Array.isArray(runbookFailureResponse?.demote_or_revalidate) ? runbookFailureResponse.demote_or_revalidate : []),
  ], 4)
  const runbookRetry = providerSafeStringList(runbookFailureResponse?.safe_retry, 4)
  const runbookArtifacts = providerSafeStringList(runbookFailureResponse?.preserve_as_artifact, 3)
  const projectedStrongSpaces = arrayRecords(spaces?.strongest_spaces)
  const recommendedSpaceBrain = arrayRecords(recommendedContext?.space_brain)
  const activeSpaces = providerSafeStringList(recommendedContext?.spaces, 4)
  const strongestSpaces = providerSafeStringList([
    ...projectedStrongSpaces.map((space) => space.title),
    ...recommendedSpaceBrain.map((space) => space.title),
  ], 5)
  const spaceLoadFirst = providerSafeStringList(recommendedSpaceBrain.flatMap((space) => (
    Array.isArray(space.load_first) ? space.load_first : []
  )), 5)
  const spaceCarryForward = providerSafeStringList(recommendedSpaceBrain.flatMap((space) => (
    Array.isArray(space.carry_forward) ? space.carry_forward : []
  )), 5)
  const spaceValidate = providerSafeStringList(recommendedSpaceBrain.flatMap((space) => (
    Array.isArray(space.validate_before_use) ? space.validate_before_use : []
  )), 4)
  const spaceArtifacts = providerSafeStringList(recommendedSpaceBrain.flatMap((space) => (
    Array.isArray(space.artifact_refs) ? space.artifact_refs : []
  )), 4)
  const spaceLearnedSignals = providerSafeStringList(projectedStrongSpaces.flatMap((space) => {
    const learned = objectRecord(space.learned_memory)
    return Array.isArray(learned?.signals) ? learned.signals : []
  }), 5)
  const spaceLearnedOutcomes = projectedStrongSpaces
    .map((space) => {
      const title = providerSafeString(space.title, 80)
      const learned = objectRecord(space.learned_memory)
      const status = providerSafeString(learned?.last_outcome_status, 32)
      const successCount = providerSafeNumber(learned?.success_count)
      const failureCount = providerSafeNumber(learned?.failure_count)
      if (!title || (!status && successCount === null && failureCount === null)) return null
      return `${title}:${status ?? 'sem-status'}:${successCount ?? 0} ok/${failureCount ?? 0} falhas`
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, 3)
  const kernelPriorityLoad = arrayRecords(contextKernel?.priority_load)
    .map((item) => providerSafeString(item.label, 96))
    .filter((item): item is string => Boolean(item))
    .slice(0, 4)
  const kernelLoadFull = providerSafeStringList(kernelBudget?.load_full, 4)
  const kernelSummarize = providerSafeStringList(kernelBudget?.summarize, 4)
  const kernelOmit = providerSafeStringList(kernelBudget?.omit, 4)
  const preflightMode = providerSafeString(preflight?.mode, 32)
  const preflightGates = arrayRecords(preflight?.gates)
    .map((gate) => {
      const id = providerSafeString(gate.id, 80)
      const status = providerSafeString(gate.status, 24)
      const reason = providerSafeString(gate.reason, 120)
      return [status, id, reason].filter(Boolean).join(':')
    })
    .filter(Boolean)
    .slice(0, 4)
  const twinStatus = providerSafeString(workspaceTwin?.status, 32)
  const twinHashes = providerSafeStringList([
    workspaceTwinHashes?.genome_hash,
    workspaceTwinHashes?.code_map_hash,
    workspaceTwinHashes?.risk_map_hash,
    workspaceTwinHashes?.command_registry_hash,
  ], 4)
  const retentionKeepHot = providerSafeStringList(retentionLifecycle?.keep_hot, 4)
  const retentionPromote = providerSafeStringList(retentionLifecycle?.promote, 4)
  const retentionRevalidate = providerSafeStringList(retentionLifecycle?.revalidate, 4)
  const retentionDrop = providerSafeStringList(retentionLifecycle?.drop_or_summarize, 3)
  const startupMode = providerSafeString(startupOrchestration?.launch_mode, 32)
  const startupSequence = arrayRecords(startupOrchestration?.startup_sequence)
    .map((step) => providerSafeString(step.label, 120) ?? providerSafeString(step.step, 40))
    .filter((item): item is string => Boolean(item))
    .slice(0, 4)
  const strongestComponents = arrayRecords(componentMemory?.strongest_components)
  const componentLoadFirst = providerSafeStringList(strongestComponents.flatMap((component) => (
    Array.isArray(component.load_first) ? component.load_first : []
  )), 4)
  const componentCommands = providerSafeStringList(strongestComponents.flatMap((component) => (
    Array.isArray(component.commands) ? component.commands : []
  )), 4)
  const componentCautions = providerSafeStringList(strongestComponents.flatMap((component) => (
    Array.isArray(component.cautions) ? component.cautions : []
  )), 4)
  const semanticAliases = arrayRecords(semanticIndex?.query_aliases)
    .map((alias) => providerSafeString(alias.alias, 80))
    .filter((item): item is string => Boolean(item))
    .slice(0, 4)
  const semanticRevalidate = providerSafeStringList(objectRecord(semanticIndex?.retrieval_policy)?.revalidate_when, 4)
  const taskRoutes = arrayRecords(taskRouter?.routes)
    .map((route) => {
      const taskKind = providerSafeString(route.task_kind, 60)
      const routeKey = providerSafeString(route.route_key, 80)
      if (!taskKind && !routeKey) return null
      return [taskKind, routeKey, providerSafeString(route.policy, 32)].filter(Boolean).join(':')
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, 4)
  const livingGoldenPath = providerSafeStringList(livingGraph?.golden_path, 5)
  const meshLoadOrder = providerSafeStringList(meshNextConversation?.load_order, 4)
  const meshReuseRules = providerSafeStringList(meshNextConversation?.reuse_rules, 4)
  const truthKeep = providerSafeStringList(currentTruth?.must_keep, 5)
  const truthTrust = providerSafeStringList(currentTruthContract?.trust_first, 4)
  const truthVerify = providerSafeStringList(currentTruthContract?.verify_before_send, 4)
  const truthLoadFirst = providerSafeStringList(currentTruthNextConversation?.load_first, 4)
  const truthValidate = providerSafeStringList(currentTruthProof?.validate_with, 4)
  const repoLoadFirst = providerSafeStringList(constellationNextConversation?.load_first, 4)
  const repoValidate = providerSafeStringList(constellationNextConversation?.validate_with, 4)
  const repoPromote = providerSafeStringList(constellationLearningLoop?.promote_when, 3)
  const impactValidation = providerSafeStringList(arrayRecords(impactMap?.component_impacts).flatMap((impact) => (
    Array.isArray(impact.validation_cascade) ? impact.validation_cascade : []
  )), 4)
  const automationBeforeSend = providerSafeStringList(automationAutopilot?.before_send, 4)
  const automationAfterSend = providerSafeStringList(automationAutopilot?.after_send, 4)
  const automationStartup = providerSafeStringList(automationAutopilot?.on_startup, 4)
  const automationPromote = providerSafeStringList(automationFeedbackLoop?.promote_when, 3)
  const automationDemote = providerSafeStringList(automationFeedbackLoop?.demote_when, 3)
  const automationQueue = providerSafeStringList(arrayRecords(automation?.maintenance_queue).map((item) => {
    const action = providerSafeString(item.action, 48)
    const label = providerSafeString(item.label, 120)
    if (!action && !label) return null
    return [action, label].filter(Boolean).join(':')
  }), 4)
  const selfImprovementQueue = providerSafeStringList(arrayRecords(selfImprovement?.improvement_queue).map((item) => {
    const action = providerSafeString(item.action, 48)
    const label = providerSafeString(item.label, 120)
    if (!action && !label) return null
    return [action, label].filter(Boolean).join(':')
  }), 4)
  const selfImprovementPromote = providerSafeStringList(selfImprovementPolicy?.promote_when, 3)
  const selfImprovementDemote = providerSafeStringList(selfImprovementPolicy?.demote_when, 3)
  const selfImprovementTransfer = providerSafeStringList(selfImprovementPolicy?.transfer_when, 3)
  const selfImprovementValidate = providerSafeStringList(selfImprovementReview?.validate_with, 3)
  const adaptiveStartup = providerSafeStringList(adaptiveCycle?.on_startup, 4)
  const adaptiveBeforeSend = providerSafeStringList(adaptiveCycle?.before_send, 4)
  const adaptiveAfterSuccess = providerSafeStringList(adaptiveCycle?.after_success, 4)
  const adaptiveAfterFailure = providerSafeStringList(adaptiveCycle?.after_failure, 4)
  const adaptiveDrift = providerSafeStringList(adaptiveCycle?.on_drift, 4)
  const adaptivePromoteHot = providerSafeStringList(adaptiveContextEconomy?.promote_to_hot, 4)
  const adaptiveSummarize = providerSafeStringList(adaptiveContextEconomy?.summarize_only, 4)
  const adaptiveRevalidate = providerSafeStringList(adaptiveContextEconomy?.retire_or_revalidate, 4)
  const adaptiveArtifacts = providerSafeStringList(adaptiveContextEconomy?.artifact_candidates, 4)
  const adaptiveLocalFocus = providerSafeStringList(adaptiveRepositoryCompounding?.local_focus, 4)
  const adaptiveCrossRepo = providerSafeStringList(adaptiveRepositoryCompounding?.cross_repo_bridges, 4)
  const adaptiveTransferRules = providerSafeStringList(adaptiveRepositoryCompounding?.transfer_rules, 4)
  const adaptiveConfirm = providerSafeStringList(adaptiveHumanControl?.requires_confirmation, 4)
  const adaptiveHumanOwned = providerSafeStringList(adaptiveHumanControl?.human_owned, 4)
  const adaptiveNeverAutomate = providerSafeStringList(adaptiveHumanControl?.never_automate, 4)
  const adaptiveEvidence = providerSafeStringList(adaptiveProof?.evidence_refs, 4)
  const adaptiveValidate = providerSafeStringList(adaptiveProof?.validate_with, 4)
  const adaptiveMetrics = providerSafeStringList(adaptiveProof?.outcome_metrics, 4)
  const providerFallback = providerSafeStringList(providerStrategy?.fallback_order, 4)
  const providerCautions = providerSafeStringList(providerStrategy?.caution_signals, 4)
  const providerPreferences = providerSafeStringList(arrayRecords(providerStrategy?.preferred).map((item) => {
    const provider = providerSafeString(item.provider, 64)
    const policy = providerSafeString(item.policy, 32)
    if (!provider) return null
    return [provider, policy].filter(Boolean).join(':')
  }), 4)
  const providerTaskPreferences = providerSafeStringList(arrayRecords(providerStrategy?.task_preferences).map((item) => {
    const task = providerSafeString(item.task_kind, 60)
    const provider = providerSafeString(item.preferred_provider, 64)
    if (!task && !provider) return null
    return [task, provider].filter(Boolean).join(':')
  }), 4)
  const doctrineRequired = providerSafeStringList(doctrinePreflight?.required_before_execution, 4)
  const doctrineHuman = providerSafeStringList(doctrinePreflight?.human_responsibility, 4)
  const doctrineAutomation = providerSafeStringList(doctrinePreflight?.automation, 4)
  const doctrineTrusted = providerSafeStringList(doctrineCommandPolicy?.trusted, 4)
  const doctrineRevalidate = providerSafeStringList(doctrineCommandPolicy?.revalidate, 4)
  const doctrineAvoid = providerSafeStringList(doctrineCommandPolicy?.avoid, 4)
  const freshnessHot = providerSafeStringList(freshnessEvidence?.hot, 4)
  const freshnessRevalidate = providerSafeStringList(freshnessEvidence?.revalidate, 4)
  const freshnessMissing = providerSafeStringList(freshnessEvidence?.missing, 4)
  const freshnessRequired = providerSafeStringList(freshnessPromotionGate?.required_before_promotion, 4)
  const freshnessRefresh = providerSafeStringList(freshnessNextRefresh?.actions, 4)
  const confidencePrefer = providerSafeStringList(confidencePolicy?.prefer, 4)
  const confidenceConfirm = providerSafeStringList(confidencePolicy?.require_confirmation_for, 4)
  const confidenceAvoid = providerSafeStringList(confidencePolicy?.avoid_until_revalidated, 4)
  const flywheelCaptured = providerSafeStringList(flywheelCycle?.captured, 4)
  const flywheelReused = providerSafeStringList(flywheelCycle?.reused, 4)
  const flywheelPromoted = providerSafeStringList(flywheelCycle?.promoted, 4)
  const flywheelGaps = providerSafeStringList(flywheelCycle?.gaps, 4)
  const flywheelSafeAutomation = providerSafeStringList(flywheelAutomation?.next_safe_automations, 4)
  const flywheelEvidence = providerSafeStringList(flywheelAutomation?.requires_evidence, 4)
  const flywheelHumanOwned = providerSafeStringList(flywheelAutomation?.human_owned, 4)
  const flywheelLoadFirst = providerSafeStringList(flywheelNextSession?.load_first, 4)
  const flywheelValidate = providerSafeStringList(flywheelNextSession?.validate_with, 4)
  const flywheelUpdate = providerSafeStringList(flywheelNextSession?.update_after_send, 4)
  const flywheelArtifacts = providerSafeStringList(flywheelNextSession?.preserve_as_artifact, 4)
  const flywheelCrossWorkspace = providerSafeStringList(flywheelRepositoryLoop?.cross_workspace_reuse, 4)
  const flywheelBridgeCandidates = providerSafeStringList(flywheelRepositoryLoop?.bridge_candidates, 4)
  const flywheelNeverPromote = providerSafeStringList(flywheelProof?.never_promote, 4)
  const flywheelRefresh = providerSafeStringList(flywheelProof?.refresh_when, 4)
  const launchFirstLoad = providerSafeStringList(launchStartup?.first_load, 4)
  const launchValidate = providerSafeStringList(launchStartup?.validate_before_trust, 4)
  const launchSummarize = providerSafeStringList(launchStartup?.summarize_only, 4)
  const launchAvoid = providerSafeStringList(launchStartup?.avoid_loading, 4)
  const launchBeforeSend = providerSafeStringList(launchAutomation?.before_send, 4)
  const launchAfterSuccess = providerSafeStringList(launchAutomation?.after_success, 4)
  const launchMaintenance = providerSafeStringList(launchAutomation?.maintenance_actions, 4)
  const launchHumanOwns = providerSafeStringList(launchHuman?.owns, 4)
  const launchConfirmBefore = providerSafeStringList(launchHuman?.confirm_before, 4)
  const launchDoNotDelegate = providerSafeStringList(launchHuman?.do_not_delegate, 4)
  const launchLoadOrder = providerSafeStringList(launchNextConversation?.load_order, 4)
  const topologyTests = providerSafeStringList(topologyExecutionMap?.test_commands, 4)
  const topologyBuilds = providerSafeStringList(topologyExecutionMap?.build_commands, 4)
  const topologyDocs = providerSafeStringList(topologyKnowledgeMap?.load_first_docs, 4)
  const topologyObligations = providerSafeStringList(topologyKnowledgeMap?.doc_obligations, 4)
  const topologyValidation = providerSafeStringList(topologyKnowledgeMap?.validation_entrypoints, 4)
  const topologySensitive = providerSafeStringList(topologyKnowledgeMap?.sensitive_zones, 4)
  const topologySummarize = providerSafeStringList(topologyKnowledgeMap?.summarize_only, 4)
  const learningActions = [
    continueLearning?.record_outcome === true ? 'registrar outcome real' : null,
    continueLearning?.update_memory === true ? 'atualizar memória AWIS' : null,
    continueLearning?.update_space_pack === true ? 'atualizar Space pack' : null,
    continueLearning?.preserve_artifact_after_success === true ? 'preservar artifact após sucesso' : null,
  ].filter((item): item is string => Boolean(item))
  const nextSessionFirstLoad = providerSafeStringList(nextSessionContract?.first_load, 4)
  const nextSessionValidate = providerSafeStringList(nextSessionContract?.validate_with, 3)
  const nextSessionPromote = providerSafeStringList(nextSessionContract?.promote_when, 3)
  const nextSessionDemote = providerSafeStringList(nextSessionContract?.demote_when, 3)
  const feedbackRecord = providerSafeStringList(taskFeedbackLoop?.record, 4)
  const feedbackPromote = providerSafeStringList(taskFeedbackLoop?.promote, 3)
  const feedbackRevalidate = providerSafeStringList(taskFeedbackLoop?.revalidate, 3)
  const feedbackSpaces = providerSafeStringList(taskFeedbackLoop?.update_spaces, 3)
  const feedbackArtifacts = providerSafeStringList(taskFeedbackLoop?.update_artifacts, 3)
  const feedbackComponents = providerSafeStringList(taskFeedbackLoop?.update_components, 3)
  const feedbackRelations = providerSafeStringList(taskFeedbackLoop?.update_relations, 3)
  const feedbackMesh = providerSafeStringList(taskFeedbackLoop?.update_mesh, 3)
  const transferHints = providerSafeStringList(transferContract?.workspace_hints, 3)
  const transferReuse = providerSafeStringList(transferContract?.reuse, 3)
  const transferValidate = providerSafeStringList(transferContract?.validate_before_use, 3)
  const transferNever = providerSafeStringList(transferContract?.never_transfer, 3)
  const maintenanceRecent = providerSafeStringList(continueLearning?.maintenance_recent, 3)
  const recoveryDemote = providerSafeStringList(recoveryPlaybook?.demote_context, 3)
  const recoveryResume = providerSafeStringList(recoveryPlaybook?.safe_resume, 3)
  const handoffRestore = providerSafeStringList(continuityHandoff?.restore_priority, 3)
  const handoffHot = providerSafeStringList(continuityHandoff?.hot_context, 3)
  const handoffLoad = providerSafeStringList(continuityHandoff?.first_load, 3)
  const handoffValidate = providerSafeStringList(continuityHandoff?.validate_with, 3)
  const handoffArtifacts = providerSafeStringList(continuityHandoff?.artifacts, 3)
  const handoffBoundary = providerSafeStringList(continuityHandoff?.human_boundary, 3)

  const constraints = [
    startupContract?.never_start_cold === true
      ? 'AWIS: iniciar quente; carregar contexto do workspace antes de planejar.'
      : null,
    taskPacketObjective?.label
      ? `AWIS pacote da tarefa: ${providerSafeString(taskPacketObjective.label, 120)}`
      : null,
    taskPacketLoadFirst.length ? `AWIS tarefa carregar: ${taskPacketLoadFirst.join(' | ')}` : null,
    taskPacketSummary.length ? `AWIS tarefa resumir: ${taskPacketSummary.join(' | ')}` : null,
    taskPacketFiles.length ? `AWIS tarefa arquivos: ${taskPacketFiles.join(' | ')}` : null,
    taskPacketCommands.length ? `AWIS tarefa comandos: ${taskPacketCommands.join(' | ')}` : null,
    taskPacketValidation.length ? `AWIS tarefa validar: ${taskPacketValidation.join(' | ')}` : null,
    taskPacketPreflight.length ? `AWIS tarefa preflight: ${taskPacketPreflight.join(' | ')}` : null,
    taskPacketAutoValidate.length ? `AWIS tarefa auto-validar: ${taskPacketAutoValidate.join(' | ')}` : null,
    taskPacketHumanBoundary.length ? `AWIS tarefa limite humano: ${taskPacketHumanBoundary.join(' | ')}` : null,
    taskPacketAvoid.length ? `AWIS tarefa evitar: ${taskPacketAvoid.join(' | ')}` : null,
    taskPacketLearningArchive.length ? `AWIS tarefa arquivar aprendizado: ${taskPacketLearningArchive.join(' | ')}` : null,
    taskPacketAutomationSafe.length ? `AWIS tarefa automação segura: ${taskPacketAutomationSafe.join(' | ')}` : null,
    taskPacketAutomationConfirm.length ? `AWIS tarefa confirmar primeiro: ${taskPacketAutomationConfirm.join(' | ')}` : null,
    taskPacketAutomationObserve.length ? `AWIS tarefa apenas observar: ${taskPacketAutomationObserve.join(' | ')}` : null,
    bootstrapPlan?.manifest_hash ? `AWIS bootstrap manifesto: ${providerSafeString(bootstrapPlan.manifest_hash, 120)}` : null,
    bootstrapLoadFirst.length ? `AWIS bootstrap carregar: ${bootstrapLoadFirst.join(' | ')}` : null,
    bootstrapSummarizeFirst.length ? `AWIS bootstrap resumir: ${bootstrapSummarizeFirst.join(' | ')}` : null,
    bootstrapValidate.length ? `AWIS bootstrap validar: ${bootstrapValidate.join(' | ')}` : null,
    bootstrapNeverRaw.length ? `AWIS bootstrap nunca carregar bruto: ${bootstrapNeverRaw.join(' | ')}` : null,
    bootstrapAutomation.length ? `AWIS bootstrap automação: ${bootstrapAutomation.join(' | ')}` : null,
    bootstrapLearning.length ? `AWIS bootstrap aprendizado: ${bootstrapLearning.join(' | ')}` : null,
    bootstrapEvidence.length ? `AWIS bootstrap evidência: ${bootstrapEvidence.join(' | ')}` : null,
    bootstrapManifest?.bootstrap_hash ? `AWIS manifesto vivo: ${providerSafeString(bootstrapManifest.bootstrap_hash, 120)}` : null,
    bootstrapManifestSequence.length ? `AWIS manifesto sequência: ${bootstrapManifestSequence.join(' | ')}` : null,
    bootstrapManifestLoad.length ? `AWIS manifesto carregar: ${bootstrapManifestLoad.join(' | ')}` : null,
    bootstrapManifestValidate.length ? `AWIS manifesto validar: ${bootstrapManifestValidate.join(' | ')}` : null,
    bootstrapManifestNeverRaw.length ? `AWIS manifesto nunca carregar bruto: ${bootstrapManifestNeverRaw.join(' | ')}` : null,
    bootstrapManifestBeforeSend.length ? `AWIS manifesto antes do envio: ${bootstrapManifestBeforeSend.join(' | ')}` : null,
    bootstrapManifestAfterSuccess.length ? `AWIS manifesto após sucesso: ${bootstrapManifestAfterSuccess.join(' | ')}` : null,
    bootstrapManifestPromote.length ? `AWIS manifesto promover: ${bootstrapManifestPromote.join(' | ')}` : null,
    bootstrapManifestProof.length ? `AWIS manifesto provado por: ${bootstrapManifestProof.join(' | ')}` : null,
    loadFirst.length ? `AWIS carregar: ${loadFirst.join(' | ')}` : null,
    goldenTopLoad.length ? `AWIS ouro carregar: ${goldenTopLoad.join(' | ')}` : null,
    summaryGold.length ? `AWIS resumo: ${summaryGold.join(' | ')}` : null,
    goldenSummary.length ? `AWIS ouro resumo: ${goldenSummary.join(' | ')}` : null,
    validateWith.length ? `AWIS validar: ${validateWith.join(' | ')}` : null,
    goldenValidation.length ? `AWIS ouro validar: ${goldenValidation.join(' | ')}` : null,
    avoidLoading.length ? `AWIS evitar: ${avoidLoading.join(' | ')}` : null,
    goldenAvoid.length ? `AWIS ouro evitar/confirmar: ${goldenAvoid.join(' | ')}` : null,
    recommendedDependencyEdges.length ? `AWIS dependências reais: ${recommendedDependencyEdges.join(' | ')}` : null,
    topologyWorkspaceMembers.length ? `AWIS monorepo membros: ${topologyWorkspaceMembers.join(' | ')}` : null,
    topologyWorkspaceDependencyEdges.length ? `AWIS monorepo edges: ${topologyWorkspaceDependencyEdges.join(' | ')}` : null,
    recommendedCommandIntents.length ? `AWIS intenção de comandos: ${recommendedCommandIntents.join(' | ')}` : null,
    autoValidateCommands.length ? `AWIS auto-validar: ${autoValidateCommands.join(' | ')}` : null,
    preferredValidationCommands.length ? `AWIS validação preferida: ${preferredValidationCommands.join(' | ')}` : null,
    confirmBeforeRunCommands.length ? `AWIS confirmar antes de rodar: ${confirmBeforeRunCommands.join(' | ')}` : null,
    manualOnlyCommands.length ? `AWIS manual apenas: ${manualOnlyCommands.join(' | ')}` : null,
    workingFiles.length ? `AWIS arquivos prováveis: ${workingFiles.join(' | ')}` : null,
    workingCommands.length ? `AWIS comandos prováveis: ${workingCommands.join(' | ')}` : null,
    evidenceChecks.length ? `AWIS evidência: ${evidenceChecks.join(' | ')}` : null,
    coldGold.length ? `AWIS ouro inicial: ${coldGold.join(' | ')}` : null,
    replayLoadFirst.length ? `AWIS replay carregar: ${replayLoadFirst.join(' | ')}` : null,
    replaySummary.length ? `AWIS replay resumir: ${replaySummary.join(' | ')}` : null,
    replayValidate.length ? `AWIS replay validar: ${replayValidate.join(' | ')}` : null,
    replayArchive.length ? `AWIS replay arquivar sucesso: ${replayArchive.join(' | ')}` : null,
    runbookStartHere.length ? `AWIS runbook iniciar: ${runbookStartHere.join(' | ')}` : null,
    runbookLoadFirst.length ? `AWIS runbook carregar: ${runbookLoadFirst.join(' | ')}` : null,
    runbookSteps.length ? `AWIS runbook passos: ${runbookSteps.join(' | ')}` : null,
    runbookValidate.length ? `AWIS runbook validar: ${runbookValidate.join(' | ')}` : null,
    runbookAvoid.length ? `AWIS runbook evitar/revalidar: ${runbookAvoid.join(' | ')}` : null,
    runbookRetry.length ? `AWIS runbook recuperar: ${runbookRetry.join(' | ')}` : null,
    runbookArtifacts.length ? `AWIS runbook preservar artifact: ${runbookArtifacts.join(' | ')}` : null,
    runbookAutomate.length ? `AWIS runbook automatizar quando seguro: ${runbookAutomate.join(' | ')}` : null,
    runbookHuman.length ? `AWIS runbook humano controla: ${runbookHuman.join(' | ')}` : null,
    activeSpaces.length ? `AWIS Spaces ativos: ${activeSpaces.join(' | ')}` : null,
    strongestSpaces.length ? `AWIS Space Brain: ${strongestSpaces.join(' | ')}` : null,
    spaceLoadFirst.length ? `AWIS Space carregar: ${spaceLoadFirst.join(' | ')}` : null,
    spaceCarryForward.length ? `AWIS Space continuar: ${spaceCarryForward.join(' | ')}` : null,
    spaceValidate.length ? `AWIS Space validar: ${spaceValidate.join(' | ')}` : null,
    spaceArtifacts.length ? `AWIS Space artifacts: ${spaceArtifacts.join(' | ')}` : null,
    spaceLearnedSignals.length ? `AWIS Space aprendeu: ${spaceLearnedSignals.join(' | ')}` : null,
    spaceLearnedOutcomes.length ? `AWIS Space outcomes: ${spaceLearnedOutcomes.join(' | ')}` : null,
    kernelPriorityLoad.length ? `AWIS kernel carregar primeiro: ${kernelPriorityLoad.join(' | ')}` : null,
    kernelLoadFull.length ? `AWIS kernel completo: ${kernelLoadFull.join(' | ')}` : null,
    kernelSummarize.length ? `AWIS kernel resumir: ${kernelSummarize.join(' | ')}` : null,
    kernelOmit.length ? `AWIS kernel omitir: ${kernelOmit.join(' | ')}` : null,
    preflightMode ? `AWIS pré-voo: ${preflightMode}` : null,
    preflightGates.length ? `AWIS gates: ${preflightGates.join(' | ')}` : null,
    twinStatus ? `AWIS twin: ${twinStatus}` : null,
    twinHashes.length ? `AWIS twin hashes: ${twinHashes.join(' | ')}` : null,
    retentionKeepHot.length ? `AWIS manter quente: ${retentionKeepHot.join(' | ')}` : null,
    retentionPromote.length ? `AWIS reter/promover: ${retentionPromote.join(' | ')}` : null,
    retentionRevalidate.length ? `AWIS reter/revalidar: ${retentionRevalidate.join(' | ')}` : null,
    retentionDrop.length ? `AWIS resumir ou descartar: ${retentionDrop.join(' | ')}` : null,
    startupMode ? `AWIS partida: ${startupMode}` : null,
    startupSequence.length ? `AWIS sequência de partida: ${startupSequence.join(' | ')}` : null,
    componentLoadFirst.length ? `AWIS componentes carregar: ${componentLoadFirst.join(' | ')}` : null,
    componentCommands.length ? `AWIS componentes comandos: ${componentCommands.join(' | ')}` : null,
    componentCautions.length ? `AWIS componentes cautela: ${componentCautions.join(' | ')}` : null,
    semanticAliases.length ? `AWIS índice semântico: ${semanticAliases.join(' | ')}` : null,
    semanticRevalidate.length ? `AWIS semântico revalidar: ${semanticRevalidate.join(' | ')}` : null,
    taskRoutes.length ? `AWIS rotas aprendidas: ${taskRoutes.join(' | ')}` : null,
    livingGoldenPath.length ? `AWIS grafo caminho ouro: ${livingGoldenPath.join(' | ')}` : null,
    meshLoadOrder.length ? `AWIS mesh carregar: ${meshLoadOrder.join(' | ')}` : null,
    meshReuseRules.length ? `AWIS mesh reuso: ${meshReuseRules.join(' | ')}` : null,
    truthKeep.length ? `AWIS verdade manter: ${truthKeep.join(' | ')}` : null,
    truthTrust.length ? `AWIS verdade confiar: ${truthTrust.join(' | ')}` : null,
    truthVerify.length ? `AWIS verdade verificar: ${truthVerify.join(' | ')}` : null,
    truthLoadFirst.length ? `AWIS truth carregar: ${truthLoadFirst.join(' | ')}` : null,
    truthValidate.length ? `AWIS truth validar: ${truthValidate.join(' | ')}` : null,
    repoLoadFirst.length ? `AWIS repositórios carregar: ${repoLoadFirst.join(' | ')}` : null,
    repoValidate.length ? `AWIS repositórios validar: ${repoValidate.join(' | ')}` : null,
    repoPromote.length ? `AWIS repositórios promover: ${repoPromote.join(' | ')}` : null,
    impactValidation.length ? `AWIS impacto validar: ${impactValidation.join(' | ')}` : null,
    automationQueue.length ? `AWIS automação fila: ${automationQueue.join(' | ')}` : null,
    automationStartup.length ? `AWIS automação partida: ${automationStartup.join(' | ')}` : null,
    automationBeforeSend.length ? `AWIS automação antes do envio: ${automationBeforeSend.join(' | ')}` : null,
    automationAfterSend.length ? `AWIS automação depois do envio: ${automationAfterSend.join(' | ')}` : null,
    automationPromote.length ? `AWIS automação promover: ${automationPromote.join(' | ')}` : null,
    automationDemote.length ? `AWIS automação rebaixar: ${automationDemote.join(' | ')}` : null,
    selfImprovementQueue.length ? `AWIS melhoria fila: ${selfImprovementQueue.join(' | ')}` : null,
    selfImprovementPromote.length ? `AWIS melhoria promover: ${selfImprovementPromote.join(' | ')}` : null,
    selfImprovementDemote.length ? `AWIS melhoria rebaixar: ${selfImprovementDemote.join(' | ')}` : null,
    selfImprovementTransfer.length ? `AWIS melhoria transferir: ${selfImprovementTransfer.join(' | ')}` : null,
    selfImprovementValidate.length ? `AWIS melhoria validar: ${selfImprovementValidate.join(' | ')}` : null,
    adaptiveStartup.length ? `AWIS adaptativo partida: ${adaptiveStartup.join(' | ')}` : null,
    adaptiveBeforeSend.length ? `AWIS adaptativo antes do envio: ${adaptiveBeforeSend.join(' | ')}` : null,
    adaptiveAfterSuccess.length ? `AWIS adaptativo após sucesso: ${adaptiveAfterSuccess.join(' | ')}` : null,
    adaptiveAfterFailure.length ? `AWIS adaptativo após falha: ${adaptiveAfterFailure.join(' | ')}` : null,
    adaptiveDrift.length ? `AWIS adaptativo drift: ${adaptiveDrift.join(' | ')}` : null,
    adaptivePromoteHot.length ? `AWIS adaptativo manter quente: ${adaptivePromoteHot.join(' | ')}` : null,
    adaptiveSummarize.length ? `AWIS adaptativo resumir: ${adaptiveSummarize.join(' | ')}` : null,
    adaptiveRevalidate.length ? `AWIS adaptativo revalidar: ${adaptiveRevalidate.join(' | ')}` : null,
    adaptiveArtifacts.length ? `AWIS adaptativo artefatos: ${adaptiveArtifacts.join(' | ')}` : null,
    adaptiveLocalFocus.length ? `AWIS adaptativo foco local: ${adaptiveLocalFocus.join(' | ')}` : null,
    adaptiveCrossRepo.length ? `AWIS adaptativo pontes repo: ${adaptiveCrossRepo.join(' | ')}` : null,
    adaptiveTransferRules.length ? `AWIS adaptativo regras de transferência: ${adaptiveTransferRules.join(' | ')}` : null,
    adaptiveConfirm.length ? `AWIS adaptativo confirmar: ${adaptiveConfirm.join(' | ')}` : null,
    adaptiveHumanOwned.length ? `AWIS adaptativo humano controla: ${adaptiveHumanOwned.join(' | ')}` : null,
    adaptiveNeverAutomate.length ? `AWIS nunca automatizar: ${adaptiveNeverAutomate.join(' | ')}` : null,
    adaptiveEvidence.length ? `AWIS adaptativo evidência: ${adaptiveEvidence.join(' | ')}` : null,
    adaptiveValidate.length ? `AWIS adaptativo validar: ${adaptiveValidate.join(' | ')}` : null,
    adaptiveMetrics.length ? `AWIS adaptativo métricas: ${adaptiveMetrics.join(' | ')}` : null,
    providerPreferences.length ? `AWIS provider preferir: ${providerPreferences.join(' | ')}` : null,
    providerTaskPreferences.length ? `AWIS provider por tarefa: ${providerTaskPreferences.join(' | ')}` : null,
    providerFallback.length ? `AWIS provider fallback: ${providerFallback.join(' | ')}` : null,
    providerCautions.length ? `AWIS provider cautela: ${providerCautions.join(' | ')}` : null,
    doctrineRequired.length ? `AWIS doutrina antes de executar: ${doctrineRequired.join(' | ')}` : null,
    doctrineHuman.length ? `AWIS doutrina humano: ${doctrineHuman.join(' | ')}` : null,
    doctrineAutomation.length ? `AWIS doutrina automação: ${doctrineAutomation.join(' | ')}` : null,
    doctrineTrusted.length ? `AWIS doutrina comandos confiáveis: ${doctrineTrusted.join(' | ')}` : null,
    doctrineRevalidate.length ? `AWIS doutrina revalidar: ${doctrineRevalidate.join(' | ')}` : null,
    doctrineAvoid.length ? `AWIS doutrina evitar: ${doctrineAvoid.join(' | ')}` : null,
    freshnessHot.length ? `AWIS frescor quente: ${freshnessHot.join(' | ')}` : null,
    freshnessRevalidate.length ? `AWIS frescor revalidar: ${freshnessRevalidate.join(' | ')}` : null,
    freshnessMissing.length ? `AWIS frescor faltando: ${freshnessMissing.join(' | ')}` : null,
    freshnessRequired.length ? `AWIS frescor antes de promover: ${freshnessRequired.join(' | ')}` : null,
    freshnessRefresh.length ? `AWIS frescor atualizar: ${freshnessRefresh.join(' | ')}` : null,
    confidencePrefer.length ? `AWIS confiança preferir: ${confidencePrefer.join(' | ')}` : null,
    confidenceConfirm.length ? `AWIS confiança confirmar: ${confidenceConfirm.join(' | ')}` : null,
    confidenceAvoid.length ? `AWIS confiança evitar até revalidar: ${confidenceAvoid.join(' | ')}` : null,
    flywheelCaptured.length ? `AWIS flywheel capturou: ${flywheelCaptured.join(' | ')}` : null,
    flywheelReused.length ? `AWIS flywheel reusou: ${flywheelReused.join(' | ')}` : null,
    flywheelPromoted.length ? `AWIS flywheel promoveu: ${flywheelPromoted.join(' | ')}` : null,
    flywheelGaps.length ? `AWIS flywheel lacunas: ${flywheelGaps.join(' | ')}` : null,
    flywheelSafeAutomation.length ? `AWIS flywheel automações seguras: ${flywheelSafeAutomation.join(' | ')}` : null,
    flywheelEvidence.length ? `AWIS flywheel exige evidência: ${flywheelEvidence.join(' | ')}` : null,
    flywheelHumanOwned.length ? `AWIS flywheel humano controla: ${flywheelHumanOwned.join(' | ')}` : null,
    flywheelLoadFirst.length ? `AWIS flywheel carregar: ${flywheelLoadFirst.join(' | ')}` : null,
    flywheelValidate.length ? `AWIS flywheel validar: ${flywheelValidate.join(' | ')}` : null,
    flywheelUpdate.length ? `AWIS flywheel atualizar após envio: ${flywheelUpdate.join(' | ')}` : null,
    flywheelArtifacts.length ? `AWIS flywheel preservar artefato: ${flywheelArtifacts.join(' | ')}` : null,
    flywheelCrossWorkspace.length ? `AWIS flywheel reuso entre workspaces: ${flywheelCrossWorkspace.join(' | ')}` : null,
    flywheelBridgeCandidates.length ? `AWIS flywheel pontes candidatas: ${flywheelBridgeCandidates.join(' | ')}` : null,
    flywheelNeverPromote.length ? `AWIS flywheel nunca promover: ${flywheelNeverPromote.join(' | ')}` : null,
    flywheelRefresh.length ? `AWIS flywheel atualizar quando: ${flywheelRefresh.join(' | ')}` : null,
    launchFirstLoad.length ? `AWIS contrato de partida carregar: ${launchFirstLoad.join(' | ')}` : null,
    launchValidate.length ? `AWIS contrato de partida validar: ${launchValidate.join(' | ')}` : null,
    launchSummarize.length ? `AWIS contrato de partida resumir: ${launchSummarize.join(' | ')}` : null,
    launchAvoid.length ? `AWIS contrato de partida evitar: ${launchAvoid.join(' | ')}` : null,
    launchBeforeSend.length ? `AWIS contrato antes do envio: ${launchBeforeSend.join(' | ')}` : null,
    launchAfterSuccess.length ? `AWIS contrato após sucesso: ${launchAfterSuccess.join(' | ')}` : null,
    launchMaintenance.length ? `AWIS contrato manutenção: ${launchMaintenance.join(' | ')}` : null,
    launchHumanOwns.length ? `AWIS contrato humano dono: ${launchHumanOwns.join(' | ')}` : null,
    launchConfirmBefore.length ? `AWIS contrato confirmar antes: ${launchConfirmBefore.join(' | ')}` : null,
    launchDoNotDelegate.length ? `AWIS contrato não delegar: ${launchDoNotDelegate.join(' | ')}` : null,
    launchLoadOrder.length ? `AWIS contrato ordem de carga: ${launchLoadOrder.join(' | ')}` : null,
    topologyTests.length ? `AWIS topologia testes: ${topologyTests.join(' | ')}` : null,
    topologyBuilds.length ? `AWIS topologia builds: ${topologyBuilds.join(' | ')}` : null,
    topologyDocs.length ? `AWIS topologia docs: ${topologyDocs.join(' | ')}` : null,
    topologyObligations.length ? `AWIS topologia obrigações: ${topologyObligations.join(' | ')}` : null,
    topologyValidation.length ? `AWIS topologia validação: ${topologyValidation.join(' | ')}` : null,
    topologySensitive.length ? `AWIS topologia áreas sensíveis: ${topologySensitive.join(' | ')}` : null,
    topologySummarize.length ? `AWIS topologia resumir: ${topologySummarize.join(' | ')}` : null,
    learningActions.length ? `AWIS aprender depois: ${learningActions.join(' | ')}` : null,
    maintenanceRecent.length ? `AWIS manutenção recente: ${maintenanceRecent.join(' | ')}` : null,
    nextSessionFirstLoad.length ? `AWIS próxima sessão carregar: ${nextSessionFirstLoad.join(' | ')}` : null,
    nextSessionValidate.length ? `AWIS próxima sessão validar: ${nextSessionValidate.join(' | ')}` : null,
    nextSessionPromote.length ? `AWIS promover se: ${nextSessionPromote.join(' | ')}` : null,
    nextSessionDemote.length ? `AWIS rebaixar se: ${nextSessionDemote.join(' | ')}` : null,
    feedbackRecord.length ? `AWIS feedback registrar: ${feedbackRecord.join(' | ')}` : null,
    feedbackPromote.length ? `AWIS feedback promover: ${feedbackPromote.join(' | ')}` : null,
    feedbackRevalidate.length ? `AWIS feedback revalidar: ${feedbackRevalidate.join(' | ')}` : null,
    feedbackSpaces.length ? `AWIS feedback Spaces: ${feedbackSpaces.join(' | ')}` : null,
    feedbackArtifacts.length ? `AWIS feedback artefatos: ${feedbackArtifacts.join(' | ')}` : null,
    feedbackComponents.length ? `AWIS feedback componentes: ${feedbackComponents.join(' | ')}` : null,
    feedbackRelations.length ? `AWIS feedback relações: ${feedbackRelations.join(' | ')}` : null,
    feedbackMesh.length ? `AWIS feedback mesh: ${feedbackMesh.join(' | ')}` : null,
    transferHints.length ? `AWIS workspaces relacionados: ${transferHints.join(' | ')}` : null,
    transferReuse.length ? `AWIS transferir só abstrações: ${transferReuse.join(' | ')}` : null,
    transferValidate.length ? `AWIS revalidar transferência: ${transferValidate.join(' | ')}` : null,
    transferNever.length ? `AWIS nunca transferir: ${transferNever.join(' | ')}` : null,
    handoffRestore.length ? `AWIS retomar primeiro: ${handoffRestore.join(' | ')}` : null,
    handoffHot.length ? `AWIS contexto quente: ${handoffHot.join(' | ')}` : null,
    handoffLoad.length ? `AWIS handoff carregar: ${handoffLoad.join(' | ')}` : null,
    handoffValidate.length ? `AWIS handoff validar: ${handoffValidate.join(' | ')}` : null,
    handoffArtifacts.length ? `AWIS artifacts ativos: ${handoffArtifacts.join(' | ')}` : null,
    handoffBoundary.length ? `AWIS limites humanos: ${handoffBoundary.join(' | ')}` : null,
    recoveryDemote.length ? `AWIS recuperação rebaixar: ${recoveryDemote.join(' | ')}` : null,
    recoveryResume.length ? `AWIS retomada segura: ${recoveryResume.join(' | ')}` : null,
  ]

  return Array.from(new Set(
    constraints
      .filter((item): item is string => Boolean(item))
      .map((item) => item.slice(0, 512)),
  )).slice(0, 120)
}

export function useAtlasAi(
  initialWorkspaceSlug: string | null = null,
  initialWorkspacePath: string | null = null,
): AtlasAiState {
  const mountedRef = useRef(true)
  const mode = atlasAiBridgeMode()
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(initialWorkspaceSlug)
  const [workspacePath, setWorkspacePath] = useState<string | null>(initialWorkspacePath)
  const previousWorkspaceSlugRef = useRef<string | null>(initialWorkspaceSlug)
  const [modeFilter, setModeFilter] = useState<AtlasAiMode | 'all'>('all')

  const [threads, setThreads] = useState<AiThreadSummary[]>(() => readThreadListCache())
  const [threadsLoading, setThreadsLoading] = useState<boolean>(() => mode !== 'offline' && readThreadListCache().length === 0)
  const [threadsError, setThreadsError] = useState<string | null>(null)
  const threadsRetryCountRef = useRef<number>(0)
  const [conversationFusion, setConversationFusion] = useState<AtlasWorkspaceConversationFusion | null>(null)
  const [conversationFusionLoading, setConversationFusionLoading] = useState<boolean>(false)
  const [conversationFusionError, setConversationFusionError] = useState<string | null>(null)
  const [conversationFusionArtifact, setConversationFusionArtifact] = useState<AtlasWorkspaceArtifactLakeEntry | null>(null)
  const [conversationFusionArtifactLoading, setConversationFusionArtifactLoading] = useState<boolean>(false)
  const [conversationFusionArtifactError, setConversationFusionArtifactError] = useState<string | null>(null)

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const selectedThreadIdRef = useRef<string | null>(null)
  const threadDetailRequestSeqRef = useRef<number>(0)
  const threadDetailCacheRef = useRef<Map<string, AiThreadDetail>>(readThreadDetailCache())
  const threadDetailInflightRef = useRef<Map<string, Promise<AiThreadDetail>>>(new Map())
  const threadDetailAbortRef = useRef<AbortController | null>(null)
  const threadDetailLoadTimerRef = useRef<number | null>(null)
  const detailCachePersistTimerRef = useRef<number | null>(null)
  const [threadDetail, setThreadDetail] = useState<AiThreadDetail | null>(null)
  const [threadDetailLoading, setThreadDetailLoading] = useState<boolean>(false)
  const [threadDetailError, setThreadDetailError] = useState<string | null>(null)
  const [threadOlderMessagesLoading, setThreadOlderMessagesLoading] = useState<boolean>(false)
  const [threadHasOlderMessages, setThreadHasOlderMessages] = useState<boolean>(false)
  const [threadOlderMessagesError, setThreadOlderMessagesError] = useState<string | null>(null)

  // Default Hyperflow-first: o Desktop NÃO afirma "programming". `auto` =
  // backend Router Runtime decide domínio/flow pelo contexto. O operador pode
  // overrides explicitamente quando souber o domínio.
  const [composerMode, setComposerModeRaw] = useState<AtlasAiMode>('auto')
  const [composerTask, setComposerTaskRaw] = useState<AtlasAiTask>('auto')
  const [composerProvider, setComposerProvider] = useState<AtlasAiProviderChoice>('auto')
  const [composerComputeEffort, setComposerComputeEffort] = useState<AtlasComputeEffortChoice>('auto')
  const [routerBootstrap, setRouterBootstrap] = useState<AtlasAiRouterBootstrap | null>(null)
  const [routerReadiness, setRouterReadiness] = useState<AtlasAiRouterReadiness | null>(null)

  const [pendingTrace, setPendingTrace] = useState<AiTrace | null>(null)
  const [lastTerminalTrace, setLastTerminalTrace] = useState<AiTrace | null>(null)
  const [pendingUserMessage, setPendingUserMessage] = useState<{
    threadId: string | null
    text: string
    attachmentCount: number
    startedAt: number
  } | null>(null)
  const [streamingText, setStreamingText] = useState<string>('')
  const [sending, setSending] = useState<boolean>(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendErrorThreadId, setSendErrorThreadId] = useState<string | null>(null)

  /* Atlas Dev plan-only state */
  const [atlasDevPlanLoading, setAtlasDevPlanLoading] = useState<boolean>(false)
  const [atlasDevPlanError, setAtlasDevPlanError] = useState<string | null>(null)
  const [atlasDevPlanUnavailable, setAtlasDevPlanUnavailable] = useState<boolean>(false)
  const [currentAtlasDevPlan, setCurrentAtlasDevPlan] = useState<AtlasDevPlanResult | null>(null)
  const [atlasDevPlansByRun, setAtlasDevPlansByRun] = useState<Record<string, AtlasDevPlanResult>>({})
  const pollTimerRef = useRef<number | null>(null)
  const streamUnsubRef = useRef<(() => void) | null>(null)

  const setComposerMode = useCallback((next: AtlasAiMode) => {
    setComposerModeRaw(next)
    setComposerTaskRaw((curr) => (isTaskAllowedForMode(curr, next) ? curr : defaultTaskForMode(next)))
  }, [])

  const setComposerTask = useCallback((next: AtlasAiTask) => {
    setComposerTaskRaw(next)
  }, [])

  const persistThreadDetailCacheSoon = useCallback(() => {
    if (typeof window === 'undefined') {
      writeThreadDetailCache(threadDetailCacheRef.current)
      return
    }
    if (detailCachePersistTimerRef.current !== null) {
      window.clearTimeout(detailCachePersistTimerRef.current)
    }
    detailCachePersistTimerRef.current = window.setTimeout(() => {
      detailCachePersistTimerRef.current = null
      writeThreadDetailCache(threadDetailCacheRef.current)
    }, CACHE_PERSIST_DEBOUNCE_MS)
  }, [])

  const getLeanThreadDetail = useCallback((id: string, signal?: AbortSignal): Promise<AiThreadDetail> => {
    if (signal) {
      return getAiThread(id, { lean: true, messageLimit: INITIAL_THREAD_MESSAGE_LIMIT, signal })
    }
    const inflight = threadDetailInflightRef.current.get(id)
    if (inflight) return inflight
    const request = getAiThread(id, { lean: true, messageLimit: INITIAL_THREAD_MESSAGE_LIMIT })
      .finally(() => {
        threadDetailInflightRef.current.delete(id)
      })
    threadDetailInflightRef.current.set(id, request)
    return request
  }, [])

  const refreshThreads = useCallback(async (options: { limit?: number; background?: boolean } = {}) => {
    if (mode === 'offline') {
      if (mountedRef.current) {
        setThreads([])
        setThreadsLoading(false)
      }
      return
    }
    const limit = options.limit ?? THREAD_LIST_FULL_LIMIT
    try {
      const list = await listAiThreads({
        status: 'active',
        light: true,
        limit,
      })
      if (!mountedRef.current) return
      setThreads(list)
      writeThreadListCache(list)
      setThreadsError(null)
      threadsRetryCountRef.current = 0
    } catch (e) {
      if (!mountedRef.current) return
      setThreadsError(e instanceof Error ? e.message : String(e))
    } finally {
      if (mountedRef.current) setThreadsLoading(false)
    }
  }, [mode])

  const refreshConversationFusion = useCallback(async (threadIds?: string[], opts: { persist?: boolean } = {}) => {
    if (mode === 'offline' || !workspaceSlug) {
      if (mountedRef.current) {
        setConversationFusion(null)
        setConversationFusionLoading(false)
        setConversationFusionArtifact(null)
        setConversationFusionArtifactLoading(false)
      }
      return null
    }
    setConversationFusionLoading(true)
    try {
      const fusion = await getWorkspaceConversationFusion(workspaceSlug, {
        limit: threadIds?.length ? threadIds.length : 12,
        threadIds,
        persist: opts.persist === true,
      })
      if (!mountedRef.current) return null
      setConversationFusion(fusion)
      setConversationFusionError(null)
      const artifactRef = opts.persist === true
        ? fusion.persisted_artifact?.artifact_id ?? fusion.persisted_artifact?.artifact_hash ?? null
        : null
      if (artifactRef) {
        setConversationFusionArtifactLoading(true)
        try {
          const payload = await getWorkspaceArtifactLakeEntry(workspaceSlug, artifactRef)
          if (!mountedRef.current) return fusion
          setConversationFusionArtifact(payload)
          setConversationFusionArtifactError(null)
        } catch (e) {
          if (!mountedRef.current) return fusion
          setConversationFusionArtifact(null)
          setConversationFusionArtifactError(e instanceof Error ? e.message : String(e))
        } finally {
          if (mountedRef.current) setConversationFusionArtifactLoading(false)
        }
      }
      return fusion
    } catch (e) {
      if (!mountedRef.current) return null
      setConversationFusion(null)
      setConversationFusionError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      if (mountedRef.current) setConversationFusionLoading(false)
    }
  }, [mode, workspaceSlug])

  const inspectConversationFusionArtifact = useCallback(async (artifact?: string | null) => {
    const artifactRef = artifact
      ?? conversationFusion?.persisted_artifact?.artifact_id
      ?? conversationFusion?.persisted_artifact?.artifact_hash
      ?? null
    if (mode === 'offline' || !workspaceSlug || !artifactRef) {
      if (mountedRef.current) {
        setConversationFusionArtifact(null)
        setConversationFusionArtifactLoading(false)
      }
      return
    }
    setConversationFusionArtifactLoading(true)
    try {
      const payload = await getWorkspaceArtifactLakeEntry(workspaceSlug, artifactRef)
      if (!mountedRef.current) return
      setConversationFusionArtifact(payload)
      setConversationFusionArtifactError(null)
    } catch (e) {
      if (!mountedRef.current) return
      setConversationFusionArtifact(null)
      setConversationFusionArtifactError(e instanceof Error ? e.message : String(e))
    } finally {
      if (mountedRef.current) setConversationFusionArtifactLoading(false)
    }
  }, [conversationFusion, mode, workspaceSlug])

  const loadThreadDetail = useCallback(
    async (id: string, options: { background?: boolean } = {}) => {
      if (mode === 'offline') return
      const requestSeq = ++threadDetailRequestSeqRef.current
      threadDetailAbortRef.current?.abort()
      const abortController = new AbortController()
      threadDetailAbortRef.current = abortController
      if (!options.background) {
        setThreadDetailLoading(true)
      }
      try {
        const detail = await getLeanThreadDetail(id, abortController.signal)
        if (!mountedRef.current) return
        rememberThreadDetail(threadDetailCacheRef.current, id, detail, persistThreadDetailCacheSoon)
        if (selectedThreadIdRef.current !== id || threadDetailRequestSeqRef.current !== requestSeq) return
        setThreadDetail(detail)
        setThreadDetailError(null)
        setThreadOlderMessagesError(null)
        setThreadHasOlderMessages((detail.message_count ?? 0) > (detail.messages?.length ?? 0))
      } catch (e) {
        if (!mountedRef.current) return
        if (isAbortError(e)) return
        if (selectedThreadIdRef.current !== id || threadDetailRequestSeqRef.current !== requestSeq) return
        setThreadDetail(null)
        setThreadDetailError(e instanceof Error ? e.message : String(e))
        setThreadHasOlderMessages(false)
      } finally {
        if (
          mountedRef.current &&
          selectedThreadIdRef.current === id &&
          threadDetailRequestSeqRef.current === requestSeq
        ) {
          setThreadDetailLoading(false)
        }
        if (threadDetailAbortRef.current === abortController) {
          threadDetailAbortRef.current = null
        }
      }
    },
    [getLeanThreadDetail, mode, persistThreadDetailCacheSoon],
  )

  const prefetchThread = useCallback((id: string) => {
    if (mode === 'offline' || !id || threadDetailCacheRef.current.has(id)) return
    void getLeanThreadDetail(id)
      .then((detail) => {
        if (!mountedRef.current) return
        rememberThreadDetail(threadDetailCacheRef.current, id, detail, persistThreadDetailCacheSoon)
      })
      .catch(() => {
        /* Prefetch is speculative: never disturb visible UI. */
      })
  }, [getLeanThreadDetail, mode, persistThreadDetailCacheSoon])

  const selectThread = useCallback(
    (id: string | null) => {
      if (threadDetailLoadTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(threadDetailLoadTimerRef.current)
        threadDetailLoadTimerRef.current = null
      }
      selectedThreadIdRef.current = id
      setSelectedThreadId(id)
      const cached = id ? threadDetailCacheRef.current.get(id) ?? null : null
      const summary = id ? threads.find((thread) => thread.id === id) ?? null : null
      const provisional = summary ? provisionalThreadDetailFromSummary(summary) : null
      const nextDetail = cached ?? provisional
      setThreadDetail(nextDetail)
      setThreadDetailLoading(id !== null && cached === null)
      setThreadDetailError(null)
      setThreadOlderMessagesError(null)
      setThreadOlderMessagesLoading(false)
      setThreadHasOlderMessages(nextDetail ? (nextDetail.message_count ?? 0) > (nextDetail.messages?.length ?? 0) : false)
      setCurrentAtlasDevPlan(null)
      setAtlasDevPlanError(null)
      if (id) {
        if (typeof window === 'undefined') {
          void loadThreadDetail(id, { background: cached !== null })
        } else {
          threadDetailLoadTimerRef.current = window.setTimeout(() => {
            threadDetailLoadTimerRef.current = null
            if (selectedThreadIdRef.current !== id) return
            void loadThreadDetail(id, { background: cached !== null })
          }, THREAD_DETAIL_SELECT_LOAD_DELAY_MS)
        }
      } else {
        threadDetailRequestSeqRef.current += 1
        if (threadDetailLoadTimerRef.current !== null && typeof window !== 'undefined') {
          window.clearTimeout(threadDetailLoadTimerRef.current)
          threadDetailLoadTimerRef.current = null
        }
        threadDetailAbortRef.current?.abort()
        threadDetailAbortRef.current = null
        setThreadDetailLoading(false)
        setThreadHasOlderMessages(false)
      }
    },
    [loadThreadDetail, threads],
  )

  const loadOlderThreadMessages = useCallback(async () => {
    const id = selectedThreadIdRef.current
    const current = threadDetailCacheRef.current.get(id ?? '') ?? threadDetail
    if (mode === 'offline' || !id || !current || threadOlderMessagesLoading || !threadHasOlderMessages) return
    const oldestPosition = (current.messages ?? []).reduce<number | null>((oldest, message) => {
      if (typeof message.position !== 'number') return oldest
      return oldest === null ? message.position : Math.min(oldest, message.position)
    }, null)
    if (oldestPosition === null) return

    setThreadOlderMessagesLoading(true)
    setThreadOlderMessagesError(null)
    try {
      const page = await getAiThreadMessages(id, {
        beforePosition: oldestPosition,
        limit: OLDER_THREAD_MESSAGE_PAGE_LIMIT,
      })
      if (!mountedRef.current || selectedThreadIdRef.current !== id) return
      const latest = threadDetailCacheRef.current.get(id) ?? current
      const merged: AiThreadDetail = {
        ...latest,
        messages: mergeThreadMessages(latest.messages ?? [], page.messages),
      }
      rememberThreadDetail(threadDetailCacheRef.current, id, merged, persistThreadDetailCacheSoon)
      setThreadDetail(merged)
      setThreadHasOlderMessages(page.pagination.has_more_before)
    } catch (e) {
      if (!mountedRef.current || selectedThreadIdRef.current !== id) return
      setThreadOlderMessagesError(e instanceof Error ? e.message : String(e))
    } finally {
      if (mountedRef.current && selectedThreadIdRef.current === id) {
        setThreadOlderMessagesLoading(false)
      }
    }
  }, [mode, persistThreadDetailCacheSoon, threadDetail, threadHasOlderMessages, threadOlderMessagesLoading])

  useEffect(() => {
    if (previousWorkspaceSlugRef.current === workspaceSlug) return
    previousWorkspaceSlugRef.current = workspaceSlug
    /*
     * Workspace changes are no longer equivalent to "close the active
     * conversation". Atlas AI can show and open threads from multiple projects
     * in the same rail; selecting a cross-project thread updates the effective
     * workspace in the surface. Clearing selectedThreadId here caused the exact
     * regression where only the latest/current-project conversation could be
     * opened.
     */
    setCurrentAtlasDevPlan(null)
    setAtlasDevPlanError(null)
    setConversationFusion(null)
    setConversationFusionError(null)
    setConversationFusionArtifact(null)
    setConversationFusionArtifactError(null)
  }, [workspaceSlug])

  // Stream subscription · token-by-token render via SSE.
  // Acumula content de eventos delta/text/content_block_delta no buffer.
  const subscribeStream = useCallback(
    (traceId: string) => {
      // Cleanup anterior se houver
      if (streamUnsubRef.current) {
        streamUnsubRef.current()
        streamUnsubRef.current = null
      }
      setStreamingText('')
      let buffer = ''
      const unsub = bridge.streamSession(traceId, (event) => {
        if (!mountedRef.current) return
        const type = (event.eventType || '').toLowerCase()
        // Termina o streaming · server emitiu "done"
        if (type === 'done' || type === 'completed' || type === 'closed') {
          if (streamUnsubRef.current) {
            streamUnsubRef.current()
            streamUnsubRef.current = null
          }
          return
        }
        // Extrai content textual de tipos delta canônicos
        const raw = event.content
        if (typeof raw === 'string' && raw.length > 0) {
          // Heurística: types `delta`, `text_delta`, `content_block_delta`,
          // `chunk`, `token`, `text` carregam fragmentos de texto.
          if (
            type === 'delta' ||
            type === 'text' ||
            type === 'token' ||
            type === 'chunk' ||
            type.includes('delta') ||
            type === 'message'
          ) {
            buffer += raw
            setStreamingText(buffer)
          }
        } else if (raw && typeof raw === 'object') {
          // Provider patterns: { text: "..." } | { delta: { text: "..." } }
          const obj = raw as Record<string, unknown>
          const text = (obj.text ?? (obj.delta as Record<string, unknown> | undefined)?.text)
          if (typeof text === 'string' && text.length > 0) {
            buffer += text
            setStreamingText(buffer)
          }
        }
      })
      streamUnsubRef.current = unsub
    },
    [],
  )

  const pollTrace = useCallback(
    (traceId: string, threadId: string | null) => {
      savePendingTraceResume({ traceId, threadId, workspaceSlug })
      const startedAt = Date.now()
      const stop = () => {
        if (pollTimerRef.current !== null) {
          window.clearTimeout(pollTimerRef.current)
          pollTimerRef.current = null
        }
      }
      let consecutiveErrors = 0
      const tick = async () => {
        if (!mountedRef.current) return
        try {
          const trace = await getAiTrace(traceId)
          if (!mountedRef.current) return
          consecutiveErrors = 0
          setPendingTrace(trace)
          // Backend usa `succeeded` (per migration enum); aceitamos também
          // `completed` defensivamente. Sem isso o polling nunca atinge
          // terminal e o "enviando agora…" fica eterno.
          const terminal =
            trace.status === 'succeeded' ||
            trace.status === 'completed' ||
            trace.status === 'failed' ||
            trace.status === 'rejected' ||
            trace.status === 'cancelled'
          if (terminal) {
            stop()
            clearPendingTraceResume(traceId)
            setLastTerminalTrace(trace)
            setPendingTrace(null)
            setPendingUserMessage(null)
            if (trace.status === 'failed' || trace.status === 'rejected' || trace.status === 'cancelled') {
              setSendError(traceFailureMessage(trace))
              setSendErrorThreadId(threadId)
            } else {
              setSendError(null)
              setSendErrorThreadId(null)
            }
            // Cleanup SSE stream subscription quando trace finaliza.
            if (streamUnsubRef.current) {
              streamUnsubRef.current()
              streamUnsubRef.current = null
            }
            // Streaming text fica até loadThreadDetail trazer a msg final
            // — depois é limpo pelo selectThread/loadThreadDetail success.
            setStreamingText('')
            if (threadId && selectedThreadIdRef.current === threadId) {
              void loadThreadDetail(threadId)
            }
            void refreshThreads()
            return
          }
        } catch (e) {
          if (!mountedRef.current) return
          consecutiveErrors += 1
          setSendError(e instanceof Error ? e.message : String(e))
          setSendErrorThreadId(threadId)
          // 5 erros consecutivos = backend morto / network. Para o loop
          // e libera o optimistic pra usuário poder tentar de novo.
          if (consecutiveErrors >= 5) {
            stop()
            clearPendingTraceResume(traceId)
            setPendingTrace(null)
            setPendingUserMessage(null)
            setStreamingText('')
            if (streamUnsubRef.current) {
              streamUnsubRef.current()
              streamUnsubRef.current = null
            }
            setSendError('Serviço local não confirmou a resposta. Tente de novo ou reinicie o Atlas local.')
            setSendErrorThreadId(threadId)
            return
          }
        }
        if (Date.now() - startedAt > TRACE_POLL_TIMEOUT_MS) {
          stop()
          clearPendingTraceResume(traceId)
          // CRÍTICO: limpar optimistic + reportar timeout claro pro usuário.
          // Sem isso a bolha "enviando agora…" fica eterna.
          setPendingTrace(null)
          setPendingUserMessage(null)
          setStreamingText('')
          if (streamUnsubRef.current) {
            streamUnsubRef.current()
            streamUnsubRef.current = null
          }
          setSendError(`Atlas não respondeu em ${Math.round(TRACE_POLL_TIMEOUT_MS / 1000)}s. Tente de novo em instantes.`)
          setSendErrorThreadId(threadId)
          return
        }
        pollTimerRef.current = window.setTimeout(tick, TRACE_POLL_INTERVAL_MS)
      }
      stop()
      pollTimerRef.current = window.setTimeout(tick, TRACE_POLL_INITIAL_DELAY_MS)
    },
    [loadThreadDetail, refreshThreads, workspaceSlug],
  )

  useEffect(() => {
    if (mode === 'offline') return
    const entry = readPendingTraceResume()
    if (!entry) return
    if (workspaceSlug && entry.workspaceSlug && workspaceSlug !== entry.workspaceSlug) return
    setPendingUserMessage({
      threadId: entry.threadId,
      text: 'Retomando resposta em andamento...',
      attachmentCount: 0,
      startedAt: entry.createdAt,
    })
    void getAiTrace(entry.traceId)
      .then((trace) => {
        if (!mountedRef.current) return
        setPendingTrace(trace)
        pollTrace(entry.traceId, entry.threadId)
      })
      .catch(() => {
        clearPendingTraceResume(entry.traceId)
        if (!mountedRef.current) return
        setPendingUserMessage(null)
      })
  }, [mode, pollTrace, workspaceSlug])

  const send = useCallback(
    async (
      text: string,
      options?: {
        newThread?: boolean
        title?: string
        /** ids vindos do chunked upload do composer */
        uploadedImageIds?: string[]
        uploadedDocumentIds?: string[]
        /** text_blocks extras (PDF text, arquivos texto/código) — entram em payload.attachments_text */
        textBlocks?: Array<{
          file_name: string
          mime_type: string
          language: string | null
          content: string
          page_count?: number
        }>
        /** URLs ricas com metadata (YouTube/Vimeo/GitHub/generic) — entram em payload.attachments_url */
        urlAttachments?: Array<{
          url: string
          kind: string
          title: string | null
          author: string | null
          duration_sec: number | null
          thumbnail_url: string | null
          ref_id: string | null
        }>
        /**
         * Universal Rich Input Payload canon (`atlas.rich_input.payload.v1`).
         * Vem do `AtlasUnifiedComposer` via `uploadAllCanonical()` e carrega
         * schema_version + source_manifest + hashes. Quando presente é enviado
         * no body como `rich_input_payload` — backend Hyperflow + Forge intake
         * preservam para auditoria e re-projeção.
         */
        richInputPayload?: AtlasRichInputPayload
        computeEffort?: AtlasComputeEffortChoice
        voiceConversation?: boolean
        conversationContext?: unknown[]
        threadId?: string | null
      },
    ): Promise<AiTrace | null> => {
      if (mode === 'offline') {
        setSendError('Atlas AI offline · serviço local indisponível. A conversa volta quando o serviço responder.')
        setSendErrorThreadId(options?.threadId ?? selectedThreadIdRef.current)
        return null
      }
      const trimmed = text.trim()
      const hasAttachments =
        (options?.uploadedImageIds?.length ?? 0) > 0 ||
        (options?.uploadedDocumentIds?.length ?? 0) > 0 ||
        (options?.textBlocks?.length ?? 0) > 0 ||
        (options?.urlAttachments?.length ?? 0) > 0
      if (trimmed === '' && !hasAttachments) return null

      const atlasDevWorkspace = workspacePath && workspacePath.trim() !== '' ? workspacePath : workspaceSlug

      // Programming-only mode é o único que exige workspace. `auto` envia o
      // hint pro backend; se o Hyperflow rotar para programação, o backend
      // negocia workspace via Atlas Decide (ou retorna blocker explícito).
      if (composerMode === 'programming' && !atlasDevWorkspace) {
        setSendError('Atlas Dev exige Workspace · selecione um Projeto no topbar antes de enviar.')
        setSendErrorThreadId(options?.threadId ?? selectedThreadIdRef.current)
        return null
      }

      const attachmentCount =
        (options?.uploadedImageIds?.length ?? 0) +
        (options?.uploadedDocumentIds?.length ?? 0) +
        (options?.textBlocks?.length ?? 0) +
        (options?.urlAttachments?.length ?? 0)
      setSending(true)
      setSendError(null)
      setSendErrorThreadId(null)

      /*
       * Atlas Dev plan-only step.
       * Programming mode runs the plan-only endpoint FIRST, before the legacy
       * `/ai/interactions` chat flow. Result is stored per run_id and surfaces
       * Contexto/Plano tabs. Provider is NEVER invoked here — that is owned
       * by the next slice (Claude 14/15/16). If the endpoint returns
       * `blocked` or `forge_promotion_preview`, we stop the pipeline so the
       * operator can react before any provider call.
       */
      // Plan-only só dispara para programação EXPLÍCITA (mode==='programming'
      // E task in {dev, debug}). Em `auto` o backend decide se isso aplica;
      // sem trigger no front, sem forçar o flow programação.
      const shouldRunPlanOnly =
        composerMode === 'programming' && (composerTask === 'dev' || composerTask === 'debug')
      const shouldForceNewThread = options?.newThread && !options?.voiceConversation
      const explicitThreadId =
        Object.prototype.hasOwnProperty.call(options ?? {}, 'threadId')
          ? options?.threadId ?? null
          : undefined
      const initialPendingThreadId = shouldForceNewThread ? null : explicitThreadId ?? selectedThreadIdRef.current
      setPendingUserMessage({
        threadId: initialPendingThreadId,
        text: trimmed,
        attachmentCount,
        startedAt: Date.now(),
      })
      let planOnlyDecision: 'continue' | 'halt' = 'continue'
      if (shouldRunPlanOnly) {
        setAtlasDevPlanLoading(true)
        setAtlasDevPlanError(null)
        const awisPlanConstraints = awisPlanConstraintsFromContext(options?.conversationContext)
        try {
          const planResult = await postAtlasDevPlan({
            input_text: trimmed,
            thread_id: shouldForceNewThread ? null : explicitThreadId ?? selectedThreadIdRef.current,
            surface_id: 'atlas_desktop_ai',
            workspace: atlasDevWorkspace,
            task: composerTask,
            provider: composerProvider === 'auto' ? undefined : composerProvider,
            compute_effort: options?.computeEffort ?? composerComputeEffort,
            decision_mode: composerProvider === 'auto' ? 'atlas_decide' : 'manual_override',
            payload: awisPlanConstraints.length
              ? {
                  user_constraints: awisPlanConstraints,
                  surface_context: {
                    awis_context_applied: true,
                    awis_context_source: 'workspace_provider_capsule',
                  },
                }
              : undefined,
          })
          if (!mountedRef.current) return null
          setCurrentAtlasDevPlan(planResult)
          if (planResult.run_id) {
            setAtlasDevPlansByRun((prev) => ({ ...prev, [planResult.run_id]: planResult }))
          }
          setAtlasDevPlanUnavailable(false)
          // Atlas Dev is plan-first: once the deterministic backend returns a
          // routed plan, the operator must explicitly confirm Run in the
          // workbench. Do not fall through to the legacy chat interaction.
          if (
            planResult.routing_decision === 'atlas_dev_fast_path' ||
            planResult.status === 'blocked' ||
            planResult.status === 'forge_promotion_preview'
          ) {
            planOnlyDecision = 'halt'
            setPendingUserMessage(null) // free the optimistic bubble
          }
        } catch (e) {
          if (!mountedRef.current) return null
          if (e instanceof AtlasDevPlanUnavailableError) {
            // Endpoint not deployed yet — fall back to legacy /ai/interactions
            // so the chat does not regress. Surface a non-blocking hint.
            setAtlasDevPlanUnavailable(true)
            setAtlasDevPlanError(null)
          } else {
            setAtlasDevPlanError(e instanceof Error ? e.message : String(e))
            // Plan failure does NOT block legacy chat — Desktop is plan-only
            // viewer, not orchestrator. Operator still gets a chat reply.
          }
        } finally {
          if (mountedRef.current) setAtlasDevPlanLoading(false)
        }

        if (planOnlyDecision === 'halt') {
          if (mountedRef.current) setSending(false)
          return null
        }
      }

      let interactionThreadId = initialPendingThreadId
      try {
        const scope: AtlasAiWorkspaceScope = {
          slug: workspaceSlug,
          name: workspaceSlug,
          path: workspacePath,
          pathExists: null,
        }
        const awisMetadata = awisThreadMetadataFromContext(options?.conversationContext)
        const awisMetadataForThread = Object.keys(awisMetadata).length > 0
          ? {
              ...awisMetadata,
              awis_context_refreshed_at: new Date().toISOString(),
            }
          : {}
        let threadId = shouldForceNewThread ? null : explicitThreadId ?? selectedThreadIdRef.current
        const existingThreadIdBeforeSend = threadId
        interactionThreadId = threadId
        // Cria thread explicitamente quando não há uma — assim o trace já fica
        // ligado e o histórico atualiza sem corrida.
        if (!threadId) {
          const newThread = await createAiThread({
            title:
              options?.title?.trim() ||
              trimmed.slice(0, 80) ||
              (hasAttachments ? 'Atlas AI · conversa com anexos' : 'Atlas AI · nova conversa'),
            workspace: workspaceStorageValue(scope),
            surface: 'atlas_desktop_ai',
            source_type: 'desktop',
            metadata: {
              ...workspaceMetadata(scope),
              atlas_focus: composerMode,
              atlas_workflow_mode: composerTask,
              operator_compute_effort: options?.computeEffort ?? composerComputeEffort,
              routing_task: composerTask === 'auto' ? 'auto' : composerTask,
              routing_domain:
                composerMode === 'auto'
                  ? 'auto'
                  : composerMode === 'programming' && workspaceSlug
                    ? workspaceSlug
                    : composerMode,
              created_via: 'atlas_desktop_ai',
              ...awisMetadataForThread,
            },
          })
          threadId = newThread.id
          interactionThreadId = threadId
          if (mountedRef.current) {
            setThreads((prev) => {
              const next = [newThread, ...prev.filter((thread) => thread.id !== newThread.id)]
              writeThreadListCache(next)
              return next
            })
            selectedThreadIdRef.current = threadId
            setSelectedThreadId(threadId)
            setThreadDetail(null)
            setThreadDetailLoading(true)
            setPendingUserMessage((current) => current ? { ...current, threadId } : current)
            void loadThreadDetail(threadId)
          }
        }

        if (existingThreadIdBeforeSend && Object.keys(awisMetadataForThread).length > 0) {
          const existingThread =
            threadDetail?.id === existingThreadIdBeforeSend
              ? threadDetail
              : threads.find((thread) => thread.id === existingThreadIdBeforeSend) ?? null
          const refreshedMetadata = {
            ...(existingThread?.metadata ?? {}),
            ...workspaceMetadata(scope),
            ...awisMetadataForThread,
          }
          try {
            const updatedThread = await updateAiThread(existingThreadIdBeforeSend, {
              metadata: refreshedMetadata,
            })
            if (mountedRef.current) {
              setThreads((prev) => {
                const next = prev.map((thread) => (
                  thread.id === existingThreadIdBeforeSend
                    ? { ...thread, ...updatedThread, metadata: refreshedMetadata }
                    : thread
                ))
                writeThreadListCache(next)
                return next
              })
              if (threadDetail?.id === existingThreadIdBeforeSend) {
                setThreadDetail((prev) => prev ? { ...prev, metadata: refreshedMetadata } : prev)
              }
            }
          } catch {
            // Metadata AWIS melhora continuidade, mas não deve bloquear o envio.
          }
        }

        const { payload, provider } = buildInteractionPayload({
          mode: composerMode,
          task: composerTask,
          provider: composerProvider,
          computeEffort: options?.computeEffort ?? composerComputeEffort,
          workspaceSlug,
          conversationContext: options?.conversationContext,
        })

        // Enriquecemos o payload com text_blocks e url_attachments — backend
        // monta o prompt final embutindo esses blocos antes de enviar ao provider.
        const enrichedPayload: Record<string, unknown> = {
          ...(payload ?? {}),
        }
        if (options?.voiceConversation) {
          enrichedPayload.voice_response_contract = {
            schema_version: 'atlas.voice.response_contract.v1',
            mode: 'spoken_result',
            language: 'pt-BR',
            max_sentences: 6,
            target_chars: 650,
            hard_max_chars: 1_000,
            style: 'natural, direto, sem markdown, sem lista longa; execute o pedido completo antes de resumir em voz',
            preserve_text_answer: true,
          }
        }
        if (options?.textBlocks?.length) {
          enrichedPayload.attachments_text = options.textBlocks
        }
        if (options?.urlAttachments?.length) {
          enrichedPayload.attachments_url = options.urlAttachments
        }

        const response = await createAiInteraction({
          input_text: trimmed || '(somente anexos)',
          thread_id: threadId,
          new_thread: false,
          ...(provider ? { provider } : {}),
          kind: 'interaction',
          source_type: 'app',
          include_semantic_context: true,
          context_note_limit: 5,
          payload: enrichedPayload,
          // Legacy top-level fields — mantidos por compat com backend que ainda
          // consome os arrays diretos. Backend trata `rich_input_payload` (canon)
          // como fonte preferencial quando ambos estão presentes.
          ...(options?.uploadedImageIds?.length
            ? { uploaded_images: options.uploadedImageIds }
            : {}),
          ...(options?.uploadedDocumentIds?.length
            ? { uploaded_documents: options.uploadedDocumentIds }
            : {}),
          // Canonical Universal Rich Input Payload — `atlas.rich_input.payload.v1`.
          // Inclui source_manifest + hashes para Hyperflow + Forge intake.
          ...(options?.richInputPayload
            ? { rich_input_payload: options.richInputPayload }
            : {}),
        })

        if (!mountedRef.current) return response.trace
        setLastTerminalTrace(null)
        setPendingTrace(response.trace)
        subscribeStream(response.trace.id)
        pollTrace(response.trace.id, threadId)
        return response.trace
      } catch (e) {
        if (mountedRef.current) {
          setSendError(e instanceof Error ? e.message : String(e))
          setSendErrorThreadId(interactionThreadId)
          // Limpa optimistic — usuário precisa saber que falhou pra editar/retentar.
          setPendingUserMessage(null)
        }
        return null
      } finally {
        if (mountedRef.current) setSending(false)
      }
    },
    [
      mode,
      composerMode,
      composerTask,
      composerProvider,
      composerComputeEffort,
      workspaceSlug,
      workspacePath,
      selectedThreadId,
      threadDetail,
      threads,
      loadThreadDetail,
      pollTrace,
    ],
  )

  const archiveThread = useCallback(
    async (id: string) => {
      try {
        await updateAiThread(id, { status: 'archived' })
        if (!mountedRef.current) return
        setThreads((prev) => {
          const next = prev.filter((thread) => thread.id !== id)
          writeThreadListCache(next)
          return next
        })
        threadDetailCacheRef.current.delete(id)
        writeThreadDetailCache(threadDetailCacheRef.current)
        if (id === selectedThreadId) {
          selectedThreadIdRef.current = null
          setSelectedThreadId(null)
          setThreadDetail(null)
        }
        void refreshThreads()
      } catch (e) {
        if (mountedRef.current) setThreadDetailError(e instanceof Error ? e.message : String(e))
      }
    },
    [selectedThreadId, refreshThreads],
  )

  const renameThread = useCallback(
    async (id: string, title: string) => {
      try {
        const updated = await updateAiThread(id, { title })
        if (!mountedRef.current) return
        setThreads((prev) => {
          const next = prev.map((thread) => (thread.id === id ? { ...thread, title: updated.title ?? title } : thread))
          writeThreadListCache(next)
          return next
        })
        if (id === selectedThreadId) {
          void loadThreadDetail(id)
        }
        void refreshThreads()
      } catch (e) {
        if (mountedRef.current) setThreadDetailError(e instanceof Error ? e.message : String(e))
      }
    },
    [selectedThreadId, loadThreadDetail, refreshThreads],
  )

  const closeThread = useCallback(
    async (id: string) => {
      try {
        await deleteAiThread(id)
        if (!mountedRef.current) return
        setThreads((prev) => {
          const next = prev.filter((thread) => thread.id !== id)
          writeThreadListCache(next)
          return next
        })
        threadDetailCacheRef.current.delete(id)
        writeThreadDetailCache(threadDetailCacheRef.current)
        if (id === selectedThreadId) {
          selectedThreadIdRef.current = null
          setSelectedThreadId(null)
          setThreadDetail(null)
        }
        void refreshThreads()
      } catch (e) {
        if (mountedRef.current) setThreadDetailError(e instanceof Error ? e.message : String(e))
      }
    },
    [selectedThreadId, refreshThreads],
  )

  const moveThreadToWorkspace = useCallback(
    async (id: string, scope: AtlasAiWorkspaceScope) => {
      try {
        const updated = await updateAiThread(id, {
          workspace: workspaceStorageValue(scope) ?? undefined,
          metadata: workspaceMetadata(scope),
        })
        if (!mountedRef.current) return
        setThreads((prev) => {
          const next = prev.map((thread) => (thread.id === id ? { ...thread, ...updated } : thread))
          writeThreadListCache(next)
          return next
        })
        if (id === selectedThreadId) {
          void loadThreadDetail(id)
        }
        void refreshThreads()
      } catch (e) {
        if (mountedRef.current) setThreadDetailError(e instanceof Error ? e.message : String(e))
      }
    },
    [loadThreadDetail, refreshThreads, selectedThreadId],
  )

  const fetchThreadDetail = useCallback(
    async (id: string, options: { full?: boolean } = {}): Promise<AiThreadDetail | null> => {
      if (mode === 'offline') return null
      try {
        if (options.full) {
          return await getAiThread(id, { lean: false, messageLimit: 200 })
        }
        return await getAiThread(id, { lean: true, messageLimit: INITIAL_THREAD_MESSAGE_LIMIT })
      } catch {
        return null
      }
    },
    [mode],
  )

  const archiveSelectedThread = useCallback(async () => {
    if (!selectedThreadId) return
    try {
      await updateAiThread(selectedThreadId, { status: 'archived' })
      if (!mountedRef.current) return
      setThreads((prev) => {
        const next = prev.filter((thread) => thread.id !== selectedThreadId)
        writeThreadListCache(next)
        return next
      })
      threadDetailCacheRef.current.delete(selectedThreadId)
      writeThreadDetailCache(threadDetailCacheRef.current)
      selectedThreadIdRef.current = null
      setSelectedThreadId(null)
      setThreadDetail(null)
      void refreshThreads()
    } catch (e) {
      if (mountedRef.current) setThreadDetailError(e instanceof Error ? e.message : String(e))
    }
  }, [selectedThreadId, refreshThreads])

  useEffect(() => {
    mountedRef.current = true
    if (mode === 'offline') {
      return () => {
        mountedRef.current = false
      }
    }
    void Promise.resolve().then(() => {
      if (!mountedRef.current) return
      void refreshThreads({ limit: THREAD_LIST_FOREGROUND_LIMIT })
    })

    const cancelBackgroundStartup = scheduleAtlasAiBackgroundWork(() => {
      void refreshThreads({ limit: THREAD_LIST_FULL_LIMIT, background: true })
      void refreshConversationFusion()
      // Hyperflow bootstrap + readiness — opcionais e silenciosos. Carregam só
      // pra alimentar painéis informativos; o front nunca depende disso para
      // decidir domínio (a verdade é o trace que volta do backend).
      void Promise.resolve().then(async () => {
        if (!mountedRef.current) return
        const [bootstrap, readiness] = await Promise.all([
          getAtlasAiRouterBootstrap(),
          getAtlasAiRouterReadiness(),
        ])
        if (!mountedRef.current) return
        setRouterBootstrap(bootstrap)
        setRouterReadiness(readiness)
      })
    })

    return () => {
      cancelBackgroundStartup()
      mountedRef.current = false
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
      if (threadDetailLoadTimerRef.current !== null) {
        window.clearTimeout(threadDetailLoadTimerRef.current)
        threadDetailLoadTimerRef.current = null
      }
      threadDetailAbortRef.current?.abort()
      threadDetailAbortRef.current = null
      if (detailCachePersistTimerRef.current !== null) {
        window.clearTimeout(detailCachePersistTimerRef.current)
        detailCachePersistTimerRef.current = null
        writeThreadDetailCache(threadDetailCacheRef.current)
      }
      if (streamUnsubRef.current) {
        streamUnsubRef.current()
        streamUnsubRef.current = null
      }
    }
  }, [refreshThreads, refreshConversationFusion, mode])

  useEffect(() => {
    if (mode !== 'tauri') return
    let cancelled = false
    let unlisten: (() => void) | null = null

    void Promise.resolve().then(async () => {
      try {
        const eventApi = await import('@tauri-apps/api/event')
        unlisten = await eventApi.listen('kernel://ready', () => {
          if (cancelled) return
          threadsRetryCountRef.current = 0
          void refreshThreads({ limit: THREAD_LIST_FOREGROUND_LIMIT })
          scheduleAtlasAiBackgroundWork(() => {
            if (!cancelled) void refreshThreads({ limit: THREAD_LIST_FULL_LIMIT, background: true })
            if (!cancelled) void refreshConversationFusion()
          })
        })
      } catch {
        /* Browser/test environments do not expose Tauri events. */
      }
    })

    return () => {
      cancelled = true
      if (unlisten) unlisten()
    }
  }, [mode, refreshConversationFusion, refreshThreads])

  useEffect(() => {
    if (mode === 'offline' || !threadsError) return
    if (threadsRetryCountRef.current >= 6) return
    const retry = window.setTimeout(() => {
      if (!mountedRef.current) return
      threadsRetryCountRef.current += 1
      void refreshThreads()
    }, 2500)
    return () => window.clearTimeout(retry)
  }, [mode, refreshThreads, threadsError])

  const filteredThreads = applyModeFilter(threads, modeFilter)

  return {
    mode,
    workspaceSlug,
    setWorkspaceSlug,
    workspacePath,
    setWorkspacePath,
    threadsLoading,
    threads: filteredThreads,
    threadsError,
    modeFilter,
    setModeFilter,
    refreshThreads,
    conversationFusion,
    conversationFusionLoading,
    conversationFusionError,
    refreshConversationFusion,
    conversationFusionArtifact,
    conversationFusionArtifactLoading,
    conversationFusionArtifactError,
    inspectConversationFusionArtifact,

    selectedThreadId,
    selectThread,
    prefetchThread,
    threadDetail,
    threadDetailLoading,
    threadDetailError,
    threadOlderMessagesLoading,
    threadHasOlderMessages,
    threadOlderMessagesError,
    loadOlderThreadMessages,

    composerMode,
    setComposerMode,
    composerTask,
    setComposerTask,
    composerProvider,
    setComposerProvider,
    composerComputeEffort,
    setComposerComputeEffort,

    routerBootstrap,
    routerReadiness,

    pendingTrace,
    lastTerminalTrace,
    pendingUserMessage,
    streamingText,
    sending,
    sendError,
    sendErrorThreadId,
    send,

    atlasDevPlanLoading,
    atlasDevPlanError,
    atlasDevPlanUnavailable,
    currentAtlasDevPlan,
    atlasDevPlansByRun,
    cancelPending: () => {
      clearPendingTraceResume(pendingTrace?.id ?? null)
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
      if (threadDetailLoadTimerRef.current !== null) {
        window.clearTimeout(threadDetailLoadTimerRef.current)
        threadDetailLoadTimerRef.current = null
      }
      if (streamUnsubRef.current) {
        streamUnsubRef.current()
        streamUnsubRef.current = null
      }
      setPendingTrace(null)
      setPendingUserMessage(null)
      setStreamingText('')
      setSendError(null)
      setSendErrorThreadId(null)
      setSending(false)
    },

    archiveSelectedThread,
    archiveThread,
    renameThread,
    closeThread,
    moveThreadToWorkspace,
    fetchThreadDetail,
  }
}

function applyModeFilter(threads: AiThreadSummary[], filter: AtlasAiMode | 'all'): AiThreadSummary[] {
  if (filter === 'all') return threads
  return threads.filter((t) => threadMode(t) === filter)
}

function threadMode(thread: AiThreadSummary): AtlasAiMode {
  const meta = thread.metadata ?? {}
  const focus = typeof meta.atlas_focus === 'string' ? meta.atlas_focus : null
  const explicitMode = typeof meta.atlas_mode === 'string' ? meta.atlas_mode : null
  const routingTask = typeof meta.routing_task === 'string' ? meta.routing_task : null
  // Threads que viajavam via Atlas Dev (legacy default) ainda mapeiam pra
  // programming pelo histórico de task `dev`/`debug`.
  if (focus === 'programming' || explicitMode === 'programming' || routingTask === 'dev' || routingTask === 'debug') {
    return 'programming'
  }
  if (focus === 'operational' || explicitMode === 'operational') return 'operational'
  // Thread metadata can carry any of the 11 canonical modes the Hyperflow
  // resolves to. Trust the explicit value when present, else fall back to
  // the legacy `general` bucket.
  const candidates: AtlasAiMode[] = [
    'auto',
    'general',
    'conversation',
    'research',
    'finance',
    'marketing',
    'strategy',
    'personal_development',
    'cyber',
    'automation',
  ]
  for (const candidate of candidates) {
    if (focus === candidate || explicitMode === candidate) return candidate
  }
  return 'general'
}
