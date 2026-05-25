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
import { bridge, voxEdgeAudioLevel, type AtlasWorkspaceBrainSnapshot, type VoxContextRef } from '../../lib/bridge'
import '../../components/vox/vox.css'
import { AtlasAiComposer, type AtlasAiComposerSendExtras } from './components/AtlasAiComposer'
import { AtlasAiConversation } from './components/AtlasAiConversation'
import { AtlasAiEmpty } from './components/AtlasAiEmpty'
import { AtlasAiHero } from './components/AtlasAiHero'
import { AtlasAiPromotionPanel } from './components/AtlasAiPromotionPanel'
import { AtlasAiSidePanel } from './components/AtlasAiSidePanel'
import { AtlasAiWorkspacePicker } from './components/AtlasAiWorkspacePicker'
import { AtlasAiThreadContextMenu, type ContextMenuPos } from './components/AtlasAiThreadContextMenu'
import { ATLAS_AI_THREAD_DRAG_CLEAR_EVENT, AtlasAiThreadList, type LocalProjectSpaceContextPack } from './components/AtlasAiThreadList'
import {
  AtlasAiVoiceConversationOverlay,
  type AtlasAiVoiceSpeechState,
} from './components/AtlasAiVoiceConversationOverlay'
import { useRuntimeReadiness } from './useRuntimeReadiness'
import { applyAwisOperationalHealth } from './runtimeReadinessView'
import { useAtlasAiColumnSizing } from './layout/useAtlasAiColumnSizing'
import { serializeThreadAsMarkdown } from './threadExport'
import { useAtlasAi } from './useAtlasAi'
import {
  getAtlasAwisArtifactIntelligence,
  getAtlasAwisHandoffPack,
  getAtlasAwisLearningLoop,
  getAtlasAwisLiveExecutionMemory,
  getAtlasAwisNextSessionBrain,
  getAtlasServerHealth,
  persistAtlasAwisRuntimeSnapshot,
} from './client'
import {
  evaluateAwisWorkspaceIntelligence,
  type AwisLearningLoopState,
  type AwisRuntimeSnapshotState,
  type AwisServerHealthState,
  type AwisWorkspaceIntelligence,
} from './awisIntelligence'
import {
  buildAwisWorkspaceEvolutionProjection,
  buildAwisWorkspaceRelationProjection,
  buildAwisWorkspaceArtifact,
  buildAwisWorkspaceArtifactProjectionsFromServer,
  buildAwisWorkspaceContextPack,
  buildAwisWorkspaceHandoffProjection,
  buildAwisWorkspaceLiveExecutionMemoryProjectionFromServer,
  buildAwisWorkspaceNextSessionBrainProjection,
  buildAwisWorkspaceProviderCapsule,
  buildAwisWorkspaceSpaceProjection,
  buildAwisWorkspaceTaskContextProjection,
  loadAwisWorkspaceArtifacts,
  loadAwisWorkspaceArtifactStore,
  mergeAwisWorkspaceArtifactStores,
  mergeAwisWorkspaceMemoryStores,
  normalizeAwisWorkspaceArtifactStore,
  normalizeAwisWorkspaceMemoryStore,
  loadAwisWorkspaceArtifactReplayProjection,
  learnAwisWorkspaceMemory,
  loadAwisWorkspaceArtifactLakeSummary,
  loadAwisWorkspaceLiveExecutionMemoryProjection,
  loadAwisWorkspaceMemories,
  loadAwisWorkspaceMemory,
  loadAwisWorkspaceSpaceProjection,
  recordAwisWorkspaceInteraction,
  recordAwisWorkspaceMaintenance,
  saveAwisWorkspaceArtifact,
  saveAwisWorkspaceArtifactStore,
  saveAwisWorkspaceLiveExecutionMemoryProjection,
  saveAwisWorkspaceMemories,
  saveAwisWorkspaceMemory,
  saveAwisWorkspaceSpaceProjection,
  workspaceMemoryKey,
  type AwisWorkspaceArtifactLakeSummary,
  type AwisWorkspaceArtifactReplayProjection,
  type AwisWorkspaceAutomationProjection,
  type AwisWorkspaceConfidenceProjection,
  type AwisWorkspaceContextKernelProjection,
  type AwisWorkspaceContinuityProjection,
  type AwisWorkspaceEvolutionProjection,
  type AwisWorkspaceHandoffProjection,
  type AwisWorkspaceLaunchContractProjection,
  type AwisWorkspaceLiveExecutionMemoryProjection,
  type AwisWorkspaceLivingGraphProjection,
  type AwisWorkspaceMemorySnapshot,
  type AwisWorkspaceMaintenanceAction,
  type AwisWorkspaceNextSessionBrainProjection,
  type AwisWorkspacePreflightProjection,
  type AwisWorkspaceRelationProjection,
  type AwisWorkspaceRetentionProjection,
  type AwisWorkspaceSelfImprovementProjection,
  type AwisWorkspaceSpaceProjection,
  type AwisWorkspaceTaskContextProjection,
  type AwisWorkspaceTwinProjection,
} from './awisWorkspaceMemory'
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
import type { AiThreadDetail, AiThreadSummary, AiTrace } from './types'
import './atlas-ai.css'

interface WorkbenchPaneDetail {
  detail: AiThreadDetail | null
  loading: boolean
  error: string | null
}

const PINNED_STORAGE = 'atlas-desktop:atlas-ai-pinned-threads'
const WORKBENCH_SNAPSHOTS_STORAGE = 'atlas-desktop:atlas-ai-workbench-snapshots'
const WORKSPACE_BRAIN_CACHE_STORAGE = 'atlas-desktop:atlas-ai-workspace-brain-cache'
const WORKSPACE_BRAIN_SESSION_CACHE_TTL_MS = 5 * 60 * 1000
const WORKSPACE_BRAIN_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const AWIS_RUNTIME_SNAPSHOT_STORAGE = 'atlas-desktop:atlas-ai-awis-runtime-snapshots'
const AWIS_RUNTIME_SNAPSHOT_TTL_MS = 10 * 60 * 1000
const ENABLE_AWIS_LOCAL_INTELLIGENCE = true
const ENABLE_AWIS_SERVER_INTELLIGENCE = true
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

interface WorkspaceBrainCacheEntry {
  snapshot: AtlasWorkspaceBrainSnapshot
  cachedAt: number
}

interface WorkspaceBrainCacheHit {
  snapshot: AtlasWorkspaceBrainSnapshot
  shouldRefresh: boolean
}

