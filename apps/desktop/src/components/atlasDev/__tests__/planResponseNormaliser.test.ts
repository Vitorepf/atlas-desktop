/// <reference types="node" />
/**
 * Contract test for the /ai/interactions/atlas-dev/plan response shape.
 *
 * The Laravel PlanController emits:
 *   {
 *     "data": {
 *       …summary fields…,
 *       "confirmation": { "token": "<hex>", "expires_at": <unix_seconds>, "task_contract_hash": "<sha256>" } | null,
 *       "routing":      { "kind": "atlas_dev_fast_path" | "read_only_answer" | …, "reasons": [...], "blockers": [...], "is_executable": bool },
 *       "hashes":       { "task_contract": "<sha256>", … }
 *     }
 *   }
 *
 * Desktop must surface these as `plan.confirmation_token`, `plan.confirmation_expires_at`,
 * `plan.task_contract_hash`, `plan.routing_decision`. This is the single source of
 * truth — Desktop UI / useAtlasDevRun never reach back into `confirmation`/`routing`.
 */
import assert from 'node:assert/strict'

import { normaliseAtlasDevPlanResult, normalisePlanResponse } from '../apiShapes.ts'

const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

test('normalises canonical Laravel data envelope (confirmation + routing + hashes)', () => {
  const expiresAt = 1_700_000_300
  const result = normalisePlanResponse({
    data: {
      run_id: 'dev-1',
      surface_id: 'atlas_desktop_ai',
      workspace_hash: 'w'.repeat(64),
      thread_id: 'desktop-thread-1',
      confirmation: {
        token: 'token-xyz-very-secret',
        expires_at: expiresAt,
        task_contract_hash: 'a'.repeat(64),
      },
      routing: {
        kind: 'atlas_dev_fast_path',
        reasons: ['repair_intent'],
        blockers: [],
        is_executable: true,
      },
      hashes: { task_contract: 'a'.repeat(64), envelope: 'b'.repeat(64) },
    },
  })

  if (!result) throw new Error('expected normalised plan, got null')
  assert.equal(result.run_id, 'dev-1')
  assert.equal(result.confirmation_token, 'token-xyz-very-secret')
  assert.equal(result.workspace_hash, 'w'.repeat(64))
  assert.equal(result.thread_id, 'desktop-thread-1')
  assert.equal(result.task_contract_hash, 'a'.repeat(64))
  assert.equal(result.routing_decision, 'atlas_dev_fast_path')
  assert.equal(result.status, 'ready')
  assert.equal(
    result.confirmation_expires_at,
    new Date(expiresAt * 1000).toISOString(),
    'unix-seconds expires_at must become ISO 8601 string',
  )
})

test('routing.kind blocked surfaces as routing_decision + status=blocked', () => {
  const result = normalisePlanResponse({
    data: {
      run_id: 'dev-2',
      routing: { kind: 'blocked', reasons: ['workspace_missing'], blockers: ['no_workspace'] },
      confirmation: null,
    },
  })
  if (!result) throw new Error('expected normalised plan, got null')
  assert.equal(result.routing_decision, 'blocked')
  assert.equal(result.status, 'blocked')
  assert.equal(result.confirmation_token, undefined)
})

test('routing.kind forge_promotion_preview surfaces and status follows', () => {
  const result = normalisePlanResponse({
    data: {
      run_id: 'dev-3',
      routing: { kind: 'forge_promotion_preview' },
      confirmation: null,
    },
  })
  if (!result) throw new Error('expected normalised plan, got null')
  assert.equal(result.routing_decision, 'forge_promotion_preview')
  assert.equal(result.status, 'forge_promotion_preview')
})

test('falls back to hashes.task_contract when confirmation/task_contract absent', () => {
  const result = normalisePlanResponse({
    data: {
      run_id: 'dev-4',
      routing: { kind: 'atlas_dev_fast_path' },
      hashes: { task_contract: 'c'.repeat(64) },
    },
  })
  if (!result) throw new Error('expected normalised plan, got null')
  assert.equal(result.task_contract_hash, 'c'.repeat(64))
})

test('accepts legacy { plan: {…} } envelope', () => {
  const result = normalisePlanResponse({
    plan: {
      run_id: 'dev-5',
      status: 'ready',
      routing_decision: 'atlas_dev_fast_path',
      confirmation_token: 'legacy-token',
    },
  })
  if (!result) throw new Error('expected normalised plan, got null')
  assert.equal(result.run_id, 'dev-5')
  assert.equal(result.confirmation_token, 'legacy-token')
  assert.equal(result.routing_decision, 'atlas_dev_fast_path')
})

test('accepts a bare result envelope', () => {
  const result = normalisePlanResponse({
    run_id: 'dev-6',
    status: 'ready',
    routing_decision: 'read_only_answer',
  })
  if (!result) throw new Error('expected normalised plan, got null')
  assert.equal(result.run_id, 'dev-6')
  assert.equal(result.routing_decision, 'read_only_answer')
})

test('returns null for non-object payload', () => {
  assert.equal(normalisePlanResponse(null), null)
  assert.equal(normalisePlanResponse('whatever'), null)
  assert.equal(normalisePlanResponse(42), null)
})

test('returns null for object payloads without a run_id', () => {
  assert.equal(normalisePlanResponse({}), null)
  assert.equal(normalisePlanResponse({ data: { routing: { kind: 'atlas_dev_fast_path' } } }), null)
  assert.equal(normalisePlanResponse({ plan: { status: 'ready' } }), null)
  assert.equal(normalisePlanResponse([]), null)
})

test('confirmation.expires_at as numeric string also normalises to ISO', () => {
  const result = normaliseAtlasDevPlanResult({
    run_id: 'dev-7',
    status: 'ready',
    confirmation: { token: 't', expires_at: '1700000300', task_contract_hash: 'd'.repeat(64) },
  } as unknown as Parameters<typeof normaliseAtlasDevPlanResult>[0])
  assert.equal(result.confirmation_expires_at, new Date(1700000300 * 1000).toISOString())
})

test('confirmation.expires_at as ISO string is preserved verbatim', () => {
  const iso = '2026-05-16T10:00:00.000Z'
  const result = normaliseAtlasDevPlanResult({
    run_id: 'dev-8',
    status: 'ready',
    confirmation: { token: 't', expires_at: iso, task_contract_hash: 'e'.repeat(64) },
  } as unknown as Parameters<typeof normaliseAtlasDevPlanResult>[0])
  assert.equal(result.confirmation_expires_at, iso)
})

test('confirmation null surfaces as no confirmation_token leak', () => {
  const result = normaliseAtlasDevPlanResult({
    run_id: 'dev-9',
    status: 'ready',
    routing_decision: 'read_only_answer',
    confirmation: null,
  } as unknown as Parameters<typeof normaliseAtlasDevPlanResult>[0])
  assert.equal(result.confirmation_token, undefined)
  assert.equal(result.confirmation_expires_at, undefined)
  assert.equal(result.task_contract_hash, undefined)
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
