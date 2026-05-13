/**
 * TimelineFloater · painel ao-vivo das mudanças recentes no canon.
 *
 * Cada row clicável → entra em foco daquela peça. "fresh" se < 60s.
 */
import type { CartographyAtom, RecentChange } from '@atlas/domain'
import { formatTimeAgo } from '../map/layout'

interface TimelineFloaterProps {
  changes: RecentChange[]
  atomIndex: Record<string, CartographyAtom>
  onPick: (graphId: string) => void
}

export function TimelineFloater({ changes, atomIndex, onPick }: TimelineFloaterProps) {
  const top = changes.slice(0, 5)
  return (
    <aside className="timeline-panel">
      <div className="tl-head">
        <span className="tl-title">Mudanças recentes</span>
        <span className="tl-live">ao vivo</span>
      </div>
      <div className="tl-list">
        {top.length === 0 ? (
          <div
            style={{
              padding: '12px 14px',
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 12,
              color: 'var(--ink3)',
            }}
          >
            sem mudanças recentes ainda.
          </div>
        ) : (
          top.map((c) => {
            const atom = atomIndex[c.graphId]
            const name = atom?.name ?? c.name
            const path = atom?.sourcePath ?? c.path
            return (
              <button
                key={`${c.graphId}-${c.time}`}
                type="button"
                className={`tl-row${c.secondsAgo < 60 ? ' fresh' : ''}`}
                onClick={() => onPick(c.graphId)}
              >
                <span className="tl-time">{formatTimeAgo(c.secondsAgo)}</span>
                <div className="tl-info">
                  <span className="tl-name">{name}</span>
                  <span className="tl-meta">
                    {c.action} · {c.author} · {path}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
