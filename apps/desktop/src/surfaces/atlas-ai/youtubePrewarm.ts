/**
 * Atlas AI · Desktop · YouTube paste-time prewarm.
 *
 * Pure helpers (extraction + dedup) — same canon-driven logic that the
 * mobile counterpart exposes (`atlas-app/lib/atlasAi/youtubePrewarm.ts`).
 * Lives in `surfaces/atlas-ai/` so the hook can sit beside the composer
 * without touching the giant `lib/bridge.ts`.
 *
 * Doctrine: ingestion is dispatched the moment a YouTube link appears in
 * the draft. By the time the operator hits send, the transcript is already
 * `ready` in the backend cache. See
 * `atlas-server/docs/rich-input/youtube-canon.md`.
 */
import {
  classifyUrl,
  extractUrls,
  extractYouTubeVideoId,
  normalizeYouTubeUrl,
  type YoutubeIngestionStatus,
  type YoutubeTranscriptStatus,
  type YoutubeTranslationStatus,
} from '@atlas/rich-input-canon'

export interface ExtractedYoutubeLink {
  /** Canonical URL (`https://www.youtube.com/watch?v=ID`) — dedup-friendly. */
  canonicalUrl: string
  /** 11-char videoId. */
  videoId: string
}

export function extractYoutubeLinks(draft: string | null | undefined): ExtractedYoutubeLink[] {
  if (!draft || typeof draft !== 'string') return []
  const trimmed = draft.trim()
  if (trimmed === '') return []

  const seen = new Set<string>()
  const out: ExtractedYoutubeLink[] = []

  for (const url of extractUrls(trimmed)) {
    const detected = classifyUrl(url)
    if (detected.kind !== 'youtube') continue
    const videoId = detected.refId ?? extractYouTubeVideoId(url)
    if (!videoId) continue
    if (seen.has(videoId)) continue
    seen.add(videoId)
    const canonical = normalizeYouTubeUrl(url)
    if (!canonical) continue
    out.push({ canonicalUrl: canonical, videoId })
  }

  return out
}

export function diffNewVideoIds(
  links: readonly ExtractedYoutubeLink[],
  alreadyPrewarmed: ReadonlySet<string>,
): ExtractedYoutubeLink[] {
  return links.filter((link) => !alreadyPrewarmed.has(link.videoId))
}

export interface YoutubePrewarmItem {
  url: string
  canonical_url: string | null
  video_id: string | null
  ingestion_status: YoutubeIngestionStatus | string
  transcript_status: YoutubeTranscriptStatus | string
  translation_status: YoutubeTranslationStatus | string
  source_language: string | null
  target_language: string
  translation_required: boolean
  cache_hit: boolean
  dispatched: boolean
  locked: boolean
  last_ingested_at: string | null
  reason?: string
}

export interface YoutubePrewarmResponse {
  schema_version: 1
  items: YoutubePrewarmItem[]
}

export interface YoutubeStatusItem {
  video_id: string
  ingestion_status: YoutubeIngestionStatus | string
  transcript_status: YoutubeTranscriptStatus | string
  translation_status: YoutubeTranslationStatus | string
  source_language: string | null
  target_language: string
  translation_required: boolean
  last_ingested_at: string | null
  [key: string]: unknown
}

/**
 * Resolve the backend HTTP base. Mirrors what `lib/bridge.ts::fetchHttp`
 * does for non-Tauri targets. Returns null when neither Tauri nor an
 * explicit URL is configured — prewarm becomes a no-op.
 */
function resolveHttpBase(): string | null {
  const url = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_ATLAS_SERVER_URL
  if (typeof url === 'string' && url.length > 0) return url.replace(/\/+$/, '')

  return null
}

function authHeaders(): Record<string, string> {
  const token = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_ATLAS_TOKEN
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (typeof token === 'string' && token.length > 0) base['X-Atlas-Token'] = token

  return base
}

export async function prewarmYoutubeUrls(
  urls: readonly string[],
  signal?: AbortSignal,
): Promise<YoutubePrewarmResponse | null> {
  if (urls.length === 0) return null
  const base = resolveHttpBase()
  if (base === null) return null
  try {
    const response = await fetch(`${base}/ai/youtube/prewarm`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ urls }),
      signal,
    })
    if (!response.ok) return null
    const text = await response.text()
    return JSON.parse(text) as YoutubePrewarmResponse
  } catch {
    return null
  }
}

export async function fetchYoutubeIngestionStatus(
  videoId: string,
  signal?: AbortSignal,
): Promise<YoutubeStatusItem | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null
  const base = resolveHttpBase()
  if (base === null) return null
  try {
    const response = await fetch(
      `${base}/ai/youtube/ingestion/${encodeURIComponent(videoId)}`,
      { method: 'GET', headers: authHeaders(), signal },
    )
    if (!response.ok) return null
    const text = await response.text()
    const parsed = JSON.parse(text) as { item?: YoutubeStatusItem }
    return parsed.item ?? null
  } catch {
    return null
  }
}
