import type { ReactNode } from 'react'
import type {
  AtlasCodeEnterpriseCertificationReport,
  AtlasCodeForgeFastPathRunStatus,
  BootSnapshot,
  CoreStatus,
  DecisionReceipt,
  Obra,
  ProgrammingGovernanceSnapshot,
  QualityGate,
  WorkStateSnapshot,
} from '@atlas/domain'

export type OpsTab = 'plan' | 'verify' | 'evidence'

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
