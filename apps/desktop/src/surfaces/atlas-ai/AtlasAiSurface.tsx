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
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import type { AtlasWorkspaceProfile, AtlasWorkspaceProfileList } from '@atlas/domain'
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
import { AtlasAiWorkspacePicker } from './components/AtlasAiWorkspacePicker'
import { AtlasAiThreadContextMenu, type ContextMenuPos } from './components/AtlasAiThreadContextMenu'
import { ATLAS_AI_THREAD_DRAG_CLEAR_EVENT, AtlasAiThreadList } from './components/AtlasAiThreadList'
import {
  AtlasAiVoiceConversationOverlay,
  type AtlasAiVoiceSpeechState,
} from './components/AtlasAiVoiceConversationOverlay'
import { useRuntimeReadiness } from './useRuntimeReadiness'
import { applyAwisOperationalHealth } from './runtimeReadinessView'
import { useAtlasAiColumnSizing } from './layout/useAtlasAiColumnSizing'
import { serializeThreadAsMarkdown } from './threadExport'
import { useAtlasAi } from './useAtlasAi'
import { getAtlasAwisLearningLoop, getAtlasServerHealth } from './client'
import {
  evaluateAwisWorkspaceIntelligence,
  type AwisLearningLoopState,
  type AwisServerHealthState,
  type AwisWorkspaceIntelligence,
} from './awisIntelligence'
import {
  nextWorkbenchFocusAfterClose,
  nextWorkbenchThreadSelection,
  pickWorkbenchRecordKeys,
  pruneWorkbenchScope,
} from './workbenchSelection'
import { atlasAiWorkspaceScopeFromProfile, threadBelongsToWorkspace } from './workspaceScope'
import {
  atlasVoiceAcceptsSpeechRunEvent,
  atlasVoiceCanResetStaleTurn,
  atlasVoiceCanStartNextTurn,
  atlasVoiceConfirmsHumanSpeech,
  atlasVoiceDecideTranscriptDispatch,
  atlasVoiceEndpointSilenceMs,
  atlasVoiceIsAtlasBusy,
  atlasVoiceNextSpeechWindow,
  atlasVoiceShouldRecoverAwaitingReply,
  atlasVoiceShouldDropSilentTurn,
  atlasVoiceShouldDropTranscript,
  atlasVoiceShouldFinishTurn,
} from './atlasAiVoiceContinuity'
import { speakAtlasAiText, stopAtlasAiSpeech } from './atlasAiVoiceReply'
import { useCalmaria } from './useCalmaria'
import { useComposerSize } from './useComposerSize'
import type { AiThreadDetail, AiThreadSummary } from './types'
import './atlas-ai.css'

interface WorkbenchPaneDetail {
  detail: AiThreadDetail | null
  loading: boolean
  error: string | null
}

const PINNED_STORAGE = 'atlas-desktop:atlas-ai-pinned-threads'
const WORKBENCH_SNAPSHOTS_STORAGE = 'atlas-desktop:atlas-ai-workbench-snapshots'
const VOICE_TURN_POLL_MS = 80
const VOICE_MIN_RMS = 0.0015
const VOICE_MIN_PEAK = 0.008
const VOICE_SHORT_UTTERANCE_SILENCE_MS = 3_200
const VOICE_LONG_UTTERANCE_SILENCE_MS = 2_200
const VOICE_LONG_UTTERANCE_SPEECH_MS = 4_000
const VOICE_MIN_TURN_MS = 900
const VOICE_MAX_TURN_MS = 24_000
const VOICE_MIN_SPEECH_FRAMES = 8
const VOICE_MIN_CONFIRMED_SPEECH_MS = 700
const VOICE_REPLY_MAX_CHARS = 1_000
const VOICE_REPLY_STREAMING_MAX_CHARS = 320
const VOICE_REPLY_STREAMING_MIN_CHARS = 90
const VOICE_REARM_AFTER_REPLY_MS = 120
const VOICE_ECHO_GUARD_AFTER_SPEECH_MS = 900
const VOICE_REARM_WATCHDOG_MS = 350
const VOICE_LOOP_HEARTBEAT_MS = 500
const VOICE_REARM_VERIFY_MS = 650
const VOICE_REARM_MAX_ATTEMPTS = 4
const VOICE_SPEAKING_WATCHDOG_MS = 45_000
const VOICE_AWAITING_REPLY_WATCHDOG_MS = 75_000

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

interface WorkbenchSnapshot {
  threadIds: string[]
  focusedThreadId: string | null
  updatedAt: number
}

