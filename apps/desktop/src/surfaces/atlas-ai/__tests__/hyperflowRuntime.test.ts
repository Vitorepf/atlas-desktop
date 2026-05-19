/**
 * Atlas AI · Desktop · helpers Hyperflow runtime.
 *
 * Cobre `extractHyperflow` (flat/nested/payload paths), `isAutoAutoCleanPayload`,
 * `intentLabelFor` (13 intents canônicos), `formatRoutingReason` e
 * `flowIdFromRuntime`. Espelha invariantes do mobile.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  extractHyperflow,
  flowIdFromRuntime,
  formatRoutingReason,
  HYPERFLOW_RUNTIME_SCHEMA,
  intentLabelFor,
  isAutoAutoCleanPayload,
} from '../hyperflowRuntime.ts'

test('extractHyperflow · flat shape (trace.hyperflow) é o caminho canônico', () => {
  const trace = {
    id: 't1',
    hyperflow: {
      schema_version: HYPERFLOW_RUNTIME_SCHEMA,
      intent: 'research',
      domain_id: 'research',
      flow_id: 'atlas_research',
      runtime_mode: 'deep',
      confidence: 0.72,
      dispatch_status: 'planned',
      handoff_target: null,
    },
  }
  const result = extractHyperflow(trace)
  assert.equal(result?.intent, 'research')
  assert.equal(result?.flow_id, 'atlas_research')
  assert.equal(result?.runtime_mode, 'deep')
})

test('extractHyperflow · nested em metadata.hyperflow_runtime é fallback aceitável', () => {
  const trace = {
    id: 't2',
    metadata: {
      hyperflow_runtime: {
        schema_version: HYPERFLOW_RUNTIME_SCHEMA,
        status: 'ready',
        intent: { intent_type: 'finance', confidence: 0.81 },
        primary_domain: 'finance',
        flow_id: 'finance.analyze',
        router_decision: { routing_mode: 'standard', receipt_hash: 'sha-router' },
        dispatch: { dispatch_status: 'simulated' },
        decision_receipt: { receipt_hash: 'sha-receipt' },
      },
    },
  }
  const result = extractHyperflow(trace)
  assert.equal(result?.intent, 'finance')
  assert.equal(result?.domain_id, 'finance')
  assert.equal(result?.flow_id, 'finance.analyze')
  assert.equal(result?.runtime_mode, 'standard')
  assert.equal(result?.dispatch_status, 'simulated')
  assert.equal(result?.decision_receipt_hash, 'sha-receipt')
  assert.equal(result?.confidence, 0.81)
})

test('extractHyperflow · nested em payload.hyperflow_runtime também é aceito', () => {
  const trace = {
    id: 't3',
    payload: {
      hyperflow_runtime: {
        schema_version: HYPERFLOW_RUNTIME_SCHEMA,
        intent: { intent_type: 'programming', confidence: 0.9 },
        primary_domain: 'programming',
        flow_id: 'atlas_dev',
        handoff_target: { kind: 'atlas_dev', flow_id: 'atlas_dev' },
      },
    },
  }
  const result = extractHyperflow(trace)
  assert.equal(result?.intent, 'programming')
  assert.equal(result?.handoff_target, 'atlas_dev')
  assert.equal(result?.flow_id, 'atlas_dev')
})

test('extractHyperflow · trace null/undefined/sem hyperflow retorna null (NÃO inventa)', () => {
  assert.equal(extractHyperflow(null), null)
  assert.equal(extractHyperflow(undefined), null)
  assert.equal(extractHyperflow({}), null)
  assert.equal(extractHyperflow({ id: 'no-hyperflow' }), null)
  assert.equal(extractHyperflow({ metadata: { other: 'thing' } }), null)
  assert.equal(extractHyperflow({ payload: { unrelated: true } }), null)
})

test('extractHyperflow · prioriza flat sobre nested quando ambos presentes', () => {
  const trace = {
    hyperflow: {
      intent: 'research',
      domain_id: 'research',
      flow_id: 'atlas_research',
      runtime_mode: 'deep',
      confidence: 0.7,
      dispatch_status: 'planned',
      handoff_target: null,
    },
    metadata: {
      hyperflow_runtime: {
        intent: { intent_type: 'finance' },
        primary_domain: 'finance',
        flow_id: 'finance.analyze',
      },
    },
  }
  const result = extractHyperflow(trace)
  assert.equal(result?.intent, 'research', 'flat wins over nested')
})

test('isAutoAutoCleanPayload · auto sem programming_harness é válido', () => {
  const cleanPayload = {
    atlas_mode: 'auto',
    routing_task: 'auto',
    routing_domain: 'auto',
    flow_id: 'auto',
  }
  assert.equal(isAutoAutoCleanPayload(cleanPayload), true)
})

test('isAutoAutoCleanPayload · auto com programming_harness é regressão', () => {
  const dirtyPayload = {
    atlas_mode: 'auto',
    programming_harness: { workspace_required: true },
  }
  assert.equal(isAutoAutoCleanPayload(dirtyPayload), false)
})

test('isAutoAutoCleanPayload · auto com permission_policy também é regressão', () => {
  for (const key of ['capability_profile', 'permission_policy', 'tool_permissions', 'mobile_runtime_policy']) {
    const payload = { atlas_mode: 'auto', [key]: 'qualquer-coisa' }
    assert.equal(
      isAutoAutoCleanPayload(payload),
      false,
      `payload com ${key} em modo auto deve ser inválido`,
    )
  }
})

test('isAutoAutoCleanPayload · não se aplica quando atlas_mode !== auto', () => {
  const programmingPayload = {
    atlas_mode: 'programming',
    programming_harness: { workspace_required: true },
    capability_profile: 'atlas_programming',
  }
  assert.equal(isAutoAutoCleanPayload(programmingPayload), true)
})

test('intentLabelFor · cobre os 13 intents canônicos + unknown', () => {
  const expected: Record<string, string> = {
    conversation: 'Conversa',
    research: 'Pesquisa',
    programming: 'Programação',
    debug: 'Debug',
    review: 'Review',
    explain: 'Explicar',
    plan: 'Plano',
    finance: 'Finanças',
    marketing: 'Marketing',
    strategy: 'Estratégia',
    cyber: 'Cyber',
    personal_development: 'Pessoal',
    automation: 'Automação',
    unknown: 'Indefinido',
  }
  for (const [intent, label] of Object.entries(expected)) {
    assert.equal(intentLabelFor(intent), label)
  }
})

test('intentLabelFor · null/undefined/string vazia retornam null', () => {
  assert.equal(intentLabelFor(null), null)
  assert.equal(intentLabelFor(undefined), null)
  assert.equal(intentLabelFor(''), null)
})

test('intentLabelFor · intent fora do dicionário retorna o próprio valor', () => {
  assert.equal(intentLabelFor('whatever_new'), 'whatever_new')
})

test('formatRoutingReason · usa reasons quando presente', () => {
  const summary = formatRoutingReason({
    intent: 'research',
    flow_id: 'atlas_research',
    runtime_mode: 'deep',
    reasons: ['intent_type:research', 'primary_domain:research'],
  })
  assert.equal(summary, 'intent_type:research · primary_domain:research')
})

test('formatRoutingReason · sem reasons compõe intent label + flow + mode', () => {
  const summary = formatRoutingReason({
    intent: 'finance',
    flow_id: 'finance.analyze',
    runtime_mode: 'standard',
  })
  assert.equal(summary, 'Finanças · flow:finance.analyze · mode:standard')
})

test('formatRoutingReason · hyperflow null retorna string vazia', () => {
  assert.equal(formatRoutingReason(null), '')
})

test('flowIdFromRuntime · backend wins, sem fallback local', () => {
  assert.equal(
    flowIdFromRuntime({ flow_id: 'atlas_research' }),
    'atlas_research',
  )
  assert.equal(flowIdFromRuntime(null), null)
  assert.equal(flowIdFromRuntime({}), null)
})
