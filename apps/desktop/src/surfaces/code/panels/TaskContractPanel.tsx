import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { EmptyText, Row } from './RightRailPrimitives'

interface TaskContractPanelProps {
  liveExecution: WorkStateSnapshot['forgeLiveExecution']
}

export function TaskContractPanel({ liveExecution }: TaskContractPanelProps) {
  const contract = liveExecution?.taskContract

  if (!contract) {
    return (
      <div className="ops-section">
        <PanelTitle label="Task Contract" meta="sem contrato" />
        <EmptyText>aguardando task contract real</EmptyText>
      </div>
    )
  }

  return (
    <div className="ops-section">
      <PanelTitle label="Task Contract" meta={`${contract.status} · ${contract.riskLevel ?? 'risk unknown'}`} />
      <div
        style={{
          display: 'grid',
          gap: 6,
          padding: '9px 10px',
          background: 'var(--cream)',
          border: '1px solid var(--bronze-soft)',
          borderRadius: 2,
        }}
      >
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--ink2)', lineHeight: 1.4 }}>
          {contract.objective}
        </div>
        <dl style={{ margin: 0 }}>
          <Row k="task" v={contract.taskId} mono />
          <Row k="owner" v={contract.owner ?? '—'} />
          <Row k="rollback" v={contract.rollback?.available ? 'available' : 'missing'} ok={!!contract.rollback?.available} />
        </dl>
        <CompactList label="allowed" items={contract.allowedFiles} />
        <CompactList label="validate" items={contract.validationCommands} />
        <CompactList label="acceptance" items={contract.acceptanceCriteria} />
        <CompactList label="evidence" items={contract.evidenceRequired} />
      </div>
    </div>
  )
}

function CompactList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null

  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 8.5,
          letterSpacing: '1.2px',
          color: 'var(--bronze)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {items.slice(0, 5).map((item) => (
        <div key={item} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink3)', wordBreak: 'break-all' }}>
          {item}
        </div>
      ))}
    </div>
  )
}
