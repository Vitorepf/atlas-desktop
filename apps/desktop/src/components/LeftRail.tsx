import type { Session } from '@atlas/domain'

interface LeftRailProps {
  active: Session[]
  recent: Session[]
}

/**
 * Sessions sidebar — running obras + recent obras + ✦ nova obra.
 * No business logic; just renders payloads from the bridge.
 */
export function LeftRail({ active, recent }: LeftRailProps) {
  return (
    <aside className="left-rail">
      <section className="sess-section">
        <h3>
          Em curso <span className="meta">{active.length} ao vivo</span>
        </h3>
        {active.map((s, i) => (
          <article key={s.id} className={`sess-entry${i === 0 ? ' active' : ''}`}>
            <div className="meta">
              <span className="origin">{s.origin === 'voice' ? 'voz' : s.origin}</span>
              <span>{s.turns} turnos</span>
              <span>{Math.round(s.durationMs / 1000 / 60)}min</span>
            </div>
            <div className="title">{s.title}</div>
            <div className="workspace">~/develop/Atlas</div>
          </article>
        ))}
      </section>

      <section className="sess-section">
        <h3>
          Recentes <span className="meta">{recent.length} totais</span>
        </h3>
        {recent.map((s) => (
          <article key={s.id} className="sess-entry">
            <div className="meta">
              <span className="origin">{s.origin}</span>
              <span>{s.turns} turnos</span>
            </div>
            <div className="title">{s.title}</div>
          </article>
        ))}
      </section>
    </aside>
  )
}
