import type { ReactNode } from 'react'
import type {
  AtlasCodeObservedSession,
  AtlasCodeObservedSessionDecideAction,
  AtlasCodeObservedSessionImportPayload,
  AtlasCodeProviderGovernance,
  AtlasCodeProviderOperatingRoom,
  AtlasCodeWorkPacket,
  AtlasCodeWorkPacketCreatePayload,
  AtlasCodeEnterpriseCertificationReport,
  AtlasCodeForgeCompletionClaim,
  AtlasCodeForgeFastPathRunStatus,
  AtlasCodeForgeReviewPacket,
  AtlasCodeForgeUxOrchestrator,
  AtlasCodeProviderArenaRunPayload,
  AtlasCodeProviderArenaRunResult,
  AtlasCodeProviderArenaSnapshot,
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
  AtlasSelfImprovementProposalBacklog,
  AtlasSelfImprovementProposalBacklogItem,
  AtlasSelfImprovementProposalBacklogFilters,
  AtlasSelfImprovementProposalCreatePayload,
  AtlasSelfImprovementProposalPrioritizePayload,
  AtlasSelfImprovementClosedLoop,
  AtlasSelfImprovementResultLedger,
  AtlasSelfImprovementResultEntry,
  AtlasSelfImprovementNextCycleRecommendation,
  AtlasSelfImprovementMeasureResultPayload,
  AtlasSelfImprovementTrustLedgerEntry,
  AtlasSelfConstructionSnapshot,
  BootSnapshot,
  CoreStatus,
  DecisionReceipt,
  Obra,
  ProgrammingGovernanceSnapshot,
  QualityGate,
  WorkStateSnapshot,
} from '@atlas/domain'

