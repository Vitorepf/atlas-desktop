/**
 * VoxDogfoodPanel · 1-click dogfood capture after a Vox session.
 *
 * Mounted inline in the overlay once a session reached a meaningful terminal
 * state (compiled / executed / blocked / cancelled). Lets Vitor record how
 * the session actually went, in a handful of clicks:
 *
 *   Bom            → POSTs a rivals case with preference=vox, +1 quality.
 *   Ruim / regret  → opens a short "o que deu errado?" field, then POSTs
 *                    with regret=true, preference=baseline, -1 quality.
 *   Comparar       → opens baseline kind + winner + quality vote + nota.
 *   Eclipse testado→ no Kernel endpoint exists yet; surfaces "indisponível"
 *                    honestly (never fakes a successful test).
 *   Ignorar        → dismisses the prompt for this session only.
 *
 * Honesty contract:
 *   - Never sends the transcript or compiled prompt to the Kernel as a note.
 *   - Only the operator-typed text is forwarded.
 *   - When the Kernel reports `unavailable`, the panel says so instead of
 *     pretending the submission landed.
 *   - On a successful submit, useVoxGateV3.submitRivalsCase already refetches
 *     gate + metrics + report, so the V3 Gate section reflects the new case
 *     immediately without a manual reload.
 */
import { useCallback, useState } from 'react'
import { useVoxGateV3 } from './useVoxGateV3'
import type {
  VoxRivalsBaselineKind,
  VoxRivalsCaseCreateRequest,
  VoxRivalsPreference,
} from '../../lib/bridge'

interface VoxDogfoodPanelProps {
  /** Identifiers that tie the rivals case to the Vox session/intent/receipt
   * the operator just experienced. All optional — the backend joins on
   * whatever it has. */
  recentSessionId: string | null
  recentIntentId: string | null
  recentReceiptId: string | null
  /** Optional · parent can react after a case lands (e.g. fade the panel). */
  onSubmitted?: () => void
}

type DogfoodMode = 'idle' | 'regret' | 'compare' | 'done' | 'dismissed'

interface Flash {
  kind: 'ok' | 'warn' | 'err'
  message: string
}

const BASELINE_OPTIONS: ReadonlyArray<{ value: VoxRivalsBaselineKind; label: string }> = [
  { value: 'wispr', label: 'Wispr' },
  { value: 'provider_direct', label: 'Provider direto' },
  { value: 'manual', label: 'Manual' },
]

const PREFERENCE_OPTIONS: ReadonlyArray<{ value: VoxRivalsPreference; label: string }> = [
  { value: 'vox', label: 'Vox ganhou' },
  { value: 'baseline', label: 'Baseline ganhou' },
  { value: 'draw', label: 'Empate' },
]

const QUALITY_VOTE_OPTIONS: ReadonlyArray<{ value: -1 | 0 | 1; label: string }> = [
  { value: 1, label: '+1' },
  { value: 0, label: '0' },
  { value: -1, label: '-1' },
]

