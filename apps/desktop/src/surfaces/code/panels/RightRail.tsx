import { useMemo, useState } from 'react'
import type {
  AtlasCodeEnterpriseCertificationReport,
  AtlasCodeForgeCompletionClaim,
  AtlasCodeForgeFastPathRunStatus,
  AtlasCodeForgeReviewPacket,
  AtlasCodeForgeWorkIntake,
  AtlasCodeForgeWorkIntakePayload,
  AtlasForgeContinuumCertificationSummary,
  AtlasForgeProviderCapacity,
  AtlasForgeProviderFailureMemory,
  AtlasForgeProviderFailureMemoryEvent,
  AtlasForgeProviderTopology,
  AtlasForgeRuntimeDispatchPlan,
  BootSnapshot,
  CoreStatus,
  DecisionReceipt,
  Obra,
  ProgrammingGovernanceSnapshot,
  QualityGate,
  WorkStateSnapshot,
} from '@atlas/domain'
import { RIGHT_RAIL_PANELS } from './rightRailRegistry'
import type { OpsTab, RightRailContext } from './rightRailTypes'

interface RightRailProps {
  obra: Obra | null
  receipt: DecisionReceipt | null
  gates: QualityGate[]
  core: CoreStatus
  evidence: WorkStateSnapshot['evidence']
  forgeLiveExecution: WorkStateSnapshot['forgeLiveExecution']
  forgeLiveExecutionAsync: WorkStateSnapshot['forgeLiveExecutionAsync']
  forgeLiveExecutionHistory: WorkStateSnapshot['forgeLiveExecutionHistory']
  forgeTaskQueue: WorkStateSnapshot['forgeTaskQueue']
  forgeFastPath: WorkStateSnapshot['forgeFastPath']
  forgeFastPathStatus: AtlasCodeForgeFastPathRunStatus | null
  forgeReviewPacket: AtlasCodeForgeReviewPacket | null
  forgeCompletionClaim: AtlasCodeForgeCompletionClaim | null
  forgeWorkIntake: AtlasCodeForgeWorkIntake | null
  forgeProviderTopology: AtlasForgeProviderTopology | null
  forgeContinuumCertification: AtlasForgeContinuumCertificationSummary | null
  forgeProviderCapacity: AtlasForgeProviderCapacity | null
  forgeProviderFailureMemory: AtlasForgeProviderFailureMemory | null
  forgeRuntimeDispatch: AtlasForgeRuntimeDispatchPlan | null
  forgeRunHistoryReplay: WorkStateSnapshot['forgeRunHistoryReplay']
  forgeReview: WorkStateSnapshot['forgeReview']
  forgeReviewHistory: WorkStateSnapshot['forgeReviewHistory']
  checkpoint: WorkStateSnapshot['checkpoint']
  atlasCodeEnterpriseCertification: AtlasCodeEnterpriseCertificationReport | null
  boot: BootSnapshot | null
  busy: boolean
  programmingGovernance: ProgrammingGovernanceSnapshot | null
  onSignReceipt: () => Promise<void>
  onRunGate: (gateId: string) => Promise<void>
  onRunForgeLiveExecution: () => Promise<void>
  onRunForgeFastPath: (mode?: 'prepare_only' | 'execute_async' | 'execute_sync') => Promise<void>
  onRefreshForgeFastPathStatus: (runId?: string) => Promise<void>
  onResumeForgeFastPath: (runId?: string) => Promise<void>
  onRefreshForgeReview: (runId?: string) => Promise<void>
  onApproveForgeReview: (runId?: string, payload?: { reviewer?: string; reason?: string }) => Promise<void>
  onRejectForgeReview: (runId?: string, payload?: { reviewer?: string; reason?: string }) => Promise<void>
  onRollbackForgeReview: (runId?: string, payload?: { reviewer?: string; reason?: string }) => Promise<void>
  onRefreshForgeWorkIntake: () => Promise<void>
  onSaveForgeWorkIntake: (payload: AtlasCodeForgeWorkIntakePayload) => Promise<void>
  onRefreshForgeProviderTopology: (options?: { simulateProviderFailure?: string; strategy?: string }) => Promise<void>
  onRefreshForgeContinuumCertification: (options?: { simulateProviderFailure?: string; strategy?: string; strict?: boolean }) => Promise<void>
  onRefreshForgeProviderCapacity: () => Promise<void>
  onRecordForgeProviderFailure: (payload: { provider: string; failureType: string; model?: string; role?: string; reason?: string }) => Promise<AtlasForgeProviderFailureMemoryEvent | null>
  onRefreshForgeRuntimeDispatch: () => Promise<void>
  onRunForgeRuntimeDispatch: (options?: { role?: string; simulateProviderFailure?: string; createChildReceipt?: boolean; fastPathRunId?: string }) => Promise<void>
  onStartForgeLiveExecutionAsync: () => Promise<void>
  onRefreshForgeLiveExecutionAsync: () => Promise<void>
  onInspectForgeRunHistory: (historyId: string) => Promise<void>
  onCreateProgrammingWorkItem: () => Promise<void>
  onCompileProgrammingWorkItemSpecPlan: () => Promise<void>
  onReviewForgeRun: (decision?: 'approved' | 'rejected', comment?: string) => Promise<void>
  onRollbackForgePromotion: (promotionId?: string, comment?: string) => Promise<void>
  onCreateCheckpoint: () => Promise<void>
  onRunAtlasCodeEnterpriseCertification: () => Promise<void>
}

/**
 * Operational governance rail.
 *
 * It owns tab selection only. Concrete panels live under the Code surface
 * registry so future panels can be added without growing this component.
 */
export function RightRail(props: RightRailProps) {
  const [tab, setTab] = useState<OpsTab>('plan')

  const ctx: RightRailContext = props
  const activePanel = useMemo(
    () => RIGHT_RAIL_PANELS.find((panel) => panel.id === tab) ?? RIGHT_RAIL_PANELS[0]!,
    [tab],
  )

  return (
    <aside className="right-rail">
      <nav className="ops-tabs" role="tablist" aria-label="Painéis operacionais">
        {RIGHT_RAIL_PANELS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            role="tab"
            aria-selected={tab === panel.id}
            className={`ops-tab${tab === panel.id ? ' on' : ''}`}
            onClick={() => setTab(panel.id)}
          >
            {panel.label}
          </button>
        ))}
      </nav>

      {activePanel.render(ctx)}
    </aside>
  )
}
