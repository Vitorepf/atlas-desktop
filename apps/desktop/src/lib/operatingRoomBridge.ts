/**
 * Atlas Code · Interactive Observed Provider Workflow bridge.
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-code-interactive-observed-provider-workflow-v1.md
 *   - docs/engineering-knowledge-base/atlas-code-adaptive-provider-operating-room-v1.md
 *   - docs/engineering-knowledge-base/atlas-claude-code-subscription-governance-v1.md
 *
 * HTTP-only for v1. Tauri command parity will be added when the Rust side
 * implements bridge_observed_session_* commands. Until then, Tauri mode falls
 * back to null/[] honestly.
 *
 * IMPORTANT: this bridge NEVER invokes a provider. The only mutating endpoints
 * are state transitions, result imports and human decisions — all operator-
 * driven. Atlas only prepares packet/prompt/state; the human runs the
 * provider interactively.
 */
import type {
  AtlasCodeClaudeProgrammaticPolicy,
  AtlasCodeObservedGateResult,
  AtlasCodeObservedScopeGuard,
  AtlasCodeObservedSession,
  AtlasCodeObservedSessionDecideAction,
  AtlasCodeObservedSessionImportPayload,
  AtlasCodeProgrammaticLabelDecision,
  AtlasCodeProviderGovernance,
  AtlasCodeProviderOperatingRoom,
  AtlasCodeProviderOperatingRoomAttention,
  AtlasCodeProviderOperatingRoomBoardSlot,
  AtlasCodeProviderOperatingRoomLabelDecision,
  AtlasCodeProviderOperatingRoomSafety,
  AtlasCodeWorkPacket,
  AtlasCodeWorkPacketCreatePayload,
} from '@atlas/domain'

type FetchJson = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>

export interface OperatingRoomBridge {
  getGovernance: () => Promise<AtlasCodeProviderGovernance | null>
  getOperatingRoom: (obraId: string) => Promise<AtlasCodeProviderOperatingRoom | null>
  listWorkPackets: (obraId: string) => Promise<AtlasCodeWorkPacket[]>
  createWorkPacket: (obraId: string, payload: AtlasCodeWorkPacketCreatePayload) => Promise<AtlasCodeWorkPacket | null>
  previewExport: (
    obraId: string,
    packetId: string,
    providerId: string
  ) => Promise<{ packet: AtlasCodeWorkPacket; prompt: string; packetMd: string; packetMdStatus: string; packetMdPath: string | null } | null>
  listObservedSessions: (obraId: string) => Promise<AtlasCodeObservedSession[]>
  openObservedSession: (
    obraId: string,
    workPacketId: string,
    providerId: string
  ) => Promise<AtlasCodeObservedSession | null>
  transitionObservedSession: (
    obraId: string,
    sessionId: string,
    nextState: 'running' | 'waiting_result_import'
  ) => Promise<AtlasCodeObservedSession | null>
  importObservedResult: (
    obraId: string,
    sessionId: string,
    payload: AtlasCodeObservedSessionImportPayload
  ) => Promise<AtlasCodeObservedSession | null>
  decideObservedSession: (
    obraId: string,
    sessionId: string,
    action: AtlasCodeObservedSessionDecideAction,
    reason?: string
  ) => Promise<AtlasCodeObservedSession | null>
  /**
   * Run advisory gates on an imported observed session. Atlas does NOT
   * execute the packet's verification_commands itself — gates returned
   * include scope_guard, acceptance_criteria_declared,
   * verification_commands_declared (always commands_available_but_not_run),
   * report_imported and diff_imported.
   */
  runObservedSessionGates: (obraId: string, sessionId: string) => Promise<AtlasCodeObservedSession | null>
  /**
   * One-shot CTA "Abrir Claude Code observado": create packet + open
   * observed session in a single request. The Operating Room re-fetches
   * automatically; the resulting session has state=`waiting_operator`.
   */
  quickOpenClaudeCodeObserved: (
    obraId: string,
    payload: AtlasCodeWorkPacketCreatePayload,
    providerId?: string
  ) => Promise<{ session: AtlasCodeObservedSession; packet: AtlasCodeWorkPacket } | null>
}

