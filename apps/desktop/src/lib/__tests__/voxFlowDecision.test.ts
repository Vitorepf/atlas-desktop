/// <reference types="node" />
/**
 * V6.5 · Testes do parser tolerante `parseVoxFlowDecision` (bridge) +
 * `composeSmartPreview` (view-model do overlay).
 *
 * Pinos:
 *   - payload antigo sem `flow_decision` → composer cai em fallback.
 *   - payload novo com `needs_clarification` → kind=clarification.
 *   - payload novo com R4 → kind=blocked_destructive sem botão executar.
 *   - payload novo com confidence=low → kind=low_confidence.
 *   - payload com destination=terminal_proposal → ações copy/insert/cancel,
 *     sem execute.
 *   - schema desconhecido devolve `null` (defesa em profundidade).
 *
 * Sem React, sem JSX — só pure data.
 */
import assert from 'node:assert/strict'
import { parseVoxFlowDecision, type VoxFlowDecision } from '../bridge'
import {
  composeSmartPreview,
  smartPreviewInputsFromKernel,
} from '../voxSmartPreview'

const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

// ────────────────────────────────────────────────────────────────────
// parseVoxFlowDecision · payload backend
// ────────────────────────────────────────────────────────────────────

test('parseVoxFlowDecision · payload backend canônico vira shape camelCase', () => {
  const raw = {
    schema: 'atlas.vox.flow_decision.v1',
    version: '0.1.0',
    mode: 'intent_compile',
    destination: 'codex',
    risk_class: 'R1',
    confidence: 'high',
    needs_clarification: false,
    clarifying_question: null,
    what_i_heard: 'manda o codex investigar o overlay',
    what_i_understood: 'Montar prompt forte para a IA (Codex).',
    what_i_will_do: 'Vou montar o prompt pronto pra colar no Codex CLI — você dispara.',
    why_this_flow: 'Detectei pedido para o Codex — compilei como prompt.',
    safe_fallback: 'copy_text',
  }
  const parsed = parseVoxFlowDecision(raw)
  assert.ok(parsed)
  assert.equal(parsed!.schema, 'atlas.vox.flow_decision.v1')
  assert.equal(parsed!.mode, 'intent_compile')
  assert.equal(parsed!.destination, 'codex')
  assert.equal(parsed!.riskClass, 'R1')
  assert.equal(parsed!.confidence, 'high')
  assert.equal(parsed!.needsClarification, false)
  assert.equal(parsed!.whatIHeard, 'manda o codex investigar o overlay')
  assert.equal(parsed!.safeFallback, 'copy_text')
})

test('parseVoxFlowDecision · ausência devolve null (backend antigo)', () => {
  assert.equal(parseVoxFlowDecision(null), null)
  assert.equal(parseVoxFlowDecision(undefined), null)
  assert.equal(parseVoxFlowDecision('texto'), null)
})

test('parseVoxFlowDecision · schema desconhecido devolve null', () => {
  const raw = {
    schema: 'atlas.something.else.v9',
    mode: 'intent_compile',
    destination: 'codex',
  }
  assert.equal(parseVoxFlowDecision(raw), null)
})

test('parseVoxFlowDecision · aceita camelCase também (defesa em profundidade)', () => {
  const raw = {
    schema: 'atlas.vox.flow_decision.v1',
    mode: 'governed_execute',
    destination: 'terminal_proposal',
    riskClass: 'R3',
    confidence: 'medium',
    needsClarification: false,
    whatIHeard: 'roda os testes do vox',
    whatIUnderstood: 'Ação no terminal — propor comando.',
    whatIWillDo: 'Vou propor o comando. Você decide se executa.',
    whyThisFlow: 'Detectei verbo de execução; mantenho fora do executor.',
    safeFallback: 'cancel',
  }
  const parsed = parseVoxFlowDecision(raw)
  assert.ok(parsed)
  assert.equal(parsed!.destination, 'terminal_proposal')
  assert.equal(parsed!.riskClass, 'R3')
})

test('parseVoxFlowDecision · rejeita destination/risk fora do conjunto canônico', () => {
  const raw = {
    schema: 'atlas.vox.flow_decision.v1',
    destination: 'rocket', // inválido
    risk_class: 'R99', // inválido
  }
  const parsed = parseVoxFlowDecision(raw)
  assert.ok(parsed)
  assert.equal(parsed!.destination, null)
  assert.equal(parsed!.riskClass, null)
})

// ────────────────────────────────────────────────────────────────────
// composeSmartPreview · view-model
// ────────────────────────────────────────────────────────────────────

