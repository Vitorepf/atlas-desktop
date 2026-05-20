import assert from 'node:assert/strict'
import {
  atlasVoiceCanResetStaleTurn,
  atlasVoiceCanStartNextTurn,
  atlasVoiceEndpointSilenceMs,
  atlasVoiceShouldFinishTurn,
} from '../atlasAiVoiceContinuity'

const SHORT_UTTERANCE_SILENCE_MS = 3_200
const LONG_UTTERANCE_SILENCE_MS = 2_200
const LONG_UTTERANCE_SPEECH_MS = 4_000
const MIN_TURN_MS = 900

type SpeechPhase = 'idle' | 'speaking' | 'unavailable'

interface LoopState {
  voiceEnabled: boolean
  atlasBusy: boolean
  speechState: SpeechPhase
  voxBusy: boolean
  voxState: string
}

function assertCanStartNextTurn(state: LoopState, expected: boolean, label: string): void {
  assert.equal(
    atlasVoiceCanStartNextTurn(state),
    expected,
    label,
  )
}

function assertNaturalPauseDoesNotSend(confirmedSpeechMs: number, silenceMs: number): void {
  const requiredSilenceMs = atlasVoiceEndpointSilenceMs({
    confirmedSpeechMs,
    shortUtteranceSilenceMs: SHORT_UTTERANCE_SILENCE_MS,
    longUtteranceSilenceMs: LONG_UTTERANCE_SILENCE_MS,
    longUtteranceSpeechMs: LONG_UTTERANCE_SPEECH_MS,
  })

  assert.equal(
    atlasVoiceShouldFinishTurn({
      heardSpeech: true,
      durationMs: Math.max(MIN_TURN_MS, confirmedSpeechMs + silenceMs),
      minTurnMs: MIN_TURN_MS,
      silenceMs,
      requiredSilenceMs,
    }),
    false,
    'pausa natural dentro da frase não pode enviar o turno',
  )
}

function assertEndOfTurnSends(confirmedSpeechMs: number, silenceMs: number): void {
  const requiredSilenceMs = atlasVoiceEndpointSilenceMs({
    confirmedSpeechMs,
    shortUtteranceSilenceMs: SHORT_UTTERANCE_SILENCE_MS,
    longUtteranceSilenceMs: LONG_UTTERANCE_SILENCE_MS,
    longUtteranceSpeechMs: LONG_UTTERANCE_SPEECH_MS,
  })

  assert.equal(
    atlasVoiceShouldFinishTurn({
      heardSpeech: true,
      durationMs: Math.max(MIN_TURN_MS, confirmedSpeechMs + silenceMs),
      minTurnMs: MIN_TURN_MS,
      silenceMs,
      requiredSilenceMs,
    }),
    true,
    'fim de fala real deve enviar o turno automaticamente',
  )
}

for (let turn = 1; turn <= 3; turn += 1) {
  assertCanStartNextTurn({
    voiceEnabled: true,
    atlasBusy: false,
    speechState: 'idle',
    voxBusy: false,
    voxState: 'closed',
  }, true, `turno ${turn}: precisa poder começar a ouvir`)

  assertCanStartNextTurn({
    voiceEnabled: true,
    atlasBusy: false,
    speechState: 'idle',
    voxBusy: true,
    voxState: 'listening',
  }, false, `turno ${turn}: não pode abrir outra captura enquanto já ouve`)

  assertNaturalPauseDoesNotSend(1_600, 2_100)
  assertEndOfTurnSends(1_600, 3_300)

  assertCanStartNextTurn({
    voiceEnabled: true,
    atlasBusy: true,
    speechState: 'idle',
    voxBusy: false,
    voxState: 'closed',
  }, false, `turno ${turn}: não pode ouvir enquanto Atlas está pensando`)

  assertCanStartNextTurn({
    voiceEnabled: true,
    atlasBusy: false,
    speechState: 'speaking',
    voxBusy: false,
    voxState: 'closed',
  }, false, `turno ${turn}: não pode ouvir enquanto Atlas está falando`)

  assertCanStartNextTurn({
    voiceEnabled: true,
    atlasBusy: false,
    speechState: 'idle',
    voxBusy: false,
    voxState: 'closed',
  }, true, `turno ${turn}: depois da voz, precisa rearmar sem clique`)
}

assert.equal(
  atlasVoiceCanResetStaleTurn({
    voiceEnabled: true,
    atlasBusy: false,
    speechState: 'idle',
    voxBusy: false,
    voxState: 'transcript_ready',
  }),
  true,
  'transcript_ready antigo já enviado deve ser limpável para não matar o próximo turno',
)

process.stdout.write('  PASS  Simulação Atlas Voice: 3 turnos contínuos + pausa natural + limpeza de turno velho\n')
