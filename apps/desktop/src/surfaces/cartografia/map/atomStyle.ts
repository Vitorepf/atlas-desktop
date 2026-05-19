import type { CSSProperties } from 'react'

export interface AtomPosition {
  x: number
  y: number
  w: number
}

export function atomPositionStyle(position?: AtomPosition): CSSProperties {
  if (!position) return {}
  return {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.w,
  }
}
