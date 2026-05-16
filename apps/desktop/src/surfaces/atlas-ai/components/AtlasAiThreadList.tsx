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
import { useEffect, useMemo, useState } from 'react'
import { AtlasAiErrorBanner } from './AtlasAiErrorBanner'
import { formatRelativeShort } from '../timeFormat'
import type { AiThreadSummary, AtlasAiMode } from '../types'

interface AtlasAiThreadListProps {
  threads: AiThreadSummary[]
  loading: boolean
  error: string | null
  retrying?: boolean
  selectedId: string | null
  modeFilter: AtlasAiMode | 'all'
  onModeFilter: (m: AtlasAiMode | 'all') => void
  onRefresh: () => void | Promise<void>
  onSelect: (id: string) => void
  onNewThread: () => void
  pinnedIds?: Set<string>
  onContextMenu?: (thread: AiThreadSummary, ev: React.MouseEvent) => void
}

const MODE_TAG: Record<AtlasAiMode | 'all', string> = {
  all: 'todas',
  general: 'geral',
  operational: 'ops',
  programming: 'dev',
}

const COLLAPSED_STORAGE = 'atlas-desktop:atlas-ai-projects-collapsed'
const SHOW_ALL_STORAGE = 'atlas-desktop:atlas-ai-projects-expanded-all'
const DEFAULT_VISIBLE_PER_PROJECT = 5

function inferThreadMode(thread: AiThreadSummary): AtlasAiMode {
  const meta = thread.metadata ?? {}
  const focus = typeof meta.atlas_focus === 'string' ? meta.atlas_focus : null
  const modeMeta = typeof meta.atlas_mode === 'string' ? meta.atlas_mode : null
  const task = typeof meta.routing_task === 'string' ? meta.routing_task : null
  if (focus === 'programming' || modeMeta === 'programming' || task === 'dev' || task === 'debug') {
    return 'programming'
  }
  if (focus === 'operational' || modeMeta === 'operational') return 'operational'
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

export function AtlasAiThreadList({
  threads,
  loading,
  error,
  retrying,
  selectedId,
  modeFilter,
  onModeFilter,
  onRefresh,
  onSelect,
  onNewThread,
  pinnedIds,
  onContextMenu,
}: AtlasAiThreadListProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsed())
  const [expandedAll, setExpandedAll] = useState<Set<string>>(() => loadExpanded())

  useEffect(() => saveCollapsed(collapsed), [collapsed])
  useEffect(() => saveExpanded(expandedAll), [expandedAll])

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

  return (
    <section className="atlas-ai-history" aria-label="Histórico Atlas AI">
      <header className="atlas-ai-history-header">
        <h3>Conversas</h3>
        <button
          type="button"
          className="atlas-ai-link"
          onClick={onNewThread}
          title="Compor sem thread ativa (cria uma nova ao enviar)"
        >
          + nova
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
          className="atlas-ai-refresh"
          onClick={() => void onRefresh()}
          disabled={loading}
          title="Recarregar histórico"
          aria-label="Recarregar histórico"
        >
          {loading ? '…' : '↻'}
        </button>
      </div>

      {error ? (
        <AtlasAiErrorBanner message={error} onRetry={onRefresh} retrying={retrying} />
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
                {pinned.map((t) => (
                  <ThreadRow
                    key={t.id}
                    thread={t}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onContextMenu={onContextMenu}
                    pinned
                  />
                ))}
              </ul>
            </Section>
          ) : null}

          {/* PROJETOS */}
          {projects.length > 0 ? (
            <Section label="Projetos" count={null}>
              {projects.map(([key, list]) => {
                const isCollapsed = collapsed.has(key)
                const isExpandedAll = expandedAll.has(key)
                const limit = isExpandedAll ? list.length : DEFAULT_VISIBLE_PER_PROJECT
                const visible = list.slice(0, limit)
                const remaining = list.length - visible.length
                return (
                  <div key={key} className="atlas-ai-folder">
                    <button
                      type="button"
                      className="atlas-ai-folder-head"
                      onClick={() => toggleCollapsed(key)}
                      aria-expanded={!isCollapsed}
                    >
                      <span className="atlas-ai-folder-caret" aria-hidden="true">
                        {isCollapsed ? '▸' : '▾'}
                      </span>
                      <span className="atlas-ai-folder-icon" aria-hidden="true">
                        <svg viewBox="0 0 16 14" width="13" height="11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1.5 4.5a1.5 1.5 0 0 1 1.5-1.5h3.4l1.5 1.5H13a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 13 12.5H3A1.5 1.5 0 0 1 1.5 11Z" />
                        </svg>
                      </span>
                      <span className="atlas-ai-folder-name" title={key}>
                        {key}
                      </span>
                      <span className="atlas-ai-folder-count">{list.length}</span>
                    </button>
                    {!isCollapsed ? (
                      <>
                        <ul className="atlas-ai-thread-list" role="list">
                          {visible.map((t) => (
                            <ThreadRow
                              key={t.id}
                              thread={t}
                              selectedId={selectedId}
                              onSelect={onSelect}
                              onContextMenu={onContextMenu}
                              indented
                            />
                          ))}
                        </ul>
                        {remaining > 0 ? (
                          <button
                            type="button"
                            className="atlas-ai-show-more"
                            onClick={() => toggleShowAll(key)}
                          >
                            Mostrar mais {remaining}
                          </button>
                        ) : isExpandedAll && list.length > DEFAULT_VISIBLE_PER_PROJECT ? (
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
                onSelect={onSelect}
                onContextMenu={onContextMenu}
              />
            </Section>
          ) : null}
        </div>
      ) : null}
    </section>
  )
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
  onContextMenu?: (thread: AiThreadSummary, ev: React.MouseEvent) => void
}

function OrphanList({ threads, selectedId, onSelect, onContextMenu }: OrphanListProps) {
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
            onContextMenu={onContextMenu}
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
  onContextMenu?: (thread: AiThreadSummary, ev: React.MouseEvent) => void
  pinned?: boolean
  indented?: boolean
}

function ThreadRow({ thread, selectedId, onSelect, onContextMenu, pinned, indented }: ThreadRowProps) {
  const mode = inferThreadMode(thread)
  const selected = thread.id === selectedId
  const title = thread.title?.trim() || '(sem título)'
  const time = formatRelativeShort(threadTimestamp(thread))
  return (
    <li
      className={`atlas-ai-thread-item is-mode-${mode}${selected ? ' is-selected' : ''}${pinned ? ' is-pinned' : ''}${indented ? ' is-indented' : ''}`}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault()
          onContextMenu(thread, e)
        }
      }}
    >
      <button
        type="button"
        className="atlas-ai-thread-button"
        onClick={() => onSelect(thread.id)}
        aria-current={selected ? 'true' : undefined}
      >
        <div className="atlas-ai-thread-row">
          {pinned ? (
            <span className="atlas-ai-thread-pin" aria-label="fixada" title="fixada">📌</span>
          ) : null}
          <span className="atlas-ai-thread-title" title={title}>{title}</span>
          {time ? <span className="atlas-ai-thread-time">{time}</span> : null}
        </div>
      </button>
    </li>
  )
}
