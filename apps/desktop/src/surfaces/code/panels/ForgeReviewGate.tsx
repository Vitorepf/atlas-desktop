import { useState } from 'react'
import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

interface ForgeReviewGateProps {
  liveExecution: WorkStateSnapshot['forgeLiveExecution']
  review: WorkStateSnapshot['forgeReview']
  busy: boolean
  onReview: (decision: 'approved' | 'rejected', comment: string) => void
  onRollback: (promotionId?: string | null, comment?: string) => void
}

export function ForgeReviewGate({ liveExecution, review, busy, onReview, onRollback }: ForgeReviewGateProps) {
  const [comment, setComment] = useState(review?.comment ?? 'local operator review')
  const completionAllowed = !!liveExecution?.diffScope?.completionGate?.completionClaimAllowed
  const runPassed = liveExecution?.status === 'passed'
  const approved = review?.reviewGate.finalCompletionAllowed ?? false
  const rejected = review?.status === 'rejected'
  const canApprove = runPassed && completionAllowed && !approved
  const canReject = !!liveExecution && !approved && !rejected
  const blockers = review?.reviewGate.blockers ?? liveExecution?.remainingBlockers ?? []
  const promotion = review?.promotion
  const canRollback = promotion?.promotionStatus === 'promoted_to_workspace'
    && promotion.rollback?.available
    && !!promotion.promotionId

  return (
    <div className="ops-section">
      <PanelTitle
        label="Human Review"
        meta={approved ? 'approved' : canApprove ? 'ready' : liveExecution ? 'blocked' : 'sem run'}
      />
      {!liveExecution ? (
        <EmptyText>rode Forge Live antes de revisar.</EmptyText>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 6,
            padding: '9px 10px',
            background: approved ? 'var(--moss-veil)' : 'var(--cream)',
            border: approved ? '1px solid var(--moss-soft)' : '1px solid var(--bronze-soft)',
            borderRadius: 2,
          }}
        >
          <dl style={{ margin: 0 }}>
            <Row k="run" v={liveExecution.runId ?? 'latest'} mono />
            <Row k="runtime" v={liveExecution.status ?? 'unknown'} ok={runPassed} />
            <Row k="completion" v={completionAllowed ? 'allowed' : 'blocked'} ok={completionAllowed} />
            <Row k="human" v={approved ? 'approved' : review?.status ?? 'pending'} ok={approved} />
            {promotion ? (
              <Row
                k="promotion"
                v={promotion.promotionStatus ?? promotion.status ?? 'pending'}
                ok={promotion.promotionStatus === 'promoted_to_workspace'}
              />
            ) : null}
            {promotion?.rollbackExecution ? (
              <Row
                k="rollback"
                v={promotion.rollbackExecution.status ?? 'unknown'}
                ok={promotion.rollbackExecution.promotionStatus === 'rolled_back'}
              />
            ) : null}
          </dl>
          {review?.comment ? (
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--ink3)' }}>
              {review.comment}
            </div>
          ) : null}

          {blockers.length > 0 && !approved ? (
            <div style={{ display: 'grid', gap: 2 }}>
              {blockers.slice(0, 4).map((blocker) => (
                <div key={blocker} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red, #8a3025)' }}>
                  {blocker}
                </div>
              ))}
            </div>
          ) : null}

          {(canApprove || canReject) && !approved && !rejected ? (
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              disabled={busy}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                resize: 'vertical',
                minHeight: 58,
                padding: '7px 8px',
                fontFamily: 'var(--serif)',
                fontSize: 12,
                color: 'var(--ink)',
                background: 'var(--paper)',
                border: '1px solid var(--hair)',
                borderRadius: 2,
              }}
            />
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: canApprove ? '1fr 1fr' : '1fr', gap: 6 }}>
            {canApprove ? (
              <button
                type="button"
                onClick={() => onReview('approved', comment)}
                disabled={busy}
                style={{ ...btnPrimary, width: '100%' }}
              >
                {busy ? 'revisando...' : 'aprovar run forge'}
              </button>
            ) : null}
            {canReject ? (
              <button
                type="button"
                onClick={() => onReview('rejected', comment)}
                disabled={busy}
                style={{
                  ...btnPrimary,
                  width: '100%',
                  color: 'var(--rec-red, #8a3025)',
                  background: 'transparent',
                  border: '1px solid var(--rec-red, #8a3025)',
                }}
              >
                {busy ? 'revisando...' : 'rejeitar run forge'}
              </button>
            ) : null}
          </div>
          {canRollback ? (
            <button
              type="button"
              onClick={() => onRollback(promotion.promotionId, comment || 'operator rollback')}
              disabled={busy}
              style={{
                ...btnPrimary,
                width: '100%',
                color: 'var(--bronze)',
                background: 'transparent',
                border: '1px solid var(--bronze-soft)',
              }}
            >
              {busy ? 'revertendo...' : 'rollback workspace'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
