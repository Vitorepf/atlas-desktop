import type { CartographyAtom, RecentChange } from '@atlas/domain'
import type { RegionSignals, FlowPhase } from './flowTypes'

export const FLOW_PHASES: FlowPhase[] = [
  { label: 'intake', deck: 'captura', from: 1, to: 3, icon: '01' },
  { label: 'shape', deck: 'contexto', from: 4, to: 8, icon: '02' },
  { label: 'decide', deck: 'decisao', from: 9, to: 12, icon: '03' },
  { label: 'prove', deck: 'evidencia', from: 13, to: 15, icon: '04' },
  { label: 'render', deck: 'saida', from: 16, to: 17, icon: '05' },
]

export const LANE_TONE: Record<string, string> = {
  'domain-plane': 'territory-domain',
  capabilities: 'territory-capability',
  'business-context-side': 'territory-business',
  hks: 'territory-human',
  'evidence-loop': 'territory-evidence',
  'doc-os': 'territory-docs',
}

export function computeRecentByGraphId(recentChanges: RecentChange[]): Record<string, RecentChange> {
  const map: Record<string, RecentChange> = {}
  for (const change of recentChanges) {
    const existing = map[change.graphId]
    if (!existing || change.secondsAgo < existing.secondsAgo) map[change.graphId] = change
  }
  return map
}

export function computeRegionSignals(
  atoms: CartographyAtom[],
  recentByGraphId: Record<string, RecentChange>
): RegionSignals {
  return atoms.reduce(
    (acc, atom) => {
      if (atom.risk) acc.risk += 1
      if (recentByGraphId[atom.graphId]) acc.recent += 1
      if (atom.evidence || atom.next) acc.evidence += 1
      if (hasGraphRelations(atom)) acc.relations += 1
      return acc
    },
    { relations: 0, risk: 0, recent: 0, evidence: 0 }
  )
}

function hasGraphRelations(atom: CartographyAtom): boolean {
  return Boolean(
    atom.graphParent ||
      (atom.depends?.length ?? 0) > 0 ||
      (atom.unblocks?.length ?? 0) > 0 ||
      (atom.flowsTo?.length ?? 0) > 0 ||
      (atom.governs?.length ?? 0) > 0
  )
}
