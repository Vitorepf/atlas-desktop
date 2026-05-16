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
import { bridge } from '../../lib/bridge'
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
  /** Mensagem otimista do usuário — set ANTES dos awaits do send. Garante
   * feedback imediato (bolha + indicador) entre Enter e o trace aparecer. */
  pendingUserMessage: {
    text: string
    attachmentCount: number
    startedAt: number
  } | null
  /** Texto streaming acumulado via SSE — aparece token-by-token na bolha. */
  streamingText: string
  sending: boolean
  sendError: string | null
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
    },
  ) => Promise<AiTrace | null>

  archiveSelectedThread: () => Promise<void>
  /** Arquiva qualquer thread por id (não muda seleção a menos que arquivar a selecionada). */
  archiveThread: (id: string) => Promise<void>
  /** Renomeia thread (PATCH /ai/threads/{id}). */
  renameThread: (id: string, title: string) => Promise<void>
  /** Fecha thread permanentemente (status=closed). */
  closeThread: (id: string) => Promise<void>
  /** Baixa detalhe completo (com mensagens) para export — não muda estado. */
  fetchThreadDetail: (id: string) => Promise<AiThreadDetail | null>
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
  const [pendingUserMessage, setPendingUserMessage] = useState<{
    text: string
    attachmentCount: number
    startedAt: number
  } | null>(null)
  const [streamingText, setStreamingText] = useState<string>('')
  const [sending, setSending] = useState<boolean>(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const pollTimerRef = useRef<number | null>(null)
  const streamUnsubRef = useRef<(() => void) | null>(null)

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
      // NÃO filtra por `workspace` aqui: o backend faz match LITERAL
      // (`->where('workspace', $value)`), mas o DB armazena workspace como
      // path absoluto ("/Users/vitorepf/Develop/atlas") enquanto o desktop
      // operava com slug ("atlas") — divergência que zerava a lista.
      // Solução: pegar TODAS as threads ativas e deixar o agrupamento
      // client-side (AtlasAiThreadList) cuidar de organizar por projeto.
      const list = await listAiThreads({
        status: 'active',
        light: true,
        limit: 100,
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
  }, [mode])

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
            setPendingUserMessage(null)
            // Cleanup SSE stream subscription quando trace finaliza.
            if (streamUnsubRef.current) {
              streamUnsubRef.current()
              streamUnsubRef.current = null
            }
            // Streaming text fica até loadThreadDetail trazer a msg final
            // — depois é limpo pelo selectThread/loadThreadDetail success.
            setStreamingText('')
            if (threadId) {
              void loadThreadDetail(threadId)
            }
            void refreshThreads()
            return
          }
        } catch (e) {
          if (!mountedRef.current) return
          consecutiveErrors += 1
          setSendError(e instanceof Error ? e.message : String(e))
          // 5 erros consecutivos = backend morto / network. Para o loop
          // e libera o optimistic pra usuário poder tentar de novo.
          if (consecutiveErrors >= 5) {
            stop()
            setPendingUserMessage(null)
            setSendError('Backend não responde ao polling do trace · tenta de novo ou verifica o atlas-server.')
            return
          }
        }
        if (Date.now() - startedAt > TRACE_POLL_TIMEOUT_MS) {
          stop()
          // CRÍTICO: limpar optimistic + reportar timeout claro pro usuário.
          // Sem isso a bolha "enviando agora…" fica eterna.
          setPendingUserMessage(null)
          setSendError(`Atlas não respondeu em ${Math.round(TRACE_POLL_TIMEOUT_MS / 1000)}s · provider/kernel travado, tenta de novo`)
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
      },
    ): Promise<AiTrace | null> => {
      if (mode === 'offline') {
        setSendError('Atlas AI offline · backend indisponível, conversa só volta quando o kernel responder.')
        return null
      }
      const trimmed = text.trim()
      const hasAttachments =
        (options?.uploadedImageIds?.length ?? 0) > 0 ||
        (options?.uploadedDocumentIds?.length ?? 0) > 0 ||
        (options?.textBlocks?.length ?? 0) > 0 ||
        (options?.urlAttachments?.length ?? 0) > 0
      if (trimmed === '' && !hasAttachments) return null

      if (composerMode === 'programming' && !workspaceSlug) {
        setSendError('Atlas Dev exige Workspace · selecione um Projeto no topbar antes de enviar.')
        return null
      }

      const attachmentCount =
        (options?.uploadedImageIds?.length ?? 0) +
        (options?.uploadedDocumentIds?.length ?? 0) +
        (options?.textBlocks?.length ?? 0) +
        (options?.urlAttachments?.length ?? 0)
      // Feedback imediato: a bolha do usuário aparece SÍNCRONO antes de
      // qualquer await (createAiThread / createAiInteraction podem levar
      // 500ms-2s). Sem isso o operador vê silêncio total e acha que travou.
      setPendingUserMessage({
        text: trimmed,
        attachmentCount,
        startedAt: Date.now(),
      })
      setSending(true)
      setSendError(null)

      try {
        let threadId = options?.newThread ? null : selectedThreadId
        // Cria thread explicitamente quando não há uma — assim o trace já fica
        // ligado e o histórico atualiza sem corrida.
        if (!threadId) {
          const newThread = await createAiThread({
            title:
              options?.title?.trim() ||
              trimmed.slice(0, 80) ||
              (hasAttachments ? 'Atlas AI · conversa com anexos' : 'Atlas AI · nova conversa'),
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

        // Enriquecemos o payload com text_blocks e url_attachments — backend
        // monta o prompt final embutindo esses blocos antes de enviar ao provider.
        const enrichedPayload: Record<string, unknown> = {
          ...(payload ?? {}),
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
          ...(options?.uploadedImageIds?.length
            ? { uploaded_images: options.uploadedImageIds }
            : {}),
          ...(options?.uploadedDocumentIds?.length
            ? { uploaded_documents: options.uploadedDocumentIds }
            : {}),
        })

        if (!mountedRef.current) return response.trace
        setPendingTrace(response.trace)
        subscribeStream(response.trace.id)
        pollTrace(response.trace.id, threadId)
        return response.trace
      } catch (e) {
        if (mountedRef.current) {
          setSendError(e instanceof Error ? e.message : String(e))
          // Limpa optimistic — usuário precisa saber que falhou pra editar/retentar.
          setPendingUserMessage(null)
        }
        return null
      } finally {
        if (mountedRef.current) setSending(false)
      }
    },
    [mode, composerMode, composerTask, composerProvider, workspaceSlug, selectedThreadId, loadThreadDetail, pollTrace],
  )

  const archiveThread = useCallback(
    async (id: string) => {
      try {
        await updateAiThread(id, { status: 'archived' })
        if (!mountedRef.current) return
        if (id === selectedThreadId) {
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
        await updateAiThread(id, { title })
        if (!mountedRef.current) return
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
        await updateAiThread(id, { status: 'closed' })
        if (!mountedRef.current) return
        if (id === selectedThreadId) {
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

  const fetchThreadDetail = useCallback(
    async (id: string): Promise<AiThreadDetail | null> => {
      if (mode === 'offline') return null
      try {
        return await getAiThread(id)
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
      if (streamUnsubRef.current) {
        streamUnsubRef.current()
        streamUnsubRef.current = null
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
    pendingUserMessage,
    streamingText,
    sending,
    sendError,
    send,
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
      setSending(false)
    },

    archiveSelectedThread,
    archiveThread,
    renameThread,
    closeThread,
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
  if (focus === 'programming' || explicitMode === 'programming' || routingTask === 'dev' || routingTask === 'debug') {
    return 'programming'
  }
  if (focus === 'operational' || explicitMode === 'operational') return 'operational'
  return 'general'
}
