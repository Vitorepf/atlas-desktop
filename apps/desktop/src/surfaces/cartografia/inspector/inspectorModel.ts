import type { CartographyAtom } from '@atlas/domain'

export function inspectorTags(atom: CartographyAtom): string[] {
  if (atom.kind === 'pipeline') return ['engrenagem', 'atlas-ai-kernel', atom.graphId]
  return ['lateral', atom.regionId ?? '', atom.graphId].filter(Boolean)
}
