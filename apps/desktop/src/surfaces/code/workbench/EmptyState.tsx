import type { ReactNode } from 'react'

/**
 * Premium empty state · explica POR QUE está vazio e O QUE FAZER agora.
 * Tom default neutro (graphite); pode ser warning/info quando informa
 * espera real (loading, aguardando worker, sem permissão).
 */
export function EmptyState({
  title,
  hint,
  action,
  tone = 'default',
  icon,
}: {
  title: string
  hint?: string
  action?: ReactNode
  tone?: 'default' | 'info' | 'warning'
  icon?: ReactNode
}) {
  const background =
    tone === 'info'
      ? 'var(--cc-info-veil)'
      : tone === 'warning'
        ? 'var(--cc-warning-veil)'
        : 'transparent'
  const borderColor =
    tone === 'info'
      ? 'var(--cc-info-border)'
      : tone === 'warning'
        ? 'var(--cc-warning-border)'
        : 'var(--cc-border-soft)'

  return (
    <div
      role="status"
      style={{
        display: 'grid',
        gap: 6,
        padding: '14px 16px',
        background,
        border: `1px dashed ${borderColor}`,
        borderRadius: 'var(--cc-radius-md)',
        color: 'var(--cc-text-muted)',
        fontFamily: 'var(--cc-font-sans)',
        fontSize: 13,
        lineHeight: 'var(--cc-leading-relaxed)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon ? <span aria-hidden style={{ color: 'var(--cc-text-faint)', fontSize: 16 }}>{icon}</span> : null}
        <span style={{ fontWeight: 600, color: 'var(--cc-text)' }}>{title}</span>
      </div>
      {hint ? <span style={{ color: 'var(--cc-text-faint)', fontSize: 12 }}>{hint}</span> : null}
      {action ? <div style={{ marginTop: 4 }}>{action}</div> : null}
    </div>
  )
}
