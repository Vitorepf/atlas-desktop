/**
 * V6-E · Auto-Dogfood hook.
 *
 * Cada sessão Vox real termina silenciosamente registrando um diário em
 * `POST /ai/vox/dogfood/session` com o envelope `auto_event`
 * (`atlas.vox.dogfood_event.v1`). O operador NUNCA preenche formulário —
 * o overlay infere tudo a partir do estado vivo do `useVoxOverlay`.
 *
 * Princípios duros (canon V6-E):
 *   * Nunca envia transcript bruto, prompt body, áudio ou clipboard.
 *     `raw_audio_persisted=false` é hard-coded no bridge + backend.
 *   * Idempotente por sessão (`session.sessionId`). Re-render, reload
 *     do overlay, transição cíclica de state — nada dispara um segundo
 *     auto-record.
 *   * Falha não trava UX. Se POST der erro/unavailable, o hook guarda em
 *     `result.kind='failed'` e o componente mostra (no máximo) um chip
 *     discreto. Erro não escala para o banner principal.
 *   * Feedback opcional (`Funcionou bem` / `Marcar como ruim`) só liga
 *     quando o auto-record sucedeu — sem id, não há onde piscar regret.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  voxDogfoodSessionCreate,
  voxDogfoodSessionFeedback,
  type VoxAutoModeDecision,
  type VoxDogfoodAutoEvent,
  type VoxDogfoodOutcome,
  type VoxEdgeSession,
  type VoxInterlocutorDecision,
  type VoxKernelIntentResponse,
  type VoxMode,
  type VoxTranscript,
} from '../../lib/bridge'

import type { VoxOverlayState } from './useVoxOverlay'

export type VoxAutoDogfoodClickedAction = NonNullable<VoxDogfoodAutoEvent['clickedAction']>
export type VoxAutoDogfoodLaunchSource = NonNullable<VoxDogfoodAutoEvent['launchSource']>

export type VoxAutoDogfoodResult =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'recorded'; dogfoodSessionId: string | null; outcome: VoxDogfoodOutcome }
  | { kind: 'unavailable'; message: string }
  | { kind: 'failed'; message: string }

export interface UseVoxAutoDogfoodInput {
  state: VoxOverlayState
  selectedMode: 'auto' | VoxMode
  session: VoxEdgeSession | null
  transcript: VoxTranscript | null
  transcriptDraft: string
  kernelResponse: VoxKernelIntentResponse | null
  sttError: { code: string; message: string } | null
  /** Fonte do disparo (V6-A ambient launch / V6-B helper / hotkey in-process
   * / botão app). Para V6-E single-shot, basta o overlay informar o que
   * detectou. */
  launchSource: VoxAutoDogfoodLaunchSource
  /** Última ação operacional que ANTECEDEU o fim da sessão. O overlay
   * atualiza via `markClickedAction` em insert/send/confirm/cancel. */
  clickedAction: VoxAutoDogfoodClickedAction
}

export interface VoxAutoDogfoodFeedbackHandle {
  /** `true` quando há dogfood_session_id e a operação está habilitada. */
  available: boolean
  /** Última resposta do PATCH; `null` antes de qualquer click. */
  lastResult: 'good' | 'bad' | null
  /** Em flight? */
  busy: boolean
  /** Mensagem humanizada quando falha (mostrar discreto, não bloquear). */
  error: string | null
  /** Marca a sessão como "funcionou bem" (`regret_flag=false`). */
  submitGood: () => Promise<void>
  /** Marca a sessão como "ruim" (`regret_flag=true`). */
  submitBad: () => Promise<void>
}

export interface UseVoxAutoDogfoodResult {
  result: VoxAutoDogfoodResult
  feedback: VoxAutoDogfoodFeedbackHandle
}

const TERMINAL_STATES: ReadonlyArray<VoxOverlayState> = [
  'executed',
  'blocked',
  'cancelled',
  'error',
]

