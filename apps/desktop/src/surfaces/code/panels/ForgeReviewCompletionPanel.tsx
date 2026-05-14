import { useMemo, useState, useTransition } from 'react'
import { PanelTitle } from '@atlas/ui'
import type {
  AtlasCodeForgeCompletionClaim,
  AtlasCodeForgeReviewPacket,
} from '@atlas/domain'
import { btnPrimary, Row } from './RightRailPrimitives'

interface ForgeReviewCompletionPanelProps {
  obraId: string | null
  fastPathRunId: string | null
  packet: AtlasCodeForgeReviewPacket | null
  claim: AtlasCodeForgeCompletionClaim | null
  busy: boolean
  onRefresh: (runId?: string) => Promise<void>
  onApprove: (runId?: string, payload?: { reviewer?: string; reason?: string }) => Promise<void>
  onReject: (runId?: string, payload?: { reviewer?: string; reason?: string }) => Promise<void>
  onRollback: (runId?: string, payload?: { reviewer?: string; reason?: string }) => Promise<void>
}

const REVIEW_STATUS_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  approved: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  rejected: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  rolled_back: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  blocked: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  pending: { fg: 'var(--ink2)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
}

const COMPLETION_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  completed: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  allowed: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  blocked: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  rolled_back: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  not_allowed: { fg: 'var(--ink3)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
}

/**
 * Atlas Code Forge Review & Completion Gate v1 · UI Panel.
 *
 * Mostra Review Packet + Completion Claim canonicos do backend e expoe
 * approve/reject/rollback via useBridge. Nao chama bridge direto.
 *
 * Doc: docs/engineering-knowledge-base/atlas-code-forge-review-completion-gate-v1.md
 */
