import type { Session } from '@atlas/domain'
import { EmptyRow } from './LeftRailPrimitives'
import { shortId } from './leftRailUtils'

interface SessionsSectionProps {
  sessions: Session[]
  loading?: boolean
  emptyText: string
}

/**
 * Atlas Code Visual Ergonomics v1 · SessionsSection enterprise.
 *
 * Row compacta: short_id em mono, título em sans, status dot + turnos.
 * Sessions são lista menor (não Obras), por isso row mais densa.
 */
export function SessionsSection({ sessions, loading = false, emptyText }: SessionsSectionProps) {
  if (sessions.length === 0) {
    return <EmptyRow text={loading ? 'Carregando sessões…' : emptyText} />
  }

  return (
    <div role="list" aria-label="Sessões">
      {sessions.map((s) => (
        <article
          key={s.id}
          role="listitem"
          className="cc-obra-row"
          aria-label={`Sessão ${shortId(s.threadId || s.id)} · ${s.title || 'sem título'} · ${s.status}`}
        >
          <div className="cc-obra-row-head">
            <span className="cc-status-dot" data-status={mapSessionStatus(s.status)} aria-hidden="true" />
            <span className="cc-obra-row-id">{shortId(s.threadId || s.id)}</span>
            <span className="cc-obra-row-title">
              {s.title || `thread ${shortId(s.threadId || s.id)}`}
            </span>
          </div>
          <div className="cc-obra-row-meta">
            <span>{s.origin}</span>
            {s.turns > 0 ? (
              <>
                <span className="sep">·</span>
                <span>{s.turns} {s.turns === 1 ? 'turno' : 'turnos'}</span>
              </>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}

function mapSessionStatus(status: Session['status']): string {
  switch (status) {
    case 'running':
      return 'running'
    case 'paused':
      return 'review'
    case 'done':
      return 'passed'
    case 'failed':
      return 'blocked'
    default:
      return 'unknown'
  }
}