/** Mapeia estado terminal + ação para outcome canônico do diário. */
function deriveOutcome(
  state: VoxOverlayState,
  clickedAction: VoxAutoDogfoodClickedAction,
  emptyTranscript: boolean,
  sttFailed: boolean,
): VoxDogfoodOutcome {
  if (state === 'executed') return 'success'
  if (state === 'blocked') return 'failed'
  if (state === 'error') return 'failed'
  if (state === 'cancelled') {
    if (sttFailed) return 'failed'
    // Cancelled sem transcript = sessão capturada e descartada → cancelled.
    if (emptyTranscript) return 'cancelled'
    // Cancelled com transcript = partial (operador tinha texto mas desistiu).
    return clickedAction === 'cancel' ? 'cancelled' : 'partial'
  }
  // Fallback honesto — não deveríamos cair aqui.
  return 'partial'
}

function deriveInterlocutorKind(
  interlocutor: VoxInterlocutorDecision | null | undefined,
): VoxDogfoodAutoEvent['interventionKind'] {
  if (!interlocutor) return 'none'
  switch (interlocutor.intervention) {
    case 'clarify':
    case 'caution':
    case 'disagree':
    case 'suggest_better_prompt':
      return interlocutor.intervention
    default:
      return 'none'
  }
}

function autoModeConfidence(
  decision: VoxAutoModeDecision | null | undefined,
): number | null {
  if (!decision) return null
  if (typeof decision.confidence !== 'number') return null
  if (!Number.isFinite(decision.confidence)) return null
  return Math.max(0, Math.min(1, decision.confidence))
}

