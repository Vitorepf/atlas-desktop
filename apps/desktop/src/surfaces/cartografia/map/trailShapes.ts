import type { ResolvedPath } from './trailTypes'

export function gateShape(span: ResolvedPath['span']): string {
  if (span === 'return') return 'M -8 0 C -8 -6, 8 -6, 8 0 C 8 6, -8 6, -8 0 Z'
  if (span === 'outbound') return 'M -8 -5 H 2 L 8 0 L 2 5 H -8 Z'
  if (span === 'inbound') return 'M -8 0 L -2 -6 H 8 V 6 H -2 Z'
  return 'M -6 0 L 0 -6 L 6 0 L 0 6 Z'
}
