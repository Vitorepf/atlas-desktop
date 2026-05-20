/**
 * Atlas Control Plane surface · canonical payload types.
 *
 * Mirrors the JSON shape produced by `App\Services\Ai\ControlPlane\*` services
 * and surfaced via `GET /atlas/ai/control-plane/*`. Permissive on purpose: every
 * runtime (mission, domain, policy, evidence, tool, router, approvals,
 * certifications) is wired with a canonical status and may omit detail keys
 * when the runtime is absent. Components MUST treat any non-ready/healthy
 * status as operational attention and render an honest message instead of
 * inventing data.
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-autonomous-control-plane.md
 *   - docs/engineering-knowledge-base/atlas-autonomous-intelligence-operating-system.md
 *   - app/Services/Ai/ControlPlane/AtlasControlPlaneSnapshotService.php
 */

export type ControlPlaneStatus =
  | 'ready'
  | 'healthy'
  | 'watch'
  | 'degraded'
  | 'missing'
  | 'blocked'

export interface ControlPlaneComponentSummary {
  component?: string
  status: ControlPlaneStatus
  total?: number
  by_status?: Record<string, number>
  by_source?: Record<string, number>
  tables?: Record<string, boolean>
  tables_present?: number
  tables_required?: number
  detail?: string
  recent?: ReadonlyArray<Record<string, unknown>>
  // Additional component-specific keys are passed through unchanged.
  [key: string]: unknown
}

export interface ControlPlaneReadinessComponent {
  component: string
  status: ControlPlaneStatus
  tables?: Record<string, boolean>
  tables_present?: number
  tables_required?: number
}

export interface ControlPlaneReadiness {
  ok: boolean
  schema: string
  status: ControlPlaneStatus
  summary: {
    total: number
    ready: number
    degraded: number
    missing: number
  }
  components: ReadonlyArray<ControlPlaneReadinessComponent>
  generated_at: string
}

export interface ControlPlaneApprovalsSummary {
  status: ControlPlaneStatus
  total: number
  pending?: number
  approved?: number
  denied?: number
  expired?: number
  auto_approved?: number
  by_status?: Record<string, number>
  by_mode?: Record<string, number>
  risk_distribution?: Record<string, number>
  detail?: string
}

export interface ControlPlaneCertificationGroup {
  status: ControlPlaneStatus
  total: number
  passed?: number
  by_status?: Record<string, number>
  detail?: string
}

export interface ControlPlaneCertificationsSummary {
  status: ControlPlaneStatus
  evidence_runtime: ControlPlaneCertificationGroup
  mission_foundation: ControlPlaneCertificationGroup
}

export interface ControlPlaneRuntimeIntelligenceSummary {
  status: ControlPlaneStatus
  schema_version?: string
  summary?: Record<string, number | string | boolean | null>
  persistent_context?: ControlPlaneComponentSummary
  aemor?: ControlPlaneComponentSummary
  intelligence_factory?: ControlPlaneComponentSummary
  swarm_company?: ControlPlaneComponentSummary
  external_execution?: ControlPlaneComponentSummary
  action_queue?: ReadonlyArray<{
    kind: string
    status: ControlPlaneStatus
    detail: string
    target_id?: string | number | null
  }>
  claim_policy?: Record<string, unknown>
  hash?: string | null
  detail?: string
}

export interface ControlPlaneBlockerEntry {
  source: 'evidence' | 'missions' | 'approvals' | 'handoffs' | string
  id?: number | string
  uuid?: string
  target_type?: string
  target_id?: number | string
  blocker_type?: string
  severity?: string
  reason?: string
  status?: string
  created_at?: string | null
}

export interface ControlPlaneBlockersSummary {
  total: number
  critical: number
  by_source: Record<string, number>
}

export interface ControlPlaneRecentEvent {
  source: 'evidence' | 'mission' | string
  event_type: string
  target_type?: string
  target_id?: number | string
  created_at?: string | null
}

export type ControlPlaneNextActionKind =
  | 'setup_runtime'
  | 'repair_runtime'
  | 'resolve_blocker'
  | 'review_pending_approvals'
  | 'finalize_certification'
  | 'idle'
  | string

export type ControlPlaneNextActionPriority = 'critical' | 'high' | 'medium' | 'low' | string

export interface ControlPlaneNextAction {
  kind: ControlPlaneNextActionKind
  component: string
  priority: ControlPlaneNextActionPriority
  detail: string
  target_type?: string | null
  target_id?: number | string | null
}

export interface ControlPlaneSnapshot {
  schema: string
  generated_at: string
  status: ControlPlaneStatus
  readiness: ControlPlaneReadiness
  missions_summary: ControlPlaneComponentSummary
  domains_summary: ControlPlaneComponentSummary
  policies_summary: ControlPlaneComponentSummary
  evidence_summary: ControlPlaneComponentSummary
  tools_summary: ControlPlaneComponentSummary
  router_summary: ControlPlaneComponentSummary
  approvals_summary: ControlPlaneApprovalsSummary
  operator_approvals_summary?: ControlPlaneApprovalsSummary
  blockers_summary: ControlPlaneBlockersSummary
  certifications_summary: ControlPlaneCertificationsSummary
  runtime_intelligence_summary?: ControlPlaneRuntimeIntelligenceSummary
  recent_events: ReadonlyArray<ControlPlaneRecentEvent>
  next_actions: ReadonlyArray<ControlPlaneNextAction>
}

export interface ControlPlaneBlockersPayload {
  schema: string
  total: number
  critical: number
  by_source: Record<string, number>
  sources: Record<string, { count?: number; critical?: number; recent?: ReadonlyArray<ControlPlaneBlockerEntry>; status?: ControlPlaneStatus; detail?: string }>
  recent: ReadonlyArray<ControlPlaneBlockerEntry>
  generated_at: string
}

export interface ControlPlaneNextActionsPayload {
  schema: string
  count: number
  items: ReadonlyArray<ControlPlaneNextAction>
  generated_at: string
}

export type ControlPlaneBridgeMode = 'tauri' | 'http' | 'offline'
