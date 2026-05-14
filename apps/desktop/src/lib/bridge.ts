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
    programmingGovernance: adaptProgrammingGovernance(
      r.programming_governance ?? r.programmingGovernance,
    ),
    generatedAt: String(r.generated_at ?? r.generatedAt ?? ''),
  }
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
