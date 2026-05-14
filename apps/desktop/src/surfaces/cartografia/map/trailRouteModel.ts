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

  // For tall lane containers (>200px) connecting to a step well above or
  // below the lane center, exit from the closest edge instead of the middle.
  // Visual result: the trail leaves the lane right beside the target's y
  // instead of slicing diagonally through neighbouring atoms.
  const sourceY = pickLaneAnchorY(from, to)
  return {
    start: { x: side === 'left' ? from.r : from.l, y: sourceY },
    end: { x: side === 'left' ? to.l : to.r, y: to.cy },
  }
}

function pickLaneAnchorY(from: TrailRect, to: TrailRect): number {
  // Center anchor for short atoms or when target is roughly aligned vertically.
  if (from.h < 200) {
    // Short source rect (regular atom). If the target sits clearly OUTSIDE
    // the source's vertical band, exit from the edge facing the target so
    // the smartFlowPath bend doesn't have to slice across siblings stacked
    // beside the source.
    if (to.cy < from.t) return from.t + Math.min(8, from.h / 2)
    if (to.cy > from.b) return from.b - Math.min(8, from.h / 2)
    return from.cy
  }
  const delta = Math.abs(from.cy - to.cy)
  if (delta < from.h * 0.35) return from.cy
  // Tall lane + large vertical offset → exit from the edge closest to target.
  // We bias 24px into the lane so the rail doesn't clip the lane border line.
  return to.cy < from.cy ? from.t + 24 : from.b - 24
}

export function routeGatePoint(
  from: TrailRect,
  to: TrailRect,
  side: 'left' | 'right',
  span: ResolvedPath['span'],
  lane: number
): Point {
  // Pass 5× · canon 86 + lane*18 → 430 + lane*90; offset y canon 42 → 210.
  const offset = 430 + Math.min(lane, 3) * 90
  if (span === 'return') {
    return {
      x: side === 'left' ? Math.min(from.l, to.l) - offset : Math.max(from.r, to.r) + offset,
      y: Math.min(from.cy, to.cy) - 210,
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
