import type { Continent } from '@atlas/domain'

export const EVIDENCE_LEDGER_GRAPH_ID = 'evidence-ledger'
export const ATLAS_SYSTEM_FALLBACK_ID = 'atlas'

export function systemSceneParentId(systemParentId: string | null, continent: Continent | null): string {
  return systemParentId ?? continent?.graphId ?? ATLAS_SYSTEM_FALLBACK_ID
}

export function nextIsolatedId(current: string | null, candidate: string): string | null {
  return current === candidate ? null : candidate
}
