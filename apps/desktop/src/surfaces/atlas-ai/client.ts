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
  AtlasAiRouterBootstrap,
  AtlasAiRouterReadiness,
  AtlasAiRuntimeReadiness,
  AtlasAwisLearningLoop,
  AtlasServerHealth,
  AtlasWorkspaceArtifactLakeEntry,
  AtlasWorkspaceConversationFusion,
  AtlasDevPlanRequest,
  AtlasDevPlanResult,
} from './types'
import { toAtlasDevPlanHttpBody } from './atlasDevPlanHttpBody'
import { normalisePlanResponse } from '../../components/atlasDev/apiShapes'

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
  const bodyHint = body.toLowerCase()

  if (status === 404) {
    return 'Atlas AI indisponível: rota /ai/threads não encontrada no serviço local.'
  }
  if (status === 401 || status === 403) {
    return 'Atlas AI sem autorização. Verifique a sessão local do Atlas e tente de novo.'
  }
  if (status >= 500 && status < 600) {
    if (
      bodyHint.includes('sqlstate[08006]') ||
      (bodyHint.includes('connection refused') &&
        (bodyHint.includes('pgsql') || bodyHint.includes('postgres') || bodyHint.includes('5433')))
    ) {
      return 'Atlas AI · serviço local indisponível. Inicie o serviço local do Atlas e tente de novo.'
    }

    return 'Atlas AI · serviço local instável. Tente de novo em instantes.'
  }

  try {
    const parsed = JSON.parse(body) as { message?: unknown; error?: { message?: unknown } }
    const message =
      typeof parsed.message === 'string'
        ? parsed.message
        : typeof parsed.error?.message === 'string'
          ? parsed.error.message
          : null
    if (message && message.trim() !== '') {
      return `Atlas AI · http ${status}: ${message.trim().slice(0, 200)}`
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
  changes: {
    title?: string
    summary?: string
    status?: 'active' | 'archived' | 'closed'
    workspace?: string
    metadata?: Record<string, unknown>
  },
): Promise<AiThreadSummary> {
  ensureOnline('updateAiThread')
  const result = await fetchJson<{ thread: AiThreadSummary }>(`/ai/threads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: changes,
  })
  return result.thread
}

export async function deleteAiThread(id: string): Promise<void> {
  ensureOnline('deleteAiThread')
  await fetchJson<{ ok: boolean; deleted_thread_id: string }>(`/ai/threads/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function getWorkspaceConversationFusion(
  workspace: string,
  opts: { limit?: number; threadIds?: string[]; persist?: boolean } = {},
): Promise<AtlasWorkspaceConversationFusion> {
  ensureOnline('getWorkspaceConversationFusion')
  const params = new URLSearchParams()
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.persist) params.set('persist', '1')
  for (const id of opts.threadIds ?? []) {
    if (id.trim() !== '') params.append('thread[]', id)
  }
  const qs = params.toString()
  return fetchJson<AtlasWorkspaceConversationFusion>(
    `/ai/workspaces/${encodeURIComponent(workspace)}/conversation-fusion${qs ? `?${qs}` : ''}`,
  )
}

export async function getWorkspaceArtifactLakeEntry(
  workspace: string,
  artifact: string,
): Promise<AtlasWorkspaceArtifactLakeEntry> {
  ensureOnline('getWorkspaceArtifactLakeEntry')
  const params = new URLSearchParams({ workspace })
  return fetchJson<AtlasWorkspaceArtifactLakeEntry>(
    `/atlas-code/workspace-intelligence/artifact-lake/${encodeURIComponent(artifact)}?${params.toString()}`,
  )
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

/**
 * GET /ai/router-runtime/bootstrap — opcional. O Desktop chama no boot para
 * pre-warm domain/flow/policy hints. **404 e qualquer erro são silenciosos**:
 * a surface continua funcionando sem o payload (front nunca depende dele
 * como fonte de verdade).
 */
export async function getAtlasAiRouterBootstrap(): Promise<AtlasAiRouterBootstrap | null> {
  if (MODE === 'offline') return null
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
    if (token) headers['X-Atlas-Token'] = token
    const response = await fetch(apiUrl('/ai/router-runtime/bootstrap'), {
      method: 'GET',
      headers,
    })
    if (!response.ok) {
      return null // endpoint não deployado (404) ou serviço quente: ignora silenciosamente
    }
    const body = (await response.json()) as { bootstrap?: AtlasAiRouterBootstrap } | AtlasAiRouterBootstrap
    if (body && typeof body === 'object' && 'bootstrap' in body && body.bootstrap) {
      return body.bootstrap
    }
    return body as AtlasAiRouterBootstrap
  } catch {
    return null
  }
}

/**
 * GET /atlas/ai/runtime-readiness — Atlas AI Runtime Readiness & Release Gate.
 * Mesma filosofia silent dos demais readiness endpoints: 404/erro = null, e
 * a Desktop continua funcionando — apenas não exibe o painel de runtime.
 */
export async function getAtlasAiRuntimeReadiness(): Promise<AtlasAiRuntimeReadiness | null> {
  if (MODE === 'offline') return null
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
    if (token) headers['X-Atlas-Token'] = token
    const response = await fetch(apiUrl('/atlas/ai/runtime-readiness'), {
      method: 'GET',
      headers,
    })
    if (!response.ok) return null

    return (await response.json()) as AtlasAiRuntimeReadiness
  } catch {
    return null
  }
}

export async function getAtlasAwisLearningLoop(
  workspace: string,
  task = '',
): Promise<AtlasAwisLearningLoop | null> {
  if (MODE === 'offline') return null
  const params = new URLSearchParams({ workspace })
  if (task.trim() !== '') params.set('task', task.trim())
  try {
    return await fetchJson<AtlasAwisLearningLoop>(
      `/atlas-code/workspace-intelligence/learning-loop?${params.toString()}`,
    )
  } catch {
    return null
  }
}

export async function getAtlasServerHealth(): Promise<AtlasServerHealth | null> {
  if (MODE === 'offline') return null
  try {
    return await fetchJson<AtlasServerHealth>('/health')
  } catch {
    return null
  }
}

/**
 * GET /ai/router-runtime/readiness — opcional. Mesma filosofia do bootstrap:
 * 404/erro = null, Desktop ignora.
 */
export async function getAtlasAiRouterReadiness(): Promise<AtlasAiRouterReadiness | null> {
  if (MODE === 'offline') return null
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
    if (token) headers['X-Atlas-Token'] = token
    const response = await fetch(apiUrl('/ai/router-runtime/readiness'), {
      method: 'GET',
      headers,
    })
    if (!response.ok) return null
    const body = (await response.json()) as { readiness?: AtlasAiRouterReadiness } | AtlasAiRouterReadiness
    if (body && typeof body === 'object' && 'readiness' in body && body.readiness) {
      return body.readiness
    }
    return body as AtlasAiRouterReadiness
  } catch {
    return null
  }
}

