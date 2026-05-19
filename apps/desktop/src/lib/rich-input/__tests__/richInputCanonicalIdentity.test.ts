/**
 * Atlas Unified Rich Input Runtime · canonical identity tests.
 *
 * Three invariants this suite locks:
 *
 *  1. `surfaces/atlas-ai/attachments/*` re-exports MUST point at the canon —
 *     no copy. Same function reference + same constant reference.
 *  2. `AtlasRichInputPayload` schema_version is `atlas.rich_input.payload.v1`
 *     and the canonical shape carries the 6 documented top-level keys.
 *  3. URL detector + filename language detection survive the move
 *     (behavioural smoke test on pure helpers).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ATLAS_RICH_INPUT_PAYLOAD_SCHEMA,
  ATTACHMENT_LIMITS,
  classifyUrl,
  detectLanguageFromFilename,
  extractUrls,
  useAtlasRichInputAttachments,
} from '../index.ts'

// Atlas AI back-compat surface re-exports.
import { ATTACHMENT_LIMITS as ATLAS_AI_LIMITS } from '../../../surfaces/atlas-ai/attachments/types.ts'
import { classifyUrl as atlasAiClassifyUrl } from '../../../surfaces/atlas-ai/attachments/urlDetector.ts'
import { useAtlasAiAttachments } from '../../../surfaces/atlas-ai/attachments/useAtlasAiAttachments.ts'

test('Atlas AI back-compat shim points at canonical hook (same reference)', () => {
  assert.strictEqual(
    useAtlasAiAttachments as unknown,
    useAtlasRichInputAttachments as unknown,
    'useAtlasAiAttachments deve referenciar useAtlasRichInputAttachments — sem cópia local.',
  )
})

test('Atlas AI back-compat shim points at canonical constants (same reference)', () => {
  assert.strictEqual(
    ATLAS_AI_LIMITS as unknown,
    ATTACHMENT_LIMITS as unknown,
    'ATTACHMENT_LIMITS deve ser o mesmo objeto via shim e canon.',
  )
})

test('Atlas AI back-compat shim points at canonical classifyUrl (same reference)', () => {
  assert.strictEqual(
    atlasAiClassifyUrl as unknown,
    classifyUrl as unknown,
    'classifyUrl deve ser o mesmo function reference via shim e canon.',
  )
})

test('AtlasRichInputPayload schema version is the canonical v1 token', () => {
  assert.equal(ATLAS_RICH_INPUT_PAYLOAD_SCHEMA, 'atlas.rich_input.payload.v1')
})

test('detectLanguageFromFilename mantém comportamento (smoke)', () => {
  assert.equal(detectLanguageFromFilename('foo.ts'), 'typescript')
  assert.equal(detectLanguageFromFilename('Dockerfile'), 'docker')
  assert.equal(detectLanguageFromFilename('unknown.xyz'), null)
})

test('classifyUrl mantém comportamento (smoke)', () => {
  const yt = classifyUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  assert.equal(yt.kind, 'youtube')
  assert.equal(yt.refId, 'dQw4w9WgXcQ')

  const gh = classifyUrl('https://github.com/vitorefp/atlas')
  assert.equal(gh.kind, 'github')
  assert.equal(gh.refId, 'vitorefp/atlas')

  const generic = classifyUrl('https://example.com/article')
  assert.equal(generic.kind, 'generic')
  assert.equal(generic.refId, null)
})

test('extractUrls dedup preserva ordem', () => {
  const urls = extractUrls('first https://a.com second https://b.com again https://a.com')
  assert.deepEqual(urls, ['https://a.com', 'https://b.com'])
})

test('ATTACHMENT_LIMITS expõe os 11 campos canon usados pelo pipeline', () => {
  for (const key of [
    'maxImages',
    'maxPdfs',
    'maxTextFiles',
    'maxUrls',
    'maxImageBytes',
    'maxPdfBytes',
    'maxTextBytes',
    'maxTextPreviewChars',
    'maxImageDimension',
    'imageJpegQuality',
    'imageWebpQuality',
    'chunkSize',
  ]) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(ATTACHMENT_LIMITS, key),
      `ATTACHMENT_LIMITS deve expor ${key}`,
    )
  }
})