function loadWorkbenchSnapshots(): Record<string, WorkbenchSnapshot> {
  try {
    const raw = localStorage.getItem(WORKBENCH_SNAPSHOTS_STORAGE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const snapshots: Record<string, WorkbenchSnapshot> = {}
    for (const [slug, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue
      const candidate = value as Partial<WorkbenchSnapshot>
      const threadIds = Array.isArray(candidate.threadIds)
        ? Array.from(new Set(candidate.threadIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))).slice(0, 4)
        : []
      if (threadIds.length === 0) continue
      const focusedThreadId =
        typeof candidate.focusedThreadId === 'string' && threadIds.includes(candidate.focusedThreadId)
          ? candidate.focusedThreadId
          : threadIds[0] ?? null
      snapshots[slug] = {
        threadIds,
        focusedThreadId,
        updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : 0,
      }
    }
    return snapshots
  } catch {
    return {}
  }
}

function saveWorkbenchSnapshot(workspaceSlug: string, snapshot: WorkbenchSnapshot | null) {
  if (!workspaceSlug) return
  try {
    const snapshots = loadWorkbenchSnapshots()
    if (snapshot && snapshot.threadIds.length > 0) {
      snapshots[workspaceSlug] = snapshot
    } else {
      delete snapshots[workspaceSlug]
    }
    localStorage.setItem(WORKBENCH_SNAPSHOTS_STORAGE, JSON.stringify(snapshots))
  } catch {
    /* ignore */
  }
}

function restoreWorkbenchSnapshot(workspaceSlug: string, availableThreadIds: Set<string>): WorkbenchSnapshot | null {
  const snapshot = loadWorkbenchSnapshots()[workspaceSlug]
  if (!snapshot) return null
  const threadIds = snapshot.threadIds.filter((id) => availableThreadIds.has(id)).slice(0, 4)
  if (threadIds.length === 0) return null
  const focusedThreadId =
    snapshot.focusedThreadId && threadIds.includes(snapshot.focusedThreadId)
      ? snapshot.focusedThreadId
      : threadIds[0] ?? null
  return { threadIds, focusedThreadId, updatedAt: snapshot.updatedAt }
}

function omitRecordKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record
  const next = { ...record }
  delete next[key]
  return next
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

function workspaceSlugFromThread(thread: AiThreadDetail | null): string | null {
  const meta = thread?.metadata ?? {}
  const candidates = [
    typeof meta.workspace_slug === 'string' ? meta.workspace_slug : null,
    thread?.workspace ?? null,
  ]
  for (const candidate of candidates) {
    const trimmed = candidate?.trim()
    if (trimmed) return trimmed
  }
  return null
}

function workspaceKey(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const parts = trimmed.split(/[\\/]+/).filter(Boolean)
  return (parts.at(-1) ?? trimmed).toLowerCase()
}

function profileMatchesWorkspaceValue(profile: AtlasWorkspaceProfile, value: string | null | undefined): boolean {
  const raw = value?.trim()
  if (!raw) return false
  const key = workspaceKey(raw)
  return profile.slug === raw
    || profile.workspacePath === raw
    || profile.slug.toLowerCase() === key
    || workspaceKey(profile.workspacePath) === key
}

interface AtlasAiSurfaceProps {
  activeWorkspaceSlug?: string | null
  activeWorkspaceName?: string | null
  activeWorkspace?: AtlasWorkspaceProfile | null
  workspaces?: AtlasWorkspaceProfileList | null
  defaultWorkspaceSlug?: string | null
  onRequestSurfaceChange?: (surface: Surface) => void
  onSelectWorkspace?: (slug: string) => Promise<void> | void
  onOpenWorkspaceProfile?: (mode?: 'view' | 'create' | 'edit') => void
  onChooseWorkspaceFolder?: () => Promise<boolean | void> | boolean | void
}

export function AtlasAiSurface({
  activeWorkspaceSlug = null,
  activeWorkspaceName = null,
  activeWorkspace = null,
  workspaces = null,
  defaultWorkspaceSlug = null,
  onSelectWorkspace,
  onOpenWorkspaceProfile,
  onChooseWorkspaceFolder,
}: AtlasAiSurfaceProps) {
  const shellWorkspaceSlug = activeWorkspaceSlug ?? activeWorkspace?.slug ?? defaultWorkspaceSlug ?? 'atlas'
  const atlas = useAtlasAi(shellWorkspaceSlug, activeWorkspace?.workspacePath || null)
  const [workspaceLock, setWorkspaceLock] = useState<{
    slug: string
    name: string | null
    path: string | null
  } | null>(null)
  const conversationWorkspaceOpen = atlas.selectedThreadId !== null || atlas.pendingUserMessage !== null
  const lockedWorkspaceSlug = workspaceLock?.slug ?? null
  const effectiveWorkspaceSlug = lockedWorkspaceSlug ?? shellWorkspaceSlug
  const effectiveWorkspaceProfile = useMemo(
    () => workspaces?.profiles.find((profile) => profile.slug === effectiveWorkspaceSlug)
      ?? (activeWorkspace?.slug === effectiveWorkspaceSlug ? activeWorkspace : null),
    [activeWorkspace, effectiveWorkspaceSlug, workspaces?.profiles],
  )
  const effectiveWorkspaceName =
    workspaceLock?.name
    ?? effectiveWorkspaceProfile?.name
    ?? (activeWorkspace?.slug === effectiveWorkspaceSlug ? activeWorkspaceName : null)
    ?? effectiveWorkspaceSlug
  const effectiveWorkspacePath =
    workspaceLock?.path
    ?? effectiveWorkspaceProfile?.workspacePath
    ?? (activeWorkspace?.slug === effectiveWorkspaceSlug ? activeWorkspace?.workspacePath : null)
    ?? null
  const activeWorkspaceScope = useMemo(
    () => atlasAiWorkspaceScopeFromProfile(effectiveWorkspaceSlug, effectiveWorkspaceProfile),
    [effectiveWorkspaceProfile, effectiveWorkspaceSlug],
  )
  const effectiveWorkspaceHasRepo = effectiveWorkspaceProfile?.workspacePathExists === true
  const effectiveWorkspaceFolderLabel = effectiveWorkspaceHasRepo
    ? 'Pasta pronta'
    : effectiveWorkspacePath
      ? 'Pasta ausente'
      : 'Sem pasta local'
  const effectiveWorkspaceScopeLabel = effectiveWorkspaceHasRepo ? 'projeto' : 'contexto'
  const runtimeReadiness = useRuntimeReadiness()
  const { calmaria, toggle: toggleCalmaria } = useCalmaria()
  const composerSize = useComposerSize()
  const [composerDraft, setComposerDraft] = useState<string>('')
  const [workbenchThreadIds, setWorkbenchThreadIds] = useState<string[]>([])
  const [workbenchActive, setWorkbenchActive] = useState<boolean>(false)
  const [workbenchFocusedThreadId, setWorkbenchFocusedThreadId] = useState<string | null>(null)
  const [workbenchDrafts, setWorkbenchDrafts] = useState<Record<string, string>>({})
  const [workbenchDetails, setWorkbenchDetails] = useState<Record<string, WorkbenchPaneDetail>>({})
  const [workbenchPendingThreadId, setWorkbenchPendingThreadId] = useState<string | null>(null)
  const [workbenchNotice, setWorkbenchNotice] = useState<string | null>(null)
  const [storedWorkbenchThreadIds, setStoredWorkbenchThreadIds] = useState<string[]>([])
  const [projectSpaceCount, setProjectSpaceCount] = useState(0)
  const [awisLearningLoop, setAwisLearningLoop] = useState<AwisLearningLoopState | null>(null)
  const [awisServerHealth, setAwisServerHealth] = useState<AwisServerHealthState | null>(null)
  const [awisHealthRefreshKey, setAwisHealthRefreshKey] = useState(0)
  const [stageThreadDropActive, setStageThreadDropActive] = useState<boolean>(false)
  const [threadDragClearSignal, setThreadDragClearSignal] = useState(0)
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
  const voiceLoopEpochRef = useRef<number>(0)
  const voxStartRef = useRef<(() => Promise<void>) | null>(null)
  const voxCloseRef = useRef<(() => void) | null>(null)
  const voxStateRef = useRef<string>('closed')
  const voxBusyRef = useRef<boolean>(false)
  const voxTranscriptKeyRef = useRef<string | null>(null)
  const voiceSpeechStateRef = useRef<AtlasAiVoiceSpeechState>('idle')
  const atlasVoiceBusyRef = useRef<boolean>(false)
  const voiceRearmTimerRef = useRef<number | null>(null)
  const voiceSpeechRunIdRef = useRef<number>(0)
  const voiceSpeechStartedAtRef = useRef<number | null>(null)
  const voiceLastSpeechEndedAtRef = useRef<number>(0)
  const voiceHeardSpeechRef = useRef<boolean>(false)
  const voiceSpeechFrameCountRef = useRef<number>(0)
  const voiceSpeechMsRef = useRef<number>(0)
  const voiceConfirmedSpeechMsRef = useRef<number>(0)
  const voiceSilenceSinceRef = useRef<number | null>(null)
  const voiceAutoFinishInFlightRef = useRef<boolean>(false)
  const voiceTurnDispatchInFlightRef = useRef<boolean>(false)
  const voiceAwaitingReplyRef = useRef<boolean>(false)
  const voiceAwaitingReplyStartedAtRef = useRef<number | null>(null)
  const voiceNoiseFloorRef = useRef<{ rms: number; peak: number; samples: number } | null>(null)
  const voiceRearmAttemptRef = useRef<number>(0)
  const voicePendingContinuationRef = useRef<string | null>(null)
  const shellWorkspaceSyncRef = useRef<string | null>(null)
  const workbenchNoticeTimerRef = useRef<number | null>(null)
  const awisHistoryRecoveryErrorRef = useRef<string | null>(null)

  // Layout rails (drag-resize + collapse persist)
  const { setLeftResizeNode, setRightResizeNode } = useAtlasAiColumnSizing()
  const leftCollapsed = useAtlasAiLayoutStore((s) => s.leftCollapsed)
  const rightCollapsed = useAtlasAiLayoutStore((s) => s.rightCollapsed)
  const toggleLeft = useAtlasAiLayoutStore((s) => s.toggleLeftCollapsed)
  const toggleRight = useAtlasAiLayoutStore((s) => s.toggleRightCollapsed)

  const refreshAwisHealth = useCallback(() => {
    setAwisHealthRefreshKey((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!conversationWorkspaceOpen) {
      setWorkspaceLock(null)
      shellWorkspaceSyncRef.current = null
      return
    }

    const detailWorkspace = workspaceSlugFromThread(atlas.threadDetail)
    const profile = workspaces?.profiles.find((item) => profileMatchesWorkspaceValue(item, detailWorkspace))
      ?? (activeWorkspace && profileMatchesWorkspaceValue(activeWorkspace, detailWorkspace) ? activeWorkspace : null)
    const nextSlug = profile?.slug ?? detailWorkspace ?? workspaceLock?.slug ?? atlas.workspaceSlug ?? shellWorkspaceSlug
    const nextPath = profile?.workspacePath
      ?? (detailWorkspace && /[\\/]/.test(detailWorkspace) ? detailWorkspace : null)
      ?? (nextSlug === atlas.workspaceSlug ? atlas.workspacePath : null)
      ?? (nextSlug === shellWorkspaceSlug ? activeWorkspace?.workspacePath : null)
      ?? (detailWorkspace ? null : workspaceLock?.path)
      ?? null
    const nextName = profile?.name
      ?? (nextSlug === shellWorkspaceSlug ? activeWorkspaceName : null)
      ?? (detailWorkspace ? workspaceKey(detailWorkspace) : workspaceLock?.name)
      ?? nextSlug

    if (
      workspaceLock?.slug !== nextSlug ||
      workspaceLock?.path !== nextPath ||
      workspaceLock?.name !== nextName
    ) {
      setWorkspaceLock({ slug: nextSlug, name: nextName, path: nextPath })
    }
  }, [
    activeWorkspace,
    activeWorkspaceName,
    atlas.threadDetail,
    atlas.workspacePath,
    atlas.workspaceSlug,
    conversationWorkspaceOpen,
    shellWorkspaceSlug,
    workspaces?.profiles,
    workspaceLock,
  ])

  useEffect(() => {
    const lockedSlug = workspaceLock?.slug ?? null
    if (!conversationWorkspaceOpen || !lockedSlug || !onSelectWorkspace || effectiveWorkspaceProfile?.slug !== lockedSlug) return
    if (lockedSlug === shellWorkspaceSlug) {
      if (shellWorkspaceSyncRef.current === lockedSlug) shellWorkspaceSyncRef.current = null
      return
    }
    if (shellWorkspaceSyncRef.current === lockedSlug) return

    shellWorkspaceSyncRef.current = lockedSlug
    void Promise.resolve(onSelectWorkspace(lockedSlug)).catch(() => {
      shellWorkspaceSyncRef.current = null
    })
  }, [conversationWorkspaceOpen, effectiveWorkspaceProfile?.slug, onSelectWorkspace, shellWorkspaceSlug, workspaceLock?.slug])

  // Sincroniza workspace selecionado quando o topbar do shell muda. Durante uma
  // conversa, o escopo fica congelado no workspace original para impedir que a
  // thread misture repositórios no meio do fluxo.
  const { workspaceSlug, workspacePath, setWorkspaceSlug, setWorkspacePath } = atlas
  useEffect(() => {
    if (effectiveWorkspaceSlug !== workspaceSlug) {
      setWorkspaceSlug(effectiveWorkspaceSlug)
    }
    const nextWorkspacePath = effectiveWorkspacePath || null
    if (nextWorkspacePath !== workspacePath) {
      setWorkspacePath(nextWorkspacePath)
    }
  }, [effectiveWorkspaceSlug, effectiveWorkspacePath, workspaceSlug, workspacePath, setWorkspaceSlug, setWorkspacePath])

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

  const availableWorkspaceThreadIds = useMemo(
    () => new Set(
      atlas.threads
        .filter((thread) => threadBelongsToWorkspace(thread, activeWorkspaceScope))
        .map((thread) => thread.id),
    ),
    [activeWorkspaceScope, atlas.threads],
  )
  const availableWorkspaceThreadKey = useMemo(
    () => Array.from(availableWorkspaceThreadIds).sort().join('|'),
    [availableWorkspaceThreadIds],
  )
  const activeWorkspaceThreadCount = availableWorkspaceThreadIds.size

  const handleSelectThread = useCallback(
    (id: string) => {
      setWorkbenchActive(false)
      setWorkbenchThreadIds([id])
      setWorkbenchFocusedThreadId(id)
      atlas.selectThread(id)
    },
    [atlas],
  )

  const showWorkbenchNotice = useCallback((message: string) => {
    setWorkbenchNotice(message)
    if (workbenchNoticeTimerRef.current !== null) {
      window.clearTimeout(workbenchNoticeTimerRef.current)
    }
    workbenchNoticeTimerRef.current = window.setTimeout(() => {
      setWorkbenchNotice(null)
      workbenchNoticeTimerRef.current = null
    }, 2400)
  }, [])

  const handleAwisConfigureProject = useCallback(() => {
    onOpenWorkspaceProfile?.(effectiveWorkspaceProfile ? 'edit' : 'create')
  }, [effectiveWorkspaceProfile, onOpenWorkspaceProfile])

  const handleAwisChooseFolder = useCallback(async () => {
    if (!onChooseWorkspaceFolder) {
      handleAwisConfigureProject()
      return
    }
    const changed = await onChooseWorkspaceFolder()
    if (changed) {
      showWorkbenchNotice('Pasta local vinculada. AWIS pronto para contexto e execução.')
      refreshAwisHealth()
    }
  }, [
    handleAwisConfigureProject,
    onChooseWorkspaceFolder,
    refreshAwisHealth,
    showWorkbenchNotice,
  ])

  useEffect(() => () => {
    if (workbenchNoticeTimerRef.current !== null) {
      window.clearTimeout(workbenchNoticeTimerRef.current)
    }
  }, [])

  const focusWorkbenchPane = useCallback(
    (id: string | null) => {
      setWorkbenchFocusedThreadId(id)
      if (id) atlas.selectThread(id)
    },
    [atlas],
  )

  const handleOpenThreadBeside = useCallback(
    (id: string) => {
      if (!availableWorkspaceThreadIds.has(id)) {
        showWorkbenchNotice('Abra o projeto desta conversa para comparar sessões.')
        return
      }
      const selectedThreadId = atlas.selectedThreadId && availableWorkspaceThreadIds.has(atlas.selectedThreadId)
        ? atlas.selectedThreadId
        : null
      const scopedWorkbenchThreadIds = workbenchThreadIds.filter((threadId) => availableWorkspaceThreadIds.has(threadId))
      const next = nextWorkbenchThreadSelection(scopedWorkbenchThreadIds, selectedThreadId, id)
      if (next.atLimit) {
        showWorkbenchNotice('Limite de 4 sessões. Feche uma para abrir outra.')
      }
      setWorkbenchActive(true)
      setWorkbenchThreadIds(next.threadIds)
      if (next.threadIds.includes(id)) {
        focusWorkbenchPane(id)
      }
    },
    [availableWorkspaceThreadIds, focusWorkbenchPane, showWorkbenchNotice, workbenchThreadIds],
  )

  const handleAddThreadToWorkbench = useCallback(
    (id: string) => {
      if (!id) return
      if (!availableWorkspaceThreadIds.has(id)) {
        showWorkbenchNotice('Abra o projeto desta conversa para comparar sessões.')
        return
      }
      const selectedThreadId = atlas.selectedThreadId && availableWorkspaceThreadIds.has(atlas.selectedThreadId)
        ? atlas.selectedThreadId
        : null
      const scopedWorkbenchThreadIds = workbenchThreadIds.filter((threadId) => availableWorkspaceThreadIds.has(threadId))
      const next = nextWorkbenchThreadSelection(scopedWorkbenchThreadIds, selectedThreadId, id)
      if (next.atLimit) {
        showWorkbenchNotice('Limite de 4 sessões. Feche uma para abrir outra.')
      }
      setWorkbenchActive(true)
      setWorkbenchThreadIds(next.threadIds)
      if (next.threadIds.includes(id)) {
        focusWorkbenchPane(id)
      }
    },
    [availableWorkspaceThreadIds, focusWorkbenchPane, showWorkbenchNotice, workbenchThreadIds],
  )

  const clearThreadDragVisualState = useCallback(() => {
    setThreadDragClearSignal((value) => value + 1)
    window.dispatchEvent(new CustomEvent(ATLAS_AI_THREAD_DRAG_CLEAR_EVENT))
  }, [])

  const handleOpenThreadInStage = useCallback(
    (id: string) => {
      handleAddThreadToWorkbench(id)
      clearThreadDragVisualState()
    },
    [clearThreadDragVisualState, handleAddThreadToWorkbench],
  )

  const threadIdFromDragEvent = useCallback((event: DragEvent<HTMLElement>) => {
    return (
      event.dataTransfer.getData('application/x-atlas-ai-thread-id') ||
      event.dataTransfer.getData('text/x-atlas-ai-thread-id')
    )
  }, [])

  const stageAcceptsThreadDrop = useCallback((event: DragEvent<HTMLElement>) => {
    const types = Array.from(event.dataTransfer.types)
    return types.includes('application/x-atlas-ai-thread-id') || types.includes('text/x-atlas-ai-thread-id')
  }, [])

  useEffect(() => {
    const clearStageDrop = () => setStageThreadDropActive(false)
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearStageDrop()
    }
    window.addEventListener('dragend', clearStageDrop)
    window.addEventListener('drop', clearStageDrop)
    window.addEventListener('mouseup', clearStageDrop)
    window.addEventListener('pointerup', clearStageDrop)
    window.addEventListener('blur', clearStageDrop)
    window.addEventListener('keydown', clearOnEscape)
    return () => {
      window.removeEventListener('dragend', clearStageDrop)
      window.removeEventListener('drop', clearStageDrop)
      window.removeEventListener('mouseup', clearStageDrop)
      window.removeEventListener('pointerup', clearStageDrop)
      window.removeEventListener('blur', clearStageDrop)
      window.removeEventListener('keydown', clearOnEscape)
    }
  }, [])

  useEffect(() => {
    if (workbenchThreadIds.length === 0) return
    const next = pruneWorkbenchScope({
      threadIds: workbenchThreadIds,
      availableThreadIds: availableWorkspaceThreadIds,
      focusedThreadId: workbenchFocusedThreadId,
      pendingThreadId: workbenchPendingThreadId,
      active: workbenchActive,
    })
    if (!next.changed) return

    const scopedSet = new Set(next.threadIds)
    setWorkbenchThreadIds(next.threadIds)
    setWorkbenchDrafts((prev) => pickWorkbenchRecordKeys(prev, scopedSet))
    setWorkbenchDetails((prev) => pickWorkbenchRecordKeys(prev, scopedSet))
    setWorkbenchPendingThreadId(next.pendingThreadId)
    setWorkbenchActive(next.active)
    setWorkbenchFocusedThreadId(next.focusedThreadId)
    if (next.focusedThreadId !== workbenchFocusedThreadId) {
      atlas.selectThread(next.focusedThreadId)
    }
  }, [
    atlas,
    availableWorkspaceThreadIds,
    availableWorkspaceThreadKey,
    workbenchActive,
    workbenchFocusedThreadId,
    workbenchPendingThreadId,
    workbenchThreadIds,
  ])

  useEffect(() => {
    const snapshot = restoreWorkbenchSnapshot(effectiveWorkspaceSlug, availableWorkspaceThreadIds)
    setStoredWorkbenchThreadIds(snapshot?.threadIds ?? [])
  }, [availableWorkspaceThreadIds, availableWorkspaceThreadKey, effectiveWorkspaceSlug])

  useEffect(() => {
    if (workbenchActive && workbenchThreadIds.length > 0) {
      const scopedThreadIds = workbenchThreadIds
        .filter((threadId) => availableWorkspaceThreadIds.has(threadId))
        .slice(0, 4)
      if (scopedThreadIds.length === 0) {
        saveWorkbenchSnapshot(effectiveWorkspaceSlug, null)
        setStoredWorkbenchThreadIds([])
        return
      }
      saveWorkbenchSnapshot(effectiveWorkspaceSlug, {
        threadIds: scopedThreadIds,
        focusedThreadId: workbenchFocusedThreadId && scopedThreadIds.includes(workbenchFocusedThreadId)
          ? workbenchFocusedThreadId
          : scopedThreadIds[0] ?? null,
        updatedAt: Date.now(),
      })
      setStoredWorkbenchThreadIds(scopedThreadIds)
      return
    }
    if (!workbenchActive && workbenchThreadIds.length === 0) {
      saveWorkbenchSnapshot(effectiveWorkspaceSlug, null)
      setStoredWorkbenchThreadIds([])
    }
  }, [availableWorkspaceThreadIds, effectiveWorkspaceSlug, workbenchActive, workbenchFocusedThreadId, workbenchThreadIds])

  useEffect(() => {
    if (atlas.mode === 'offline') {
      setAwisServerHealth({ status: 'unavailable', dbConnected: null, overallOk: false })
      return
    }

    let cancelled = false
    setAwisServerHealth((prev) => prev ?? { status: 'loading', dbConnected: null, overallOk: null })
    void getAtlasServerHealth().then((health) => {
      if (cancelled) return
      if (!health) {
        setAwisServerHealth({ status: 'unavailable', dbConnected: null, overallOk: false })
        return
      }
      const dbConnected = health.db_connected ?? null
      const overallOk = health.overall_ok ?? null
      const storage = health.checks?.storage ?? null
      const storageOk = typeof storage?.ok === 'boolean' ? storage.ok : null
      const storageWritable = typeof storage?.writable === 'boolean' ? storage.writable : null
      const storagePath = typeof storage?.path === 'string' ? storage.path : null
      const storageHealthy = storageOk !== false && storageWritable !== false
      setAwisServerHealth({
        status: health.status === 'ok' && overallOk !== false && dbConnected !== false && storageHealthy ? 'ready' : 'degraded',
        dbConnected,
        overallOk,
        storageOk,
        storageWritable,
        storagePath,
        detail: health.service || 'atlas-server',
      })
    })
    return () => {
      cancelled = true
    }
  }, [atlas.mode, awisHealthRefreshKey, retrying])

  useEffect(() => {
    const currentError = atlas.threadsError?.trim() || null
    if (!currentError) {
      awisHistoryRecoveryErrorRef.current = null
      return
    }
    if (
      awisServerHealth?.status !== 'ready' ||
      awisServerHealth.overallOk === false ||
      awisServerHealth.dbConnected === false ||
      retrying
    ) {
      return
    }
    if (awisHistoryRecoveryErrorRef.current === currentError) return

    awisHistoryRecoveryErrorRef.current = currentError
    void Promise.resolve().then(async () => {
      await atlas.refreshThreads()
      await atlas.refreshConversationFusion()
    })
  }, [
    atlas.refreshConversationFusion,
    atlas.refreshThreads,
    atlas.threadsError,
    awisServerHealth?.dbConnected,
    awisServerHealth?.overallOk,
    awisServerHealth?.status,
    retrying,
  ])

  useEffect(() => {
    const workspace = effectiveWorkspaceSlug?.trim()
    if (!workspace || atlas.mode === 'offline') {
      setAwisLearningLoop(null)
      return
    }

    let cancelled = false
    setAwisLearningLoop((prev) => prev ?? { status: 'loading', loopClosed: false })
    const task = atlas.threadDetail?.title?.trim() || 'Atlas AI workspace'
    void getAtlasAwisLearningLoop(workspace, task).then((loop) => {
      if (cancelled) return
      if (!loop) {
        setAwisLearningLoop({ status: 'unavailable', loopClosed: false })
        return
      }
      const status =
        loop.status === 'ready'
          ? 'ready'
          : loop.status === 'blocked'
            ? 'blocked'
            : 'unavailable'
      setAwisLearningLoop({
        status,
        loopClosed: loop.closed_loop?.loop_closed === true,
        action: loop.next_action?.action ?? null,
        learningScore: loop.evidence_learning?.learning_score ?? null,
        hash: loop.loop_hash ?? null,
      })
    })
    return () => {
      cancelled = true
    }
  }, [atlas.mode, atlas.threadDetail?.title, effectiveWorkspaceSlug, effectiveWorkspaceProfile?.workspacePathExists, runtimeReadiness.status])

  const handleOpenSpace = useCallback(
    (threadIds: string[]) => {
      const unique = Array.from(new Set(threadIds.filter(Boolean)))
      const scoped = unique.filter((threadId) => availableWorkspaceThreadIds.has(threadId))
      const next = scoped.slice(0, 4)
      if (next.length === 0) {
        showWorkbenchNotice('Este Space não tem sessões neste projeto.')
        return
      }
      if (unique.length > 4) {
        showWorkbenchNotice('Abrindo as 4 primeiras sessões deste Space.')
      }
      const focus = next[0]
      setWorkbenchActive(true)
      setWorkbenchThreadIds(next)
      focusWorkbenchPane(focus)
    },
    [availableWorkspaceThreadIds, focusWorkbenchPane, showWorkbenchNotice],
  )

  const handleResumeWorkbench = useCallback(() => {
    const snapshot = restoreWorkbenchSnapshot(effectiveWorkspaceSlug, availableWorkspaceThreadIds)
    const threadIds = snapshot?.threadIds ?? storedWorkbenchThreadIds
    const next = threadIds.filter((id) => availableWorkspaceThreadIds.has(id)).slice(0, 4)
    if (next.length === 0) {
      showWorkbenchNotice('Não encontrei sessões salvas para este projeto.')
      setStoredWorkbenchThreadIds([])
      saveWorkbenchSnapshot(effectiveWorkspaceSlug, null)
      return
    }
    const focus = snapshot?.focusedThreadId && next.includes(snapshot.focusedThreadId)
      ? snapshot.focusedThreadId
      : next[0]
    setWorkbenchActive(true)
    setWorkbenchThreadIds(next)
    focusWorkbenchPane(focus)
  }, [availableWorkspaceThreadIds, effectiveWorkspaceSlug, focusWorkbenchPane, showWorkbenchNotice, storedWorkbenchThreadIds])

  const handleOpenRecommendedSideBySide = useCallback(() => {
    const scopedThreadIds = atlas.threads
      .filter((thread) => threadBelongsToWorkspace(thread, activeWorkspaceScope))
      .map((thread) => thread.id)
    const recommended = Array.from(new Set([
      atlas.selectedThreadId,
      ...scopedThreadIds,
    ].filter((id): id is string => typeof id === 'string' && id.trim() !== '')))
      .slice(0, 2)

    if (recommended.length < 2) {
      showWorkbenchNotice('Preciso de pelo menos 2 conversas neste projeto.')
      return
    }

    setWorkbenchActive(true)
    setWorkbenchThreadIds(recommended)
    focusWorkbenchPane(recommended[0])
  }, [activeWorkspaceScope, atlas.selectedThreadId, atlas.threads, focusWorkbenchPane, showWorkbenchNotice])

  const closeWorkbenchPane = useCallback(
    (id: string) => {
      setWorkbenchDrafts((prev) => omitRecordKey(prev, id))
      setWorkbenchDetails((prev) => omitRecordKey(prev, id))
      setWorkbenchPendingThreadId((prev) => (prev === id ? null : prev))
      setWorkbenchThreadIds((prev) => {
        const next = prev.filter((threadId) => threadId !== id)
        const fallback = nextWorkbenchFocusAfterClose(prev, id)
        setWorkbenchActive(next.length > 0)
        focusWorkbenchPane(fallback)
        return next
      })
    },
    [focusWorkbenchPane],
  )

  const workbenchKey = workbenchThreadIds.join('|')
  useEffect(() => {
    if (workbenchThreadIds.length <= 1) return
    let cancelled = false
    for (const threadId of workbenchThreadIds) {
      setWorkbenchDetails((prev) => {
        const existing = prev[threadId]
        if (existing?.detail || existing?.loading) return prev
        return { ...prev, [threadId]: { detail: null, loading: true, error: null } }
      })
      void atlas.fetchThreadDetail(threadId)
        .then((detail) => {
          if (cancelled) return
          setWorkbenchDetails((prev) => ({
            ...prev,
            [threadId]: {
              detail,
              loading: false,
              error: detail ? null : 'Não consegui carregar esta conversa.',
            },
          }))
        })
        .catch(() => {
          if (cancelled) return
          setWorkbenchDetails((prev) => ({
            ...prev,
            [threadId]: {
              detail: null,
              loading: false,
              error: 'Não consegui carregar esta conversa.',
            },
          }))
        })
    }
    return () => {
      cancelled = true
    }
  }, [atlas.fetchThreadDetail, workbenchKey])

  useEffect(() => {
    const threadId = atlas.threadDetail?.id
    if (!threadId || !workbenchThreadIds.includes(threadId)) return
    setWorkbenchDetails((prev) => {
      const existing = prev[threadId]
      if (existing?.detail === atlas.threadDetail && existing.loading === false && existing.error === null) {
        return prev
      }
      return {
        ...prev,
        [threadId]: {
          detail: atlas.threadDetail,
          loading: false,
          error: null,
        },
      }
    })
  }, [atlas.threadDetail, workbenchThreadIds])

  const handleWorkbenchSend = useCallback(
    async (threadId: string, options?: AtlasAiComposerSendExtras) => {
      const sendingText = workbenchDrafts[threadId] ?? ''
      focusWorkbenchPane(threadId)
      setWorkbenchPendingThreadId(threadId)
      setWorkbenchDrafts((prev) => ({ ...prev, [threadId]: '' }))
      const trace = await atlas.send(sendingText, {
        newThread: false,
        threadId,
        uploadedImageIds: options?.attachments?.uploaded_image_ids,
        uploadedDocumentIds: options?.attachments?.uploaded_document_ids,
        textBlocks: options?.attachments?.text_blocks,
        urlAttachments: options?.attachments?.url_attachments,
        richInputPayload: options?.richInputCanonical,
        computeEffort: options?.computeEffort,
      })
      if (!trace && sendingText.trim() !== '') {
        setWorkbenchDrafts((prev) => ({ ...prev, [threadId]: sendingText }))
      }
    },
    [atlas, focusWorkbenchPane, workbenchDrafts],
  )

  useEffect(() => {
    if (
      workbenchPendingThreadId &&
      !atlas.sending &&
      !atlas.pendingTrace &&
      !atlas.pendingUserMessage &&
      atlas.streamingText === '' &&
      !atlas.sendError
    ) {
      setWorkbenchPendingThreadId(null)
    }
  }, [
    atlas.pendingTrace,
    atlas.pendingUserMessage,
    atlas.sendError,
    atlas.sending,
    atlas.streamingText,
    workbenchPendingThreadId,
  ])

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
        computeEffort: options?.computeEffort,
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
    if (effectiveWorkspaceSlug) {
      refs.push({ kind: 'workspace', ref: effectiveWorkspaceSlug, resolved: true })
    }
    refs.push({ kind: 'surface', ref: 'atlas_ai', resolved: true })
    return refs
  }, [effectiveWorkspaceSlug])
  // V4 · structured snapshot resolver. Reads workspace + active surface +
  // selected thread + live text selection. NÃO toca clipboard, screenshot,
  // AppleScript ou Full Disk Access — apenas dados que o WKWebView já tem.
  const threadIdForSnapshot = atlas.selectedThreadId
  const threadTitleForSnapshot = atlas.threadDetail?.title ?? null
  const { getSnapshot: getVoxContextSnapshot } = useVoxContextSnapshot({
    surface: 'atlas_ai',
    workspace: {
      root: effectiveWorkspacePath,
      name: effectiveWorkspaceName,
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
    voiceConfirmedSpeechMsRef.current = 0
    voiceSilenceSinceRef.current = null
    voiceAutoFinishInFlightRef.current = false
    voiceNoiseFloorRef.current = null
  }, [])

  const resetVoiceStreamingSpeech = useCallback(() => {
    streamingSpeechTraceIdRef.current = null
    streamingSpeechPrefixRef.current = null
  }, [])

  const clearVoiceAwaitingReply = useCallback(() => {
    voiceAwaitingReplyRef.current = false
    voiceAwaitingReplyStartedAtRef.current = null
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
    const loopEpoch = voiceLoopEpochRef.current
    const echoGuardRemainingMs = Math.max(
      0,
      VOICE_ECHO_GUARD_AFTER_SPEECH_MS - (Date.now() - voiceLastSpeechEndedAtRef.current),
    )
    const actualDelayMs = Math.max(0, delayMs, echoGuardRemainingMs)
    voiceRearmTimerRef.current = window.setTimeout(() => {
      voiceRearmTimerRef.current = null
      if (loopEpoch !== voiceLoopEpochRef.current) return
      if (!voiceReplyEnabledRef.current) return
      if (attempt > VOICE_REARM_MAX_ATTEMPTS) {
        setVoiceSpeechError('A conversa por voz não conseguiu reabrir o microfone. Aperte gravar de novo.')
        return
      }
      if (
        atlasVoiceBusyRef.current
        || voiceTurnDispatchInFlightRef.current
        || voiceAwaitingReplyRef.current
        || voiceSpeechStateRef.current === 'speaking'
        || voxBusyRef.current
      ) {
        scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS, attempt + 1)
        return
      }

      const currentVoxState = voxStateRef.current
      const staleTranscriptKey = voxTranscriptKeyRef.current
      const staleTranscriptAlreadySent =
        currentVoxState !== 'transcript_ready'
        || staleTranscriptKey === null
        || staleTranscriptKey === lastVoiceSentTranscriptRef.current

      if (
        staleTranscriptAlreadySent
        && atlasVoiceCanResetStaleTurn({
          voiceEnabled: voiceReplyEnabledRef.current,
          atlasBusy: atlasVoiceBusyRef.current,
          speechState: voiceSpeechStateRef.current,
          voxBusy: voxBusyRef.current,
          voxState: currentVoxState,
        })
      ) {
        resetVoiceTurnDetection()
        voxCloseRef.current?.()
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
      setVoiceSpeechState('idle')
      setVoiceSpeechError(null)
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
    }, actualDelayMs)
  }, [clearVoiceRearmTimer, resetVoiceTurnDetection])

  const stopVoiceConversation = useCallback(async () => {
    clearVoiceRearmTimer()
    voiceReplyEnabledRef.current = false
    voiceLoopEpochRef.current += 1
    nextVoiceSpeechRunId()
    voiceRearmAttemptRef.current = 0
    resetVoiceStreamingSpeech()
    resetVoiceTurnDetection()
    voicePendingContinuationRef.current = null
    voiceTurnDispatchInFlightRef.current = false
    clearVoiceAwaitingReply()
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
    voiceLoopEpochRef.current += 1
    nextVoiceSpeechRunId()
    resetVoiceStreamingSpeech()
    voicePendingContinuationRef.current = null
    clearVoiceAwaitingReply()
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
    voiceLoopEpochRef.current += 1
    resetVoiceStreamingSpeech()
    voicePendingContinuationRef.current = null
    clearVoiceAwaitingReply()
    await stopAtlasAiSpeech()
    resetVoiceTurnDetection()
    setVoiceSpeechError(null)
    setVoiceSpeechState('idle')
    const cur = vox.state
    if (cur === 'closed' || cur === 'idle' || cur === 'cancelled' || cur === 'error') {
      await vox.start()
    }
  }, [clearVoiceRearmTimer, resetVoiceTurnDetection, vox])

  const recordVoiceTurnAgain = useCallback(async () => {
    if (!voiceReplyEnabledRef.current) return
    clearVoiceRearmTimer()
    voiceRearmAttemptRef.current = 0
    resetVoiceStreamingSpeech()
    resetVoiceTurnDetection()
    setVoiceSpeechError(null)
    setVoiceSpeechState('idle')
    const cur = vox.state
    if (cur === 'closed' || cur === 'idle' || cur === 'cancelled' || cur === 'error' || cur === 'transcript_ready') {
      if (cur === 'transcript_ready') vox.close()
      await vox.start()
    }
  }, [clearVoiceRearmTimer, resetVoiceStreamingSpeech, resetVoiceTurnDetection, vox])

  useEffect(() => {
    voxStartRef.current = vox.start
    voxCloseRef.current = vox.close
    voxStateRef.current = vox.state
    voxBusyRef.current = vox.busy
    const text = (vox.transcriptDraft || vox.transcript?.text || '').trim()
    voxTranscriptKeyRef.current = text
      ? vox.transcript?.transcriptId ?? `${text}:${vox.session?.sessionId ?? 'no-session'}`
      : null
  }, [
    vox.busy,
    vox.close,
    vox.session?.sessionId,
    vox.start,
    vox.state,
    vox.transcript?.text,
    vox.transcript?.transcriptId,
    vox.transcriptDraft,
  ])

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
      const speechWindow = atlasVoiceNextSpeechWindow({
        speaking,
        previousFrameCount: voiceSpeechFrameCountRef.current,
        previousSpeechMs: voiceSpeechMsRef.current,
        pollMs: VOICE_TURN_POLL_MS,
      })
      voiceSpeechFrameCountRef.current = speechWindow.speechFrameCount
      voiceSpeechMsRef.current = speechWindow.speechMs

      if (speaking) {
        if (atlasVoiceConfirmsHumanSpeech({
          speaking,
          speechFrameCount: voiceSpeechFrameCountRef.current,
          speechStartedAtMs: now - voiceSpeechMsRef.current,
          nowMs: now,
          minSpeechFrames: VOICE_MIN_SPEECH_FRAMES,
          minSpeechMs: VOICE_MIN_CONFIRMED_SPEECH_MS,
        })) {
          voiceHeardSpeechRef.current = true
          voiceConfirmedSpeechMsRef.current = Math.max(
            voiceConfirmedSpeechMsRef.current,
            voiceSpeechMsRef.current,
          )
        }
        voiceSilenceSinceRef.current = null
        return
      }

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
      const requiredSilenceMs = atlasVoiceEndpointSilenceMs({
        confirmedSpeechMs: voiceConfirmedSpeechMsRef.current,
        shortUtteranceSilenceMs: VOICE_SHORT_UTTERANCE_SILENCE_MS,
        longUtteranceSilenceMs: VOICE_LONG_UTTERANCE_SILENCE_MS,
        longUtteranceSpeechMs: VOICE_LONG_UTTERANCE_SPEECH_MS,
      })

      if (atlasVoiceShouldFinishTurn({
        heardSpeech: voiceHeardSpeechRef.current,
        durationMs: level.durationMs,
        minTurnMs: VOICE_MIN_TURN_MS,
        silenceMs,
        requiredSilenceMs,
      })) {
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

    if (atlasVoiceShouldDropTranscript({ text })) {
      resetVoiceTurnDetection()
      vox.close()
      scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS)
      return
    }

    const dispatchDecision = atlasVoiceDecideTranscriptDispatch({
      pendingText: voicePendingContinuationRef.current,
      transcriptText: text,
    })

    if (!dispatchDecision.shouldDispatch) {
      voicePendingContinuationRef.current = dispatchDecision.pendingText
      resetVoiceTurnDetection()
      vox.close()
      scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS)
      return
    }

    const textToSend = dispatchDecision.textToSend
    if (!textToSend) return

    voicePendingContinuationRef.current = null
    clearVoiceRearmTimer()
    resetVoiceStreamingSpeech()
    resetVoiceTurnDetection()
    voiceTurnDispatchInFlightRef.current = true
    voiceAwaitingReplyRef.current = true
    voiceAwaitingReplyStartedAtRef.current = Date.now()
    setVoiceSpeechError(null)
    vox.close()
    void (async () => {
      const trace = await atlas.send(textToSend, {
        newThread: atlas.selectedThreadId === null,
        title: textToSend.slice(0, 80),
        voiceConversation: true,
      })
      if (!trace && voiceReplyEnabledRef.current) {
        voiceTurnDispatchInFlightRef.current = false
        clearVoiceAwaitingReply()
        setVoiceSpeechError('Não consegui enviar esse turno. Grave de novo.')
        scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS)
        return
      }
      window.setTimeout(() => {
        voiceTurnDispatchInFlightRef.current = false
      }, VOICE_REARM_WATCHDOG_MS)
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
        voiceLastSpeechEndedAtRef.current = Date.now()
        setVoiceSpeechState('idle')
      },
      onError: (reason) => {
        if (!isCurrentVoiceSpeechRun(speechRunId)) return
        setVoiceSpeechError(humanizeAtlasVoiceSpeechError(reason))
        setVoiceSpeechState('idle')
        clearVoiceAwaitingReply()
        if (voiceReplyEnabledRef.current) scheduleVoiceRearm(VOICE_REARM_AFTER_REPLY_MS)
      },
    }).then((spoke) => {
      if (!isCurrentVoiceSpeechRun(speechRunId)) return
      if (!spoke) {
        streamingSpeechPrefixRef.current = null
        setVoiceSpeechError((current) => current ?? 'Não consegui falar o início da resposta.')
        setVoiceSpeechState('idle')
        clearVoiceAwaitingReply()
        if (voiceReplyEnabledRef.current) scheduleVoiceRearm(VOICE_REARM_AFTER_REPLY_MS)
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
      voiceLastSpeechEndedAtRef.current = Date.now()
      clearVoiceAwaitingReply()
      if (voiceReplyEnabledRef.current) scheduleVoiceRearm(VOICE_REARM_AFTER_REPLY_MS)
      return
    }

    setVoiceSpeechError(null)
    setVoiceSpeechState('speaking')
    void speakAtlasAiText(finalSpeechText, {
      maxChars: VOICE_REPLY_MAX_CHARS,
      onEnd: () => {
        if (!isCurrentVoiceSpeechRun(speechRunId)) return
        voiceLastSpeechEndedAtRef.current = Date.now()
        setVoiceSpeechState('idle')
        clearVoiceAwaitingReply()
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
        clearVoiceAwaitingReply()
        resetVoiceStreamingSpeech()
        if (voiceReplyEnabledRef.current) scheduleVoiceRearm(VOICE_REARM_AFTER_REPLY_MS)
      },
    }).then((spoke) => {
      if (!isCurrentVoiceSpeechRun(speechRunId)) return
      if (!spoke) {
        setVoiceSpeechError((current) => current ?? 'Não consegui falar a resposta. A resposta ficou na conversa.')
        setVoiceSpeechState('idle')
        clearVoiceAwaitingReply()
        resetVoiceStreamingSpeech()
        if (voiceReplyEnabledRef.current) scheduleVoiceRearm(VOICE_REARM_AFTER_REPLY_MS)
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
    if (voiceAwaitingReplyRef.current) return
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
        voiceLastSpeechEndedAtRef.current = Date.now()
        clearVoiceAwaitingReply()
        resetVoiceStreamingSpeech()
        scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS)
        return
      }

      const awaitingReplyStartedAt = voiceAwaitingReplyStartedAtRef.current
      if (atlasVoiceShouldRecoverAwaitingReply({
        awaitingReply: voiceAwaitingReplyRef.current,
        awaitingStartedAtMs: awaitingReplyStartedAt,
        nowMs: Date.now(),
        maxAwaitingMs: VOICE_AWAITING_REPLY_WATCHDOG_MS,
        atlasBusy: atlasVoiceBusyRef.current,
        speechState: voiceSpeechStateRef.current,
      })) {
        voiceTurnDispatchInFlightRef.current = false
        clearVoiceAwaitingReply()
        resetVoiceStreamingSpeech()
        setVoiceSpeechState('idle')
        setVoiceSpeechError('A resposta demorou demais. Voltei a ouvir para você continuar.')
        scheduleVoiceRearm(VOICE_REARM_WATCHDOG_MS)
        return
      }

      if (
        atlasVoiceBusyRef.current
        || voiceTurnDispatchInFlightRef.current
        || voiceAwaitingReplyRef.current
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
  }, [clearVoiceAwaitingReply, resetVoiceStreamingSpeech, scheduleVoiceRearm, voiceReplyEnabled])

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
        await navigator.clipboard.writeText('Não consegui carregar esta conversa agora. Tente recarregar o histórico e exportar novamente.').catch(() => {})
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
      const proposed = window.prompt('Renomear conversa', thread.title?.trim() || '')
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
          detail="Atlas Desktop está sem ligação com o serviço local. Nenhuma conversa é inventada — o histórico volta quando o serviço responder."
        />
      </main>
    )
  }

  // Hero some no instante que o usuário envia (mesmo antes do createAiThread
  // retornar) — assim o operador vê a bolha otimista + indicator imediato.
  const isHero = atlas.selectedThreadId === null && atlas.pendingUserMessage === null
  const isWorkbenchOpen = workbenchActive && workbenchThreadIds.length > 0
  const workspacePickerLocked = !isHero
  const effectiveProjectSpaceCount = useMemo(() => {
    const fusionThreadCount = atlas.conversationFusion?.summary?.thread_count ?? 0
    const fusionReady = (atlas.conversationFusion?.status === 'ready' || Boolean(atlas.conversationFusion?.persisted_artifact))
      && fusionThreadCount >= 2
    return Math.max(projectSpaceCount, fusionReady ? 1 : 0)
  }, [atlas.conversationFusion?.persisted_artifact, atlas.conversationFusion?.status, atlas.conversationFusion?.summary?.thread_count, projectSpaceCount])
  const awisIntelligence = useMemo(
    () => evaluateAwisWorkspaceIntelligence({
      profile: effectiveWorkspaceProfile,
      threadCount: activeWorkspaceThreadCount,
      spaceCount: effectiveProjectSpaceCount,
      workbenchPaneCount: workbenchThreadIds.length,
      hasStoredWorkbench: storedWorkbenchThreadIds.length > 0,
      historyHealthy: !atlas.threadsError,
      runtimeStatus: runtimeReadiness.status,
      serverHealth: awisServerHealth,
      learningLoop: awisLearningLoop,
    }),
    [
      activeWorkspaceThreadCount,
      atlas.threadsError,
      awisLearningLoop,
      awisServerHealth,
      effectiveWorkspaceProfile,
      effectiveProjectSpaceCount,
      runtimeReadiness.status,
      storedWorkbenchThreadIds.length,
      workbenchThreadIds.length,
    ],
  )
  const operationalRuntimeReadiness = useMemo(
    () => applyAwisOperationalHealth(runtimeReadiness, {
      historyHealthy: !atlas.threadsError,
      serverHealth: awisServerHealth,
    }),
    [atlas.threadsError, awisServerHealth, runtimeReadiness],
  )
  const showAwisCommandCenter = !isWorkbenchOpen && (isHero || awisIntelligence.score < 100 || storedWorkbenchThreadIds.length > 0)

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
            {effectiveWorkspaceName ? (
              <p className="atlas-ai-header-bar-sub">
                {effectiveWorkspaceScopeLabel} · <span className="atlas-ai-header-bar-sub-name">{effectiveWorkspaceName}</span>
                <span className="atlas-ai-header-bar-sub-lock"> · {effectiveWorkspaceFolderLabel}</span>
              </p>
            ) : (
              <p className="atlas-ai-header-bar-sub">uma única inteligência</p>
            )}
          </div>
          <AtlasAiRuntimeStatusPill
            readiness={operationalRuntimeReadiness}
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
          activeWorkspace={activeWorkspaceScope}
          modeFilter={atlas.modeFilter}
          onModeFilter={atlas.setModeFilter}
          onRefresh={handleRetryThreads}
          conversationFusion={atlas.conversationFusion}
          conversationFusionLoading={atlas.conversationFusionLoading}
          conversationFusionError={atlas.conversationFusionError}
          conversationFusionArtifact={atlas.conversationFusionArtifact}
          conversationFusionArtifactLoading={atlas.conversationFusionArtifactLoading}
          conversationFusionArtifactError={atlas.conversationFusionArtifactError}
          onPersistConversationFusion={() => atlas.refreshConversationFusion(undefined, { persist: true })}
          onSelect={handleSelectThread}
          onOpenBeside={handleOpenThreadBeside}
          onOpenInStage={handleOpenThreadInStage}
          onStageDragActive={setStageThreadDropActive}
          onProjectSpaceCountChange={setProjectSpaceCount}
          dragClearSignal={threadDragClearSignal}
          onOpenSpace={handleOpenSpace}
          onNewThread={() => {
            setWorkbenchActive(false)
            setWorkbenchThreadIds([])
            setWorkbenchFocusedThreadId(null)
            setWorkbenchDrafts({})
            setWorkbenchDetails({})
            setWorkbenchPendingThreadId(null)
            atlas.selectThread(null)
          }}
          onMoveThreadToWorkspace={(threadId) => atlas.moveThreadToWorkspace(threadId, activeWorkspaceScope)}
          onFuseThreads={(threadIds) => void atlas.refreshConversationFusion(threadIds, { persist: true })}
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
      <main
        className={`atlas-ai-stage${isHero ? ' is-hero' : ''}${isWorkbenchOpen ? ' is-workbench' : ''}${stageThreadDropActive ? ' is-thread-drop-active' : ''}`}
        onDragEnter={(event) => {
          if (!stageAcceptsThreadDrop(event)) return
          event.preventDefault()
          setStageThreadDropActive(true)
        }}
        onDragOver={(event) => {
          if (!stageAcceptsThreadDrop(event)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setStageThreadDropActive(true)
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
          setStageThreadDropActive(false)
        }}
        onDrop={(event) => {
          const threadId = threadIdFromDragEvent(event)
          event.preventDefault()
          setStageThreadDropActive(false)
          clearThreadDragVisualState()
          if (!threadId) return
          handleAddThreadToWorkbench(threadId)
        }}
      >
        {stageThreadDropActive ? (
          <div className="atlas-ai-stage-drop-target" aria-hidden="true">
            <span>Solte para comparar</span>
            <strong>até 4 sessões no centro</strong>
          </div>
        ) : null}
        {workbenchNotice ? (
          <div className="atlas-ai-workbench-notice" role="status">
            {workbenchNotice}
          </div>
        ) : null}
        <div className="atlas-ai-stage-scroll">
          {showAwisCommandCenter ? (
            <AwisCommandCenter
              intelligence={awisIntelligence}
              workspaceName={effectiveWorkspaceName}
              workspacePath={effectiveWorkspacePath}
              workspaceFolderLabel={effectiveWorkspaceFolderLabel}
              workspaceFolderReady={effectiveWorkspaceHasRepo}
              storedSessionCount={storedWorkbenchThreadIds.length}
              canResume={storedWorkbenchThreadIds.length > 0 && !isWorkbenchOpen}
              onResume={handleResumeWorkbench}
              onOpenRecommendedSideBySide={handleOpenRecommendedSideBySide}
              onConfigure={handleAwisConfigureProject}
              onChooseFolder={handleAwisChooseFolder}
              onRefreshHealth={refreshAwisHealth}
            />
          ) : null}
          {isHero ? (
            <AtlasAiHero
              mode={atlas.composerMode}
              workspaceName={effectiveWorkspaceName}
              threadCount={activeWorkspaceThreadCount}
              onUseChip={handleUseChip}
            />
          ) : isWorkbenchOpen ? (
            <div
              className={`atlas-ai-workbench-grid is-count-${Math.min(workbenchThreadIds.length, 4)}`}
              aria-label="Sessões em comparação"
            >
              {workbenchThreadIds.map((threadId) => {
                const isFocused = workbenchFocusedThreadId === threadId
                const cached = workbenchDetails[threadId] ?? { detail: null, loading: true, error: null }
                const pendingThreadId =
                  atlas.pendingTrace?.thread_id ??
                  atlas.currentAtlasDevPlan?.thread_id ??
                  workbenchPendingThreadId
                const paneHasPending = threadId === pendingThreadId
                const paneDetail =
                  threadId === atlas.selectedThreadId && atlas.threadDetail
                    ? atlas.threadDetail
                    : cached.detail
                const paneLoading =
                  threadId === atlas.selectedThreadId
                    ? atlas.threadDetailLoading
                    : cached.loading
                const paneError =
                  threadId === atlas.selectedThreadId
                    ? atlas.threadDetailError
                    : cached.error
                return (
                  <section
                    key={threadId}
                    className={`atlas-ai-workbench-pane${isFocused ? ' is-focused' : ''}`}
                    onMouseDown={() => focusWorkbenchPane(threadId)}
                    onFocusCapture={() => focusWorkbenchPane(threadId)}
                  >
                    <div className="atlas-ai-workbench-pane-scroll">
                      <AtlasAiConversation
                        loading={paneLoading}
                        detail={paneDetail}
                        error={paneError}
                        pendingTrace={paneHasPending ? conversation.pendingTrace : null}
                        pendingUserMessage={paneHasPending ? conversation.pendingUserMessage : null}
                        streamingText={paneHasPending ? conversation.streamingText : ''}
                        sending={paneHasPending ? conversation.sending : false}
                        onArchive={() => {
                          void atlas.archiveThread(threadId)
                          closeWorkbenchPane(threadId)
                        }}
                        onPromote={() => {
                          focusWorkbenchPane(threadId)
                          setPromotionOpen(true)
                        }}
                        onCancel={atlas.cancelPending}
                        atlasDevPlan={paneHasPending ? atlas.currentAtlasDevPlan : null}
                      />
                    </div>
                    <div className="atlas-ai-workbench-composer">
                      <AtlasAiComposer
                        draft={workbenchDrafts[threadId] ?? ''}
                        onChange={(next) =>
                          setWorkbenchDrafts((prev) => ({ ...prev, [threadId]: next }))
                        }
                        mode={atlas.composerMode}
                        onModeChange={atlas.setComposerMode}
                        task={atlas.composerTask}
                        onTaskChange={atlas.setComposerTask}
                        provider={atlas.composerProvider}
                        onProviderChange={atlas.setComposerProvider}
                        computeEffort={atlas.composerComputeEffort}
                        onComputeEffortChange={atlas.setComposerComputeEffort}
                        sending={paneHasPending ? atlas.sending : false}
                        sendError={paneHasPending ? atlas.sendError : null}
                        workspaceSlug={paneDetail?.workspace ?? atlas.workspaceSlug}
                        textareaMaxPx={180}
                        placeholder="Responder nesta sessão..."
                        onSend={(extras) => handleWorkbenchSend(threadId, extras)}
                      />
                    </div>
                    <button
                      type="button"
                      className="atlas-ai-workbench-close"
                      onClick={(event) => {
                        event.stopPropagation()
                        closeWorkbenchPane(threadId)
                      }}
                      aria-label="Fechar sessão"
                      title="Fechar sessão"
                    >
                      ×
                    </button>
                  </section>
                )
              })}
            </div>
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

        {!isWorkbenchOpen ? (
          <div
            className="atlas-ai-stage-composer"
            style={{
              ['--composer-width' as string]: `${composerSize.size.width}px`,
              ['--composer-textarea-max' as string]: `${composerSize.size.height}px`,
            }}
          >
            <div className="atlas-ai-composer-wrap">
              <AtlasAiWorkspacePicker
                workspaces={workspaces}
                activeWorkspace={effectiveWorkspaceProfile}
                activeWorkspaceSlug={effectiveWorkspaceSlug}
                locked={workspacePickerLocked}
                onSelectWorkspace={onSelectWorkspace}
                onOpenWorkspaceProfile={onOpenWorkspaceProfile}
              />
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
                computeEffort={atlas.composerComputeEffort}
                onComputeEffortChange={atlas.setComposerComputeEffort}
                sending={atlas.sending}
                sendError={atlas.sendError}
                workspaceSlug={atlas.workspaceSlug ?? atlas.threadDetail?.workspace ?? null}
                textareaMaxPx={composerSize.size.height}
                onSend={(extras) =>
                  handleSend({
                    newThread: extras?.newThread ?? atlas.selectedThreadId === null,
                    attachments: extras?.attachments,
                    richInputCanonical: extras?.richInputCanonical,
                    computeEffort: extras?.computeEffort,
                  })
                }
                onSendInNew={(extras) =>
                  handleSend({
                    newThread: true,
                    attachments: extras?.attachments,
                    richInputCanonical: extras?.richInputCanonical,
                    computeEffort: extras?.computeEffort,
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
                  onRecordAgain={() => void recordVoiceTurnAgain()}
                />
              ) : (
                <VoxOverlay controller={vox} />
              )}
            </div>
          </div>
        ) : null}
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
          workspaceName={effectiveWorkspaceName}
          thread={atlas.threadDetail}
          pendingTrace={atlas.pendingTrace}
          mode={atlas.composerMode}
          task={atlas.composerTask}
          provider={atlas.composerProvider}
          runtimeReadiness={operationalRuntimeReadiness}
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

function AwisCommandCenter({
  intelligence,
  workspaceName,
  workspacePath,
  workspaceFolderLabel,
  workspaceFolderReady,
  storedSessionCount,
  canResume,
  onResume,
  onOpenRecommendedSideBySide,
  onConfigure,
  onChooseFolder,
  onRefreshHealth,
}: {
  intelligence: AwisWorkspaceIntelligence
  workspaceName: string | null
  workspacePath: string | null
  workspaceFolderLabel: string
  workspaceFolderReady: boolean
  storedSessionCount: number
  canResume: boolean
  onResume: () => void
  onOpenRecommendedSideBySide: () => void
  onConfigure: () => void
  onChooseFolder: () => Promise<void> | void
  onRefreshHealth: () => void
}) {
  const visibleCapabilities = intelligence.capabilities.slice(0, 4)
  const visibleActions = intelligence.nextActions.slice(0, 2)
  const displayedScore = visibleActions.length > 0 ? Math.min(94, intelligence.score) : intelligence.score
  const canRefreshHealth = intelligence.liveSignal.label === 'serviço local' || intelligence.liveSignal.detail.includes('serviço local')
  const canOpenRecommendedSideBySide = visibleActions.includes('comparar sessões')
  return (
    <section className={`atlas-ai-awis-command-center is-${intelligence.level}`} aria-label="Estado AWIS do projeto">
      <div className="atlas-ai-awis-command-main">
        <span className="atlas-ai-awis-kicker">AWIS</span>
        <div>
          <strong>{intelligence.label}</strong>
          <p>{intelligence.summary}</p>
        </div>
      </div>
      <div className="atlas-ai-awis-score" title="Força operacional do projeto neste Mac">
        <span>{displayedScore}</span>
        <small>/100</small>
      </div>
      <div className="atlas-ai-awis-context">
        <span title={workspaceName ?? undefined}>{workspaceName || 'Projeto'}</span>
        <small className={workspaceFolderReady ? 'is-ready' : 'is-missing'} title={workspacePath ?? undefined}>
          {workspaceFolderLabel}
        </small>
      </div>
      <div
        className={`atlas-ai-awis-live tone-${intelligence.liveSignal.tone}`}
        title={intelligence.liveSignal.detail}
      >
        <span>{intelligence.liveSignal.label}</span>
        <small>{intelligence.liveSignal.detail}</small>
      </div>
      <div className="atlas-ai-awis-chips" aria-label="Capacidades AWIS ativas">
        {visibleCapabilities.length > 0 ? visibleCapabilities.map((capability) => (
          <span key={capability} className="atlas-ai-awis-chip">{capability}</span>
        )) : (
          <span className="atlas-ai-awis-chip is-muted">aguardando projeto</span>
        )}
      </div>
      <div className="atlas-ai-awis-next" aria-label="Próximos saltos AWIS">
        {visibleActions.length > 0 ? visibleActions.map((action) => (
          <span key={action}>{action}</span>
        )) : (
          <span>pronto para trabalhar</span>
        )}
      </div>
      <div className="atlas-ai-awis-actions">
        {canResume ? (
          <button
            type="button"
            className="atlas-ai-awis-action is-primary"
            onClick={onResume}
            title="Retoma as sessões salvas para comparação neste projeto"
          >
            Retomar {storedSessionCount} sessões
          </button>
        ) : null}
        {canOpenRecommendedSideBySide ? (
          <button
            type="button"
            className="atlas-ai-awis-action is-primary"
            onClick={onOpenRecommendedSideBySide}
            title="Abre duas conversas deste projeto para comparar"
          >
            Comparar
          </button>
        ) : null}
        {canRefreshHealth ? (
          <button
            type="button"
            className="atlas-ai-awis-action is-primary"
            onClick={onRefreshHealth}
            title="Verifica novamente o serviço local e o histórico deste Mac"
          >
            Verificar serviço
          </button>
        ) : null}
        <button
          type="button"
          className="atlas-ai-awis-action"
          onClick={() => {
            if (workspaceFolderReady) {
              onConfigure()
              return
            }
            void onChooseFolder()
          }}
          title={workspaceFolderReady ? 'Abrir perfil do projeto e pasta local' : 'Escolher pasta real do Mac para este projeto'}
        >
          {workspaceFolderReady ? 'Configurar projeto' : 'Escolher pasta'}
        </button>
      </div>
    </section>
  )
}
