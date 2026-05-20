import type { ControlPlaneStatus } from '../types'

interface StatusBadgeProps {
  status?: ControlPlaneStatus | string | null
  label?: string
}

/**
 * Renders a canonical Control Plane status chip.
 *
 * Any unknown / missing value collapses to `unknown` — components never
 * pretend the runtime is ready when the backend was silent.
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalised: string = ((): string => {
    if (typeof status === 'string') return status
    return 'unknown'
  })()
  const display = label ?? normalised
  return (
    <span className="cp-status" data-status={normalised} aria-label={`status ${normalised}`}>
      {display}
    </span>
  )
}
