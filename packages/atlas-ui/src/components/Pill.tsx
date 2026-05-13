import type { ReactNode } from 'react'

export interface PillProps {
  children: ReactNode
  tone?: 'default' | 'primary' | 'ok' | 'danger'
  onClick?: () => void
  title?: string
}

/**
 * Editorial chip — Mono caps text inside a hairline frame. Used across the
 * cockpit for status badges and small actions. Tone changes color, never
 * shape: Atlas DNA keeps geometry constant.
 */
export function Pill({ children, tone = 'default', onClick, title }: PillProps) {
  const className = ['pill', `pill-${tone}`].join(' ')
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} title={title}>
        {children}
      </button>
    )
  }
  return (
    <span className={className} title={title}>
      {children}
    </span>
  )
}
