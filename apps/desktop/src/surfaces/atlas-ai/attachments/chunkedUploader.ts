/**
 * Atlas AI · chunked uploader (Desktop).
 *
 * Schema canônico do backend (AiChunkedUploadController + Service):
 *
 *   POST /ai/uploads/chunks/start
 *     body: { kind: 'image' | 'file', file_name, mime_type, total_bytes,
 *             client_upload_id?, source? }
 *     resp: { upload: { id, received_chunks: [], meta: {...} } }
 *
 *   POST /ai/uploads/chunks/{upload_id}/chunk
 *     body: { index, total_chunks, offset?, bytes, chunk_base64 }
 *     resp: { upload: { id, index, received_chunks: [...] } }
 *
 *   POST /ai/uploads/chunks/{upload_id}/complete
 *     body: (vazio)
 *     resp: { upload: { id, file_name, mime_type, total_bytes,
 *                       assembled_path, bytes, sha256, completed_at } }
 *
 * Limites: 20MB total, 1.5MB raw bytes por chunk (max:1572864 no validator).
 * Cada chunk vira base64 (não multipart): backend valida `strlen(decoded) === bytes`.
 * Retry exponencial 3 tentativas por chunk; backoff 280ms × 2^attempt.
 */
import { ATTACHMENT_LIMITS } from './types'

interface BridgeEnvShape {
  __TAURI__?: unknown
  __TAURI_INTERNALS__?: unknown
}

const HTTP_BASE = (import.meta.env.VITE_ATLAS_SERVER_URL as string | undefined) ?? ''

function apiUrl(path: string): string {
  const base = HTTP_BASE.replace(/\/+$/, '')
  if (!base) return `/api${path}`
  if (base.endsWith('/api')) return `${base}${path}`
  return `${base}${path}`
}

function isOnline(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as Window & BridgeEnvShape
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return true
  return Boolean(HTTP_BASE)
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
  if (token) headers['X-Atlas-Token'] = token
  return headers
}

/** Kind canônico do backend: 'image' para PNG/JPEG/WebP/GIF, 'file' para todo o resto. */
export type UploadKind = 'image' | 'file'

interface StartResp { upload: { id: string } }
interface ChunkResp { upload: { id: string; index: number; received_chunks: number[] } }
interface CompleteResp {
  upload: {
    id: string
    file_name: string
    mime_type: string
    total_bytes: number
    bytes?: number
    sha256?: string
    completed_at?: string
  }
}

export interface ChunkedUploadOptions {
  blob: Blob
  filename: string
  mimeType: string
  kind: UploadKind
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
  source?: string
}

async function safeFetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`atlas-ai upload http ${res.status}: ${txt.slice(0, 240) || res.statusText}`)
  }
  return (await res.json()) as T
}

/** Converte ArrayBuffer → base64 sem estourar stack (chunked btoa). */
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000
  let bin = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

export async function chunkedUploadAsset(opts: ChunkedUploadOptions): Promise<string> {
  if (!isOnline()) {
    throw new Error('Atlas AI offline · upload indisponível sem kernel reachable.')
  }
  const { blob, filename, mimeType, kind, onProgress, signal, source } = opts
  const chunkSize = ATTACHMENT_LIMITS.chunkSize // 1.5MB
  const totalChunks = Math.max(1, Math.ceil(blob.size / chunkSize))

  // 1) start
  const start = await safeFetchJson<StartResp>(apiUrl('/ai/uploads/chunks/start'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify({
      kind,
      file_name: filename,
      mime_type: mimeType,
      total_bytes: blob.size,
      source: source ?? 'atlas_desktop_ai',
    }),
    signal,
  })

  const uploadId = start.upload?.id
  if (!uploadId) throw new Error('atlas-ai upload · start response sem upload.id')

  // 2) chunks (base64 inline, JSON)
  for (let i = 0; i < totalChunks; i++) {
    const begin = i * chunkSize
    const end = Math.min(blob.size, begin + chunkSize)
    const slice = blob.slice(begin, end, mimeType)
    const buf = new Uint8Array(await slice.arrayBuffer())
    const b64 = bytesToBase64(buf)

    let attempt = 0
    let lastErr: unknown = null
    while (attempt < 3) {
      try {
        await safeFetchJson<ChunkResp>(
          apiUrl(`/ai/uploads/chunks/${encodeURIComponent(uploadId)}/chunk`),
          {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
            body: JSON.stringify({
              index: i,
              total_chunks: totalChunks,
              offset: begin,
              bytes: buf.length,
              chunk_base64: b64,
            }),
            signal,
          },
        )
        lastErr = null
        break
      } catch (e) {
        lastErr = e
        attempt += 1
        if (signal?.aborted) throw e
        const backoffMs = 280 * Math.pow(2, attempt - 1)
        await new Promise((r) => window.setTimeout(r, backoffMs))
      }
    }
    if (lastErr) throw lastErr

    onProgress?.((i + 1) / totalChunks)
  }

  // 3) complete
  const complete = await safeFetchJson<CompleteResp>(
    apiUrl(`/ai/uploads/chunks/${encodeURIComponent(uploadId)}/complete`),
    {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({}),
      signal,
    },
  )

  const finalId = complete.upload?.id ?? uploadId
  if (!finalId) throw new Error('atlas-ai upload · complete sem id')
  return finalId
}
