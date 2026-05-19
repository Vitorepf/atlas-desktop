/// <reference types="node" />
import assert from 'node:assert/strict'
import { compactRichInput } from '../rich-input/compactRichInput'
import {
  ATLAS_RICH_INPUT_PAYLOAD_SCHEMA,
  type AtlasRichInputPayload,
} from '../rich-input/types'

/**
 * Bridge · Rich Input adapter — focused logic tests.
 *
 * These tests cover the deterministic mapping the bridge performs before
 * either /atlas-code/works or /ai/interactions is hit. They never touch the
 * network: only the canonical compact/expand behaviour that decides whether
 * `body.rich_input` is included and whether legacy `uploaded_images` /
 * `uploaded_documents` slots get populated for the AiInteractionController.
 */
const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

function emptyPayload(): AtlasRichInputPayload {
  return {
    schema_version: ATLAS_RICH_INPUT_PAYLOAD_SCHEMA,
    uploaded_image_ids: [],
    uploaded_document_ids: [],
    text_blocks: [],
    url_attachments: [],
    source_manifest: [],
  }
}

test('compactRichInput returns null for null/undefined', () => {
  assert.equal(compactRichInput(null), null)
  assert.equal(compactRichInput(undefined), null)
})

test('compactRichInput returns null when canonical payload has no attachments', () => {
  assert.equal(compactRichInput(emptyPayload()), null)
})

test('compactRichInput preserves payload when any image is present', () => {
  const payload: AtlasRichInputPayload = {
    ...emptyPayload(),
    uploaded_image_ids: ['img-1'],
  }
  const compacted = compactRichInput(payload)
  assert.notEqual(compacted, null)
  assert.deepEqual(compacted!.uploaded_image_ids, ['img-1'])
  assert.equal(compacted!.schema_version, ATLAS_RICH_INPUT_PAYLOAD_SCHEMA)
})

test('compactRichInput preserves payload when only a URL is present', () => {
  const payload: AtlasRichInputPayload = {
    ...emptyPayload(),
    url_attachments: [
      {
        url: 'https://example.com/pdf-spec',
        kind: 'generic',
        title: null,
        author: null,
        duration_sec: null,
        thumbnail_url: null,
        ref_id: null,
      },
    ],
  }
  const compacted = compactRichInput(payload)
  assert.notEqual(compacted, null)
  assert.equal(compacted!.url_attachments.length, 1)
  assert.equal(compacted!.url_attachments[0]!.url, 'https://example.com/pdf-spec')
})

test('compactRichInput preserves payload when only a text block is present', () => {
  const payload: AtlasRichInputPayload = {
    ...emptyPayload(),
    text_blocks: [
      {
        file_name: 'notes.md',
        mime_type: 'text/markdown',
        language: 'markdown',
        content: '# objetivo · texto colado',
      },
    ],
  }
  const compacted = compactRichInput(payload)
  assert.notEqual(compacted, null)
  assert.equal(compacted!.text_blocks.length, 1)
  assert.equal(compacted!.text_blocks[0]!.file_name, 'notes.md')
})

test('compactRichInput returns null even with non-empty source_manifest (no real attachment yet)', () => {
  // Forward-compat: source_manifest may be populated by future surfaces even
  // when no upload happened — the bridge still treats it as "no attachment"
  // for the purpose of including rich_input in the HTTP body.
  const payload: AtlasRichInputPayload = {
    ...emptyPayload(),
    source_manifest: [
      {
        id: 'm1',
        kind: 'pdf',
        file_name: 'spec.pdf',
        mime_type: 'application/pdf',
        size: 100,
        uploaded_id: null,
        source_hash: null,
        source: 'picker',
      },
    ],
  }
  assert.equal(compactRichInput(payload), null)
})

let failures = 0
for (const c of cases) {
  try {
    c.run()
    process.stdout.write(`  PASS  ${c.name}\n`)
  } catch (e) {
    failures += 1
    process.stdout.write(`  FAIL  ${c.name}\n`)
    process.stderr.write(`${(e as Error).stack ?? String(e)}\n`)
  }
}

if (failures > 0) {
  process.exit(1)
}
