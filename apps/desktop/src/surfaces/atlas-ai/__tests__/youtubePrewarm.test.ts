/**
 * Atlas AI · Desktop · YouTube paste-time prewarm helpers contract.
 *
 * Mirrors the mobile test (`atlas-app/scripts/youtube-prewarm.test.ts`) so
 * any divergence between surfaces is caught at gate time. Pure helpers
 * only — the hook depends on React + fetch and is exercised via the
 * desktop build smoke (`npm run build`) and backend feature test.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { diffNewVideoIds, extractYoutubeLinks } from '../youtubePrewarm.ts'

test('extractYoutubeLinks · empty/null/whitespace yields []', () => {
  assert.deepEqual(extractYoutubeLinks(''), [])
  assert.deepEqual(extractYoutubeLinks(null), [])
  assert.deepEqual(extractYoutubeLinks(undefined), [])
  assert.deepEqual(extractYoutubeLinks('   '), [])
  assert.deepEqual(extractYoutubeLinks('sem nenhum link aqui'), [])
})

test('extractYoutubeLinks · canonical watch URL', () => {
  const out = extractYoutubeLinks('analisa isso https://www.youtube.com/watch?v=dQw4w9WgXcQ por favor')
  assert.equal(out.length, 1)
  assert.equal(out[0].canonicalUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  assert.equal(out[0].videoId, 'dQw4w9WgXcQ')
})

test('extractYoutubeLinks · youtu.be normalizes to canonical', () => {
  const out = extractYoutubeLinks('cola https://youtu.be/dQw4w9WgXcQ')
  assert.equal(out[0].canonicalUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
})

test('extractYoutubeLinks · shorts/live/embed all collapse to watch', () => {
  const out = extractYoutubeLinks([
    'https://www.youtube.com/shorts/abc12345678',
    'https://www.youtube.com/live/def12345678',
    'https://www.youtube.com/embed/ghi12345678',
  ].join(' '))
  assert.equal(out.length, 3)
  assert.equal(out[0].canonicalUrl, 'https://www.youtube.com/watch?v=abc12345678')
  assert.equal(out[1].canonicalUrl, 'https://www.youtube.com/watch?v=def12345678')
  assert.equal(out[2].canonicalUrl, 'https://www.youtube.com/watch?v=ghi12345678')
})

test('extractYoutubeLinks · dedups same videoId regardless of URL format', () => {
  const out = extractYoutubeLinks([
    'https://youtu.be/dQw4w9WgXcQ',
    'e tambem https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDxyz',
    'e ainda https://www.youtube.com/shorts/dQw4w9WgXcQ',
  ].join(' '))
  assert.equal(out.length, 1)
  assert.equal(out[0].videoId, 'dQw4w9WgXcQ')
})

test('extractYoutubeLinks · ignores non-YouTube', () => {
  const out = extractYoutubeLinks('cola https://example.com e https://github.com/x/y aqui')
  assert.deepEqual(out, [])
})

test('extractYoutubeLinks · ignores youtube search/channel URLs', () => {
  const out = extractYoutubeLinks(
    'https://www.youtube.com/results?q=foo https://www.youtube.com/@channel',
  )
  assert.deepEqual(out, [])
})

test('diffNewVideoIds · skips ones already in alreadyPrewarmed', () => {
  const links = [
    { canonicalUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', videoId: 'aaaaaaaaaaa' },
    { canonicalUrl: 'https://www.youtube.com/watch?v=bbbbbbbbbbb', videoId: 'bbbbbbbbbbb' },
  ]
  const result = diffNewVideoIds(links, new Set(['aaaaaaaaaaa']))
  assert.equal(result.length, 1)
  assert.equal(result[0].videoId, 'bbbbbbbbbbb')
})

test('diffNewVideoIds · everything prewarmed yields empty', () => {
  const links = [
    { canonicalUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', videoId: 'aaaaaaaaaaa' },
  ]
  assert.deepEqual(diffNewVideoIds(links, new Set(['aaaaaaaaaaa'])), [])
})
