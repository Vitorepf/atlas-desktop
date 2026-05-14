import { PanelTitle } from '@atlas/ui'
import type { DecisionReceipt } from '@atlas/domain'
import { btnPrimary, Row } from './RightRailPrimitives'
import type { RightRailContext } from './rightRailTypes'
import { CheckpointPanel } from './CheckpointPanel'
import { ContextPackPanel } from './ContextPackPanel'
import { ForgeAsyncExecutionPanel } from './ForgeAsyncExecutionPanel'
import { ForgeFastPathPanel } from './ForgeFastPathPanel'
import { ForgeTaskQueuePanel } from './ForgeTaskQueuePanel'
import { ForgeWorkspaceBanner } from './ForgeWorkspaceBanner'
import { TaskContractPanel } from './TaskContractPanel'
import { WorkItemInspector } from './WorkItemInspector'

export function PlanPanel({
  obra,
  receipt,
  core,
  boot,
  busy,
  checkpoint,
  forgeLiveExecution,
  forgeLiveExecutionAsync,
  forgeFastPath,
  forgeFastPathStatus,
  forgeTaskQueue,
  programmingGovernance,
  onCreateCheckpoint,
  onCreateProgrammingWorkItem,
  onCompileProgrammingWorkItemSpecPlan,
  onRunForgeFastPath,
  onRefreshForgeFastPathStatus,
  onResumeForgeFastPath,
  onRunForgeLiveExecution,
  onRefreshForgeLiveExecutionAsync,
  onStartForgeLiveExecutionAsync,
  onSignReceipt,
}: RightRailContext) {
  return (
    <section className="ops-panel">
      <ForgeWorkspaceBanner
        obra={obra}
        receipt={receipt}
        governance={programmingGovernance}
        liveExecution={forgeLiveExecution}
        busy={busy}
        onRunLiveExecution={onRunForgeLiveExecution}
      />
      <ForgeFastPathPanel
        obraId={obra?.id ?? null}
        report={forgeFastPath}
        status={forgeFastPathStatus}
        busy={busy}
        onRun={onRunForgeFastPath}
        onRefreshStatus={onRefreshForgeFastPathStatus}
        onResume={onResumeForgeFastPath}
      />
      <ForgeAsyncExecutionPanel
        execution={forgeLiveExecutionAsync}
        busy={busy}
        onStart={() => void onStartForgeLiveExecutionAsync()}
        onRefresh={() => void onRefreshForgeLiveExecutionAsync()}
      />
      <ContextPackPanel liveExecution={forgeLiveExecution} />
      <ForgeTaskQueuePanel
        queue={forgeTaskQueue}
        busy={busy}
        onCreateWorkItem={onCreateProgrammingWorkItem}
        onCompileSpecPlan={onCompileProgrammingWorkItemSpecPlan}
      />
      <TaskContractPanel liveExecution={forgeLiveExecution} />
      <CheckpointPanel
        checkpoint={checkpoint}
        busy={busy}
        onCreateCheckpoint={onCreateCheckpoint}
      />
      <WorkItemInspector governance={programmingGovernance} />

      <div className="ops-section">
        <PanelTitle
          label="Decision Receipt"
          meta={receipt?.signature ? 'assinado' : receipt?.id ? 'aguardando assinatura' : 'sem receipt ainda'}
        />
        {receipt?.id ? (
          <>
            <ReceiptCard receipt={receipt} />
            {!receipt.signature && (
              <button
                type="button"
                onClick={() => void onSignReceipt()}
                disabled={busy}
                style={{ ...btnPrimary, marginTop: 8, width: '100%' }}
              >
                {busy ? 'assinando…' : '✦ assinar receipt'}
              </button>
            )}
          </>
        ) : (
          <EmptyReceipt />
        )}
      </div>

      <div className="ops-section">
        <PanelTitle label="Core local" meta={core.mode} />
        <dl style={{ margin: 0 }}>
          <Row k="pty" v={core.pty} />
          <Row k="signing" v={core.signing} />
          <Row k="db" v={core.dbPath || '—'} />
          <Row k="workspace" v={core.workspacePath || '—'} />
        </dl>
      </div>

      {boot && (
        <div className="ops-section">
          <PanelTitle label="Boot snapshot" meta={boot.status} />
          <dl style={{ margin: 0 }}>
            <Row k="kernel" v={`${boot.kernel.service} · ${boot.kernel.version}`} />
            <Row k="env" v={boot.kernel.env} />
            <Row k="db" v={boot.kernel.dbConnected ? 'connected' : 'offline'} ok={boot.kernel.dbConnected} />
            <Row k="storage" v={boot.kernel.storageWritable ? 'writable' : 'read-only'} ok={boot.kernel.storageWritable} />
            <Row k="repo docs" v={boot.cartography.repoReadable ? boot.cartography.repoRoot : 'missing'} ok={boot.cartography.repoReadable} />
            <Row k="vault" v={boot.cartography.vaultReadable ? boot.cartography.vaultRoot : 'missing'} ok={boot.cartography.vaultReadable} />
            <Row k="queue" v={`${boot.queue.connection} · ${boot.queue.pending} pending · ${boot.queue.failed} failed`} />
            <Row k="providers" v={`${boot.providers.available} ok · ${boot.providers.degraded} degraded`} />
          </dl>
        </div>
      )}
    </section>
  )
}

function EmptyReceipt() {
  return (
    <div
      style={{
        padding: '14px 12px',
        background: 'var(--cream)',
        border: '1px dashed var(--bronze-soft)',
        borderRadius: 2,
        fontFamily: 'var(--serif)',
        fontStyle: 'italic',
        fontSize: 13,
        color: 'var(--ink3)',
        textAlign: 'center',
      }}
    >
      aguardando primeira execução
      <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 6 }}>
        receipt aparece após a primeira Decision do Kernel.
      </div>
    </div>
  )
}

function ReceiptCard({ receipt }: { receipt: DecisionReceipt }) {
  return (
    <div
      style={{
        padding: '11px 12px',
        background: 'var(--cream)',
        border: '1px solid var(--bronze-soft)',
        borderRadius: 2,
      }}
    >
      <Row k="id" v={receipt.id} mono />
      {receipt.obraId && <Row k="obra" v={receipt.obraId} />}
      {receipt.primary && <Row k="primary" v={receipt.primary} />}
      <Row
        k="confidence"
        v={`${(receipt.confidence ?? 'unknown').toUpperCase()} · ${(receipt.confidenceScore ?? 0).toFixed(2)}`}
        ok
      />
      <Row
        k="budget"
        v={`est $${(receipt.budgetEstUsd ?? 0).toFixed(3)} · used $${(receipt.budgetUsedUsd ?? 0).toFixed(2)}`}
      />
      <Row k="fallback" v={(receipt.fallbackChain ?? []).join(' → ') || '—'} />
      <Row k="signature" v={receipt.signature ? 'assinado ✓' : '— pendente'} ok={!!receipt.signature} />
    </div>
  )
}
