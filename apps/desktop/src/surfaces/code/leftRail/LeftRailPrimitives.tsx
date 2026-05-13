import type { ReactNode } from 'react'

export function LeftRailSection({
  label,
  count,
  children,
}: {
  label: string
  count: number
  children: ReactNode
}) {
  return (
    <section className="sess-section">
      <h3>
        {label} <span className="meta">{count}</span>
      </h3>
      {children}
    </section>
  )
}

export function EmptyRow({ text }: { text: string }) {
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
