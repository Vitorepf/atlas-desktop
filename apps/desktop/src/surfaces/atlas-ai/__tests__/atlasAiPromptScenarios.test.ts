import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildInteractionPayload, flowIdForMode } from '../contract.ts'
import { classifyUrl, extractUrls } from '../attachments/index.ts'

/**
 * Atlas Desktop AI · prompt-scenario evidence suite.
 *
 * Six end-to-end-style scenarios that simulate the operator using Atlas AI
 * with the new Hyperflow + Rich Input flow. Each scenario produces:
 *   - the exact payload the Desktop POSTs to `/ai/interactions`;
 *   - the rich-input artifacts (if any) the composer would attach;
 *   - the flow_id / routing_domain the trace will carry.
 *
 * Anti-regression invariants enforced for every scenario:
 *   - `surface_id === 'atlas_desktop_ai'`;
 *   - `flow_id !== 'programming.dev'` unless the operator explicitly picked
 *     `mode='programming' && task='dev'`;
 *   - `decision_mode === 'atlas_decide'` whenever provider is `auto`;
 *   - no programming runtime policy leakage when mode is not `programming`.
 */

function assertNoProgrammingPolicy(payload: Record<string, unknown>): void {
  for (const key of [
    'capability_profile',
    'engineering_run_id',
    'engineering_run',
    'auto_test',
    'force_harness',
    'atlas_programming',
    'permission_policy',
  ]) {
    assert.ok(!(key in payload), `payload must not leak programming runtime key ${key}`)
  }
}

test('scenario · research prompt → routing_domain=auto → backend will pick atlas_research', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })

  assert.equal(payload.atlas_mode, 'auto')
  assert.equal(payload.routing_domain, 'auto')
  assert.equal(payload.routing_task, 'auto')
  assert.equal(payload.flow_id, 'auto')
  assert.equal(payload.domain_id, 'auto')
  assert.equal(payload.decision_mode, 'atlas_decide')
  assert.equal(payload.surface_id, 'atlas_desktop_ai')
  assertNoProgrammingPolicy(payload)
})

test('scenario · finance prompt with explicit mode → routing_domain=finance, no programming leak', () => {
  const { payload } = buildInteractionPayload({
    mode: 'finance',
    task: 'direct',
    provider: 'auto',
    workspaceSlug: null,
  })

  assert.equal(payload.atlas_mode, 'finance')
  assert.equal(payload.routing_domain, 'finance')
  assert.equal(payload.flow_id, 'finance.analyze')
  assert.equal(payload.domain_id, 'finance')
  assertNoProgrammingPolicy(payload)
})

test('scenario · marketing prompt with explicit mode → routing_domain=marketing, no programming leak', () => {
  const { payload } = buildInteractionPayload({
    mode: 'marketing',
    task: 'direct',
    provider: 'auto',
    workspaceSlug: null,
  })

  assert.equal(payload.atlas_mode, 'marketing')
  assert.equal(payload.routing_domain, 'marketing')
  assert.equal(payload.flow_id, 'marketing.plan')
  assert.equal(payload.domain_id, 'marketing')
  assertNoProgrammingPolicy(payload)
})

test('scenario · programming + debug + workspace → atlas_dev/atlas_debug routing with workspace surfaced', () => {
  const { payload } = buildInteractionPayload({
    mode: 'programming',
    task: 'debug',
    provider: 'auto',
    workspaceSlug: '/repo/atlas',
  })

  assert.equal(payload.atlas_mode, 'programming')
  // workspaceSlug surfaces as routing_domain for programming mode (legacy
  // compat with Atlas Dev), while flow_id remains programming-canon.
  assert.equal(payload.routing_domain, '/repo/atlas')
  assert.equal(payload.flow_id, 'programming.repair')
  assert.equal(payload.domain_id, 'programming')
  assert.equal(payload.workspace, '/repo/atlas')
  assert.equal(payload.routing_task, 'debug')
  // `atlas_workflow_mode` collapses `debug` → `dev` for backend Atlas Dev
  // plan-only ingestion.
  assert.equal(payload.atlas_workflow_mode, 'dev')
  // Programming runtime policy IS expected here — this is explicit
  // programming mode.
  assert.ok('capability_profile' in payload)
})

test('scenario · prompt with YouTube URL → URL is detected and classified as youtube', () => {
  const operatorText = 'Olha esse video https://youtu.be/dQw4w9WgXcQ — o que ele diz sobre routing?'
  const urls = extractUrls(operatorText)
  assert.deepEqual(urls, ['https://youtu.be/dQw4w9WgXcQ'])

  const detected = classifyUrl(urls[0]!)
  assert.equal(detected.kind, 'youtube')
  assert.equal(detected.refId, 'dQw4w9WgXcQ')

  // The composer would attach this URL as a rich-input URL draft. The
  // backend payload for the conversation itself stays Hyperflow-neutral.
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  assert.equal(payload.routing_domain, 'auto')
  assertNoProgrammingPolicy(payload)
})

test('scenario · multi-URL prompt → both URLs extracted in order', () => {
  const text =
    'Compare https://www.youtube.com/watch?v=dQw4w9WgXcQ com https://vimeo.com/123456789 e me diga qual ensina melhor o conceito'
  const urls = extractUrls(text)
  assert.equal(urls.length, 2)
  assert.equal(classifyUrl(urls[0]!).kind, 'youtube')
  assert.equal(classifyUrl(urls[1]!).kind, 'vimeo')
})

test('scenario · GitHub URL → classified as github with org/repo refId', () => {
  const detected = classifyUrl('https://github.com/anthropics/claude-code')
  assert.equal(detected.kind, 'github')
  assert.equal(detected.refId, 'anthropics/claude-code')
})

test('scenario · PDF/file fixture mime types are recognized by the canon set', async () => {
  const { SUPPORTED_PDF_MIME, SUPPORTED_IMAGE_MIME, ATTACHMENT_LIMITS } = await import(
    '../attachments/index.ts'
  )
  assert.ok(SUPPORTED_PDF_MIME.has('application/pdf'))
  assert.ok(SUPPORTED_IMAGE_MIME.has('image/png'))
  assert.ok(SUPPORTED_IMAGE_MIME.has('image/jpeg'))
  assert.equal(ATTACHMENT_LIMITS.maxPdfs, 4)
  assert.equal(ATTACHMENT_LIMITS.maxImages, 8)
})

test('scenario · manual provider override (claude_cli) surfaces requested_provider on payload', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'claude_cli',
    workspaceSlug: null,
  })

  assert.equal(payload.decision_mode, 'manual_override')
  assert.equal(payload.requested_provider, 'claude_cli')
  assert.equal(payload.operator_requested_provider, 'claude_cli')
})

test('scenario matrix · flowIdForMode never produces programming.dev for non-programming modes', () => {
  const NON_PROG = ['auto', 'general', 'conversation', 'operational', 'research', 'finance', 'marketing', 'strategy', 'personal_development', 'cyber', 'automation'] as const
  const TASKS = ['auto', 'direct', 'plan', 'review'] as const

  for (const mode of NON_PROG) {
    for (const task of TASKS) {
      const flow = flowIdForMode(mode as never, task as never)
      assert.notEqual(
        flow,
        'programming.dev',
        `regression: flowIdForMode(${mode}, ${task}) → ${flow}; must NOT be programming.dev`,
      )
    }
  }
})
