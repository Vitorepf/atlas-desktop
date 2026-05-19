/**
 * VoxGatePanel · compact V3 promotion telemetry inside the Vox overlay.
 *
 * Shows:
 *   - GATE V3 status pill (blocked / warming_up / ready_for_vitor_review)
 *   - Real sessions + days of real use against their targets
 *   - Qualitative deltas (prompt quality, regret, rivals multiplier)
 *   - Safety hard gates (raw audio, confirmation bypass, destructive
 *     without receipt, eclipse tests)
 *   - Blockers in short PT-BR
 *   - Optional rivals quick-entry form
 *
 * Hard rules:
 *   - No fake metrics. When the Kernel returns `unavailable`, the panel
 *     says "Métricas ainda indisponíveis" instead of zeroes.
 *   - No "Aprovar V4" button. This wave only shows that explicit human
 *     approval will be required.
 *   - Never renders any confirmation_token.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useVoxGateV3 } from './useVoxGateV3'
import type {
  VoxGateV3Response,
  VoxMetricsResponse,
  VoxRivalsBaselineKind,
  VoxRivalsPreference,
} from '../../lib/bridge'

interface VoxGatePanelProps {
  /** Auto-load (gate + metrics + report) when this becomes true. The hook
   * itself is mounted as long as the panel is rendered, so this is a
   * "panel opened" signal from the parent. */
  open: boolean
  /** Optional rivals quick-entry context · ties the case to the most
   * recent Vox session/intent/receipt. All optional. */
  recentSessionId?: string | null
  recentIntentId?: string | null
  recentReceiptId?: string | null
  /** Caller can offer the rivals quick-entry form if a fresh session
   * actually happened. The panel hides it otherwise to stay compact. */
  rivalsCaptureAvailable?: boolean
}

const GATE_LABEL: Record<NonNullable<VoxGateV3Response['gateStatus']>, string> = {
  blocked: 'bloqueado',
  warming_up: 'em rodagem',
  ready_for_vitor_review: 'pronto · aguarda revisão Vitor',
}

const BASELINE_OPTIONS: Array<{ value: VoxRivalsBaselineKind; label: string }> = [
  { value: 'wispr', label: 'Wispr' },
  { value: 'provider_direct', label: 'Provider direto' },
  { value: 'manual', label: 'Manual' },
]

const PREFERENCE_OPTIONS: Array<{ value: VoxRivalsPreference; label: string }> = [
  { value: 'vox', label: 'Vox' },
  { value: 'baseline', label: 'Baseline' },
  { value: 'draw', label: 'Empate' },
]

const QUALITY_VOTE_OPTIONS: Array<{ value: -1 | 0 | 1; label: string }> = [
  { value: 1, label: '+1' },
  { value: 0, label: '0' },
  { value: -1, label: '-1' },
]

function statusPillClass(status: VoxGateV3Response['gateStatus']): string {
  switch (status) {
    case 'ready_for_vitor_review':
      return 'vox-gate-pill vox-gate-pill-ready'
    case 'warming_up':
      return 'vox-gate-pill vox-gate-pill-warming'
    case 'blocked':
    default:
      return 'vox-gate-pill vox-gate-pill-blocked'
  }
}

function fmtNumber(v: number | null, digits = 2): string {
  if (v === null || !Number.isFinite(v)) return '—'
  return v.toFixed(digits)
}

function fmtCount(value: number, target: number): string {
  if (target <= 0) return String(value)
  return `${value} / ${target}`
}

function hardGateClass(value: number): string {
  return value > 0 ? 'vox-gate-hard-bad' : 'vox-gate-hard-ok'
}

function summarizeBlockers(blockers: VoxGateV3Response['blockers']): string {
  if (blockers.length === 0) return 'Sem blockers reportados.'
  const head = blockers.slice(0, 3).map((b) => b.message || b.code).join(' · ')
  return blockers.length > 3 ? `${head} (+${blockers.length - 3})` : head
}

