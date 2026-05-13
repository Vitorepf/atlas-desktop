export interface ViewTransform {
  scale: number
  x: number
  y: number
}

export interface ViewportConfig {
  worldWidth: number
  worldHeight: number
  minScale?: number
  maxScale?: number
  initialScale?: number
}

export interface StageSize {
  width: number
  height: number
}
