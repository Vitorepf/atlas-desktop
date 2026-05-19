import type { CartographyAtom, RecentChange } from '@atlas/domain'

export function atomClassName({
  atom,
  isPipeline,
  isActive,
  isKin,
  recent,
}: {
  atom: CartographyAtom
  isPipeline: boolean
  isActive?: boolean
  isKin?: boolean
  recent?: RecentChange | null
}): string {
  return [
    'atom',
    isPipeline ? 'atom-pipe' : '',
    atom.missingSource ? 'missing-source' : '',
    atom.risk ? 'has-risk' : '',
    atom.next ? 'has-next' : '',
    hasRelations(atom) ? 'has-relations' : '',
    atom.evidence ? 'has-evidence' : '',
    isOperationalOrphan(atom) ? 'is-orphan' : '',
    isActive ? 'active' : '',
    isKin ? 'kin' : '',
    recent ? 'recently-touched' : '',
    recent && recent.secondsAgo < 60 ? 'just-edited' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function pipelineSymbol(order: number): string {
  if (order <= 3) return 'in'
  if (order <= 8) return 'ctx'
  if (order <= 12) return 'run'
  if (order <= 15) return 'ok'
  return 'out'
}

export function hasRelations(atom: CartographyAtom): boolean {
  return [
    atom.graphParent,
    ...(atom.depends ?? []),
    ...(atom.unblocks ?? []),
    ...(atom.flowsTo ?? []),
    ...(atom.governs ?? []),
  ].some(Boolean)
}

function isOperationalOrphan(atom: CartographyAtom): boolean {
  if (atom.kind === 'continent' || atom.kind === 'lane') return false
  const depends = atom.depends ?? []
  const unblocks = atom.unblocks ?? []
  const flowsTo = atom.flowsTo ?? []
  return depends.length === 0 && unblocks.length === 0 && flowsTo.length === 0
}
