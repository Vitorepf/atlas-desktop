/**
 * Atlas AI · Desktop · YouTube canonical source badge contract.
 *
 * Locks the projection used by `AtlasAiYouTubeSourceBadge` so that the
 * desktop never re-implements YouTube status mapping. The component pipes
 * `trace.job.payload.youtube_ingestion.videos[]` through canon's
 * `summarizeYouTubeVideo` — same as mobile.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { youtubeSourcesFromTrace } from '../components/AtlasAiYouTubeSourceBadge.tsx'

function makeTrace(videos: unknown[]): any {
  return {
    id: 'trace-1',
    job: { id: 'job-1', payload: { youtube_ingestion: { videos } } },
    jobs: null,
  }
}

test('youtubeSourcesFromTrace · PT-BR ready video collapses translation to not_required', () => {
  const sources = youtubeSourcesFromTrace(
    makeTrace([
      {
        url: 'https://www.youtube.com/watch?v=ptbr1234567',
        status: 'ready',
        metadata: { title: 'PT-BR Talk', channel: 'Canal BR', duration_seconds: 360 },
        caption: { kind: 'manual', language: 'pt-BR' },
      },
    ]),
  )
  assert.equal(sources.length, 1)
  assert.equal(sources[0].ingestionStatus, 'ready')
  assert.equal(sources[0].transcriptStatus, 'original_ready')
  assert.equal(sources[0].translationStatus, 'not_required')
  assert.equal(sources[0].translationRequired, false)
  assert.equal(sources[0].sourceLanguage, 'pt-BR')
  assert.equal(sources[0].targetLanguage, 'pt-BR')
})

test('youtubeSourcesFromTrace · EN ready video forces required translation, honest detail line', () => {
  const sources = youtubeSourcesFromTrace(
    makeTrace([
      {
        url: 'https://www.youtube.com/watch?v=enxxxxxxxxx',
        status: 'ready',
        metadata: { title: 'EN Talk', channel: 'EN Channel', duration_seconds: 720 },
        caption: { kind: 'manual', language: 'en' },
      },
    ]),
  )
  assert.equal(sources[0].translationRequired, true)
  assert.equal(sources[0].translationStatus, 'required')
  assert.equal(sources[0].sourceLanguage, 'en')
  assert.match(sources[0].detail, /original/)
  assert.match(sources[0].detail, /PT-BR pendente/)
})

test('youtubeSourcesFromTrace · failed propagates across all dimensions', () => {
  const sources = youtubeSourcesFromTrace(
    makeTrace([
      {
        url: 'https://youtu.be/failedaaaaa',
        status: 'failed',
        reason: 'metadata fetch timed out',
      },
    ]),
  )
  assert.equal(sources[0].ingestionStatus, 'failed')
  assert.equal(sources[0].transcriptStatus, 'failed')
  assert.equal(sources[0].translationStatus, 'failed')
})

test('youtubeSourcesFromTrace · honest: never claims translated_ready by default', () => {
  const sources = youtubeSourcesFromTrace(
    makeTrace([
      {
        url: 'https://youtu.be/foreignenxx',
        status: 'ready',
        caption: { language: 'en' },
      },
    ]),
  )
  assert.notEqual(sources[0].translationStatus, 'translated_ready')
})

test('youtubeSourcesFromTrace · processing renders progress + pending translation', () => {
  const sources = youtubeSourcesFromTrace(
    makeTrace([
      {
        url: 'https://youtu.be/processngz0',
        status: 'processing',
        processing: { progress: 0.42, estimated_remaining_seconds: 120 },
      },
    ]),
  )
  assert.equal(sources[0].ingestionStatus, 'processing')
  assert.equal(sources[0].transcriptStatus, 'pending')
  assert.equal(sources[0].translationStatus, 'pending')
  assert.match(sources[0].detail, /42%/)
})

test('youtubeSourcesFromTrace · empty/null trace returns empty array', () => {
  assert.deepEqual(youtubeSourcesFromTrace(null), [])
  assert.deepEqual(youtubeSourcesFromTrace({ id: 't', job: null, jobs: null } as any), [])
  assert.deepEqual(
    youtubeSourcesFromTrace({
      id: 't',
      job: { id: 'j', payload: {} },
      jobs: null,
    } as any),
    [],
  )
})
