import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { EmptyText, Row } from './RightRailPrimitives'

interface ForgeRunReplayInspectorPanelProps {
  replay: WorkStateSnapshot['forgeRunHistoryReplay']
}

export function ForgeRunReplayInspectorPanel({ replay }: ForgeRunReplayInspectorPanelProps) {
  if (!replay) {
    return (
      <div className="ops-section">
        <PanelTitle label="Run Replay Inspector" meta="sem selecao" />
        <EmptyText>selecione um run historico para inspecionar replay, review e evidence pack.</EmptyText>
      </div>
    )
  }

  const digest = replay.evidencePackDigest
  const review = replay.review
  const snapshot = replay.snapshot

  return (
    <div className="ops-section">
      <PanelTitle
        label="Run Replay Inspector"
        meta={replay.snapshotAvailable ? 'snapshot + digest' : replay.status}
      />
      <div
        style={{
          display: 'grid',
          gap: 6,
          padding: '9px 10px',
          background: replay.status === 'passed' ? 'var(--moss-veil)' : 'var(--cream)',
          border: replay.status === 'passed' ? '1px solid var(--moss-soft)' : '1px solid var(--bronze-soft)',
          borderRadius: 2,
        }}
      >
        <dl style={{ margin: 0 }}>
          <Row k="history" v={replay.historyId} mono />
          <Row k="status" v={replay.status} ok={replay.status === 'passed'} />
          <Row k="read only" v={replay.replay.readOnly ? 'true' : 'false'} ok={replay.replay.readOnly} />
          <Row k="provider" v={replay.replay.externalProviderCall ? 'external' : 'none'} ok={!replay.replay.externalProviderCall} />
          <Row k="snapshot" v={replay.snapshotAvailable ? 'available' : 'missing'} ok={replay.snapshotAvailable} />
        </dl>

        {digest ? (
          <dl style={{ margin: 0 }}>
            <Row k="receipts" v={`${digest.stageReceiptCount}`} ok={digest.stageReceiptCount > 0} />
            <Row k="ledger" v={`${digest.ledgerEventCount}`} ok={digest.ledgerEventCount > 0} />
            <Row k="pack" v={digest.evidencePackHash ?? 'missing'} mono ok={!!digest.evidencePackHash} />
            <Row k="timeline" v={digest.stageTimelineHash ?? replay.stageTimelineDigest.stageTimelineHash ?? 'missing'} mono ok={!!(digest.stageTimelineHash ?? replay.stageTimelineDigest.stageTimelineHash)} />
          </dl>
        ) : (
          <EmptyText>sem evidence pack digest para este run.</EmptyText>
        )}

        {snapshot?.stageTimeline ? (
          <div style={{ display: 'grid', gap: 3 }}>
            {snapshot.stageTimeline.entries.slice(0, 6).map((entry) => (
              <div
                key={`${entry.index}-${entry.name}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '18px 1fr auto',
                  gap: 6,
                  fontFamily: 'var(--cc-font-mono)',
                  fontSize: 9.5,
                  color: entry.blocking ? 'var(--rec-red, #8a3025)' : 'var(--ink3)',
                }}
              >
                <span>{entry.index}</span>
                <span>{entry.name}</span>
                <span>{entry.status}</span>
              </div>
            ))}
          </div>
        ) : null}

        {review ? (
          <dl style={{ margin: 0 }}>
            <Row k="review" v={review.status} ok={review.reviewGate.finalCompletionAllowed} />
            <Row k="human" v={review.reviewGate.humanApproved ? 'approved' : 'not approved'} ok={review.reviewGate.humanApproved} />
            <Row k="final" v={review.reviewGate.finalCompletionAllowed ? 'allowed' : 'blocked'} ok={review.reviewGate.finalCompletionAllowed} />
          </dl>
        ) : (
          <EmptyText>sem review humano vinculado a este run.</EmptyText>
        )}

        {review?.comment ? (
          <div style={{ fontFamily: 'var(--cc-font-sans)', fontStyle: 'normal', fontSize: 11.5, color: 'var(--ink3)' }}>
            {review.comment}
          </div>
        ) : null}

        {replay.replay.command ? (
          <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9.5, color: 'var(--ink3)', wordBreak: 'break-all' }}>
            $ {replay.replay.command}
          </div>
        ) : null}
      </div>
    </div>
  )
}
