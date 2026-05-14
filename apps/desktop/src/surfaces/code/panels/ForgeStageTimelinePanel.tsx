import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { EmptyText } from './RightRailPrimitives'

interface ForgeStageTimelinePanelProps {
  liveExecution: WorkStateSnapshot['forgeLiveExecution']
}

export function ForgeStageTimelinePanel({ liveExecution }: ForgeStageTimelinePanelProps) {
  const timeline = liveExecution?.stageTimeline

  if (!timeline) {
    return (
      <div className="ops-section">
        <PanelTitle label="Forge Stage Timeline" meta="sem artefato" />
        <EmptyText>aguardando stage timeline real</EmptyText>
      </div>
    )
  }

  const meta = `${timeline.passed}/${timeline.total} passed | ${timeline.blocking} blocking`

  return (
    <div className="ops-section">
      <PanelTitle label="Forge Stage Timeline" meta={meta} />
      <div
        style={{
          display: 'grid',
          gap: 5,
          padding: '8px 10px',
          background: 'var(--cream)',
          border: '1px solid var(--bronze-soft)',
          borderRadius: 2,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 4,
          }}
        >
          <Metric label="blocked" value={timeline.blocked} tone={timeline.blocked > 0 ? 'bad' : 'quiet'} />
          <Metric label="degraded" value={timeline.degraded} tone={timeline.degraded > 0 ? 'warn' : 'quiet'} />
          <Metric label="skipped" value={timeline.skipped} tone="quiet" />
          <Metric label="blocking" value={timeline.blocking} tone={timeline.blocking > 0 ? 'bad' : 'ok'} />
        </div>

        <div style={{ display: 'grid', gap: 4, maxHeight: 260, overflow: 'auto' }}>
          {timeline.entries.map((entry) => {
            const tone = stageTone(entry.status, entry.blocking)
            return (
              <div
                key={`${entry.index}-${entry.name}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '26px 58px 1fr auto',
                  gap: 7,
                  alignItems: 'baseline',
                  padding: '5px 7px',
                  background: tone.bg,
                  border: `1px solid ${tone.border}`,
                  borderRadius: 2,
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bronze)' }}>
                  {entry.index.toString().padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 8,
                    letterSpacing: '1px',
                    color: 'var(--ink3)',
                    textTransform: 'uppercase',
                  }}
                >
                  {entry.phase}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink)', wordBreak: 'break-word' }}>
                  {entry.name}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 8,
                    letterSpacing: '1px',
                    color: tone.color,
                    textTransform: 'uppercase',
                    textAlign: 'right',
                  }}
                >
                  {entry.status}
                </span>
                <span style={{ gridColumn: '3 / -1', fontSize: 10, color: 'var(--ink3)', lineHeight: 1.35 }}>
                  {entry.summary}
                  {entry.blocker ? (
                    <span style={{ color: 'var(--rec-red, #8a3025)', fontFamily: 'var(--mono)' }}>
                      {' '}
                      blocker={entry.blocker}
                    </span>
                  ) : null}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'ok' | 'bad' | 'warn' | 'quiet'
}) {
  const color = tone === 'ok' ? 'var(--moss)' : tone === 'bad' ? 'var(--rec-red, #8a3025)' : tone === 'warn' ? 'var(--bronze)' : 'var(--ink3)'
  return (
    <div
      style={{
        display: 'grid',
        gap: 2,
        padding: '5px 6px',
        background: 'var(--paper)',
        border: '1px solid var(--hair-soft)',
        borderRadius: 2,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 7.5,
          letterSpacing: '1px',
          color: 'var(--bronze)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color }}>{value}</span>
    </div>
  )
}

function stageTone(status: string, blocking: boolean) {
  if (blocking || status === 'blocked' || status === 'failed') {
    return {
      bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))',
      border: 'var(--rec-red, #8a3025)',
      color: 'var(--rec-red, #8a3025)',
    }
  }
  if (status === 'degraded') {
    return {
      bg: 'var(--bronze-veil)',
      border: 'var(--bronze-soft)',
      color: 'var(--bronze)',
    }
  }
  if (status.startsWith('skipped')) {
    return {
      bg: 'var(--paper)',
      border: 'var(--hair-soft)',
      color: 'var(--ink3)',
    }
  }
  return {
    bg: 'var(--moss-veil)',
    border: 'var(--moss-soft)',
    color: 'var(--moss)',
  }
}
