import assert from 'node:assert/strict'
import {
  atlasVoiceAcceptsSpeechRunEvent,
  atlasVoiceCanStartNextTurn,
  atlasVoiceConfirmsHumanSpeech,
  atlasVoiceIsAtlasBusy,
  atlasVoiceShouldDropSilentTurn,
  ATLAS_VOICE_REARMABLE_VOX_STATES,
} from '../atlasAiVoiceContinuity'

const cases: Array<{ name: string; run: () => void }> = []
function test(name: string, run: () => void): void {
  cases.push({ name, run })
}

test('Atlas Voice considera o Atlas ocupado enquanto envia, tem trace ou está recebendo streaming', () => {
  assert.equal(atlasVoiceIsAtlasBusy({ sending: true, pendingTrace: null, streamingText: '' }), true)
  assert.equal(atlasVoiceIsAtlasBusy({ sending: false, pendingTrace: { id: 't1' }, streamingText: '' }), true)
  assert.equal(atlasVoiceIsAtlasBusy({ sending: false, pendingTrace: null, streamingText: 'respondendo' }), true)
  assert.equal(atlasVoiceIsAtlasBusy({ sending: false, pendingTrace: null, streamingText: '   ' }), false)
})

test('Atlas Voice rearma quando a resposta terminou e o Vox está em estado neutro', () => {
  for (const voxState of ATLAS_VOICE_REARMABLE_VOX_STATES) {
    assert.equal(
      atlasVoiceCanStartNextTurn({
        voiceEnabled: true,
        atlasBusy: false,
        speechState: 'idle',
        voxBusy: false,
        voxState,
      }),
      true,
      `deveria rearmar em ${voxState}`,
    )
  }
})

test('Atlas Voice não rearma enquanto fala, pensa, transcreve ou executa outro turno', () => {
  const base = {
    voiceEnabled: true,
    atlasBusy: false,
    speechState: 'idle' as const,
    voxBusy: false,
    voxState: 'closed',
  }
  assert.equal(atlasVoiceCanStartNextTurn({ ...base, voiceEnabled: false }), false)
  assert.equal(atlasVoiceCanStartNextTurn({ ...base, atlasBusy: true }), false)
  assert.equal(atlasVoiceCanStartNextTurn({ ...base, speechState: 'speaking' }), false)
  assert.equal(atlasVoiceCanStartNextTurn({ ...base, voxBusy: true }), false)

  for (const voxState of ['starting', 'listening', 'finishing', 'transcribing', 'transcript_ready', 'compiling', 'executing', 'eclipsed']) {
    assert.equal(
      atlasVoiceCanStartNextTurn({ ...base, voxState }),
      false,
      `não deveria iniciar outro turno em ${voxState}`,
    )
  }
})

test('Atlas Voice trata erro transitório como recuperável durante conversa contínua', () => {
  assert.equal(
    atlasVoiceCanStartNextTurn({
      voiceEnabled: true,
      atlasBusy: false,
      speechState: 'idle',
      voxBusy: false,
      voxState: 'error',
    }),
    true,
  )
})

test('Fluxo de dois turnos: fala, envia, responde por voz e volta a ouvir sem intervenção manual', () => {
  const timeline = [
    { label: 'turno 1 terminou de falar', voiceEnabled: true, atlasBusy: true, speechState: 'idle' as const, voxBusy: false, voxState: 'closed', canStart: false },
    { label: 'Atlas ainda está falando', voiceEnabled: true, atlasBusy: false, speechState: 'speaking' as const, voxBusy: false, voxState: 'closed', canStart: false },
    { label: 'resposta terminou', voiceEnabled: true, atlasBusy: false, speechState: 'idle' as const, voxBusy: false, voxState: 'closed', canStart: true },
    { label: 'turno 2 capturando', voiceEnabled: true, atlasBusy: false, speechState: 'idle' as const, voxBusy: true, voxState: 'listening', canStart: false },
    { label: 'turno 2 terminou resposta', voiceEnabled: true, atlasBusy: false, speechState: 'idle' as const, voxBusy: false, voxState: 'cancelled', canStart: true },
  ]

  for (const step of timeline) {
    assert.equal(
      atlasVoiceCanStartNextTurn(step),
      step.canStart,
      step.label,
    )
  }
})

test('Fluxo de três turnos: o ciclo continua depois da segunda resposta', () => {
  const turn = (index: number) => [
    { label: `turno ${index} ouvindo`, voiceEnabled: true, atlasBusy: false, speechState: 'idle' as const, voxBusy: true, voxState: 'listening', canStart: false },
    { label: `turno ${index} enviado ao Atlas`, voiceEnabled: true, atlasBusy: true, speechState: 'idle' as const, voxBusy: false, voxState: 'closed', canStart: false },
    { label: `turno ${index} respondendo por voz`, voiceEnabled: true, atlasBusy: false, speechState: 'speaking' as const, voxBusy: false, voxState: 'closed', canStart: false },
    { label: `turno ${index} pronto para próximo`, voiceEnabled: true, atlasBusy: false, speechState: 'idle' as const, voxBusy: false, voxState: 'closed', canStart: true },
  ]
  const timeline = [...turn(1), ...turn(2), ...turn(3)]

  for (const step of timeline) {
    assert.equal(
      atlasVoiceCanStartNextTurn(step),
      step.canStart,
      step.label,
    )
  }
})

test('Evento de fim da fala só vale para a execução atual', () => {
  assert.equal(
    atlasVoiceAcceptsSpeechRunEvent({ voiceEnabled: true, currentRunId: 7, eventRunId: 7 }),
    true,
    'onEnd da execução atual deve poder rearmar o próximo turno',
  )
  assert.equal(
    atlasVoiceAcceptsSpeechRunEvent({ voiceEnabled: true, currentRunId: 8, eventRunId: 7 }),
    false,
    'onEnd atrasado de fala antiga não pode rearmar o microfone',
  )
  assert.equal(
    atlasVoiceAcceptsSpeechRunEvent({ voiceEnabled: false, currentRunId: 7, eventRunId: 7 }),
    false,
    'parar conversa invalida qualquer callback pendente de TTS',
  )
})

test('Detector de fala não confirma ruído curto como turno humano', () => {
  assert.equal(
    atlasVoiceConfirmsHumanSpeech({
      speaking: true,
      speechFrameCount: 3,
      speechStartedAtMs: 1_000,
      nowMs: 1_240,
      minSpeechFrames: 8,
      minSpeechMs: 700,
    }),
    false,
    'picos curtos de AirPods não podem acionar envio automático',
  )
  assert.equal(
    atlasVoiceConfirmsHumanSpeech({
      speaking: true,
      speechFrameCount: 9,
      speechStartedAtMs: 1_000,
      nowMs: 1_760,
      minSpeechFrames: 8,
      minSpeechMs: 700,
    }),
    true,
    'fala sustentada deve liberar o turno para auto-envio',
  )
})

test('Turno sem fala confirmada é descartado e rearmado, não enviado ao Atlas', () => {
  assert.equal(
    atlasVoiceShouldDropSilentTurn({
      heardSpeech: false,
      durationMs: 24_000,
      maxTurnMs: 24_000,
    }),
    true,
  )
  assert.equal(
    atlasVoiceShouldDropSilentTurn({
      heardSpeech: true,
      durationMs: 24_000,
      maxTurnMs: 24_000,
    }),
    false,
  )
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
