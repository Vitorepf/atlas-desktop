import type { TrailRect } from './trailTypes'

export function findAtomElement(worldElement: HTMLDivElement, id: string): HTMLElement | null {
  const element = worldElement.ownerDocument.getElementById(id)
  if (!(element instanceof HTMLElement)) return null
  return worldElement.contains(element) ? element : null
}

export function rectOf(element: HTMLElement): TrailRect {
  return {
    l: element.offsetLeft,
    r: element.offsetLeft + element.offsetWidth,
    t: element.offsetTop,
    b: element.offsetTop + element.offsetHeight,
    w: element.offsetWidth,
    h: element.offsetHeight,
    cx: element.offsetLeft + element.offsetWidth / 2,
    cy: element.offsetTop + element.offsetHeight / 2,
  }
}
