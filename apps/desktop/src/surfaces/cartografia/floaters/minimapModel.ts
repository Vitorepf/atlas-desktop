import type { Continent } from '@atlas/domain'
import { readCartografiaStorage, writeCartografiaStorage } from '../state/browserStorage'

const MINIMAP_COLLAPSED_KEY = 'atlas.cartografia.minimapCollapsed'

export function readStoredMinimapCollapsed(): boolean {
  // Default to collapsed: the minimap covers the Domain Plane atoms when
  // expanded over the world canvas. The user toggles it open when needed.
  const raw = readCartografiaStorage(MINIMAP_COLLAPSED_KEY)
  if (raw == null) return true
  return raw === '1'
}

export function persistMinimapCollapsed(collapsed: boolean): void {
  writeCartografiaStorage(MINIMAP_COLLAPSED_KEY, collapsed ? '1' : '0')
}

export function minimapSourceLabel(continent: Continent): string {
  return continent.graphSource === 'mixed' ? 'misto' : continent.graphSource
}
