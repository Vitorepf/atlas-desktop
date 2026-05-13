/**
 * Trails · SVG paths drawn between atoms in the flow scene.
 *
 * The canvas renders movement as routed rails:
 * - sequence: the canonical vertical path through the Kernel.
 * - feed/feedback: orthogonal side rails, visible only when relevant, so they
 *   preserve document movement without scribbling over cards.
 *
 * Coords are computed by reading DOM rects of the rendered atoms (which carry
 * `id="atom-{graph_id}"`). This runs on every layout change via ResizeObserver
 * + MutationObserver.
 */
import { useEffect, useRef, useState } from 'react'
import type { Connection } from '@atlas/domain'
import { WORLD_HEIGHT, WORLD_WIDTH } from './layout'

type VisualLens = 'flow' | 'relations' | 'risk' | 'recent' | 'evidence'

interface TrailsProps {
  worldElement: HTMLDivElement | null
  connections: Connection[]
  isolatedId: string | null
  highlightedId: string | null
  visualLens: VisualLens
}

interface ResolvedPath {
  key: string
  pathId: string
  d: string
  kind: Connection['kind']
  side: 'left' | 'right' | 'center'
  order: number
  span: 'forward' | 'return' | 'inbound' | 'outbound'
  start: Point
  end: Point
  gate: Point
  duration: number
  delay: number
  packets: number
  beacons: number[]
  active: boolean
  visible: boolean
  fromId: string
  toId: string
}

interface RouteDraft {
  connection: Connection
  from: Rect
  to: Rect
  active: boolean
  visible: boolean
  side: 'left' | 'right'
  minY: number
  maxY: number
}

interface Point {
  x: number
  y: number
}

