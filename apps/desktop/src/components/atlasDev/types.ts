/**
 * Atlas Dev · Run/SSE local types.
 *
 * These mirror the backend contracts described in
 *   docs/engineering-knowledge-base/atlas-dev-efficient-programming-flow-contracts-v1.md
 * (`atlas.dev.*.v1` schemas) and the endpoint invariants from
 *   docs/engineering-knowledge-base/atlas-dev-efficient-programming-flow-v1.md
 *
 * They are intentionally *local* to this module so Claude 18 (Run/SSE) can
 * ship without blocking on Claude 17 (Plan-only). When Plan-only lands, the
 * canonical shapes should be hoisted to a shared module and re-exported here.
 */

export type CompletionState =
  | 'passed'
  | 'needs_review'
  | 'failed'
  | 'blocked'
  | 'cancelled'
  | 'escalate_forge'
  | 'no_patch_needed'

export type ScopeGuardStatus = 'passed' | 'failed' | 'needs_review' | 'skipped' | 'waived'

export type VerificationStatus = 'passed' | 'failed' | 'needs_review' | 'skipped' | 'waived' | 'unverified'

export type AtlasDevPhase =
  | 'queued'
  | 'executing'
  | 'patch_projected'
  | 'no_patch_needed'
  | 'scope_guarding'
  | 'verifying'
  | 'repair_planned'
  | 'repair_executing'
  | 'escalation_triggered'
  | 'receipt'
  | 'complete'

/**
 * Minimum shape Run consumes from a previously-rendered Plan result. Claude 17
 * may export a richer type from `surfaces/atlas-ai/...`; the wire shape used
 * here is the smallest contract that lets Run prove invariants.
 */
export interface PlanOnlyResult {
  run_id: string
  task_contract_hash: string
  confirmation_token: string
  /** Provider-safe workspace identifier used to load recent runs. */
  workspace_hash?: string | null
  /** Optional Atlas AI conversation thread identifier for run history. */
  thread_id?: string | null
  /** ISO 8601 ts when the confirmation_token expires (default 5min). */
  confirmation_expires_at?: string | null
  routing_decision: 'atlas_dev_fast_path' | 'read_only_answer' | 'forge_promotion_preview' | string
  /** Optional ui_hints projection from the backend for diff/test preview. */
  ui_hints?: {
    diff_preview?: string | null
    expected_tests?: string[] | null
    expected_files?: string[] | null
  } | null
}

export interface AtlasDevRunRequest {
  run_id: string
  task_contract_hash: string
  confirmation_token: string
  operator_confirmed: true
}

export interface AtlasDevTestRun {
  command: string
  ok?: boolean
  exit_code?: number | null
  duration_ms?: number | null
  output_hash?: string | null
  output_excerpt?: string | null
}

export interface AtlasDevEvidenceRef {
  kind: 'diff' | 'test_log' | 'lint_log' | 'screenshot' | 'manual_review' | 'no_patch_reason' | string
  path?: string | null
  hash?: string | null
  governance_ledger_ref?: string | null
}

export interface AtlasDevGate {
  name: string
  status: ScopeGuardStatus | VerificationStatus | string
  required: boolean
  fresh?: boolean
  evidence_ref?: string | null
  waiver_reason?: string | null
}

export interface AtlasDevRepairSummary {
  attempt_count: number
  failure_capsule_refs?: string[]
  converted_to_green?: boolean
}

export interface AtlasDevCostSummary {
  provider_calls?: number | null
  tokens_in?: number | null
  tokens_out?: number | null
  estimated_cost_usd?: number | null
  wall_time_ms?: number | null
}

export interface AtlasDevReceipt {
  run_id: string
  task_contract_hash: string
  completion: {
    status: CompletionState
    honesty_flags?: string[]
    residual_risks?: string[]
  }
  scope_guard_status?: ScopeGuardStatus | null
  verification_status?: VerificationStatus | null
  diff_hash?: string | null
  changed_files?: string[]
  evidence_refs?: AtlasDevEvidenceRef[]
  gates?: AtlasDevGate[]
  tests?: AtlasDevTestRun[]
  repair?: AtlasDevRepairSummary | null
  cost?: AtlasDevCostSummary | null
  receipt_hash?: string | null
  receipt_path?: string | null
  ui_hints?: {
    diff_preview?: string | null
    tests_preview?: AtlasDevTestRun[] | null
  } | null
}

