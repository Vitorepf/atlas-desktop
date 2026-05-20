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

import {
  atlasComputeEffortForPayload,
  normalizeAtlasComputeEffort,
} from '@atlas/rich-input-canon'
import type {
  AtlasCodeEnterpriseCertificationReport,
  AtlasCodeForgeCompletionClaim,
  AtlasCodeForgeFastPathRunStatus,
  AtlasCodeForgeFastPathSnapshot,
  AtlasCodeForgeReviewDecisionResponse,
  AtlasCodeForgeReviewPacket,
  AtlasCodeForgeUxOrchestrator,
  AtlasCodeProviderArenaArm,
  AtlasCodeProviderArenaArmRegistry,
  AtlasCodeProviderArenaHistoryArm,
  AtlasCodeProviderArenaHistoryEntry,
  AtlasCodeProviderArenaModeEntry,
  AtlasCodeProviderArenaPresetEntry,
  AtlasCodeProviderArenaRunPayload,
  AtlasCodeProviderArenaRunResult,
  AtlasCodeProviderArenaSnapshot,
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
  AtlasSelfImprovementProposalBacklog,
  AtlasSelfImprovementProposalBacklogItem,
  AtlasSelfImprovementProposalBacklogFilters,
  AtlasSelfImprovementProposalCreatePayload,
  AtlasSelfImprovementProposalPrioritizePayload,
  AtlasSelfImprovementClosedLoop,
  AtlasSelfImprovementClosedLoopStage,
  AtlasSelfImprovementClosedLoopStageId,
  AtlasSelfImprovementResultLedger,
  AtlasSelfImprovementResultEntry,
  AtlasSelfImprovementLearningPacket,
  AtlasSelfImprovementNextCycleRecommendation,
  AtlasSelfImprovementMeasureResultPayload,
  AtlasSelfImprovementDeltaGrade,
  AtlasSelfConstructionSnapshot,
  AtlasSelfConstructionControlPlaneStatus,
  AtlasSelfConstructionChainIntegrityStatus,
  AtlasSelfConstructionDeterministicReplayStatus,
  AtlasSelfConstructionReplaySnapshotStatus,
  AtlasSelfConstructionReplaySnapshotEntry,
  AtlasSelfConstructionReplayDiffStatus,
  AtlasSelfConstructionPromotionGateStatus,
  AtlasSelfConstructionCertificationWorkbenchStatus,
  AtlasSelfConstructionObservatoryStatus,
  AtlasSelfConstructionRuntimePilotStatus,
  AtlasSelfConstructionReleaseDossierStatus,
  AtlasSelfConstructionProofHashes,
  AtlasWorkspaceProfile,
  AtlasWorkspaceProfileList,
  AtlasWorkspaceProfileSafety,
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

const ENV = ((import.meta as ImportMeta & {
  env?: Record<string, string | undefined>
}).env ?? {})

export function detectMode(): BridgeMode {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    return 'tauri'
  }
  if (ENV.VITE_ATLAS_SERVER_URL) {
    return 'http'
  }
  return 'offline'
}

const MODE: BridgeMode = detectMode()
const HTTP_BASE = ENV.VITE_ATLAS_SERVER_URL ?? ''

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
  const token = ENV.VITE_ATLAS_TOKEN
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

function requireHttpRichInputBridge(method: string, richInput: AtlasRichInputPayload | null): void {
  if (!richInput || MODE !== 'tauri' || HTTP_BASE !== '') return
  throw new Error(
    `${method} · atlas.rich_input.payload.v1 requires VITE_ATLAS_SERVER_URL until the Tauri command accepts rich input`,
  )
}

/**
 * Atlas Unified Rich Input — `atlas.rich_input.payload.v1` is the canonical
 * outbound shape every Atlas surface emits when forwarding attachments + URLs
 * to the backend. We re-export the type from the canonical home so callers can
 * import everything they need from `@/lib/bridge` without learning a second
 * module path; the schema itself lives in `lib/rich-input/types.ts` to keep a
 * single source of truth.
 */
export type { AtlasRichInputPayload } from './rich-input/types'
import type { AtlasRichInputPayload } from './rich-input/types'
import { compactRichInput } from './rich-input/compactRichInput'

// Re-export so the rest of the file (and external callers) can keep
// importing `compactRichInput` from '@/lib/bridge' unchanged. The actual
// implementation lives in a side-effect-free module so unit tests can
// import it without booting Vite's `import.meta.env`.
export { compactRichInput }

export interface AtlasComposerHints {
  mode?: string | null
  task?: string | null
  provider?: string | null
  computeEffort?: string | null
}

function atlasCodeForgePayload(
  obraId?: string,
  composerHints: AtlasComposerHints | null = null,
): Record<string, unknown> {
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

  const hintedProvider = composerHints?.provider && composerHints.provider !== 'auto'
    ? composerHints.provider
    : null
  const computeEffort = normalizeAtlasComputeEffort(composerHints?.computeEffort)
  const requestedComputeEffort = atlasComputeEffortForPayload(computeEffort)
  payload.operator_composer_hints = {
    schema_version: 'atlas.unified_composer.hints.v1',
    mode: composerHints?.mode ?? 'auto',
    task: composerHints?.task ?? 'auto',
    provider: composerHints?.provider ?? 'auto',
    compute_effort: computeEffort,
    preserves_surface_flow: true,
    surface_flow: 'programming.forge',
    provider_selection_effect: hintedProvider ? 'operator_hint_requires_backend_policy' : 'atlas_decide',
  }
  payload.operator_compute_effort = computeEffort
  payload.decision_mode = hintedProvider ? 'manual_override' : 'atlas_decide'
  if (hintedProvider) {
    payload.requested_provider = hintedProvider
    payload.operator_requested_provider = hintedProvider
  }
  if (requestedComputeEffort) {
    payload.compute_effort = requestedComputeEffort
    payload.policy_hints = {
      compute_effort: requestedComputeEffort,
    }
    const devExecutionPlan = payload.dev_execution_plan as {
      operator_options?: Record<string, unknown>
    }
    devExecutionPlan.operator_options = {
      ...(devExecutionPlan.operator_options ?? {}),
      compute_effort: requestedComputeEffort,
    }
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

  /**
   * 0d · Atlas Self-Construction OS · Agent Control Plane Certification
   *
   * Read-only diagnostic projection. Tolerates a backend that has not yet
   * exposed the endpoint (404 / no route / Tauri command missing) — returns
   * `null` and the panel renders an honest "endpoint pending" state.
   *
   * Probe path (atlas-server side, when shipped):
   *   GET /atlas-code/self-construction/control-plane
   *
   * This call NEVER triggers runtime. The contract is explicit:
   *   "never starts processes, never calls Codex CLI/app, never spawns
   *    subprocesses, never invokes adapters, never dispatches work, never
   *    spends tokens, never advances the next required slice, never marks
   *    runtime flags true, never writes the ledger, never promotes claims."
   */
  async getAtlasSelfConstruction(): Promise<AtlasSelfConstructionSnapshot | null> {
    try {
      let raw: unknown
      let source: 'http' | 'tauri' | 'unavailable' = 'unavailable'
      let endpoint: string | null = null
      if (MODE === 'tauri') {
        try {
          raw = await invokeTauri<unknown>('bridge_get_atlas_self_construction')
          source = 'tauri'
          endpoint = 'bridge_get_atlas_self_construction'
        } catch {
          return null
        }
      } else if (MODE === 'http') {
        endpoint = '/atlas-code/self-construction/control-plane'
        try {
          raw = await fetchHttp<unknown>(endpoint)
          source = 'http'
        } catch {
          return null
        }
      } else {
        return null
      }
      return adaptAtlasSelfConstruction(raw, source, endpoint)
    } catch (e) {
      console.warn('[bridge] getAtlasSelfConstruction', e)
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
  async listObras(opts: { workspaceSlug?: string | null } = {}): Promise<Obra[]> {
    try {
      let raw: unknown
      const workspaceSlug = opts.workspaceSlug ?? null
      if (MODE === 'tauri') {
        raw = await invokeTauri<unknown>('bridge_list_works')
      } else if (MODE === 'http') {
        const qs = workspaceSlug ? `?workspace=${encodeURIComponent(workspaceSlug)}` : ''
        raw = await fetchHttp<unknown>(`/atlas-code/works${qs}`)
      } else {
        return []
      }
      return normaliseObras(raw)
    } catch (e) {
      console.warn('[bridge] listObras', e)
      return []
    }
  },

  // 2b · list Project/Workspace profiles (Atlas, Blackink, …)
  //
  // Canon: docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
  // Read-only · returns null when backend has not exposed the endpoint yet
  // (older atlas-server builds). UI shows honest fallback (single default).
  async listWorkspaces(): Promise<import('@atlas/domain').AtlasWorkspaceProfileList | null> {
    try {
      let raw: unknown
      if (MODE === 'http') {
        raw = await fetchHttp<unknown>('/atlas-code/projects/workspaces')
      } else if (MODE === 'tauri') {
        // Tauri command not implemented for workspaces yet. Tenta primeiro,
        // mas se falhar (e tivermos HTTP_BASE configurado via env), faz fallback
        // HTTP direto — Tauri WebView pode chamar 127.0.0.1:8001 sem problemas
        // de CORS local.
        try {
          raw = await invokeTauri<unknown>('bridge_list_workspaces')
        } catch {
          if (!HTTP_BASE) return null
          try {
            raw = await fetchHttp<unknown>('/atlas-code/projects/workspaces')
          } catch (e) {
            console.warn('[bridge] listWorkspaces HTTP fallback failed', e)
            return null
          }
        }
      } else {
        return null
      }
      return adaptWorkspaceProfileList(raw)
    } catch (e) {
      console.warn('[bridge] listWorkspaces', e)
      return null
    }
  },

  // 3 · create obra · V2 wrapper /atlas-code/works
  //
  // `workspaceSlug` binds the new Obra to a Project/Workspace via metadata
  // (canon: atlas-code-multi-project-workspace-os.md). Backwards-compatible:
  // omitting it leaves the backend to resolve the default slug honestly.
  async createObra(
    intent: string,
    objective: string,
    domain = 'atlas',
    opts: { workspaceSlug?: string | null; richInput?: AtlasRichInputPayload | null } = {}
  ): Promise<Obra> {
    const workspaceSlug = opts.workspaceSlug ?? null
    const richInput = compactRichInput(opts.richInput)
    requireHttpRichInputBridge('createObra', richInput)
    if (MODE === 'tauri' && !richInput) {
      const raw = await invokeTauri<unknown>('bridge_create_work', { intent, objective, domain })
      return normaliseObras(raw)[0] ?? offline('createObra')
    }
    if (MODE === 'http' || (MODE === 'tauri' && richInput)) {
      const body: Record<string, unknown> = { intent, objective, domain }
      if (workspaceSlug) body.workspace_slug = workspaceSlug
      if (richInput) body.rich_input = richInput
      const wrap = await fetchHttp<{ work?: Record<string, unknown> }>('/atlas-code/works', {
        method: 'POST',
        body,
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
    obraId?: string,
    opts: { richInput?: AtlasRichInputPayload | null; composerHints?: AtlasComposerHints | null } = {}
  ): Promise<{ traceId: string; threadId?: string }> {
    const richInput = compactRichInput(opts.richInput)
    const composerHints = opts.composerHints ?? null
    requireHttpRichInputBridge('sendIntent', richInput)
    if (MODE === 'tauri' && !richInput) {
      const res = await invokeTauri<{ trace?: { id?: string; thread_id?: string; threadId?: string } }>('bridge_send_intent_v2', {
        threadId: threadId ?? null,
        body,
        channel,
        obraId: obraId ?? null,
        composerHints,
      })
      return normaliseTraceEnvelope(res, threadId)
    }
    if (MODE === 'http' || (MODE === 'tauri' && richInput)) {
      const forgePayload = atlasCodeForgePayload(obraId, composerHints)
      if (richInput) {
        // Stash the full structured payload inside the routing payload so
        // Forge/Programming flows can audit attachment provenance + read
        // URL/text_block metadata that the legacy AiInteractionController
        // does not natively validate.
        forgePayload.rich_input = richInput
      }
      const payload: Record<string, unknown> = {
        input_text: body,
        source_type: 'app',
        kind: 'interaction',
        payload: forgePayload,
      }
      if (threadId) payload.thread_id = threadId
      else payload.new_thread = true
      if (obraId) payload.source_id = obraId
      // Top-level uploaded_images / uploaded_documents are already accepted by
      // StoreAiInteractionRequest — propagate them so the existing chunked
      // attachment pipeline picks the assets up unchanged. The canonical
      // payload exposes them as `_ids`; we just re-key for the legacy slot.
      if (richInput && richInput.uploaded_image_ids.length > 0) {
        payload.uploaded_images = richInput.uploaded_image_ids
      }
      if (richInput && richInput.uploaded_document_ids.length > 0) {
        payload.uploaded_documents = richInput.uploaded_document_ids
      }
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

  // 10b.13.6 · Atlas Code Provider Arena UI v1 · GET snapshot / POST run
  async getProviderArenaSnapshot(historyLimit?: number): Promise<AtlasCodeProviderArenaSnapshot | null> {
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_get_provider_arena_snapshot', { historyLimit })
    } else if (MODE === 'http') {
      const query = typeof historyLimit === 'number' ? `?history_limit=${historyLimit}` : ''
      raw = await fetchHttp<unknown>(`/atlas-code/forge/provider-arena/snapshot${query}`)
    } else {
      offline('getProviderArenaSnapshot')
    }
    return adaptProviderArenaSnapshot(raw)
  },

  async runProviderArena(payload: AtlasCodeProviderArenaRunPayload): Promise<AtlasCodeProviderArenaRunResult | null> {
    const wire = {
      arm_a: payload.armA,
      arm_b: payload.armB,
      arm_a_model: payload.armAModel ?? '',
      arm_b_model: payload.armBModel ?? '',
      task_category: payload.taskCategory,
      mode: payload.mode,
      preset: payload.preset ?? 'smoke',
      source_ref: payload.sourceRef ?? 'HEAD',
      run_id: payload.runId ?? '',
      confirmations: {
        runbook_reviewed: payload.confirmations?.runbookReviewed ?? false,
        provider_cost: payload.confirmations?.providerCost ?? false,
        real_provider_call: payload.confirmations?.realProviderCall ?? false,
      },
    }
    let raw: unknown
    if (MODE === 'tauri') {
      raw = await invokeTauri<unknown>('bridge_run_provider_arena', { payload: wire })
    } else if (MODE === 'http') {
      raw = await fetchHttp<unknown>('/atlas-code/forge/provider-arena/run', {
        method: 'POST',
        body: wire,
      })
    } else {
      offline('runProviderArena')
    }
    return adaptProviderArenaRunResult(raw)
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

  // 10b.13.13 · Atlas Self-Improvement Closed Loop Level 7 v1 · Proposal Backlog
  // Schema canônico: atlas.self_improvement.proposal_backlog.v1
  // Doc: docs/engineering-knowledge-base/atlas-self-improvement-closed-loop-level7-v1.md
  // HTTP-only fallback documented — no Tauri commands wired for Level 7.
  async listSelfImprovementProposalBacklog(
    filters?: AtlasSelfImprovementProposalBacklogFilters,
  ): Promise<AtlasSelfImprovementProposalBacklog | null> {
    const params: string[] = []
    if (filters?.status) params.push(`status=${encodeURIComponent(filters.status)}`)
    if (filters?.source) params.push(`source=${encodeURIComponent(filters.source)}`)
    if (filters?.bucket) params.push(`bucket=${encodeURIComponent(filters.bucket)}`)
    if (filters?.linkedObra === true) params.push('linked_obra=true')
    if (filters?.linkedObra === false) params.push('linked_obra=false')
    const path = `/atlas-code/self-improvement/proposals${params.length ? '?' + params.join('&') : ''}`
    try {
      const raw = await fetchHttp<unknown>(path)
      return adaptSelfImprovementProposalBacklog(raw)
    } catch (e) {
      console.warn('[bridge] listSelfImprovementProposalBacklog', e)
      return null
    }
  },

  async getSelfImprovementProposal(
    proposalId: string,
  ): Promise<AtlasSelfImprovementProposalBacklogItem | null> {
    try {
      const raw = await fetchHttp<unknown>(
        `/atlas-code/self-improvement/proposals/${encodeURIComponent(proposalId)}`,
      )
      return adaptSelfImprovementProposalBacklogItem(raw)
    } catch (e) {
      console.warn('[bridge] getSelfImprovementProposal', e)
      return null
    }
  },

  async createSelfImprovementProposal(
    payload: AtlasSelfImprovementProposalCreatePayload,
  ): Promise<AtlasSelfImprovementProposalBacklogItem | null> {
    const body: Record<string, unknown> = {}
    if (payload.proposal !== undefined) body.proposal = payload.proposal
    if (payload.source !== undefined) body.source = payload.source
    if (payload.affectedDomains !== undefined) body.affected_domains = payload.affectedDomains
    if (payload.constraints !== undefined) body.constraints = payload.constraints
    try {
      const raw = await fetchHttp<unknown>('/atlas-code/self-improvement/proposals', {
        method: 'POST',
        body,
      })
      return adaptSelfImprovementProposalBacklogItem(raw)
    } catch (e) {
      console.warn('[bridge] createSelfImprovementProposal', e)
      return null
    }
  },

  async evaluateSelfImprovementProposal(
    proposalId: string,
  ): Promise<AtlasSelfImprovementProposalBacklogItem | null> {
    try {
      const raw = await fetchHttp<unknown>(
        `/atlas-code/self-improvement/proposals/${encodeURIComponent(proposalId)}/evaluate`,
        { method: 'POST', body: {} },
      )
      return adaptSelfImprovementProposalBacklogItem(raw)
    } catch (e) {
      console.warn('[bridge] evaluateSelfImprovementProposal', e)
      return null
    }
  },

  async prioritizeSelfImprovementProposal(
    proposalId: string,
    payload?: AtlasSelfImprovementProposalPrioritizePayload,
  ): Promise<AtlasSelfImprovementProposalBacklogItem | null> {
    const body: Record<string, unknown> = {}
    if (payload?.strategyBucket !== undefined) body.strategy_bucket = payload.strategyBucket
    try {
      const raw = await fetchHttp<unknown>(
        `/atlas-code/self-improvement/proposals/${encodeURIComponent(proposalId)}/prioritize`,
        { method: 'POST', body },
      )
      return adaptSelfImprovementProposalBacklogItem(raw)
    } catch (e) {
      console.warn('[bridge] prioritizeSelfImprovementProposal', e)
      return null
    }
  },

  async getSelfImprovementClosedLoop(
    proposalId: string,
  ): Promise<AtlasSelfImprovementClosedLoop | null> {
    try {
      const raw = await fetchHttp<unknown>(
        `/atlas-code/self-improvement/proposals/${encodeURIComponent(proposalId)}/closed-loop`,
      )
      return adaptSelfImprovementClosedLoop(raw)
    } catch (e) {
      console.warn('[bridge] getSelfImprovementClosedLoop', e)
      return null
    }
  },

  async measureSelfImprovementResult(
    proposalId: string,
    payload: AtlasSelfImprovementMeasureResultPayload,
  ): Promise<AtlasSelfImprovementResultEntry | null> {
    if (!payload.reviewer?.trim() || !payload.reason?.trim()) {
      throw new Error('measureSelfImprovementResult requires reviewer and reason')
    }
    const body: Record<string, unknown> = {
      obra_id: payload.obraId,
      before_snapshot: payload.beforeSnapshot,
      after_snapshot: payload.afterSnapshot,
      reviewer: payload.reviewer,
      reason: payload.reason,
    }
    if (payload.context !== undefined) body.context = payload.context
    try {
      const raw = await fetchHttp<unknown>(
        `/atlas-code/self-improvement/proposals/${encodeURIComponent(proposalId)}/measure-result`,
        { method: 'POST', body },
      )
      return adaptSelfImprovementResultEntry(raw)
    } catch (e) {
      console.warn('[bridge] measureSelfImprovementResult', e)
      return null
    }
  },

  async listSelfImprovementResultLedger(filters?: { grade?: string; proposalId?: string }): Promise<AtlasSelfImprovementResultLedger | null> {
    const params: string[] = []
    if (filters?.grade) params.push(`grade=${encodeURIComponent(filters.grade)}`)
    if (filters?.proposalId) params.push(`proposal_id=${encodeURIComponent(filters.proposalId)}`)
    const path = `/atlas-code/self-improvement/result-ledger${params.length ? '?' + params.join('&') : ''}`
    try {
      const raw = await fetchHttp<unknown>(path)
      return adaptSelfImprovementResultLedger(raw)
    } catch (e) {
      console.warn('[bridge] listSelfImprovementResultLedger', e)
      return null
    }
  },

  async getSelfImprovementNextCycle(opts?: { proposalId?: string; latest?: boolean }): Promise<AtlasSelfImprovementNextCycleRecommendation | null> {
    const params: string[] = []
    if (opts?.proposalId) params.push(`proposal_id=${encodeURIComponent(opts.proposalId)}`)
    if (opts?.latest === true) params.push('latest=true')
    const path = `/atlas-code/self-improvement/next-cycle-recommendations${params.length ? '?' + params.join('&') : ''}`
    try {
      const raw = await fetchHttp<unknown>(path)
      return adaptSelfImprovementNextCycleRecommendation(raw)
    } catch (e) {
      console.warn('[bridge] getSelfImprovementNextCycle', e)
      return null
    }
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
    const workspaceSlug = (o.workspace_slug ?? o.workspaceSlug ?? null) as string | null
    const workspaceName = (o.workspace_name ?? o.workspaceName ?? null) as string | null
    obras.push({
      id,
      title: (o.title ?? o.name ?? id) as string,
      objective: (o.objective ?? o.description ?? o.goal ?? o.title ?? '') as string,
      status: ((o.status as Obra['status']) ?? 'active'),
      workspacePath: (o.workspace_path ?? o.workspacePath ?? '') as string,
      createdAt: (o.created_at ?? o.createdAt ?? '') as string,
      workspaceSlug: workspaceSlug && String(workspaceSlug).trim() !== '' ? String(workspaceSlug) : null,
      workspaceName: workspaceName && String(workspaceName).trim() !== '' ? String(workspaceName) : null,
    })
  }
  return obras
}

function adaptWorkspaceProfile(raw: unknown): AtlasWorkspaceProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const slug = String(r.slug ?? r.id ?? '').trim()
  if (slug === '') return null

  const safetyRaw = (r.safety ?? {}) as Record<string, unknown>
  const safety: AtlasWorkspaceProfileSafety = {
    executionAllowed: Boolean(safetyRaw.execution_allowed ?? safetyRaw.executionAllowed ?? false),
    executionBlockedReason:
      typeof safetyRaw.execution_blocked_reason === 'string'
        ? (safetyRaw.execution_blocked_reason as string)
        : typeof safetyRaw.executionBlockedReason === 'string'
          ? (safetyRaw.executionBlockedReason as string)
          : null,
    riskFloor: String(safetyRaw.risk_floor ?? safetyRaw.riskFloor ?? r.default_risk ?? 'medium'),
    requiresExplicitInterventionReview: Boolean(
      safetyRaw.requires_explicit_intervention_review ??
        safetyRaw.requiresExplicitInterventionReview ??
        false
    ),
  }

  const commandsRaw = (r.commands ?? {}) as Record<string, unknown>
  const commands: Record<string, string> = {}
  for (const [k, v] of Object.entries(commandsRaw)) {
    if (typeof v === 'string' && v.trim() !== '') commands[k] = v
  }

  const stringList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []

  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.code.workspace_profile.v1'),
    id: String(r.id ?? slug),
    slug,
    name: String(r.name ?? slug),
    kind: String(r.kind ?? 'product'),
    workspacePath: String(r.workspace_path ?? r.workspacePath ?? ''),
    workspacePathExists: Boolean(r.workspace_path_exists ?? r.workspacePathExists ?? false),
    repoRoot: String(r.repo_root ?? r.repoRoot ?? ''),
    productionStatus: String(r.production_status ?? r.productionStatus ?? 'development'),
    stackSummary: String(r.stack_summary ?? r.stackSummary ?? ''),
    commands,
    testCommands: stringList(r.test_commands ?? r.testCommands),
    buildCommands: stringList(r.build_commands ?? r.buildCommands),
    devServerCommand:
      typeof r.dev_server_command === 'string'
        ? (r.dev_server_command as string)
        : typeof r.devServerCommand === 'string'
          ? (r.devServerCommand as string)
          : null,
    criticalAreas: stringList(r.critical_areas ?? r.criticalAreas),
    docsStatus: String(r.docs_status ?? r.docsStatus ?? 'unknown'),
    defaultRisk: String(r.default_risk ?? r.defaultRisk ?? 'medium'),
    deploymentNotes: String(r.deployment_notes ?? r.deploymentNotes ?? ''),
    surfacesEnabled: (() => {
      const raw = r.surfaces_enabled ?? r.surfacesEnabled
      if (Array.isArray(raw)) {
        const out = raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
        return out.length > 0 ? out : ['atlas_ai', 'cartografia', 'code', 'atencao']
      }
      return ['atlas_ai', 'cartografia', 'code', 'atencao']
    })(),
    safety,
  }
}

function adaptWorkspaceProfileList(raw: unknown): AtlasWorkspaceProfileList | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const listRaw = Array.isArray(r.data)
    ? (r.data as unknown[])
    : Array.isArray(r.profiles)
      ? (r.profiles as unknown[])
      : []
  const profiles: AtlasWorkspaceProfile[] = []
  for (const item of listRaw) {
    const p = adaptWorkspaceProfile(item)
    if (p) profiles.push(p)
  }
  if (profiles.length === 0) return null
  const meta = (r.meta ?? {}) as Record<string, unknown>
  const defaultSlug = String(meta.default_slug ?? meta.defaultSlug ?? profiles[0].slug)
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.code.workspace_profile.v1'),
    defaultSlug,
    profiles,
  }
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

function adaptSelfImprovementProposalPriorityDecision(raw: unknown): import('@atlas/domain').AtlasSelfImprovementProposalPriorityDecision | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.self_improvement.proposal_priority_decision.v1'),
    decidedAt: String(r.decided_at ?? r.decidedAt ?? ''),
    strategyBucket: String(r.strategy_bucket ?? r.strategyBucket ?? 'core_runtime'),
    targetPercent: Number(r.target_percent ?? r.targetPercent ?? 10),
    portfolioAligned: Boolean(r.portfolio_aligned ?? r.portfolioAligned ?? false),
    portfolioRecommends: nullableString(r.portfolio_recommends ?? r.portfolioRecommends),
    priorityScore: Number(r.priority_score ?? r.priorityScore ?? 0),
    reason: String(r.reason ?? ''),
    autoActivationAllowed: Boolean(r.auto_activation_allowed ?? r.autoActivationAllowed ?? false),
    humanApprovalRequired: Boolean(r.human_approval_required ?? r.humanApprovalRequired ?? true),
  }
}

function adaptSelfImprovementProposalBacklogItem(raw: unknown): AtlasSelfImprovementProposalBacklogItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (nullableString(r.proposal_id ?? r.proposalId) === null) return null
  const lastDecisionRaw = (r.last_decision ?? r.lastDecision) as Record<string, unknown> | null | undefined
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.self_improvement.proposal_backlog_item.v1'),
    proposalId: String(r.proposal_id ?? r.proposalId),
    title: String(r.title ?? 'untitled proposal'),
    summary: String(r.summary ?? ''),
    source: String(r.source ?? 'manual'),
    status: String(r.status ?? 'draft'),
    riskLevel: String(r.risk_level ?? r.riskLevel ?? 'medium'),
    expectedPowerGain: nullableString(r.expected_power_gain ?? r.expectedPowerGain),
    targetCapability: nullableString(r.target_capability ?? r.targetCapability),
    affectedDomains: normList(r.affected_domains ?? r.affectedDomains),
    canonicalDocs: normList(r.canonical_docs ?? r.canonicalDocs),
    businessRule: nullableString(r.business_rule ?? r.businessRule),
    acceptanceCriteria: normList(r.acceptance_criteria ?? r.acceptanceCriteria),
    constraints: normList(r.constraints),
    strategyBucket: nullableString(r.strategy_bucket ?? r.strategyBucket),
    priorityScore: numberOrNull(r.priority_score ?? r.priorityScore),
    createdAt: String(r.created_at ?? r.createdAt ?? ''),
    updatedAt: String(r.updated_at ?? r.updatedAt ?? ''),
    lastDecision: lastDecisionRaw && typeof lastDecisionRaw === 'object'
      ? {
          kind: String(lastDecisionRaw.kind ?? ''),
          outcome: String(lastDecisionRaw.outcome ?? ''),
          decidedAt: String(lastDecisionRaw.decided_at ?? lastDecisionRaw.decidedAt ?? ''),
          reviewer: nullableString(lastDecisionRaw.reviewer),
          reason: nullableString(lastDecisionRaw.reason),
        }
      : null,
    linkedActivationId: nullableString(r.linked_activation_id ?? r.linkedActivationId),
    linkedObraId: nullableString(r.linked_obra_id ?? r.linkedObraId),
    linkedFastPathRunId: nullableString(r.linked_fast_path_run_id ?? r.linkedFastPathRunId),
    linkedCompletionClaimId: nullableString(r.linked_completion_claim_id ?? r.linkedCompletionClaimId),
    linkedResultEntryId: nullableString(r.linked_result_entry_id ?? r.linkedResultEntryId),
    evidenceRefs: normList(r.evidence_refs ?? r.evidenceRefs),
    blockers: normList(r.blockers),
    nextSafeAction: String(r.next_safe_action ?? r.nextSafeAction ?? ''),
    powerGate: (r.power_gate ?? r.powerGate) && typeof (r.power_gate ?? r.powerGate) === 'object'
      ? ((r.power_gate ?? r.powerGate) as Record<string, unknown>)
      : null,
    priorityDecision: adaptSelfImprovementProposalPriorityDecision(r.priority_decision ?? r.priorityDecision),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    autoFastPathExecuted: Boolean(r.auto_fast_path_executed ?? r.autoFastPathExecuted ?? false),
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
    isReadModel: Boolean(r.is_read_model ?? r.isReadModel ?? false),
  }
}

function adaptSelfImprovementProposalBacklog(raw: unknown): AtlasSelfImprovementProposalBacklog | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const filtersRaw = (r.filters ?? {}) as Record<string, unknown>
  const countersRaw = (r.counters ?? {}) as Record<string, unknown>
  const proposalsRaw = Array.isArray(r.proposals) ? (r.proposals as unknown[]) : []
  const proposals = proposalsRaw
    .map(adaptSelfImprovementProposalBacklogItem)
    .filter((p): p is AtlasSelfImprovementProposalBacklogItem => p !== null)

  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.self_improvement.proposal_backlog.v1'),
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
    filters: {
      status: nullableString(filtersRaw.status),
      source: nullableString(filtersRaw.source),
      bucket: nullableString(filtersRaw.bucket),
      linkedObra: typeof filtersRaw.linked_obra === 'boolean'
        ? (filtersRaw.linked_obra as boolean)
        : typeof filtersRaw.linkedObra === 'boolean'
          ? (filtersRaw.linkedObra as boolean)
          : null,
    },
    proposals,
    counters: {
      total: Number(countersRaw.total ?? 0),
      draft: Number(countersRaw.draft ?? 0),
      evaluating: Number(countersRaw.evaluating ?? 0),
      needsRevision: Number(countersRaw.needs_revision ?? countersRaw.needsRevision ?? 0),
      pendingHumanReview: Number(countersRaw.pending_human_review ?? countersRaw.pendingHumanReview ?? 0),
      approvedForActivation: Number(countersRaw.approved_for_activation ?? countersRaw.approvedForActivation ?? 0),
      activated: Number(countersRaw.activated ?? 0),
      obraCreated: Number(countersRaw.obra_created ?? countersRaw.obraCreated ?? 0),
      forgeRunning: Number(countersRaw.forge_running ?? countersRaw.forgeRunning ?? 0),
      awaitingReview: Number(countersRaw.awaiting_review ?? countersRaw.awaitingReview ?? 0),
      measuringDelta: Number(countersRaw.measuring_delta ?? countersRaw.measuringDelta ?? 0),
      learned: Number(countersRaw.learned ?? 0),
      rejected: Number(countersRaw.rejected ?? 0),
      archived: Number(countersRaw.archived ?? 0),
      withObra: Number(countersRaw.with_obra ?? countersRaw.withObra ?? 0),
      withBlockers: Number(countersRaw.with_blockers ?? countersRaw.withBlockers ?? 0),
    },
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    autoFastPathExecuted: Boolean(r.auto_fast_path_executed ?? r.autoFastPathExecuted ?? false),
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
    isReadModel: Boolean(r.is_read_model ?? r.isReadModel ?? true),
  }
}

