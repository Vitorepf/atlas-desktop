import type { ReactNode } from 'react'
import { StatusBadge } from './StatusBadge'
import type { ControlPlaneStatus } from '../types'

interface SectionCardProps {
  title: string
  status?: ControlPlaneStatus | string | null
  detail?: string | null
  wide?: boolean
  emptyMessage?: string
  isEmpty?: boolean
  children?: ReactNode
}

/**
 * Visual wrapper for a Control Plane section. Renders the canonical
 * status chip, an optional detail string, and either the children or the
 * supplied empty message. Empty states are explicit on purpose — the
 * surface MUST NOT invent data when a runtime is missing.
 */
export function SectionCard({
  title,
  status,
  detail,
  wide,
  emptyMessage,
  isEmpty,
  children,
}: SectionCardProps) {
  return (
    <section className={`cp-section${wide ? ' cp-section--wide' : ''}`} aria-label={title}>
      <header className="cp-section-head">
        <h3 className="cp-section-title">{title}</h3>
        <StatusBadge status={status} />
      </header>
      {detail ? <div className="cp-section-detail">{detail}</div> : null}
      {isEmpty ? (
        <div className="cp-section-empty">{emptyMessage ?? 'no data yet · runtime reports empty'}</div>
      ) : (
        children
      )}
    </section>
  )
}
