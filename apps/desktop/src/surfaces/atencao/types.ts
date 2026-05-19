/**
 * Atlas Code Attention Control Plane · TS contract.
 *
 * Mirrors `app/Services/Ai/Programming/AtlasCodeAttentionControlPlaneService.php`
 * payload (`atlas.code.attention_control_plane.v1`). Only the fields the
 * surface actually renders are typed strictly; the rest is `unknown` so the
 * surface never falls apart when the backend evolves.
 */

export type AttentionKind =
  | 'intake_needed'
  | 'scope_decision'
  | 'risk_approval'
  | 'provider_approval'
  | 'runtime_approval'
  | 'review_needed'
  | 'repair_decision'
  | 'final_acceptance'
  | 'blocked_attention'

export type AttentionSeverity = 'high' | 'medium' | 'low'

export type AttentionAction =
  | 'open_obra'
  | 'approve'
  | 'reject'
  | 'request_repair'
  | 'pause'
  | 'rollback'
  | 'refine_intake'
  | 'approve_scope_change'
  | 'deny_scope_change'
  | 'approve_provider'
  | 'approve_runtime'
  | 'dismiss_with_reason'

export interface AttentionItem {
  id: string
  item_key: string
  obra_id: string
  obra_title: string
  obra_phase: string
  obra_status: string
  workspace_slug: string
  kind: AttentionKind
  severity: AttentionSeverity
  human_question: string
  why_now: string
  recommended_action: AttentionAction
  allowed_actions: AttentionAction[]
  risk_if_ignored: string
  evidence_refs: string[]
  target_surface: string
  target_panel: string
  receipt_required: boolean
  expires_at: string | null
  created_at: string
  next_safe_step?: string
  blocker_translation?: Record<string, unknown>
}

export interface AttentionObraSummary {
  obra_id: string
  obra_title: string
  workspace_slug: string
  state: string
  state_label: string
  paused_until: string | null
}

export interface AttentionResolvedRecently {
  obra_id: string
  obra_title: string
  state: string
  human_status_label: string
  completed_at: string | null
}

export interface AttentionHealth {
  total_items: number
  returned_items: number
  blocked_obras: number
  waiting_human_count: number
  stale_items_count: number
  missing_evidence_count: number
  unknown_state_count: number
}

export interface AttentionSnapshot {
  schema_version: string
  generated_at: string
  workspace_filter: string | null
  active_focus_item: AttentionItem | null
  queue_items: AttentionItem[]
  resolved_recently: AttentionResolvedRecently[]
  obra_summary: AttentionObraSummary[]
  health: AttentionHealth
  allowed_actions_vocabulary: AttentionAction[]
  external_provider_call: boolean
  provider_tokens_spent: boolean
  completion_claim_promoted: boolean
  review_gate_preserved: boolean
  separated_from: string
  note: string
}

export interface AttentionReceipt {
  receipt_id: string
  item_key: string
  obra_id: string
  kind: string
  state_at_decision: string
  action: AttentionAction
  reason: string | null
  decided_by: string
  decided_at: string
  notes: string | null
  evidence_refs: string[]
  schema_version: string
}

export interface AttentionDecisionPayload {
  item_key: string
  action: AttentionAction
  reason?: string
  decided_by?: string
  notes?: string
  pause_hours?: number
}
