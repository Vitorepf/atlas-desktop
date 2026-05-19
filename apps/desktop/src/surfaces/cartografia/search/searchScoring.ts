import type { CartographyAtom } from '@atlas/domain'

export function atomMatchesQuery(atom: CartographyAtom, query: string): boolean {
  return searchableText(atom).includes(query)
}

export function scoreAtomForQuery(atom: CartographyAtom, query: string): number {
  const name = atom.name.toLowerCase()
  const id = atom.graphId.toLowerCase()
  let score = 0
  if (id === query || name === query) score += 100
  if (id.includes(query)) score += 40
  if (name.includes(query)) score += 35
  if ((atom.sourcePath || '').toLowerCase().includes(query)) score += 20
  if ((atom.risk || '').toLowerCase().includes(query)) score += 12
  if ((atom.next || '').toLowerCase().includes(query)) score += 8
  return score
}

function searchableText(atom: CartographyAtom): string {
  return [
    atom.graphId,
    atom.name,
    atom.deck,
    atom.role,
    atom.sourcePath,
    atom.input,
    atom.output,
    atom.evidence,
    atom.risk,
    atom.next,
    atom.graphLayer,
    atom.graphParent,
    ...(atom.depends ?? []),
    ...(atom.unblocks ?? []),
    ...(atom.flowsTo ?? []),
    ...(atom.governs ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
