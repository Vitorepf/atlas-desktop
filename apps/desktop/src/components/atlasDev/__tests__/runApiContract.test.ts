/// <reference types="node" />
/**
 * Contract tests for the Desktop run API surface:
 *
 *   - runAtlasDev (POST /ai/interactions/atlas-dev/run)
 *   - fetchAtlasDevRunStatus (GET /ai/interactions/atlas-dev/runs/{id})
 *
 * Drives them with a hand-rolled fetch stub so the test never opens a real
 * socket and never exposes a confirmation token outside the test harness.
 */
import assert from 'node:assert/strict'

import { fetchAtlasDevRunStatus, runAtlasDev } from '../api.ts'

const SECRET_TOKEN = 'plain-secret-token-must-never-leak-1234'

const cases: Array<{ name: string; run: () => Promise<void> }> = []
function test(name: string, run: () => Promise<void>): void {
  cases.push({ name, run })
}

type FetchInit = { method?: string; headers?: HeadersInit; body?: BodyInit; signal?: AbortSignal }
type FetchCall = { url: string; init: FetchInit }

interface StubResponse {
  status?: number
  ok?: boolean
  jsonBody?: unknown
  textBody?: string
}

function installFetch(stub: (input: { url: string; init: FetchInit }) => StubResponse): {
  calls: FetchCall[]
  restore: () => void
} {
  const calls: FetchCall[] = []
  const original = globalThis.fetch
  globalThis.fetch = ((input: unknown, init?: FetchInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input as Request).url
    const safeInit = init ?? {}
    calls.push({ url, init: safeInit })
    const result = stub({ url, init: safeInit })
    const status = result.status ?? (result.ok === false ? 400 : 200)
    const ok = result.ok ?? (status >= 200 && status < 300)
    const text = result.textBody ?? (result.jsonBody !== undefined ? JSON.stringify(result.jsonBody) : '')
    const response = {
      ok,
      status,
      headers: new Headers(),
      url,
      async json() {
        if (result.jsonBody !== undefined) return result.jsonBody
        return text === '' ? {} : JSON.parse(text)
      },
      async text() {
        return text
      },
      get body() {
        return null
      },
    } as unknown as Response
    return Promise.resolve(response)
  }) as typeof fetch
  return { calls, restore: () => { globalThis.fetch = original } }
}

test('runAtlasDev returns normalised {ok, run_id} for canonical 200 data envelope', async () => {
  const stub = installFetch(() => ({
    status: 200,
    ok: true,
    jsonBody: { data: { run_id: 'dev-100', completion_state: null } },
  }))
  try {
    const result = await runAtlasDev({
      run_id: 'dev-100',
      task_contract_hash: 'h'.repeat(64),
      confirmation_token: SECRET_TOKEN,
      operator_confirmed: true,
    })
    assert.equal(result.ok, true)
    assert.equal(result.run_id, 'dev-100')
    assert.equal(stub.calls.length, 1)
    const sent = JSON.parse(String(stub.calls[0]!.init.body))
    assert.equal(sent.operator_confirmed, true, 'must send literal true, not "true"')
    assert.equal(sent.confirmation_token, SECRET_TOKEN)
  } finally {
    stub.restore()
  }
})

test('runAtlasDev 403 redacts the confirmation_token from the surfaced message', async () => {
  // Worst-case: backend echoes the body back. The Desktop API client must
  // strip the token so it never lands in a toast / log / error report.
  const stub = installFetch(() => ({
    status: 403,
    ok: false,
    textBody: JSON.stringify({
      message: `confirmation_token ${SECRET_TOKEN} rejected: already_used`,
    }),
  }))
  try {
    let raised: unknown = null
    try {
      await runAtlasDev({
        run_id: 'dev-101',
        task_contract_hash: 'h'.repeat(64),
        confirmation_token: SECRET_TOKEN,
        operator_confirmed: true,
      })
    } catch (cause) {
      raised = cause
    }
    assert.ok(raised && typeof raised === 'object', 'expected an AtlasDevRunError')
    const error = raised as { kind: string; message: string; requires_replan: boolean }
    assert.equal(error.kind, 'invalid_token')
    assert.equal(error.requires_replan, true)
    assert.equal(
      error.message.includes(SECRET_TOKEN),
      false,
      `secret token must be redacted, got: ${error.message}`,
    )
    assert.ok(error.message.includes('«redacted»') || error.message.includes('rejected'))
  } finally {
    stub.restore()
  }
})

