/**
 * Atlas AI · Conversation Surface (rails-based, 12h premium workbench).
 *
 * Layout idêntico ao Atlas Code:
 *   row 1: topbar (shell global)
 *   row 2: header-bar (3 cols full-width)
 *   row 3: left-rail │ stage │ right-rail
 *
 * Rails fixos com drag-resize e collapse via store persistente. Stage
 * central respira (hero + conversation + composer integrados em coluna
 * de altura plena).
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-ai-conversation-surface-and-atlas-dev-v1.md
 *   - docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AtlasWorkspaceProfile } from '@atlas/domain'
import type { Surface } from '../../hooks/useSurface'
// ProjectScopeStrip removido do Atlas AI: era redundante (info já vive
// no WorkspacePill do topbar). Para abrir Project Profile, mantemos um
// link compacto "ver perfil" se necessário no futuro.
import { useAtlasAiLayoutStore } from '../../state/atlasAiLayoutStore'
import { useVoxOverlay } from '../../components/vox/useVoxOverlay'
import { VoxOverlay } from '../../components/vox/VoxOverlay'
import { useVoxContextSnapshot } from '../../components/vox/useVoxContextSnapshot'
import { isVoxContextSnapshotEmpty } from '../../components/vox/voxContextSnapshot'
import { voxEdgeAudioLevel, type VoxContextRef } from '../../lib/bridge'
import '../../components/vox/vox.css'
import { AtlasAiComposer, type AtlasAiComposerSendExtras } from './components/AtlasAiComposer'
import { AtlasAiConversation } from './components/AtlasAiConversation'
import { AtlasAiEmpty } from './components/AtlasAiEmpty'
import { AtlasAiHero } from './components/AtlasAiHero'
import { AtlasAiPromotionPanel } from './components/AtlasAiPromotionPanel'
import { AtlasAiRuntimeStatusPill } from './components/AtlasAiRuntimeStatusPill'
import { AtlasAiSidePanel } from './components/AtlasAiSidePanel'
import { AtlasAiThreadContextMenu, type ContextMenuPos } from './components/AtlasAiThreadContextMenu'
import { AtlasAiThreadList } from './components/AtlasAiThreadList'
import {
  AtlasAiVoiceConversationOverlay,
  type AtlasAiVoiceSpeechState,
} from './components/AtlasAiVoiceConversationOverlay'
import { useRuntimeReadiness } from './useRuntimeReadiness'
import { useAtlasAiColumnSizing } from './layout/useAtlasAiColumnSizing'
import { serializeThreadAsMarkdown } from './threadExport'
import { useAtlasAi } from './useAtlasAi'
import {
  atlasVoiceAcceptsSpeechRunEvent,
  atlasVoiceCanStartNextTurn,
  atlasVoiceConfirmsHumanSpeech,
  atlasVoiceIsAtlasBusy,
  atlasVoiceShouldDropSilentTurn,
} from './atlasAiVoiceContinuity'
import { speakAtlasAiText, stopAtlasAiSpeech } from './atlasAiVoiceReply'
import { useCalmaria } from './useCalmaria'
import { useComposerSize } from './useComposerSize'
import type { AiThreadSummary } from './types'
import './atlas-ai.css'

const PINNED_STORAGE = 'atlas-desktop:atlas-ai-pinned-threads'
const VOICE_TURN_POLL_MS = 80
const VOICE_MIN_RMS = 0.0015
const VOICE_MIN_PEAK = 0.008
const VOICE_SILENCE_MS_TO_SEND = 350
const VOICE_MIN_TURN_MS = 900
const VOICE_MAX_TURN_MS = 24_000
const VOICE_MIN_SPEECH_FRAMES = 8
const VOICE_MIN_CONFIRMED_SPEECH_MS = 700
const VOICE_REPLY_MAX_CHARS = 420
const VOICE_REPLY_STREAMING_MAX_CHARS = 320
const VOICE_REPLY_STREAMING_MIN_CHARS = 90
const VOICE_REARM_AFTER_REPLY_MS = 120
const VOICE_REARM_WATCHDOG_MS = 350
const VOICE_LOOP_HEARTBEAT_MS = 500
const VOICE_REARM_VERIFY_MS = 650
const VOICE_REARM_MAX_ATTEMPTS = 4
const VOICE_SPEAKING_WATCHDOG_MS = 45_000

function selectAtlasVoiceStreamingChunk(input: string | null | undefined): string | null {
  const text = (input ?? '').replace(/\s+/g, ' ').trim()
  if (text.length < VOICE_REPLY_STREAMING_MIN_CHARS) return null

  const sentenceMatches = Array.from(text.matchAll(/[^.!?…]+[.!?…]+(?:\s|$)/g))
  if (sentenceMatches.length > 0) {
    let chunk = ''
    for (const match of sentenceMatches) {
      const next = `${chunk}${match[0]}`.replace(/\s+/g, ' ').trim()
      if (next.length > VOICE_REPLY_STREAMING_MAX_CHARS) break
      chunk = next
      if (chunk.length >= VOICE_REPLY_STREAMING_MIN_CHARS) return chunk
    }
    if (chunk.length >= VOICE_REPLY_STREAMING_MIN_CHARS) return chunk
  }

  if (text.length >= VOICE_REPLY_STREAMING_MAX_CHARS) {
    return text.slice(0, VOICE_REPLY_STREAMING_MAX_CHARS).replace(/\s+\S*$/, '').trim()
  }

  return null
}

function remainingAtlasVoiceTextAfterStreaming(fullText: string, spokenPrefix: string | null): string {
  const full = fullText.trim()
  const prefix = (spokenPrefix ?? '').trim()
  if (!prefix) return full
  if (full.startsWith(prefix)) return full.slice(prefix.length).trim()
  return full
}

function loadPinned(): Set<string> {
  try {
    const raw = sessionStorage.getItem(PINNED_STORAGE)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (Array.isArray(arr)) return new Set(arr.filter((x): x is string => typeof x === 'string'))
  } catch {
    /* ignore */
  }
  return new Set()
}

