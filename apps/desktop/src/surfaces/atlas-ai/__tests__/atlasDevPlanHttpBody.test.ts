import assert from 'node:assert/strict'
import { test } from 'node:test'

import { toAtlasDevPlanHttpBody } from '../atlasDevPlanHttpBody.ts'

test('maps Desktop plan request to backend PlanRequest contract', () => {
  const body = toAtlasDevPlanHttpBody({
    input_text: 'corrigir FooService',
    thread_id: 'thread-1',
    surface_id: 'atlas_desktop_ai',
    workspace: '/tmp/workspace',
    task: 'debug',
    provider: 'claude_cli',
    decision_mode: 'manual_override',
  })

  assert.equal(body.raw_intent, 'corrigir FooService')
  assert.equal(body.surface_id, 'atlas_desktop_ai')
  assert.equal(body.workspace, '/tmp/workspace')
  assert.equal(body.thread_id, 'thread-1')
  assert.deepEqual(body.policy_hints, { decision_mode: 'manual_override' })
  assert.deepEqual(body.surface_context, {
    composer_mode: 'programming',
    composer_task: 'debug',
    provider_choice: 'claude_cli',
  })
})

test('maps explicit composer compute effort to policy hints and surface context', () => {
  const body = toAtlasDevPlanHttpBody({
    input_text: 'corrigir algoritmo pesado',
    workspace: '/tmp/workspace',
    task: 'dev',
    compute_effort: 'max',
  })

  assert.deepEqual(body.policy_hints, { compute_effort: 'max' })
  assert.deepEqual(body.surface_context, {
    composer_mode: 'programming',
    composer_task: 'dev',
    composer_compute_effort: 'max',
    compute_effort: 'max',
  })
})

test('preserves explicit payload overrides while forcing canonical raw intent', () => {
  const body = toAtlasDevPlanHttpBody({
    input_text: 'usar texto canônico',
    workspace: '/repo',
    payload: {
      raw_intent: 'texto antigo',
      user_constraints: ['limitar escopo'],
      policy_hints: { cost_budget: 'low' },
      surface_context: { conversation_id: 'c-1' },
    },
  })

  assert.equal(body.raw_intent, 'usar texto canônico')
  assert.deepEqual(body.user_constraints, ['limitar escopo'])
  assert.deepEqual(body.policy_hints, { cost_budget: 'low' })
  assert.deepEqual(body.surface_context, { conversation_id: 'c-1', composer_mode: 'programming' })
})

test('defaults surface_id to atlas_desktop_ai when caller omits it', () => {
  const body = toAtlasDevPlanHttpBody({ input_text: 'fix something', workspace: '/repo' })
  assert.equal(body.surface_id, 'atlas_desktop_ai')
})

test('composer_mode=programming is always set, even when payload provides surface_context', () => {
  const body = toAtlasDevPlanHttpBody({
    input_text: 'patch foo',
    workspace: '/repo',
    payload: { surface_context: {} },
  })
  const surfaceContext = body.surface_context as Record<string, unknown>
  assert.equal(surfaceContext.composer_mode, 'programming')
})

test('composer_mode override in payload survives (operator opts out of programming explicitly)', () => {
  // Defensive: the helper only sets `composer_mode=programming` when the
  // payload doesn't already declare one. If the operator explicitly sent
  // a different mode the helper must respect it so Atlas AI Router can drive.
  const body = toAtlasDevPlanHttpBody({
    input_text: 'qa stuff',
    workspace: '/repo',
    payload: { surface_context: { composer_mode: 'operational' } },
  })
  const surfaceContext = body.surface_context as Record<string, unknown>
  assert.equal(surfaceContext.composer_mode, 'operational')
})

test('legacy payload.raw_intent NEVER wins over request.input_text', () => {
  const body = toAtlasDevPlanHttpBody({
    input_text: 'canon',
    workspace: '/repo',
    payload: { raw_intent: 'legacy ghost' },
  })
  assert.equal(body.raw_intent, 'canon')
})

