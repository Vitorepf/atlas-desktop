/**
 * VoxSessionCloseout · Wave V3.9 (Claude AD).
 *
 * Compact post-session bar that asks "Registrar uso real?" in one click.
 * Mounted in `VoxOverlay` only after a real session reached a terminal
 * state with something to qualify (transcript / kernelResponse /
 * executionResult).
 *
 * Distinct from `VoxDogfoodPanel` ("Como foi?"):
 *   - VoxSessionCloseout  → POST /ai/vox/dogfood/session (dogfood diary).
 *   - VoxDogfoodPanel     → POST /ai/vox/rivals/case (rivals comparison).
 *
 * They serve complementary purposes — the closeout is "did this session
 * actually count?" (yes/no/partial/failed) while the dogfood panel is
 * "compared to baseline, how was it?". Operator can use either, both,
 * or neither.
 *
 * Honesty contract:
 *   - Never sends the transcript text, prompt body, audio, or
 *     confirmation_token. Only structured signals + an optional ≤1000
 *     char operator-typed note.
 *   - Auto-infers `used_hotkey` (from `session.source`), `used_real_stt`
 *     (from `transcript.engine`), `used_governed_execute` (from
 *     `selectedMode`), `eclipse_used` (from controller state). All are
 *     overrideable by the operator before submit.
 *   - Backend `unavailable` is surfaced verbatim — no fake "registered".
 */
import { useCallback, useState } from 'react'
import {
  voxDogfoodSessionCreate,
  VOX_DOGFOOD_NOTE_MAX_CHARS,
  type VoxDogfoodOutcome,
  type VoxMode,
} from '../../lib/bridge'

interface VoxSessionCloseoutProps {
  /** Canonical mode of the just-finished session. */
  mode: VoxMode
  /** Vox edge session id, if there was a real session. */
  voxSessionId: string | null
  /** Auto-inferred · the operator started this session via Option+Space. */
  inferredUsedHotkey: boolean
  /** Auto-inferred · transcript engine was real Whisper (not debug paste). */
  inferredUsedRealStt: boolean
  /** Auto-inferred · mode was `governed_execute`. */
  inferredUsedGovernedExecute: boolean
  /** Auto-inferred · the operator triggered an eclipse during the session. */
  inferredEclipseUsed: boolean
  /** Optional · in-memory session duration in ms. */
  durationMs?: number | null
  /** Optional · ISO timestamp of session start (best-effort, may be null). */
  startedAt?: string | null
  /** Optional callback after a successful submit. Parent can refresh
   * report/gate panels here. */
  onRegistered?: () => void
}

type CloseoutState =
  | { kind: 'idle' }
  | { kind: 'submitting'; outcome: VoxDogfoodOutcome }
  | { kind: 'done'; outcome: VoxDogfoodOutcome; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'dismissed' }

const OUTCOME_BUTTONS: ReadonlyArray<{
  outcome: VoxDogfoodOutcome
  label: string
  className: string
  title: string
}> = [
  {
    outcome: 'success',
    label: 'Sucesso',
    className: 'vox-closeout-chip vox-closeout-chip-success',
    title: 'Sessão útil · marca outcome=success no diário',
  },
  {
    outcome: 'partial',
    label: 'Parcial',
    className: 'vox-closeout-chip vox-closeout-chip-partial',
    title: 'Funcionou em parte · marca outcome=partial',
  },
  {
    outcome: 'failed',
    label: 'Falhou',
    className: 'vox-closeout-chip vox-closeout-chip-failed',
    title: 'Sessão não entregou · marca outcome=failed',
  },
  {
    outcome: 'cancelled',
    label: 'Cancelado',
    className: 'vox-closeout-chip vox-closeout-chip-cancelled',
    title: 'Cancelei no meio · marca outcome=cancelled',
  },
]

