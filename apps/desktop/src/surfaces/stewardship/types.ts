/**
 * Atlas Software Company Stewardship Product Mode cockpit types (AP-739).
 *
 * Mirrors `atlas.software_company.product_mode_cockpit.v1` from atlas-server.
 * The surface is read-only and must never record decisions or trigger work.
 */

export type StewardshipBridgeMode = 'tauri' | 'http' | 'offline'

export type StewardshipCockpitStatus = 'ready' | 'review' | 'blocked' | 'unknown' | string

export interface StewardshipCounters {
  area_findings: number
  area_inbox_items: number
  work_orders: number
  executive_items: number
  executive_pending_review: number
  new_area_gate_items: number
  new_area_blocked_review: number
  self_expanding_inbox_items: number
  review_queue_items: number
  ready_for_domain_runtime_creation_gate: number
  [key: string]: number
}

export interface StewardshipRuntimeSection {
  schema_version?: string
  status: string
  ap_contract?: string
  mode?: string
  area_id?: string
  portfolio_id?: string
  target_owner?: string
  blockers?: string[]
  next_actions?: string[]
  claim_policy?: Record<string, unknown>
  [key: string]: unknown
}

export interface StewardshipReviewItem {
  schema_version: 'atlas.software_company.product_mode_cockpit.review_item.v1'
  source_ap:
    | 'AP-736'
    | 'AP-737'
    | 'AP-738'
    | 'AP-740'
    | 'AP-741'
    | 'AP-743'
    | 'AP-744'
    | 'AP-745'
    | 'AP-746'
    | 'AP-747'
    | 'AP-748'
    | 'AP-749'
    | 'AP-759'
    | 'AP-750'
    | 'AP-752'
    | 'AP-754'
    | string
  kind: string
  id: string
  title: string
  status: string
  risk_level: string
  target_area: string
  target_owner?: string
  priority_score: number
  decision_anchor: Record<string, unknown>
  blockers?: string[]
  counts?: Record<string, unknown>
  allowed_next_actions?: string[]
  recommended_operator_action?: string
  irreversible_action_allowed: boolean
  autoimplementation_allowed: boolean
}

export interface StewardshipCockpit {
  schema_version: 'atlas.software_company.product_mode_cockpit.v1'
  status: StewardshipCockpitStatus
  ap_contract: 'AP-739'
  area_id: string
  portfolio_id: string
  read_only: boolean
  stack: {
    name: string
    parent_runtime: string
    current_visual_level: string
    continuous_motor: string
    area_focus: string
    ceiling: string
    not_a_new_os: boolean
  }
  source_ap_contracts: string[]
  counters: StewardshipCounters
  health: Record<string, unknown>
  area_focus: Record<string, unknown>
  executive_decision_inbox: {
    status: string
    source_pack_hash?: string
    item_count: number
    decision_summary: Record<string, number>
    items: Record<string, unknown>[]
    operator_controls: Record<string, unknown>
  }
  new_area_proposal_gate: {
    status: string
    mode?: string
    proposal_count: number
    gate_item_count: number
    decision_summary: Record<string, number>
    gate_items: Record<string, unknown>[]
    operator_controls: Record<string, unknown>
  }
  self_expanding_company: {
    status: string
    expansion_summary: Record<string, number>
    operator_inbox: {
      item_count?: number
      items?: Record<string, unknown>[]
      decision_command?: string
    }
    promotion_boundary: Record<string, unknown>
    expansion_loop: string[]
  }
  stewardship_outcome_history?: StewardshipRuntimeSection
  domain_runtime_creation_handoff?: StewardshipRuntimeSection
  area_stewardship_active_handoff?: StewardshipRuntimeSection
  area_stewardship_active_operation?: StewardshipRuntimeSection
  continuous_stewardship_loop?: StewardshipRuntimeSection
  continuous_stewardship_scheduler?: StewardshipRuntimeSection
  dev_forge_release?: StewardshipRuntimeSection
  owner_sandbox_runtime_runner?: StewardshipRuntimeSection
  owner_runtime_result_bridge?: StewardshipRuntimeSection
  executive_allocation_handoff?: StewardshipRuntimeSection
  product_mode_operational_controls?: StewardshipRuntimeSection
  review_queue: StewardshipReviewItem[]
  operator_controls: Record<string, unknown>
  next_actions: string[]
  claim_policy: Record<string, unknown>
  surface_hash: string
  generated_at: string
}
