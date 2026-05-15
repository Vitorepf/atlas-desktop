import type { AttentionResolvedRecently } from '../types'

interface AttentionEmptyProps {
  headline: string
  detail: string
  resolvedRecently?: AttentionResolvedRecently[]
}

export function AttentionEmpty({ headline, detail, resolvedRecently }: AttentionEmptyProps) {
  return (
    <section className="atencao-empty" aria-live="polite">
      <div className="atencao-empty-glyph" aria-hidden="true">
        ✦
      </div>
      <h2>{headline}</h2>
      <p>{detail}</p>
      {resolvedRecently && resolvedRecently.length > 0 ? (
        <aside className="atencao-empty-resolved">
          <header>Resolvidas recentemente</header>
          <ul>
            {resolvedRecently.slice(0, 6).map((r) => (
              <li key={r.obra_id}>
                <span className="atencao-empty-resolved-title">{r.obra_title}</span>
                <span className="atencao-empty-resolved-state">· {r.human_status_label}</span>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </section>
  )
}