export function VoxGatePanel({
  open,
  recentSessionId,
  recentIntentId,
  recentReceiptId,
  rivalsCaptureAvailable = false,
}: VoxGatePanelProps) {
  const gateV3 = useVoxGateV3()
  const {
    gate,
    metrics,
    report,
    loading,
    loadError,
    loadAll,
    submitRivalsCase,
    submitting,
    lastSubmit,
  } = gateV3

  // V0 of rivals quick-entry · local state, never persisted in localStorage.
  const [baselineKind, setBaselineKind] = useState<VoxRivalsBaselineKind>('wispr')
  const [preference, setPreference] = useState<VoxRivalsPreference>('vox')
  const [promptQualityVote, setPromptQualityVote] = useState<-1 | 0 | 1>(0)
  const [regret, setRegret] = useState<boolean>(false)
  const [note, setNote] = useState<string>('')
  const [submitFlash, setSubmitFlash] = useState<string | null>(null)

  // Lazy-load: first time the operator opens the panel, fetch the trio.
  // Subsequent opens reuse cached state — they can hit "Atualizar" to refetch.
  useEffect(() => {
    if (!open) return
    if (gate || metrics || report) return
    void loadAll()
  }, [open, gate, metrics, report, loadAll])

  const handleSubmit = useCallback(async () => {
    setSubmitFlash(null)
    const response = await submitRivalsCase({
      sessionId: recentSessionId ?? null,
      intentId: recentIntentId ?? null,
      receiptId: recentReceiptId ?? null,
      baselineKind,
      preference,
      promptQualityVote,
      regret,
      note: note.trim() === '' ? null : note.trim(),
    })
    if (response.status === 'ok') {
      setSubmitFlash('Comparação registrada.')
      setNote('')
      setRegret(false)
      setPromptQualityVote(0)
    } else if (response.status === 'unavailable') {
      setSubmitFlash('Rivals ainda indisponível no Kernel.')
    } else {
      setSubmitFlash(`Falhou: ${response.message ?? 'erro desconhecido'}`)
    }
    window.setTimeout(() => setSubmitFlash(null), 3200)
  }, [
    submitRivalsCase,
    recentSessionId,
    recentIntentId,
    recentReceiptId,
    baselineKind,
    preference,
    promptQualityVote,
    regret,
    note,
  ])

  const metricsUnavailable = !metrics || metrics.status === 'unavailable'
  const gateUnavailable = !gate || gate.status === 'unavailable'
  const reportUnavailable = !report || report.status === 'unavailable'

  const blockersLine = useMemo(
    () => (gate ? summarizeBlockers(gate.blockers) : ''),
    [gate],
  )

  if (!open) return null

  return (
    <div className="vox-gate-body">
      {loadError ? (
        <p className="vox-overlay-hint vox-overlay-hint-error">{loadError}</p>
      ) : null}

      {/* GATE status + refresh */}
      <div className="vox-gate-row">
        <span className={statusPillClass(gate?.gateStatus ?? null)}>
          {gate?.gateStatus ? GATE_LABEL[gate.gateStatus] : 'gate · status indisponível'}
        </span>
        <button
          type="button"
          className="vox-btn-ghost vox-gate-refresh"
          onClick={() => void loadAll()}
          disabled={loading}
        >
          {loading ? 'atualizando…' : 'atualizar'}
        </button>
      </div>

      {gateUnavailable && !loadError ? (
        <p className="vox-overlay-hint">
          GATE V3 ainda indisponível no Kernel ({gate?.message ?? 'sem detalhes'}).
        </p>
      ) : (
        <p className="vox-overlay-hint">{blockersLine}</p>
      )}

      {/* Métricas principais */}
      {metricsUnavailable ? (
        <p className="vox-overlay-hint vox-overlay-hint-warn">
          Métricas ainda indisponíveis ({metrics?.message ?? 'sem detalhes'}).
        </p>
      ) : metrics ? (
        <MetricsBlock metrics={metrics} />
      ) : null}

      {/* Rivals summary */}
      <div className="vox-gate-row vox-gate-row-tight">
        <span className="vox-gate-key">Rivals</span>
        {reportUnavailable ? (
          <span className="vox-gate-val vox-gate-val-faint">
            relatório ainda indisponível
          </span>
        ) : report ? (
          <span className="vox-gate-val">
            {report.summary.totalCases} casos · Vox {report.summary.voxWins} ·
            Baseline {report.summary.baselineWins} · Empate {report.summary.draws} ·
            Regret {report.summary.regrets}
          </span>
        ) : null}
      </div>

      {/* V4 promotion stance · explicit non-button */}
      <p className="vox-gate-v4-note">
        V4 só promove com aprovação explícita do operador.
        Esta wave NÃO oferece botão de promoção.
      </p>

      {/* Rivals quick entry */}
      {rivalsCaptureAvailable ? (
        <details className="vox-gate-rivals" open>
          <summary className="vox-overlay-fallback-summary">Registrar comparação</summary>
          <div className="vox-gate-rivals-form">
            <label className="vox-overlay-dict-field">
              <span>baseline</span>
              <select
                value={baselineKind}
                onChange={(e) => setBaselineKind(e.target.value as VoxRivalsBaselineKind)}
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
              <span>preferência</span>
              <select
                value={preference}
                onChange={(e) => setPreference(e.target.value as VoxRivalsPreference)}
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
              <span>quality</span>
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
            <label className="vox-gate-rivals-regret">
              <input
                type="checkbox"
                checked={regret}
                onChange={(e) => setRegret(e.target.checked)}
                disabled={submitting}
              />
              <span>isso foi ruim (regret)</span>
            </label>
            <textarea
              className="vox-overlay-debug-input vox-gate-rivals-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="nota curta (opcional)"
              rows={2}
              maxLength={280}
              spellCheck={false}
              disabled={submitting}
            />
            <div className="vox-gate-rivals-actions">
              <button
                type="button"
                className="vox-btn-secondary"
                onClick={() => void handleSubmit()}
                disabled={submitting}
              >
                {submitting ? 'enviando…' : 'registrar'}
              </button>
              {submitFlash ? (
                <span
                  className={
                    lastSubmit?.status === 'ok'
                      ? 'vox-overlay-flash'
                      : 'vox-overlay-hint vox-overlay-hint-warn'
                  }
                  role="status"
                >
                  {submitFlash}
                </span>
              ) : null}
            </div>
          </div>
        </details>
      ) : null}
    </div>
  )
}

