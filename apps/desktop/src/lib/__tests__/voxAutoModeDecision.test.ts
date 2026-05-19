/// <reference types="node" />
import assert from 'node:assert/strict'
import { parseVoxAutoModeDecisionShape as parseVoxAutoModeDecision } from '../voxAutoModeDecision'

/**
 * Vox V4 · `parseVoxAutoModeDecision` — pure-logic tests.
 *
 * Cobertura:
 *   - mapeamento snake_case ↔ camelCase do payload do Kernel.
 *   - alternativas: validação de mode + reasonPtBr + confidence.
 *   - marcador R4 (rm_rf, sudo, …) chegando como string.
 *   - payload ausente / malformado → null honesto.
 *
 * Roda com: `npx tsx src/lib/__tests__/voxAutoModeDecision.test.ts`.
 */
const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

test('retorna null quando payload é null/undefined/objeto sem auto_mode_decision', () => {
  assert.equal(parseVoxAutoModeDecision(null), null)
  assert.equal(parseVoxAutoModeDecision(undefined), null)
  assert.equal(parseVoxAutoModeDecision({}), null)
})

test('retorna null quando selected_mode é inválido', () => {
  const r = parseVoxAutoModeDecision({
    auto_mode_decision: {
      selected_mode: 'voice_realtime',
      confidence: 0.9,
      reason_pt_br: 'irrelevante',
    },
  })
  assert.equal(r, null)
})

test('normaliza snake_case do Kernel para camelCase canônico', () => {
  const r = parseVoxAutoModeDecision({
    auto_mode_decision: {
      schema: 'atlas.vox.auto_mode_decision.v1',
      selected_mode: 'intent_compile',
      confidence: 0.91,
      reason_pt_br: 'Pediu pra IA investigar.',
      needs_confirmation: false,
      alternatives: [
        {
          mode: 'prompt_polish',
          confidence: 0.42,
          reason_pt_br: 'Se for limpar texto existente.',
        },
      ],
      markers: { r4_marker: null },
      router_version: '0.1.0',
    },
  })
  assert.ok(r)
  assert.equal(r!.selectedMode, 'intent_compile')
  assert.equal(r!.confidence, 0.91)
  assert.equal(r!.reasonPtBr, 'Pediu pra IA investigar.')
  assert.equal(r!.needsConfirmation, false)
  assert.equal(r!.r4Marker, null)
  assert.equal(r!.routerVersion, '0.1.0')
  assert.equal(r!.alternatives.length, 1)
  assert.equal(r!.alternatives[0]!.mode, 'prompt_polish')
  assert.equal(r!.alternatives[0]!.confidence, 0.42)
  assert.equal(
    r!.alternatives[0]!.reasonPtBr,
    'Se for limpar texto existente.',
  )
})

test('aceita também camelCase nativo do Desktop', () => {
  const r = parseVoxAutoModeDecision({
    autoModeDecision: {
      selectedMode: 'dictation',
      confidence: 0.83,
      reasonPtBr: 'Texto livre.',
      needsConfirmation: false,
      alternatives: [],
      markers: {},
      routerVersion: '0.1.0',
    },
  })
  assert.ok(r)
  assert.equal(r!.selectedMode, 'dictation')
  assert.equal(r!.reasonPtBr, 'Texto livre.')
})

test('preserva R4 marker quando vier do router (rm_rf, sudo, drop_database, …)', () => {
  const r = parseVoxAutoModeDecision({
    auto_mode_decision: {
      selected_mode: 'governed_execute',
      confidence: 0.95,
      reason_pt_br: 'Comando destrutivo detectado.',
      needs_confirmation: true,
      alternatives: [],
      markers: { r4_marker: 'rm_rf' },
    },
  })
  assert.ok(r)
  assert.equal(r!.selectedMode, 'governed_execute')
  assert.equal(r!.needsConfirmation, true)
  assert.equal(r!.r4Marker, 'rm_rf')
})

test('descarta alternativas com modo inválido sem quebrar a decisão', () => {
  const r = parseVoxAutoModeDecision({
    auto_mode_decision: {
      selected_mode: 'intent_compile',
      confidence: 0.8,
      reason_pt_br: 'ok',
      needs_confirmation: false,
      alternatives: [
        { mode: 'voice_realtime', confidence: 0.4, reason_pt_br: 'lixo' },
        { mode: 'dictation', confidence: 0.3, reason_pt_br: 'texto livre' },
        { confidence: 0.2 },
      ],
    },
  })
  assert.ok(r)
  assert.equal(r!.alternatives.length, 1)
  assert.equal(r!.alternatives[0]!.mode, 'dictation')
})

test('confidence/reason ausentes caem para 0/string vazia, não quebram', () => {
  const r = parseVoxAutoModeDecision({
    auto_mode_decision: {
      selected_mode: 'prompt_polish',
      // sem confidence, sem reason_pt_br, sem alternatives.
    },
  })
  assert.ok(r)
  assert.equal(r!.selectedMode, 'prompt_polish')
  assert.equal(r!.confidence, 0)
  assert.equal(r!.reasonPtBr, '')
  assert.deepEqual(r!.alternatives, [])
  assert.equal(r!.r4Marker, null)
})

// ─────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────
let failed = 0
for (const { name, run } of cases) {
  try {
    run()
    console.log(`  ok · ${name}`)
  } catch (e) {
    failed += 1
    console.error(`  FAIL · ${name}`)
    console.error(e)
  }
}
if (failed > 0) {
  console.error(`\n${failed} de ${cases.length} testes falharam.`)
  process.exit(1)
}
console.log(`\n${cases.length} testes ok (parseVoxAutoModeDecision).`)
