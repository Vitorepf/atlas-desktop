/**
 * Atlas AI · light-weight HTTP client.
 *
 * Tauri / HTTP / Offline aware. Não toca em `lib/bridge.ts` para evitar conflito
 * com trabalhos paralelos (Meta 2). Mantém o mesmo padrão (X-Atlas-Token via
 * VITE_ATLAS_TOKEN) usado pela bridge canônica.
 */

import type {
  AiThreadDetail,
  AiThreadListFilters,
  AiThreadSummary,
  AiTrace,
  AtlasAiInteractionRequest,
  AtlasAiInteractionResponse,
} from './types'

export type AtlasAiBridgeMode = 'tauri' | 'http' | 'offline'

interface BridgeEnvShape {
  __TAURI__?: unknown
  __TAURI_INTERNALS__?: unknown
}

function detectMode(): AtlasAiBridgeMode {
  if (typeof window === 'undefined') return 'offline'
  const w = window as Window & BridgeEnvShape
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return 'tauri'
  if (import.meta.env.VITE_ATLAS_SERVER_URL) return 'http'
  return 'offline'
}

const MODE: AtlasAiBridgeMode = detectMode()
const HTTP_BASE = (import.meta.env.VITE_ATLAS_SERVER_URL as string | undefined) ?? ''

/**
 * apiUrl · resolves request URL against VITE_ATLAS_SERVER_URL.
 *
 * Canon: o Atlas server Laravel serve as rotas Atlas AI em `/ai/*` (NÃO em
 * `/api/ai/*`). O atlas-app mobile chama exatamente `${base}/ai/threads`.
 * Antes o desktop forçava prefixo `/api`, causando 404. Agora:
 *
 *   1. Se base for vazio, fallback `/api${path}` (modo standalone via dev proxy)
 *   2. Se base termina com `/api`, mantém compat: `${base}${path}` (legado)
 *   3. Caso contrário, chama direto `${base}${path}` — igual mobile.
 *
 * Test: curl -H "X-Atlas-Token: $T" http://127.0.0.1:8001/ai/threads → 200.
 */
function apiUrl(path: string): string {
  const base = HTTP_BASE.replace(/\/+$/, '')
  if (!base) return `/api${path}`
  if (base.endsWith('/api')) return `${base}${path}`
  return `${base}${path}`
}

function compactHttpError(status: number, body: string): string {
  if (status === 404) {
    return 'Atlas AI indisponível: rota /api/ai/threads não encontrada no backend ativo.'
  }
  if (status === 401 || status === 403) {
    return 'Atlas AI sem autorização: verifique o token VITE_ATLAS_TOKEN ou a sessão do backend.'
  }
  if (status >= 500 && status < 600) {
    return `Atlas AI · backend respondeu ${status}. Tente novamente em instantes.`
  }

  try {
    const parsed = JSON.parse(body) as { message?: unknown }
    if (typeof parsed.message === 'string' && parsed.message.trim() !== '') {
      return `Atlas AI · http ${status}: ${parsed.message.trim().slice(0, 200)}`
    }
  } catch {
    /* keep raw compact fallback */
  }

  const compact = body.replace(/\s+/g, ' ').trim().slice(0, 180)
  return `Atlas AI · http ${status}${compact ? `: ${compact}` : ''}`
}

export function atlasAiBridgeMode(): AtlasAiBridgeMode {
  return MODE
}

async function fetchJson<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
  if (token) headers['X-Atlas-Token'] = token

  const response = await fetch(apiUrl(path), {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(compactHttpError(response.status, body))
  }
  return (await response.json()) as T
}

function ensureOnline(method: string): void {
  if (MODE === 'offline') {
    throw new Error(
      `Atlas AI offline · ${method} indisponível sem Tauri ou VITE_ATLAS_SERVER_URL configurado.`,
    )
  }
}

export async function listAiThreads(filters: AiThreadListFilters = {}): Promise<AiThreadSummary[]> {
  ensureOnline('listAiThreads')
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.workspace) params.set('workspace', filters.workspace)
  if (filters.surface) params.set('surface', filters.surface)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.light) params.set('light', '1')
  const qs = params.toString()
  const result = await fetchJson<{ threads: AiThreadSummary[] }>(
    `/ai/threads${qs ? `?${qs}` : ''}`,
  )
  return result.threads
}

export async function createAiThread(input: {
  title?: string
  workspace?: string | null
  surface?: string
  source_type?: string
  metadata?: Record<string, unknown>
}): Promise<AiThreadSummary> {
  ensureOnline('createAiThread')
  const result = await fetchJson<{ thread: AiThreadSummary }>(`/ai/threads`, {
    method: 'POST',
    body: {
      title: input.title ?? 'Atlas AI · nova conversa',
      workspace: input.workspace ?? undefined,
      surface: input.surface ?? 'atlas_desktop_ai',
      source_type: input.source_type ?? 'desktop',
      metadata: input.metadata ?? {},
    },
  })
  return result.thread
}

export async function getAiThread(id: string): Promise<AiThreadDetail> {
  ensureOnline('getAiThread')
  const result = await fetchJson<{ thread: AiThreadDetail }>(`/ai/threads/${encodeURIComponent(id)}`)
  return result.thread
}

export async function updateAiThread(
  id: string,
  changes: { title?: string; summary?: string; status?: 'active' | 'archived' | 'closed'; metadata?: Record<string, unknown> },
): Promise<AiThreadSummary> {
  ensureOnline('updateAiThread')
  const result = await fetchJson<{ thread: AiThreadSummary }>(`/ai/threads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: changes,
  })
  return result.thread
}

export async function createAiInteraction(
  request: AtlasAiInteractionRequest,
): Promise<AtlasAiInteractionResponse> {
  ensureOnline('createAiInteraction')
  return fetchJson<AtlasAiInteractionResponse>(`/ai/interactions`, {
    method: 'POST',
    body: request,
  })
}

export async function getAiTrace(traceId: string): Promise<AiTrace> {
  ensureOnline('getAiTrace')
  const result = await fetchJson<{ trace: AiTrace }>(`/ai/interactions/${encodeURIComponent(traceId)}`)
  return result.trace
}

// ──────────────────────────────────────────────────────────────────────────
// Atlas Dev-to-Forge Promotion
//
// Meta 8.5 reconciliation: the canonical bridge lives in
// `lib/devToForgeBridge.ts` and is exposed via `lib/bridge.ts` as
// `devToForgeBridge`. This surface re-exports the bridge instance + canonical
// types so AtlasAiPromotionPanel keeps a thin local import surface without
// duplicating the contract.
//
// Schema canon: atlas.code.dev_to_forge.promotion_candidate.v1
// Routes canon: /atlas-code/dev-to-forge/*
// Doc canon:    docs/engineering-knowledge-base/atlas-ai-conversation-surface-and-atlas-dev-v1.md

export { devToForgeBridge } from '../../lib/bridge'
export type {
  AtlasCodePromotionCandidate,
  AtlasCodePromotionPayloadOverrides,
  AtlasCodePromotionPreview,
  AtlasCodePromotionSignalReport,
  AtlasCodePromotionTarget,
} from '@atlas/domain'