function fd(partial: Partial<VoxFlowDecision>): VoxFlowDecision {
  return {
    schema: 'atlas.vox.flow_decision.v1',
    version: '0.1.0',
    mode: 'intent_compile',
    destination: 'codex',
    riskClass: 'R0',
    confidence: 'high',
    needsClarification: false,
    clarifyingQuestion: null,
    whatIHeard: 'fala canônica',
    whatIUnderstood: 'Entendi o pedido.',
    whatIWillDo: 'Vou montar o prompt.',
    whyThisFlow: 'Detectei pedido pra IA.',
    safeFallback: 'copy_text',
    ...partial,
  }
}

test('composeSmartPreview · sem flow_decision (backend antigo) → kind=fallback', () => {
  const vm = composeSmartPreview({
    flowDecision: null,
    effectiveMode: 'dictation',
    modeWasAutoPicked: false,
    providerHint: null,
    executorHint: null,
    legacyRiskClass: null,
    legacyWhatIHeard: 'olá',
    legacyWhatIUnderstood: null,
    legacyWhatIWillDo: null,
    transcriptDraft: 'olá',
  })
  assert.equal(vm.kind, 'fallback')
  assert.equal(vm.heard, 'olá')
  assert.equal(vm.destination, 'clipboard') // legacy mapping
  // sem flow_decision NÃO temos modo sugerido inteligente
  assert.equal(vm.modeSuggestionHint, null)
})

test('composeSmartPreview · clarification tem precedência sobre tudo', () => {
  const vm = composeSmartPreview({
    flowDecision: fd({
      needsClarification: true,
      clarifyingQuestion: 'Qual arquivo exatamente?',
      destination: 'none',
      riskClass: 'R4', // ainda assim, clarification vence
      confidence: 'low',
    }),
    effectiveMode: 'governed_execute',
    modeWasAutoPicked: false,
    providerHint: null,
    executorHint: null,
    legacyRiskClass: null,
    legacyWhatIHeard: null,
    legacyWhatIUnderstood: null,
    legacyWhatIWillDo: null,
    transcriptDraft: null,
  })
  assert.equal(vm.kind, 'clarification')
  assert.equal(vm.clarifyingQuestion, 'Qual arquivo exatamente?')
  // willDo precisa ser null durante clarification
  assert.equal(vm.willDo, null)
  // ações canônicas
  assert.deepEqual(vm.primaryActions, ['answer_clarification', 'rerecord', 'cancel'])
})

test('composeSmartPreview · R4 destrutivo → blocked_destructive sem confirm', () => {
  const vm = composeSmartPreview({
    flowDecision: fd({
      riskClass: 'R4',
      destination: 'terminal_proposal',
      whyThisFlow: 'Detectei rm -rf — política Atlas exige confirmação literal.',
    }),
    effectiveMode: 'governed_execute',
    modeWasAutoPicked: false,
    providerHint: null,
    executorHint: 'terminal_propose',
    legacyRiskClass: 'R4',
    legacyWhatIHeard: null,
    legacyWhatIUnderstood: null,
    legacyWhatIWillDo: null,
    transcriptDraft: null,
  })
  assert.equal(vm.kind, 'blocked_destructive')
  assert.equal(vm.willDo, null)
  assert.ok(vm.blockedReason)
  // Garante que 'confirm' / 'copy' / 'insert' NÃO aparecem — só caminhos seguros.
  assert.equal(vm.primaryActions.includes('confirm'), false)
  assert.equal(vm.primaryActions.includes('copy'), false)
  assert.equal(vm.primaryActions.includes('insert'), false)
  assert.deepEqual(vm.primaryActions, ['edit_text', 'save_as_note', 'cancel'])
})

test('composeSmartPreview · confidence=low (não-governed) → low_confidence', () => {
  const vm = composeSmartPreview({
    flowDecision: fd({
      confidence: 'low',
      destination: 'clipboard',
      mode: 'dictation',
    }),
    effectiveMode: 'dictation',
    modeWasAutoPicked: true,
    providerHint: null,
    executorHint: null,
    legacyRiskClass: null,
    legacyWhatIHeard: null,
    legacyWhatIUnderstood: null,
    legacyWhatIWillDo: null,
    transcriptDraft: null,
  })
  assert.equal(vm.kind, 'low_confidence')
  assert.ok(vm.lowConfidenceNote)
  assert.equal(vm.modeSuggestionHint, 'Modo sugerido: Ditado')
  assert.deepEqual(vm.primaryActions, ['edit_text', 'rerecord', 'cancel'])
})