export interface AtlasDevRunStatusResponse {
  run_id: string
  state: AtlasDevPhase
  completion?: AtlasDevReceipt['completion']
  receipt?: AtlasDevReceipt | null
  ui_hints?: AtlasDevReceipt['ui_hints']
  /** Optional progress snapshot for REST-only consumers. */
  phases?: Array<{ phase: AtlasDevPhase; at?: string | null }>
}

export interface AtlasDevRunIndexEntry {
  completion_state?: CompletionState | 'queued' | 'running' | string | null
  created_at?: string | null
  last_receipt_hash?: string | null
  risk_level: string
  routing_decision: string
  run_id: string
  surface_id: string
  task_kind: string
  thread_id?: string | null
  updated_at?: string | null
  workspace_hash: string
}

export interface AtlasDevRunIndexResponse {
  items: AtlasDevRunIndexEntry[]
  limit: number
  workspace_hash?: string | null
  thread_id?: string | null
}

export interface AtlasDevReadinessCheck {
  id: string
  status: 'passed' | 'warning' | 'failed' | string
  severity: 'info' | 'warning' | 'blocker' | string
  message: string
  details?: Record<string, unknown>
}

export interface AtlasDevReadinessResponse {
  schema_version: 'atlas.dev.readiness.v1' | string
  status: 'passed' | 'blocked' | string
  strict: boolean
  provider_safe: boolean
  checks: AtlasDevReadinessCheck[]
  summary: {
    passed: number
    warnings: number
    failed: number
  }
}

/** Canonical SSE event shapes per contract §26.1. */
export interface AtlasDevSsePhaseEvent {
  kind: 'phase'
  phase: AtlasDevPhase
  at?: string | null
}

export interface AtlasDevSseTestEvent {
  kind: 'test_started' | 'test_finished'
  command: string
  ok?: boolean
  exit_code?: number | null
  duration_ms?: number | null
}

export interface AtlasDevSseRepairEvent {
  kind: 'repair_planned' | 'repair_executing' | 'repair_finished'
  attempt: number
  failure_signature?: string | null
}

export interface AtlasDevSseEscalationEvent {
  kind: 'escalation_triggered'
  target: 'forge' | 'obra_candidate' | string
  reasons?: string[]
}

export interface AtlasDevSseReceiptEvent {
  kind: 'receipt'
  receipt: AtlasDevReceipt
}

export interface AtlasDevSseKeepaliveEvent {
  kind: 'keepalive'
}

/**
 * Backend (F-01) emits this as the last event of a snapshot-replay stream so
 * the client knows it can stop reading without waiting for `done`. Carries an
 * audit reason and the canonical fallback hint (`poll_rest_show_endpoint`).
 */
export interface AtlasDevSseStreamClosedEvent {
  kind: 'stream_closed'
  reason?: string | null
  fallback?: string | null
}

export type AtlasDevSseEvent =
  | AtlasDevSsePhaseEvent
  | AtlasDevSseTestEvent
  | AtlasDevSseRepairEvent
  | AtlasDevSseEscalationEvent
  | AtlasDevSseReceiptEvent
  | AtlasDevSseKeepaliveEvent
  | AtlasDevSseStreamClosedEvent

export type AtlasDevRunStatus =
  | 'idle'
  | 'awaiting_confirmation'
  | 'submitting'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled'
  | 'escalated'

export interface AtlasDevRunError {
  kind: 'invalid_token' | 'invalid_hash' | 'forbidden' | 'network' | 'stream' | 'unknown'
  status?: number
  message: string
  /** When true, the operator should regenerate a Plan to obtain a new token. */
  requires_replan: boolean
}
