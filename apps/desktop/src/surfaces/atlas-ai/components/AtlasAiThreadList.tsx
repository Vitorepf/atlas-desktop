/**
 * Atlas AI · ThreadList (Codex-grade, definitive).
 *
 * Hierarquia FLAT, sem tabs — view única que combina:
 *
 *   ▼ Fixados              (sempre no topo, ordem manual via pin)
 *     📌 Thread X · tempo
 *     📌 Thread Y · tempo
 *
 *   ▼ Projetos
 *     ▾ Atlas (12)
 *       Thread A · 9h
 *       Thread B · 1d
 *       … (5 visíveis)
 *       › Mostrar mais (7)
 *     ▾ blackink (8)
 *       …
 *     ▸ outro-projeto (3)   ← colapsado
 *
 *   ▼ Chats                (threads sem workspace)
 *     Thread Z · 2d
 *
 * Vantagens:
 *   - Velocidade: limite default 5 threads por projeto, "Mostrar mais"
 *     expande sob demanda
 *   - TDAH-friendly: hierarquia firme, peso decrescente
 *   - Sem path duplicado (basename só no header do projeto)
 *   - Pin icon (📌) deixa fixadas inequívocas
 *   - Folder collapse permite focar em 1 projeto sem fechar outros
 */
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent } from 'react'
import { AtlasAiErrorBanner } from './AtlasAiErrorBanner'
import { formatRelativeShort } from '../timeFormat'
import type {
  AiThreadSummary,
  AtlasAiMode,
  AtlasWorkspaceArtifactLakeEntry,
  AtlasWorkspaceConversationFusion,
} from '../types'
import type { AtlasAiWorkspaceScope } from '../workspaceScope'
import { modeLabel, modelLabel } from '../contract'

interface AtlasAiThreadListProps {
  threads: AiThreadSummary[]
  loading: boolean
  error: string | null
  retrying?: boolean
  selectedId: string | null
  activeWorkspace?: AtlasAiWorkspaceScope | null
  modeFilter: AtlasAiMode | 'all'
  onModeFilter: (m: AtlasAiMode | 'all') => void
  onRefresh: () => void | Promise<void>
  conversationFusion?: AtlasWorkspaceConversationFusion | null
  conversationFusionLoading?: boolean
  conversationFusionError?: string | null
  conversationFusionArtifact?: AtlasWorkspaceArtifactLakeEntry | null
  conversationFusionArtifactLoading?: boolean
  conversationFusionArtifactError?: string | null
  onPersistConversationFusion?: () => AtlasWorkspaceConversationFusion | null | void | Promise<AtlasWorkspaceConversationFusion | null | void>
  onFuseThreads?: (threadIds: string[]) => void | Promise<void>
  onSelect: (id: string) => void
  onOpenBeside?: (id: string) => void
  onOpenInStage?: (id: string) => void
  onStageDragActive?: (active: boolean) => void
  onProjectSpaceCountChange?: (count: number) => void
  dragClearSignal?: number
  onOpenSpace?: (threadIds: string[]) => void
  onNewThread: () => void
  onMoveThreadToWorkspace?: (threadId: string) => void | Promise<void>
  pinnedIds?: Set<string>
  onContextMenu?: (thread: AiThreadSummary, ev: React.MouseEvent) => void
}

const MODE_TAG: Record<AtlasAiMode | 'all', string> = {
  all: 'todas',
  auto: 'auto',
  general: 'geral',
  conversation: 'conversa',
  operational: 'ops',
  programming: 'dev',
  research: 'pesquisa',
  finance: 'finanças',
  marketing: 'marketing',
  strategy: 'estratégia',
  personal_development: 'pessoal',
  cyber: 'cyber',
  automation: 'automação',
}

const COLLAPSED_STORAGE = 'atlas-desktop:atlas-ai-projects-collapsed'
const SHOW_ALL_STORAGE = 'atlas-desktop:atlas-ai-projects-expanded-all'
const PROJECT_SPACES_STORAGE = 'atlas-desktop:atlas-ai-project-spaces'
const PROJECT_SPACES_SCHEMA_VERSION = 'atlas.desktop_ai.project_spaces.v2'
const SAVED_SPACE_RECEIPTS_STORAGE = 'atlas-desktop:atlas-ai-saved-space-receipts'
const SAVED_SPACE_RECEIPTS_SCHEMA_VERSION = 'atlas.desktop_ai.saved_space_receipts.v1'
const DEFAULT_VISIBLE_PER_PROJECT = 5
export const ATLAS_AI_THREAD_DRAG_CLEAR_EVENT = 'atlas-ai:thread-drag-clear'

export interface LocalProjectSpace {
  id: string
  projectKey: string
  title: string
  threadIds: string[]
  manualTitle?: boolean
  source?: 'drag' | 'suggested' | 'local'
  createdAt?: string
  updatedAt?: string
}

interface LocalProjectSpacesStorageEnvelope {
  schema_version: typeof PROJECT_SPACES_SCHEMA_VERSION
  spaces: LocalProjectSpace[]
}

export interface LocalSavedProjectSpaceReceipt {
  projectKey: string
  spaceKey: string
  artifactId?: string | null
  artifactHash?: string | null
  savedAt: string
}

interface LocalSavedProjectSpaceReceiptEnvelope {
  schema_version: typeof SAVED_SPACE_RECEIPTS_SCHEMA_VERSION
  receipts: LocalSavedProjectSpaceReceipt[]
}

export interface LocalProjectSpaceIntelligence {
  level: 'forte' | 'pronto' | 'leve'
  label: string
  detail: string
  nextAction: string
  messageCount: number
  modeCount: number
  lastActiveAt: string | null
}

export interface LocalProjectSpaceContextPack {
  schema_version: 'atlas.desktop_ai.space_context_pack.v1'
  title: string
  source: 'local_space' | 'suggested_space'
  generated_at: string
  thread_count: number
  message_count: number
  mode_count: number
  source_thread_ids: string[]
  raw_conversation_returned: false
  full_message_content_returned: false
  recommended_use: string[]
  sessions: Array<{
    id: string
    title: string
    mode: AtlasAiMode
    message_count: number
    last_active_at: string | null
    provider: string | null
  }>
}

interface PointerFusionBaseThread {
  id: string
  title: string
  projectKey: string
  persistBackend: boolean
}

interface PointerFusionThread extends PointerFusionBaseThread {
  startX: number
  startY: number
  active: boolean
}

interface PointerFusionPreview {
  title: string
  intent: 'space' | 'add-to-space' | 'side-by-side'
  x: number
  y: number
}

export interface PointerFusionDropSnapshot {
  threadId: string | null
  projectKey: string | null
  persistBackend: boolean
  spaceId: string | null
  stage: boolean
}

export function emptyPointerFusionDropSnapshot(): PointerFusionDropSnapshot {
  return {
    threadId: null,
    projectKey: null,
    persistBackend: false,
    spaceId: null,
    stage: false,
  }
}

export function resolvePointerFusionDropSnapshot({
  current,
  last,
  fallbackProjectKey,
}: {
  current: Partial<PointerFusionDropSnapshot>
  last: PointerFusionDropSnapshot
  fallbackProjectKey: string
}): PointerFusionDropSnapshot {
  const currentHasStage = current.stage === true
  const currentThreadId = currentHasStage ? null : current.threadId ?? null
  const currentSpaceId = currentHasStage || currentThreadId ? null : current.spaceId ?? null
  const currentHasTarget = Boolean(currentThreadId || currentSpaceId || currentHasStage || current.projectKey)

  if (currentHasTarget) {
    return {
      threadId: currentThreadId,
      projectKey: current.projectKey ?? fallbackProjectKey,
      persistBackend: current.persistBackend === true,
      spaceId: currentSpaceId,
      stage: currentHasStage,
    }
  }

  return {
    threadId: last.stage ? null : last.threadId,
    projectKey: last.projectKey ?? fallbackProjectKey,
    persistBackend: last.persistBackend,
    spaceId: last.stage || last.threadId ? null : last.spaceId,
    stage: last.stage,
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function nowIso(): string {
  return new Date().toISOString()
}

function isIsoLike(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value))
}

function normalizeProjectSpaceCandidate(candidate: Partial<LocalProjectSpace>, fallbackTimestamp: string): LocalProjectSpace | null {
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.projectKey !== 'string' ||
    typeof candidate.title !== 'string' ||
    !isStringArray(candidate.threadIds) ||
    candidate.threadIds.length < 2
  ) {
    return null
  }
  const projectKey = candidate.projectKey.trim().toLowerCase()
  const title = candidate.title.trim().replace(/\s+/g, ' ')
  if (!projectKey || !title) return null
  const threadIds = Array.from(new Set(candidate.threadIds.filter(Boolean)))
  if (threadIds.length < 2) return null
  const createdAt = isIsoLike(candidate.createdAt) ? candidate.createdAt : fallbackTimestamp
  const updatedAt = isIsoLike(candidate.updatedAt) ? candidate.updatedAt : createdAt
  return {
    id: threadIds.slice().sort().join('|'),
    projectKey,
    title: title.slice(0, 64),
    threadIds,
    manualTitle: candidate.manualTitle === true,
    source: candidate.source === 'suggested' || candidate.source === 'local' || candidate.source === 'drag'
      ? candidate.source
      : 'local',
    createdAt,
    updatedAt,
  }
}

export function parseLocalProjectSpaces(raw: string | null, fallbackTimestamp = nowIso()): LocalProjectSpace[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    const list: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as Partial<LocalProjectSpacesStorageEnvelope>).spaces)
        ? (parsed as Partial<LocalProjectSpacesStorageEnvelope>).spaces ?? []
        : []
    return list
      .map((item) => item && typeof item === 'object'
        ? normalizeProjectSpaceCandidate(item as Partial<LocalProjectSpace>, fallbackTimestamp)
        : null)
      .filter((item): item is LocalProjectSpace => Boolean(item))
      .slice(0, 8)
  } catch {
    return []
  }
}

export function serializeLocalProjectSpaces(spaces: LocalProjectSpace[]): string {
  return JSON.stringify({
    schema_version: PROJECT_SPACES_SCHEMA_VERSION,
    spaces,
  } satisfies LocalProjectSpacesStorageEnvelope)
}

function normalizeSavedSpaceReceiptCandidate(
  candidate: Partial<LocalSavedProjectSpaceReceipt>,
  fallbackTimestamp: string,
): LocalSavedProjectSpaceReceipt | null {
  if (
    typeof candidate.projectKey !== 'string' ||
    candidate.projectKey.trim() === '' ||
    typeof candidate.spaceKey !== 'string' ||
    candidate.spaceKey.trim() === ''
  ) {
    return null
  }
  return {
    projectKey: candidate.projectKey.trim().toLowerCase(),
    spaceKey: candidate.spaceKey.trim(),
    artifactId: typeof candidate.artifactId === 'string' ? candidate.artifactId : null,
    artifactHash: typeof candidate.artifactHash === 'string' ? candidate.artifactHash : null,
    savedAt: isIsoLike(candidate.savedAt) ? candidate.savedAt : fallbackTimestamp,
  }
}

