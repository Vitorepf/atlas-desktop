/**
 * @deprecated thin wrapper — kept for the existing App import path.
 * Prefer `bridge.coreStatus()` from src/lib/bridge.ts directly.
 */
import { bridge } from '../lib/bridge'
import type { CoreStatus } from '@atlas/domain'

export async function getCoreStatus(): Promise<CoreStatus> {
  return bridge.coreStatus()
}
