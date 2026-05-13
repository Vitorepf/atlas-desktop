import type { Session } from '@atlas/domain'

interface LeftRailProps {
  active: Session[]
  recent: Session[]
  loading: boolean
}

/**
 * Sessions sidebar · running obras + recent obras + ✦ nova obra.
 * Empty states are honest — never paints fake OBRA-XXX placeholders.
 */
export function LeftRail({ active, recent, loading }: LeftRailProps) {
  return (
    <aside className="left-rail">
      <section className="sess-section">
        <h3>
          Em curso <span className="meta">{active.length} ao vivo</span>
        </h3>
        {active.length === 0 && (
          <EmptyRow text={loading ? 'consultando Kernel…' : 'nenhuma sessão em curso'} />
        )}
        {active.map((s, i) => (
          <article key={s.id} className={`sess-entry${i === 0 ? ' active' : ''}`}>
            <div className="meta">
              <span className="origin">{s.origin === 'voice' ? 'voz' : s.origin}</span>
              {s.turns > 0 && <span>{s.turns} turnos</span>}
              {s.durationMs > 0 && <span>{Math.round(s.durationMs / 1000 / 60)}min</span>}
            </div>
            <div className="title">{s.title || `sessão ${shortId(s.id)}`}</div>
          </article>
        ))}
      </section>

      <section className="sess-section">
        <h3>
          Recentes <span className="meta">{recent.length} totais</span>
        </h3>
        {recent.length === 0 && (
          <EmptyRow text={loading ? '…' : 'sem histórico ainda'} />
        )}
        {recent.map((s) => (
          <article key={s.id} className="sess-entry">
            <div className="meta">
              <span className="origin">{s.origin}</span>
              {s.turns > 0 && <span>{s.turns} turnos</span>}
            </div>
            <div className="title">{s.title || `sessão ${shortId(s.id)}`}</div>
          </article>
        ))}
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
