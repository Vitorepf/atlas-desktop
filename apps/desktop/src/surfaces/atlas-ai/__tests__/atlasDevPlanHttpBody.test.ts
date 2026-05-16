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
  assert.deepEqual(body.surface_context, {
    composer_task: 'debug',
    provider_choice: 'claude_cli',
    policy_hints: { decision_mode: 'manual_override' },
  })
})

test('preserves explicit payload overrides while forcing canonical raw intent', () => {
  const body = toAtlasDevPlanHttpBody({
    input_text: 'usar texto canônico',
    workspace: '/repo',
    payload: {
      raw_intent: 'texto antigo',
      user_constraints: ['limitar escopo'],
      surface_context: { conversation_id: 'c-1' },
    },
  })

  assert.equal(body.raw_intent, 'usar texto canônico')
  assert.deepEqual(body.user_constraints, ['limitar escopo'])
  assert.deepEqual(body.surface_context, { conversation_id: 'c-1' })
})