export function Trails({
  worldElement,
  connections,
  isolatedId,
  highlightedId,
  visualLens,
}: TrailsProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [paths, setPaths] = useState<ResolvedPath[]>([])

  useEffect(() => {
    if (!worldElement) return

    function recompute() {
      if (!worldElement) return
      const sequencePaths: ResolvedPath[] = []
      const routeDrafts: RouteDraft[] = []
      for (const c of connections) {
        if (!isDrawableTrailKind(c.kind)) continue
        const fromKey = `atom-${c.from}`
        const toKey = `atom-${c.to}`
        const fromEl = findAtomElement(worldElement, fromKey)
        const toEl = findAtomElement(worldElement, toKey)
        if (!fromEl || !toEl) continue
        const fr = rectOf(fromEl)
        const tr = rectOf(toEl)
        const activeId = isolatedId ?? highlightedId
        const involvesActive =
          activeId != null && (c.from === activeId || c.to === activeId)
        const visible =
          c.kind === 'sequence' ||
          involvesActive ||
          (visualLens === 'relations' && c.kind === 'feed') ||
          (visualLens === 'evidence' && c.kind === 'feedback')
        if (!visible) continue

        if (c.kind === 'sequence') {
          sequencePaths.push({
            key: `${c.from}->${c.to}-${c.kind}`,
            pathId: pathDomId(`${c.from}->${c.to}-${c.kind}`),
            d: `M ${fr.cx} ${fr.b} L ${tr.cx} ${tr.t}`,
            kind: c.kind,
            side: 'center',
            order: 0,
            span: 'forward',
            start: { x: fr.cx, y: fr.b },
            end: { x: tr.cx, y: tr.t },
            gate: { x: (fr.cx + tr.cx) / 2, y: (fr.b + tr.t) / 2 },
            duration: 2.4,
            delay: hashDelay(c.from, c.to),
            packets: involvesActive ? 2 : 1,
            beacons: [],
            active: involvesActive,
            visible,
            fromId: c.from,
            toId: c.to,
          })
        } else {
          const side = resolveRailSide(fr, tr)
          routeDrafts.push({
            connection: c,
            from: fr,
            to: tr,
            active: involvesActive,
            visible,
            side,
            minY: Math.min(fr.cy, tr.cy),
            maxY: Math.max(fr.cy, tr.cy),
          })
        }
      }
      const out = [...sequencePaths, ...resolveSmartRoutes(routeDrafts)]
      setPaths(out.sort(sortTrailsForPaintOrder))
    }

    recompute()

    const ro = new ResizeObserver(() => recompute())
    ro.observe(worldElement)
    const mo = new MutationObserver(() => recompute())
    mo.observe(worldElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [worldElement, connections, isolatedId, highlightedId, visualLens])

  return (
    <svg
      ref={svgRef}
      className="world-svg"
      viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
      preserveAspectRatio="none"
    >
      <defs>
        <marker
          id="trail-tip"
          viewBox="0 0 8 8"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="currentColor" />
        </marker>
        <marker
          id="trail-tip-return"
          viewBox="0 0 8 8"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="currentColor" />
        </marker>
      </defs>
      {paths.map((p) => (
        <g
          key={p.key}
          className={[
            'trail-group',
            `trail-${p.kind}`,
            `trail-side-${p.side}`,
            `trail-lane-${Math.min(p.order, 3)}`,
            `trail-span-${p.span}`,
            p.kind === 'feedback' ? 'dashed' : '',
            p.visible ? 'path-visible' : 'path-hidden',
            p.active ? 'path-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <path id={p.pathId} className="trail-motion-path" d={p.d} />
          <path className="trail-halo" d={p.d} />
          <path className="trail-current" d={p.d} pathLength={100} />
          <path
            className="trail trail-core"
            d={p.d}
            markerEnd={p.kind === 'feedback' ? 'url(#trail-tip-return)' : 'url(#trail-tip)'}
          />
          <path className="trail-pulse" d={p.d} />
          {p.kind !== 'sequence' ? (
            <>
              <circle className="trail-node-ripple trail-node-ripple-source" cx={p.start.x} cy={p.start.y} r="7" />
              <circle className="trail-node trail-node-source" cx={p.start.x} cy={p.start.y} r="4" />
              {p.active ? (
                <g className="trail-gate" transform={`translate(${p.gate.x} ${p.gate.y})`}>
                  <path className="trail-gate-shape" d={gateShape(p.span)} />
                  <circle className="trail-gate-core" r="2.2" />
                </g>
              ) : null}
              <circle className="trail-node-ripple trail-node-ripple-target" cx={p.end.x} cy={p.end.y} r="9" />
              <circle className="trail-node trail-node-target" cx={p.end.x} cy={p.end.y} r="5" />
            </>
          ) : null}
          {p.beacons.map((offset, beaconIndex) => (
            <g
              key={`${p.key}-beacon-${beaconIndex}`}
              className={[
                'trail-beacon',
                beaconIndex === 0 ? 'primary' : 'secondary',
              ].join(' ')}
            >
              <path className="trail-beacon-shape" d="M -5 -4 L 5 0 L -5 4 L -2 0 Z" />
              <animateMotion
                dur="1s"
                begin="0s"
                fill="freeze"
                keyPoints={`${offset};${offset}`}
                keyTimes="0;1"
                repeatCount="1"
                rotate="auto"
              >
                <mpath href={`#${p.pathId}`} />
              </animateMotion>
            </g>
          ))}
          {Array.from({ length: p.packets }).map((_, packetIndex) => (
            <g
              key={`${p.key}-packet-${packetIndex}`}
              className={[
                'trail-vessel',
                packetIndex === 0 ? 'primary' : 'secondary',
              ].join(' ')}
            >
              <path
                className="trail-vessel-wake"
                d={p.kind === 'sequence' ? 'M -8 0 H -2' : 'M -13 0 H -4'}
              />
              <path
                className="trail-vessel-shape"
                d={
                  p.kind === 'sequence'
                    ? 'M -3 -2.5 L 4 0 L -3 2.5 Z'
                    : 'M -6 -4 L 6 0 L -6 4 L -3 0 Z'
                }
              />
              <animateMotion
                dur={`${p.duration}s`}
                begin={`${p.delay + (packetIndex * p.duration) / p.packets}s`}
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href={`#${p.pathId}`} />
              </animateMotion>
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}

function findAtomElement(worldElement: HTMLDivElement, id: string): HTMLElement | null {
  const el = worldElement.ownerDocument.getElementById(id)
  if (!(el instanceof HTMLElement)) return null
  return worldElement.contains(el) ? el : null
}

function rectOf(el: HTMLElement) {
  return {
    l: el.offsetLeft,
    r: el.offsetLeft + el.offsetWidth,
    t: el.offsetTop,
    b: el.offsetTop + el.offsetHeight,
    w: el.offsetWidth,
    h: el.offsetHeight,
    cx: el.offsetLeft + el.offsetWidth / 2,
    cy: el.offsetTop + el.offsetHeight / 2,
  }
}

type Rect = ReturnType<typeof rectOf>

function isDrawableTrailKind(kind: Connection['kind']): boolean {
  return kind === 'sequence' || kind === 'feed' || kind === 'feedback'
}

function sortTrailsForPaintOrder(a: ResolvedPath, b: ResolvedPath): number {
  if (a.active !== b.active) return a.active ? 1 : -1
  return trailKindWeight(a.kind) - trailKindWeight(b.kind)
}

function trailKindWeight(kind: Connection['kind']): number {
  if (kind === 'sequence') return 0
  if (kind === 'feed') return 1
  if (kind === 'feedback') return 2
  return 3
}

function resolveSmartRoutes(drafts: RouteDraft[]): ResolvedPath[] {
  const lanes = assignOverlapLanes(drafts)
  return drafts.map((draft, index) => {
    const order = lanes.get(draft) ?? 0
    const span = resolveSpan(draft)
    const endpoints = routeEndpoints(draft)
    const d =
      draft.connection.kind === 'feedback'
        ? returnLoopPath(draft.from, draft.to, draft.side, order)
        : smartFlowPath(draft.from, draft.to, draft.side, order)
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

function assignOverlapLanes(drafts: RouteDraft[]): Map<RouteDraft, number> {
  const out = new Map<RouteDraft, number>()
  for (const side of ['left', 'right'] as const) {
    const openLaneEnd: number[] = []
    const sideDrafts = drafts
      .filter((draft) => draft.side === side)
      .sort((a, b) => a.minY - b.minY || b.maxY - a.maxY)

    for (const draft of sideDrafts) {
      let lane = openLaneEnd.findIndex((end) => draft.minY > end + 38)
      if (lane === -1) {
        lane = openLaneEnd.length
        openLaneEnd.push(draft.maxY)
      } else {
        openLaneEnd[lane] = draft.maxY
      }
      out.set(draft, lane)
    }
  }
  return out
}

function routeEndpoints(draft: RouteDraft): { start: Point; end: Point } {
  const { from, to, side, connection } = draft
  if (connection.kind === 'feedback') {
    const outward = side === 'left' ? -1 : 1
    return {
      start: {
        x: side === 'left' ? from.l + outward * 10 : from.r + outward * 10,
        y: from.cy,
      },
      end: {
        x: side === 'left' ? to.l : to.r,
        y: to.cy,
      },
    }
  }

  return {
    start: { x: side === 'left' ? from.r : from.l, y: from.cy },
    end: { x: side === 'left' ? to.l : to.r, y: to.cy },
  }
}

function gateShape(span: ResolvedPath['span']): string {
  if (span === 'return') return 'M -8 0 C -8 -6, 8 -6, 8 0 C 8 6, -8 6, -8 0 Z'
  if (span === 'outbound') return 'M -8 -5 H 2 L 8 0 L 2 5 H -8 Z'
  if (span === 'inbound') return 'M -8 0 L -2 -6 H 8 V 6 H -2 Z'
  return 'M -6 0 L 0 -6 L 6 0 L 0 6 Z'
}

function routeGatePoint(
  from: Rect,
  to: Rect,
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

function beaconOffsets(span: ResolvedPath['span']): number[] {
  if (span === 'return') return [0.34, 0.66]
  if (span === 'inbound') return [0.32, 0.68]
  if (span === 'outbound') return [0.34, 0.7]
  return [0.5]
}

function movementProfile(draft: RouteDraft, lane: number): { duration: number; delay: number; packets: number } {
  const distance = Math.hypot(draft.to.cx - draft.from.cx, draft.to.cy - draft.from.cy)
  const base = draft.connection.kind === 'feedback' ? 4.2 : 3.2
  const duration = round(base + Math.min(distance / 720, 1.1) + lane * 0.18)
  const packets = draft.active ? 3 : draft.connection.kind === 'feedback' ? 2 : 2
  return {
    duration,
    delay: hashDelay(draft.connection.from, draft.connection.to),
    packets,
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function hashDelay(from: string, to: string): number {
  const source = `${from}:${to}`
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 997
  }
  return round((hash % 120) / -100)
}

function pathDomId(key: string): string {
  return `trail-motion-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function resolveSpan(draft: RouteDraft): ResolvedPath['span'] {
  if (draft.connection.kind === 'feedback') return 'return'
  const fromPipeline = isPipelineRect(draft.from)
  const toPipeline = isPipelineRect(draft.to)
  if (!fromPipeline && toPipeline) return 'inbound'
  if (fromPipeline && !toPipeline) return 'outbound'
  return draft.to.cy >= draft.from.cy ? 'forward' : 'return'
}

function resolveRailSide(from: Rect, to: Rect): 'left' | 'right' {
  const fromPipeline = isPipelineRect(from)
  const toPipeline = isPipelineRect(to)
  if (toPipeline) return from.cx < to.cx ? 'left' : 'right'
  if (fromPipeline) return to.cx < from.cx ? 'left' : 'right'
  return from.cx < to.cx ? 'right' : 'left'
}

function isPipelineRect(rect: Rect): boolean {
  return rect.w >= 400
}

function smartFlowPath(from: Rect, to: Rect, side: 'left' | 'right', lane: number): string {
  const sx = side === 'left' ? from.r : from.l
  const ex = side === 'left' ? to.l : to.r
  const sy = from.cy
  const ey = to.cy
  const direction = side === 'left' ? 1 : -1
  const distance = Math.abs(ex - sx)
  const vertical = Math.abs(ey - sy)
  const laneLift = Math.min(lane, 4) * 24
  const curve = Math.max(120, Math.min(340, distance * 0.52 + vertical * 0.18))
  const c1x = sx + direction * (curve + laneLift)
  const c2x = ex - direction * (curve * 0.55 + laneLift)
  const yBend = Math.sign(ey - sy || 1) * Math.min(42, vertical * 0.18)

  return [
    `M ${sx} ${sy}`,
    `C ${c1x} ${sy + yBend}`,
    `${c2x} ${ey - yBend}`,
    `${ex} ${ey}`,
  ].join(' ')
}

function returnLoopPath(from: Rect, to: Rect, side: 'left' | 'right', lane: number): string {
  const sx = side === 'left' ? from.l - 10 : from.r + 10
  const ex = side === 'left' ? to.l : to.r
  const sy = from.cy
  const ey = to.cy
  const sideSign = side === 'left' ? -1 : 1
  const loopWidth = 126 + Math.min(lane, 3) * 30
  const railX =
    side === 'left'
      ? Math.min(from.l, to.l) - loopWidth
      : Math.max(from.r, to.r) + loopWidth
  const lobeX = railX + sideSign * 58
  const lobeTopY = sy - 54
  const lobeBottomY = sy + 54
  const entryControlX = ex + sideSign * 82

  return [
    `M ${sx} ${sy}`,
    `H ${railX}`,
    `C ${railX} ${lobeTopY}`,
    `${lobeX} ${lobeTopY}`,
    `${lobeX} ${sy}`,
    `C ${lobeX} ${lobeBottomY}`,
    `${railX} ${lobeBottomY}`,
    `${railX} ${sy}`,
    `V ${ey}`,
    `C ${railX} ${ey}`,
    `${entryControlX} ${ey}`,
    `${ex} ${ey}`,
  ].join(' ')
}
