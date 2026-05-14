import { PanelTitle } from '@atlas/ui'
import type { ProgrammingGovernanceSnapshot, ProgrammingWorkItemSnapshot } from '@atlas/domain'
import { EmptyText, Row } from './RightRailPrimitives'

interface WorkItemInspectorProps {
  governance: ProgrammingGovernanceSnapshot | null
}

/**
 * SCOR-1 WorkItem Inspector.
 *
 * Renders the Programming Governance work item exactly as the runtime
 * persisted it. When `programmingGovernance.workItem` is null we render the
 * canonical empty state — never a fabricated work item.
 */
export function WorkItemInspector({ governance }: WorkItemInspectorProps) {
  if (!governance) {
    return (
      <div className="ops-section">
        <PanelTitle label="Programming Governance" meta="sem governance" />
        <EmptyText>sem work item vinculado</EmptyText>
      </div>
    )
  }

  if (governance.degraded) {
    return (
      <div className="ops-section">
        <PanelTitle label="Programming Governance" meta="degraded" />
        <DegradedBanner reason={governance.degradedReason} />
        {governance.workItem ? <WorkItemCard item={governance.workItem} /> : null}
      </div>
    )
  }

  if (!governance.workItem) {
    return (
      <div className="ops-section">
        <PanelTitle label="Programming Governance" meta="aguardando intake" />
        <EmptyText>sem work item vinculado</EmptyText>
      </div>
    )
  }

  return (
    <div className="ops-section">
      <PanelTitle label="WorkItem" meta={governance.workItem.code || governance.workItem.id} />
      <WorkItemCard item={governance.workItem} />
    </div>
  )
}

function WorkItemCard({ item }: { item: ProgrammingWorkItemSnapshot }) {
  return (
    <div
      style={{
        padding: '11px 12px',
        background: 'var(--cream)',
        border: '1px solid var(--bronze-soft)',
        borderRadius: 2,
      }}
    >
      {item.code ? <Row k="code" v={item.code} mono /> : null}
      <Row k="status" v={item.status} />
      {item.currentStage ? <Row k="stage" v={item.currentStage} /> : null}
      {item.intentType ? <Row k="type" v={item.intentType} /> : null}
      <Row k="mode" v={item.scopeMode} />
      {item.riskLevel ? <Row k="risk" v={item.riskLevel} /> : null}
      <Row k="spec hash" v={item.specHash ? item.specHash.slice(0, 12) : '—'} mono />
      <Row k="plan hash" v={item.planHash ? item.planHash.slice(0, 12) : '—'} mono />
      {item.requiredGates.length > 0 ? (
        <Row k="required gates" v={item.requiredGates.join(' · ')} />
      ) : null}
      {item.intentText ? (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--hair-soft)',
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 12.5,
            color: 'var(--ink2)',
            lineHeight: 1.45,
          }}
        >
          {item.intentText}
        </div>
      ) : null}
      {item.gaps.length > 0 ? (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--hair-soft)' }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 8.5,
              letterSpacing: '1.3px',
              color: 'var(--rec-red)',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            gaps · {item.gaps.length}
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: 'var(--ink2)' }}>
            {item.gaps.map((gap) => (
              <li key={gap.name} style={{ marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--bronze)' }}>{gap.name}</span>
                {gap.reason ? <span> · {gap.reason}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function DegradedBanner({ reason }: { reason: string | null }) {
  return (
    <div
      style={{
        padding: '8px 10px',
        marginBottom: 8,
        background: 'var(--rec-red-veil, rgba(138,48,37,0.08))',
        border: '1px solid var(--rec-red-soft, rgba(138,48,37,0.3))',
        borderRadius: 2,
        fontFamily: 'var(--mono)',
        fontSize: 10.5,
        color: 'var(--rec-red, #8a3025)',
      }}
    >
      backend degradado{reason ? `: ${reason}` : ''}
    </div>
  )
}
