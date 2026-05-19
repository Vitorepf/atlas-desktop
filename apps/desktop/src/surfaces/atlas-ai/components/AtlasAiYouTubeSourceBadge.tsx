/**
 * Atlas AI · YouTube canonical source badge (desktop).
 *
 * Mirrors mobile `YouTubeSourceBadge` (`atlas-app/components/sheets/atlas-ai`)
 * but uses Atlas Desktop slate dark warm tokens via `var(--cc-*)`. Reads
 * canonical 3-status summaries projected by `@atlas/rich-input-canon`:
 *
 *   - ingestion_status: queued | processing | ready | failed
 *   - transcript_status: unavailable | pending | original_ready | failed
 *   - translation_status: not_required | required | pending | translated_ready | failed
 *
 * NEVER claim translation that did not happen. Foreign-language videos
 * surface as "transcrição original (en) · tradução PT-BR pendente" — the
 * `summary.detail` line is built by the canon and is the source of truth.
 *
 * See `atlas-server/docs/rich-input/youtube-canon.md`.
 */
import { useMemo } from 'react'
import {
  summarizeYouTubeVideo,
  youtubeBadgeText,
  type YouTubeVideoSummary,
} from '@atlas/rich-input-canon'
import type { AiTrace } from '../types'

export function youtubeSourcesFromTrace(trace: AiTrace | null): YouTubeVideoSummary[] {
  if (!trace) return []
  const jobs = trace.jobs?.length ? trace.jobs : trace.job ? [trace.job] : []
  const summaries: YouTubeVideoSummary[] = []
  for (const job of jobs) {
    const payload = (job?.payload ?? null) as Record<string, unknown> | null
    const ingestion = payload && typeof payload === 'object'
      ? (payload['youtube_ingestion'] as Record<string, unknown> | null)
      : null
    const videos = ingestion && Array.isArray(ingestion['videos'])
      ? (ingestion['videos'] as unknown[])
      : []
    for (const raw of videos) {
      const summary = summarizeYouTubeVideo(raw, {
        targetLanguage: 'pt-BR',
        locale: 'pt-BR',
      })
      if (summary) summaries.push(summary)
    }
  }
  const seen = new Set<string>()
  return summaries.filter((s) => {
    if (seen.has(s.key)) return false
    seen.add(s.key)
    return true
  })
}

interface AtlasAiYouTubeSourceBadgeProps {
  trace: AiTrace | null
}

export function AtlasAiYouTubeSourceBadge({ trace }: AtlasAiYouTubeSourceBadgeProps) {
  const sources = useMemo(() => youtubeSourcesFromTrace(trace), [trace])
  if (sources.length === 0) return null

  const primary = sources[0]
  const extra = sources.length > 1 ? ` +${sources.length - 1}` : ''

  // Honest 3-status tone:
  //   failed   → danger
  //   pending/required/queued/processing → pending
  //   ready+not_required+translated_ready → success
  const tone: 'success' | 'pending' | 'danger' =
    primary.ingestionStatus === 'failed' || primary.transcriptStatus === 'failed'
      ? 'danger'
      : primary.ingestionStatus !== 'ready'
        || primary.transcriptStatus === 'pending'
        || primary.translationStatus === 'required'
        || primary.translationStatus === 'pending'
        ? 'pending'
        : 'success'

  const progressPct =
    primary.ingestionStatus === 'processing' && typeof primary.progress === 'number'
      ? Math.max(8, Math.min(88, primary.progress * 100))
      : null

  return (
    <div
      className={`atlas-ai-youtube-badge tone-${tone}`}
      role="status"
      aria-live="polite"
    >
      <span className="atlas-ai-youtube-badge-dot" aria-hidden="true" />
      <div className="atlas-ai-youtube-badge-stack">
        <span className="atlas-ai-youtube-badge-source">
          {primary.sourceLabel}
          {extra}
        </span>
        <span className="atlas-ai-youtube-badge-detail" title={primary.detail || undefined}>
          {primary.detail ? `${primary.detail} · ${primary.title}` : primary.title}
        </span>
        {progressPct !== null ? (
          <span className="atlas-ai-youtube-badge-track" aria-hidden="true">
            <span
              className="atlas-ai-youtube-badge-fill"
              style={{ width: `${progressPct}%` }}
            />
          </span>
        ) : null}
      </div>
      <span className="atlas-ai-youtube-badge-pill" aria-hidden="true">
        {youtubeBadgeText({ short: true })}
      </span>
    </div>
  )
}
