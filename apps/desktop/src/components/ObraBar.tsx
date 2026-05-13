import type { Obra } from '@atlas/domain'

interface ObraBarProps {
  obra: Obra | null
}

/**
 * ObraBar · shows the active obra. When none exists, it invites the user to
 * create one. NEVER paints a fake OBRA-ID.
 */
export function ObraBar({ obra }: ObraBarProps) {
  if (!obra || !obra.id) {
    return (
      <section className="obra-bar">
        <div style={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
          <span className="obra-id" style={{ opacity: 0.45 }}>—</span>
          <span className="obra-objective" style={{ opacity: 0.55 }}>
            nenhuma obra ativa · ✦ aguardando primeira obra
          </span>
        </div>
        <div />
        <div className="status-board">
          <span className="status-item"><span className="l">decide:</span><span className="v">—</span></span>
          <span className="status-item"><span className="l">conf:</span><span className="v">—</span></span>
          <span className="status-item"><span className="l">gates:</span><span className="v">—</span></span>
          <span className="status-item"><span className="l">cost:</span><span className="v">—</span></span>
        </div>
      </section>
    )
  }

  // Real obra: show what we have. Decide/conf/gates/cost arrive via streaming
  // from the Kernel; until then, render dashes (not invented numbers).
  return (
    <section className="obra-bar">
      <div style={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
        <span className="obra-id">{shortId(obra.id)}</span>
        <span className="obra-objective">{obra.objective || obra.title || '—'}</span>
      </div>
      <div />
      <div className="status-board">
        <span className="status-item"><span className="l">decide:</span><span className="v">—</span></span>
        <span className="status-item"><span className="l">conf:</span><span className="v">—</span></span>
        <span className="status-item"><span className="l">gates:</span><span className="v">—</span></span>
        <span className="status-item"><span className="l">cost:</span><span className="v">—</span></span>
      </div>
    </section>
  )
}

/** Display 8 leading chars of UUID for compactness. */
function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) : id
}
