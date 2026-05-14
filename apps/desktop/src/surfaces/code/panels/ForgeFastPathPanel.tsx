import { useState, useTransition } from 'react'
import { PanelTitle } from '@atlas/ui'
import type {
  AtlasCodeForgeFastPathRunStatus,
  AtlasCodeForgeFastPathSnapshot,
} from '@atlas/domain'
import { btnPrimary } from './RightRailPrimitives'

interface ForgeFastPathPanelProps {
  obraId: string | null
  report: AtlasCodeForgeFastPathSnapshot | null
  status: AtlasCodeForgeFastPathRunStatus | null
  busy: boolean
  onRun: (mode?: 'prepare_only' | 'execute_async' | 'execute_sync') => Promise<void>
  onRefreshStatus: (runId?: string) => Promise<void>
  onResume: (runId?: string) => Promise<void>
}

const STATUS_COLOR: Record<string, { fg: string; bg: string; border: string }> = {
  blocked: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  failed: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  degraded: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  passed: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  completed: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  review_required: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  queued: { fg: 'var(--ink2)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
  running: { fg: 'var(--ink2)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
  prepared: { fg: 'var(--ink2)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
}

/**
 * Atlas Code Forge Operator Fast Path v2 · UI cell.
 *
 * Mostra lifecycle real: WorkItem, hashes, execution_id, review status,
 * repair, blockers, evidence count, next_action — sempre vindo do payload
 * real (sem mock).
 *
 * Doc: docs/engineering-knowledge-base/atlas-code-forge-fast-path-v1.md
 */
export function ForgeFastPathPanel({
  obraId,
  report,
  status,
  busy,
  onRun,
  onRefreshStatus,
  onResume,
}: ForgeFastPathPanelProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const disabled = !obraId || busy || pending
  const runId = status?.fastPathRunId ?? report?.fastPathRunId ?? null
  const lifecycleStatus = status?.status ?? report?.status ?? null
  const tone = lifecycleStatus ? STATUS_COLOR[lifecycleStatus] : undefined
  const reviewRequired = status?.reviewGate.reviewRequired === true
  const reviewStatus = status?.reviewGate.reviewStatus ?? 'not_required'
  const repairAvailable = status?.repair.repairAvailable === true
  const nextAction = status?.nextAction ?? report?.nextAction ?? null

  function trigger(mode: 'prepare_only' | 'execute_async' | 'execute_sync') {
    if (!obraId) return
    setError(null)
    startTransition(() => {
      void onRun(mode).catch((e) => setError(e instanceof Error ? e.message : String(e)))
    })
  }

  function refresh() {
    if (!runId) return
    setError(null)
    startTransition(() => {
      void onRefreshStatus(runId).catch((e) => setError(e instanceof Error ? e.message : String(e)))
    })
  }

  function resume() {
    if (!runId) return
    setError(null)
    startTransition(() => {
      void onResume(runId).catch((e) => setError(e instanceof Error ? e.message : String(e)))
    })
  }

  return (
    <div className="ops-section">
      <PanelTitle
        label="Forge Fast Path"
        meta={
          !obraId
            ? 'sem Obra'
            : lifecycleStatus
              ? `${lifecycleStatus}${report?.mode ? ' · '+report.mode : ''}`
              : 'pronto'
        }
      />
      <div
        style={{
          padding: '10px 12px',
          background: tone?.bg ?? 'var(--cream)',
          border: `1px solid ${tone?.border ?? 'var(--bronze-soft)'}`,
          borderRadius: 2,
          display: 'grid',
          gap: 8,
        }}
      >
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--ink2)', lineHeight: 1.4 }}>
          Orquestra Obra → WorkItem → Spec/Plan/Tasks → Forge Live Execution. Sem provider externo.
        </div>

        {status ? (
          <FastPathRunLifecycle status={status} report={report} />
        ) : report ? (
          <FastPathReportCard report={report} />
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => trigger('prepare_only')}
            style={{ ...btnPrimary, background: 'transparent', color: 'var(--bronze)' }}
          >
            preparar
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => trigger('execute_async')}
            style={{ ...btnPrimary }}
          >
            ✦ {runId ? 'continuar' : 'async'}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => trigger('execute_sync')}
            style={{ ...btnPrimary, background: 'transparent', color: 'var(--bronze)' }}
          >
            sync
          </button>
        </div>

        {runId ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            <button
              type="button"
              disabled={disabled}
              onClick={refresh}
              style={{ ...btnPrimary, background: 'transparent', color: 'var(--bronze)' }}
            >
              refresh
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={resume}
              style={{ ...btnPrimary, background: 'transparent', color: 'var(--bronze)' }}
            >
              resume
            </button>
            <button
              type="button"
              disabled={disabled || !reviewRequired}
              onClick={() => {
                /* abre comando review no estado canonico; UI real depende do controller forge/reviews */
                setError(reviewRequired ? null : 'review_not_required_yet')
              }}
              style={{
                ...btnPrimary,
                background: reviewRequired ? 'var(--bronze)' : 'transparent',
                color: reviewRequired ? 'var(--cream)' : 'var(--ink3)',
                opacity: reviewRequired ? 1 : 0.5,
              }}
            >
              {reviewRequired ? 'open review' : reviewStatus}
            </button>
          </div>
        ) : null}

        {!obraId ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red, #8a3025)', letterSpacing: '0.6px' }}>
            sem Obra · selecione uma para usar o Fast Path
          </div>
        ) : null}
        {error ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red, #8a3025)', wordBreak: 'break-all' }}>
            error · {error}
          </div>
        ) : null}
        {repairAvailable && status?.repair.suggestedRepairCommand ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bronze)', wordBreak: 'break-all' }}>
            repair · {status.repair.suggestedRepairCommand}
          </div>
        ) : null}
        {nextAction ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
            next · {nextAction}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function FastPathRunLifecycle({
  status,
  report,
}: {
  status: AtlasCodeForgeFastPathRunStatus
  report: AtlasCodeForgeFastPathSnapshot | null
}) {
  const progress = Math.max(0, Math.min(100, status.progressPercent))
  return (
    <div
      style={{
        padding: '8px 10px',
        background: 'var(--cream-deep, rgba(0,0,0,0.04))',
        border: '1px solid var(--hair-soft)',
        borderRadius: 2,
        display: 'grid',
        gap: 4,
      }}
    >
      <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '1.3px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
        {status.schemaVersion} · {status.status}
      </div>
      <div
        style={{
          height: 4,
          background: 'var(--hair-soft)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: status.status === 'blocked' || status.status === 'failed' ? 'var(--rec-red)' : 'var(--moss)',
            transition: 'width 240ms ease-out',
          }}
        />
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink2)' }}>
        stage · {status.currentStage} · {progress}%
      </div>
      {status.workItemCode ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink2)' }}>
          work item · {status.workItemCode} · {status.taskCount} tasks
        </div>
      ) : null}
      {status.specHash || status.planHash ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)', wordBreak: 'break-all' }}>
          spec · {status.specHash?.slice(0, 12) ?? '—'} · plan · {status.planHash?.slice(0, 12) ?? '—'}
        </div>
      ) : null}
      {status.executionId ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink2)', wordBreak: 'break-all' }}>
          execution · {status.executionId}
        </div>
      ) : null}
      {status.historyId ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink2)', wordBreak: 'break-all' }}>
          history · {status.historyId}
        </div>
      ) : null}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
        review · {status.reviewGate.reviewStatus}
        {' · '}
        repair · {status.repair.repairAvailable ? 'available' : 'not_needed'}
        {' · '}
        evidence · {status.evidenceRefCount}
        {' · '}
        ledger · {status.ledgerEventCount}
      </div>
      {status.blockers.length > 0 ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red)' }}>
          blockers · {status.blockers.join(' · ')}
        </div>
      ) : null}
      {report?.fastPathRunId ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink3)', wordBreak: 'break-all' }}>
          run · {report.fastPathRunId}
        </div>
      ) : null}
    </div>
  )
}

