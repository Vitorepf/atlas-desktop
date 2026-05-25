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
  refreshThreads: () => Promise<void>
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
  /** Baixa detalhe completo (com mensagens) para export — não muda estado. */
  fetchThreadDetail: (id: string) => Promise<AiThreadDetail | null>
}

const TRACE_POLL_INTERVAL_MS = 500
const TRACE_POLL_INITIAL_DELAY_MS = 250
const TRACE_POLL_TIMEOUT_MS = 120_000
const INITIAL_THREAD_MESSAGE_LIMIT = 6
const OLDER_THREAD_MESSAGE_PAGE_LIMIT = 6
const THREADS_CACHE_STORAGE_KEY = 'atlas-desktop:atlas-ai:threads-cache:v1'
const THREAD_DETAIL_CACHE_STORAGE_KEY = 'atlas-desktop:atlas-ai:thread-detail-cache:v1'
const THREAD_DETAIL_CACHE_MAX_ENTRIES = 50
const THREAD_DETAIL_CACHE_MAX_MESSAGES = 18
const CACHE_PERSIST_DEBOUNCE_MS = 450

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
    .filter((item) => !/\/Users\/|thread_id|source_thread_ids|raw_conversation|response_text|operator_input/i.test(item))
    .slice(0, limit)
}

function providerSafeString(value: unknown, limit = 140): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ').slice(0, limit)
  if (!text || /\/Users\/|thread_id|source_thread_ids|raw_conversation|response_text|operator_input/i.test(text)) return null
  return text
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
  const spaces = objectRecord(contextPack?.spaces)
  const liveMemory = objectRecord(contextPack?.live_execution_memory)
  const contextKernel = objectRecord(contextPack?.context_kernel)
  const startupSnapshot = objectRecord(contextPack?.startup_snapshot)
  const strongestSpaces = arrayRecords(spaces?.strongest_spaces)
  const priorityLoad = arrayRecords(contextKernel?.priority_load)
  const kernelBudget = objectRecord(contextKernel?.budget)
  const startupGold = objectRecord(startupSnapshot?.startup_gold)
  const liveStartupPacket = objectRecord(liveMemory?.startup_packet)
  const recommendedContext = objectRecord(taskContext?.recommended_context)
  const spaceBrain = arrayRecords(recommendedContext?.space_brain)

  return {
    awis_context_applied: true,
    awis_context_schema_versions: Array.from(schemaVersions).slice(0, 6),
    awis_provider_safe: true,
    awis_task_kind: typeof taskContext?.task_kind === 'string'
      ? taskContext.task_kind
      : typeof providerCapsule?.task_kind === 'string'
        ? providerCapsule.task_kind
        : 'startup',
    awis_capsule_confidence: typeof providerCapsule?.confidence === 'number' ? providerCapsule.confidence : null,
    awis_preflight_mode: typeof preflight?.mode === 'string' ? preflight.mode : null,
    awis_twin_hash: twin?.hashes && typeof twin.hashes === 'object' && typeof (twin.hashes as Record<string, unknown>).genome_hash === 'string'
      ? (twin.hashes as Record<string, unknown>).genome_hash
      : null,
    awis_load_first: providerSafeStringList(providerCapsule?.load_first),
    awis_validate_with: providerSafeStringList(providerCapsule?.validate_with),
    awis_summary_gold: providerSafeStringList(providerCapsule?.use_as_summary, 6),
    awis_space_focus: strongestSpaces
      .map((space) => providerSafeString(space.title, 96))
      .filter((item): item is string => Boolean(item))
      .slice(0, 3),
    awis_space_continuity: providerSafeStringList(objectRecord(spaces?.continuity)?.carry_forward, 4),
    awis_space_brain: spaceBrain
      .map((space) => {
        const title = providerSafeString(space.title, 80)
        const state = providerSafeString(space.state, 24)
        const load = providerSafeStringList(space.load_first, 2)
        const carry = providerSafeStringList(space.carry_forward, 2)
        const evidence = providerSafeStringList(space.evidence, 2)
        if (!title) return null
        return {
          title,
          state: state ?? 'vivo',
          load,
          carry,
          evidence,
          confidence: typeof space.confidence === 'number' ? Math.min(100, Math.max(0, Math.round(space.confidence))) : null,
        }
      })
      .filter((item): item is {
        title: string
        state: string
        load: string[]
        carry: string[]
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
    awis_startup_gold: providerSafeStringList(startupGold?.strongest_spaces, 4),
  }
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

  const refreshThreads = useCallback(async () => {
    if (mode === 'offline') {
      if (mountedRef.current) {
        setThreads([])
        setThreadsLoading(false)
      }
      return
    }
    try {
      const list = await listAiThreads({
        status: 'active',
        light: true,
        limit: 100,
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
      selectedThreadIdRef.current = id
      setSelectedThreadId(id)
      const cached = id ? threadDetailCacheRef.current.get(id) ?? null : null
      setThreadDetail(cached)
      if (cached) setThreadDetailLoading(false)
      setThreadDetailError(null)
      setThreadOlderMessagesError(null)
      setThreadOlderMessagesLoading(false)
      setThreadHasOlderMessages(cached ? (cached.message_count ?? 0) > (cached.messages?.length ?? 0) : false)
      setCurrentAtlasDevPlan(null)
      setAtlasDevPlanError(null)
      if (id) {
        void loadThreadDetail(id, { background: cached !== null })
      } else {
        threadDetailRequestSeqRef.current += 1
        threadDetailAbortRef.current?.abort()
        threadDetailAbortRef.current = null
        setThreadDetailLoading(false)
        setThreadHasOlderMessages(false)
      }
    },
    [loadThreadDetail],
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
    [loadThreadDetail, refreshThreads],
  )

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
        let threadId = shouldForceNewThread ? null : explicitThreadId ?? selectedThreadIdRef.current
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
              ...awisThreadMetadataFromContext(options?.conversationContext),
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
    async (id: string): Promise<AiThreadDetail | null> => {
      if (mode === 'offline') return null
      try {
        return await getAiThread(id, { lean: false, messageLimit: 200 })
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
      void refreshThreads()
      void refreshConversationFusion()
    })
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
    return () => {
      mountedRef.current = false
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
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
          void refreshThreads()
          void refreshConversationFusion()
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
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
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
