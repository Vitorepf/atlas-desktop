import type { UseVoxOverlayResult, VoxOverlayState } from '../../../components/vox/useVoxOverlay'

export type AtlasAiVoiceSpeechState = 'idle' | 'speaking' | 'unavailable'

interface AtlasAiVoiceConversationOverlayProps {
  vox: UseVoxOverlayResult
  sending: boolean
  awaitingResponse: boolean
  streaming: boolean
  speechState: AtlasAiVoiceSpeechState
  speechError: string | null
  sendError: string | null
  onStop: () => void
  onInterrupt: () => void
  onRecordAgain: () => void
}

function voicePhaseLabel(
  state: VoxOverlayState,
  sending: boolean,
  awaitingResponse: boolean,
  streaming: boolean,
  speechState: AtlasAiVoiceSpeechState,
): string {
  if (speechState === 'unavailable') return 'Voz indisponível'
  if (speechState === 'speaking') return 'Respondendo'
  if (sending || awaitingResponse || streaming) return 'Pensando'
  switch (state) {
    case 'starting':
      return 'Abrindo microfone'
    case 'listening':
      return 'Atlas ouvindo'
    case 'finishing':
    case 'transcribing':
      return 'Transcrevendo'
    case 'transcript_ready':
      return 'Enviando ao Atlas'
    case 'error':
      return 'Precisa de atenção'
    case 'cancelled':
    case 'closed':
    case 'idle':
      return 'Pronto'
    default:
      return 'Trabalhando'
  }
}

function voiceInstruction(
  state: VoxOverlayState,
  sending: boolean,
  awaitingResponse: boolean,
  streaming: boolean,
  speechState: AtlasAiVoiceSpeechState,
): string {
  if (speechState === 'unavailable') return 'Não consegui falar a resposta neste runtime. A resposta ficou na conversa.'
  if (speechState === 'speaking') return 'Atlas está falando. Ao terminar, ele volta a escutar.'
  if (sending || awaitingResponse || streaming) return 'Atlas está preparando a resposta.'
  if (state === 'listening') return 'Fale normalmente. Quando você parar, eu envio sozinho.'
  if (state === 'transcribing' || state === 'finishing') return 'Estou transformando sua fala em texto.'
  if (state === 'transcript_ready') return 'Texto pronto. Vou enviar para o Atlas.'
  if (state === 'error') return 'Não consegui completar esse turno. Grave de novo ou pare a conversa.'
  return 'Aperte gravar para iniciar outro turno.'
}

function transcriptText(vox: UseVoxOverlayResult): string {
  return (vox.transcriptDraft || vox.transcript?.text || '').trim()
}

export function AtlasAiVoiceConversationOverlay({
  vox,
  sending,
  awaitingResponse,
  streaming,
  speechState,
  speechError,
  sendError,
  onStop,
  onInterrupt,
  onRecordAgain,
}: AtlasAiVoiceConversationOverlayProps) {
  const phase = voicePhaseLabel(vox.state, sending, awaitingResponse, streaming, speechState)
  const heard = transcriptText(vox)
  const busy =
    vox.busy
    || sending
    || awaitingResponse
    || streaming
    || speechState === 'speaking'
  const canRecordAgain =
    !busy
    && (vox.state === 'idle'
      || vox.state === 'closed'
      || vox.state === 'cancelled'
      || vox.state === 'error'
      || vox.state === 'transcript_ready')

  return (
    <section className="atlas-ai-voice-live" aria-label="Atlas Voice ao vivo">
      <header className="atlas-ai-voice-live-header">
        <div>
          <strong>atlas voice</strong>
          <span>{phase}</span>
        </div>
        <button
          type="button"
          className="atlas-ai-voice-live-close"
          onClick={onStop}
          aria-label="Parar conversa por voz"
          title="Parar conversa por voz"
        >
          ×
        </button>
      </header>

      <div className={`atlas-ai-voice-live-orb${vox.state === 'listening' ? ' is-listening' : ''}`}>
        <span className="atlas-ai-voice-live-dot" aria-hidden="true" />
        <span>{phase}</span>
      </div>

      <p className="atlas-ai-voice-live-instruction">{voiceInstruction(vox.state, sending, awaitingResponse, streaming, speechState)}</p>

      {vox.error || sendError || speechError ? (
        <p className="atlas-ai-voice-live-error">{vox.error ?? sendError ?? speechError}</p>
      ) : null}

      {heard ? (
        <div className="atlas-ai-voice-live-heard">
          <span>Você disse</span>
          <p>{heard}</p>
        </div>
      ) : null}

      <div className="atlas-ai-voice-live-actions">
        {speechState === 'speaking' ? (
          <button type="button" className="atlas-ai-voice-live-primary" onClick={onInterrupt}>
            Interromper e falar
          </button>
        ) : null}
        {vox.state === 'listening' ? (
          <div className="atlas-ai-voice-live-autosend" aria-live="polite">
            Envio automático após pausa
          </div>
        ) : null}
        {canRecordAgain ? (
          <button type="button" className="atlas-ai-voice-live-primary" onClick={onRecordAgain}>
            Gravar de novo
          </button>
        ) : null}
        <button type="button" className="atlas-ai-voice-live-secondary" onClick={() => void vox.cancel()} disabled={busy && vox.state !== 'listening'}>
          Cancelar turno
        </button>
        <button type="button" className="atlas-ai-voice-live-danger" onClick={onStop}>
          Parar conversa
        </button>
      </div>
    </section>
  )
}