function savePinned(ids: Set<string>) {
  try {
    sessionStorage.setItem(PINNED_STORAGE, JSON.stringify(Array.from(ids)))
  } catch {
    /* ignore */
  }
}

function humanizeAtlasVoiceSpeechError(reason: string | null | undefined): string {
  const raw = reason ?? ''
  if (raw.includes('paid_plan_required') || raw.includes('http_status: 402')) {
    return 'A voz configurada não está liberada na ElevenLabs.'
  }
  if (raw.includes('elevenlabs_not_configured')) {
    return 'ElevenLabs não está configurado.'
  }
  if (raw.includes('elevenlabs_failed')) {
    return 'ElevenLabs não conseguiu gerar o áudio.'
  }
  if (raw.includes('afplay')) {
    return 'Áudio gerado, mas o Mac não conseguiu tocar.'
  }
  if (raw.includes('native_audio')) {
    return 'Áudio nativo indisponível.'
  }
  return 'Não consegui falar a resposta.'
}

interface AtlasAiSurfaceProps {
  activeWorkspaceSlug?: string | null
  activeWorkspaceName?: string | null
  activeWorkspace?: AtlasWorkspaceProfile | null
  defaultWorkspaceSlug?: string | null
  onRequestSurfaceChange?: (surface: Surface) => void
  onOpenWorkspaceProfile?: () => void
}

