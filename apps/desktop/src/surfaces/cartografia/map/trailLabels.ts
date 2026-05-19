/**
 * Trail labels · canonical Mono caps tags rendered at the midpoint of each
 * pipeline-relevant trail. Render only when the trail is active (peça em
 * isolate/foco), keeping the map clean in the default Mapa mode.
 *
 * Labels are explicit only for the canon pipeline edges and the lane-feeds
 * documented in `atlas-server/public/atlas-vault-cockpit-mockup.html`.
 * Other connections (3000+ semantic relations) render label-less.
 */

/**
 * Canon edge labels — verbatim from the mockup HTML.
 * Format: `${from}→${to}` (kind in fallback when needed).
 */
const CANON_EDGE_LABELS: Record<string, string> = {
  // lateral → pipeline feeds
  'domain-plane→domain-profile-flow': 'ALIMENTA',
  'business-context-side→business-context': 'CONTEXTO',
  'capabilities→runtime-executor': 'CAPABILITY',
  'hks→context-builder': 'MANAGED SYNC',
  'doc-os→context-builder': 'GUIA',

  // pipeline → lateral outflows
  'evidence-ledger→evidence-loop': 'EVENTOS',
  'learning-proposals→evidence-loop': 'PROPOSTAS',

  // evidence feedback (the long dashed loop)
  'evidence-loop→atlas-decide': 'EVIDÊNCIA',
}

/**
 * Returns the canon label for a connection, or null if it shouldn't carry one.
 * `null` → silent edge in the cartography (no Mono caps tag).
 */
export function trailLabelFor(fromId: string, toId: string, kind: string): string | null {
  const explicit = CANON_EDGE_LABELS[`${fromId}→${toId}`]
  if (explicit) return explicit

  // Pipeline sequence edges (i → i+1) get "alimenta" implicitly only when
  // their two ends are both pipeline steps — we infer that by the kind.
  if (kind === 'sequence') return 'ALIMENTA'
  return null
}
