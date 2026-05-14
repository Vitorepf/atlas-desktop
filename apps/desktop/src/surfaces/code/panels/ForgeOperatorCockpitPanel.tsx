import { useEffect, useMemo, useState, useTransition } from 'react'
import { PanelTitle } from '@atlas/ui'
import type { RightRailContext } from './rightRailTypes'
import { btnPrimary, Row } from './RightRailPrimitives'

const POLL_INTERVAL_MS = 5000
const POLL_TERMINAL_STATES = new Set([
  'completed',
  'review_required',
  'blocked',
  'rejected',
  'rolled_back',
  'failed',
])

const STATUS_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  passed: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  completed: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  queued: { fg: 'var(--ink2)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
  running: { fg: 'var(--ink2)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
  prepared: { fg: 'var(--ink2)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
  review_required: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  degraded: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  rolled_back: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  blocked: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  failed: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  rejected: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
}

type PollVisualState =
  | 'idle'
  | 'running'
  | 'waiting_review'
  | 'blocked'
  | 'completed'
  | 'rolled_back'
  | 'rejected'

/**
 * Atlas Code Forge Operator Cockpit v1.
 *
 * Visao operacional unificada do ciclo:
 *   Obra → Forge Workspace → Fast Path → Live Execution → Status/Polling
 *   → Repair/Resume → Evidence → Review → Completion Claim
 *
 * Toda I/O passa por useBridge (sem chamadas diretas ao bridge no componente).
 *
 * Doc: docs/engineering-knowledge-base/atlas-code-forge-operator-cockpit-v1.md
 */
export function ForgeOperatorCockpitPanel(ctx: RightRailContext) {
  const {
    obra,
    busy,
    forgeFastPath,
    forgeFastPathStatus,
    forgeReviewPacket,
    forgeCompletionClaim,
    forgeLiveExecution,
    programmingGovernance,
    onRunForgeFastPath,
    onRefreshForgeFastPathStatus,
    onResumeForgeFastPath,
    onRefreshForgeReview,
    onApproveForgeReview,
    onRejectForgeReview,
    onRollbackForgeReview,
  } = ctx

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [reviewer, setReviewer] = useState('')
  const [reason, setReason] = useState('')
  const [pollOn, setPollOn] = useState(true)

  const obraId = obra?.id ?? null
  const fastPathRunId =
    forgeFastPathStatus?.fastPathRunId ?? forgeFastPath?.fastPathRunId ?? null
  const lifecycleStatus = forgeFastPathStatus?.status ?? forgeFastPath?.status ?? null
  const currentStage =
    forgeFastPathStatus?.currentStage ?? forgeFastPath?.currentStage ?? null
  const progressPercent =
    forgeFastPathStatus?.progressPercent ?? forgeFastPath?.progressPercent ?? null
  const executionId = forgeFastPathStatus?.executionId ?? forgeFastPath?.executionId ?? null
  const workItemId = forgeFastPathStatus?.workItemId ?? forgeFastPath?.workItemId ?? null
  const workItemCode = forgeFastPathStatus?.workItemCode ?? forgeFastPath?.workItemCode ?? null
  const historyId = forgeFastPathStatus?.historyId ?? forgeFastPath?.historyId ?? null
  const evidenceRefCount =
    forgeFastPathStatus?.evidenceRefCount ?? forgeFastPath?.evidenceRefs.length ?? 0
  const ledgerEventCount = forgeFastPathStatus?.ledgerEventCount ?? 0

  const reviewStatus = forgeReviewPacket?.reviewStatus ?? 'pending'
  const completionStatus = forgeCompletionClaim?.completionStatus ?? 'not_allowed'
  const finalAllowed = forgeCompletionClaim?.finalCompletionAllowed === true
  const humanApproved = forgeCompletionClaim?.humanApproved === true
  const runtimePassed =
    forgeCompletionClaim?.runtimePassed === true
    || forgeReviewPacket?.runtimeStatus === 'passed'
    || forgeLiveExecution?.status === 'passed'
  const evidenceVerified = forgeCompletionClaim?.evidencePackVerified === true
    || (forgeReviewPacket
      ? Object.keys(forgeReviewPacket.evidencePackDigest ?? {}).length > 0
      : false)
  const rollbackAvailable = forgeReviewPacket?.rollbackAvailable === true
  const nextAction =
    forgeFastPathStatus?.nextAction ?? forgeFastPath?.nextAction ?? null

  // Cockpit repair_available signal (audit invariant repair_state_visible).
  const repair = forgeFastPathStatus
    ? {
        available: forgeFastPathStatus.repair?.repairAvailable === true,
        loopStatus: forgeFastPathStatus.repair?.repairLoopStatus ?? null,
        suggested: forgeFastPathStatus.repair?.suggestedRepairCommand ?? null,
        failurePacket: forgeFastPathStatus.repair?.failurePacket ?? null,
        failClosed: forgeFastPathStatus.repair?.failClosedWithoutEvidence === true,
      }
    : null

  const blockers = useMemo(() => {
    const list = new Set<string>()
    for (const blocker of forgeFastPathStatus?.blockers ?? []) list.add(blocker)
    for (const blocker of forgeFastPath?.blockers ?? []) list.add(blocker)
    for (const blocker of forgeReviewPacket?.blockers ?? []) list.add(blocker)
    return Array.from(list)
  }, [forgeFastPathStatus, forgeFastPath, forgeReviewPacket])

  const visualState: PollVisualState = useMemo(() => {
    if (! obraId) return 'idle'
    if (! lifecycleStatus) return 'idle'
    if (lifecycleStatus === 'completed') return 'completed'
    if (lifecycleStatus === 'review_required') return 'waiting_review'
    if (lifecycleStatus === 'rolled_back') return 'rolled_back'
    if (lifecycleStatus === 'rejected') return 'rejected'
    if (lifecycleStatus === 'blocked' || lifecycleStatus === 'failed') return 'blocked'
    if (lifecycleStatus === 'queued' || lifecycleStatus === 'running' || lifecycleStatus === 'degraded') return 'running'
    return 'idle'
  }, [obraId, lifecycleStatus])

  useEffect(() => {
    if (! pollOn) return
    if (! obraId || ! fastPathRunId) return
    if (lifecycleStatus && POLL_TERMINAL_STATES.has(lifecycleStatus)) return
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      if (busy || pending) return
      try {
        await onRefreshForgeFastPathStatus(fastPathRunId)
      } catch {
        /* ignored; useBridge already pushes error */
      }
    }

    const id = window.setInterval(() => void tick(), POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [pollOn, obraId, fastPathRunId, lifecycleStatus, busy, pending, onRefreshForgeFastPathStatus])

  const disabledBase = ! obraId || busy || pending
  const runDisabled = disabledBase
  const refreshDisabled = disabledBase || ! fastPathRunId
  const reviewActionsDisabledBase = refreshDisabled
  const approveDisabled =
    reviewActionsDisabledBase || ! runtimePassed || ! evidenceVerified || finalAllowed
  const rejectDisabled = reviewActionsDisabledBase || reason.trim() === ''
  const rollbackDisabled = reviewActionsDisabledBase || ! rollbackAvailable

  function dispatch(label: string, fn: () => Promise<void>) {
    setError(null)
    startTransition(() => {
      void fn().catch((e) => setError(`${label} · ${e instanceof Error ? e.message : String(e)}`))
    })
  }

  const lifecycleTone = lifecycleStatus ? STATUS_TONE[lifecycleStatus] : undefined
  const completionTone = STATUS_TONE[completionStatus] ?? STATUS_TONE.prepared

  const meta = useMemo(() => {
    if (! obraId) return 'sem Obra'
    if (! fastPathRunId) return 'sem run'
    return `${lifecycleStatus ?? '—'} · ${visualState}`
  }, [obraId, fastPathRunId, lifecycleStatus, visualState])

  return (
    <section className="ops-panel">
      <div className="ops-section">
        <PanelTitle label="Forge Operator Cockpit" meta={meta} />

        {! obraId ? (
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--rec-red-veil, rgba(138,48,37,0.08))',
              border: '1px solid var(--rec-red, #8a3025)',
              borderRadius: 2,
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--rec-red, #8a3025)',
              letterSpacing: '0.6px',
            }}
          >
            sem Obra · cockpit fail-closed · selecione uma Obra para operar Forge
          </div>
        ) : (
          <>
            <div
              style={{
                padding: '10px 12px',
                background: 'var(--cream)',
                border: '1px solid var(--bronze-soft)',
                borderRadius: 2,
                display: 'grid',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 8.5,
                  letterSpacing: '1.3px',
                  color: 'var(--bronze)',
                  textTransform: 'uppercase',
                }}
              >
                forge workspace · obras_shared_workspace · forge_workspace
              </div>
              <Row k="obra" v={obraId} mono />
              {workItemCode ? <Row k="work item" v={workItemCode} /> : null}
              {workItemId ? <Row k="work item id" v={workItemId} mono /> : null}
              {fastPathRunId ? <Row k="run" v={fastPathRunId} mono /> : null}
              {executionId ? <Row k="execution" v={executionId} mono /> : null}
              {historyId ? <Row k="history" v={historyId} mono /> : null}
            </div>

            <div
              style={{
                marginTop: 8,
                padding: '8px 10px',
                background: lifecycleTone?.bg ?? 'var(--cream-deep, rgba(0,0,0,0.04))',
                border: `1px solid ${lifecycleTone?.border ?? 'var(--hair-soft)'}`,
                borderRadius: 2,
                display: 'grid',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 8.5,
                  letterSpacing: '1.3px',
                  color: lifecycleTone?.fg ?? 'var(--ink2)',
                  textTransform: 'uppercase',
                }}
              >
                lifecycle · {lifecycleStatus ?? 'idle'} · visual · {visualState}
              </div>
              {progressPercent !== null ? (
                <div style={{ height: 4, background: 'var(--hair-soft)', borderRadius: 2 }}>
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, progressPercent))}%`,
                      height: '100%',
                      background:
                        lifecycleStatus === 'blocked' || lifecycleStatus === 'failed' || lifecycleStatus === 'rejected'
                          ? 'var(--rec-red)'
                          : 'var(--moss)',
                      transition: 'width 240ms ease-out',
                    }}
                  />
                </div>
              ) : null}
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink2)' }}>
                stage · {currentStage ?? '—'}
                {progressPercent !== null ? ` · ${progressPercent}%` : ''}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
                review · {reviewStatus}
                {' · '}
                completion · {completionStatus}
                {humanApproved ? ' · human ✓' : ''}
                {' · '}
                runtime · {forgeReviewPacket?.runtimeStatus ?? forgeLiveExecution?.status ?? 'missing'}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
                evidence · {evidenceRefCount}
                {' · '}
                ledger · {ledgerEventCount}
                {' · '}
                next · {nextAction ?? '—'}
              </div>
            </div>

            <div
              style={{
                marginTop: 8,
                padding: '8px 10px',
                background: completionTone.bg,
                border: `1px solid ${completionTone.border}`,
                borderRadius: 2,
                display: 'grid',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 8.5,
                  letterSpacing: '1.3px',
                  color: completionTone.fg,
                  textTransform: 'uppercase',
                }}
              >
                completion claim · {completionStatus}
                {! finalAllowed && humanApproved ? ' · pending_gate' : ''}
                {finalAllowed ? ' · final ✓' : ''}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink2)' }}>
                final_allowed · {finalAllowed ? 'yes' : 'no'}
                {' · '}
                human_approved · {humanApproved ? 'yes' : 'no'}
                {' · '}
                runtime_passed · {runtimePassed ? 'yes' : 'no'}
                {' · '}
                evidence · {evidenceVerified ? 'verified' : 'missing'}
              </div>
              {runtimePassed && ! humanApproved ? (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--bronze)' }}>
                  waiting_human_review
                </div>
              ) : null}
            </div>

            {repair && repair.available ? (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 10px',
                  background: 'var(--bronze-veil)',
                  border: '1px solid var(--bronze-soft)',
                  borderRadius: 2,
                  display: 'grid',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 8.5,
                    letterSpacing: '1.3px',
                    color: 'var(--bronze)',
                    textTransform: 'uppercase',
                  }}
                >
                  repair · {repair.loopStatus ?? 'pending'}{repair.failClosed ? ' · fail_closed_without_evidence' : ''}
                </div>
                {repair.suggested ? (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink2)', wordBreak: 'break-all' }}>
                    suggested · {repair.suggested}
                  </div>
                ) : null}
                {repair.failurePacket ? (
                  <details>
                    <summary style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bronze)', cursor: 'pointer', letterSpacing: '1.1px', textTransform: 'uppercase' }}>
                      failure_packet
                    </summary>
                    <pre
                      style={{
                        margin: 0,
                        padding: '6px 8px',
                        background: 'var(--cream-deep, rgba(0,0,0,0.04))',
                        border: '1px solid var(--hair-soft)',
                        borderRadius: 2,
                        fontFamily: 'var(--mono)',
                        fontSize: 9.5,
                        color: 'var(--ink2)',
                        maxHeight: 140,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {JSON.stringify(repair.failurePacket, null, 2)}
                    </pre>
                  </details>
                ) : null}
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
                  ui · read_only · backend nao expoe repair action automatica nesta versao
                </div>
              </div>
            ) : null}

            {blockers.length > 0 ? (
              <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red)' }}>
                blockers · {blockers.join(' · ')}
              </div>
            ) : null}

            {programmingGovernance?.workItem ? (
              <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
                governance · {programmingGovernance.workItem.code} · {programmingGovernance.workItem.status}
              </div>
            ) : null}

            <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                <button
                  type="button"
                  disabled={runDisabled}
                  onClick={() => dispatch('prepare', () => onRunForgeFastPath('prepare_only'))}
                  style={{ ...btnPrimary, background: 'transparent', color: 'var(--bronze)' }}
                >
                  prepare
                </button>
                <button
                  type="button"
                  disabled={runDisabled}
                  onClick={() => dispatch('execute_async', () => onRunForgeFastPath('execute_async'))}
                  style={{ ...btnPrimary }}
                >
                  ✦ async
                </button>
                <button
                  type="button"
                  disabled={runDisabled}
                  onClick={() => dispatch('execute_sync', () => onRunForgeFastPath('execute_sync'))}
                  style={{ ...btnPrimary, background: 'transparent', color: 'var(--bronze)' }}
                >
                  sync
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                <button
                  type="button"
                  disabled={refreshDisabled}
                  onClick={() => dispatch('refresh_status', () => onRefreshForgeFastPathStatus(fastPathRunId ?? undefined))}
                  style={{ ...btnPrimary, background: 'transparent', color: 'var(--bronze)' }}
                >
                  refresh
                </button>
                <button
                  type="button"
                  disabled={refreshDisabled}
                  onClick={() => dispatch('resume', () => onResumeForgeFastPath(fastPathRunId ?? undefined))}
                  style={{ ...btnPrimary, background: 'transparent', color: 'var(--bronze)' }}
                >
                  resume
                </button>
                <button
                  type="button"
                  disabled={refreshDisabled}
                  onClick={() => dispatch('refresh_review', () => onRefreshForgeReview(fastPathRunId ?? undefined))}
                  style={{ ...btnPrimary, background: 'transparent', color: 'var(--bronze)' }}
                >
                  open review
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                <input
                  type="text"
                  placeholder="reviewer"
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  disabled={refreshDisabled}
                  style={{
                    padding: '4px 6px',
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    border: '1px solid var(--bronze-soft)',
                    borderRadius: 2,
                    background: 'var(--cream)',
                    color: 'var(--ink)',
                  }}
                />
                <input
                  type="text"
                  placeholder="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={refreshDisabled}
                  style={{
                    padding: '4px 6px',
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    border: '1px solid var(--bronze-soft)',
                    borderRadius: 2,
                    background: 'var(--cream)',
                    color: 'var(--ink)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                <button
                  type="button"
                  disabled={approveDisabled}
                  onClick={() =>
                    dispatch('approve', () =>
                      onApproveForgeReview(fastPathRunId ?? undefined, {
                        reviewer: reviewer.trim() || undefined,
                        reason: reason.trim() || undefined,
                      }),
                    )
                  }
                  style={{ ...btnPrimary, opacity: approveDisabled ? 0.5 : 1 }}
                  title={
                    approveDisabled
                      ? finalAllowed
                        ? 'already approved'
                        : runtimePassed
                          ? evidenceVerified
                            ? ''
                            : 'evidence pack missing'
                          : 'runtime not passed'
                      : ''
                  }
                >
                  ✦ approve
                </button>
                <button
                  type="button"
                  disabled={rejectDisabled}
                  onClick={() =>
                    dispatch('reject', () =>
                      onRejectForgeReview(fastPathRunId ?? undefined, {
                        reviewer: reviewer.trim() || undefined,
                        reason: reason.trim() || undefined,
                      }),
                    )
                  }
                  style={{
                    ...btnPrimary,
                    background: 'transparent',
                    color: 'var(--rec-red, #8a3025)',
                    opacity: rejectDisabled ? 0.5 : 1,
                  }}
                  title={reason.trim() === '' ? 'reason required for reject' : ''}
                >
                  reject
                </button>
                <button
                  type="button"
                  disabled={rollbackDisabled}
                  onClick={() =>
                    dispatch('rollback', () =>
                      onRollbackForgeReview(fastPathRunId ?? undefined, {
                        reviewer: reviewer.trim() || undefined,
                        reason: reason.trim() || undefined,
                      }),
                    )
                  }
                  style={{
                    ...btnPrimary,
                    background: 'transparent',
                    color: 'var(--bronze)',
                    opacity: rollbackDisabled ? 0.5 : 1,
                  }}
                  title={rollbackAvailable ? '' : 'rollback not available'}
                >
                  rollback
                </button>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--mono)',
                  fontSize: 9.5,
                  color: 'var(--ink3)',
                }}
              >
                <input
                  type="checkbox"
                  checked={pollOn}
                  onChange={(e) => setPollOn(e.target.checked)}
                />
                polling automatico ({POLL_INTERVAL_MS / 1000}s) · pausa em estado terminal
              </label>

              {error ? (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red)', wordBreak: 'break-all' }}>
                  error · {error}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
