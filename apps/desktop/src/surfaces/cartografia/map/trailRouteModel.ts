import type { Connection } from '@atlas/domain'
import type { Point, ResolvedPath, RouteDraft, TrailRect } from './trailTypes'

export function routeEndpoints(draft: RouteDraft): { start: Point; end: Point } {
  const { from, to, side, connection } = draft
  if (connection.kind === 'feedback') {
    const outward = side === 'left' ? -1 : 1
    return {
      start: { x: side === 'left' ? from.l + outward * 10 : from.r + outward * 10, y: from.cy },
      end: { x: side === 'left' ? to.l : to.r, y: to.cy },
    }
  }

  return {
    start: { x: side === 'left' ? from.r : from.l, y: from.cy },
    end: { x: side === 'left' ? to.l : to.r, y: to.cy },
  }
}

export function routeGatePoint(
  from: TrailRect,
  to: TrailRect,
  side: 'left' | 'right',
  span: ResolvedPath['span'],
  lane: number
): Point {
  const offset = 86 + Math.min(lane, 3) * 18
  if (span === 'return') {
    return {
      x: side === 'left' ? Math.min(from.l, to.l) - offset : Math.max(from.r, to.r) + offset,
      y: Math.min(from.cy, to.cy) - 42,
    }
  }
  return {
    x: (from.cx + to.cx) / 2 + (side === 'left' ? offset : -offset) * 0.28,
    y: (from.cy + to.cy) / 2,
  }
}

export function beaconOffsets(span: ResolvedPath['span']): number[] {
  if (span === 'return') return [0.34, 0.66]
  if (span === 'inbound') return [0.32, 0.68]
  if (span === 'outbound') return [0.34, 0.7]
  return [0.5]
}

export function trailKindWeight(kind: Connection['kind']): number {
  if (kind === 'sequence') return 0
  if (kind === 'feed') return 1
  if (kind === 'feedback') return 2
  return 3
}

export function resolveSpan(draft: RouteDraft): ResolvedPath['span'] {
  if (draft.connection.kind === 'feedback') return 'return'
  const fromPipeline = isPipelineRect(draft.from)
  const toPipeline = isPipelineRect(draft.to)
  if (!fromPipeline && toPipeline) return 'inbound'
  if (fromPipeline && !toPipeline) return 'outbound'
  return draft.to.cy >= draft.from.cy ? 'forward' : 'return'
}

export function isPipelineRect(rect: TrailRect): boolean {
  return rect.w >= 400
}
