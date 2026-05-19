/// <reference types="node" />
import assert from 'node:assert/strict'
import {
  buildVoxKernelIntentPayload,
  type VoxKernelIntentRequest,
  type VoxTranscript,
} from '../bridge'

const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

function transcript(): VoxTranscript {
  return {
    schema: 'atlas.vox.transcript.v1',
    sessionId: 'sess_123',
    transcriptId: 'tr_123',
    audioHandle: 'aud_123',
    language: 'pt-BR',
    engine: 'whisper.cpp@large-v3',
    engineInvocationId: 'inv_123',
    text: 'Gostaria de melhorar esse texto.',
    textRaw: 'gostaria de melhorar esse texto',
    confidence: 0.87,
    words: [],
    personalDictionaryApplied: ['Atlas'],
    postCorrections: [],
    latencyMs: {
      captureToSttStart: 10,
      sttProcessing: 1200,
      correctionPass: 5,
      total: 1215,
    },
    rawPcmPersisted: false,
    eclipseCheck: 'passed',
    noiseSignals: null,
    createdAt: '2026-05-19T12:00:00.000Z',
  }
}

test('envia VoxTranscript.v1 na raiz em snake_case para /ai/vox/intent', () => {
  const payload = buildVoxKernelIntentPayload({
    transcript: transcript(),
    source: 'desktop_overlay',
    modeRequested: 'prompt_polish',
  })

  assert.equal(payload.session_id, 'sess_123')
  assert.equal(payload.transcript_id, 'tr_123')
  assert.equal(payload.raw_pcm_persisted, false)
  assert.equal(payload.mode_requested, 'prompt_polish')
  assert.equal(payload.source, 'desktop_overlay')
  assert.equal('transcript' in payload, false)
})

test('auto mode é enviado explicitamente quando o caller não fixa modo', () => {
  const request: VoxKernelIntentRequest = {
    transcript: transcript(),
    source: 'desktop_overlay',
  }
  const payload = buildVoxKernelIntentPayload(request)

  assert.equal(payload.mode_requested, 'auto')
})

// ─────────────────────────────────────────────────────────────────────────
// V6 Regression Wall · payload anti-regressão.
//
// Cada teste abaixo bloqueia uma regressão específica que já queimou tempo
// e ainda pode voltar se alguém refatorar o builder sem ler o canon:
// ─────────────────────────────────────────────────────────────────────────

test('REGRESSION · NUNCA emite payload no formato legado { transcript: {...} }', () => {
  // Bug histórico V3: o desktop envolvia o transcript inteiro em uma chave
  // `transcript` na raiz. O backend recusava com 422 e o operador via
  // `transcript field is required` no overlay. O builder atual achata em
  // snake_case na raiz — testamos que NUNCA reaparece o wrapper.
  const payload = buildVoxKernelIntentPayload({
    transcript: transcript(),
    source: 'desktop_overlay',
    modeRequested: 'auto',
  })
  assert.equal(
    'transcript' in payload,
    false,
    'payload não pode ter chave `transcript` na raiz (wrapper legado V0 quebra Kernel V3+)',
  )
  // O kernel exige session_id e transcript_id na raiz, sempre populados.
  assert.equal(typeof payload.session_id, 'string')
  assert.equal(typeof payload.transcript_id, 'string')
  assert.notEqual(payload.session_id, '')
  assert.notEqual(payload.transcript_id, '')
})

test('REGRESSION · raw_pcm_persisted reflete fielmente o transcript (true→true, false→false)', () => {
  // Lei 0.9 do Atlas Vox: NUNCA persistir áudio cru. O builder não pode
  // "consertar silenciosamente" o flag — ele apenas reflete o transcript.
  // Se algum dia rawPcmPersisted=true chegar aqui, o backend vai recusar e
  // o release-check vai falhar — mas o builder não pode mascarar.
  const t = transcript()
  t.rawPcmPersisted = false
  const okPayload = buildVoxKernelIntentPayload({ transcript: t, source: 'desktop_overlay' })
  assert.equal(okPayload.raw_pcm_persisted, false)

  const t2 = transcript()
  t2.rawPcmPersisted = true
  const bombPayload = buildVoxKernelIntentPayload({ transcript: t2, source: 'desktop_overlay' })
  assert.equal(
    bombPayload.raw_pcm_persisted,
    true,
    'builder NUNCA pode mascarar raw_pcm_persisted=true; o backend é quem rejeita',
  )
})

test('REGRESSION · payload não vaza confirmation_token nem ATLAS_TOKEN para o Kernel', () => {
  // /ai/vox/intent é leitura/decisão — não recebe e não devolve token de
  // execução. O builder NÃO pode adicionar campos de auth. Garantimos
  // estaticamente que NENHUMA chave do payload bate com tokens conhecidos.
  const payload = buildVoxKernelIntentPayload({
    transcript: transcript(),
    source: 'desktop_overlay',
    modeRequested: 'governed_execute',
  })
  const forbiddenKeys = [
    'confirmation_token',
    'confirmationToken',
    'atlas_token',
    'ATLAS_TOKEN',
    'authorization',
    'Authorization',
    'bearer',
    'Bearer',
    'access_token',
  ]
  for (const k of forbiddenKeys) {
    assert.equal(k in payload, false, `payload nunca pode conter a chave "${k}"`)
  }
  // Validação adicional: nenhum VALOR do payload pode bater com Bearer xxx
  // ou sk-... — esses são tokens canônicos que jamais devem aparecer aqui.
  const serialized = JSON.stringify(payload)
  assert.equal(/Bearer\s+[A-Za-z0-9._-]{16,}/.test(serialized), false)
  assert.equal(/sk-[A-Za-z0-9]{20,}/.test(serialized), false)
})

test('REGRESSION · contract field schema é sempre `atlas.vox.transcript.v1` na raiz', () => {
  // Sem `schema` na raiz o controller AtlasAiVox bate 422. Validamos que
  // o builder copia fielmente.
  const payload = buildVoxKernelIntentPayload({
    transcript: transcript(),
    source: 'desktop_overlay',
  })
  assert.equal(payload.schema, 'atlas.vox.transcript.v1')
})

test('REGRESSION · context_refs e context_snapshot só vão quando o caller forneceu', () => {
  // Não inventar contexto. Se o caller não mandou, o payload não cria.
  const bare = buildVoxKernelIntentPayload({
    transcript: transcript(),
    source: 'desktop_overlay',
  })
  assert.equal('context_refs' in bare, false)
  assert.equal('context_snapshot' in bare, false)
  assert.equal('manual_override' in bare, false)

  const rich = buildVoxKernelIntentPayload({
    transcript: transcript(),
    source: 'desktop_overlay',
    contextRefs: [{ kind: 'workspace', ref: 'atlas-vox', resolved: true }],
    contextSnapshot: { surface: 'cartografia' },
    manualOverride: true,
  })
  assert.deepEqual(rich.context_refs, [{ kind: 'workspace', ref: 'atlas-vox', resolved: true }])
  assert.deepEqual(rich.context_snapshot, { surface: 'cartografia' })
  assert.equal(rich.manual_override, true)
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
