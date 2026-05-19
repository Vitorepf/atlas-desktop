import type { Session } from '@atlas/domain'
import { EmptyState, ObraListItem } from '../workbench'
import type { StatusKind } from '../workbench/tokens'
import { shortId } from './leftRailUtils'

interface SessionsSectionProps {
  sessions: Session[]
  loading?: boolean
  emptyText: string
}

/**
 * Atlas Code Premium Workbench v1 · seção de sessões.
 *
 * Reaproveita `ObraListItem` (workbench primitive) para manter densidade e
 * hierarquia consistentes com a lista de Obras. Status dot semântico,
 * origem + turnos em meta.
 */
export function SessionsSection({ sessions, loading = false, emptyText }: SessionsSectionProps) {
  if (sessions.length === 0) {
    return <EmptyState title={loading ? 'Carregando sessões…' : emptyText} tone={loading ? 'info' : 'default'} />
  }

  return (
    <div role="list" aria-label="Sessões" style={{ display: 'grid', gap: 2 }}>
      {sessions.map((s) => {
        const dot = mapSessionStatus(s.status)
        const hint = s.turns > 0 ? `${s.turns} ${s.turns === 1 ? 'turno' : 'turnos'}` : undefined
        return (
          <ObraListItem
            key={s.id}
            shortId={shortId(s.threadId || s.id)}
            title={s.title || `thread ${shortId(s.threadId || s.id)}`}
            status={dot}
            statusLabel={s.origin}
            hint={hint}
            onClick={() => undefined}
          />
        )
      })}
    </div>
  )
}

function mapSessionStatus(status: Session['status']): StatusKind {
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
