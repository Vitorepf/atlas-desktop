import assert from 'node:assert/strict'
import {
  atlasVoiceAcceptsSpeechRunEvent,
  atlasVoiceCanResetStaleTurn,
  atlasVoiceCanStartNextTurn,
  atlasVoiceConfirmsHumanSpeech,
  atlasVoiceDecideTranscriptDispatch,
  atlasVoiceEndpointSilenceMs,
  atlasVoiceIsAtlasBusy,
  atlasVoiceNextSpeechWindow,
  atlasVoiceShouldRecoverAwaitingReply,
  atlasVoiceShouldDropSilentTurn,
  atlasVoiceShouldDropTranscript,
  atlasVoiceShouldFinishTurn,
  atlasVoiceTranscriptLooksIncomplete,
  ATLAS_VOICE_REARMABLE_VOX_STATES,
  ATLAS_VOICE_STALE_TURN_VOX_STATES,
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

test('Atlas Voice pode limpar restos do turno anterior antes de rearmar', () => {
  for (const voxState of ATLAS_VOICE_STALE_TURN_VOX_STATES) {
    assert.equal(
      atlasVoiceCanResetStaleTurn({
        voiceEnabled: true,
        atlasBusy: false,
        speechState: 'idle',
        voxBusy: false,
        voxState,
      }),
      true,
      `${voxState} é resto descartável no modo conversa por voz depois do envio`,
    )
  }
})

test('Atlas Voice não limpa resto de turno enquanto Atlas fala/pensa ou Vox trabalha', () => {
  const base = {
    voiceEnabled: true,
    atlasBusy: false,
    speechState: 'idle' as const,
    voxBusy: false,
    voxState: 'transcript_ready',
  }

  assert.equal(atlasVoiceCanResetStaleTurn({ ...base, voiceEnabled: false }), false)
  assert.equal(atlasVoiceCanResetStaleTurn({ ...base, atlasBusy: true }), false)
  assert.equal(atlasVoiceCanResetStaleTurn({ ...base, speechState: 'speaking' }), false)
  assert.equal(atlasVoiceCanResetStaleTurn({ ...base, voxBusy: true }), false)
  assert.equal(atlasVoiceCanResetStaleTurn({ ...base, voxState: 'listening' }), false)
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

test('Atlas Voice recupera turno preso aguardando resposta sem matar a conversa', () => {
  assert.equal(
    atlasVoiceShouldRecoverAwaitingReply({
      awaitingReply: true,
      awaitingStartedAtMs: 1_000,
      nowMs: 77_000,
      maxAwaitingMs: 75_000,
      atlasBusy: false,
      speechState: 'idle',
    }),
    true,
    'se o turno ficou aguardando resposta e nada mais está ocupado, precisa voltar a ouvir',
  )
  assert.equal(
    atlasVoiceShouldRecoverAwaitingReply({
      awaitingReply: true,
      awaitingStartedAtMs: 1_000,
      nowMs: 77_000,
      maxAwaitingMs: 75_000,
      atlasBusy: true,
      speechState: 'idle',
    }),
    false,
    'não pode recuperar enquanto o Atlas ainda está pensando',
  )
  assert.equal(
    atlasVoiceShouldRecoverAwaitingReply({
      awaitingReply: true,
      awaitingStartedAtMs: 1_000,
      nowMs: 77_000,
      maxAwaitingMs: 75_000,
      atlasBusy: false,
      speechState: 'speaking',
    }),
    false,
    'não pode recuperar enquanto a voz ainda está falando',
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

test('Janela de fala sustentada zera quando o sinal cai', () => {
  assert.deepEqual(
    atlasVoiceNextSpeechWindow({
      speaking: true,
      previousFrameCount: 7,
      previousSpeechMs: 640,
      pollMs: 80,
    }),
    {
      speechFrameCount: 8,
      speechMs: 720,
    },
    'fala contínua deve acumular frames e duração',
  )
  assert.deepEqual(
    atlasVoiceNextSpeechWindow({
      speaking: false,
      previousFrameCount: 7,
      previousSpeechMs: 640,
      pollMs: 80,
    }),
    {
      speechFrameCount: 0,
      speechMs: 0,
    },
    'ruídos separados por silêncio não podem acumular até virar turno',
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

test('Endpointing espera mais em frase curta para não cortar pensamento no meio', () => {
  assert.equal(
    atlasVoiceEndpointSilenceMs({
      confirmedSpeechMs: 1_600,
      shortUtteranceSilenceMs: 3_200,
      longUtteranceSilenceMs: 2_200,
      longUtteranceSpeechMs: 4_000,
    }),
    3_200,
    'frase curta precisa tolerar pausa humana maior antes de enviar',
  )
})

test('Endpointing permite finalizar fala longa com pausa natural menor', () => {
  assert.equal(
    atlasVoiceEndpointSilenceMs({
      confirmedSpeechMs: 5_200,
      shortUtteranceSilenceMs: 3_200,
      longUtteranceSilenceMs: 2_200,
      longUtteranceSpeechMs: 4_000,
    }),
    2_200,
    'fala longa já confirmada pode finalizar depois de pausa natural menor',
  )
})

test('Atlas Voice só finaliza turno quando houve fala e a pausa exigida foi atingida', () => {
  const base = {
    heardSpeech: true,
    durationMs: 4_500,
    minTurnMs: 900,
    requiredSilenceMs: 3_200,
  }

  assert.equal(
    atlasVoiceShouldFinishTurn({ ...base, silenceMs: 1_200 }),
    false,
    'não pode enviar enquanto a pausa ainda é compatível com continuação da frase',
  )
  assert.equal(atlasVoiceShouldFinishTurn({ ...base, silenceMs: 2_050 }), false)
  assert.equal(atlasVoiceShouldFinishTurn({ ...base, silenceMs: 3_250 }), true)
  assert.equal(
    atlasVoiceShouldFinishTurn({ ...base, heardSpeech: false, silenceMs: 3_000 }),
    false,
    'silêncio sem fala confirmada nunca vira turno do usuário',
  )
  assert.equal(
    atlasVoiceShouldFinishTurn({ ...base, durationMs: 500, silenceMs: 3_000 }),
    false,
    'turno menor que o mínimo não pode ser enviado',
  )
})

test('Transcript claramente incompleto fica pendente para continuação, não vira resposta prematura', () => {
  assert.equal(
    atlasVoiceTranscriptLooksIncomplete({ text: 'Atlas, me disseram que o' }),
    true,
    'não pode enviar ao Atlas uma fala cortada no conectivo',
  )
  assert.equal(
    atlasVoiceTranscriptLooksIncomplete({ text: 'Eu preciso que' }),
    true,
    'pedido incompleto deve esperar continuação',
  )
  assert.equal(
    atlasVoiceTranscriptLooksIncomplete({ text: 'Me disseram que estava funcionando' }),
    false,
    'frase completa pode ser enviada',
  )
  assert.equal(
    atlasVoiceTranscriptLooksIncomplete({ text: 'Faça uma análise completa da documentação do Atlas.' }),
    false,
    'pedido completo e longo deve seguir para execução integral',
  )
})

test('Decisão de dispatch junta continuação pendente antes de enviar ao Atlas', () => {
  const first = atlasVoiceDecideTranscriptDispatch({
    pendingText: null,
    transcriptText: 'Atlas, me disseram que o',
  })

  assert.deepEqual(first, {
    shouldDispatch: false,
    textToSend: null,
    pendingText: 'Atlas, me disseram que o',
  })

  const second = atlasVoiceDecideTranscriptDispatch({
    pendingText: first.pendingText,
    transcriptText: 'fluxo de voz estava funcionando melhor agora',
  })

  assert.deepEqual(second, {
    shouldDispatch: true,
    textToSend: 'Atlas, me disseram que o fluxo de voz estava funcionando melhor agora',
    pendingText: null,
  })
})

test('Transcript suspeito de alucinação isolada é descartado, não enviado ao Atlas', () => {
  assert.equal(atlasVoiceShouldDropTranscript({ text: '' }), true)
  assert.equal(atlasVoiceShouldDropTranscript({ text: 'www.tinyurl.com.br' }), true)
  assert.equal(atlasVoiceShouldDropTranscript({ text: 'https://tinyurl.com/abc123' }), true)
  assert.equal(
    atlasVoiceShouldDropTranscript({ text: 'Acesse o site www.tinyurl.com.br para mais informações' }),
    false,
    'frase humana com URL não deve ser descartada por conter domínio',
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
