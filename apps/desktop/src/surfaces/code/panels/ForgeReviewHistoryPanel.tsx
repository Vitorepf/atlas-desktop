import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { EmptyText, Row } from './RightRailPrimitives'

interface ForgeReviewHistoryPanelProps {
  history: WorkStateSnapshot['forgeReviewHistory']
}

export function ForgeReviewHistoryPanel({ history }: ForgeReviewHistoryPanelProps) {
  const entries = history?.entries ?? []

  return (
    <div className="ops-section">
      <PanelTitle label="Forge Review Ledger" meta={entries.length === 0 ? 'sem reviews' : `${entries.length}/${history?.total ?? entries.length}`} />
      {entries.length === 0 ? (
        <EmptyText>nenhuma revisao humana registrada para esta obra.</EmptyText>
      ) : (
        <div style={{ display: 'grid', gap: 5 }}>
          {entries.slice(0, 6).map((entry) => {
            const finalAllowed = entry.finalCompletionAllowed
            const rejected = entry.status === 'rejected'
            const toneBorder = finalAllowed
              ? '1px solid var(--moss-soft)'
              : rejected
                ? '1px solid var(--rec-red, #8a3025)'
                : '1px solid var(--bronze-soft)'

            return (
              <div
                key={entry.reviewId}
                style={{
                  padding: '8px 10px',
                  background: finalAllowed ? 'var(--moss-veil)' : 'var(--cream)',
                  border: toneBorder,
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--cc-font-mono)',
                      fontSize: 8.5,
                      letterSpacing: 0,
                      color: finalAllowed ? 'var(--moss)' : rejected ? 'var(--rec-red, #8a3025)' : 'var(--bronze)',
                      textTransform: 'none',
                    }}
                  >
                    {entry.status} · {entry.liveExecutionStatus ?? 'run?'}
                  </span>
                  <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9, color: 'var(--ink3)' }}>
                    {entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleString('pt-BR') : '--'}
                  </span>
                </div>
                <dl style={{ margin: '4px 0 0' }}>
                  <Row k="review" v={entry.reviewId} mono />
                  <Row k="run" v={entry.runId ?? entry.historyId ?? 'missing'} mono />
                  <Row k="decision" v={entry.decision} ok={finalAllowed} />
                  <Row k="completion" v={finalAllowed ? 'allowed' : 'blocked'} ok={finalAllowed} />
                  {entry.promotionStatus ? (
                    <Row k="promotion" v={entry.promotionStatus} ok={entry.promotionStatus === 'promoted_to_workspace'} />
                  ) : null}
                  {entry.rollbackId ? (
                    <Row k="rollback" v={entry.rollbackId} mono ok={entry.promotionStatus === 'rolled_back'} />
                  ) : null}
                  <Row
                    k="evidence"
                    v={`${entry.stageReceiptCount} receipts · ${entry.ledgerEventCount} ledger`}
                    ok={entry.stageReceiptCount > 0 && entry.ledgerEventCount > 0}
                  />
                  <Row k="pack" v={entry.evidencePackHash ?? 'missing'} mono ok={!!entry.evidencePackHash} />
                </dl>
                {entry.comment ? (
                  <div style={{ marginTop: 4, fontFamily: 'var(--cc-font-sans)', fontStyle: 'normal', fontSize: 11.5, color: 'var(--ink3)' }}>
                    {entry.comment}
                  </div>
                ) : null}
                {entry.blockers.length > 0 ? (
                  <div style={{ display: 'grid', gap: 2, marginTop: 4 }}>
                    {entry.blockers.slice(0, 4).map((blocker) => (
                      <div key={blocker} style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9.5, color: 'var(--rec-red, #8a3025)' }}>
                        {blocker}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
