/**
 * Atlas AI · Desktop · view-model `useHyperflowRuntime`.
 *
 * Testa a projeção canônica que o ContextPanel consome. Usa
 * `buildHyperflowRuntimeView` (versão pura, sem React renderer) para validar
 * cada cenário operacional: research, finance, programming com/sem handoff,
 * Forge promotion, nested fallback, ausência total.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { HYPERFLOW_RUNTIME_SCHEMA } from '../hyperflowRuntime.ts'
import { buildHyperflowRuntimeView } from '../useHyperflowRuntime.ts'

test('view-model · research trace projeta intent/flow/runtime corretamente', () => {
  const trace = {
    id: 't-research',
    status: 'succeeded',
    hyperflow: {
      schema_version: HYPERFLOW_RUNTIME_SCHEMA,
      intent: 'research',
      domain_id: 'research',
      flow_id: 'atlas_research',
      runtime_mode: 'deep',
      confidence: 0.72,
      dispatch_status: 'planned',
      handoff_target: null,
      handoff_reason: null,
      reasons: ['intent_type:research', 'primary_domain:research'],
    },
  }
  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.isReady, true)
  assert.equal(view.isPending, false)
  assert.equal(view.intent, 'research')
  assert.equal(view.intentLabel, 'Pesquisa')
  assert.equal(view.domainId, 'research')
  assert.equal(view.flowId, 'atlas_research')
  assert.equal(view.runtimeMode, 'deep')
  assert.equal(view.confidence, 0.72)
  assert.equal(view.handoffTarget, null)
  assert.equal(view.isForgeHandoff, false)
  assert.equal(view.isDevHandoff, false)
  assert.deepEqual(view.reasons, ['intent_type:research', 'primary_domain:research'])
  assert.equal(view.routingReasonSummary, 'intent_type:research · primary_domain:research')
})

test('view-model · finance trace NUNCA vira programming.dev nem handoff_target=atlas_dev', () => {
  const trace = {
    id: 't-finance',
    status: 'succeeded',
    hyperflow: {
      intent: 'finance',
      domain_id: 'finance',
      flow_id: 'finance.analyze',
      runtime_mode: 'standard',
      confidence: 0.66,
      dispatch_status: 'planned',
      handoff_target: null,
    },
  }
  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.intent, 'finance')
  assert.equal(view.intentLabel, 'Finanças')
  assert.equal(view.domainId, 'finance')
  assert.notEqual(view.flowId, 'programming.dev')
  assert.equal(view.handoffTarget, null)
  assert.equal(view.isDevHandoff, false, 'finance NUNCA pode ser interpretado como Dev handoff')
  assert.equal(view.isForgeHandoff, false)
})

test('view-model · programming + handoff=atlas_dev sinaliza isDevHandoff', () => {
  const trace = {
    id: 't-dev',
    status: 'processing',
    hyperflow: {
      intent: 'programming',
      domain_id: 'programming',
      flow_id: 'atlas_dev',
      runtime_mode: 'standard',
      confidence: 0.81,
      dispatch_status: 'simulated',
      handoff_target: 'atlas_dev',
      handoff_reason: 'hyperflow_programming_flow_handoff',
    },
  }
  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.isDevHandoff, true)
  assert.equal(view.isForgeHandoff, false)
  assert.equal(view.handoffTarget, 'atlas_dev')
  assert.equal(view.handoffReason, 'hyperflow_programming_flow_handoff')
  assert.equal(view.dispatchStatus, 'simulated')
})

test('view-model · programming + handoff=atlas_forge sinaliza isForgeHandoff', () => {
  const trace = {
    id: 't-forge',
    status: 'succeeded',
    hyperflow: {
      intent: 'programming',
      domain_id: 'programming',
      flow_id: 'atlas_forge',
      runtime_mode: 'forge',
      confidence: 0.93,
      dispatch_status: 'planned',
      handoff_target: 'atlas_forge',
      handoff_reason: 'obra_required_workspace_present',
    },
  }
  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.isForgeHandoff, true)
  assert.equal(view.isDevHandoff, false)
  assert.equal(view.handoffTarget, 'atlas_forge')
  assert.equal(view.runtimeMode, 'forge')
})

test('view-model · programming sem handoff_target NÃO sinaliza Dev/Forge', () => {
  const trace = {
    id: 't-prog-no-handoff',
    status: 'succeeded',
    hyperflow: {
      intent: 'programming',
      domain_id: 'programming',
      flow_id: 'atlas_dev',
      runtime_mode: 'standard',
      confidence: 0.7,
      dispatch_status: 'planned',
      handoff_target: null,
    },
  }
  const view = buildHyperflowRuntimeView(trace)
  // Backend não declarou handoff → UI não pode pretender que houve.
  assert.equal(view.isDevHandoff, false)
  assert.equal(view.isForgeHandoff, false)
  assert.equal(view.handoffTarget, null)
})

test('view-model · trace null sem status retorna estado vazio (não pending)', () => {
  const view = buildHyperflowRuntimeView(null)
  assert.equal(view.isReady, false)
  assert.equal(view.isPending, false)
  assert.equal(view.intent, null)
  assert.equal(view.intentLabel, null)
  assert.equal(view.flowId, null)
  assert.equal(view.routingReasonSummary, '')
})

test('view-model · trace queued sem hyperflow ainda → isPending=true', () => {
  const view = buildHyperflowRuntimeView({ id: 't-q', status: 'queued' })
  assert.equal(view.isReady, false)
  assert.equal(view.isPending, true)
})

test('view-model · trace processing sem hyperflow ainda → isPending=true', () => {
  const view = buildHyperflowRuntimeView({ id: 't-p', status: 'processing' })
  assert.equal(view.isReady, false)
  assert.equal(view.isPending, true)
})

test('view-model · nested metadata.hyperflow_runtime é normalizado em flat', () => {
  const trace = {
    id: 't-nested',
    status: 'succeeded',
    metadata: {
      hyperflow_runtime: {
        intent: { intent_type: 'cyber', confidence: 0.78 },
        primary_domain: 'cyber',
        flow_id: 'cyber.defensive',
        router_decision: { routing_mode: 'standard', receipt_hash: 'sha-r' },
        dispatch: { dispatch_status: 'planned' },
        decision_receipt: { receipt_hash: 'sha-d' },
      },
    },
  }
  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.isReady, true)
  assert.equal(view.intent, 'cyber')
  assert.equal(view.intentLabel, 'Cyber')
  assert.equal(view.flowId, 'cyber.defensive')
  assert.equal(view.runtimeMode, 'standard')
  assert.equal(view.receiptHash, 'sha-d')
})

test('view-model · receiptHash exposto como audit trail SHA-256', () => {
  const sha = 'a'.repeat(64)
  const trace = {
    id: 't-receipt',
    hyperflow: {
      intent: 'plan',
      domain_id: 'general',
      flow_id: 'general.plan',
      runtime_mode: 'standard',
      decision_receipt_hash: sha,
    },
  }
  const view = buildHyperflowRuntimeView(trace)
  assert.equal(view.receiptHash, sha)
  assert.equal(view.receiptHash?.length, 64)
})
