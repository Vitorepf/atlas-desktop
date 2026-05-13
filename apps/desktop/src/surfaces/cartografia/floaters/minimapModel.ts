import type { Continent } from '@atlas/domain'
import { readCartografiaStorage, writeCartografiaStorage } from '../state/browserStorage'

const MINIMAP_COLLAPSED_KEY = 'atlas.cartografia.minimapCollapsed'

export function readStoredMinimapCollapsed(): boolean {
  return readCartografiaStorage(MINIMAP_COLLAPSED_KEY) === '1'
}

export function persistMinimapCollapsed(collapsed: boolean): void {
  writeCartografiaStorage(MINIMAP_COLLAPSED_KEY, collapsed ? '1' : '0')
}

export function minimapSourceLabel(continent: Continent): string {
  return continent.graphSource === 'mixed' ? 'misto' : continent.graphSource
}
