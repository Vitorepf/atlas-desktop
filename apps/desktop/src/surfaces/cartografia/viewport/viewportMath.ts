import type { StageSize, ViewTransform } from './viewportTypes'

export function clampScale(scale: number, minScale: number, maxScale: number): number {
  return Math.max(minScale, Math.min(maxScale, scale))
}

export function zoomAroundPoint({
  current,
  factor,
  focalX,
  focalY,
  minScale,
  maxScale,
}: {
  current: ViewTransform
  factor: number
  focalX: number
  focalY: number
  minScale: number
  maxScale: number
}): ViewTransform {
  const newScale = clampScale(current.scale * factor, minScale, maxScale)
  const ratio = newScale / current.scale
  return {
    scale: newScale,
    x: focalX - (focalX - current.x) * ratio,
    y: focalY - (focalY - current.y) * ratio,
  }
}

export function fitWorld({
  viewport,
  world,
  minScale,
  maxScale,
}: {
  viewport: HTMLElement
  world: StageSize
  minScale: number
  maxScale: number
}): ViewTransform {
  const width = viewport.clientWidth - 60
  const height = viewport.clientHeight - 60
  const scale = clampScale(Math.min(width / world.width, height / world.height), minScale, maxScale)
  return {
    scale,
    x: (viewport.clientWidth - world.width * scale) / 2,
    y: (viewport.clientHeight - world.height * scale) / 2,
  }
}

export function fitStage({
  viewport,
  stage,
  minScale,
  maxScale,
}: {
  viewport: HTMLElement
  stage: StageSize
  minScale: number
  maxScale: number
}): ViewTransform {
  const width = viewport.clientWidth - 60
  const height = viewport.clientHeight - 60
  const scale = clampScale(Math.min(width / stage.width, height / stage.height, 1.05), minScale, maxScale)
  return {
    scale,
    x: viewport.clientWidth / 2 - (stage.width / 2) * scale,
    y: viewport.clientHeight / 2 - (stage.height / 2) * scale,
  }
}
