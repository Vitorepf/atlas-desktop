/**
 * Plan-Visible surface module barrel.
 *
 * `import from '@/surfaces/plan-visible'` exposes the surface component,
 * the canonical hooks (index + show) and the typed snapshot shapes.
 * App.tsx navigation wiring is left to the operator (AP-703 non-goal).
 */
export { PlanVisibleSurface } from './PlanVisibleSurface'
export { usePlanVisibleIndex, usePlanVisibleShow } from './usePlanVisible'
export type {
  PlanVisible,
  PlanVisibleApprovalStatus,
  PlanVisibleBridgeMode,
  PlanVisibleIndexEntry,
  PlanVisibleIndexResponse,
  PlanVisibleRiskBand,
  PlanVisibleShowResponse,
} from './types'