test('payload spread cannot overwrite canonical top-level keys', () => {
  // F-08 safety: anything the operator stuffed into `payload` is spread first,
  // then the canonical fields override it. So a malicious payload can't
  // smuggle `surface_id`, `workspace`, `thread_id`, `raw_intent`, `policy_hints`
  // or `surface_context` past the helper.
  const body = toAtlasDevPlanHttpBody({
    input_text: 'canon',
    workspace: '/canonical/workspace',
    thread_id: 'canon-thread',
    surface_id: 'atlas_desktop_ai',
    decision_mode: 'atlas_decide',
    payload: {
      surface_id: 'attacker_surface',
      workspace: '/attacker/workspace',
      thread_id: 'attacker-thread',
      raw_intent: 'attacker intent',
      policy_hints: { decision_mode: 'manual_override', allow_dangerous: true },
      surface_context: { composer_mode: 'attacker_mode', policy_hints: { decision_mode: 'manual_override' } },
    },
  })

  assert.equal(body.surface_id, 'atlas_desktop_ai')
  assert.equal(body.workspace, '/canonical/workspace')
  assert.equal(body.thread_id, 'canon-thread')
  assert.equal(body.raw_intent, 'canon')

  // Canonical decision_mode wins inside top-level policy_hints — but other
  // payload-provided policy_hints fields (like allow_dangerous) are preserved
  // because Desktop trusts whoever filled payload.policy_hints to be the
  // operator. What MUST not happen: the nested policy_hints inside
  // surface_context leaking into top-level policy_hints.
  const policy = body.policy_hints as Record<string, unknown>
  assert.equal(policy.decision_mode, 'atlas_decide')
  assert.equal(policy.allow_dangerous, true)
})

test('does NOT send legacy input_text as a top-level field — backend only reads raw_intent', () => {
  const body = toAtlasDevPlanHttpBody({
    input_text: 'corrigir teste',
    workspace: '/repo',
  })
  // The backend PlanRequest is documented to read `raw_intent`. If Desktop
  // accidentally surfaced `input_text` too the contract would be ambiguous.
  assert.equal('input_text' in body, false, 'input_text must NOT leak into the request body')
  assert.equal(body.raw_intent, 'corrigir teste')
})

test('policy_hints nested inside surface_context is NOT promoted to top-level', () => {
  // Backend reads policy_hints ONLY at the top level. If Desktop accidentally
  // copied a nested `surface_context.policy_hints` to the top level we would
  // give the operator a hidden override path.
  const body = toAtlasDevPlanHttpBody({
    input_text: 'foo',
    workspace: '/repo',
    decision_mode: 'atlas_decide',
    payload: {
      surface_context: {
        policy_hints: { decision_mode: 'manual_override', cost_budget: 'high' },
      },
    },
  })

  const policy = body.policy_hints as Record<string, unknown>
  assert.equal(policy.decision_mode, 'atlas_decide', 'top-level policy_hints driven by request.decision_mode')
  assert.equal(policy.cost_budget, undefined, 'nested surface_context.policy_hints must not be promoted')
  // The nested copy is allowed to survive inside surface_context (backend
  // ignores it); test makes the boundary explicit.
  const surfaceContext = body.surface_context as Record<string, unknown>
  assert.ok(surfaceContext.policy_hints, 'nested copy stays inside surface_context')
})

test('thread_id defaults to null when caller omits it', () => {
  const body = toAtlasDevPlanHttpBody({ input_text: 'foo', workspace: '/repo' })
  assert.equal(body.thread_id, null)
})

test('user_constraints from payload survive untouched', () => {
  const body = toAtlasDevPlanHttpBody({
    input_text: 'foo',
    workspace: '/repo',
    payload: { user_constraints: ['no_db_writes', 'max_1_file'] },
  })
  assert.deepEqual(body.user_constraints, ['no_db_writes', 'max_1_file'])
})

test('provider and task fields land inside surface_context, not at top level', () => {
  const body = toAtlasDevPlanHttpBody({
    input_text: 'foo',
    workspace: '/repo',
    task: 'dev',
    provider: 'claude_cli',
  })
  assert.equal('task' in body, false)
  assert.equal('provider' in body, false)
  assert.equal('decision_mode' in body, false)
  const sc = body.surface_context as Record<string, unknown>
  assert.equal(sc.composer_task, 'dev')
  assert.equal(sc.provider_choice, 'claude_cli')
})