export function VoxSessionCloseout({
  mode,
  voxSessionId,
  inferredUsedHotkey,
  inferredUsedRealStt,
  inferredUsedGovernedExecute,
  inferredEclipseUsed,
  durationMs = null,
  startedAt = null,
  onRegistered,
}: VoxSessionCloseoutProps) {
  const [state, setState] = useState<CloseoutState>({ kind: 'idle' })
  const [regret, setRegret] = useState<boolean>(false)
  const [note, setNote] = useState<string>('')

  const submit = useCallback(
    async (outcome: VoxDogfoodOutcome): Promise<void> => {
      setState({ kind: 'submitting', outcome })
      const response = await voxDogfoodSessionCreate({
        mode,
        outcome,
        voxSessionId,
        startedAt,
        durationMs,
        usedHotkey: inferredUsedHotkey,
        usedRealStt: inferredUsedRealStt,
        usedGovernedExecute: inferredUsedGovernedExecute,
        eclipseUsed: inferredEclipseUsed,
        regretFlag: regret,
        note: note.trim() === '' ? null : note.trim(),
      })
      if (response.status === 'ok') {
        setState({
          kind: 'done',
          outcome,
          message: 'Uso real registrado.',
        })
        onRegistered?.()
        return
      }
      if (response.status === 'unavailable') {
        setState({
          kind: 'unavailable',
          message: response.message ?? 'Endpoint dogfood ainda indisponível no Kernel.',
        })
        return
      }
      setState({
        kind: 'error',
        message: response.message ?? 'Falha ao registrar sessão.',
      })
    },
    [
      mode,
      voxSessionId,
      startedAt,
      durationMs,
      inferredUsedHotkey,
      inferredUsedRealStt,
      inferredUsedGovernedExecute,
      inferredEclipseUsed,
      regret,
      note,
      onRegistered,
    ],
  )

  if (state.kind === 'dismissed') return null

  const submitting = state.kind === 'submitting'

  // Done state: small confirmation pill + option to record another (used
  // when the operator wants to follow up with a different verdict).
  if (state.kind === 'done') {
    return (
      <section
        className="vox-overlay-section vox-closeout vox-closeout-resolved"
        aria-label="Sessão registrada no diário dogfood"
      >
        <h3 className="vox-overlay-section-title">Diário</h3>
        <p className="vox-overlay-hint">
          {state.message}{' '}
          <span className="vox-closeout-meta">
            outcome <code>{state.outcome}</code>
          </span>{' '}
          <button
            type="button"
            className="vox-closeout-link"
            onClick={() => setState({ kind: 'idle' })}
          >
            corrigir
          </button>
        </p>
      </section>
    )
  }

  return (
    <section
      className="vox-overlay-section vox-closeout"
      aria-label="Registrar uso real da sessão Vox"
    >
      <h3 className="vox-overlay-section-title">Registrar uso real?</h3>

      <div className="vox-closeout-bar" role="group" aria-label="Outcome buttons">
        {OUTCOME_BUTTONS.map((btn) => (
          <button
            key={btn.outcome}
            type="button"
            className={btn.className}
            onClick={() => void submit(btn.outcome)}
            disabled={submitting}
            title={btn.title}
          >
            {btn.label}
            {submitting && state.kind === 'submitting' && state.outcome === btn.outcome
              ? '…'
              : ''}
          </button>
        ))}
        <button
          type="button"
          className="vox-closeout-chip vox-closeout-chip-ghost"
          onClick={() => setState({ kind: 'dismissed' })}
          disabled={submitting}
          title="Pular · não registra nada para esta sessão"
        >
          Ignorar
        </button>
      </div>

      <div className="vox-closeout-extras">
        <label className="vox-closeout-regret">
          <input
            type="checkbox"
            checked={regret}
            onChange={(e) => setRegret(e.target.checked)}
            disabled={submitting}
          />
          <span>marcar regret</span>
        </label>
        <input
          type="text"
          className="vox-closeout-note"
          placeholder="nota curta (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={VOX_DOGFOOD_NOTE_MAX_CHARS}
          spellCheck={false}
          disabled={submitting}
        />
      </div>

      <p className="vox-overlay-hint vox-closeout-inferred">
        Auto:{' '}
        <code>{inferredUsedHotkey ? 'hotkey✓' : 'hotkey—'}</code>{' '}
        <code>{inferredUsedRealStt ? 'stt-real✓' : 'stt-real—'}</code>{' '}
        <code>{inferredUsedGovernedExecute ? 'governed✓' : 'governed—'}</code>
        {inferredEclipseUsed ? <> <code>eclipse✓</code></> : null}
      </p>

      {state.kind === 'unavailable' ? (
        <p className="vox-overlay-hint vox-overlay-hint-warn" role="status">
          {state.message}
        </p>
      ) : null}
      {state.kind === 'error' ? (
        <p className="vox-overlay-hint vox-overlay-hint-error" role="status">
          {state.message}
        </p>
      ) : null}
    </section>
  )
}