interface MetricsBlockProps {
  metrics: VoxMetricsResponse
}

function MetricsBlock({ metrics }: MetricsBlockProps) {
  const hg = metrics.hardGates
  return (
    <>
      <div className="vox-gate-row vox-gate-row-tight">
        <span className="vox-gate-key">sessões</span>
        <span className="vox-gate-val">{fmtCount(metrics.realSessions, metrics.realSessionsTarget)}</span>
        <span className="vox-gate-key">dias</span>
        <span className="vox-gate-val">{fmtCount(metrics.daysOfRealUse, metrics.daysOfRealUseTarget)}</span>
      </div>
      <div className="vox-gate-row vox-gate-row-tight">
        <span className="vox-gate-key">prompt quality</span>
        <span className="vox-gate-val">{fmtNumber(metrics.promptQualityDelta)}</span>
        <span className="vox-gate-key">regret</span>
        <span className="vox-gate-val">{fmtNumber(metrics.actionRegretScore)}</span>
        <span className="vox-gate-key">rivals×</span>
        <span className="vox-gate-val">{fmtNumber(metrics.rivalsVoiceMultiplier)}</span>
      </div>
      <div className="vox-gate-hard">
        <span className="vox-gate-key">safety</span>
        <span className={hardGateClass(hg.rawAudioPersistedCount)}>
          raw audio: {hg.rawAudioPersistedCount}
        </span>
        <span className={hardGateClass(hg.confirmationBypassCount)}>
          confirmation bypass: {hg.confirmationBypassCount}
        </span>
        <span className={hardGateClass(hg.destructiveActionWithoutReceipt)}>
          destrutivo s/ receipt: {hg.destructiveActionWithoutReceipt}
        </span>
        <span
          className={
            hg.eclipseTestSuccessCount >= hg.eclipseTestRequiredCount
              ? 'vox-gate-hard-ok'
              : 'vox-gate-hard-bad'
          }
        >
          eclipse: {hg.eclipseTestSuccessCount} / {hg.eclipseTestRequiredCount || 3}
        </span>
      </div>
    </>
  )
}
