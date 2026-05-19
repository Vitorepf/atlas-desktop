import type { ReactNode } from 'react'

/**
 * Premium workbench panel · card escalonado em surface-raised com header
 * tipográfico, eyebrow opcional e ação inline opcional. Hierarquia clara,
 * espaçamento consistente, calm enterprise feel.
 */
export function WorkbenchPanel({
  title,
  eyebrow,
  action,
  children,
  density = 'comfortable',
  tone = 'default',
}: {
  title: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
  density?: 'comfortable' | 'compact'
  tone?: 'default' | 'raised' | 'sunken'
}) {
  const padding = density === 'compact' ? 12 : 16
  const background =
    tone === 'sunken' ? 'var(--cc-surface-sunken)' : tone === 'raised' ? 'var(--cc-surface-raised)' : 'var(--cc-surface)'

  return (
    <section
      style={{
        display: 'grid',
        gap: 10,
        padding,
        background,
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 'var(--cc-radius-md)',
        boxShadow: 'var(--cc-shadow-xs)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          {eyebrow ? (
            <span
              style={{
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 11,
                color: 'var(--cc-text-faint)',
                letterSpacing: 'var(--cc-tracking-normal)',
                fontWeight: 500,
              }}
            >
              {eyebrow}
            </span>
          ) : null}
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--cc-font-sans)',
              fontSize: density === 'compact' ? 13.5 : 14.5,
              fontWeight: 600,
              color: 'var(--cc-text-strong)',
              letterSpacing: 'var(--cc-tracking-normal)',
              lineHeight: 'var(--cc-leading-tight)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {title}
          </h3>
        </div>
        {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
      </header>
      <div>{children}</div>
    </section>
  )
}

/**
 * Subseção dentro de um WorkbenchPanel · usa eyebrow pequeno e padding zerado.
 */
export function WorkbenchSection({
  eyebrow,
  children,
}: {
  eyebrow: string
  children: ReactNode
}) {
  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 11,
          color: 'var(--cc-text-faint)',
          fontWeight: 500,
          letterSpacing: 'var(--cc-tracking-normal)',
        }}
      >
        {eyebrow}
      </span>
      {children}
    </section>
  )
}