interface AwisRuntimeSnapshotCacheEntry {
  state: AwisRuntimeSnapshotState
  cachedAt: number
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

function workspaceBrainCacheKey(workspacePath: string): string {
  return workspacePath.trim().toLowerCase()
}

function readWorkspaceBrainCacheStore(storage: Storage): Record<string, WorkspaceBrainCacheEntry> {
  try {
    const raw = storage.getItem(WORKSPACE_BRAIN_CACHE_STORAGE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Record<string, WorkspaceBrainCacheEntry>
  } catch {
    return {}
  }
}

function validWorkspaceBrainCacheEntry(entry: WorkspaceBrainCacheEntry | undefined, ttlMs: number): WorkspaceBrainCacheEntry | null {
  if (!entry || typeof entry.cachedAt !== 'number') return null
  if (!entry.snapshot || entry.snapshot.status !== 'ready') return null
  if (Date.now() - entry.cachedAt > ttlMs) return null
  return entry
}

function loadWorkspaceBrainCache(workspacePath: string): WorkspaceBrainCacheHit | null {
  try {
    const key = workspaceBrainCacheKey(workspacePath)
    const sessionEntry = validWorkspaceBrainCacheEntry(
      readWorkspaceBrainCacheStore(sessionStorage)[key],
      WORKSPACE_BRAIN_SESSION_CACHE_TTL_MS,
    )
    if (sessionEntry) {
      return { snapshot: sessionEntry.snapshot, shouldRefresh: false }
    }

    const durableEntry = validWorkspaceBrainCacheEntry(
      readWorkspaceBrainCacheStore(localStorage)[key],
      WORKSPACE_BRAIN_CACHE_TTL_MS,
    )
    if (!durableEntry) return null
    return {
      snapshot: durableEntry.snapshot,
      shouldRefresh: Date.now() - durableEntry.cachedAt > WORKSPACE_BRAIN_SESSION_CACHE_TTL_MS,
    }
  } catch {
    return null
  }
}

function saveWorkspaceBrainCacheStore(storage: Storage, workspacePath: string, snapshot: AtlasWorkspaceBrainSnapshot) {
  try {
    const cache = readWorkspaceBrainCacheStore(storage)
    cache[workspaceBrainCacheKey(workspacePath)] = {
      snapshot,
      cachedAt: Date.now(),
    }
    const boundedCache = Object.fromEntries(
      Object.entries(cache)
        .filter(([, entry]) => validWorkspaceBrainCacheEntry(entry, WORKSPACE_BRAIN_CACHE_TTL_MS))
        .sort(([, a], [, b]) => b.cachedAt - a.cachedAt)
        .slice(0, 12),
    )
    storage.setItem(WORKSPACE_BRAIN_CACHE_STORAGE, JSON.stringify(boundedCache))
  } catch {
    /* ignore */
  }
}

function saveWorkspaceBrainCache(workspacePath: string, snapshot: AtlasWorkspaceBrainSnapshot | null) {
  if (!snapshot || snapshot.status !== 'ready') return
  saveWorkspaceBrainCacheStore(sessionStorage, workspacePath, snapshot)
  saveWorkspaceBrainCacheStore(localStorage, workspacePath, snapshot)
}

function awisRuntimeSnapshotCacheKey(workspaceSlug: string, task: string): string {
  return `${workspaceSlug.trim().toLowerCase()}::${task.trim().toLowerCase()}`
}

function loadAwisRuntimeSnapshotCache(workspaceSlug: string, task: string): AwisRuntimeSnapshotState | null {
  try {
    const raw = localStorage.getItem(AWIS_RUNTIME_SNAPSHOT_STORAGE)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const entry = (parsed as Record<string, AwisRuntimeSnapshotCacheEntry>)[awisRuntimeSnapshotCacheKey(workspaceSlug, task)]
    if (!entry || typeof entry.cachedAt !== 'number') return null
    if (Date.now() - entry.cachedAt > AWIS_RUNTIME_SNAPSHOT_TTL_MS) return null
    return entry.state ?? null
  } catch {
    return null
  }
}

function saveAwisRuntimeSnapshotCache(workspaceSlug: string, task: string, state: AwisRuntimeSnapshotState) {
  if (state.status !== 'ready' || !state.persisted) return
  try {
    const raw = localStorage.getItem(AWIS_RUNTIME_SNAPSHOT_STORAGE)
    const parsed = raw ? JSON.parse(raw) as unknown : {}
    const cache = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, AwisRuntimeSnapshotCacheEntry>
      : {}
    cache[awisRuntimeSnapshotCacheKey(workspaceSlug, task)] = {
      state,
      cachedAt: Date.now(),
    }
    localStorage.setItem(AWIS_RUNTIME_SNAPSHOT_STORAGE, JSON.stringify(cache))
  } catch {
    /* ignore */
  }
}

function runtimeSnapshotStateFromPayload(payload: Awaited<ReturnType<typeof persistAtlasAwisRuntimeSnapshot>>): AwisRuntimeSnapshotState {
  if (!payload) {
    return { status: 'unavailable', persisted: false }
  }
  const status: AwisRuntimeSnapshotState['status'] =
    payload.status === 'ready'
      ? 'ready'
      : payload.status === 'blocked'
        ? 'blocked'
        : 'unavailable'
  return {
    status,
    persisted: Boolean(payload.persisted_snapshot_id),
    snapshotHash: payload.workspace_learning_snapshot?.snapshot_hash ?? null,
    brainHash: payload.workspace_next_session_brain?.brain_hash ?? null,
    liveMemoryHash: payload.workspace_live_execution_memory?.live_memory_hash ?? null,
    projectionCount: Array.isArray(payload.persisted_projection_ids)
      ? payload.persisted_projection_ids.length
      : null,
  }
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
  const [awisRuntimeSnapshot, setAwisRuntimeSnapshot] = useState<AwisRuntimeSnapshotState | null>(null)
  const [workspaceBrain, setWorkspaceBrain] = useState<AtlasWorkspaceBrainSnapshot | null>(null)
  const [workspaceBrainLoading, setWorkspaceBrainLoading] = useState(false)
  const [workspaceMemory, setWorkspaceMemory] = useState<AwisWorkspaceMemorySnapshot | null>(null)
  const [workspaceEvolution, setWorkspaceEvolution] = useState<AwisWorkspaceEvolutionProjection | null>(null)
  const [workspaceRelations, setWorkspaceRelations] = useState<AwisWorkspaceRelationProjection | null>(null)
  const [workspaceSpaceProjection, setWorkspaceSpaceProjection] = useState<AwisWorkspaceSpaceProjection | null>(null)
  const [workspaceArtifactLake, setWorkspaceArtifactLake] = useState<AwisWorkspaceArtifactLakeSummary | null>(null)
  const [workspaceArtifactReplay, setWorkspaceArtifactReplay] = useState<AwisWorkspaceArtifactReplayProjection | null>(null)
  const [workspaceLiveExecutionMemory, setWorkspaceLiveExecutionMemory] = useState<AwisWorkspaceLiveExecutionMemoryProjection | null>(null)
  const [workspaceNextSessionBrain, setWorkspaceNextSessionBrain] = useState<AwisWorkspaceNextSessionBrainProjection | null>(null)
  const [workspaceHandoffPack, setWorkspaceHandoffPack] = useState<AwisWorkspaceHandoffProjection | null>(null)
  const [projectSpaceContextPacks, setProjectSpaceContextPacks] = useState<LocalProjectSpaceContextPack[]>([])
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
  const workspaceMemoryLearnedRef = useRef<string | null>(null)
  const awisNativeMemoryHydratedRef = useRef<string | null>(null)
  const awisNativeArtifactHydratedRef = useRef<string | null>(null)
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
      if (availableWorkspaceThreadIds.has(id)) {
        setWorkbenchThreadIds([id])
        setWorkbenchFocusedThreadId(id)
      } else {
        setWorkbenchThreadIds([])
        setWorkbenchFocusedThreadId(null)
      }
      atlas.selectThread(id)
    },
    [atlas, availableWorkspaceThreadIds],
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

  const persistAwisWorkspaceMemory = useCallback((memory: AwisWorkspaceMemorySnapshot) => {
    saveAwisWorkspaceMemory(memory)
    void bridge.saveAwisWorkspaceMemory(memory.workspaceKey, memory)
  }, [])

  const persistAwisWorkspaceArtifact = useCallback((artifact: NonNullable<ReturnType<typeof buildAwisWorkspaceArtifact>>) => {
    const summary = saveAwisWorkspaceArtifact(artifact)
    if (summary) {
      void bridge.saveAwisWorkspaceArtifacts(
        artifact.workspace_key,
        loadAwisWorkspaceArtifacts(artifact.workspace_key),
      )
    }
    return summary
  }, [])

  const rememberAwisMaintenance = useCallback((input: {
    action: AwisWorkspaceMaintenanceAction
    label: string
    status: 'succeeded' | 'failed' | 'skipped'
    reason?: string | null
    evidence?: string[] | null
  }) => {
    const key = workspaceMemoryKey(effectiveWorkspacePath, effectiveWorkspaceSlug)
    const previous = loadAwisWorkspaceMemory(key)
    const update = recordAwisWorkspaceMaintenance(previous, {
      workspaceKey: key,
      workspaceName: effectiveWorkspaceName ?? previous?.workspaceName ?? key,
      rootPath: effectiveWorkspacePath ?? previous?.rootPath ?? '',
      action: input.action,
      label: input.label,
      status: input.status,
      reason: input.reason,
      evidence: input.evidence,
    })
    persistAwisWorkspaceMemory(update.memory)
    const memories = loadAwisWorkspaceMemories()
    setWorkspaceMemory(update.memory)
    setWorkspaceEvolution(buildAwisWorkspaceEvolutionProjection(memories, key))
    setWorkspaceRelations(buildAwisWorkspaceRelationProjection(memories, key))
  }, [effectiveWorkspaceName, effectiveWorkspacePath, effectiveWorkspaceSlug, persistAwisWorkspaceMemory])

  const handleAwisRefreshFolderMap = useCallback(async () => {
    const workspacePath = effectiveWorkspacePath?.trim()
    if (!effectiveWorkspaceHasRepo || !workspacePath) {
      showWorkbenchNotice('Escolha a pasta local para atualizar o mapa.')
      rememberAwisMaintenance({
        action: 'refresh_folder_map',
        label: 'mapa local',
        status: 'skipped',
        reason: 'pasta local ausente',
      })
      return
    }
    setWorkspaceBrainLoading(true)
    try {
      const snapshot = await bridge.scanWorkspaceBrain(workspacePath)
      setWorkspaceBrain(snapshot)
      saveWorkspaceBrainCache(workspacePath, snapshot)
      rememberAwisMaintenance({
        action: 'refresh_folder_map',
        label: 'mapa local',
        status: snapshot?.status === 'ready' ? 'succeeded' : 'failed',
        reason: snapshot?.status === 'ready' ? 'scan local concluído' : 'scan local não ficou pronto',
        evidence: snapshot?.status === 'ready'
          ? [
              `${snapshot.filesSeen} arquivos`,
              ...snapshot.signals.slice(0, 3),
            ]
          : [],
      })
      showWorkbenchNotice(snapshot?.status === 'ready'
        ? 'Mapa local atualizado. AWIS vai reaprender este workspace.'
        : 'Mapa local não ficou pronto agora.')
      setWorkspaceBrainLoading(false)
    } catch {
      rememberAwisMaintenance({
        action: 'refresh_folder_map',
        label: 'mapa local',
        status: 'failed',
        reason: 'bridge não retornou scan',
      })
      showWorkbenchNotice('Não consegui atualizar o mapa local agora.')
      setWorkspaceBrainLoading(false)
    }
  }, [effectiveWorkspaceHasRepo, effectiveWorkspacePath, rememberAwisMaintenance, showWorkbenchNotice])

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
    const clearOnHidden = () => {
      if (document.visibilityState === 'hidden') clearStageDrop()
    }
    window.addEventListener('dragend', clearStageDrop)
    window.addEventListener('dragcancel', clearStageDrop)
    window.addEventListener('drop', clearStageDrop)
    window.addEventListener('mouseup', clearStageDrop)
    window.addEventListener('pointerup', clearStageDrop)
    window.addEventListener('blur', clearStageDrop)
    window.addEventListener('keydown', clearOnEscape)
    document.addEventListener('mouseleave', clearStageDrop)
    document.addEventListener('visibilitychange', clearOnHidden)
    return () => {
      window.removeEventListener('dragend', clearStageDrop)
      window.removeEventListener('dragcancel', clearStageDrop)
      window.removeEventListener('drop', clearStageDrop)
      window.removeEventListener('mouseup', clearStageDrop)
      window.removeEventListener('pointerup', clearStageDrop)
      window.removeEventListener('blur', clearStageDrop)
      window.removeEventListener('keydown', clearOnEscape)
      document.removeEventListener('mouseleave', clearStageDrop)
      document.removeEventListener('visibilitychange', clearOnHidden)
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
    if (!ENABLE_AWIS_LOCAL_INTELLIGENCE) {
      setWorkspaceBrain(null)
      setWorkspaceBrainLoading(false)
      return
    }

    const workspacePath = effectiveWorkspacePath?.trim()
    if (!effectiveWorkspaceHasRepo || !workspacePath) {
      setWorkspaceBrain(null)
      setWorkspaceBrainLoading(false)
      return
    }

    let cancelled = false
    const cached = loadWorkspaceBrainCache(workspacePath)
    if (cached) {
      setWorkspaceBrain(cached.snapshot)
      setWorkspaceBrainLoading(cached.shouldRefresh)
      if (!cached.shouldRefresh) {
        return () => {
          cancelled = true
        }
      }
    } else {
      setWorkspaceBrainLoading(true)
    }
    void bridge.scanWorkspaceBrain(workspacePath).then((snapshot) => {
      if (cancelled) return
      setWorkspaceBrain(snapshot)
      saveWorkspaceBrainCache(workspacePath, snapshot)
      setWorkspaceBrainLoading(false)
    }).catch(() => {
      if (cancelled) return
      if (!cached) setWorkspaceBrain(null)
      setWorkspaceBrainLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [effectiveWorkspaceHasRepo, effectiveWorkspacePath])

  useEffect(() => {
    const key = workspaceMemoryKey(effectiveWorkspacePath, effectiveWorkspaceSlug)
    const memories = loadAwisWorkspaceMemories()
    setWorkspaceMemory(loadAwisWorkspaceMemory(key))
    setWorkspaceEvolution(buildAwisWorkspaceEvolutionProjection(memories, key))
    setWorkspaceRelations(buildAwisWorkspaceRelationProjection(memories, key))
    setWorkspaceSpaceProjection(loadAwisWorkspaceSpaceProjection(key))
    setWorkspaceArtifactLake(loadAwisWorkspaceArtifactLakeSummary(key))
    setWorkspaceArtifactReplay(loadAwisWorkspaceArtifactReplayProjection(key))
    setWorkspaceLiveExecutionMemory(loadAwisWorkspaceLiveExecutionMemoryProjection(key))
    setWorkspaceNextSessionBrain(null)
    setWorkspaceHandoffPack(null)
    workspaceMemoryLearnedRef.current = null
  }, [effectiveWorkspacePath, effectiveWorkspaceSlug])

  useEffect(() => {
    const key = workspaceMemoryKey(effectiveWorkspacePath, effectiveWorkspaceSlug)
    if (awisNativeMemoryHydratedRef.current === key) return
    awisNativeMemoryHydratedRef.current = key
    let cancelled = false
    void bridge.loadAwisWorkspaceMemoryStore().then((nativeStore) => {
      if (cancelled || !nativeStore) return
      const nativeMemories = normalizeAwisWorkspaceMemoryStore(nativeStore)
      if (Object.keys(nativeMemories).length === 0) return
      const merged = mergeAwisWorkspaceMemoryStores(loadAwisWorkspaceMemories(), nativeMemories)
      saveAwisWorkspaceMemories(merged)
      setWorkspaceMemory(loadAwisWorkspaceMemory(key))
      setWorkspaceEvolution(buildAwisWorkspaceEvolutionProjection(merged, key))
      setWorkspaceRelations(buildAwisWorkspaceRelationProjection(merged, key))
      const current = loadAwisWorkspaceMemory(key)
      if (current) void bridge.saveAwisWorkspaceMemory(current.workspaceKey, current)
    })
    return () => {
      cancelled = true
    }
  }, [effectiveWorkspacePath, effectiveWorkspaceSlug])

  useEffect(() => {
    const key = workspaceMemoryKey(effectiveWorkspacePath, effectiveWorkspaceSlug)
    if (awisNativeArtifactHydratedRef.current === key) return
    awisNativeArtifactHydratedRef.current = key
    let cancelled = false
    void bridge.loadAwisWorkspaceArtifactStore().then((nativeStore) => {
      if (cancelled || !nativeStore) return
      const nativeArtifacts = normalizeAwisWorkspaceArtifactStore(nativeStore)
      if (Object.keys(nativeArtifacts).length === 0) return
      const merged = mergeAwisWorkspaceArtifactStores(loadAwisWorkspaceArtifactStore(), nativeArtifacts)
      saveAwisWorkspaceArtifactStore(merged)
      const currentArtifacts = loadAwisWorkspaceArtifacts(key)
      setWorkspaceArtifactLake(loadAwisWorkspaceArtifactLakeSummary(key))
      setWorkspaceArtifactReplay(loadAwisWorkspaceArtifactReplayProjection(key))
      if (currentArtifacts.length > 0) void bridge.saveAwisWorkspaceArtifacts(key, currentArtifacts)
    })
    return () => {
      cancelled = true
    }
  }, [effectiveWorkspacePath, effectiveWorkspaceSlug])

  useEffect(() => {
    if (!workspaceBrain || workspaceBrain.status !== 'ready') return
    const key = workspaceMemoryKey(effectiveWorkspacePath ?? workspaceBrain.rootPath, effectiveWorkspaceSlug)
    const learningKey = `${key}:${workspaceBrain.scannedAt}:${workspaceBrain.filesSeen}:${workspaceBrain.dirsSeen}`
    if (workspaceMemoryLearnedRef.current === learningKey) return
    workspaceMemoryLearnedRef.current = learningKey
    const previous = loadAwisWorkspaceMemory(key)
    const update = learnAwisWorkspaceMemory(previous, workspaceBrain, key)
    persistAwisWorkspaceMemory(update.memory)
    const memories = loadAwisWorkspaceMemories()
    setWorkspaceMemory(update.memory)
    setWorkspaceEvolution(buildAwisWorkspaceEvolutionProjection(memories, key))
    setWorkspaceRelations(buildAwisWorkspaceRelationProjection(memories, key))
  }, [effectiveWorkspacePath, effectiveWorkspaceSlug, persistAwisWorkspaceMemory, workspaceBrain])

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
    if (!ENABLE_AWIS_SERVER_INTELLIGENCE) {
      setAwisLearningLoop(null)
      return
    }

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

  useEffect(() => {
    if (!ENABLE_AWIS_SERVER_INTELLIGENCE) {
      setAwisRuntimeSnapshot(null)
      setWorkspaceLiveExecutionMemory(null)
      return
    }

    const workspace = effectiveWorkspaceSlug?.trim()
    if (!workspace || !effectiveWorkspaceHasRepo) {
      setAwisRuntimeSnapshot(null)
      setWorkspaceLiveExecutionMemory(null)
      return
    }

    const cachedLiveExecutionMemory = loadAwisWorkspaceLiveExecutionMemoryProjection(workspace)
    if (cachedLiveExecutionMemory) {
      setWorkspaceLiveExecutionMemory(cachedLiveExecutionMemory)
    }

    if (atlas.mode === 'offline' || awisServerHealth?.status !== 'ready') {
      setAwisRuntimeSnapshot(null)
      return
    }

    const task = atlas.threadDetail?.title?.trim() || 'Atlas AI workspace'
    const cached = loadAwisRuntimeSnapshotCache(workspace, task)
    if (cached) {
      setAwisRuntimeSnapshot(cached)
    }

    let cancelled = false
    setAwisRuntimeSnapshot((prev) => prev ?? { status: 'loading', persisted: false })
    void Promise.resolve().then(async () => {
      const latestLiveMemory = await getAtlasAwisLiveExecutionMemory(workspace, task, { latest: true })
      const serverLiveMemory = latestLiveMemory ?? await getAtlasAwisLiveExecutionMemory(workspace, task)
      const liveMemory = buildAwisWorkspaceLiveExecutionMemoryProjectionFromServer(serverLiveMemory)
      if (cancelled) return

      if (liveMemory) {
        setWorkspaceLiveExecutionMemory(liveMemory)
        saveAwisWorkspaceLiveExecutionMemoryProjection(workspace, liveMemory)
      }

      if (cached) {
        setAwisRuntimeSnapshot(cached)
        if (!liveMemory && cachedLiveExecutionMemory) {
          setWorkspaceLiveExecutionMemory(cachedLiveExecutionMemory)
        }
        return
      }

      const payload = await persistAtlasAwisRuntimeSnapshot(workspace, task)
      if (cancelled) return
      const state = runtimeSnapshotStateFromPayload(payload)
      const snapshotLiveMemory = buildAwisWorkspaceLiveExecutionMemoryProjectionFromServer(payload?.workspace_live_execution_memory)
      const effectiveLiveMemory = snapshotLiveMemory ?? liveMemory ?? cachedLiveExecutionMemory ?? null
      setAwisRuntimeSnapshot(state)
      setWorkspaceLiveExecutionMemory(effectiveLiveMemory)
      saveAwisRuntimeSnapshotCache(workspace, task, state)
      saveAwisWorkspaceLiveExecutionMemoryProjection(workspace, effectiveLiveMemory)
    })
    return () => {
      cancelled = true
    }
  }, [
    atlas.mode,
    atlas.threadDetail?.title,
    awisServerHealth?.status,
    effectiveWorkspaceHasRepo,
    effectiveWorkspaceSlug,
  ])

  useEffect(() => {
    if (!ENABLE_AWIS_SERVER_INTELLIGENCE) {
      return
    }

    const workspace = effectiveWorkspaceSlug?.trim()
    if (!workspace || atlas.mode === 'offline' || !effectiveWorkspaceHasRepo || awisServerHealth?.status !== 'ready') {
      return
    }

    const workspaceKeyValue = workspaceMemoryKey(effectiveWorkspacePath, effectiveWorkspaceSlug)
    const task = atlas.threadDetail?.title?.trim() || 'Atlas AI workspace'
    let cancelled = false
    void Promise.resolve().then(async () => {
      const latest = await getAtlasAwisArtifactIntelligence(workspace, task, { latest: true })
      const awair = latest ?? await getAtlasAwisArtifactIntelligence(workspace, task, { persist: true })
      if (cancelled) return
      const projections = buildAwisWorkspaceArtifactProjectionsFromServer(awair, workspaceKeyValue)
      if (!projections) return
      if (projections.artifactLake) setWorkspaceArtifactLake(projections.artifactLake)
      if (projections.artifactReplay) setWorkspaceArtifactReplay(projections.artifactReplay)
    })

    return () => {
      cancelled = true
    }
  }, [
    atlas.mode,
    atlas.threadDetail?.title,
    awisServerHealth?.status,
    effectiveWorkspaceHasRepo,
    effectiveWorkspacePath,
    effectiveWorkspaceSlug,
  ])

  const awisHandoffThreadIds = useMemo(() => {
    const fromStrongestSpace = projectSpaceContextPacks[0]?.source_thread_ids ?? []
    const candidates = fromStrongestSpace.length > 0 ? fromStrongestSpace : workbenchThreadIds
    return candidates.filter((threadId) => availableWorkspaceThreadIds.has(threadId)).slice(0, 4)
  }, [availableWorkspaceThreadIds, projectSpaceContextPacks, workbenchThreadIds])

  useEffect(() => {
    if (!ENABLE_AWIS_SERVER_INTELLIGENCE) {
      setWorkspaceNextSessionBrain(null)
      setWorkspaceHandoffPack(null)
      return
    }

    const workspace = effectiveWorkspaceSlug?.trim()
    if (!workspace || atlas.mode === 'offline' || !effectiveWorkspaceHasRepo || awisServerHealth?.status !== 'ready') {
      setWorkspaceNextSessionBrain(null)
      setWorkspaceHandoffPack(null)
      return
    }

    const task = atlas.threadDetail?.title?.trim() || 'Atlas AI workspace'
    let cancelled = false
    void Promise.resolve().then(async () => {
      const latestBrain = await getAtlasAwisNextSessionBrain(workspace, task, { latest: true })
      const brain = latestBrain ?? await getAtlasAwisNextSessionBrain(workspace, task)
      const handoff = await getAtlasAwisHandoffPack(workspace, task, {
        consumer: 'atlas_dev',
        threadIds: awisHandoffThreadIds,
      })
      if (cancelled) return
      setWorkspaceNextSessionBrain(buildAwisWorkspaceNextSessionBrainProjection(brain))
      setWorkspaceHandoffPack(buildAwisWorkspaceHandoffProjection(handoff))
    })

    return () => {
      cancelled = true
    }
  }, [
    atlas.mode,
    atlas.threadDetail?.title,
    awisHandoffThreadIds,
    awisServerHealth?.status,
    effectiveWorkspaceHasRepo,
    effectiveWorkspaceSlug,
  ])

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
      rememberAwisMaintenance({
        action: 'open_side_by_side',
        label: 'comparar sessões',
        status: 'skipped',
        reason: 'menos de duas conversas disponíveis',
      })
      return
    }

    setWorkbenchActive(true)
    setWorkbenchThreadIds(recommended)
    focusWorkbenchPane(recommended[0])
    rememberAwisMaintenance({
      action: 'open_side_by_side',
      label: 'comparar sessões',
      status: 'succeeded',
      reason: 'sessões abertas lado a lado',
      evidence: [`${recommended.length} sessões`],
    })
  }, [activeWorkspaceScope, atlas.selectedThreadId, atlas.threads, focusWorkbenchPane, rememberAwisMaintenance, showWorkbenchNotice])

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

