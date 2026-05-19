import type { Connection } from '@atlas/domain'
import type { VisualLens } from '../state/visualLens'

/**
 * Canon kinds are the 4 visual edge types declared by CartographyCanon
 * (pipeline sequence + 8 lateral feeds + 1 evidence feedback + N governance
 * arrows). Anything else (depends_on/flows_to/unlocks/governs) comes from
 * the semantic_graph relations — 3000+ of them — and would turn the canvas
 * into noise if rendered in baseline Mapa mode.
 */
const CANON_KINDS: ReadonlySet<string> = new Set(['sequence', 'feed', 'feedback', 'governance'])

export function isTrailVisible(connection: Connection, active: boolean, visualLens: VisualLens): boolean {
  if (active) return true
  if (CANON_KINDS.has(connection.kind)) return true
  // Semantic relations surface only under the Relations lens.
  if (visualLens === 'relations') return true
  return false
}

export function isCanonTrail(connection: Connection): boolean {
  return CANON_KINDS.has(connection.kind)
}
