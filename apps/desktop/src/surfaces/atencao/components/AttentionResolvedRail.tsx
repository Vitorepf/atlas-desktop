import type { AttentionResolvedRecently } from '../types'

interface AttentionResolvedRailProps {
  resolved: AttentionResolvedRecently[]
}

export function AttentionResolvedRail({ resolved }: AttentionResolvedRailProps) {
  if (resolved.length === 0) return null

  return (
    <section className="atencao-resolved" aria-label="Resolvidas recentemente">
      <header>
        <h3>Resolvidas</h3>
        <span className="atencao-queue-count">{resolved.length}</span>
      </header>
      <ul role="list">
        {resolved.slice(0, 6).map((r) => (
          <li key={r.obra_id}>
            <span className="atencao-resolved-title">{r.obra_title}</span>
            <span className="atencao-resolved-state">· {r.human_status_label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
