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
  CoreStatus,
  DecisionReceipt,
  Message,
  Obra,
  Packet,
  QualityGate,
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

  // 3 · create obra
  async createObra(intent: string, objective: string): Promise<Obra> {
    if (MODE === 'tauri') return invokeTauri<Obra>('bridge_create_obra', { intent, objective })
    if (MODE === 'http')
      return fetchHttp<Obra>('/projects', { method: 'POST', body: { intent, objective } })
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
    if (MODE === 'http') return fetchHttp<Message[]>(`/ai/threads/${threadId}`)
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

  // 7 · send intent
  async sendIntent(sessionId: string, body: string, channel = 'text'): Promise<Message> {
    if (MODE === 'tauri') return invokeTauri<Message>('bridge_send_intent', { sessionId, body, channel })
    if (MODE === 'http')
      return fetchHttp<Message>('/ai/interactions', {
        method: 'POST',
        body: { sessionId, body, channel },
      })
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

  // 11a · list quality gates
  async listGates(): Promise<QualityGate[]> {
    if (MODE === 'tauri') return invokeTauri<QualityGate[]>('bridge_list_gates')
    if (MODE === 'http') return fetchHttp<QualityGate[]>('/tools/gate')
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
}

export type Bridge = typeof bridge
