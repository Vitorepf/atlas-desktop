const MAX_SPOKEN_CHARS = 1800
const DEFAULT_MAX_SPOKEN_CHARS = MAX_SPOKEN_CHARS

interface AtlasAiSpeechOptions {
  onEnd?: () => void
  onError?: (reason?: string | null) => void
  maxChars?: number
}

interface NativeSpeechResult {
  ok: boolean
  spoken: boolean
  voice?: string | null
  reason?: string | null
  latencyMs?: {
    request: number
    download: number
    write: number
    playback: number
    total: number
    audioBytes: number
  } | null
}

declare global {
  interface Window {
    __atlasVoiceLastLatencyMs?: NonNullable<NativeSpeechResult['latencyMs']>
  }
}

function hasTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const tauri = await import('@tauri-apps/api/core')
  return tauri.invoke<T>(cmd, args)
}

function stripMarkdownForSpeech(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, ' trecho de código omitido. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[>\-*+]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export function prepareAtlasAiSpeechText(input: string | null | undefined, maxChars = DEFAULT_MAX_SPOKEN_CHARS): string {
  const cleaned = stripMarkdownForSpeech(input ?? '')
  if (!cleaned) return ''
  const limit = Math.max(240, Math.min(MAX_SPOKEN_CHARS, Math.floor(maxChars)))
  if (cleaned.length <= limit) return cleaned
  return `${cleaned.slice(0, limit).replace(/\s+\S*$/, '')}. Resposta longa; deixei o restante em texto.`
}

export function atlasAiCanSpeakLocally(): boolean {
  return hasTauriRuntime()
}

export async function stopAtlasAiSpeech(): Promise<void> {
  if (hasTauriRuntime()) {
    try {
      await invokeTauri<NativeSpeechResult>('atlas_voice_stop')
    } catch {
      /* stopping speech must never break the UI */
    }
  }
}

export async function speakAtlasAiText(
  input: string | null | undefined,
  options: AtlasAiSpeechOptions = {},
): Promise<boolean> {
  const text = prepareAtlasAiSpeechText(input, options.maxChars)
  if (!text) return false

  if (hasTauriRuntime()) {
    try {
      await stopAtlasAiSpeech()
      const result = await invokeTauri<NativeSpeechResult>('atlas_voice_speak', { text })
      if (result.ok && result.spoken) {
        if (result.latencyMs && typeof window !== 'undefined') {
          window.__atlasVoiceLastLatencyMs = result.latencyMs
          window.dispatchEvent(new CustomEvent('atlas-ai-voice-latency', { detail: result.latencyMs }))
        }
        options.onEnd?.()
        return true
      }
      options.onError?.(result.reason ?? 'audio_not_spoken')
      return false
    } catch (error) {
      options.onError?.(error instanceof Error ? error.message : 'native_audio_failed')
      return false
    }
  }

  options.onError?.('native_audio_unavailable')
  return false
}
