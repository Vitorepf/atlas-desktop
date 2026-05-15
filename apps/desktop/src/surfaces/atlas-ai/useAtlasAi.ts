/**
 * useAtlasAi · stateful hook por trás da AtlasAiSurface.
 *
 * Responsabilidades:
 *   - listar/abrir/criar `ai_threads` reais (sem storage paralelo);
 *   - filtrar por workspace + modo;
 *   - construir payload via `contract.ts` (paridade com Atlas AI mobile);
 *   - postar `/ai/interactions` e fazer polling leve do trace até `completed`.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  atlasAiBridgeMode,
  type AtlasAiBridgeMode,
  createAiInteraction,
  createAiThread,
  getAiThread,
  getAiTrace,
  listAiThreads,
  updateAiThread,
} from './client'
import { buildInteractionPayload, defaultTaskForMode, isTaskAllowedForMode } from './contract'
import type {
  AiThreadDetail,
  AiThreadSummary,
  AiTrace,
  AtlasAiMode,
  AtlasAiProviderChoice,
  AtlasAiTask,
} from './types'

export interface AtlasAiState {
  mode: AtlasAiBridgeMode
  workspaceSlug: string | null
  setWorkspaceSlug: (slug: string | null) => void
  threadsLoading: boolean
  threads: AiThreadSummary[]
  threadsError: string | null
  modeFilter: AtlasAiMode | 'all'
  setModeFilter: (mode: AtlasAiMode | 'all') => void
  refreshThreads: () => Promise<void>

  selectedThreadId: string | null
  selectThread: (id: string | null) => void
  threadDetail: AiThreadDetail | null
  threadDetailLoading: boolean
  threadDetailError: string | null

  composerMode: AtlasAiMode
  setComposerMode: (mode: AtlasAiMode) => void
  composerTask: AtlasAiTask
  setComposerTask: (task: AtlasAiTask) => void
  composerProvider: AtlasAiProviderChoice
  setComposerProvider: (provider: AtlasAiProviderChoice) => void

  pendingTrace: AiTrace | null
  sending: boolean
  sendError: string | null
  send: (text: string, options?: { newThread?: boolean; title?: string }) => Promise<AiTrace | null>

  archiveSelectedThread: () => Promise<void>
}

const TRACE_POLL_INTERVAL_MS = 1500
const TRACE_POLL_TIMEOUT_MS = 120_000

export function useAtlasAi(initialWorkspaceSlug: string | null = null): AtlasAiState {
  const mountedRef = useRef(true)
  const mode = atlasAiBridgeMode()
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(initialWorkspaceSlug)
  const [modeFilter, setModeFilter] = useState<AtlasAiMode | 'all'>('all')

  const [threads, setThreads] = useState<AiThreadSummary[]>([])
  const [threadsLoading, setThreadsLoading] = useState<boolean>(mode !== 'offline')
  const [threadsError, setThreadsError] = useState<string | null>(null)

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [threadDetail, setThreadDetail] = useState<AiThreadDetail | null>(null)
  const [threadDetailLoading, setThreadDetailLoading] = useState<boolean>(false)
  const [threadDetailError, setThreadDetailError] = useState<string | null>(null)

  const [composerMode, setComposerModeRaw] = useState<AtlasAiMode>('programming')
  const [composerTask, setComposerTaskRaw] = useState<AtlasAiTask>('dev')
  const [composerProvider, setComposerProvider] = useState<AtlasAiProviderChoice>('auto')

  const [pendingTrace, setPendingTrace] = useState<AiTrace | null>(null)
  const [sending, setSending] = useState<boolean>(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const pollTimerRef = useRef<number | null>(null)

  const setComposerMode = useCallback((next: AtlasAiMode) => {
    setComposerModeRaw(next)
    setComposerTaskRaw((curr) => (isTaskAllowedForMode(curr, next) ? curr : defaultTaskForMode(next)))
  }, [])

  const setComposerTask = useCallback((next: AtlasAiTask) => {
    setComposerTaskRaw(next)
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
        workspace: workspaceSlug,
        light: true,
        limit: 60,
      })
      if (!mountedRef.current) return
      setThreads(list)
      setThreadsError(null)
    } catch (e) {
      if (!mountedRef.current) return
      setThreads([])
      setThreadsError(e instanceof Error ? e.message : String(e))
    } finally {
      if (mountedRef.current) setThreadsLoading(false)
    }
  }, [workspaceSlug, mode])

  const loadThreadDetail = useCallback(
    async (id: string) => {
      if (mode === 'offline') return
      try {
        const detail = await getAiThread(id)
        if (!mountedRef.current) return
        setThreadDetail(detail)
        setThreadDetailError(null)
      } catch (e) {
        if (!mountedRef.current) return
        setThreadDetail(null)
        setThreadDetailError(e instanceof Error ? e.message : String(e))
      } finally {
        if (mountedRef.current) setThreadDetailLoading(false)
      }
    },
    [mode],
  )

  const selectThread = useCallback(
    (id: string | null) => {
      setSelectedThreadId(id)
      setThreadDetail(null)
      setThreadDetailError(null)
      setPendingTrace(null)
      setSendError(null)
      if (id) {
        setThreadDetailLoading(true)
        void loadThreadDetail(id)
      }
    },
    [loadThreadDetail],
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
      const tick = async () => {
        if (!mountedRef.current) return
        try {
          const trace = await getAiTrace(traceId)
          if (!mountedRef.current) return
          setPendingTrace(trace)
          const terminal =
            trace.status === 'completed' ||
            trace.status === 'failed' ||
            trace.status === 'rejected' ||
            trace.status === 'cancelled'
          if (terminal) {
            stop()
            if (threadId) {
              void loadThreadDetail(threadId)
            }
            void refreshThreads()
            return
          }
        } catch (e) {
          if (!mountedRef.current) return
          setSendError(e instanceof Error ? e.message : String(e))
        }
        if (Date.now() - startedAt > TRACE_POLL_TIMEOUT_MS) {
          stop()
          return
        }
        pollTimerRef.current = window.setTimeout(tick, TRACE_POLL_INTERVAL_MS)
      }
      stop()
      pollTimerRef.current = window.setTimeout(tick, TRACE_POLL_INTERVAL_MS)
    },
    [loadThreadDetail, refreshThreads],
  )

  const send = useCallback(
    async (text: string, options?: { newThread?: boolean; title?: string }): Promise<AiTrace | null> => {
      if (mode === 'offline') {
        setSendError('Atlas AI offline · backend indisponível, conversa só volta quando o kernel responder.')
        return null
      }
      const trimmed = text.trim()
      if (trimmed === '') return null

      if (composerMode === 'programming' && !workspaceSlug) {
        setSendError('Atlas Dev exige Workspace · selecione um Projeto no topbar antes de enviar.')
        return null
      }

      setSending(true)
      setSendError(null)

      try {
        let threadId = options?.newThread ? null : selectedThreadId
        // Cria thread explicitamente quando não há uma — assim o trace já fica
        // ligado e o histórico atualiza sem corrida.
        if (!threadId) {
          const newThread = await createAiThread({
            title: options?.title?.trim() || trimmed.slice(0, 80) || 'Atlas AI · nova conversa',
            workspace: workspaceSlug,
            surface: 'atlas_desktop_ai',
            source_type: 'desktop',
            metadata: {
              atlas_focus: composerMode,
              atlas_workflow_mode: composerTask,
              routing_task: composerTask,
              routing_domain: workspaceSlug ?? 'auto',
              created_via: 'atlas_desktop_ai',
            },
          })
          threadId = newThread.id
          if (mountedRef.current) {
            setSelectedThreadId(threadId)
            setThreadDetail(null)
            setThreadDetailLoading(true)
            void loadThreadDetail(threadId)
          }
        }

        const { payload, provider } = buildInteractionPayload({
          mode: composerMode,
          task: composerTask,
          provider: composerProvider,
          workspaceSlug,
        })

        const response = await createAiInteraction({
          input_text: trimmed,
          thread_id: threadId,
          new_thread: false,
          ...(provider ? { provider } : {}),
          kind: 'interaction',
          source_type: 'app',
          include_semantic_context: true,
          context_note_limit: 5,
          payload,
        })

        if (!mountedRef.current) return response.trace
        setPendingTrace(response.trace)
        pollTrace(response.trace.id, threadId)
        return response.trace
      } catch (e) {
        if (mountedRef.current) setSendError(e instanceof Error ? e.message : String(e))
        return null
      } finally {
        if (mountedRef.current) setSending(false)
      }
    },
    [mode, composerMode, composerTask, composerProvider, workspaceSlug, selectedThreadId, loadThreadDetail, pollTrace],
  )

  const archiveSelectedThread = useCallback(async () => {
    if (!selectedThreadId) return
    try {
      await updateAiThread(selectedThreadId, { status: 'archived' })
      if (!mountedRef.current) return
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
    })
    return () => {
      mountedRef.current = false
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [refreshThreads, mode])

  const filteredThreads = applyModeFilter(threads, modeFilter)

  return {
    mode,
    workspaceSlug,
    setWorkspaceSlug,
    threadsLoading,
    threads: filteredThreads,
    threadsError,
    modeFilter,
    setModeFilter,
    refreshThreads,

    selectedThreadId,
    selectThread,
    threadDetail,
    threadDetailLoading,
    threadDetailError,

    composerMode,
    setComposerMode,
    composerTask,
    setComposerTask,
    composerProvider,
    setComposerProvider,

    pendingTrace,
    sending,
    sendError,
    send,

    archiveSelectedThread,
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
  if (focus === 'programming' || explicitMode === 'programming' || routingTask === 'dev' || routingTask === 'debug') {
    return 'programming'
  }
  if (focus === 'operational' || explicitMode === 'operational') return 'operational'
  return 'general'
}