test('runAtlasDev 422 maps to invalid_hash and requires_replan', async () => {
  const stub = installFetch(() => ({
    status: 422,
    ok: false,
    textBody: '{"message":"task_contract_hash mismatch"}',
  }))
  try {
    let raised: unknown = null
    try {
      await runAtlasDev({
        run_id: 'dev-102',
        task_contract_hash: 'wrong-hash',
        confirmation_token: SECRET_TOKEN,
        operator_confirmed: true,
      })
    } catch (cause) {
      raised = cause
    }
    const error = raised as { kind: string; requires_replan: boolean }
    assert.equal(error.kind, 'invalid_hash')
    assert.equal(error.requires_replan, true)
  } finally {
    stub.restore()
  }
})

test('runAtlasDev 400 maps to forbidden but does NOT force replan', async () => {
  const stub = installFetch(() => ({
    status: 400,
    ok: false,
    textBody: '{"message":"operator_confirmed=true is required"}',
  }))
  try {
    let raised: unknown = null
    try {
      await runAtlasDev({
        run_id: 'dev-103',
        task_contract_hash: 'h'.repeat(64),
        confirmation_token: SECRET_TOKEN,
        operator_confirmed: false as unknown as true,
      })
    } catch (cause) {
      raised = cause
    }
    const error = raised as { kind: string; requires_replan: boolean }
    assert.equal(error.kind, 'forbidden')
    assert.equal(error.requires_replan, false)
  } finally {
    stub.restore()
  }
})

test('runAtlasDev throws when response has no run_id (defensive)', async () => {
  const stub = installFetch(() => ({
    status: 200,
    ok: true,
    jsonBody: { data: { completion_state: 'passed' } },
  }))
  try {
    let raised: unknown = null
    try {
      await runAtlasDev({
        run_id: 'dev-104',
        task_contract_hash: 'h'.repeat(64),
        confirmation_token: SECRET_TOKEN,
        operator_confirmed: true,
      })
    } catch (cause) {
      raised = cause
    }
    const error = raised as { kind: string }
    assert.equal(error.kind, 'unknown')
  } finally {
    stub.restore()
  }
})

test('fetchAtlasDevRunStatus normalises canonical /show data envelope', async () => {
  const stub = installFetch(() => ({
    status: 200,
    ok: true,
    jsonBody: {
      data: {
        run_id: 'dev-200',
        completion_state: 'passed',
        task_contract_hash: 'h'.repeat(64),
        verification_receipt_hash: 'r'.repeat(64),
        persisted_artifact_refs: {
          'verification_receipt.json': 'receipts/dev-200/verification_receipt.json',
          'scope_guard_receipt.json': 'receipts/dev-200/scope_guard_receipt.json',
        },
      },
    },
  }))
  try {
    const status = await fetchAtlasDevRunStatus('dev-200')
    assert.equal(status.run_id, 'dev-200')
    assert.equal(status.state, 'complete')
    assert.equal(status.receipt?.completion?.status, 'passed')
    assert.equal(status.receipt?.receipt_hash, 'r'.repeat(64))
    // Phases derived from artifact refs include scope_guard + verification.
    assert.ok(status.phases?.some((p) => p.phase === 'scope_guarding'))
    assert.ok(status.phases?.some((p) => p.phase === 'complete'))
    // No absolute path leaked through artifact refs.
    const serialized = JSON.stringify(status)
    assert.equal(serialized.includes('/Users/'), false)
    assert.equal(serialized.includes('/private/var/'), false)
  } finally {
    stub.restore()
  }
})

test('fetchAtlasDevRunStatus rejects with classified error on 404 (no replan)', async () => {
  const stub = installFetch(() => ({
    status: 404,
    ok: false,
    textBody: '{"error":{"code":"RUN_NOT_FOUND","message":"no plan for run_id"}}',
  }))
  try {
    let raised: unknown = null
    try {
      await fetchAtlasDevRunStatus('dev-404')
    } catch (cause) {
      raised = cause
    }
    const error = raised as { kind: string; requires_replan: boolean }
    assert.equal(error.kind, 'unknown')
  } finally {
    stub.restore()
  }
})

let failed = 0
;(async () => {
  for (const { name, run } of cases) {
    try {
      await run()
      process.stdout.write(`  ✓ ${name}\n`)
    } catch (cause) {
      failed += 1
      process.stdout.write(`  ✗ ${name}\n`)
      process.stdout.write(`    ${(cause as Error).message}\n`)
    }
  }
  process.stdout.write(`\n${cases.length - failed}/${cases.length} passed\n`)
  if (failed > 0) process.exit(1)
})()