export function ForgeReviewCompletionPanel({
  obraId,
  fastPathRunId,
  packet,
  claim,
  busy,
  onRefresh,
  onApprove,
  onReject,
  onRollback,
}: ForgeReviewCompletionPanelProps) {
  const [reviewer, setReviewer] = useState('')
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const effectiveRunId = fastPathRunId ?? packet?.fastPathRunId ?? null
  const disabledBase = !obraId || !effectiveRunId || busy || pending
  const reviewStatus = packet?.reviewStatus ?? 'pending'
  const runtimeStatus = packet?.runtimeStatus ?? 'missing'
  const completionStatus = claim?.completionStatus ?? 'not_allowed'
  const finalAllowed = claim?.finalCompletionAllowed === true
  const runtimePassed = runtimeStatus === 'passed'
  const evidenceVerified =
    claim?.evidencePackVerified === true || (packet ? Object.keys(packet.evidencePackDigest ?? {}).length > 0 : false)
  const rollbackAvailable = packet?.rollbackAvailable === true

  const approveDisabled = disabledBase || ! runtimePassed || ! evidenceVerified || finalAllowed
  const rejectDisabled = disabledBase || reason.trim() === ''
  const rollbackDisabled = disabledBase || ! rollbackAvailable

  const reviewTone = REVIEW_STATUS_TONE[reviewStatus] ?? REVIEW_STATUS_TONE.pending
  const completionTone = COMPLETION_TONE[completionStatus] ?? COMPLETION_TONE.not_allowed

  const meta = useMemo(() => {
    if (!obraId) return 'sem Obra'
    if (!effectiveRunId) return 'sem run'
    return `${reviewStatus} · completion ${completionStatus}`
  }, [obraId, effectiveRunId, reviewStatus, completionStatus])

  function withPayload(): { reviewer?: string; reason?: string } {
    return {
      reviewer: reviewer.trim() || undefined,
      reason: reason.trim() || undefined,
    }
  }

  function dispatch(action: 'refresh' | 'approve' | 'reject' | 'rollback') {
    if (! obraId || ! effectiveRunId) {
      setError(! obraId ? 'obra_required' : 'fast_path_run_id_required')
      return
    }
    setError(null)
    const payload = withPayload()
    startTransition(() => {
      const promise =
        action === 'refresh'
          ? onRefresh(effectiveRunId)
          : action === 'approve'
            ? onApprove(effectiveRunId, payload)
            : action === 'reject'
              ? onReject(effectiveRunId, payload)
              : onRollback(effectiveRunId, payload)
      void promise.catch((e) => setError(e instanceof Error ? e.message : String(e)))
    })
  }

  return (
    <div className="ops-section">
      <PanelTitle label="Forge Review & Completion" meta={meta} />
      <div
        style={{
          padding: '10px 12px',
          background: reviewTone.bg,
          border: `1px solid ${reviewTone.border}`,
          borderRadius: 2,
          display: 'grid',
          gap: 8,
        }}
      >
        {! obraId || ! effectiveRunId ? (
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--rec-red, #8a3025)',
              letterSpacing: '0.6px',
            }}
          >
            {! obraId ? 'sem Obra · selecione uma Obra para revisar' : 'sem run · rode o Fast Path antes da revisao'}
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 4 }}>
          <Row k="review" v={reviewStatus} />
          <Row k="runtime" v={runtimeStatus} ok={runtimePassed} />
          <Row k="completion" v={completionStatus} ok={completionStatus === 'completed'} />
          {claim?.humanApproved ? <Row k="human approved" v={claim.approvedBy ?? 'yes'} ok /> : null}
          {claim?.approvedAt ? <Row k="approved at" v={claim.approvedAt} /> : null}
          {packet?.fastPathRunId ? <Row k="run" v={packet.fastPathRunId} mono /> : null}
          {packet?.workItemId ? <Row k="work item id" v={packet.workItemId} mono /> : null}
          {packet?.executionId ? <Row k="execution" v={packet.executionId} mono /> : null}
          {packet?.historyId ? <Row k="history" v={packet.historyId} mono /> : null}
          {packet?.reviewerId ? <Row k="reviewer" v={packet.reviewerId} /> : null}
          {packet?.reviewedAt ? <Row k="reviewed at" v={packet.reviewedAt} /> : null}
        </div>

        <div
          style={{
            padding: '6px 8px',
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
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink2)' }}>
            final_allowed · {finalAllowed ? 'yes' : 'no'}
            {' · '}
            human_approved · {claim?.humanApproved ? 'yes' : 'no'}
            {' · '}
            runtime_passed · {claim?.runtimePassed || runtimePassed ? 'yes' : 'no'}
            {' · '}
            evidence · {evidenceVerified ? 'verified' : 'missing'}
          </div>
          {claim?.nextAction ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
              next · {claim.nextAction}
            </div>
          ) : null}
        </div>

        {packet && packet.changedFiles.length > 0 ? (
          <details>
            <summary style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bronze)', cursor: 'pointer', letterSpacing: '1.1px', textTransform: 'uppercase' }}>
              changed files · {packet.changedFiles.length}
            </summary>
            <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
              {packet.changedFiles.map((file) => (
                <div key={file} style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink2)', wordBreak: 'break-all' }}>
                  {file}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {packet && packet.gates.length > 0 ? (
          <details>
            <summary style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bronze)', cursor: 'pointer', letterSpacing: '1.1px', textTransform: 'uppercase' }}>
              gates · {packet.gates.length}
            </summary>
            <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
              {packet.gates.map((gate, idx) => (
                <div key={idx} style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink2)', wordBreak: 'break-all' }}>
                  {JSON.stringify(gate)}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {packet && packet.blockers.length > 0 ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red)' }}>
            blockers · {packet.blockers.join(' · ')}
          </div>
        ) : null}
        {packet?.rollbackStatus ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--bronze)' }}>
            rollback · {packet.rollbackStatus}
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <input
              type="text"
              placeholder="reviewer"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              disabled={disabledBase}
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
              disabled={disabledBase}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            <button
              type="button"
              disabled={disabledBase}
              onClick={() => dispatch('refresh')}
              style={{ ...btnPrimary, background: 'transparent', color: 'var(--bronze)' }}
            >
              refresh
            </button>
            <button
              type="button"
              disabled={approveDisabled}
              onClick={() => dispatch('approve')}
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
              onClick={() => dispatch('reject')}
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
              onClick={() => dispatch('rollback')}
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
        </div>

        {error ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red, #8a3025)', wordBreak: 'break-all' }}>
            error · {error}
          </div>
        ) : null}
      </div>
    </div>
  )
}
