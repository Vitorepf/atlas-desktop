/**
 * apps/desktop/src/lib/bridge.ts
 *
 * Single transport boundary the React shell talks to. Dispatch order:
 *   1. Tauri    → invoke() the matching `bridge_*` command in atlas-tauri
 *   2. HTTP     → fetch() against atlas-server (browser fallback when
 *                 VITE_ATLAS_SERVER_URL is set)
 *   3. Offline  → returns honest empty values (NOT fake data)
 *
 * CANON · feedback_atlas_no_mock.md
 *   When neither Tauri nor HTTP is reachable, we DO NOT invent records.
 *   Components render empty states. The bridge mode badge says "mock"
 *   to make the offline state explicit.
 */

import type {
  CartographyGraph,
  CartographyNote,
  CoreStatus,
  DecisionReceipt,
  Message,
  Obra,
  Packet,
  QualityGate,
  RecentChange,
  Session,
} from '@atlas/domain'

import {
  browserCoreStatus,
  noGates,
  noMessages,
  noPackets,
  noReceipt,
  noSessions,
} from '../data/mock'

// ──────────────────────────────────────────────────────────────────────────
// Mode detection

export type BridgeMode = 'tauri' | 'http' | 'mock'

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
  return 'mock'
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
  return response.json() as Promise<T>
}

