import type { ReactNode } from 'react'
import type {
  AtlasCodeEnterpriseCertificationReport,
  AtlasCodeForgeCompletionClaim,
  AtlasCodeForgeFastPathRunStatus,
  AtlasCodeForgeReviewPacket,
  AtlasCodeForgeUxOrchestrator,
  AtlasCodeForgeWorkIntake,
  AtlasCodeForgeWorkIntakePayload,
  AtlasForgeContinuumCertificationSummary,
  AtlasForgeProviderCapacity,
  AtlasForgeProviderDriverPlanPacket,
  AtlasForgeProviderDriverStatus,
  AtlasForgeProviderFailureMemory,
  AtlasForgeProviderFailureMemoryEvent,
  AtlasForgeProviderInvocationReceipt,
  AtlasForgeProviderInvocationSnapshot,
  AtlasForgeProviderTopology,
  AtlasForgeRuntimeDispatchPlan,
  AtlasSelfImprovementForgeActivationState,
  AtlasSelfImprovementGovernanceState,
  AtlasSelfImprovementActivationCockpit,
  AtlasSelfImprovementActivationCockpitFilters,
  AtlasSelfImprovementActivationDetail,
  AtlasSelfImprovementActivationAcceptPayload,
  AtlasSelfImprovementActivationRejectPayload,
  AtlasSelfImprovementActivationCreatePayload,
  AtlasSelfImprovementTrustLedgerEntry,
  BootSnapshot,
  CoreStatus,
  DecisionReceipt,
  Obra,
  ProgrammingGovernanceSnapshot,
  QualityGate,
  WorkStateSnapshot,
} from '@atlas/domain'

export type OpsTab = 'forge' | 'intake' | 'cockpit' | 'verify' | 'evidence' | 'advanced' | 'self_improvement'

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
  forgeProviderDriverStatus: AtlasForgeProviderDriverStatus | null
  forgeProviderInvocation: AtlasForgeProviderInvocationSnapshot | null
  forgeProviderInvocationReceipt: AtlasForgeProviderInvocationReceipt | null
  /**
   * Atlas Code Forge Human-First UX Orchestrator v1 read-model.
   *
   * Consolida state machine + primary action + safety summary + checklist em
   * uma única projeção canônica. `null` quando obra ausente ou backend ainda
   * não persistiu metadados — o painel humano usa esse `null` para renderizar
   * empty state honesto (NUNCA inventa estado).
  */
  forgeUxOrchestrator: AtlasCodeForgeUxOrchestrator | null
  selfImprovementGovernance: AtlasSelfImprovementGovernanceState | null
  selfImprovementActivation: AtlasSelfImprovementForgeActivationState | null
  selfImprovementActivationCockpit: AtlasSelfImprovementActivationCockpit | null
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
  onRefreshForgeProviderDrivers: () => Promise<void>
  onPlanForgeProviderDriver: (options?: { role?: string; dispatchId?: string }) => Promise<AtlasForgeProviderDriverPlanPacket | null>
  onRunForgeProviderInvocation: (options?: { role?: string; mode?: 'dry_run' | 'execute'; dispatchId?: string; confirmProviderCall?: boolean; confirmBudget?: boolean; confirmRuntimeDispatch?: boolean; timeoutSeconds?: number }) => Promise<void>
  onRefreshForgeProviderInvocationLatest: () => Promise<void>
  /**
   * Refresh handler for the Forge UX Orchestrator read-model. Required to keep
   * the human panel honest when state evolves (prepare/execute/review/etc).
   */
  onRefreshForgeUxOrchestrator: () => Promise<void>
  onRecordSelfImprovementTrustLedgerEntry: (payload: { outcome: string; proposalId?: string; reviewer?: string; reason?: string; area?: string }) => Promise<AtlasSelfImprovementTrustLedgerEntry | null>
  onRefreshSelfImprovementGovernance: () => Promise<void>
  onRefreshSelfImprovementActivationCockpit: (filters?: AtlasSelfImprovementActivationCockpitFilters) => Promise<void>
  onSelectSelfImprovementActivation: (activationId: string | null) => Promise<void>
  onCreateSelfImprovementForgeActivation: (payload: AtlasSelfImprovementActivationCreatePayload) => Promise<AtlasSelfImprovementActivationDetail | null>
  onAcceptSelfImprovementForgeActivation: (activationId: string, payload: AtlasSelfImprovementActivationAcceptPayload) => Promise<AtlasSelfImprovementActivationDetail | null>
  onRejectSelfImprovementForgeActivation: (activationId: string, payload: AtlasSelfImprovementActivationRejectPayload) => Promise<AtlasSelfImprovementActivationDetail | null>
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