  const liveWorkspaceSpaceProjection = useMemo(
    () => buildAwisWorkspaceSpaceProjection(projectSpaceContextPacks),
    [projectSpaceContextPacks],
  )

  useEffect(() => {
    if (!liveWorkspaceSpaceProjection) return
    const workspaceKey = workspaceMemoryKey(effectiveWorkspacePath, effectiveWorkspaceSlug)
    saveAwisWorkspaceSpaceProjection(workspaceKey, liveWorkspaceSpaceProjection)
    setWorkspaceSpaceProjection(liveWorkspaceSpaceProjection)
  }, [effectiveWorkspacePath, effectiveWorkspaceSlug, liveWorkspaceSpaceProjection])

  const awisWorkspaceContextPack = useMemo(
    () => {
      const workspaceKey = workspaceMemoryKey(effectiveWorkspacePath, effectiveWorkspaceSlug)
      const spaces = liveWorkspaceSpaceProjection ?? workspaceSpaceProjection
      return buildAwisWorkspaceContextPack({
        workspaceKey,
        workspaceName: effectiveWorkspaceName,
        brain: workspaceBrain,
        memory: workspaceMemory,
        evolution: workspaceEvolution,
        relations: workspaceRelations,
        spaces,
        artifactLake: workspaceArtifactLake,
        artifactReplay: workspaceArtifactReplay,
        nextSessionBrain: workspaceNextSessionBrain,
        liveExecutionMemory: workspaceLiveExecutionMemory,
        handoffPack: workspaceHandoffPack,
      })
    },
    [
      effectiveWorkspaceName,
      effectiveWorkspacePath,
      effectiveWorkspaceSlug,
      liveWorkspaceSpaceProjection,
      workspaceSpaceProjection,
      workspaceBrain,
      workspaceArtifactLake,
      workspaceArtifactReplay,
      workspaceHandoffPack,
      workspaceLiveExecutionMemory,
      workspaceNextSessionBrain,
      workspaceEvolution,
      workspaceRelations,
      workspaceMemory,
    ],
  )
  const effectiveWorkspaceNextSessionBrain =
    workspaceNextSessionBrain ?? awisWorkspaceContextPack?.next_session_brain ?? null
  const effectiveWorkspaceLiveExecutionMemory =
    workspaceLiveExecutionMemory ?? awisWorkspaceContextPack?.live_execution_memory ?? null