export function parseLocalSavedProjectSpaceReceipts(
  raw: string | null,
  fallbackTimestamp = nowIso(),
): LocalSavedProjectSpaceReceipt[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    const list: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as Partial<LocalSavedProjectSpaceReceiptEnvelope>).receipts)
        ? (parsed as Partial<LocalSavedProjectSpaceReceiptEnvelope>).receipts ?? []
        : []
    const seen = new Set<string>()
    return list
      .map((item) => item && typeof item === 'object'
        ? normalizeSavedSpaceReceiptCandidate(item as Partial<LocalSavedProjectSpaceReceipt>, fallbackTimestamp)
        : null)
      .filter((item): item is LocalSavedProjectSpaceReceipt => {
        if (!item) return false
        const key = `${item.projectKey}:${item.spaceKey}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 32)
  } catch {
    return []
  }
}

export function serializeLocalSavedProjectSpaceReceipts(receipts: LocalSavedProjectSpaceReceipt[]): string {
  return JSON.stringify({
    schema_version: SAVED_SPACE_RECEIPTS_SCHEMA_VERSION,
    receipts,
  } satisfies LocalSavedProjectSpaceReceiptEnvelope)
}

export function savedProjectSpaceKeyFromFusion(fusion?: AtlasWorkspaceConversationFusion | null): string | null {
  const hash =
    fusion?.fusion_pack?.fusion_pack_hash ??
    fusion?.fusion_hash ??
    fusion?.persisted_artifact?.artifact_hash ??
    null
  if (typeof hash === 'string' && hash.trim() !== '') return `hash:${hash.trim()}`
  const threadIds = fusion?.fusion_pack?.source_thread_ids
  if (Array.isArray(threadIds)) {
    const stableThreadIds = Array.from(new Set(threadIds.filter(Boolean))).sort()
    if (stableThreadIds.length >= 2) return `threads:${stableThreadIds.join('|')}`
  }
  return null
}

export function suggestedProjectSpaceThreadIds(
  fusion?: AtlasWorkspaceConversationFusion | null,
  artifact?: AtlasWorkspaceArtifactLakeEntry | null,
): string[] {
  return Array.from(new Set([
    ...(fusion?.fusion_pack?.source_thread_ids ?? []),
    ...(artifact?.artifact?.body?.fusion_pack?.source_thread_ids ?? []),
  ].filter(Boolean)))
}

function loadProjectSpaces(): LocalProjectSpace[] {
  const raw =
    localStorage.getItem(PROJECT_SPACES_STORAGE) ??
    sessionStorage.getItem(PROJECT_SPACES_STORAGE)
  return parseLocalProjectSpaces(raw)
}

function saveProjectSpaces(spaces: LocalProjectSpace[]) {
  const payload = serializeLocalProjectSpaces(spaces)
  try {
    localStorage.setItem(PROJECT_SPACES_STORAGE, payload)
  } catch {
    try {
      sessionStorage.setItem(PROJECT_SPACES_STORAGE, payload)
    } catch {
      /* ignore */
    }
  }
}

function loadSavedSpaceReceipts(): LocalSavedProjectSpaceReceipt[] {
  const raw =
    localStorage.getItem(SAVED_SPACE_RECEIPTS_STORAGE) ??
    sessionStorage.getItem(SAVED_SPACE_RECEIPTS_STORAGE)
  return parseLocalSavedProjectSpaceReceipts(raw)
}

function saveSavedSpaceReceipts(receipts: LocalSavedProjectSpaceReceipt[]) {
  const payload = serializeLocalSavedProjectSpaceReceipts(receipts)
  try {
    localStorage.setItem(SAVED_SPACE_RECEIPTS_STORAGE, payload)
  } catch {
    try {
      sessionStorage.setItem(SAVED_SPACE_RECEIPTS_STORAGE, payload)
    } catch {
      /* ignore */
    }
  }
}

function inferThreadMode(thread: AiThreadSummary): AtlasAiMode {
  const meta = thread.metadata ?? {}
  const focus = typeof meta.atlas_focus === 'string' ? meta.atlas_focus : null
  const modeMeta = typeof meta.atlas_mode === 'string' ? meta.atlas_mode : null
  const task = typeof meta.routing_task === 'string' ? meta.routing_task : null
  if (focus === 'programming' || modeMeta === 'programming' || task === 'dev' || task === 'debug') {
    return 'programming'
  }
  if (focus === 'operational' || modeMeta === 'operational') return 'operational'
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
  for (const c of candidates) {
    if (focus === c || modeMeta === c) return c
  }
  return 'general'
}

function basename(path: string | null | undefined): string {
  if (!path) return ''
  const p = path.endsWith('/') ? path.slice(0, -1) : path
  const idx = p.lastIndexOf('/')
  return idx >= 0 ? p.slice(idx + 1) : p
}

function threadTimestamp(thread: AiThreadSummary): string | null {
  return thread.last_message_at ?? thread.updated_at ?? thread.created_at ?? null
}

function newestTimestamp(values: Array<string | null>): string | null {
  let newest: string | null = null
  let newestTime = Number.NEGATIVE_INFINITY
  for (const value of values) {
    if (!value) continue
    const time = Date.parse(value)
    if (!Number.isFinite(time) || time <= newestTime) continue
    newest = value
    newestTime = time
  }
  return newest
}

/**
 * Workspace key NORMALIZADO. Threads no DB têm workspace ora como slug
 * ('atlas') ora como path absoluto ('/Users/.../atlas'). Antes víamos dois
 * buckets "atlas" separados. Agora basename canônico em lowercase resolve
 * a colisão e ambos caem no mesmo projeto.
 *
 * Returns null quando não há workspace nem repo_root — vai pra "Chats".
 */
function projectKey(thread: AiThreadSummary): string | null {
  const candidates: Array<string | null | undefined> = [
    thread.workspace,
    typeof thread.metadata?.repo_root === 'string' ? thread.metadata.repo_root : null,
  ]
  for (const raw of candidates) {
    if (!raw) continue
    const trimmed = raw.trim()
    if (trimmed === '') continue
    const base = basename(trimmed) || trimmed
    return base.toLowerCase()
  }
  return null
}

function loadCollapsed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(COLLAPSED_STORAGE)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (Array.isArray(arr)) return new Set(arr.filter((x): x is string => typeof x === 'string'))
  } catch {
    /* ignore */
  }
  return new Set()
}

function saveCollapsed(set: Set<string>) {
  try {
    sessionStorage.setItem(COLLAPSED_STORAGE, JSON.stringify(Array.from(set)))
  } catch {
    /* ignore */
  }
}

function loadExpanded(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SHOW_ALL_STORAGE)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (Array.isArray(arr)) return new Set(arr.filter((x): x is string => typeof x === 'string'))
  } catch {
    /* ignore */
  }
  return new Set()
}

function saveExpanded(set: Set<string>) {
  try {
    sessionStorage.setItem(SHOW_ALL_STORAGE, JSON.stringify(Array.from(set)))
  } catch {
    /* ignore */
  }
}

const TITLE_STOPWORDS = new Set([
  'atlas',
  'atls',
  'aqui',
  'analise',
  'como',
  'disseca',
  'faca',
  'fazer',
  'fluxo',
  'funcionando',
  'pesquisa',
  'pesquise',
  'para',
  'preciso',
  'quero',
  'realizar',
  'sobre',
  'teste',
  'tudo',
])

function normalizeTitleToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .toLowerCase()
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function suggestSpaceTitle(threads: AiThreadSummary[]): string {
  const joined = normalizeTitleToken(threads.map((thread) => thread.title?.trim() || '').join(' '))
  if (/\b(atlas|atls)\b/.test(joined) && /\bfluxo\b/.test(joined)) return 'Fluxo Atlas AI'
  if (/\bvoz\b/.test(joined)) return 'Teste de Voz'
  if (/\b(youtube|youtu|youtu be)\b/.test(joined) && /\b(pesquisa|pesquise|disseca|analise)\b/.test(joined)) {
    return 'Pesquisa YouTube'
  }
  if (/\bteste\b/.test(joined) && /\b(pesquisa|pesquise|analise)\b/.test(joined)) return 'Pesquisa e Teste'

  const tokens: string[] = []
  for (const thread of threads) {
    const normalized = normalizeTitleToken(thread.title?.trim() || '')
    for (const token of normalized.split(/\s+/)) {
      if (token.length < 4 || TITLE_STOPWORDS.has(token) || tokens.includes(token)) continue
      tokens.push(token)
      if (tokens.length >= 4) break
    }
    if (tokens.length >= 4) break
  }
  if (tokens.length > 0) return titleCase(tokens.join(' '))
  const fallback = threads.find((thread) => thread.title?.trim())?.title?.trim()
  if (fallback) return fallback.length > 42 ? `${fallback.slice(0, 39)}…` : fallback
  return 'Novo espaço'
}

export function evaluateLocalProjectSpaceIntelligence(threads: AiThreadSummary[]): LocalProjectSpaceIntelligence {
  const messageCount = threads.reduce((sum, thread) => sum + Math.max(0, thread.message_count || 0), 0)
  const modes = new Set(threads.map(inferThreadMode))
  const lastActiveAt = newestTimestamp(threads.map(threadTimestamp))
  if (threads.length >= 3 && messageCount >= 6) {
    return {
      level: 'forte',
      label: 'Contexto forte',
      detail: `${threads.length} sessões · ${messageCount} mensagens · ${modes.size} ${modes.size === 1 ? 'modo' : 'modos'}`,
      nextAction: 'pronto para comparar',
      messageCount,
      modeCount: modes.size,
      lastActiveAt,
    }
  }
  if (threads.length >= 2 && messageCount >= 2) {
    return {
      level: 'pronto',
      label: 'Contexto pronto',
      detail: `${threads.length} sessões · ${messageCount} mensagens`,
      nextAction: 'abrir para comparar',
      messageCount,
      modeCount: modes.size,
      lastActiveAt,
    }
  }
  return {
    level: 'leve',
    label: 'Contexto leve',
    detail: `${threads.length} sessões · pouca conversa útil`,
    nextAction: 'adicione mais uma sessão',
    messageCount,
    modeCount: modes.size,
    lastActiveAt,
  }
}

export function buildLocalProjectSpaceContextPack({
  title,
  threads,
  source,
  generatedAt = nowIso(),
}: {
  title: string
  threads: AiThreadSummary[]
  source: LocalProjectSpaceContextPack['source']
  generatedAt?: string
}): LocalProjectSpaceContextPack {
  const intelligence = evaluateLocalProjectSpaceIntelligence(threads)
  return {
    schema_version: 'atlas.desktop_ai.space_context_pack.v1',
    title,
    source,
    generated_at: generatedAt,
    thread_count: threads.length,
    message_count: intelligence.messageCount,
    mode_count: intelligence.modeCount,
    source_thread_ids: threads.map((thread) => thread.id),
    raw_conversation_returned: false,
    full_message_content_returned: false,
    recommended_use: ['abrir_lado_a_lado', 'usar_como_contexto_seguro'],
    sessions: threads.map((thread) => ({
      id: thread.id,
      title: thread.title?.trim() || '(sem título)',
      mode: inferThreadMode(thread),
      message_count: Math.max(0, thread.message_count || 0),
      last_active_at: threadTimestamp(thread),
      provider: thread.last_provider ?? null,
    })),
  }
}

export function localProjectSpaceContextPackMarkdown(pack: LocalProjectSpaceContextPack): string {
  const humanSessionLine = (session: LocalProjectSpaceContextPack['sessions'][number]) => {
    const date = session.last_active_at ? formatRelativeShort(session.last_active_at) : 'sem data'
    const provider = session.provider ? modelLabel(session.provider) : 'Atlas'
    const messageLabel = session.message_count === 1 ? '1 mensagem' : `${session.message_count} mensagens`
    return `- ${session.title} · ${modeLabel(session.mode)} · ${messageLabel} · ${date} · ${provider}`
  }
  const sessionLabel = pack.thread_count === 1 ? '1 sessão' : `${pack.thread_count} sessões`
  const messageLabel = pack.message_count === 1 ? '1 mensagem' : `${pack.message_count} mensagens`
  const modeLabelText = pack.mode_count === 1 ? '1 modo' : `${pack.mode_count} modos`
  const lines = [
    `# Space · ${pack.title}`,
    '',
    `Origem: ${pack.source === 'suggested_space' ? 'Space sugerido' : 'Space local'}`,
    `Gerado em: ${pack.generated_at}`,
    `Resumo: ${sessionLabel} · ${messageLabel} · ${modeLabelText}`,
    'Conteúdo completo: não incluído por segurança.',
    '',
    '## Sessões',
    ...pack.sessions.map(humanSessionLine),
    '',
    '## Uso recomendado',
    '- Comparar sessões para continuar cada uma separadamente.',
    '- Usar como contexto seguro; não contém mensagens completas.',
  ]
  return lines.join('\n')
}

