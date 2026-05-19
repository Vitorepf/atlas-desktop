import type { Connection } from '@atlas/domain'
import type { VisualLens } from '../state/visualLens'
import { findAtomElement, rectOf } from './trailDom'
import { isTrailVisible } from './trailVisibility'
import {
  hashDelay,
  isDrawableTrailKind,
  pathDomId,
  resolveRailSide,
  resolveSmartRoutes,
  sortTrailsForPaintOrder,
} from './trailRouting'
import type { ResolvedPath, RouteDraft, TrailRect } from './trailTypes'
export type { ResolvedPath } from './trailTypes'

export function computeTrailPaths({
  worldElement,
  connections,
  isolatedId,
  highlightedId,
  visualLens,
}: {
  worldElement: HTMLDivElement
  connections: Connection[]
  isolatedId: string | null
  highlightedId: string | null
  visualLens: VisualLens
}): ResolvedPath[] {
  const sequencePaths: ResolvedPath[] = []
  const routeDrafts: RouteDraft[] = []

  for (const connection of connections) {
    if (!isDrawableTrailKind(connection.kind)) continue
    const fromElement = findAtomElement(worldElement, `atom-${connection.from}`)
    const toElement = findAtomElement(worldElement, `atom-${connection.to}`)
    if (!fromElement || !toElement) continue

    const from = rectOf(fromElement)
    const to = rectOf(toElement)
    const activeId = isolatedId ?? highlightedId
    const active = activeId != null && (connection.from === activeId || connection.to === activeId)
    const visible = isTrailVisible(connection, active, visualLens)
    if (!visible) continue

    if (connection.kind === 'sequence') {
      sequencePaths.push(sequencePath(connection, from, to, active, visible))
    } else {
      routeDrafts.push(routeDraft(connection, from, to, active, visible))
    }
  }

  return [...sequencePaths, ...resolveSmartRoutes(routeDrafts)].sort(sortTrailsForPaintOrder)
}

function routeDraft(
  connection: Connection,
  from: TrailRect,
  to: TrailRect,
  active: boolean,
  visible: boolean
): RouteDraft {
  const side = resolveRailSide(from, to)
  return {
    connection,
    from,
    to,
    active,
    visible,
    side,
    minY: Math.min(from.cy, to.cy),
    maxY: Math.max(from.cy, to.cy),
  }
}

function sequencePath(
  connection: Connection,
  from: TrailRect,
  to: TrailRect,
  active: boolean,
  visible: boolean
): ResolvedPath {
  const key = `${connection.from}->${connection.to}-${connection.kind}`
  return {
    key,
    pathId: pathDomId(key),
    d: `M ${from.cx} ${from.b} L ${to.cx} ${to.t}`,
    kind: connection.kind,
    side: 'center',
    order: 0,
    span: 'forward',
    start: { x: from.cx, y: from.b },
    end: { x: to.cx, y: to.t },
    gate: { x: (from.cx + to.cx) / 2, y: (from.b + to.t) / 2 },
    duration: 2.4,
    delay: hashDelay(connection.from, connection.to),
    packets: active ? 2 : 1,
    beacons: [],
    active,
    visible,
    fromId: connection.from,
    toId: connection.to,
  }
}