test('composeSmartPreview · destination=terminal_proposal nunca executa direto', () => {
  const vm = composeSmartPreview({
    flowDecision: fd({
      destination: 'terminal_proposal',
      mode: 'governed_execute',
      riskClass: 'R3',
      whatIWillDo: 'Vou propor o comando. Você decide se executa.',
    }),
    effectiveMode: 'governed_execute',
    modeWasAutoPicked: false,
    providerHint: null,
    executorHint: 'terminal_propose',
    legacyRiskClass: 'R3',
    legacyWhatIHeard: null,
    legacyWhatIUnderstood: null,
    legacyWhatIWillDo: null,
    transcriptDraft: null,
  })
  assert.equal(vm.kind, 'ready')
  assert.equal(vm.destination, 'terminal_proposal')
  // Sem 'confirm' — operador copia/insere fora do Atlas.
  assert.equal(vm.primaryActions.includes('confirm'), false)
  assert.deepEqual(vm.primaryActions, ['copy', 'insert', 'cancel'])
})

test('composeSmartPreview · destination=codex monta confirm path', () => {
  const vm = composeSmartPreview({
    flowDecision: fd({
      destination: 'codex',
      mode: 'intent_compile',
    }),
    effectiveMode: 'intent_compile',
    modeWasAutoPicked: false,
    providerHint: 'codex_cli',
    executorHint: null,
    legacyRiskClass: null,
    legacyWhatIHeard: null,
    legacyWhatIUnderstood: null,
    legacyWhatIWillDo: null,
    transcriptDraft: null,
  })
  assert.equal(vm.kind, 'ready')
  assert.equal(vm.destination, 'codex')
  assert.deepEqual(vm.primaryActions, ['confirm', 'edit_text', 'cancel'])
  // destination label visível em PT-BR humano
  assert.match(vm.destinationLabel ?? '', /Codex/)
})

test('composeSmartPreview · "Modo sugerido" só aparece quando Auto escolheu', () => {
  // Operador pinou o modo manualmente → sem hint discreto.
  const manual = composeSmartPreview({
    flowDecision: fd({ destination: 'codex', mode: 'intent_compile' }),
    effectiveMode: 'intent_compile',
    modeWasAutoPicked: false,
    providerHint: null,
    executorHint: null,
    legacyRiskClass: null,
    legacyWhatIHeard: null,
    legacyWhatIUnderstood: null,
    legacyWhatIWillDo: null,
    transcriptDraft: null,
  })
  assert.equal(manual.modeSuggestionHint, null)

  // Auto router escolheu por ele → hint discreto presente.
  const auto = composeSmartPreview({
    flowDecision: fd({ destination: 'codex', mode: 'intent_compile' }),
    effectiveMode: 'intent_compile',
    modeWasAutoPicked: true,
    providerHint: null,
    executorHint: null,
    legacyRiskClass: null,
    legacyWhatIHeard: null,
    legacyWhatIUnderstood: null,
    legacyWhatIWillDo: null,
    transcriptDraft: null,
  })
  assert.equal(auto.modeSuggestionHint, 'Modo sugerido: Criar prompt')
})

test('smartPreviewInputsFromKernel · monta inputs a partir de KernelResponse parcial', () => {
  const inputs = smartPreviewInputsFromKernel(
    {
      // só os campos que o smart preview consome — o resto pode ficar à parte
      // pra back-compat com `VoxKernelIntentResponse`.
      flowDecision: fd({ destination: 'codex' }),
      providerHint: 'codex_cli',
      executorHint: null,
      riskClass: 'R0',
      previewWhatIHeard: 'manda o codex',
      previewWhatIUnderstood: null,
      previewWhatIWillDo: null,
      // back-compat noise — o helper só lê o que precisa
      status: 'ok',
      receiptId: null,
      decisionId: null,
      ledgerEventId: null,
      intentText: null,
      risk: 'R0',
      nextAction: null,
      message: null,
      compiledPrompt: null,
      compiledPromptTemplate: null,
      preview: null,
      goal: null,
      constraints: [],
      outputFormat: null,
      riskReasoning: null,
      evidencePromise: null,
      actionsAvailable: [],
      confirmationRequired: false,
      confirmationRequest: null,
      suggestedMode: 'intent_compile',
      suggestedModeReason: null,
      autoModeDecision: null,
      modeResolution: 'auto_router',
      interlocutor: null,
    },
    'intent_compile',
    true,
    'manda o codex',
  )
  assert.equal(inputs.flowDecision?.destination, 'codex')
  assert.equal(inputs.providerHint, 'codex_cli')
  assert.equal(inputs.effectiveMode, 'intent_compile')
  assert.equal(inputs.modeWasAutoPicked, true)
  assert.equal(inputs.transcriptDraft, 'manda o codex')
})

// ────────────────────────────────────────────────────────────────────
// Runner ad-hoc · alinhado com os outros testes do diretório.
// ────────────────────────────────────────────────────────────────────

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
