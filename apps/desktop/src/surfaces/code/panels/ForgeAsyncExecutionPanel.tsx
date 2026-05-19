import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

interface ForgeAsyncExecutionPanelProps {
  execution: WorkStateSnapshot['forgeLiveExecutionAsync']
  busy: boolean
  onStart: () => void
  onRefresh: () => void
}

export function ForgeAsyncExecutionPanel({ execution, busy, onStart, onRefresh }: ForgeAsyncExecutionPanelProps) {
  const status = execution?.status ?? 'not_started'
  const completed = status === 'completed' || status === 'passed'
  const active = status === 'queued' || status === 'running'

  return (
    <div className="ops-section">
      <PanelTitle label="Forge Async" meta={status} />
      {execution ? (
        <div
          style={{
            display: 'grid',
            gap: 6,
            padding: '9px 10px',
            background: completed ? 'var(--moss-veil)' : 'var(--cream)',
            border: completed ? '1px solid var(--moss-soft)' : '1px solid var(--bronze-soft)',
            borderRadius: 2,
          }}
        >
          <dl style={{ margin: 0 }}>
            <Row k="execution" v={execution.executionId} mono />
            <Row k="queue" v={execution.jobDispatched ? 'dispatched' : 'local'} ok={!!execution.jobDispatched} />
            <Row k="status" v={status} ok={completed} />
            <Row
              k="completion"
              v={execution.completionClaimAllowed ? 'allowed' : 'pending'}
              ok={!!execution.completionClaimAllowed}
            />
            {execution.updatedAt ? <Row k="updated" v={execution.updatedAt} mono /> : null}
            {execution.runId ? <Row k="run" v={execution.runId} mono /> : null}
          </dl>
          {execution.error ? (
            <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 10, color: 'var(--rec-red, #8a3025)' }}>
              {execution.error}
            </div>
          ) : null}
          {execution.command ? (
            <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9.5, color: 'var(--ink3)', wordBreak: 'break-all' }}>
              $ {execution.command}
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyText>nenhuma execução assíncrona iniciada.</EmptyText>
      )}
      <button
        type="button"
        onClick={() => onStart()}
        disabled={busy || active}
        style={{
          ...btnPrimary,
          width: '100%',
          marginTop: 8,
          opacity: busy || active ? 0.55 : 1,
          cursor: busy || active ? 'default' : 'pointer',
        }}
      >
        {active ? 'execução em andamento' : busy ? 'iniciando...' : 'iniciar forge async'}
      </button>
      <button
        type="button"
        onClick={() => onRefresh()}
        disabled={busy || !execution?.executionId}
        style={{
          ...btnPrimary,
          width: '100%',
          marginTop: 6,
          color: 'var(--ink)',
          border: '1px solid var(--bronze-soft)',
          background: 'transparent',
          opacity: busy || !execution?.executionId ? 0.55 : 1,
          cursor: busy || !execution?.executionId ? 'default' : 'pointer',
        }}
      >
        atualizar status
      </button>
    </div>
  )
}
