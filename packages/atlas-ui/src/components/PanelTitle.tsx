import type { ReactNode } from 'react'

export interface PanelTitleProps {
  label: string
  meta?: ReactNode
}

/**
 * Editorial section header — bronze Mono caps + optional muted meta.
 * Used at the top of any inspector / ops panel section.
 */
export function PanelTitle({ label, meta }: PanelTitleProps) {
  return (
    <div className="panel-title">
      <span>{label}</span>
      {meta ? <span className="muted">{meta}</span> : null}
    </div>
  )
}