export function useVoxAutoDogfood(input: UseVoxAutoDogfoodInput): UseVoxAutoDogfoodResult {
  const {
    state,
    selectedMode,
    session,
    transcript,
    transcriptDraft,
    kernelResponse,
    sttError,
    launchSource,
    clickedAction,
  } = input

  const [result, setResult] = useState<VoxAutoDogfoodResult>({ kind: 'idle' })
  const [feedbackBusy, setFeedbackBusy] = useState<boolean>(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [lastFeedback, setLastFeedback] = useState<'good' | 'bad' | null>(null)

  // Idempotência: uma única gravação por sessionId. Sessões sem id (cancel
  // antes do edge responder) marcam pela combinação de tempo + state, para
  // não enviar dois auto-records em re-renders.
  const recordedKeysRef = useRef<Set<string>>(new Set())

  // Refs para os inputs serem lidos no momento real (a callback async não
  // ressubscrita). Evita capturas stale do React 19 strict-mode.
  const inputRef = useRef(input)
  inputRef.current = input

  useEffect(() => {
    if (!TERMINAL_STATES.includes(state)) return
    const live = inputRef.current
    const sessionId = live.session?.sessionId ?? null
    // Key idempotente: sessionId quando há, senão fallback determinístico.
    const key = sessionId ?? `noid::${state}::${live.session?.startedAt ?? 'no-start'}`
    if (recordedKeysRef.current.has(key)) return
    recordedKeysRef.current.add(key)

    void (async () => {
      setResult({ kind: 'submitting' })

      const transcriptText =
        (live.transcript?.text ?? '').trim() !== ''
          ? live.transcript?.text ?? ''
          : live.transcriptDraft
      const emptyTranscript = (transcriptText ?? '').trim() === ''
      const sttFailed = live.sttError !== null
      const outcome = deriveOutcome(
        state,
        live.clickedAction,
        emptyTranscript,
        sttFailed,
      )

      // Modo final é o `selectedMode` quando concreto; em `auto` (Kernel
      // não respondeu ainda) mandamos `null` honesto e o backend tolera.
      const finalMode: VoxMode | null =
        live.selectedMode === 'auto' ? null : live.selectedMode
      const suggestedMode = live.kernelResponse?.suggestedMode ?? null
      const manualOverride = Boolean(
        suggestedMode && finalMode && suggestedMode !== finalMode,
      )

      const interlocutor = live.kernelResponse?.interlocutor ?? null
      const interventionKind = deriveInterlocutorKind(interlocutor)
      const interventionPresent = interventionKind !== 'none'

      // `mode` é obrigatório no backend. Quando `selectedMode === 'auto'`
      // (Kernel ainda decidindo no momento do cancel), tentamos
      // `suggestedMode`; se nada, ditation conservador. Audita honesto.
      const wireMode: VoxMode = finalMode ?? suggestedMode ?? 'dictation'
      const durationMs =
        typeof live.session?.durationMs === 'number' && live.session.durationMs > 0
          ? live.session.durationMs
          : null
      const startedAt =
        typeof live.session?.startedAt === 'string' && live.session.startedAt !== ''
          ? live.session.startedAt
          : null
      // launch_source 'hotkey' quando o edge marca origem.
      const inferredHotkey =
        live.launchSource === 'hotkey'
        || live.launchSource === 'ambient_helper'
        || live.launchSource === 'ambient_launch'
        || live.session?.source === 'mac_edge_hotkey'
      const usedRealStt = Boolean(
        live.transcript
        && /whisper/i.test(live.transcript.engine)
        && !/debug/i.test(live.transcript.engine),
      )
      const usedGovernedExecute = finalMode === 'governed_execute'

      const autoEvent: VoxDogfoodAutoEvent = {
        suggestedMode,
        finalMode,
        manualOverride,
        autoRouterConfidence: autoModeConfidence(live.kernelResponse?.autoModeDecision),
        interventionPresent,
        interventionKind,
        emptyTranscript,
        sttFailed,
        clickedAction: live.clickedAction,
        launchSource: live.launchSource,
        errorKind: state === 'error'
          ? (sttFailed
              ? live.sttError?.code ?? 'stt_error'
              : 'overlay_error')
          : null,
        rawAudioPersisted: false,
      }

      try {
        const response = await voxDogfoodSessionCreate({
          mode: wireMode,
          outcome,
          voxSessionId: sessionId,
          startedAt,
          durationMs,
          usedHotkey: inferredHotkey,
          usedRealStt,
          usedGovernedExecute,
          regretFlag: false,
          eclipseUsed: false,
          autoEvent,
        })
        if (response.status === 'ok') {
          setResult({
            kind: 'recorded',
            dogfoodSessionId: response.session?.dogfoodSessionId ?? null,
            outcome,
          })
          return
        }
        if (response.status === 'unavailable') {
          setResult({
            kind: 'unavailable',
            message: response.message ?? 'Diário Vox indisponível agora.',
          })
          return
        }
        setResult({
          kind: 'failed',
          message: response.message ?? 'Falha ao registrar sessão Vox.',
        })
      } catch (e) {
        // Garantido: NUNCA quebrar o overlay. Engole a exceção e marca o
        // resultado como `failed`.
        setResult({
          kind: 'failed',
          message: e instanceof Error ? e.message : String(e),
        })
      }
    })()
    // Dispatch só depende do `state` em sentido reativo — todas as outras
    // leituras vão via `inputRef.current` para evitar re-disparos parciais.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // Reset quando uma nova sessão começa (state volta para idle/starting/listening).
  useEffect(() => {
    if (
      state === 'idle'
      || state === 'starting'
      || state === 'listening'
    ) {
      if (result.kind !== 'idle') {
        setResult({ kind: 'idle' })
        setLastFeedback(null)
        setFeedbackError(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const sendFeedback = useCallback(
    async (regret: boolean): Promise<void> => {
      if (result.kind !== 'recorded') return
      if (!result.dogfoodSessionId) return
      setFeedbackBusy(true)
      setFeedbackError(null)
      try {
        const response = await voxDogfoodSessionFeedback(
          result.dogfoodSessionId,
          regret,
        )
        if (response.status === 'ok') {
          setLastFeedback(regret ? 'bad' : 'good')
          return
        }
        setFeedbackError(
          response.message
          ?? (response.status === 'unavailable'
            ? 'Feedback indisponível no momento.'
            : 'Falha ao enviar feedback.'),
        )
      } catch (e) {
        setFeedbackError(e instanceof Error ? e.message : String(e))
      } finally {
        setFeedbackBusy(false)
      }
    },
    [result],
  )

  const feedback: VoxAutoDogfoodFeedbackHandle = {
    available: result.kind === 'recorded' && result.dogfoodSessionId !== null,
    lastResult: lastFeedback,
    busy: feedbackBusy,
    error: feedbackError,
    submitGood: () => sendFeedback(false),
    submitBad: () => sendFeedback(true),
  }

  // Suprime warning de unused vars para argumentos rarely-used da entrada
  // (mantidos no contract para evitar quebrar callers que injetam mais
  // contexto no futuro).
  void selectedMode
  void session
  void transcript
  void transcriptDraft
  void kernelResponse
  void sttError
  void launchSource
  void clickedAction

  return { result, feedback }
}