function adaptSelfImprovementClosedLoopStage(raw: unknown): AtlasSelfImprovementClosedLoopStage | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    stage: String(r.stage ?? '') as AtlasSelfImprovementClosedLoopStageId,
    status: String(r.status ?? 'todo'),
    label: String(r.label ?? ''),
    tone: String(r.tone ?? 'ink') as AtlasSelfImprovementActivationTone,
    evidence: nullableString(r.evidence),
    completedAt: nullableString(r.completed_at ?? r.completedAt),
  }
}

function adaptSelfImprovementLearningPacket(raw: unknown): AtlasSelfImprovementLearningPacket | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.self_improvement.learning_packet.v1'),
    whatChanged: String(r.what_changed ?? r.whatChanged ?? 'unspecified'),
    whyItMattered: String(r.why_it_mattered ?? r.whyItMattered ?? 'unspecified'),
    evidenceSupportingImprovement: normList(r.evidence_supporting_improvement ?? r.evidenceSupportingImprovement),
    whatFailedOrWasMissing: normList(r.what_failed_or_was_missing ?? r.whatFailedOrWasMissing),
    newRuleCandidate: nullableString(r.new_rule_candidate ?? r.newRuleCandidate),
    futureTriggerConditions: normList(r.future_trigger_conditions ?? r.futureTriggerConditions),
    rollbackRecommendation: nullableString(r.rollback_recommendation ?? r.rollbackRecommendation),
    confidence: Number(r.confidence ?? 0),
  }
}

function adaptSelfImprovementResultEntry(raw: unknown): AtlasSelfImprovementResultEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if ((r.status ?? null) === 'blocked') return null
  const learning = adaptSelfImprovementLearningPacket(r.learning_packet ?? r.learningPacket)
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.self_improvement.result_entry.v1'),
    resultEntryId: String(r.result_entry_id ?? r.resultEntryId ?? ''),
    proposalId: String(r.proposal_id ?? r.proposalId ?? ''),
    obraId: String(r.obra_id ?? r.obraId ?? ''),
    beforeSnapshotHash: String(r.before_snapshot_hash ?? r.beforeSnapshotHash ?? ''),
    afterSnapshotHash: String(r.after_snapshot_hash ?? r.afterSnapshotHash ?? ''),
    deltaScorecard: (r.delta_scorecard ?? r.deltaScorecard ?? {}) as Record<string, unknown>,
    deltaGrade: String(r.delta_grade ?? r.deltaGrade ?? 'neutral'),
    evidenceStrength: String(r.evidence_strength ?? r.evidenceStrength ?? 'weak'),
    humanReviewOutcome: nullableString(r.human_review_outcome ?? r.humanReviewOutcome),
    reviewer: nullableString(r.reviewer),
    reason: nullableString(r.reason),
    acceptedRisks: normList(r.accepted_risks ?? r.acceptedRisks),
    regressionsDetected: Array.isArray(r.regressions_detected ?? r.regressionsDetected)
      ? ((r.regressions_detected ?? r.regressionsDetected) as unknown[])
      : [],
    invariantsPreserved: Boolean(r.invariants_preserved ?? r.invariantsPreserved ?? false),
    invariantViolations: Array.isArray(r.invariant_violations ?? r.invariantViolations)
      ? ((r.invariant_violations ?? r.invariantViolations) as unknown[])
      : [],
    trustDelta: Number(r.trust_delta ?? r.trustDelta ?? 0),
    trustOutcomeRecorded: String(r.trust_outcome_recorded ?? r.trustOutcomeRecorded ?? ''),
    recommendedNextAction: String(r.recommended_next_action ?? r.recommendedNextAction ?? ''),
    shouldBecomeRule: Boolean(r.should_become_rule ?? r.shouldBecomeRule ?? false),
    learningPacket: learning ?? {
      schemaVersion: 'atlas.self_improvement.learning_packet.v1',
      whatChanged: 'unspecified',
      whyItMattered: 'unspecified',
      evidenceSupportingImprovement: [],
      whatFailedOrWasMissing: [],
      newRuleCandidate: null,
      futureTriggerConditions: [],
      rollbackRecommendation: null,
      confidence: 0,
    },
    recordedAt: String(r.recorded_at ?? r.recordedAt ?? ''),
    evidenceRefs: normList(r.evidence_refs ?? r.evidenceRefs),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    autoFastPathExecuted: Boolean(r.auto_fast_path_executed ?? r.autoFastPathExecuted ?? false),
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
  }
}

function adaptSelfImprovementResultLedger(raw: unknown): AtlasSelfImprovementResultLedger | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const entriesRaw = Array.isArray(r.entries) ? (r.entries as unknown[]) : []
  const entries = entriesRaw
    .map(adaptSelfImprovementResultEntry)
    .filter((e): e is AtlasSelfImprovementResultEntry => e !== null)
  const countersRaw = (r.counters ?? {}) as Record<string, unknown>
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.self_improvement.result_ledger.v1'),
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
    entries,
    counters: {
      total: Number(countersRaw.total ?? 0),
      regressed: Number(countersRaw.regressed ?? 0),
      neutral: Number(countersRaw.neutral ?? 0),
      improved: Number(countersRaw.improved ?? 0),
      majorImprovement: Number(countersRaw.major_improvement ?? countersRaw.majorImprovement ?? 0),
      invalid: Number(countersRaw.invalid ?? 0),
      invariantsViolated: Number(countersRaw.invariants_violated ?? countersRaw.invariantsViolated ?? 0),
    },
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    autoFastPathExecuted: Boolean(r.auto_fast_path_executed ?? r.autoFastPathExecuted ?? false),
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
    isReadModel: Boolean(r.is_read_model ?? r.isReadModel ?? true),
  }
}

function adaptSelfImprovementNextCycleRecommendation(raw: unknown): AtlasSelfImprovementNextCycleRecommendation | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.self_improvement.next_cycle_recommendation.v1'),
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
    recommendation: nullableString(r.recommendation),
    rationale: String(r.rationale ?? ''),
    confidence: Number(r.confidence ?? 0),
    linkedResultEntryId: nullableString(r.linked_result_entry_id ?? r.linkedResultEntryId),
    linkedProposalId: nullableString(r.linked_proposal_id ?? r.linkedProposalId),
    linkedObraId: nullableString(r.linked_obra_id ?? r.linkedObraId),
    portfolioBalanceHealth: nullableString(r.portfolio_balance_health ?? r.portfolioBalanceHealth),
    portfolioRecommendedNextBucket: nullableString(r.portfolio_recommended_next_bucket ?? r.portfolioRecommendedNextBucket),
    proposedNextProposalPayload: (r.proposed_next_proposal_payload ?? r.proposedNextProposalPayload) && typeof (r.proposed_next_proposal_payload ?? r.proposedNextProposalPayload) === 'object'
      ? ((r.proposed_next_proposal_payload ?? r.proposedNextProposalPayload) as Record<string, unknown>)
      : null,
    humanApprovalRequired: Boolean(r.human_approval_required ?? r.humanApprovalRequired ?? true),
    autoActivationAllowed: Boolean(r.auto_activation_allowed ?? r.autoActivationAllowed ?? false),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    autoFastPathExecuted: Boolean(r.auto_fast_path_executed ?? r.autoFastPathExecuted ?? false),
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
    isReadModel: Boolean(r.is_read_model ?? r.isReadModel ?? true),
  }
}

function adaptSelfImprovementClosedLoop(raw: unknown): AtlasSelfImprovementClosedLoop | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const stagesRaw = (r.stages ?? {}) as Record<string, unknown>
  const stages: Record<string, AtlasSelfImprovementClosedLoopStage> = {}
  for (const [key, value] of Object.entries(stagesRaw)) {
    const s = adaptSelfImprovementClosedLoopStage(value)
    if (s !== null) stages[key] = s
  }
  const afterRaw = (r.after_snapshot ?? r.afterSnapshot) as Record<string, unknown> | null | undefined
  const trustRaw = (r.trust_update ?? r.trustUpdate) as Record<string, unknown> | null | undefined
  const evidenceRaw = (r.evidence_summary ?? r.evidenceSummary) as Record<string, unknown> | null | undefined
  const reviewRaw = (r.review_summary ?? r.reviewSummary) as Record<string, unknown> | null | undefined
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.self_improvement.closed_loop.v1'),
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
    status: String(r.status ?? 'projected'),
    proposalId: String(r.proposal_id ?? r.proposalId ?? ''),
    activationId: nullableString(r.activation_id ?? r.activationId),
    obraId: nullableString(r.obra_id ?? r.obraId),
    resultEntryId: nullableString(r.result_entry_id ?? r.resultEntryId),
    currentLoopStage: nullableString(r.current_loop_stage ?? r.currentLoopStage) as AtlasSelfImprovementClosedLoopStageId | null,
    loopHealth: String(r.loop_health ?? r.loopHealth ?? 'draft'),
    stages,
    humanDecisionRequired: Boolean(r.human_decision_required ?? r.humanDecisionRequired ?? false),
    canActivate: Boolean(r.can_activate ?? r.canActivate ?? false),
    canOpenObra: Boolean(r.can_open_obra ?? r.canOpenObra ?? false),
    canMeasureDelta: Boolean(r.can_measure_delta ?? r.canMeasureDelta ?? false),
    canRecordLearning: Boolean(r.can_record_learning ?? r.canRecordLearning ?? false),
    beforeSnapshot: (r.before_snapshot ?? r.beforeSnapshot) && typeof (r.before_snapshot ?? r.beforeSnapshot) === 'object'
      ? ((r.before_snapshot ?? r.beforeSnapshot) as Record<string, unknown>)
      : null,
    afterSnapshot: afterRaw && typeof afterRaw === 'object'
      ? {
          hash: nullableString(afterRaw.hash),
          recordedAt: nullableString(afterRaw.recorded_at ?? afterRaw.recordedAt),
        }
      : null,
    deltaScorecard: (r.delta_scorecard ?? r.deltaScorecard) && typeof (r.delta_scorecard ?? r.deltaScorecard) === 'object'
      ? ((r.delta_scorecard ?? r.deltaScorecard) as Record<string, unknown>)
      : null,
    trustUpdate: trustRaw && typeof trustRaw === 'object'
      ? {
          outcomeRecorded: nullableString(trustRaw.outcome_recorded ?? trustRaw.outcomeRecorded),
          trustDelta: Number(trustRaw.trust_delta ?? trustRaw.trustDelta ?? 0),
          currentBand: String(trustRaw.current_band ?? trustRaw.currentBand ?? 'insufficient_data'),
        }
      : null,
    learningPacket: adaptSelfImprovementLearningPacket(r.learning_packet ?? r.learningPacket),
    evidenceSummary: evidenceRaw && typeof evidenceRaw === 'object'
      ? {
          evidenceRefCount: Number(evidenceRaw.evidence_ref_count ?? evidenceRaw.evidenceRefCount ?? 0),
          evidenceRefs: normList(evidenceRaw.evidence_refs ?? evidenceRaw.evidenceRefs),
        }
      : null,
    reviewSummary: reviewRaw && typeof reviewRaw === 'object'
      ? {
          activationApprovalPresent: Boolean(reviewRaw.activation_approval_present ?? reviewRaw.activationApprovalPresent ?? false),
          activationReviewer: nullableString(reviewRaw.activation_reviewer ?? reviewRaw.activationReviewer),
          resultEntryReviewer: nullableString(reviewRaw.result_entry_reviewer ?? reviewRaw.resultEntryReviewer),
          resultEntryGrade: nullableString(reviewRaw.result_entry_grade ?? reviewRaw.resultEntryGrade),
        }
      : null,
    nextCycleRecommendation: adaptSelfImprovementNextCycleRecommendation(r.next_cycle_recommendation ?? r.nextCycleRecommendation),
    nextSafeAction: String(r.next_safe_action ?? r.nextSafeAction ?? ''),
    blockers: normList(r.blockers),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    autoFastPathExecuted: Boolean(r.auto_fast_path_executed ?? r.autoFastPathExecuted ?? false),
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    externalRivalsSeparated: Boolean(r.external_rivals_separated ?? r.externalRivalsSeparated ?? true),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
    isReadModel: Boolean(r.is_read_model ?? r.isReadModel ?? true),
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

function adaptObraSelfImprovementOrigin(raw: unknown): import('@atlas/domain').AtlasCodeObraSelfImprovementOrigin | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const actionRaw = (r.measure_result_action ?? r.measureResultAction ?? {}) as Record<string, unknown>
  return {
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? 'atlas.code.obra_command_center_self_improvement_origin.v1'),
    proposalId: nullableString(r.proposal_id ?? r.proposalId),
    activationId: nullableString(r.activation_id ?? r.activationId),
    beforeSnapshotHash: nullableString(r.before_snapshot_hash ?? r.beforeSnapshotHash),
    targetCapability: nullableString(r.target_capability ?? r.targetCapability),
    expectedPowerGain: nullableString(r.expected_power_gain ?? r.expectedPowerGain),
    strategyBucket: nullableString(r.strategy_bucket ?? r.strategyBucket),
    reviewer: nullableString(r.reviewer),
    approvedAt: nullableString(r.approved_at ?? r.approvedAt),
    resultEntryId: nullableString(r.result_entry_id ?? r.resultEntryId),
    deltaGrade: nullableString(r.delta_grade ?? r.deltaGrade),
    humanMessage: String(r.human_message ?? r.humanMessage ?? ''),
    measureResultAction: {
      enabled: Boolean(actionRaw.enabled ?? false),
      label: String(actionRaw.label ?? 'Medir resultado'),
      commandHint: String(actionRaw.command_hint ?? actionRaw.commandHint ?? ''),
    },
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    autoFastPathExecuted: Boolean(r.auto_fast_path_executed ?? r.autoFastPathExecuted ?? false),
    completionClaimPromoted: Boolean(r.completion_claim_promoted ?? r.completionClaimPromoted ?? false),
    separatedFrom: String(r.separated_from ?? r.separatedFrom ?? 'external_rivals_certification'),
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
    selfImprovementOrigin: adaptObraSelfImprovementOrigin(r.self_improvement_origin ?? r.selfImprovementOrigin),
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

// ──────────────────────────────────────────────────────────────────────────
// Atlas Self-Construction OS · Agent Control Plane adapter (read-only)
//
// Tolerant by design: every sub-section is optional, every field is nullable.
// The desktop renders honest empty states for whatever the backend has not
// yet exposed. Snake_case wire keys + camelCase fallbacks both accepted.

function nullableBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function adaptSelfConstructionSection<T extends Record<string, unknown>>(
  raw: unknown,
): { record: Record<string, unknown>; meta: { status: string | null; schemaVersion: string | null; generatedAt: string | null; blockers: string[]; warnings: string[]; note: string | null } } | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as T
  return {
    record,
    meta: {
      status: nullableString(record.status ?? record.result),
      schemaVersion: nullableString(record.schema_version ?? record.schemaVersion),
      generatedAt: nullableString(record.generated_at ?? record.generatedAt ?? record.recorded_at ?? record.recordedAt),
      blockers: normList(record.blockers),
      warnings: normList(record.warnings),
      note: nullableString(record.note),
    },
  }
}

function adaptSelfConstructionControlPlane(raw: unknown): AtlasSelfConstructionControlPlaneStatus | null {
  const s = adaptSelfConstructionSection(raw)
  if (!s) return null
  const r = s.record
  return {
    ...s.meta,
    agentControlPlaneReady: nullableBoolean(r.agent_control_plane_ready ?? r.agentControlPlaneReady),
    postStartLiveness: nullableBoolean(r.post_start_liveness ?? r.postStartLiveness),
    postStartDispatchRelease: nullableBoolean(r.post_start_dispatch_release ?? r.postStartDispatchRelease),
    signedDispatchAuthorization: nullableBoolean(r.signed_dispatch_authorization ?? r.signedDispatchAuthorization),
    currentPointer: nullableString(r.current_pointer ?? r.currentPointer),
    nextBuildSlices: normList(r.next_build_slices ?? r.nextBuildSlices),
    notYetRuntimeCapable: normList(r.not_yet_runtime_capable ?? r.notYetRuntimeCapable),
  }
}

function adaptSelfConstructionChainIntegrity(raw: unknown): AtlasSelfConstructionChainIntegrityStatus | null {
  const s = adaptSelfConstructionSection(raw)
  if (!s) return null
  const r = s.record
  return {
    ...s.meta,
    chainIntegrityHash: nullableString(r.chain_integrity_hash ?? r.chainIntegrityHash),
    runtimeSafetyAllFalse: nullableBoolean(r.runtime_safety_all_false ?? r.runtimeSafetyAllFalse),
    violationCount: numberOrNull(r.violation_count ?? r.violationCount),
    warningCount: numberOrNull(r.warning_count ?? r.warningCount),
    alignedWithPointer: nullableBoolean(r.aligned_with_pointer ?? r.alignedWithPointer),
    schedulerInvokerCount: numberOrNull(r.scheduler_invoker_count ?? r.schedulerInvokerCount),
  }
}

function adaptSelfConstructionDeterministicReplay(raw: unknown): AtlasSelfConstructionDeterministicReplayStatus | null {
  const s = adaptSelfConstructionSection(raw)
  if (!s) return null
  const r = s.record
  return {
    ...s.meta,
    replayHash: nullableString(r.replay_hash ?? r.replayHash),
    deterministicReplayHash: nullableString(r.deterministic_replay_hash ?? r.deterministicReplayHash),
    proofBundleHash: nullableString(r.proof_bundle_hash ?? r.proofBundleHash),
    currentPointer: nullableString(r.current_pointer ?? r.currentPointer),
    runtimeSafetyAllFalse: nullableBoolean(r.runtime_safety_all_false ?? r.runtimeSafetyAllFalse),
    violationCount: numberOrNull(r.violation_count ?? r.violationCount),
    warningCount: numberOrNull(r.warning_count ?? r.warningCount),
  }
}

function adaptSelfConstructionReplaySnapshotEntry(raw: unknown): AtlasSelfConstructionReplaySnapshotEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = nullableString(r.snapshot_id ?? r.snapshotId)
  if (!id) return null
  return {
    snapshotId: id,
    label: nullableString(r.label),
    createdAt: nullableString(r.created_at ?? r.createdAt),
    replayHash: nullableString(r.replay_hash ?? r.replayHash),
    deterministicReplayHash: nullableString(r.deterministic_replay_hash ?? r.deterministicReplayHash),
    proofBundleHash: nullableString(r.proof_bundle_hash ?? r.proofBundleHash),
    chainIntegrityHash: nullableString(r.chain_integrity_hash ?? r.chainIntegrityHash),
    currentPointer: nullableString(r.current_pointer ?? r.currentPointer),
    runtimeSafetyAllFalse: nullableBoolean(r.runtime_safety_all_false ?? r.runtimeSafetyAllFalse),
    violationCount: numberOrNull(r.violation_count ?? r.violationCount),
    warningCount: numberOrNull(r.warning_count ?? r.warningCount),
  }
}

function adaptSelfConstructionReplaySnapshot(raw: unknown): AtlasSelfConstructionReplaySnapshotStatus | null {
  const s = adaptSelfConstructionSection(raw)
  if (!s) return null
  const r = s.record
  const latestRaw = r.latest ?? r.latest_snapshot ?? r.latestSnapshot ?? null
  return {
    ...s.meta,
    latest: adaptSelfConstructionReplaySnapshotEntry(latestRaw),
    total: numberOrNull(r.total ?? r.count),
    capacity: numberOrNull(r.capacity),
    storagePrefix: nullableString(r.storage_prefix ?? r.storagePrefix),
  }
}

function adaptSelfConstructionReplayDiff(raw: unknown): AtlasSelfConstructionReplayDiffStatus | null {
  const s = adaptSelfConstructionSection(raw)
  if (!s) return null
  const r = s.record
  return {
    ...s.meta,
    beforeSnapshotId: nullableString(r.before_snapshot_id ?? r.beforeSnapshotId),
    afterSnapshotId: nullableString(r.after_snapshot_id ?? r.afterSnapshotId),
    result: nullableString(r.result),
    regressionCount: numberOrNull(r.regression_count ?? r.regressionCount),
    newViolationCount: numberOrNull(r.new_violation_count ?? r.newViolationCount),
    newWarningCount: numberOrNull(r.new_warning_count ?? r.newWarningCount),
    diffHash: nullableString(r.diff_hash ?? r.diffHash),
  }
}

function adaptSelfConstructionPromotionGate(raw: unknown): AtlasSelfConstructionPromotionGateStatus | null {
  const s = adaptSelfConstructionSection(raw)
  if (!s) return null
  const r = s.record
  return {
    ...s.meta,
    gateHash: nullableString(r.gate_hash ?? r.gateHash),
    result: nullableString(r.result),
    beforeSnapshotId: nullableString(r.before_snapshot_id ?? r.beforeSnapshotId),
    afterSnapshotId: nullableString(r.after_snapshot_id ?? r.afterSnapshotId),
    requireNoViolations: nullableBoolean(r.require_no_violations ?? r.requireNoViolations),
    requireRuntimeSafetyAllFalse: nullableBoolean(r.require_runtime_safety_all_false ?? r.requireRuntimeSafetyAllFalse),
    requireNoRegressions: nullableBoolean(r.require_no_regressions ?? r.requireNoRegressions),
    docsHealthStatus: nullableString(r.docs_health_status ?? r.docsHealthStatus),
    architectureValidateStatus: nullableString(r.architecture_validate_status ?? r.architectureValidateStatus),
    commandRequired: normList(r.command_required ?? r.commandRequired),
    nextAction: nullableString(r.next_action ?? r.nextAction),
  }
}

function adaptSelfConstructionCertificationWorkbench(raw: unknown): AtlasSelfConstructionCertificationWorkbenchStatus | null {
  const s = adaptSelfConstructionSection(raw)
  if (!s) return null
  const r = s.record
  return {
    ...s.meta,
    workbenchHash: nullableString(r.workbench_hash ?? r.workbenchHash),
    certificationCount: numberOrNull(r.certification_count ?? r.certificationCount),
    passedCount: numberOrNull(r.passed_count ?? r.passedCount),
    blockedCount: numberOrNull(r.blocked_count ?? r.blockedCount),
    warningCount: numberOrNull(r.warning_count ?? r.warningCount),
    coverageRatio: numberOrNull(r.coverage_ratio ?? r.coverageRatio),
    baselineId: nullableString(r.baseline_id ?? r.baselineId),
  }
}

function adaptSelfConstructionObservatory(raw: unknown): AtlasSelfConstructionObservatoryStatus | null {
  const s = adaptSelfConstructionSection(raw)
  if (!s) return null
  const r = s.record
  return {
    ...s.meta,
    observatoryHash: nullableString(r.observatory_hash ?? r.observatoryHash),
    driftDetected: nullableBoolean(r.drift_detected ?? r.driftDetected),
    mutationGuardStatus: nullableString(r.mutation_guard_status ?? r.mutationGuardStatus),
    scenarioCorpusStatus: nullableString(r.scenario_corpus_status ?? r.scenarioCorpusStatus),
    fuzzHarnessStatus: nullableString(r.fuzz_harness_status ?? r.fuzzHarnessStatus),
    lastObservedAt: nullableString(r.last_observed_at ?? r.lastObservedAt),
  }
}

function adaptSelfConstructionRuntimePilot(raw: unknown): AtlasSelfConstructionRuntimePilotStatus | null {
  const s = adaptSelfConstructionSection(raw)
  if (!s) return null
  const r = s.record
  return {
    ...s.meta,
    dryRunStatus: nullableString(r.dry_run_status ?? r.dryRunStatus),
    pilotHash: nullableString(r.pilot_hash ?? r.pilotHash),
    pilotMode: nullableString(r.pilot_mode ?? r.pilotMode ?? r.mode),
    externalProviderCall: nullableBoolean(r.external_provider_call ?? r.externalProviderCall),
    dispatchAllowed: nullableBoolean(r.dispatch_allowed ?? r.dispatchAllowed),
    lastDryRunAt: nullableString(r.last_dry_run_at ?? r.lastDryRunAt),
  }
}

function adaptSelfConstructionReleaseDossier(raw: unknown): AtlasSelfConstructionReleaseDossierStatus | null {
  const s = adaptSelfConstructionSection(raw)
  if (!s) return null
  const r = s.record
  return {
    ...s.meta,
    dossierId: nullableString(r.dossier_id ?? r.dossierId),
    releaseDossierHash: nullableString(r.release_dossier_hash ?? r.releaseDossierHash),
    riskLevel: nullableString(r.risk_level ?? r.riskLevel),
    operatorSummary: nullableString(r.operator_summary ?? r.operatorSummary),
    evidenceCount: numberOrNull(r.evidence_count ?? r.evidenceCount),
    commandEvidenceCount: numberOrNull(r.command_evidence_count ?? r.commandEvidenceCount),
    docEvidenceCount: numberOrNull(r.doc_evidence_count ?? r.docEvidenceCount),
    testEvidenceCount: numberOrNull(r.test_evidence_count ?? r.testEvidenceCount),
  }
}

function adaptSelfConstructionProofHashes(
  raw: unknown,
  fallback: Partial<AtlasSelfConstructionProofHashes>,
): AtlasSelfConstructionProofHashes {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    chainIntegrity: nullableString(r.chain_integrity ?? r.chainIntegrity) ?? fallback.chainIntegrity ?? null,
    deterministicReplay:
      nullableString(r.deterministic_replay ?? r.deterministicReplay) ?? fallback.deterministicReplay ?? null,
    proofBundle: nullableString(r.proof_bundle ?? r.proofBundle) ?? fallback.proofBundle ?? null,
    promotionGate: nullableString(r.promotion_gate ?? r.promotionGate) ?? fallback.promotionGate ?? null,
    replayDiff: nullableString(r.replay_diff ?? r.replayDiff) ?? fallback.replayDiff ?? null,
    releaseDossier: nullableString(r.release_dossier ?? r.releaseDossier) ?? fallback.releaseDossier ?? null,
    certificationWorkbench:
      nullableString(r.certification_workbench ?? r.certificationWorkbench) ?? fallback.certificationWorkbench ?? null,
    observatory: nullableString(r.observatory) ?? fallback.observatory ?? null,
    runtimePilot: nullableString(r.runtime_pilot ?? r.runtimePilot) ?? fallback.runtimePilot ?? null,
  }
}

function adaptAtlasSelfConstruction(
  raw: unknown,
  source: 'http' | 'tauri' | 'unavailable',
  endpoint: string | null,
): AtlasSelfConstructionSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const controlPlane = adaptSelfConstructionControlPlane(r.control_plane ?? r.controlPlane)
  const chainIntegrity = adaptSelfConstructionChainIntegrity(r.chain_integrity ?? r.chainIntegrity)
  const deterministicReplay = adaptSelfConstructionDeterministicReplay(
    r.deterministic_replay ?? r.deterministicReplay,
  )
  const replaySnapshot = adaptSelfConstructionReplaySnapshot(r.replay_snapshot ?? r.replaySnapshot)
  const replayDiff = adaptSelfConstructionReplayDiff(r.replay_diff ?? r.replayDiff)
  const promotionGate = adaptSelfConstructionPromotionGate(r.promotion_gate ?? r.promotionGate)
  const certificationWorkbench = adaptSelfConstructionCertificationWorkbench(
    r.certification_workbench ?? r.certificationWorkbench,
  )
  const observatory = adaptSelfConstructionObservatory(r.observatory)
  const runtimePilot = adaptSelfConstructionRuntimePilot(r.runtime_pilot ?? r.runtimePilot)
  const releaseDossier = adaptSelfConstructionReleaseDossier(r.release_dossier ?? r.releaseDossier)

  const fallbackHashes: Partial<AtlasSelfConstructionProofHashes> = {
    chainIntegrity: chainIntegrity?.chainIntegrityHash ?? null,
    deterministicReplay: deterministicReplay?.deterministicReplayHash ?? null,
    proofBundle: deterministicReplay?.proofBundleHash ?? replaySnapshot?.latest?.proofBundleHash ?? null,
    promotionGate: promotionGate?.gateHash ?? null,
    replayDiff: replayDiff?.diffHash ?? null,
    releaseDossier: releaseDossier?.releaseDossierHash ?? null,
    certificationWorkbench: certificationWorkbench?.workbenchHash ?? null,
    observatory: observatory?.observatoryHash ?? null,
    runtimePilot: runtimePilot?.pilotHash ?? null,
  }

  return {
    schemaVersion: nullableString(r.schema_version ?? r.schemaVersion),
    generatedAt: nullableString(r.generated_at ?? r.generatedAt),
    source,
    endpoint,
    status: nullableString(r.status),
    controlPlane,
    chainIntegrity,
    deterministicReplay,
    replaySnapshot,
    replayDiff,
    promotionGate,
    certificationWorkbench,
    observatory,
    runtimePilot,
    releaseDossier,
    nextRequiredSlice: nullableString(r.next_required_slice ?? r.nextRequiredSlice),
    nextSafeMacroBatch: nullableString(r.next_safe_macro_batch ?? r.nextSafeMacroBatch),
    runtimeSafetyAllFalse: nullableBoolean(
      r.runtime_safety_all_false ??
        r.runtimeSafetyAllFalse ??
        chainIntegrity?.runtimeSafetyAllFalse ??
        null,
    ),
    violationCount: numberOrNull(
      r.violation_count ?? r.violationCount ?? chainIntegrity?.violationCount ?? null,
    ),
    warningCount: numberOrNull(
      r.warning_count ?? r.warningCount ?? chainIntegrity?.warningCount ?? null,
    ),
    proofHashes: adaptSelfConstructionProofHashes(r.proof_hashes ?? r.proofHashes, fallbackHashes),
    blockers: normList(r.blockers),
    warnings: normList(r.warnings),
    note: nullableString(r.note),
  }
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

// ──────────────────────────────────────────────────────────────────────────
// Provider Arena adapters · snake_case wire → camelCase domain
// Schema: atlas.code.provider_arena_snapshot.v1
//
// Honest empty-state contract: null/[] never invented. Schema mismatch ⇒
// null (the panel renders an empty state, never a fake snapshot).

function adaptProviderArenaSnapshot(raw: unknown): AtlasCodeProviderArenaSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = String(r.schema_version ?? r.schemaVersion ?? '')
  if (schema !== '' && schema !== 'atlas.code.provider_arena_snapshot.v1') return null

  const armRegistryRaw = (r.arm_registry ?? r.armRegistry ?? {}) as Record<string, unknown>
  const armsRaw = Array.isArray(armRegistryRaw.arms) ? (armRegistryRaw.arms as unknown[]) : []
  const arms = armsRaw
    .map((a) => adaptProviderArenaArm(a))
    .filter((x): x is AtlasCodeProviderArenaArm => x !== null)
  const taskCategories = Array.isArray(armRegistryRaw.task_categories ?? armRegistryRaw.taskCategories)
    ? ((armRegistryRaw.task_categories ?? armRegistryRaw.taskCategories) as unknown[]).map(String)
    : []
  const armRegistry: AtlasCodeProviderArenaArmRegistry = {
    schemaVersion: String(armRegistryRaw.schema_version ?? armRegistryRaw.schemaVersion ?? ''),
    arms,
    armCount: Number(armRegistryRaw.arm_count ?? armRegistryRaw.armCount ?? arms.length),
    taskCategories,
    taskCategoryCount: Number(
      armRegistryRaw.task_category_count ?? armRegistryRaw.taskCategoryCount ?? taskCategories.length,
    ),
  }

  const modesRaw = Array.isArray(r.modes) ? (r.modes as unknown[]) : []
  const modes: AtlasCodeProviderArenaModeEntry[] = modesRaw.map((m) => {
    const mr = (m ?? {}) as Record<string, unknown>
    return {
      mode: String(mr.mode ?? ''),
      requiresProvider: Boolean(mr.requires_provider ?? mr.requiresProvider ?? false),
      allowsAtlasDecide: Boolean(mr.allows_atlas_decide ?? mr.allowsAtlasDecide ?? false),
      allowsTopologyDeclaration: Boolean(
        mr.allows_topology_declaration ?? mr.allowsTopologyDeclaration ?? false,
      ),
      claimEligible: Boolean(mr.claim_eligible ?? mr.claimEligible ?? false),
      allowedModels: Array.isArray(mr.allowed_models ?? mr.allowedModels)
        ? ((mr.allowed_models ?? mr.allowedModels) as unknown[]).map(String)
        : [],
      note: String(mr.note ?? ''),
      usableInArena: Boolean(mr.usable_in_arena ?? mr.usableInArena ?? true),
    }
  })

  const presetsRaw = Array.isArray(r.presets) ? (r.presets as unknown[]) : []
  const presets: AtlasCodeProviderArenaPresetEntry[] = presetsRaw.map((p) => {
    const pr = (p ?? {}) as Record<string, unknown>
    return {
      preset: String(pr.preset ?? ''),
      caseCount: Number(pr.case_count ?? pr.caseCount ?? 0),
      note: String(pr.note ?? ''),
    }
  })

  const historyRaw = Array.isArray(r.history) ? (r.history as unknown[]) : []
  const history: AtlasCodeProviderArenaHistoryEntry[] = historyRaw
    .map((h) => adaptProviderArenaHistoryEntry(h))
    .filter((x): x is AtlasCodeProviderArenaHistoryEntry => x !== null)

  const safetyRaw = (r.safety_promises ?? r.safetyPromises ?? {}) as Record<string, unknown>
  const safetyPromises = {
    neverPromotesCompletionClaim: Boolean(
      safetyRaw.never_promotes_completion_claim ?? safetyRaw.neverPromotesCompletionClaim ?? true,
    ),
    neverUnlocksExternalRivalsCertification: Boolean(
      safetyRaw.never_unlocks_external_rivals_certification
      ?? safetyRaw.neverUnlocksExternalRivalsCertification
      ?? true,
    ),
    requiresThreeConfirmationsForRealProvider: Boolean(
      safetyRaw.requires_three_confirmations_for_real_provider
      ?? safetyRaw.requiresThreeConfirmationsForRealProvider
      ?? true,
    ),
    localFakeNeverInvokesProvider: Boolean(
      safetyRaw.local_fake_never_invokes_provider ?? safetyRaw.localFakeNeverInvokesProvider ?? true,
    ),
    replayRequiredBeforeWinner: Boolean(
      safetyRaw.replay_required_before_winner ?? safetyRaw.replayRequiredBeforeWinner ?? true,
    ),
    evidenceRequiredBeforeWinner: Boolean(
      safetyRaw.evidence_required_before_winner ?? safetyRaw.evidenceRequiredBeforeWinner ?? true,
    ),
  }

  const lastRunRaw = r.last_run ?? r.lastRun
  const lastRun = adaptProviderArenaHistoryEntry(lastRunRaw)

  return {
    schemaVersion: schema || 'atlas.code.provider_arena_snapshot.v1',
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
    armRegistry,
    modes,
    presets,
    history,
    historyCount: Number(r.history_count ?? r.historyCount ?? history.length),
    historyLimit: Number(r.history_limit ?? r.historyLimit ?? 10),
    lastRun,
    safetyPromises,
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    separatedFromExternalRivalsCertification: Boolean(
      r.separated_from_external_rivals_certification ?? r.separatedFromExternalRivalsCertification ?? true,
    ),
    note: String(r.note ?? ''),
  }
}

function adaptProviderArenaArm(raw: unknown): AtlasCodeProviderArenaArm | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const safetyRaw = (r.safety_contract ?? r.safetyContract ?? {}) as Record<string, unknown>
  return {
    armId: String(r.arm_id ?? r.armId ?? ''),
    runnerType: String(r.runner_type ?? r.runnerType ?? ''),
    provider: nullableString(r.provider),
    modelOptions: Array.isArray(r.model_options ?? r.modelOptions)
      ? ((r.model_options ?? r.modelOptions) as unknown[]).map(String)
      : [],
    executionMode: String(r.execution_mode ?? r.executionMode ?? ''),
    requiresExternalProviderCall: Boolean(
      r.requires_external_provider_call ?? r.requiresExternalProviderCall ?? false,
    ),
    requiresCostConfirmation: Boolean(
      r.requires_cost_confirmation ?? r.requiresCostConfirmation ?? false,
    ),
    supportsStreaming: Boolean(r.supports_streaming ?? r.supportsStreaming ?? false),
    supportsReplay: Boolean(r.supports_replay ?? r.supportsReplay ?? false),
    supportsPatchDiff: Boolean(r.supports_patch_diff ?? r.supportsPatchDiff ?? false),
    supportsTestLog: Boolean(r.supports_test_log ?? r.supportsTestLog ?? false),
    allowedTaskCategories: Array.isArray(r.allowed_task_categories ?? r.allowedTaskCategories)
      ? ((r.allowed_task_categories ?? r.allowedTaskCategories) as unknown[]).map(String)
      : [],
    status: String(r.status ?? 'placeholder'),
    notExecutableReason: nullableString(r.not_executable_reason ?? r.notExecutableReason),
    humanLabel: String(r.human_label ?? r.humanLabel ?? r.arm_id ?? ''),
    humanDescription: String(r.human_description ?? r.humanDescription ?? ''),
    safetyContract: {
      neverPromotesCompletionClaim: Boolean(
        safetyRaw.never_promotes_completion_claim ?? safetyRaw.neverPromotesCompletionClaim ?? true,
      ),
      neverUnlocksExternalRivalsCertification: Boolean(
        safetyRaw.never_unlocks_external_rivals_certification
        ?? safetyRaw.neverUnlocksExternalRivalsCertification
        ?? true,
      ),
      requiresThreeConfirmationsForRealProvider: Boolean(
        safetyRaw.requires_three_confirmations_for_real_provider
        ?? safetyRaw.requiresThreeConfirmationsForRealProvider
        ?? false,
      ),
      maxScoreWithoutEvidence: Number(
        safetyRaw.max_score_without_evidence ?? safetyRaw.maxScoreWithoutEvidence ?? 0,
      ),
      failsClosedOnMissingDriver: Boolean(
        safetyRaw.fails_closed_on_missing_driver ?? safetyRaw.failsClosedOnMissingDriver ?? true,
      ),
      auditTrailRequired: Boolean(
        safetyRaw.audit_trail_required ?? safetyRaw.auditTrailRequired ?? true,
      ),
      replayRequiredBeforeWinner: Boolean(
        safetyRaw.replay_required_before_winner ?? safetyRaw.replayRequiredBeforeWinner ?? true,
      ),
      evidenceRequiredBeforeWinner: Boolean(
        safetyRaw.evidence_required_before_winner ?? safetyRaw.evidenceRequiredBeforeWinner ?? true,
      ),
      scriptedOrManualCannotForgeScore: Boolean(
        safetyRaw.scripted_or_manual_cannot_forge_score
        ?? safetyRaw.scriptedOrManualCannotForgeScore
        ?? false,
      ),
      placeholderBlocksRealRun: Boolean(
        safetyRaw.placeholder_blocks_real_run ?? safetyRaw.placeholderBlocksRealRun ?? false,
      ),
    },
  }
}

