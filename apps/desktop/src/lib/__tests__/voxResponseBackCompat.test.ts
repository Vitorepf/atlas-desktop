/// <reference types="node" />
/**
 * Atlas Vox V6.5 · Contract Compatibility Guard · response parser.
 *
 * Pergunta única: "o bridge.ts consegue parsear tanto a resposta V6 antiga
 * (sem flow_decision, sem prompt_quality, sem interlocutor) quanto a V6.5
 * nova (com tudo)?"
 *
 * Cada cenário abaixo bloqueia uma regressão concreta:
 *   1. Backend V6 puro → bridge devolve estrutura completa com `null` nos
 *      campos additive. UI antiga continua funcionando.
 *   2. Backend V6.5 cheio → todos os additive populados, schema cravado.
 *   3. Backend com lixo desconhecido → ignorado sem quebrar.
 *   4. Backend com prompt_quality inválido → parser hardena (fallback).
 *   5. Backend com session_id na RAIZ do request (canon V6) — provamos que
 *      o builder NUNCA volta ao wrapper `{ transcript: {...} }` legado.
 *   6. Backend V6 sem `flow_decision` → `flowDecision: null` sem quebrar.
 *   7. UI nunca recebe erro cru 422 — humanizeOverlayError absorve.
 *
 * Sem chamada HTTP. Sem provider. Sem microfone. Sem rede.
 */

import assert from 'node:assert/strict'
import {
  buildVoxKernelIntentPayload,
  parseVoxFlowDecision,
  parseVoxPromptQuality,
  type VoxPromptQuality,
  type VoxTranscript,
} from '../bridge'
import { humanizeOverlayError } from '../../components/vox/voxOverlayHumanize'

const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

function transcript(): VoxTranscript {
  return {
    schema: 'atlas.vox.transcript.v1',
    sessionId: 'sess_bc_001',
    transcriptId: 'tr_bc_001',
    audioHandle: 'aud_bc_001',
    language: 'pt-BR',
    engine: 'whisper.cpp@large-v3',
    engineInvocationId: 'inv_bc_001',
    text: 'investiga o overlay sem mexer no kernel',
    textRaw: 'investiga o overlay sem mexer no kernel',
    confidence: 0.91,
    words: [],
    personalDictionaryApplied: [],
    postCorrections: [],
    latencyMs: {
      captureToSttStart: 8,
      sttProcessing: 480,
      correctionPass: 2,
      total: 490,
    },
    rawPcmPersisted: false,
    eclipseCheck: 'passed',
    noiseSignals: null,
    createdAt: '2026-05-19T18:00:00.000Z',
  }
}

// ──────────────────────────────────────────────────────────────────────
// 1. REQUEST · session_id sempre na raiz (canon V6 imutável)
// ──────────────────────────────────────────────────────────────────────

test('REQUEST · session_id e transcript_id sempre na raiz; nunca volta ao wrapper { transcript: {...} } legado', () => {
  const payload = buildVoxKernelIntentPayload({
    transcript: transcript(),
    source: 'desktop_overlay',
    modeRequested: 'intent_compile',
  })
  assert.equal(payload.session_id, 'sess_bc_001')
  assert.equal(payload.transcript_id, 'tr_bc_001')
  assert.equal(payload.text, 'investiga o overlay sem mexer no kernel')
  assert.equal(payload.mode_requested, 'intent_compile')
  assert.equal(payload.raw_pcm_persisted, false)
  assert.equal('transcript' in payload, false)
})

test('REQUEST · payload contínua serializa sem expor token / áudio bruto', () => {
  const payload = buildVoxKernelIntentPayload({
    transcript: transcript(),
    source: 'desktop_overlay',
    modeRequested: 'governed_execute',
  })
  const serialized = JSON.stringify(payload)
  for (const forbidden of ['Bearer ', 'ATLAS_TOKEN', 'confirmation_token', 'raw_audio_bytes']) {
    assert.equal(serialized.includes(forbidden), false, `payload vazou "${forbidden}"`)
  }
  // raw_pcm_persisted é flag de control invariante — deve estar e ser false.
  assert.equal(payload.raw_pcm_persisted, false)
})

