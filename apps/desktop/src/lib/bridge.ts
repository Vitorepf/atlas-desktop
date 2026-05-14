/**
 * apps/desktop/src/lib/bridge.ts
 *
 * Single transport boundary the React shell talks to. Dispatch order:
 *   1. Tauri    → invoke() the matching `bridge_*` command in atlas-tauri
 *   2. HTTP     → fetch() against atlas-server (browser mode when
 *                 VITE_ATLAS_SERVER_URL is set)
 *   3. Offline  → returns honest empty values for read-only calls
 *
 * CANON · Atlas Code usa somente dados reais ou estados vazios explícitos.
 *   When neither Tauri nor HTTP is reachable, we DO NOT invent records.
 *   Components render empty states. Mutating calls throw explicit offline
 *   errors so the UI never pretends that the Kernel accepted work.
 */

import type {
  AtlasCodeEnterpriseCertificationReport,
  AtlasCodeForgeCompletionClaim,
  AtlasCodeForgeFastPathRunStatus,
  AtlasCodeForgeFastPathSnapshot,
  AtlasCodeForgeReviewDecisionResponse,
  AtlasCodeForgeReviewPacket,
  AtlasCodeForgeUxOrchestrator,
  AtlasCodeObraCommandCenter,
  AtlasCodeObraCommandCenterPhase,
  AtlasCodeObraCommandCenterMilestone,
  AtlasCodeObraCommandCenterProgress,
  AtlasCodeObraCommandCenterProgressItem,
  AtlasCodeObraCommandCenterDecision,
  AtlasCodeObraCommandCenterBlockerSummary,
  AtlasCodeObraCommandCenterOperationalHealth,
  AtlasCodeObraCommandCenterTrustSummary,
  AtlasCodeObraCommandCenterEvidenceDigest,
  AtlasCodeForgeWorkIntake,
  AtlasCodeForgeWorkIntakePayload,
  AtlasForgeContinuumCertification,
  AtlasForgeContinuumCertificationSummary,
  AtlasForgeProviderCapacity,
  AtlasForgeProviderCapacityEntry,
  AtlasForgeProviderFailureMemory,
  AtlasForgeProviderFailureMemoryEvent,
  AtlasSelfImprovementGovernanceState,
  AtlasSelfImprovementStrategyPortfolioBucket,
  AtlasSelfImprovementStrategyPortfolioSnapshot,
  AtlasSelfImprovementTrustLedgerEntry,
  AtlasSelfImprovementTrustLedgerSnapshot,
  AtlasForgeProviderFallbackEntry,
  AtlasForgeProviderFallbackEvent,
  AtlasForgeProviderRole,
  AtlasForgeProviderTopology,
  AtlasForgeProviderDriverStatus,
  AtlasForgeProviderDriverEntry,
  AtlasForgeProviderDriverPlanPacket,
  AtlasForgeProviderInvocationSnapshot,
  AtlasForgeProviderInvocationReceipt,
  AtlasForgeRuntimeDispatchPlan,
  AtlasSelfImprovementForgeActivationState,
  AtlasSelfImprovementActivationCockpit,
  AtlasSelfImprovementActivationCockpitFilters,
  AtlasSelfImprovementActivationListItem,
  AtlasSelfImprovementActivationDetail,
  AtlasSelfImprovementActivationProposalSummary,
  AtlasSelfImprovementActivationPowerGate,
  AtlasSelfImprovementActivationBeforeSnapshot,
  AtlasSelfImprovementActivationApprovalReceipt,
  AtlasSelfImprovementActivationRejection,
  AtlasSelfImprovementActivationCreatedObra,
  AtlasSelfImprovementActivationOpenObraAction,
  AtlasSelfImprovementActivationAcceptPayload,
  AtlasSelfImprovementActivationRejectPayload,
  AtlasSelfImprovementActivationCreatePayload,
  AtlasSelfImprovementActivationStatus,
  AtlasSelfImprovementActivationTone,
  AtlasSelfImprovementActivationPowerGateOutcome,
  BootSnapshot,
  CartographyGraph,
  CartographyNote,
  CoreStatus,
  DecisionReceipt,
  McpStatus,
  Message,
  Obra,
  Packet,
  ProgrammingEvidenceReceiptSnapshot,
  ProgrammingEvidenceStorage,
  ProgrammingGateRunSnapshot,
  ProgrammingGovernanceSnapshot,
  ProgrammingScopeMode,
  ProgrammingTaskContract,
  ProgrammingWorkItemGap,
  ProgrammingWorkItemSnapshot,
  ProgrammingWorkStatus,
  QualityGate,
  RecentChange,
  Session,
  WorkStateSnapshot,
} from '@atlas/domain'

import {
  browserCoreStatus,
  noGates,
  noMessages,
  noPackets,
  noSessions,
} from '../data/empty'

// ──────────────────────────────────────────────────────────────────────────
// Mode detection

export type BridgeMode = 'tauri' | 'http' | 'offline'

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
  }
}

export function detectMode(): BridgeMode {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    return 'tauri'
  }
  if (import.meta.env.VITE_ATLAS_SERVER_URL) {
    return 'http'
  }
  return 'offline'
}

const MODE: BridgeMode = detectMode()
const HTTP_BASE = (import.meta.env.VITE_ATLAS_SERVER_URL as string | undefined) ?? ''

// ──────────────────────────────────────────────────────────────────────────
// Tauri / HTTP / Offline dispatch helpers

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const tauri = await import('@tauri-apps/api/core')
  return tauri.invoke<T>(cmd, args)
}

