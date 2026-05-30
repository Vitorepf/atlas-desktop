/**
 * Mission Control Cockpit Desktop surface types (AP-702).
 *
 * Mirrors `atlas.aaeos.mission_control_cockpit.v1` from atlas-server. The
 * Desktop surface is read-only — it never mutates the cockpit.
 */

export type MissionControlBridgeMode = 'tauri' | 'http' | 'offline'

export interface MissionControlBlocker {
  id: string
  severity: string
  owner: string
}

export interface MissionControlPhase {
  phase: string
  status: 'pending' | 'executed' | 'skipped'
  envelopes?: number
}

export interface MissionControlGateReport {
  schema?: string
  status?: string
  passed?: string[]
  blocked?: string[]
  exception?: string[]
  [key: string]: unknown
}

export interface MissionControlSnapshot {
  schema: 'atlas.aaeos.mission_control_cockpit.v1'
  intent_id: string
  autonomy_level: string
  phase_count: number
  phases: MissionControlPhase[]
  current_phase: string | null
  next_phase: string | null
  gate_report: MissionControlGateReport
  department_count: number
  blockers: MissionControlBlocker[]
  operator_signature_required: boolean
  provider_safe: boolean
  generated_at: string
  snapshot_hash: string
}

export interface MissionControlResponse {
  cockpit: MissionControlSnapshot
  baseline: boolean
  note?: string
}