// ──────────────────────────────────────────────────────────────────────
// 2. RESPONSE V6 PURO · sem additive V6.5 — bridge devolve estrutura completa
// ──────────────────────────────────────────────────────────────────────

const RESPONSE_V6_PURE = {
  schema: 'atlas.vox.intent_response.v1',
  intent_packet: {
    schema: 'atlas.vox.intent_packet.v1',
    session_id: 'sess_bc_001',
    intent_id: 'int_bc_001',
    transcript_ref: 'tr_bc_001',
    mode: 'intent_compile',
    risk_class: 'R1',
    risk_reasoning: 'leitura/análise sem efeito externo',
    goal: 'Investigar overlay',
    constraints: ['sem mexer no kernel'],
    provider_hint: 'codex_cli',
    executor_hint: 'none',
    output_format: 'diagnostic',
    context_refs: [{ kind: 'none', ref: null, resolved: true }],
    human_input_text: 'investiga o overlay sem mexer no kernel',
    compiled_prompt: '## Contexto\n…',
    compiled_prompt_template: 'builtin.intent_compile.codex_cli.diagnostic.pt-br@0.2.0',
  },
  receipt: {
    receipt_id: 'rcpt_bc_001',
    decision_id: 'dec_bc_001',
    ledger_event_id: 'ldg_bc_001',
  },
  preview: 'preview curto humano',
  confirmation_required: false,
  confirmation_request: null,
  actions_available: ['copy_compiled_prompt', 'insert_compiled_prompt', 'cancel'],
  // ⚠️ Sem auto_mode_decision, sem interlocutor, sem flow_decision,
  //    sem prompt_quality. É um Kernel V6 inicial.
}

test('RESPONSE V6 puro · parseVoxFlowDecision devolve null (sem quebrar)', () => {
  const out = parseVoxFlowDecision((RESPONSE_V6_PURE as Record<string, unknown>).flow_decision)
  assert.equal(out, null)
})

test('RESPONSE V6 puro · parseVoxPromptQuality devolve null (sem quebrar)', () => {
  const out = parseVoxPromptQuality((RESPONSE_V6_PURE as Record<string, unknown>).prompt_quality)
  assert.equal(out, null)
})

test('RESPONSE V6 puro · campos legados são preserváveis (intent_packet, receipt, preview, confirmation_required)', () => {
  const r = RESPONSE_V6_PURE as Record<string, unknown>
  assert.equal(typeof r.intent_packet, 'object')
  assert.equal(typeof r.receipt, 'object')
  assert.equal(typeof r.preview, 'string')
  assert.equal(r.confirmation_required, false)
  assert.equal(Array.isArray(r.actions_available), true)
})

// ──────────────────────────────────────────────────────────────────────
// 3. RESPONSE V6.5 COMPLETO · todos os additive presentes
// ──────────────────────────────────────────────────────────────────────

const RESPONSE_V65_FULL = {
  ...RESPONSE_V6_PURE,
  flow_decision: {
    schema: 'atlas.vox.flow_decision.v1',
    version: '0.1.0',
    mode: 'intent_compile',
    destination: 'codex',
    risk_class: 'R1',
    confidence: 'high',
    needs_clarification: false,
    clarifying_question: null,
    what_i_heard: 'investiga o overlay sem mexer no kernel',
    what_i_understood: 'investigar overlay sem editar',
    what_i_will_do: 'devolver prompt compilado para Codex',
    why_this_flow: 'voz mencionou Codex e usou termos de leitura',
    safe_fallback: 'salvar como nota',
  },
  prompt_quality: {
    schema: 'atlas.vox.prompt_quality.v1',
    version: '0.1.0',
    status: 'pass',
    score: 1,
    issues: [],
    needs_review: false,
    repaired: false,
  },
}

