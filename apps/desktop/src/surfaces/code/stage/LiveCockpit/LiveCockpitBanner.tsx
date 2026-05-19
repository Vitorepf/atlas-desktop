import { useEffect, useState, type CSSProperties } from 'react'
import {
  CHECKPOINT_LABELS,
  CHECKPOINT_ORDER,
  useExecutionStore,
} from '../../../../state/executionStore'
import { LiveCockpitRow } from './LiveCockpitRow'

/**
 * LiveCockpitBanner · editorial banner above the conversation thread.
 *
 * Reads from `useExecutionStore` and renders 6 checkpoint rows
 * (Intent · Context · Plan · Provider · Verify · Evidence) in real time.
 *
 * Disappears completely when there is no active trace. After the trace
 * reaches terminal state (`terminal=true`), the banner stays visible for
 * 5 seconds (so the operator can read the final state) and then unmounts.
 *
 * CANON · no fabricated state. Every row reflects what the backend has
 * actually emitted. Missing emissions show as `idle` (`○`).
 */
export function LiveCockpitBanner() {
  const activeTraceId = useExecutionStore((s) => s.activeTraceId)
  const checkpoints = useExecutionStore((s) => s.checkpoints)
  const thinkingText = useExecutionStore((s) => s.thinkingText)
  const providerTokens = useExecutionStore((s) => s.providerTokens)
  const providerModel = useExecutionStore((s) => s.providerModel)
  const totalCostUsd = useExecutionStore((s) => s.totalCostUsd)
  const reconnecting = useExecutionStore((s) => s.reconnecting)
  const terminal = useExecutionStore((s) => s.terminal)
  const clearTrace = useExecutionStore((s) => s.clearTrace)

  const [collapsing, setCollapsing] = useState(false)

  // Tick to keep running durations live without subscribing to every event.
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!activeTraceId || terminal) return
    const handle = setInterval(() => forceTick((n) => n + 1), 500)
    return () => clearInterval(handle)
  }, [activeTraceId, terminal])

  useEffect(() => {
    if (!terminal) {
      queueMicrotask(() => setCollapsing(false))
      return
    }
    const slide = setTimeout(() => setCollapsing(true), 5000)
    const cleanup = setTimeout(() => clearTrace(), 5400)
    return () => {
      clearTimeout(slide)
      clearTimeout(cleanup)
    }
  }, [terminal, clearTrace])

  if (!activeTraceId) return null

  const bannerStyle: CSSProperties = {
    margin: '0 0 12px',
    padding: '10px 14px',
    background: 'var(--cream)',
    border: '1px solid var(--bronze-soft)',
    borderRadius: 2,
    animation: collapsing ? 'cockpit-slide-up 320ms var(--ease-i, ease-in-out) forwards' : undefined,
    opacity: collapsing ? 0 : 1,
    transition: collapsing ? undefined : 'opacity 180ms ease-out',
  }

  const providerCp = checkpoints.provider

  const providerFallback = (() => {
    if (providerCp.status === 'idle') return null
    const parts: string[] = []
    if (providerModel) parts.push(providerModel)
    if (providerTokens > 0) parts.push(`${providerTokens} tokens`)
    if (totalCostUsd != null) parts.push(`$${totalCostUsd.toFixed(3)}`)
    return parts.length > 0 ? parts.join(' · ') : null
  })()

  const fallbacks: Record<string, string | null> = {
    provider: providerFallback,
  }

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Atlas Cockpit em tempo real"
      style={bannerStyle}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
          paddingBottom: 4,
          borderBottom: '1px solid var(--hair-soft)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 9,
            letterSpacing: 0,
            color: 'var(--bronze)',
            textTransform: 'none',
          }}
        >
          Live · pipeline
        </span>
        <span
          style={{
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 9,
            letterSpacing: 0,
            color: reconnecting ? 'var(--rec-red)' : 'var(--ink3)',
            textTransform: 'none',
          }}
        >
          {reconnecting
            ? 'reconectando…'
            : terminal
              ? 'concluído'
              : 'transmitindo'}
        </span>
      </header>

      <div role="list" style={{ display: 'grid', gap: 0 }}>
        {CHECKPOINT_ORDER.map((id) => (
          <LiveCockpitRow
            key={id}
            id={id}
            label={CHECKPOINT_LABELS[id]}
            state={checkpoints[id]}
            fallbackDetail={fallbacks[id] ?? null}
          />
        ))}
      </div>

      {thinkingText ? (
        <div
          aria-hidden="true"
          style={{
            marginTop: 6,
            paddingTop: 6,
            paddingLeft: 24,
            borderTop: '1px solid var(--hair-soft)',
            fontFamily: 'var(--cc-font-sans)',
            fontStyle: 'normal',
            fontSize: 12.5,
            color: 'var(--ink2)',
            lineHeight: 1.4,
            animation: 'cockpit-thinking-fade 120ms ease-out',
            maxHeight: '3.6em',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
            textOverflow: 'ellipsis',
          }}
        >
          <span style={{ color: 'var(--bronze)', fontStyle: 'normal', fontFamily: 'var(--cc-font-mono)', fontSize: 9, letterSpacing: 0, textTransform: 'none', marginRight: 6 }}>
            pensando
          </span>
          {thinkingText}
        </div>
      ) : null}
    </section>
  )
}