/** Throws explicitly when offline so useBridge can report errors honestly. */
function offline(method: string): never {
  throw new Error(`offline · ${method} · neither Tauri nor VITE_ATLAS_SERVER_URL configured`)
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
// Bridge surface · 12 typed functions matching the audit
// In OFFLINE mode, returns empty/neutral values (NOT fake data).

export const bridge = {
  mode: MODE as BridgeMode,

  // 0 · core status
  async coreStatus(): Promise<CoreStatus> {
    if (MODE === 'tauri') return invokeTauri<CoreStatus>('atlas_core_status')
    return browserCoreStatus
  },

  // 1 · health
  async health(): Promise<HealthDto> {
    if (MODE === 'tauri') return invokeTauri<HealthDto>('bridge_health')
    if (MODE === 'http') return fetchHttp<HealthDto>('/health')
    return { kernel: 'offline', providers: [], mcp: [], queue: 0 }
  },

  // 2 · list obras
  async listObras(): Promise<Obra[]> {
    if (MODE === 'tauri') return invokeTauri<Obra[]>('bridge_list_obras')
    if (MODE === 'http') return fetchHttp<Obra[]>('/projects')
    return []
  },

  // 3 · create obra · sends intent+objective (passo-3.5 wrap) + the legacy
  // fields atlas-server still requires (domain, title for non-MVP clients).
  async createObra(intent: string, objective: string, domain = 'atlas'): Promise<Obra> {
    if (MODE === 'tauri') return invokeTauri<Obra>('bridge_create_obra', { intent, objective, domain })
    if (MODE === 'http') {
      const wrap = await fetchHttp<{ project?: Record<string, unknown> }>('/projects', {
        method: 'POST',
        body: {
          intent,
          objective,
          domain,
          title: objective || `Atlas Code · ${new Date().toLocaleTimeString('pt-BR')}`,
        },
      })
      const p = (wrap.project ?? wrap) as Record<string, unknown>
      return {
        id: (p.id ?? '') as string,
        title: (p.title ?? '') as string,
        objective: (p.objective ?? p.description ?? p.goal ?? p.title ?? objective) as string,
        status: ((p.status as Obra['status']) ?? 'active'),
        workspacePath: (p.workspace_path ?? p.workspacePath ?? '') as string,
        createdAt: (p.created_at ?? p.createdAt ?? new Date().toISOString()) as string,
      }
    }
    offline('createObra')
  },

  // 4 · list sessions for obra
  async listSessions(obraId: string): Promise<Session[]> {
    if (MODE === 'tauri') return invokeTauri<Session[]>('bridge_list_sessions', { obraId })
    if (MODE === 'http') return fetchHttp<Session[]>(`/atlas-code/works/${obraId}/sessions`)
    return []
  },

  // 5 · get session messages
  async getSession(threadId: string): Promise<Message[]> {
    if (MODE === 'tauri') return invokeTauri<Message[]>('bridge_get_session', { threadId })
    if (MODE === 'http') {
      const wrap = await fetchHttp<{ thread?: { messages?: unknown[] } }>(`/ai/threads/${threadId}`)
      return normaliseAiMessages(wrap?.thread?.messages ?? [])
    }
    return noMessages
  },

  // 6 · stream session events
  /**
   * Tauri: kicks off backend stream + listens via Tauri events.
   * HTTP : opens an EventSource.
   * Offline: no-op (returns a no-op unsubscribe).
   */
  streamSession(traceId: string, onEvent: (event: StreamEventDto) => void): () => void {
    if (MODE === 'tauri') {
      let unlisten: (() => void) | null = null
      void (async () => {
        const tauri = await import('@tauri-apps/api/core')
        const eventApi = await import('@tauri-apps/api/event')
        unlisten = await eventApi.listen<StreamEventDto>(`bridge://stream/${traceId}`, (e) => {
          onEvent(e.payload)
        })
        await tauri.invoke('bridge_stream_session', { traceId, afterSequence: null })
      })()
      return () => {
        if (unlisten) unlisten()
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
      return invokeTauri<{ traceId: string; threadId?: string }>('bridge_send_intent', {
        threadId, body, channel, obraId,
      })
    }
    if (MODE === 'http') {
      const payload: Record<string, unknown> = {
        input_text: body,
        source_type: 'app',
        kind: 'interaction',
      }
      if (threadId) payload.thread_id = threadId
      else payload.new_thread = true
      // Vincula a thread à obra (AtlasProject) para que /atlas-code/works/{id}/sessions
      // encontre essa thread via source_id (AiInteractionController salva isso).
      if (obraId) payload.source_id = obraId
      const res = await fetchHttp<{ trace?: { id?: string; thread_id?: string } }>('/ai/interactions', {
        method: 'POST',
        body: payload,
      })
      return {
        traceId: (res.trace?.id ?? '') as string,
        threadId: (res.trace?.thread_id ?? threadId ?? undefined) as string | undefined,
      }
    }
    offline('sendIntent')
  },

  // 8 · get receipt
  async getReceipt(decisionId: string): Promise<DecisionReceipt> {
    if (MODE === 'tauri') return invokeTauri<DecisionReceipt>('bridge_get_receipt', { decisionId })
    if (MODE === 'http') return fetchHttp<DecisionReceipt>(`/ai/decisions/${decisionId}`)
    return noReceipt
  },

  // 9 · sign receipt
  async signReceipt(decisionId: string, signature: ReceiptSignaturePayload): Promise<SignedReceiptAck> {
    if (MODE === 'tauri')
      return invokeTauri<SignedReceiptAck>('bridge_sign_receipt', { decisionId, signature })
    if (MODE === 'http')
      return fetchHttp<SignedReceiptAck>(`/atlas-code/decisions/${decisionId}/sign`, {
        method: 'POST',
        body: signature,
      })
    offline('signReceipt')
  },

  // 10 · list evidence by obra
  async listEvidence(obraId: string): Promise<EvidenceDto[]> {
    if (MODE === 'tauri') return invokeTauri<EvidenceDto[]>('bridge_list_evidence', { obraId })
    if (MODE === 'http') return fetchHttp<EvidenceDto[]>(`/atlas-code/works/${obraId}/evidence`)
    return []
  },

  // 11a · list quality gates · atlas-server returns `{ runs: [...] }` with
  // tool_slug + status; we map each run to a QualityGate.
  async listGates(): Promise<QualityGate[]> {
    if (MODE === 'tauri') return invokeTauri<QualityGate[]>('bridge_list_gates')
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

  async listPackets(_obraId: string): Promise<Packet[]> {
    return noPackets
  },

  // ────────────────────────────────────────────────────────────────────────
  // CARTOGRAPHY · read-only surface · 3 calls
  // The atlas-server endpoints (/atlas-cartography/*) are GET-only by canon.
  // Cartografia nunca escreve no filesystem; só audita.

  async loadCartographyGraph(): Promise<CartographyGraph | null> {
    if (MODE === 'tauri')
      return invokeTauri<CartographyGraph | null>('bridge_cartography_graph')
    if (MODE === 'http') {
      try {
        const raw = await fetchHttp<unknown>('/atlas-cartography/graph')
        return adaptCartographyGraph(raw)
      } catch (e) {
        console.warn('[bridge] cartography graph offline', e)
        return null
      }
    }
    return null
  },

  async loadCartographyRecentChanges(): Promise<RecentChange[]> {
    if (MODE === 'tauri')
      return invokeTauri<RecentChange[]>('bridge_cartography_recent_changes')
    if (MODE === 'http') {
      try {
        const raw = await fetchHttp<{ changes?: unknown[] }>(
          '/atlas-cartography/recent-changes'
        )
        return adaptRecentChanges(raw?.changes ?? [])
      } catch {
        return []
      }
    }
    return []
  },

  async loadCartographyNote(graphId: string): Promise<CartographyNote | null> {
    if (MODE === 'tauri')
      return invokeTauri<CartographyNote | null>('bridge_cartography_note', { graphId })
    if (MODE === 'http') {
      try {
        const raw = await fetchHttp<Record<string, unknown>>(
          `/atlas-cartography/note/${encodeURIComponent(graphId)}`
        )
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
    }
    return null
  },
}

export type Bridge = typeof bridge

// ──────────────────────────────────────────────────────────────────────────
// Normalisers from atlas-server snake_case shapes to @atlas/domain camelCase

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
// Cartography adapters · backend snake_case → @atlas/domain camelCase

function adaptCartographyGraph(raw: unknown): CartographyGraph | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const audit = (r.audit as Record<string, unknown> | undefined) ?? {}
  const sources = (r.sources as Record<string, unknown> | undefined) ?? {}
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

  return {
    audit: {
      found: Number(audit.pieces_found ?? 0),
      missing: Number(audit.pieces_missing ?? 0),
      generatedAt: (r.generated_at as string | null) ?? null,
      repoIndexed: Number(sources.repo_indexed_count ?? 0),
      vaultIndexed: Number(sources.vault_indexed_count ?? 0),
    },
    universe,
    pipeline,
    lanes,
    connections,
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

function normaliseAiMessages(raw: unknown[]): Message[] {
  const out: Message[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const m = item as Record<string, unknown>
    const id = m.id as string | undefined
    if (!id) continue
    const roleRaw = (m.role as string | undefined) ?? 'system'
    const role = roleRaw === 'assistant' ? 'atlas' : roleRaw === 'user' ? 'user' : 'system'
    const content = m.content
    const body = typeof content === 'string'
      ? content
      : content && typeof content === 'object' && 'text' in content
        ? String((content as { text: unknown }).text ?? '')
        : JSON.stringify(content ?? '')
    const tsRaw = (m.occurred_at ?? m.created_at ?? '') as string
    out.push({
      id,
      role: role as Message['role'],
      body,
      ts: tsRaw ? new Date(tsRaw).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    })
  }
  return out
}
