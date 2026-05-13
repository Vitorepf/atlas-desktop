import type { CoreStatus } from '@atlas/domain'
import { coreStatus as coreStatusFallback } from '../data/mock'

/**
 * Bridge to atlas-tauri command `atlas_core_status`. Falls back to the
 * browser-only mock when running `npm run dev` without Tauri.
 */
export async function getCoreStatus(): Promise<CoreStatus> {
  try {
    const tauri = await import('@tauri-apps/api/core')
    return await tauri.invoke<CoreStatus>('atlas_core_status')
  } catch {
    return coreStatusFallback
  }
}
