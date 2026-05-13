import type { Session } from '@atlas/domain'
import { EmptyRow } from './LeftRailPrimitives'
import { shortId } from './leftRailUtils'

interface SessionsSectionProps {
  sessions: Session[]
  loading?: boolean
  emptyText: string
}

export function SessionsSection({ sessions, loading = false, emptyText }: SessionsSectionProps) {
  if (sessions.length === 0) {
    return <EmptyRow text={loading ? '…' : emptyText} />
  }

  return (
    <>
      {sessions.map((s) => (
        <article key={s.id} className="sess-entry">
          <div className="meta">
            <span className="origin">{s.origin}</span>
            {s.turns > 0 && <span>{s.turns} turnos</span>}
          </div>
          <div className="title">{s.title || `thread ${shortId(s.threadId || s.id)}`}</div>
        </article>
      ))}
    </>
  )
}
