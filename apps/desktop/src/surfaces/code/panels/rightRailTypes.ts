import type { ReactNode } from 'react'
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

export type OpsTab = 'intake' | 'cockpit' | 'topology' | 'capacity' | 'plan' | 'verify' | 'evidence'

export interface RightRailContext {
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
  /**
   * SCOR-1 Programming Governance snapshot. `null` when the backend has not
   * persisted governance for the selected Obra — panels MUST render the
   * canonical empty state, never invented values.
   */
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

export interface RightRailPanelDefinition {
  id: OpsTab
  label: string
  priority: number
  render: (ctx: RightRailContext) => ReactNode
}
