export type AtlasVoiceSpeechPhase = 'idle' | 'speaking' | 'unavailable'

export interface AtlasVoiceBusyInput {
  sending: boolean
  pendingTrace: unknown | null
  streamingText: string | null | undefined
}

export interface AtlasVoiceCanStartInput {
  voiceEnabled: boolean
  atlasBusy: boolean
  speechState: AtlasVoiceSpeechPhase
  voxBusy: boolean
  voxState: string
}

export interface AtlasVoiceCanResetStaleTurnInput {
  voiceEnabled: boolean
  atlasBusy: boolean
  speechState: AtlasVoiceSpeechPhase
  voxBusy: boolean
  voxState: string
}

export interface AtlasVoiceSpeechRunInput {
  voiceEnabled: boolean
  currentRunId: number
  eventRunId: number
}

export interface AtlasVoiceAwaitingReplyRecoveryInput {
  awaitingReply: boolean
  awaitingStartedAtMs: number | null
  nowMs: number
  maxAwaitingMs: number
  atlasBusy: boolean
  speechState: AtlasVoiceSpeechPhase
}

export interface AtlasVoiceSpeechDetectionInput {
  speaking: boolean
  speechFrameCount: number
  speechStartedAtMs: number | null
  nowMs: number
  minSpeechFrames: number
  minSpeechMs: number
}

export interface AtlasVoiceSilentTurnInput {
  heardSpeech: boolean
  durationMs: number
  maxTurnMs: number
}

export interface AtlasVoiceEndpointSilenceInput {
  confirmedSpeechMs: number
  shortUtteranceSilenceMs: number
  longUtteranceSilenceMs: number
  longUtteranceSpeechMs: number
}

export interface AtlasVoiceFinishTurnInput {
  heardSpeech: boolean
  durationMs: number
  minTurnMs: number
  silenceMs: number
  requiredSilenceMs: number
}

export interface AtlasVoiceTranscriptInput {
  text: string
}

export interface AtlasVoiceTranscriptDispatchInput {
  pendingText: string | null
  transcriptText: string
}

export interface AtlasVoiceTranscriptDispatchDecision {
  shouldDispatch: boolean
  textToSend: string | null
  pendingText: string | null
}

export interface AtlasVoiceDropTranscriptInput {
  text: string
}

export interface AtlasVoiceSpeechWindowInput {
  speaking: boolean
  previousFrameCount: number
  previousSpeechMs: number
  pollMs: number
}

export interface AtlasVoiceSpeechWindow {
  speechFrameCount: number
  speechMs: number
}

export const ATLAS_VOICE_REARMABLE_VOX_STATES = ['closed', 'idle', 'cancelled', 'error'] as const
export const ATLAS_VOICE_STALE_TURN_VOX_STATES = [
  'transcript_ready',
  'compiled',
  'awaiting_confirmation',
  'executed',
  'blocked',
] as const

export function atlasVoiceIsAtlasBusy(input: AtlasVoiceBusyInput): boolean {
  return (
    input.sending
    || input.pendingTrace !== null
    || (input.streamingText ?? '').trim().length > 0
  )
}

export function atlasVoiceCanStartNextTurn(input: AtlasVoiceCanStartInput): boolean {
  if (!input.voiceEnabled) return false
  if (input.atlasBusy) return false
  if (input.speechState === 'speaking') return false
  if (input.voxBusy) return false
  return (ATLAS_VOICE_REARMABLE_VOX_STATES as readonly string[]).includes(input.voxState)
}

export function atlasVoiceCanResetStaleTurn(input: AtlasVoiceCanResetStaleTurnInput): boolean {
  if (!input.voiceEnabled) return false
  if (input.atlasBusy) return false
  if (input.speechState === 'speaking') return false
  if (input.voxBusy) return false
  return (ATLAS_VOICE_STALE_TURN_VOX_STATES as readonly string[]).includes(input.voxState)
}

export function atlasVoiceAcceptsSpeechRunEvent(input: AtlasVoiceSpeechRunInput): boolean {
  return input.voiceEnabled && input.currentRunId === input.eventRunId
}

