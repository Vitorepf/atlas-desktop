import type { ReactNode } from 'react'

/**
 * Atlas Code Visual Ergonomics v1 · LeftRailSection enterprise.
 *
 * Substitui o `<h3>` cru por header tipográfico legível em sans, com count
 * em mono pequeno. Sem borda inferior pesada — hierarquia por peso e cor.
 */
export function LeftRailSection({
  label,
  count,
  children,
}: {
  label: string
  /**
   * Numeric badge for this section. Pass `null` (or omit when the section's
   * count would be misleading — e.g. "Projeto ativo" is a singleton header,
   * not a list) to hide the badge entirely.
   */
  count: number | null
  children: ReactNode
}) {
  return (
    <section className="cc-rail-section" aria-label={label}>
      <header className="cc-rail-section-head">
        <span>{label}</span>
        {count !== null ? <span className="count">{count}</span> : null}
      </header>
      {children}
    </section>
  )
}

/**
 * Empty state alinhado ao token enterprise — sai do italic-serif decorativo
 * para um bloco honesto que diz o que está vazio.
 */
export function EmptyRow({ text }: { text: string }) {
  return (
    <div
      className="cc-empty"
      role="status"
      style={{ padding: '10px 12px', marginTop: 2, fontStyle: 'normal' }}
    >
      <span>{text}</span>
    </div>
  )
}
