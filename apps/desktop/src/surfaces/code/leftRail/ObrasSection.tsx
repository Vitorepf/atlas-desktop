import { EmptyRow } from './LeftRailPrimitives'
import type { LeftRailContext } from './leftRailTypes'
import { shortId } from './leftRailUtils'

export function ObrasSection({ obras, activeObraId, loading, busy, onSelectObra }: LeftRailContext) {
  if (obras.length === 0) {
    return <EmptyRow text={loading ? 'consultando Kernel…' : 'nenhuma obra · ✦ cria a primeira'} />
  }

  return (
    <>
      {obras.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`sess-entry${o.id === activeObraId ? ' active' : ''}`}
          onClick={() => void onSelectObra(o.id)}
          disabled={busy}
          style={{ textAlign: 'left', width: '100%', background: 'transparent', border: 0, padding: 0 }}
        >
          <article style={{ padding: '8px 0 9px' }}>
            <div className="meta">
              <span className="origin">{shortId(o.id)}</span>
            </div>
            <div className="title">{o.title || o.objective || `obra ${shortId(o.id)}`}</div>
          </article>
        </button>
      ))}
    </>
  )
}
