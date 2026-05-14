import type { Point, TrailRect } from './trailTypes'

/**
 * smartFlowPath · trilha de "respiração lateral" geometry-aware.
 *
 * Fase 4 do Edit Mode (2026-05-14): refator pra detectar `direction` real
 * baseado em from.cx vs to.cx, NÃO em `side` canon. Quando o usuário move
 * uma lane pra posição não-canon (ex: Domain Plane à direita do pipeline),
 * o trail continua se comportando bem porque `direction` segue a geometria
 * de fato. `side` ainda é usado pra escolher EXIT/ENTRY edge (left vs right
 * do rect), mas não dita a direção do bezier.
 *
 *   from.r ──┐
 *            │              (the curve lives only in the middle channel
 *            └──── ... ───┐  between the two lane boundaries; never
 *                         │  diagonal across atoms)
 *                  to.l ──┘
 *
 * Geometric guarantee:
 *  · After leaving the source we always hug it horizontally for EXIT_RUN
 *    before any vertical motion. Symmetrically we approach the target with
 *    APPROACH_RUN of horizontal final run. This means siblings stacked
 *    above/below the source/target are never crossed at their inner edge.
 *  · The bend in the middle is either a single S-curve (when source and
 *    target are roughly aligned vertically) or a wide S with a horizontal
 *    rail at mid-y (when the vertical offset is larger than 200px and the
 *    horizontal channel is wide enough to host a parking rail).
 *  · Control points are clamped INSIDE the dead-channel between anchors so
 *    the bezier never bows outward into the source/target column.
 *  · `obstacles` opcional · lista de rects que o trail deve evitar
 *    atravessar. Quando um obstacle está no mid-channel, o rail Y é
 *    deslocado pra acima/abaixo dele (simple repulsion). Não é A* full;
 *    cobre 80% dos casos de Edit Mode.
 */

const EXIT_RUN = 40        // horizontal run hugging the source before curving
const APPROACH_RUN = 40    // horizontal run hugging the target before landing
const MIN_CHANNEL = 96     // minimum horizontal channel between source and target
const LANE_STAGGER = 14    // px to stagger parallel trails
const LONG_VERTICAL = 200  // px · above this we switch to a "parked S" topology
const OBSTACLE_PAD = 20    // px margem ao redor de obstacles pra evitar

export function smartFlowPath(
  from: TrailRect,
  to: TrailRect,
  side: 'left' | 'right',
  lane: number,
  endpoints?: { start: Point; end: Point },
  obstacles?: TrailRect[]
): string {
  // Endpoints come from `routeEndpoints` which already biases tall lane
  // exits toward the edge closest to the target. We fall back to the rect
  // centers when endpoints aren't supplied (older call sites).
  const sx = endpoints?.start.x ?? (side === 'left' ? from.r : from.l)
  const ex = endpoints?.end.x ?? (side === 'left' ? to.l : to.r)
  const sy = endpoints?.start.y ?? from.cy
  const ey = endpoints?.end.y ?? to.cy

  // GEOMETRY-AWARE direction · NÃO mais dependent on `side`. Detecta o
  // sentido REAL do bezier baseado nas coords de start e end. Isso permite
  // o trail funcionar bem mesmo quando lanes são reposicionadas via Edit
  // Mode (ex: HKS arrastada pra esquerda do pipeline).
  const direction = ex >= sx ? 1 : -1
  const stagger = Math.min(lane, 4) * LANE_STAGGER

  // Anchor points sit EXIT_RUN/APPROACH_RUN inside the channel — these are
  // the corners where horizontal runs meet the curve.
  const ax = sx + direction * (EXIT_RUN + stagger)
  const bx = ex - direction * (APPROACH_RUN + stagger)

  // Effective channel length is the distance the bezier has to cover. When
  // the channel collapses (source/target too close horizontally), enforce
  // MIN_CHANNEL pra ter espaço pro S-curve.
  const signedChannel = (bx - ax) * direction
  const channel = Math.max(Math.abs(signedChannel), MIN_CHANNEL)

  const verticalSpread = Math.abs(sy - ey)
  if (verticalSpread > LONG_VERTICAL && channel >= MIN_CHANNEL * 1.5) {
    return parkedFlowPath(sx, sy, ex, ey, ax, bx, direction, channel, obstacles)
  }

  // Standard S-curve. Control points are clamped to live INSIDE the channel
  // (between ax and bx) so the bezier never overshoots into source/target
  // column siblings. We split the channel 35/65 around the midpoint.
  const c1x = clampControl(ax, bx, ax + direction * Math.min(channel * 0.35, Math.abs(bx - ax) * 0.5))
  const c2x = clampControl(ax, bx, bx - direction * Math.min(channel * 0.35, Math.abs(bx - ax) * 0.5))

  // Obstacle avoidance · se um rect bloqueia a trajetória do bezier, ajusta
  // control points pra "puxar" o curve pra cima/baixo do obstacle.
  if (obstacles && obstacles.length > 0) {
    const blocker = findBlocker(obstacles, from, to, sy, ey, ax, bx, direction)
    if (blocker) {
      const avoidY = sy < ey ? blocker.t - OBSTACLE_PAD : blocker.b + OBSTACLE_PAD
      const c1y = avoidY
      const c2y = avoidY
      return [
        `M ${sx} ${sy}`,
        `L ${ax} ${sy}`,
        `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${bx} ${ey}`,
        `L ${ex} ${ey}`,
      ].join(' ')
    }
  }

  return [
    `M ${sx} ${sy}`,
    `L ${ax} ${sy}`,
    `C ${c1x} ${sy}, ${c2x} ${ey}, ${bx} ${ey}`,
    `L ${ex} ${ey}`,
  ].join(' ')
}