export type OpsTab =
  | 'forge'
  | 'intake'
  | 'cockpit'
  | 'verify'
  | 'evidence'
  | 'advanced'
  | 'self_improvement'
  | 'construction'
  | 'provider_arena'
  | 'operating_room'

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
  /**
   * Atlas Code Provider Arena UI v1 snapshot.
   *
   * Read-only projection consumed by the Provider Arena RightRail panel.
   * `null` when the snapshot endpoint is unreachable — the panel renders
   * an honest empty state and the panel CTA falls back to the local
   * smoke-only command suggestion.
   */
  providerArena: AtlasCodeProviderArenaSnapshot | null
  /**
   * Latest `run-arena` dispatch outcome (status, blockers, scorecard,
   * winner). Reset to `null` when the operator dismisses it or starts a
   * fresh configuration.
   */
  providerArenaLastResult: AtlasCodeProviderArenaRunResult | null
  selfImprovementGovernance: AtlasSelfImprovementGovernanceState | null
  selfImprovementActivation: AtlasSelfImprovementForgeActivationState | null
  selfImprovementActivationCockpit: AtlasSelfImprovementActivationCockpit | null
  selfImprovementProposalBacklog: AtlasSelfImprovementProposalBacklog | null
  selfImprovementClosedLoop: AtlasSelfImprovementClosedLoop | null
  selfImprovementResultLedger: AtlasSelfImprovementResultLedger | null
  selfImprovementNextCycle: AtlasSelfImprovementNextCycleRecommendation | null
  forgeRunHistoryReplay: WorkStateSnapshot['forgeRunHistoryReplay']
  forgeReview: WorkStateSnapshot['forgeReview']
  forgeReviewHistory: WorkStateSnapshot['forgeReviewHistory']
  checkpoint: WorkStateSnapshot['checkpoint']
  atlasCodeEnterpriseCertification: AtlasCodeEnterpriseCertificationReport | null
  /**
   * Atlas Self-Construction OS · Agent Control Plane snapshot.
   * Read-only diagnostic projection — `null` when the backend has not yet
   * exposed it; the panel renders an honest empty state.
   */
  selfConstruction: AtlasSelfConstructionSnapshot | null
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
  /**
   * Re-query the Provider Arena snapshot (registry + history + safety
   * promises). Read-only — never invokes a provider, never spawns a
   * subprocess, never spends tokens.
   */
  onRefreshProviderArena: (historyLimit?: number) => Promise<void>
  /**
   * Dispatch the canonical `atlas:forge:rivals run-arena` action via the
   * HTTP/Tauri bridge. Real-provider modes (`fair`/`full_power`) require
   * the three operator confirmations in the payload; `local_fake` never
   * spends tokens regardless. NEVER unblocks `external_rivals_certification`.
   */
  onRunProviderArena: (payload: AtlasCodeProviderArenaRunPayload) => Promise<AtlasCodeProviderArenaRunResult | null>
  /**
   * Clear the last `run-arena` result so the panel returns to the
   * configuration state.
   */
  onClearProviderArenaLastResult: () => void
  onRecordSelfImprovementTrustLedgerEntry: (payload: { outcome: string; proposalId?: string; reviewer?: string; reason?: string; area?: string }) => Promise<AtlasSelfImprovementTrustLedgerEntry | null>
  onRefreshSelfImprovementGovernance: () => Promise<void>
  onRefreshSelfImprovementActivationCockpit: (filters?: AtlasSelfImprovementActivationCockpitFilters) => Promise<void>
  onSelectSelfImprovementActivation: (activationId: string | null) => Promise<void>
  onCreateSelfImprovementForgeActivation: (payload: AtlasSelfImprovementActivationCreatePayload) => Promise<AtlasSelfImprovementActivationDetail | null>
  onAcceptSelfImprovementForgeActivation: (activationId: string, payload: AtlasSelfImprovementActivationAcceptPayload) => Promise<AtlasSelfImprovementActivationDetail | null>
  onRejectSelfImprovementForgeActivation: (activationId: string, payload: AtlasSelfImprovementActivationRejectPayload) => Promise<AtlasSelfImprovementActivationDetail | null>
  onRefreshSelfImprovementProposalBacklog: (filters?: AtlasSelfImprovementProposalBacklogFilters) => Promise<void>
  onCreateSelfImprovementProposal: (payload: AtlasSelfImprovementProposalCreatePayload) => Promise<AtlasSelfImprovementProposalBacklogItem | null>
  onEvaluateSelfImprovementProposal: (proposalId: string) => Promise<AtlasSelfImprovementProposalBacklogItem | null>
  onPrioritizeSelfImprovementProposal: (proposalId: string, payload?: AtlasSelfImprovementProposalPrioritizePayload) => Promise<AtlasSelfImprovementProposalBacklogItem | null>
  onRefreshSelfImprovementClosedLoop: (proposalId: string) => Promise<void>
  onMeasureSelfImprovementResult: (proposalId: string, payload: AtlasSelfImprovementMeasureResultPayload) => Promise<AtlasSelfImprovementResultEntry | null>
  onRefreshSelfImprovementResultLedger: (filters?: { grade?: string; proposalId?: string }) => Promise<void>
  onRefreshSelfImprovementNextCycle: (opts?: { proposalId?: string; latest?: boolean }) => Promise<void>
  onStartForgeLiveExecutionAsync: () => Promise<void>
  onRefreshForgeLiveExecutionAsync: () => Promise<void>
  onInspectForgeRunHistory: (historyId: string) => Promise<void>
  onCreateProgrammingWorkItem: () => Promise<void>
  onCompileProgrammingWorkItemSpecPlan: () => Promise<void>
  onReviewForgeRun: (decision?: 'approved' | 'rejected', comment?: string) => Promise<void>
  onRollbackForgePromotion: (promotionId?: string, comment?: string) => Promise<void>
  onCreateCheckpoint: () => Promise<void>
  onRunAtlasCodeEnterpriseCertification: () => Promise<void>
  /**
   * Re-query the Self-Construction Control Plane diagnostic projection.
   * Read-only — this handler MUST NOT trigger runtime, NEVER call providers,
   * NEVER spawn processes, NEVER advance slices.
   */
  onRefreshSelfConstruction: () => Promise<void>
  // ─────────────────────────────────────────────────────────────────────
  // Interactive Observed Provider Workflow (canon:
  // docs/engineering-knowledge-base/atlas-code-interactive-observed-provider-workflow-v1.md)
  providerGovernance: AtlasCodeProviderGovernance | null
  providerOperatingRoom: AtlasCodeProviderOperatingRoom | null
  onRefreshProviderOperatingRoom: () => Promise<void>
  onCreateWorkPacket: (payload: AtlasCodeWorkPacketCreatePayload) => Promise<AtlasCodeWorkPacket | null>
  onOpenObservedProviderSession: (
    workPacketId: string,
    providerId: string
  ) => Promise<AtlasCodeObservedSession | null>
  onTransitionObservedSession: (
    sessionId: string,
    nextState: 'running' | 'waiting_result_import'
  ) => Promise<AtlasCodeObservedSession | null>
  onImportObservedSessionResult: (
    sessionId: string,
    payload: AtlasCodeObservedSessionImportPayload
  ) => Promise<AtlasCodeObservedSession | null>
  onDecideObservedSession: (
    sessionId: string,
    action: AtlasCodeObservedSessionDecideAction,
    reason?: string
  ) => Promise<AtlasCodeObservedSession | null>
  onRunObservedSessionGates: (sessionId: string) => Promise<AtlasCodeObservedSession | null>
  onQuickOpenClaudeCodeObserved: (
    payload: AtlasCodeWorkPacketCreatePayload,
    providerId?: string
  ) => Promise<{ session: AtlasCodeObservedSession; packet: AtlasCodeWorkPacket } | null>
}

export interface RightRailPanelDefinition {
  id: OpsTab
  label: string
  priority: number
  render: (ctx: RightRailContext) => ReactNode
}
