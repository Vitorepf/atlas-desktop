import type { CSSProperties } from 'react'
import type {
  CheckpointId,
  CheckpointState,
  CheckpointStatus,
} from '../../../../state/executionStore'

interface ToneSpec {
  glyph: string
  color: string
  weight: number
  animation?: string
  italic?: boolean
}

const TONES: Record<CheckpointStatus, ToneSpec> = {
  idle: {
    glyph: '○',
    color: 'var(--ink4)',
    weight: 400,
    italic: true,
  },
  running: {
    glyph: '⏳',
    color: 'var(--ink)',
    weight: 500,
    animation: 'live-pulse 1.4s ease-in-out infinite',
  },
  done: {
    glyph: '✓',
    color: 'var(--bronze)',
    weight: 400,
  },
  failed: {
    glyph: '✗',
    color: 'var(--rec-red)',
    weight: 500,
  },
}

const DETAIL_TONE: Record<CheckpointStatus, string> = {
  idle: 'var(--ink4)',
  running: 'var(--ink)',
  done: 'var(--ink3)',
  failed: 'var(--rec-red)',
}

interface LiveCockpitRowProps {
  id: CheckpointId
  label: string
  state: CheckpointState
  fallbackDetail?: string | null
  showDuration?: boolean
}

export function LiveCockpitRow({
  id,
  label,
  state,
  fallbackDetail = null,
  showDuration = true,
}: LiveCockpitRowProps) {
  const tone = TONES[state.status]
  const detail = state.detail ?? fallbackDetail
  const duration = formatDuration(state.durationMs, state.status, state.startedAt)

  const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '14px 96px 1fr auto',
    gap: 10,
    alignItems: 'baseline',
    padding: '4px 0',
  }

  const glyphStyle: CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: 11,
    color: tone.color,
    textAlign: 'center',
    animation: tone.animation,
  }

  const labelStyle: CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: 9,
    letterSpacing: '1.3px',
    color: 'var(--bronze)',
    textTransform: 'uppercase',
  }

  const detailStyle: CSSProperties = {
    fontFamily: 'var(--serif)',
    fontSize: 13,
    color: DETAIL_TONE[state.status],
    fontStyle: tone.italic ? 'italic' : 'normal',
    fontWeight: tone.weight,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  }

  const durationStyle: CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: 10,
    color: 'var(--ink3)',
    fontVariantNumeric: 'tabular-nums',
  }

  const aria =
    state.status === 'done' && state.durationMs != null
      ? `${label} completo em ${state.durationMs} milissegundos`
      : state.status === 'failed'
        ? `${label} falhou`
        : state.status === 'running'
          ? `${label} em andamento`
          : `${label} aguardando`

  return (
    <div role="listitem" aria-label={aria} data-checkpoint={id} style={rowStyle}>
      <span aria-hidden="true" style={glyphStyle}>
        {tone.glyph}
      </span>
      <span style={labelStyle}>{label}</span>
      <span style={detailStyle}>{detail ?? '—'}</span>
      {showDuration ? <span style={durationStyle}>{duration}</span> : <span />}
    </div>
  )
}

function formatDuration(
  durationMs: number | null,
  status: CheckpointStatus,
  startedAt: number | null,
): string {
  if (status === 'running' && startedAt != null) {
    const elapsed = Date.now() - startedAt
    return elapsed < 1000 ? `${elapsed}ms` : `${Math.round(elapsed / 100) / 10}s`
  }
  if (durationMs == null) return ''
  if (durationMs < 1000) return `${durationMs}ms`
  return `${Math.round(durationMs / 100) / 10}s`
}
