import type { AiThreadSummary, AtlasAiMode } from '../types'

interface AtlasAiThreadListProps {
  threads: AiThreadSummary[]
  loading: boolean
  error: string | null
  selectedId: string | null
  modeFilter: AtlasAiMode | 'all'
  onModeFilter: (m: AtlasAiMode | 'all') => void
  onRefresh: () => void
  onSelect: (id: string) => void
  onNewThread: () => void
}

const MODE_TAG: Record<AtlasAiMode | 'all', string> = {
  all: 'todas',
  general: 'geral',
  operational: 'ops',
  programming: 'dev',
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
  return 'general'
}

export function AtlasAiThreadList({
  threads,
  loading,
  error,
  selectedId,
  modeFilter,
  onModeFilter,
  onRefresh,
  onSelect,
  onNewThread,
}: AtlasAiThreadListProps) {
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
          onClick={onRefresh}
          disabled={loading}
          title="Recarregar"
        >
          {loading ? 'lendo…' : '↻'}
        </button>
      </div>

      {error ? <p className="atlas-ai-error-line">{error}</p> : null}

      {threads.length === 0 && !loading ? (
        <p className="atlas-ai-empty-line">
          {error
            ? 'Backend indisponível.'
            : 'Nenhuma conversa neste filtro. Comece com o composer abaixo.'}
        </p>
      ) : (
        <ul className="atlas-ai-thread-list" role="list">
          {threads.map((thread) => {
            const mode = inferThreadMode(thread)
            const selected = thread.id === selectedId
            const title = thread.title?.trim() || '(sem título)'
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
                  <span className={`atlas-ai-thread-mode mode-${mode}`}>{MODE_TAG[mode]}</span>
                  <span className="atlas-ai-thread-body">
                    <span className="atlas-ai-thread-title">{title}</span>
                    <span className="atlas-ai-thread-meta">
                      {thread.workspace ? <span>{thread.workspace}</span> : <span>sem workspace</span>}
                      {thread.message_count > 0 ? <span>· {thread.message_count} msg</span> : null}
                      {thread.last_provider ? <span>· {thread.last_provider}</span> : null}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
