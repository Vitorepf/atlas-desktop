/// <reference types="node" />
/**
 * SSE parser unit tests.
 *
 * Runs under either Vitest (`describe` / `it`) when present, or — since this
 * repo doesn't ship a runner — as a standalone Node script via:
 *
 *   node --experimental-strip-types \
 *     atlas-desktop/apps/desktop/src/components/atlasDev/__tests__/sseParser.test.ts
 *
 * Detects standalone mode by checking `import.meta.main` (Node 24) /
 * `process.argv[1]`.
 */
import assert from 'node:assert/strict'
import { AtlasDevSseDecoder, decodeAtlasDevEvent } from '../sseParser.ts'

const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

test('decodes a single phase event delivered in one chunk', () => {
  const decoder = new AtlasDevSseDecoder()
  const out = decoder.push('event: phase\ndata: {"kind":"phase","phase":"executing","at":"2026-05-16T18:00:00Z"}\n\n')
  assert.equal(out.events.length, 1)
  const evt = out.events[0]
  if (evt.kind !== 'phase') throw new Error('expected phase event')
  assert.equal(evt.phase, 'executing')
})

test('joins multi-line data lines with \\n', () => {
  const decoder = new AtlasDevSseDecoder()
  const out = decoder.push('event: receipt\ndata: {"kind":"receipt",\ndata: "receipt":{"run_id":"r","task_contract_hash":"h","completion":{"status":"passed"}}}\n\n')
  assert.equal(out.events.length, 1)
  assert.equal(out.events[0].kind, 'receipt')
})

test('treats `:` comment chunks as keepalive without polluting events when alone', () => {
  const decoder = new AtlasDevSseDecoder()
  const out = decoder.push(': keepalive 15s\n\n')
  assert.equal(out.events.length, 1)
  assert.equal(out.events[0].kind, 'keepalive')
})

test('handles chunked delivery — half event, then the rest', () => {
  const decoder = new AtlasDevSseDecoder()
  const first = decoder.push('event: phase\ndata: {"kind":"phase","phase":"scope_guarding"')
  assert.equal(first.events.length, 0, 'no full event yet')
  const second = decoder.push('}\n\n')
  assert.equal(second.events.length, 1)
  assert.equal(second.events[0].kind, 'phase')
})

test('supports CRLF separators', () => {
  const decoder = new AtlasDevSseDecoder()
  const out = decoder.push('event: phase\r\ndata: {"kind":"phase","phase":"verifying"}\r\n\r\n')
  assert.equal(out.events.length, 1)
  const evt = out.events[0]
  if (evt.kind !== 'phase') throw new Error('expected phase event')
  assert.equal(evt.phase, 'verifying')
})

test('drops events with unknown kind silently', () => {
  const decoder = new AtlasDevSseDecoder()
  const out = decoder.push('event: rogue\ndata: {"kind":"hot_take","rivals":true}\n\n')
  assert.equal(out.events.length, 0)
})

test('drops events with malformed JSON silently', () => {
  const decoder = new AtlasDevSseDecoder()
  const out = decoder.push('event: phase\ndata: {not json,\n\n')
  assert.equal(out.events.length, 0)
})

test('parses retry directive', () => {
  const decoder = new AtlasDevSseDecoder()
  const out = decoder.push('retry: 2500\ndata: {"kind":"phase","phase":"executing"}\n\n')
  assert.equal(out.retryMs, 2500)
  assert.equal(out.events.length, 1)
})

test('decodeAtlasDevEvent returns null for missing/unknown kind', () => {
  assert.equal(decodeAtlasDevEvent({ event: 'message', data: '{}' }), null)
  assert.equal(decodeAtlasDevEvent({ event: 'message', data: '{"kind":"rivals"}' }), null)
})

test('handles two events back-to-back in one chunk', () => {
  const decoder = new AtlasDevSseDecoder()
  const out = decoder.push(
    'event: phase\ndata: {"kind":"phase","phase":"executing"}\n\n' +
      'event: phase\ndata: {"kind":"phase","phase":"verifying"}\n\n',
  )
  assert.equal(out.events.length, 2)
  const second = out.events[1]
  if (second.kind !== 'phase') throw new Error('expected phase event')
  assert.equal(second.phase, 'verifying')
})

test('flush drains a final event missing its trailing blank line', () => {
  const decoder = new AtlasDevSseDecoder()
  decoder.push('event: phase\ndata: {"kind":"phase","phase":"complete"}')
  const out = decoder.flush()
  assert.equal(out.events.length, 1)
  const evt = out.events[0]
  if (evt.kind !== 'phase') throw new Error('expected phase event')
  assert.equal(evt.phase, 'complete')
})

test('snapshot-replay phase event without kind in JSON is keyed by event name', () => {
  // F-01 StreamController emits `event: phase\ndata: {run_id,phase,artifact,…}`
  // — there is no `kind` in the JSON because the SSE `event:` line carries it.
  const decoder = new AtlasDevSseDecoder()
  const out = decoder.push(
    'event: phase\ndata: {"run_id":"dev-1","phase":"plan_persisted","artifact":"operation_envelope.json","persisted_at":1700000000}\n\n',
  )
  assert.equal(out.events.length, 1)
  const evt = out.events[0]
  if (evt.kind !== 'phase') throw new Error('expected phase event')
  // We surface whatever phase name the snapshot stream emitted — the operator
  // sees the backend's vocabulary, not Desktop's local enum.
  assert.equal((evt as { phase: string }).phase, 'plan_persisted')
})

test('snapshot-replay receipt event with flat payload is surfaced as receipt kind', () => {
  // F-01: snapshot emits a flat receipt instead of `{kind:receipt, receipt:{…}}`.
  const decoder = new AtlasDevSseDecoder()
  const out = decoder.push(
    'event: receipt\ndata: {"run_id":"dev-1","completion_state":"passed","receipt_hash":"abc123","verification_status":"passed","scope_guard_status":"passed"}\n\n',
  )
  assert.equal(out.events.length, 1)
  assert.equal(out.events[0].kind, 'receipt')
  const carrier = out.events[0] as unknown as Record<string, unknown>
  assert.equal(carrier.completion_state, 'passed')
})

test('stream_closed event is surfaced (F-01 snapshot end marker)', () => {
  const decoder = new AtlasDevSseDecoder()
  const out = decoder.push(
    'event: stream_closed\ndata: {"run_id":"dev-1","reason":"snapshot_complete","fallback":"poll_rest_show_endpoint"}\n\n',
  )
  assert.equal(out.events.length, 1)
  assert.equal(out.events[0].kind, 'stream_closed')
})

let failed = 0
for (const { name, run } of cases) {
  try {
    run()
    process.stdout.write(`  ✓ ${name}\n`)
  } catch (cause) {
    failed += 1
    process.stdout.write(`  ✗ ${name}\n`)
    process.stdout.write(`    ${(cause as Error).message}\n`)
  }
}

process.stdout.write(`\n${cases.length - failed}/${cases.length} passed\n`)
if (failed > 0) process.exit(1)
