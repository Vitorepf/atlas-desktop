import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

interface CheckpointPanelProps {
  checkpoint: WorkStateSnapshot['checkpoint']
  busy: boolean
  onCreateCheckpoint: () => Promise<void>
}

export function CheckpointPanel({ checkpoint, busy, onCreateCheckpoint }: CheckpointPanelProps) {
  return (
    <div className="ops-section">
      <PanelTitle
        label="Checkpoint / Resume"
        meta={checkpoint ? `${checkpoint.status} · ${checkpoint.resume.nextSafeAction}` : 'sem checkpoint'}
      />

      {checkpoint ? (
        <div
          style={{
            display: 'grid',
            gap: 6,
            padding: '9px 10px',
            background: checkpoint.resume.resumeReady ? 'var(--moss-veil)' : 'var(--rec-red-veil, rgba(138,48,37,0.08))',
            border: checkpoint.resume.resumeReady ? '1px solid var(--moss-soft)' : '1px solid var(--rec-red, #8a3025)',
            borderRadius: 2,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--cc-font-mono)',
              fontSize: 8.5,
              letterSpacing: 0,
              color: checkpoint.resume.resumeReady ? 'var(--moss)' : 'var(--rec-red, #8a3025)',
              textTransform: 'none',
            }}
          >
            resume · {checkpoint.resume.resumeReady ? 'ready' : 'blocked'}
          </div>
          <div style={{ fontFamily: 'var(--cc-font-sans)', fontStyle: 'normal', fontSize: 12, color: 'var(--ink2)', lineHeight: 1.4 }}>
            {checkpoint.resume.summary}
          </div>
          <dl style={{ margin: 0 }}>
            <Row k="checkpoint" v={checkpoint.checkpointId} mono />
            <Row k="next" v={checkpoint.resume.nextSafeAction} />
            <Row k="forge" v={checkpoint.forgeLiveExecution?.status ?? 'missing'} ok={checkpoint.forgeLiveExecution?.status === 'passed'} />
            <Row k="completion" v={checkpoint.forgeLiveExecution?.completionClaimAllowed ? 'allowed' : 'blocked'} ok={!!checkpoint.forgeLiveExecution?.completionClaimAllowed} />
            <Row k="thread" v={checkpoint.stateRefs.activeThreadId ?? '—'} />
            <Row k="risk" v={checkpoint.risk.residualRisk} ok={checkpoint.risk.residualRisk === 'low'} />
          </dl>
          {checkpoint.risk.remainingBlockers.length > 0 ? (
            <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 10, color: 'var(--rec-red, #8a3025)', wordBreak: 'break-word' }}>
              blockers · {checkpoint.risk.remainingBlockers.join(' · ')}
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyText>sem checkpoint operacional salvo para retomar esta Obra.</EmptyText>
      )}

      <button
        type="button"
        onClick={() => void onCreateCheckpoint()}
        disabled={busy}
        style={{ ...btnPrimary, marginTop: 8, width: '100%' }}
      >
        {busy ? 'salvando…' : 'criar checkpoint'}
      </button>
    </div>
  )
}
