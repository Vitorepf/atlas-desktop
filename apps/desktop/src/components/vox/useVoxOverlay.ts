/**
 * useVoxOverlay · state machine + lifecycle for the Vox Overlay V1.
 *
 * Owns the small finite-state machine that the overlay UI binds to. Keeps
 * bridge calls (voxEdge*, vox_stt_*, voxKernelIntent) in one place so the
 * component renders are pure and the surface only consumes pure handlers.
 *
 * Honesty contract:
 *   - No fake receipts when the Kernel is unavailable.
 *   - No fake transcripts when STT engine isn't ready.
 *   - All `unavailable` states are visible to the caller via `mode` / `error`.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  normalizeVoxHotkeyStatus,
  subscribeVoxEdgeEvent,
  VoxAudioTranscribeError,
  voxAmbientConsumePendingLaunch,
  voxDictionaryGet,
  voxDictionaryUpdate,
  voxEdgeCancelSession,
  voxEdgeFinishSession,
  voxEdgeStartSession,
  voxEdgeStatus,
  voxEdgeEclipse,
  voxKernelExecute,
  voxKernelIntent,
  voxSttStatus,
  voxSttTranscribeAudio,
  voxSttTranscribeDebugText,
  VoxBridgeUnavailable,
  type VoxConfirmationRequest,
  type VoxContextRef,
  type VoxDictionaryEntry,
  type VoxEdgeSession,
  type VoxEdgeStatus,
  type VoxExecuteDecision,
  type VoxExecuteResponse,
  type VoxHotkeyStatus,
  type VoxInterlocutorDecision,
  type VoxKernelIntentResponse,
  type VoxMode,
  type VoxModelStatus,
  type VoxOutputFormat,
  type VoxPersonalDictionary,
  type VoxProviderHint,
  type VoxStartSessionRequest,
  type VoxTranscript,
} from '../../lib/bridge'
import {
  composeInterlocutorReply,
  composeStructuredPromptTemplate,
  interlocutorDismissalKey,
} from '../../lib/voxInterlocutor'
import { useVoxAutoDogfood } from './useVoxAutoDogfood'

export type VoxOverlayState =
  | 'closed'
  | 'idle'
  | 'starting'
  | 'listening'
  | 'finishing'
  | 'transcribing'
  | 'transcript_ready'
  | 'compiling'
  | 'compiled'
  | 'awaiting_confirmation'
  | 'executing'
  | 'executed'
  | 'blocked'
  | 'cancelled'
  | 'eclipsed'
  | 'error'

export type VoxOverlayMode = 'tauri' | 'unavailable'

/** Subset of canonical `VoxMode` that the Desktop overlay exposes. V3
 * (`governed_execute`) is selectable but the Desktop NEVER executes locally
 * — it only forwards the operator's confirmation to the Kernel and renders
 * whatever the Kernel reports back.
 *
 * V4 · `'auto'` é o default canon. O Desktop envia `mode_requested='auto'` ao
 * Kernel e deixa o VoxAutoModeRouter decidir; quando o Kernel responde, o
 * hook sincroniza `selectedMode` com `kernelResponse.suggestedMode` para que
 * a UI mostre o modo concreto ("Criar prompt", "Ditado", …). */
export type VoxOverlaySelectedMode =
  | 'auto'
  | Extract<
      VoxMode,
      'dictation' | 'prompt_polish' | 'intent_compile' | 'governed_execute'
    >

export interface VoxDictionaryAddRequest {
  variant: string
  preferred: string
}

export interface VoxDictionaryAddResult {
  ok: boolean
  error?: string
  /** Updated dictionary on success, for caller convenience. */
  dictionary?: VoxPersonalDictionary
}

export interface UseVoxOverlayOptions {
  /** Called when the user clicks "Inserir no composer". */
  onInsertIntoComposer?: (text: string) => void
  /** Called right before sending an `intent_compile` request to the Kernel
   * — the surface can return lightweight context_refs (workspace slug,
   * surface id) WITHOUT reading screen contents. Return `[]` (or omit) when
   * no honest context is available; the Kernel defaults to `kind: "none"`. */
  contextRefsProvider?: () => VoxContextRef[] | null | undefined
  /** V4 · structured Vox Context Snapshot built by `useVoxContextSnapshot`.
   * Called right before compile so the snapshot reflects the live state
   * (current selection, thread, terminal cwd). Return `null`/`undefined`
   * when the surface has nothing honest to emit. Never includes raw audio,
   * clipboard or screen capture. */
  contextSnapshotProvider?: () => Record<string, unknown> | null | undefined
}

