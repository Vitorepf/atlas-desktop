import type { Connection } from '@atlas/domain'

export interface Point {
  x: number
  y: number
}

export interface TrailRect {
  l: number
  r: number
  t: number
  b: number
  w: number
  h: number
  cx: number
  cy: number
}

export interface ResolvedPath {
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

export interface RouteDraft {
  connection: Connection
  from: TrailRect
  to: TrailRect
  active: boolean
  visible: boolean
  side: 'left' | 'right'
  minY: number
  maxY: number
}
