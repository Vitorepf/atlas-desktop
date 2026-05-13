import type { CartographyAtom } from '@atlas/domain'
import { atomMatchesQuery, scoreAtomForQuery } from './searchScoring'

export const MAX_SEARCH_RESULTS = 9
export const MIN_SEARCH_QUERY_LENGTH = 2

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function searchAtoms(
  atomIndex: Record<string, CartographyAtom>,
  query: string
): CartographyAtom[] {
  const normalized = normalizeSearchQuery(query)
  if (normalized.length < MIN_SEARCH_QUERY_LENGTH) return []
  return Object.values(atomIndex)
    .filter((atom) => atomMatchesQuery(atom, normalized))
    .sort((a, b) => scoreAtomForQuery(b, normalized) - scoreAtomForQuery(a, normalized))
    .slice(0, MAX_SEARCH_RESULTS)
}

export function nextSearchIndex(current: number, total: number): number {
  if (total === 0) return 0
  return (current + 1) % total
}

export function previousSearchIndex(current: number, total: number): number {
  if (total === 0) return 0
  return (current - 1 + total) % total
}
