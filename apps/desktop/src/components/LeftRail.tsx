import type { Obra, Session } from '@atlas/domain'

interface LeftRailProps {
  obras: Obra[]
  activeObraId: string | null
  active: Session[]
  recent: Session[]
  loading: boolean
  busy: boolean
  onSelectObra: (obraId: string) => Promise<void>
}

/**
 * Sessions sidebar · obras list (clickable) + sessions in current obra.
 * Empty states are honest — never paints invented records.
 */
export function LeftRail({ obras, activeObraId, active, recent, loading, busy, onSelectObra }: LeftRailProps) {
  return (
    <aside className="left-rail">
      <section className="sess-section">
        <h3>
          Obras <span className="meta">{obras.length}</span>
        </h3>
        {obras.length === 0 ? (
          <EmptyRow text={loading ? 'consultando Kernel…' : 'nenhuma obra · ✦ cria a primeira'} />
        ) : (
          obras.map((o) => (
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
          ))
        )}
      </section>

      <section className="sess-section">
        <h3>
          Sessões em curso <span className="meta">{active.length}</span>
        </h3>
        {active.length === 0 ? (
          <EmptyRow text={loading ? '…' : 'nenhuma sessão nessa obra'} />
        ) : (
          active.map((s) => (
            <article key={s.id} className="sess-entry">
              <div className="meta">
                <span className="origin">{s.origin}</span>
                {s.turns > 0 && <span>{s.turns} turnos</span>}
              </div>
              <div className="title">{s.title || `thread ${shortId(s.threadId)}`}</div>
            </article>
          ))
        )}
      </section>

      <section className="sess-section">
        <h3>
          Recentes <span className="meta">{recent.length}</span>
        </h3>
        {recent.length === 0 ? (
          <EmptyRow text="—" />
        ) : (
          recent.map((s) => (
            <article key={s.id} className="sess-entry">
              <div className="meta"><span className="origin">{s.origin}</span></div>
              <div className="title">{s.title || `sessão ${shortId(s.id)}`}</div>
            </article>
          ))
        )}
      </section>
    </aside>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '12px 0 4px',
        fontFamily: 'var(--serif)',
        fontStyle: 'italic',
        fontSize: 12.5,
        color: 'var(--ink3)',
      }}
    >
      {text}
    </div>
  )
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id
}
