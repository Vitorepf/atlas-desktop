import type { TrailRect } from './trailTypes'

export function smartFlowPath(from: TrailRect, to: TrailRect, side: 'left' | 'right', lane: number): string {
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

  return [`M ${sx} ${sy}`, `C ${c1x} ${sy + yBend}`, `${c2x} ${ey - yBend}`, `${ex} ${ey}`].join(' ')
}

export function returnLoopPath(from: TrailRect, to: TrailRect, side: 'left' | 'right', lane: number): string {
  const sx = side === 'left' ? from.l - 10 : from.r + 10
  const ex = side === 'left' ? to.l : to.r
  const sy = from.cy
  const ey = to.cy
  const sideSign = side === 'left' ? -1 : 1
  const loopWidth = 126 + Math.min(lane, 3) * 30
  const railX = side === 'left' ? Math.min(from.l, to.l) - loopWidth : Math.max(from.r, to.r) + loopWidth
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