  useEffect(() => {
    if (!awisWorkspaceContextPack?.startup_snapshot) return
    const artifact = buildAwisWorkspaceArtifact(awisWorkspaceContextPack)
    if (!artifact) return
    if (awisAutoSavedArtifactHashesRef.current.has(artifact.artifact_hash)) return
    const summary = persistAwisWorkspaceArtifact(artifact)
    if (summary) {
      awisAutoSavedArtifactHashesRef.current.add(artifact.artifact_hash)
      setWorkspaceArtifactReplay(loadAwisWorkspaceArtifactReplayProjection(artifact.workspace_key))
      setWorkspaceArtifactLake((prev) => (
        prev?.latest_artifact_hash === summary.latest_artifact_hash &&
        prev.artifact_count === summary.artifact_count &&
        prev.latest_created_at === summary.latest_created_at
          ? prev
          : summary
      ))
    }
  }, [awisWorkspaceContextPack, persistAwisWorkspaceArtifact])

  const handleAwisPreserveArtifact = useCallback(() => {
    if (!awisWorkspaceContextPack?.startup_snapshot) {
      rememberAwisMaintenance({
        action: 'preserve_artifact',
        label: 'snapshot AWIS',
        status: 'skipped',
        reason: 'contexto insuficiente',
      })
      showWorkbenchNotice('AWIS ainda não tem contexto suficiente para salvar ouro.')
      return
    }
    const artifact = buildAwisWorkspaceArtifact(awisWorkspaceContextPack)
    if (!artifact) {
      rememberAwisMaintenance({
        action: 'preserve_artifact',
        label: 'snapshot AWIS',
        status: 'skipped',
        reason: 'snapshot indisponível',
      })
      showWorkbenchNotice('AWIS ainda não gerou um snapshot reutilizável.')
      return
    }
    const summary = persistAwisWorkspaceArtifact(artifact)
    if (!summary) {
      rememberAwisMaintenance({
        action: 'preserve_artifact',
        label: 'snapshot AWIS',
        status: 'failed',
        reason: 'storage local recusou artifact',
      })
      showWorkbenchNotice('Não consegui preservar o snapshot AWIS agora.')
      return
    }
    setWorkspaceArtifactReplay(loadAwisWorkspaceArtifactReplayProjection(artifact.workspace_key))
    setWorkspaceArtifactLake(summary)
    rememberAwisMaintenance({
      action: 'preserve_artifact',
      label: artifact.title,
      status: 'succeeded',
      reason: 'artifact salvo para próxima partida',
      evidence: [
        artifact.artifact_hash,
        `${summary.artifact_count} artifact(s)`,
      ],
    })
    showWorkbenchNotice('Ouro AWIS preservado para a próxima conversa.')
  }, [awisWorkspaceContextPack, persistAwisWorkspaceArtifact, rememberAwisMaintenance, showWorkbenchNotice])

  const buildAwisSendContext = useCallback((userInput: string): {
    conversationContext: unknown[] | undefined
    taskContext: AwisWorkspaceTaskContextProjection | null
  } => {
    if (!awisWorkspaceContextPack) {
      return { conversationContext: undefined, taskContext: null }
    }
    const taskContext: AwisWorkspaceTaskContextProjection | null = buildAwisWorkspaceTaskContextProjection(
      awisWorkspaceContextPack,
      userInput,
    )
    const providerCapsule = buildAwisWorkspaceProviderCapsule(awisWorkspaceContextPack, taskContext)
    return {
      conversationContext: [
        ...(providerCapsule ? [providerCapsule] : []),
        awisWorkspaceContextPack,
        ...(taskContext ? [taskContext] : []),
      ],
      taskContext,
    }
  }, [awisWorkspaceContextPack])

  const awisPendingTraceContextsRef = useRef(new Map<string, {
    channel: 'conversation' | 'workbench' | 'voice'
    taskContext: AwisWorkspaceTaskContextProjection | null
  }>())
  const awisRecordedTerminalTraceIdsRef = useRef(new Set<string>())
  const awisAutoSavedArtifactHashesRef = useRef(new Set<string>())

