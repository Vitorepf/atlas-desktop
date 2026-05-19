interface AtlasAiEmptyProps {
  headline: string
  detail: string
}

export function AtlasAiEmpty({ headline, detail }: AtlasAiEmptyProps) {
  return (
    <section className="atlas-ai-empty" aria-live="polite">
      <div className="atlas-ai-empty-glyph" aria-hidden="true">
        ✦
      </div>
      <h2>{headline}</h2>
      <p>{detail}</p>
    </section>
  )
}