/**
 * Parked S · used when the vertical span between source and target is
 * larger than LONG_VERTICAL. Instead of one big diagonal S that bows into
 * siblings, we route through a horizontal "parking rail" at mid-y. The
 * trail leaves the source horizontally, drops/rises vertically inside the
 * channel, runs horizontally at mid-y, drops/rises again, then lands on
 * the target. This is two short S-curves joined by a horizontal segment.
 *
 * Fase 4 · obstacle avoidance · se obstacles list é fornecida, o railY é
 * deslocado pra evitar atravessar atom rects.
 */
function parkedFlowPath(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  ax: number,
  bx: number,
  direction: number,
  channel: number,
  obstacles?: TrailRect[]
): string {
  let midY = (sy + ey) / 2

  // Avoid obstacles · adjust midY if obstacle blocks the parked rail.
  if (obstacles && obstacles.length > 0) {
    const railXMin = Math.min(ax, bx)
    const railXMax = Math.max(ax, bx)
    for (const o of obstacles) {
      const horizontalOverlap = o.r >= railXMin && o.l <= railXMax
      const verticalHit = midY >= o.t - OBSTACLE_PAD && midY <= o.b + OBSTACLE_PAD
      if (horizontalOverlap && verticalHit) {
        // Push rail above or below the obstacle, whichever is closer
        const above = o.t - OBSTACLE_PAD
        const below = o.b + OBSTACLE_PAD
        midY = Math.abs(midY - above) < Math.abs(midY - below) ? above : below
      }
    }
  }

  // The parking rail sits inside the channel; we keep it slightly biased
  // toward the source so the visual weight follows the read order.
  const railStartX = ax + direction * (channel * 0.22)
  const railEndX = bx - direction * (channel * 0.22)
  // Control points for each half-S sit halfway between anchor and rail.
  const c1x = clampControl(ax, bx, (ax + railStartX) / 2)
  const c2x = clampControl(ax, bx, (railEndX + bx) / 2)

  return [
    `M ${sx} ${sy}`,
    `L ${ax} ${sy}`,
    `C ${c1x} ${sy}, ${railStartX} ${midY}, ${railStartX} ${midY}`,
    `L ${railEndX} ${midY}`,
    `C ${c2x} ${midY}, ${bx} ${ey}, ${bx} ${ey}`,
    `L ${ex} ${ey}`,
  ].join(' ')
}

/**
 * Find first obstacle (atom rect) that blocks the bezier's mid-channel
 * trajectory. Returns null if no blockers. Heurística simple: obstacle
 * blocks se seu rect overlaps com o channel horizontal entre ax e bx, E
 * com a faixa vertical entre sy e ey. Excludes the source and target
 * rects themselves.
 */
function findBlocker(
  obstacles: TrailRect[],
  from: TrailRect,
  to: TrailRect,
  sy: number,
  ey: number,
  ax: number,
  bx: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _direction: number
): TrailRect | null {
  const xMin = Math.min(ax, bx)
  const xMax = Math.max(ax, bx)
  const yMin = Math.min(sy, ey) - OBSTACLE_PAD
  const yMax = Math.max(sy, ey) + OBSTACLE_PAD
  for (const o of obstacles) {
    // Skip if this obstacle IS source or target
    if (o.l === from.l && o.t === from.t && o.w === from.w && o.h === from.h) continue
    if (o.l === to.l && o.t === to.t && o.w === to.w && o.h === to.h) continue
    const horizontalOverlap = o.r > xMin && o.l < xMax
    const verticalOverlap = o.b > yMin && o.t < yMax
    if (horizontalOverlap && verticalOverlap) return o
  }
  return null
}

/**
 * Clamp a control-point X to live strictly between two anchor X values.
 * The order of `a` and `b` doesn't matter; we just ensure the result is
 * inside [min(a,b), max(a,b)].
 */
function clampControl(a: number, b: number, value: number): number {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  if (value < lo) return lo
  if (value > hi) return hi
  return value
}

export function returnLoopPath(from: TrailRect, to: TrailRect, side: 'left' | 'right', lane: number): string {
  const sx = side === 'left' ? from.l - 10 : from.r + 10
  const ex = side === 'left' ? to.l : to.r
  const sy = from.cy
  const ey = to.cy
  const sideSign = side === 'left' ? -1 : 1
  // Wider loop so the lobe escapes the column instead of curving back into
  // siblings. The base width scales with the lane order so parallel
  // feedback trails don't overlap.
  const loopWidth = 168 + Math.min(lane, 3) * 32
  const railX = side === 'left' ? Math.min(from.l, to.l) - loopWidth : Math.max(from.r, to.r) + loopWidth
  const lobeX = railX + sideSign * 64
  const lobeTopY = sy - 58
  const lobeBottomY = sy + 58
  const entryControlX = ex + sideSign * 92

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
