/**
 * Atlas Dev · RunPanel.
 *
 * Appears after Plan-only resolves and `routing_decision === atlas_dev_fast_path`.
 * Operator-confirmed execution: the button is the *only* path that triggers
 * /run. No auto-run.
 */
import { useEffect, useMemo, useState } from 'react'
import type { AtlasDevRunController } from './useAtlasDevRun'
import type { PlanOnlyResult } from './types'
import styles from './atlasDev.module.css'

interface RunPanelProps {
  plan: PlanOnlyResult | null
  controller: AtlasDevRunController
  /** When set, parent surface forces the button off — e.g. plan being recomposed. */
  disabled?: boolean
  disabledReason?: string | null
}

const RUN_BLOCKED_STATES = new Set<AtlasDevRunController['status']>([
  'submitting',
  'running',
])

const ROUTING_RUNNABLE = new Set(['atlas_dev_fast_path'])

const TERMINAL_RUN_STATES = new Set<AtlasDevRunController['status']>([
  'completed',
  'blocked',
  'cancelled',
  'escalated',
])

function formatExpiry(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null
  const ts = Date.parse(iso)
  if (!Number.isFinite(ts)) return null
  const deltaMs = ts - now
  if (deltaMs <= 0) return 'expirado'
  const seconds = Math.round(deltaMs / 1000)
  if (seconds < 60) return `expira em ${seconds}s`
  const minutes = Math.round(seconds / 60)
  return `expira em ${minutes}min`
}

function isExpired(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return false
  const ts = Date.parse(iso)
  return Number.isFinite(ts) && ts <= now
}

export function RunPanel({ plan, controller, disabled = false, disabledReason = null }: RunPanelProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const isRunning = RUN_BLOCKED_STATES.has(controller.status)
  const shouldTrackExpiry = Boolean(plan?.confirmation_expires_at)
    && !TERMINAL_RUN_STATES.has(controller.status)

  useEffect(() => {
    if (!shouldTrackExpiry) return undefined
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [shouldTrackExpiry, plan?.confirmation_expires_at])

  const tokenExpired = !TERMINAL_RUN_STATES.has(controller.status)
    && isExpired(plan?.confirmation_expires_at ?? null, nowMs)
  const canExecute = useMemo(() => {
    if (!plan) return false
    if (disabled) return false
    if (tokenExpired) return false
    if (controller.status !== 'awaiting_confirmation' && controller.status !== 'failed') return false
    return ROUTING_RUNNABLE.has(plan.routing_decision)
  }, [plan, disabled, tokenExpired, controller.status])

  const expiry = TERMINAL_RUN_STATES.has(controller.status)
    ? null
    : formatExpiry(plan?.confirmation_expires_at ?? null, nowMs)
  const showReplanHint =
    controller.error?.requires_replan === true ||
    (plan && !ROUTING_RUNNABLE.has(plan.routing_decision)) ||
    tokenExpired
  const effectiveErrorMessage = tokenExpired
    ? 'Token de confirmação expirado. Gere um novo plano para obter um token válido.'
    : controller.error?.message ?? 'Esse plano não pode ser executado no fast path.'

  return (
    <section className={styles.panel} aria-label="Atlas Dev RunPanel">
      <header className={styles.panelHeader}>
        <span className={styles.panelTitle}>Atlas Dev · executar plano</span>
        {plan ? <span>run · {plan.run_id.slice(0, 8)}…</span> : null}
      </header>

      {plan ? (
        <p>
          Plano pronto. <strong>Run não dispara sozinho</strong> — confirme abaixo para que o
          Atlas execute com <code>operator_confirmed=true</code>.
          {expiry ? <> {expiry}.</> : null}
        </p>
      ) : (
        <p className={styles.empty}>Aguardando um plano (Plan-only) com routing executável.</p>
      )}

      {showReplanHint ? (
        <div className={styles.errorBanner} role="alert">
          {effectiveErrorMessage}
          {controller.error?.requires_replan && !tokenExpired ? ' Gere um novo plano para obter token válido.' : null}
        </div>
      ) : null}

      {disabledReason && !showReplanHint ? (
        <div className={styles.warningBanner} role="status">
          {disabledReason}
        </div>
      ) : null}

      <div className={styles.runButtonRow}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => {
            void controller.execute()
          }}
          disabled={!canExecute || isRunning}
        >
          {isRunning ? 'executando…' : 'executar com confirmação'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => controller.cancel()}
          disabled={!plan || controller.status === 'idle' || TERMINAL_RUN_STATES.has(controller.status)}
        >
          {isRunning ? 'cancelar' : 'descartar'}
        </button>
      </div>
    </section>
  )
}
