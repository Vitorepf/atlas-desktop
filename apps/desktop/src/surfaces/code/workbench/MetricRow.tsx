import type { ReactNode } from 'react'

/**
 * Row de metric (label + value) com layout alinhado, em duas colunas. Para
 * key-value rows dentro de WorkbenchPanel.
 */
export function MetricRow({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'muted' | 'mono'
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(80px, 0.42fr) minmax(0, 1fr)',
        gap: 12,
        padding: '6px 0',
        borderBottom: '1px solid var(--cc-border-soft)',
        alignItems: 'baseline',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 12,
          color: 'var(--cc-text-muted)',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: tone === 'mono' ? 'var(--cc-font-mono)' : 'var(--cc-font-sans)',
          fontSize: tone === 'mono' ? 11.5 : 13,
          color: tone === 'muted' ? 'var(--cc-text-muted)' : 'var(--cc-text)',
          letterSpacing: tone === 'mono' ? 'var(--cc-tracking-data)' : 'var(--cc-tracking-normal)',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
        {hint ? (
          <span style={{ color: 'var(--cc-text-faint)', marginLeft: 8, fontSize: 11 }}>{hint}</span>
        ) : null}
      </span>
    </div>
  )
}
