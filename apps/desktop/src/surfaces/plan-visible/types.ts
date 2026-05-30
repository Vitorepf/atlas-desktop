/**
 * Plan-Visible Desktop surface types (AP-703 / Patamar A5).
 *
 * Mirrors `atlas.dev.plan_visible.v1` and the index envelope from
 * atlas-server `AtlasDevPlanVisibleController`.
 */

export type PlanVisibleBridgeMode = 'tauri' | 'http' | 'offline'

export type PlanVisibleApprovalStatus = 'pending' | 'approved' | 'rejected'

export type PlanVisibleRiskBand = 'low' | 'medium' | 'high'

export interface PlanVisible {
  schema_version: 'atlas.dev.plan_visible.v1'
  target_files: string[]
  tests_to_run: string[]
  risk_band: PlanVisibleRiskBand
  proposed_diff_summary: string
  run_id: string
  task_contract_hash: string
  approval_status: PlanVisibleApprovalStatus
  plan_hash?: string
  [key: string]: unknown
}

export interface PlanVisibleShowResponse {
  plan_visible: PlanVisible
  hash: string
}

export interface PlanVisibleIndexEntry {
  work_item_id: string
  work_item_code?: string | null
  plan_hash: string
  plan_visible: PlanVisible
}

export interface PlanVisibleIndexResponse {
  schema: 'atlas.dev.plan_visible.index.v1'
  count: number
  items: PlanVisibleIndexEntry[]
}
