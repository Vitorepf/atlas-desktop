/// <reference types="node" />
/**
 * Atlas Vox V6 · Regression Wall · humanizeOverlayError.
 *
 * Pergunta única: a UI principal NUNCA mostra erro cru ao operador?
 *
 * `humanizeOverlayError` é a última linha entre um stack trace do Rust /
 * um JSON 422 do Laravel / um enum como `AudioInputInvalid` e o banner
 * vermelho que o operador vê no overlay. Cada caso abaixo bloqueia uma
 * regressão histórica que já incomodou o operador. Falhar aqui = banner
 * de erro voltou a vazar jargão técnico.
 *
 * Hard rules respeitadas neste teste:
 *  - Não toca microfone, não roda STT.
 *  - Não chama API paga.
 *  - Não importa nada além de `VoxOverlay.tsx`.
 */

import assert from 'node:assert/strict'
// Importa do módulo isolado (sem `import.meta.env`/JSX) para rodar no tsx
// puro — mesmo símbolo é re-exportado de VoxOverlay.tsx para compatibilidade.
import { humanizeOverlayError } from '../voxOverlayHumanize'

const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

// Termos técnicos que JAMAIS podem aparecer no texto retornado para o
// operador. Espelha a lista de FORBIDDEN_LEGACY_UI_STRINGS no V6 cert PHP
// e o scan main_flow_has_no_forbidden_terms_visible em voxVisualSmoke.
const TECH_LEAK_TERMS = [
  'AudioInputInvalid',
  'rms=',
  'peak=',
  'active_ratio',
  'panicked at',
  '[object Object]',
  ' 422',
  'session_id',
  'raw_pcm',
  'fetch is not defined',
  'TypeError',
  'ECONN',
  'undefined',
]

function assertHumanized(raw: string, expectedContains: string): void {
  const out = humanizeOverlayError(raw)
  assert.equal(typeof out, 'string', `entrada "${raw}" deveria humanizar`)
  assert.ok(
    (out as string).includes(expectedContains),
    `esperava conter "${expectedContains}", recebi: ${out}`,
  )
  for (const leak of TECH_LEAK_TERMS) {
    assert.equal(
      (out as string).includes(leak),
      false,
      `mensagem humanizada vazou jargão técnico "${leak}": ${out}`,
    )
  }
}

test('null/undefined/string vazia retornam null (sem banner fantasma)', () => {
  assert.equal(humanizeOverlayError(null), null)
  assert.equal(humanizeOverlayError(undefined), null)
  assert.equal(humanizeOverlayError(''), null)
  assert.equal(humanizeOverlayError('   '), null)
})

test('REGRESSION · enum AudioInputInvalid vira mensagem PT-BR humana', () => {
  assertHumanized('AudioInputInvalid', 'microfone')
  assertHumanized('Error: AudioInputInvalid { rms: 0.0, peak: 0.0 }', 'microfone')
})

test('REGRESSION · rms/peak/active_ratio zerados viram mensagem humana', () => {
  assertHumanized('rms=0.0 peak=0.0 active_ratio=0.0', 'microfone')
  assertHumanized('Captura abortada: rms=0.00', 'microfone')
  assertHumanized('peak=0.0000 active_ratio=0.0', 'microfone')
})

test('REGRESSION · falha de hotkey / acessibilidade vira instrução PT-BR', () => {
  assertHumanized('hotkey runtime not registered', 'Ajustes do Sistema')
  assertHumanized('accessibility permission missing', 'Acessibilidade')
  assertHumanized('input.monitoring=denied', 'Monitoramento de Entrada')
})

test('REGRESSION · whisper/model ausente vira "modelo de voz local não está pronto"', () => {
  assertHumanized('model.missing ggml-large-v3.bin', 'modelo de voz')
  assertHumanized('engine.binding pending', 'modelo de voz')
  assertHumanized('whisper.cpp not initialised', 'modelo de voz')
})

test('REGRESSION · erro de rede / fetch / 422 do Laravel vira "servidor Atlas não respondeu"', () => {
  assertHumanized('fetch failed', 'servidor Atlas')
  assertHumanized('TypeError: fetch is not defined', 'servidor Atlas')
  assertHumanized('ECONNREFUSED 127.0.0.1:8001', 'servidor Atlas')
  assertHumanized('network timeout calling /ai/vox/intent', 'servidor Atlas')
  assertHumanized('Kernel não respondeu', 'servidor Atlas')
})

test('REGRESSION · stack trace / panic do Rust vira mensagem cobertora honesta', () => {
  assertHumanized(
    "thread 'main' panicked at src/vox/edge.rs:42:5",
    'Detalhes avançados',
  )
  assertHumanized('VoxEdge::CaptureFailed', 'Detalhes avançados')
})

test('REGRESSION · JSON cru de erro 422 do Laravel jamais aparece literal', () => {
  // Caso real: o atlas-server respondeu 422 com body
  // {"message":"The transcript field is required.","errors":{...}}.
  // Antes do V6 isso vazava direto pro banner. Agora tem que cair na
  // regra "JSON cru → mensagem cobertora".
  assertHumanized(
    '{"message":"The transcript field is required.","errors":{}}',
    'Detalhes avançados',
  )
  assertHumanized('[{"path":"raw_pcm","type":"forbidden"}]', 'Detalhes avançados')
})

test('Mensagem em PT-BR já humanizada passa direto SEM vazar técnico', () => {
  // Se o backend já mandou uma mensagem PT-BR honesta, ela passa direto.
  // Validamos APENAS que não há jargão técnico — não exigimos transformação.
  const friendly = 'Não consegui transcrever essa gravação. Tente gravar de novo.'
  const out = humanizeOverlayError(friendly)
  assert.equal(out, friendly)
  for (const leak of TECH_LEAK_TERMS) {
    assert.equal((out ?? '').includes(leak), false)
  }
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