function FastPathReportCard({ report }: { report: AtlasCodeForgeFastPathSnapshot }) {
  const cmds = Object.entries(report.commands)
  return (
    <div
      style={{
        padding: '8px 10px',
        background: report.status === 'blocked' ? 'var(--rec-red-veil, rgba(138,48,37,0.08))' : 'var(--cream-deep, rgba(0,0,0,0.04))',
        border: `1px solid ${report.status === 'blocked' ? 'var(--rec-red, #8a3025)' : 'var(--hair-soft)'}`,
        borderRadius: 2,
        display: 'grid',
        gap: 4,
      }}
    >
      <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '1.3px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
        {report.schemaVersion} · {report.status}
      </div>
      {report.fastPathRunId ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink2)', wordBreak: 'break-all' }}>
          run · {report.fastPathRunId} · {report.progressPercent ?? 0}%
        </div>
      ) : null}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink2)' }}>
        mode · {report.mode}
      </div>
      {report.workItemCode ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink2)' }}>
          work item · {report.workItemCode} · {report.taskCount} tasks
        </div>
      ) : null}
      {report.executionId ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink2)', wordBreak: 'break-all' }}>
          execution · {report.executionId}
        </div>
      ) : null}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
        next · {report.nextAction}
      </div>
      {report.blockers.length > 0 ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red)' }}>
          blockers · {report.blockers.join(' · ')}
        </div>
      ) : null}
      {cmds.length > 0 ? (
        <details>
          <summary style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bronze)', cursor: 'pointer', letterSpacing: '1.1px', textTransform: 'uppercase' }}>
            commands · {cmds.length}
          </summary>
          <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
            {cmds.map(([key, value]) => (
              <div key={key} style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink2)', wordBreak: 'break-all' }}>
                <span style={{ color: 'var(--bronze)' }}>{key}</span> · {value}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}