export function atlasVoiceShouldRecoverAwaitingReply(input: AtlasVoiceAwaitingReplyRecoveryInput): boolean {
  if (!input.awaitingReply) return false
  if (input.awaitingStartedAtMs === null) return false
  if (input.atlasBusy) return false
  if (input.speechState === 'speaking') return false
  return input.nowMs - input.awaitingStartedAtMs > input.maxAwaitingMs
}

export function atlasVoiceNextSpeechWindow(input: AtlasVoiceSpeechWindowInput): AtlasVoiceSpeechWindow {
  if (!input.speaking) {
    return {
      speechFrameCount: 0,
      speechMs: 0,
    }
  }

  return {
    speechFrameCount: input.previousFrameCount + 1,
    speechMs: input.previousSpeechMs + input.pollMs,
  }
}

export function atlasVoiceConfirmsHumanSpeech(input: AtlasVoiceSpeechDetectionInput): boolean {
  if (!input.speaking) return false
  if (input.speechStartedAtMs === null) return false
  if (input.speechFrameCount < input.minSpeechFrames) return false
  return input.nowMs - input.speechStartedAtMs >= input.minSpeechMs
}

export function atlasVoiceShouldDropSilentTurn(input: AtlasVoiceSilentTurnInput): boolean {
  return !input.heardSpeech && input.durationMs >= input.maxTurnMs
}

export function atlasVoiceEndpointSilenceMs(input: AtlasVoiceEndpointSilenceInput): number {
  if (input.confirmedSpeechMs >= input.longUtteranceSpeechMs) {
    return input.longUtteranceSilenceMs
  }

  return input.shortUtteranceSilenceMs
}

export function atlasVoiceShouldFinishTurn(input: AtlasVoiceFinishTurnInput): boolean {
  if (!input.heardSpeech) return false
  if (input.durationMs < input.minTurnMs) return false
  return input.silenceMs >= input.requiredSilenceMs
}

const ATLAS_VOICE_INCOMPLETE_ENDINGS = [
  /\b(que|porque|por que|quando|onde|como|se|mas|entao|então|sobre|para|pra|com|sem|de|do|da|dos|das)$/i,
  /\b(que\s+(o|a|os|as|um|uma|uns|umas|ele|ela|eles|elas|voce|você|eu|meu|minha|meus|minhas))$/i,
  /\b(eu\s+(preciso|queria|gostaria|quero)\s+(que|de))$/i,
  /\b(me\s+disseram\s+que(\s+(o|a|os|as))?)$/i,
  /\b(vou\s+te\s+(mandar|falar|explicar)|deixa\s+eu\s+(te\s+)?(explicar|falar))$/i,
]

const ATLAS_VOICE_SUSPICIOUS_TRANSCRIPTS = [
  /^(https?:\/\/)?(www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(\/\S*)?$/i,
  /^(ponto\s+)?(com|com\.br|br|net|org)$/i,
]

export function atlasVoiceTranscriptLooksIncomplete(input: AtlasVoiceTranscriptInput): boolean {
  const text = input.text
    .trim()
    .replace(/[.…]+$/g, '')
    .replace(/[!?]+$/g, '')
    .trim()

  if (text.length < 8) return false

  return ATLAS_VOICE_INCOMPLETE_ENDINGS.some((pattern) => pattern.test(text))
}

export function atlasVoiceDecideTranscriptDispatch(
  input: AtlasVoiceTranscriptDispatchInput,
): AtlasVoiceTranscriptDispatchDecision {
  const transcriptText = input.transcriptText.trim()
  if (!transcriptText) {
    return {
      shouldDispatch: false,
      textToSend: null,
      pendingText: input.pendingText,
    }
  }

  const textToSend = input.pendingText
    ? `${input.pendingText} ${transcriptText}`.trim()
    : transcriptText

  if (atlasVoiceTranscriptLooksIncomplete({ text: textToSend })) {
    return {
      shouldDispatch: false,
      textToSend: null,
      pendingText: textToSend,
    }
  }

  return {
    shouldDispatch: true,
    textToSend,
    pendingText: null,
  }
}

export function atlasVoiceShouldDropTranscript(input: AtlasVoiceDropTranscriptInput): boolean {
  const text = input.text.trim()
  if (!text) return true
  return ATLAS_VOICE_SUSPICIOUS_TRANSCRIPTS.some((pattern) => pattern.test(text))
}