  const rememberAwisInteraction = useCallback((
    channel: 'conversation' | 'workbench' | 'voice',
    trace: AiTrace | null,
    taskContext: AwisWorkspaceTaskContextProjection | null = null,
  ) => {
    const key = workspaceMemoryKey(effectiveWorkspacePath, effectiveWorkspaceSlug)
    const previous = loadAwisWorkspaceMemory(key)
    const spaceLabels = awisWorkspaceContextPack?.spaces?.strongest_spaces
      .map((space) => space.title)
      .slice(0, 4) ?? null
    const liveMemoryLabels = awisWorkspaceContextPack?.live_execution_memory
      ? [
          awisWorkspaceContextPack.live_execution_memory.memory_hash,
          ...awisWorkspaceContextPack.live_execution_memory.startup_packet.load_first.slice(0, 2),
        ]
      : null
    const priorityLoadLabels = awisWorkspaceContextPack?.context_kernel?.priority_load
      .map((item) => item.label)
      .slice(0, 6) ?? null
    const spaceBrainLabels = taskContext?.recommended_context.space_brain
      .flatMap((space) => [
        space.title,
        ...space.load_first.map((item) => `${space.title}:${item}`),
        ...space.carry_forward.map((item) => `${space.title}:${item}`),
      ])
      .slice(0, 6) ?? null
    const update = recordAwisWorkspaceInteraction(previous, {
      workspaceKey: key,
      workspaceName: effectiveWorkspaceName ?? previous?.workspaceName ?? key,
      rootPath: effectiveWorkspacePath ?? previous?.rootPath ?? '',
      occurredAt: trace?.completed_at ?? trace?.updated_at ?? trace?.created_at ?? null,
      channel,
      status: trace?.status ?? 'send_failed',
      provider: trace?.provider ?? null,
      model: trace?.model ?? null,
      latencyMs: trace?.latency_ms ?? null,
      contextPackApplied: Boolean(awisWorkspaceContextPack),
      taskKind: taskContext?.task_kind ?? null,
      routeKey: taskContext?.task_kind ? `task:${taskContext.task_kind}` : null,
      routeLabel: taskContext?.execution_plan.suggested_surface ?? null,
      contextGoldLabels: taskContext?.recommended_context.task_gold.map((item) => `${item.kind}:${item.label}`) ?? null,
      validationCommands: taskContext?.execution_plan.validation_commands ?? null,
      componentKeys: taskContext
        ? Array.from(new Set([
            ...taskContext.recommended_context.components.map((component) => component.key),
            ...taskContext.recommended_context.component_context_packs.map((componentPack) => componentPack.key),
            ...taskContext.recommended_context.component_intent_ranking.slice(0, 2).map((component) => component.key),
          ])).slice(0, 4)
        : null,
      spaceLabels,
      spaceBrainLabels,
      liveMemoryLabels,
      priorityLoadLabels,
    })
    persistAwisWorkspaceMemory(update.memory)
    const memories = loadAwisWorkspaceMemories()
    setWorkspaceMemory(update.memory)
    setWorkspaceEvolution(buildAwisWorkspaceEvolutionProjection(memories, key))
    setWorkspaceRelations(buildAwisWorkspaceRelationProjection(memories, key))
  }, [awisWorkspaceContextPack, effectiveWorkspaceName, effectiveWorkspacePath, effectiveWorkspaceSlug, persistAwisWorkspaceMemory])

  const registerAwisTraceContext = useCallback((
    trace: AiTrace | null,
    channel: 'conversation' | 'workbench' | 'voice',
    taskContext: AwisWorkspaceTaskContextProjection | null,
  ) => {
    if (!trace?.id) return
    awisPendingTraceContextsRef.current.set(trace.id, { channel, taskContext })
  }, [])

  useEffect(() => {
    const trace = atlas.lastTerminalTrace
    if (!trace?.id || awisRecordedTerminalTraceIdsRef.current.has(trace.id)) return
    awisRecordedTerminalTraceIdsRef.current.add(trace.id)
    const context = awisPendingTraceContextsRef.current.get(trace.id)
    awisPendingTraceContextsRef.current.delete(trace.id)
    rememberAwisInteraction(context?.channel ?? 'conversation', trace, context?.taskContext ?? null)
  }, [atlas.lastTerminalTrace, rememberAwisInteraction])