export function removeLocalProjectSpace(spaces: LocalProjectSpace[], spaceId: string): LocalProjectSpace[] {
  return spaces.filter((space) => space.id !== spaceId)
}

export function createOrUpdateLocalProjectSpace(
  spaces: LocalProjectSpace[],
  threadIds: string[],
  projectKey: string,
  suggestTitleForThreadIds: (threadIds: string[]) => string,
  source: LocalProjectSpace['source'] = 'drag',
  timestamp = nowIso(),
): LocalProjectSpace[] {
  const uniqueThreadIds = Array.from(new Set(threadIds.filter(Boolean)))
  if (uniqueThreadIds.length < 2) return spaces
  const existing = spaces.find((space) =>
    space.projectKey === projectKey && uniqueThreadIds.some((id) => space.threadIds.includes(id)),
  )
  const nextThreadIds = Array.from(new Set([...(existing?.threadIds ?? []), ...uniqueThreadIds]))
  const id = nextThreadIds.slice().sort().join('|')
  const nextSpace: LocalProjectSpace = {
    id,
    projectKey,
    title: existing?.manualTitle ? existing.title : suggestTitleForThreadIds(nextThreadIds),
    threadIds: nextThreadIds,
    manualTitle: existing?.manualTitle ?? false,
    source: existing?.source ?? source,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  return [nextSpace, ...spaces.filter((space) => space.id !== id && space.id !== existing?.id)].slice(0, 8)
}

export function addThreadToLocalProjectSpace(
  spaces: LocalProjectSpace[],
  spaceId: string,
  threadId: string,
  suggestTitleForThreadIds: (threadIds: string[]) => string,
  timestamp = nowIso(),
): LocalProjectSpace[] {
  return spaces.map((space) => {
    if (space.id !== spaceId || space.threadIds.includes(threadId)) return space
    const nextThreadIds = Array.from(new Set([...space.threadIds, threadId]))
    return {
      ...space,
      id: nextThreadIds.slice().sort().join('|'),
      title: space.manualTitle ? space.title : suggestTitleForThreadIds(nextThreadIds),
      threadIds: nextThreadIds,
      updatedAt: timestamp,
    }
  })
}

export function removeThreadFromLocalProjectSpace(
  spaces: LocalProjectSpace[],
  spaceId: string,
  threadId: string,
  suggestTitleForThreadIds: (threadIds: string[]) => string,
  timestamp = nowIso(),
): LocalProjectSpace[] {
  return spaces.flatMap((space) => {
    if (space.id !== spaceId) return [space]
    const nextThreadIds = space.threadIds.filter((id) => id !== threadId)
    if (nextThreadIds.length < 2) return []
    return [
      {
        ...space,
        id: nextThreadIds.slice().sort().join('|'),
        title: space.manualTitle ? space.title : suggestTitleForThreadIds(nextThreadIds),
        threadIds: nextThreadIds,
        updatedAt: timestamp,
      },
    ]
  })
}

export function AtlasAiThreadList({
  threads,
  loading,
  error,
  retrying,
  selectedId,
  activeWorkspace,
  modeFilter,
  onModeFilter,
  onRefresh,
  conversationFusion,
  conversationFusionLoading,
  conversationFusionError,
  conversationFusionArtifact,
  conversationFusionArtifactLoading,
  conversationFusionArtifactError,
  onPersistConversationFusion,
  onFuseThreads,
  onSelect,
  onOpenBeside,
  onOpenInStage,
  onStageDragActive,
  onProjectSpaceCountChange,
  dragClearSignal,
  onOpenSpace,
  onNewThread,
  onMoveThreadToWorkspace,
  pinnedIds,
  onContextMenu,
}: AtlasAiThreadListProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsed())
  const [expandedAll, setExpandedAll] = useState<Set<string>>(() => loadExpanded())
  const [dropActive, setDropActive] = useState(false)
  const [draggingThreadTitle, setDraggingThreadTitle] = useState<string | null>(null)
  const [pointerFusionThread, setPointerFusionThread] = useState<PointerFusionThread | null>(null)
  const [pointerFusionPreview, setPointerFusionPreview] = useState<PointerFusionPreview | null>(null)
  const [pointerFusionTargetId, setPointerFusionTargetId] = useState<string | null>(null)
  const [pointerFusionSpaceTargetId, setPointerFusionSpaceTargetId] = useState<string | null>(null)
  const [suppressClickThreadId, setSuppressClickThreadId] = useState<string | null>(null)
  const suppressClickThreadIdRef = useRef<string | null>(null)
  const suppressClickTimerRef = useRef<number | null>(null)
  const pointerFusionStartRef = useRef<{ threadId: string; eventType: string; at: number } | null>(null)
  const pointerFusionLastTargetRef = useRef<PointerFusionDropSnapshot>(emptyPointerFusionDropSnapshot())
  const [workspaceToolsOpen, setWorkspaceToolsOpen] = useState(true)
  const [projectSpaces, setProjectSpaces] = useState<LocalProjectSpace[]>(() => loadProjectSpaces())
  const [savedSpaceReceipts, setSavedSpaceReceipts] = useState<LocalSavedProjectSpaceReceipt[]>(() => loadSavedSpaceReceipts())

  const suppressNextThreadClick = useCallback((threadId: string) => {
    suppressClickThreadIdRef.current = threadId
    setSuppressClickThreadId(threadId)
    if (suppressClickTimerRef.current !== null) {
      window.clearTimeout(suppressClickTimerRef.current)
    }
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickThreadIdRef.current = null
      setSuppressClickThreadId(null)
      suppressClickTimerRef.current = null
    }, 350)
  }, [])

  const selectThreadFromList = useCallback((threadId: string) => {
    if (suppressClickThreadIdRef.current === threadId) return
    onSelect(threadId)
  }, [onSelect])

  const clearThreadDragState = useCallback(() => {
    pointerFusionLastTargetRef.current = emptyPointerFusionDropSnapshot()
    suppressClickThreadIdRef.current = null
    setDraggingThreadTitle(null)
    setPointerFusionPreview(null)
    setPointerFusionTargetId(null)
    setPointerFusionSpaceTargetId(null)
    setPointerFusionThread(null)
    setDropActive(false)
    onStageDragActive?.(false)
  }, [onStageDragActive])

  useEffect(() => () => {
    if (suppressClickTimerRef.current !== null) {
      window.clearTimeout(suppressClickTimerRef.current)
    }
  }, [])

  const beginNativeThreadDrag = useCallback((title: string) => {
    clearThreadDragState()
    setDraggingThreadTitle(title)
  }, [clearThreadDragState])

  useEffect(() => saveCollapsed(collapsed), [collapsed])
  useEffect(() => saveExpanded(expandedAll), [expandedAll])
  useEffect(() => saveProjectSpaces(projectSpaces), [projectSpaces])
  useEffect(() => saveSavedSpaceReceipts(savedSpaceReceipts), [savedSpaceReceipts])

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleShowAll = (key: string) => {
    setExpandedAll((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Particiona: fixadas, por projeto, sem projeto
  const { pinned, projects, orphans } = useMemo(() => {
    const pinnedSet = pinnedIds ?? new Set<string>()
    const pinned: AiThreadSummary[] = []
    const orphans: AiThreadSummary[] = []
    const projectMap = new Map<string, AiThreadSummary[]>()
    const projectTouch = new Map<string, number>()

    // ordena threads por timestamp descendente
    const sorted = threads.slice().sort((a, b) => {
      const ta = threadTimestamp(a)
      const tb = threadTimestamp(b)
      const ma = ta ? new Date(ta).getTime() : 0
      const mb = tb ? new Date(tb).getTime() : 0
      return mb - ma
    })

    for (const t of sorted) {
      if (pinnedSet.has(t.id)) {
        pinned.push(t)
        continue
      }
      const key = projectKey(t)
      if (key === null) {
        orphans.push(t)
      } else {
        const list = projectMap.get(key) ?? []
        list.push(t)
        projectMap.set(key, list)
        const ts = threadTimestamp(t)
        const tsMs = ts ? new Date(ts).getTime() : 0
        projectTouch.set(key, Math.max(projectTouch.get(key) ?? 0, tsMs))
      }
    }
    const projects = Array.from(projectMap.entries()).sort(
      (a, b) => (projectTouch.get(b[0]) ?? 0) - (projectTouch.get(a[0]) ?? 0),
    )
    return { pinned, projects, orphans }
  }, [threads, pinnedIds])

  const canDropIntoActiveWorkspace = Boolean(activeWorkspace?.slug && onMoveThreadToWorkspace)
  const canFuseThreads = threads.length >= 2
  const activeProjectKey = activeWorkspace?.slug
    ? (basename(activeWorkspace.slug) || activeWorkspace.slug).toLowerCase()
    : null
  const activeProjectSpaceCount = useMemo(
    () => activeProjectKey
      ? projectSpaces.filter((space) => space.projectKey === activeProjectKey).length
      : 0,
    [activeProjectKey, projectSpaces],
  )

  useEffect(() => {
    onProjectSpaceCountChange?.(activeProjectSpaceCount)
  }, [activeProjectSpaceCount, onProjectSpaceCountChange])

  useEffect(() => {
    if (!activeProjectKey || !conversationFusion?.persisted_artifact) return
    const spaceKey = savedProjectSpaceKeyFromFusion(conversationFusion)
    if (!spaceKey) return
    const artifact = conversationFusion.persisted_artifact
    const timestamp = nowIso()
    setSavedSpaceReceipts((prev) => {
      const current = prev.find((receipt) => receipt.projectKey === activeProjectKey && receipt.spaceKey === spaceKey)
      if (
        current?.artifactId === (artifact.artifact_id ?? null) &&
        current?.artifactHash === (artifact.artifact_hash ?? null)
      ) {
        return prev
      }
      return [
        {
          projectKey: activeProjectKey,
          spaceKey,
          artifactId: artifact.artifact_id ?? null,
          artifactHash: artifact.artifact_hash ?? null,
          savedAt: current?.savedAt ?? timestamp,
        },
        ...prev.filter((receipt) => !(receipt.projectKey === activeProjectKey && receipt.spaceKey === spaceKey)),
      ].slice(0, 32)
    })
  }, [activeProjectKey, conversationFusion])

  const threadById = useMemo(() => {
    const map = new Map<string, AiThreadSummary>()
    for (const thread of threads) map.set(thread.id, thread)
    return map
  }, [threads])

  useEffect(() => {
    setProjectSpaces((prev) => {
      let changed = false
      const next = prev.flatMap((space) => {
        const nextThreadIds = space.threadIds.filter((id) => threadById.has(id))
        if (nextThreadIds.length !== space.threadIds.length) changed = true
        if (nextThreadIds.length < 2) {
          changed = true
          return []
        }
        const selectedThreads = nextThreadIds
          .map((id) => threadById.get(id))
          .filter((thread): thread is AiThreadSummary => Boolean(thread))
        const nextTitle = space.manualTitle ? space.title : suggestSpaceTitle(selectedThreads)
        const nextId = nextThreadIds.slice().sort().join('|')
        if (nextTitle !== space.title || nextId !== space.id) changed = true
        return [{ ...space, id: nextId, title: nextTitle, threadIds: nextThreadIds, updatedAt: nowIso() }]
      })
      return changed ? next : prev
    })
  }, [threadById])

  const handleFuseThreads = useCallback((
    threadIds: string[],
    targetProjectKey: string | null,
    persistBackend: boolean,
    source: LocalProjectSpace['source'] = 'drag',
  ) => {
    const uniqueThreadIds = Array.from(new Set(threadIds.filter(Boolean)))
    if (uniqueThreadIds.length < 2) return
    const projectKey = targetProjectKey ?? 'chats'
    setProjectSpaces((prev) =>
      createOrUpdateLocalProjectSpace(prev, uniqueThreadIds, projectKey, (nextThreadIds) => {
        const selectedThreads = nextThreadIds
          .map((id) => threadById.get(id))
          .filter((thread): thread is AiThreadSummary => Boolean(thread))
        return suggestSpaceTitle(selectedThreads)
      }, source),
    )
    if (persistBackend && onFuseThreads) void onFuseThreads(uniqueThreadIds)
  }, [onFuseThreads, threadById])

  const addThreadToProjectSpace = useCallback((spaceId: string, threadId: string) => {
    setProjectSpaces((prev) =>
      addThreadToLocalProjectSpace(prev, spaceId, threadId, (nextThreadIds) => {
        const selectedThreads = nextThreadIds
          .map((id) => threadById.get(id))
          .filter((thread): thread is AiThreadSummary => Boolean(thread))
        return suggestSpaceTitle(selectedThreads)
      }),
    )
  }, [threadById])

  const removeProjectSpace = useCallback((spaceId: string) => {
    setProjectSpaces((prev) => removeLocalProjectSpace(prev, spaceId))
  }, [])

  const renameProjectSpace = useCallback((spaceId: string, title: string) => {
    const nextTitle = title.trim().replace(/\s+/g, ' ')
    if (!nextTitle) return
    const timestamp = nowIso()
    setProjectSpaces((prev) =>
      prev.map((space) =>
        space.id === spaceId
          ? { ...space, title: nextTitle.slice(0, 64), manualTitle: true, updatedAt: timestamp }
          : space,
      ),
    )
  }, [])

  const removeThreadFromProjectSpace = useCallback((spaceId: string, threadId: string) => {
    setProjectSpaces((prev) =>
      removeThreadFromLocalProjectSpace(prev, spaceId, threadId, (nextThreadIds) => {
        const selectedThreads = nextThreadIds
          .map((id) => threadById.get(id))
          .filter((thread): thread is AiThreadSummary => Boolean(thread))
        return suggestSpaceTitle(selectedThreads)
      }),
    )
  }, [threadById])

  const beginPointerFusion = (
    event: PointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>,
    thread: AiThreadSummary,
    targetProjectKey: string | null,
    persistBackend: boolean,
  ) => {
    if (!canFuseThreads && !onOpenInStage) return
    if (event.button !== 0) return
    const eventType = event.type
    const now = Date.now()
    const lastStart = pointerFusionStartRef.current
    if (
      eventType === 'mousedown' &&
      lastStart?.threadId === thread.id &&
      lastStart.eventType === 'pointerdown' &&
      now - lastStart.at < 120
    ) {
      return
    }
    pointerFusionStartRef.current = { threadId: thread.id, eventType, at: now }
    if ('pointerId' in event) {
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId)
      } catch {
        // Pointer capture is best-effort; global/document listeners still handle cleanup.
      }
    }
    const projectKey = targetProjectKey ?? 'chats'
    setPointerFusionThread({
      id: thread.id,
      title: thread.title?.trim() || '(sem título)',
      projectKey,
      persistBackend,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    })
  }

  useEffect(() => {
    if (!pointerFusionThread) return

    const targetAtPoint = (x: number, y: number) => {
      const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-atlas-thread-id]')
      const targetId = target?.dataset.atlasThreadId
      return targetId && targetId !== pointerFusionThread.id ? target : null
    }

    const stageAtPoint = (x: number, y: number) => {
      return document.elementFromPoint(x, y)?.closest<HTMLElement>('.atlas-ai-stage')
    }

    const spaceAtPoint = (x: number, y: number) => {
      const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-atlas-space-id]')
      return target?.dataset.atlasSpaceId ? target : null
    }

    const handlePointerMove = (event: globalThis.PointerEvent | MouseEvent) => {
      const distance = Math.hypot(event.clientX - pointerFusionThread.startX, event.clientY - pointerFusionThread.startY)
      if (distance < 7) return
      if (!pointerFusionThread.active) {
        setPointerFusionThread((current) => (current ? { ...current, active: true } : current))
        setDraggingThreadTitle(pointerFusionThread.title)
      }
      const threadTarget = targetAtPoint(event.clientX, event.clientY)
      const spaceTargetId = threadTarget ? null : spaceAtPoint(event.clientX, event.clientY)?.dataset.atlasSpaceId ?? null
      const stageTarget = !threadTarget && !spaceTargetId && stageAtPoint(event.clientX, event.clientY)
      pointerFusionLastTargetRef.current = {
        threadId: threadTarget?.dataset.atlasThreadId ?? null,
        projectKey: threadTarget?.dataset.atlasProjectKey ?? null,
        persistBackend: threadTarget?.dataset.atlasPersistBackend === 'true',
        spaceId: spaceTargetId,
        stage: Boolean(stageTarget),
      }
      onStageDragActive?.(Boolean(stageTarget))
      setPointerFusionTargetId(threadTarget?.dataset.atlasThreadId ?? null)
      setPointerFusionSpaceTargetId(spaceTargetId)
      setPointerFusionPreview({
        title: pointerFusionThread.title,
        intent: stageTarget ? 'side-by-side' : spaceTargetId ? 'add-to-space' : 'space',
        x: event.clientX,
        y: event.clientY,
      })
    }

    const handlePointerUp = (event: globalThis.PointerEvent | MouseEvent) => {
      const active = pointerFusionThread.active || Math.hypot(event.clientX - pointerFusionThread.startX, event.clientY - pointerFusionThread.startY) >= 7
      if (active) {
        suppressNextThreadClick(pointerFusionThread.id)
        const target = targetAtPoint(event.clientX, event.clientY)
        const dropTarget = resolvePointerFusionDropSnapshot({
          current: {
            threadId: target?.dataset.atlasThreadId ?? null,
            projectKey: target?.dataset.atlasProjectKey ?? null,
            persistBackend: target?.dataset.atlasPersistBackend === 'true',
            spaceId: spaceAtPoint(event.clientX, event.clientY)?.dataset.atlasSpaceId ?? null,
            stage: Boolean(stageAtPoint(event.clientX, event.clientY)),
          },
          last: pointerFusionLastTargetRef.current,
          fallbackProjectKey: pointerFusionThread.projectKey,
        })
        const targetId = dropTarget.threadId
        if (targetId && targetId !== pointerFusionThread.id) {
          handleFuseThreads(
            [pointerFusionThread.id, targetId],
            dropTarget.projectKey,
            pointerFusionThread.persistBackend && dropTarget.persistBackend,
          )
        } else {
          const targetSpaceId = dropTarget.spaceId
          if (targetSpaceId) {
            addThreadToProjectSpace(targetSpaceId, pointerFusionThread.id)
          } else if (dropTarget.stage) {
            onOpenInStage?.(pointerFusionThread.id)
          }
        }
      }
      pointerFusionLastTargetRef.current = emptyPointerFusionDropSnapshot()
      setPointerFusionThread(null)
      setDraggingThreadTitle(null)
      setPointerFusionPreview(null)
      setPointerFusionTargetId(null)
      setPointerFusionSpaceTargetId(null)
      onStageDragActive?.(false)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('mousemove', handlePointerMove as EventListener, { passive: true })
    window.addEventListener('pointerup', handlePointerUp as EventListener, { capture: true })
    window.addEventListener('pointercancel', handlePointerUp as EventListener, { capture: true })
    window.addEventListener('mouseup', handlePointerUp as EventListener, { capture: true })
    document.addEventListener('pointerup', handlePointerUp as EventListener, { capture: true })
    document.addEventListener('mouseup', handlePointerUp as EventListener, { capture: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('mousemove', handlePointerMove as EventListener)
      window.removeEventListener('pointerup', handlePointerUp as EventListener, { capture: true })
      window.removeEventListener('pointercancel', handlePointerUp as EventListener, { capture: true })
      window.removeEventListener('mouseup', handlePointerUp as EventListener, { capture: true })
      document.removeEventListener('pointerup', handlePointerUp as EventListener, { capture: true })
      document.removeEventListener('mouseup', handlePointerUp as EventListener, { capture: true })
    }
  }, [addThreadToProjectSpace, handleFuseThreads, onOpenInStage, onStageDragActive, pointerFusionThread, suppressNextThreadClick])

  useEffect(() => {
    if (!pointerFusionThread?.active && !pointerFusionPreview) return
    const timeout = window.setTimeout(() => {
      clearThreadDragState()
    }, 5000)
    return () => window.clearTimeout(timeout)
  }, [clearThreadDragState, pointerFusionPreview, pointerFusionThread?.active])

  useEffect(() => {
    if (!draggingThreadTitle || pointerFusionPreview) return
    const timeout = window.setTimeout(() => {
      clearThreadDragState()
    }, 1200)
    return () => window.clearTimeout(timeout)
  }, [clearThreadDragState, draggingThreadTitle, pointerFusionPreview])

  useEffect(() => {
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearThreadDragState()
    }
    window.addEventListener('dragend', clearThreadDragState)
    window.addEventListener('drop', clearThreadDragState)
    window.addEventListener('mouseup', clearThreadDragState)
    window.addEventListener('pointerup', clearThreadDragState)
    window.addEventListener('blur', clearThreadDragState)
    window.addEventListener('keydown', clearOnEscape)
    window.addEventListener(ATLAS_AI_THREAD_DRAG_CLEAR_EVENT, clearThreadDragState)
    return () => {
      window.removeEventListener('dragend', clearThreadDragState)
      window.removeEventListener('drop', clearThreadDragState)
      window.removeEventListener('mouseup', clearThreadDragState)
      window.removeEventListener('pointerup', clearThreadDragState)
      window.removeEventListener('blur', clearThreadDragState)
      window.removeEventListener('keydown', clearOnEscape)
      window.removeEventListener(ATLAS_AI_THREAD_DRAG_CLEAR_EVENT, clearThreadDragState)
    }
  }, [clearThreadDragState])

  useEffect(() => {
    clearThreadDragState()
  }, [clearThreadDragState, dragClearSignal])

  const handleWorkspaceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!canDropIntoActiveWorkspace) return
    event.preventDefault()
    setDropActive(false)
    setDraggingThreadTitle(null)
    setPointerFusionPreview(null)
    setPointerFusionTargetId(null)
    setPointerFusionSpaceTargetId(null)
    onStageDragActive?.(false)
    const threadId =
      event.dataTransfer.getData('application/x-atlas-ai-thread-id') ||
      event.dataTransfer.getData('text/x-atlas-ai-thread-id')
    if (!threadId) return
    void onMoveThreadToWorkspace?.(threadId)
  }

  const isComposingSpace = Boolean(draggingThreadTitle)

  return (
    <section
      className={`atlas-ai-history${draggingThreadTitle ? ' is-dragging-thread' : ''}`}
      aria-label="Histórico Atlas AI"
    >
      <header className="atlas-ai-history-header">
        <h3>Conversas</h3>
        <button
          type="button"
          className="atlas-ai-link atlas-ai-new-thread"
          onClick={onNewThread}
          title="Compor sem conversa ativa (cria uma nova ao enviar)"
          aria-label="Nova conversa"
        >
          <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="2" x2="5" y2="8" />
            <line x1="2" y1="5" x2="8" y2="5" />
          </svg>
          <span>nova</span>
        </button>
      </header>

      <div className="atlas-ai-filter-row" role="tablist" aria-label="Filtro por modo">
        {(['all', 'general', 'operational', 'programming'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={modeFilter === value}
            className={`atlas-ai-filter-tab${modeFilter === value ? ' is-active' : ''}`}
            onClick={() => onModeFilter(value)}
          >
            {MODE_TAG[value]}
          </button>
        ))}
        <button
          type="button"
          className={`atlas-ai-refresh${loading ? ' is-loading' : ''}`}
          onClick={() => void onRefresh()}
          disabled={loading}
          title="Recarregar histórico"
          aria-label="Recarregar histórico"
        >
          <svg
            viewBox="0 0 14 14"
            width="11"
            height="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 7 a5 5 0 1 1 -1.46 -3.54" />
            <polyline points="12 2 12 5 9 5" />
          </svg>
        </button>
      </div>

      {error ? (
        <AtlasAiErrorBanner
          message={error}
          onRetry={onRefresh}
          retrying={retrying}
          retryLabel="verificar serviço"
        />
      ) : null}

      {!error && threads.length === 0 && !loading ? (
        <p className="atlas-ai-empty-line">Nenhuma conversa neste filtro.</p>
      ) : null}

      {threads.length > 0 ? (
        <div className="atlas-ai-thread-tree">
          {/* FIXADOS */}
          {pinned.length > 0 ? (
            <Section label="Fixados" count={null}>
              <ul className="atlas-ai-thread-list" role="list">
                {pinned.map((t) => {
                  const key = projectKey(t) ?? 'chats'
                  const persist = activeProjectKey === key
                  return (
                    <ThreadRow
                      key={t.id}
                      thread={t}
                      selectedId={selectedId}
                      onSelect={selectThreadFromList}
                      onOpenBeside={onOpenBeside}
                      onOpenInStage={onOpenInStage}
                      onContextMenu={onContextMenu}
                      pinned
                      draggable={canDropIntoActiveWorkspace || canFuseThreads}
                      fusionProjectKey={key}
                      persistBackend={persist}
                      onFuseThreads={(threadIds) => handleFuseThreads(threadIds, key, persist)}
                      onPointerFusionStart={(event) => beginPointerFusion(event, t, key, persist)}
                      pointerFusionTarget={pointerFusionTargetId === t.id}
                      suppressClick={suppressClickThreadId === t.id}
                      onDragThreadStart={beginNativeThreadDrag}
                      onDragThreadEnd={clearThreadDragState}
                    />
                  )
                })}
              </ul>
            </Section>
          ) : null}

          {/* PROJETOS */}
          {projects.length > 0 ? (
            <Section label="Projetos" count={null}>
              {projects.map(([key, list]) => {
                const isCollapsed = collapsed.has(key)
                const isExpandedAll = expandedAll.has(key)
                const isActiveProject = activeProjectKey === key
                const spacesForProject = projectSpaces.filter((space) => space.projectKey === key)
                const suggestedSpaceThreadIds = isActiveProject && spacesForProject.length === 0
                  ? suggestedProjectSpaceThreadIds(conversationFusion, conversationFusionArtifact)
                    .filter((threadId) => threadById.has(threadId))
                  : []
                const groupedThreadIds = new Set([
                  ...spacesForProject.flatMap((space) => space.threadIds),
                  ...(suggestedSpaceThreadIds.length >= 2 ? suggestedSpaceThreadIds : []),
                ])
                const looseThreads = list.filter((thread) => !groupedThreadIds.has(thread.id))
                const limit = isExpandedAll ? looseThreads.length : DEFAULT_VISIBLE_PER_PROJECT
                const visible = looseThreads.slice(0, limit)
                const remaining = looseThreads.length - visible.length
                const showProjectSpaces = (isActiveProject && workspaceToolsOpen) || spacesForProject.length > 0
                const hasGroupedSpace = spacesForProject.length > 0 || suggestedSpaceThreadIds.length >= 2
                const projectSpacePanelCount = spacesForProject.length + (suggestedSpaceThreadIds.length >= 2 ? 1 : 0)
                const handleProjectFuseThreads = (threadIds: string[], source: LocalProjectSpace['source'] = 'drag') => {
                  handleFuseThreads(threadIds, key, isActiveProject, source)
                }
                const handlePersistProjectConversationFusion = async () => {
                  if (!isActiveProject || !onPersistConversationFusion) return
                  const persistedFusion = await onPersistConversationFusion()
                  const nextFusion = persistedFusion ?? conversationFusion
                  const spaceKey = savedProjectSpaceKeyFromFusion(nextFusion)
                  if (!spaceKey) return
                  const timestamp = nowIso()
                  const artifact = nextFusion?.persisted_artifact
                  setSavedSpaceReceipts((prev) => [
                    {
                      projectKey: key,
                      spaceKey,
                      artifactId: artifact?.artifact_id ?? null,
                      artifactHash: artifact?.artifact_hash ?? null,
                      savedAt: timestamp,
                    },
                    ...prev.filter((receipt) => !(receipt.projectKey === key && receipt.spaceKey === spaceKey)),
                  ].slice(0, 32))
                }
                return (
                  <div
                    key={key}
                    className={`atlas-ai-folder${isActiveProject ? ' is-active-project' : ''}${dropActive && isActiveProject ? ' is-drop-active' : ''}`}
                    onDragOver={(event) => {
                      if (!isActiveProject || !canDropIntoActiveWorkspace) return
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                      setDropActive(true)
                    }}
                    onDragLeave={() => {
                      if (isActiveProject) setDropActive(false)
                    }}
                    onDrop={(event) => {
                      if (!isActiveProject) return
                      handleWorkspaceDrop(event)
                    }}
                  >
                    <button
                      type="button"
                      className="atlas-ai-folder-head"
                      onClick={() => toggleCollapsed(key)}
                      aria-expanded={!isCollapsed}
                    >
                      <span
                        className={`atlas-ai-folder-caret${isCollapsed ? ' is-collapsed' : ''}`}
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 2 7 5 3 8" />
                        </svg>
                      </span>
                      <span className="atlas-ai-folder-icon" aria-hidden="true">
                        <svg viewBox="0 0 16 14" width="13" height="11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1.5 4.5a1.5 1.5 0 0 1 1.5-1.5h3.4l1.5 1.5H13a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 13 12.5H3A1.5 1.5 0 0 1 1.5 11Z" />
                        </svg>
                      </span>
                      <span className="atlas-ai-folder-name" title={key}>
                        {key}
                      </span>
                      {isActiveProject ? <span className="atlas-ai-folder-active-dot" title="projeto ativo" /> : null}
                      <span className="atlas-ai-folder-count" title={`${list.length} conversas neste projeto`}>
                        {list.length} <span>conversas</span>
                      </span>
                      {isActiveProject ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="atlas-ai-folder-context"
                          title={workspaceToolsOpen
                            ? 'Ocultar Spaces do projeto'
                            : projectSpacePanelCount > 0
                              ? 'Mostrar Spaces do projeto'
                              : 'Criar um Space com conversas deste projeto'}
                          aria-expanded={workspaceToolsOpen}
                          onClick={(event) => {
                            event.stopPropagation()
                            setWorkspaceToolsOpen((v) => !v)
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return
                            event.preventDefault()
                            event.stopPropagation()
                            setWorkspaceToolsOpen((v) => !v)
                          }}
                        >
                          {projectSpacePanelCount > 0
                            ? `${projectSpacePanelCount} ${projectSpacePanelCount === 1 ? 'Space' : 'Spaces'}`
                            : 'criar Space'}
                        </span>
                      ) : null}
                    </button>
                    {showProjectSpaces ? (
                      <ProjectSpacesPanel
                        projectThreadCount={list.length}
                        fusion={conversationFusion}
                        fusionLoading={conversationFusionLoading}
                        fusionError={conversationFusionError}
                        artifact={conversationFusionArtifact}
                        artifactLoading={conversationFusionArtifactLoading}
                        artifactError={conversationFusionArtifactError}
                        onPersistConversationFusion={isActiveProject ? handlePersistProjectConversationFusion : undefined}
                        savedSpaceReceipts={savedSpaceReceipts}
                        projectKey={key}
                        spaces={spacesForProject}
                        threadById={threadById}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        onOpenSpace={onOpenSpace}
                        onRemoveSpace={removeProjectSpace}
                        onRenameSpace={renameProjectSpace}
                        onRemoveThreadFromSpace={removeThreadFromProjectSpace}
                        onAddThreadToSpace={addThreadToProjectSpace}
                        onAdoptSuggestedSpace={(threadIds) => handleProjectFuseThreads(threadIds, 'suggested')}
                        pointerDropTargetId={pointerFusionSpaceTargetId}
                        buildingSpace={isComposingSpace}
                      />
                    ) : null}
                    {!isCollapsed ? (
                      <>
                        <ul className="atlas-ai-thread-list" role="list">
                          {hasGroupedSpace && visible.length > 0 ? (
                            <li className="atlas-ai-loose-threads-label">Conversas soltas</li>
                          ) : null}
                          {visible.map((t) => (
                            <ThreadRow
                              key={t.id}
                              thread={t}
                              selectedId={selectedId}
                              onSelect={selectThreadFromList}
                              onOpenBeside={onOpenBeside}
                              onOpenInStage={onOpenInStage}
                              onContextMenu={onContextMenu}
                              indented
                              draggable={canDropIntoActiveWorkspace || canFuseThreads}
                              fusionProjectKey={key}
                              persistBackend={isActiveProject}
                              onFuseThreads={handleProjectFuseThreads}
                              onPointerFusionStart={(event) => beginPointerFusion(event, t, key, isActiveProject)}
                              pointerFusionTarget={pointerFusionTargetId === t.id}
                              suppressClick={suppressClickThreadId === t.id}
                              onDragThreadStart={beginNativeThreadDrag}
                              onDragThreadEnd={clearThreadDragState}
                            />
                          ))}
                          {hasGroupedSpace && visible.length === 0 ? (
                            <li className="atlas-ai-all-grouped-line">
                              Todas as conversas deste projeto estão em Spaces.
                            </li>
                          ) : null}
                        </ul>
                        {remaining > 0 ? (
                          <button
                            type="button"
                            className="atlas-ai-show-more"
                            onClick={() => toggleShowAll(key)}
                          >
                            Mostrar mais {remaining}
                          </button>
                        ) : isExpandedAll && looseThreads.length > DEFAULT_VISIBLE_PER_PROJECT ? (
                          <button
                            type="button"
                            className="atlas-ai-show-more"
                            onClick={() => toggleShowAll(key)}
                          >
                            Mostrar menos
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                )
              })}
            </Section>
          ) : null}

          {/* CHATS (sem projeto) */}
          {orphans.length > 0 ? (
            <Section label="Chats" count={null}>
              <OrphanList
                threads={orphans}
                selectedId={selectedId}
                onSelect={selectThreadFromList}
                onOpenBeside={onOpenBeside}
                onOpenInStage={onOpenInStage}
                onContextMenu={onContextMenu}
                draggable={canDropIntoActiveWorkspace || canFuseThreads}
                onFuseThreads={(threadIds) => handleFuseThreads(threadIds, 'chats', false)}
                onPointerFusionStart={(event, thread) => beginPointerFusion(event, thread, 'chats', false)}
                pointerFusionTargetId={pointerFusionTargetId}
                suppressClickThreadId={suppressClickThreadId}
                onDragThreadStart={beginNativeThreadDrag}
                onDragThreadEnd={clearThreadDragState}
              />
            </Section>
          ) : null}
        </div>
      ) : null}
      {pointerFusionPreview ? (
        <div
          className="atlas-ai-thread-drag-preview"
          style={{ left: pointerFusionPreview.x + 14, top: pointerFusionPreview.y + 12 }}
          aria-hidden="true"
        >
          <span>
            {pointerFusionPreview.intent === 'side-by-side'
              ? 'comparar'
              : pointerFusionPreview.intent === 'add-to-space'
                ? 'adicionar ao Space'
                : 'criar Space'}
          </span>
          <strong>{pointerFusionPreview.title}</strong>
        </div>
      ) : null}
    </section>
  )
}

interface WorkspaceFusionStatusProps {
  fusion?: AtlasWorkspaceConversationFusion | null
  loading?: boolean
  error?: string | null
}

interface WorkspaceToolsProps {
  projectKey: string
  projectThreadCount: number
  spaces: LocalProjectSpace[]
  savedSpaceReceipts?: LocalSavedProjectSpaceReceipt[]
  threadById: Map<string, AiThreadSummary>
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenSpace?: (threadIds: string[]) => void
  onRemoveSpace?: (spaceId: string) => void
  onRenameSpace?: (spaceId: string, title: string) => void
  onRemoveThreadFromSpace?: (spaceId: string, threadId: string) => void
  onAddThreadToSpace?: (spaceId: string, threadId: string) => void
  onAdoptSuggestedSpace?: (threadIds: string[]) => void | Promise<void>
  pointerDropTargetId?: string | null
  buildingSpace?: boolean
  fusion?: AtlasWorkspaceConversationFusion | null
  fusionLoading?: boolean
  fusionError?: string | null
  artifact?: AtlasWorkspaceArtifactLakeEntry | null
  artifactLoading?: boolean
  artifactError?: string | null
  onPersistConversationFusion?: () => AtlasWorkspaceConversationFusion | null | void | Promise<AtlasWorkspaceConversationFusion | null | void>
}

function ProjectSpacesPanel({
  projectKey,
  projectThreadCount,
  spaces,
  savedSpaceReceipts = [],
  threadById,
  selectedId,
  onSelect,
  onOpenSpace,
  onRemoveSpace,
  onRenameSpace,
  onRemoveThreadFromSpace,
  onAddThreadToSpace,
  onAdoptSuggestedSpace,
  pointerDropTargetId,
  buildingSpace = false,
  fusion,
  fusionLoading,
  fusionError,
  artifact,
  artifactLoading,
  artifactError,
  onPersistConversationFusion,
}: WorkspaceToolsProps) {
  const summary = fusion?.summary ?? null
  const artifactReady = artifact?.status === 'ready'
  const threadCount = summary?.thread_count ?? 0
  const messageCount = summary?.message_count ?? 0
  const suggestedThreadIds = suggestedProjectSpaceThreadIds(fusion, artifact)
  const suggestedSpaceThreads = suggestedThreadIds
    .map((id) => threadById.get(id))
    .filter((thread): thread is AiThreadSummary => Boolean(thread))
  const showSuggestedSpace = spaces.length === 0 && suggestedSpaceThreads.length >= 2
  const showBackgroundSpaceStatus = spaces.length === 0 && !showSuggestedSpace && (fusionLoading || artifactLoading)
  const showCreationGuide = buildingSpace && spaces.length === 0 && !showSuggestedSpace && !showBackgroundSpaceStatus
  const suggestedSpaceSavedKey = savedProjectSpaceKeyFromFusion(fusion)
  const savedSpaceReceipt = suggestedSpaceSavedKey
    ? savedSpaceReceipts.find((receipt) => receipt.projectKey === projectKey && receipt.spaceKey === suggestedSpaceSavedKey)
    : null
  const suggestedSpaceSaved = artifactReady || Boolean(fusion?.persisted_artifact) || Boolean(savedSpaceReceipt)
  const [spaceDropTargetId, setSpaceDropTargetId] = useState<string | null>(null)
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)
  const [editingSpaceTitle, setEditingSpaceTitle] = useState('')
  const [copiedSpacePackId, setCopiedSpacePackId] = useState<string | null>(null)
  const editingSpace = editingSpaceId ? spaces.find((space) => space.id === editingSpaceId) ?? null : null
  const editingSpaceThreads = editingSpace
    ? editingSpace.threadIds
      .map((id) => threadById.get(id))
      .filter((thread): thread is AiThreadSummary => Boolean(thread))
    : []
  const openSpaceEditor = (space: LocalProjectSpace) => {
    setEditingSpaceId(space.id)
    setEditingSpaceTitle(space.title)
  }
  const openSuggestedSpaceEditor = (threadIds: string[], title: string) => {
    setEditingSpaceId(threadIds.slice().sort().join('|'))
    setEditingSpaceTitle(title)
    void onAdoptSuggestedSpace?.(threadIds)
  }
  const closeSpaceEditor = () => {
    setEditingSpaceId(null)
    setEditingSpaceTitle('')
  }
  const commitRename = (spaceId: string) => {
    onRenameSpace?.(spaceId, editingSpaceTitle)
    closeSpaceEditor()
  }
  const copySpacePack = async (spaceId: string, title: string, threads: AiThreadSummary[], source: LocalProjectSpaceContextPack['source']) => {
    const pack = buildLocalProjectSpaceContextPack({ title, threads, source })
    try {
      await navigator.clipboard?.writeText(localProjectSpaceContextPackMarkdown(pack))
      setCopiedSpacePackId(spaceId)
      window.setTimeout(() => setCopiedSpacePackId((current) => current === spaceId ? null : current), 1600)
    } catch {
      setCopiedSpacePackId(null)
    }
  }
  return (
    <div className="atlas-ai-workspace-tools">
      {spaces.length > 0 ? (
        <div className="atlas-ai-project-spaces-list" aria-label="Espaços criados nesta sessão">
          <div className="atlas-ai-project-spaces-label">
            <span>Spaces</span>
            <small>{spaces.length}</small>
          </div>
          {spaces.map((space) => {
            const spaceThreads = space.threadIds
              .map((id) => threadById.get(id))
              .filter((thread): thread is AiThreadSummary => Boolean(thread))
            const visibleSpaceThreads = spaceThreads.slice(0, 4)
            const hiddenSpaceThreadCount = Math.max(0, spaceThreads.length - visibleSpaceThreads.length)
            const intelligence = evaluateLocalProjectSpaceIntelligence(spaceThreads)
            return (
              <article
                key={space.id}
                className={`atlas-ai-project-space-item${spaceDropTargetId === space.id || pointerDropTargetId === space.id ? ' is-drop-target' : ''}`}
                data-atlas-space-id={space.id}
                onDragOver={(event) => {
                  if (!onAddThreadToSpace) return
                  const types = Array.from(event.dataTransfer.types)
                  if (
                    !types.includes('application/x-atlas-ai-thread-id') &&
                    !types.includes('text/x-atlas-ai-thread-id')
                  ) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'link'
                  setSpaceDropTargetId(space.id)
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                  setSpaceDropTargetId(null)
                }}
                onDrop={(event) => {
                  const threadId =
                    event.dataTransfer.getData('application/x-atlas-ai-thread-id') ||
                    event.dataTransfer.getData('text/x-atlas-ai-thread-id')
                  setSpaceDropTargetId(null)
                  if (!threadId || space.threadIds.includes(threadId)) return
                  event.preventDefault()
                  onAddThreadToSpace?.(space.id, threadId)
                }}
              >
                <span className="atlas-ai-project-space-icon" aria-hidden="true">
                  <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.2 4.2h9.6M2.2 7h9.6M2.2 9.8h5.7" />
                  </svg>
                </span>
                <span className="atlas-ai-project-space-main">
                  <span className="atlas-ai-project-space-title-row">
                    <span className="atlas-ai-project-space-kicker">Space</span>
                    <span className="atlas-ai-project-space-actions">
                      <button
                        type="button"
                        className="atlas-ai-project-space-action is-primary"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          onOpenSpace?.(space.threadIds)
                        }}
                        title="Abre as sessões deste Space para comparar"
                      >
                        comparar
                      </button>
                      <button
                        type="button"
                        className="atlas-ai-project-space-action"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          void copySpacePack(space.id, space.title, spaceThreads, 'local_space')
                        }}
                        title="Copiar contexto seguro deste Space"
                        aria-label={`Copiar contexto seguro do Space ${space.title}`}
                      >
                        {copiedSpacePackId === space.id ? 'copiado' : 'contexto'}
                      </button>
                      <button
                        type="button"
                        className="atlas-ai-project-space-action"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          openSpaceEditor(space)
                        }}
                        title={`Editar Space ${space.title}`}
                        aria-label={`Editar Space ${space.title}`}
                      >
                        editar
                      </button>
                      <button
                        type="button"
                        className="atlas-ai-project-space-remove"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          onRemoveSpace?.(space.id)
                        }}
                        title={`Desfazer ${space.title}`}
                        aria-label={`Desfazer Space ${space.title}`}
                      >
                        desfazer
                      </button>
                    </span>
                  </span>
                  <span className="atlas-ai-project-space-title-button is-static">
                    {space.title}
                  </span>
                  <small>{space.threadIds.length} sessões</small>
                  <span className={`atlas-ai-project-space-intelligence is-${intelligence.level}`}>
                    <span>{intelligence.label}</span>
                    <em>{intelligence.detail}</em>
                    {intelligence.lastActiveAt ? (
                      <time dateTime={intelligence.lastActiveAt}>{formatRelativeShort(intelligence.lastActiveAt)}</time>
                    ) : null}
                  </span>
                  {visibleSpaceThreads.length > 0 ? (
                    <ul className="atlas-ai-project-space-thread-list" aria-label={`Conversas dentro de ${space.title}`}>
                      {visibleSpaceThreads.map((thread) => (
                        <li key={thread.id}>
                          <button
                            type="button"
                            className={thread.id === selectedId ? 'is-selected' : undefined}
                            title="Abrir somente esta conversa"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              onSelect(thread.id)
                            }}
                          >
                            <span>{thread.title?.trim() || '(sem título)'}</span>
                          </button>
                          <button
                            type="button"
                            className="atlas-ai-project-space-thread-remove"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              onRemoveThreadFromSpace?.(space.id, thread.id)
                            }}
                            title={`Remover ${thread.title?.trim() || 'conversa'} deste Space`}
                            aria-label={`Remover ${thread.title?.trim() || 'conversa'} deste Space`}
                          >
                            remover
                          </button>
                        </li>
                      ))}
                      {hiddenSpaceThreadCount > 0 ? (
                        <li className="atlas-ai-project-space-thread-more">
                          + {hiddenSpaceThreadCount} sessões
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                  <span className="atlas-ai-project-space-next">{intelligence.nextAction}</span>
                </span>
              </article>
            )
          })}
        </div>
      ) : null}
      {showSuggestedSpace ? (
        <SuggestedProjectSpaceCard
          threads={suggestedSpaceThreads}
          title={suggestSpaceTitle(suggestedSpaceThreads)}
          saved={suggestedSpaceSaved}
          saving={Boolean(fusionLoading)}
          onOpenSpace={onOpenSpace}
          onSelect={onSelect}
          onEditSpace={openSuggestedSpaceEditor}
          onSaveSpace={onPersistConversationFusion}
        />
      ) : null}
      {showCreationGuide ? (
        <div
          className={`atlas-ai-space-card${spaces.length === 0 ? ' is-empty' : ''}${buildingSpace ? ' is-active' : ''}`}
          aria-label="Solte sobre outra conversa para criar um Space"
        >
          <div className="atlas-ai-space-card-head">
            <span className="atlas-ai-space-card-kicker">agrupar</span>
            <strong>Solte sobre outra conversa</strong>
          </div>
          <p className="atlas-ai-workspace-tools-hint" title="Crie um Space">
            Cria um Space com estas sessões.
          </p>
          <div className="atlas-ai-space-card-meta sr-only" aria-label="Resumo do Space">
            <span>{threadCount > 0 ? `${threadCount} sessões no Space` : `${projectThreadCount} conversas no projeto`}</span>
            <span>{messageCount > 0 ? `${messageCount} mensagens úteis` : 'sem texto bruto'}</span>
          </div>
        </div>
      ) : null}
      {showBackgroundSpaceStatus ? (
        <span className="atlas-ai-workspace-fusion-statusline" aria-live="polite">
          <WorkspaceFusionStatus fusion={fusion} loading={fusionLoading} error={fusionError} />
          <WorkspaceFusionArtifactStatus artifact={artifact} loading={artifactLoading} error={artifactError} />
        </span>
      ) : null}
      {editingSpace ? (
        <SpaceEditDialog
          space={editingSpace}
          threads={editingSpaceThreads}
          titleDraft={editingSpaceTitle}
          onTitleDraftChange={setEditingSpaceTitle}
          onSave={() => commitRename(editingSpace.id)}
          onClose={closeSpaceEditor}
          onRemoveSpace={() => {
            onRemoveSpace?.(editingSpace.id)
            closeSpaceEditor()
          }}
          onRemoveThread={(threadId) => {
            if (editingSpace.threadIds.length <= 2) closeSpaceEditor()
            onRemoveThreadFromSpace?.(editingSpace.id, threadId)
          }}
        />
      ) : null}
    </div>
  )
}

