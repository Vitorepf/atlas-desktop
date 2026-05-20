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

export interface AtlasVoiceSpeechRunInput {
  voiceEnabled: boolean
  currentRunId: number
  eventRunId: number
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

export const ATLAS_VOICE_REARMABLE_VOX_STATES = ['closed', 'idle', 'cancelled', 'error'] as const

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

export function atlasVoiceAcceptsSpeechRunEvent(input: AtlasVoiceSpeechRunInput): boolean {
  return input.voiceEnabled && input.currentRunId === input.eventRunId
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
