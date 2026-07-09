/**
 * Hyperflow payload contract — guarda os invariantes de roteamento que a
 * tela Atlas AI Desktop deve respeitar:
 *
 *   - default `auto/auto` envia `routing_domain='auto'` + `routing_task='auto'`.
 *   - `auto` NUNCA arrasta `programming_harness`/`tool_permissions`/
 *     `capability_profile=atlas_programming` no payload.
 *   - programming + dev mantém o payload Atlas Dev canônico.
 *   - `flowIdForMode` para `auto` retorna o token `auto` (não inventa flow).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildInteractionPayload,
  defaultTaskForMode,
  flowIdForMode,
  isTaskAllowedForMode,
  MODE_OPTIONS,
  openBrainPayloadForRouting,
  taskOptionsForMode,
} from '../contract.ts'

test('default auto/auto envia routing_domain=auto + routing_task=auto', () => {
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
  assert.equal(payload.operator_compute_effort, 'auto')
  assert.equal('compute_effort' in payload, false)
})

test('compute effort explícito entra como policy hint sem trocar provider', () => {
  const { payload, provider } = buildInteractionPayload({
    mode: 'research',
    task: 'plan',
    provider: 'auto',
    computeEffort: 'deep',
    workspaceSlug: null,
  })

  assert.equal(provider, undefined)
  assert.equal(payload.decision_mode, 'atlas_decide')
  assert.equal(payload.operator_compute_effort, 'deep')
  assert.equal(payload.compute_effort, 'deep')
  assert.deepEqual(payload.policy_hints, { compute_effort: 'deep' })
})

test('auto mode NÃO arrasta programming_harness nem permission_policy', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: '/Users/op/atlas',
  })

  assert.equal('programming_harness' in payload, false, 'programming_harness não pode vazar em auto')
  assert.equal('capability_profile' in payload, false, 'capability_profile não pode vazar em auto')
  assert.equal('permission_policy' in payload, false, 'permission_policy não pode vazar em auto')
  assert.equal('tool_permissions' in payload, false, 'tool_permissions não pode vazar em auto')
})

test('programming + dev mantém payload Atlas Dev (capability + harness)', () => {
  const { payload } = buildInteractionPayload({
    mode: 'programming',
    task: 'dev',
    provider: 'auto',
    workspaceSlug: '/Users/op/atlas',
  })

  assert.equal(payload.atlas_mode, 'programming')
  assert.equal(payload.flow_id, 'programming.dev')
  assert.equal(payload.domain_id, 'programming')
  assert.equal(payload.routing_task, 'dev')
  assert.equal(payload.capability_profile, 'atlas_programming')
  assert.equal(payload.permission_policy, 'full_access')
  assert.ok(payload.programming_harness, 'programming_harness exigido em programming')
  // routing_domain vira workspace slug por compat Atlas Dev quando programming + workspace presente
  assert.equal(payload.routing_domain, '/Users/op/atlas')
})

test('flowIdForMode(auto, auto) retorna o token "auto" — front NÃO inventa flow', () => {
  assert.equal(flowIdForMode('auto', 'auto'), 'auto')
  assert.equal(flowIdForMode('auto', 'direct'), 'auto')
})

test('flowIdForMode(programming, debug) → programming.repair (canon Atlas Dev)', () => {
  assert.equal(flowIdForMode('programming', 'debug'), 'programming.repair')
  assert.equal(flowIdForMode('programming', 'review'), 'programming.review')
  assert.equal(flowIdForMode('programming', 'dev'), 'programming.dev')
})

test('MODE_OPTIONS lista todos os 12 modos canônicos com auto primeiro', () => {
  const values: ReadonlyArray<string> = MODE_OPTIONS.map((o) => o.value)
  assert.equal(values[0], 'auto', 'auto deve ser o primeiro modo apresentado ao operador')
  for (const expected of [
    'auto',
    'general',
    'conversation',
    'operational',
    'programming',
    'research',
    'finance',
    'marketing',
    'strategy',
    'personal_development',
    'cyber',
    'automation',
  ]) {
    assert.ok(values.includes(expected), `MODE_OPTIONS deve incluir ${expected}`)
  }
})

test('defaultTaskForMode(auto) === "auto" — sem coagir para dev', () => {
  assert.equal(defaultTaskForMode('auto'), 'auto')
  assert.equal(defaultTaskForMode('programming'), 'dev')
  assert.equal(defaultTaskForMode('general'), 'direct')
})

test('isTaskAllowedForMode(auto, dev) === false — dev só com programming explícito', () => {
  assert.equal(isTaskAllowedForMode('dev', 'auto'), false)
  assert.equal(isTaskAllowedForMode('debug', 'auto'), false)
  assert.equal(isTaskAllowedForMode('dev', 'programming'), true)
  assert.equal(isTaskAllowedForMode('auto', 'auto'), true)
})

test('taskOptionsForMode(auto) inclui auto como primeira opção', () => {
  const tasks = taskOptionsForMode('auto')
  assert.equal(tasks[0]?.value, 'auto')
})

test('research + plan envia routing_domain=research (operator override claro)', () => {
  const { payload } = buildInteractionPayload({
    mode: 'research',
    task: 'plan',
    provider: 'auto',
    workspaceSlug: null,
  })

  assert.equal(payload.atlas_mode, 'research')
  assert.equal(payload.routing_domain, 'research')
  assert.equal(payload.routing_task, 'plan')
  assert.equal(payload.flow_id, 'research.investigate')
  // Mesmo com mode explícito, harness de programming NÃO vaza
  assert.equal('programming_harness' in payload, false)
})

test('cyber + review NÃO ativa programming_harness mesmo com workspace presente', () => {
  const { payload } = buildInteractionPayload({
    mode: 'cyber',
    task: 'review',
    provider: 'auto',
    workspaceSlug: '/repo',
  })

  assert.equal(payload.atlas_mode, 'cyber')
  assert.equal(payload.flow_id, 'cyber.defensive')
  assert.equal('programming_harness' in payload, false)
})

test('OB-05: programming/dev/debug/review inject open_brain provider-safe hint', () => {
  const programming = buildInteractionPayload({
    mode: 'programming',
    task: 'dev',
    provider: 'auto',
    workspaceSlug: '/Users/op/atlas',
  })
  const openBrain = programming.payload.open_brain as Record<string, unknown>
  assert.ok(openBrain, 'open_brain block required for programming')
  assert.equal(openBrain.mode, 'auto')
  assert.equal(openBrain.surface, 'app_ai')
  assert.equal(openBrain.provider_safe_only, true)
  assert.deepEqual(openBrain.policy, {
    provider_safe_only: true,
    raw_text_exposed: false,
    raw_logs_allowed: false,
    providers_invoked: false,
  })

  const review = buildInteractionPayload({
    mode: 'operational',
    task: 'review',
    provider: 'auto',
    workspaceSlug: null,
  })
  assert.ok(review.payload.open_brain, 'open_brain required for review task')

  const debug = buildInteractionPayload({
    mode: 'programming',
    task: 'debug',
    provider: 'auto',
    workspaceSlug: null,
  })
  assert.ok(debug.payload.open_brain, 'open_brain required for debug task')
})

test('OB-05: auto/direct and light modes omit open_brain (no spurious injection)', () => {
  const auto = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  assert.equal('open_brain' in auto.payload, false)

  const general = buildInteractionPayload({
    mode: 'general',
    task: 'direct',
    provider: 'auto',
    workspaceSlug: null,
  })
  assert.equal('open_brain' in general.payload, false)
  assert.equal(openBrainPayloadForRouting({ mode: 'research', task: 'plan' }), undefined)
})

test('OB-05: open_brain hint never carries raw sensitive leakage keys', () => {
  const { payload } = buildInteractionPayload({
    mode: 'programming',
    task: 'dev',
    provider: 'auto',
    workspaceSlug: '/Users/op/secret-workspace',
  })
  const openBrain = payload.open_brain as Record<string, unknown>
  const keys = Object.keys(openBrain)
  assert.deepEqual(keys.sort(), ['mode', 'policy', 'provider_safe_only', 'surface'].sort())
  assert.equal(openBrain.provider_safe_only, true)
  assert.equal((openBrain.policy as Record<string, unknown>).raw_text_exposed, false)
  assert.equal((openBrain.policy as Record<string, unknown>).raw_logs_allowed, false)
  for (const forbidden of [
    'prompt_section',
    'raw_content',
    'memory_text',
    'secret',
    'api_key',
    'password',
    'conversation_context',
    'context_pack',
    'context_delivery_policy',
  ]) {
    assert.equal(keys.includes(forbidden), false, `open_brain must not expose key ${forbidden}`)
  }
  const serialized = JSON.stringify(openBrain)
  assert.equal(serialized.includes('/Users/'), false, 'open_brain must not embed workspace paths')
  assert.equal(serialized.includes('secret-workspace'), false, 'open_brain must not embed workspace slug')
})