function SpaceEditDialog({
  space,
  threads,
  titleDraft,
  onTitleDraftChange,
  onSave,
  onClose,
  onRemoveSpace,
  onRemoveThread,
}: {
  space: LocalProjectSpace
  threads: AiThreadSummary[]
  titleDraft: string
  onTitleDraftChange: (title: string) => void
  onSave: () => void
  onClose: () => void
  onRemoveSpace: () => void
  onRemoveThread: (threadId: string) => void
}) {
  const canSave = titleDraft.trim().length > 0
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="atlas-ai-space-edit-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="atlas-ai-space-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Editar Space ${space.title}`}
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (canSave) onSave()
        }}
      >
        <header className="atlas-ai-space-edit-head">
          <span>Space</span>
          <strong>Editar organização</strong>
          <button type="button" onClick={onClose} aria-label="Fechar editor do Space">
            fechar
          </button>
        </header>

        <label className="atlas-ai-space-edit-field">
          <span>Nome</span>
          <input
            value={titleDraft}
            onChange={(event) => onTitleDraftChange(event.currentTarget.value)}
            placeholder="Nome do Space"
            autoFocus
          />
        </label>

        <section className="atlas-ai-space-edit-sessions" aria-label="Sessões deste Space">
          <div className="atlas-ai-space-edit-section-head">
            <span>Sessões</span>
            <small>{space.threadIds.length} sessões</small>
          </div>
          <ul>
            {threads.map((thread) => (
              <li key={thread.id}>
                <span>{thread.title?.trim() || '(sem título)'}</span>
                <button
                  type="button"
                  onClick={() => onRemoveThread(thread.id)}
                  title="Remover esta conversa do Space"
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        </section>

        <footer className="atlas-ai-space-edit-footer">
          <button type="button" className="is-danger" onClick={onRemoveSpace}>
            desfazer Space
          </button>
          <span />
          <button type="button" onClick={onClose}>
            cancelar
          </button>
          <button type="submit" className="is-primary" disabled={!canSave}>
            salvar
          </button>
        </footer>
      </form>
    </div>
  )
}

function SuggestedProjectSpaceCard({
  threads,
  title,
  saved,
  saving,
  onOpenSpace,
  onSelect,
  onEditSpace,
  onSaveSpace,
}: {
  threads: AiThreadSummary[]
  title: string
  saved?: boolean
  saving?: boolean
  onOpenSpace?: (threadIds: string[]) => void
  onSelect: (id: string) => void
  onEditSpace?: (threadIds: string[], title: string) => void | Promise<void>
  onSaveSpace?: () => AtlasWorkspaceConversationFusion | null | void | Promise<AtlasWorkspaceConversationFusion | null | void>
}) {
  const [copied, setCopied] = useState(false)
  const threadIds = threads.map((thread) => thread.id)
  const intelligence = evaluateLocalProjectSpaceIntelligence(threads)
  const visibleThreads = threads.slice(0, 4)
  const hiddenCount = Math.max(0, threads.length - visibleThreads.length)
  const copySuggestedPack = async () => {
    const pack = buildLocalProjectSpaceContextPack({ title, threads, source: 'suggested_space' })
    try {
      await navigator.clipboard?.writeText(localProjectSpaceContextPackMarkdown(pack))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return (
    <article className="atlas-ai-project-space-item is-suggested">
      <span className="atlas-ai-project-space-icon" aria-hidden="true">
        <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.2 4.2h9.6M2.2 7h9.6M2.2 9.8h5.7" />
        </svg>
      </span>
      <span className="atlas-ai-project-space-main">
        <span className="atlas-ai-project-space-title-row">
          <span className="atlas-ai-project-space-kicker">{saved ? 'Space salvo' : 'Space sugerido'}</span>
          <span className="atlas-ai-project-space-actions">
            <button
              type="button"
              className="atlas-ai-project-space-action is-primary"
              onClick={() => onOpenSpace?.(threadIds)}
              title="Abre as sessões deste Space para comparar"
            >
              comparar
            </button>
            <button
              type="button"
              className="atlas-ai-project-space-action"
              onClick={() => void copySuggestedPack()}
              title="Copiar contexto seguro deste Space"
            >
              {copied ? 'copiado' : 'contexto'}
            </button>
            {saved ? (
              <button
                type="button"
                className="atlas-ai-project-space-action is-saved"
                disabled
                title="Space salvo neste Mac"
              >
                salvo
              </button>
            ) : onSaveSpace ? (
              <button
                type="button"
                className="atlas-ai-project-space-action"
                onClick={() => void onSaveSpace()}
                disabled={saving}
                title="Salvar este Space para reutilizar depois"
              >
                {saving ? 'salvando' : 'salvar'}
              </button>
            ) : null}
	            <button
	              type="button"
	              className="atlas-ai-project-space-action"
	              onClick={() => void onEditSpace?.(threadIds, title)}
	              title="Abre um modal para editar nome e sessões deste Space"
	            >
	              editar
	            </button>
          </span>
        </span>
        <span className="atlas-ai-project-space-title-button is-static">
          {title}
        </span>
        <small>{threads.length} sessões</small>
        <span className={`atlas-ai-project-space-intelligence is-${intelligence.level}`}>
          <span>{intelligence.label}</span>
          <em>{intelligence.detail}</em>
          {intelligence.lastActiveAt ? (
            <time dateTime={intelligence.lastActiveAt}>{formatRelativeShort(intelligence.lastActiveAt)}</time>
          ) : null}
        </span>
        <ul className="atlas-ai-project-space-thread-list" aria-label={`Conversas dentro de ${title}`}>
          {visibleThreads.map((thread) => (
            <li key={thread.id}>
              <button type="button" title="Abrir somente esta conversa" onClick={() => onSelect(thread.id)}>
                <span>{thread.title?.trim() || '(sem título)'}</span>
              </button>
            </li>
          ))}
          {hiddenCount > 0 ? (
            <li className="atlas-ai-project-space-thread-more">
              + {hiddenCount} sessões
            </li>
          ) : null}
        </ul>
        <span className="atlas-ai-project-space-next">{intelligence.nextAction}</span>
      </span>
    </article>
  )
}

function WorkspaceFusionStatus({ fusion, loading, error }: WorkspaceFusionStatusProps) {
  if (loading) {
    return <span className="atlas-ai-workspace-fusion-status">atualizando Space…</span>
  }
  if (error) {
    return <span className="atlas-ai-workspace-fusion-status is-error">sugestão automática de Space indisponível</span>
  }
  if (!fusion) return null
  const summary = fusion.summary ?? {}
  const policy = fusion.claim_policy ?? {}
  const persisted = fusion.persisted_artifact?.artifact_hash
  const blocked = fusion.status === 'blocked'
  const rejected = Array.isArray(fusion.rejected_thread_ids) ? fusion.rejected_thread_ids.length : 0
  const safe =
    !blocked &&
    policy.invokes_provider === false &&
    policy.spends_tokens === false &&
    fusion.source_policy?.raw_conversation_returned === false
  return (
    <span className={`atlas-ai-workspace-fusion-status${safe ? ' is-safe' : ' is-warn'}`}>
      {blocked
        ? `Conversas fora deste projeto${rejected > 0 ? ` · ${rejected} não entrou` : ''}`
        : `${summary.thread_count ?? 0} sessões neste Space${safe ? '' : ' · conferir'}${persisted ? ' · salvo' : ''}`}
    </span>
  )
}

interface WorkspaceFusionArtifactStatusProps {
  artifact?: AtlasWorkspaceArtifactLakeEntry | null
  loading?: boolean
  error?: string | null
}

function WorkspaceFusionArtifactStatus({ artifact, loading, error }: WorkspaceFusionArtifactStatusProps) {
  if (loading) {
    return <span className="atlas-ai-workspace-fusion-status">abrindo Space salvo…</span>
  }
  if (error) {
    return <span className="atlas-ai-workspace-fusion-status is-error">Space salvo indisponível no momento</span>
  }
  if (!artifact || artifact.status !== 'ready') return null
  const summary = artifact.artifact?.body?.summary ?? {}
  const replay = artifact.replay_contract
  const consumers = replay?.recommended_consumers
    ?.map((consumer) => consumerLabelForSpace(consumer))
    .filter(Boolean)
    .slice(0, 3)
    .join(', ')
  return (
    <span className="atlas-ai-workspace-fusion-status is-safe">
      Space salvo · {summary.thread_count ?? 0} sessões · {summary.decision_count ?? 0} decisões · conteúdo completo {replay?.raw_conversation_replay_allowed === false ? 'protegido' : 'sob revisão'}{consumers ? ` · reutilizável por ${consumers}` : ''}
    </span>
  )
}

function consumerLabelForSpace(consumer: string): string {
  switch (consumer) {
    case 'atlas_dev':
      return 'Code'
    case 'atlas_forge':
      return 'Forge'
    case 'subagent_projection':
      return 'agentes'
    default:
      return consumer
        .replace(/^atlas[_-]/, '')
        .replace(/[_-]+/g, ' ')
        .trim()
  }
}

interface SectionProps {
  label: string
  count: number | null
  children: React.ReactNode
}

function Section({ label, children }: SectionProps) {
  return (
    <section className="atlas-ai-tree-section">
      <header className="atlas-ai-tree-section-head">
        <span>{label}</span>
      </header>
      {children}
    </section>
  )
}

interface OrphanListProps {
  threads: AiThreadSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenBeside?: (id: string) => void
  onOpenInStage?: (id: string) => void
  onContextMenu?: (thread: AiThreadSummary, ev: React.MouseEvent) => void
  draggable?: boolean
  onFuseThreads?: (threadIds: string[]) => void | Promise<void>
  onPointerFusionStart?: (event: PointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>, thread: AiThreadSummary) => void
  pointerFusionTargetId?: string | null
  suppressClickThreadId?: string | null
  onDragThreadStart?: (title: string) => void
  onDragThreadEnd?: () => void
}

function OrphanList({
  threads,
  selectedId,
  onSelect,
  onOpenBeside,
  onOpenInStage,
  onContextMenu,
  draggable,
  onFuseThreads,
  onPointerFusionStart,
  pointerFusionTargetId,
  suppressClickThreadId,
  onDragThreadStart,
  onDragThreadEnd,
}: OrphanListProps) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? threads : threads.slice(0, DEFAULT_VISIBLE_PER_PROJECT)
  const remaining = threads.length - visible.length
  return (
    <>
      <ul className="atlas-ai-thread-list" role="list">
        {visible.map((t) => (
          <ThreadRow
            key={t.id}
            thread={t}
            selectedId={selectedId}
            onSelect={onSelect}
            onOpenBeside={onOpenBeside}
            onOpenInStage={onOpenInStage}
            onContextMenu={onContextMenu}
            draggable={draggable}
            fusionProjectKey="chats"
            persistBackend={false}
            onFuseThreads={onFuseThreads}
            onPointerFusionStart={(event) => onPointerFusionStart?.(event, t)}
            pointerFusionTarget={pointerFusionTargetId === t.id}
            suppressClick={suppressClickThreadId === t.id}
            onDragThreadStart={onDragThreadStart}
            onDragThreadEnd={onDragThreadEnd}
          />
        ))}
      </ul>
      {remaining > 0 ? (
        <button type="button" className="atlas-ai-show-more" onClick={() => setShowAll(true)}>
          Mostrar mais {remaining}
        </button>
      ) : showAll && threads.length > DEFAULT_VISIBLE_PER_PROJECT ? (
        <button type="button" className="atlas-ai-show-more" onClick={() => setShowAll(false)}>
          Mostrar menos
        </button>
      ) : null}
    </>
  )
}

interface ThreadRowProps {
  thread: AiThreadSummary
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenBeside?: (id: string) => void
  onOpenInStage?: (id: string) => void
  onContextMenu?: (thread: AiThreadSummary, ev: React.MouseEvent) => void
  pinned?: boolean
  indented?: boolean
  draggable?: boolean
  fusionProjectKey?: string
  persistBackend?: boolean
  onFuseThreads?: (threadIds: string[]) => void | Promise<void>
  onPointerFusionStart?: (event: PointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>) => void
  pointerFusionTarget?: boolean
  suppressClick?: boolean
  onDragThreadStart?: (title: string) => void
  onDragThreadEnd?: () => void
}

function ThreadRow({
  thread,
  selectedId,
  onSelect,
  onOpenBeside,
  onOpenInStage,
  onContextMenu,
  pinned,
  indented,
  draggable,
  fusionProjectKey,
  persistBackend,
  onFuseThreads,
  onPointerFusionStart,
  pointerFusionTarget,
  suppressClick,
  onDragThreadStart,
  onDragThreadEnd,
}: ThreadRowProps) {
  const mode = inferThreadMode(thread)
  const selected = thread.id === selectedId
  const title = thread.title?.trim() || '(sem título)'
  const time = formatRelativeShort(threadTimestamp(thread))
  const dragHandleTitle = 'Arrastar conversa'
  const [dropTarget, setDropTarget] = useState(false)
  const startThreadDrag = (event: DragEvent<HTMLElement>) => {
    if (!draggable) return
    event.dataTransfer.effectAllowed = 'copyMove'
    event.dataTransfer.setData('application/x-atlas-ai-thread-id', thread.id)
    event.dataTransfer.setData('text/x-atlas-ai-thread-id', thread.id)
    event.dataTransfer.setData('text/plain', title)
    onDragThreadStart?.(title)
  }
  const finishThreadDrag = (event: DragEvent<HTMLElement>) => {
    setDropTarget(false)
    const target = document.elementFromPoint(event.clientX, event.clientY)
    if (target?.closest('.atlas-ai-stage')) {
      onOpenInStage?.(thread.id)
    }
    onDragThreadEnd?.()
  }
  return (
    <li
      className={`atlas-ai-thread-item is-mode-${mode}${selected ? ' is-selected' : ''}${pinned ? ' is-pinned' : ''}${indented ? ' is-indented' : ''}${dropTarget ? ' is-fusion-target' : ''}${pointerFusionTarget ? ' is-pointer-fusion-target' : ''}`}
      data-atlas-thread-id={thread.id}
      data-atlas-project-key={fusionProjectKey}
      data-atlas-persist-backend={persistBackend ? 'true' : 'false'}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault()
          onContextMenu(thread, e)
        }
      }}
      draggable={false}
      onDragStart={startThreadDrag}
      onDragEnd={finishThreadDrag}
      onDragOver={(event) => {
        if (!onFuseThreads) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'link'
        setDropTarget(true)
      }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={(event) => {
        if (!onFuseThreads) return
        const sourceId =
          event.dataTransfer.getData('application/x-atlas-ai-thread-id') ||
          event.dataTransfer.getData('text/x-atlas-ai-thread-id')
        setDropTarget(false)
        onDragThreadEnd?.()
        if (!sourceId || sourceId === thread.id) return
        event.preventDefault()
        void onFuseThreads([sourceId, thread.id])
      }}
    >
      <div className="atlas-ai-thread-shell">
        {draggable ? (
          <button
            type="button"
            draggable={false}
            className="atlas-ai-thread-drag-handle"
            title={dragHandleTitle}
            aria-label={`${dragHandleTitle}: ${title}`}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onSelect(thread.id)
            }}
            onPointerDown={(event) => {
              event.stopPropagation()
              onPointerFusionStart?.(event)
            }}
            onMouseDown={(event) => {
              event.stopPropagation()
              onPointerFusionStart?.(event)
            }}
            onDragStart={startThreadDrag}
            onDragEnd={finishThreadDrag}
          >
            <span aria-hidden="true">⋮⋮</span>
          </button>
        ) : null}
        <button
          type="button"
          className="atlas-ai-thread-button"
          draggable={false}
          onPointerDown={onPointerFusionStart}
          onMouseDown={onPointerFusionStart}
          onDragStart={startThreadDrag}
          onClick={(event) => {
            if (suppressClick) {
              event.preventDefault()
              event.stopPropagation()
              return
            }
            if ((event.metaKey || event.ctrlKey || event.altKey) && onOpenBeside) {
              onOpenBeside(thread.id)
              return
            }
            onSelect(thread.id)
          }}
          aria-current={selected ? 'true' : undefined}
        >
          <div className="atlas-ai-thread-row">
            {pinned ? (
              <span className="atlas-ai-thread-pin" aria-label="fixada" title="fixada">
                <svg viewBox="0 0 12 12" width="9" height="9" fill="currentColor" aria-hidden="true">
                  <path d="M6 0.6 L7.5 4.2 L11.4 4.2 L8.2 6.6 L9.4 10.3 L6 8 L2.6 10.3 L3.8 6.6 L0.6 4.2 L4.5 4.2 Z" />
                </svg>
              </span>
            ) : null}
            <span className="atlas-ai-thread-title" title={title}>{title}</span>
            {time ? <span className="atlas-ai-thread-time">{time}</span> : null}
          </div>
        </button>
        {onOpenBeside ? (
          <button
            type="button"
            className="atlas-ai-thread-open-beside"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onOpenBeside(thread.id)
            }}
            title="Comparar"
            aria-label={`Comparar ${title}`}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="2" y="3" width="5" height="10" rx="1.2" />
              <rect x="9" y="3" width="5" height="10" rx="1.2" />
            </svg>
          </button>
        ) : null}
      </div>
    </li>
  )
}