async function fetchHttp<T>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
  if (token) headers['X-Atlas-Token'] = token

  const response = await fetch(`${HTTP_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`bridge http ${response.status}: ${body.slice(0, 120)}`)
  }
  return parseJsonBody<T>(await response.text())
}

function parseJsonBody<T>(body: string): T {
  try {
    return JSON.parse(body) as T
  } catch (firstError) {
    const objectStart = body.indexOf('{')
    const arrayStart = body.indexOf('[')
    const start =
      objectStart < 0 ? arrayStart : arrayStart < 0 ? objectStart : Math.min(objectStart, arrayStart)
    if (start < 0) throw firstError
    return JSON.parse(body.slice(start)) as T
  }
}

/** Throws explicitly when offline so useBridge can report errors honestly. */
function offline(method: string): never {
  throw new Error(`offline · ${method} · neither Tauri nor VITE_ATLAS_SERVER_URL configured`)
}

function atlasCodeForgePayload(obraId?: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    app_surface: 'atlas_code',
    surface_id: 'atlas_code',
    requires_obra: true,
    atlas_mode: 'forge',
    current_mode: 'forge',
    atlas_workflow_mode: 'forge',
    domain_id: 'programming',
    flow_id: 'programming.forge',
    routing_domain: 'programming',
    routing_task: 'forge',
    programming_profile: 'forge',
    programming_flow: 'programming.forge',
    dev_execution_plan: {
      programming_profile: 'forge',
      programming_flow: 'programming.forge',
      operator_options: {
        complete: true,
        auto_test: true,
      },
    },
  }

  if (obraId) {
    payload.obra_id = obraId
    payload.work_id = obraId
    payload.project_id = obraId
    payload.forge_workspace = {
      schema_version: 'atlas.forge_workspace_binding.v1',
      workspace_kind: 'obras_shared_workspace',
      specialization: 'forge_workspace',
      obra_id: obraId,
      source: 'atlas_code',
    }
  }

  return payload
}

// ──────────────────────────────────────────────────────────────────────────
// DTO types crossing the bridge (camelCase)

export interface HealthDto {
  kernel: string
  providers: string[]
  mcp: string[]
  queue: number
}

export interface SignedReceiptAck {
  decisionId: string
  signatureValid: boolean
  ledgerEventId: string
  canonicalSha256?: string
}

export interface ReceiptSignaturePayload {
  signature: string
  publicKey: string
  signedAt: string
  signerId: string
}

export interface EvidenceDto {
  id: string
  obraId: string
  kind: string
  summary: string
  createdAt: string
}

export interface ApplyDiffAck {
  engineeringRunId: string
  diffApplied: boolean
  gatesRunning: string[]
  streamUrl: string
}

export interface StreamEventDto {
  eventType: string
  sequence: number
  content: unknown
  metadata: unknown
}

// ──────────────────────────────────────────────────────────────────────────
// Bridge surface · all the real production-readiness slots

export const bridge = {
  mode: MODE as BridgeMode,

  // 0 · core status
  async coreStatus(): Promise<CoreStatus> {
    if (MODE === 'tauri') return invokeTauri<CoreStatus>('atlas_core_status')
    return browserCoreStatus
  },

  // 0a · unified boot snapshot · GET /atlas-code/boot
  async boot(): Promise<BootSnapshot | null> {
    try {
      let raw: unknown
      if (MODE === 'tauri') raw = await invokeTauri<unknown>('bridge_boot')
      else if (MODE === 'http') raw = await fetchHttp<unknown>('/atlas-code/boot')
      else return null
      return adaptBoot(raw)
    } catch (e) {
      console.warn('[bridge] boot offline', e)
      return null
    }
  },

  // 0b · MCP pill · GET /atlas-code/mcp/status
  async mcpStatus(): Promise<McpStatus | null> {
    try {
      let raw: unknown
      if (MODE === 'tauri') raw = await invokeTauri<unknown>('bridge_mcp_status')
      else if (MODE === 'http') raw = await fetchHttp<unknown>('/atlas-code/mcp/status')
      else return null
      return adaptMcpStatus(raw)
    } catch {
      return null
    }
  },

  // 0c · product-level Atlas Code enterprise certification
  async getAtlasCodeEnterpriseCertification(): Promise<AtlasCodeEnterpriseCertificationReport | null> {
    try {
      let raw: unknown
      if (MODE === 'tauri') {
        raw = await invokeTauri<unknown>('bridge_get_atlas_code_enterprise_certification')
      } else if (MODE === 'http') {
        raw = await fetchHttp<unknown>('/atlas-code/certification')
      } else {
        return null
      }

      return adaptNullableAtlasCodeEnterpriseCertification(raw)
    } catch (e) {
      console.warn('[bridge] getAtlasCodeEnterpriseCertification', e)
      return null
    }
  },

  async runAtlasCodeEnterpriseCertification(): Promise<AtlasCodeEnterpriseCertificationReport> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_run_atlas_code_enterprise_certification', {
        keepWorkspace: false,
      })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>('/atlas-code/certification', {
        method: 'POST',
        body: { keep_workspace: false },
      })
    } else {
      offline('runAtlasCodeEnterpriseCertification')
    }

    return adaptAtlasCodeEnterpriseCertification(raw)
  },

  // 1 · health
  async health(): Promise<HealthDto> {
    if (MODE === 'tauri') return invokeTauri<HealthDto>('bridge_health')
    if (MODE === 'http') return fetchHttp<HealthDto>('/health')
    return { kernel: 'offline', providers: [], mcp: [], queue: 0 }
  },

  // 2 · list obras (V2 wrapper · normalized)
  async listObras(): Promise<Obra[]> {
    try {
      let raw: unknown
      if (MODE === 'tauri') {
        raw = await invokeTauri<unknown>('bridge_list_works')
      } else if (MODE === 'http') {
        raw = await fetchHttp<unknown>('/atlas-code/works')
      } else {
        return []
      }
      return normaliseObras(raw)
    } catch (e) {
      console.warn('[bridge] listObras', e)
      return []
    }
  },

  // 3 · create obra · V2 wrapper /atlas-code/works
  async createObra(intent: string, objective: string, domain = 'atlas'): Promise<Obra> {
    if (MODE === 'tauri') {
      const raw = await invokeTauri<unknown>('bridge_create_work', { intent, objective, domain })
      return normaliseObras(raw)[0] ?? offline('createObra')
    }
    if (MODE === 'http') {
      const wrap = await fetchHttp<{ work?: Record<string, unknown> }>('/atlas-code/works', {
        method: 'POST',
        body: { intent, objective, domain },
      })
      return normaliseObras([wrap.work])[0] ?? offline('createObra')
    }
    offline('createObra')
  },

  // 3b · /atlas-code/works/{id}/state — full snapshot for cockpit
  async getWorkState(workId: string): Promise<WorkStateSnapshot | null> {
    try {
      let raw: unknown
      if (MODE === 'tauri') raw = await invokeTauri<unknown>('bridge_get_work_state', { workId })
      else if (MODE === 'http') raw = await fetchHttp<unknown>(`/atlas-code/works/${encodeURIComponent(workId)}/state`)
      else return null
      return adaptWorkState(raw)
    } catch (e) {
      console.warn('[bridge] getWorkState', e)
      return null
    }
  },

  // 4 · list sessions for obra
  async listSessions(obraId: string): Promise<Session[]> {
    try {
      let raw: unknown
      if (MODE === 'tauri') raw = await invokeTauri<unknown>('bridge_list_sessions', { obraId })
      else if (MODE === 'http') raw = await fetchHttp<unknown>(`/atlas-code/works/${obraId}/sessions`)
      else return []
      return normaliseSessions(raw)
    } catch (e) {
      console.warn('[bridge] listSessions', e)
      return []
    }
  },

  // 5 · get session messages (V2 thread wrapper)
  async getSession(threadId: string): Promise<Message[]> {
    try {
      let raw: { messages?: unknown[] } | undefined
      if (MODE === 'tauri') raw = await invokeTauri<{ messages?: unknown[] }>('bridge_get_thread', { threadId })
      else if (MODE === 'http') raw = await fetchHttp<{ messages?: unknown[] }>(`/atlas-code/threads/${threadId}`)
      else return noMessages
      return normaliseMessages(raw?.messages ?? [])
    } catch {
      return noMessages
    }
  },

  // 6 · stream session events
  /**
   * Tauri: registers listener FIRST, then invokes backend stream command —
   *        any events emitted before the listener resolves are buffered and
   *        replayed in order. Cancellation via the returned closure is safe
   *        before, during or after the invoke.
   * HTTP : opens an EventSource directly.
   * Offline: no-op.
   */
  streamSession(traceId: string, onEvent: (event: StreamEventDto) => void): () => void {
    if (MODE === 'tauri') {
      let unlisten: (() => void) | null = null
      let cancelled = false
      const buffer: StreamEventDto[] = []
      let active = false
      const flush = (ev: StreamEventDto) => {
        if (cancelled) return
        if (active) onEvent(ev)
        else buffer.push(ev)
      }
      void (async () => {
        try {
          const eventApi = await import('@tauri-apps/api/event')
          const tauri = await import('@tauri-apps/api/core')
          if (cancelled) return
          unlisten = await eventApi.listen<StreamEventDto>(
            `bridge://stream/${traceId}`,
            (e) => flush(e.payload),
          )
          if (cancelled) {
            unlisten()
            unlisten = null
            return
          }
          active = true
          while (buffer.length > 0) {
            const ev = buffer.shift()!
            onEvent(ev)
          }
          await tauri.invoke('bridge_stream_session', { traceId, afterSequence: null })
        } catch (e) {
          console.warn('[bridge] streamSession tauri failed', e)
        }
      })()
      return () => {
        cancelled = true
        if (unlisten) {
          unlisten()
          unlisten = null
        }
      }
    }
    if (MODE === 'http') {
      const es = new EventSource(`${HTTP_BASE}/ai/interactions/${traceId}/stream`)
      es.onmessage = (msg) => {
        try {
          onEvent(JSON.parse(msg.data) as StreamEventDto)
        } catch {
          /* ignore malformed frame */
        }
      }
      return () => es.close()
    }
    return () => {
      /* offline · nothing to unsubscribe */
    }
  },

  // 7 · send intent · returns the AiTrace (async — the actual assistant
  // message arrives later via the queue worker). Caller polls getSession
  // to pull the new messages.
  async sendIntent(
    threadId: string | null,
    body: string,
    channel = 'text',
    obraId?: string
  ): Promise<{ traceId: string; threadId?: string }> {
    if (MODE === 'tauri') {
      const res = await invokeTauri<{ trace?: { id?: string; thread_id?: string; threadId?: string } }>('bridge_send_intent_v2', {
        threadId: threadId ?? null,
        body,
        channel,
        obraId: obraId ?? null,
      })
      return normaliseTraceEnvelope(res, threadId)
    }
    if (MODE === 'http') {
      const payload: Record<string, unknown> = {
        input_text: body,
        source_type: 'app',
        kind: 'interaction',
        payload: atlasCodeForgePayload(obraId),
      }
      if (threadId) payload.thread_id = threadId
      else payload.new_thread = true
      if (obraId) payload.source_id = obraId
      const res = await fetchHttp<{ trace?: { id?: string; thread_id?: string } }>('/ai/interactions', {
        method: 'POST',
        body: payload,
      })
      return normaliseTraceEnvelope(res, threadId)
    }
    offline('sendIntent')
  },

  // 8 · get receipt v2 · /atlas-code/decisions/{id}/receipt
  async getReceipt(decisionId: string): Promise<DecisionReceipt | null> {
    try {
      let raw: unknown
      if (MODE === 'tauri') raw = await invokeTauri<unknown>('bridge_get_receipt_v2', { decisionId })
      else if (MODE === 'http') raw = await fetchHttp<unknown>(`/atlas-code/decisions/${decisionId}/receipt`)
      else return null
      return adaptReceipt(raw)
    } catch {
      return null
    }
  },

  // 9 · sign receipt · canonical ed25519 (Tauri-only when sodium present)
  async signReceipt(decisionId: string, signature: ReceiptSignaturePayload): Promise<SignedReceiptAck> {
    if (MODE === 'tauri') {
      // Verifies ed25519 round-trip on server; UI's actual signing entry
      // point is signCanonical() above which builds `signature` first.
      return invokeTauri<SignedReceiptAck>('bridge_sign_receipt', { decisionId, signature })
    }
    if (MODE === 'http') {
      return fetchHttp<SignedReceiptAck>(`/atlas-code/decisions/${decisionId}/sign`, {
        method: 'POST',
        body: signature,
      })
    }
    offline('signReceipt')
  },

  /** Build canonical ed25519 signature locally (Tauri only). */
  async signCanonical(decisionId: string, signerId?: string): Promise<ReceiptSignaturePayload> {
    if (MODE !== 'tauri') {
      offline('signCanonical · only available in Tauri (native ed25519)')
    }
    return invokeTauri<ReceiptSignaturePayload>('sign_canonical', { decisionId, signerId })
  },

  /** Convenience: sign + send the signature in one call. */
  async signAndSubmit(decisionId: string, signerId?: string): Promise<SignedReceiptAck> {
    const sig = await this.signCanonical(decisionId, signerId)
    return this.signReceipt(decisionId, sig)
  },

  // 10 · list evidence by obra
  async listEvidence(obraId: string): Promise<EvidenceDto[]> {
    try {
      let raw: { data?: unknown[] } | unknown[] | undefined
      if (MODE === 'tauri') raw = await invokeTauri<{ data?: unknown[] } | unknown[]>('bridge_list_evidence', { obraId })
      else if (MODE === 'http') raw = await fetchHttp<{ data?: unknown[] }>(`/atlas-code/works/${obraId}/evidence`)
      else return []
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
      return list.map((e) => {
        const r = (e ?? {}) as Record<string, unknown>
        return {
          id: String(r.id ?? ''),
          obraId: String(r.obraId ?? r.obra_id ?? obraId),
          kind: String(r.kind ?? 'evidence'),
          summary: String(r.summary ?? ''),
          createdAt: String(r.createdAt ?? r.created_at ?? ''),
        }
      })
    } catch {
      return []
    }
  },

  // 10b · run Forge Live Execution for selected Obra
  async runForgeLiveExecution(obraId: string, simulateFailure = false): Promise<WorkStateSnapshot['forgeLiveExecution']> {
    if (MODE === 'tauri') {
      const raw = await invokeTauri<unknown>('bridge_run_forge_live_execution', {
        workId: obraId,
        simulateFailure,
      })
      return adaptForgeLiveExecutionEnvelope(raw)
    }
    if (MODE === 'http') {
      const raw = await fetchHttp<unknown>(`/atlas-code/works/${encodeURIComponent(obraId)}/forge/live-executions`, {
        method: 'POST',
        body: { simulate_failure: simulateFailure },
      })
      return adaptForgeLiveExecutionEnvelope(raw)
    }
    offline('runForgeLiveExecution')
  },

  // 10b.1 · start queued Forge Live Execution for selected Obra
  async startForgeLiveExecutionAsync(obraId: string, simulateFailure = false): Promise<WorkStateSnapshot['forgeLiveExecutionAsync']> {
    if (MODE === 'tauri') {
      const raw = await invokeTauri<unknown>('bridge_start_forge_live_execution_async', {
        workId: obraId,
        simulateFailure,
      })
      return adaptForgeLiveExecutionAsyncEnvelope(raw)
    }
    if (MODE === 'http') {
      const raw = await fetchHttp<unknown>(`/atlas-code/works/${encodeURIComponent(obraId)}/forge/live-executions/async`, {
        method: 'POST',
        body: { simulate_failure: simulateFailure },
      })
      return adaptForgeLiveExecutionAsyncEnvelope(raw)
    }
    offline('startForgeLiveExecutionAsync')
  },

  // 10b.2 · poll queued Forge Live Execution by id
  async getForgeLiveExecutionAsync(
    obraId: string,
    executionId: string
  ): Promise<{
    execution: WorkStateSnapshot['forgeLiveExecutionAsync']
    snapshot: WorkStateSnapshot['forgeLiveExecution']
  }> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_live_execution_async', {
        workId: obraId,
        executionId,
      })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/live-executions/${encodeURIComponent(executionId)}`,
      )
    } else {
      offline('getForgeLiveExecutionAsync')
    }

    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return {
      execution: adaptForgeLiveExecutionAsyncEnvelope(raw),
      snapshot: adaptForgeLiveExecution(r.snapshot ?? r.forge_live_execution ?? r.forgeLiveExecution),
    }
  },

  // 10b.3 · read-only replay packet for historical Forge Live Execution
  async getForgeRunHistoryReplay(obraId: string, historyId: string): Promise<WorkStateSnapshot['forgeRunHistoryReplay']> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_run_history_replay', {
        workId: obraId,
        historyId,
      })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/live-executions/history/${encodeURIComponent(historyId)}`,
      )
    } else {
      offline('getForgeRunHistoryReplay')
    }
    return adaptForgeRunHistoryReplay(raw)
  },

  // 10b.4 · create or reuse governed Programming WorkItem for selected Obra
  async createProgrammingWorkItem(obraId: string, intent?: string): Promise<ProgrammingGovernanceSnapshot | null> {
    let raw: unknown
    const body = intent ? { intent } : {}
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_create_programming_work_item', {
        workId: obraId,
        intent: intent ?? null,
      })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(`/atlas-code/works/${encodeURIComponent(obraId)}/programming/work-items`, {
        method: 'POST',
        body,
      })
    } else {
      offline('createProgrammingWorkItem')
    }

    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return adaptProgrammingGovernance(r.programming_governance ?? r.programmingGovernance)
  },

  // 10b.5 · compile and attach governed Spec/Plan/Tasks for selected WorkItem
  async compileProgrammingWorkItemSpecPlan(
    obraId: string,
    workItemId: string
  ): Promise<ProgrammingGovernanceSnapshot | null> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_compile_programming_work_item_spec_plan', {
        workId: obraId,
        workItemId,
      })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/programming/work-items/${encodeURIComponent(workItemId)}/spec`,
        { method: 'POST', body: {} },
      )
    } else {
      offline('compileProgrammingWorkItemSpecPlan')
    }

    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return adaptProgrammingGovernance(r.programming_governance ?? r.programmingGovernance)
  },

  // 10b.6 · Atlas Code Forge Operator Fast Path v1
  // Orquestra Obra → WorkItem → Spec/Plan/Tasks → Forge Live Execution (async/sync) → Checkpoint.
  // Schema canonico: atlas.code.forge_fast_path.v1
  async runForgeFastPath(
    obraId: string,
    options: {
      mode?: 'prepare_only' | 'execute_async' | 'execute_sync'
      intent?: string
      autoCreateWorkItem?: boolean
      autoCompileSpecPlan?: boolean
      startExecution?: boolean
      createCheckpoint?: boolean
    } = {}
  ): Promise<AtlasCodeForgeFastPathSnapshot> {
    const body: Record<string, unknown> = {
      mode: options.mode ?? 'execute_async',
    }
    if (options.intent) body.intent = options.intent
    if (options.autoCreateWorkItem !== undefined) body.auto_create_work_item = options.autoCreateWorkItem
    if (options.autoCompileSpecPlan !== undefined) body.auto_compile_spec_plan = options.autoCompileSpecPlan
    if (options.startExecution !== undefined) body.start_execution = options.startExecution
    if (options.createCheckpoint !== undefined) body.create_checkpoint = options.createCheckpoint

    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_run_forge_fast_path', { workId: obraId, options: body })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/fast-path`,
        { method: 'POST', body },
      )
    } else {
      offline('runForgeFastPath')
    }

    return adaptForgeFastPath(raw)
  },

  // 10b.7 · Atlas Code Forge Fast Path v2 · run status read-model
  async getForgeFastPathStatus(
    obraId: string,
    runId: string,
  ): Promise<AtlasCodeForgeFastPathRunStatus> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_fast_path_status', { workId: obraId, runId })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/fast-path/${encodeURIComponent(runId)}/status`,
      )
    } else {
      offline('getForgeFastPathStatus')
    }
    return adaptForgeFastPathStatus(raw)
  },

  // 10b.8 · Atlas Code Forge Fast Path v2 · run resume (idempotente, sem novo runtime)
  async resumeForgeFastPath(
    obraId: string,
    runId: string,
  ): Promise<AtlasCodeForgeFastPathRunStatus> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_resume_forge_fast_path', { workId: obraId, runId })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/fast-path/${encodeURIComponent(runId)}/resume`,
        { method: 'POST', body: {} },
      )
    } else {
      offline('resumeForgeFastPath')
    }
    return adaptForgeFastPathStatus(raw)
  },

  // 10b.9 · Atlas Code Forge Review & Completion Gate v1 · packet read
  async getForgeReviewPacket(
    obraId: string,
    runId: string,
  ): Promise<AtlasCodeForgeReviewPacket | null> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_review_packet', { workId: obraId, runId })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/fast-path/${encodeURIComponent(runId)}/review`,
      )
    } else {
      offline('getForgeReviewPacket')
    }
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return adaptForgeReviewPacket(r.review_packet ?? r.reviewPacket ?? r)
  },

  // 10b.10 · Atlas Code Forge Review · approve
  async approveForgeReview(
    obraId: string,
    runId: string,
    payload: { reviewer: string; reason: string },
  ): Promise<AtlasCodeForgeReviewDecisionResponse> {
    return forgeReviewDecision(obraId, runId, 'approve', payload)
  },

  // 10b.11 · Atlas Code Forge Review · reject
  async rejectForgeReview(
    obraId: string,
    runId: string,
    payload: { reviewer: string; reason: string },
  ): Promise<AtlasCodeForgeReviewDecisionResponse> {
    return forgeReviewDecision(obraId, runId, 'reject', payload)
  },

  // 10b.12 · Atlas Code Forge Review · rollback
  async rollbackForgeReview(
    obraId: string,
    runId: string,
    payload: { reviewer: string; reason: string },
  ): Promise<AtlasCodeForgeReviewDecisionResponse> {
    return forgeReviewDecision(obraId, runId, 'rollback', payload)
  },

  // 10b.13 · Atlas Code Forge Work Intake · read
  async getForgeWorkIntake(obraId: string): Promise<AtlasCodeForgeWorkIntake | null> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_work_intake', { workId: obraId })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(`/atlas-code/works/${encodeURIComponent(obraId)}/forge/intake`)
    } else {
      offline('getForgeWorkIntake')
    }
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return adaptForgeWorkIntake(r.forge_work_intake ?? r.forgeWorkIntake ?? r)
  },

  // 10b.13.1 · Atlas Forge Provider Topology read-model · GET
  // Schema canonico: atlas.forge.provider_topology.v1
  // Doc: docs/engineering-knowledge-base/atlas-forge-provider-topology-and-fallback-v1.md
  async getForgeProviderTopology(
    obraId: string,
    options: {
      simulateProviderFailure?: string
      strategy?: string
      fastPathRunId?: string
      decisionReceiptId?: string
    } = {},
  ): Promise<AtlasForgeProviderTopology> {
    const params = new URLSearchParams()
    if (options.simulateProviderFailure) params.set('simulate_provider_failure', options.simulateProviderFailure)
    if (options.strategy) params.set('strategy', options.strategy)
    if (options.fastPathRunId) params.set('fast_path_run_id', options.fastPathRunId)
    if (options.decisionReceiptId) params.set('decision_receipt_id', options.decisionReceiptId)
    const qs = params.toString() ? `?${params.toString()}` : ''

    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_provider_topology', {
        workId: obraId,
        options: {
          simulate_provider_failure: options.simulateProviderFailure ?? null,
          strategy: options.strategy ?? null,
          fast_path_run_id: options.fastPathRunId ?? null,
          decision_receipt_id: options.decisionReceiptId ?? null,
        },
      })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/provider-topology${qs}`,
      )
    } else {
      offline('getForgeProviderTopology')
    }
    return adaptForgeProviderTopology(raw)
  },

  // 10b.13.3 · Atlas Forge Runtime Dispatch · POST/GET
  // Schema canonico: atlas.forge.runtime_dispatch_plan.v1
  // Doc: docs/engineering-knowledge-base/atlas-forge-provider-topology-and-fallback-v1.md
  async runForgeRuntimeDispatch(
    obraId: string,
    options: {
      role?: string
      simulateProviderFailure?: string
      createChildReceipt?: boolean
      fastPathRunId?: string
    } = {},
  ): Promise<AtlasForgeRuntimeDispatchPlan> {
    const body: Record<string, unknown> = {}
    if (options.role !== undefined) body.role = options.role
    if (options.simulateProviderFailure !== undefined) body.simulate_provider_failure = options.simulateProviderFailure
    if (options.createChildReceipt !== undefined) body.create_child_receipt = options.createChildReceipt
    if (options.fastPathRunId !== undefined) body.fast_path_run_id = options.fastPathRunId

    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_run_forge_runtime_dispatch', { workId: obraId, options: body })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/runtime-dispatch`,
        { method: 'POST', body },
      )
    } else {
      offline('runForgeRuntimeDispatch')
    }
    return adaptForgeRuntimeDispatchPlan(raw)
  },

  // 10b.13.4 · Atlas Forge Real Provider Drivers · GET driver status / POST plan-driver / POST invocation / GET latest
  // 10b.13.5 · Atlas Code Forge UX Orchestrator · GET human state machine
  async getForgeUxOrchestrator(obraId: string): Promise<AtlasCodeForgeUxOrchestrator | null> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_ux_orchestrator', { workId: obraId })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(`/atlas-code/works/${encodeURIComponent(obraId)}/forge/ux-orchestrator`)
    } else {
      offline('getForgeUxOrchestrator')
    }
    return adaptForgeUxOrchestrator(raw)
  },

  async getForgeProviderDrivers(obraId: string): Promise<AtlasForgeProviderDriverStatus | null> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_provider_drivers', { workId: obraId })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(`/atlas-code/works/${encodeURIComponent(obraId)}/forge/provider-invocations/drivers`)
    } else {
      offline('getForgeProviderDrivers')
    }
    return adaptForgeProviderDriverStatus(raw)
  },

  async planForgeProviderDriver(
    obraId: string,
    options: { role?: string; dispatchId?: string } = {},
  ): Promise<AtlasForgeProviderDriverPlanPacket | null> {
    const body: Record<string, unknown> = {}
    if (options.role !== undefined) body.role = options.role
    if (options.dispatchId !== undefined) body.dispatch_id = options.dispatchId

    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_plan_forge_provider_driver', { workId: obraId, payload: body })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/provider-invocations/plan-driver`,
        { method: 'POST', body },
      )
    } else {
      offline('planForgeProviderDriver')
    }
    return adaptForgeProviderDriverPlanPacket(raw)
  },

  async runForgeProviderInvocation(
    obraId: string,
    options: {
      role?: string
      mode?: 'dry_run' | 'execute'
      dispatchId?: string
      confirmProviderCall?: boolean
      confirmBudget?: boolean
      confirmRuntimeDispatch?: boolean
      timeoutSeconds?: number
      maxOutputChars?: number
    } = {},
  ): Promise<AtlasForgeProviderInvocationSnapshot | null> {
    const body: Record<string, unknown> = {}
    if (options.role !== undefined) body.role = options.role
    if (options.mode !== undefined) body.mode = options.mode
    if (options.dispatchId !== undefined) body.dispatch_id = options.dispatchId
    if (options.confirmProviderCall !== undefined) body.confirm_provider_call = options.confirmProviderCall
    if (options.confirmBudget !== undefined) body.confirm_budget = options.confirmBudget
    if (options.confirmRuntimeDispatch !== undefined) body.confirm_runtime_dispatch = options.confirmRuntimeDispatch
    if (options.timeoutSeconds !== undefined) body.timeout_seconds = options.timeoutSeconds
    if (options.maxOutputChars !== undefined) body.max_output_chars = options.maxOutputChars

    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_run_forge_provider_invocation', { workId: obraId, options: body })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/provider-invocations`,
        { method: 'POST', body },
      )
    } else {
      offline('runForgeProviderInvocation')
    }
    return adaptForgeProviderInvocationSnapshot(raw)
  },

  async getForgeProviderInvocationLatest(obraId: string): Promise<AtlasForgeProviderInvocationSnapshot | null> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_provider_invocation_latest', { workId: obraId })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/provider-invocations/latest`,
      )
    } else {
      offline('getForgeProviderInvocationLatest')
    }
    return adaptForgeProviderInvocationSnapshot(raw)
  },

  async getForgeRuntimeDispatch(obraId: string): Promise<AtlasForgeRuntimeDispatchPlan | null> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_runtime_dispatch', { workId: obraId })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(`/atlas-code/works/${encodeURIComponent(obraId)}/forge/runtime-dispatch`)
    } else {
      offline('getForgeRuntimeDispatch')
    }
    return adaptNullableForgeRuntimeDispatchPlan(raw)
  },

  // 10b.13.2 · Atlas Forge Continuum Certification slim projection · GET
  // Schema canonico: atlas.forge_continuum_certification.v1
  // Doc: docs/engineering-knowledge-base/atlas-forge-continuum-os.md
  // Doc filha: docs/engineering-knowledge-base/atlas-forge-provider-topology-and-fallback-v1.md
  async getForgeContinuumCertification(
    obraId: string,
    options: {
      simulateProviderFailure?: string
      strategy?: string
      strict?: boolean
    } = {},
  ): Promise<AtlasForgeContinuumCertification | null> {
    const params = new URLSearchParams()
    if (options.simulateProviderFailure) params.set('simulate_provider_failure', options.simulateProviderFailure)
    if (options.strategy) params.set('strategy', options.strategy)
    if (options.strict) params.set('strict', 'true')
    const qs = params.toString() ? `?${params.toString()}` : ''

    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_continuum_certification', {
        workId: obraId,
        options: {
          simulate_provider_failure: options.simulateProviderFailure ?? null,
          strategy: options.strategy ?? null,
          strict: options.strict ?? null,
        },
      })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/continuum-certification${qs}`,
      )
    } else {
      offline('getForgeContinuumCertification')
    }
    return adaptForgeContinuumCertificationSummary(raw)
  },

  // 10b.13.3 · Atlas Forge Provider Capacity (read-model) · GET
  // Schema canonico: atlas.forge.provider_capacity.v1
  // Doc: docs/engineering-knowledge-base/atlas-forge-provider-capacity-continuity-v1.md
  async getForgeProviderCapacity(
    obraId?: string | null,
  ): Promise<AtlasForgeProviderCapacity | null> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_forge_provider_capacity', {
        workId: obraId ?? null,
      })
    } else if (MODE === 'http') {
      const path = obraId
        ? `/atlas-code/works/${encodeURIComponent(obraId)}/forge/provider-capacity`
        : '/atlas-code/forge/provider-capacity'
      raw = await fetchHttp<unknown>(path)
    } else {
      offline('getForgeProviderCapacity')
    }
    return adaptForgeProviderCapacity(raw)
  },

  // 10b.13.4 · Atlas Forge Provider Failure · POST record event
  // Schema canonico: atlas.forge.provider_failure_memory_event.v1
  async recordForgeProviderFailure(
    obraId: string,
    payload: {
      provider: string
      failureType: string
      model?: string
      role?: string
      reason?: string
    },
  ): Promise<{
    event: AtlasForgeProviderFailureMemoryEvent | null
    capacity: AtlasForgeProviderCapacity | null
    memory: AtlasForgeProviderFailureMemory | null
  }> {
    const body: Record<string, unknown> = {
      provider: payload.provider,
      failure_type: payload.failureType,
    }
    if (payload.model !== undefined) body.model = payload.model
    if (payload.role !== undefined) body.role = payload.role
    if (payload.reason !== undefined) body.reason = payload.reason

    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_record_forge_provider_failure', {
        workId: obraId,
        payload: body,
      })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/provider-failures`,
        { method: 'POST', body },
      )
    } else {
      offline('recordForgeProviderFailure')
    }
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return {
      event: adaptForgeProviderFailureMemoryEvent(r.event ?? null),
      capacity: adaptForgeProviderCapacity(r.capacity_snapshot ?? r.capacitySnapshot ?? null),
      memory: adaptForgeProviderFailureMemory(r.failure_memory ?? r.failureMemory ?? null),
    }
  },

  // 10b.13.5 · Atlas Self-Improvement Governance · GET trust ledger + portfolio
  // Schema canonico: atlas.self_improvement.governance_state.v1
  // Doc: docs/engineering-knowledge-base/atlas-self-improvement-governance-ladder.md
  async getSelfImprovementTrustLedger(
    obraId: string,
  ): Promise<AtlasSelfImprovementTrustLedgerSnapshot | null> {
    let raw: unknown
    if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/self-improvement/trust-ledger`,
      )
    } else {
      // Tauri command not yet wired — fall back to HTTP via offline shim, but
      // don't crash; UI tolerates null.
      try {
        raw = await fetchHttp<unknown>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/self-improvement/trust-ledger`,
        )
      } catch {
        return null
      }
    }
    return adaptSelfImprovementTrustLedgerSnapshot(raw)
  },

  // 10b.13.6 · Atlas Self-Improvement Governance · POST trust ledger entry
  async recordSelfImprovementTrustLedgerEntry(
    obraId: string,
    payload: { outcome: string; proposalId?: string; reviewer?: string; reason?: string; area?: string },
  ): Promise<AtlasSelfImprovementTrustLedgerEntry | null> {
    const body: Record<string, unknown> = { outcome: payload.outcome }
    if (payload.proposalId !== undefined) body.proposal_id = payload.proposalId
    if (payload.reviewer !== undefined) body.reviewer = payload.reviewer
    if (payload.reason !== undefined) body.reason = payload.reason
    if (payload.area !== undefined) body.area = payload.area

    let raw: unknown
    if (MODE === 'http') {
      raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/self-improvement/trust-ledger`,
        { method: 'POST', body },
      )
    } else {
      try {
        raw = await fetchHttp<unknown>(
          `/atlas-code/works/${encodeURIComponent(obraId)}/self-improvement/trust-ledger`,
          { method: 'POST', body },
        )
      } catch {
        return null
      }
    }
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return adaptSelfImprovementTrustLedgerEntry(r.entry ?? null)
  },

  // 10b.13.7 · Atlas Self-Improvement Strategy Portfolio (global)
  async getSelfImprovementStrategyPortfolio(): Promise<AtlasSelfImprovementStrategyPortfolioSnapshot | null> {
    let raw: unknown
    if (MODE === 'http') {
      // The endpoint is GET; pass proposals via query if present.
      raw = await fetchHttp<unknown>('/atlas-code/self-improvement/strategy-portfolio')
    } else {
      try {
        raw = await fetchHttp<unknown>('/atlas-code/self-improvement/strategy-portfolio')
      } catch {
        return null
      }
    }
    return adaptSelfImprovementStrategyPortfolioSnapshot(raw)
  },

  // 10b.13.8 · Atlas Self-Improvement Activation Cockpit v1 · list + counters + summary
  // Schema canônico: atlas.self_improvement.activation_cockpit.v1
  // Doc: docs/engineering-knowledge-base/atlas-self-improvement-activation-cockpit-v1.md
  async listSelfImprovementForgeActivations(
    filters?: AtlasSelfImprovementActivationCockpitFilters,
  ): Promise<AtlasSelfImprovementActivationCockpit | null> {
    const query = buildCockpitQuery(filters)
    const url = `/atlas-code/self-improvement/activation-cockpit${query}`
    let raw: unknown
    try {
      if (MODE === 'tauri') {
        raw = await invokeTauri<unknown>('bridge_list_self_improvement_forge_activations', {
          status: filters?.status ?? null,
          bucket: filters?.bucket ?? null,
          hasObra: filters?.hasObra ?? null,
        })
      } else if (MODE === 'http') {
        raw = await fetchHttp<unknown>(url)
      } else {
        raw = await fetchHttp<unknown>(url)
      }
    } catch (e) {
      console.warn('[bridge] listSelfImprovementForgeActivations', e)
      return null
    }
    return adaptSelfImprovementActivationCockpit(raw)
  },

  // 10b.13.9 · Activation cockpit detail (humanised projection)
  async getSelfImprovementForgeActivation(
    activationId: string,
  ): Promise<AtlasSelfImprovementActivationCockpit | null> {
    const path = `/atlas-code/self-improvement/activation-cockpit/${encodeURIComponent(activationId)}`
    let raw: unknown
    try {
      if (MODE === 'tauri') {
        raw = await invokeTauri<unknown>('bridge_get_self_improvement_forge_activation', {
          activationId,
        })
      } else {
        raw = await fetchHttp<unknown>(path)
      }
    } catch (e) {
      console.warn('[bridge] getSelfImprovementForgeActivation', e)
      return null
    }
    return adaptSelfImprovementActivationCockpit(raw)
  },

  // 10b.13.10 · Plan a new activation (calls the existing POST endpoint)
  // Read-write but NEVER auto-executes Fast Path; obra creation requires
  // explicit accept downstream.
  async createSelfImprovementForgeActivation(
    payload: AtlasSelfImprovementActivationCreatePayload,
  ): Promise<AtlasSelfImprovementActivationDetail | null> {
    const body: Record<string, unknown> = {}
    if (payload.proposal !== undefined) body.proposal = payload.proposal
    if (payload.proposalId !== undefined) body.proposal_id = payload.proposalId
    if (payload.obraTitle !== undefined) body.obra_title = payload.obraTitle
    if (payload.dryRun !== undefined) body.dry_run = payload.dryRun

    let raw: unknown
    try {
      if (MODE === 'tauri') {
        raw = await invokeTauri<unknown>('bridge_create_self_improvement_forge_activation', { payload: body })
      } else {
        raw = await fetchHttp<unknown>('/atlas-code/self-improvement/forge-activations', {
          method: 'POST',
          body,
        })
      }
    } catch (e) {
      console.warn('[bridge] createSelfImprovementForgeActivation', e)
      return null
    }
    return adaptSelfImprovementActivationDetail(raw)
  },

  // 10b.13.11 · Accept activation — REQUIRES reviewer + reason + ack.
  // UI must enforce checkbox + non-empty fields before calling this.
  async acceptSelfImprovementForgeActivation(
    activationId: string,
    payload: AtlasSelfImprovementActivationAcceptPayload,
  ): Promise<AtlasSelfImprovementActivationDetail | null> {
    if (!payload.reviewer?.trim() || !payload.reason?.trim() || payload.acknowledgesNoFastPath !== true) {
      throw new Error('acceptSelfImprovementForgeActivation requires reviewer, reason and explicit no-fast-path acknowledgement')
    }
    const body: Record<string, unknown> = {
      reviewer: payload.reviewer,
      reason: payload.reason,
      acknowledges_no_fast_path: payload.acknowledgesNoFastPath,
    }
    if (payload.obraTitle) body.obra_title = payload.obraTitle

    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_accept_self_improvement_forge_activation', {
        activationId,
        payload: body,
      })
    } else {
      raw = await fetchHttp<unknown>(
        `/atlas-code/self-improvement/forge-activations/${encodeURIComponent(activationId)}/accept`,
        { method: 'POST', body },
      )
    }
    return adaptSelfImprovementActivationDetail(raw)
  },

  // 10b.13.12 · Reject activation — REQUIRES reviewer + reason.
  async rejectSelfImprovementForgeActivation(
    activationId: string,
    payload: AtlasSelfImprovementActivationRejectPayload,
  ): Promise<AtlasSelfImprovementActivationDetail | null> {
    if (!payload.reviewer?.trim() || !payload.reason?.trim()) {
      throw new Error('rejectSelfImprovementForgeActivation requires reviewer and reason')
    }
    const body: Record<string, unknown> = {
      reviewer: payload.reviewer,
      reason: payload.reason,
    }
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_reject_self_improvement_forge_activation', {
        activationId,
        payload: body,
      })
    } else {
      raw = await fetchHttp<unknown>(
        `/atlas-code/self-improvement/forge-activations/${encodeURIComponent(activationId)}/reject`,
        { method: 'POST', body },
      )
    }
    return adaptSelfImprovementActivationDetail(raw)
  },

  // 10b.14 · Atlas Code Forge Work Intake · save
  async saveForgeWorkIntake(
    obraId: string,
    payload: AtlasCodeForgeWorkIntakePayload,
  ): Promise<AtlasCodeForgeWorkIntake | null> {
    const body: Record<string, unknown> = {}
    if (payload.objective !== undefined) body.objective = payload.objective
    if (payload.businessRule !== undefined) body.business_rule = payload.businessRule
    if (payload.scopeIn !== undefined) body.scope_in = payload.scopeIn
    if (payload.scopeOut !== undefined) body.scope_out = payload.scopeOut
    if (payload.acceptanceCriteria !== undefined) body.acceptance_criteria = payload.acceptanceCriteria
    if (payload.canonicalDocs !== undefined) body.canonical_docs = payload.canonicalDocs
    if (payload.riskLevel !== undefined) body.risk_level = payload.riskLevel
    if (payload.expectedOutputs !== undefined) body.expected_outputs = payload.expectedOutputs
    if (payload.constraints !== undefined) body.constraints = payload.constraints
    if (payload.operatorNotes !== undefined) body.operator_notes = payload.operatorNotes

    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_save_forge_work_intake', { workId: obraId, payload: body })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>(`/atlas-code/works/${encodeURIComponent(obraId)}/forge/intake`, {
        method: 'POST',
        body,
      })
    } else {
      offline('saveForgeWorkIntake')
    }
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return adaptForgeWorkIntake(r.forge_work_intake ?? r.forgeWorkIntake ?? r)
  },

  // 10c · create Atlas Code checkpoint for selected Obra
  async createCheckpoint(obraId: string, reason = 'manual'): Promise<WorkStateSnapshot['checkpoint']> {
    if (MODE === 'tauri') {
      const raw = await invokeTauri<unknown>('bridge_create_checkpoint', {
        workId: obraId,
        reason,
      })
      return adaptCheckpointEnvelope(raw)
    }
    if (MODE === 'http') {
      const raw = await fetchHttp<unknown>(`/atlas-code/works/${encodeURIComponent(obraId)}/checkpoints`, {
        method: 'POST',
        body: { reason },
      })
      return adaptCheckpointEnvelope(raw)
    }
    offline('createCheckpoint')
  },

  // 10d · human-review latest Forge run for selected Obra
  async reviewForgeRun(obraId: string, decision: 'approved' | 'rejected' = 'approved', comment = 'local operator review'): Promise<WorkStateSnapshot['forgeReview']> {
    if (MODE === 'tauri') {
      const raw = await invokeTauri<unknown>('bridge_review_forge_run', {
        workId: obraId,
        decision,
        comment,
      })
      return adaptForgeReviewEnvelope(raw)
    }
    if (MODE === 'http') {
      const raw = await fetchHttp<unknown>(`/atlas-code/works/${encodeURIComponent(obraId)}/forge/reviews`, {
        method: 'POST',
        body: { decision, comment },
      })
      return adaptForgeReviewEnvelope(raw)
    }
    offline('reviewForgeRun')
  },

  async rollbackForgePromotion(obraId: string, promotionId: string, comment = 'operator rollback'): Promise<WorkStateSnapshot['forgeReview']> {
    if (MODE === 'tauri') {
      const raw = await invokeTauri<unknown>('bridge_rollback_forge_promotion', {
        workId: obraId,
        promotionId,
        comment,
      })
      return adaptForgeReviewEnvelope((raw as Record<string, unknown>)?.review ?? raw)
    }
    if (MODE === 'http') {
      const raw = await fetchHttp<unknown>(
        `/atlas-code/works/${encodeURIComponent(obraId)}/forge/promotions/${encodeURIComponent(promotionId)}/rollback`,
        {
          method: 'POST',
          body: { comment },
        },
      )
      return adaptForgeReviewEnvelope((raw as Record<string, unknown>)?.review ?? raw)
    }
    offline('rollbackForgePromotion')
  },

  // 11a · list quality gates · atlas-server returns `{ runs: [...] }` with
  // tool_slug + status; we map each run to a QualityGate.
  async listGates(): Promise<QualityGate[]> {
    if (MODE === 'tauri') {
      const raw = await invokeTauri<{ runs?: unknown[] } | unknown[]>('bridge_list_gate_runs')
      const runs = Array.isArray(raw) ? raw : raw?.runs ?? []
      return normaliseGateRuns(runs)
    }
    if (MODE === 'http') {
      const raw = await fetchHttp<{ runs?: unknown[] }>('/tools/gate')
      return normaliseGateRuns(raw?.runs ?? [])
    }
    return noGates
  },

  // 11b · run a quality gate
  async runGate(gateId: string): Promise<{ gateId: string; runId: string; state: string }> {
    if (MODE === 'tauri') return invokeTauri('bridge_run_gate', { gateId })
    if (MODE === 'http') return fetchHttp(`/tools/${gateId}/run`, { method: 'POST', body: {} })
    offline('runGate')
  },

  // 12 · apply diff
  async applyDiff(patchId: string, runGates: string[]): Promise<ApplyDiffAck> {
    if (MODE === 'tauri') return invokeTauri<ApplyDiffAck>('bridge_apply_diff', { patchId, runGates })
    if (MODE === 'http')
      return fetchHttp<ApplyDiffAck>(`/atlas-code/diffs/${patchId}/apply`, {
        method: 'POST',
        body: { confirm: true, runGates },
      })
    offline('applyDiff')
  },

  // Recent sessions for sidebar — atlas-server doesn't expose a dedicated
  // endpoint yet; in HTTP/Tauri mode we return empty until passo-3.5 wraps it.
  async listRecentSessions(): Promise<Session[]> {
    return noSessions
  },

  async listPackets(): Promise<Packet[]> {
    return noPackets
  },

  // ────────────────────────────────────────────────────────────────────────
  // CARTOGRAPHY · read-only surface
  async loadCartographyGraph(): Promise<CartographyGraph | null> {
    try {
      let raw: unknown
      if (MODE === 'tauri') raw = await invokeTauri<unknown>('bridge_cartography_graph')
      else if (MODE === 'http') raw = await fetchHttp<unknown>('/atlas-cartography/graph')
      else return null
      const graph = adaptCartographyGraph(raw)
      if (!graph) throw new Error('cartography graph payload invalid')
      return graph
    } catch (e) {
      console.warn('[bridge] cartography graph failed', e)
      throw e
    }
  },

  async loadCartographyRecentChanges(): Promise<RecentChange[]> {
    try {
      let raw: { changes?: unknown[] } | undefined
      if (MODE === 'tauri') raw = (await invokeTauri<{ changes?: unknown[] }>('bridge_cartography_recent_changes')) ?? {}
      else if (MODE === 'http') raw = await fetchHttp<{ changes?: unknown[] }>('/atlas-cartography/recent-changes')
      else return []
      return adaptRecentChanges(raw?.changes ?? [])
    } catch {
      return []
    }
  },

  /**
   * Live cartography stream. SSE events:
   *   - `graph_changed { checksum, reason }`  → refresh graph + recent + invalidate cache
   *   - `heartbeat { at }`                    → channel still alive
   *   - `reconnect { reason }`                → server bound reached; client reopens
   *
   * Returns an unsubscribe fn. In Tauri/offline mode the connection short-circuits
   * to a no-op so the caller doesn't need branchy code paths.
   */
  streamCartography(onEvent: (kind: string, payload: Record<string, unknown>) => void): () => void {
    if (MODE !== 'http') {
      // Tauri-mode SSE will pipe through a dedicated bridge command in a later
      // iteration; for now we silently no-op so the polling path still drives.
      return () => { /* noop */ }
    }
    let closed = false
    let es: EventSource | null = null
    let backoffMs = 1_000

    const open = () => {
      if (closed) return
      try {
        es = new EventSource(`${HTTP_BASE}/atlas-cartography/stream`)
      } catch (e) {
        console.warn('[bridge] cartography SSE open failed', e)
        return
      }
      const handle = (kind: string) => (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data) as Record<string, unknown>
          onEvent(kind, data)
        } catch {
          /* malformed frame · ignore */
        }
      }
      es.addEventListener('graph_changed', handle('graph_changed'))
      es.addEventListener('heartbeat', handle('heartbeat'))
      es.addEventListener('reconnect', handle('reconnect'))
      es.onerror = () => {
        es?.close()
        es = null
        if (closed) return
        // Reconnect with light backoff so a temporarily down server doesn't
        // get hammered. Cap at 8s, halve on first success.
        setTimeout(open, backoffMs)
        backoffMs = Math.min(backoffMs * 2, 8_000)
      }
      es.onopen = () => { backoffMs = 1_000 }
    }

    open()
    return () => {
      closed = true
      es?.close()
      es = null
    }
  },

  async loadCartographyNote(graphId: string): Promise<CartographyNote | null> {
    try {
      let raw: Record<string, unknown> | undefined
      if (MODE === 'tauri') raw = (await invokeTauri<Record<string, unknown>>('bridge_cartography_note', { graphId })) ?? undefined
      else if (MODE === 'http') raw = await fetchHttp<Record<string, unknown>>(`/atlas-cartography/note/${encodeURIComponent(graphId)}`)
      else return null
      if (!raw) return null
      return {
        graphId: (raw.graph_id ?? raw.graphId ?? graphId) as string,
        body: (raw.body ?? '') as string,
        source: ((raw.source ?? 'repo') as CartographyNote['source']),
        sourcePath: (raw.source_path ?? raw.sourcePath ?? '') as string,
        modifiedAt: (raw.modified_at ?? raw.modifiedAt ?? null) as string | null,
      }
    } catch {
      return null
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // OS shell · open repo doc / obsidian:// / reveal in Finder · Tauri only

  async openExternal(url: string): Promise<void> {
    if (MODE !== 'tauri') {
      // In HTTP browser mode, we can fall back to window.open for non-obsidian links.
      if (typeof window !== 'undefined') {
        window.open(url, '_blank')
        return
      }
      offline('openExternal')
    }
    return invokeTauri<void>('open_external', { url })
  },

  async revealInFinder(path: string): Promise<void> {
    if (MODE !== 'tauri') offline('revealInFinder')
    return invokeTauri<void>('reveal_in_finder', { path })
  },

  async gitBranch(path: string): Promise<string | null> {
    if (MODE !== 'tauri' || !path) return null
    try {
      return await invokeTauri<string | null>('git_branch', { path })
    } catch {
      return null
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // PTY · real terminal sessions · Tauri only

  async ptyOpen(req: { id?: string; cwd?: string; shell?: string; cols?: number; rows?: number }): Promise<{ id: string; shell: string; cwd: string; cols: number; rows: number }> {
    if (MODE !== 'tauri') offline('ptyOpen')
    return invokeTauri('pty_open', { request: req })
  },
  async ptyWrite(id: string, data: string): Promise<number> {
    if (MODE !== 'tauri') offline('ptyWrite')
    return invokeTauri<number>('pty_write', { id, data })
  },
  async ptyResize(id: string, cols: number, rows: number): Promise<void> {
    if (MODE !== 'tauri') offline('ptyResize')
    return invokeTauri<void>('pty_resize', { id, cols, rows })
  },
  async ptyClose(id: string): Promise<void> {
    if (MODE !== 'tauri') offline('ptyClose')
    return invokeTauri<void>('pty_close', { id })
  },
}

export type Bridge = typeof bridge

// ──────────────────────────────────────────────────────────────────────────
// Helpers

// ──────────────────────────────────────────────────────────────────────────
// Normalisers from atlas-server snake_case shapes to @atlas/domain camelCase

function normaliseTraceEnvelope(raw: unknown, fallbackThreadId: string | null): { traceId: string; threadId?: string } {
  const r = (raw ?? {}) as Record<string, unknown>
  const trace = (r.trace ?? r) as Record<string, unknown>
  return {
    traceId: String(trace.id ?? trace.traceId ?? trace.trace_id ?? ''),
    threadId: (trace.thread_id ?? trace.threadId ?? fallbackThreadId ?? undefined) as string | undefined,
  }
}

function normaliseObras(raw: unknown): Obra[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown[] })?.data)
      ? (raw as { data: unknown[] }).data
      : Array.isArray((raw as { projects?: unknown[] })?.projects)
        ? (raw as { projects: unknown[] }).projects
        : (raw as { project?: unknown })?.project
          ? [(raw as { project: unknown }).project]
          : (raw as { work?: unknown })?.work
            ? [(raw as { work: unknown }).work]
            : []

  const obras: Obra[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id = (o.id ?? o.uuid) as string | undefined
    if (!id) continue
    obras.push({
      id,
      title: (o.title ?? o.name ?? id) as string,
      objective: (o.objective ?? o.description ?? o.goal ?? o.title ?? '') as string,
      status: ((o.status as Obra['status']) ?? 'active'),
      workspacePath: (o.workspace_path ?? o.workspacePath ?? '') as string,
      createdAt: (o.created_at ?? o.createdAt ?? '') as string,
    })
  }
  return obras
}

function normaliseSessions(raw: unknown): Session[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown[] })?.data)
      ? (raw as { data: unknown[] }).data
      : []

  const sessions: Session[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const s = item as Record<string, unknown>
    const id = (s.id ?? s.threadId ?? s.thread_id) as string | undefined
    if (!id) continue
    sessions.push({
      id,
      obraId: (s.obraId ?? s.obra_id ?? '') as string,
      threadId: (s.threadId ?? s.thread_id ?? id) as string,
      title: (s.title ?? '') as string,
      status: ((s.status as Session['status']) ?? 'paused'),
      turns: typeof s.turns === 'number' ? s.turns : 0,
      durationMs: typeof s.durationMs === 'number'
        ? s.durationMs
        : typeof s.duration_ms === 'number'
          ? (s.duration_ms as number)
          : 0,
      origin: ((s.origin as Session['origin']) ?? 'manual'),
      snapshot: undefined,
    })
  }
  return sessions
}

function normaliseMessages(raw: unknown[]): Message[] {
  const out: Message[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const m = item as Record<string, unknown>
    const id = (m.id ?? m.messageId) as string | undefined
    if (!id) continue
    const roleRaw = (m.role as string | undefined) ?? 'system'
    const role: Message['role'] = roleRaw === 'assistant' ? 'atlas' : roleRaw === 'user' ? 'user' : (roleRaw as Message['role'])
    const content = (m.body ?? m.content) as unknown
    const body = typeof content === 'string'
      ? content
      : content && typeof content === 'object' && 'text' in (content as Record<string, unknown>)
        ? String((content as { text: unknown }).text ?? '')
        : JSON.stringify(content ?? '')
    const tsRaw = (m.occurredAt ?? m.occurred_at ?? m.created_at ?? '') as string
    out.push({
      id,
      role,
      body,
      ts: tsRaw ? new Date(tsRaw).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
      occurredAt: tsRaw,
      provider: (m.provider as string | undefined) ?? undefined,
      model: (m.model as string | undefined) ?? undefined,
    })
  }
  return out
}

function normaliseGateRuns(raw: unknown[]): QualityGate[] {
  const out: QualityGate[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const slug = (r.tool_slug ?? r.slug ?? r.id) as string | undefined
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    const statusRaw = (r.status as string | undefined) ?? 'pending'
    const state: QualityGate['state'] =
      statusRaw === 'passed' ? 'passed'
      : statusRaw === 'failed' || statusRaw === 'timeout' || statusRaw === 'denied' ? 'failed'
      : statusRaw === 'requires_approval' ? 'blocked'
      : 'pending'
    out.push({
      id: slug,
      name: slug,
      state,
      detail: (r.message as string | undefined) ?? undefined,
    })
  }
  return out
}

// ──────────────────────────────────────────────────────────────────────────
// Boot / MCP / WorkState / Receipt adapters

function adaptBoot(raw: unknown): BootSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const k = (r.kernel as Record<string, unknown> | undefined) ?? {}
  const p = (r.providers as Record<string, unknown> | undefined) ?? {}
  const m = (r.mcp as Record<string, unknown> | undefined) ?? {}
  const c = (r.cartography as Record<string, unknown> | undefined) ?? {}
  const w = (r.workspace as Record<string, unknown> | undefined) ?? {}
  const q = (r.queue as Record<string, unknown> | undefined) ?? {}
  return {
    status: (r.status as BootSnapshot['status']) ?? 'degraded',
    generatedAt: (r.generated_at as string) ?? (r.generatedAt as string) ?? '',
    kernel: {
      service: String(k.service ?? 'atlas-server'),
      version: String(k.version ?? ''),
      env: String(k.env ?? ''),
      phpVersion: String(k.php_version ?? k.phpVersion ?? ''),
      dbConnected: Boolean(k.db_connected ?? k.dbConnected ?? false),
      dbError: (k.db_error ?? k.dbError ?? null) as string | null,
      storagePath: String(k.storage_path ?? k.storagePath ?? ''),
      storageWritable: Boolean(k.storage_writable ?? k.storageWritable ?? false),
      ts: String(k.ts ?? ''),
    },
    providers: {
      available: Number(p.available ?? 0),
      degraded: Number(p.degraded ?? 0),
      source: String(p.source ?? ''),
    },
    mcp: {
      server: String(m.server ?? 'atlas-open-brain'),
      protocolVersion: String(m.protocol_version ?? m.protocolVersion ?? ''),
      httpEnabled: Boolean(m.http_enabled ?? m.httpEnabled ?? false),
      status: ((m.status as 'active' | 'disabled' | 'degraded') ?? 'disabled'),
      transport: String(m.transport ?? ''),
    },
    cartography: {
      repoRoot: String(c.repo_root ?? c.repoRoot ?? ''),
      repoReadable: Boolean(c.repo_readable ?? c.repoReadable ?? false),
      vaultRoot: String(c.vault_root ?? c.vaultRoot ?? ''),
      vaultReadable: Boolean(c.vault_readable ?? c.vaultReadable ?? false),
    },
    workspace: {
      cwd: String(w.cwd ?? ''),
      isGit: Boolean(w.is_git ?? w.isGit ?? false),
    },
    queue: {
      connection: String(q.connection ?? ''),
      pending: Number(q.pending ?? 0),
      failed: Number(q.failed ?? 0),
    },
  }
}

function adaptMcpStatus(raw: unknown): McpStatus | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const tools = Array.isArray(r.tools)
    ? r.tools.map((t) => {
        const tt = (t ?? {}) as Record<string, unknown>
        return { name: String(tt.name ?? ''), summary: (tt.summary ?? null) as string | null }
      })
    : []
  const lc = r.last_call as Record<string, unknown> | null | undefined
  const fr = (r.freshness as Record<string, unknown>) ?? {}
  return {
    server: String(r.server ?? 'atlas-open-brain'),
    status: (r.status as McpStatus['status']) ?? 'disabled',
    protocolVersion: String(r.protocol_version ?? r.protocolVersion ?? ''),
    transport: String(r.transport ?? ''),
    httpEnabled: Boolean(r.http_enabled ?? r.httpEnabled ?? false),
    toolsCount: Number(r.tools_count ?? tools.length),
    tools,
    docsIndexed: Number(r.docs_indexed ?? r.docsIndexed ?? 0),
    symbolsIndexed: Number(r.symbols_indexed ?? r.symbolsIndexed ?? 0),
    lastCall: lc
      ? {
          tool: String(lc.tool ?? ''),
          operatorId: String(lc.operator_id ?? lc.operatorId ?? ''),
          durationMs: Number(lc.duration_ms ?? lc.durationMs ?? 0),
          at: (lc.at ?? null) as string | null,
        }
      : null,
    freshness: {
      indexedAt: (fr.indexed_at ?? fr.indexedAt ?? null) as string | null,
      drift: String(fr.drift ?? 'unknown'),
    },
  }
}

function adaptWorkState(raw: unknown): WorkStateSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const w = (r.work as Record<string, unknown>) ?? {}
  const sdd = (r.sdd as Record<string, unknown>) ?? {}
  const rawSteps = (sdd.steps as unknown[]) ?? []
  const steps = rawSteps.map((s): { id: import('@atlas/domain').SddStageId; label: string; state: import('@atlas/domain').SddStageState } => {
    const ss = (s ?? {}) as Record<string, unknown>
    const status = String(ss.status ?? 'pending')
    return {
      id: String(ss.key ?? ss.id ?? 'context') as import('@atlas/domain').SddStageId,
      label: String(ss.label ?? ss.key ?? ''),
      state: (status === 'done' ? 'done' : status === 'active' ? 'now' : 'todo') as import('@atlas/domain').SddStageState,
    }
  })

  return {
    workId: String(w.id ?? ''),
    workTitle: String(w.title ?? ''),
    workObjective: String(w.objective ?? ''),
    workStatus: ((w.status as Obra['status']) ?? 'active'),
    sessions: ((r.sessions as unknown[]) ?? []).map((s) => {
      const ss = (s ?? {}) as Record<string, unknown>
      return {
        id: String(ss.id ?? ''),
        title: String(ss.title ?? ''),
        status: (ss.status as 'running' | 'paused' | 'done' | 'failed') ?? 'paused',
        turns: Number(ss.turns ?? 0),
        lastMessageAt: (ss.last_message_at ?? ss.lastMessageAt ?? null) as string | null,
      }
    }),
    activeThreadId: (r.active_thread ?? r.activeThread ?? null) as string | null,
    messages: normaliseMessages(((r.messages as unknown[]) ?? [])),
    sdd: {
      stage: (sdd.stage as import('@atlas/domain').SddStageId | 'idle') ?? 'idle',
      steps,
    },
    receipt: adaptReceipt(r.receipt),
    gates: normaliseGateRuns(((r.gates as unknown[]) ?? [])),
    evidence: ((r.evidence as unknown[]) ?? []).map((e) => {
      const ee = (e ?? {}) as Record<string, unknown>
      return {
        id: String(ee.id ?? ''),
        kind: String(ee.kind ?? ''),
        summary: String(ee.summary ?? ''),
        createdAt: (ee.createdAt ?? ee.created_at ?? null) as string | null,
      }
    }),
    forgeLiveExecution: adaptForgeLiveExecution(
      r.forge_live_execution ?? r.forgeLiveExecution,
    ),
    forgeLiveExecutionAsync: adaptForgeLiveExecutionAsync(
      r.forge_live_execution_async ?? r.forgeLiveExecutionAsync,
    ),
    forgeLiveExecutionHistory: adaptForgeLiveExecutionHistory(
      r.forge_live_execution_history ?? r.forgeLiveExecutionHistory,
    ),
    forgeTaskQueue: adaptForgeTaskQueue(
      r.forge_task_queue ?? r.forgeTaskQueue,
    ),
    forgeFastPath: adaptNullableForgeFastPath(r.forge_fast_path ?? r.forgeFastPath),
    forgeRunHistoryReplay: null,
    forgeReview: adaptForgeReview(r.forge_review ?? r.forgeReview),
    forgeReviewHistory: adaptForgeReviewHistory(r.forge_review_history ?? r.forgeReviewHistory),
    forgeReviewPacket: adaptNullableForgeReviewPacket(r.forge_review_packet ?? r.forgeReviewPacket),
    forgeCompletionClaim: adaptNullableForgeCompletionClaim(r.forge_completion_claim ?? r.forgeCompletionClaim),
    forgeWorkIntake: adaptForgeWorkIntake(r.forge_work_intake ?? r.forgeWorkIntake),
    forgeProviderTopology: adaptNullableForgeProviderTopology(r.forge_provider_topology ?? r.forgeProviderTopology),
    forgeContinuumCertification: adaptForgeContinuumCertificationSummary(r.forge_continuum_certification ?? r.forgeContinuumCertification),
    forgeProviderCapacity: adaptForgeProviderCapacity(r.forge_provider_capacity ?? r.forgeProviderCapacity),
    forgeProviderFailureMemory: adaptForgeProviderFailureMemory(r.forge_provider_failure_memory ?? r.forgeProviderFailureMemory),
    selfImprovementGovernance: adaptSelfImprovementGovernanceState(r.self_improvement_governance ?? r.selfImprovementGovernance),
    selfImprovementActivation: adaptSelfImprovementForgeActivationState(r.self_improvement_activation ?? r.selfImprovementActivation),
    forgeRuntimeDispatch: adaptNullableForgeRuntimeDispatchPlan(r.forge_runtime_dispatch ?? r.forgeRuntimeDispatch),
    forgeProviderDriverStatus: adaptForgeProviderDriverStatus(r.forge_provider_driver_status ?? r.forgeProviderDriverStatus),
    forgeProviderInvocation: adaptForgeProviderInvocationSnapshot(r.forge_provider_invocation ?? r.forgeProviderInvocation),
    forgeProviderInvocationReceipt: adaptForgeProviderInvocationReceipt(r.forge_provider_invocation_receipt ?? r.forgeProviderInvocationReceipt),
    forgeUxOrchestrator: adaptForgeUxOrchestrator(r.forge_ux_orchestrator ?? r.forgeUxOrchestrator),
    obraCommandCenter: adaptObraCommandCenter(r.obra_command_center ?? r.obraCommandCenter),
    checkpoint: adaptCheckpoint(r.checkpoint),
    atlasCodeEnterpriseCertification: adaptNullableAtlasCodeEnterpriseCertification(
      r.atlas_code_enterprise_certification ?? r.atlasCodeEnterpriseCertification,
    ),
    programmingGovernance: adaptProgrammingGovernance(
      r.programming_governance ?? r.programmingGovernance,
    ),
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
  }
}

function adaptSelfImprovementTrustLedgerEntry(raw: unknown): AtlasSelfImprovementTrustLedgerEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const entryId = String(r.entry_id ?? r.entryId ?? '')
  if (entryId === '') return null

  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.self_improvement.human_trust_ledger_entry.v1'),
    entryId,
    occurredAt: String(r.occurred_at ?? r.occurredAt ?? new Date().toISOString()),
    outcome: String(r.outcome ?? ''),
    proposalId: nullableString(r.proposal_id ?? r.proposalId),
    reviewer: nullableString(r.reviewer),
    reason: nullableString(r.reason),
    area: nullableString(r.area),
    silent: Boolean(r.silent ?? false),
    autoPromotesWork: Boolean(r.auto_promotes_work ?? r.autoPromotesWork ?? false),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
  }
}

function adaptSelfImprovementTrustLedgerSnapshot(raw: unknown): AtlasSelfImprovementTrustLedgerSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.self_improvement.human_trust_ledger.v1') return null

  const entriesRaw = Array.isArray(r.entries) ? r.entries : []
  const entries = entriesRaw
    .map(adaptSelfImprovementTrustLedgerEntry)
    .filter((entry): entry is AtlasSelfImprovementTrustLedgerEntry => entry !== null)

  const summaryRaw = (r.summary && typeof r.summary === 'object' ? r.summary : {}) as Record<string, unknown>
  const summary = summaryRaw && Object.keys(summaryRaw).length > 0
    ? {
        totalProposals: Number(summaryRaw.total_proposals ?? summaryRaw.totalProposals ?? 0),
        approvalRate: summaryRaw.approval_rate === null
          ? null
          : (summaryRaw.approval_rate !== undefined ? Number(summaryRaw.approval_rate) : null),
        autopromotionAccepted: Number(summaryRaw.autopromotion_accepted ?? summaryRaw.autopromotionAccepted ?? 0),
        autopromotionReverted: Number(summaryRaw.autopromotion_reverted ?? summaryRaw.autopromotionReverted ?? 0),
        autopromotionRevertRate: summaryRaw.autopromotion_revert_rate === null
          ? null
          : (summaryRaw.autopromotion_revert_rate !== undefined ? Number(summaryRaw.autopromotion_revert_rate) : null),
        overreachFlagged: Number(summaryRaw.overreach_flagged ?? summaryRaw.overreachFlagged ?? 0),
        overConservativeFlagged: Number(summaryRaw.over_conservative_flagged ?? summaryRaw.overConservativeFlagged ?? 0),
        trustBand: String(summaryRaw.trust_band ?? summaryRaw.trustBand ?? 'insufficient_data'),
      }
    : undefined

  const countsRaw = (r.counts && typeof r.counts === 'object' ? r.counts : null) as Record<string, unknown> | null
  const counts: Record<string, number> = {}
  if (countsRaw) {
    for (const [key, value] of Object.entries(countsRaw)) {
      counts[key] = Number(value)
    }
  }

  return {
    schemaVersion: schema || 'atlas.self_improvement.human_trust_ledger.v1',
    obraId: nullableString(r.obra_id ?? r.obraId),
    entryCount: Number(r.entry_count ?? r.entryCount ?? entries.length),
    entries,
    updatedAt: nullableString(r.updated_at ?? r.updatedAt),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    counts: Object.keys(counts).length > 0 ? counts : undefined,
    summary,
    knownOutcomes: Array.isArray(r.known_outcomes) ? (r.known_outcomes as string[]) : undefined,
    maxEntries: r.max_entries !== undefined ? Number(r.max_entries) : undefined,
    dedupeWindowSeconds: r.dedupe_window_seconds !== undefined ? Number(r.dedupe_window_seconds) : undefined,
  }
}

function adaptSelfImprovementStrategyPortfolioBucket(raw: unknown): AtlasSelfImprovementStrategyPortfolioBucket | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const bucket = String(r.bucket ?? '')
  if (bucket === '') return null

  return {
    bucket,
    count: Number(r.count ?? 0),
    readyCount: Number(r.ready_count ?? r.readyCount ?? 0),
    blockedCount: Number(r.blocked_count ?? r.blockedCount ?? 0),
    sharePercent: Number(r.share_percent ?? r.sharePercent ?? 0),
    targetPercent: Number(r.target_percent ?? r.targetPercent ?? 0),
    deviationPercent: Number(r.deviation_percent ?? r.deviationPercent ?? 0),
    underweight: Boolean(r.underweight ?? false),
    overweight: Boolean(r.overweight ?? false),
    proposalIds: Array.isArray(r.proposal_ids)
      ? (r.proposal_ids as string[])
      : (Array.isArray(r.proposalIds) ? (r.proposalIds as string[]) : []),
  }
}

function adaptSelfImprovementStrategyPortfolioSnapshot(raw: unknown): AtlasSelfImprovementStrategyPortfolioSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.self_improvement.strategy_portfolio.v1') return null

  const bucketsRaw = Array.isArray(r.buckets) ? r.buckets : []
  const buckets = bucketsRaw
    .map(adaptSelfImprovementStrategyPortfolioBucket)
    .filter((bucket): bucket is AtlasSelfImprovementStrategyPortfolioBucket => bucket !== null)

  return {
    schemaVersion: schema || 'atlas.self_improvement.strategy_portfolio.v1',
    portfolioId: String(r.portfolio_id ?? r.portfolioId ?? ''),
    generatedAt: String(r.generated_at ?? r.generatedAt ?? new Date().toISOString()),
    totalProposals: Number(r.total_proposals ?? r.totalProposals ?? 0),
    buckets,
    balanceHealth: String(r.balance_health ?? r.balanceHealth ?? 'empty_portfolio'),
    recommendedNextBucket: nullableString(r.recommended_next_bucket ?? r.recommendedNextBucket),
    nextAction: String(r.next_action ?? r.nextAction ?? ''),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
  }
}

function adaptSelfImprovementGovernanceState(raw: unknown): AtlasSelfImprovementGovernanceState | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.self_improvement.governance_state.v1') return null

  const commandsRaw = (r.commands && typeof r.commands === 'object' ? r.commands : {}) as Record<string, unknown>
  const commands: Record<string, string> = {}
  for (const [key, value] of Object.entries(commandsRaw)) {
    if (typeof value === 'string') {
      commands[key] = value
    }
  }

  return {
    schemaVersion: schema || 'atlas.self_improvement.governance_state.v1',
    trustLedger: adaptSelfImprovementTrustLedgerSnapshot(r.trust_ledger ?? r.trustLedger ?? null),
    strategyPortfolio: adaptSelfImprovementStrategyPortfolioSnapshot(r.strategy_portfolio ?? r.strategyPortfolio ?? null),
    commands,
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
  }
}

function buildCockpitQuery(filters?: AtlasSelfImprovementActivationCockpitFilters): string {
  if (!filters) return ''
  const params: string[] = []
  if (filters.status) params.push(`status=${encodeURIComponent(filters.status)}`)
  if (filters.bucket) params.push(`bucket=${encodeURIComponent(filters.bucket)}`)
  if (filters.hasObra === true) params.push('has_obra=true')
  if (filters.hasObra === false) params.push('has_obra=false')
  return params.length > 0 ? `?${params.join('&')}` : ''
}

function adaptSelfImprovementActivationListItem(raw: unknown): AtlasSelfImprovementActivationListItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const activationId = nullableString(r.activation_id ?? r.activationId)
  if (activationId === null) return null
  return {
    activationId,
    status: String(r.status ?? 'blocked') as AtlasSelfImprovementActivationStatus,
    statusLabel: String(r.status_label ?? r.statusLabel ?? ''),
    tone: String(r.tone ?? 'ink') as AtlasSelfImprovementActivationTone,
    title: String(r.title ?? 'Self-improvement proposal'),
    proposalId: nullableString(r.proposal_id ?? r.proposalId),
    strategyBucket: nullableString(r.strategy_bucket ?? r.strategyBucket),
    riskLevel: nullableString(r.risk_level ?? r.riskLevel),
    createdObraId: nullableString(r.created_obra_id ?? r.createdObraId),
    createdObraTitle: nullableString(r.created_obra_title ?? r.createdObraTitle),
    updatedAt: nullableString(r.updated_at ?? r.updatedAt),
    nextAction: String(r.next_action ?? r.nextAction ?? 'inspect_status'),
    nextSafeAction: String(r.next_safe_action ?? r.nextSafeAction ?? ''),
    hasBlockers: Boolean(r.has_blockers ?? r.hasBlockers ?? false),
    blockersCount: Number(r.blockers_count ?? r.blockersCount ?? 0),
  }
}

function adaptSelfImprovementActivationProposalSummary(raw: unknown): AtlasSelfImprovementActivationProposalSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    title: String(r.title ?? 'Sem título'),
    problemStatement: nullableString(r.problem_statement ?? r.problemStatement),
    businessRule: nullableString(r.business_rule ?? r.businessRule),
    targetCapability: nullableString(r.target_capability ?? r.targetCapability),
    whyNow: nullableString(r.why_now ?? r.whyNow),
    expectedPowerGain: nullableString(r.expected_power_gain ?? r.expectedPowerGain),
    riskLevel: nullableString(r.risk_level ?? r.riskLevel),
    successMetrics: normList(r.success_metrics ?? r.successMetrics),
    acceptanceGates: normList(r.acceptance_gates ?? r.acceptanceGates),
    canonicalDocs: normList(r.canonical_docs ?? r.canonicalDocs),
    allowedPaths: normList(r.allowed_paths ?? r.allowedPaths),
    forbiddenPaths: normList(r.forbidden_paths ?? r.forbiddenPaths),
    rivalsEvaluationPlan: nullableString(r.rivals_evaluation_plan ?? r.rivalsEvaluationPlan),
    rollbackStrategy: nullableString(r.rollback_strategy ?? r.rollbackStrategy),
    testStrategy: nullableString(r.test_strategy ?? r.testStrategy),
    createsObra: Boolean(r.creates_obra ?? r.createsObra ?? true),
    neverExecutesFastPathAutomatically: Boolean(
      r.never_executes_fast_path_automatically ?? r.neverExecutesFastPathAutomatically ?? true,
    ),
    neverCallsProviderWithoutExplicitApproval: Boolean(
      r.never_calls_provider_without_explicit_approval ?? r.neverCallsProviderWithoutExplicitApproval ?? true,
    ),
  }
}

function adaptSelfImprovementActivationPowerGate(raw: unknown): AtlasSelfImprovementActivationPowerGate | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    outcome: String(r.outcome ?? 'unknown') as AtlasSelfImprovementActivationPowerGateOutcome,
    label: String(r.label ?? ''),
    tone: String(r.tone ?? 'ink') as AtlasSelfImprovementActivationTone,
    hardFails: normList(r.hard_fails ?? r.hardFails),
    softFindings: normList(r.soft_findings ?? r.softFindings),
    requiresHumanReview: Boolean(r.requires_human_review ?? r.requiresHumanReview ?? false),
    autopromotionAllowed: Boolean(r.autopromotion_allowed ?? r.autopromotionAllowed ?? false),
    nextAction: nullableString(r.next_action ?? r.nextAction),
    gateId: nullableString(r.gate_id ?? r.gateId),
  }
}

function adaptSelfImprovementActivationBeforeSnapshot(
  raw: unknown,
): AtlasSelfImprovementActivationBeforeSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const maturity = (r.maturity ?? {}) as Record<string, unknown>
  const invariant = (r.invariant_lock ?? r.invariantLock ?? {}) as Record<string, unknown>
  const regression = (r.regression_sentinel ?? r.regressionSentinel ?? {}) as Record<string, unknown>
  const portfolio = (r.strategy_portfolio ?? r.strategyPortfolio ?? {}) as Record<string, unknown>
  const trust = (r.trust_ledger ?? r.trustLedger ?? {}) as Record<string, unknown>
  const docs = (r.docs_status ?? r.docsStatus ?? {}) as Record<string, unknown>

  return {
    schemaVersion: nullableString(r.schema_version ?? r.schemaVersion),
    capturedAt: nullableString(r.captured_at ?? r.capturedAt),
    rationale: String(r.rationale ?? 'Este snapshot serve para comparar se o Atlas melhorou depois.'),
    maturity: {
      achievedLevel: (maturity.achieved_level ?? maturity.achievedLevel ?? null) as number | string | null,
      targetLevel: (maturity.target_level ?? maturity.targetLevel ?? null) as number | string | null,
      label: String(maturity.label ?? 'pendente'),
      hash: nullableString(maturity.hash),
    },
    invariantLock: {
      status: String(invariant.status ?? 'unknown'),
      tone: String(invariant.tone ?? 'ink') as AtlasSelfImprovementActivationTone,
      violationsCount: Number(invariant.violations_count ?? invariant.violationsCount ?? 0),
      hash: nullableString(invariant.hash),
    },
    regressionSentinel: {
      status: String(regression.status ?? 'unknown'),
      tone: String(regression.tone ?? 'ink') as AtlasSelfImprovementActivationTone,
      findingsCount: Number(regression.findings_count ?? regression.findingsCount ?? 0),
      hash: nullableString(regression.hash),
    },
    strategyPortfolio: {
      balanceHealth: String(portfolio.balance_health ?? portfolio.balanceHealth ?? 'unknown'),
      recommendedNextBucket: nullableString(portfolio.recommended_next_bucket ?? portfolio.recommendedNextBucket),
      hash: nullableString(portfolio.hash),
    },
    trustLedger: {
      trustBand: String(trust.trust_band ?? trust.trustBand ?? 'insufficient_data'),
      entryCount: Number(trust.entry_count ?? trust.entryCount ?? 0),
      hash: nullableString(trust.hash),
    },
    docsStatus: {
      requiredCount: Number(docs.required_count ?? docs.requiredCount ?? 0),
      requiredPresentCount: Number(docs.required_present_count ?? docs.requiredPresentCount ?? 0),
      missingRequired: normList(docs.missing_required ?? docs.missingRequired),
      tone: String(docs.tone ?? 'ink') as AtlasSelfImprovementActivationTone,
    },
  }
}

function adaptSelfImprovementActivationApprovalReceipt(
  raw: unknown,
): AtlasSelfImprovementActivationApprovalReceipt | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    schemaVersion: nullableString(r.schema_version ?? r.schemaVersion),
    activationId: nullableString(r.activation_id ?? r.activationId),
    reviewer: nullableString(r.reviewer),
    reason: nullableString(r.reason),
    approvedAt: nullableString(r.approved_at ?? r.approvedAt),
    receiptHash: nullableString(r.receipt_hash ?? r.receiptHash),
    proposalHash: nullableString(r.proposal_hash ?? r.proposalHash),
    powerGateHash: nullableString(r.power_gate_hash ?? r.powerGateHash),
    silent: Boolean(r.silent ?? false),
    autoPromotesCompletionClaim: Boolean(r.auto_promotes_completion_claim ?? r.autoPromotesCompletionClaim ?? false),
    autoExecutesFastPath: Boolean(r.auto_executes_fast_path ?? r.autoExecutesFastPath ?? false),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
  }
}

function adaptSelfImprovementActivationRejection(raw: unknown): AtlasSelfImprovementActivationRejection | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    reviewer: nullableString(r.reviewer),
    reason: nullableString(r.reason),
    rejectedAt: nullableString(r.rejected_at ?? r.rejectedAt),
    silent: Boolean(r.silent ?? false),
  }
}

function adaptSelfImprovementActivationCreatedObra(
  raw: unknown,
): AtlasSelfImprovementActivationCreatedObra | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const obraId = nullableString(r.obra_id ?? r.obraId)
  if (obraId === null) return null
  return {
    obraId,
    title: String(r.title ?? 'Self-improvement Obra'),
    status: String(r.status ?? 'active'),
    intakeId: nullableString(r.intake_id ?? r.intakeId),
    intakeStatus: String(r.intake_status ?? r.intakeStatus ?? 'pending') as 'filled' | 'pending' | string,
    objective: nullableString(r.objective),
    businessRule: nullableString(r.business_rule ?? r.businessRule),
    acceptanceCriteriaCount: Number(r.acceptance_criteria_count ?? r.acceptanceCriteriaCount ?? 0),
    canonicalDocsCount: Number(r.canonical_docs_count ?? r.canonicalDocsCount ?? 0),
    scopeIn: normList(r.scope_in ?? r.scopeIn),
    scopeOut: normList(r.scope_out ?? r.scopeOut),
    riskLevel: nullableString(r.risk_level ?? r.riskLevel),
    fastPathStarted: Boolean(r.fast_path_started ?? r.fastPathStarted ?? false),
  }
}

function adaptSelfImprovementActivationOpenObraAction(
  raw: unknown,
): AtlasSelfImprovementActivationOpenObraAction {
  if (!raw || typeof raw !== 'object') {
    return { enabled: false, label: 'Abrir Obra no Forge', obraId: null }
  }
  const r = raw as Record<string, unknown>
  return {
    enabled: Boolean(r.enabled ?? false),
    label: String(r.label ?? 'Abrir Obra no Forge'),
    obraId: nullableString(r.obra_id ?? r.obraId),
  }
}

function adaptSelfImprovementActivationDetail(raw: unknown): AtlasSelfImprovementActivationDetail | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  // Accept BOTH the cockpit detail shape and the underlying activation
  // payload returned by the existing accept/reject/store endpoints. When
  // the controller enrichment is applied, the payload includes
  // human_summary + next_safe_action and the rest of the activation
  // fields; otherwise we synthesize a minimal detail so the UI can render.
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  const isCockpit = schema === 'atlas.self_improvement.activation_cockpit.v1'
  const isActivation = schema === 'atlas.self_improvement.forge_activation.v1' || schema === ''

  if (!isCockpit && !isActivation) return null

  const activationId = nullableString(r.activation_id ?? r.activationId)
  const status = String(r.status ?? 'blocked') as AtlasSelfImprovementActivationStatus

  return {
    schemaVersion: schema || 'atlas.self_improvement.activation_cockpit.v1',
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
    activationId,
    status,
    statusLabel: String(r.status_label ?? r.statusLabel ?? statusLabelFromStatus(status)),
    tone: String(r.tone ?? toneFromStatus(status)) as AtlasSelfImprovementActivationTone,
    riskLevel: nullableString(r.risk_level ?? r.riskLevel),
    strategyBucket: nullableString(r.strategy_bucket ?? r.strategyBucket),
    portfolioDeviation: Boolean(r.portfolio_deviation ?? r.portfolioDeviation ?? false),
    portfolioReason: nullableString(r.portfolio_reason ?? r.portfolioReason),
    maturityTarget: (r.maturity_target ?? r.maturityTarget ?? null) as number | string | null,
    proposalSummary: adaptSelfImprovementActivationProposalSummary(r.proposal_summary ?? r.proposalSummary),
    powerGate: adaptSelfImprovementActivationPowerGate(r.power_gate ?? r.powerGate),
    beforeSnapshot: adaptSelfImprovementActivationBeforeSnapshot(r.before_snapshot ?? r.beforeSnapshot),
    approvalState: String(r.approval_state ?? r.approvalState ?? 'blocked'),
    approvalReceipt: adaptSelfImprovementActivationApprovalReceipt(r.approval_receipt ?? r.approvalReceipt ?? r.approval),
    rejection: adaptSelfImprovementActivationRejection(r.rejection),
    createdObra: adaptSelfImprovementActivationCreatedObra(r.created_obra ?? r.createdObra),
    forgeIntakeReady: Boolean(r.forge_intake_ready ?? r.forgeIntakeReady ?? false),
    fastPathStarted: Boolean(r.fast_path_started ?? r.fastPathStarted ?? false),
    openObraAction: adaptSelfImprovementActivationOpenObraAction(r.open_obra_action ?? r.openObraAction),
    nextAction: String(r.next_action ?? r.nextAction ?? 'inspect_status'),
    nextSafeAction: String(r.next_safe_action ?? r.nextSafeAction ?? ''),
    humanSummary: String(r.human_summary ?? r.humanSummary ?? ''),
    blockers: normList(r.blockers),
    missingRequiredDocs: normList(r.missing_required_docs ?? r.missingRequiredDocs),
    evidenceRefs: normList(r.evidence_refs ?? r.evidenceRefs),
    commands: (r.commands && typeof r.commands === 'object'
      ? Object.fromEntries(Object.entries(r.commands as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
      : {}),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    autoFastPathExecuted: Boolean(r.auto_fast_path_executed ?? r.autoFastPathExecuted ?? false),
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
    isReadModel: Boolean(r.is_read_model ?? r.isReadModel ?? false),
  }
}

function adaptSelfImprovementActivationCockpit(raw: unknown): AtlasSelfImprovementActivationCockpit | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.self_improvement.activation_cockpit.v1') return null

  const filtersRaw = (r.filters ?? {}) as Record<string, unknown>
  const countersRaw = (r.counters ?? {}) as Record<string, unknown>
  const activationsRaw = Array.isArray(r.activations) ? (r.activations as unknown[]) : []
  const activations = activationsRaw
    .map(adaptSelfImprovementActivationListItem)
    .filter((item): item is AtlasSelfImprovementActivationListItem => item !== null)

  const commandsRaw = (r.commands && typeof r.commands === 'object'
    ? r.commands
    : {}) as Record<string, unknown>

  return {
    schemaVersion: schema || 'atlas.self_improvement.activation_cockpit.v1',
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
    filters: {
      status: nullableString(filtersRaw.status),
      bucket: nullableString(filtersRaw.bucket),
      hasObra: typeof filtersRaw.has_obra === 'boolean'
        ? (filtersRaw.has_obra as boolean)
        : typeof filtersRaw.hasObra === 'boolean'
          ? (filtersRaw.hasObra as boolean)
          : null,
      activationId: nullableString(filtersRaw.activation_id ?? filtersRaw.activationId),
    },
    activations,
    counters: {
      total: Number(countersRaw.total ?? 0),
      blocked: Number(countersRaw.blocked ?? 0),
      needsRevision: Number(countersRaw.needs_revision ?? countersRaw.needsRevision ?? 0),
      pendingHumanReview: Number(countersRaw.pending_human_review ?? countersRaw.pendingHumanReview ?? 0),
      rejected: Number(countersRaw.rejected ?? 0),
      accepted: Number(countersRaw.accepted ?? 0),
      obraCreated: Number(countersRaw.obra_created ?? countersRaw.obraCreated ?? 0),
      dryRunPlanned: Number(countersRaw.dry_run_planned ?? countersRaw.dryRunPlanned ?? 0),
      withObra: Number(countersRaw.with_obra ?? countersRaw.withObra ?? 0),
      withBlockers: Number(countersRaw.with_blockers ?? countersRaw.withBlockers ?? 0),
    },
    selectedActivation: adaptSelfImprovementActivationDetail(r.selected_activation ?? r.selectedActivation),
    strategyPortfolio: adaptSelfImprovementStrategyPortfolioSnapshot(r.strategy_portfolio ?? r.strategyPortfolio),
    trustLedger: adaptSelfImprovementTrustLedgerSnapshot(r.trust_ledger ?? r.trustLedger),
    humanSummary: String(r.human_summary ?? r.humanSummary ?? ''),
    nextSafeAction: String(r.next_safe_action ?? r.nextSafeAction ?? ''),
    commands: Object.fromEntries(Object.entries(commandsRaw).map(([k, v]) => [k, String(v)])),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    autoFastPathExecuted: Boolean(r.auto_fast_path_executed ?? r.autoFastPathExecuted ?? false),
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
    isReadModel: Boolean(r.is_read_model ?? r.isReadModel ?? true),
  }
}

function statusLabelFromStatus(status: AtlasSelfImprovementActivationStatus): string {
  switch (status) {
    case 'blocked':
      return 'Bloqueada'
    case 'needs_revision':
      return 'Precisa revisão'
    case 'pending_human_review':
      return 'Aguardando humano'
    case 'rejected':
      return 'Rejeitada'
    case 'accepted':
      return 'Aceita'
    case 'obra_created':
      return 'Obra criada'
    case 'dry_run_planned':
      return 'Dry-run'
    default:
      return 'Desconhecido'
  }
}

function toneFromStatus(status: AtlasSelfImprovementActivationStatus): AtlasSelfImprovementActivationTone {
  switch (status) {
    case 'obra_created':
    case 'accepted':
      return 'moss'
    case 'pending_human_review':
    case 'needs_revision':
    case 'dry_run_planned':
      return 'bronze'
    case 'rejected':
    case 'blocked':
      return 'rec-red'
    default:
      return 'ink'
  }
}

function adaptSelfImprovementForgeActivationState(raw: unknown): AtlasSelfImprovementForgeActivationState | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.self_improvement.forge_activation_state.v1') return null

  return {
    schemaVersion: schema || 'atlas.self_improvement.forge_activation_state.v1',
    activationId: nullableString(r.activation_id ?? r.activationId),
    proposalId: nullableString(r.proposal_id ?? r.proposalId),
    proposalHash: nullableString(r.proposal_hash ?? r.proposalHash),
    powerGateHash: nullableString(r.power_gate_hash ?? r.powerGateHash),
    invariantLockHash: nullableString(r.invariant_lock_hash ?? r.invariantLockHash),
    regressionSentinelHash: nullableString(r.regression_sentinel_hash ?? r.regressionSentinelHash),
    strategyBucket: nullableString(r.strategy_bucket ?? r.strategyBucket),
    portfolioDeviation: Boolean(r.portfolio_deviation ?? r.portfolioDeviation ?? false),
    maturityTarget: numberOrNull(r.maturity_target ?? r.maturityTarget),
    reviewer: nullableString(r.reviewer),
    reason: nullableString(r.reason),
    approvedAt: nullableString(r.approved_at ?? r.approvedAt),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
  }
}

function adaptForgeUxOrchestrator(raw: unknown): AtlasCodeForgeUxOrchestrator | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.code.forge_ux_orchestrator.v1') return null

  const safety = (r.safety_summary ?? r.safetySummary ?? {}) as Record<string, unknown>
  const provider = (r.provider_summary ?? r.providerSummary ?? {}) as Record<string, unknown>
  const evidence = (r.evidence_summary ?? r.evidenceSummary ?? {}) as Record<string, unknown>
  const review = (r.review_summary ?? r.reviewSummary ?? {}) as Record<string, unknown>
  const checklist = (r.checklist ?? {}) as Record<string, unknown>
  const blockerTranslationRaw = (r.blocker_translation ?? r.blockerTranslation ?? {}) as Record<string, unknown>
  const completionGatingRaw = (r.completion_gating ?? r.completionGating ?? {}) as Record<string, unknown>
  const evidenceSeparationRaw = (r.evidence_separation ?? r.evidenceSeparation ?? {}) as Record<string, unknown>
  const chatKindsRaw = Array.isArray(r.chat_message_kinds ?? r.chatMessageKinds)
    ? ((r.chat_message_kinds ?? r.chatMessageKinds) as unknown[])
    : []

  return {
    schemaVersion: schema || 'atlas.code.forge_ux_orchestrator.v1',
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
    obraId: nullableString(r.obra_id ?? r.obraId),
    obraPresent: Boolean(r.obra_present ?? r.obraPresent ?? false),
    state: String(r.state ?? 'no_obra'),
    humanStatusLabel: String(r.human_status_label ?? r.humanStatusLabel ?? ''),
    humanStatusDetail: String(r.human_status_detail ?? r.humanStatusDetail ?? ''),
    primaryActionLabel: String(r.primary_action_label ?? r.primaryActionLabel ?? 'Continuar Forge'),
    primaryActionKind: String(r.primary_action_kind ?? r.primaryActionKind ?? 'refresh_status'),
    primaryActionEnabled: Boolean(r.primary_action_enabled ?? r.primaryActionEnabled ?? false),
    primaryActionDisabledReason: nullableString(r.primary_action_disabled_reason ?? r.primaryActionDisabledReason),
    nextSafeStep: String(r.next_safe_step ?? r.nextSafeStep ?? ''),
    blockers: normList(r.blockers),
    blockerTranslation: {
      kind: nullableString(blockerTranslationRaw.kind),
      humanTitle: nullableString(blockerTranslationRaw.human_title ?? blockerTranslationRaw.humanTitle),
      humanDetail: nullableString(blockerTranslationRaw.human_detail ?? blockerTranslationRaw.humanDetail),
      suggestedActionLabel: nullableString(blockerTranslationRaw.suggested_action_label ?? blockerTranslationRaw.suggestedActionLabel),
      suggestedActionKind: nullableString(blockerTranslationRaw.suggested_action_kind ?? blockerTranslationRaw.suggestedActionKind),
      technicalDetail: nullableString(blockerTranslationRaw.technical_detail ?? blockerTranslationRaw.technicalDetail),
      filesOutOfScope: normList(blockerTranslationRaw.files_out_of_scope ?? blockerTranslationRaw.filesOutOfScope),
      isBlocking: Boolean(blockerTranslationRaw.is_blocking ?? blockerTranslationRaw.isBlocking ?? false),
    },
    definitionStatus: String(r.definition_status ?? r.definitionStatus ?? 'incomplete'),
    completionGating: {
      reviewRequired: Boolean(completionGatingRaw.review_required ?? completionGatingRaw.reviewRequired ?? false),
      finalCompletionAllowed: Boolean(completionGatingRaw.final_completion_allowed ?? completionGatingRaw.finalCompletionAllowed ?? false),
      approveButtonVisible: Boolean(completionGatingRaw.approve_button_visible ?? completionGatingRaw.approveButtonVisible ?? false),
      rejectButtonVisible: Boolean(completionGatingRaw.reject_button_visible ?? completionGatingRaw.rejectButtonVisible ?? false),
      rollbackButtonVisible: Boolean(completionGatingRaw.rollback_button_visible ?? completionGatingRaw.rollbackButtonVisible ?? false),
    },
    evidenceSeparation: {
      obraEvidenceRefCount: Number(evidenceSeparationRaw.obra_evidence_ref_count ?? evidenceSeparationRaw.obraEvidenceRefCount ?? 0),
      obraLedgerEventCount: Number(evidenceSeparationRaw.obra_ledger_event_count ?? evidenceSeparationRaw.obraLedgerEventCount ?? 0),
      systemCertificationVisible: Boolean(evidenceSeparationRaw.system_certification_visible ?? evidenceSeparationRaw.systemCertificationVisible ?? true),
      note: String(evidenceSeparationRaw.note ?? ''),
    },
    chatMessageKinds: chatKindsRaw.map((k) => String(k)),
    safetySummary: {
      externalProviderCall: Boolean(safety.external_provider_call ?? safety.externalProviderCall ?? false),
      providerTokensSpent: (safety.provider_tokens_spent ?? safety.providerTokensSpent ?? 0) as number | string,
      completionClaimPromoted: Boolean(safety.completion_claim_promoted ?? safety.completionClaimPromoted ?? false),
      reviewCompletionGatePreserved: Boolean(safety.review_completion_gate_preserved ?? safety.reviewCompletionGatePreserved ?? true),
    },
    providerSummary: {
      provider: nullableString(provider.provider),
      model: nullableString(provider.model),
      decisionSource: String(provider.decision_source ?? provider.decisionSource ?? 'unknown'),
      capacityState: String(provider.capacity_state ?? provider.capacityState ?? 'unknown'),
      driverConfigured: Boolean(provider.driver_configured ?? provider.driverConfigured ?? false),
    },
    evidenceSummary: {
      evidenceRefCount: Number(evidence.evidence_ref_count ?? evidence.evidenceRefCount ?? 0),
      ledgerEventCount: Number(evidence.ledger_event_count ?? evidence.ledgerEventCount ?? 0),
    },
    reviewSummary: {
      reviewRequired: Boolean(review.review_required ?? review.reviewRequired ?? false),
      reviewStatus: String(review.review_status ?? review.reviewStatus ?? 'pending'),
      humanApproved: Boolean(review.human_approved ?? review.humanApproved ?? false),
      finalCompletionAllowed: Boolean(review.final_completion_allowed ?? review.finalCompletionAllowed ?? false),
    },
    checklist: {
      obra: Boolean(checklist.obra ?? false),
      intake: Boolean(checklist.intake ?? false),
      specPlan: Boolean(checklist.spec_plan ?? checklist.specPlan ?? false),
      provider: Boolean(checklist.provider ?? false),
      execution: Boolean(checklist.execution ?? false),
      review: Boolean(checklist.review ?? false),
      evidence: Boolean(checklist.evidence ?? false),
    },
    progressPercent: Number(r.progress_percent ?? r.progressPercent ?? 0),
    signals: (r.signals && typeof r.signals === 'object' ? (r.signals as Record<string, unknown>) : {}),
    advancedRefs: (r.advanced_refs && typeof r.advanced_refs === 'object' ? (r.advanced_refs as Record<string, unknown>) : {}),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: (r.provider_tokens_spent ?? r.providerTokensSpent ?? false) as boolean | string,
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
    note: nullableString(r.note),
  }
}

function adaptObraCommandCenter(raw: unknown): AtlasCodeObraCommandCenter | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.code.obra_command_center.v1') return null

  const provider = (r.provider_summary ?? r.providerSummary ?? {}) as Record<string, unknown>
  const safety = (r.safety_summary ?? r.safetySummary ?? {}) as Record<string, unknown>
  const operationalHealthRaw = (r.operational_health ?? r.operationalHealth ?? {}) as Record<string, unknown>
  const trustSummaryRaw = (r.trust_summary ?? r.trustSummary ?? {}) as Record<string, unknown>
  const evidenceDigestRaw = (r.evidence_digest ?? r.evidenceDigest ?? {}) as Record<string, unknown>
  const blockerSummaryRaw = (r.blocker_summary ?? r.blockerSummary ?? {}) as Record<string, unknown>
  const blockerTranslationRaw = (r.blocker_translation ?? r.blockerTranslation ?? {}) as Record<string, unknown>

  const phasesRaw = Array.isArray(r.lifecycle_phases ?? r.lifecyclePhases)
    ? ((r.lifecycle_phases ?? r.lifecyclePhases) as unknown[])
    : []
  const phases: AtlasCodeObraCommandCenterPhase[] = phasesRaw.map((p) => {
    const phase = (p ?? {}) as Record<string, unknown>
    return {
      key: String(phase.key ?? ''),
      label: String(phase.label ?? ''),
      status: String(phase.status ?? 'not_started'),
      description: String(phase.description ?? ''),
      evidenceCount: Number(phase.evidence_count ?? phase.evidenceCount ?? 0),
      blockerCount: Number(phase.blocker_count ?? phase.blockerCount ?? 0),
      nextAction: String(phase.next_action ?? phase.nextAction ?? ''),
    }
  })

  const milestonesRaw = Array.isArray(r.milestones) ? (r.milestones as unknown[]) : []
  const milestones: AtlasCodeObraCommandCenterMilestone[] = milestonesRaw.map((m) => {
    const item = (m ?? {}) as Record<string, unknown>
    return {
      key: String(item.key ?? ''),
      label: String(item.label ?? ''),
      reached: Boolean(item.reached ?? false),
      reachedAt: nullableString(item.reached_at ?? item.reachedAt),
    }
  })

  const adaptProgress = (rawProgress: unknown): AtlasCodeObraCommandCenterProgress => {
    const p = (rawProgress ?? {}) as Record<string, unknown>
    const items = Array.isArray(p.breakdown) ? (p.breakdown as unknown[]) : []
    return {
      label: String(p.label ?? ''),
      reached: Number(p.reached ?? 0),
      total: Number(p.total ?? 0),
      percent: Number(p.percent ?? 0),
      breakdown: items.map((it): AtlasCodeObraCommandCenterProgressItem => {
        const entry = (it ?? {}) as Record<string, unknown>
        return {
          key: String(entry.key ?? ''),
          label: String(entry.label ?? ''),
          reached: Boolean(entry.reached ?? false),
        }
      }),
    }
  }

  const inboxRaw = Array.isArray(r.decision_inbox ?? r.decisionInbox)
    ? ((r.decision_inbox ?? r.decisionInbox) as unknown[])
    : []
  const decisionInbox: AtlasCodeObraCommandCenterDecision[] = inboxRaw.map((d) => {
    const dec = (d ?? {}) as Record<string, unknown>
    return {
      key: String(dec.key ?? ''),
      label: String(dec.label ?? ''),
      reason: String(dec.reason ?? ''),
      risk: String(dec.risk ?? 'low'),
      recommendedAction: String(dec.recommended_action ?? dec.recommendedAction ?? ''),
      allowedActions: normList(dec.allowed_actions ?? dec.allowedActions),
    }
  })

  const blockerSummary: AtlasCodeObraCommandCenterBlockerSummary = {
    count: Number(blockerSummaryRaw.count ?? 0),
    kinds: normList(blockerSummaryRaw.kinds),
    primaryKind: nullableString(blockerSummaryRaw.primary_kind ?? blockerSummaryRaw.primaryKind),
    primaryHumanTitle: nullableString(blockerSummaryRaw.primary_human_title ?? blockerSummaryRaw.primaryHumanTitle),
  }

  const operationalHealth: AtlasCodeObraCommandCenterOperationalHealth = {
    queueName: String(operationalHealthRaw.queue_name ?? operationalHealthRaw.queueName ?? 'atlas-code-forge'),
    queueStatus: String(operationalHealthRaw.queue_status ?? operationalHealthRaw.queueStatus ?? 'unknown'),
    workerStatus: String(operationalHealthRaw.worker_status ?? operationalHealthRaw.workerStatus ?? 'unknown'),
    lastEventAt: nullableString(operationalHealthRaw.last_event_at ?? operationalHealthRaw.lastEventAt),
    currentStateAgeSeconds: ((): number | null => {
      const v = operationalHealthRaw.current_state_age_seconds ?? operationalHealthRaw.currentStateAgeSeconds
      if (v === null || v === undefined) return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    })(),
    heartbeatStatus: String(operationalHealthRaw.heartbeat_status ?? operationalHealthRaw.heartbeatStatus ?? 'unknown'),
    stale: Boolean(operationalHealthRaw.stale ?? false),
    watchdogNextAction: nullableString(operationalHealthRaw.watchdog_next_action ?? operationalHealthRaw.watchdogNextAction),
    humanMessage: String(operationalHealthRaw.human_message ?? operationalHealthRaw.humanMessage ?? ''),
    note: String(operationalHealthRaw.note ?? ''),
  }

  const trustSummary: AtlasCodeObraCommandCenterTrustSummary = {
    evidenceStrength: String(trustSummaryRaw.evidence_strength ?? trustSummaryRaw.evidenceStrength ?? 'none'),
    testsRunCount: Number(trustSummaryRaw.tests_run_count ?? trustSummaryRaw.testsRunCount ?? 0),
    receiptsCount: Number(trustSummaryRaw.receipts_count ?? trustSummaryRaw.receiptsCount ?? 0),
    ledgerEventsCount: Number(trustSummaryRaw.ledger_events_count ?? trustSummaryRaw.ledgerEventsCount ?? 0),
    missingEvidence: normList(trustSummaryRaw.missing_evidence ?? trustSummaryRaw.missingEvidence),
    riskLevel: String(trustSummaryRaw.risk_level ?? trustSummaryRaw.riskLevel ?? 'medium'),
    claimStatus: String(trustSummaryRaw.claim_status ?? trustSummaryRaw.claimStatus ?? 'not_allowed'),
    reviewStatus: String(trustSummaryRaw.review_status ?? trustSummaryRaw.reviewStatus ?? 'pending'),
    providerExternalCall: Boolean(trustSummaryRaw.provider_external_call ?? trustSummaryRaw.providerExternalCall ?? false),
    tokenSpend: Boolean(trustSummaryRaw.token_spend ?? trustSummaryRaw.tokenSpend ?? false),
    note: String(trustSummaryRaw.note ?? ''),
  }

  const evidenceDigest: AtlasCodeObraCommandCenterEvidenceDigest = {
    obraEvidenceRefCount: Number(evidenceDigestRaw.obra_evidence_ref_count ?? evidenceDigestRaw.obraEvidenceRefCount ?? 0),
    obraLedgerEventCount: Number(evidenceDigestRaw.obra_ledger_event_count ?? evidenceDigestRaw.obraLedgerEventCount ?? 0),
    latestEvidenceAt: nullableString(evidenceDigestRaw.latest_evidence_at ?? evidenceDigestRaw.latestEvidenceAt),
    systemCertificationsSeparated: Boolean(
      evidenceDigestRaw.system_certifications_separated ?? evidenceDigestRaw.systemCertificationsSeparated ?? true,
    ),
    note: String(evidenceDigestRaw.note ?? ''),
  }

  return {
    schemaVersion: schema || 'atlas.code.obra_command_center.v1',
    status: String(r.status ?? 'no_obra'),
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
    obraId: nullableString(r.obra_id ?? r.obraId),
    obraPresent: Boolean(r.obra_present ?? r.obraPresent ?? false),
    obraTitle: nullableString(r.obra_title ?? r.obraTitle),
    objectiveSummary: nullableString(r.objective_summary ?? r.objectiveSummary),
    humanStatusLabel: String(r.human_status_label ?? r.humanStatusLabel ?? ''),
    humanStatusDetail: String(r.human_status_detail ?? r.humanStatusDetail ?? ''),
    currentPhase: nullableString(r.current_phase ?? r.currentPhase),
    nextPhase: nullableString(r.next_phase ?? r.nextPhase),
    nextSafeAction: String(r.next_safe_action ?? r.nextSafeAction ?? ''),
    primaryActionKind: String(r.primary_action_kind ?? r.primaryActionKind ?? 'refresh_status'),
    primaryActionLabel: String(r.primary_action_label ?? r.primaryActionLabel ?? ''),
    primaryActionEnabled: Boolean(r.primary_action_enabled ?? r.primaryActionEnabled ?? false),
    primaryActionDisabledReason: nullableString(r.primary_action_disabled_reason ?? r.primaryActionDisabledReason),
    lifecyclePhases: phases,
    milestones,
    readinessProgress: adaptProgress(r.readiness_progress ?? r.readinessProgress),
    provenDeliveryProgress: adaptProgress(r.proven_delivery_progress ?? r.provenDeliveryProgress),
    decisionInbox,
    blockerSummary,
    blockerTranslation: {
      kind: nullableString(blockerTranslationRaw.kind),
      humanTitle: nullableString(blockerTranslationRaw.human_title ?? blockerTranslationRaw.humanTitle),
      humanDetail: nullableString(blockerTranslationRaw.human_detail ?? blockerTranslationRaw.humanDetail),
      suggestedActionLabel: nullableString(blockerTranslationRaw.suggested_action_label ?? blockerTranslationRaw.suggestedActionLabel),
      suggestedActionKind: nullableString(blockerTranslationRaw.suggested_action_kind ?? blockerTranslationRaw.suggestedActionKind),
      technicalDetail: nullableString(blockerTranslationRaw.technical_detail ?? blockerTranslationRaw.technicalDetail),
      filesOutOfScope: normList(blockerTranslationRaw.files_out_of_scope ?? blockerTranslationRaw.filesOutOfScope),
      isBlocking: Boolean(blockerTranslationRaw.is_blocking ?? blockerTranslationRaw.isBlocking ?? false),
    },
    operationalHealth,
    trustSummary,
    evidenceDigest,
    providerSummary: {
      provider: nullableString(provider.provider),
      model: nullableString(provider.model),
      decisionSource: String(provider.decision_source ?? provider.decisionSource ?? 'unknown'),
      capacityState: String(provider.capacity_state ?? provider.capacityState ?? 'unknown'),
      driverConfigured: Boolean(provider.driver_configured ?? provider.driverConfigured ?? false),
    },
    safetySummary: {
      externalProviderCall: Boolean(safety.external_provider_call ?? safety.externalProviderCall ?? false),
      providerTokensSpent: (safety.provider_tokens_spent ?? safety.providerTokensSpent ?? 0) as number | string,
      completionClaimPromoted: Boolean(safety.completion_claim_promoted ?? safety.completionClaimPromoted ?? false),
      reviewCompletionGatePreserved: Boolean(safety.review_completion_gate_preserved ?? safety.reviewCompletionGatePreserved ?? true),
      externalRivalsCertification: String(safety.external_rivals_certification ?? safety.externalRivalsCertification ?? 'blocked_requires_operator_approval'),
    },
    advancedRefs: (r.advanced_refs && typeof r.advanced_refs === 'object' ? (r.advanced_refs as Record<string, unknown>) : {}),
    chatMessageKinds: (Array.isArray(r.chat_message_kinds ?? r.chatMessageKinds)
      ? ((r.chat_message_kinds ?? r.chatMessageKinds) as unknown[]).map((k) => String(k))
      : []),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: (r.provider_tokens_spent ?? r.providerTokensSpent ?? false) as boolean | string,
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    reviewGatePreserved: Boolean(r.review_gate_preserved ?? r.reviewGatePreserved ?? true),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
    note: nullableString(r.note),
  }
}

function adaptForgeProviderDriverStatus(raw: unknown): AtlasForgeProviderDriverStatus | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const driversRaw = Array.isArray(r.drivers) ? (r.drivers as unknown[]) : []
  const drivers: AtlasForgeProviderDriverEntry[] = driversRaw.map((entry) => {
    const e = (entry ?? {}) as Record<string, unknown>
    return {
      schemaVersion: String(e.schema_version ?? e.schemaVersion ?? 'atlas.forge.provider_driver_config_status.v1'),
      provider: String(e.provider ?? 'unknown'),
      configured: Boolean(e.configured ?? false),
      runtimePresent: Boolean(e.runtime_present ?? e.runtimePresent ?? false),
      binaryPath: nullableString(e.binary_path ?? e.binaryPath),
      authState: String(e.auth_state ?? e.authState ?? 'unknown'),
      modelPrefixes: normList(e.model_prefixes ?? e.modelPrefixes),
      allowedBinaries: normList(e.allowed_binaries ?? e.allowedBinaries),
      blockers: normList(e.blockers),
      externalProviderCallPossible: Boolean(e.external_provider_call_possible ?? e.externalProviderCallPossible ?? false),
      providerTokensMaySpend: Boolean(e.provider_tokens_may_be_spent ?? e.providerTokensMaySpend ?? false),
      note: nullableString(e.note),
    }
  })
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.forge.provider_driver_router_status.v1'),
    drivers,
    configuredDrivers: normList(r.configured_drivers ?? r.configuredDrivers),
    note: nullableString(r.note),
  }
}

function adaptForgeProviderDriverPlanPacket(raw: unknown): AtlasForgeProviderDriverPlanPacket | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.forge.provider_driver_plan_packet.v1'),
    invocation: (r.invocation && typeof r.invocation === 'object' ? (r.invocation as Record<string, unknown>) : {}),
    driverStatus: (r.driver_status && typeof r.driver_status === 'object' ? (r.driver_status as Record<string, unknown>) : {}),
    driverPlan: (r.driver_plan && typeof r.driver_plan === 'object' ? (r.driver_plan as Record<string, unknown>) : {}),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    note: nullableString(r.note),
  }
}

function adaptForgeProviderInvocationSnapshot(raw: unknown): AtlasForgeProviderInvocationSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if ((r.status ?? null) === 'no_invocation_history') {
    return null
  }
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.forge.provider_invocation.v1'),
    status: String(r.status ?? 'blocked'),
    mode: String(r.mode ?? 'dry_run'),
    obraId: nullableString(r.obra_id ?? r.obraId),
    invocationId: nullableString(r.invocation_id ?? r.invocationId),
    dispatchId: nullableString(r.dispatch_id ?? r.dispatchId),
    role: nullableString(r.role),
    provider: nullableString(r.provider),
    model: nullableString(r.model),
    providerCalled: Boolean(r.provider_called ?? r.providerCalled ?? false),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: (() => {
      const v = r.provider_tokens_spent ?? r.providerTokensSpent
      if (typeof v === 'boolean' || typeof v === 'string') return v
      return false
    })(),
    exitCode: typeof r.exit_code === 'number' ? r.exit_code : (typeof r.exitCode === 'number' ? r.exitCode : null),
    durationMs: typeof r.duration_ms === 'number' ? r.duration_ms : (typeof r.durationMs === 'number' ? r.durationMs : null),
    stdoutHash: nullableString(r.stdout_hash ?? r.stdoutHash),
    stderrHash: nullableString(r.stderr_hash ?? r.stderrHash),
    outputExcerpt: nullableString(r.output_excerpt ?? r.outputExcerpt),
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    reviewCompletionGatePreserved: Boolean(r.review_completion_gate_preserved ?? r.reviewCompletionGatePreserved ?? true),
    blockers: normList(r.blockers),
    nextAction: nullableString(r.next_action ?? r.nextAction),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
    note: nullableString(r.note),
  }
}

function adaptForgeProviderInvocationReceipt(raw: unknown): AtlasForgeProviderInvocationReceipt | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.forge.provider_invocation_receipt.v1'),
    receiptId: String(r.receipt_id ?? r.receiptId ?? ''),
    receiptHash: String(r.receipt_hash ?? r.receiptHash ?? ''),
    invocationId: nullableString(r.invocation_id ?? r.invocationId),
    status: String(r.status ?? 'blocked'),
    mode: String(r.mode ?? 'dry_run'),
    provider: nullableString(r.provider),
    model: nullableString(r.model),
    providerCalled: Boolean(r.provider_called ?? r.providerCalled ?? false),
    startedAt: nullableString(r.started_at ?? r.startedAt),
    completedAt: nullableString(r.completed_at ?? r.completedAt),
    durationMs: typeof r.duration_ms === 'number' ? r.duration_ms : null,
    exitCode: typeof r.exit_code === 'number' ? r.exit_code : null,
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
  }
}

function adaptForgeRuntimeDispatchPlan(raw: unknown): AtlasForgeRuntimeDispatchPlan {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.forge.runtime_dispatch_plan.v1'),
    status: String(r.status ?? 'blocked'),
    obraId: nullableString(r.obra_id ?? r.obraId),
    obraPresent: Boolean(r.obra_present ?? r.obraPresent ?? false),
    dispatchId: nullableString(r.dispatch_id ?? r.dispatchId),
    fastPathRunId: nullableString(r.fast_path_run_id ?? r.fastPathRunId),
    decisionReceiptId: nullableString(r.decision_receipt_id ?? r.decisionReceiptId),
    decisionReceiptHash: nullableString(r.decision_receipt_hash ?? r.decisionReceiptHash),
    childDecisionReceiptId: nullableString(r.child_decision_receipt_id ?? r.childDecisionReceiptId),
    childDecisionReceiptHash: nullableString(r.child_decision_receipt_hash ?? r.childDecisionReceiptHash),
    providerTopologyId: nullableString(r.provider_topology_id ?? r.providerTopologyId),
    decisionSource: nullableString(r.decision_source ?? r.decisionSource),
    role: nullableString(r.role),
    provider: nullableString(r.provider),
    model: nullableString(r.model),
    runtimeDispatchAllowed: Boolean(r.runtime_dispatch_allowed ?? r.runtimeDispatchAllowed ?? false),
    executionMode: nullableString(r.execution_mode ?? r.executionMode),
    fallbackEventId: nullableString(r.fallback_event_id ?? r.fallbackEventId),
    fallbackFailureType: nullableString(r.fallback_failure_type ?? r.fallbackFailureType),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerInvocationPlanned: Boolean(r.provider_invocation_planned ?? r.providerInvocationPlanned ?? false),
    requiresProviderApproval: Boolean(r.requires_provider_approval ?? r.requiresProviderApproval ?? true),
    qualityGates: normList(r.quality_gates ?? r.qualityGates),
    reviewCompletionGatePreserved: Boolean(r.review_completion_gate_preserved ?? r.reviewCompletionGatePreserved ?? true),
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    evidenceRefs: normList(r.evidence_refs ?? r.evidenceRefs),
    blockers: normList(r.blockers),
    nextAction: nullableString(r.next_action ?? r.nextAction),
    generatedAt: nullableString(r.generated_at ?? r.generatedAt),
    recordedAt: nullableString(r.recorded_at ?? r.recordedAt),
    note: nullableString(r.note),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
  }
}

function adaptNullableForgeRuntimeDispatchPlan(raw: unknown): AtlasForgeRuntimeDispatchPlan | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = r.schema_version ?? r.schemaVersion
  if (typeof schema === 'string' && schema !== '' && schema !== 'atlas.forge.runtime_dispatch_plan.v1') {
    return null
  }
  return adaptForgeRuntimeDispatchPlan(raw)
}

function adaptForgeProviderTopology(raw: unknown): AtlasForgeProviderTopology {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const roles: AtlasForgeProviderRole[] = Array.isArray(r.roles)
    ? (r.roles as unknown[]).map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>
        return {
          role: String(e.role ?? 'unknown'),
          provider: nullableString(e.provider),
          model: nullableString(e.model),
          status: String(e.status ?? 'available'),
          capabilityReason: nullableString(e.capability_reason ?? e.capabilityReason),
          riskFit: nullableString(e.risk_fit ?? e.riskFit),
          autonomyLevel: nullableString(e.autonomy_level ?? e.autonomyLevel),
          fallbackOrder: numberOrUndefined(e.fallback_order ?? e.fallbackOrder) ?? 0,
          qualityRole: nullableString(e.quality_role ?? e.qualityRole),
          requiresHumanReview: Boolean(e.requires_human_review ?? e.requiresHumanReview ?? false),
          evidenceRequired: Boolean(e.evidence_required ?? e.evidenceRequired ?? false),
          decisionSource: nullableString(e.decision_source ?? e.decisionSource),
        }
      })
    : []

  const fallbackChain: AtlasForgeProviderFallbackEntry[] = Array.isArray(r.fallback_chain ?? r.fallbackChain)
    ? ((r.fallback_chain ?? r.fallbackChain) as unknown[]).map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>
        return {
          order: numberOrUndefined(e.order) ?? 0,
          role: nullableString(e.role),
          provider: nullableString(e.provider),
          model: nullableString(e.model),
          capable: e.capable === undefined ? true : Boolean(e.capable),
          reason: nullableString(e.reason),
        }
      })
    : []

  const providerCapacity: AtlasForgeProviderCapacityEntry[] = Array.isArray(r.provider_capacity ?? r.providerCapacity)
    ? ((r.provider_capacity ?? r.providerCapacity) as unknown[]).map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>
        return {
          provider: String(e.provider ?? 'unknown'),
          capacityState: String(e.capacity_state ?? e.capacityState ?? 'unknown'),
          quotaState: String(e.quota_state ?? e.quotaState ?? 'unknown'),
          rateLimitState: String(e.rate_limit_state ?? e.rateLimitState ?? 'unknown'),
        }
      })
    : []

  let lastFallbackEvent: AtlasForgeProviderFallbackEvent | null = null
  const eventRaw = (r.last_fallback_event ?? r.lastFallbackEvent) as Record<string, unknown> | null | undefined
  if (eventRaw && typeof eventRaw === 'object') {
    lastFallbackEvent = {
      schemaVersion: String(eventRaw.schema_version ?? eventRaw.schemaVersion ?? 'atlas.forge.provider_fallback_event.v1'),
      eventId: String(eventRaw.event_id ?? eventRaw.eventId ?? ''),
      occurredAt: String(eventRaw.occurred_at ?? eventRaw.occurredAt ?? ''),
      failureType: String(eventRaw.failure_type ?? eventRaw.failureType ?? 'provider_error'),
      failedRole: nullableString(eventRaw.failed_role ?? eventRaw.failedRole),
      failedProvider: nullableString(eventRaw.failed_provider ?? eventRaw.failedProvider),
      failedModel: nullableString(eventRaw.failed_model ?? eventRaw.failedModel),
      reason: nullableString(eventRaw.reason),
      action: String(eventRaw.action ?? 'block'),
      selectedFallbackRole: nullableString(eventRaw.selected_fallback_role ?? eventRaw.selectedFallbackRole),
      selectedFallbackProvider: nullableString(eventRaw.selected_fallback_provider ?? eventRaw.selectedFallbackProvider),
      selectedFallbackModel: nullableString(eventRaw.selected_fallback_model ?? eventRaw.selectedFallbackModel),
      blocker: nullableString(eventRaw.blocker),
      silent: Boolean(eventRaw.silent ?? false),
      reducesQualityGates: Boolean(eventRaw.reduces_quality_gates ?? eventRaw.reducesQualityGates ?? false),
      bypassesReviewCompletionGate: Boolean(eventRaw.bypasses_review_completion_gate ?? eventRaw.bypassesReviewCompletionGate ?? false),
      autoCompletesWork: Boolean(eventRaw.auto_completes_work ?? eventRaw.autoCompletesWork ?? false),
      fallbackChildReceiptRequired: Boolean(eventRaw.fallback_child_receipt_required ?? eventRaw.fallbackChildReceiptRequired ?? false),
      runtimeDispatchAllowed: Boolean(eventRaw.runtime_dispatch_allowed ?? eventRaw.runtimeDispatchAllowed ?? false),
      obraId: nullableString(eventRaw.obra_id ?? eventRaw.obraId),
      providerTopologyId: nullableString(eventRaw.provider_topology_id ?? eventRaw.providerTopologyId),
      strategy: nullableString(eventRaw.strategy),
    }
  }

  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.forge.provider_topology.v1'),
    status: String(r.status ?? 'available'),
    obraId: nullableString(r.obra_id ?? r.obraId),
    obraPresent: Boolean(r.obra_present ?? r.obraPresent ?? false),
    fastPathRunId: nullableString(r.fast_path_run_id ?? r.fastPathRunId),
    decisionReceiptId: nullableString(r.decision_receipt_id ?? r.decisionReceiptId),
    decisionReceiptHash: nullableString(r.decision_receipt_hash ?? r.decisionReceiptHash),
    receiptSchemaVersion: nullableString(r.receipt_schema_version ?? r.receiptSchemaVersion),
    providerTopologyId: String(r.provider_topology_id ?? r.providerTopologyId ?? ''),
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
    strategy: nullableString(r.strategy),
    decisionSource: String(r.decision_source ?? r.decisionSource ?? 'static_policy'),
    roles,
    fallbackChain,
    providerCapacity,
    blockers: normList(r.blockers),
    lastFallbackEvent,
    fallbackChildReceiptRequired: Boolean(r.fallback_child_receipt_required ?? r.fallbackChildReceiptRequired ?? false),
    runtimeDispatchAllowed: Boolean(r.runtime_dispatch_allowed ?? r.runtimeDispatchAllowed ?? false),
    evidenceRefs: normList(r.evidence_refs ?? r.evidenceRefs),
    nextAction: String(r.next_action ?? r.nextAction ?? 'unknown'),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    isReadModel: Boolean(r.is_read_model ?? r.isReadModel ?? true),
    note: nullableString(r.note),
  }
}

function adaptNullableForgeProviderTopology(raw: unknown): AtlasForgeProviderTopology | null {
  if (!raw || typeof raw !== 'object') return null
  const schema = (raw as Record<string, unknown>).schema_version ?? (raw as Record<string, unknown>).schemaVersion
  if (typeof schema === 'string' && schema !== '' && schema !== 'atlas.forge.provider_topology.v1') {
    return null
  }
  return adaptForgeProviderTopology(raw)
}

function adaptForgeProviderCapacityEntry(raw: unknown): AtlasForgeProviderCapacityEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const provider = String(r.provider ?? '')
  if (provider === '') return null

  return {
    provider,
    capacityState: String(r.capacity_state ?? r.capacityState ?? 'unknown'),
    quotaState: String(r.quota_state ?? r.quotaState ?? 'unknown'),
    rateLimitState: String(r.rate_limit_state ?? r.rateLimitState ?? 'unknown'),
    schemaVersion: nullableString(r.schema_version ?? r.schemaVersion) ?? undefined,
    label: nullableString(r.label) ?? undefined,
    status: nullableString(r.status) ?? undefined,
    authState: nullableString(r.auth_state ?? r.authState) ?? undefined,
    runtimePresent: r.runtime_present !== undefined ? Boolean(r.runtime_present) : undefined,
    configPresent: r.config_present !== undefined ? Boolean(r.config_present) : undefined,
    lastSuccessAt: nullableString(r.last_success_at ?? r.lastSuccessAt),
    lastFailureAt: nullableString(r.last_failure_at ?? r.lastFailureAt),
    lastFailureType: nullableString(r.last_failure_type ?? r.lastFailureType),
    cooldownUntil: nullableString(r.cooldown_until ?? r.cooldownUntil),
    confidence: nullableString(r.confidence) ?? undefined,
    evidenceRefs: normList(r.evidence_refs ?? r.evidenceRefs),
    blockers: normList(r.blockers),
    nextAction: nullableString(r.next_action ?? r.nextAction) ?? undefined,
    externalProviderCall: r.external_provider_call !== undefined ? Boolean(r.external_provider_call) : undefined,
  }
}

function adaptForgeProviderCapacity(raw: unknown): AtlasForgeProviderCapacity | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.forge.provider_capacity.v1') return null

  const providersRaw = Array.isArray(r.providers) ? r.providers : []
  const providers = providersRaw
    .map(adaptForgeProviderCapacityEntry)
    .filter((entry): entry is AtlasForgeProviderCapacityEntry => entry !== null)

  return {
    schemaVersion: schema || 'atlas.forge.provider_capacity.v1',
    status: String(r.status ?? 'unknown'),
    generatedAt: String(r.generated_at ?? r.generatedAt ?? new Date().toISOString()),
    snapshotId: String(r.snapshot_id ?? r.snapshotId ?? ''),
    workspace: String(r.workspace ?? ''),
    obraId: nullableString(r.obra_id ?? r.obraId),
    obraResolved: Boolean(r.obra_resolved ?? r.obraResolved ?? false),
    obraResolutionStatus: String(r.obra_resolution_status ?? r.obraResolutionStatus ?? 'not_required'),
    providers,
    bestAvailableProvider: nullableString(r.best_available_provider ?? r.bestAvailableProvider),
    providerCount: Number(r.provider_count ?? r.providerCount ?? providers.length),
    availableCount: Number(r.available_count ?? r.availableCount ?? 0),
    degradedCount: Number(r.degraded_count ?? r.degradedCount ?? 0),
    unavailableCount: Number(r.unavailable_count ?? r.unavailableCount ?? 0),
    unknownCount: Number(r.unknown_count ?? r.unknownCount ?? 0),
    blockers: normList(r.blockers),
    runtimeDispatchAllowed: Boolean(r.runtime_dispatch_allowed ?? r.runtimeDispatchAllowed ?? false),
    nextAction: String(r.next_action ?? r.nextAction ?? ''),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    isReadModel: Boolean(r.is_read_model ?? r.isReadModel ?? true),
    note: nullableString(r.note),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
  }
}

function adaptForgeProviderFailureMemoryEvent(raw: unknown): AtlasForgeProviderFailureMemoryEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const eventId = String(r.event_id ?? r.eventId ?? '')
  if (eventId === '') return null

  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.forge.provider_failure_memory_event.v1'),
    eventId,
    occurredAt: String(r.occurred_at ?? r.occurredAt ?? new Date().toISOString()),
    provider: String(r.provider ?? ''),
    model: nullableString(r.model),
    role: nullableString(r.role),
    failureType: String(r.failure_type ?? r.failureType ?? ''),
    action: nullableString(r.action),
    blocker: nullableString(r.blocker),
    reason: nullableString(r.reason),
    cooldownUntil: nullableString(r.cooldown_until ?? r.cooldownUntil),
    fallbackEventId: nullableString(r.fallback_event_id ?? r.fallbackEventId),
    decisionReceiptId: nullableString(r.decision_receipt_id ?? r.decisionReceiptId),
    providerTopologyId: nullableString(r.provider_topology_id ?? r.providerTopologyId),
    capacitySnapshotId: nullableString(r.capacity_snapshot_id ?? r.capacitySnapshotId),
    providerStatusBefore: nullableString(r.provider_status_before ?? r.providerStatusBefore),
    providerStatusAfter: nullableString(r.provider_status_after ?? r.providerStatusAfter),
    silent: Boolean(r.silent ?? false),
    reducesQualityGates: Boolean(r.reduces_quality_gates ?? r.reducesQualityGates ?? false),
    bypassesReviewCompletionGate: Boolean(r.bypasses_review_completion_gate ?? r.bypassesReviewCompletionGate ?? false),
    autoCompletesWork: Boolean(r.auto_completes_work ?? r.autoCompletesWork ?? false),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    evidenceHash: nullableString(r.evidence_hash ?? r.evidenceHash),
  }
}

function adaptForgeProviderFailureMemory(raw: unknown): AtlasForgeProviderFailureMemory | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.forge.provider_failure_memory.v1') return null

  const eventsRaw = Array.isArray(r.events) ? r.events : []
  const events = eventsRaw
    .map(adaptForgeProviderFailureMemoryEvent)
    .filter((event): event is AtlasForgeProviderFailureMemoryEvent => event !== null)

  const cooldownPolicyRaw = (r.cooldown_policy ?? r.cooldownPolicy) as unknown
  const cooldownPolicy: Record<string, number> = {}
  if (cooldownPolicyRaw && typeof cooldownPolicyRaw === 'object') {
    for (const [key, value] of Object.entries(cooldownPolicyRaw as Record<string, unknown>)) {
      const numeric = Number(value)
      if (!Number.isNaN(numeric)) {
        cooldownPolicy[key] = numeric
      }
    }
  }

  return {
    schemaVersion: schema || 'atlas.forge.provider_failure_memory.v1',
    obraId: nullableString(r.obra_id ?? r.obraId),
    eventCount: Number(r.event_count ?? r.eventCount ?? events.length),
    events,
    updatedAt: nullableString(r.updated_at ?? r.updatedAt),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    cooldownPolicy: Object.keys(cooldownPolicy).length > 0 ? cooldownPolicy : undefined,
    maxEvents: r.max_events !== undefined ? Number(r.max_events) : undefined,
    dedupeWindowSeconds: r.dedupe_window_seconds !== undefined ? Number(r.dedupe_window_seconds) : undefined,
    knownFailures: Array.isArray(r.known_failures) ? (r.known_failures as string[]) : undefined,
  }
}

function adaptForgeContinuumCertificationSummary(raw: unknown): AtlasForgeContinuumCertificationSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.forge_continuum_certification.v1') return null

  const invariantsRaw = (r.invariants ?? {}) as Record<string, unknown>
  const invariants: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(invariantsRaw)) {
    invariants[key] = Boolean(value)
  }

  return {
    schemaVersion: schema || 'atlas.forge_continuum_certification.v1',
    status: String(r.status ?? 'available'),
    obraId: nullableString(r.obra_id ?? r.obraId),
    obraPresent: Boolean(r.obra_present ?? r.obraPresent ?? false),
    invariantsAllTrue: Boolean(r.invariants_all_true ?? r.invariantsAllTrue ?? false),
    invariants,
    blockers: normList(r.blockers),
    evidenceCommand: nullableString(r.evidence_command ?? r.evidenceCommand),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
    note: nullableString(r.note),
  }
}

function adaptForgeFastPath(raw: unknown): AtlasCodeForgeFastPathSnapshot {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const commands = (r.commands && typeof r.commands === 'object' ? r.commands : {}) as Record<string, unknown>
  const commandMap: Record<string, string> = {}
  for (const [key, value] of Object.entries(commands)) {
    if (typeof value === 'string') commandMap[key] = value
  }

  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.code.forge_fast_path.v1'),
    fastPathRunId: nullableString(r.fast_path_run_id ?? r.fastPathRunId),
    generatedAt: nullableString(r.generated_at ?? r.generatedAt),
    startedAt: nullableString(r.started_at ?? r.startedAt),
    updatedAt: nullableString(r.updated_at ?? r.updatedAt),
    status: String(r.status ?? 'unknown'),
    mode: String(r.mode ?? 'execute_async'),
    obraId: nullableString(r.obra_id ?? r.obraId),
    operatorId: nullableString(r.operator_id ?? r.operatorId),
    workItemId: nullableString(r.work_item_id ?? r.workItemId),
    workItemCode: nullableString(r.work_item_code ?? r.workItemCode),
    specHash: nullableString(r.spec_hash ?? r.specHash),
    planHash: nullableString(r.plan_hash ?? r.planHash),
    taskCount: numberOrUndefined(r.task_count ?? r.taskCount) ?? 0,
    executionId: nullableString(r.execution_id ?? r.executionId),
    historyId: nullableString(r.history_id ?? r.historyId),
    checkpointId: nullableString(r.checkpoint_id ?? r.checkpointId),
    currentStage: nullableString(r.current_stage ?? r.currentStage),
    progressPercent: numberOrUndefined(r.progress_percent ?? r.progressPercent) ?? null,
    stages: Array.isArray(r.stages)
      ? r.stages.map((stage) => {
          const s = (stage ?? {}) as Record<string, unknown>
          return {
            ...s,
            name: String(s.name ?? 'stage'),
            status: String(s.status ?? 'unknown'),
            blocker: nullableString(s.blocker),
          }
        })
      : [],
    blockers: normList(r.blockers),
    evidenceRefs: normList(r.evidence_refs ?? r.evidenceRefs),
    commands: commandMap,
    nextAction: String(r.next_action ?? r.nextAction ?? 'unknown'),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    note: nullableString(r.note),
  }
}

function adaptNullableForgeFastPath(raw: unknown): AtlasCodeForgeFastPathSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const schema = (raw as Record<string, unknown>).schema_version ?? (raw as Record<string, unknown>).schemaVersion
  if (schema !== 'atlas.code.forge_fast_path.v1') return null
  return adaptForgeFastPath(raw)
}

async function forgeReviewDecision(
  obraId: string,
  runId: string,
  decision: 'approve' | 'reject' | 'rollback',
  payload: { reviewer: string; reason: string },
): Promise<AtlasCodeForgeReviewDecisionResponse> {
  const body = { reviewer: payload.reviewer, reason: payload.reason }
  let raw: unknown
  if (MODE === 'tauri') {
    raw = await invokeTauri<unknown>('bridge_decide_forge_review', {
      workId: obraId,
      runId,
      decision,
      payload: body,
    })
  } else if (MODE === 'http') {
    raw = await fetchHttp<unknown>(
      `/atlas-code/works/${encodeURIComponent(obraId)}/forge/fast-path/${encodeURIComponent(runId)}/review/${decision}`,
      { method: 'POST', body },
    )
  } else {
    offline(`forgeReview:${decision}`)
  }
  return adaptForgeReviewDecisionResponse(raw)
}

function adaptForgeReviewPacket(raw: unknown): AtlasCodeForgeReviewPacket | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.code.forge_review_packet.v1') return null

  const correlationRaw = (r.correlation && typeof r.correlation === 'object'
    ? (r.correlation as Record<string, unknown>)
    : null)

  return {
    schemaVersion: schema || 'atlas.code.forge_review_packet.v1',
    reviewPacketId: nullableString(r.review_packet_id ?? r.reviewPacketId),
    obraId: nullableString(r.obra_id ?? r.obraId),
    fastPathRunId: nullableString(r.fast_path_run_id ?? r.fastPathRunId),
    workItemId: nullableString(r.work_item_id ?? r.workItemId),
    executionId: nullableString(r.execution_id ?? r.executionId),
    historyId: nullableString(r.history_id ?? r.historyId),
    reviewStatus: String(r.review_status ?? r.reviewStatus ?? 'unknown'),
    reviewId: nullableString(r.review_id ?? r.reviewId),
    reviewerId: nullableString(r.reviewer_id ?? r.reviewerId),
    reviewedAt: nullableString(r.reviewed_at ?? r.reviewedAt),
    reason: nullableString(r.reason),
    runtimeStatus: String(r.runtime_status ?? r.runtimeStatus ?? 'missing'),
    completionClaimAllowedBeforeReview: Boolean(
      r.completion_claim_allowed_before_review ?? r.completionClaimAllowedBeforeReview ?? false,
    ),
    completionClaimAllowedAfterReview: Boolean(
      r.completion_claim_allowed_after_review ?? r.completionClaimAllowedAfterReview ?? false,
    ),
    evidencePackDigest: (r.evidence_pack_digest && typeof r.evidence_pack_digest === 'object'
      ? (r.evidence_pack_digest as Record<string, unknown>)
      : {}) as Record<string, unknown>,
    stageTimelineDigest: (r.stage_timeline_digest && typeof r.stage_timeline_digest === 'object'
      ? (r.stage_timeline_digest as Record<string, unknown>)
      : {}) as Record<string, unknown>,
    changedFiles: normList(r.changed_files ?? r.changedFiles),
    taskContract: r.task_contract && typeof r.task_contract === 'object'
      ? (r.task_contract as Record<string, unknown>)
      : null,
    diffScope: r.diff_scope && typeof r.diff_scope === 'object'
      ? (r.diff_scope as Record<string, unknown>)
      : null,
    gates: Array.isArray(r.gates)
      ? (r.gates as Array<Record<string, unknown>>)
      : [],
    blockers: normList(r.blockers),
    rollbackAvailable: Boolean(r.rollback_available ?? r.rollbackAvailable ?? false),
    rollbackStatus: nullableString(r.rollback_status ?? r.rollbackStatus),
    approvalRequiresHuman: Boolean(r.approval_requires_human ?? r.approvalRequiresHuman ?? true),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    sourceAuthority: nullableString(r.source_authority ?? r.sourceAuthority),
    correlation: correlationRaw
      ? {
          executionIdMatch: Boolean(correlationRaw.execution_id_match ?? correlationRaw.executionIdMatch ?? false),
          historyIdMatch: Boolean(correlationRaw.history_id_match ?? correlationRaw.historyIdMatch ?? false),
          evidenceIdMatch: Boolean(correlationRaw.evidence_id_match ?? correlationRaw.evidenceIdMatch ?? false),
        }
      : null,
    blocker: nullableString(r.blocker),
    reasonText: nullableString(r.reason_text ?? r.reasonText),
  }
}

function adaptForgeCompletionClaim(raw: unknown): AtlasCodeForgeCompletionClaim | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.code.forge_completion_claim.v1') return null

  return {
    schemaVersion: schema || 'atlas.code.forge_completion_claim.v1',
    obraId: nullableString(r.obra_id ?? r.obraId),
    fastPathRunId: nullableString(r.fast_path_run_id ?? r.fastPathRunId),
    reviewPacketId: nullableString(r.review_packet_id ?? r.reviewPacketId),
    reviewId: nullableString(r.review_id ?? r.reviewId),
    completionStatus: String(r.completion_status ?? r.completionStatus ?? 'not_allowed'),
    humanApproved: Boolean(r.human_approved ?? r.humanApproved ?? false),
    approvedBy: nullableString(r.approved_by ?? r.approvedBy),
    approvedAt: nullableString(r.approved_at ?? r.approvedAt),
    runtimePassed: Boolean(r.runtime_passed ?? r.runtimePassed ?? false),
    evidencePackVerified: Boolean(r.evidence_pack_verified ?? r.evidencePackVerified ?? false),
    diffScopeVerified: Boolean(r.diff_scope_verified ?? r.diffScopeVerified ?? false),
    rollbackState: nullableString(r.rollback_state ?? r.rollbackState),
    finalCompletionAllowed: Boolean(r.final_completion_allowed ?? r.finalCompletionAllowed ?? false),
    blockers: normList(r.blockers),
    evidenceRefs: normList(r.evidence_refs ?? r.evidenceRefs),
    ledgerEventIds: normList(r.ledger_event_ids ?? r.ledgerEventIds),
    nextAction: String(r.next_action ?? r.nextAction ?? 'unknown'),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
  }
}

function adaptNullableForgeReviewPacket(raw: unknown): AtlasCodeForgeReviewPacket | null {
  return adaptForgeReviewPacket(raw)
}

function adaptNullableForgeCompletionClaim(raw: unknown): AtlasCodeForgeCompletionClaim | null {
  return adaptForgeCompletionClaim(raw)
}

function adaptForgeReviewDecisionResponse(raw: unknown): AtlasCodeForgeReviewDecisionResponse {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.code.forge_review_completion_response.v1'),
    workId: nullableString(r.work_id ?? r.workId),
    status: String(r.status ?? 'blocked'),
    blocker: nullableString(r.blocker),
    reason: nullableString(r.reason),
    reviewPacket: adaptForgeReviewPacket(r.review_packet ?? r.reviewPacket),
    completionClaim: adaptForgeCompletionClaim(r.completion_claim ?? r.completionClaim),
    reviewResponse: r.review_response && typeof r.review_response === 'object'
      ? (r.review_response as Record<string, unknown>)
      : null,
    rollback: r.rollback && typeof r.rollback === 'object'
      ? (r.rollback as Record<string, unknown>)
      : null,
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
  }
}

function adaptForgeWorkIntake(raw: unknown): AtlasCodeForgeWorkIntake | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.code.forge_work_intake.v1') return null

  return {
    schemaVersion: schema || 'atlas.code.forge_work_intake.v1',
    intakeId: nullableString(r.intake_id ?? r.intakeId),
    obraId: nullableString(r.obra_id ?? r.obraId),
    workItemId: nullableString(r.work_item_id ?? r.workItemId),
    workItemCode: nullableString(r.work_item_code ?? r.workItemCode),
    objective: nullableString(r.objective),
    businessRule: nullableString(r.business_rule ?? r.businessRule),
    scopeIn: normList(r.scope_in ?? r.scopeIn),
    scopeOut: normList(r.scope_out ?? r.scopeOut),
    acceptanceCriteria: normList(r.acceptance_criteria ?? r.acceptanceCriteria),
    canonicalDocs: normList(r.canonical_docs ?? r.canonicalDocs),
    riskLevel: String(r.risk_level ?? r.riskLevel ?? 'medium'),
    expectedOutputs: normList(r.expected_outputs ?? r.expectedOutputs),
    constraints: normList(r.constraints),
    operatorNotes: nullableString(r.operator_notes ?? r.operatorNotes),
    readinessStatus: String(r.readiness_status ?? r.readinessStatus ?? 'blocked'),
    enterpriseReady: Boolean(r.enterprise_ready ?? r.enterpriseReady ?? false),
    blockers: normList(r.blockers),
    nextAction: String(r.next_action ?? r.nextAction ?? 'unknown'),
    createdAt: nullableString(r.created_at ?? r.createdAt),
    updatedAt: nullableString(r.updated_at ?? r.updatedAt),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
  }
}

function adaptForgeFastPathStatus(raw: unknown): AtlasCodeForgeFastPathRunStatus {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const review = (r.review_gate ?? r.reviewGate ?? {}) as Record<string, unknown>
  const repair = (r.repair ?? {}) as Record<string, unknown>
  const commands = (r.commands && typeof r.commands === 'object' ? r.commands : {}) as Record<string, unknown>
  const commandMap: Record<string, string> = {}
  for (const [key, value] of Object.entries(commands)) {
    if (typeof value === 'string') commandMap[key] = value
  }

  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.code.forge_fast_path_run_status.v1'),
    fastPathRunId: nullableString(r.fast_path_run_id ?? r.fastPathRunId),
    obraId: nullableString(r.obra_id ?? r.obraId),
    workItemId: nullableString(r.work_item_id ?? r.workItemId),
    workItemCode: nullableString(r.work_item_code ?? r.workItemCode),
    executionId: nullableString(r.execution_id ?? r.executionId),
    historyId: nullableString(r.history_id ?? r.historyId),
    checkpointId: nullableString(r.checkpoint_id ?? r.checkpointId),
    status: String(r.status ?? 'unknown'),
    mode: String(r.mode ?? 'execute_async'),
    currentStage: String(r.current_stage ?? r.currentStage ?? 'unknown'),
    progressPercent: numberOrUndefined(r.progress_percent ?? r.progressPercent) ?? 0,
    specHash: nullableString(r.spec_hash ?? r.specHash),
    planHash: nullableString(r.plan_hash ?? r.planHash),
    taskCount: numberOrUndefined(r.task_count ?? r.taskCount) ?? 0,
    startedAt: nullableString(r.started_at ?? r.startedAt),
    updatedAt: nullableString(r.updated_at ?? r.updatedAt),
    completedAt: nullableString(r.completed_at ?? r.completedAt),
    blockers: normList(r.blockers),
    evidenceRefs: normList(r.evidence_refs ?? r.evidenceRefs),
    evidenceRefCount: numberOrUndefined(r.evidence_ref_count ?? r.evidenceRefCount) ?? 0,
    ledgerEventCount: numberOrUndefined(r.ledger_event_count ?? r.ledgerEventCount) ?? 0,
    asyncExecution: r.async_execution && typeof r.async_execution === 'object'
      ? (r.async_execution as Record<string, unknown>)
      : null,
    forgeLiveExecution: r.forge_live_execution && typeof r.forge_live_execution === 'object'
      ? (r.forge_live_execution as Record<string, unknown>)
      : null,
    reviewGate: {
      schemaVersion: String(review.schema_version ?? review.schemaVersion ?? 'atlas.code.forge_fast_path_run_status.review_gate.v1'),
      reviewRequired: Boolean(review.review_required ?? review.reviewRequired ?? false),
      reviewStatus: String(review.review_status ?? review.reviewStatus ?? 'not_required'),
      completionClaimAllowed: Boolean(review.completion_claim_allowed ?? review.completionClaimAllowed ?? false),
      reviewRecordPresent: Boolean(review.review_record_present ?? review.reviewRecordPresent ?? false),
      reviewId: nullableString(review.review_id ?? review.reviewId),
      approvalApi: String(review.approval_api ?? review.approvalApi ?? ''),
      noAutoCompletionWithoutReview: Boolean(review.no_auto_completion_without_review ?? true),
    },
    repair: {
      schemaVersion: String(repair.schema_version ?? repair.schemaVersion ?? 'atlas.code.forge_fast_path_run_status.repair.v1'),
      repairAvailable: Boolean(repair.repair_available ?? repair.repairAvailable ?? false),
      repairLoopStatus: String(repair.repair_loop_status ?? repair.repairLoopStatus ?? 'skipped_not_needed'),
      repairLoopTriggered: Boolean(repair.repair_loop_triggered ?? repair.repairLoopTriggered ?? false),
      failurePacket: repair.failure_packet && typeof repair.failure_packet === 'object'
        ? (repair.failure_packet as Record<string, unknown>)
        : null,
      suggestedRepairCommand: nullableString(repair.suggested_repair_command ?? repair.suggestedRepairCommand),
      blockers: normList(repair.blockers),
      failClosedWithoutEvidence: Boolean(repair.fail_closed_without_evidence ?? false),
    },
    commands: commandMap,
    nextAction: String(r.next_action ?? r.nextAction ?? 'unknown'),
    runFound: Boolean(r.run_found ?? r.runFound ?? true),
    blocker: nullableString(r.blocker),
    reason: nullableString(r.reason),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
  }
}

function adaptForgeLiveExecutionEnvelope(raw: unknown): WorkStateSnapshot['forgeLiveExecution'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return adaptForgeLiveExecution(r.snapshot ?? r.forge_live_execution ?? r.forgeLiveExecution ?? raw)
}

function adaptAtlasCodeEnterpriseCertification(raw: unknown): AtlasCodeEnterpriseCertificationReport {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const inputs = (r.inputs ?? {}) as Record<string, unknown>
  const summary = (r.stage_summary ?? r.stageSummary ?? {}) as Record<string, unknown>
  const commands = (r.commands ?? {}) as Record<string, unknown>

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    generatedAt: nullableString(r.generated_at ?? r.generatedAt),
    certificationId: nullableString(r.certification_id ?? r.certificationId),
    status: String(r.atlas_code_enterprise_status ?? r.status ?? 'blocked'),
    objective: nullableString(r.objective),
    inputs: {
      obraId: nullableString(inputs.obra_id ?? inputs.obraId),
      requiresObra: Boolean(inputs.requires_obra ?? inputs.requiresObra ?? true),
      workspacePathHash: nullableString(inputs.workspace_path_hash ?? inputs.workspacePathHash),
      targetFile: nullableString(inputs.target_file ?? inputs.targetFile),
      externalProviderCall: Boolean(inputs.external_provider_call ?? inputs.externalProviderCall ?? false),
    },
    stageSummary: {
      total: numberOrUndefined(summary.total) ?? 0,
      passed: numberOrUndefined(summary.passed) ?? 0,
      blocked: numberOrUndefined(summary.blocked) ?? 0,
      skipped: numberOrUndefined(summary.skipped) ?? 0,
    },
    stages: Array.isArray(r.stages)
      ? r.stages.map((stage) => {
          const s = (stage ?? {}) as Record<string, unknown>
          return {
            ...s,
            name: String(s.name ?? 'stage'),
            status: String(s.status ?? 'unknown'),
            blocker: nullableString(s.blocker),
          }
        })
      : [],
    promptToArtifactChecklist: Array.isArray(r.prompt_to_artifact_checklist ?? r.promptToArtifactChecklist)
      ? ((r.prompt_to_artifact_checklist ?? r.promptToArtifactChecklist) as unknown[]).map((item) => {
          const i = (item ?? {}) as Record<string, unknown>
          return {
            requirement: String(i.requirement ?? ''),
            evidence: normList(i.evidence),
          }
        }).filter((item) => item.requirement !== '')
      : [],
    evidence: (r.evidence && typeof r.evidence === 'object' ? r.evidence : {}) as Record<string, unknown>,
    remainingBlockers: normList(r.remaining_blockers ?? r.remainingBlockers),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    commands: {
      self: nullableString(commands.self),
      forgeLive: nullableString(commands.forge_live ?? commands.forgeLive),
      forgeRuntime: nullableString(commands.forge_runtime ?? commands.forgeRuntime),
    },
    note: nullableString(r.note),
  }
}

function adaptNullableAtlasCodeEnterpriseCertification(raw: unknown): AtlasCodeEnterpriseCertificationReport | null {
  if (!raw || typeof raw !== 'object') return null
  const schema = (raw as Record<string, unknown>).schema_version ?? (raw as Record<string, unknown>).schemaVersion
  if (schema !== 'atlas.code.enterprise_certification.v1') return null
  return adaptAtlasCodeEnterpriseCertification(raw)
}

function adaptForgeLiveExecutionAsyncEnvelope(raw: unknown): WorkStateSnapshot['forgeLiveExecutionAsync'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return adaptForgeLiveExecutionAsync(r.execution ?? r.forge_live_execution_async ?? r.forgeLiveExecutionAsync ?? raw)
}

function adaptCheckpointEnvelope(raw: unknown): WorkStateSnapshot['checkpoint'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return adaptCheckpoint(r.checkpoint ?? r.latest_checkpoint ?? raw)
}

function adaptForgeReviewEnvelope(raw: unknown): WorkStateSnapshot['forgeReview'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return adaptForgeReview(r.review ?? r.forge_review ?? r.forgeReview ?? raw)
}

function adaptForgeReview(raw: unknown): WorkStateSnapshot['forgeReview'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const reviewId = String(r.review_id ?? r.reviewId ?? '')
  if (!reviewId) return null
  const gate = (r.review_gate ?? r.reviewGate ?? {}) as Record<string, unknown>

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    reviewId,
    obraId: String(r.obra_id ?? r.obraId ?? ''),
    historyId: nullableString(r.history_id ?? r.historyId),
    runId: nullableString(r.run_id ?? r.runId),
    evidenceId: nullableString(r.evidence_id ?? r.evidenceId),
    decision: String(r.decision ?? 'approved'),
    status: String(r.status ?? 'blocked'),
    reviewerId: nullableString(r.reviewer_id ?? r.reviewerId),
    reviewedAt: nullableString(r.reviewed_at ?? r.reviewedAt),
    comment: nullableString(r.comment),
    approvalEffective: Boolean(r.approval_effective ?? r.approvalEffective ?? false),
    sourceAuthority: nullableString(r.source_authority ?? r.sourceAuthority),
    promotion: adaptForgePromotion(r.promotion),
    rollback: adaptForgeRollback(r.rollback),
    reviewGate: {
      completionClaimAllowed: Boolean(gate.completion_claim_allowed ?? gate.completionClaimAllowed ?? false),
      humanApproved: Boolean(gate.human_approved ?? gate.humanApproved ?? false),
      finalCompletionAllowed: Boolean(gate.final_completion_allowed ?? gate.finalCompletionAllowed ?? false),
      blockers: normList(gate.blockers),
    },
    summary: nullableString(r.summary),
  }
}

function adaptForgeReviewHistory(raw: unknown): WorkStateSnapshot['forgeReviewHistory'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const entriesRaw = (r.entries ?? []) as unknown[]

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    obraId: String(r.obra_id ?? r.obraId ?? ''),
    sourceAuthority: nullableString(r.source_authority ?? r.sourceAuthority),
    total: numberOrUndefined(r.total) ?? entriesRaw.length,
    latestReviewId: nullableString(r.latest_review_id ?? r.latestReviewId),
    entries: entriesRaw
      .map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>
        const reviewId = String(e.review_id ?? e.reviewId ?? '')
        if (!reviewId) return null

        return {
          schemaVersion: (e.schema_version ?? e.schemaVersion) as string | undefined,
          reviewId,
          historyId: nullableString(e.history_id ?? e.historyId),
          executionId: nullableString(e.execution_id ?? e.executionId),
          obraId: String(e.obra_id ?? e.obraId ?? ''),
          decision: String(e.decision ?? 'unknown'),
          status: String(e.status ?? 'unknown'),
          comment: nullableString(e.comment),
          reviewedAt: nullableString(e.reviewed_at ?? e.reviewedAt),
          reviewerId: nullableString(e.reviewer_id ?? e.reviewerId),
          approvalEffective: Boolean(e.approval_effective ?? e.approvalEffective ?? false),
          finalCompletionAllowed: Boolean(e.final_completion_allowed ?? e.finalCompletionAllowed ?? false),
          completionClaimAllowed: Boolean(e.completion_claim_allowed ?? e.completionClaimAllowed ?? false),
          humanApproved: Boolean(e.human_approved ?? e.humanApproved ?? false),
          liveExecutionStatus: nullableString(e.live_execution_status ?? e.liveExecutionStatus),
          runId: nullableString(e.run_id ?? e.runId),
          runEvidenceId: nullableString(e.run_evidence_id ?? e.runEvidenceId),
          reviewEvidenceId: nullableString(e.review_evidence_id ?? e.reviewEvidenceId),
          promotion: adaptForgePromotion(e.promotion),
          rollback: adaptForgeRollback(e.rollback),
          promotionStatus: nullableString(e.promotion_status ?? e.promotionStatus),
          rollbackId: nullableString(e.rollback_id ?? e.rollbackId),
          rollbackEvidenceId: nullableString(e.rollback_evidence_id ?? e.rollbackEvidenceId),
          liveWorkspaceMutated: Boolean(e.live_workspace_mutated ?? e.liveWorkspaceMutated ?? false),
          stageReceiptCount: numberOrUndefined(e.stage_receipt_count ?? e.stageReceiptCount) ?? 0,
          ledgerEventCount: numberOrUndefined(e.ledger_event_count ?? e.ledgerEventCount) ?? 0,
          reportHash: nullableString(e.report_hash ?? e.reportHash),
          stageTimelineHash: nullableString(e.stage_timeline_hash ?? e.stageTimelineHash),
          evidencePackHash: nullableString(e.evidence_pack_hash ?? e.evidencePackHash),
          blockers: normList(e.blockers),
          sourceAuthority: nullableString(e.source_authority ?? e.sourceAuthority),
          summary: nullableString(e.summary),
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  }
}

function adaptCheckpoint(raw: unknown): WorkStateSnapshot['checkpoint'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const checkpointId = String(r.checkpoint_id ?? r.checkpointId ?? '')
  if (!checkpointId) return null
  const resume = (r.resume ?? {}) as Record<string, unknown>
  const stateRefs = (r.state_refs ?? r.stateRefs ?? {}) as Record<string, unknown>
  const forge = (r.forge_live_execution ?? r.forgeLiveExecution ?? {}) as Record<string, unknown>
  const risk = (r.risk ?? {}) as Record<string, unknown>

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    checkpointId,
    obraId: String(r.obra_id ?? r.obraId ?? ''),
    reason: (r.reason ?? null) as string | null,
    status: String(r.status ?? 'ready'),
    createdAt: (r.created_at ?? r.createdAt ?? null) as string | null,
    evidenceId: (r.evidence_id ?? r.evidenceId ?? null) as string | null,
    resume: {
      resumeReady: Boolean(resume.resume_ready ?? resume.resumeReady ?? false),
      nextSafeAction: String(resume.next_safe_action ?? resume.nextSafeAction ?? ''),
      summary: String(resume.summary ?? ''),
      sourceAuthority: (resume.source_authority ?? resume.sourceAuthority ?? null) as string | null,
    },
    stateRefs: {
      activeThreadId: (stateRefs.active_thread_id ?? stateRefs.activeThreadId ?? null) as string | null,
      sessionCount: numberOrUndefined(stateRefs.session_count ?? stateRefs.sessionCount),
      messageCount: numberOrUndefined(stateRefs.message_count ?? stateRefs.messageCount),
      decisionReceiptId: (stateRefs.decision_receipt_id ?? stateRefs.decisionReceiptId ?? null) as string | null,
      projectStatus: (stateRefs.project_status ?? stateRefs.projectStatus ?? null) as string | null,
      projectUpdatedAt: (stateRefs.project_updated_at ?? stateRefs.projectUpdatedAt ?? null) as string | null,
    },
    forgeLiveExecution: {
      status: (forge.status ?? null) as string | null,
      lastRunAt: (forge.last_run_at ?? forge.lastRunAt ?? null) as string | null,
      contextPackHash: (forge.context_pack_hash ?? forge.contextPackHash ?? null) as string | null,
      contextCompleteness: (forge.context_completeness ?? forge.contextCompleteness ?? null) as string | null,
      diffScopeStatus: (forge.diff_scope_status ?? forge.diffScopeStatus ?? null) as string | null,
      scopeStatus: (forge.scope_status ?? forge.scopeStatus ?? null) as string | null,
      completionClaimAllowed: Boolean(forge.completion_claim_allowed ?? forge.completionClaimAllowed ?? false),
      evidenceRefCount: numberOrUndefined(forge.evidence_ref_count ?? forge.evidenceRefCount),
      ledgerEventCount: numberOrUndefined(forge.ledger_event_count ?? forge.ledgerEventCount),
    },
    risk: {
      remainingBlockers: normList(risk.remaining_blockers ?? risk.remainingBlockers),
      pendingApprovals: normList(risk.pending_approvals ?? risk.pendingApprovals),
      residualRisk: String(risk.residual_risk ?? risk.residualRisk ?? 'unknown'),
    },
  }
}

function adaptForgeLiveExecution(raw: unknown): WorkStateSnapshot['forgeLiveExecution'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const status = String(r.status ?? r.forge_live_execution_status ?? '')
  if (!status) return null

  const contextRaw = (r.context_pack ?? r.contextPack) as Record<string, unknown> | undefined
  const repairRaw = (r.repair_loop ?? r.repairLoop) as Record<string, unknown> | undefined

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    status,
    obraId: (r.obra_id ?? r.obraId ?? null) as string | null,
    executionSource: nullableString(r.execution_source ?? r.executionSource),
    command: (r.command ?? null) as string | null,
    strictCommand: (r.strict_command ?? r.strictCommand ?? null) as string | null,
    simulateFailure: Boolean(r.simulate_failure ?? r.simulateFailure ?? false),
    lastRunAt: (r.last_run_at ?? r.lastRunAt ?? null) as string | null,
    stageCount: numberOrUndefined(r.stage_count ?? r.stageCount),
    evidenceRefCount: numberOrUndefined(r.evidence_ref_count ?? r.evidenceRefCount),
    ledgerEventCount: numberOrUndefined(r.ledger_event_count ?? r.ledgerEventCount),
    remainingBlockers: normList(r.remaining_blockers ?? r.remainingBlockers),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    runId: (r.run_id ?? r.runId ?? null) as string | null,
    evidenceId: (r.evidence_id ?? r.evidenceId ?? null) as string | null,
    contextPack: contextRaw && typeof contextRaw === 'object'
      ? {
          schemaVersion: (contextRaw.schema_version ?? contextRaw.schemaVersion) as string | undefined,
          contextCompleteness: (contextRaw.context_completeness ?? contextRaw.contextCompleteness ?? null) as string | null,
          rankedRefCount: numberOrNull(contextRaw.ranked_ref_count ?? contextRaw.rankedRefCount),
          presentRefCount: numberOrNull(contextRaw.present_ref_count ?? contextRaw.presentRefCount),
          contextPackHash: (contextRaw.context_pack_hash ?? contextRaw.contextPackHash ?? null) as string | null,
          rankedRefs: ((contextRaw.ranked_refs ?? contextRaw.rankedRefs ?? []) as unknown[]).map((ref) => {
            const rr = (ref ?? {}) as Record<string, unknown>
            return {
              rank: Number(rr.rank ?? 0),
              path: String(rr.path ?? ''),
              kind: String(rr.kind ?? 'unknown'),
              reason: String(rr.reason ?? ''),
              evidenceMarker: String(rr.evidence_marker ?? rr.evidenceMarker ?? 'unknown'),
              contentHash: (rr.content_hash ?? rr.contentHash ?? null) as string | null,
              sizeBytes: numberOrNull(rr.size_bytes ?? rr.sizeBytes),
            }
          }).filter((ref) => ref.path.length > 0),
        }
      : undefined,
    stageTimeline: adaptForgeStageTimeline(r.stage_timeline ?? r.stageTimeline),
    evidencePack: adaptForgeEvidencePack(r.evidence_pack ?? r.evidencePack),
    repairLoop: repairRaw && typeof repairRaw === 'object'
      ? {
          status: (repairRaw.status ?? null) as string | null,
          triggered: Boolean(repairRaw.triggered ?? false),
          planStatus: (repairRaw.plan_status ?? repairRaw.planStatus ?? null) as string | null,
          nextAction: (repairRaw.next_action ?? repairRaw.nextAction ?? null) as string | null,
        }
      : undefined,
    taskContract: adaptForgeTaskContract(r.task_contract ?? r.taskContract),
    diffScope: adaptDiffScope(r.diff_scope ?? r.diffScope),
    governedExecution: adaptForgeGovernedExecution(r.governed_execution ?? r.governedExecution),
  }
}

function adaptForgeGovernedExecution(raw: unknown): NonNullable<WorkStateSnapshot['forgeLiveExecution']>['governedExecution'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const status = String(r.status ?? '')
  if (!status) return null
  const validation = (r.validation_result ?? r.validationResult) as Record<string, unknown> | undefined
  const feedback = (r.governance_feedback ?? r.governanceFeedback) as Record<string, unknown> | undefined
  const gateSummary = (feedback?.gate_summary ?? feedback?.gateSummary) as Record<string, unknown> | undefined

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    executionId: nullableString(r.execution_id ?? r.executionId),
    status,
    executionMode: nullableString(r.execution_mode ?? r.executionMode),
    sourceAuthority: nullableString(r.source_authority ?? r.sourceAuthority),
    workItemId: nullableString(r.work_item_id ?? r.workItemId),
    workItemCode: nullableString(r.work_item_code ?? r.workItemCode),
    taskId: nullableString(r.task_id ?? r.taskId),
    changedFiles: normList(r.changed_files ?? r.changedFiles),
    stageReceiptIds: normList(r.stage_receipt_ids ?? r.stageReceiptIds),
    receiptId: nullableString(r.receipt_id ?? r.receiptId),
    validationResult: validation && typeof validation === 'object'
      ? {
          command: nullableString(validation.command),
          exitCode: numberOrNull(validation.exit_code ?? validation.exitCode),
          passed: Boolean(validation.passed ?? false),
          stdoutHash: nullableString(validation.stdout_hash ?? validation.stdoutHash),
          stderrHash: nullableString(validation.stderr_hash ?? validation.stderrHash),
          stdoutExcerpt: nullableString(validation.stdout_excerpt ?? validation.stdoutExcerpt),
          stderrExcerpt: nullableString(validation.stderr_excerpt ?? validation.stderrExcerpt),
        }
      : null,
    governanceFeedback: feedback && typeof feedback === 'object'
      ? {
          status: nullableString(feedback.status),
          evidenceAppended: Boolean(feedback.evidence_appended ?? feedback.evidenceAppended ?? false),
          receiptId: nullableString(feedback.receipt_id ?? feedback.receiptId),
          allGreen: Boolean(gateSummary?.all_green ?? gateSummary?.allGreen ?? false),
        }
      : null,
    remainingBlockers: normList(r.remaining_blockers ?? r.remainingBlockers),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    liveWorkspaceMutated: Boolean(r.live_workspace_mutated ?? r.liveWorkspaceMutated ?? false),
    promotionStatus: nullableString(r.promotion_status ?? r.promotionStatus),
    promotionArtifact: adaptForgePromotionPatchArtifact(r.promotion_artifact ?? r.promotionArtifact),
    promotion: adaptForgePromotion(r.promotion),
    stageCount: numberOrUndefined(r.stage_count ?? r.stageCount),
  }
}

function adaptForgePromotionPatchArtifact(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  return {
    schemaVersion: nullableString(r.schema_version ?? r.schemaVersion),
    path: nullableString(r.path),
    sha256: nullableString(r.sha256),
    operation: nullableString(r.operation),
    targetFile: nullableString(r.target_file ?? r.targetFile),
    expectedBeforeHash: nullableString(r.expected_before_hash ?? r.expectedBeforeHash),
    expectedAfterHash: nullableString(r.expected_after_hash ?? r.expectedAfterHash),
    diffPath: nullableString(r.diff_path ?? r.diffPath),
    diffHash: nullableString(r.diff_hash ?? r.diffHash),
  }
}

function adaptForgePromotion(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const rollback = (r.rollback ?? {}) as Record<string, unknown>
  const evidence = (r.evidence ?? {}) as Record<string, unknown>

  return {
    schemaVersion: nullableString(r.schema_version ?? r.schemaVersion),
    promotionId: nullableString(r.promotion_id ?? r.promotionId),
    status: nullableString(r.status),
    promotionStatus: nullableString(r.promotion_status ?? r.promotionStatus),
    changedFiles: normList(r.changed_files ?? r.changedFiles),
    liveWorkspaceMutated: Boolean(r.live_workspace_mutated ?? r.liveWorkspaceMutated ?? false),
    idempotent: Boolean(r.idempotent ?? false),
    rollback: {
      available: Boolean(rollback.available ?? false),
      backupPath: nullableString(rollback.backup_path ?? rollback.backupPath),
      backupHash: nullableString(rollback.backup_hash ?? rollback.backupHash),
      command: nullableString(rollback.command),
    },
    evidence: {
      receiptId: nullableString(evidence.receipt_id ?? evidence.receiptId),
      engineeringEvidenceId: nullableString(evidence.engineering_evidence_id ?? evidence.engineeringEvidenceId),
      persisted: Boolean(evidence.persisted ?? false),
    },
    rollbackExecution: adaptForgeRollback(r.rollback_execution ?? r.rollbackExecution),
    remainingBlockers: normList(r.remaining_blockers ?? r.remainingBlockers),
  }
}

function adaptForgeRollback(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const evidence = (r.evidence ?? {}) as Record<string, unknown>

  return {
    schemaVersion: nullableString(r.schema_version ?? r.schemaVersion),
    rollbackId: nullableString(r.rollback_id ?? r.rollbackId),
    promotionId: nullableString(r.promotion_id ?? r.promotionId),
    status: nullableString(r.status),
    promotionStatus: nullableString(r.promotion_status ?? r.promotionStatus),
    changedFiles: normList(r.changed_files ?? r.changedFiles),
    liveWorkspaceMutated: Boolean(r.live_workspace_mutated ?? r.liveWorkspaceMutated ?? false),
    idempotent: Boolean(r.idempotent ?? false),
    targetHashAfterRollback: nullableString(r.target_hash_after_rollback ?? r.targetHashAfterRollback),
    evidence: {
      receiptId: nullableString(evidence.receipt_id ?? evidence.receiptId),
      engineeringEvidenceId: nullableString(evidence.engineering_evidence_id ?? evidence.engineeringEvidenceId),
      persisted: Boolean(evidence.persisted ?? false),
    },
    remainingBlockers: normList(r.remaining_blockers ?? r.remainingBlockers),
  }
}

function adaptForgeEvidencePack(raw: unknown): NonNullable<WorkStateSnapshot['forgeLiveExecution']>['evidencePack'] {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const status = String(r.status ?? '')
  if (!status) return undefined
  const replayRaw = (r.replay ?? {}) as Record<string, unknown>
  const persistenceRaw = (r.persistence ?? {}) as Record<string, unknown>
  const integrityRaw = (r.integrity ?? {}) as Record<string, unknown>

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    status,
    obraId: nullableString(r.obra_id ?? r.obraId),
    sourceAuthority: nullableString(r.source_authority ?? r.sourceAuthority),
    generatedAt: nullableString(r.generated_at ?? r.generatedAt),
    replay: {
      command: nullableString(replayRaw.command),
      strictCommand: nullableString(replayRaw.strict_command ?? replayRaw.strictCommand),
      failureProbeCommand: nullableString(replayRaw.failure_probe_command ?? replayRaw.failureProbeCommand),
      externalProviderCall: Boolean(replayRaw.external_provider_call ?? replayRaw.externalProviderCall ?? false),
    },
    persistence: {
      engineeringRunId: nullableString(persistenceRaw.engineering_run_id ?? persistenceRaw.engineeringRunId),
      engineeringEvidenceId: nullableString(persistenceRaw.engineering_evidence_id ?? persistenceRaw.engineeringEvidenceId),
      engineeringRunPersisted: Boolean(persistenceRaw.engineering_run_persisted ?? persistenceRaw.engineeringRunPersisted ?? false),
      engineeringEvidencePersisted: Boolean(persistenceRaw.engineering_evidence_persisted ?? persistenceRaw.engineeringEvidencePersisted ?? false),
    },
    stageReceiptCount: numberOrUndefined(r.stage_receipt_count ?? r.stageReceiptCount) ?? 0,
    stageReceipts: ((r.stage_receipts ?? r.stageReceipts ?? []) as unknown[]).map((receipt) => {
      const rr = (receipt ?? {}) as Record<string, unknown>
      return {
        index: Number(rr.index ?? 0),
        schemaVersion: nullableString(rr.schema_version ?? rr.schemaVersion),
        receiptId: String(rr.receipt_id ?? rr.receiptId ?? ''),
        stage: String(rr.stage ?? 'unknown'),
        status: String(rr.status ?? 'unknown'),
        attempt: Number(rr.attempt ?? 0),
        inputHash: nullableString(rr.input_hash ?? rr.inputHash),
        outputHash: nullableString(rr.output_hash ?? rr.outputHash),
        validationStatus: nullableString(rr.validation_status ?? rr.validationStatus),
        evidenceRefs: normList(rr.evidence_refs ?? rr.evidenceRefs),
        createdAt: nullableString(rr.created_at ?? rr.createdAt),
      }
    }).filter((receipt) => receipt.receiptId.length > 0),
    ledgerEventCount: numberOrUndefined(r.ledger_event_count ?? r.ledgerEventCount) ?? 0,
    ledgerEvents: ((r.ledger_events ?? r.ledgerEvents ?? []) as unknown[]).map((event) => {
      const ee = (event ?? {}) as Record<string, unknown>
      return {
        index: Number(ee.index ?? 0),
        eventId: String(ee.event_id ?? ee.eventId ?? ''),
        source: String(ee.source ?? 'atlas_ledger_events'),
      }
    }).filter((event) => event.eventId.length > 0),
    changedFiles: normList(r.changed_files ?? r.changedFiles),
    remainingBlockers: normList(r.remaining_blockers ?? r.remainingBlockers),
    integrity: {
      reportHash: nullableString(integrityRaw.report_hash ?? integrityRaw.reportHash),
      stageTimelineHash: nullableString(integrityRaw.stage_timeline_hash ?? integrityRaw.stageTimelineHash),
      evidencePackHash: nullableString(integrityRaw.evidence_pack_hash ?? integrityRaw.evidencePackHash),
    },
  }
}

function adaptForgeStageTimeline(raw: unknown): NonNullable<WorkStateSnapshot['forgeLiveExecution']>['stageTimeline'] {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const entriesRaw = (r.entries ?? []) as unknown[]
  const entries = entriesRaw
    .map((entry) => {
      const e = (entry ?? {}) as Record<string, unknown>
      const name = String(e.name ?? '')
      if (!name) return null

      return {
        index: Number(e.index ?? 0),
        name,
        phase: String(e.phase ?? 'runtime'),
        status: String(e.status ?? 'unknown'),
        blocking: Boolean(e.blocking ?? false),
        blocker: nullableString(e.blocker),
        summary: String(e.summary ?? ''),
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  if (entries.length === 0) return undefined

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    total: numberOrUndefined(r.total) ?? entries.length,
    passed: numberOrUndefined(r.passed) ?? entries.filter((entry) => entry.status === 'passed').length,
    blocked: numberOrUndefined(r.blocked) ?? entries.filter((entry) => entry.status === 'blocked').length,
    degraded: numberOrUndefined(r.degraded) ?? entries.filter((entry) => entry.status === 'degraded').length,
    skipped: numberOrUndefined(r.skipped) ?? entries.filter((entry) => entry.status.startsWith('skipped')).length,
    blocking: numberOrUndefined(r.blocking) ?? entries.filter((entry) => entry.blocking).length,
    entries,
  }
}

function adaptForgeLiveExecutionAsync(raw: unknown): WorkStateSnapshot['forgeLiveExecutionAsync'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const executionId = String(r.execution_id ?? r.executionId ?? '')
  if (!executionId) return null

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    executionId,
    status: String(r.status ?? 'queued'),
    obraId: nullableString(r.obra_id ?? r.obraId),
    simulateFailure: Boolean(r.simulate_failure ?? r.simulateFailure ?? false),
    queuedAt: nullableString(r.queued_at ?? r.queuedAt),
    startedAt: nullableString(r.started_at ?? r.startedAt),
    finishedAt: nullableString(r.finished_at ?? r.finishedAt),
    jobDispatched: Boolean(r.job_dispatched ?? r.jobDispatched ?? false),
    command: nullableString(r.command),
    snapshotStatus: nullableString(r.snapshot_status ?? r.snapshotStatus),
    runId: nullableString(r.run_id ?? r.runId),
    evidenceId: nullableString(r.evidence_id ?? r.evidenceId),
    remainingBlockers: normList(r.remaining_blockers ?? r.remainingBlockers),
    completionClaimAllowed: Boolean(r.completion_claim_allowed ?? r.completionClaimAllowed ?? false),
    error: nullableString(r.error),
    updatedAt: nullableString(r.updated_at ?? r.updatedAt),
  }
}

function adaptForgeLiveExecutionHistory(raw: unknown): WorkStateSnapshot['forgeLiveExecutionHistory'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const entriesRaw = (r.entries ?? []) as unknown[]

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    obraId: String(r.obra_id ?? r.obraId ?? ''),
    sourceAuthority: (r.source_authority ?? r.sourceAuthority ?? null) as string | null,
    total: numberOrUndefined(r.total) ?? entriesRaw.length,
    latestEntryId: (r.latest_entry_id ?? r.latestEntryId ?? null) as string | null,
    entries: entriesRaw
      .map(adaptForgeLiveExecutionHistoryEntry)
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  }
}

function adaptForgeLiveExecutionHistoryEntry(raw: unknown): NonNullable<WorkStateSnapshot['forgeLiveExecutionHistory']>['entries'][number] | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const historyId = String(e.history_id ?? e.historyId ?? '')
  if (!historyId) return null

  return {
    schemaVersion: (e.schema_version ?? e.schemaVersion) as string | undefined,
    historyId,
    runId: nullableString(e.run_id ?? e.runId),
    evidenceId: nullableString(e.evidence_id ?? e.evidenceId),
    status: String(e.status ?? 'unknown'),
    obraId: nullableString(e.obra_id ?? e.obraId),
    lastRunAt: nullableString(e.last_run_at ?? e.lastRunAt),
    command: nullableString(e.command),
    strictCommand: nullableString(e.strict_command ?? e.strictCommand),
    simulateFailure: Boolean(e.simulate_failure ?? e.simulateFailure ?? false),
    stageCount: numberOrNull(e.stage_count ?? e.stageCount),
    contextPackHash: nullableString(e.context_pack_hash ?? e.contextPackHash),
    contextCompleteness: nullableString(e.context_completeness ?? e.contextCompleteness),
    taskContractStatus: nullableString(e.task_contract_status ?? e.taskContractStatus),
    diffScopeStatus: nullableString(e.diff_scope_status ?? e.diffScopeStatus),
    scopeStatus: nullableString(e.scope_status ?? e.scopeStatus),
    completionClaimAllowed: Boolean(e.completion_claim_allowed ?? e.completionClaimAllowed ?? false),
    repairStatus: nullableString(e.repair_status ?? e.repairStatus),
    repairTriggered: Boolean(e.repair_triggered ?? e.repairTriggered ?? false),
    evidenceRefCount: numberOrNull(e.evidence_ref_count ?? e.evidenceRefCount),
    ledgerEventCount: numberOrNull(e.ledger_event_count ?? e.ledgerEventCount),
    evidencePackDigest: adaptForgeEvidencePackDigest(e.evidence_pack_digest ?? e.evidencePackDigest),
    promotionStatus: nullableString(e.promotion_status ?? e.promotionStatus),
    promotionId: nullableString(e.promotion_id ?? e.promotionId),
    promotionEvidenceId: nullableString(e.promotion_evidence_id ?? e.promotionEvidenceId),
    promotionReceiptId: nullableString(e.promotion_receipt_id ?? e.promotionReceiptId),
    rollbackId: nullableString(e.rollback_id ?? e.rollbackId),
    rollbackEvidenceId: nullableString(e.rollback_evidence_id ?? e.rollbackEvidenceId),
    liveWorkspaceMutated: Boolean(e.live_workspace_mutated ?? e.liveWorkspaceMutated ?? false),
    remainingBlockers: normList(e.remaining_blockers ?? e.remainingBlockers),
    externalProviderCall: Boolean(e.external_provider_call ?? e.externalProviderCall ?? false),
  }
}

function adaptForgeTaskQueue(raw: unknown): WorkStateSnapshot['forgeTaskQueue'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const entriesRaw = (r.entries ?? []) as unknown[]

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    obraId: String(r.obra_id ?? r.obraId ?? ''),
    sourceAuthority: nullableString(r.source_authority ?? r.sourceAuthority),
    workItemId: nullableString(r.work_item_id ?? r.workItemId),
    workItemCode: nullableString(r.work_item_code ?? r.workItemCode),
    specHash: nullableString(r.spec_hash ?? r.specHash),
    planHash: nullableString(r.plan_hash ?? r.planHash),
    requiresSpec: Boolean(r.requires_spec ?? r.requiresSpec ?? false),
    requiresPlan: Boolean(r.requires_plan ?? r.requiresPlan ?? false),
    total: numberOrUndefined(r.total) ?? entriesRaw.length,
    readyCount: numberOrUndefined(r.ready_count ?? r.readyCount) ?? 0,
    blockedCount: numberOrUndefined(r.blocked_count ?? r.blockedCount) ?? 0,
    verifiedCount: numberOrUndefined(r.verified_count ?? r.verifiedCount) ?? 0,
    needsReviewCount: numberOrUndefined(r.needs_review_count ?? r.needsReviewCount) ?? 0,
    pendingCount: numberOrUndefined(r.pending_count ?? r.pendingCount) ?? 0,
    activeTaskId: nullableString(r.active_task_id ?? r.activeTaskId),
    latestHistoryId: nullableString(r.latest_history_id ?? r.latestHistoryId),
    entries: entriesRaw
      .map(adaptForgeTaskQueueEntry)
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  }
}

function adaptForgeTaskQueueEntry(raw: unknown): NonNullable<WorkStateSnapshot['forgeTaskQueue']>['entries'][number] | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const taskId = String(e.task_id ?? e.taskId ?? '')
  if (!taskId) return null

  return {
    schemaVersion: (e.schema_version ?? e.schemaVersion) as string | undefined,
    taskId,
    sequence: numberOrUndefined(e.sequence) ?? 0,
    title: String(e.title ?? e.objective ?? 'Forge task'),
    objective: String(e.objective ?? ''),
    status: String(e.status ?? 'pending'),
    owner: nullableString(e.owner),
    riskLevel: nullableString(e.risk_level ?? e.riskLevel),
    allowedFiles: normList(e.allowed_files ?? e.allowedFiles),
    forbiddenFiles: normList(e.forbidden_files ?? e.forbiddenFiles),
    expectedFiles: normList(e.expected_files ?? e.expectedFiles),
    validationCommands: normList(e.validation_commands ?? e.validationCommands),
    acceptanceCriteria: normList(e.acceptance_criteria ?? e.acceptanceCriteria),
    evidenceRequired: normList(e.evidence_required ?? e.evidenceRequired),
    docsRequired: normList(e.docs_required ?? e.docsRequired),
    blockers: normList(e.blockers),
    source: nullableString(e.source),
    workItemId: nullableString(e.work_item_id ?? e.workItemId),
    workItemCode: nullableString(e.work_item_code ?? e.workItemCode),
    runHistoryId: nullableString(e.run_history_id ?? e.runHistoryId),
    evidencePackHash: nullableString(e.evidence_pack_hash ?? e.evidencePackHash),
    stageTimelineHash: nullableString(e.stage_timeline_hash ?? e.stageTimelineHash),
    completionClaimAllowed: Boolean(e.completion_claim_allowed ?? e.completionClaimAllowed ?? false),
  }
}

function adaptForgeRunHistoryReplay(raw: unknown): WorkStateSnapshot['forgeRunHistoryReplay'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const historyId = String(r.history_id ?? r.historyId ?? '')
  if (!historyId) return null
  const timelineRaw = (r.stage_timeline_digest ?? r.stageTimelineDigest ?? {}) as Record<string, unknown>
  const replayRaw = (r.replay ?? {}) as Record<string, unknown>

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    workId: String(r.work_id ?? r.workId ?? ''),
    historyId,
    status: String(r.status ?? 'unknown'),
    sourceAuthority: nullableString(r.source_authority ?? r.sourceAuthority),
    error: nullableString(r.error),
    blocker: nullableString(r.blocker),
    historyEntry: adaptForgeLiveExecutionHistoryEntry(r.history_entry ?? r.historyEntry),
    evidencePackDigest: adaptForgeEvidencePackDigest(r.evidence_pack_digest ?? r.evidencePackDigest) ?? null,
    stageTimelineDigest: {
      schemaVersion: nullableString(timelineRaw.schema_version ?? timelineRaw.schemaVersion),
      status: nullableString(timelineRaw.status),
      stageTimelineHash: nullableString(timelineRaw.stage_timeline_hash ?? timelineRaw.stageTimelineHash),
      total: numberOrNull(timelineRaw.total),
      blocking: numberOrNull(timelineRaw.blocking),
    },
    replay: {
      readOnly: Boolean(replayRaw.read_only ?? replayRaw.readOnly ?? true),
      command: nullableString(replayRaw.command),
      strictCommand: nullableString(replayRaw.strict_command ?? replayRaw.strictCommand),
      failureProbeCommand: nullableString(replayRaw.failure_probe_command ?? replayRaw.failureProbeCommand),
      externalProviderCall: Boolean(replayRaw.external_provider_call ?? replayRaw.externalProviderCall ?? false),
    },
    snapshot: adaptForgeLiveExecution(r.snapshot),
    snapshotAvailable: Boolean(r.snapshot_available ?? r.snapshotAvailable ?? false),
    review: adaptForgeReview(r.review),
  }
}

function adaptForgeEvidencePackDigest(raw: unknown): NonNullable<WorkStateSnapshot['forgeLiveExecutionHistory']>['entries'][number]['evidencePackDigest'] {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const status = String(r.status ?? '')
  if (!status) return null

  return {
    schemaVersion: nullableString(r.schema_version ?? r.schemaVersion),
    status,
    stageReceiptCount: numberOrUndefined(r.stage_receipt_count ?? r.stageReceiptCount) ?? 0,
    stageReceiptIds: normList(r.stage_receipt_ids ?? r.stageReceiptIds),
    ledgerEventCount: numberOrUndefined(r.ledger_event_count ?? r.ledgerEventCount) ?? 0,
    ledgerEventIds: normList(r.ledger_event_ids ?? r.ledgerEventIds),
    changedFiles: normList(r.changed_files ?? r.changedFiles),
    engineeringRunId: nullableString(r.engineering_run_id ?? r.engineeringRunId),
    engineeringEvidenceId: nullableString(r.engineering_evidence_id ?? r.engineeringEvidenceId),
    engineeringRunPersisted: Boolean(r.engineering_run_persisted ?? r.engineeringRunPersisted ?? false),
    engineeringEvidencePersisted: Boolean(r.engineering_evidence_persisted ?? r.engineeringEvidencePersisted ?? false),
    reportHash: nullableString(r.report_hash ?? r.reportHash),
    stageTimelineHash: nullableString(r.stage_timeline_hash ?? r.stageTimelineHash),
    evidencePackHash: nullableString(r.evidence_pack_hash ?? r.evidencePackHash),
  }
}

function adaptForgeTaskContract(raw: unknown): NonNullable<WorkStateSnapshot['forgeLiveExecution']>['taskContract'] {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const taskId = String(r.task_id ?? r.taskId ?? '')
  if (!taskId) return undefined
  const rollbackRaw = (r.rollback ?? {}) as Record<string, unknown>

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    taskId,
    status: String(r.status ?? 'unknown'),
    objective: String(r.objective ?? ''),
    owner: (r.owner ?? null) as string | null,
    riskLevel: (r.risk_level ?? r.riskLevel ?? null) as string | null,
    allowedFiles: normList(r.allowed_files ?? r.allowedFiles),
    forbiddenFiles: normList(r.forbidden_files ?? r.forbiddenFiles),
    expectedFiles: normList(r.expected_files ?? r.expectedFiles),
    validationCommands: normList(r.validation_commands ?? r.validationCommands),
    acceptanceCriteria: normList(r.acceptance_criteria ?? r.acceptanceCriteria),
    rollback: {
      available: Boolean(rollbackRaw.available ?? false),
      command: (rollbackRaw.command ?? null) as string | null,
    },
    evidenceRequired: normList(r.evidence_required ?? r.evidenceRequired),
    docsRequired: normList(r.docs_required ?? r.docsRequired),
    cartographyRequired: Boolean(r.cartography_required ?? r.cartographyRequired ?? false),
  }
}

function adaptDiffScope(raw: unknown): NonNullable<WorkStateSnapshot['forgeLiveExecution']>['diffScope'] {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const status = String(r.status ?? '')
  if (!status) return undefined
  const completionRaw = (r.completion_gate ?? r.completionGate) as Record<string, unknown> | undefined
  const verifierRaw = (r.patch_verifier ?? r.patchVerifier) as Record<string, unknown> | undefined

  return {
    schemaVersion: (r.schema_version ?? r.schemaVersion) as string | undefined,
    status,
    scopeStatus: (r.scope_status ?? r.scopeStatus ?? null) as string | null,
    changedFileCount: numberOrUndefined(r.changed_file_count ?? r.changedFileCount),
    files: ((r.files as unknown[]) ?? []).map((file) => {
      const f = (file ?? {}) as Record<string, unknown>
      return {
        path: String(f.path ?? ''),
        status: String(f.status ?? 'unknown'),
        ownership: (f.ownership ?? null) as string | null,
        manifestCovered: Boolean(f.manifest_covered ?? f.manifestCovered ?? false),
        reason: (f.reason ?? null) as string | null,
      }
    }),
    manifestId: (r.manifest_id ?? r.manifestId ?? null) as string | null,
    patchTargetHash: (r.patch_target_hash ?? r.patchTargetHash ?? null) as string | null,
    rollbackAvailable: Boolean(r.rollback_available ?? r.rollbackAvailable ?? false),
    blockingReasons: normList(r.blocking_reasons ?? r.blockingReasons),
    patchVerifier: verifierRaw && typeof verifierRaw === 'object'
      ? {
          schemaVersion: (verifierRaw.schema_version ?? verifierRaw.schemaVersion ?? null) as string | null,
          status: (verifierRaw.status ?? null) as string | null,
          nextAction: (verifierRaw.next_action ?? verifierRaw.nextAction ?? null) as string | null,
          completionClaimAllowed: Boolean(verifierRaw.completion_claim_allowed ?? verifierRaw.completionClaimAllowed ?? false),
        }
      : undefined,
    completionGate: completionRaw && typeof completionRaw === 'object'
      ? {
          status: (completionRaw.status ?? null) as string | null,
          completionClaimAllowed: Boolean(completionRaw.completion_claim_allowed ?? completionRaw.completionClaimAllowed ?? false),
          reasons: normList(completionRaw.reasons),
        }
      : undefined,
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function nullableString(value: unknown): string | null {
  return value == null ? null : String(value)
}

// ──────────────────────────────────────────────────────────────────────────
// SCOR-1 · Programming Governance adapter
//
// Mirrors the contract in atlas-code-scor-1-implementation-contract.md:
// - reads snake_case OR camelCase, never invents arrays
// - preserves null for spec/plan/workItem when backend omits them
// - keeps degraded + degradedReason intact so UI shows honest alerts

function adaptProgrammingGovernance(raw: unknown): ProgrammingGovernanceSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const workItemRaw = (r.work_item ?? r.workItem) as Record<string, unknown> | null | undefined
  const tasksRaw = (r.tasks as unknown[]) ?? []
  const gateRunsRaw = (r.gate_runs ?? r.gateRuns) as unknown[] | undefined
  const reviewsRaw = (r.reviews as unknown[]) ?? []
  const evidenceRefsRaw = (r.evidence_refs ?? r.evidenceRefs) as unknown[] | undefined
  const artifactsRaw = (r.artifacts as unknown[]) ?? []

  const spec = (r.spec ?? null) as Record<string, unknown> | null
  const plan = (r.plan ?? null) as Record<string, unknown> | null

  return {
    workItem: adaptProgrammingWorkItem(workItemRaw ?? null),
    spec: spec && typeof spec === 'object' && Object.keys(spec).length > 0 ? spec : null,
    plan: plan && typeof plan === 'object' && Object.keys(plan).length > 0 ? plan : null,
    tasks: tasksRaw.map(adaptProgrammingTaskContract),
    gateRuns: (gateRunsRaw ?? []).map(adaptProgrammingGateRun),
    reviews: reviewsRaw
      .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
      .map((v) => v),
    evidenceRefs: (evidenceRefsRaw ?? []).map(adaptProgrammingEvidenceReceipt),
    artifacts: artifactsRaw
      .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
      .map((v) => v),
    degraded: Boolean(r.degraded ?? false),
    degradedReason: (r.degraded_reason ?? r.degradedReason ?? null) as string | null,
  }
}

function adaptProgrammingWorkItem(
  raw: Record<string, unknown> | null,
): ProgrammingWorkItemSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id as string | undefined
  if (!id) return null

  const scopeRaw = (raw.scope_mode ?? raw.scopeMode ?? 'compact') as string
  const scopeMode: ProgrammingScopeMode = scopeRaw === 'structural' ? 'structural' : 'compact'

  return {
    id: String(id),
    code: String(raw.code ?? ''),
    intentText: String(raw.intent_text ?? raw.intentText ?? ''),
    intentType: String(raw.intent_type ?? raw.intentType ?? ''),
    scopeMode,
    riskLevel: String(raw.risk_level ?? raw.riskLevel ?? ''),
    status: ((raw.status as ProgrammingWorkStatus) ?? 'open'),
    currentStage: String(raw.current_stage ?? raw.currentStage ?? ''),
    specHash: (raw.spec_hash ?? raw.specHash ?? null) as string | null,
    planHash: (raw.plan_hash ?? raw.planHash ?? null) as string | null,
    requiredGates: normList(raw.required_gates ?? raw.requiredGates),
    gaps: adaptProgrammingGaps(raw.gaps),
  }
}

function adaptProgrammingGaps(raw: unknown): ProgrammingWorkItemGap[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): ProgrammingWorkItemGap | null => {
      if (!item || typeof item !== 'object') {
        if (typeof item === 'string' && item) return { name: item }
        return null
      }
      const r = item as Record<string, unknown>
      const name = (r.name ?? r.gap ?? r.id) as string | undefined
      if (!name) return null
      return {
        name: String(name),
        reason: (r.reason ?? null) as string | null,
        recordedAt: (r.recorded_at ?? r.recordedAt ?? null) as string | null,
      }
    })
    .filter((g): g is ProgrammingWorkItemGap => !!g)
}

function adaptProgrammingTaskContract(raw: unknown): ProgrammingTaskContract {
  const r = (raw as Record<string, unknown>) ?? {}
  return {
    owner: (r.owner ?? null) as string | null,
    allowedFiles: normList(r.allowed_files ?? r.allowedFiles),
    forbiddenFiles: normList(r.forbidden_files ?? r.forbiddenFiles),
    expectedFiles: normList(r.expected_files ?? r.expectedFiles),
    dependencies: normList(r.dependencies),
    riskLevel: (r.risk_level ?? r.riskLevel ?? null) as string | null,
    validationCommands: normList(r.validation_commands ?? r.validationCommands),
    acceptanceCriteria: normList(r.acceptance_criteria ?? r.acceptanceCriteria),
    rollback: (r.rollback ?? null) as string | null,
    evidenceRequired: normList(r.evidence_required ?? r.evidenceRequired),
    docsRequired: normList(r.docs_required ?? r.docsRequired),
    cartographyRequired: Boolean(r.cartography_required ?? r.cartographyRequired ?? false),
  }
}

function adaptProgrammingGateRun(raw: unknown): ProgrammingGateRunSnapshot {
  const r = (raw as Record<string, unknown>) ?? {}
  return {
    id: (r.id as string | undefined) ?? undefined,
    gateName: String(r.gate_name ?? r.gateName ?? r.gate ?? ''),
    status: String(r.status ?? 'pending'),
    blocking: Boolean(r.blocking ?? false),
    reason: (r.reason ?? null) as string | null,
    waiverReason: (r.waiver_reason ?? r.waiverReason ?? null) as string | null,
    payload: r.payload,
    createdAt: (r.created_at ?? r.createdAt ?? null) as string | null,
  }
}

function adaptProgrammingEvidenceReceipt(raw: unknown): ProgrammingEvidenceReceiptSnapshot {
  const r = (raw as Record<string, unknown>) ?? {}
  const storageRaw = (r.storage as Record<string, unknown> | undefined) ?? undefined
  let storage: ProgrammingEvidenceStorage | undefined
  if (storageRaw && typeof storageRaw === 'object') {
    storage = {
      persisted: Boolean(storageRaw.persisted ?? false),
      table: (storageRaw.table as string | undefined) ?? undefined,
      reason: (storageRaw.reason as string | undefined) ?? undefined,
      id: (storageRaw.id as string | undefined) ?? undefined,
    }
  }
  return {
    receiptId: (r.receipt_id ?? r.receiptId) as string | undefined,
    evidenceType: String(r.evidence_type ?? r.evidenceType ?? r.kind ?? ''),
    status: String(r.status ?? ''),
    command: (r.command ?? null) as string | null,
    output: (r.output ?? null) as string | null,
    files: normList(r.files),
    tests: normList(r.tests),
    diffPath: (r.diff_path ?? r.diffPath ?? null) as string | null,
    artifactUrl: (r.artifact_url ?? r.artifactUrl ?? null) as string | null,
    summary: (r.summary ?? null) as string | null,
    storage,
    recordedAt: (r.recorded_at ?? r.recordedAt ?? r.created_at ?? null) as string | null,
  }
}

function adaptReceipt(raw: unknown): DecisionReceipt | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!r.id) return null
  return {
    id: String(r.id),
    obraId: (r.obraId ?? r.obra_id) as string | undefined,
    traceId: (r.traceId ?? r.trace_id ?? null) as string | null,
    primary: String(r.primary ?? ''),
    model: (r.model as string | undefined) ?? undefined,
    confidence: ((r.confidence as DecisionReceipt['confidence']) ?? 'unknown'),
    confidenceScore: Number(r.confidenceScore ?? r.confidence_score ?? 0),
    routeMode: (r.routeMode ?? r.route_mode) as string | undefined,
    taskType: (r.taskType ?? r.task_type) as string | undefined,
    riskLevel: (r.riskLevel ?? r.risk_level) as string | undefined,
    budgetEstUsd: Number(r.budgetEstUsd ?? r.budget_est_usd ?? 0),
    budgetUsedUsd: Number(r.budgetUsedUsd ?? r.budget_used_usd ?? 0),
    fallbackChain: Array.isArray(r.fallbackChain) ? r.fallbackChain.map(String)
      : Array.isArray(r.fallback_chain) ? (r.fallback_chain as unknown[]).map(String) : [],
    signedBy: (r.signedBy ?? r.signed_by ?? null) as string | null,
    signature: (r.signature ?? null) as string | null,
    signedAt: (r.signedAt ?? r.signed_at ?? null) as string | null,
    reason: (r.reason as string | undefined) ?? undefined,
    createdAt: (r.createdAt ?? r.created_at) as string | undefined,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Cartography adapters · backend snake_case → @atlas/domain camelCase

function adaptCartographyGraph(raw: unknown): CartographyGraph | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const audit = (r.audit as Record<string, unknown> | undefined) ?? {}
  const sources = (r.sources as Record<string, unknown> | undefined) ?? {}
  const sourceHealth = (r.source_health as Record<string, unknown> | undefined) ?? null
  const universe = ((r.universe as unknown[]) ?? []).map(adaptContinent)
  const view = ((r.views as Record<string, unknown> | undefined)?.[
    'atlas-ai-kernel'
  ] as Record<string, unknown> | undefined) ?? {}
  const pipeline = ((view.pipeline as unknown[]) ?? []).map(adaptPipelineStep)
  const lanes: Record<string, import('@atlas/domain').Lane> = {}
  for (const lane of (view.lanes as unknown[]) ?? []) {
    const adapted = adaptLane(lane)
    if (adapted) lanes[adapted.graphId] = adapted
  }
  const connections = ((view.connections as unknown[]) ?? [])
    .map(adaptConnection)
    .filter((c): c is { from: string; to: string; kind: string } => !!c)
  const semanticGraph = adaptSemanticGraph(r.semantic_graph)
  const brokenPaths = adaptBrokenPaths(audit.broken_paths)
  const orphanNodes = adaptOrphanNodes(audit.orphan_nodes)

  return {
    audit: {
      found: Number(audit.pieces_found ?? 0),
      missing: Number(audit.pieces_missing ?? 0),
      brokenPaths,
      orphanNodes,
      orphanCount: Number(audit.orphan_count ?? orphanNodes.length),
      semanticNodeCount: Number(audit.semantic_node_count ?? semanticGraph?.nodes.length ?? 0),
      semanticRelationCount: Number(audit.semantic_relation_count ?? semanticGraph?.relations.length ?? 0),
      generatedAt: (r.generated_at as string | null) ?? null,
      repoIndexed: Number(sources.repo_indexed_count ?? 0),
      vaultIndexed: Number(sources.vault_indexed_count ?? 0),
    },
    sources: {
      repoDocsPath: String(sources.repo_docs_path ?? ''),
      obsidianVaultPath: String(sources.obsidian_vault_path ?? ''),
    },
    sourceHealth: adaptSourceHealth(sourceHealth),
    checksum: typeof r.checksum === 'string' ? r.checksum : null,
    universe,
    pipeline,
    lanes,
    connections,
    semanticGraph,
  }
}

function adaptBrokenPaths(raw: unknown): import('@atlas/domain').BrokenPath[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const r = (item ?? {}) as Record<string, unknown>
      return {
        graphId: String(r.graph_id ?? ''),
        name: String(r.name ?? r.graph_id ?? ''),
        expectedPath: String(r.expected_path ?? ''),
        graphKind: String(r.graph_kind ?? ''),
      }
    })
    .filter((p) => p.graphId !== '')
}

function adaptOrphanNodes(raw: unknown): import('@atlas/domain').OrphanNode[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const r = (item ?? {}) as Record<string, unknown>
      return {
        graphId: String(r.graph_id ?? ''),
        missingParent: String(r.missing_parent ?? ''),
      }
    })
    .filter((p) => p.graphId !== '')
}

function adaptSourceHealth(raw: Record<string, unknown> | null): import('@atlas/domain').SourceHealth | null {
  if (!raw) return null
  const repo = (raw.repo as Record<string, unknown> | undefined) ?? {}
  const vault = (raw.vault as Record<string, unknown> | undefined) ?? {}
  const toRoot = (r: Record<string, unknown>): import('@atlas/domain').SourceRootHealth => ({
    root: String(r.root ?? ''),
    readable: Boolean(r.readable ?? false),
    indexedCount: Number(r.indexed_count ?? 0),
    errors: Array.isArray(r.errors) ? r.errors.map(String) : [],
  })
  return { repo: toRoot(repo), vault: toRoot(vault) }
}

function adaptSemanticGraph(raw: unknown): import('@atlas/domain').SemanticGraph | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const hierarchyRaw = (r.hierarchy as Record<string, unknown> | undefined) ?? {}
  const hierarchy: Record<string, string[]> = {}
  for (const [parent, children] of Object.entries(hierarchyRaw)) {
    hierarchy[parent] = normList(children)
  }

  return {
    worlds: normList(r.worlds),
    nodes: ((r.nodes as unknown[]) ?? []).map(adaptSemanticNode),
    hierarchy,
    relations: ((r.relations as unknown[]) ?? [])
      .map(adaptConnection)
      .filter((c): c is { from: string; to: string; kind: string } => !!c),
  }
}

function adaptSemanticNode(raw: unknown): import('@atlas/domain').SemanticNode {
  const r = (raw as Record<string, unknown>) ?? {}
  return {
    graphId: String(r.graph_id ?? ''),
    graphTitle: String(r.graph_title ?? r.title ?? r.graph_id ?? ''),
    graphWorld: String(r.graph_world ?? ''),
    graphLayer: (r.graph_layer ?? null) as import('@atlas/domain').SemanticNode['graphLayer'],
    graphKind: (r.graph_kind ?? null) as string | null,
    graphParent: (r.graph_parent ?? null) as string | null,
    graphStatus: (r.graph_status ?? null) as string | null,
    graphSource: ((r.graph_source ?? 'repo') as import('@atlas/domain').GraphSource),
    sourcePath: String(r.source_path ?? ''),
    summary: (r.summary ?? null) as string | null,
    dependsOn: normList(r.depends_on),
    flowsTo: normList(r.flows_to),
    unlocks: normList(r.unlocks),
    governs: normList(r.governs),
    riskLevel: (r.risk_level ?? null) as string | null,
    evidence: normList(r.evidence),
    nextActions: normList(r.next_actions),
    mtime: r.mtime == null ? null : Number(r.mtime),
  }
}

function adaptContinent(raw: unknown): import('@atlas/domain').Continent {
  const r = (raw as Record<string, unknown>) ?? {}
  const missing = !!r.missing_source
  return {
    graphId: String(r.graph_id ?? r.graphId ?? ''),
    name: String(r.name ?? ''),
    graphSource: missing
      ? 'missing'
      : ((r.graph_source ?? 'repo') as import('@atlas/domain').GraphSource),
    sourcePath: String(r.source_path ?? r.expected_path ?? ''),
    missingSource: missing,
    count: Number(r.count ?? 0),
    role: (r.role ?? r.summary ?? null) as string | null,
  }
}

function adaptPipelineStep(raw: unknown): import('@atlas/domain').PipelineStep {
  const r = (raw as Record<string, unknown>) ?? {}
  const missing = !!r.missing_source
  return {
    graphId: String(r.graph_id ?? ''),
    graphOrder: Number(r.graph_order ?? 0),
    name: String(r.name ?? ''),
    deck: (r.deck ?? null) as string | null,
    graphSource: missing
      ? 'missing'
      : ((r.graph_source ?? 'repo') as import('@atlas/domain').GraphSource),
    sourcePath: String(r.source_path ?? r.expected_path ?? ''),
    missingSource: missing,
    role: (r.role ?? r.summary ?? null) as string | null,
    input: (r.input ?? null) as string | null,
    output: (r.output ?? null) as string | null,
    depends: normList(r.depends_on),
    unblocks: normList(r.unlocks),
    evidence: norm(r.evidence),
    risk: norm(r.risks),
    next: norm(r.next_actions),
    subs: ((r.subs as Array<[string, string]> | undefined) ?? []),
    title: (r.title ?? null) as string | null,
  }
}

function adaptLane(raw: unknown): import('@atlas/domain').Lane | null {
  const r = (raw as Record<string, unknown>) ?? {}
  const id = String(r.graph_id ?? '')
  if (!id) return null
  const missing = !!r.missing_source
  return {
    graphId: id,
    side: String(r.side ?? 'left'),
    head: String(r.name ?? r.head ?? ''),
    deck: (r.deck ?? null) as string | null,
    graphSource: missing
      ? 'missing'
      : ((r.graph_source ?? 'repo') as import('@atlas/domain').GraphSource),
    sourcePath: String(r.source_path ?? r.expected_path ?? ''),
    missingSource: missing,
    role: (r.role ?? r.summary ?? null) as string | null,
    nodes: ((r.nodes as unknown[]) ?? []).map(adaptLateralNode),
  }
}

function adaptLateralNode(raw: unknown): import('@atlas/domain').LateralNode {
  const r = (raw as Record<string, unknown>) ?? {}
  const missing = !!r.missing_source
  return {
    graphId: String(r.graph_id ?? ''),
    name: String(r.name ?? ''),
    deck: (r.deck ?? null) as string | null,
    graphSource: missing
      ? 'missing'
      : ((r.graph_source ?? 'repo') as import('@atlas/domain').GraphSource),
    sourcePath: String(r.source_path ?? r.expected_path ?? ''),
    missingSource: missing,
    role: (r.role ?? r.summary ?? null) as string | null,
    input: (r.input ?? null) as string | null,
    output: (r.output ?? null) as string | null,
    depends: normList(r.depends_on),
    unblocks: normList(r.unlocks),
    evidence: norm(r.evidence),
    risk: norm(r.risks),
    next: norm(r.next_actions),
  }
}

function adaptConnection(raw: unknown) {
  const r = (raw as Record<string, unknown>) ?? {}
  const from = r.from as string | undefined
  const to = r.to as string | undefined
  if (!from || !to) return null
  return { from, to, kind: String(r.kind ?? 'sequence') }
}

function adaptRecentChanges(raw: unknown[]): RecentChange[] {
  const out: RecentChange[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    out.push({
      graphId: String(r.graph_id ?? ''),
      name: String(r.name ?? ''),
      time: String(r.time ?? ''),
      secondsAgo: Number(r.seconds_ago ?? 0),
      action: String(r.action ?? ''),
      author: String(r.author ?? ''),
      source: ((r.source ?? 'repo') as RecentChange['source']),
      path: String(r.path ?? ''),
    })
  }
  return out
}

function norm(v: unknown): string | null {
  if (v == null) return null
  if (Array.isArray(v)) return v.length === 0 ? null : v.join(' · ')
  return String(v)
}

function normList(v: unknown): string[] {
  if (!v) return []
  return Array.isArray(v) ? v.map(String) : [String(v)]
}
