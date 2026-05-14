import type { BootSnapshot } from '@atlas/domain'
import { ErrorBoundary } from '../../shell/ErrorBoundary'
import { LeftRail } from './leftRail/LeftRail'
import { MainStage } from './stage/MainStage'
import { ObraBar } from './obra/ObraBar'
import { RightRail } from './panels/RightRail'
import type { BridgeActions, BridgeSnapshot } from '../../hooks/useBridge'
import { CodeSurfaceLayout } from './CodeSurfaceLayout'
import { TerminalDock } from './terminal/TerminalDock'

interface CodeSurfaceProps {
  bridge: BridgeSnapshot & BridgeActions
  boot: BootSnapshot | null
}

/**
 * Atlas Code operational cabin.
 *
 * This is the composition boundary for the Code surface. It keeps App.tsx from
 * becoming the place where every future panel, rail, terminal placement and
 * execution mode is wired by hand.
 */
export function CodeSurface({ bridge: b, boot }: CodeSurfaceProps) {
  return (
    <CodeSurfaceLayout
      obra={<ObraBar obra={b.obra} onCreate={b.createObra} busy={b.busy} />}
      left={
        <LeftRail
          obras={b.obras}
          activeObraId={b.obra?.id ?? null}
          active={b.active}
          recent={b.recent}
          loading={b.loading}
          busy={b.busy}
          onSelectObra={b.selectObra}
        />
      }
      stage={
        <MainStage
          stages={b.sdd}
          messages={b.messages}
          receiptHash={b.receipt?.id ?? ''}
          loading={b.loading}
          busy={b.busy}
          hasObra={!!b.obra}
          programmingGovernance={b.programmingGovernance}
          onSend={b.sendIntent}
        />
      }
      right={
        <ErrorBoundary label="RightRail">
          <RightRail
            obra={b.obra}
            receipt={b.receipt}
            gates={b.gates}
            core={b.core}
            evidence={b.evidence}
            forgeLiveExecution={b.forgeLiveExecution}
            forgeLiveExecutionAsync={b.forgeLiveExecutionAsync}
            forgeLiveExecutionHistory={b.forgeLiveExecutionHistory}
            forgeTaskQueue={b.forgeTaskQueue}
            forgeFastPath={b.forgeFastPath}
            forgeFastPathStatus={b.forgeFastPathStatus}
            forgeReviewPacket={b.forgeReviewPacket}
            forgeCompletionClaim={b.forgeCompletionClaim}
            forgeWorkIntake={b.forgeWorkIntake}
            forgeProviderTopology={b.forgeProviderTopology}
            forgeContinuumCertification={b.forgeContinuumCertification}
            forgeProviderCapacity={b.forgeProviderCapacity}
            forgeProviderFailureMemory={b.forgeProviderFailureMemory}
            forgeRuntimeDispatch={b.forgeRuntimeDispatch}
            forgeRunHistoryReplay={b.forgeRunHistoryReplay}
            forgeReview={b.forgeReview}
            forgeReviewHistory={b.forgeReviewHistory}
            checkpoint={b.checkpoint}
            atlasCodeEnterpriseCertification={b.atlasCodeEnterpriseCertification}
            programmingGovernance={b.programmingGovernance}
            boot={boot}
            busy={b.busy}
            onSignReceipt={b.signReceipt}
            onRunGate={b.runGate}
            onRunForgeLiveExecution={b.runForgeLiveExecution}
            onRunForgeFastPath={b.runForgeFastPath}
            onRefreshForgeFastPathStatus={b.refreshForgeFastPathStatus}
            onResumeForgeFastPath={b.resumeForgeFastPath}
            onRefreshForgeReview={b.refreshForgeReview}
            onApproveForgeReview={b.approveForgeReview}
            onRejectForgeReview={b.rejectForgeReview}
            onRollbackForgeReview={b.rollbackForgeReview}
            onRefreshForgeWorkIntake={b.refreshForgeWorkIntake}
            onSaveForgeWorkIntake={b.saveForgeWorkIntake}
            onRefreshForgeProviderTopology={b.refreshForgeProviderTopology}
            onRefreshForgeContinuumCertification={b.refreshForgeContinuumCertification}
            onRefreshForgeProviderCapacity={b.refreshForgeProviderCapacity}
            onRecordForgeProviderFailure={b.recordForgeProviderFailure}
            onRefreshForgeRuntimeDispatch={b.refreshForgeRuntimeDispatch}
            onRunForgeRuntimeDispatch={b.runForgeRuntimeDispatch}
            onStartForgeLiveExecutionAsync={b.startForgeLiveExecutionAsync}
            onRefreshForgeLiveExecutionAsync={b.refreshForgeLiveExecutionAsync}
            onInspectForgeRunHistory={b.inspectForgeRunHistory}
            onCreateProgrammingWorkItem={b.createProgrammingWorkItem}
            onCompileProgrammingWorkItemSpecPlan={b.compileProgrammingWorkItemSpecPlan}
            onReviewForgeRun={b.reviewForgeRun}
            onRollbackForgePromotion={b.rollbackForgePromotion}
            onCreateCheckpoint={b.createCheckpoint}
            onRunAtlasCodeEnterpriseCertification={b.runAtlasCodeEnterpriseCertification}
          />
        </ErrorBoundary>
      }
      terminal={<TerminalDock initialCwd={b.core.workspacePath} ptyMode={b.core.pty} />}
    />
  )
}
