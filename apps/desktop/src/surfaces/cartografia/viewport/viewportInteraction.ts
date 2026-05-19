export const NO_PAN_SELECTOR = [
  '.no-pan',
  '.atom',
  '.satellite',
  '.focus-action',
  '.floater',
  '.canvas-controls',
  '.breadcrumb',
  '.back-to-map',
].join(', ')

export function shouldStartViewportPan(target: EventTarget | null): boolean {
  return !(target instanceof HTMLElement && target.closest(NO_PAN_SELECTOR))
}

export function wheelZoomFactor(deltaY: number): number {
  return deltaY > 0 ? 0.92 : 1.08
}
