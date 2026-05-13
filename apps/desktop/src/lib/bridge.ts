/**
 * apps/desktop/src/lib/bridge.ts
 *
 * The single transport boundary the React shell talks to. Dispatches in
 * priority order:
 *   1. Tauri    → invoke()s the matching `bridge_*` command in atlas-tauri
 *   2. HTTP     → fetch() against atlas-server (browser fallback when
 *                  VITE_ATLAS_SERVER_URL is set)
 *   3. Mock     → returns canned payloads from src/data/mock.ts
 *
 * Mode is decided at module load by `detectMode()`. Components never reach
 * around the bridge — if it's not exposed here, the UI doesn't have it.
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
  coreStatus as mockCoreStatus,
  gates as mockGates,
  messages as mockMessages,
  obra as mockObra,
  packets as mockPackets,
  receipt as mockReceipt,
  recentSessions as mockRecentSessions,
  sessions as mockSessions,
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
// Tauri / HTTP / Mock dispatch helpers

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const tauri = await import('@tauri-apps/api/core')
  return tauri.invoke<T>(cmd, args)
}

async function fetchHttp<T>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const response = await fetch(`${HTTP_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`bridge http ${response.status}: ${body}`)
  }
  return response.json() as Promise<T>
}

// ──────────────────────────────────────────────────────────────────────────
// Bridge surface · 12 typed functions matching the audit

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

export const bridge = {
  mode: MODE as BridgeMode,

  // 0 · core status (Tauri command, mock fallback)
  async coreStatus(): Promise<CoreStatus> {
    if (MODE === 'tauri') return invokeTauri<CoreStatus>('atlas_core_status')
    return mockCoreStatus
  },

  // 1 · health
  async health(): Promise<HealthDto> {
    if (MODE === 'tauri') return invokeTauri<HealthDto>('bridge_health')
    if (MODE === 'http') return fetchHttp<HealthDto>('/api/health')
    return { kernel: 'mock', providers: ['claude', 'codex'], mcp: ['atlas-open-brain'], queue: 0 }
  },

  // 2 · list obras
  async listObras(): Promise<Obra[]> {
    if (MODE === 'tauri') return invokeTauri<Obra[]>('bridge_list_obras')
    if (MODE === 'http') return fetchHttp<Obra[]>('/api/projects')
    return [mockObra]
  },

  // 3 · create obra
  async createObra(intent: string, objective: string): Promise<Obra> {
    if (MODE === 'tauri') return invokeTauri<Obra>('bridge_create_obra', { intent, objective })
    if (MODE === 'http') return fetchHttp<Obra>('/api/projects', { method: 'POST', body: { intent, objective } })
    return { ...mockObra, id: `OBRA-${Date.now()}`, objective, title: objective }
  },

  // 4 · list sessions for obra
  async listSessions(obraId: string): Promise<Session[]> {
    if (MODE === 'tauri') return invokeTauri<Session[]>('bridge_list_sessions', { obraId })
    if (MODE === 'http') return fetchHttp<Session[]>(`/api/atlas-code/works/${obraId}/sessions`)
    return mockSessions.filter((s) => s.obraId === obraId)
  },

  // 5 · get session messages
  async getSession(threadId: string): Promise<Message[]> {
    if (MODE === 'tauri') return invokeTauri<Message[]>('bridge_get_session', { threadId })
    if (MODE === 'http') return fetchHttp<Message[]>(`/api/ai/threads/${threadId}`)
    return mockMessages
  },

  // 6 · stream session events
  /**
   * In Tauri mode, kicks off a backend stream and listens via tauri events.
   * In HTTP mode, opens an EventSource. In mock mode, no-op.
   * Returns an unsubscribe function.
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
      const es = new EventSource(`${HTTP_BASE}/api/ai/interactions/${traceId}/stream`)
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
      /* mock mode · no stream */
    }
  },

  // 7 · send intent
  async sendIntent(sessionId: string, body: string, channel = 'text'): Promise<Message> {
    if (MODE === 'tauri') return invokeTauri<Message>('bridge_send_intent', { sessionId, body, channel })
    if (MODE === 'http')
      return fetchHttp<Message>('/api/ai/interactions', {
        method: 'POST',
        body: { sessionId, body, channel },
      })
    return {
      id: `mock-${Date.now()}`,
      role: 'user',
      body,
      channel: channel as 'text' | 'voice',
      ts: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
  },

  // 8 · get receipt
  async getReceipt(decisionId: string): Promise<DecisionReceipt> {
    if (MODE === 'tauri') return invokeTauri<DecisionReceipt>('bridge_get_receipt', { decisionId })
    if (MODE === 'http') return fetchHttp<DecisionReceipt>(`/api/ai/decisions/${decisionId}`)
    return mockReceipt
  },

  // 9 · sign receipt
  async signReceipt(decisionId: string, signature: ReceiptSignaturePayload): Promise<SignedReceiptAck> {
    if (MODE === 'tauri')
      return invokeTauri<SignedReceiptAck>('bridge_sign_receipt', { decisionId, signature })
    if (MODE === 'http')
      return fetchHttp<SignedReceiptAck>(`/api/atlas-code/decisions/${decisionId}/sign`, {
        method: 'POST',
        body: signature,
      })
    return { decisionId, signatureValid: true, ledgerEventId: `evt-mock-${Date.now()}` }
  },

  // 10 · list evidence by obra
  async listEvidence(obraId: string): Promise<EvidenceDto[]> {
    if (MODE === 'tauri') return invokeTauri<EvidenceDto[]>('bridge_list_evidence', { obraId })
    if (MODE === 'http') return fetchHttp<EvidenceDto[]>(`/api/atlas-code/works/${obraId}/evidence`)
    return []
  },

  // 11a · list quality gates
  async listGates(): Promise<QualityGate[]> {
    if (MODE === 'tauri') return invokeTauri<QualityGate[]>('bridge_list_gates')
    if (MODE === 'http') return fetchHttp<QualityGate[]>('/api/tools/gate')
    return mockGates
  },

  // 11b · run a quality gate
  async runGate(gateId: string): Promise<{ gateId: string; runId: string; state: string }> {
    if (MODE === 'tauri') return invokeTauri('bridge_run_gate', { gateId })
    if (MODE === 'http')
      return fetchHttp(`/api/tools/${gateId}/run`, { method: 'POST', body: {} })
    return { gateId, runId: `run-mock-${Date.now()}`, state: 'pending' }
  },

  // 12 · apply diff
  async applyDiff(patchId: string, runGates: string[]): Promise<ApplyDiffAck> {
    if (MODE === 'tauri') return invokeTauri<ApplyDiffAck>('bridge_apply_diff', { patchId, runGates })
    if (MODE === 'http')
      return fetchHttp<ApplyDiffAck>(`/api/atlas-code/diffs/${patchId}/apply`, {
        method: 'POST',
        body: { confirm: true, runGates },
      })
    return {
      engineeringRunId: `run-mock-${Date.now()}`,
      diffApplied: true,
      gatesRunning: runGates,
      streamUrl: '',
    }
  },

  // bonus convenience for sidebar (mock-derived)
  async listRecentSessions(): Promise<Session[]> {
    if (MODE === 'mock') return mockRecentSessions
    // server side: filter sessions by status=done; fallback to mock if not implemented yet
    try {
      const all = MODE === 'tauri'
        ? await invokeTauri<Session[]>('bridge_list_obras')
        : await fetchHttp<Session[]>('/api/ai/threads?status=done')
      // best effort — server shape may vary
      return Array.isArray(all) ? mockRecentSessions : mockRecentSessions
    } catch {
      return mockRecentSessions
    }
  },

  async listPackets(_obraId: string): Promise<Packet[]> {
    // No dedicated endpoint yet — packets surface inside session events.
    return mockPackets
  },
}

export type Bridge = typeof bridge