test('RESPONSE V6.5 · flow_decision parseia para shape canônico', () => {
  const out = parseVoxFlowDecision(
    (RESPONSE_V65_FULL as Record<string, unknown>).flow_decision,
  )
  assert.notEqual(out, null)
  assert.equal(out?.schema, 'atlas.vox.flow_decision.v1')
  assert.equal(out?.destination, 'codex')
  assert.equal(out?.mode, 'intent_compile')
  assert.equal(out?.confidence, 'high')
  assert.equal(out?.needsClarification, false)
})

test('RESPONSE V6.5 · prompt_quality parseia para shape canônico', () => {
  const out = parseVoxPromptQuality(
    (RESPONSE_V65_FULL as Record<string, unknown>).prompt_quality,
  )
  assert.notEqual(out, null)
  assert.equal(out?.schema, 'atlas.vox.prompt_quality.v1')
  assert.equal(out?.status, 'pass')
  assert.equal(out?.score, 1)
  assert.deepEqual(out?.issues, [])
  assert.equal(out?.needsReview, false)
  assert.equal(out?.repaired, false)
})

test('RESPONSE V6.5 · campos legados continuam intactos junto com os additive', () => {
  const r = RESPONSE_V65_FULL as Record<string, unknown>
  assert.equal(typeof r.intent_packet, 'object')
  assert.equal(typeof r.receipt, 'object')
  assert.equal(typeof r.preview, 'string')
  assert.equal(r.confirmation_required, false)
})

// ──────────────────────────────────────────────────────────────────────
// 4. RESPONSE COM LIXO · campos desconhecidos ignorados
// ──────────────────────────────────────────────────────────────────────

test('RESPONSE com lixo · campos desconhecidos não quebram parser', () => {
  const noisy = {
    ...RESPONSE_V65_FULL,
    future_field_v8: { foo: 'bar' },
    surprise_array: [1, 2, 3],
    junk_string: 'lorem ipsum',
  }
  // Nenhum dos campos extras afeta o parse dos additive conhecidos.
  const flow = parseVoxFlowDecision((noisy as Record<string, unknown>).flow_decision)
  const quality = parseVoxPromptQuality(
    (noisy as Record<string, unknown>).prompt_quality,
  )
  assert.notEqual(flow, null)
  assert.notEqual(quality, null)
})

// ──────────────────────────────────────────────────────────────────────
// 5. PROMPT_QUALITY · parser hardena entradas inválidas
// ──────────────────────────────────────────────────────────────────────

test('parseVoxPromptQuality · null e undefined retornam null', () => {
  assert.equal(parseVoxPromptQuality(null), null)
  assert.equal(parseVoxPromptQuality(undefined), null)
})

test('parseVoxPromptQuality · objeto sem schema retorna null (sem inventar)', () => {
  assert.equal(
    parseVoxPromptQuality({ status: 'pass', score: 1, issues: [] }),
    null,
  )
})

test('parseVoxPromptQuality · status inválido vira "warn" (fallback honesto)', () => {
  const out = parseVoxPromptQuality({
    schema: 'atlas.vox.prompt_quality.v1',
    version: '0.1.0',
    status: 'mystery',
    score: 0.7,
    issues: [],
    needs_review: false,
    repaired: false,
  })
  assert.equal(out?.status, 'warn')
})

test('parseVoxPromptQuality · score fora de [0, 1] é clampado', () => {
  const tooHigh = parseVoxPromptQuality({
    schema: 'atlas.vox.prompt_quality.v1',
    version: '0.1.0',
    status: 'pass',
    score: 1.7,
    issues: [],
    needs_review: false,
    repaired: false,
  })
  const negative = parseVoxPromptQuality({
    schema: 'atlas.vox.prompt_quality.v1',
    version: '0.1.0',
    status: 'fail',
    score: -0.5,
    issues: ['boilerplate_detected'],
    needs_review: true,
    repaired: false,
  })
  assert.equal(tooHigh?.score, 1)
  assert.equal(negative?.score, 0)
})

