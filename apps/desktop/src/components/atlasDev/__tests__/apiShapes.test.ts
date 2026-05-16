/// <reference types="node" />
import assert from 'node:assert/strict'
import { normalisePlanResponse, normalizeRunStartResponse, normalizeRunStatusResponse } from '../apiShapes.ts'

const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

test('normalizes legacy run accept response', () => {
  assert.deepEqual(normalizeRunStartResponse({ ok: true, run_id: 'dev-1' }), {
    ok: true,
    run_id: 'dev-1',
  })
})

test('normalizes canonical backend run data response', () => {
  assert.deepEqual(normalizeRunStartResponse({ data: { run_id: 'dev-2', completion_state: 'passed' } }), {
    ok: true,
    run_id: 'dev-2',
  })
})

test('rejects run response without run id', () => {
  assert.equal(normalizeRunStartResponse({ data: { completion_state: 'passed' } }), null)
})

test('normalizes canonical plan data wrapper for Desktop run workbench', () => {
  const plan = normalisePlanResponse({
    data: {
      run_id: 'dev-plan-1',
      routing: { kind: 'atlas_dev_fast_path' },
      confirmation: {
        token: 'plain-token',
        expires_at: 1778961000,
        task_contract_hash: 'hash-from-confirmation',
      },
      hashes: { task_contract: 'hash-from-hashes' },
    },
  })

  assert.equal(plan?.run_id, 'dev-plan-1')
  assert.equal(plan?.status, 'ready')
  assert.equal(plan?.routing_decision, 'atlas_dev_fast_path')
  assert.equal(plan?.confirmation_token, 'plain-token')
  assert.equal(plan?.confirmation_expires_at, new Date(1778961000 * 1000).toISOString())
  assert.equal(plan?.task_contract_hash, 'hash-from-confirmation')
})

test('normalizes blocked and forge plan states when status is absent', () => {
  assert.equal(normalisePlanResponse({ data: { run_id: 'dev-block', routing: { kind: 'blocked' } } })?.status, 'blocked')
  assert.equal(
    normalisePlanResponse({ data: { run_id: 'dev-forge', routing: { kind: 'forge_promotion_preview' } } })?.status,
    'forge_promotion_preview',
  )
})

test('normalizes show data wrapper into fallback status with minimal receipt', () => {
  const status = normalizeRunStatusResponse({
    data: {
      run_id: 'dev-3',
      completion_state: 'passed',
      task_contract_hash: 'hash-1',
      verification_receipt_hash: 'receipt-1',
      persisted_artifact_refs: {
        'provider_call_result.json': 'receipts/dev-3/provider_call_result.json',
        'diff_parse_result.json': 'receipts/dev-3/diff_parse_result.json',
        'scope_guard_receipt.json': 'receipts/dev-3/scope_guard_receipt.json',
        'verification_receipt.json': 'receipts/dev-3/verification_receipt.json',
      },
    },
  })

  assert.equal(status.run_id, 'dev-3')
  assert.equal(status.state, 'complete')
  assert.equal(status.receipt?.completion.status, 'passed')
  assert.equal(status.receipt?.receipt_hash, 'receipt-1')
  assert.deepEqual(status.phases?.map((entry) => entry.phase), [
    'executing',
    'patch_projected',
    'scope_guarding',
    'complete',
  ])
})

test('normalizes show data wrapper preserving full receipt with tests', () => {
  const status = normalizeRunStatusResponse({
    data: {
      run_id: 'dev-4',
      completion_state: 'passed',
      persisted_artifact_refs: {
        'provider_call_result.json': 'receipts/dev-4/provider_call_result.json',
        'diff_parse_result.json': 'receipts/dev-4/diff_parse_result.json',
        'patch_apply_result.json': 'receipts/dev-4/patch_apply_result.json',
        'scope_guard_receipt.json': 'receipts/dev-4/scope_guard_receipt.json',
        'verification_receipt.json': 'receipts/dev-4/verification_receipt.json',
      },
      receipt: {
        run_id: 'dev-4',
        task_contract_hash: 'hash-4',
        completion: { status: 'passed', honesty_flags: [] },
        tests: [
          {
            command: 'composer test',
            ok: true,
            exit_code: 0,
            duration_ms: 42,
          },
        ],
      },
    },
  })

  assert.equal(status.run_id, 'dev-4')
  assert.equal(status.receipt?.completion.status, 'passed')
  assert.equal(status.receipt?.tests?.[0]?.command, 'composer test')
  assert.equal(status.receipt?.tests?.[0]?.ok, true)
  assert.deepEqual(status.phases?.map((entry) => entry.phase), [
    'executing',
    'patch_projected',
    'patch_projected',
    'scope_guarding',
    'complete',
  ])
})

// ───────────────────────────────────────────────────────────────────────────
// F-07 closure (Claude 29): direct contract tests for `normalisePlanResponse`
// against the canonical Laravel /ai/interactions/atlas-dev/plan response shape.
// Sibling file `planResponseNormaliser.test.ts` already covers the same surface
// in detail; these tests pin the *minimum* behaviour Desktop callers depend on
// (client.ts → postAtlasDevPlan → useAtlasDevRun) so a regression in either
// file fails the suite.
// ───────────────────────────────────────────────────────────────────────────

test('normalises canonical plan response data wrapper', () => {
  const plan = normalisePlanResponse({
    data: {
      run_id: 'dev-x',
      routing: { kind: 'atlas_dev_fast_path' },
      confirmation: {
        token: 'tok-1',
        expires_at: 1778960000,
        task_contract_hash: 'hash-1',
      },
      hashes: { task_contract: 'hash-fallback' },
    },
  })

  if (!plan) throw new Error('expected normalised plan, got null')
  assert.equal(plan.run_id, 'dev-x')
  assert.equal(plan.routing_decision, 'atlas_dev_fast_path')
  assert.equal(plan.status, 'ready')
  assert.equal(plan.confirmation_token, 'tok-1')
  assert.equal(plan.task_contract_hash, 'hash-1')
  assert.equal(
    plan.confirmation_expires_at,
    new Date(1778960000 * 1000).toISOString(),
  )
})

test('normalises plan wrapper and falls back to hashes task_contract', () => {
  const plan = normalisePlanResponse({
    plan: {
      run_id: 'dev-x',
      routing: { kind: 'atlas_dev_fast_path' },
      confirmation: { token: 'tok-1', expires_at: 1778960000 },
      hashes: { task_contract: 'hash-fallback' },
    },
  })

  if (!plan) throw new Error('expected normalised plan, got null')
  assert.equal(plan.run_id, 'dev-x')
  assert.equal(plan.routing_decision, 'atlas_dev_fast_path')
  assert.equal(plan.confirmation_token, 'tok-1')
  assert.equal(
    plan.task_contract_hash,
    'hash-fallback',
    'must fall back to hashes.task_contract when confirmation lacks task_contract_hash',
  )
})

test('returns null for invalid plan response', () => {
  assert.equal(normalisePlanResponse(null), null)
  assert.equal(normalisePlanResponse(undefined), null)
  assert.equal(normalisePlanResponse('not-an-object'), null)
  assert.equal(normalisePlanResponse(42), null)
  assert.equal(normalisePlanResponse([]), null)
  assert.equal(normalisePlanResponse([{ run_id: 'dev-x' }]), null)
  assert.equal(normalisePlanResponse({}), null)
  assert.equal(normalisePlanResponse({ data: 'string-not-object' }), null)
  assert.equal(normalisePlanResponse({ data: { routing: { kind: 'atlas_dev_fast_path' } } }), null)
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
