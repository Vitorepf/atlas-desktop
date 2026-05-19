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
  type VoxKernelIntentResponse,
  type VoxMode,
  type VoxModelStatus,
  type VoxOutputFormat,
  type VoxPersonalDictionary,
  type VoxProviderHint,
  type VoxStartSessionRequest,
  type VoxTranscript,
} from '../../lib/bridge'

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
 * whatever the Kernel reports back. */
export type VoxOverlaySelectedMode = Extract<
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
  /** V3 · last /ai/vox/execute response (null until an execute happens). */
  executionResult: VoxExecuteResponse | null
  /** V3 · true when there is a valid confirmation_request AND literal text
   * (when required) matches, so the Execute button can light up. */
  canExecute: boolean
  error: string | null
  busy: boolean
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
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function useVoxOverlay(
  options: UseVoxOverlayOptions = {},
): UseVoxOverlayResult {
  const { onInsertIntoComposer, contextRefsProvider, contextSnapshotProvider } = options
  const [state, setState] = useState<VoxOverlayState>('closed')
  const [selectedMode, setSelectedMode] = useState<VoxOverlaySelectedMode>('dictation')
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
  const [hotkeyStatus, setHotkeyStatus] = useState<VoxHotkeyStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<boolean>(false)
  const [sttError, setSttError] = useState<{ code: string; message: string } | null>(null)

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
        setTranscript(response.transcript)
        setTranscriptDraft(response.transcript.text ?? '')
        if (response.modelStatus) setModelStatus(response.modelStatus)
        setState('transcript_ready')
      } catch (e) {
        if (cancelledTranscriptionsRef.current.has(key)) {
          cancelledTranscriptionsRef.current.delete(key)
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

  const start = useCallback(async () => {
    if (mode !== 'tauri') {
      setError('Vox Mac Edge indisponível neste modo; abra no app desktop/Tauri.')
      setState('error')
      return
    }
    setError(null)
    setSttError(null)
    setTranscript(null)
    setTranscriptDraft('')
    setKernelResponse(null)
    setConfirmationRequest(null)
    setLiteralConfirmationDraft('')
    setExecutionResult(null)
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
      const request: VoxStartSessionRequest = {
        source: 'desktop_overlay',
        modeRequested: selectedModeRef.current,
        language: 'pt-BR',
        consent: {
          audioCapture: true,
          contextShare: false,
          debugKeepAudio: false,
        },
      }
      const next = await voxEdgeStartSession(request)
      setSession(next)
      setState('listening')
    } catch (e) {
      const msg =
        e instanceof VoxBridgeUnavailable
          ? 'Vox Mac Edge indisponível neste modo; abra no app desktop/Tauri.'
          : e instanceof Error
            ? e.message
            : String(e)
      setError(msg)
      setState('error')
    } finally {
      setBusy(false)
    }
  }, [mode])

  const finish = useCallback(async () => {
    let activeSessionId = sessionRef.current?.sessionId ?? null
    if (!activeSessionId && mode === 'tauri') {
      const status = await voxEdgeStatus()
      if (status?.activeSessionId) {
        setEdgeStatus(status)
        activeSessionId = status.activeSessionId
      }
    }
    if (!activeSessionId) {
      setError('nenhuma sessão Vox ativa para finalizar')
      setState('error')
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

  const markActiveTranscriptionCancelled = useCallback(() => {
    const key = activeTranscriptionRef.current
    if (key) cancelledTranscriptionsRef.current.add(key)
    activeTranscriptionRef.current = null
  }, [])

  const cancel = useCallback(async () => {
    markActiveTranscriptionCancelled()
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
    } catch (e) {
      // If Rust says "not found" we still drop the local handle: the
      // session is unrecoverable either way. Surface the message so the
      // operator knows, but don't keep a corpse around.
      setSession(null)
      setError(e instanceof Error ? e.message : String(e))
      setState('error')
    } finally {
      setBusy(false)
    }
  }, [mode, markActiveTranscriptionCancelled])

  const eclipse = useCallback(async () => {
    markActiveTranscriptionCancelled()
    if (mode !== 'tauri') {
      setError('Eclipse exige Vox Mac Edge (Tauri).')
      setState('error')
      return
    }
    setBusy(true)
    try {
      await voxEdgeEclipse()
      // V3.10 · `voxEdgeEclipse` wipes every session on the Rust side,
      // including the one we were holding. Drop our local pointer + any
      // transient artefacts that referenced it — they're all dead now.
      setSession(null)
      setTranscript(null)
      setTranscriptDraft('')
      setSttError(null)
      setState('eclipsed')
    } catch (e) {
      setSession(null)
      setError(e instanceof Error ? e.message : String(e))
      setState('error')
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
      setError('Vox debug exige Tauri (dicionário pessoal local).')
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
      setError('sem transcript para compilar')
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
    try {
      const mode = selectedModeRef.current
      // intent_compile and governed_execute both benefit from context refs;
      // dictation/prompt_polish stay free of any surface context.
      const enrichWithContext =
        mode === 'intent_compile' || mode === 'governed_execute'
      const ctxRefs =
        enrichWithContext && contextRefsProvider
          ? contextRefsProvider() ?? []
          : []
      // V4 · structured snapshot só faz sentido nos modos que vão usar contexto.
      // dictation/prompt_polish continuam estritamente locais.
      const ctxSnapshot =
        enrichWithContext && contextSnapshotProvider
          ? contextSnapshotProvider() ?? null
          : null
      // provider/output hints make sense for V2 and V3 (V3 wraps V2 packet).
      const useHints =
        mode === 'intent_compile' || mode === 'governed_execute'
      const response = await voxKernelIntent({
        transcript: finalTranscript,
        source: 'desktop_overlay',
        modeRequested: mode,
        providerHint: useHints ? providerHintRef.current : undefined,
        outputFormat: useHints ? outputFormatRef.current : undefined,
        contextRefs: ctxRefs.length > 0 ? ctxRefs : undefined,
        contextSnapshot: ctxSnapshot,
      })
      setKernelResponse(response)
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
        setError('Sem confirmation_request válido — Vitor precisa recompilar a intenção.')
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
          setError(response.message ?? 'Kernel Vox V3 indisponível')
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
            setError(response.message ?? 'Vox V3 reportou falha sem detalhes.')
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
    await submitDecision('execute')
  }, [canExecute, submitDecision])

  const cancelExecution = useCallback(async () => {
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
    if (transcript) setState('transcript_ready')
    else setState('idle')
  }, [transcript])

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
    executionResult,
    canExecute,
    error,
    busy,
    open,
    toggleRecording,
    close,
    start,
    finish,
    cancel,
    eclipse,
    setTranscriptDraft,
    setLiteralConfirmationDraft,
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
  }
}
