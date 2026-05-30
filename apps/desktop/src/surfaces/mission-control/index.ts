/**
 * Mission Control Cockpit surface module barrel.
 *
 * Importing `from '@/surfaces/mission-control'` exposes the surface
 * component, the canonical hook and the typed snapshot shape. App.tsx
 * navigation wiring is left to the operator (AP-702 non-goal).
 */
export { MissionControlSurface } from './MissionControlSurface'
export { useMissionControl } from './useMissionControl'
export type {
  MissionControlBlocker,
  MissionControlBridgeMode,
  MissionControlGateReport,
  MissionControlPhase,
  MissionControlResponse,
  MissionControlSnapshot,
} from './types'
