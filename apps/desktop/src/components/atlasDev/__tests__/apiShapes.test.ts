/// <reference types="node" />
import assert from 'node:assert/strict'
import { normalizeRunStartResponse, normalizeRunStatusResponse } from '../apiShapes.ts'

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