  const handleWorkbenchSend = useCallback(
    async (threadId: string, options?: AtlasAiComposerSendExtras) => {
      const sendingText = workbenchDrafts[threadId] ?? ''
      const sendContext = buildAwisSendContext(sendingText)
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
        conversationContext: sendContext.conversationContext,
      })
      if (sendingText.trim() !== '') {
        if (trace) {
          registerAwisTraceContext(trace, 'workbench', sendContext.taskContext)
        } else {
          rememberAwisInteraction('workbench', null, sendContext.taskContext)
        }
      }
      if (!trace && sendingText.trim() !== '') {
        setWorkbenchDrafts((prev) => ({ ...prev, [threadId]: sendingText }))
      }
    },
    [atlas, buildAwisSendContext, focusWorkbenchPane, registerAwisTraceContext, rememberAwisInteraction, workbenchDrafts],
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
      const sendContext = buildAwisSendContext(sendingText)
      setComposerDraft('')
      const trace = await atlas.send(sendingText, {
        newThread: options?.newThread,
        uploadedImageIds: options?.attachments?.uploaded_image_ids,
        uploadedDocumentIds: options?.attachments?.uploaded_document_ids,
        textBlocks: options?.attachments?.text_blocks,
        urlAttachments: options?.attachments?.url_attachments,
        richInputPayload: options?.richInputCanonical,
        computeEffort: options?.computeEffort,
        conversationContext: sendContext.conversationContext,
      })
      if (sendingText.trim() !== '') {
        if (trace) {
          registerAwisTraceContext(trace, 'conversation', sendContext.taskContext)
        } else {
          rememberAwisInteraction('conversation', null, sendContext.taskContext)
        }
      }
      if (!trace && sendingText.trim() !== '') {
        setComposerDraft(sendingText)
      }
    },
    [atlas, buildAwisSendContext, composerDraft, registerAwisTraceContext, rememberAwisInteraction],
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
      const sendContext = buildAwisSendContext(textToSend)
      const trace = await atlas.send(textToSend, {
        newThread: atlas.selectedThreadId === null,
        title: textToSend.slice(0, 80),
        voiceConversation: true,
        conversationContext: sendContext.conversationContext,
      })
      if (trace) {
        registerAwisTraceContext(trace, 'voice', sendContext.taskContext)
      } else {
        rememberAwisInteraction('voice', null, sendContext.taskContext)
      }
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
    buildAwisSendContext,
    atlas.pendingTrace,
    atlas.selectedThreadId,
    atlas.sending,
    clearVoiceRearmTimer,
    rememberAwisInteraction,
    registerAwisTraceContext,
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
  const runningThreadIds = useMemo(() => {
    const ids = new Set<string>()
    const pendingTraceThreadId = atlas.pendingTrace?.thread_id ?? null
    if (pendingTraceThreadId) ids.add(pendingTraceThreadId)
    if (atlas.pendingUserMessage?.threadId) ids.add(atlas.pendingUserMessage.threadId)
    if (workbenchPendingThreadId) ids.add(workbenchPendingThreadId)
    return ids
  }, [
    atlas.pendingTrace,
    atlas.pendingUserMessage,
    workbenchPendingThreadId,
  ])
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
      workspaceBrain: workspaceBrainLoading ? null : workspaceBrain,
      workspaceMemory,
      workspaceLearning: awisWorkspaceContextPack?.learning ?? null,
      workspaceSessionGold: awisWorkspaceContextPack?.session_gold ?? null,
      workspaceEvolution,
      workspaceRelations,
      workspaceTopology: awisWorkspaceContextPack?.topology ?? null,
      workspaceArtifactLake,
      workspaceArtifactReplay,
      workspaceContinuity: awisWorkspaceContextPack?.continuity ?? null,
      workspaceAutomation: awisWorkspaceContextPack?.automation ?? null,
      workspaceConfidence: awisWorkspaceContextPack?.confidence ?? null,
      workspaceLivingGraph: awisWorkspaceContextPack?.living_graph ?? null,
      workspaceContextKernel: awisWorkspaceContextPack?.context_kernel ?? null,
      workspaceSelfImprovement: awisWorkspaceContextPack?.self_improvement ?? null,
      workspaceRetention: awisWorkspaceContextPack?.retention ?? null,
      workspaceStartupOrchestration: awisWorkspaceContextPack?.startup_orchestration ?? null,
      workspacePreflight: awisWorkspaceContextPack?.preflight ?? null,
      workspaceTwin: awisWorkspaceContextPack?.workspace_twin ?? null,
      workspaceLaunchContract: awisWorkspaceContextPack?.launch_contract ?? null,
      workspaceLiveExecutionMemory: effectiveWorkspaceLiveExecutionMemory,
      workspaceNextSessionBrain: effectiveWorkspaceNextSessionBrain,
      workspaceHandoffPack,
      runtimeSnapshot: awisRuntimeSnapshot,
    }),
    [
      activeWorkspaceThreadCount,
      atlas.threadsError,
      awisLearningLoop,
      awisRuntimeSnapshot,
      awisServerHealth,
      effectiveWorkspaceProfile,
      effectiveProjectSpaceCount,
      runtimeReadiness.status,
      storedWorkbenchThreadIds.length,
      workspaceBrain,
      workspaceBrainLoading,
      workspaceArtifactLake,
      workspaceArtifactReplay,
      awisWorkspaceContextPack,
      effectiveWorkspaceLiveExecutionMemory,
      effectiveWorkspaceNextSessionBrain,
      workspaceHandoffPack,
      awisWorkspaceContextPack?.learning,
      workspaceEvolution,
      workspaceRelations,
      workspaceMemory,
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
  const selectedComposerSendError =
    atlas.sendErrorThreadId === null || atlas.sendErrorThreadId === atlas.selectedThreadId
      ? atlas.sendError
      : null
  const activePendingThreadId =
    atlas.pendingTrace?.thread_id ??
    atlas.pendingUserMessage?.threadId ??
    atlas.currentAtlasDevPlan?.thread_id ??
    null
  const selectedComposerSending =
    atlas.sending && (
      atlas.selectedThreadId === null ||
      activePendingThreadId === null ||
      activePendingThreadId === atlas.selectedThreadId
    )
  const leftRailToggle = (
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
  )

  return (
    <>
      {/* HEADER BAR — full-width acima dos rails (igual ObraBar do Code) */}
      <header className="atlas-ai-header-bar">
        <div className="atlas-ai-header-bar-start">
          {leftCollapsed ? leftRailToggle : null}
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
          onPrefetch={atlas.prefetchThread}
          onOpenBeside={handleOpenThreadBeside}
          onOpenInStage={handleOpenThreadInStage}
          onStageDragActive={setStageThreadDropActive}
          onProjectSpaceCountChange={setProjectSpaceCount}
          onProjectSpaceContextPacksChange={setProjectSpaceContextPacks}
          runningThreadIds={runningThreadIds}
          dragClearSignal={threadDragClearSignal}
          onOpenSpace={handleOpenSpace}
          onNewThread={() => {
            setWorkbenchActive(false)
            setWorkbenchThreadIds([])
            setWorkbenchFocusedThreadId(null)
            setWorkbenchDrafts({})
            setWorkbenchDetails({})
            setWorkbenchPendingThreadId(null)
            setComposerDraft('')
            atlas.selectThread(null)
            window.setTimeout(() => {
              document.querySelector<HTMLTextAreaElement>('.atlas-ai-textarea-v2')?.focus()
            }, 30)
          }}
          onMoveThreadToWorkspace={(threadId) => atlas.moveThreadToWorkspace(threadId, activeWorkspaceScope)}
          onFuseThreads={(threadIds) => void atlas.refreshConversationFusion(threadIds, { persist: true })}
          pinnedIds={pinnedIds}
          onContextMenu={handleThreadContextMenu}
          headerLeading={leftRailToggle}
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
              workspaceBrain={workspaceBrain}
              workspaceBrainLoading={workspaceBrainLoading}
              workspaceMemory={workspaceMemory}
              workspaceContinuity={awisWorkspaceContextPack?.continuity ?? null}
              workspaceAutomation={awisWorkspaceContextPack?.automation ?? null}
              workspaceConfidence={awisWorkspaceContextPack?.confidence ?? null}
              workspaceLivingGraph={awisWorkspaceContextPack?.living_graph ?? null}
              workspaceContextKernel={awisWorkspaceContextPack?.context_kernel ?? null}
              workspaceSelfImprovement={awisWorkspaceContextPack?.self_improvement ?? null}
              workspaceRetention={awisWorkspaceContextPack?.retention ?? null}
              workspaceRelations={workspaceRelations}
              workspacePreflight={awisWorkspaceContextPack?.preflight ?? null}
              workspaceTwin={awisWorkspaceContextPack?.workspace_twin ?? null}
              workspaceLaunchContract={awisWorkspaceContextPack?.launch_contract ?? null}
              workspaceLiveExecutionMemory={effectiveWorkspaceLiveExecutionMemory}
              workspaceNextSessionBrain={effectiveWorkspaceNextSessionBrain}
              workspaceHandoffPack={workspaceHandoffPack}
              storedSessionCount={storedWorkbenchThreadIds.length}
              canResume={storedWorkbenchThreadIds.length > 0 && !isWorkbenchOpen}
              onResume={handleResumeWorkbench}
              onOpenRecommendedSideBySide={handleOpenRecommendedSideBySide}
              onConfigure={handleAwisConfigureProject}
              onChooseFolder={handleAwisChooseFolder}
              onRefreshHealth={refreshAwisHealth}
              onRefreshFolderMap={handleAwisRefreshFolderMap}
              onPreserveArtifact={handleAwisPreserveArtifact}
              onRecordMaintenance={rememberAwisMaintenance}
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
                const paneHasPending = threadId === (activePendingThreadId ?? workbenchPendingThreadId)
                const paneHasSendError = atlas.sendErrorThreadId === threadId
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
                        onLoadOlder={threadId === atlas.selectedThreadId ? atlas.loadOlderThreadMessages : undefined}
                        hasOlderMessages={threadId === atlas.selectedThreadId ? atlas.threadHasOlderMessages : false}
                        olderMessagesLoading={threadId === atlas.selectedThreadId ? atlas.threadOlderMessagesLoading : false}
                        olderMessagesError={threadId === atlas.selectedThreadId ? atlas.threadOlderMessagesError : null}
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
                        sendError={paneHasSendError ? atlas.sendError : null}
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
            (() => {
              const selectedHasPending = Boolean(atlas.selectedThreadId && activePendingThreadId === atlas.selectedThreadId)
              return (
                <AtlasAiConversation
                  loading={conversation.loading}
                  detail={conversation.detail}
                  error={conversation.error}
                  pendingTrace={selectedHasPending ? conversation.pendingTrace : null}
                  pendingUserMessage={selectedHasPending ? conversation.pendingUserMessage : null}
                  streamingText={selectedHasPending ? conversation.streamingText : ''}
                  sending={selectedHasPending ? conversation.sending : false}
                  onArchive={atlas.archiveSelectedThread}
                  onPromote={() => setPromotionOpen(true)}
                  onCancel={atlas.cancelPending}
                  onLoadOlder={atlas.loadOlderThreadMessages}
                  hasOlderMessages={atlas.threadHasOlderMessages}
                  olderMessagesLoading={atlas.threadOlderMessagesLoading}
                  olderMessagesError={atlas.threadOlderMessagesError}
                  atlasDevPlan={selectedHasPending ? atlas.currentAtlasDevPlan : null}
                />
              )
            })()
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
            <div className="atlas-ai-composer-wrap" data-workspace-scope={effectiveWorkspaceScopeLabel}>
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
                sending={selectedComposerSending}
                sendError={selectedComposerSendError}
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
                  sending={selectedComposerSending}
                  awaitingResponse={atlas.pendingTrace !== null}
                  streaming={atlas.streamingText.trim().length > 0}
                  speechState={voiceSpeechState}
                  speechError={voiceSpeechError}
                  sendError={selectedComposerSendError}
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
  workspaceBrain,
  workspaceBrainLoading,
  workspaceMemory,
  workspaceContinuity,
  workspaceAutomation,
  workspaceConfidence,
  workspaceLivingGraph,
  workspaceContextKernel,
  workspaceSelfImprovement,
  workspaceRetention,
  workspaceRelations,
  workspacePreflight,
  workspaceTwin,
  workspaceLaunchContract,
  workspaceLiveExecutionMemory,
  workspaceNextSessionBrain,
  workspaceHandoffPack,
  storedSessionCount,
  canResume,
  onResume,
  onOpenRecommendedSideBySide,
  onConfigure,
  onChooseFolder,
  onRefreshHealth,
  onRefreshFolderMap,
  onPreserveArtifact,
  onRecordMaintenance,
}: {
  intelligence: AwisWorkspaceIntelligence
  workspaceName: string | null
  workspacePath: string | null
  workspaceFolderLabel: string
  workspaceFolderReady: boolean
  workspaceBrain: AtlasWorkspaceBrainSnapshot | null
  workspaceBrainLoading: boolean
  workspaceMemory: AwisWorkspaceMemorySnapshot | null
  workspaceContinuity: AwisWorkspaceContinuityProjection | null
  workspaceAutomation: AwisWorkspaceAutomationProjection | null
  workspaceConfidence: AwisWorkspaceConfidenceProjection | null
  workspaceLivingGraph: AwisWorkspaceLivingGraphProjection | null
  workspaceContextKernel: AwisWorkspaceContextKernelProjection | null
  workspaceSelfImprovement: AwisWorkspaceSelfImprovementProjection | null
  workspaceRetention: AwisWorkspaceRetentionProjection | null
  workspaceRelations: AwisWorkspaceRelationProjection | null
  workspacePreflight: AwisWorkspacePreflightProjection | null
  workspaceTwin: AwisWorkspaceTwinProjection | null
  workspaceLaunchContract: AwisWorkspaceLaunchContractProjection | null
  workspaceLiveExecutionMemory: AwisWorkspaceLiveExecutionMemoryProjection | null
  workspaceNextSessionBrain: AwisWorkspaceNextSessionBrainProjection | null
  workspaceHandoffPack: AwisWorkspaceHandoffProjection | null
  storedSessionCount: number
  canResume: boolean
  onResume: () => void
  onOpenRecommendedSideBySide: () => void
  onConfigure: () => void
  onChooseFolder: () => Promise<void> | void
  onRefreshHealth: () => void
  onRefreshFolderMap: () => Promise<void> | void
  onPreserveArtifact: () => void
  onRecordMaintenance: (input: {
    action: AwisWorkspaceMaintenanceAction
    label: string
    status: 'succeeded' | 'failed' | 'skipped'
    reason?: string | null
    evidence?: string[] | null
  }) => void
}) {
  const preflightBlockingGate = workspacePreflight?.gates.find((gate) => gate.status === 'blocked') ?? null
  const preflightWarningGate = workspacePreflight?.gates.find((gate) => gate.status === 'warn') ?? null
  const preflightGate = preflightBlockingGate ?? preflightWarningGate ?? workspacePreflight?.gates[0] ?? null
  const twinPrimaryComponent = workspaceTwin?.live_map.components[0] ?? null
  const twinFragileArea = workspaceTwin?.live_map.fragile_areas[0] ?? null
  const twinPrimaryApp = workspaceTwin?.genome.apps[0] ?? null
  const launchPrimaryLoad = workspaceLaunchContract?.startup_contract.first_load[0] ?? workspaceLaunchContract?.next_conversation.load_order[0] ?? null
  const launchPrimaryValidation = workspaceLaunchContract?.startup_contract.validate_before_trust[0] ?? workspaceLaunchContract?.human_contract.confirm_before[0] ?? null
  const liveMemoryLoad = workspaceLiveExecutionMemory?.startup_packet.load_first[0] ?? null
  const liveMemoryValidation = workspaceLiveExecutionMemory?.startup_packet.validate_before_trust[0] ?? null
  const nextSessionReady = workspaceNextSessionBrain?.status === 'ready'
  const handoffReady = workspaceHandoffPack?.status === 'ready'
  const startupLoadLabel =
    workspaceNextSessionBrain?.load_order[0]
    ?? workspaceNextSessionBrain?.focused_areas[0]
    ?? workspaceNextSessionBrain?.focused_repositories[0]?.repo_key
    ?? null
  const visibleCapabilities = Array.from(new Set([
    workspacePreflight ? (workspacePreflight.mode === 'ready' ? 'pré-checagem pronta' : 'pré-checagem ativa') : null,
    workspaceTwin ? 'mapa vivo do projeto' : null,
    workspaceLaunchContract ? 'partida viva' : null,
    workspaceLiveExecutionMemory ? 'memória viva' : null,
    nextSessionReady ? 'partida com memória' : null,
    handoffReady ? 'handoff seguro' : null,
    ...(workspaceTwin?.context_autopilot.load_first.length ? ['contexto guiado'] : []),
    ...intelligence.capabilities,
  ].filter((capability): capability is string => Boolean(capability)))).slice(0, 4)
  const visibleActions = intelligence.nextActions.slice(0, 2)
  const displayedScore = visibleActions.length > 0 ? Math.min(94, intelligence.score) : intelligence.score
  const canRefreshHealth = intelligence.liveSignal.label === 'serviço local' || intelligence.liveSignal.detail.includes('serviço local')
  const canOpenRecommendedSideBySide = visibleActions.includes('comparar sessões')
  const workspaceBrainReady = workspaceBrain?.status === 'ready' && workspaceBrain.filesSeen > 0
  const workspaceBrainTone = workspaceBrainLoading
    ? 'is-loading'
    : workspaceBrainReady
      ? 'is-ready'
      : workspaceFolderReady
        ? 'is-missing'
        : 'is-muted'
  const workspaceBrainTitle = workspaceBrainReady
    ? [
        `${workspaceBrain.filesSeen} arquivos`,
        workspaceBrain.signals.slice(0, 4).join(', '),
        workspaceBrain.truncated ? 'scan limitado para desempenho' : null,
      ].filter(Boolean).join(' · ')
    : workspaceBrainLoading
      ? 'Mapeando a pasta local sem ler conteúdo livre'
      : workspaceFolderReady
        ? 'Mapa local ainda indisponível'
        : 'Escolha a pasta para ativar o mapa local'
  const workspaceBrainLabel = workspaceBrainReady
    ? `${workspaceBrain.filesSeen} arquivos · ${workspaceBrain.signals[0] ?? workspaceBrain.languages[0]?.label ?? 'mapa local'}`
    : workspaceBrainLoading
      ? 'mapeando pasta'
      : workspaceFolderReady
        ? 'mapa pendente'
        : 'sem mapa local'
  const activeWorkspaceMemory = workspaceMemory?.scanCount ? workspaceMemory : null
  const workspaceMemoryReady = Boolean(activeWorkspaceMemory)
  const workspaceMemoryTitle = activeWorkspaceMemory
    ? [
        `${activeWorkspaceMemory.scanCount} leitura${activeWorkspaceMemory.scanCount === 1 ? '' : 's'}`,
        activeWorkspaceMemory.interactionCount > 0
          ? `${activeWorkspaceMemory.interactionCount} uso${activeWorkspaceMemory.interactionCount === 1 ? ' real' : 's reais'}`
          : null,
        activeWorkspaceMemory.stableSignals.slice(0, 4).map((signal) => signal.label).join(', '),
        activeWorkspaceMemory.driftEvents[0] ?? null,
      ].filter(Boolean).join(' · ')
    : workspaceBrainReady
      ? 'Memória local será ativada a partir deste mapa'
      : 'Ative a pasta para criar memória local'
  const workspaceMemoryLabel = activeWorkspaceMemory
    ? activeWorkspaceMemory.interactionCount > 0
      ? `${activeWorkspaceMemory.interactionCount} uso${activeWorkspaceMemory.interactionCount === 1 ? ' real' : 's reais'} · ${activeWorkspaceMemory.recentOutcomes[0]?.channel ?? 'aprendendo'}`
      : `${activeWorkspaceMemory.scanCount} leitura${activeWorkspaceMemory.scanCount === 1 ? '' : 's'} · ${activeWorkspaceMemory.stableSignals[0]?.label ?? activeWorkspaceMemory.stableLanguages[0]?.label ?? 'aprendendo'}`
    : workspaceBrainReady
      ? 'aprendendo agora'
      : 'aguardando mapa'
  const confidenceLeader = workspaceConfidence
    ? workspaceConfidence.ranked.commands[0]
      ?? workspaceConfidence.ranked.spaces[0]
      ?? workspaceConfidence.ranked.artifacts[0]
      ?? workspaceConfidence.ranked.transfers[0]
      ?? null
    : null
  const continuityLeader = workspaceContinuity?.restore_priority[0] ?? null
  const maintenanceLeader = workspaceAutomation?.maintenance_queue[0] ?? null
  const graphLeader = workspaceLivingGraph
    ? workspaceLivingGraph.nodes.find((node) => node.kind === 'space')
      ?? workspaceLivingGraph.nodes.find((node) => node.kind === 'component')
      ?? workspaceLivingGraph.nodes[0]
      ?? null
    : null
  const kernelLeader = workspaceContextKernel?.priority_load[0] ?? null
  const selfImprovementLeader = workspaceSelfImprovement?.improvement_queue[0] ?? null
  const retentionLeader = workspaceRetention?.lifecycle.revalidate[0] ?? workspaceRetention?.lifecycle.keep_hot[0] ?? null
  const connectionLeader = workspaceRelations?.connection_contracts[0] ?? null
  const awisTransferSignals = (workspaceRelations?.transfer_matrix ?? [])
    .slice(0, 3)
    .map((transfer) => {
      const confidenceTransfer = workspaceConfidence?.ranked.transfers.find((item) => item.label === transfer.workspace_hint) ?? null
      const reusable = transfer.reuse.find((item) => item.startsWith('space-brain:'))
        ?? transfer.reuse.find((item) => item.startsWith('ouro:'))
        ?? transfer.reuse.find((item) => item.startsWith('validação:'))
        ?? transfer.reuse[0]
        ?? 'aprendizado compatível'
      const validation = transfer.revalidate[0]
        ?? confidenceTransfer?.caution
        ?? 'validar antes de aplicar'
      return {
        key: `${transfer.workspace_hint}:${reusable}`,
        workspace: transfer.workspace_hint,
        reusable: reusable
          .replace(/^space-brain:/, 'Space Brain: ')
          .replace(/^ouro:/, 'Ouro: ')
          .replace(/^validação:/, 'Validação: ')
          .replace(/^comando:/, 'Comando: ')
          .replace(/^space:/, 'Space: ')
          .replace(/^memória viva:/, 'Memória: ')
          .replace(/^prioridade:/, 'Prioridade: '),
        validation,
        confidence: confidenceTransfer?.score ?? transfer.confidence,
      }
    })
  const launchMaintenance = workspaceLaunchContract?.automation_contract.maintenance_actions[0] ?? null
  const fallbackMaintenance = visibleActions[0] ?? (canRefreshHealth ? 'verificar serviço' : null)
  const recordCommandCenterMaintenance = (
    action: AwisWorkspaceMaintenanceAction,
    label: string,
    reason: string,
    evidence: string[],
    nextAction: (() => Promise<void> | void) | null,
  ) => {
    onRecordMaintenance({
      action,
      label,
      status: 'succeeded',
      reason,
      evidence,
    })
    if (nextAction) void nextAction()
  }
  const awisLivingQueue = [
    maintenanceLeader ? {
      key: `maintenance:${maintenanceLeader.action}:${maintenanceLeader.label}`,
      label: 'Automação',
      value: maintenanceLeader.label,
      detail: maintenanceLeader.reason,
      tone: maintenanceLeader.priority === 'high' ? 'warm' : 'quiet',
      actionLabel: maintenanceLeader.action === 'refresh_folder_map'
        ? 'atualizar'
        : maintenanceLeader.action === 'replay_artifacts' || maintenanceLeader.action === 'update_space_pack' || maintenanceLeader.action === 'record_outcome'
          ? 'salvar ouro'
          : maintenanceLeader.action === 'cross_workspace_transfer' || maintenanceLeader.action === 'revalidate_command'
            ? 'comparar'
            : null,
      onAction: maintenanceLeader.action === 'refresh_folder_map'
        ? onRefreshFolderMap
        : maintenanceLeader.action === 'replay_artifacts' || maintenanceLeader.action === 'update_space_pack' || maintenanceLeader.action === 'record_outcome'
          ? () => recordCommandCenterMaintenance(
              maintenanceLeader.action,
              maintenanceLeader.label,
              maintenanceLeader.reason,
              ['acionado pelo command center', maintenanceLeader.priority],
              onPreserveArtifact,
            )
          : maintenanceLeader.action === 'cross_workspace_transfer' || maintenanceLeader.action === 'revalidate_command'
            ? () => recordCommandCenterMaintenance(
                maintenanceLeader.action,
                maintenanceLeader.label,
                maintenanceLeader.reason,
                ['acionado pelo command center', maintenanceLeader.priority],
                onOpenRecommendedSideBySide,
              )
            : null,
    } : null,
    selfImprovementLeader ? {
      key: `evolution:${selfImprovementLeader.action}:${selfImprovementLeader.label}`,
      label: 'Evolução',
      value: selfImprovementLeader.label,
      detail: selfImprovementLeader.reason,
      tone: selfImprovementLeader.priority === 'high' ? 'strong' : 'warm',
      actionLabel: selfImprovementLeader.action === 'refresh_folder_map'
        ? 'atualizar'
        : selfImprovementLeader.action === 'preserve_artifact' || selfImprovementLeader.action === 'update_space_pack' || selfImprovementLeader.action === 'record_outcome'
          ? 'salvar ouro'
          : null,
      onAction: selfImprovementLeader.action === 'refresh_folder_map'
        ? onRefreshFolderMap
        : selfImprovementLeader.action === 'preserve_artifact' || selfImprovementLeader.action === 'update_space_pack' || selfImprovementLeader.action === 'record_outcome'
          ? () => recordCommandCenterMaintenance(
              selfImprovementLeader.action,
              selfImprovementLeader.label,
              selfImprovementLeader.reason,
              ['fila de evolução', selfImprovementLeader.priority],
              onPreserveArtifact,
            )
          : null,
    } : null,
    launchMaintenance ? {
      key: `launch:${workspaceLaunchContract?.seed_hash ?? launchMaintenance}`,
      label: 'Partida viva',
      value: launchMaintenance,
      detail: workspaceLaunchContract?.next_conversation.provider_note ?? 'contrato vivo prepara a próxima conversa',
      tone: workspaceLaunchContract?.launch_mode === 'deep' ? 'strong' : workspaceLaunchContract?.launch_mode === 'warm' ? 'warm' : 'quiet',
      actionLabel: workspaceLaunchContract?.startup_contract.preserve_artifact_after_success ? 'salvar ouro' : null,
      onAction: workspaceLaunchContract?.startup_contract.preserve_artifact_after_success ? onPreserveArtifact : null,
    } : null,
    connectionLeader ? {
      key: `connection:${connectionLeader.workspace_hint}:${connectionLeader.relationship}`,
      label: 'Repos conectados',
      value: connectionLeader.workspace_hint,
      detail: connectionLeader.validate[0] ?? connectionLeader.reuse[0] ?? 'reusar só com validação local',
      tone: connectionLeader.confidence >= 80 ? 'strong' : 'warm',
      actionLabel: 'comparar',
      onAction: () => recordCommandCenterMaintenance(
        'cross_workspace_transfer',
        connectionLeader.workspace_hint,
        connectionLeader.reuse[0] ?? connectionLeader.validate[0] ?? 'comparar aprendizado entre workspaces',
        [`confiança:${connectionLeader.confidence}`, connectionLeader.relationship],
        onOpenRecommendedSideBySide,
      ),
    } : null,
    workspaceRetention?.lifecycle.revalidate[0] ? {
      key: `retention:${workspaceRetention.lifecycle.revalidate[0]}`,
      label: 'Revalidar',
      value: workspaceRetention.lifecycle.revalidate[0],
      detail: workspaceRetention.policy.reason,
      tone: workspaceRetention.policy.mode === 'conservative' ? 'warm' : 'quiet',
      actionLabel: 'salvar ouro',
      onAction: onPreserveArtifact,
    } : null,
  ].filter((item): item is {
    key: string
    label: string
    value: string
    detail: string
    tone: string
    actionLabel: string | null
    onAction: (() => Promise<void> | void) | null
  } => Boolean(item)).slice(0, 3)
  const awisBrainSignals = [
    workspaceLaunchContract ? {
      key: 'launch-contract',
      label: 'Partida viva',
      value: `${workspaceLaunchContract.readiness_score}% · ${workspaceLaunchContract.launch_mode === 'deep' ? 'profunda' : workspaceLaunchContract.launch_mode === 'warm' ? 'quente' : 'guiada'}`,
      detail: launchPrimaryValidation
        ? `validar: ${launchPrimaryValidation}`
        : launchPrimaryLoad
          ? `carregar: ${launchPrimaryLoad}`
          : 'nova conversa nasce com contrato de contexto',
      tone: workspaceLaunchContract.launch_mode === 'deep' ? 'strong' : workspaceLaunchContract.launch_mode === 'warm' ? 'warm' : 'quiet',
    } : null,
    workspacePreflight ? {
      key: 'preflight',
      label: 'Pré-checagem',
      value: `${workspacePreflight.readiness_score}% · ${workspacePreflight.mode === 'ready' ? 'pronto' : workspacePreflight.mode === 'guarded' ? 'com atenção' : 'bloqueado'}`,
      detail: preflightGate
        ? `${preflightGate.label} · ${preflightGate.status === 'ready' ? 'ok' : preflightGate.evidence[0] ?? 'requer atenção'}`
        : 'confere contexto, validação, risco e aprendizado antes de executar',
      tone: workspacePreflight.mode === 'ready' ? 'strong' : workspacePreflight.mode === 'guarded' ? 'warm' : 'quiet',
    } : null,
    workspaceTwin ? {
      key: 'workspace-twin',
      label: 'Mapa vivo',
      value: twinPrimaryComponent
        ? `${workspaceTwin.readiness_score}% · ${twinPrimaryComponent.key}`
        : `${workspaceTwin.readiness_score}% · ${twinPrimaryApp ?? 'projeto mapeado'}`,
      detail: twinFragileArea
        ? `atenção em ${twinFragileArea}`
        : workspaceTwin.context_autopilot.reason,
      tone: workspaceTwin.stale ? 'warm' : workspaceTwin.readiness_score >= 70 ? 'strong' : 'quiet',
    } : null,
    workspaceLiveExecutionMemory ? {
      key: 'live-execution-memory',
      label: workspaceLiveExecutionMemory.source === 'server_awis_live_execution_memory' ? 'Memória canônica' : 'Memória viva',
      value: `${workspaceLiveExecutionMemory.readiness_score}% · ${workspaceLiveExecutionMemory.workspace_learning.repositories[0] ?? 'boot pronto'}`,
      detail: liveMemoryValidation
        ? `validar: ${liveMemoryValidation}`
        : liveMemoryLoad
          ? `carregar: ${liveMemoryLoad}`
          : 'próxima conversa nasce com memória operacional',
      tone: workspaceLiveExecutionMemory.source === 'server_awis_live_execution_memory' ? 'strong' : 'warm',
    } : null,
    handoffReady ? {
      key: 'handoff-pack',
      label: 'Handoff',
      value: `${(workspaceHandoffPack.consumer ?? 'provider').replace('_', ' ')} · pronto`,
      detail: `${workspaceHandoffPack.required_artifacts.slice(0, 3).join(', ')}${workspaceHandoffPack.required_artifacts.length > 3 ? '...' : ''}`,
      tone: 'strong',
    } : nextSessionReady ? {
      key: 'next-session-brain',
      label: 'Partida',
      value: startupLoadLabel ?? 'memória pronta',
      detail: workspaceNextSessionBrain?.context_loading.mode ?? 'nova conversa nasce com contexto reutilizável',
      tone: 'strong',
    } : null,
    confidenceLeader ? {
      key: 'confidence',
      label: 'Confiança',
      value: `${confidenceLeader.score}% · ${confidenceLeader.label}`,
      detail: confidenceLeader.caution ?? confidenceLeader.evidence[0] ?? 'evidência local acumulada',
      tone: confidenceLeader.score >= 80 && !confidenceLeader.caution ? 'strong' : confidenceLeader.score >= 60 ? 'warm' : 'quiet',
    } : intelligence.score > 0 ? {
      key: 'confidence-fallback',
      label: 'Confiança',
      value: `${displayedScore}% · ${intelligence.level === 'command' ? 'operação pronta' : intelligence.liveSignal.label}`,
      detail: intelligence.summary,
      tone: displayedScore >= 80 ? 'strong' : displayedScore >= 55 ? 'warm' : 'quiet',
    } : null,
    continuityLeader ? {
      key: 'continuity',
      label: 'Continuidade',
      value: continuityLeader.label,
      detail: `${continuityLeader.confidence}% · ${continuityLeader.why}`,
      tone: continuityLeader.confidence >= 80 ? 'strong' : 'warm',
    } : activeWorkspaceMemory ? {
      key: 'continuity-fallback',
      label: 'Continuidade',
      value: `${activeWorkspaceMemory.interactionCount || activeWorkspaceMemory.scanCount} ${activeWorkspaceMemory.interactionCount ? 'usos lembrados' : 'leituras salvas'}`,
      detail: workspaceMemoryTitle,
      tone: activeWorkspaceMemory.interactionCount > 0 ? 'strong' : 'quiet',
    } : null,
    maintenanceLeader ? {
      key: 'maintenance',
      label: 'Manter vivo',
      value: maintenanceLeader.label,
      detail: maintenanceLeader.requires_human_confirmation ? 'pede confirmação humana' : maintenanceLeader.reason,
      tone: maintenanceLeader.priority === 'high' ? 'warm' : 'quiet',
    } : fallbackMaintenance ? {
      key: 'maintenance-fallback',
      label: 'Manter vivo',
      value: fallbackMaintenance,
      detail: 'próximo passo recomendado pelo estado atual do projeto',
      tone: canRefreshHealth ? 'warm' : 'quiet',
    } : null,
    graphLeader ? {
      key: 'living-graph',
      label: 'Rota viva',
      value: graphLeader.label,
      detail: workspaceLivingGraph?.golden_path[0] ?? graphLeader.evidence[0] ?? 'grafo local conecta contexto, comandos e Spaces',
      tone: workspaceLivingGraph && workspaceLivingGraph.readiness_score >= 70 ? 'strong' : 'warm',
    } : selfImprovementLeader ? {
      key: 'self-improvement',
      label: 'Evolução',
      value: selfImprovementLeader.label,
      detail: selfImprovementLeader.reason,
      tone: selfImprovementLeader.priority === 'high' ? 'strong' : 'warm',
    } : retentionLeader ? {
      key: 'retention',
      label: 'Retenção',
      value: retentionLeader,
      detail: workspaceRetention?.policy.reason ?? 'governar contexto quente',
      tone: workspaceRetention?.policy.mode === 'conservative' ? 'warm' : 'strong',
    } : kernelLeader ? {
      key: 'context-kernel',
      label: 'Contexto',
      value: kernelLeader.label,
      detail: `${workspaceContextKernel?.budget.mode ?? 'lean'} · ${kernelLeader.reason}`,
      tone: kernelLeader.confidence >= 80 ? 'strong' : 'warm',
    } : null,
  ].filter((signal): signal is {
    key: string
    label: string
    value: string
    detail: string
    tone: string
  } => Boolean(signal)).slice(0, 4)
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
      <div className={`atlas-ai-awis-map ${workspaceBrainTone}`} title={workspaceBrainTitle}>
        <span>Mapa local</span>
        <small>{workspaceBrainLabel}</small>
      </div>
      <div className={`atlas-ai-awis-memory ${workspaceMemoryReady ? 'is-ready' : 'is-muted'}`} title={workspaceMemoryTitle}>
        <span>Memória local</span>
        <small>{workspaceMemoryLabel}</small>
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
      {awisBrainSignals.length > 0 ? (
        <div className="atlas-ai-awis-brain-signals" aria-label="Sinais vivos do AWIS">
          {awisBrainSignals.map((signal) => (
            <span
              key={signal.key}
              className={`atlas-ai-awis-brain-signal tone-${signal.tone}`}
              title={signal.detail}
            >
              <small>{signal.label}</small>
              <strong>{signal.value}</strong>
            </span>
          ))}
        </div>
      ) : null}
      {awisLivingQueue.length > 0 ? (
        <div className="atlas-ai-awis-living-queue" aria-label="Fila viva AWIS">
          {awisLivingQueue.map((item) => (
            <span key={item.key} className={`atlas-ai-awis-queue-item tone-${item.tone}`} title={item.detail}>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              {item.actionLabel && item.onAction ? (
                <button
                  type="button"
                  onClick={() => { void item.onAction?.() }}
                  title={item.detail}
                >
                  {item.actionLabel}
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
      {awisTransferSignals.length > 0 ? (
        <div className="atlas-ai-awis-transfer-map" aria-label="Aprendizado entre workspaces">
          {awisTransferSignals.map((transfer) => (
            <span
              key={transfer.key}
              className={`atlas-ai-awis-transfer-card tone-${transfer.confidence >= 80 ? 'strong' : transfer.confidence >= 60 ? 'warm' : 'quiet'}`}
              title={`${transfer.reusable} · ${transfer.validation}`}
            >
              <small>{transfer.workspace}</small>
              <strong>{transfer.reusable}</strong>
              <em>{transfer.validation}</em>
            </span>
          ))}
        </div>
      ) : null}
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