function adaptProviderArenaHistoryEntry(raw: unknown): AtlasCodeProviderArenaHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!r.run_id && !r.runId) return null
  return {
    runId: String(r.run_id ?? r.runId ?? ''),
    basePath: String(r.base_path ?? r.basePath ?? ''),
    updatedAtUnix: Number(r.updated_at_unix ?? r.updatedAtUnix ?? 0),
    mode: nullableString(r.mode),
    preset: nullableString(r.preset),
    taskCategory: nullableString(r.task_category ?? r.taskCategory),
    armA: adaptProviderArenaHistoryArm(r.arm_a ?? r.armA),
    armB: adaptProviderArenaHistoryArm(r.arm_b ?? r.armB),
    winner: nullableString(r.winner),
    verdict: nullableString(r.verdict),
    claimReady: r.claim_ready == null && r.claimReady == null ? null : Boolean(r.claim_ready ?? r.claimReady),
    comparableScore: numberOrNull(r.comparable_score ?? r.comparableScore),
    diagnosticScore: numberOrNull(r.diagnostic_score ?? r.diagnosticScore),
    reportMdPresent: Boolean(r.report_md_present ?? r.reportMdPresent ?? false),
    evidenceDir: String(r.evidence_dir ?? r.evidenceDir ?? ''),
    eventsJsonl: String(r.events_jsonl ?? r.eventsJsonl ?? ''),
    externalProviderCall:
      r.external_provider_call == null && r.externalProviderCall == null
        ? null
        : Boolean(r.external_provider_call ?? r.externalProviderCall),
  }
}

function adaptProviderArenaHistoryArm(raw: unknown): AtlasCodeProviderArenaHistoryArm | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    armId: nullableString(r.arm_id ?? r.armId),
    runnerType: nullableString(r.runner_type ?? r.runnerType),
    provider: nullableString(r.provider),
    model: nullableString(r.model),
    legacyModelId: nullableString(r.legacy_model_id ?? r.legacyModelId),
    status: nullableString(r.status),
    humanLabel: nullableString(r.human_label ?? r.humanLabel),
  }
}

function adaptProviderArenaRunResult(raw: unknown): AtlasCodeProviderArenaRunResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const blockers = Array.isArray(r.blockers) ? (r.blockers as unknown[]).map(String) : []
  const evidencePaths = Array.isArray(r.evidence_paths ?? r.evidencePaths)
    ? ((r.evidence_paths ?? r.evidencePaths) as unknown[]).map(String)
    : []
  const armAValue = r.arm_a ?? r.armA
  const armBValue = r.arm_b ?? r.armB
  const armA = armAValue && typeof armAValue === 'object' ? (armAValue as Record<string, unknown>) : null
  const armB = armBValue && typeof armBValue === 'object' ? (armBValue as Record<string, unknown>) : null
  const scorecardValue = r.scorecard
  const scorecard = scorecardValue && typeof scorecardValue === 'object' ? (scorecardValue as Record<string, unknown>) : null
  return {
    status: String(r.status ?? 'blocked'),
    action: String(r.action ?? 'run-arena'),
    schemaVersion: String(r.schema_version ?? r.schemaVersion ?? ''),
    arenaSchemaVersion: nullableString(r.arena_schema_version ?? r.arenaSchemaVersion),
    generatedAt: nullableString(r.generated_at ?? r.generatedAt),
    runId: nullableString(r.run_id ?? r.runId),
    mode: nullableString(r.mode),
    taskCategory: nullableString(r.task_category ?? r.taskCategory),
    armA,
    armB,
    blockers,
    nextCommand: nullableString(r.next_command ?? r.nextCommand),
    externalProviderCall: Boolean(r.external_provider_call ?? r.externalProviderCall ?? false),
    providerTokensSpent: Boolean(r.provider_tokens_spent ?? r.providerTokensSpent ?? false),
    separatedFromExternalRivalsCertification: Boolean(
      r.separated_from_external_rivals_certification ?? r.separatedFromExternalRivalsCertification ?? true,
    ),
    evidencePaths,
    note: nullableString(r.note),
    winner: nullableString(r.winner),
    scorecard,
    requiresExternalProviderCall: Boolean(
      r.requires_external_provider_call ?? r.requiresExternalProviderCall ?? false,
    ),
    rawPayload: r,
  }
}

// Re-export type aliases mantidos para downstream consumers; evita TS6196.
export type {
  AtlasSelfImprovementClosedLoopStage,
  AtlasSelfImprovementClosedLoopStageId,
  AtlasSelfImprovementLearningPacket,
  AtlasSelfImprovementDeltaGrade,
}

// ──────────────────────────────────────────────────────────────────────────
// Interactive Observed Provider Workflow bridge.
//
// Canon: docs/engineering-knowledge-base/atlas-code-interactive-observed-provider-workflow-v1.md
//
// Wired to the same HTTP transport; Tauri parity will arrive when the Rust
// side adds bridge_observed_session_* commands. Until then, Tauri mode falls
// back to the HTTP transport when VITE_ATLAS_SERVER_URL is configured; if
// neither is configured the bridge returns null/[] honestly so the UI shows
// empty states.
import { createOperatingRoomBridge } from './operatingRoomBridge'

const operatingRoomHttpFetch = HTTP_BASE
  ? <T>(path: string, init?: { method?: string; body?: unknown }) => fetchHttp<T>(path, init)
  : null

export const operatingRoomBridge = createOperatingRoomBridge(operatingRoomHttpFetch)

// Dev-to-Forge Promotion bridge (Meta 8). HTTP transport only for v1.
import { createDevToForgeBridge } from './devToForgeBridge'

export const devToForgeBridge = createDevToForgeBridge(operatingRoomHttpFetch)

/**
 * Atlas Code · terminal launcher bridge.
 *
 * Tauri command `bridge_open_terminal_in_workspace` opens the operator's
 * native terminal application at `workspacePath` and seeds it with the
 * recommended command (typed but NOT executed; the operator confirms by
 * pressing return). In HTTP/offline mode the call returns null honestly
 * and the UI falls back to the "copy command" affordance.
 *
 * Returned schema (Tauri):
 *   { ok: boolean, platform: string, method: string,
 *     error: string | null, commandPreview: string | null }
 */
export interface OpenTerminalResult {
  ok: boolean
  platform: string
  method: string
  error: string | null
  commandPreview: string | null
}

