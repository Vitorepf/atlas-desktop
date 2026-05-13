import { readCartografiaStorage } from '../state/browserStorage'

export const INSPECTOR_WIDTH_KEY = 'atlas.cartografia.inspectorWidth'
export const INSPECTOR_COLLAPSED_KEY = 'atlas.cartografia.inspectorCollapsed'
export const INSPECTOR_MIN_WIDTH = 300
export const INSPECTOR_MAX_WIDTH = 680
export const INSPECTOR_DEFAULT_WIDTH = 360
export const INSPECTOR_COLLAPSED_WIDTH = 56

export function readStoredInspectorWidth(): number {
  const raw = readCartografiaStorage(INSPECTOR_WIDTH_KEY)
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  if (!Number.isFinite(parsed)) return INSPECTOR_DEFAULT_WIDTH
  return clampInspectorWidth(parsed)
}

export function readStoredBoolean(key: string, fallback: boolean): boolean {
  const raw = readCartografiaStorage(key)
  if (raw === '1') return true
  if (raw === '0') return false
  return fallback
}

export function clampInspectorWidth(width: number): number {
  return Math.min(INSPECTOR_MAX_WIDTH, Math.max(INSPECTOR_MIN_WIDTH, Math.round(width)))
}
