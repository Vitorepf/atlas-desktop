import type { StatusKind } from './tokens'

/**
 * Premium status dot · cor semântica (token enterprise) + halo opcional
 * quando o estado é "running" (anel respiratório calmo).
 */
export function StatusDot({
  status,
  size = 8,
  pulse,
}: {
  status: StatusKind | string
  size?: number
  pulse?: boolean
}) {
  const isPulse = pulse ?? (status === 'running' || status === 'queued')
  return (
    <span
      className="cc-status-dot"
      data-status={status}
      data-pulse={isPulse ? 'true' : 'false'}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}
