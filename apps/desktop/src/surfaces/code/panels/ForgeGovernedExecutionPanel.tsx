import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { EmptyText, Row } from './RightRailPrimitives'

interface ForgeGovernedExecutionPanelProps {
  liveExecution: WorkStateSnapshot['forgeLiveExecution']
}

export function ForgeGovernedExecutionPanel({ liveExecution }: ForgeGovernedExecutionPanelProps) {
  const governed = liveExecution?.governedExecution

  if (!governed) {
    return (
      <div className="ops-section">
        <PanelTitle label="Governed Execution" meta="sem WorkItem" />
        <EmptyText>aguardando task contract governado</EmptyText>
      </div>
    )
  }

  const ok = governed.status === 'passed'
  const meta = `${governed.status} · ${governed.executionMode ?? 'governed'}`

  return (
    <div className="ops-section">
      <PanelTitle label="Governed Execution" meta={meta} />
      <div
        style={{
          display: 'grid',
          gap: 6,
          padding: '8px 10px',
          background: ok ? 'var(--moss-veil)' : 'var(--rec-red-veil, rgba(138,48,37,0.08))',
          border: ok ? '1px solid var(--moss-soft)' : '1px solid var(--rec-red, #8a3025)',
          borderRadius: 2,
        }}
      >
        <Row k="work item" v={governed.workItemCode ?? governed.workItemId ?? '-'} mono />
        <Row k="task" v={governed.taskId ?? '-'} mono />
        <Row k="validation" v={governed.validationResult?.passed ? 'passed' : 'blocked'} ok={governed.validationResult?.passed ?? false} />
        <Row k="evidence" v={governed.governanceFeedback?.evidenceAppended ? 'persisted' : 'missing'} ok={governed.governanceFeedback?.evidenceAppended ?? false} />
        <Row k="gates" v={governed.governanceFeedback?.allGreen ? 'green' : 'blocked'} ok={governed.governanceFeedback?.allGreen ?? false} />
        <Row
          k="promotion"
          v={governed.promotionStatus ?? 'requires_human_approval'}
          ok={governed.promotionStatus === 'promoted_to_workspace'}
        />
        <Row k="workspace" v={governed.liveWorkspaceMutated ? 'mutated' : 'shadow only'} ok={governed.liveWorkspaceMutated ?? false} />

        {governed.changedFiles.length > 0 ? (
          <div style={{ display: 'grid', gap: 4 }}>
            {governed.changedFiles.map((file) => (
              <div
                key={file}
                style={{
                  padding: '5px 7px',
                  background: 'var(--cream)',
                  border: '1px solid var(--hair-soft)',
                  borderRadius: 2,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink)',
                  wordBreak: 'break-all',
                }}
              >
                {file}
              </div>
            ))}
          </div>
        ) : null}

        {governed.remainingBlockers.length > 0 ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red, #8a3025)', wordBreak: 'break-word' }}>
            blockers · {governed.remainingBlockers.join(' · ')}
          </div>
        ) : null}
      </div>
    </div>
  )
}
