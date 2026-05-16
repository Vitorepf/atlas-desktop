/**
 * Atlas Dev · Run + SSE + Status REST client.
 *
 * Endpoints (locked in atlas-dev-efficient-programming-flow-v1 §26.1):
 *   POST /ai/interactions/atlas-dev/run
 *   GET  /ai/interactions/atlas-dev/runs/{run_id}/stream    (SSE primary)
 *   GET  /ai/interactions/atlas-dev/runs/{run_id}           (REST fallback)
 *
 * Notes:
 *   - The `confirmation_token` MUST NEVER be logged. We redact it from any
 *     dev console output and never include it in error messages.
 *   - Network errors and 4xx are translated into `AtlasDevRunError`s with a
 *     `requires_replan` flag so the UI can prompt for a fresh plan.
 */

import type {
  AtlasDevRunError,
  AtlasDevRunRequest,
  AtlasDevRunStatusResponse,
  AtlasDevSseEvent,
} from './types'
import { AtlasDevSseDecoder } from './sseParser.ts'
import { normalizeRunStartResponse, normalizeRunStatusResponse } from './apiShapes.ts'

export { normalizeRunStartResponse, normalizeRunStatusResponse } from './apiShapes.ts'

const ENV = ((import.meta as ImportMeta & {
  env?: Record<string, string | undefined>
}).env ?? {})

const HTTP_BASE = ENV.VITE_ATLAS_SERVER_URL ?? ''
const ATLAS_TOKEN = ENV.VITE_ATLAS_TOKEN

function apiUrl(path: string): string {
  const base = HTTP_BASE.replace(/\/+$/, '')
  if (!base) return `/api${path}`
  if (base.endsWith('/api')) return `${base}${path}`
  return `${base}${path}`
}

function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra ?? {})
  if (ATLAS_TOKEN) headers.set('X-Atlas-Token', ATLAS_TOKEN)
  return headers
}

/**
 * Strip the confirmation_token from any error body before surfacing it.
 * Defence-in-depth: if the backend echoes back the body, we still redact.
 */
function redactTokens(input: string, confirmationToken: string): string {
  if (!confirmationToken) return input
  const escaped = confirmationToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return input.replace(new RegExp(escaped, 'g'), '«redacted»')
}

function classifyError(status: number, bodyText: string, confirmationToken: string): AtlasDevRunError {
  const message = redactTokens(bodyText, confirmationToken)
  if (status === 403) {
    return {
      kind: 'invalid_token',
      status,
      message: parseHumanMessage(message) ?? 'Token de confirmação inválido, expirado ou já utilizado.',
      requires_replan: true,
    }
  }
  if (status === 422) {
    return {
      kind: 'invalid_hash',
      status,
      message: parseHumanMessage(message) ?? 'task_contract_hash inválido ou ausente.',
      requires_replan: true,
    }
  }
  if (status === 400) {
    return {
      kind: 'forbidden',
      status,
      message: parseHumanMessage(message) ?? 'operator_confirmed=true é obrigatório.',
      requires_replan: false,
    }
  }
  return {
    kind: 'unknown',
    status,
    message: parseHumanMessage(message) ?? `http ${status}`,
    requires_replan: status === 410,
  }
}

function parseHumanMessage(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { message?: unknown }
    if (typeof parsed.message === 'string' && parsed.message.trim() !== '') {
      return parsed.message.trim().slice(0, 240)
    }
  } catch {
    /* not JSON */
  }
  const compact = body.replace(/\s+/g, ' ').trim()
  return compact === '' ? null : compact.slice(0, 240)
}

/**
 * POST /ai/interactions/atlas-dev/run.
 *
 * Returns the immediate accept body (typically `{ ok: true, run_id }`). The
 * receipt/diff/tests come over SSE — callers should open the stream right
 * after this resolves.
 */
export async function runAtlasDev(input: AtlasDevRunRequest): Promise<{ ok: true; run_id: string }> {
  const response = await fetch(apiUrl('/ai/interactions/atlas-dev/run'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const body = await response.text()
    throw classifyError(response.status, body, input.confirmation_token)
  }

  const parsed = (await response.json()) as unknown
  const normalized = normalizeRunStartResponse(parsed)
  if (!normalized) {
    throw {
      kind: 'unknown',
      message: 'Resposta inesperada do backend ao iniciar run.',
      requires_replan: false,
    } satisfies AtlasDevRunError
  }
  return normalized
}


export interface StreamHandlers {
  onEvent: (event: AtlasDevSseEvent) => void
  onError: (error: AtlasDevRunError) => void
  onClose: () => void
}

export interface StreamHandle {
  close(): void
}

/**
 * Open the SSE stream for a given run. Uses `fetch` + ReadableStream so we can
 * attach auth headers (EventSource cannot). On any error or `done`, calls
 * `onClose` exactly once — caller is expected to fall back to REST.
 */
export function streamAtlasDevRun(runId: string, handlers: StreamHandlers): StreamHandle {
  const controller = new AbortController()
  let closed = false

  const finish = (): void => {
    if (closed) return
    closed = true
    try {
      controller.abort()
    } catch {
      /* aborted twice — harmless */
    }
    handlers.onClose()
  }

  ;(async () => {
    try {
      const response = await fetch(
        apiUrl(`/ai/interactions/atlas-dev/runs/${encodeURIComponent(runId)}/stream`),
        {
          method: 'GET',
          headers: authHeaders({ Accept: 'text/event-stream' }),
          signal: controller.signal,
        },
      )

      if (!response.ok) {
        const body = await response.text()
        handlers.onError(classifyError(response.status, body, ''))
        finish()
        return
      }

      if (!response.body) {
        handlers.onError({
          kind: 'stream',
          message: 'Stream sem corpo — backend não retornou ReadableStream.',
          requires_replan: false,
        })
        finish()
        return
      }

      const decoder = new AtlasDevSseDecoder()
      const reader = response.body.getReader()
      const textDecoder = new TextDecoder()

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = textDecoder.decode(value, { stream: true })
        const { events } = decoder.push(chunk)
        for (const evt of events) {
          if (closed) return
          handlers.onEvent(evt)
        }
      }
      const flushed = decoder.flush()
      for (const evt of flushed.events) {
        if (closed) return
        handlers.onEvent(evt)
      }
      finish()
    } catch (cause) {
      if (closed) return
      const message =
        cause instanceof Error ? cause.message : 'falha ao consumir o stream de fases'
      handlers.onError({
        kind: 'stream',
        message,
        requires_replan: false,
      })
      finish()
    }
  })()

  return {
    close: finish,
  }
}

/**
 * GET /ai/interactions/atlas-dev/runs/{run_id} — REST fallback.
 *
 * Used after SSE drops or when the host browser cannot stream.
 */
export async function fetchAtlasDevRunStatus(runId: string): Promise<AtlasDevRunStatusResponse> {
  const response = await fetch(
    apiUrl(`/ai/interactions/atlas-dev/runs/${encodeURIComponent(runId)}`),
    { method: 'GET', headers: authHeaders({ Accept: 'application/json' }) },
  )
  if (!response.ok) {
    const body = await response.text()
    throw classifyError(response.status, body, '')
  }
  return normalizeRunStatusResponse(await response.json())
}