export function createOperatingRoomBridge(fetchJson: FetchJson | null): OperatingRoomBridge {
  const wrap = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
    if (!fetchJson) return null
    try {
      return await fn()
    } catch (e) {
      console.warn(`[operatingRoomBridge] ${label}`, e)
      return null
    }
  }

  return {
    async getGovernance() {
      return wrap('getGovernance', async () => {
        const raw = await fetchJson!<{ governance: unknown }>('/atlas-code/providers/governance')
        return adaptGovernance(raw.governance)
      })
    },

    async getOperatingRoom(obraId) {
      if (!fetchJson) return null
      try {
        const raw = await fetchJson<{ operating_room: unknown }>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/forge/operating-room`
        )
        return adaptOperatingRoom(raw.operating_room)
      } catch (e) {
        console.warn('[operatingRoomBridge] getOperatingRoom', e)
        return null
      }
    },

    async listWorkPackets(obraId) {
      if (!fetchJson) return []
      try {
        const raw = await fetchJson<{ data?: unknown[] }>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/work-packets`
        )
        return (raw.data ?? [])
          .map((item) => adaptWorkPacket(item))
          .filter((p): p is AtlasCodeWorkPacket => p !== null)
      } catch (e) {
        console.warn('[operatingRoomBridge] listWorkPackets', e)
        return []
      }
    },

    async createWorkPacket(obraId, payload) {
      return wrap('createWorkPacket', async () => {
        const raw = await fetchJson!<{ packet: unknown }>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/work-packets`,
          {
            method: 'POST',
            body: snakeCasePayload(payload),
          }
        )
        return adaptWorkPacket(raw.packet)
      })
    },

    async previewExport(obraId, packetId, providerId) {
      return wrap('previewExport', async () => {
        const raw = await fetchJson!<{
          packet: unknown
          prompt: string
          packet_md: string
          packet_md_status: string
          packet_md_path: string | null
        }>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/work-packets/${encodeURIComponent(packetId)}/export`,
          { method: 'POST', body: { provider_id: providerId } }
        )
        const packet = adaptWorkPacket(raw.packet)
        if (!packet) return null
        return {
          packet,
          prompt: String(raw.prompt ?? ''),
          packetMd: String(raw.packet_md ?? ''),
          packetMdStatus: String(raw.packet_md_status ?? 'unknown'),
          packetMdPath: raw.packet_md_path ?? null,
        }
      })
    },

    async listObservedSessions(obraId) {
      if (!fetchJson) return []
      try {
        const raw = await fetchJson<{ data?: unknown[] }>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/observed-sessions`
        )
        return (raw.data ?? [])
          .map((item) => adaptObservedSession(item))
          .filter((s): s is AtlasCodeObservedSession => s !== null)
      } catch (e) {
        console.warn('[operatingRoomBridge] listObservedSessions', e)
        return []
      }
    },

    async openObservedSession(obraId, workPacketId, providerId) {
      return wrap('openObservedSession', async () => {
        const raw = await fetchJson!<{ session: unknown }>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/observed-sessions`,
          { method: 'POST', body: { work_packet_id: workPacketId, provider_id: providerId } }
        )
        return adaptObservedSession(raw.session)
      })
    },

    async transitionObservedSession(obraId, sessionId, nextState) {
      return wrap('transitionObservedSession', async () => {
        const raw = await fetchJson!<{ session: unknown }>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/observed-sessions/${encodeURIComponent(sessionId)}/state`,
          { method: 'POST', body: { state: nextState } }
        )
        return adaptObservedSession(raw.session)
      })
    },

    async importObservedResult(obraId, sessionId, payload) {
      return wrap('importObservedResult', async () => {
        const body: Record<string, unknown> = { report_text: payload.reportText }
        if (payload.files !== undefined) body.files = payload.files
        if (payload.diffExcerpt !== undefined) body.diff_excerpt = payload.diffExcerpt
        const raw = await fetchJson!<{ session: unknown }>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/observed-sessions/${encodeURIComponent(sessionId)}/import`,
          { method: 'POST', body }
        )
        return adaptObservedSession(raw.session)
      })
    },

    async decideObservedSession(obraId, sessionId, action, reason) {
      return wrap('decideObservedSession', async () => {
        const body: Record<string, unknown> = { action }
        if (reason !== undefined) body.reason = reason
        const raw = await fetchJson!<{ session: unknown }>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/observed-sessions/${encodeURIComponent(sessionId)}/decide`,
          { method: 'POST', body }
        )
        return adaptObservedSession(raw.session)
      })
    },

    async runObservedSessionGates(obraId, sessionId) {
      return wrap('runObservedSessionGates', async () => {
        const raw = await fetchJson!<{ session: unknown }>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/observed-sessions/${encodeURIComponent(sessionId)}/run-gates`,
          { method: 'POST', body: {} }
        )
        return adaptObservedSession(raw.session)
      })
    },

    async quickOpenClaudeCodeObserved(obraId, payload, providerId = 'claude_code') {
      return wrap('quickOpenClaudeCodeObserved', async () => {
        const body = snakeCasePayload(payload)
        body.provider_id = providerId
        const raw = await fetchJson!<{ session: unknown; packet: unknown }>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/observed-sessions/claude-code`,
          { method: 'POST', body }
        )
        const session = adaptObservedSession(raw.session)
        const packet = adaptWorkPacket(raw.packet)
        if (!session || !packet) return null
        return { session, packet }
      })
    },
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Adapters · snake_case → camelCase with honest null fallbacks.

function snakeCasePayload(payload: AtlasCodeWorkPacketCreatePayload): Record<string, unknown> {
  const out: Record<string, unknown> = {
    objective: payload.objective,
    acceptance_criteria: payload.acceptanceCriteria,
  }
  if (payload.contextSummary !== undefined) out.context_summary = payload.contextSummary
  if (payload.allowedFiles !== undefined) out.allowed_files = payload.allowedFiles
  if (payload.forbiddenFiles !== undefined) out.forbidden_files = payload.forbiddenFiles
  if (payload.interfaces !== undefined) out.interfaces = payload.interfaces
  if (payload.constraints !== undefined) out.constraints = payload.constraints
  if (payload.verificationCommands !== undefined) out.verification_commands = payload.verificationCommands
  if (payload.reportFormat !== undefined) out.report_format = payload.reportFormat
  if (payload.stopRule !== undefined) out.stop_rule = payload.stopRule
  if (payload.roleSlot !== undefined) out.role_slot = payload.roleSlot
  if (payload.riskBand !== undefined) out.risk_band = payload.riskBand
  if (payload.taskCategory !== undefined) out.task_category = payload.taskCategory
  if (payload.evidenceRequired !== undefined) out.evidence_required = payload.evidenceRequired
  return out
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}
function asNullableString(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null
}
function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}
function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
}

function asPolicy(v: unknown, fallback: AtlasCodeClaudeProgrammaticPolicy = 'test_only'): AtlasCodeClaudeProgrammaticPolicy {
  if (typeof v !== 'string') return fallback
  return v === 'allowed_now' || v === 'test_only' || v === 'interactive_only' || v === 'blocked'
    ? v
    : fallback
}

function adaptGovernance(raw: unknown): AtlasCodeProviderGovernance | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const providersRaw = Array.isArray(r.providers) ? r.providers : []
  const labelDecisionsRaw = (r.label_decisions ?? {}) as Record<string, unknown>
  const labelDecisions: Record<string, AtlasCodeProgrammaticLabelDecision> = {}
  for (const [k, v] of Object.entries(labelDecisionsRaw)) {
    if (!v || typeof v !== 'object') continue
    const d = v as Record<string, unknown>
    labelDecisions[k] = {
      allowed: asBool(d.allowed, false),
      reason: asString(d.reason),
      nextAction: asString(d.next_action),
      requiresOperatorOverride: asBool(d.requires_operator_override, false),
    }
  }
  return {
    schemaVersion: asString(r.schema_version, 'atlas.code.provider_governance.v2'),
    claudeProgrammaticPolicy: asPolicy(r.claude_programmatic_policy),
    effectivePolicy: asPolicy(r.effective_policy, asPolicy(r.claude_programmatic_policy)),
    hardBlockAfter: asNullableString(r.hard_block_after),
    hardBlockAfterReached: asBool(r.hard_block_after_reached, false),
    allowRivalsProgrammatic: asBool(r.allow_rivals_programmatic, true),
    allowProgrammaticTests: asBool(r.allow_programmatic_tests, true),
    allowProductiveHeadless: asBool(r.allow_productive_headless, false),
    allowApiPayg: asBool(r.allow_api_payg, false),
    operatorOverrideRequired: asBool(r.operator_override_required, true),
    operatorOverrideLabels: asStringArray(r.operator_override_labels),
    operatorPresenceRequired: asBool(r.operator_presence_required, true),
    allowedInvocationModes: asStringArray(r.allowed_invocation_modes),
    allowedLabels: asStringArray(r.allowed_labels),
    labelDecisions,
    programmaticInvocationAllowed: asBool(r.programmatic_invocation_allowed, false),
    productiveHeadlessAllowed: asBool(r.productive_headless_allowed, false),
    interactiveOnly: asBool(r.interactive_only, false),
    fullBlock: asBool(r.full_block, false),
    providers: providersRaw
      .map((p) => {
        if (!p || typeof p !== 'object') return null
        const pr = p as Record<string, unknown>
        return {
          id: asString(pr.id),
          name: asString(pr.name, asString(pr.id)),
          family: asString(pr.family, 'unknown'),
          invocationMode: asString(pr.invocation_mode, 'interactive_observed'),
          binaryHint: asNullableString(pr.binary_hint),
          subscriptionStatus: asString(pr.subscription_status, 'allowed'),
          bootstrapRole: asNullableString(pr.bootstrap_role),
          notes: asString(pr.notes),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.id !== ''),
    bootstrapRoleAssignments: (() => {
      const src = r.bootstrap_role_assignments
      if (!src || typeof src !== 'object') return {}
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
        if (typeof v === 'string' && v !== '') out[k] = v
      }
      return out
    })(),
    apiKeyDetected: asBool(r.api_key_detected, false),
    safetyNotes: asStringArray(r.safety_notes),
  }
}

function adaptWorkPacket(raw: unknown): AtlasCodeWorkPacket | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = asString(r.id)
  if (id === '') return null
  return {
    schemaVersion: asString(r.schema_version, 'atlas.code.work_packet.v1'),
    id,
    obraId: asString(r.obra_id),
    obraTitle: asString(r.obra_title),
    workspaceSlug: asNullableString(r.workspace_slug),
    workspacePath: asNullableString(r.workspace_path),
    status: asString(r.status, 'draft'),
    objective: asString(r.objective),
    contextSummary: asString(r.context_summary),
    allowedFiles: asStringArray(r.allowed_files),
    forbiddenFiles: asStringArray(r.forbidden_files),
    interfaces: asStringArray(r.interfaces),
    constraints: asStringArray(r.constraints),
    acceptanceCriteria: asStringArray(r.acceptance_criteria),
    verificationCommands: asStringArray(r.verification_commands),
    reportFormat: asString(r.report_format),
    stopRule: asString(r.stop_rule),
    roleSlot: asString(r.role_slot, 'implementation_lead'),
    riskBand: asString(r.risk_band, 'medium'),
    taskCategory: asString(r.task_category, 'feature'),
    evidenceRequired: asStringArray(r.evidence_required),
    createdAt: asString(r.created_at),
    updatedAt: asString(r.updated_at),
    exportedAt: asNullableString(r.exported_at),
    packetMdPath: asNullableString(r.packet_md_path),
    promptHash: asNullableString(r.prompt_hash),
  }
}

function adaptObservedSession(raw: unknown): AtlasCodeObservedSession | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = asString(r.id)
  if (id === '') return null
  const gov = (r.governance ?? {}) as Record<string, unknown>
  const gs = (r.gates_summary ?? {}) as Record<string, unknown>
  const hd = r.human_decision
  const history = Array.isArray(r.state_history) ? r.state_history : []
  return {
    schemaVersion: asString(r.schema_version, 'atlas.code.observed_session.v1'),
    id,
    obraId: asString(r.obra_id),
    obraTitle: asString(r.obra_title),
    workPacketId: asString(r.work_packet_id),
    providerId: asString(r.provider_id),
    providerName: asString(r.provider_name),
    providerFamily: asString(r.provider_family),
    invocationMode: asString(r.invocation_mode, 'interactive_observed'),
    roleSlot: asString(r.role_slot, 'implementation_lead'),
    workspaceSlug: asNullableString(r.workspace_slug),
    workspacePath: asNullableString(r.workspace_path),
    packetMdPath: asNullableString(r.packet_md_path),
    packetMdStatus: asString(r.packet_md_status, 'unknown'),
    packetMdExcerpt: asString(r.packet_md_excerpt),
    prompt: asString(r.prompt),
    promptHash: asString(r.prompt_hash),
    terminalCommandHint: asNullableString(r.terminal_command_hint),
    state: asString(r.state, 'waiting_operator') as AtlasCodeObservedSession['state'],
    stateHistory: history
      .map((h) => {
        if (!h || typeof h !== 'object') return null
        const e = h as Record<string, unknown>
        return {
          state: asString(e.state, 'waiting_operator') as AtlasCodeObservedSession['state'],
          at: asString(e.at),
          reason: asString(e.reason),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    operatorOpenedTerminalAt: asNullableString(r.operator_opened_terminal_at),
    operatorMarkedRunningAt: asNullableString(r.operator_marked_running_at),
    resultImportedAt: asNullableString(r.result_imported_at),
    reportText: asNullableString(r.report_text),
    reportFiles: asStringArray(r.report_files),
    diffExcerpt: asNullableString(r.diff_excerpt),
    diffHash: asNullableString(r.diff_hash),
    gates: Array.isArray(r.gates)
      ? r.gates
          .map((g): AtlasCodeObservedGateResult | null => {
            if (!g || typeof g !== 'object') return null
            const e = g as Record<string, unknown>
            const gateId = asString(e.gate_id ?? e.gateId)
            if (gateId === '') return null
            const violationsRaw = Array.isArray(e.violations) ? e.violations : []
            const commandsRaw = e.commands
            return {
              gateId,
              status: asString(e.status, 'unsupported'),
              detail: asString(e.detail),
              violations: violationsRaw
                .map((v) => {
                  if (!v || typeof v !== 'object') return null
                  const vr = v as Record<string, unknown>
                  return { file: asString(vr.file), reason: asString(vr.reason) }
                })
                .filter((x): x is { file: string; reason: string } => x !== null && x.file !== ''),
              commands: Array.isArray(commandsRaw)
                ? commandsRaw.filter((c): c is string => typeof c === 'string')
                : undefined,
              allowedFilesDeclared:
                typeof e.allowed_files_declared === 'number'
                  ? (e.allowed_files_declared as number)
                  : undefined,
              reportFilesListed:
                typeof e.report_files_listed === 'number'
                  ? (e.report_files_listed as number)
                  : undefined,
            }
          })
          .filter((g): g is AtlasCodeObservedGateResult => g !== null)
      : [],
    gatesSummary: {
      total: asNumber(gs.total),
      passed: asNumber(gs.passed),
      failed: asNumber(gs.failed),
      pending: asNumber(gs.pending),
      unsupported: typeof gs.unsupported === 'number' ? (gs.unsupported as number) : 0,
    },
    gatesEvaluatedAt: asNullableString(r.gates_evaluated_at),
    scopeGuard:
      r.scope_guard && typeof r.scope_guard === 'object'
        ? (() => {
            const sg = r.scope_guard as Record<string, unknown>
            const v = Array.isArray(sg.violations) ? sg.violations : []
            return {
              status: asString(sg.status, 'unsupported'),
              summary: asString(sg.summary),
              violations: v
                .map((entry) => {
                  if (!entry || typeof entry !== 'object') return null
                  const vr = entry as Record<string, unknown>
                  return { file: asString(vr.file), reason: asString(vr.reason) }
                })
                .filter((x): x is { file: string; reason: string } => x !== null && x.file !== ''),
            } satisfies AtlasCodeObservedScopeGuard
          })()
        : null,
    humanDecision:
      hd && typeof hd === 'object'
        ? {
            action: asString((hd as Record<string, unknown>).action) as 'accept',
            reason: asNullableString((hd as Record<string, unknown>).reason),
            decidedAt: asString((hd as Record<string, unknown>).decided_at),
          }
        : null,
    blockerReason: asNullableString(r.blocker_reason),
    createdAt: asString(r.created_at),
    updatedAt: asString(r.updated_at),
    governance: {
      claudeProgrammaticPolicy: asPolicy(gov.claude_programmatic_policy),
      effectivePolicy: asPolicy(gov.effective_policy, asPolicy(gov.claude_programmatic_policy)),
      programmaticInvocationAllowed: asBool(gov.programmatic_invocation_allowed, false),
      productiveHeadlessAllowed: asBool(gov.productive_headless_allowed, false),
      interactiveOnly: asBool(gov.interactive_only, false),
      invocationModeAllowed: asBool(gov.invocation_mode_allowed, true),
      invocationMode: asString(gov.invocation_mode, 'interactive_observed'),
    },
  }
}

function adaptOperatingRoom(raw: unknown): AtlasCodeProviderOperatingRoom | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const obra = (r.obra ?? {}) as Record<string, unknown>
  const governance = adaptGovernance(r.governance)
  if (!governance) return null
  const board = Array.isArray(r.provider_board) ? r.provider_board : []
  const wpRaw = (r.work_packets ?? {}) as Record<string, unknown>
  const osRaw = (r.observed_sessions ?? {}) as Record<string, unknown>
  const attentionRaw = (r.attention ?? {}) as Record<string, unknown>
  const safetyRaw = (r.safety_summary ?? {}) as Record<string, unknown>

  const adaptByStatus = (input: unknown): Record<string, AtlasCodeWorkPacket[]> => {
    if (!input || typeof input !== 'object') return {}
    const out: Record<string, AtlasCodeWorkPacket[]> = {}
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (!Array.isArray(v)) continue
      out[k] = v.map(adaptWorkPacket).filter((p): p is AtlasCodeWorkPacket => p !== null)
    }
    return out
  }
  const adaptByState = (input: unknown): Record<string, AtlasCodeObservedSession[]> => {
    if (!input || typeof input !== 'object') return {}
    const out: Record<string, AtlasCodeObservedSession[]> = {}
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (!Array.isArray(v)) continue
      out[k] = v.map(adaptObservedSession).filter((s): s is AtlasCodeObservedSession => s !== null)
    }
    return out
  }

  const wpCounts = (wpRaw.counts ?? {}) as Record<string, unknown>
  const osCounts = (osRaw.counts ?? {}) as Record<string, unknown>

  const attention: AtlasCodeProviderOperatingRoomAttention = {
    kind: asString(attentionRaw.kind, 'idle'),
    severity: asString(attentionRaw.severity, 'none'),
    humanQuestion: asString(attentionRaw.human_question),
    whyNow: asString(attentionRaw.why_now),
    recommendedAction: asNullableString(attentionRaw.recommended_action),
    allowedActions: asStringArray(attentionRaw.allowed_actions),
    targetSessionId: asNullableString(attentionRaw.target_session_id),
    targetPacketId: asNullableString(attentionRaw.target_packet_id),
  }

  const labelDecisionsRaw = Array.isArray(safetyRaw.label_decisions) ? safetyRaw.label_decisions : []
  const labelDecisions: AtlasCodeProviderOperatingRoomLabelDecision[] = labelDecisionsRaw
    .map((d) => {
      if (!d || typeof d !== 'object') return null
      const e = d as Record<string, unknown>
      return {
        label: asString(e.label),
        allowed: asBool(e.allowed, false),
        reason: asString(e.reason),
        nextAction: asString(e.next_action),
        requiresOperatorOverride: asBool(e.requires_operator_override, false),
      }
    })
    .filter((x): x is AtlasCodeProviderOperatingRoomLabelDecision => x !== null && x.label !== '')

  const safety: AtlasCodeProviderOperatingRoomSafety = {
    claudeProgrammaticPolicy: asPolicy(safetyRaw.claude_programmatic_policy),
    effectivePolicy: asPolicy(safetyRaw.effective_policy, asPolicy(safetyRaw.claude_programmatic_policy)),
    hardBlockAfter: asNullableString(safetyRaw.hard_block_after),
    hardBlockAfterReached: asBool(safetyRaw.hard_block_after_reached, false),
    programmaticInvocationAllowed: asBool(safetyRaw.programmatic_invocation_allowed, false),
    productiveHeadlessAllowed: asBool(safetyRaw.productive_headless_allowed, false),
    interactiveOnly: asBool(safetyRaw.interactive_only, false),
    fullBlock: asBool(safetyRaw.full_block, false),
    allowRivalsProgrammatic: asBool(safetyRaw.allow_rivals_programmatic, false),
    allowProgrammaticTests: asBool(safetyRaw.allow_programmatic_tests, false),
    allowProductiveHeadless: asBool(safetyRaw.allow_productive_headless, false),
    allowApiPayg: asBool(safetyRaw.allow_api_payg, false),
    apiKeyDetected: asBool(safetyRaw.api_key_detected, false),
    workspacePathResolved: asBool(safetyRaw.workspace_path_resolved, false),
    workspacePath: asNullableString(safetyRaw.workspace_path),
    executionBlocked: asBool(safetyRaw.execution_blocked, false),
    blockers: asStringArray(safetyRaw.blockers),
    labelDecisions,
    allowedLabels: asStringArray(safetyRaw.allowed_labels),
    completionLaw: asString(safetyRaw.completion_law),
    neverSilentFallback: asBool(safetyRaw.never_silent_fallback, true),
    neverApiPaygWithoutExplicitAuthorization: asBool(
      safetyRaw.never_api_payg_without_explicit_authorization,
      true
    ),
  }

  return {
    schemaVersion: asString(r.schema_version, 'atlas.code.provider_operating_room.v1'),
    generatedAt: asString(r.generated_at),
    obra: {
      id: asString(obra.id),
      title: asString(obra.title),
      workspaceSlug: asNullableString(obra.workspace_slug),
      workspacePath: asNullableString(obra.workspace_path),
      workspacePathExists: asBool(obra.workspace_path_exists, false),
      status: asString(obra.status, 'active'),
    },
    governance,
    providerBoard: board
      .map((b): AtlasCodeProviderOperatingRoomBoardSlot | null => {
        if (!b || typeof b !== 'object') return null
        const x = b as Record<string, unknown>
        const ls = x.latest_session
        return {
          roleSlot: asString(x.role_slot),
          providerId: asString(x.provider_id),
          providerName: asString(x.provider_name),
          invocationMode: asString(x.invocation_mode, 'interactive_observed'),
          family: asString(x.family),
          binaryHint: asNullableString(x.binary_hint),
          assignmentSource: asString(x.assignment_source, 'bootstrap'),
          subscriptionStatus: asString(x.subscription_status, 'allowed'),
          confidence: asString(x.confidence, 'low_bootstrap'),
          latestSession:
            ls && typeof ls === 'object'
              ? {
                  id: asString((ls as Record<string, unknown>).id),
                  state: asString(
                    (ls as Record<string, unknown>).state,
                    'waiting_operator'
                  ) as AtlasCodeObservedSession['state'],
                  workPacketId: asString((ls as Record<string, unknown>).work_packet_id),
                  updatedAt: asString((ls as Record<string, unknown>).updated_at),
                }
              : null,
          activeSessionCount: asNumber(x.active_session_count),
        }
      })
      .filter((s): s is AtlasCodeProviderOperatingRoomBoardSlot => s !== null),
    workPackets: {
      all: Array.isArray(wpRaw.all)
        ? wpRaw.all.map(adaptWorkPacket).filter((p): p is AtlasCodeWorkPacket => p !== null)
        : [],
      byStatus: adaptByStatus(wpRaw.by_status),
      counts: {
        total: asNumber(wpCounts.total),
        draft: asNumber(wpCounts.draft),
        ready: asNumber(wpCounts.ready),
        exported: asNumber(wpCounts.exported),
      },
    },
    observedSessions: {
      all: Array.isArray(osRaw.all)
        ? osRaw.all.map(adaptObservedSession).filter((s): s is AtlasCodeObservedSession => s !== null)
        : [],
      byState: adaptByState(osRaw.by_state),
      counts: {
        total: asNumber(osCounts.total),
        waitingOperator: asNumber(osCounts.waiting_operator),
        running: asNumber(osCounts.running),
        waitingResultImport: asNumber(osCounts.waiting_result_import),
        imported: asNumber(osCounts.imported),
        reviewRequired: asNumber(osCounts.review_required),
        accepted: asNumber(osCounts.accepted),
        rejected: asNumber(osCounts.rejected),
        repairRequired: asNumber(osCounts.repair_required),
        blocked: asNumber(osCounts.blocked),
      },
    },
    attention,
    safetySummary: safety,
    allowedActions: asStringArray(r.allowed_actions),
  }
}