export interface UseVoxOverlayResult {
  state: VoxOverlayState
  /** "tauri" when running inside the desktop binary; "unavailable" in dev/browser mode. */
  mode: VoxOverlayMode
  /** Operator-selected Vox mode for the next session/compile cycle. */
  selectedMode: VoxOverlaySelectedMode
  setSelectedMode: (mode: VoxOverlaySelectedMode) => void
  /** V2 only · provider bias the operator selected ("auto" lets Kernel pick). */
  providerHint: VoxProviderHint
  setProviderHint: (hint: VoxProviderHint) => void
  /** V2 only · output format hint ("auto" lets Kernel pick). */
  outputFormat: VoxOutputFormat
  setOutputFormat: (fmt: VoxOutputFormat) => void
  edgeStatus: VoxEdgeStatus | null
  modelStatus: VoxModelStatus | null
  dictionary: VoxPersonalDictionary | null
  session: VoxEdgeSession | null
  transcript: VoxTranscript | null
  transcriptDraft: string
  /** V6.5 · status of the global hotkey runtime, as reported by Rust via
   * `vox://hotkey-status-changed`. `null` until the first event arrives or
   * outside Tauri. */
  hotkeyStatus: VoxHotkeyStatus | null
  kernelResponse: VoxKernelIntentResponse | null
  /** V3 · confirmation_request mirrored from the latest compile, kept in
   * memory so the overlay can render the human confirmation panel without
   * re-deriving it from kernelResponse on every render. */
  confirmationRequest: VoxConfirmationRequest | null
  /** V3 · operator-typed text for R4 literal confirmation. Lives only in
   * state — never persisted, never logged. */
  literalConfirmationDraft: string
  /** V5-B · texto que o operador digita para responder a um `clarify` do
   * Symbiotic Interlocutor. Reset a cada nova sessão / recompile. */
  clarificationDraft: string
  /** V5-B · `true` quando o operador escondeu localmente a intervenção atual
   * ("Manter original" / "Continuar mesmo assim"). Não muda o backend — só
   * libera o fluxo do overlay. */
  interlocutorDismissed: boolean
  /** V5-B · efetivamente visível? `interlocutor.intervention !== 'none'` E
   * não-dismissed. Conveniência pra componente. */
  interlocutorVisible: boolean
  /** V3 · last /ai/vox/execute response (null until an execute happens). */
  executionResult: VoxExecuteResponse | null
  /** V3 · true when there is a valid confirmation_request AND literal text
   * (when required) matches, so the Execute button can light up. */
  canExecute: boolean
  error: string | null
  busy: boolean
  /** V6-PF · milissegundos decorridos dentro do estado produtivo atual
   * (`transcribing`, `compiling`, `executing`, `finishing`). Vai pra 0 quando
   * sai da fase. UI principal usa pra mostrar "transcrevendo… 8s" e a
   * superfície humanizada decide quando dizer "está demorando mais que o
   * esperado". NÃO vaza token nem áudio — só tempo decorrido local. */
  phaseElapsedMs: number
  /** V6-PF · `true` quando a transcrição passou de 30 s e o operador deve
   * ver um aviso humanizado. Derivado de `state==='transcribing' &&
   * phaseElapsedMs > 30_000`. Não cancela — só sinaliza. */
  sttSlow: boolean
  /** V6.6 · last STT transcription error (whisper model missing, binding
   * not compiled, runtime error). `null` when transcription succeeded or
   * has not been attempted yet. UI uses this to switch the "Ouvi" section
   * to the honest fallback (debug paste path) without inventing a transcript. */
  sttError: { code: string; message: string } | null
  /** V6.6 · convenience flag: true when STT can be invoked right now (Tauri
   * running, model file present, engine binding compiled). Driven by
   * `modelStatus.engineAvailable` so the UI doesn't have to dig. */
  sttAvailable: boolean
  // actions
  open: () => void
  /** V6.5 · the operator wants Option+Space behaviour from a manual click
   * too: open+start when closed, finish when listening, no-op otherwise.
   * Exposed so consumers (e.g. the composer mic button) can mirror the
   * hotkey UX without duplicating logic. */
  toggleRecording: () => Promise<void>
  close: () => void
  start: () => Promise<void>
  finish: () => Promise<void>
  cancel: () => Promise<void>
  eclipse: () => Promise<void>
  setTranscriptDraft: (text: string) => void
  /** Local debug path: applies the personal dictionary + post-correction to
   * an operator-pasted raw text and produces a real VoxTranscript (without
   * audio) so the UI can be exercised end-to-end. */
  applyDebugTranscript: (rawText: string) => Promise<void>
  /** V3 · operator-typed literal confirmation draft (R4 only). */
  setLiteralConfirmationDraft: (text: string) => void
  /** V5-B · atualiza o texto da resposta ao `clarify` do Interlocutor. */
  setClarificationDraft: (text: string) => void
  /** V5-B · envia a resposta ao `clarify`. Anexa `clarificationDraft` ao
   * transcript e dispara compile() novamente. No-op quando o draft está vazio,
   * a sessão não tem transcript, ou já existe outra chamada em curso. */
  submitClarification: () => Promise<void>
  /** V5-B · aplica a sugestão do Interlocutor (`disagree`/`suggest_better_prompt`)
   * substituindo o transcript draft por um template estruturado a partir de
   * `suggested_edit`. Volta o estado para `transcript_ready` para o operador
   * editar antes de recompilar. */
  applyInterlocutorSuggestion: () => void
  /** V5-B · esconde localmente a intervenção atual ("Manter original" /
   * "Continuar mesmo assim"). Não mexe no backend — só sai da frente do
   * fluxo principal. */
  dismissInterlocutor: () => void
  /** V3 · POSTs /ai/vox/execute with decision=`execute`. Only valid when
   * `canExecute` is true. Desktop NEVER runs anything locally — this just
   * forwards the operator decision to the Kernel. */
  executeConfirmed: () => Promise<void>
  /** V3 · cancels the awaiting confirmation. Sends decision=`cancel` to the
   * Kernel when a confirmation_request exists; otherwise resets local state. */
  cancelExecution: () => Promise<void>
  /** V3 · clears any compiled response / confirmation and returns the UI to
   * `transcript_ready` so the operator can edit the transcript and recompile. */
  resetForRecompile: () => void
  /** POSTs the current transcript to the Kernel Vox V0/V1 endpoint with the
   * currently-selected mode (`dictation` or `prompt_polish`), surfacing a
   * real receipt OR an honest "unavailable" state. */
  compile: () => Promise<void>
  /** Legacy convenience: copies the edited transcript draft. */
  copyTranscript: () => Promise<{ ok: boolean; error?: string }>
  /** Legacy convenience: inserts the edited transcript draft into the composer. */
  insertIntoComposer: () => void
  /** Generic helpers · let the overlay copy/insert the original transcript
   * OR the Kernel-returned compiled prompt with a single API. */
  copyText: (text: string) => Promise<{ ok: boolean; error?: string }>
  insertText: (text: string) => void
  // dictionary
  refreshDictionary: () => Promise<VoxPersonalDictionary | null>
  addDictionaryCorrection: (req: VoxDictionaryAddRequest) => Promise<VoxDictionaryAddResult>
  // V6-E · Auto-Dogfood (registro silencioso + chip Funcionou/Ruim).
  autoDogfood: import('./useVoxAutoDogfood').UseVoxAutoDogfoodResult
  /** V6-E · operador marcou uma ação primária. Atualiza o
   * `clicked_action` que será reportado no próximo auto-record terminal. */
  markClickedAction: (action: import('./useVoxAutoDogfood').VoxAutoDogfoodClickedAction) => void
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function useVoxOverlay(
  options: UseVoxOverlayOptions = {},
): UseVoxOverlayResult {
  const { onInsertIntoComposer, contextRefsProvider, contextSnapshotProvider } = options
  const [state, setState] = useState<VoxOverlayState>('closed')
  // V4 · default 'auto': o Kernel decide o modo via VoxAutoModeRouter.
  // V3 manual continua funcionando — o consumidor pode chamar setSelectedMode
  // com qualquer um dos 4 canônicos antes do compile.
  const [selectedMode, setSelectedModeState] = useState<VoxOverlaySelectedMode>('auto')
  // V4 · marca a próxima chamada de /ai/vox/intent como override manual quando
  // o operador clica "Trocar modo" depois de o Kernel já ter respondido com
  // sugestão. Consumido + zerado pela próxima compile().
  const overridePendingRef = useRef<boolean>(false)
  const lastSuggestedModeRef = useRef<VoxMode | null>(null)
  const setSelectedMode = useCallback((next: VoxOverlaySelectedMode) => {
    setSelectedModeState((prev) => {
      // Se o Kernel já tinha sugerido X e o operador agora escolhe Y ≠ X,
      // isso é um override manual — marca para o próximo compile.
      const suggestion = lastSuggestedModeRef.current
      if (
        next !== 'auto'
        && suggestion !== null
        && suggestion !== next
        && prev !== next
      ) {
        overridePendingRef.current = true
      }
      return next
    })
  }, [])
  const [providerHint, setProviderHint] = useState<VoxProviderHint>('auto')
  const [outputFormat, setOutputFormat] = useState<VoxOutputFormat>('auto')
  const [edgeStatus, setEdgeStatus] = useState<VoxEdgeStatus | null>(null)
  const [modelStatus, setModelStatus] = useState<VoxModelStatus | null>(null)
  const [dictionary, setDictionary] = useState<VoxPersonalDictionary | null>(null)
  const [session, setSession] = useState<VoxEdgeSession | null>(null)
  const [transcript, setTranscript] = useState<VoxTranscript | null>(null)
  const [transcriptDraft, setTranscriptDraft] = useState<string>('')
  const [kernelResponse, setKernelResponse] = useState<VoxKernelIntentResponse | null>(null)
  const [confirmationRequest, setConfirmationRequest] = useState<VoxConfirmationRequest | null>(
    null,
  )
  const [literalConfirmationDraft, setLiteralConfirmationDraft] = useState<string>('')
  const [executionResult, setExecutionResult] = useState<VoxExecuteResponse | null>(null)
  // V5-B · resposta do operador ao Symbiotic Interlocutor + dismissal local.
  const [clarificationDraft, setClarificationDraft] = useState<string>('')
  const [dismissedInterlocutorKey, setDismissedInterlocutorKey] = useState<string | null>(null)
  const [hotkeyStatus, setHotkeyStatus] = useState<VoxHotkeyStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<boolean>(false)
  const [sttError, setSttError] = useState<{ code: string; message: string } | null>(null)
  // V6-PF · contador de elapsed durante estados produtivos lentos
  // (`transcribing`, `compiling`, `executing`). Reset a cada entrada na fase.
  // Bumps a cada 1000 ms, mantendo render stable (sem jitter dentro do segundo).
  // Não polui Detalhes avançados — é o número que a superfície humaniza em
  // "transcrevendo… 8s".
  const [phaseElapsedMs, setPhaseElapsedMs] = useState<number>(0)

  const mode: VoxOverlayMode = isTauriRuntime() ? 'tauri' : 'unavailable'

  const sessionRef = useRef<VoxEdgeSession | null>(null)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // V6.5 · the hotkey subscription mounts once per session (`mode` change is
  // rare). Its callbacks must always read the *current* overlay state, not
  // the stale value captured at subscription time. We mirror state/busy into
  // refs so toggleRecordingFromHotkey can branch on whatever is live now.
  const stateRef = useRef<VoxOverlayState>(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const busyRef = useRef<boolean>(busy)
  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  const selectedModeRef = useRef<VoxOverlaySelectedMode>(selectedMode)
  useEffect(() => {
    selectedModeRef.current = selectedMode
  }, [selectedMode])

  const providerHintRef = useRef<VoxProviderHint>(providerHint)
  useEffect(() => {
    providerHintRef.current = providerHint
  }, [providerHint])

  const outputFormatRef = useRef<VoxOutputFormat>(outputFormat)
  useEffect(() => {
    outputFormatRef.current = outputFormat
  }, [outputFormat])

  // V6.6 · guard against double-transcribing the same audio handle.
  // finish() and the `session-ready-for-stt` event can both arrive; we
  // only ever want one STT call per (sessionId, audioHandle) pair, and
  // late results from a cancelled/eclipsed session must be discarded.
  const activeTranscriptionRef = useRef<string | null>(null)
  const cancelledTranscriptionsRef = useRef<Set<string>>(new Set())
  // Forward declaration: runTranscribe is defined further down in the hook
  // (it depends on setters declared above). The vox://session-ready-for-stt
  // listener is registered earlier in the effect chain and needs to call it.
  // We mirror runTranscribe into a ref the listener can dereference safely.
  const runTranscribeRef = useRef<((sessionId: string, audioHandle: string) => Promise<void>) | null>(null)
  const modelStatusRef = useRef<VoxModelStatus | null>(null)
  useEffect(() => {
    modelStatusRef.current = modelStatus
  }, [modelStatus])

  // Refresh edge + model status whenever overlay is opened. Cheap on Tauri
  // (single IPC call each), no-op outside Tauri.
  useEffect(() => {
    if (state === 'closed') return
    let cancelled = false
    void (async () => {
      const [edge, model, dict] = await Promise.all([
        voxEdgeStatus(),
        voxSttStatus(),
        voxDictionaryGet(),
      ])
      if (cancelled) return
      setEdgeStatus(edge)
      setModelStatus(model)
      setDictionary(dict)
    })()
    return () => {
      cancelled = true
    }
  }, [state])

  // V6-PF · feedback humano durante fases produtivas longas.
  //
  // Sem este tick a UI fica congelada em "transcrevendo…" mesmo após 30 s, e
  // o operador não sabe se travou. O effect inicia/zera apenas nas fases
  // explícitas; outros estados não recebem re-render por causa dele.
  //
  // Tick fixo de 1000 ms (legível, sem jitter sub-segundo). Janitor obrigatório
  // no cleanup pra não vazar timer entre transições.
  useEffect(() => {
    const SLOW_PHASES: VoxOverlayState[] = ['transcribing', 'compiling', 'executing', 'finishing']
    if (!SLOW_PHASES.includes(state)) {
      if (phaseElapsedMs !== 0) setPhaseElapsedMs(0)
      return
    }
    const startedAt = Date.now()
    setPhaseElapsedMs(0)
    const id = window.setInterval(() => {
      setPhaseElapsedMs(Date.now() - startedAt)
    }, 1000)
    return () => {
      window.clearInterval(id)
    }
    // phaseElapsedMs propositalmente fora — só queremos reagir a mudança de
    // fase; o ticker é quem move o número dentro da fase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // Subscribe to Rust-side vox:// events so the overlay state reflects what
  // the Mac Edge layer actually does (hotkey-driven session, eclipse, etc).
  useEffect(() => {
    if (mode !== 'tauri') return
    const unsubs: Array<() => void> = []
    void (async () => {
      unsubs.push(
        await subscribeVoxEdgeEvent<VoxEdgeSession>(
          'vox://session-started',
          (payload) => {
            if (payload?.sessionId) {
              setSession(payload)
            }
            setState((cur) => (cur === 'closed' ? cur : 'listening'))
          },
        ),
      )
      unsubs.push(
        await subscribeVoxEdgeEvent<VoxEdgeSession>(
          'vox://session-ready-for-stt',
          (payload) => {
            // V6.6 · audio is ready. Drive the real STT call from here too
            // (in addition to finish()) so a hotkey-driven session that
            // completes without a manual finish click still transcribes.
            // The runTranscribe guard deduplicates per (sessionId, audioHandle).
            if (stateRef.current === 'closed') return
            if (payload?.sessionId) {
              setSession(payload)
            }
            const sessionId = payload?.sessionId ?? sessionRef.current?.sessionId
            const audioHandle = payload?.audioHandle ?? sessionRef.current?.audioHandle
            if (sessionId && audioHandle && runTranscribeRef.current) {
              void runTranscribeRef.current(sessionId, audioHandle)
            } else {
              setState((cur) => (cur === 'closed' ? cur : 'transcript_ready'))
            }
          },
        ),
      )
      unsubs.push(
        await subscribeVoxEdgeEvent<{ sessionId: string }>(
          'vox://session-cancelled',
          () => {
            setState((cur) => (cur === 'closed' ? cur : 'cancelled'))
          },
        ),
      )
      unsubs.push(
        await subscribeVoxEdgeEvent<{ touchedSessions: number }>(
          'vox://eclipse-activated',
          () => {
            setState((cur) => (cur === 'closed' ? cur : 'eclipsed'))
          },
        ),
      )
      unsubs.push(
        await subscribeVoxEdgeEvent<{ message: string }>('vox://error', (payload) => {
          setError(payload?.message ?? 'erro reportado pelo Mac Edge')
          setState((cur) => (cur === 'closed' ? cur : 'error'))
        }),
      )
    })()
    return () => {
      unsubs.forEach((u) => u())
    }
    // runTranscribe is referenced via runTranscribeRef so it's safe to keep
    // out of the dep array — the ref always points to the latest closure.
  }, [mode])

  const open = useCallback(() => {
    setError(null)
    setSttError(null)
    setKernelResponse(null)
    setConfirmationRequest(null)
    setLiteralConfirmationDraft('')
    setExecutionResult(null)
    setTranscript(null)
    setTranscriptDraft('')
    setSession(null)
    setClarificationDraft('')
    setDismissedInterlocutorKey(null)
    activeTranscriptionRef.current = null
    setState('idle')
  }, [])

  /**
   * V6.6 · single source of truth for invoking the real Whisper STT.
   *
   * Called by both `finish()` and the `vox://session-ready-for-stt`
   * listener. Idempotent on (sessionId, audioHandle): a second invocation
   * for the same key is a no-op (the first call wins). If the engine is
   * unavailable, sets `sttError`, transitions to `transcript_ready`, and
   * lets the UI show the honest fallback. Never throws.
   *
   * Late results: if `cancel()` or `eclipse()` ran while transcription was
   * in flight, the result is dropped on arrival so it cannot leak into a
   * later session.
   */
  // The callback only touches stable setters + refs (no captures of state
  // that would force re-renders), so the empty dep array is correct.
  const runTranscribe = useCallback(
    async (sessionId: string, audioHandle: string): Promise<void> => {
      const key = `${sessionId}::${audioHandle}`
      if (activeTranscriptionRef.current === key) return
      activeTranscriptionRef.current = key

      // If we already know the engine is unavailable, skip the round-trip
      // and let the UI show the fallback path immediately.
      const knownStatus = modelStatusRef.current
      if (knownStatus && knownStatus.engineAvailable === false) {
        setSttError({
          code: knownStatus.nextAction?.code ?? 'model_missing_or_engine_unavailable',
          message:
            knownStatus.nextAction?.message
            ?? 'STT engine indisponível neste build do Atlas Desktop.',
        })
        setState('transcript_ready')
        return
      }

      setSttError(null)
      setBusy(true)
      setState('transcribing')
      try {
        const response = await voxSttTranscribeAudio({ sessionId, audioHandle })
        if (cancelledTranscriptionsRef.current.has(key)) {
          // operator cancelled/eclipsed while we were transcribing; drop.
          cancelledTranscriptionsRef.current.delete(key)
          return
        }
        // V6-ES-E · drop também se o estado local não está mais aguardando
        // transcrição (ex.: usuário fechou overlay ou começou nova sessão).
        // Sem isso, um resultado tardio pode sujar o draft de uma sessão
        // recém-iniciada.
        const liveState = stateRef.current
        if (liveState !== 'transcribing' && liveState !== 'finishing') {
          return
        }
        setTranscript(response.transcript)
        setTranscriptDraft(response.transcript.text ?? '')
        if (response.modelStatus) setModelStatus(response.modelStatus)
        setState('transcript_ready')
      } catch (e) {
        if (cancelledTranscriptionsRef.current.has(key)) {
          cancelledTranscriptionsRef.current.delete(key)
          return
        }
        // V6-ES-E · mesmo guard pra erros tardios: se o operador já cancelou
        // ou pulou pra outra fase, NÃO escreve sttError numa sessão nova.
        const liveState = stateRef.current
        if (liveState !== 'transcribing' && liveState !== 'finishing') {
          return
        }
        if (e instanceof VoxAudioTranscribeError) {
          setSttError({ code: e.code, message: e.message })
          if (e.modelStatus) setModelStatus(e.modelStatus)
        } else {
          setSttError({
            code: 'stt_unknown_error',
            message: e instanceof Error ? e.message : String(e),
          })
        }
        // Always fall through to transcript_ready so the operator can use
        // the debug-paste fallback. Going to `error` here would hide the
        // working session and force a restart.
        setState('transcript_ready')
      } finally {
        // V6-ES-E · libera o key independentemente do desfecho. Sem isso o
        // ref ficava "preso" no último (sessionId, audioHandle) e bloquearia
        // re-tentativas no mesmo handle (caso patológico, mas possível em
        // testes/dev). cancelledTranscriptionsRef também limpa pra não
        // acumular keys mortos entre sessões.
        if (activeTranscriptionRef.current === key) {
          activeTranscriptionRef.current = null
        }
        cancelledTranscriptionsRef.current.delete(key)
        setBusy(false)
      }
    },
    [],
  )

  // Keep the forward-declared ref in sync so the early subscription effect
  // can call the latest runTranscribe.
  useEffect(() => {
    runTranscribeRef.current = runTranscribe
  }, [runTranscribe])

  const close = useCallback(() => {
    setState('closed')
  }, [])

  // V6-ES-E · marca a transcrição em andamento (se houver) como cancelada
  // sem aguardar resposta. Movida pra cá pra ficar acessível ao `start()`
  // (que usa pra invalidar sessão anterior antes de iniciar nova).
  const markActiveTranscriptionCancelled = useCallback(() => {
    const key = activeTranscriptionRef.current
    if (key) cancelledTranscriptionsRef.current.add(key)
    activeTranscriptionRef.current = null
  }, [])

  const start = useCallback(async () => {
    if (mode !== 'tauri') {
      setError('Atlas Vox precisa do app desktop para gravar. Abra o Atlas Desktop.')
      setState('error')
      return
    }
    // V6-D · duplicate-session guard. Ambient launch (boot signal) e hotkey
    // global (Wave 6.5) podem disparar `start()` em paralelo. Sem essa
    // barreira o segundo chamador entraria em `voxEdgeStartSession` antes
    // do primeiro terminar, deixando a Rust com duas sessões pendentes para
    // o mesmo audio_handle. Bloqueamos por estado: qualquer fase produtiva
    // ativa cede silenciosamente.
    if (busyRef.current) return
    {
      const cur = stateRef.current
      if (
        cur === 'starting'
        || cur === 'listening'
        || cur === 'finishing'
        || cur === 'transcribing'
      ) {
        return
      }
    }
    // V6-ES-E · qualquer transcrição pendente da sessão anterior fica
    // marcada como cancelada. Se o resultado chegar enquanto a nova sessão
    // está rodando, o `runTranscribe` solta o resultado em vez de sujar o
    // draft novo. Idempotente: no-op quando não há key ativo.
    markActiveTranscriptionCancelled()
    setError(null)
    setSttError(null)
    setTranscript(null)
    setTranscriptDraft('')
    setKernelResponse(null)
    setConfirmationRequest(null)
    setLiteralConfirmationDraft('')
    setExecutionResult(null)
    setClarificationDraft('')
    setDismissedInterlocutorKey(null)
    // V3.10 (Claude AD) · zombie-session guard.
    //   Whatever the previous state was, the previous session handle is now
    //   dead from the Rust side (eclipse wiped it, finish consumed it, the
    //   user is starting fresh from `cancelled`/`error`). Clear locally so a
    //   failed start can't leave a stale `sessionRef.current` pointing at a
    //   removed Rust handle — the classic "vox session not found" trigger.
    setSession(null)
    setBusy(true)
    setState('starting')
    try {
      // V4 · Edge layer (Rust) só fala VoxMode canônica. 'auto' é decisão de
      // Kernel — informamos 'dictation' à Rust apenas como rótulo de sessão
      // (metadata), porque a transcrição é independente do modo final. O
      // VoxAutoModeRouter no Kernel reclassifica durante /ai/vox/intent.
      const edgeMode: VoxMode =
        selectedModeRef.current === 'auto'
          ? 'dictation'
          : selectedModeRef.current
      const request: VoxStartSessionRequest = {
        source: 'desktop_overlay',
        modeRequested: edgeMode,
        language: 'pt-BR',
        consent: {
          audioCapture: true,
          contextShare: false,
          debugKeepAudio: false,
        },
      }
      let next
      try {
        next = await voxEdgeStartSession(request)
      } catch (e) {
        // V6-G · Zombie session recovery silencioso.
        //   Se o Rust ainda guarda uma sessão antiga (crash anterior, hotkey
        //   disparado em paralelo, eclipse parcial), a primeira tentativa
        //   devolve "vox session already active". A UX V6 não pode expor isso
        //   ao Vitor — fazemos eclipse + retry uma vez e seguimos como se
        //   tivesse sido a primeira gravação. Só se o retry falhar é que
        //   propagamos o erro pra UI.
        const msg = e instanceof Error ? e.message : String(e)
        const looksLikeZombie =
          /already\s+active|session_already|vox\s+session\s+(?:already|in\s+progress)|active session|sessão.*ativa|session_already_active|busy/i.test(
            msg,
          )
        if (!looksLikeZombie) {
          throw e
        }
        try {
          await voxEdgeEclipse()
        } catch {
          /* eclipse best-effort; segue pro retry mesmo se falhar */
        }
        next = await voxEdgeStartSession(request)
      }
      setSession(next)
      setState('listening')
    } catch (e) {
      const msg =
        e instanceof VoxBridgeUnavailable
          ? 'Atlas Vox precisa do app desktop para gravar. Abra o Atlas Desktop.'
          : e instanceof Error
            ? e.message
            : String(e)
      setError(msg)
      setState('error')
    } finally {
      setBusy(false)
    }
  }, [mode, markActiveTranscriptionCancelled])

  // ── V6-A · Atlas Vox Ambient Launch (Mac) ─────────────────────────────
  //
  // No boot do app, Rust detecta `--vox-start-listening` / env e guarda o
  // sinal num state single-shot. Esse effect roda uma única vez por mount,
  // consome o sinal via Tauri e — se ativo — abre o overlay + dispara
  // start(). Reload do webview NÃO reativa gravação (single-shot no Rust).
  //
  // Salvaguardas:
  //   * Só roda em runtime Tauri (browser/dev mode segue inerte).
  //   * Não dispara se overlay já não estiver `closed`/`idle` (evita
  //     corrida com hotkey pressionada entre boot e mount).
  //   * Não duplica sessão: avalia stateRef/busyRef no momento real.
  //   * Microfone bloqueado / Edge indisponível → start() já cai no
  //     banner humanizado pelo VoxOverlay (humanizeOverlayError).
  const ambientLaunchAttemptedRef = useRef<boolean>(false)
  // V6-E · `launchSource` é informado ao auto-dogfood. Default `app` (operador
  // clicou no botão Gravar). Vira `ambient_launch` se o boot foi por V6-A
  // (CLI/env), `hotkey` se a sessão real subiu via Mac Edge hotkey, ou
  // `ambient_helper` se algum dia o helper sinalizar isso (V7).
  const [launchSource, setLaunchSource] = useState<
    'hotkey' | 'ambient_helper' | 'ambient_launch' | 'app' | 'unknown'
  >('app')
  useEffect(() => {
    if (mode !== 'tauri') return
    if (ambientLaunchAttemptedRef.current) return
    let cancelled = false
    // Marcado antes do await para evitar dupla execução em StrictMode
    // dev (mount-unmount-mount). O Rust consume() também é single-shot,
    // então mesmo se vazasse só o primeiro ganharia.
    ambientLaunchAttemptedRef.current = true
    void (async () => {
      const snap = await voxAmbientConsumePendingLaunch()
      if (cancelled) return
      if (!snap.startListening) return
      // V6-E · marca a fonte real do boot para o diário: `cli`/`env`/`cli_and_env`
      // todos viraram `ambient_launch` para o operador. Se um helper V6-B
      // injetar `ambient_helper` no futuro, basta o boot signal trazer.
      setLaunchSource('ambient_launch')
      const cur = stateRef.current
      if (cur !== 'closed' && cur !== 'idle') return
      if (busyRef.current) return
      if (cur === 'closed') setState('idle')
      try {
        await start()
      } catch {
        /* start() já reporta setError; nada a fazer aqui. */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, start])

  // V6-E · sessão criada via mac_edge_hotkey marca launchSource=hotkey
  // (a menos que ambient já tenha vencido). Isso preserva a precedência:
  // ambient_launch > hotkey > app.
  useEffect(() => {
    if (!session) return
    if (session.source !== 'mac_edge_hotkey') return
    setLaunchSource((prev) => (prev === 'ambient_launch' ? prev : 'hotkey'))
  }, [session])

  // V6-E · operador atualiza o `clicked_action` ao tocar em
  // insert/send/confirm/cancel. Lido pelo auto-dogfood no estado terminal.
  const [clickedAction, setClickedAction] = useState<
    'insert' | 'send' | 'confirm' | 'cancel' | 'none'
  >('none')
  const markClickedAction = useCallback(
    (action: 'insert' | 'send' | 'confirm' | 'cancel' | 'none') => {
      setClickedAction(action)
    },
    [],
  )

  const autoDogfood = useVoxAutoDogfood({
    state,
    selectedMode,
    session,
    transcript,
    transcriptDraft,
    kernelResponse,
    sttError,
    launchSource,
    clickedAction,
  })

  const finish = useCallback(async () => {
    // V6-ES-E · double-finish guard. Enter + Option+Space disparados em
    // sequência podiam entrar duas vezes na rotina antes do primeiro await
    // terminar. Bloqueamos por `busyRef` no topo (síncrono).
    if (busyRef.current) return
    // Outro guard: chamar finish fora de listening (estado já avançou
    // sozinho via evento `session-ready-for-stt`) é no-op silencioso, não
    // erro — evita botão morto se o Enter atrasou.
    const liveState = stateRef.current
    if (liveState !== 'listening') return
    let activeSessionId = sessionRef.current?.sessionId ?? null
    if (!activeSessionId && mode === 'tauri') {
      const status = await voxEdgeStatus()
      if (status?.activeSessionId) {
        setEdgeStatus(status)
        activeSessionId = status.activeSessionId
      }
    }
    if (!activeSessionId) {
      // V6-ES-E · sem sessão ativa: cai pra idle silenciosamente em vez de
      // virar erro. Vitor consegue Gravar de novo imediatamente.
      setSession(null)
      setState('idle')
      return
    }
    setBusy(true)
    setState('finishing')
    try {
      const next = await voxEdgeFinishSession(activeSessionId)
      setSession(next)
      // V6.6 · auto-STT path. When the engine is plugged in, finish() fires
      // the real Whisper call right away. The `session-ready-for-stt`
      // listener also calls runTranscribe(), but the guard inside means the
      // first caller wins — no duplicate transcription.
      if (next.audioHandle && next.sessionId) {
        // Release the busy flag so runTranscribe can manage it cleanly.
        setBusy(false)
        await runTranscribe(next.sessionId, next.audioHandle)
        return
      }
      // No audio handle → no audio captured. Drop straight to
      // transcript_ready and let the debug fallback handle it.
      setState('transcript_ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setState('error')
    } finally {
      // runTranscribe owns its own busy lifecycle when called above.
      if (stateRef.current === 'finishing') setBusy(false)
    }
  }, [mode, runTranscribe])

  const cancel = useCallback(async () => {
    markActiveTranscriptionCancelled()
    // V6-ES-E · cancel em estado já-cancelado/idle/eclipsed/closed/error é
    // no-op silente. Garantia: operador clicando "Cancelar" várias vezes
    // não engatilha erros nem busy loops. Mantemos o setSession(null) por
    // segurança defensiva.
    {
      const liveState = stateRef.current
      const noopStates: VoxOverlayState[] = ['idle', 'cancelled', 'eclipsed', 'closed']
      if (noopStates.includes(liveState)) {
        setSession(null)
        if (liveState !== 'cancelled') setState('cancelled')
        return
      }
    }
    let activeSessionId = sessionRef.current?.sessionId ?? null
    if (!activeSessionId && mode === 'tauri') {
      const status = await voxEdgeStatus()
      if (status?.activeSessionId) {
        setEdgeStatus(status)
        activeSessionId = status.activeSessionId
      }
    }
    if (!activeSessionId) {
      // Defensive: even when there was no active session, make sure we don't
      // hold a half-stale snapshot. Setting to null is idempotent.
      setSession(null)
      setState('cancelled')
      return
    }
    setBusy(true)
    try {
      await voxEdgeCancelSession(activeSessionId)
      // V3.10 · once Rust cancelled the session, the handle is in the
      // `finished` map awaiting consumption or already gone. Local state
      // MUST forget it — keeping the snapshot is what produced the classic
      // "vox session not found" error on the next cancel/finish call.
      setSession(null)
      setState('cancelled')
    } catch (_e) {
      // V6-ES-E · cancel JAMAIS vira error. Mesmo que o Rust diga "not
      // found" / "already cancelled" / qualquer coisa, o canon do canon é
      // "se Vitor pediu pra cancelar, está cancelado". Limpamos local e
      // seguimos. O erro original some pra não confundir; o operador tem
      // sessão limpa e pode Gravar de novo na mesma hora.
      setSession(null)
      setState('cancelled')
    } finally {
      setBusy(false)
    }
  }, [mode, markActiveTranscriptionCancelled])

  const eclipse = useCallback(async () => {
    markActiveTranscriptionCancelled()
    // V6-ES-E · "Parar tudo" é botão de pânico — INDESTRUTÍVEL. Limpa local
    // primeiro, depois tenta pedir eclipse ao Rust. Se Rust falhar (modo
    // não-Tauri, IPC quebrado, eclipse já rodou), seguimos no estado limpo
    // local — Vitor consegue Gravar de novo sem ver erro.
    setBusy(true)
    setSession(null)
    setTranscript(null)
    setTranscriptDraft('')
    setSttError(null)
    setKernelResponse(null)
    setConfirmationRequest(null)
    setLiteralConfirmationDraft('')
    setExecutionResult(null)
    setClarificationDraft('')
    setDismissedInterlocutorKey(null)
    setError(null)
    setState('eclipsed')
    if (mode !== 'tauri') {
      setBusy(false)
      return
    }
    try {
      await voxEdgeEclipse()
    } catch (_e) {
      // best-effort. Estado local já está limpo; não sinalizamos erro.
    } finally {
      setBusy(false)
    }
  }, [mode, markActiveTranscriptionCancelled])

  // V6.5 · canonical toggle for Option+Space (hotkey) and the composer mic.
  // V3.10 (Claude AD) · widened so non-productive states also rearm a fresh
  // session — Vitor explicitly wants Option+Space to "abrir o overlay e
  // começar gravação" (spec) without going through Cancel first.
  //
  //   closed / idle / cancelled / eclipsed / error
  //                           → open (if needed) + start fresh session
  //   listening               → finish (operator wants to stop recording)
  //   transcript_ready /
  //   compiled / awaiting /
  //   executing / executed /
  //   blocked                 → no-op (focus only; do NOT destroy productive
  //                              state — operator must Cancel/Ignorar first)
  //
  // A second press during `starting`/`finishing`/`transcribing`/`compiling`
  // is dropped (`busy` gate) so we don't fire racing commands at the Edge.
  const toggleRecording = useCallback(async (): Promise<void> => {
    if (busyRef.current) return
    const cur = stateRef.current
    if (cur === 'listening') {
      await finish()
      return
    }
    // Productive states keep the operator's work safe.
    const productive: VoxOverlayState[] = [
      'transcript_ready',
      'compiling',
      'compiled',
      'awaiting_confirmation',
      'executing',
      'executed',
      'blocked',
      // 'transcribing' / 'starting' / 'finishing' are short-lived and
      // already gated by `busy`, but listing them here makes the contract
      // explicit if `busy` ever drifts.
      'transcribing',
      'starting',
      'finishing',
    ]
    if (productive.includes(cur)) return

    // closed / idle / cancelled / eclipsed / error → fresh session.
    // open() resets transient state cleanly; start() takes care of the
    // zombie-session guard introduced above.
    if (cur === 'closed') open()
    await start()
  }, [open, start, finish])

  const applyDebugTranscript = useCallback(async (rawText: string) => {
    if (mode !== 'tauri') {
      setError('O caminho de texto manual exige o app desktop.')
      setState('error')
      return
    }
    setBusy(true)
    try {
      const active = sessionRef.current
      const response = await voxSttTranscribeDebugText({
        rawText,
        sessionId: active?.sessionId,
        audioHandle: active?.audioHandle,
      })
      setTranscript(response.transcript)
      setTranscriptDraft(response.transcript.text)
      // The operator just supplied a working transcript through the fallback;
      // an old `sttError` would be misleading. Clear it.
      setSttError(null)
      setState('transcript_ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setState('error')
    } finally {
      setBusy(false)
    }
  }, [mode])

  const compile = useCallback(async () => {
    if (!transcript) {
      setError('Não há texto para o Atlas entender. Pressione Gravar primeiro.')
      return
    }
    // The user may have edited the transcript. Propagate that edit so the
    // Kernel sees what the operator approved, not the original STT output.
    const finalTranscript: VoxTranscript = {
      ...transcript,
      text: transcriptDraft,
    }
    setBusy(true)
    setState('compiling')
    // Compile always invalidates a stale execution result/confirmation.
    setExecutionResult(null)
    setConfirmationRequest(null)
    setLiteralConfirmationDraft('')
    // V5-B · cada novo compile zera o dismissal anterior: a próxima
    // intervenção que o Kernel devolver deve aparecer honestamente.
    setDismissedInterlocutorKey(null)
    try {
      const mode = selectedModeRef.current
      // V4 · 'auto' também ganha contexto: o Auto Mode Router beneficia-se do
      // snapshot (dêixis "esse arquivo" / "essa tela"). intent_compile e
      // governed_execute continuam recebendo context_refs como antes.
      const enrichWithContext =
        mode === 'intent_compile'
        || mode === 'governed_execute'
        || mode === 'auto'
      const ctxRefs =
        enrichWithContext && contextRefsProvider
          ? contextRefsProvider() ?? []
          : []
      const ctxSnapshot =
        enrichWithContext && contextSnapshotProvider
          ? contextSnapshotProvider() ?? null
          : null
      // provider/output hints make sense for V2 and V3 (V3 wraps V2 packet).
      // Em 'auto', o Kernel decide e a UI pode sugerir provider depois.
      const useHints =
        mode === 'intent_compile' || mode === 'governed_execute'
      // V4 · consome (e zera) o flag de override pendente. Backend usa só
      // para telemetria — não muda execução.
      const manualOverride = overridePendingRef.current
      overridePendingRef.current = false
      const response = await voxKernelIntent({
        transcript: finalTranscript,
        source: 'desktop_overlay',
        // 'auto' é overlay-only; quando operador deixou no auto, Kernel decide.
        modeRequested: mode === 'auto' ? undefined : mode,
        providerHint: useHints ? providerHintRef.current : undefined,
        outputFormat: useHints ? outputFormatRef.current : undefined,
        contextRefs: ctxRefs.length > 0 ? ctxRefs : undefined,
        contextSnapshot: ctxSnapshot,
        manualOverride: manualOverride ? true : undefined,
      })
      setKernelResponse(response)
      // V4 · quando o cliente enviou 'auto', refletimos no estado local o modo
      // concreto que o Kernel escolheu. Sem isso a UI mostraria "Auto" em
      // vez de "Ditado/Criar prompt/…". Também guardamos a sugestão para
      // detectar override no próximo setSelectedMode.
      if (response.status === 'ok' && response.suggestedMode) {
        lastSuggestedModeRef.current = response.suggestedMode
        if (mode === 'auto') {
          setSelectedModeState(response.suggestedMode)
        }
      }
      // If the Kernel issued a confirmation_request, lift it into its own
      // state and hold the overlay at `awaiting_confirmation` so the UI can
      // render the literal-confirmation panel before any execute call.
      if (
        response.status === 'ok'
        && response.confirmationRequired
        && response.confirmationRequest
      ) {
        setConfirmationRequest(response.confirmationRequest)
        setState('awaiting_confirmation')
      } else {
        setState('compiled')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setState('error')
    } finally {
      setBusy(false)
    }
  }, [transcript, transcriptDraft, contextRefsProvider, contextSnapshotProvider])

  // ── V3 Governed Executor · execute / cancel / recompile ─────────────────

  // canExecute · gate the Execute button.
  // Rules:
  //   - need a non-null confirmationRequest with a token
  //   - if requiresLiteralConfirmation, draft must equal the literal phrase
  //   - never enabled while a request is in flight
  const canExecute = (() => {
    if (busy) return false
    if (!confirmationRequest) return false
    if (!confirmationRequest.confirmationToken) return false
    if (state !== 'awaiting_confirmation') return false
    if (confirmationRequest.requiresLiteralConfirmation) {
      const expected = (confirmationRequest.literalConfirmationText ?? '').trim()
      if (expected === '') return false
      return literalConfirmationDraft.trim() === expected
    }
    return true
  })()

  // Internal helper that fires /ai/vox/execute with a fixed decision and
  // funnels the response through the state machine. The decision shape is
  // identical for `execute` and `cancel`, so we share a single path.
  const submitDecision = useCallback(
    async (decision: VoxExecuteDecision): Promise<void> => {
      const req = confirmationRequest
      if (!req || !req.confirmationToken || !req.receiptId || !req.intentId) {
        setError('Não há pedido de confirmação válido. Grave de novo para retomar.')
        setState('error')
        return
      }
      setBusy(true)
      // For `execute` the overlay enters `executing`; for `cancel` we just
      // wait for the Kernel ack but keep the panel as-is so the operator can
      // see why they bailed.
      if (decision === 'execute') setState('executing')
      try {
        const response = await voxKernelExecute({
          intentId: req.intentId,
          receiptId: req.receiptId,
          decision,
          confirmationToken: req.confirmationToken,
          literalConfirmationText: req.requiresLiteralConfirmation
            ? literalConfirmationDraft
            : undefined,
        })
        setExecutionResult(response)
        // Confirmation tokens are single-shot. Drop our copy as soon as the
        // backend responds so we cannot accidentally replay it from memory.
        setConfirmationRequest(null)
        setLiteralConfirmationDraft('')
        // State transition is driven by action_outcome — the Kernel is the
        // source of truth; we never invent `completed`.
        if (response.status !== 'ok') {
          setError(response.message ?? 'Servidor Atlas indisponível agora. Tente de novo em alguns instantes.')
          setState('error')
          return
        }
        switch (response.actionOutcome) {
          case 'completed':
            setState('executed')
            break
          case 'blocked':
            setState('blocked')
            break
          case 'failed':
            setState('error')
            setError(response.message ?? 'O Atlas reportou falha sem mais detalhes.')
            break
          case 'aborted':
          case 'cancelled':
            setState('cancelled')
            break
          case 'pending':
          case 'unavailable':
          case null:
          default:
            // Kernel acknowledged but is not yet sure. Surface as compiled so
            // the operator can decide to retry or cancel — never as executed.
            setState('compiled')
            break
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setState('error')
      } finally {
        setBusy(false)
      }
    },
    [confirmationRequest, literalConfirmationDraft],
  )

  const executeConfirmed = useCallback(async () => {
    if (!canExecute) return
    // V6-E · marca ação de confirmação para o auto-dogfood.
    setClickedAction('confirm')
    await submitDecision('execute')
  }, [canExecute, submitDecision])

  const cancelExecution = useCallback(async () => {
    // V6-E · cancelamento é sinal claro de ação primária para o diário.
    setClickedAction('cancel')
    // No active confirmation · just reset local UI to `compiled` so the
    // operator can re-evaluate without losing the receipt/preview block.
    if (!confirmationRequest) {
      setLiteralConfirmationDraft('')
      if (state === 'awaiting_confirmation') setState('compiled')
      return
    }
    await submitDecision('cancel')
  }, [confirmationRequest, state, submitDecision])

  const resetForRecompile = useCallback(() => {
    setKernelResponse(null)
    setConfirmationRequest(null)
    setLiteralConfirmationDraft('')
    setExecutionResult(null)
    setError(null)
    setClarificationDraft('')
    setDismissedInterlocutorKey(null)
    if (transcript) setState('transcript_ready')
    else setState('idle')
  }, [transcript])

  // ── V5-B · Symbiotic Interlocutor actions ────────────────────────────────
  //
  // O Kernel V5-A devolve `interlocutor` em /ai/vox/intent. Estas ações
  // permitem ao operador responder honestamente a cada tipo de intervenção:
  //
  //   submitClarification        → anexa a resposta ao transcript e recompila
  //   applyInterlocutorSuggestion → usa `suggested_edit` para reescrever o
  //                                 transcript draft (volta a `transcript_ready`)
  //   dismissInterlocutor        → esconde localmente a intervenção atual
  //                                 ("Manter original" / "Continuar mesmo assim")
  //
  // Nenhuma dessas ações forja resposta do Kernel; quando o operador escolhe
  // recompilar, é uma chamada nova ao Kernel com transcript atualizado.

  const submitClarification = useCallback(async () => {
    if (busyRef.current) return
    if (!transcript) return
    const reply = clarificationDraft.trim()
    if (reply === '') return
    const enriched = composeInterlocutorReply(transcriptDraft || transcript.text || '', reply)
    setTranscriptDraft(enriched)
    setClarificationDraft('')
    setDismissedInterlocutorKey(null)
    setKernelResponse(null)
    setConfirmationRequest(null)
    setLiteralConfirmationDraft('')
    setError(null)
    setState('transcript_ready')
    // Aguarda o tick para o setTranscriptDraft entrar em transcript.text
    // antes do compile (compile usa transcriptDraft via state).
    await compile()
  }, [clarificationDraft, transcript, transcriptDraft, compile])

  const applyInterlocutorSuggestion = useCallback(() => {
    const decision: VoxInterlocutorDecision | null =
      kernelResponse?.interlocutor ?? null
    if (!decision) return
    const original = transcriptDraft || transcript?.text || ''
    const template = composeStructuredPromptTemplate(decision, original)
    if (template === null || template.trim() === '') {
      // Sem `suggested_edit` utilizável; só sai do bloqueio para o operador
      // editar o transcript manualmente.
      setKernelResponse(null)
      setConfirmationRequest(null)
      setLiteralConfirmationDraft('')
      setClarificationDraft('')
      setDismissedInterlocutorKey(null)
      setError(null)
      if (transcript) setState('transcript_ready')
      return
    }
    setTranscriptDraft(template)
    setKernelResponse(null)
    setConfirmationRequest(null)
    setLiteralConfirmationDraft('')
    setClarificationDraft('')
    setDismissedInterlocutorKey(null)
    setError(null)
    if (transcript) setState('transcript_ready')
  }, [kernelResponse, transcript, transcriptDraft])

  const dismissInterlocutor = useCallback(() => {
    const decision: VoxInterlocutorDecision | null =
      kernelResponse?.interlocutor ?? null
    if (!decision || decision.intervention === 'none') return
    if (decision.blocking) return // bloqueio nunca pode ser "dismissado" localmente
    const key = interlocutorDismissalKey(decision, kernelResponse?.receiptId ?? null)
    if (key) setDismissedInterlocutorKey(key)
  }, [kernelResponse])

  const copyText = useCallback(
    async (text: string): Promise<{ ok: boolean; error?: string }> => {
      if (text.trim() === '') return { ok: false, error: 'sem texto pra copiar' }
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        return { ok: false, error: 'clipboard API indisponível' }
      }
      try {
        await navigator.clipboard.writeText(text)
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    },
    [],
  )

  const insertText = useCallback(
    (text: string) => {
      if (text.trim() === '') return
      // V6-E · sinaliza inserção bem-sucedida para o auto-dogfood.
      setClickedAction('insert')
      onInsertIntoComposer?.(text)
    },
    [onInsertIntoComposer],
  )

  const copyTranscript = useCallback(
    async () => copyText(transcriptDraft || transcript?.text || ''),
    [copyText, transcript, transcriptDraft],
  )

  const insertIntoComposer = useCallback(
    () => insertText(transcriptDraft || transcript?.text || ''),
    [insertText, transcript, transcriptDraft],
  )

  // ── V6.5 · Global hotkey subscription ───────────────────────────────────
  //
  // Rust emits four high-level events. We don't try to detect chord state on
  // the JS side — the runtime already disambiguates Option+Space vs. Esc Esc
  // vs. Cmd+Shift+Space and tells us which intent the operator expressed.
  useEffect(() => {
    if (mode !== 'tauri') return
    const unsubs: Array<() => void> = []
    void (async () => {
      unsubs.push(
        await subscribeVoxEdgeEvent<unknown>('vox://hotkey-toggle-recording', () => {
          void toggleRecording()
        }),
      )
      unsubs.push(
        await subscribeVoxEdgeEvent<unknown>('vox://hotkey-open-overlay', () => {
          // Cmd+Shift+Space · open without recording. If already open, keep
          // whatever state we have (do not collapse compiled into idle).
          if (stateRef.current === 'closed') open()
        }),
      )
      unsubs.push(
        await subscribeVoxEdgeEvent<unknown>('vox://hotkey-eclipse', () => {
          // Esc Esc · always honour eclipse, even mid-busy. The Edge layer
          // is the source of truth — it'll cancel in-flight captures first.
          void eclipse()
        }),
      )
      unsubs.push(
        await subscribeVoxEdgeEvent<unknown>('vox://hotkey-status-changed', (payload) => {
          setHotkeyStatus(normalizeVoxHotkeyStatus(payload))
        }),
      )
    })()
    return () => {
      unsubs.forEach((u) => u())
    }
  }, [mode, toggleRecording, open, eclipse])

  // ── Dictionary management ───────────────────────────────────────────────
  const refreshDictionary = useCallback(async () => {
    const dict = await voxDictionaryGet()
    setDictionary(dict)
    return dict
  }, [])

  const addDictionaryCorrection = useCallback(
    async ({ variant, preferred }: VoxDictionaryAddRequest): Promise<VoxDictionaryAddResult> => {
      const trimmedVariant = variant.trim()
      const trimmedPreferred = preferred.trim()
      if (trimmedVariant === '' || trimmedPreferred === '') {
        return { ok: false, error: 'variante e termo correto não podem ser vazios' }
      }
      if (trimmedVariant.length > 80 || trimmedPreferred.length > 80) {
        return { ok: false, error: 'termos devem ter no máximo 80 caracteres' }
      }
      if (mode !== 'tauri') {
        return {
          ok: false,
          error: 'Vox Mac Edge indisponível — abra no app desktop/Tauri para editar o dicionário.',
        }
      }
      // Always reload the current dictionary before merging — avoids
      // overwriting a concurrent change Vitor made via the file directly.
      let current = dictionary
      try {
        current = await voxDictionaryGet()
      } catch {
        /* keep cached copy as fallback */
      }
      if (!current) {
        return { ok: false, error: 'dicionário ainda não carregado' }
      }

      const next: VoxPersonalDictionary = {
        ...current,
        entries: current.entries.map((e) => ({ ...e, variants: [...e.variants] })),
      }

      const lowerVariant = trimmedVariant.toLowerCase()
      const existingIdx = next.entries.findIndex(
        (e) => e.preferred === trimmedPreferred || e.phrase === trimmedPreferred,
      )

      if (existingIdx >= 0) {
        const target = next.entries[existingIdx]
        const dup = target.variants.some((v) => v.toLowerCase() === lowerVariant)
        if (dup) {
          return { ok: false, error: `"${trimmedVariant}" já é variante de "${trimmedPreferred}"` }
        }
        target.variants.push(trimmedVariant)
      } else {
        // Make sure the variant isn't already claimed by some other entry —
        // ambiguous mappings break post-correction determinism.
        const collidingEntry = next.entries.find((e) =>
          e.variants.some((v) => v.toLowerCase() === lowerVariant),
        )
        if (collidingEntry) {
          return {
            ok: false,
            error: `"${trimmedVariant}" já mapeia para "${collidingEntry.preferred}"`,
          }
        }
        const fresh: VoxDictionaryEntry = {
          phrase: trimmedPreferred,
          variants: [trimmedVariant],
          preferred: trimmedPreferred,
        }
        next.entries.push(fresh)
      }

      try {
        const saved = await voxDictionaryUpdate(next)
        setDictionary(saved)
        return { ok: true, dictionary: saved }
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    },
    [dictionary, mode],
  )

  const sttAvailable =
    mode === 'tauri' && Boolean(modelStatus && modelStatus.engineAvailable)

  // V5-B · honest visibility flag for the Interlocutor card. Hidden when the
  // Kernel said "none", when the operator dismissed it locally, OR when the
  // current dismissal key matches the live decision key.
  const interlocutorDecision = kernelResponse?.interlocutor ?? null
  const currentInterlocutorKey = interlocutorDismissalKey(
    interlocutorDecision,
    kernelResponse?.receiptId ?? null,
  )
  const interlocutorDismissed = Boolean(
    currentInterlocutorKey
      && dismissedInterlocutorKey === currentInterlocutorKey,
  )
  const interlocutorVisible = Boolean(
    interlocutorDecision
      && interlocutorDecision.intervention !== 'none'
      && !interlocutorDismissed,
  )

  return {
    state,
    mode,
    selectedMode,
    setSelectedMode,
    providerHint,
    setProviderHint,
    outputFormat,
    setOutputFormat,
    edgeStatus,
    modelStatus,
    hotkeyStatus,
    dictionary,
    session,
    transcript,
    transcriptDraft,
    sttError,
    sttAvailable,
    kernelResponse,
    confirmationRequest,
    literalConfirmationDraft,
    clarificationDraft,
    interlocutorDismissed,
    interlocutorVisible,
    executionResult,
    canExecute,
    error,
    busy,
    phaseElapsedMs,
    sttSlow: state === 'transcribing' && phaseElapsedMs > 30_000,
    open,
    toggleRecording,
    close,
    start,
    finish,
    cancel,
    eclipse,
    setTranscriptDraft,
    setLiteralConfirmationDraft,
    setClarificationDraft,
    submitClarification,
    applyInterlocutorSuggestion,
    dismissInterlocutor,
    executeConfirmed,
    cancelExecution,
    resetForRecompile,
    applyDebugTranscript,
    compile,
    copyTranscript,
    insertIntoComposer,
    copyText,
    insertText,
    refreshDictionary,
    addDictionaryCorrection,
    autoDogfood,
    markClickedAction,
  }
}
