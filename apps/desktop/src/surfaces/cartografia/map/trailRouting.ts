import type { Connection } from '@atlas/domain'
import type { ResolvedPath, RouteDraft, TrailRect } from './trailTypes'
import { assignOverlapLanes } from './trailLanes'
import { movementProfile, pathDomId } from './trailMotion'
import { returnLoopPath, smartFlowPath } from './trailPathBuilders'
import {
  beaconOffsets,
  isPipelineRect,
  resolveSpan,
  routeEndpoints,
  routeGatePoint,
  trailKindWeight,
} from './trailRouteModel'

export function resolveSmartRoutes(drafts: RouteDraft[]): ResolvedPath[] {
  const lanes = assignOverlapLanes(drafts)
  return drafts.map((draft, index) => {
    const order = lanes.get(draft) ?? 0
    const span = resolveSpan(draft)
    const endpoints = routeEndpoints(draft)
    const d =
      draft.connection.kind === 'feedback'
        ? returnLoopPath(draft.from, draft.to, draft.side, order)
        : smartFlowPath(draft.from, draft.to, draft.side, order, endpoints)
    const profile = movementProfile(draft, order)
    const key = `${draft.connection.from}->${draft.connection.to}-${draft.connection.kind}-${index}`
    return {
      key,
      pathId: pathDomId(key),
      d,
      kind: draft.connection.kind,
      side: draft.side,
      order,
      span,
      start: endpoints.start,
      end: endpoints.end,
      gate: routeGatePoint(draft.from, draft.to, draft.side, span, order),
      duration: profile.duration,
      delay: profile.delay,
      packets: profile.packets,
      beacons: draft.active ? beaconOffsets(span) : [],
      active: draft.active,
      visible: draft.visible,
      fromId: draft.connection.from,
      toId: draft.connection.to,
    }
  })
}

export function resolveRailSide(from: TrailRect, to: TrailRect): 'left' | 'right' {
  const fromPipeline = isPipelineRect(from)
  const toPipeline = isPipelineRect(to)
  if (toPipeline) return from.cx < to.cx ? 'left' : 'right'
  if (fromPipeline) return to.cx < from.cx ? 'left' : 'right'
  return from.cx < to.cx ? 'right' : 'left'
}

export { hashDelay, pathDomId } from './trailMotion'

export function isDrawableTrailKind(kind: Connection['kind']): boolean {
  return kind === 'sequence' || kind === 'feed' || kind === 'feedback' || kind === 'governance'
}

export function sortTrailsForPaintOrder(a: ResolvedPath, b: ResolvedPath): number {
  if (a.active !== b.active) return a.active ? 1 : -1
  return trailKindWeight(a.kind) - trailKindWeight(b.kind)
}