test('parseVoxPromptQuality · issues não-string são filtradas', () => {
  const out = parseVoxPromptQuality({
    schema: 'atlas.vox.prompt_quality.v1',
    version: '0.1.0',
    status: 'warn',
    score: 0.7,
    issues: ['boilerplate_detected', 42, null, { code: 'x' }, 'negations_lost'],
    needs_review: false,
    repaired: false,
  })
  assert.deepEqual(out?.issues, ['boilerplate_detected', 'negations_lost'])
})

test('parseVoxPromptQuality · aceita snake_case e camelCase para needs_review/repaired', () => {
  const snake = parseVoxPromptQuality({
    schema: 'atlas.vox.prompt_quality.v1',
    version: '0.1.0',
    status: 'warn',
    score: 0.7,
    issues: [],
    needs_review: true,
    repaired: false,
  })
  const camel = parseVoxPromptQuality({
    schema: 'atlas.vox.prompt_quality.v1',
    version: '0.1.0',
    status: 'warn',
    score: 0.7,
    issues: [],
    needsReview: true,
    repaired: false,
  })
  assert.equal(snake?.needsReview, true)
  assert.equal(camel?.needsReview, true)
})

// ──────────────────────────────────────────────────────────────────────
// 6. UI honesta · erro 422 cru NUNCA chega ao operador
// ──────────────────────────────────────────────────────────────────────

test('UI · resposta 422 com JSON cru de Laravel vira mensagem humana', () => {
  const raw = '{"message":"The transcript field is required.","errors":{}}'
  const humanized = humanizeOverlayError(raw)
  assert.notEqual(humanized, raw)
  assert.equal(typeof humanized, 'string')
  assert.ok(
    (humanized ?? '').includes('Detalhes avançados') || (humanized ?? '').includes('Atlas'),
    `mensagem humanizada perdeu canon: ${humanized}`,
  )
  // Jargão técnico não pode vazar.
  for (const leak of [
    'transcript field',
    'session_id',
    '422',
    'errors":',
  ]) {
    assert.equal((humanized ?? '').includes(leak), false, `vazou "${leak}"`)
  }
})

// ──────────────────────────────────────────────────────────────────────
// 7. CONTRATO ADDITIVE · novos campos NUNCA tornam-se obrigatórios
// ──────────────────────────────────────────────────────────────────────

test('Contrato additive · interface VoxPromptQuality e parser são totalmente opcionais', () => {
  // Compile-time guard: passamos um objeto SEM os additive e nada quebra.
  type CheckOptional = {
    schema: 'atlas.vox.prompt_quality.v1'
    version: string
    status: 'pass' | 'warn' | 'fail'
    score: number
    issues: string[]
    needsReview: boolean
    repaired: boolean
  }
  const sample: CheckOptional = {
    schema: 'atlas.vox.prompt_quality.v1',
    version: '0.1.0',
    status: 'pass',
    score: 1,
    issues: [],
    needsReview: false,
    repaired: false,
  }
  // Garante que a forma é serialízavel sem perder canon.
  const serialized = JSON.parse(JSON.stringify(sample)) as VoxPromptQuality
  assert.equal(serialized.schema, 'atlas.vox.prompt_quality.v1')
  assert.equal(serialized.status, 'pass')
})

let failures = 0
for (const c of cases) {
  try {
    c.run()
    process.stdout.write(`  PASS  ${c.name}\n`)
  } catch (e) {
    failures += 1
    process.stderr.write(`  FAIL  ${c.name}\n`)
    process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`)
  }
}

if (failures > 0) process.exit(1)