export async function openTerminalInWorkspace(
  workspacePath: string,
  command?: string | null
): Promise<OpenTerminalResult | null> {
  if (MODE !== 'tauri') return null
  try {
    const tauri = await import('@tauri-apps/api/core')
    const raw = await tauri.invoke<unknown>('bridge_open_terminal_in_workspace', {
      workspacePath,
      command: command ?? null,
    })
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    return {
      ok: Boolean(r.ok),
      platform: typeof r.platform === 'string' ? r.platform : 'unknown',
      method: typeof r.method === 'string' ? r.method : 'unknown',
      error: typeof r.error === 'string' ? r.error : null,
      commandPreview: typeof r.commandPreview === 'string' ? r.commandPreview : null,
    }
  } catch (e) {
    console.warn('[bridge] openTerminalInWorkspace', e)
    return null
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Atlas Vox Mac Edge (Onda 1 / Claude A)
//
// Capture-side bridge only: push-to-talk lifecycle, eclipse, status.
// STT / dictionary / transcript are owned by Claude B (see `vox_stt_*`
// Tauri commands).
//
// Events emitted by the Rust side (subscribe via @tauri-apps/api/event):
//   vox://session-started, vox://audio-capture-started,
//   vox://audio-capture-stopped, vox://session-ready-for-stt,
//   vox://session-cancelled, vox://eclipse-activated, vox://error

export type VoxSource =
  | 'desktop_overlay'
  | 'mac_edge_hotkey'
  | 'desktop_inbox_button'
  | 'desktop_workbench_button'

export type VoxMode =
  | 'dictation'
  | 'prompt_polish'
  | 'intent_compile'
  | 'governed_execute'

export type VoxSessionState =
  | 'idle'
  | 'recording'
  | 'ready_for_stt'
  | 'cancelled'
  | 'failed'

export interface VoxConsent {
  audioCapture: boolean
  contextShare: boolean
  debugKeepAudio: boolean
}

export interface VoxStartSessionRequest {
  source: VoxSource
  modeRequested: VoxMode
  language: string
  consent: VoxConsent
}

export interface VoxEdgeSession {
  sessionId: string
  startedAt: string
  source: VoxSource
  modeRequested: VoxMode
  language: string
  audioHandle: string
  rawPcmPersisted: boolean
  state: VoxSessionState
  durationMs: number
  sampleRate: number
  channels: number
}

export interface VoxEdgePermissions {
  microphone: string
  accessibility: string
  inputMonitoring: string
}

export interface VoxEdgeStatus {
  available: boolean
  captureAvailable: boolean
  hotkeyAvailable: boolean
  activeSessionId: string | null
  lastError: string | null
  permissions: VoxEdgePermissions
  eclipseActive: boolean
  defaultHotkey: string
  pendingCapabilities: string[]
}

export interface VoxEclipseReport {
  touchedSessions: number
}

export class VoxBridgeUnavailable extends Error {
  constructor() {
    super('Vox Mac Edge requires the desktop binary (Tauri runtime)')
    this.name = 'VoxBridgeUnavailable'
  }
}

async function voxInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (MODE !== 'tauri') throw new VoxBridgeUnavailable()
  const tauri = await import('@tauri-apps/api/core')
  return tauri.invoke<T>(cmd, args)
}

/**
 * V6-A · Atlas Vox Ambient Launch. Lê (e consome) o sinal de boot que o
 * processo Tauri detectou (`--vox-start-listening` na linha de comando ou
 * `ATLAS_VOX_START_LISTENING=1` no env). É single-shot: a próxima chamada
 * sempre devolve `startListening=false` mesmo que o webview faça reload.
 *
 * Quando o app está rodando no navegador / sem Tauri, devolve um snapshot
 * idle honesto em vez de quebrar. O overlay nunca dispara gravação a partir
 * de um payload inventado — só quando Rust confirma o sinal.
 */
export interface VoxAmbientLaunchSnapshot {
  schema: 'atlas.vox.ambient_launch.v1'
  startListening: boolean
  /** `none` quando nada pediu; `cli`/`env`/`cli_and_env` quando pediu. */
  source: 'none' | 'cli' | 'env' | 'cli_and_env'
}

export async function voxAmbientConsumePendingLaunch(): Promise<VoxAmbientLaunchSnapshot> {
  const idle: VoxAmbientLaunchSnapshot = {
    schema: 'atlas.vox.ambient_launch.v1',
    startListening: false,
    source: 'none',
  }
  if (MODE !== 'tauri') return idle
  try {
    const raw = await voxInvoke<unknown>('vox_ambient_consume_pending_launch')
    if (!raw || typeof raw !== 'object') return idle
    const r = raw as Record<string, unknown>
    const start = r.startListening === true
    const sourceRaw = (r.source ?? 'none') as unknown
    const source: VoxAmbientLaunchSnapshot['source'] =
      sourceRaw === 'cli' || sourceRaw === 'env' || sourceRaw === 'cli_and_env'
        ? sourceRaw
        : 'none'
    return {
      schema: 'atlas.vox.ambient_launch.v1',
      startListening: start,
      source,
    }
  } catch (e) {
    console.warn('[bridge] voxAmbientConsumePendingLaunch', e)
    return idle
  }
}

export async function voxEdgeStatus(): Promise<VoxEdgeStatus | null> {
  if (MODE !== 'tauri') return null
  try {
    return await voxInvoke<VoxEdgeStatus>('vox_edge_status')
  } catch (e) {
    console.warn('[bridge] voxEdgeStatus', e)
    return null
  }
}

export interface VoxAudioLevel {
  sessionId: string
  durationMs: number
  sampleCount: number
  recentSampleCount: number
  rms: number
  peak: number
}

export async function voxEdgeAudioLevel(sessionId: string): Promise<VoxAudioLevel | null> {
  if (MODE !== 'tauri') return null
  try {
    return await voxInvoke<VoxAudioLevel | null>('vox_edge_audio_level', { sessionId })
  } catch (e) {
    console.warn('[bridge] voxEdgeAudioLevel', e)
    return null
  }
}

export async function voxEdgeStartSession(
  request: VoxStartSessionRequest
): Promise<VoxEdgeSession> {
  return voxInvoke<VoxEdgeSession>('vox_edge_start_session', { request })
}

export async function voxEdgeFinishSession(
  sessionId: string
): Promise<VoxEdgeSession> {
  return voxInvoke<VoxEdgeSession>('vox_edge_finish_session', { sessionId })
}

export async function voxEdgeCancelSession(
  sessionId: string
): Promise<VoxEdgeSession> {
  return voxInvoke<VoxEdgeSession>('vox_edge_cancel_session', { sessionId })
}

export async function voxEdgeEclipse(): Promise<VoxEclipseReport> {
  return voxInvoke<VoxEclipseReport>('vox_edge_eclipse')
}

// ──────────────────────────────────────────────────────────────────────────
// Atlas Vox · STT + personal dictionary (Onda 1 / Claude B)
//
// Tauri commands registered by atlas-tauri:
//   vox_stt_status, vox_dictionary_get, vox_dictionary_update,
//   vox_stt_transcribe_debug_text.
// Engine is whisper.cpp@large-v3 as the default; the real binding lands in a
// follow-up wave. Until then, status is honest: engineAvailable=false and a
// structured nextAction tells the operator what to do.

export interface VoxModelNextAction {
  code: string
  message: string
}

export interface VoxModelStatus {
  modelId: string
  modelFilename: string
  modelsDir: string
  modelPath: string
  modelFound: boolean
  engineAvailable: boolean
  nextAction: VoxModelNextAction | null
}

export interface VoxDictionaryEntry {
  phrase: string
  variants: string[]
  preferred: string
}

export interface VoxPersonalDictionary {
  schema_version: string
  version: number
  language: string
  accent_hint: string
  entries: VoxDictionaryEntry[]
  updated_at: string
}

export interface VoxWordToken {
  w: string
  tStart: number
  tEnd: number
  conf: number
}

export interface VoxPostCorrection {
  from: string
  to: string
  rule: string
}

export interface VoxLatencyMs {
  captureToSttStart: number
  sttProcessing: number
  correctionPass: number
  total: number
}

export type VoxEclipseCheck = 'passed' | 'aborted_mid_capture'

export interface VoxTranscript {
  schema: string
  sessionId: string
  transcriptId: string
  audioHandle: string
  language: string
  engine: string
  engineInvocationId: string
  text: string
  textRaw: string
  confidence: number
  words: VoxWordToken[]
  personalDictionaryApplied: string[]
  postCorrections: VoxPostCorrection[]
  latencyMs: VoxLatencyMs
  rawPcmPersisted: boolean
  eclipseCheck: VoxEclipseCheck
  noiseSignals?: {
    silenceRatio: number
    snrEstimateDb: number
    vadSegments: number
  } | null
  createdAt: string
}

export interface VoxDebugTranscribeResponse {
  transcript: VoxTranscript
  note: string
}

export async function voxSttStatus(): Promise<VoxModelStatus | null> {
  if (MODE !== 'tauri') return null
  try {
    return await voxInvoke<VoxModelStatus>('vox_stt_status')
  } catch (e) {
    console.warn('[bridge] voxSttStatus', e)
    return null
  }
}

// Wave 6.5 / Wave 7.8 — global hotkey runtime status. Tauri-only.
// Returns `null` when the command isn't registered or the runtime hasn't
// been installed yet (honest non-signal; readiness panel decides how to
// surface that).
//
// The richer runtime shape lives in `voxReadiness.ts` as
// `VoxHotkeyRuntimeStatus` so it doesn't collide with the existing
// banner-level `VoxHotkeyStatus` type used by VoxOverlay below.

import type {
  VoxHotkeyRuntimeStatus,
  VoxKernelHealthOutcome,
  VoxReadinessProbes,
  VoxReadinessSummary,
} from './voxReadiness'
import { adaptVoxKernelHealth, aggregate as aggregateReadiness } from './voxReadiness'

export type { VoxHotkeyRuntimeStatus } from './voxReadiness'

export async function voxHotkeyRuntimeStatus(): Promise<{
  status: VoxHotkeyRuntimeStatus | null
  probeFailed: boolean
}> {
  if (MODE !== 'tauri') return { status: null, probeFailed: false }
  try {
    const status = await voxInvoke<VoxHotkeyRuntimeStatus>('vox_hotkey_status')
    return { status, probeFailed: false }
  } catch (e) {
    // Distinguish "command not registered" (older Tauri build) from a
    // real probe failure — both end up `null` but only the latter sets
    // `probeFailed=true` so the panel can show an `unavailable` item
    // honestly.
    console.warn('[bridge] voxHotkeyRuntimeStatus', e)
    return { status: null, probeFailed: true }
  }
}

// Wave 7.8 — read-only health probe for `/ai/vox/health`. Falls back to a
// structured `kernel_url_missing` outcome when the http base is empty;
// never throws to the readiness aggregator.

export async function voxKernelHealth(): Promise<VoxKernelHealthOutcome> {
  if (!HTTP_BASE && MODE !== 'http') {
    return {
      ok: false,
      reason: 'kernel_url_missing',
      detail: 'VITE_ATLAS_SERVER_URL não configurado.',
    }
  }
  try {
    const raw = await fetchHttp<unknown>('/ai/vox/health')
    const health = adaptVoxKernelHealth(raw)
    if (!health) {
      return {
        ok: false,
        reason: 'shape_invalid',
        detail: 'Resposta de /ai/vox/health vazia ou em formato inesperado.',
      }
    }
    return { ok: true, health }
  } catch (e) {
    return {
      ok: false,
      reason: 'fetch_failed',
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Wave 7.9 · Setup Assistant — opens a specific macOS System Settings
 * pane via the allowlisted Tauri command. The allowlist lives in Rust;
 * here we just expose a thin typed wrapper. Honest non-signal when
 * running outside Tauri or outside macOS.
 */
export type VoxSystemSettingsTarget = 'microphone' | 'accessibility' | 'input_monitoring'

export interface VoxSystemSettingsResult {
  ok: boolean
  target: string
  url: string | null
  platform: string
  reason: string | null
}

export async function voxOpenSystemSettings(
  target: VoxSystemSettingsTarget,
): Promise<VoxSystemSettingsResult> {
  if (MODE !== 'tauri') {
    return {
      ok: false,
      target,
      url: null,
      platform: 'browser',
      reason: 'tauri_required',
    }
  }
  try {
    return await voxInvoke<VoxSystemSettingsResult>('vox_open_system_settings', {
      target,
    })
  } catch (e) {
    return {
      ok: false,
      target,
      url: null,
      platform: 'unknown',
      reason: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Wave 7.8 · First-run readiness aggregator. Composes the existing Vox
 * probes (edge + STT + hotkey + kernel health) into a single deterministic
 * snapshot for the overlay's Readiness panel. Never invokes audio, never
 * runs a session, never persists anything.
 */
export async function voxReadinessGet(): Promise<VoxReadinessSummary> {
  const [edge, stt, hotkey, kernel] = await Promise.all([
    voxEdgeStatus(),
    voxSttStatus(),
    voxHotkeyRuntimeStatus(),
    voxKernelHealth(),
  ])
  const probes: VoxReadinessProbes = {
    bridgeMode: MODE as 'tauri' | 'http' | 'offline',
    edge,
    stt,
    hotkey: hotkey.status,
    hotkeyProbeFailed: hotkey.probeFailed,
    kernel,
  }
  return aggregateReadiness(probes)
}

export async function voxDictionaryGet(): Promise<VoxPersonalDictionary | null> {
  if (MODE !== 'tauri') return null
  try {
    return await voxInvoke<VoxPersonalDictionary>('vox_dictionary_get')
  } catch (e) {
    console.warn('[bridge] voxDictionaryGet', e)
    return null
  }
}

export async function voxDictionaryUpdate(
  next: VoxPersonalDictionary
): Promise<VoxPersonalDictionary> {
  return voxInvoke<VoxPersonalDictionary>('vox_dictionary_update', { next })
}

// ──────────────────────────────────────────────────────────────────────────
// V6 · Reply Surface · settings + premium speech gate
//
// Persistido em `~/.atlas/vox/settings.json` (atlas.vox.settings.v1). O
// overlay lê com `voxSettingsGet`, atualiza com `voxSettingsUpdate`, e
// dispara fala com `voxSpeakShort(phraseKey)`. A whitelist canônica de
// 4 frases vive no Rust — payload daqui NUNCA injeta texto cru.
// ──────────────────────────────────────────────────────────────────────────

export type VoxVoiceMode = 'off' | 'short'

export interface VoxSettings {
  schemaVersion: string
  settingsVersion: string
  voiceMode: VoxVoiceMode
  voiceCooldownMs: number
  updatedAt: string
}

/** Keys aceitas pelo `vox_speak_short`. Espelha exatamente
 * `VoxShortPhrase::key()` no Rust. Qualquer key fora desta lista é
 * rejeitada com `phrase_not_in_whitelist`. */
export type VoxShortPhraseKey =
  | 'understood'
  | 'need_detail'
  | 'blocked_safety'
  | 'prompt_ready'

export interface VoxSpeakResult {
  ok: boolean
  spoken: boolean
  phraseKey: string
  phraseText: string | null
  platform: string
  voiceMode: string
  reason: string | null
  cooldownRemainingMs: number | null
}

const VOX_VOICE_MODE_VALUES: readonly VoxVoiceMode[] = ['off', 'short']

function parseVoxVoiceMode(raw: unknown): VoxVoiceMode {
  if (typeof raw === 'string' && (VOX_VOICE_MODE_VALUES as readonly string[]).includes(raw)) {
    return raw as VoxVoiceMode
  }
  return 'off'
}

function defaultVoxSettings(): VoxSettings {
  return {
    schemaVersion: 'atlas.vox.settings.v1',
    settingsVersion: '0.1.0',
    voiceMode: 'off',
    voiceCooldownMs: 5_000,
    updatedAt: '',
  }
}

function normaliseVoxSettings(raw: unknown): VoxSettings {
  if (!raw || typeof raw !== 'object') return defaultVoxSettings()
  const r = raw as Record<string, unknown>
  const schemaVersion =
    typeof r.schema_version === 'string'
      ? r.schema_version
      : typeof r.schemaVersion === 'string'
        ? r.schemaVersion
        : 'atlas.vox.settings.v1'
  const settingsVersion =
    typeof r.settings_version === 'string'
      ? r.settings_version
      : typeof r.settingsVersion === 'string'
        ? r.settingsVersion
        : '0.1.0'
  const voiceMode = parseVoxVoiceMode(r.voice_mode ?? r.voiceMode)
  const voiceCooldownRaw = r.voice_cooldown_ms ?? r.voiceCooldownMs
  const voiceCooldownMs =
    typeof voiceCooldownRaw === 'number' && Number.isFinite(voiceCooldownRaw)
      ? Math.max(1_000, Math.min(60_000, Math.floor(voiceCooldownRaw)))
      : 5_000
  const updatedAt =
    typeof r.updated_at === 'string'
      ? r.updated_at
      : typeof r.updatedAt === 'string'
        ? r.updatedAt
        : ''
  return { schemaVersion, settingsVersion, voiceMode, voiceCooldownMs, updatedAt }
}

/** Carrega settings local. Fora do runtime Tauri (browser dev) devolve
 * default conservador (voz desligada) — o overlay só persiste/escreve em
 * Tauri. */
export async function voxSettingsGet(): Promise<VoxSettings> {
  if (MODE !== 'tauri') return defaultVoxSettings()
  try {
    const raw = await voxInvoke<unknown>('vox_settings_get')
    return normaliseVoxSettings(raw)
  } catch (e) {
    console.warn('[bridge] voxSettingsGet', e)
    return defaultVoxSettings()
  }
}

/** Atualiza `voice_mode` no disco. Devolve a settings persistida. */
export async function voxSettingsUpdate(voiceMode: VoxVoiceMode): Promise<VoxSettings> {
  if (MODE !== 'tauri') {
    // dev/browser: devolve default sem persistir (não temos onde gravar).
    return { ...defaultVoxSettings(), voiceMode }
  }
  if (!(VOX_VOICE_MODE_VALUES as readonly string[]).includes(voiceMode)) {
    throw new Error(`voxSettingsUpdate: voice_mode inválido: ${voiceMode}`)
  }
  const raw = await voxInvoke<unknown>('vox_settings_update', { voiceMode })
  return normaliseVoxSettings(raw)
}

function normaliseVoxSpeakResult(raw: unknown): VoxSpeakResult {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    ok: r.ok === true,
    spoken: r.spoken === true,
    phraseKey: typeof r.phraseKey === 'string'
      ? r.phraseKey
      : typeof r.phrase_key === 'string' ? (r.phrase_key as string) : '',
    phraseText:
      typeof r.phraseText === 'string'
        ? r.phraseText
        : typeof r.phrase_text === 'string'
          ? (r.phrase_text as string)
          : null,
    platform: typeof r.platform === 'string' ? r.platform : 'unknown',
    voiceMode: typeof r.voiceMode === 'string'
      ? r.voiceMode
      : typeof r.voice_mode === 'string' ? (r.voice_mode as string) : 'unknown',
    reason:
      typeof r.reason === 'string' ? r.reason : null,
    cooldownRemainingMs:
      typeof r.cooldownRemainingMs === 'number'
        ? r.cooldownRemainingMs
        : typeof r.cooldown_remaining_ms === 'number'
          ? (r.cooldown_remaining_ms as number)
          : null,
  }
}

/** Solicita fala curta. Whitelist canônica:
 *   - `understood`     → "Entendi."
 *   - `need_detail`    → "Preciso de um detalhe."
 *   - `blocked_safety` → "Bloqueei por segurança."
 *   - `prompt_ready`   → "Prompt pronto."
 *
 * NUNCA falha o fluxo do overlay: indisponibilidade de TTS vira `{ok:false, spoken:false}`.
 * Cooldown global é gerido no Rust — não precisa debounce no frontend. */
export async function voxSpeakShort(phraseKey: VoxShortPhraseKey): Promise<VoxSpeakResult> {
  if (MODE !== 'tauri') {
    return {
      ok: false,
      spoken: false,
      phraseKey,
      phraseText: null,
      platform: 'browser',
      voiceMode: 'off',
      reason: 'tauri_unavailable',
      cooldownRemainingMs: null,
    }
  }
  try {
    const raw = await voxInvoke<unknown>('vox_speak_short', { phraseKey })
    return normaliseVoxSpeakResult(raw)
  } catch (e) {
    console.warn('[bridge] voxSpeakShort', e)
    return {
      ok: false,
      spoken: false,
      phraseKey,
      phraseText: null,
      platform: 'unknown',
      voiceMode: 'off',
      reason: e instanceof Error ? e.message : String(e),
      cooldownRemainingMs: null,
    }
  }
}

/** Mapeia estado V5/V4 do overlay para a frase curta canônica que faz
 * sentido falar/exibir naquele momento. Devolve `null` em estados onde
 * NÃO deve haver fala (opinião pura, transitório, sem produto entregue).
 *
 * Regras:
 *   - intervention=disagree blocking          → 'blocked_safety'
 *   - intervention=clarify                    → 'need_detail'
 *   - sem intervenção + compiled_prompt pronto (intent_compile/prompt_polish) → 'prompt_ready'
 *   - sem intervenção + dictation/governed sem prompt → 'understood'
 *   - qualquer outro estado                   → null  (não fala)
 */
export function voxReplyPhraseForState(input: {
  intervention: VoxInterlocutorIntervention | null
  blocking: boolean
  mode: VoxMode | null
  hasCompiledPrompt: boolean
}): VoxShortPhraseKey | null {
  if (input.intervention === 'disagree' && input.blocking) {
    return 'blocked_safety'
  }
  if (input.intervention === 'clarify') {
    return 'need_detail'
  }
  // Opinião pura (suggest_better_prompt / caution / disagree não-bloqueante)
  // NÃO ganha fala — texto basta.
  if (
    input.intervention === 'suggest_better_prompt'
    || input.intervention === 'caution'
    || input.intervention === 'disagree'
  ) {
    return null
  }
  // Sem intervenção: depende de ter prompt compilado.
  if (input.hasCompiledPrompt) return 'prompt_ready'
  if (input.mode === 'dictation' || input.mode === 'governed_execute') {
    return 'understood'
  }
  return null
}

export async function voxSttTranscribeDebugText(request: {
  rawText: string
  sessionId?: string
  audioHandle?: string
}): Promise<VoxDebugTranscribeResponse> {
  return voxInvoke<VoxDebugTranscribeResponse>('vox_stt_transcribe_debug_text', {
    request,
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Atlas Vox · STT real audio (Onda 6.6 / Claude M backend, Claude N UI)
//
// Tauri command: `vox_stt_transcribe_audio` (provided by Claude M's wave).
//
// Input:  { sessionId, audioHandle }
// Output: { transcript: VoxTranscript, modelStatus?, timings? }
//
// Honesty: if the model is missing or the engine binding is not compiled
// in, the Rust side surfaces a structured error string. We re-shape that
// into a typed `VoxAudioTranscribeError` so the overlay can render the
// "Modelo Whisper large-v3 ausente" hint without inventing a transcript.

export interface VoxAudioTranscribeTimings {
  capturedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  durationMs?: number | null
  captureToSttStartMs?: number | null
  sttProcessingMs?: number | null
  correctionPassMs?: number | null
  totalMs?: number | null
}

export interface VoxAudioTranscribeResponse {
  transcript: VoxTranscript
  /** May echo back the engine status snapshot. The overlay uses it to
   * refresh modelStatus after a successful transcription so the UI stays
   * in sync (e.g. modelFound flips when the operator drops a file in). */
  modelStatus: VoxModelStatus | null
  timings: VoxAudioTranscribeTimings
  /** Free-form `note` field for non-blocking diagnostics (e.g. "engine
   * ran in fallback warm-cache mode"). UI shows it discreetly when set. */
  note: string | null
}

/** Structured error raised when `vox_stt_transcribe_audio` fails. Code
 * matches what the Rust side emits (see `vox_stt::engine::SttError`). */
export class VoxAudioTranscribeError extends Error {
  readonly code: string
  readonly modelStatus: VoxModelStatus | null

  constructor(message: string, code: string, modelStatus: VoxModelStatus | null) {
    super(message)
    this.name = 'VoxAudioTranscribeError'
    this.code = code
    this.modelStatus = modelStatus
  }
}

function normalizeSttErrorPayload(payload: {
  code: string
  message: string
  modelStatus: VoxModelStatus | null
}): {
  code: string
  message: string
  modelStatus: VoxModelStatus | null
} {
  const text = payload.message || ''
  const zeroSignal =
    /AudioInputInvalid/i.test(text)
    || /não ouvi fala suficiente/i.test(text)
    || /rms=0(?:\.0+)?/i.test(text)
    || /peak=0(?:\.0+)?/i.test(text)
    || /active_ratio=0(?:\.0+)?/i.test(text)

  if (zeroSignal) {
    return {
      code: 'audio_input_invalid',
      // V6-MIC-AIRPODS-FINAL · canon: ação primeiro (escolher microfone),
      // sem jargão técnico (rms/peak/active_ratio nunca aparecem aqui).
      message:
        'Não recebi áudio. Confira se o microfone certo está selecionado no macOS e tente de novo.',
      modelStatus: payload.modelStatus,
    }
  }

  return payload
}

function tryParseSttError(raw: unknown): {
  code: string
  message: string
  modelStatus: VoxModelStatus | null
} | null {
  // The Rust side surfaces SttError as a JSON-encoded string Tauri then
  // wraps in an `invoke`-style rejection. Tauri's invoke rejects with a
  // string in many configurations, but we tolerate {code,message,status}
  // object payloads too.
  if (typeof raw === 'string') {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>
      if (obj && typeof obj === 'object') {
        return normalizeSttErrorPayload({
          code: typeof obj.code === 'string' ? obj.code : 'model_missing_or_engine_unavailable',
          message: typeof obj.message === 'string' ? obj.message : raw,
          modelStatus: (obj.status as VoxModelStatus | null) ?? null,
        })
      }
    } catch {
      /* fall through */
    }
    return normalizeSttErrorPayload({
      code: 'model_missing_or_engine_unavailable',
      message: raw,
      modelStatus: null,
    })
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    return normalizeSttErrorPayload({
      code: typeof obj.code === 'string' ? obj.code : 'model_missing_or_engine_unavailable',
      message: typeof obj.message === 'string' ? obj.message : 'STT engine unavailable',
      modelStatus: (obj.status as VoxModelStatus | null) ?? null,
    })
  }
  return null
}

function normalizeAudioTranscribeResponse(raw: unknown): VoxAudioTranscribeResponse {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  // `transcript` may live at the root (when the Rust side returns the
  // VoxTranscript directly) OR nested under `transcript` (when wrapped in a
  // richer envelope). Support both.
  const transcript = (r.transcript ?? raw) as VoxTranscript
  const modelStatus = (r.modelStatus ?? r.model_status ?? null) as VoxModelStatus | null
  const timingsRaw = (r.timings ?? r.latencyMs ?? r.latency_ms ?? {}) as Record<string, unknown>
  const num = (k1: string, k2?: string): number | null => {
    const v = (timingsRaw[k1] ?? (k2 ? timingsRaw[k2] : undefined)) as unknown
    return typeof v === 'number' ? v : null
  }
  const str = (k1: string, k2?: string): string | null => {
    const v = (timingsRaw[k1] ?? (k2 ? timingsRaw[k2] : undefined)) as unknown
    return typeof v === 'string' ? v : null
  }
  const timings: VoxAudioTranscribeTimings = {
    capturedAt: str('capturedAt', 'captured_at'),
    startedAt: str('startedAt', 'started_at'),
    completedAt: str('completedAt', 'completed_at'),
    durationMs: num('durationMs', 'duration_ms'),
    captureToSttStartMs: num('captureToSttStartMs', 'capture_to_stt_start'),
    sttProcessingMs: num('sttProcessingMs', 'stt_processing'),
    correctionPassMs: num('correctionPassMs', 'correction_pass'),
    totalMs: num('totalMs', 'total'),
  }
  const note = typeof r.note === 'string' ? r.note : null
  return { transcript, modelStatus, timings, note }
}

export async function voxSttTranscribeAudio(request: {
  sessionId: string
  audioHandle: string
}): Promise<VoxAudioTranscribeResponse> {
  try {
    const raw = await voxInvoke<unknown>('vox_stt_transcribe_audio', { request })
    return normalizeAudioTranscribeResponse(raw)
  } catch (e) {
    if (e instanceof VoxBridgeUnavailable) {
      throw new VoxAudioTranscribeError(
        e.message,
        'tauri_runtime_required',
        null,
      )
    }
    const parsed = tryParseSttError(e)
    if (parsed) {
      throw new VoxAudioTranscribeError(parsed.message, parsed.code, parsed.modelStatus)
    }
    throw new VoxAudioTranscribeError(
      e instanceof Error ? e.message : String(e),
      'stt_unknown_error',
      null,
    )
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Atlas Vox · Kernel Vox V0 HTTP (Onda 2 / Claude C)
//
// /ai/vox/intent compiles a VoxTranscript into a VoxIntentPacket and may
// issue a Decision Receipt (R0 for V0 dictation). When the endpoint isn't
// deployed yet, this returns `unavailable` instead of inventing a receipt.

/** Provider biasing for `intent_compile`. Kernel may ignore. */
export type VoxProviderHint = 'auto' | 'codex_cli' | 'claude_cli' | 'local'

/** Output format hint from VoxIntentPacket canon (extended with `auto`
 * sentinel that the frontend uses to mean "let Kernel pick"). */
export type VoxOutputFormat =
  | 'auto'
  | 'text'
  | 'plan'
  | 'diff'
  | 'notes'
  | 'command_proposal'
  | 'diagnostic'
  | 'none'

/** Canonical risk band as returned by `VoxRiskClassifier`. */
export type VoxRiskClass = 'R0' | 'R1' | 'R2' | 'R3' | 'R4'

/** Lightweight context reference. The Desktop emits only kinds it can prove
 * (workspace slug, active surface). Anything richer needs Accessibility and
 * is out of V2 scope. */
export interface VoxContextRef {
  kind: 'workspace' | 'surface' | 'file' | 'selection' | 'active_window' | 'none'
  ref: string | null
  resolved: boolean
}

export interface VoxKernelIntentRequest {
  transcript: VoxTranscript
  /** Optional source hint propagated into VoxIntentPacket. */
  source?: VoxSource
  /** Optional mode override; defaults to `dictation` for V0. V4 accepts
   * `'auto'` para deixar o VoxAutoModeRouter escolher no Kernel. */
  modeRequested?: VoxMode | 'auto'
  /** Operator-selected provider bias for `intent_compile`. */
  providerHint?: VoxProviderHint
  /** Operator-selected output format for `intent_compile`. */
  outputFormat?: VoxOutputFormat
  /** Optional lightweight context refs collected by the surface. */
  contextRefs?: VoxContextRef[]
  /** V4 · structured snapshot of the operator's current desktop context
   * (workspace, active surface, selection, thread, obra, terminal). Built
   * by `buildVoxContextSnapshot` and forwarded to the Kernel as
   * `context_snapshot` so it can resolve dêixis ("isso aqui", "esse arquivo")
   * without screen capture or clipboard. Stored as `unknown` to keep
   * bridge.ts decoupled from the snapshot type — the canonical shape lives
   * in components/vox/voxContextSnapshot.ts. */
  contextSnapshot?: Record<string, unknown> | null
  /** V4 · `true` quando o operador trocou o modo manualmente DEPOIS de o
   * Atlas ter sugerido outro (clicou "Trocar modo" na cabine "Atlas
   * entendeu"). Apenas telemetria — o Kernel registra um evento, não muda
   * comportamento. `false`/`undefined` na primeira chamada. */
  manualOverride?: boolean
}

export function buildVoxKernelIntentPayload(
  request: VoxKernelIntentRequest,
): Record<string, unknown> {
  const transcript = request.transcript
  const body: Record<string, unknown> = {
    schema: transcript.schema,
    session_id: transcript.sessionId,
    transcript_id: transcript.transcriptId,
    audio_handle: transcript.audioHandle,
    language: transcript.language,
    engine: transcript.engine,
    engine_invocation_id: transcript.engineInvocationId,
    text: transcript.text,
    text_raw: transcript.textRaw,
    confidence: transcript.confidence,
    words: transcript.words,
    personal_dictionary_applied: transcript.personalDictionaryApplied,
    post_corrections: transcript.postCorrections,
    latency_ms: transcript.latencyMs,
    noise_signals: transcript.noiseSignals ?? undefined,
    raw_pcm_persisted: transcript.rawPcmPersisted,
    eclipse_check: transcript.eclipseCheck,
    source: request.source,
    mode_requested: request.modeRequested ?? 'auto',
  }
  if (request.providerHint && request.providerHint !== 'auto') {
    body.provider_hint = request.providerHint
  }
  if (request.outputFormat && request.outputFormat !== 'auto') {
    body.output_format = request.outputFormat
  }
  if (request.contextRefs && request.contextRefs.length > 0) {
    body.context_refs = request.contextRefs.map((c) => ({
      kind: c.kind,
      ref: c.ref,
      resolved: c.resolved,
    }))
  }
  // V4 · forward the structured context snapshot when the surface produced one.
  // The Kernel uses it to resolve dêixis. We forward as-is so the snapshot
  // schema stays owned by the canonical builder, not by the bridge.
  if (request.contextSnapshot && typeof request.contextSnapshot === 'object') {
    body.context_snapshot = request.contextSnapshot
  }
  // V4 · operator-driven mode override flag (telemetry only on backend).
  if (request.manualOverride === true) {
    body.manual_override = true
  }
  return body
}

/** V4 · canonical Auto Mode Decision shape returned by the Kernel
 * (`atlas.vox.auto_mode_decision.v1`). Surface this so the overlay can show
 * confidence + alternatives honestly without re-inferring from `suggestedMode`. */
export interface VoxAutoModeAlternative {
  mode: VoxMode
  confidence: number
  reasonPtBr: string
}

export interface VoxAutoModeDecision {
  selectedMode: VoxMode
  confidence: number
  reasonPtBr: string
  needsConfirmation: boolean
  alternatives: VoxAutoModeAlternative[]
  /** R4 marker label when the router routed to governed_execute because of a
   * destructive token (rm -rf, sudo, drop database, …). `null` otherwise. */
  r4Marker: string | null
  /** Schema version stamp from the Kernel (`0.1.0` at V4 W2). */
  routerVersion: string | null
}

/** V3 Governed Executor · confirmation request returned by /ai/vox/intent
 * when the Kernel decided the intent requires explicit human confirmation
 * before any execution. The Desktop renders this verbatim and never invents
 * a confirmation. `confirmationToken` exists only so the next /ai/vox/execute
 * call can be authorized — it MUST NOT be rendered, logged, or persisted. */
export interface VoxConfirmationRequest {
  /** Stable id of this confirmation prompt (one per intent compile cycle). */
  requestId: string | null
  /** Receipt id the execute call will reference. */
  receiptId: string | null
  /** Intent packet id (links UI state to receipt). */
  intentId: string | null
  /** Canonical risk band the operator is being asked to confirm. */
  riskClass: VoxRiskClass | null
  /** Short human-readable summary of what will happen. */
  preview: string | null
  /** Actions the operator may take (`execute`, `cancel`, `edit_intent`, …). */
  actionsAvailable: string[]
  /** True when the operator must type a literal phrase to unlock execute (R4). */
  requiresLiteralConfirmation: boolean
  /** Exact phrase the operator must type when literal confirmation is required. */
  literalConfirmationText: string | null
  /** Opaque token the backend issued for the /ai/vox/execute call. NEVER
   * render, log, or persist this value. */
  confirmationToken: string | null
  /** ISO timestamp when the confirmation token expires (5min default). */
  expiresAt: string | null
}

export interface VoxKernelIntentResponse {
  /** "ok" when the kernel produced a receipt; "unavailable" when the
   * endpoint or backend isn't ready and the UI must fall back to local-only.
   * Frontend MUST NOT render receipts for any value other than "ok". */
  status: 'ok' | 'unavailable' | 'error'
  receiptId: string | null
  decisionId: string | null
  ledgerEventId: string | null
  /** Human-readable intent line (e.g. compiled prompt summary in
   * `prompt_polish`/`intent_compile`, or the cleaned transcript in
   * `dictation`). */
  intentText: string | null
  /** Risk band (R0/R1/R2/R3). For V0 dictation the Kernel pins this to R0. */
  risk: string | null
  /** Suggested next action (e.g. "copy", "insert", "send_to_executor"). */
  nextAction: string | null
  /** Free-form error/diagnostic when status is "error" or "unavailable". */
  message: string | null
  /** Polished prompt produced by the VoxCompiler in `prompt_polish` /
   * `intent_compile` modes. `null` in `dictation` (canon). */
  compiledPrompt: string | null
  /** Template id used to generate `compiledPrompt`, e.g. `codex.md@v3`. */
  compiledPromptTemplate: string | null
  /** Optional preview/summary block from the Kernel — short paragraph the
   * operator sees before acting on a receipt. */
  preview: string | null
  // ── V2 Intent Compile · rich packet fields (all nullable so V0/V1 still fit)
  /** Short imperative phrase declaring what Vitor wants. Empty in `dictation`. */
  goal: string | null
  /** Explicit constraints extracted from the transcript ("não mexa em X"). */
  constraints: string[]
  /** Provider bias from the Kernel (may equal or override the request hint). */
  providerHint: VoxProviderHint | null
  /** Executor hint (V2 surfaces this so V3 can pick up; V2 never executes). */
  executorHint: string | null
  /** Output format the Kernel chose for this intent. */
  outputFormat: VoxOutputFormat | null
  /** Final risk classification — Kernel may have uplifted from `dictation` R0. */
  riskClass: VoxRiskClass | null
  /** Human-readable justification of the risk class. */
  riskReasoning: string | null
  /** Evidence the Kernel commits to producing if the intent is later executed. */
  evidencePromise: string | null
  /** Operator-facing preview triplet from the Vox canon. */
  previewWhatIHeard: string | null
  previewWhatIUnderstood: string | null
  previewWhatIWillDo: string | null
  /** Suggested action vocabulary (subset of `copy_compiled_prompt`,
   * `insert_compiled_prompt`, `copy_original`, `cancel`, etc). */
  actionsAvailable: string[]
  // ── V3 Governed Executor · confirmation handshake
  /** True when the Kernel asks the operator to explicitly confirm before any
   * execution. UI must not enable an Execute action unless this is true AND
   * `confirmationRequest` is non-null. */
  confirmationRequired: boolean
  /** Full confirmation payload — `null` for V0/V1/V2 modes that don't execute. */
  confirmationRequest: VoxConfirmationRequest | null
  // ── V4 · Auto Mode Router (paper-only; null until backend ships)
  /** Mode the Kernel suggests for this transcript, when the Auto Mode Router
   * is online. `null` means: backend não devolveu sugestão — UI mostra "modo
   * sugerido indisponível" e não inventa decisão. */
  suggestedMode: VoxMode | null
  /** Short human-readable reason the Kernel chose `suggestedMode`. Optional,
   * only used to enrich the V4 confirmation card. */
  suggestedModeReason: string | null
  /** V4 · full Auto Mode Decision payload (confidence, alternatives, R4
   * marker). `null` when backend didn't ship it yet — overlay falls back to
   * `suggestedMode`/`suggestedModeReason` and stays honest. */
  autoModeDecision: VoxAutoModeDecision | null
  /** V4 · how the effective compile mode was resolved on the Kernel side.
   *   `auto_router` · cliente pediu mode_requested=auto e o router decidiu.
   *   `manual_override` · cliente pinou um modo DIFERENTE da sugestão e
   *      passou manual_override=true.
   *   `manual_diverges_from_suggestion` · cliente pinou um modo diferente
   *      sem flag de override (ainda V3 puro).
   *   `manual_matches_suggestion` · cliente pinou um modo que bate com a
   *      sugestão (caminho mais comum).
   *   `null` em backends antigos. */
  modeResolution:
    | 'auto_router'
    | 'manual_override'
    | 'manual_diverges_from_suggestion'
    | 'manual_matches_suggestion'
    | null
  // ── V5-A · Symbiotic Interlocutor (deterministic conversational layer)
  /** Decisão conversacional do policy V5-A. `null` quando o backend ainda
   * não publicou o campo (compatibilidade com Kernels antigos). Quando vier,
   * `intervention === 'none'` significa "policy decidiu não falar" — UI não
   * renderiza nada. */
  interlocutor: VoxInterlocutorDecision | null
  // ── V6.5 · Smart Flow Decision (deterministic preview layer)
  /** Decisão de fluxo inteligente. `null` quando o backend ainda não publicou
   * — UI continua funcionando via `describeUnderstanding()` legado. Quando
   * vier, dirige o preview principal (Ouvi/Entendi/Vou fazer + clarification
   * + risco). **NUNCA exposto cru na UI** — apenas o view-model composto. */
  flowDecision: VoxFlowDecision | null
  // ── V6.5 · Prompt Self-Critic envelope (additive opcional + nullable).
  /** Diagnóstico determinístico do `compiled_prompt`. Vem de
   * `atlas.vox.prompt_quality.v1` (backend `VoxPromptSelfCritic`). `null`
   * quando o backend antigo (V6 inicial) ainda não emite o envelope — UI
   * continua funcionando sem ele. Quando vier, alimenta painéis de
   * diagnóstico interno; UI principal nunca renderiza o objeto cru.
   *
   * **Opcional** (`?:`) intencionalmente: construtores legados de response
   * (testes V6, hooks pré-V6.5) continuam compilando sem precisar declarar
   * o campo. Código consumidor lê via `response.promptQuality ?? null`. */
  promptQuality?: VoxPromptQuality | null
}

/**
 * V6.5 · Prompt Self-Critic envelope (`atlas.vox.prompt_quality.v1`).
 *
 * Determinístico, sem LLM. Emitido pelo backend dentro de
 * `intent_packet.prompt_quality` (também espelhado em
 * `compiler_telemetry.prompt_quality`). Campos novos podem aparecer
 * — o parser ignora tudo que não conhece, então adições futuras
 * permanecem additive.
 */
export interface VoxPromptQuality {
  schema: 'atlas.vox.prompt_quality.v1'
  version: string
  /** `pass | warn | fail` — derivado do `score`. */
  status: 'pass' | 'warn' | 'fail'
  /** Score em [0, 1]. */
  score: number
  /** Códigos curtos dos critérios que falharam (ex.: `boilerplate_detected`,
   *  `negations_lost`). UI nunca mostra cru. */
  issues: string[]
  /** `true` quando ≥ 1 critério hard falhou (negação perdida, risco
   *  suavizado, ação não autorizada) — operador precisa investigar. */
  needsReview: boolean
  /** `true` quando o backend patchou determinísticamente o prompt
   *  (remoção de boilerplate, restauração de bloco canônico). */
  repaired: boolean
}

/**
 * V6.5 · Smart Flow Decision (`atlas.vox.flow_decision.v1`).
 *
 * Camada determinística — sem LLM, sem rede — emitida pelo backend Atlas Vox
 * em `/ai/vox/intent`. Substitui a derivação manual do destino/risco que o
 * desktop fazia. **Nunca renderizada crua**: o overlay só consome via
 * `composeSmartPreview()`.
 */
/**
 * Destinos canônicos emitidos pelo `VoxFlowOrchestrator` (backend).
 *
 * Pin direto contra o enum PHP `DESTINATION_*` — qualquer divergência aqui
 * faria o parser cair no fallback e perderia preview rico. Os valores são
 * **deliberadamente** curtos (sem sufixo `_cli`) porque o backend trata
 * "Codex" / "Claude" como destinos humanos, não como executors.
 */
export type VoxFlowDestination =
  | 'clipboard'
  | 'atlas'
  | 'codex'
  | 'claude'
  | 'terminal_proposal'
  | 'note'
  | 'none'

export type VoxFlowConfidence = 'high' | 'medium' | 'low'

export interface VoxFlowDecision {
  /** Schema canônico — pinado pra detectar drift. */
  schema: 'atlas.vox.flow_decision.v1'
  /** Versão do policy que produziu a decisão (audit). */
  version: string
  /** Modo efetivo escolhido pelo backend (espelha `suggestedMode` do
   *  `auto_mode_decision` quando o operador deixou em auto). */
  mode: VoxMode | null
  /** Onde a resposta vai parar: Codex/Claude CLI, terminal proposal,
   *  clipboard local, Atlas Inbox, ou auto-contido. */
  destination: VoxFlowDestination | null
  /** Risk class final que decide o tom do preview. UI nunca mostra
   *  "R0/R4" cru — só usa para escolher copy. */
  riskClass: VoxRiskClass | null
  /** Confiança da classificação. Quando `low`, UI mostra "Não tenho
   *  certeza" + opções de editar/regravar. */
  confidence: VoxFlowConfidence | null
  /** `true` quando o backend precisa que o operador responda algo antes de
   *  prosseguir (ambiguidade real). */
  needsClarification: boolean
  /** Pergunta curta em PT-BR — só populada quando `needsClarification=true`. */
  clarifyingQuestion: string | null
  /** Triplet humano canônico. */
  whatIHeard: string | null
  whatIUnderstood: string | null
  whatIWillDo: string | null
  /** Justificativa curta em PT-BR — entra em "Detalhes avançados". */
  whyThisFlow: string | null
  /** Caminho seguro alternativo descrito em PT-BR (ex.: "salvar como nota").
   *  Aparece como fallback quando o operador quer recuar. */
  safeFallback: string | null
}

/**
 * V5-A · Symbiotic Interlocutor decision.
 *
 * Camada determinística (sem LLM, sem rede) que decide se o Atlas deve
 * perguntar, advertir, discordar ou sugerir prompt melhor antes da execução.
 * O frontend só renderiza algo quando `intervention !== 'none'`. `blocking`
 * só vai a `true` em risco/política dura (R4 ou marker destrutivo crítico).
 */
export type VoxInterlocutorIntervention =
  | 'none'
  | 'clarify'
  | 'caution'
  | 'disagree'
  | 'suggest_better_prompt'

export type VoxInterlocutorReasonCode =
  | 'ambiguous_reference'
  | 'destructive_risk'
  | 'missing_context'
  | 'weak_prompt'
  | 'safer_path_available'
  | 'none'

export interface VoxInterlocutorDecision {
  schema: 'atlas.vox.interlocutor_decision.v1'
  intervention: VoxInterlocutorIntervention
  /** Mensagem curta em PT-BR — útil, direta, sem julgamento emocional. */
  messagePtBr: string
  /** Pergunta em PT-BR (vazia para `caution` / `none`). */
  questionPtBr: string
  /** `true` só em risco destrutivo R4 ou política dura. Confirmar deve ficar
   * desabilitado no overlay quando este flag estiver ativo. */
  blocking: boolean
  reasonCode: VoxInterlocutorReasonCode
  /** Edits sugeridos (ex.: safer_path, add_sections). `null` quando nenhum. */
  suggestedEdit: Record<string, unknown> | null
  /** Versão do policy que produziu a decisão — útil para audit no overlay. */
  policyVersion: string
}

const VOX_INTERLOCUTOR_INTERVENTIONS: readonly VoxInterlocutorIntervention[] = [
  'none',
  'clarify',
  'caution',
  'disagree',
  'suggest_better_prompt',
] as const

const VOX_INTERLOCUTOR_REASONS: readonly VoxInterlocutorReasonCode[] = [
  'ambiguous_reference',
  'destructive_risk',
  'missing_context',
  'weak_prompt',
  'safer_path_available',
  'none',
] as const

/**
 * V5-A · pure parser do payload `interlocutor` retornado por `/ai/vox/intent`.
 *
 * Quando o backend não envia o campo (Kernels antigos), devolve `null` para
 * que a UI possa esconder o painel honestamente em vez de inventar um
 * `intervention=none`. Aceita `snake_case` e `camelCase`; campos ausentes
 * caem em defaults conservadores.
 */
export function parseInterlocutorDecision(
  raw: unknown,
): VoxInterlocutorDecision | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const interventionRaw = (r.intervention ?? null) as unknown
  if (typeof interventionRaw !== 'string') return null
  const intervention =
    (VOX_INTERLOCUTOR_INTERVENTIONS as readonly string[]).includes(interventionRaw)
      ? (interventionRaw as VoxInterlocutorIntervention)
      : null
  if (!intervention) return null
  const reasonRaw = (r.reasonCode ?? r.reason_code ?? null) as unknown
  const reasonCode =
    typeof reasonRaw === 'string'
    && (VOX_INTERLOCUTOR_REASONS as readonly string[]).includes(reasonRaw)
      ? (reasonRaw as VoxInterlocutorReasonCode)
      : 'none'
  const messageRaw = (r.messagePtBr ?? r.message_pt_br ?? '') as unknown
  const questionRaw = (r.questionPtBr ?? r.question_pt_br ?? '') as unknown
  const policyVersionRaw = (r.policyVersion ?? r.policy_version ?? '') as unknown
  const suggestedEditRaw = (r.suggestedEdit ?? r.suggested_edit ?? null) as unknown
  const suggestedEdit =
    suggestedEditRaw && typeof suggestedEditRaw === 'object'
      ? (suggestedEditRaw as Record<string, unknown>)
      : null
  return {
    schema: 'atlas.vox.interlocutor_decision.v1',
    intervention,
    messagePtBr: typeof messageRaw === 'string' ? messageRaw : '',
    questionPtBr: typeof questionRaw === 'string' ? questionRaw : '',
    blocking: r.blocking === true,
    reasonCode,
    suggestedEdit,
    policyVersion: typeof policyVersionRaw === 'string' ? policyVersionRaw : '',
  }
}

// V4 · `parseVoxAutoModeDecision` mora num módulo puro
// (`./voxAutoModeDecision`) para poder ser testado sem depender de
// `import.meta.env` / Vite runtime. Importamos local e re-exportamos pela
// compat da API existente (`import { parseVoxAutoModeDecision } from '.../bridge'`).
import { parseVoxAutoModeDecisionShape as parseVoxAutoModeDecisionImpl } from './voxAutoModeDecision'
export const parseVoxAutoModeDecision = parseVoxAutoModeDecisionImpl

/**
 * V6.5 · parser tolerante para `flow_decision`. Aceita snake_case ou
 * camelCase, devolve `null` quando o campo está ausente ou inválido —
 * compatível com backends antigos.
 */
export function parseVoxFlowDecision(raw: unknown): VoxFlowDecision | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const modeAllowed: VoxMode[] = ['dictation', 'prompt_polish', 'intent_compile', 'governed_execute']
  const destAllowed: VoxFlowDestination[] = [
    'clipboard',
    'atlas',
    'codex',
    'claude',
    'terminal_proposal',
    'note',
    'none',
  ]
  const riskAllowed: VoxRiskClass[] = ['R0', 'R1', 'R2', 'R3', 'R4']
  const confidenceAllowed: VoxFlowConfidence[] = ['high', 'medium', 'low']

  const pick = (...keys: string[]): unknown => {
    for (const k of keys) {
      if (k in r && r[k] !== undefined) return r[k]
    }
    return undefined
  }
  const pickStr = (...keys: string[]): string | null => {
    const v = pick(...keys)
    return typeof v === 'string' ? v : null
  }
  const pickEnum = <T extends string>(allowed: readonly T[], ...keys: string[]): T | null => {
    const v = pickStr(...keys)
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : null
  }

  // schema é obrigatório pra confirmar canon; rejeita silenciosamente quando
  // não bate (evita renderizar dado de outro contrato).
  const schema = pickStr('schema')
  if (schema && schema !== 'atlas.vox.flow_decision.v1') return null

  const needsClarification = pick('needs_clarification', 'needsClarification') === true

  return {
    schema: 'atlas.vox.flow_decision.v1',
    version: pickStr('version') ?? '0.1.0',
    mode: pickEnum(modeAllowed, 'mode'),
    destination: pickEnum(destAllowed, 'destination'),
    riskClass: pickEnum(riskAllowed, 'risk_class', 'riskClass'),
    confidence: pickEnum(confidenceAllowed, 'confidence'),
    needsClarification,
    clarifyingQuestion: pickStr('clarifying_question', 'clarifyingQuestion'),
    whatIHeard: pickStr('what_i_heard', 'whatIHeard'),
    whatIUnderstood: pickStr('what_i_understood', 'whatIUnderstood'),
    whatIWillDo: pickStr('what_i_will_do', 'whatIWillDo'),
    whyThisFlow: pickStr('why_this_flow', 'whyThisFlow'),
    safeFallback: pickStr('safe_fallback', 'safeFallback'),
  }
}

/**
 * V6.5 · parser tolerante para `prompt_quality`. Aceita snake_case ou
 * camelCase em qualquer nível conhecido (root, `intent_packet`,
 * `compiler_telemetry`). Devolve `null` quando o backend antigo (V6
 * inicial) não emite o envelope. Hardening:
 *   - status inválido → fallback `'warn'`
 *   - score fora de [0, 1] → clamp
 *   - issues que não são string → filtradas
 * Tudo isso para que clientes V6.5 nunca quebrem mesmo se o envelope
 * vier malformado em backends transitórios.
 */
export function parseVoxPromptQuality(raw: unknown): VoxPromptQuality | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const schema = r.schema
  if (schema !== 'atlas.vox.prompt_quality.v1') return null

  const statusRaw = r.status
  const status: VoxPromptQuality['status'] =
    statusRaw === 'pass' || statusRaw === 'warn' || statusRaw === 'fail'
      ? statusRaw
      : 'warn'

  let score = typeof r.score === 'number' && Number.isFinite(r.score) ? r.score : 0
  if (score < 0) score = 0
  if (score > 1) score = 1

  const issuesRaw = Array.isArray(r.issues) ? r.issues : []
  const issues = issuesRaw.filter((x): x is string => typeof x === 'string')

  const needsReview = Boolean((r.needs_review ?? r.needsReview) === true)
  const repaired = Boolean(r.repaired === true)

  const versionRaw = r.version
  const version = typeof versionRaw === 'string' && versionRaw !== ''
    ? versionRaw
    : '0.0.0'

  return {
    schema: 'atlas.vox.prompt_quality.v1',
    version,
    status,
    score,
    issues,
    needsReview,
    repaired,
  }
}

export async function voxKernelIntent(
  request: VoxKernelIntentRequest
): Promise<VoxKernelIntentResponse> {
  // Pure HTTP — there is no Tauri command wrapping this in V0. Both Tauri
  // and HTTP modes hit the Kernel directly. In offline mode we return an
  // honest unavailable response so the overlay can render "Kernel Vox ainda
  // indisponível" without inventing data.
  const emptyResponse = (
    status: VoxKernelIntentResponse['status'],
    message: string | null,
  ): VoxKernelIntentResponse => ({
    status,
    receiptId: null,
    decisionId: null,
    ledgerEventId: null,
    intentText: null,
    risk: null,
    nextAction: null,
    message,
    compiledPrompt: null,
    compiledPromptTemplate: null,
    preview: null,
    goal: null,
    constraints: [],
    providerHint: null,
    executorHint: null,
    outputFormat: null,
    riskClass: null,
    riskReasoning: null,
    evidencePromise: null,
    previewWhatIHeard: null,
    previewWhatIUnderstood: null,
    previewWhatIWillDo: null,
    actionsAvailable: [],
    confirmationRequired: false,
    confirmationRequest: null,
    suggestedMode: null,
    suggestedModeReason: null,
    autoModeDecision: null,
    modeResolution: null,
    interlocutor: null,
    flowDecision: null,
    promptQuality: null,
  })

  if (!HTTP_BASE && MODE !== 'http') {
    return emptyResponse(
      'unavailable',
      'Kernel Vox HTTP endpoint não configurado (VITE_ATLAS_SERVER_URL ausente).',
    )
  }
  // /ai/vox/intent validates VoxTranscript.v1 fields at the root. Keep this
  // conversion explicit so React state can stay camelCase while the Kernel
  // receives canonical snake_case.
  const body = buildVoxKernelIntentPayload(request)
  try {
    const raw = await fetchHttp<unknown>('/ai/vox/intent', {
      method: 'POST',
      body,
    })
    if (!raw || typeof raw !== 'object') {
      return emptyResponse('error', 'Resposta vazia do Kernel Vox')
    }
    const r = raw as Record<string, unknown>
    const intentPacketRaw = (r.intent_packet ?? r.intentPacket) as
      | Record<string, unknown>
      | undefined
    const receiptRaw = (r.receipt ?? r.receipt_payload) as
      | Record<string, unknown>
      | undefined
    const previewObj = (r.preview ?? r.previewPayload) as
      | Record<string, unknown>
      | undefined

    // Pick a string from up to two source keys across the root, intent_packet,
    // receipt, and preview sub-objects · backend may emit snake_case or
    // camelCase and may nest fields differently across modes.
    const sources: Array<Record<string, unknown>> = [r]
    if (intentPacketRaw) sources.push(intentPacketRaw)
    if (receiptRaw) sources.push(receiptRaw)
    if (previewObj && typeof previewObj === 'object') sources.push(previewObj)

    const pickStr = (...keys: Array<[string, string?]>): string | null => {
      for (const src of sources) {
        for (const [a, b] of keys) {
          const v = src[a] ?? (b ? src[b] : undefined)
          if (typeof v === 'string') return v
          if (v === null) return null
        }
      }
      return null
    }
    const pickList = (...keys: Array<[string, string?]>): string[] => {
      for (const src of sources) {
        for (const [a, b] of keys) {
          const v = src[a] ?? (b ? src[b] : undefined)
          if (Array.isArray(v)) {
            return v.filter((x): x is string => typeof x === 'string')
          }
        }
      }
      return []
    }
    const pickEnum = <T extends string>(
      allowed: readonly T[],
      ...keys: Array<[string, string?]>
    ): T | null => {
      const raw = pickStr(...keys)
      if (raw && (allowed as readonly string[]).includes(raw)) return raw as T
      return null
    }
    const providerAllowed: VoxProviderHint[] = ['auto', 'codex_cli', 'claude_cli', 'local']
    const outputAllowed: VoxOutputFormat[] = [
      'auto',
      'text',
      'plan',
      'diff',
      'notes',
      'command_proposal',
      'diagnostic',
      'none',
    ]
    const riskAllowed: VoxRiskClass[] = ['R0', 'R1', 'R2', 'R3', 'R4']

    // `preview` is either a short string OR a structured object. When string,
    // we keep it on `preview`. When object, the structured fields below pick
    // it up and the legacy `preview` falls back to the most useful summary.
    const previewIsString = typeof r.preview === 'string'

    const preview = previewIsString
      ? (r.preview as string)
      : pickStr(['previewSummary', 'preview_summary'])

    // V3 Governed Executor · the backend may attach a confirmation_request to
    // ask Vitor for explicit confirmation. We parse it tolerantly (snake/camel)
    // and surface confirmationRequired so the overlay can render a real
    // confirmation panel. We deliberately do NOT pull confirmation_token via
    // any logging path — the value lives in memory only, sent back on execute.
    const confirmationRaw = (r.confirmation_request ?? r.confirmationRequest) as
      | Record<string, unknown>
      | undefined
    let confirmationRequest: VoxConfirmationRequest | null = null
    if (confirmationRaw && typeof confirmationRaw === 'object') {
      const cr = confirmationRaw
      const crStr = (...keys: Array<[string, string?]>): string | null => {
        for (const [a, b] of keys) {
          const v = cr[a] ?? (b ? cr[b] : undefined)
          if (typeof v === 'string') return v
        }
        return null
      }
      const crBool = (...keys: Array<[string, string?]>): boolean => {
        for (const [a, b] of keys) {
          const v = cr[a] ?? (b ? cr[b] : undefined)
          if (typeof v === 'boolean') return v
        }
        return false
      }
      const crListField = (...keys: Array<[string, string?]>): string[] => {
        for (const [a, b] of keys) {
          const v = cr[a] ?? (b ? cr[b] : undefined)
          if (Array.isArray(v)) {
            return v.filter((x): x is string => typeof x === 'string')
          }
        }
        return []
      }
      const crRiskRaw = crStr(['riskClass', 'risk_class'], ['risk'])
      const crRisk: VoxRiskClass | null =
        crRiskRaw && (riskAllowed as readonly string[]).includes(crRiskRaw)
          ? (crRiskRaw as VoxRiskClass)
          : null
      confirmationRequest = {
        requestId: crStr(['requestId', 'request_id']),
        receiptId: crStr(['receiptId', 'receipt_id']),
        intentId: crStr(['intentId', 'intent_id']),
        riskClass: crRisk,
        preview: crStr(['preview'], ['summary']),
        actionsAvailable: crListField(['actionsAvailable', 'actions_available']),
        requiresLiteralConfirmation: crBool(
          ['requiresLiteralConfirmation', 'requires_literal_confirmation'],
        ),
        literalConfirmationText: crStr([
          'literalConfirmationText',
          'literal_confirmation_text',
        ]),
        confirmationToken: crStr(['confirmationToken', 'confirmation_token']),
        expiresAt: crStr(['expiresAt', 'expires_at']),
      }
    }
    const confirmationRequired = Boolean(
      (r.confirmation_required ?? r.confirmationRequired) === true
        || (confirmationRequest && confirmationRequest.confirmationToken),
    )

    // V4 · auto_mode_decision parsing (snake/camel tolerant). When the
    // Kernel didn't ship the field, parseVoxAutoModeDecision returns null
    // so the UI can render the honest "modo sugerido indisponível" path.
    const autoModeDecision = parseVoxAutoModeDecision(r)

    const modeResolutionRaw = (r.mode_resolution ?? r.modeResolution) as unknown
    const modeResolutionAllowed = [
      'auto_router',
      'manual_override',
      'manual_diverges_from_suggestion',
      'manual_matches_suggestion',
    ] as const
    const modeResolution =
      typeof modeResolutionRaw === 'string'
      && (modeResolutionAllowed as readonly string[]).includes(modeResolutionRaw)
        ? (modeResolutionRaw as VoxKernelIntentResponse['modeResolution'])
        : null

    return {
      status: (r.status as VoxKernelIntentResponse['status']) ?? 'ok',
      receiptId: pickStr(['receiptId', 'receipt_id']),
      decisionId: pickStr(['decisionId', 'decision_id']),
      ledgerEventId: pickStr(['ledgerEventId', 'ledger_event_id']),
      // Canon: VoxIntentPacket.human_input_text is the cleaned transcript line.
      intentText: pickStr(
        ['intentText', 'intent_text'],
        ['humanInputText', 'human_input_text'],
        ['goal'],
      ),
      risk: pickStr(['risk'], ['riskClass', 'risk_class']),
      nextAction: pickStr(['nextAction', 'next_action']),
      message: pickStr(['message']),
      compiledPrompt: pickStr(['compiledPrompt', 'compiled_prompt']),
      compiledPromptTemplate: pickStr([
        'compiledPromptTemplate',
        'compiled_prompt_template',
      ]),
      preview,
      goal: pickStr(['goal']),
      constraints: pickList(['constraints']),
      providerHint: pickEnum(providerAllowed, ['providerHint', 'provider_hint']),
      executorHint: pickStr(['executorHint', 'executor_hint']),
      outputFormat: pickEnum(outputAllowed, ['outputFormat', 'output_format']),
      riskClass: pickEnum(riskAllowed, ['riskClass', 'risk_class']),
      riskReasoning: pickStr(['riskReasoning', 'risk_reasoning']),
      evidencePromise: pickStr(['evidencePromise', 'evidence_promise']),
      previewWhatIHeard: pickStr(['whatIHeard', 'what_i_heard']),
      previewWhatIUnderstood: pickStr(['whatIUnderstood', 'what_i_understood']),
      previewWhatIWillDo: pickStr(['whatIWillDo', 'what_i_will_do']),
      actionsAvailable: pickList(['actionsAvailable', 'actions_available']),
      confirmationRequired,
      confirmationRequest,
      suggestedMode:
        autoModeDecision?.selectedMode
        ?? pickEnum<VoxMode>(
          ['dictation', 'prompt_polish', 'intent_compile', 'governed_execute'] as const,
          ['suggestedMode', 'suggested_mode'],
          ['autoMode', 'auto_mode'],
        ),
      suggestedModeReason:
        autoModeDecision?.reasonPtBr
        ?? pickStr(
          ['suggestedModeReason', 'suggested_mode_reason'],
          ['autoModeReason', 'auto_mode_reason'],
        ),
      autoModeDecision,
      modeResolution,
      interlocutor: parseInterlocutorDecision(r.interlocutor),
      // V6.5 · backend novo emite `flow_decision`; antigos não emitem — null
      // mantém o overlay no fallback legado.
      flowDecision: parseVoxFlowDecision(r.flow_decision ?? r.flowDecision),
      // V6.5 · Self-Critic envelope. Vive primeiro em
      // `intent_packet.prompt_quality`, com cópia em
      // `compiler_telemetry.prompt_quality`. Olhamos os dois — o primeiro
      // que vier vence; backends antigos não emitem nada → `null`.
      promptQuality: parseVoxPromptQuality(
        (intentPacketRaw && (intentPacketRaw as Record<string, unknown>)['prompt_quality'])
          ?? r.prompt_quality
          ?? r.promptQuality
          ?? (intentPacketRaw
            && ((intentPacketRaw as Record<string, unknown>)['compiler_telemetry'] as
              | Record<string, unknown>
              | undefined)
            && ((intentPacketRaw as Record<string, unknown>)['compiler_telemetry'] as
              Record<string, unknown>)['prompt_quality'])
          ?? null,
      ),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // 404 means the endpoint isn't deployed yet — surface as "unavailable"
    // (honest) rather than "error" (something broke).
    if (/\b404\b/.test(msg)) {
      return emptyResponse(
        'unavailable',
        'Kernel Vox V0 ainda não publicou /ai/vox/intent (Onda 2 / Claude C).',
      )
    }
    return emptyResponse('error', humanVoxKernelIntentError(msg))
  }
}

function humanVoxKernelIntentError(message: string): string {
  if (/\b422\b/.test(message) && /session id field is required/i.test(message)) {
    return 'O Atlas recebeu a transcrição incompleta. Grave de novo ou tente enviar novamente.'
  }
  if (/\b422\b/.test(message) && /field is required/i.test(message)) {
    return 'O Atlas recusou a transcrição por falta de dados obrigatórios. Grave de novo e tente novamente.'
  }
  return message
}

// ──────────────────────────────────────────────────────────────────────────
// Atlas Vox · V3 Governed Executor HTTP (Onda 6 / Claude I+J)
//
// /ai/vox/execute is the only path that Desktop calls to act on a confirmed
// intent. Desktop NEVER executes provider/terminal/filesystem locally — this
// function only forwards the operator's decision to the Kernel and renders
// whatever the Kernel reports back.
//
// Honesty contract:
//   - When backend is missing or returns 404, we surface `unavailable` (not
//     a fake `completed` outcome).
//   - `confirmation_token` must not leak into renderable strings. We redact
//     it from any error body before returning it for display.
//   - A `terminal_proposal` desktop_action is rendered as a copy-only block;
//     the function never touches a shell.

/** Operator-driven decision sent to the Kernel for V3 execute. */
export type VoxExecuteDecision = 'execute' | 'cancel' | 'edit_intent'

export interface VoxExecuteRequest {
  /** Intent packet id, surfaced by the confirmation_request. */
  intentId: string
  /** Receipt id, surfaced by the confirmation_request. */
  receiptId: string
  /** Operator decision (`execute` confirms; `cancel` aborts; `edit_intent`
   * tells the Kernel the operator wants to rephrase and recompile). */
  decision: VoxExecuteDecision
  /** Opaque token from the confirmation_request — never rendered/logged. */
  confirmationToken: string
  /** Literal confirmation phrase the operator typed (R4 only). */
  literalConfirmationText?: string
  /** Optional rephrased intent text (`edit_intent` decision). */
  editedIntent?: string
}

/** Terminal proposal · Vox NEVER executes shells. The Desktop renders this
 * as a copy-only block with explicit copy. `commandExecuted` is always false. */
export interface VoxTerminalProposal {
  kind: 'terminal_proposal'
  proposedCommand: string
  explanation: string | null
  commandExecuted: false
}

/** Generic desktop action — open-ended so backend can add new kinds later.
 *  `kind` is intentionally a free string here; type narrowing happens through
 *  the `isVoxTerminalProposal` guard below. */
export interface VoxDesktopActionOther {
  kind: string
  data: Record<string, unknown>
}

export type VoxDesktopAction = VoxTerminalProposal | VoxDesktopActionOther

export function isVoxTerminalProposal(
  action: VoxDesktopAction | null | undefined,
): action is VoxTerminalProposal {
  return Boolean(action) && action!.kind === 'terminal_proposal'
}

export interface VoxExecuteEvent {
  /** Free-form id from the Kernel for ordering. */
  id: string | null
  /** Event kind, e.g. `executor_started`, `executor_completed`, `blocker`. */
  kind: string
  /** Human-readable label safe for rendering. */
  message: string | null
  /** ISO timestamp when the Kernel produced the event. */
  ts: string | null
}

export interface VoxExecuteResponse {
  /** "ok" when the Kernel processed the decision (regardless of outcome).
   *  "unavailable" when /ai/vox/execute isn't deployed yet.
   *  "error" when the Kernel rejected the request (token expired, replay…). */
  status: 'ok' | 'unavailable' | 'error'
  /** Final outcome for `execute` decisions. `cancelled` / `aborted` for
   *  cancel paths. Frontend renders this verbatim. */
  actionOutcome:
    | 'completed'
    | 'blocked'
    | 'failed'
    | 'aborted'
    | 'cancelled'
    | 'pending'
    | 'unavailable'
    | null
  /** Desktop action the Kernel asks the UI to render (terminal proposal, etc). */
  desktopAction: VoxDesktopAction | null
  /** Streamed-style event list flattened into the response. */
  events: VoxExecuteEvent[]
  /** Operator-facing message (already redacted of confirmation_token). */
  message: string | null
  /** Combined provider output, when the Kernel actually ran something. */
  output: string | null
  /** Raw stdout when available. */
  stdout: string | null
  /** Raw stderr when available. */
  stderr: string | null
  /** Proposed command (mirrored from `desktopAction` for ergonomic access). */
  proposedCommand: string | null
  /** Receipt id confirming the action chain. */
  receiptId: string | null
  /** Evidence pointer (file:// or pack id). */
  evidence: string | null
}

/** Redact a known token value from any text before it crosses a render boundary. */
function redactVoxToken(input: string | null | undefined, token: string): string | null {
  if (input == null) return null
  if (!token) return input
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return input.replace(new RegExp(escaped, 'g'), '«redacted»')
}

export async function voxKernelExecute(
  request: VoxExecuteRequest,
): Promise<VoxExecuteResponse> {
  const emptyResponse = (
    status: VoxExecuteResponse['status'],
    message: string | null,
    actionOutcome: VoxExecuteResponse['actionOutcome'] = null,
  ): VoxExecuteResponse => ({
    status,
    actionOutcome,
    desktopAction: null,
    events: [],
    message,
    output: null,
    stdout: null,
    stderr: null,
    proposedCommand: null,
    receiptId: null,
    evidence: null,
  })

  if (!HTTP_BASE && MODE !== 'http') {
    return emptyResponse(
      'unavailable',
      'Kernel Vox V3 indisponível: VITE_ATLAS_SERVER_URL ausente.',
    )
  }

  const body: Record<string, unknown> = {
    intent_id: request.intentId,
    receipt_id: request.receiptId,
    decision: request.decision,
    // Token lives only in the request body; never logged.
    confirmation_token: request.confirmationToken,
  }
  if (request.literalConfirmationText !== undefined) {
    body.literal_confirmation_text = request.literalConfirmationText
  }
  if (request.editedIntent !== undefined) {
    body.edited_intent = request.editedIntent
  }

  try {
    const raw = await fetchHttp<unknown>('/ai/vox/execute', {
      method: 'POST',
      body,
    })
    if (!raw || typeof raw !== 'object') {
      return emptyResponse('error', 'Resposta vazia do Kernel Vox V3.')
    }
    const r = raw as Record<string, unknown>

    const pickStr = (...keys: Array<[string, string?]>): string | null => {
      for (const [a, b] of keys) {
        const v = r[a] ?? (b ? r[b] : undefined)
        if (typeof v === 'string') return redactVoxToken(v, request.confirmationToken)
        if (v === null) return null
      }
      return null
    }

    // desktop_action normalisation · only `terminal_proposal` has a strict
    // schema; other kinds get parked in a generic `data` bag for forward compat.
    const desktopRaw = (r.desktop_action ?? r.desktopAction) as
      | Record<string, unknown>
      | null
      | undefined
    let desktopAction: VoxDesktopAction | null = null
    let proposedCommand: string | null = null
    if (desktopRaw && typeof desktopRaw === 'object') {
      const kindVal = desktopRaw.kind
      if (kindVal === 'terminal_proposal') {
        const propRaw = desktopRaw.proposed_command ?? desktopRaw.proposedCommand
        const explRaw = desktopRaw.explanation
        const proposed = typeof propRaw === 'string'
          ? redactVoxToken(propRaw, request.confirmationToken) ?? ''
          : ''
        const explanation = typeof explRaw === 'string'
          ? redactVoxToken(explRaw, request.confirmationToken)
          : null
        desktopAction = {
          kind: 'terminal_proposal',
          proposedCommand: proposed,
          explanation,
          commandExecuted: false,
        }
        proposedCommand = proposed || null
      } else if (typeof kindVal === 'string') {
        // Forward-compat: keep raw fields, but defensively strip the token
        // from any nested string before stashing.
        const data: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(desktopRaw)) {
          if (k === 'kind') continue
          data[k] = typeof v === 'string'
            ? redactVoxToken(v, request.confirmationToken)
            : v
        }
        desktopAction = { kind: kindVal, data }
      }
    }
    // Surface a top-level proposed_command field too, when present.
    if (proposedCommand === null) {
      const top = r.proposed_command ?? r.proposedCommand
      if (typeof top === 'string') {
        proposedCommand = redactVoxToken(top, request.confirmationToken)
      }
    }

    const eventsRaw = r.events
    const events: VoxExecuteEvent[] = Array.isArray(eventsRaw)
      ? eventsRaw
          .filter((e): e is Record<string, unknown> => e !== null && typeof e === 'object')
          .map((e) => {
            const kind = typeof e.kind === 'string' ? e.kind : 'event'
            const msg = typeof e.message === 'string'
              ? redactVoxToken(e.message, request.confirmationToken)
              : null
            return {
              id: typeof e.id === 'string' ? e.id : null,
              kind,
              message: msg,
              ts: typeof e.ts === 'string' ? e.ts : null,
            }
          })
      : []

    const allowedOutcomes: NonNullable<VoxExecuteResponse['actionOutcome']>[] = [
      'completed',
      'blocked',
      'failed',
      'aborted',
      'cancelled',
      'pending',
      'unavailable',
    ]
    const outcomeRaw = (r.action_outcome ?? r.actionOutcome) as unknown
    const actionOutcome =
      typeof outcomeRaw === 'string'
        && (allowedOutcomes as readonly string[]).includes(outcomeRaw)
        ? (outcomeRaw as VoxExecuteResponse['actionOutcome'])
        : null

    const statusRaw = r.status
    const status: VoxExecuteResponse['status'] =
      statusRaw === 'unavailable' || statusRaw === 'error' || statusRaw === 'ok'
        ? statusRaw
        : 'ok'

    return {
      status,
      actionOutcome,
      desktopAction,
      events,
      message: pickStr(['message']),
      output: pickStr(['output']),
      stdout: pickStr(['stdout']),
      stderr: pickStr(['stderr']),
      proposedCommand,
      receiptId: pickStr(['receipt_id'], ['receiptId']),
      evidence: pickStr(['evidence'], ['evidence_promise', 'evidencePromise']),
    }
  } catch (e) {
    const rawMsg = e instanceof Error ? e.message : String(e)
    const msg = redactVoxToken(rawMsg, request.confirmationToken) ?? 'erro'
    if (/\b404\b/.test(msg)) {
      return emptyResponse(
        'unavailable',
        'Kernel Vox V3 ainda não publicou /ai/vox/execute.',
      )
    }
    return emptyResponse('error', msg)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Atlas Vox · Tauri event subscription helper
//
// The Rust side emits vox://* events when sessions transition. UI listens to
// these to drive the overlay state machine without polling. When Tauri isn't
// available the subscription is a no-op and returns a cleanup function the
// caller can still call safely.

export type VoxEdgeEventName =
  | 'vox://session-started'
  | 'vox://audio-capture-started'
  | 'vox://audio-capture-stopped'
  | 'vox://session-ready-for-stt'
  | 'vox://session-cancelled'
  | 'vox://eclipse-activated'
  | 'vox://error'
  // V6.5 · global hotkey events emitted by the Rust Edge runtime
  | 'vox://hotkey-toggle-recording'
  | 'vox://hotkey-open-overlay'
  | 'vox://hotkey-eclipse'
  | 'vox://hotkey-status-changed'
  // V6-A · ambient launch ping. Rust emits ONCE no boot quando detecta
  // `--vox-start-listening` / `ATLAS_VOX_START_LISTENING=1`. O overlay também
  // pode buscar via `voxAmbientConsumePendingLaunch` — o evento é só economia
  // de uma round-trip pro caso comum.
  | 'vox://ambient-launch-requested'

/** V6.5 · status of the global hotkey runtime. The Rust side emits a
 * `vox://hotkey-status-changed` event with this shape so the UI can show
 * an honest banner when the OS hasn't granted Accessibility / Input
 * Monitoring yet. We never call into the OS from JS — we only display
 * what Rust reports. */
export interface VoxHotkeyStatus {
  /** True when at least one global hotkey is actually registered and live. */
  registered: boolean
  /** OS permissions Rust is still waiting on, e.g. ["accessibility"] or
   * ["input_monitoring"]. Empty when nothing is missing. */
  missingPermissions: string[]
  /** Optional human-readable message from Rust. UI keeps its own fallback. */
  message: string | null
}

/** Defensive parse so unexpected payload shapes don't crash the UI. */
export function normalizeVoxHotkeyStatus(raw: unknown): VoxHotkeyStatus {
  if (!raw || typeof raw !== 'object') {
    return { registered: false, missingPermissions: [], message: null }
  }
  const r = raw as Record<string, unknown>
  const missingRaw = r.missing_permissions ?? r.missingPermissions
  const missing = Array.isArray(missingRaw)
    ? missingRaw.filter((x): x is string => typeof x === 'string')
    : []
  return {
    registered: r.registered === true,
    missingPermissions: missing,
    message: typeof r.message === 'string' ? r.message : null,
  }
}

export async function subscribeVoxEdgeEvent<T = unknown>(
  name: VoxEdgeEventName,
  handler: (payload: T) => void
): Promise<() => void> {
  if (MODE !== 'tauri') return () => {}
  try {
    const ev = await import('@tauri-apps/api/event')
    const unlisten = await ev.listen<T>(name, (e) => handler(e.payload))
    return () => {
      try {
        unlisten()
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    console.warn('[bridge] subscribeVoxEdgeEvent', name, e)
    return () => {}
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Atlas Vox · GATE V3 + Metrics + Rivals (Onda 7 / Claude O backend)
//
// Pure HTTP. When the Kernel doesn't expose these endpoints yet (404 / no
// HTTP_BASE configured), the bridge returns `{ status: 'unavailable', ... }`
// so the UI can render "métricas ainda indisponíveis" honestly instead of
// inventing numbers.

export type VoxResponseStatus = 'ok' | 'unavailable' | 'error'

export type VoxGateV3Status = 'blocked' | 'warming_up' | 'ready_for_vitor_review'

export interface VoxGateV3Blocker {
  /** Stable code · UI may decide to translate; the Kernel hands us a
   * canonical id like `not_enough_real_sessions`, `eclipse_tests_missing`. */
  code: string
  /** Human-readable explanation in PT-BR. The Kernel is responsible for
   * localisation here — the Desktop does NOT translate codes. */
  message: string
}

export interface VoxGateV3Response {
  status: VoxResponseStatus
  /** "blocked" until the gate logic flips. NEVER `ready` in this wave
   * unless Claude O actually opened it; we don't synthesise readiness. */
  gateStatus: VoxGateV3Status | null
  blockers: VoxGateV3Blocker[]
  /** Free-form short message from the Kernel (e.g. error reason when
   * status='error', or null when ok). */
  message: string | null
}

export interface VoxMetricsHardGates {
  rawAudioPersistedCount: number
  confirmationBypassCount: number
  destructiveActionWithoutReceipt: number
  eclipseTestSuccessCount: number
  eclipseTestRequiredCount: number
}

export interface VoxMetricsResponse {
  status: VoxResponseStatus
  realSessions: number
  realSessionsTarget: number
  daysOfRealUse: number
  daysOfRealUseTarget: number
  promptQualityDelta: number | null
  actionRegretScore: number | null
  rivalsVoiceMultiplier: number | null
  hardGates: VoxMetricsHardGates
  message: string | null
}

export interface VoxRivalsCaseSummary {
  totalCases: number
  voxWins: number
  baselineWins: number
  draws: number
  regrets: number
}

export interface VoxRivalsReportResponse {
  status: VoxResponseStatus
  summary: VoxRivalsCaseSummary
  recentCases: Array<{
    caseId: string
    createdAt: string
    baselineKind: 'wispr' | 'provider_direct' | 'manual' | string
    preference: 'vox' | 'baseline' | 'draw' | string
    promptQualityVote: number
    regret: boolean
    note: string | null
  }>
  message: string | null
}

export type VoxRivalsBaselineKind = 'wispr' | 'provider_direct' | 'manual'
export type VoxRivalsPreference = 'vox' | 'baseline' | 'draw'

export interface VoxRivalsCaseCreateRequest {
  /** Optional · ties the case to the Vox session/intent the operator just
   * compared. Backend uses it for joins; UI may omit it. */
  sessionId?: string | null
  intentId?: string | null
  receiptId?: string | null
  baselineKind: VoxRivalsBaselineKind
  preference: VoxRivalsPreference
  /** -1 / 0 / +1. UI converts radio buttons to these literals. */
  promptQualityVote: -1 | 0 | 1
  regret: boolean
  /** ≤ 280 chars by convention — the UI enforces a maxLength to keep
   * payloads tiny. Backend can truncate. */
  note?: string | null
}

export interface VoxRivalsCaseCreateResponse {
  status: VoxResponseStatus
  caseId: string | null
  message: string | null
}

function voxV3Unavailable<T extends { status: VoxResponseStatus; message: string | null }>(
  base: Omit<T, 'status' | 'message'>,
  message: string,
): T {
  return { ...base, status: 'unavailable', message } as T
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const parsed = parseFloat(v)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asNullableNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const parsed = parseFloat(v)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asNullableString(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

function pickAny(src: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (src[k] !== undefined) return src[k]
  }
  return undefined
}

/** GET /ai/vox/gate-v3 — short gate-status snapshot for the overlay. */
export async function voxGateV3Get(): Promise<VoxGateV3Response> {
  const emptyBase = { gateStatus: null as VoxGateV3Status | null, blockers: [] as VoxGateV3Blocker[] }
  if (!HTTP_BASE && MODE !== 'http') {
    return voxV3Unavailable<VoxGateV3Response>(emptyBase, 'Kernel HTTP base não configurado (VITE_ATLAS_SERVER_URL).')
  }
  try {
    const raw = await fetchHttp<unknown>('/ai/vox/gate-v3')
    if (!raw || typeof raw !== 'object') {
      return { ...emptyBase, status: 'error', message: 'Resposta vazia do Kernel para /ai/vox/gate-v3' }
    }
    const r = raw as Record<string, unknown>
    const gateRaw = asString(pickAny(r, ['gateStatus', 'gate_status', 'status']))
    const allowed: VoxGateV3Status[] = ['blocked', 'warming_up', 'ready_for_vitor_review']
    const gateStatus = (allowed as string[]).includes(gateRaw) ? (gateRaw as VoxGateV3Status) : null
    const blockersRaw = (r.blockers ?? r.blocker_list) as unknown
    const blockers: VoxGateV3Blocker[] = Array.isArray(blockersRaw)
      ? blockersRaw
          .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
          .map((b) => ({
            code: asString(pickAny(b, ['code', 'id']), 'unknown'),
            message: asString(pickAny(b, ['message', 'reason', 'detail']), ''),
          }))
      : []
    return {
      status: 'ok',
      gateStatus,
      blockers,
      message: asNullableString(pickAny(r, ['message'])),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/\b404\b/.test(msg)) {
      return voxV3Unavailable<VoxGateV3Response>(emptyBase, 'Kernel ainda não publicou /ai/vox/gate-v3.')
    }
    return { ...emptyBase, status: 'error', message: msg }
  }
}

/** GET /ai/vox/metrics — hard gates + qualitative deltas. */
export async function voxMetricsGet(): Promise<VoxMetricsResponse> {
  const emptyBase = {
    realSessions: 0,
    realSessionsTarget: 0,
    daysOfRealUse: 0,
    daysOfRealUseTarget: 0,
    promptQualityDelta: null as number | null,
    actionRegretScore: null as number | null,
    rivalsVoiceMultiplier: null as number | null,
    hardGates: {
      rawAudioPersistedCount: 0,
      confirmationBypassCount: 0,
      destructiveActionWithoutReceipt: 0,
      eclipseTestSuccessCount: 0,
      eclipseTestRequiredCount: 0,
    } satisfies VoxMetricsHardGates,
  }
  if (!HTTP_BASE && MODE !== 'http') {
    return voxV3Unavailable<VoxMetricsResponse>(emptyBase, 'Kernel HTTP base não configurado (VITE_ATLAS_SERVER_URL).')
  }
  try {
    const raw = await fetchHttp<unknown>('/ai/vox/metrics')
    if (!raw || typeof raw !== 'object') {
      return { ...emptyBase, status: 'error', message: 'Resposta vazia do Kernel para /ai/vox/metrics' }
    }
    const r = raw as Record<string, unknown>
    const hg = (r.hardGates ?? r.hard_gates ?? {}) as Record<string, unknown>
    const hardGates: VoxMetricsHardGates = {
      rawAudioPersistedCount: asNumber(
        pickAny(hg, ['rawAudioPersistedCount', 'raw_audio_persisted_count']),
        0,
      ),
      confirmationBypassCount: asNumber(
        pickAny(hg, ['confirmationBypassCount', 'confirmation_bypass_count']),
        0,
      ),
      destructiveActionWithoutReceipt: asNumber(
        pickAny(hg, [
          'destructiveActionWithoutReceipt',
          'destructive_action_without_receipt',
        ]),
        0,
      ),
      eclipseTestSuccessCount: asNumber(
        pickAny(hg, ['eclipseTestSuccessCount', 'eclipse_test_success_count']),
        0,
      ),
      eclipseTestRequiredCount: asNumber(
        pickAny(hg, [
          'eclipseTestRequiredCount',
          'eclipse_test_required_count',
        ]),
        3,
      ),
    }
    return {
      status: 'ok',
      realSessions: asNumber(pickAny(r, ['realSessions', 'real_sessions']), 0),
      realSessionsTarget: asNumber(
        pickAny(r, ['realSessionsTarget', 'real_sessions_target']),
        0,
      ),
      daysOfRealUse: asNumber(pickAny(r, ['daysOfRealUse', 'days_of_real_use']), 0),
      daysOfRealUseTarget: asNumber(
        pickAny(r, ['daysOfRealUseTarget', 'days_of_real_use_target']),
        0,
      ),
      promptQualityDelta: asNullableNumber(
        pickAny(r, ['promptQualityDelta', 'prompt_quality_delta']),
      ),
      actionRegretScore: asNullableNumber(
        pickAny(r, ['actionRegretScore', 'action_regret_score']),
      ),
      rivalsVoiceMultiplier: asNullableNumber(
        pickAny(r, ['rivalsVoiceMultiplier', 'rivals_voice_multiplier']),
      ),
      hardGates,
      message: asNullableString(pickAny(r, ['message'])),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/\b404\b/.test(msg)) {
      return voxV3Unavailable<VoxMetricsResponse>(emptyBase, 'Kernel ainda não publicou /ai/vox/metrics.')
    }
    return { ...emptyBase, status: 'error', message: msg }
  }
}

/** GET /ai/vox/rivals/report — aggregate + recent rivals cases. */
export async function voxRivalsReportGet(): Promise<VoxRivalsReportResponse> {
  const emptyBase = {
    summary: {
      totalCases: 0,
      voxWins: 0,
      baselineWins: 0,
      draws: 0,
      regrets: 0,
    } satisfies VoxRivalsCaseSummary,
    recentCases: [] as VoxRivalsReportResponse['recentCases'],
  }
  if (!HTTP_BASE && MODE !== 'http') {
    return voxV3Unavailable<VoxRivalsReportResponse>(emptyBase, 'Kernel HTTP base não configurado (VITE_ATLAS_SERVER_URL).')
  }
  try {
    const raw = await fetchHttp<unknown>('/ai/vox/rivals/report')
    if (!raw || typeof raw !== 'object') {
      return { ...emptyBase, status: 'error', message: 'Resposta vazia do Kernel para /ai/vox/rivals/report' }
    }
    const r = raw as Record<string, unknown>
    const sumRaw = (r.summary ?? r.aggregate ?? {}) as Record<string, unknown>
    const summary: VoxRivalsCaseSummary = {
      totalCases: asNumber(pickAny(sumRaw, ['totalCases', 'total_cases']), 0),
      voxWins: asNumber(pickAny(sumRaw, ['voxWins', 'vox_wins']), 0),
      baselineWins: asNumber(pickAny(sumRaw, ['baselineWins', 'baseline_wins']), 0),
      draws: asNumber(pickAny(sumRaw, ['draws']), 0),
      regrets: asNumber(pickAny(sumRaw, ['regrets']), 0),
    }
    const casesRaw = (r.recentCases ?? r.recent_cases ?? r.cases) as unknown
    const recentCases = Array.isArray(casesRaw)
      ? casesRaw
          .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
          .map((c) => ({
            caseId: asString(pickAny(c, ['caseId', 'case_id', 'id']), ''),
            createdAt: asString(pickAny(c, ['createdAt', 'created_at']), ''),
            baselineKind: asString(pickAny(c, ['baselineKind', 'baseline_kind']), 'manual'),
            preference: asString(pickAny(c, ['preference']), 'draw'),
            promptQualityVote: asNumber(
              pickAny(c, ['promptQualityVote', 'prompt_quality_vote']),
              0,
            ),
            regret: Boolean(pickAny(c, ['regret'])),
            note: asNullableString(pickAny(c, ['note'])),
          }))
      : []
    return {
      status: 'ok',
      summary,
      recentCases,
      message: asNullableString(pickAny(r, ['message'])),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/\b404\b/.test(msg)) {
      return voxV3Unavailable<VoxRivalsReportResponse>(emptyBase, 'Kernel ainda não publicou /ai/vox/rivals/report.')
    }
    return { ...emptyBase, status: 'error', message: msg }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Atlas Vox · V3.9 dogfood session evidence (Wave V3.9 / Claude AD)
//
// Distinct from rivals: dogfood = Vitor's diary of REAL Vox usage ("eu
// usei hoje, foi assim"); rivals = head-to-head comparison.
//
// Endpoints:
//   POST /ai/vox/dogfood/session  — record one real Vox session
//   GET  /ai/vox/dogfood/report   — aggregate dogfood report
//
// Honesty contract:
//   - Never sends transcript text, prompt body, audio bytes, or
//     confirmation_token. Only structured signals + an optional ≤1000 char
//     `notes` field of operator-typed context.
//   - When the Kernel returns 404 (not deployed yet) the wrappers report
//     `unavailable` instead of inventing a successful record.

export type VoxDogfoodOutcome = 'success' | 'partial' | 'failed' | 'cancelled'

export interface VoxDogfoodSessionCreateRequest {
  /** Canonical Vox mode used in the session. */
  mode: VoxMode
  outcome: VoxDogfoodOutcome
  /** Optional link to the real edge session id. */
  voxSessionId?: string | null
  /** Optional ISO 8601 timestamp; defaults to created_at on the backend. */
  startedAt?: string | null
  /** Duration of the session in ms. Optional. */
  durationMs?: number | null
  /** Auto-inferred where possible by the overlay; operator may override. */
  usedHotkey?: boolean
  usedRealStt?: boolean
  usedGovernedExecute?: boolean
  regretFlag?: boolean
  eclipseUsed?: boolean
  /** Operator-typed note. Backend caps at 1000 chars — UI enforces matching. */
  note?: string | null
  /** V6-E · envelope automático opcional. O backend sanitiza qualquer campo
   * fora da whitelist canon antes de persistir. Não inclui transcript,
   * prompt body, áudio nem clipboard — só sinais estruturais. */
  autoEvent?: VoxDogfoodAutoEvent | null
}

/**
 * V6-E · `atlas.vox.dogfood_event.v1` — sinais automáticos coletados pelo
 * overlay no fim de cada sessão real. Tudo opcional, tudo
 * estrutural/booleano. NUNCA contém transcript, prompt, áudio ou clipboard.
 */
export interface VoxDogfoodAutoEvent {
  /** Modo sugerido pelo Auto Mode Router (V4) — `null` quando o backend
   * não emitiu sugestão. */
  suggestedMode?: VoxMode | null
  /** Modo final que de fato compilou (operador pode ter trocado). */
  finalMode?: VoxMode | null
  /** True quando operador escolheu modo diferente da sugestão. */
  manualOverride?: boolean
  /** Confiança 0..1 do Auto Mode Router; backend clampeia se vier fora do
   * intervalo. */
  autoRouterConfidence?: number | null
  /** True quando Symbiotic Interlocutor (V5) interveio. */
  interventionPresent?: boolean
  /** Tipo da intervenção (none/clarify/caution/disagree/suggest_better_prompt). */
  interventionKind?:
    | 'none'
    | 'clarify'
    | 'caution'
    | 'disagree'
    | 'suggest_better_prompt'
  /** True se a sessão terminou sem texto transcrito (silêncio/cancel). */
  emptyTranscript?: boolean
  /** True se o STT engine falhou (modelo ausente, runtime error, etc). */
  sttFailed?: boolean
  /** Última ação do operador antes do fim. */
  clickedAction?: 'insert' | 'send' | 'confirm' | 'cancel' | 'none'
  /** Como a sessão foi disparada. `ambient_launch` quando V6-A consumiu o
   * sinal; `ambient_helper` quando V6-B trampolinou; `hotkey` quando
   * Option+Space veio do runtime in-process; `app` quando foi clique no
   * botão Gravar dentro da janela. */
  launchSource?: 'hotkey' | 'ambient_helper' | 'ambient_launch' | 'app' | 'unknown'
  /** Código curto da última falha, se houver. Texto livre PT-BR ≤80 chars. */
  errorKind?: string | null
  /** Sempre `false` (canon V6 · áudio cru nunca persiste). UI pode omitir;
   * backend força `false` antes de gravar. Mantido aqui para auditoria. */
  rawAudioPersisted?: false
}

export interface VoxDogfoodFeedbackResponse {
  status: VoxResponseStatus
  /** Dogfood session id ecoado quando ok; null em erro/unavailable/not_found. */
  dogfoodSessionId: string | null
  regretFlag: boolean | null
  message: string | null
}

export interface VoxDogfoodSessionPayload {
  dogfoodSessionId: string | null
  voxSessionId: string | null
  mode: VoxMode | null
  outcome: VoxDogfoodOutcome | null
  usedHotkey: boolean
  usedRealStt: boolean
  usedGovernedExecute: boolean
  regretFlag: boolean
  eclipseUsed: boolean
  durationMs: number | null
  startedAt: string | null
  createdAt: string | null
}

export interface VoxDogfoodSessionCreateResponse {
  status: VoxResponseStatus
  session: VoxDogfoodSessionPayload | null
  message: string | null
}

export interface VoxDogfoodReportResponse {
  status: VoxResponseStatus
  sessionsTotal: number
  sessionsLast7Days: number
  successRate: number
  partialRate: number
  failedRate: number
  cancelledRate: number
  regretRate: number
  hotkeyUsageRate: number
  realSttUsageRate: number
  governedExecuteUsageCount: number
  eclipseUsedCount: number
  realUsageDays: number
  recommendation: string | null
  message: string | null
}

/** Backend cap is 1000 chars; we mirror it here so the UI can enforce it
 * without an extra round-trip. */
export const VOX_DOGFOOD_NOTE_MAX_CHARS = 1000

/**
 * V6-E · serializa o `VoxDogfoodAutoEvent` para o wire snake_case que o
 * controller Laravel valida. Mantém a única-fonte da nomenclatura aqui;
 * qualquer evolução do schema entra neste local.
 *
 * Garantias:
 *   • `raw_audio_persisted` é hard-coded `false` (V6 canon, áudio cru
 *     nunca persiste — mesmo que o caller envie outro valor).
 *   • Campos não whitelistados são silentemente dropados ANTES de chegar
 *     ao backend; o backend também sanitiza por segurança em dupla camada.
 */
function serializeVoxDogfoodAutoEvent(
  ev: VoxDogfoodAutoEvent,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    raw_audio_persisted: false,
  }
  if (ev.suggestedMode !== undefined && ev.suggestedMode !== null) {
    out.suggested_mode = ev.suggestedMode
  }
  if (ev.finalMode !== undefined && ev.finalMode !== null) {
    out.final_mode = ev.finalMode
  }
  if (typeof ev.manualOverride === 'boolean') {
    out.manual_override = ev.manualOverride
  }
  if (typeof ev.autoRouterConfidence === 'number'
      && Number.isFinite(ev.autoRouterConfidence)) {
    // Clamp client-side também — o backend re-clampeia, mas evitamos uma
    // round-trip de validação para casos triviais.
    out.auto_router_confidence = Math.max(
      0,
      Math.min(1, ev.autoRouterConfidence),
    )
  }
  if (typeof ev.interventionPresent === 'boolean') {
    out.intervention_present = ev.interventionPresent
  }
  if (ev.interventionKind) {
    out.intervention_kind = ev.interventionKind
  }
  if (typeof ev.emptyTranscript === 'boolean') {
    out.empty_transcript = ev.emptyTranscript
  }
  if (typeof ev.sttFailed === 'boolean') {
    out.stt_failed = ev.sttFailed
  }
  if (ev.clickedAction) {
    out.clicked_action = ev.clickedAction
  }
  if (ev.launchSource) {
    out.launch_source = ev.launchSource
  }
  if (typeof ev.errorKind === 'string' && ev.errorKind.length > 0) {
    out.error_kind = ev.errorKind.slice(0, 80)
  }
  return out
}

/** Canonical dogfood outcomes for select/radio inputs. */
export const VOX_DOGFOOD_OUTCOMES: readonly VoxDogfoodOutcome[] = [
  'success',
  'partial',
  'failed',
  'cancelled',
]

/** POST /ai/vox/dogfood/session — Vitor records one real Vox session. */
export async function voxDogfoodSessionCreate(
  request: VoxDogfoodSessionCreateRequest,
): Promise<VoxDogfoodSessionCreateResponse> {
  if (!HTTP_BASE && MODE !== 'http') {
    return {
      status: 'unavailable',
      session: null,
      message: 'Kernel HTTP base não configurado (VITE_ATLAS_SERVER_URL).',
    }
  }
  // Backend uses snake_case + booleans default false; we only forward keys
  // the operator actually set so the backend's defaults stay authoritative.
  const body: Record<string, unknown> = {
    mode: request.mode,
    outcome: request.outcome,
  }
  if (request.voxSessionId) body.vox_session_id = request.voxSessionId
  if (request.startedAt) body.started_at = request.startedAt
  if (typeof request.durationMs === 'number' && request.durationMs >= 0) {
    body.duration_ms = Math.floor(request.durationMs)
  }
  if (typeof request.usedHotkey === 'boolean') body.used_hotkey = request.usedHotkey
  if (typeof request.usedRealStt === 'boolean') body.used_real_stt = request.usedRealStt
  if (typeof request.usedGovernedExecute === 'boolean') {
    body.used_governed_execute = request.usedGovernedExecute
  }
  if (typeof request.regretFlag === 'boolean') body.regret_flag = request.regretFlag
  if (typeof request.eclipseUsed === 'boolean') body.eclipse_used = request.eclipseUsed
  if (request.note !== undefined && request.note !== null && request.note !== '') {
    // UI also enforces this — keep the bridge belt-and-braces.
    body.notes = request.note.slice(0, VOX_DOGFOOD_NOTE_MAX_CHARS)
  }
  if (request.autoEvent && typeof request.autoEvent === 'object') {
    body.auto_event = serializeVoxDogfoodAutoEvent(request.autoEvent)
  }

  try {
    const raw = await fetchHttp<unknown>('/ai/vox/dogfood/session', { method: 'POST', body })
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const sessionRaw = (r.session ?? r) as Record<string, unknown>
    const allowedOutcomes = VOX_DOGFOOD_OUTCOMES as readonly string[]
    const outcomeRaw = asNullableString(pickAny(sessionRaw, ['outcome']))
    const outcome: VoxDogfoodOutcome | null =
      outcomeRaw && allowedOutcomes.includes(outcomeRaw)
        ? (outcomeRaw as VoxDogfoodOutcome)
        : null
    const modeRaw = asNullableString(pickAny(sessionRaw, ['mode']))
    const allowedModes: readonly string[] = [
      'dictation',
      'prompt_polish',
      'intent_compile',
      'governed_execute',
    ]
    const mode: VoxMode | null =
      modeRaw && allowedModes.includes(modeRaw) ? (modeRaw as VoxMode) : null
    return {
      status: 'ok',
      session: {
        dogfoodSessionId: asNullableString(pickAny(sessionRaw, ['dogfoodSessionId', 'dogfood_session_id', 'id'])),
        voxSessionId: asNullableString(pickAny(sessionRaw, ['voxSessionId', 'vox_session_id'])),
        mode,
        outcome,
        usedHotkey: pickAny(sessionRaw, ['usedHotkey', 'used_hotkey']) === true,
        usedRealStt: pickAny(sessionRaw, ['usedRealStt', 'used_real_stt']) === true,
        usedGovernedExecute: pickAny(sessionRaw, ['usedGovernedExecute', 'used_governed_execute']) === true,
        regretFlag: pickAny(sessionRaw, ['regretFlag', 'regret_flag']) === true,
        eclipseUsed: pickAny(sessionRaw, ['eclipseUsed', 'eclipse_used']) === true,
        durationMs: asNullableNumber(pickAny(sessionRaw, ['durationMs', 'duration_ms'])),
        startedAt: asNullableString(pickAny(sessionRaw, ['startedAt', 'started_at'])),
        createdAt: asNullableString(pickAny(sessionRaw, ['createdAt', 'created_at'])),
      },
      message: asNullableString(pickAny(r, ['message'])),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/\b404\b/.test(msg)) {
      return {
        status: 'unavailable',
        session: null,
        message: 'Kernel ainda não publicou /ai/vox/dogfood/session.',
      }
    }
    return { status: 'error', session: null, message: msg }
  }
}

/**
 * V6-E · POST /ai/vox/dogfood/session/{id}/feedback — pisca regret_flag.
 *
 * Usado pelo chip "Funcionou bem" (regretFlag=false) e "Marcar como ruim"
 * (regretFlag=true) que aparece logo após o dogfood automático ser
 * registrado. Idempotente: chamar duas vezes com o mesmo valor mantém o
 * estado coerente.
 *
 * Falhas (404, network, etc.) NUNCA travam o overlay — o chamador trata o
 * `status` e mostra apenas um chip discreto se algo der errado. Nunca
 * mostra stack trace.
 */
export async function voxDogfoodSessionFeedback(
  dogfoodSessionId: string,
  regretFlag: boolean,
): Promise<VoxDogfoodFeedbackResponse> {
  if (!HTTP_BASE && MODE !== 'http') {
    return {
      status: 'unavailable',
      dogfoodSessionId: null,
      regretFlag: null,
      message: 'Kernel HTTP base não configurado (VITE_ATLAS_SERVER_URL).',
    }
  }
  if (!dogfoodSessionId || dogfoodSessionId.trim() === '') {
    return {
      status: 'error',
      dogfoodSessionId: null,
      regretFlag: null,
      message: 'dogfood_session_id ausente',
    }
  }
  try {
    const raw = await fetchHttp<unknown>(
      `/ai/vox/dogfood/session/${encodeURIComponent(dogfoodSessionId)}/feedback`,
      { method: 'POST', body: { regret_flag: regretFlag } },
    )
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const sessionRaw = (r.session ?? {}) as Record<string, unknown>
    const statusRaw = asNullableString(pickAny(r, ['status']))
    if (statusRaw === 'not_found') {
      return {
        status: 'unavailable',
        dogfoodSessionId: null,
        regretFlag: null,
        message: asNullableString(pickAny(r, ['message'])) ?? 'sessão não encontrada',
      }
    }
    return {
      status: 'ok',
      dogfoodSessionId: asNullableString(
        pickAny(sessionRaw, ['dogfoodSessionId', 'dogfood_session_id']),
      ),
      regretFlag: pickAny(sessionRaw, ['regretFlag', 'regret_flag']) === true,
      message: asNullableString(pickAny(r, ['message'])),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/\b404\b/.test(msg)) {
      return {
        status: 'unavailable',
        dogfoodSessionId: null,
        regretFlag: null,
        message: 'Kernel ainda não publicou /ai/vox/dogfood/session/{id}/feedback.',
      }
    }
    return { status: 'error', dogfoodSessionId: null, regretFlag: null, message: msg }
  }
}

/** GET /ai/vox/dogfood/report — aggregate dogfood report. */
export async function voxDogfoodReportGet(): Promise<VoxDogfoodReportResponse> {
  const emptyBase = {
    sessionsTotal: 0,
    sessionsLast7Days: 0,
    successRate: 0,
    partialRate: 0,
    failedRate: 0,
    cancelledRate: 0,
    regretRate: 0,
    hotkeyUsageRate: 0,
    realSttUsageRate: 0,
    governedExecuteUsageCount: 0,
    eclipseUsedCount: 0,
    realUsageDays: 0,
    recommendation: null as string | null,
  }
  if (!HTTP_BASE && MODE !== 'http') {
    return voxV3Unavailable<VoxDogfoodReportResponse>(
      emptyBase,
      'Kernel HTTP base não configurado (VITE_ATLAS_SERVER_URL).',
    )
  }
  try {
    const raw = await fetchHttp<unknown>('/ai/vox/dogfood/report')
    if (!raw || typeof raw !== 'object') {
      return { ...emptyBase, status: 'error', message: 'Resposta vazia do Kernel para /ai/vox/dogfood/report' }
    }
    const r = raw as Record<string, unknown>
    return {
      status: 'ok',
      sessionsTotal: asNumber(pickAny(r, ['sessionsTotal', 'sessions_total']), 0),
      sessionsLast7Days: asNumber(pickAny(r, ['sessionsLast7Days', 'sessions_last_7_days']), 0),
      successRate: asNumber(pickAny(r, ['successRate', 'success_rate']), 0),
      partialRate: asNumber(pickAny(r, ['partialRate', 'partial_rate']), 0),
      failedRate: asNumber(pickAny(r, ['failedRate', 'failed_rate']), 0),
      cancelledRate: asNumber(pickAny(r, ['cancelledRate', 'cancelled_rate']), 0),
      regretRate: asNumber(pickAny(r, ['regretRate', 'regret_rate']), 0),
      hotkeyUsageRate: asNumber(pickAny(r, ['hotkeyUsageRate', 'hotkey_usage_rate']), 0),
      realSttUsageRate: asNumber(pickAny(r, ['realSttUsageRate', 'real_stt_usage_rate']), 0),
      governedExecuteUsageCount: asNumber(pickAny(r, ['governedExecuteUsageCount', 'governed_execute_usage_count']), 0),
      eclipseUsedCount: asNumber(pickAny(r, ['eclipseUsedCount', 'eclipse_used_count']), 0),
      realUsageDays: asNumber(pickAny(r, ['realUsageDays', 'real_usage_days']), 0),
      recommendation: asNullableString(pickAny(r, ['recommendation'])),
      message: asNullableString(pickAny(r, ['message'])),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/\b404\b/.test(msg)) {
      return voxV3Unavailable<VoxDogfoodReportResponse>(
        emptyBase,
        'Kernel ainda não publicou /ai/vox/dogfood/report.',
      )
    }
    return { ...emptyBase, status: 'error', message: msg }
  }
}

/** POST /ai/vox/rivals/case — operator submits a comparison verdict. */
export async function voxRivalsCaseCreate(
  request: VoxRivalsCaseCreateRequest,
): Promise<VoxRivalsCaseCreateResponse> {
  if (!HTTP_BASE && MODE !== 'http') {
    return {
      status: 'unavailable',
      caseId: null,
      message: 'Kernel HTTP base não configurado (VITE_ATLAS_SERVER_URL).',
    }
  }
  const body: Record<string, unknown> = {
    baseline_kind: request.baselineKind,
    preference: request.preference,
    prompt_quality_vote: request.promptQualityVote,
    regret: request.regret,
  }
  if (request.sessionId) body.session_id = request.sessionId
  if (request.intentId) body.intent_id = request.intentId
  if (request.receiptId) body.receipt_id = request.receiptId
  if (request.note !== undefined && request.note !== null) body.note = request.note
  try {
    const raw = await fetchHttp<unknown>('/ai/vox/rivals/case', { method: 'POST', body })
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return {
      status: 'ok',
      caseId: asNullableString(pickAny(r, ['caseId', 'case_id', 'id'])),
      message: asNullableString(pickAny(r, ['message'])),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/\b404\b/.test(msg)) {
      return {
        status: 'unavailable',
        caseId: null,
        message: 'Kernel ainda não publicou /ai/vox/rivals/case.',
      }
    }
    return { status: 'error', caseId: null, message: msg }
  }
}
