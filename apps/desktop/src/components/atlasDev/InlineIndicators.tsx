/**
 * Atlas Dev · inline indicators (verification, repair, cost, fallback).
 *
 * Single-row chips meant to be rendered above panels. Never re-renders the
 * SSE keepalive — those are silently dropped by the hook.
 */
import type {
  AtlasDevCostSummary,
  AtlasDevReceipt,
  AtlasDevRunStatus,
  VerificationStatus,
} from './types'
import styles from './atlasDev.module.css'

interface InlineIndicatorsProps {
  status: AtlasDevRunStatus
  receipt: AtlasDevReceipt | null
  repairAttempts: number
  usingRestFallback: boolean
}

function verificationTone(state: VerificationStatus | null | undefined): 'positive' | 'warning' | 'danger' | 'neutral' {
  switch (state) {
    case 'passed':
      return 'positive'
    case 'needs_review':
      return 'warning'
    case 'failed':
      return 'danger'
    default:
      return 'neutral'
  }
}

function formatCost(cost: AtlasDevCostSummary | null | undefined): string | null {
  if (!cost) return null
  const parts: string[] = []
  if (typeof cost.estimated_cost_usd === 'number') {
    parts.push(`$${cost.estimated_cost_usd.toFixed(3)}`)
  }
  if (typeof cost.tokens_in === 'number' || typeof cost.tokens_out === 'number') {
    const tin = cost.tokens_in ?? 0
    const tout = cost.tokens_out ?? 0
    parts.push(`${tin + tout} tokens`)
  }
  if (typeof cost.wall_time_ms === 'number') {
    parts.push(`${Math.round(cost.wall_time_ms / 100) / 10}s`)
  }
  return parts.length === 0 ? null : parts.join(' · ')
}

export function InlineIndicators({
  status,
  receipt,
  repairAttempts,
  usingRestFallback,
}: InlineIndicatorsProps) {
  const verification = receipt?.verification_status ?? null
  const tone = verificationTone(verification)
  const cost = formatCost(receipt?.cost)

  return (
    <div className={styles.indicatorRow} aria-label="Atlas Dev run indicators">
      <span className={styles.indicator}>
        Run · <strong>{status}</strong>
      </span>
      {verification ? (
        <span className={styles.indicator} data-tone={tone}>
          Verificação · <strong>{verification}</strong>
        </span>
      ) : null}
      {repairAttempts > 0 ? (
        <span className={styles.indicator} data-tone="warning">
          Repair · <strong>{repairAttempts}</strong> tentativa{repairAttempts === 1 ? '' : 's'}
        </span>
      ) : null}
      {cost ? (
        <span className={styles.indicator}>
          Custo · <strong>{cost}</strong>
        </span>
      ) : null}
      {usingRestFallback ? <span className={styles.fallbackTag}>fallback REST</span> : null}
    </div>
  )
}