export function VoxDogfoodPanel({
  recentSessionId,
  recentIntentId,
  recentReceiptId,
  onSubmitted,
}: VoxDogfoodPanelProps) {
  const { submitRivalsCase, submitting } = useVoxGateV3()

  const [mode, setMode] = useState<DogfoodMode>('idle')
  const [regretNote, setRegretNote] = useState<string>('')
  const [baselineKind, setBaselineKind] = useState<VoxRivalsBaselineKind>('wispr')
  const [preference, setPreference] = useState<VoxRivalsPreference>('vox')
  const [promptQualityVote, setPromptQualityVote] = useState<-1 | 0 | 1>(0)
  const [compareNote, setCompareNote] = useState<string>('')
  const [flash, setFlash] = useState<Flash | null>(null)
  const [eclipseFlash, setEclipseFlash] = useState<string | null>(null)

  // Note · resetting state when the session/intent/receipt changes is the
  // PARENT's responsibility: VoxOverlay passes a stable `key` prop derived
  // from the session identity, so React unmounts + remounts this component
  // when a fresh session begins. That gives us a clean state slate without
  // touching refs or setState during render (both of which the project's
  // eslint config forbids).

  const handleSubmit = useCallback(
    async (payload: VoxRivalsCaseCreateRequest): Promise<void> => {
      setFlash(null)
      const response = await submitRivalsCase(payload)
      if (response.status === 'ok') {
        setFlash({ kind: 'ok', message: 'Anotado.' })
        setMode('done')
        onSubmitted?.()
      } else if (response.status === 'unavailable') {
        setFlash({
          kind: 'warn',
          message:
            response.message ?? 'Ainda coletando uso — registro vai abrir quando houver mais sessões.',
        })
      } else {
        setFlash({
          kind: 'err',
          message: response.message ?? 'Não consegui registrar agora. Tente de novo.',
        })
      }
      window.setTimeout(() => setFlash(null), 3600)
    },
    [submitRivalsCase, onSubmitted],
  )

  const submitBom = useCallback(() => {
    void handleSubmit({
      sessionId: recentSessionId,
      intentId: recentIntentId,
      receiptId: recentReceiptId,
      // No baseline was actually run — "Bom" is a unilateral thumbs-up.
      // We mark it as a manual baseline preference=vox so the case count
      // goes up honestly. Baseline `manual` reads as "operador comparou
      // contra o que ele faria manualmente" — fits the 1-click case.
      baselineKind: 'manual',
      preference: 'vox',
      promptQualityVote: 1,
      regret: false,
    })
  }, [handleSubmit, recentSessionId, recentIntentId, recentReceiptId])

  const submitRuim = useCallback(() => {
    void handleSubmit({
      sessionId: recentSessionId,
      intentId: recentIntentId,
      receiptId: recentReceiptId,
      baselineKind: 'manual',
      preference: 'baseline',
      promptQualityVote: -1,
      regret: true,
      note: regretNote.trim() === '' ? null : regretNote.trim(),
    })
  }, [handleSubmit, recentSessionId, recentIntentId, recentReceiptId, regretNote])

  const submitCompare = useCallback(() => {
    void handleSubmit({
      sessionId: recentSessionId,
      intentId: recentIntentId,
      receiptId: recentReceiptId,
      baselineKind,
      preference,
      promptQualityVote,
      regret: false,
      note: compareNote.trim() === '' ? null : compareNote.trim(),
    })
  }, [
    handleSubmit,
    recentSessionId,
    recentIntentId,
    recentReceiptId,
    baselineKind,
    preference,
    promptQualityVote,
    compareNote,
  ])

  const onEclipseTest = useCallback(() => {
    // V0 of dogfood: there is no /ai/vox/eclipse-test endpoint. We refuse to
    // fake a success — even via a rivals case with a special note — because
    // the spec is explicit: "Se não houver endpoint, não fakear."
    setEclipseFlash(
      'Marcar "Parar tudo testado" ainda não está disponível nesta fase.',
    )
    window.setTimeout(() => setEclipseFlash(null), 4200)
  }, [])

  if (mode === 'dismissed') return null

  const flashClass =
    flash?.kind === 'ok'
      ? 'vox-overlay-flash'
      : flash?.kind === 'warn'
        ? 'vox-overlay-hint vox-overlay-hint-warn'
        : 'vox-overlay-hint vox-overlay-hint-error'

  return (
    <section
      className="vox-overlay-section vox-dogfood"
      aria-label="Como foi essa sessão Vox"
    >
      <h3 className="vox-overlay-section-title">Como foi?</h3>

      {mode === 'done' ? (
        <p className="vox-overlay-hint">
          Anotado. Obrigado pelo retorno.{' '}
          <button
            type="button"
            className="vox-dogfood-link"
            onClick={() => setMode('idle')}
          >
            registrar outra
          </button>
        </p>
      ) : (
        <>
          {mode === 'idle' ? (
            <div className="vox-dogfood-actions">
              <button
                type="button"
                className="vox-dogfood-chip vox-dogfood-chip-good"
                onClick={submitBom}
                disabled={submitting}
                title="A sessão foi útil"
              >
                Bom
              </button>
              <button
                type="button"
                className="vox-dogfood-chip vox-dogfood-chip-bad"
                onClick={() => setMode('regret')}
                disabled={submitting}
                title="A sessão foi ruim — vou pedir o que deu errado"
              >
                Ruim
              </button>
              <button
                type="button"
                className="vox-dogfood-chip"
                onClick={() => setMode('compare')}
                disabled={submitting}
                title="Comparar com Wispr, com o provider direto ou com o que eu faria manualmente"
              >
                Comparar
              </button>
              <button
                type="button"
                className="vox-dogfood-chip"
                onClick={onEclipseTest}
                disabled={submitting}
                title="Marcar Parar tudo (Eclipse) testado · ainda não disponível"
              >
                Parar tudo testado
              </button>
              <button
                type="button"
                className="vox-dogfood-chip vox-dogfood-chip-ghost"
                onClick={() => setMode('dismissed')}
                disabled={submitting}
                title="Não registrar nada para esta sessão"
              >
                Ignorar
              </button>
            </div>
          ) : null}

          {mode === 'regret' ? (
            <div className="vox-dogfood-form">
              <label className="vox-overlay-dict-field">
                <span>O que deu errado?</span>
                <textarea
                  className="vox-overlay-debug-input vox-dogfood-note"
                  value={regretNote}
                  onChange={(e) => setRegretNote(e.target.value)}
                  placeholder="Opcional, mas ajuda em sessões futuras (até 280 caracteres)"
                  rows={2}
                  maxLength={280}
                  spellCheck={false}
                  disabled={submitting}
                />
              </label>
              <div className="vox-dogfood-actions">
                <button
                  type="button"
                  className="vox-btn-secondary"
                  onClick={submitRuim}
                  disabled={submitting}
                >
                  {submitting ? 'registrando…' : 'Marcar como ruim'}
                </button>
                <button
                  type="button"
                  className="vox-btn-ghost"
                  onClick={() => setMode('idle')}
                  disabled={submitting}
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : null}

          {mode === 'compare' ? (
            <div className="vox-dogfood-form">
              <div className="vox-dogfood-fields">
                <label className="vox-overlay-dict-field">
                  <span>Comparar com</span>
                  <select
                    value={baselineKind}
                    onChange={(e) =>
                      setBaselineKind(e.target.value as VoxRivalsBaselineKind)
                    }
                    disabled={submitting}
                  >
                    {BASELINE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="vox-overlay-dict-field">
                  <span>Quem ganhou</span>
                  <select
                    value={preference}
                    onChange={(e) =>
                      setPreference(e.target.value as VoxRivalsPreference)
                    }
                    disabled={submitting}
                  >
                    {PREFERENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="vox-overlay-dict-field">
                  <span>Nota de qualidade</span>
                  <select
                    value={String(promptQualityVote)}
                    onChange={(e) =>
                      setPromptQualityVote(parseInt(e.target.value, 10) as -1 | 0 | 1)
                    }
                    disabled={submitting}
                  >
                    {QUALITY_VOTE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <textarea
                className="vox-overlay-debug-input vox-dogfood-note"
                value={compareNote}
                onChange={(e) => setCompareNote(e.target.value)}
                placeholder="Nota curta (opcional, até 280 caracteres)"
                rows={2}
                maxLength={280}
                spellCheck={false}
                disabled={submitting}
              />
              <div className="vox-dogfood-actions">
                <button
                  type="button"
                  className="vox-btn-secondary"
                  onClick={submitCompare}
                  disabled={submitting}
                >
                  {submitting ? 'registrando…' : 'Registrar comparação'}
                </button>
                <button
                  type="button"
                  className="vox-btn-ghost"
                  onClick={() => setMode('idle')}
                  disabled={submitting}
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {flash ? (
        <p className={flashClass} role="status">
          {flash.message}
        </p>
      ) : null}
      {eclipseFlash ? (
        <p className="vox-overlay-hint vox-overlay-hint-warn" role="status">
          {eclipseFlash}
        </p>
      ) : null}
    </section>
  )
}
