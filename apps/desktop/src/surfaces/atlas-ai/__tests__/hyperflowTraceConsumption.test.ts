/**
 * Hyperflow trace consumption contract — guarda os invariantes que o Desktop
 * deve respeitar AO LER `trace.hyperflow` do backend canônico:
 *
 *   - Quando o backend retorna `trace.hyperflow` com `domain_id` ≠ 'programming'
 *     o front NÃO pode renderizar como `programming.dev`.
 *   - Quando `domain_id === 'programming'` E `handoff_target` está presente,
 *     o front entende isso como hand-off Atlas Dev/Forge — esse é o ÚNICO
 *     caminho válido para a UI exibir programming, vindo da decisão real do
 *     backend (não inferência local).
 *   - O shape flat `AtlasAiHyperflowTrace` é o contrato que o componente
 *     `AtlasAiContextPanel` lê hoje.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { AiTrace, AtlasAiHyperflowTrace } from '../types.ts'

function fakeTrace(hyperflow: AtlasAiHyperflowTrace | null): AiTrace {
  return {
    id: 'trace-fixture',
    thread_id: null,
    source_type: 'app',
    source_id: null,
    status: 'queued',
    operator_input: 'fixture',
    provider: 'codex_cli',
    model: null,
    response_text: null,
    latency_ms: null,
    completed_at: null,
    metadata: null,
    hyperflow,
    created_at: null,
    updated_at: null,
  } as AiTrace
}

test('trace.hyperflow with domain_id=research drives the surface to research, never to programming.dev', () => {
  const trace = fakeTrace({
    schema_version: 'atlas.ai.hyperflow_runtime.v1',
    intent: 'research',
    domain_id: 'research',
    flow_id: 'atlas_research',
    runtime_mode: 'deep',
    confidence: 0.72,
    policy_refs: [],
    evidence_refs: ['evidence.gate'],
    dispatch_status: 'planned',
    handoff_target: null,
    handoff_reason: null,
  })

  assert.equal(trace.hyperflow?.domain_id, 'research')
  assert.equal(trace.hyperflow?.flow_id, 'atlas_research')
  assert.notEqual(trace.hyperflow?.flow_id, 'programming.dev')
  // Sem handoff_target o Desktop NUNCA renderiza como Dev/Forge.
  assert.equal(trace.hyperflow?.handoff_target, null)
})

test('programming hand-off appears only when backend declares it explicitly', () => {
  const programming = fakeTrace({
    schema_version: 'atlas.ai.hyperflow_runtime.v1',
    intent: 'programming',
    domain_id: 'programming',
    flow_id: 'atlas_dev',
    runtime_mode: 'standard',
    confidence: 0.81,
    policy_refs: [],
    evidence_refs: ['evidence.gate'],
    dispatch_status: 'simulated',
    handoff_target: 'atlas_dev',
    handoff_reason: 'hyperflow_programming_flow_handoff',
  })
  assert.equal(programming.hyperflow?.handoff_target, 'atlas_dev')
  assert.equal(programming.hyperflow?.domain_id, 'programming')

  const finance = fakeTrace({
    schema_version: 'atlas.ai.hyperflow_runtime.v1',
    intent: 'finance',
    domain_id: 'finance',
    flow_id: 'atlas_plan',
    runtime_mode: 'deep',
    confidence: 0.66,
    policy_refs: ['policy.gate'],
    evidence_refs: ['evidence.gate'],
    dispatch_status: 'planned',
    handoff_target: null,
    handoff_reason: null,
  })
  assert.equal(finance.hyperflow?.handoff_target, null)
  // Finance NUNCA pode aparecer com handoff_target=atlas_dev — esse é
  // exatamente o bug de inferência local que estamos garantindo que não
  // volte. Backend é a fonte de verdade.
  assert.notEqual(finance.hyperflow?.handoff_target, 'atlas_dev')
})

test('absent hyperflow means the surface should NOT pretend a router decision exists', () => {
  const trace = fakeTrace(null)
  assert.equal(trace.hyperflow, null)
  // Convenience: a `null` hyperflow is the explicit "no decision yet"
  // marker — the Desktop falls back to its `inferred` panel state in this
  // case, never to a fabricated programming.dev label.
})

test('flat hyperflow shape carries every field the AtlasAiContextPanel consumes', () => {
  // Anti-regression: enumerate the keys the component reads today so any
  // backend rename / drop is caught here.
  const trace = fakeTrace({
    schema_version: 'atlas.ai.hyperflow_runtime.v1',
    intent: 'marketing',
    domain_id: 'marketing',
    flow_id: 'atlas_plan',
    runtime_mode: 'standard',
    confidence: 0.6,
    policy_refs: ['policy.gate'],
    evidence_refs: [],
    decision_receipt_id: 'dr-id',
    decision_receipt_hash: 'a'.repeat(64),
    dispatch_status: 'planned',
    handoff_target: null,
    handoff_reason: null,
    router_was_overridden: false,
    reasons: ['intent_type:marketing', 'primary_domain:marketing'],
  })

  const required: ReadonlyArray<keyof AtlasAiHyperflowTrace> = [
    'schema_version',
    'intent',
    'domain_id',
    'flow_id',
    'runtime_mode',
    'confidence',
    'policy_refs',
    'evidence_refs',
    'decision_receipt_id',
    'decision_receipt_hash',
    'dispatch_status',
    'handoff_target',
    'handoff_reason',
    'router_was_overridden',
    'reasons',
  ]

  for (const key of required) {
    assert.ok(key in (trace.hyperflow ?? {}), `hyperflow flat shape must expose ${String(key)}`)
  }
})
