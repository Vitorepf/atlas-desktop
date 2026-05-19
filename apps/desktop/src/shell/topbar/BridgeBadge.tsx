import type { BridgeMode } from '../../lib/bridge'

interface BridgeBadgeProps {
  mode: BridgeMode
  loading: boolean
  errors: string[]
}

export function BridgeBadge({ mode, loading, errors }: BridgeBadgeProps) {
  const bridgeTitle =
    errors.length > 0 ? `Bridge errors:\n${errors.join('\n')}` : `bridge dispatch: ${mode}`

  return (
    <span
      className={`v bridge-mode bridge-mode-${mode}${errors.length > 0 ? ' bridge-mode-degraded' : ''}`}
      title={bridgeTitle}
    >
      bridge · {mode}
      {loading ? ' · loading' : ''}
      {errors.length > 0 ? ` · ${errors.length} offline` : ''}
    </span>
  )
}

