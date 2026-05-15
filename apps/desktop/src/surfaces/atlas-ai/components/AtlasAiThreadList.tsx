/**
 * Atlas AI · ThreadList premium with date grouping.
 *
 * Cards de thread agrupados por seção temporal (Hoje · Ontem · Esta semana ·
 * Mais antigas). Cada card mostra chip de modo, título, tempo relativo e
 * preview da última mensagem. Erro vira banner com retry.
 */
import { useMemo } from 'react'
import { AtlasAiErrorBanner } from './AtlasAiErrorBanner'
import { formatRelativeShort, groupKeyFor, TIME_GROUP_LABEL, type TimeGroupKey } from '../timeFormat'
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
}

const MODE_TAG: Record<AtlasAiMode | 'all', string> = {
  all: 'todas',
  general: 'geral',
  operational: 'ops',
  programming: 'dev',
}

const GROUP_ORDER: TimeGroupKey[] = ['today', 'yesterday', 'this_week', 'older']

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

function getPreview(thread: AiThreadSummary): string {
  const meta = thread.metadata ?? {}
  const lastSnippet = typeof meta.last_message_snippet === 'string' ? meta.last_message_snippet : null
  if (lastSnippet) return lastSnippet
  const lastInput = typeof meta.last_input_text === 'string' ? meta.last_input_text : null
  if (lastInput) return lastInput
  if (thread.summary && thread.summary.trim() !== '') return thread.summary.trim()
  return thread.workspace ? `workspace: ${thread.workspace}` : 'sem mensagens ainda'
}

function threadTimestamp(thread: AiThreadSummary): string | null {
  return thread.last_message_at ?? thread.updated_at ?? thread.created_at ?? null
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
}: AtlasAiThreadListProps) {
  const grouped = useMemo(() => {
    const buckets: Record<TimeGroupKey, AiThreadSummary[]> = {
      today: [],
      yesterday: [],
      this_week: [],
      older: [],
    }
    for (const t of threads) {
      const key = groupKeyFor(threadTimestamp(t))
      buckets[key].push(t)
    }
    return buckets
  }, [threads])

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
        <div className="atlas-ai-thread-groups">
          {GROUP_ORDER.filter((g) => grouped[g].length > 0).map((groupKey) => (
            <section key={groupKey} className="atlas-ai-thread-group">
              <header className="atlas-ai-thread-group-header">
                <span>{TIME_GROUP_LABEL[groupKey]}</span>
                <span className="atlas-ai-thread-group-count">{grouped[groupKey].length}</span>
              </header>
              <ul className="atlas-ai-thread-list" role="list">
                {grouped[groupKey].map((thread) => {
                  const mode = inferThreadMode(thread)
                  const selected = thread.id === selectedId
                  const title = thread.title?.trim() || '(sem título)'
                  const time = formatRelativeShort(threadTimestamp(thread))
                  const preview = getPreview(thread)
                  return (
                    <li
                      key={thread.id}
                      className={`atlas-ai-thread-item is-mode-${mode}${selected ? ' is-selected' : ''}`}
                    >
                      <button
                        type="button"
                        className="atlas-ai-thread-button"
                        onClick={() => onSelect(thread.id)}
                        aria-current={selected ? 'true' : undefined}
                      >
                        <div className="atlas-ai-thread-row">
                          <span className={`atlas-ai-thread-mode mode-${mode}`}>{MODE_TAG[mode]}</span>
                          <span className="atlas-ai-thread-title">{title}</span>
                          {time ? <span className="atlas-ai-thread-time">{time}</span> : null}
                        </div>
                        <span className="atlas-ai-thread-preview">{preview}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </section>
  )
}