export function AtlasAiSurface({
  activeWorkspaceSlug = null,
  activeWorkspaceName = null,
  activeWorkspace = null,
  defaultWorkspaceSlug = null,
}: AtlasAiSurfaceProps) {
  const resolvedWorkspaceSlug = activeWorkspaceSlug ?? activeWorkspace?.slug ?? defaultWorkspaceSlug ?? 'atlas'
  const atlas = useAtlasAi(resolvedWorkspaceSlug, activeWorkspace?.workspacePath || null)
  const runtimeReadiness = useRuntimeReadiness()
  const { calmaria, toggle: toggleCalmaria } = useCalmaria()
  const composerSize = useComposerSize()
  const [composerDraft, setComposerDraft] = useState<string>('')
  const [promotionOpen, setPromotionOpen] = useState<boolean>(false)
  const [retrying, setRetrying] = useState<boolean>(false)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => loadPinned())
  const [ctxMenu, setCtxMenu] = useState<{ thread: AiThreadSummary; pos: ContextMenuPos } | null>(null)
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState<boolean>(false)
  const [voiceSpeechState, setVoiceSpeechState] = useState<AtlasAiVoiceSpeechState>('idle')
  const [voiceSpeechError, setVoiceSpeechError] = useState<string | null>(null)
  const lastSpokenMessageIdRef = useRef<string | null>(null)
  const lastVoiceSentTranscriptRef = useRef<string | null>(null)
  const streamingSpeechTraceIdRef = useRef<string | null>(null)
  const streamingSpeechPrefixRef = useRef<string | null>(null)
  const voiceReplyEnabledRef = useRef<boolean>(voiceReplyEnabled)
  const voxStartRef = useRef<(() => Promise<void>) | null>(null)
  const voxStateRef = useRef<string>('closed')
  const voxBusyRef = useRef<boolean>(false)
  const voiceSpeechStateRef = useRef<AtlasAiVoiceSpeechState>('idle')
  const atlasVoiceBusyRef = useRef<boolean>(false)
  const voiceRearmTimerRef = useRef<number | null>(null)
  const voiceSpeechRunIdRef = useRef<number>(0)
  const voiceSpeechStartedAtRef = useRef<number | null>(null)
  const voiceHeardSpeechRef = useRef<boolean>(false)
  const voiceSpeechFrameCountRef = useRef<number>(0)
  const voiceSpeechMsRef = useRef<number>(0)
  const voiceSilenceSinceRef = useRef<number | null>(null)
  const voiceAutoFinishInFlightRef = useRef<boolean>(false)
  const voiceNoiseFloorRef = useRef<{ rms: number; peak: number; samples: number } | null>(null)
  const voiceRearmAttemptRef = useRef<number>(0)

  // Layout rails (drag-resize + collapse persist)
  const { setLeftResizeNode, setRightResizeNode } = useAtlasAiColumnSizing()
  const leftCollapsed = useAtlasAiLayoutStore((s) => s.leftCollapsed)
  const rightCollapsed = useAtlasAiLayoutStore((s) => s.rightCollapsed)
  const toggleLeft = useAtlasAiLayoutStore((s) => s.toggleLeftCollapsed)
  const toggleRight = useAtlasAiLayoutStore((s) => s.toggleRightCollapsed)

  // Sincroniza workspace selecionado quando o topbar do shell muda.
  const { workspaceSlug, workspacePath, setWorkspaceSlug, setWorkspacePath } = atlas
  useEffect(() => {
    if (resolvedWorkspaceSlug !== workspaceSlug) {
      setWorkspaceSlug(resolvedWorkspaceSlug)
    }
    const nextWorkspacePath = activeWorkspace?.workspacePath || null
    if (nextWorkspacePath !== workspacePath) {
      setWorkspacePath(nextWorkspacePath)
    }
  }, [resolvedWorkspaceSlug, activeWorkspace?.workspacePath, workspaceSlug, workspacePath, setWorkspaceSlug, setWorkspacePath])

  // Esc cancela streaming em curso (Codex CLI canon "esc to interrupt").
  const { cancelPending, sending, pendingTrace } = atlas
  useEffect(() => {
    const isStreaming =
      sending ||
      (pendingTrace !== null &&
        (pendingTrace.status === 'queued' ||
          pendingTrace.status === 'running' ||
          pendingTrace.status === 'processing'))
    if (!isStreaming) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Não cancela se estiver focado em algum input (deixa o operador
        // limpar texto do composer com Esc também). Cancel só quando o
        // foco está em algo não-text-editable.
        const ae = document.activeElement
        const isEditable =
          ae instanceof HTMLElement &&
          (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT' || ae.isContentEditable)
        if (isEditable) return
        e.preventDefault()
        cancelPending()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sending, pendingTrace, cancelPending])

  const conversation = useMemo(
    () => ({
      detail: atlas.threadDetail,
      loading: atlas.threadDetailLoading,
      error: atlas.threadDetailError,
      pendingTrace: atlas.pendingTrace,
      pendingUserMessage: atlas.pendingUserMessage,
      streamingText: atlas.streamingText,
      sending: atlas.sending,
    }),
    [
      atlas.threadDetail,
      atlas.threadDetailLoading,
      atlas.threadDetailError,
      atlas.pendingTrace,
      atlas.pendingUserMessage,
      atlas.streamingText,
      atlas.sending,
    ],
  )

  const latestAtlasMessage = useMemo(() => {
    const messages = atlas.threadDetail?.messages ?? []
    return messages
      .filter((message) => message.role === 'assistant' || message.role === 'atlas')
      .slice()
      .sort((a, b) => a.position - b.position)
      .at(-1) ?? null
  }, [atlas.threadDetail?.messages])

  useEffect(() => {
    voiceReplyEnabledRef.current = voiceReplyEnabled
  }, [voiceReplyEnabled])

  useEffect(() => {
    voiceSpeechStateRef.current = voiceSpeechState
    voiceSpeechStartedAtRef.current = voiceSpeechState === 'speaking' ? Date.now() : null
  }, [voiceSpeechState])

  const handleSend = useCallback(
    async (options?: AtlasAiComposerSendExtras) => {
      // Clear sincrônico: a textarea esvazia IMEDIATAMENTE para o operador
      // ver que o gesto foi capturado. Se a chamada falhar restauramos o
      // texto pra ele poder editar e tentar de novo sem retypear.
      const sendingText = composerDraft
      setComposerDraft('')
      const trace = await atlas.send(sendingText, {
        newThread: options?.newThread,
        uploadedImageIds: options?.attachments?.uploaded_image_ids,
        uploadedDocumentIds: options?.attachments?.uploaded_document_ids,
        textBlocks: options?.attachments?.text_blocks,
        urlAttachments: options?.attachments?.url_attachments,
        richInputPayload: options?.richInputCanonical,
      })
      if (!trace && sendingText.trim() !== '') {
        setComposerDraft(sendingText)
      }
    },
    [atlas, composerDraft],
  )

  const handleUseChip = useCallback((text: string) => {
    setComposerDraft(text)
    window.setTimeout(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('.atlas-ai-textarea')
      if (ta) {
        ta.focus()
        ta.setSelectionRange(ta.value.length, ta.value.length)
      }
    }, 60)
  }, [])

  // Vox Overlay V1 · controller compartilhado entre o botão no composer e
  // o painel renderizado logo acima do composer-wrap.
  const handleVoxInsert = useCallback((text: string) => {
    setComposerDraft((prev) => {
      const sep = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : ''
      return `${prev}${sep}${text}`
    })
    window.setTimeout(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('.atlas-ai-textarea')
      if (ta) {
        ta.focus()
        ta.setSelectionRange(ta.value.length, ta.value.length)
      }
    }, 60)
  }, [])
  // Light context_refs · só o que o Desktop pode provar honestamente sem
  // acessar tela, accessibility ou app focado. Workspace slug ativo +
  // surface atual já bastam para o Kernel desambiguar intenções genéricas.
  const voxContextRefsProvider = useCallback((): VoxContextRef[] => {
    const refs: VoxContextRef[] = []
    if (resolvedWorkspaceSlug) {
      refs.push({ kind: 'workspace', ref: resolvedWorkspaceSlug, resolved: true })
    }
    refs.push({ kind: 'surface', ref: 'atlas_ai', resolved: true })
    return refs
  }, [resolvedWorkspaceSlug])
  // V4 · structured snapshot resolver. Reads workspace + active surface +
  // selected thread + live text selection. NÃO toca clipboard, screenshot,
  // AppleScript ou Full Disk Access — apenas dados que o WKWebView já tem.
  const threadIdForSnapshot = atlas.selectedThreadId
  const threadTitleForSnapshot = atlas.threadDetail?.title ?? null
  const { getSnapshot: getVoxContextSnapshot } = useVoxContextSnapshot({
    surface: 'atlas_ai',
    workspace: {
      root: activeWorkspace?.workspacePath ?? null,
      name: activeWorkspaceName ?? activeWorkspace?.name ?? resolvedWorkspaceSlug,
    },
    thread: {
      id: threadIdForSnapshot,
      title: threadTitleForSnapshot,
    },
    // Atlas AI não tem obra/terminal — fica null honesto.
    obra: null,
    terminal: null,
    activeViewLabel: threadTitleForSnapshot ?? 'Atlas AI',
  })
  const voxContextSnapshotProvider = useCallback((): Record<string, unknown> | null => {
    const snap = getVoxContextSnapshot()
    return isVoxContextSnapshotEmpty(snap) ? null : (snap as unknown as Record<string, unknown>)
  }, [getVoxContextSnapshot])
  const vox = useVoxOverlay({
    onInsertIntoComposer: handleVoxInsert,
    contextRefsProvider: voxContextRefsProvider,
    contextSnapshotProvider: voxContextSnapshotProvider,
  })
  const handleVoxToggle = useCallback(() => {
    void vox.toggleRecording()
  }, [vox])

  useEffect(() => {
    atlasVoiceBusyRef.current = atlasVoiceIsAtlasBusy({
      sending: atlas.sending,
      pendingTrace: atlas.pendingTrace,
      streamingText: atlas.streamingText,
    })
  }, [atlas.pendingTrace, atlas.sending, atlas.streamingText])

  const clearVoiceRearmTimer = useCallback(() => {
    if (voiceRearmTimerRef.current !== null) {
      window.clearTimeout(voiceRearmTimerRef.current)
      voiceRearmTimerRef.current = null
    }
  }, [])

  const resetVoiceTurnDetection = useCallback(() => {
    voiceHeardSpeechRef.current = false
    voiceSpeechFrameCountRef.current = 0
    voiceSpeechMsRef.current = 0
    voiceSilenceSinceRef.current = null
    voiceAutoFinishInFlightRef.current = false
    voiceNoiseFloorRef.current = null
  }, [])

  const resetVoiceStreamingSpeech = useCallback(() => {
    streamingSpeechTraceIdRef.current = null
    streamingSpeechPrefixRef.current = null
  }, [])

  const nextVoiceSpeechRunId = useCallback(() => {
    voiceSpeechRunIdRef.current += 1
    return voiceSpeechRunIdRef.current
  }, [])

  const isCurrentVoiceSpeechRun = useCallback((runId: number) => (
    atlasVoiceAcceptsSpeechRunEvent({
      voiceEnabled: voiceReplyEnabledRef.current,
      currentRunId: voiceSpeechRunIdRef.current,
      eventRunId: runId,
    })
  ), [])

  const scheduleVoiceRearm = useCallback((delayMs: number = VOICE_REARM_AFTER_REPLY_MS, attempt: number = 0) => {
    clearVoiceRearmTimer()
    voiceRearmTimerRef.current = window.setTimeout(() => {
      voiceRearmTimerRef.current = null
      if (!voiceReplyEnabledRef.current) return
      if (attempt > VOICE_REARM_MAX_ATTEMPTS) {
        setVoiceSpeechError('A conversa por voz não conseguiu reabrir o microfone. Aperte gravar de novo.')
        return
      }
      if (atlasVoiceBusyRef.current || voiceSpeechStateRef.current === 'speaking' || voxBusyRef.current) {
        scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS, attempt + 1)
        return
      }

      if (!atlasVoiceCanStartNextTurn({
        voiceEnabled: voiceReplyEnabledRef.current,
        atlasBusy: atlasVoiceBusyRef.current,
        speechState: voiceSpeechStateRef.current,
        voxBusy: voxBusyRef.current,
        voxState: voxStateRef.current,
      })) {
        scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS, attempt + 1)
        return
      }

      resetVoiceTurnDetection()
      voiceRearmAttemptRef.current = attempt
      void (async () => {
        await voxStartRef.current?.()
        window.setTimeout(() => {
          if (!voiceReplyEnabledRef.current) return
          const liveState = voxStateRef.current
          const live =
            liveState === 'starting'
            || liveState === 'listening'
            || liveState === 'finishing'
            || liveState === 'transcribing'
            || liveState === 'transcript_ready'
          if (live) return
          scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS, attempt + 1)
        }, VOICE_REARM_VERIFY_MS)
      })()
    }, Math.max(0, delayMs))
  }, [clearVoiceRearmTimer, resetVoiceTurnDetection])

  const stopVoiceConversation = useCallback(async () => {
    clearVoiceRearmTimer()
    voiceReplyEnabledRef.current = false
    nextVoiceSpeechRunId()
    voiceRearmAttemptRef.current = 0
    resetVoiceStreamingSpeech()
    resetVoiceTurnDetection()
    setVoiceReplyEnabled(false)
    setVoiceSpeechState('idle')
    await stopAtlasAiSpeech()
    const cur = vox.state
    if (
      cur === 'starting'
      || cur === 'listening'
      || cur === 'finishing'
      || cur === 'transcribing'
      || cur === 'transcript_ready'
      || cur === 'error'
    ) {
      await vox.cancel()
    }
    vox.close()
  }, [clearVoiceRearmTimer, resetVoiceTurnDetection, vox])

  const handleVoiceConversationToggle = useCallback(() => {
    const next = !voiceReplyEnabledRef.current
    voiceReplyEnabledRef.current = next
    setVoiceReplyEnabled(next)

    if (!next) {
      void stopVoiceConversation()
      return
    }

    clearVoiceRearmTimer()
    voiceRearmAttemptRef.current = 0
    nextVoiceSpeechRunId()
    resetVoiceStreamingSpeech()
    lastSpokenMessageIdRef.current = latestAtlasMessage?.id ?? null
    resetVoiceTurnDetection()
    setVoiceSpeechError(null)
    setVoiceSpeechState('idle')
    const cur = vox.state
    if (cur === 'closed' || cur === 'idle' || cur === 'cancelled') {
      scheduleVoiceRearm(0)
    } else if (cur === 'error') {
      void vox.start()
    }
  }, [clearVoiceRearmTimer, latestAtlasMessage?.id, resetVoiceTurnDetection, scheduleVoiceRearm, stopVoiceConversation, vox])

  const interruptVoiceConversation = useCallback(async () => {
    if (!voiceReplyEnabledRef.current) return
    clearVoiceRearmTimer()
    voiceRearmAttemptRef.current = 0
    resetVoiceStreamingSpeech()
    await stopAtlasAiSpeech()
    resetVoiceTurnDetection()
    setVoiceSpeechError(null)
    setVoiceSpeechState('idle')
    const cur = vox.state
    if (cur === 'closed' || cur === 'idle' || cur === 'cancelled' || cur === 'error') {
      await vox.start()
    }
  }, [clearVoiceRearmTimer, resetVoiceTurnDetection, vox])

  useEffect(() => {
    voxStartRef.current = vox.start
    voxStateRef.current = vox.state
    voxBusyRef.current = vox.busy
  }, [vox.busy, vox.start, vox.state])

  useEffect(() => {
    if (!voiceReplyEnabled) return
    if (vox.state !== 'listening') {
      voiceSilenceSinceRef.current = null
      voiceAutoFinishInFlightRef.current = false
      return
    }
    const sessionId = vox.session?.sessionId
    if (!sessionId) return
    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      if (!voiceReplyEnabledRef.current) return
      if (voiceAutoFinishInFlightRef.current) return
      const level = await voxEdgeAudioLevel(sessionId)
      if (cancelled || !level) return

      const now = Date.now()
      if (level.sampleCount > 0 && !voiceHeardSpeechRef.current && level.durationMs <= 700) {
        const prev = voiceNoiseFloorRef.current
        voiceNoiseFloorRef.current = {
          rms: prev ? Math.max(prev.rms, level.rms) : level.rms,
          peak: prev ? Math.max(prev.peak, level.peak) : level.peak,
          samples: (prev?.samples ?? 0) + 1,
        }
      }

      const floor = voiceNoiseFloorRef.current
      const adaptiveRms = Math.max(VOICE_MIN_RMS, (floor?.rms ?? 0) * 2.4)
      const adaptivePeak = Math.max(VOICE_MIN_PEAK, (floor?.peak ?? 0) * 2.0)
      const speaking = level.rms >= adaptiveRms || level.peak >= adaptivePeak
      if (speaking) {
        voiceSpeechFrameCountRef.current += 1
        voiceSpeechMsRef.current += VOICE_TURN_POLL_MS
        if (atlasVoiceConfirmsHumanSpeech({
          speaking,
          speechFrameCount: voiceSpeechFrameCountRef.current,
          speechStartedAtMs: now - voiceSpeechMsRef.current,
          nowMs: now,
          minSpeechFrames: VOICE_MIN_SPEECH_FRAMES,
          minSpeechMs: VOICE_MIN_CONFIRMED_SPEECH_MS,
        })) {
          voiceHeardSpeechRef.current = true
        }
        voiceSilenceSinceRef.current = null
        return
      }
      voiceSpeechFrameCountRef.current = 0

      if (atlasVoiceShouldDropSilentTurn({
        heardSpeech: voiceHeardSpeechRef.current,
        durationMs: level.durationMs,
        maxTurnMs: VOICE_MAX_TURN_MS,
      })) {
        voiceAutoFinishInFlightRef.current = true
        resetVoiceTurnDetection()
        await vox.cancel()
        scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS)
        return
      }

      if (!voiceHeardSpeechRef.current) return

      if (voiceSilenceSinceRef.current === null) {
        voiceSilenceSinceRef.current = now
        return
      }

      const silenceMs = now - voiceSilenceSinceRef.current
      if (level.durationMs >= VOICE_MIN_TURN_MS && silenceMs >= VOICE_SILENCE_MS_TO_SEND) {
        voiceAutoFinishInFlightRef.current = true
        await vox.finish()
      }
    }
    const interval = window.setInterval(() => {
      void tick()
    }, VOICE_TURN_POLL_MS)
    void tick()
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [
    resetVoiceTurnDetection,
    scheduleVoiceRearm,
    voiceReplyEnabled,
    vox.cancel,
    vox.finish,
    vox.session?.sessionId,
    vox.state,
  ])

  useEffect(() => {
    if (!voiceReplyEnabled) return
    if (atlas.sending || atlas.pendingTrace) return
    if (vox.state !== 'transcript_ready') return

    const text = (vox.transcriptDraft || vox.transcript?.text || '').trim()
    if (!text) return

    const transcriptKey = vox.transcript?.transcriptId ?? `${text}:${vox.session?.sessionId ?? 'no-session'}`
    if (lastVoiceSentTranscriptRef.current === transcriptKey) return
    lastVoiceSentTranscriptRef.current = transcriptKey

    clearVoiceRearmTimer()
    resetVoiceStreamingSpeech()
    resetVoiceTurnDetection()
    setVoiceSpeechError(null)
    vox.close()
    void (async () => {
      const trace = await atlas.send(text, {
        newThread: atlas.selectedThreadId === null,
        title: text.slice(0, 80),
        voiceConversation: true,
      })
      if (!trace && voiceReplyEnabledRef.current) {
        setVoiceSpeechError('Não consegui enviar esse turno. Grave de novo.')
        scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS)
      }
    })()
  }, [
    atlas,
    atlas.pendingTrace,
    atlas.selectedThreadId,
    atlas.sending,
    clearVoiceRearmTimer,
    resetVoiceStreamingSpeech,
    resetVoiceTurnDetection,
    scheduleVoiceRearm,
    voiceReplyEnabled,
    vox,
    vox.session?.sessionId,
    vox.state,
    vox.transcript?.text,
    vox.transcript?.transcriptId,
    vox.transcriptDraft,
  ])

  useEffect(() => {
    if (!voiceReplyEnabled) return
    if (!atlas.pendingTrace?.id) return
    if (voiceSpeechStateRef.current !== 'idle') return
    if (streamingSpeechTraceIdRef.current === atlas.pendingTrace.id) return
    const chunk = selectAtlasVoiceStreamingChunk(atlas.streamingText)
    if (!chunk) return

    const speechRunId = nextVoiceSpeechRunId()
    streamingSpeechTraceIdRef.current = atlas.pendingTrace.id
    streamingSpeechPrefixRef.current = chunk
    setVoiceSpeechError(null)
    setVoiceSpeechState('speaking')
    void speakAtlasAiText(chunk, {
      maxChars: VOICE_REPLY_STREAMING_MAX_CHARS,
      onEnd: () => {
        if (!isCurrentVoiceSpeechRun(speechRunId)) return
        setVoiceSpeechState('idle')
      },
      onError: (reason) => {
        if (!isCurrentVoiceSpeechRun(speechRunId)) return
        setVoiceSpeechError(humanizeAtlasVoiceSpeechError(reason))
        setVoiceSpeechState('idle')
      },
    }).then((spoke) => {
      if (!isCurrentVoiceSpeechRun(speechRunId)) return
      if (!spoke) {
        streamingSpeechPrefixRef.current = null
        setVoiceSpeechError((current) => current ?? 'Não consegui falar o início da resposta.')
        setVoiceSpeechState('unavailable')
      }
    })
  }, [
    atlas.pendingTrace?.id,
    atlas.streamingText,
    isCurrentVoiceSpeechRun,
    nextVoiceSpeechRunId,
    voiceReplyEnabled,
  ])

  useEffect(() => {
    if (!voiceReplyEnabled) return
    if (atlas.sending || atlas.pendingTrace || atlas.streamingText) return
    if (!latestAtlasMessage?.id || !latestAtlasMessage.content) return
    if (lastSpokenMessageIdRef.current === latestAtlasMessage.id) return
    if (voiceSpeechState !== 'idle') return
    const speechRunId = nextVoiceSpeechRunId()
    const streamingPrefix = streamingSpeechPrefixRef.current
    const finalSpeechText = remainingAtlasVoiceTextAfterStreaming(latestAtlasMessage.content, streamingPrefix)
    lastSpokenMessageIdRef.current = latestAtlasMessage.id

    if (streamingPrefix && finalSpeechText.length < 60) {
      resetVoiceStreamingSpeech()
      if (voiceReplyEnabledRef.current) scheduleVoiceRearm(VOICE_REARM_AFTER_REPLY_MS)
      return
    }

    setVoiceSpeechError(null)
    setVoiceSpeechState('speaking')
    void speakAtlasAiText(finalSpeechText, {
      maxChars: VOICE_REPLY_MAX_CHARS,
      onEnd: () => {
        if (!isCurrentVoiceSpeechRun(speechRunId)) return
        setVoiceSpeechState('idle')
        resetVoiceStreamingSpeech()
        if (!voiceReplyEnabledRef.current) return
        const cur = voxStateRef.current
        if (
          cur === 'starting' ||
          cur === 'listening' ||
          cur === 'finishing' ||
          cur === 'transcribing' ||
          cur === 'compiling' ||
          cur === 'executing' ||
          cur === 'eclipsed'
        ) {
          return
        }
        scheduleVoiceRearm(VOICE_REARM_AFTER_REPLY_MS)
      },
      onError: (reason) => {
        if (!isCurrentVoiceSpeechRun(speechRunId)) return
        setVoiceSpeechError(humanizeAtlasVoiceSpeechError(reason))
        setVoiceSpeechState('idle')
        resetVoiceStreamingSpeech()
      },
    }).then((spoke) => {
      if (!isCurrentVoiceSpeechRun(speechRunId)) return
      if (!spoke) {
        setVoiceSpeechError((current) => current ?? 'Não consegui falar a resposta. A resposta ficou na conversa.')
        setVoiceSpeechState('unavailable')
        resetVoiceStreamingSpeech()
      }
    })
  }, [
    atlas.pendingTrace,
    atlas.sending,
    atlas.streamingText,
    isCurrentVoiceSpeechRun,
    latestAtlasMessage?.content,
    latestAtlasMessage?.id,
    nextVoiceSpeechRunId,
    resetVoiceStreamingSpeech,
    scheduleVoiceRearm,
    voiceReplyEnabled,
    voiceSpeechState,
  ])

  useEffect(() => {
    if (!voiceReplyEnabled) {
      clearVoiceRearmTimer()
      return
    }
    if (atlas.sending || atlas.pendingTrace || atlas.streamingText.trim().length > 0) return
    if (voiceSpeechState !== 'idle') return
    if (vox.busy) return
    if (vox.state === 'closed' || vox.state === 'idle' || vox.state === 'cancelled' || vox.state === 'error') {
      scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS)
    }
    return clearVoiceRearmTimer
  }, [
    atlas.pendingTrace,
    atlas.sending,
    atlas.streamingText,
    clearVoiceRearmTimer,
    scheduleVoiceRearm,
    voiceReplyEnabled,
    voiceSpeechState,
    vox.busy,
    vox.state,
  ])

  useEffect(() => {
    if (!voiceReplyEnabled) return

    const heartbeat = window.setInterval(() => {
      if (!voiceReplyEnabledRef.current) return

      const speechStartedAt = voiceSpeechStartedAtRef.current
      if (
        voiceSpeechStateRef.current === 'speaking'
        && speechStartedAt !== null
        && Date.now() - speechStartedAt > VOICE_SPEAKING_WATCHDOG_MS
      ) {
        void stopAtlasAiSpeech()
        setVoiceSpeechState('idle')
        scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS)
        return
      }

      if (
        atlasVoiceBusyRef.current
        || voiceSpeechStateRef.current === 'speaking'
        || voxBusyRef.current
      ) {
        return
      }

      if (atlasVoiceCanStartNextTurn({
        voiceEnabled: voiceReplyEnabledRef.current,
        atlasBusy: atlasVoiceBusyRef.current,
        speechState: voiceSpeechStateRef.current,
        voxBusy: voxBusyRef.current,
        voxState: voxStateRef.current,
      })) {
        scheduleVoiceRearm(0)
      }
    }, VOICE_LOOP_HEARTBEAT_MS)

    return () => window.clearInterval(heartbeat)
  }, [scheduleVoiceRearm, voiceReplyEnabled])

  const handleRetryThreads = useCallback(async () => {
    setRetrying(true)
    try {
      await atlas.refreshThreads()
    } finally {
      setRetrying(false)
    }
  }, [atlas])

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      savePinned(next)
      return next
    })
  }, [])

  const handleThreadContextMenu = useCallback(
    (thread: AiThreadSummary, ev: React.MouseEvent) => {
      setCtxMenu({ thread, pos: { x: ev.clientX, y: ev.clientY } })
    },
    [],
  )

  const handleCopyContext = useCallback(
    async (threadId: string) => {
      const detail = await atlas.fetchThreadDetail(threadId)
      if (!detail) {
        await navigator.clipboard.writeText(`Atlas AI thread ${threadId} · backend indisponível para export.`).catch(() => {})
        return
      }
      const md = serializeThreadAsMarkdown(detail)
      try {
        await navigator.clipboard.writeText(md)
      } catch {
        /* clipboard sandbox safe ignore */
      }
    },
    [atlas],
  )

  const handleRename = useCallback(
    (thread: AiThreadSummary) => {
      const proposed = window.prompt('Renomear thread', thread.title?.trim() || '')
      if (proposed === null) return
      const trimmed = proposed.trim()
      if (trimmed === '' || trimmed === thread.title) return
      void atlas.renameThread(thread.id, trimmed)
    },
    [atlas],
  )

  const handleDelete = useCallback(
    (thread: AiThreadSummary) => {
      void atlas.closeThread(thread.id)
    },
    [atlas],
  )

  if (atlas.mode === 'offline') {
    return (
      <main className="atlas-ai-surface atlas-ai-stage atlas-ai-stage-fallback">
        <AtlasAiEmpty
          headline="Atlas AI offline"
          detail="Atlas Desktop está sem ligação com o kernel. Nenhuma thread é inventada — a conversa volta quando o backend responder."
        />
      </main>
    )
  }

  // Hero some no instante que o usuário envia (mesmo antes do createAiThread
  // retornar) — assim o operador vê a bolha otimista + indicator imediato.
  const isHero = atlas.selectedThreadId === null && atlas.pendingUserMessage === null

  return (
    <>
      {/* HEADER BAR — full-width acima dos rails (igual ObraBar do Code) */}
      <header className="atlas-ai-header-bar">
        <div className="atlas-ai-header-bar-start">
          <button
            type="button"
            className="atlas-ai-rail-toggle"
            onClick={toggleLeft}
            aria-pressed={!leftCollapsed}
            title={leftCollapsed ? 'Mostrar conversas (⌥⌘B)' : 'Esconder conversas (⌥⌘B)'}
            aria-label="Alternar lateral de conversas"
          >
            <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2.5" y="3.5" width="13" height="11" rx="1.5" />
              <line x1="7" y1="3.5" x2="7" y2="14.5" />
            </svg>
          </button>
          <div className="atlas-ai-header-bar-title">
            <h1>Atlas AI</h1>
            {activeWorkspaceName ? (
              <p className="atlas-ai-header-bar-sub">
                workspace · <span className="atlas-ai-header-bar-sub-name">{activeWorkspaceName}</span>
              </p>
            ) : (
              <p className="atlas-ai-header-bar-sub">uma única inteligência</p>
            )}
          </div>
          <AtlasAiRuntimeStatusPill
            readiness={runtimeReadiness}
            onOpenContext={!rightCollapsed ? undefined : toggleRight}
          />
        </div>
        <div className="atlas-ai-header-bar-meta">
          <button
            type="button"
            className={`atlas-ai-link atlas-ai-calmaria-toggle${calmaria ? ' is-active' : ''}`}
            onClick={toggleCalmaria}
            title={calmaria ? 'Calmaria ON · só texto + composer · Cmd+Shift+. alterna' : 'Calmaria · esconde badges/receipts/decisões · Cmd+Shift+. ativa'}
            aria-pressed={calmaria}
            aria-label="Alternar Calmaria mode"
          >
            <svg
              viewBox="0 0 14 14"
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="atlas-ai-calmaria-glyph"
            >
              <circle cx="7" cy="7" r="5.4" />
              <path d="M9.2 3 A4.4 4.4 0 0 0 9.2 11" fill="currentColor" stroke="none" opacity="0.85" />
            </svg>
            calmaria{calmaria ? <span className="atlas-ai-calmaria-on"> · ativa</span> : null}
          </button>
          <button
            type="button"
            className="atlas-ai-rail-toggle atlas-ai-rail-toggle-right"
            onClick={toggleRight}
            aria-pressed={!rightCollapsed}
            title={rightCollapsed ? 'Mostrar painel lateral (⌥⌘P)' : 'Esconder painel lateral (⌥⌘P)'}
            aria-label="Alternar painel lateral"
          >
            <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2.5" y="3.5" width="13" height="11" rx="1.5" />
              <line x1="11" y1="3.5" x2="11" y2="14.5" />
            </svg>
          </button>
        </div>
      </header>

      {/* LEFT RAIL — Conversas */}
      <aside className="atlas-ai-rail atlas-ai-rail-left" aria-label="Conversas Atlas AI">
        <AtlasAiThreadList
          threads={atlas.threads}
          loading={atlas.threadsLoading}
          error={atlas.threadsError}
          retrying={retrying}
          selectedId={atlas.selectedThreadId}
          modeFilter={atlas.modeFilter}
          onModeFilter={atlas.setModeFilter}
          onRefresh={handleRetryThreads}
          onSelect={atlas.selectThread}
          onNewThread={() => atlas.selectThread(null)}
          pinnedIds={pinnedIds}
          onContextMenu={handleThreadContextMenu}
        />
      </aside>

      {/* RESIZER LEFT */}
      <div
        ref={setLeftResizeNode}
        aria-label="Redimensionar lateral de conversas"
        className="atlas-ai-column-resizer atlas-ai-column-resizer-left"
        role="separator"
      />

      {/* STAGE central — hero ou conversation + composer integrado */}
      <main className={`atlas-ai-stage${isHero ? ' is-hero' : ''}`}>
        <div className="atlas-ai-stage-scroll">
          {isHero ? (
            <AtlasAiHero
              mode={atlas.composerMode}
              workspaceName={activeWorkspaceName}
              threadCount={atlas.threads.length}
              onUseChip={handleUseChip}
            />
          ) : (
            <AtlasAiConversation
              loading={conversation.loading}
              detail={conversation.detail}
              error={conversation.error}
              pendingTrace={conversation.pendingTrace}
              pendingUserMessage={conversation.pendingUserMessage}
              streamingText={conversation.streamingText}
              sending={conversation.sending}
              onArchive={atlas.archiveSelectedThread}
              onPromote={() => setPromotionOpen(true)}
              onCancel={atlas.cancelPending}
              atlasDevPlan={atlas.currentAtlasDevPlan}
            />
          )}
        </div>

        <div
          className="atlas-ai-stage-composer"
          style={{
            ['--composer-width' as string]: `${composerSize.size.width}px`,
            ['--composer-textarea-max' as string]: `${composerSize.size.height}px`,
          }}
        >
          <div className="atlas-ai-composer-wrap">
            {/* Handle LARGURA · borda esquerda, drag horizontal */}
            <button
              type="button"
              className="atlas-ai-composer-resize-w"
              onMouseDown={composerSize.startWidthDrag}
              onDoubleClick={composerSize.reset}
              title="Arraste lateralmente pra ajustar largura · double-click reseta"
              aria-label="Ajustar largura do composer"
            />
            {/* Handle ALTURA · borda superior, drag vertical */}
            <button
              type="button"
              className="atlas-ai-composer-resize-h"
              onMouseDown={composerSize.startHeightDrag}
              onDoubleClick={composerSize.reset}
              title="Arraste verticalmente pra ajustar altura · double-click reseta"
              aria-label="Ajustar altura do composer"
            />
            <AtlasAiComposer
              draft={composerDraft}
              onChange={setComposerDraft}
              mode={atlas.composerMode}
              onModeChange={atlas.setComposerMode}
              task={atlas.composerTask}
              onTaskChange={atlas.setComposerTask}
              provider={atlas.composerProvider}
              onProviderChange={atlas.setComposerProvider}
              sending={atlas.sending}
              sendError={atlas.sendError}
              workspaceSlug={atlas.workspaceSlug ?? atlas.threadDetail?.workspace ?? null}
              textareaMaxPx={composerSize.size.height}
              onSend={(extras) =>
                handleSend({
                  newThread: extras?.newThread ?? atlas.selectedThreadId === null,
                  attachments: extras?.attachments,
                  richInputCanonical: extras?.richInputCanonical,
                })
              }
              onSendInNew={(extras) =>
                handleSend({
                  newThread: true,
                  attachments: extras?.attachments,
                  richInputCanonical: extras?.richInputCanonical,
                })
              }
              onVoxClick={handleVoxToggle}
              voxState={vox.state}
              voiceReplyEnabled={voiceReplyEnabled}
              onVoiceReplyToggle={handleVoiceConversationToggle}
            />
            {voiceReplyEnabled ? (
              <AtlasAiVoiceConversationOverlay
                vox={vox}
                sending={atlas.sending}
                awaitingResponse={atlas.pendingTrace !== null}
                streaming={atlas.streamingText.trim().length > 0}
                speechState={voiceSpeechState}
                speechError={voiceSpeechError}
                sendError={atlas.sendError}
                onStop={() => void stopVoiceConversation()}
                onInterrupt={() => void interruptVoiceConversation()}
              />
            ) : (
              <VoxOverlay controller={vox} />
            )}
          </div>
        </div>
      </main>

      {/* RESIZER RIGHT */}
      <div
        ref={setRightResizeNode}
        aria-label="Redimensionar painel lateral"
        className="atlas-ai-column-resizer atlas-ai-column-resizer-right"
        role="separator"
      />

      {/* RIGHT RAIL — Contexto / Plano */}
      <aside className="atlas-ai-rail atlas-ai-rail-right" aria-label="Contexto Atlas AI">
        <AtlasAiSidePanel
          workspaceSlug={atlas.workspaceSlug}
          workspaceName={activeWorkspaceName}
          thread={atlas.threadDetail}
          pendingTrace={atlas.pendingTrace}
          mode={atlas.composerMode}
          task={atlas.composerTask}
          provider={atlas.composerProvider}
          atlasDevPlan={atlas.currentAtlasDevPlan}
          atlasDevPlanLoading={atlas.atlasDevPlanLoading}
          atlasDevPlanError={atlas.atlasDevPlanError}
          atlasDevPlanUnavailable={atlas.atlasDevPlanUnavailable}
        />
      </aside>

      <AtlasAiPromotionPanel
        open={promotionOpen}
        threadId={atlas.selectedThreadId}
        workspaceSlug={atlas.workspaceSlug}
        onClose={() => setPromotionOpen(false)}
        onPromoted={() => {
          if (atlas.selectedThreadId) atlas.selectThread(atlas.selectedThreadId)
          void atlas.refreshThreads()
        }}
      />

      {ctxMenu ? (
        <AtlasAiThreadContextMenu
          pos={ctxMenu.pos}
          threadTitle={ctxMenu.thread.title?.trim() || '(sem título)'}
          actions={{
            isPinned: pinnedIds.has(ctxMenu.thread.id),
            onPin: () => togglePin(ctxMenu.thread.id),
            onRename: () => handleRename(ctxMenu.thread),
            onArchive: () => void atlas.archiveThread(ctxMenu.thread.id),
            onCopyId: () => {
              void navigator.clipboard.writeText(ctxMenu.thread.id).catch(() => {})
            },
            onCopyContext: () => handleCopyContext(ctxMenu.thread.id),
            onDelete: () => handleDelete(ctxMenu.thread),
          }}
          onClose={() => setCtxMenu(null)}
        />
      ) : null}
    </>
  )
}