/**
 * Sentinel error thrown when the Atlas Dev plan-only endpoint is unavailable
 * to this Desktop surface — either because the backend hasn't deployed the
 * route yet (404) or because the operator hasn't opted in the Desktop
 * integration flag (503 ATLAS_DEV_DESKTOP_DISABLED / ATLAS_DEV_PLAN_DISABLED).
 * Both cases collapse here so the composer can render the same "fallback to
 * legacy chat" hint without leaking technical HTTP codes to the operator.
 */
export class AtlasDevPlanUnavailableError extends Error {
  constructor(message = 'Plano técnico indisponível no serviço local.') {
    super(message)
    this.name = 'AtlasDevPlanUnavailableError'
  }
}

/**
 * POST /ai/interactions/atlas-dev/plan
 *
 * Plan-only: backend executes Schemas/Discovery/PromptProjection up to the
 * provider boundary, then returns the artefacts; **NO** provider is invoked
 * and NO patch is applied. Desktop uses this to render Contexto/Plano tabs
 * before the operator decides to run anything.
 *
 * Treats 404 as "endpoint not deployed yet" and surfaces a typed error so the
 * surface can fall back to the legacy chat flow without exploding.
 */
export async function postAtlasDevPlan(
  request: AtlasDevPlanRequest,
): Promise<AtlasDevPlanResult> {
  ensureOnline('postAtlasDevPlan')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
  if (token) headers['X-Atlas-Token'] = token

  const response = await fetch(apiUrl('/ai/interactions/atlas-dev/plan'), {
    method: 'POST',
    headers,
    body: JSON.stringify(toAtlasDevPlanHttpBody(request)),
  })

  if (response.status === 404) {
    throw new AtlasDevPlanUnavailableError(
      'Plano técnico ainda não está disponível no serviço local.',
    )
  }
  // HTTP 503 + ATLAS_DEV_*_DISABLED → flag desligada no atlas-server.
  // Mantemos a UI no estado "ainda não disponível" em vez de exibir um
  // erro técnico genérico ao operador. (Composer já cai no chat legado.)
  if (response.status === 503) {
    const peek = await response.clone().text()
    if (peek.includes('ATLAS_DEV_PLAN_DISABLED') || peek.includes('ATLAS_DEV_DESKTOP_DISABLED')) {
      throw new AtlasDevPlanUnavailableError(
        'Atlas Dev plan-only desabilitado por feature flag · habilite ATLAS_DEV_EFFICIENT_PLAN_ENABLED e ATLAS_DEV_EFFICIENT_DESKTOP_ENABLED.',
      )
    }
  }
  if (!response.ok) {
    const body = await response.text()
    throw new Error(compactHttpError(response.status, body))
  }

  const parsed = (await response.json()) as unknown

  const normalised = normalisePlanResponse(parsed)
  if (!normalised) {
    throw new Error('Atlas AI · resposta inesperada do plan endpoint.')
  }
  return normalised
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
