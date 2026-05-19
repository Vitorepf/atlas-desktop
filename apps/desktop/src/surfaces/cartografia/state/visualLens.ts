import { readCartografiaStorage } from './browserStorage'

export type VisualLens = 'flow' | 'relations' | 'risk' | 'recent' | 'evidence'

export const VISUAL_LENSES: VisualLens[] = ['flow', 'relations', 'risk', 'recent', 'evidence']

export function lensFromShortcut(key: string): VisualLens | null {
  if (key === '1') return 'flow'
  if (key === '2') return 'relations'
  if (key === '3') return 'risk'
  if (key === '4') return 'recent'
  if (key === '5') return 'evidence'
  return null
}

export function readStoredVisualLens(key: string): VisualLens {
  const raw = readCartografiaStorage(key)
  return VISUAL_LENSES.includes(raw as VisualLens) ? (raw as VisualLens) : 'flow'
}
