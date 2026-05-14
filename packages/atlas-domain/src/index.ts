/**
 * @atlas/domain
 *
 * TypeScript types mirroring atlas-server contracts. The Kernel decides; this
 * package only types what crosses the bridge. No business rules live here.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Core (atlas-tauri command bridge)

export type CoreMode = 'tauri-core' | 'browser-offline'

export interface CoreStatus {
  mode: CoreMode
  dbPath: string
  workspacePath: string
  pty: 'unavailable' | 'portable-pty'
  signing: 'unavailable' | 'ed25519'
}

// ──────────────────────────────────────────────────────────────────────────────
// Boot snapshot · GET /atlas-code/boot

export interface BootSnapshot {
  status: 'ready' | 'degraded' | 'unconfigured'
  generatedAt: string
  kernel: {
    service: string
    version: string
    env: string
    phpVersion: string
    dbConnected: boolean
    dbError: string | null
    storagePath: string
    storageWritable: boolean
    ts: string
  }
  providers: {
    available: number
    degraded: number
    source: string
  }
  mcp: {
    server: string
    protocolVersion: string
    httpEnabled: boolean
    status: 'active' | 'disabled' | 'degraded'
    transport: string
  }
  cartography: {
    repoRoot: string
    repoReadable: boolean
    vaultRoot: string
    vaultReadable: boolean
  }
  workspace: {
    cwd: string
    isGit: boolean
  }
  queue: {
    connection: string
    pending: number
    failed: number
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// MCP pill · GET /atlas-code/mcp/status

export interface McpToolBrief {
  name: string
  summary: string | null
}

export interface McpStatus {
  server: string
  status: 'active' | 'disabled' | 'degraded'
  protocolVersion: string
  transport: string
  httpEnabled: boolean
  toolsCount: number
  tools: McpToolBrief[]
  docsIndexed: number
  symbolsIndexed: number
  lastCall: {
    tool: string
    operatorId: string
    durationMs: number
    at: string | null
  } | null
  freshness: {
    indexedAt: string | null
    drift: string
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Obras (Atlas Server: Atlas Project)

export type ObraStatus = 'active' | 'idle' | 'archived'

export interface Obra {
  id: string
  title: string
  objective: string
  status: ObraStatus
  workspacePath: string
  createdAt: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Sessions (Atlas Server: AiThread)

export type SessionOrigin = 'cli' | 'manual' | 'voice'

export interface Session {
  id: string
  obraId: string
  threadId: string
  title: string
  status: 'running' | 'paused' | 'done' | 'failed'
  turns: number
  durationMs: number
  origin: SessionOrigin
  snapshot?: {
    sizeKb: number
    intentPreserved: boolean
    evidenceRefs: number
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SDD pipeline · 6 estágios canônicos (com `learn`)

export type SddStageId = 'context' | 'spec' | 'plan' | 'execute' | 'verify' | 'learn'

export type SddStageState = 'todo' | 'now' | 'done' | 'blocked'

export interface SddStage {
  id: SddStageId
  label: string
  state: SddStageState
}

// Snapshot canon coming from /atlas-code/works/{id}/state.sdd
export interface WorkStateSnapshot {
  workId: string
  workTitle: string
  workObjective: string
  workStatus: ObraStatus
  sessions: Array<{
    id: string
    title: string
    status: 'running' | 'paused' | 'done' | 'failed'
    turns: number
    lastMessageAt: string | null
  }>
  activeThreadId: string | null
  messages: Message[]
  sdd: {
    stage: SddStageId | 'idle'
    steps: SddStage[]
  }
  receipt: DecisionReceipt | null
  gates: QualityGate[]
  evidence: Array<{
    id: string
    kind: string
    summary: string
    createdAt: string | null
  }>
  forgeLiveExecution: ForgeLiveExecutionSnapshot | null
  forgeLiveExecutionAsync: ForgeLiveExecutionAsync | null
  forgeLiveExecutionHistory: ForgeLiveExecutionHistory | null
  forgeTaskQueue: ForgeTaskQueue | null
  forgeFastPath: AtlasCodeForgeFastPathSnapshot | null
  forgeRunHistoryReplay: ForgeRunHistoryReplay | null
  forgeReview: AtlasCodeForgeReviewArtifact | null
  forgeReviewHistory: AtlasCodeForgeReviewHistory | null
  forgeReviewPacket: AtlasCodeForgeReviewPacket | null
  forgeCompletionClaim: AtlasCodeForgeCompletionClaim | null
  forgeWorkIntake: AtlasCodeForgeWorkIntake | null
  forgeProviderTopology: AtlasForgeProviderTopology | null
  forgeContinuumCertification: AtlasForgeContinuumCertificationSummary | null
  forgeProviderCapacity: AtlasForgeProviderCapacity | null
  forgeProviderFailureMemory: AtlasForgeProviderFailureMemory | null
  selfImprovementGovernance: AtlasSelfImprovementGovernanceState | null
  selfImprovementActivation: AtlasSelfImprovementForgeActivationState | null
  forgeRuntimeDispatch: AtlasForgeRuntimeDispatchPlan | null
  forgeProviderDriverStatus: AtlasForgeProviderDriverStatus | null
  forgeProviderInvocation: AtlasForgeProviderInvocationSnapshot | null
  forgeProviderInvocationReceipt: AtlasForgeProviderInvocationReceipt | null
  forgeUxOrchestrator: AtlasCodeForgeUxOrchestrator | null
  obraCommandCenter: AtlasCodeObraCommandCenter | null
  checkpoint: AtlasCodeCheckpointArtifact | null
  atlasCodeEnterpriseCertification: AtlasCodeEnterpriseCertificationReport | null
  programmingGovernance: ProgrammingGovernanceSnapshot | null
  generatedAt: string
}

/**
 * Atlas Forge Runtime Dispatch Plan (governed read-model).
 *
 * Schema: atlas.forge.runtime_dispatch_plan.v1
 *
 * The dispatcher NEVER calls external providers and NEVER promotes completion
 * claim. It only prepares a governed dispatch plan with the role/provider/model
 * resolved from the Atlas Decide Decision Receipt; provider invocation requires
 * explicit operator approval downstream.
 */
export type AtlasForgeRuntimeDispatchStatus =
  | 'dispatch_planned'
  | 'blocked'
  | 'fallback_child_receipt_required'
  | 'provider_capacity_exhausted'
  | 'no_dispatch_history'
  | string

export interface AtlasForgeRuntimeDispatchPlan {
  schemaVersion: string
  status: AtlasForgeRuntimeDispatchStatus
  obraId: string | null
  obraPresent: boolean
  dispatchId: string | null
  fastPathRunId: string | null
  decisionReceiptId: string | null
  decisionReceiptHash: string | null
  childDecisionReceiptId: string | null
  childDecisionReceiptHash: string | null
  providerTopologyId: string | null
  decisionSource: string | null
  role: string | null
  provider: string | null
  model: string | null
  runtimeDispatchAllowed: boolean
  executionMode: string | null
  fallbackEventId: string | null
  fallbackFailureType: string | null
  externalProviderCall: boolean
  providerInvocationPlanned: boolean
  requiresProviderApproval: boolean
  qualityGates: string[]
  reviewCompletionGatePreserved: boolean
  completionClaimPromoted: boolean
  evidenceRefs: string[]
  blockers: string[]
  nextAction: string | null
  generatedAt: string | null
  recordedAt: string | null
  note: string | null
  separatedFrom: string
}

/**
 * Atlas Forge Provider Driver Status (router v2 snapshot).
 *
 * Schema: atlas.forge.provider_driver_router_status.v1
 *
 * The driver status is a pure read-model — never calls an external provider.
 * Each entry follows `atlas.forge.provider_driver_config_status.v1`.
 */
export interface AtlasForgeProviderDriverEntry {
  schemaVersion: string
  provider: string
  configured: boolean
  runtimePresent: boolean
  binaryPath: string | null
  authState: string
  modelPrefixes: string[]
  allowedBinaries: string[]
  blockers: string[]
  externalProviderCallPossible: boolean
  providerTokensMaySpend: boolean
  note: string | null
}

export interface AtlasForgeProviderDriverStatus {
  schemaVersion: string
  drivers: AtlasForgeProviderDriverEntry[]
  configuredDrivers: string[]
  note: string | null
}

/**
 * Atlas Forge Real Provider Driver Plan Packet.
 *
 * Schema: atlas.forge.provider_driver_plan_packet.v1
 *
 * Wraps an invocation dry-run + driver_status + driver_plan.
 */
export interface AtlasForgeProviderDriverPlanPacket {
  schemaVersion: string
  invocation: Record<string, unknown>
  driverStatus: Record<string, unknown>
  driverPlan: Record<string, unknown>
  externalProviderCall: boolean
  note: string | null
}

/**
 * Slim snapshot of the latest provider invocation. Full schema lives in PHP;
 * the desktop only needs the structurally relevant fields to render.
 *
 * Schema: atlas.forge.provider_invocation.v1
 */
export interface AtlasForgeProviderInvocationSnapshot {
  schemaVersion: string
  status: string
  mode: string
  obraId: string | null
  invocationId: string | null
  dispatchId: string | null
  role: string | null
  provider: string | null
  model: string | null
  providerCalled: boolean
  externalProviderCall: boolean
  providerTokensSpent: boolean | string
  exitCode: number | null
  durationMs: number | null
  stdoutHash: string | null
  stderrHash: string | null
  outputExcerpt: string | null
  completionClaimPromoted: boolean
  reviewCompletionGatePreserved: boolean
  blockers: string[]
  nextAction: string | null
  separatedFrom: string
  note: string | null
}

/**
 * Schema: atlas.forge.provider_invocation_receipt.v1
 */
export interface AtlasForgeProviderInvocationReceipt {
  schemaVersion: string
  receiptId: string
  receiptHash: string
  invocationId: string | null
  status: string
  mode: string
  provider: string | null
  model: string | null
  providerCalled: boolean
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  exitCode: number | null
  completionClaimPromoted: boolean
  separatedFrom: string
}

/**
 * Atlas Code Forge UX Orchestrator (human-first read-model).
 *
 * Schema: atlas.code.forge_ux_orchestrator.v1
 *
 * Consolidates intake + fast path + topology + dispatch + driver status +
 * invocation + review + completion into a single state machine that drives
 * the desktop Forge panel. NEVER promotes completion claim.
 */
export type AtlasCodeForgeUxState =
  | 'no_obra'
  | 'intake_required'
  | 'intake_ready'
  | 'ready_to_define'
  | 'ready_to_prepare'
  | 'prepared'
  | 'ready_to_execute'
  | 'running'
  | 'waiting_worker'
  | 'waiting_provider_confirmation'
  | 'waiting_budget_confirmation'
  | 'waiting_runtime_dispatch_confirmation'
  | 'waiting_review'
  | 'repair_required'
  | 'blocked'
  | 'blocked_scope'
  | 'blocked_definition'
  | 'blocked_provider'
  | 'blocked_driver'
  | 'blocked_capacity'
  | 'blocked_governance'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'rolled_back'
  | 'idle'
  | string

export type AtlasCodeForgeUxActionKind =
  | 'bind_obra'
  | 'open_intake'
  | 'fix_scope'
  | 'prepare_fast_path'
  | 'execute_fast_path'
  | 'refresh_status'
  | 'wait_worker'
  | 'confirm_provider'
  | 'confirm_budget'
  | 'confirm_runtime_dispatch'
  | 'open_review'
  | 'plan_repair'
  | 'view_evidence'
  | 'open_advanced'
  | string

export type AtlasCodeChatMessageKind =
  | 'definition'
  | 'command'
  | 'question'
  | 'decision'
  | 'note'
  | 'restriction'
  | 'acceptance_criterion'
  | string

/**
 * Atlas Code Human Interface Upgrade v2.
 *
 * Canonical translation of a technical blocker into the human-facing block the
 * Forge panel renders (title + detail + suggested action + technical detail).
 */
export interface AtlasCodeForgeUxBlockerTranslation {
  kind: string | null
  humanTitle: string | null
  humanDetail: string | null
  suggestedActionLabel: string | null
  suggestedActionKind: AtlasCodeForgeUxActionKind | null
  technicalDetail: string | null
  filesOutOfScope: string[]
  isBlocking: boolean
}

export interface AtlasCodeForgeUxCompletionGating {
  reviewRequired: boolean
  finalCompletionAllowed: boolean
  approveButtonVisible: boolean
  rejectButtonVisible: boolean
  rollbackButtonVisible: boolean
}

export interface AtlasCodeForgeUxEvidenceSeparation {
  obraEvidenceRefCount: number
  obraLedgerEventCount: number
  systemCertificationVisible: boolean
  note: string
}

export interface AtlasCodeForgeUxOrchestrator {
  schemaVersion: string
  generatedAt: string
  obraId: string | null
  obraPresent: boolean
  state: AtlasCodeForgeUxState
  humanStatusLabel: string
  humanStatusDetail: string
  primaryActionLabel: string
  primaryActionKind: AtlasCodeForgeUxActionKind
  primaryActionEnabled: boolean
  primaryActionDisabledReason: string | null
  nextSafeStep: string
  blockers: string[]
  blockerTranslation: AtlasCodeForgeUxBlockerTranslation
  definitionStatus: 'ready' | 'incomplete' | 'blocking_execution' | string
  completionGating: AtlasCodeForgeUxCompletionGating
  evidenceSeparation: AtlasCodeForgeUxEvidenceSeparation
  chatMessageKinds: AtlasCodeChatMessageKind[]
  safetySummary: {
    externalProviderCall: boolean
    providerTokensSpent: number | string
    completionClaimPromoted: boolean
    reviewCompletionGatePreserved: boolean
  }
  providerSummary: {
    provider: string | null
    model: string | null
    decisionSource: string
    capacityState: string
    driverConfigured: boolean
  }
  evidenceSummary: {
    evidenceRefCount: number
    ledgerEventCount: number
  }
  reviewSummary: {
    reviewRequired: boolean
    reviewStatus: string
    humanApproved: boolean
    finalCompletionAllowed: boolean
  }
  checklist: {
    obra: boolean
    intake: boolean
    specPlan: boolean
    provider: boolean
    execution: boolean
    review: boolean
    evidence: boolean
  }
  progressPercent: number
  signals: Record<string, unknown>
  advancedRefs: Record<string, unknown>
  externalProviderCall: boolean
  providerTokensSpent: boolean | string
  completionClaimPromoted: boolean
  separatedFrom: string
  note: string | null
}

/**
 * Atlas Code Obra Command Center v1.
 *
 * Schema: atlas.code.obra_command_center.v1
 *
 * Read-model canônico que substitui o "centro vazio" do Atlas Code por uma
 * cabine humana viva: lifecycle de 8 fases, progresso duplo (preparação vs
 * entrega comprovada), decision inbox, trust summary, operational health
 * honesto e safety strip. Nunca chama provider externo. Nunca promove
 * completion claim.
 */
export type AtlasCodeObraCommandCenterStatus = 'ok' | 'blocked' | 'no_obra' | string

export type AtlasCodeObraCommandCenterPhaseKey =
  | 'intake'
  | 'architecture'
  | 'forge_prep'
  | 'build'
  | 'review'
  | 'proofs'
  | 'decision'
  | 'learning'
  | string

export type AtlasCodeObraCommandCenterPhaseStatus =
  | 'not_started'
  | 'ready'
  | 'running'
  | 'blocked'
  | 'passed'
  | 'needs_human'
  | 'completed'
  | string

export interface AtlasCodeObraCommandCenterPhase {
  key: AtlasCodeObraCommandCenterPhaseKey
  label: string
  status: AtlasCodeObraCommandCenterPhaseStatus
  description: string
  evidenceCount: number
  blockerCount: number
  nextAction: string
}

export interface AtlasCodeObraCommandCenterMilestone {
  key: string
  label: string
  reached: boolean
  reachedAt: string | null
}

export interface AtlasCodeObraCommandCenterProgressItem {
  key: string
  label: string
  reached: boolean
}

export interface AtlasCodeObraCommandCenterProgress {
  label: string
  reached: number
  total: number
  percent: number
  breakdown: AtlasCodeObraCommandCenterProgressItem[]
}

export type AtlasCodeObraCommandCenterRisk = 'none' | 'low' | 'medium' | 'high' | string

export interface AtlasCodeObraCommandCenterDecision {
  key: string
  label: string
  reason: string
  risk: AtlasCodeObraCommandCenterRisk
  recommendedAction: string
  allowedActions: string[]
}

export interface AtlasCodeObraCommandCenterBlockerSummary {
  count: number
  kinds: string[]
  primaryKind: string | null
  primaryHumanTitle: string | null
}

export interface AtlasCodeObraCommandCenterOperationalHealth {
  queueName: string
  queueStatus: 'idle' | 'queued' | 'running' | 'stale' | 'unknown' | string
  workerStatus: 'idle' | 'running' | 'unknown' | string
  lastEventAt: string | null
  currentStateAgeSeconds: number | null
  heartbeatStatus: 'ok' | 'stale' | 'unknown' | string
  stale: boolean
  watchdogNextAction: string | null
  humanMessage: string
  note: string
}

export interface AtlasCodeObraCommandCenterTrustSummary {
  evidenceStrength: 'none' | 'weak' | 'partial' | 'strong' | string
  testsRunCount: number
  receiptsCount: number
  ledgerEventsCount: number
  missingEvidence: string[]
  riskLevel: 'low' | 'medium' | 'high' | string
  claimStatus: string
  reviewStatus: string
  providerExternalCall: boolean
  tokenSpend: boolean
  note: string
}

export interface AtlasCodeObraCommandCenterEvidenceDigest {
  obraEvidenceRefCount: number
  obraLedgerEventCount: number
  latestEvidenceAt: string | null
  systemCertificationsSeparated: boolean
  note: string
}

export interface AtlasCodeObraCommandCenter {
  schemaVersion: string
  status: AtlasCodeObraCommandCenterStatus
  generatedAt: string
  obraId: string | null
  obraPresent: boolean
  obraTitle: string | null
  objectiveSummary: string | null
  humanStatusLabel: string
  humanStatusDetail: string
  currentPhase: AtlasCodeObraCommandCenterPhaseKey | null
  nextPhase: AtlasCodeObraCommandCenterPhaseKey | null
  nextSafeAction: string
  primaryActionKind: AtlasCodeForgeUxActionKind | string
  primaryActionLabel: string
  primaryActionEnabled: boolean
  primaryActionDisabledReason: string | null
  lifecyclePhases: AtlasCodeObraCommandCenterPhase[]
  milestones: AtlasCodeObraCommandCenterMilestone[]
  readinessProgress: AtlasCodeObraCommandCenterProgress
  provenDeliveryProgress: AtlasCodeObraCommandCenterProgress
  decisionInbox: AtlasCodeObraCommandCenterDecision[]
  blockerSummary: AtlasCodeObraCommandCenterBlockerSummary
  blockerTranslation: AtlasCodeForgeUxBlockerTranslation
  operationalHealth: AtlasCodeObraCommandCenterOperationalHealth
  trustSummary: AtlasCodeObraCommandCenterTrustSummary
  evidenceDigest: AtlasCodeObraCommandCenterEvidenceDigest
  providerSummary: {
    provider: string | null
    model: string | null
    decisionSource: string
    capacityState: string
    driverConfigured: boolean
  }
  safetySummary: {
    externalProviderCall: boolean
    providerTokensSpent: number | string
    completionClaimPromoted: boolean
    reviewCompletionGatePreserved: boolean
    externalRivalsCertification: string
  }
  advancedRefs: Record<string, unknown>
  chatMessageKinds: AtlasCodeChatMessageKind[]
  externalProviderCall: boolean
  providerTokensSpent: boolean | string
  completionClaimPromoted: boolean
  reviewGatePreserved: boolean
  separatedFrom: string
  note: string | null
}

export interface AtlasCodeCheckpointArtifact {
  schemaVersion?: string
  checkpointId: string
  obraId: string
  reason?: string | null
  status: 'ready' | 'blocked' | 'degraded' | string
  createdAt?: string | null
  evidenceId?: string | null
  resume: {
    resumeReady: boolean
    nextSafeAction: string
    summary: string
    sourceAuthority?: string | null
  }
  stateRefs: {
    activeThreadId?: string | null
    sessionCount?: number
    messageCount?: number
    decisionReceiptId?: string | null
    projectStatus?: string | null
    projectUpdatedAt?: string | null
  }
  forgeLiveExecution?: {
    status?: string | null
    lastRunAt?: string | null
    contextPackHash?: string | null
    contextCompleteness?: string | null
    diffScopeStatus?: string | null
    scopeStatus?: string | null
    completionClaimAllowed?: boolean
    evidenceRefCount?: number
    ledgerEventCount?: number
  }
  risk: {
    remainingBlockers: string[]
    pendingApprovals: string[]
    residualRisk: string
  }
}

export interface ForgeLiveExecutionSnapshot {
  schemaVersion?: string
  status: 'passed' | 'blocked' | 'degraded' | string
  obraId?: string | null
  executionSource?: string | null
  command?: string | null
  strictCommand?: string | null
  simulateFailure?: boolean
  lastRunAt?: string | null
  stageCount?: number
  evidenceRefCount?: number
  ledgerEventCount?: number
  remainingBlockers: string[]
  externalProviderCall?: boolean
  runId?: string | null
  evidenceId?: string | null
  contextPack?: {
    schemaVersion?: string
    contextCompleteness?: string | null
    rankedRefCount?: number | null
    presentRefCount?: number | null
    contextPackHash?: string | null
    rankedRefs: ContextPackRef[]
  }
  stageTimeline?: ForgeStageTimelineArtifact
  evidencePack?: ForgeEvidencePackArtifact
  repairLoop?: {
    status?: string | null
    triggered?: boolean
    planStatus?: string | null
    nextAction?: string | null
  }
  taskContract?: ForgeTaskContractArtifact
  diffScope?: DiffScopeArtifact
  governedExecution?: ForgeGovernedExecutionArtifact | null
}

export interface AtlasCodeEnterpriseCertificationReport {
  schemaVersion?: string
  generatedAt?: string | null
  certificationId?: string | null
  status: 'passed' | 'blocked' | string
  objective?: string | null
  inputs: {
    obraId?: string | null
    requiresObra: boolean
    workspacePathHash?: string | null
    targetFile?: string | null
    externalProviderCall: boolean
  }
  stageSummary: {
    total: number
    passed: number
    blocked: number
    skipped: number
  }
  stages: AtlasCodeEnterpriseCertificationStage[]
  promptToArtifactChecklist: Array<{
    requirement: string
    evidence: string[]
  }>
  evidence: Record<string, unknown>
  remainingBlockers: string[]
  externalProviderCall: boolean
  commands: {
    self?: string | null
    forgeLive?: string | null
    forgeRuntime?: string | null
  }
  note?: string | null
}

export interface AtlasCodeEnterpriseCertificationStage {
  name: string
  status: string
  blocker?: string | null
  [key: string]: unknown
}

/**
 * Atlas Forge Provider Topology (read-model).
 *
 * Materializes the canonical role assignment, provider/model, capability and
 * fallback chain that Atlas Decide produces for a heavy Forge run. The desktop
 * panel renders this as-is — never mutates, never invents.
 *
 * Schema: atlas.forge.provider_topology.v1
 * Doc: docs/engineering-knowledge-base/atlas-forge-provider-topology-and-fallback-v1.md
 */
export type AtlasForgeProviderRoleId =
  | 'primary_builder'
  | 'critical_reviewer'
  | 'context_scout'
  | 'repair_agent'
  | 'local_tool_runner'
  | string

export type AtlasForgeProviderRoleStatus =
  | 'selected'
  | 'available'
  | 'unavailable'
  | 'fallback_selected'
  | 'blocked'
  | 'not_required'
  | string

export interface AtlasForgeProviderRole {
  role: AtlasForgeProviderRoleId
  provider: string | null
  model: string | null
  status: AtlasForgeProviderRoleStatus
  capabilityReason: string | null
  riskFit: string | null
  autonomyLevel: string | null
  fallbackOrder: number
  qualityRole?: string | null
  requiresHumanReview?: boolean
  evidenceRequired: boolean
  decisionSource?: string | null
}

export interface AtlasForgeProviderFallbackEntry {
  order: number
  role: AtlasForgeProviderRoleId | null
  provider: string | null
  model: string | null
  capable: boolean
  reason: string | null
}

export interface AtlasForgeProviderCapacityEntry {
  provider: string
  capacityState: string
  quotaState: string
  rateLimitState: string
  // Extended capacity fields (Atlas Forge Provider Capacity v1):
  schemaVersion?: string
  label?: string
  status?: 'available' | 'degraded' | 'unavailable' | 'unknown' | string
  authState?: string
  runtimePresent?: boolean
  configPresent?: boolean
  lastSuccessAt?: string | null
  lastFailureAt?: string | null
  lastFailureType?: string | null
  cooldownUntil?: string | null
  confidence?: 'high' | 'medium' | 'low' | string
  evidenceRefs?: string[]
  blockers?: string[]
  nextAction?: string
  externalProviderCall?: boolean
}

/**
 * Atlas Forge Provider Capacity (read-model snapshot).
 *
 * Local-only telemetry for the 5 canonical Forge runtime providers
 * (claude_cli, codex_cli, gemini_cli, claude_codex, atlas-local). Atlas
 * Decide consumes this snapshot to materialize the runtime topology — the
 * snapshot itself NEVER calls a provider and NEVER spends a token.
 *
 * Schema: atlas.forge.provider_capacity.v1
 * Doc: docs/engineering-knowledge-base/atlas-forge-provider-capacity-continuity-v1.md
 */
export interface AtlasForgeProviderCapacity {
  schemaVersion: string
  status: 'available' | 'degraded' | 'blocked' | string
  generatedAt: string
  snapshotId: string
  workspace: string
  obraId: string | null
  obraResolved: boolean
  obraResolutionStatus: 'not_required' | 'resolved' | 'not_found' | string
  providers: AtlasForgeProviderCapacityEntry[]
  bestAvailableProvider: string | null
  providerCount: number
  availableCount: number
  degradedCount: number
  unavailableCount: number
  unknownCount: number
  blockers: string[]
  runtimeDispatchAllowed: boolean
  nextAction: string
  externalProviderCall: boolean
  providerTokensSpent: boolean
  isReadModel: boolean
  note: string | null
  separatedFrom: string
}

/**
 * Single canonical failure event recorded for an Obra.
 *
 * Schema: atlas.forge.provider_failure_memory_event.v1
 */
export interface AtlasForgeProviderFailureMemoryEvent {
  schemaVersion: string
  eventId: string
  occurredAt: string
  provider: string
  model: string | null
  role: string | null
  failureType: string
  action: string | null
  blocker: string | null
  reason: string | null
  cooldownUntil: string | null
  fallbackEventId: string | null
  decisionReceiptId: string | null
  providerTopologyId: string | null
  capacitySnapshotId: string | null
  providerStatusBefore: string | null
  providerStatusAfter: string | null
  silent: boolean
  reducesQualityGates: boolean
  bypassesReviewCompletionGate: boolean
  autoCompletesWork: boolean
  externalProviderCall: boolean
  evidenceHash: string | null
}

/**
 * Capped failure memory for an Obra (max 50 events, deduped within 60s).
 *
 * Schema: atlas.forge.provider_failure_memory.v1
 */
/**
 * Atlas Self-Improvement Governance State (slim state-projection).
 *
 * Surface for the 7-level self-improvement governance ladder. Read-model
 * only — UI never promotes, never calls a provider, never bypasses Forge
 * Review/Completion.
 *
 * Schema: atlas.self_improvement.governance_state.v1
 */
export interface AtlasSelfImprovementForgeActivationState {
  schemaVersion: string
  activationId: string | null
  proposalId: string | null
  proposalHash: string | null
  powerGateHash: string | null
  invariantLockHash: string | null
  regressionSentinelHash: string | null
  strategyBucket: string | null
  portfolioDeviation: boolean
  maturityTarget: number | null
  reviewer: string | null
  reason: string | null
  approvedAt: string | null
  externalProviderCall: boolean
  separatedFrom: string
}

export interface AtlasSelfImprovementGovernanceState {
  schemaVersion: string
  trustLedger: AtlasSelfImprovementTrustLedgerSnapshot | null
  strategyPortfolio: AtlasSelfImprovementStrategyPortfolioSnapshot | null
  commands: Record<string, string>
  externalProviderCall: boolean
  separatedFrom: string
}

export interface AtlasSelfImprovementTrustLedgerSnapshot {
  schemaVersion: string
  obraId: string | null
  entryCount: number
  entries: AtlasSelfImprovementTrustLedgerEntry[]
  updatedAt: string | null
  externalProviderCall: boolean
  counts?: Record<string, number>
  summary?: {
    totalProposals: number
    approvalRate: number | null
    autopromotionAccepted: number
    autopromotionReverted: number
    autopromotionRevertRate: number | null
    overreachFlagged: number
    overConservativeFlagged: number
    trustBand:
      | 'high_trust'
      | 'medium_trust'
      | 'low_trust'
      | 'low_trust_overreach'
      | 'low_trust_too_conservative'
      | 'insufficient_data'
      | string
  }
  knownOutcomes?: string[]
  maxEntries?: number
  dedupeWindowSeconds?: number
}

export interface AtlasSelfImprovementTrustLedgerEntry {
  schemaVersion: string
  entryId: string
  occurredAt: string
  outcome: string
  proposalId: string | null
  reviewer: string | null
  reason: string | null
  area: string | null
  silent: boolean
  autoPromotesWork: boolean
  externalProviderCall: boolean
}

export interface AtlasSelfImprovementStrategyPortfolioSnapshot {
  schemaVersion: string
  portfolioId: string
  generatedAt: string
  totalProposals: number
  buckets: AtlasSelfImprovementStrategyPortfolioBucket[]
  balanceHealth: 'empty_portfolio' | 'balanced' | 'mild_imbalance' | 'severe_imbalance' | string
  recommendedNextBucket: string | null
  nextAction: string
  externalProviderCall: boolean
  separatedFrom: string
}

export interface AtlasSelfImprovementStrategyPortfolioBucket {
  bucket: string
  count: number
  readyCount: number
  blockedCount: number
  sharePercent: number
  targetPercent: number
  deviationPercent: number
  underweight: boolean
  overweight: boolean
  proposalIds: string[]
}

/**
 * Self-Improvement Activation Cockpit v1 — human-first read-model that
 * projects activation registry + detail into the shape Atlas Code renders
 * (status tone, status label, human power gate translation, before
 * snapshot summary, approval receipt visibility, created Obra metadata).
 *
 * Read-only. Mutations stay on the existing activation endpoints
 * (accept/reject) — the cockpit type captures the projection, never the
 * decision.
 *
 * Schema: atlas.self_improvement.activation_cockpit.v1
 */
export type AtlasSelfImprovementActivationTone = 'rec-red' | 'bronze' | 'moss' | 'cream' | 'ink' | string

export type AtlasSelfImprovementActivationStatus =
  | 'blocked'
  | 'needs_revision'
  | 'pending_human_review'
  | 'accepted'
  | 'obra_created'
  | 'dry_run_planned'
  | 'rejected'
  | string

export type AtlasSelfImprovementActivationPowerGateOutcome =
  | 'approved'
  | 'needs_revision'
  | 'rejected'
  | 'human_review_required'
  | 'unknown'
  | string

export interface AtlasSelfImprovementActivationCockpit {
  schemaVersion: string
  generatedAt: string
  filters: {
    status: string | null
    bucket: string | null
    hasObra: boolean | null
    activationId: string | null
  }
  activations: AtlasSelfImprovementActivationListItem[]
  counters: {
    total: number
    blocked: number
    needsRevision: number
    pendingHumanReview: number
    rejected: number
    accepted: number
    obraCreated: number
    dryRunPlanned: number
    withObra: number
    withBlockers: number
  }
  selectedActivation: AtlasSelfImprovementActivationDetail | null
  strategyPortfolio: AtlasSelfImprovementStrategyPortfolioSnapshot | null
  trustLedger: AtlasSelfImprovementTrustLedgerSnapshot | null
  humanSummary: string
  nextSafeAction: string
  commands: Record<string, string>
  externalProviderCall: boolean
  providerTokensSpent: boolean
  autoFastPathExecuted: boolean
  completionClaimPromoted: boolean
  separatedFrom: string
  isReadModel: boolean
}

export interface AtlasSelfImprovementActivationListItem {
  activationId: string
  status: AtlasSelfImprovementActivationStatus
  statusLabel: string
  tone: AtlasSelfImprovementActivationTone
  title: string
  proposalId: string | null
  strategyBucket: string | null
  riskLevel: string | null
  createdObraId: string | null
  createdObraTitle: string | null
  updatedAt: string | null
  nextAction: string
  nextSafeAction: string
  hasBlockers: boolean
  blockersCount: number
}

export interface AtlasSelfImprovementActivationProposalSummary {
  title: string
  problemStatement: string | null
  businessRule: string | null
  targetCapability: string | null
  whyNow: string | null
  expectedPowerGain: string | null
  riskLevel: string | null
  successMetrics: string[]
  acceptanceGates: string[]
  canonicalDocs: string[]
  allowedPaths: string[]
  forbiddenPaths: string[]
  rivalsEvaluationPlan: string | null
  rollbackStrategy: string | null
  testStrategy: string | null
  createsObra: boolean
  neverExecutesFastPathAutomatically: boolean
  neverCallsProviderWithoutExplicitApproval: boolean
}

export interface AtlasSelfImprovementActivationPowerGate {
  outcome: AtlasSelfImprovementActivationPowerGateOutcome
  label: string
  tone: AtlasSelfImprovementActivationTone
  hardFails: string[]
  softFindings: string[]
  requiresHumanReview: boolean
  autopromotionAllowed: boolean
  nextAction: string | null
  gateId: string | null
}

export interface AtlasSelfImprovementActivationBeforeSnapshot {
  schemaVersion: string | null
  capturedAt: string | null
  rationale: string
  maturity: {
    achievedLevel: number | string | null
    targetLevel: number | string | null
    label: string
    hash: string | null
  }
  invariantLock: {
    status: string
    tone: AtlasSelfImprovementActivationTone
    violationsCount: number
    hash: string | null
  }
  regressionSentinel: {
    status: string
    tone: AtlasSelfImprovementActivationTone
    findingsCount: number
    hash: string | null
  }
  strategyPortfolio: {
    balanceHealth: string
    recommendedNextBucket: string | null
    hash: string | null
  }
  trustLedger: {
    trustBand: string
    entryCount: number
    hash: string | null
  }
  docsStatus: {
    requiredCount: number
    requiredPresentCount: number
    missingRequired: string[]
    tone: AtlasSelfImprovementActivationTone
  }
}

export interface AtlasSelfImprovementActivationApprovalReceipt {
  schemaVersion: string | null
  activationId: string | null
  reviewer: string | null
  reason: string | null
  approvedAt: string | null
  receiptHash: string | null
  proposalHash: string | null
  powerGateHash: string | null
  silent: boolean
  autoPromotesCompletionClaim: boolean
  autoExecutesFastPath: boolean
  externalProviderCall: boolean
}

export interface AtlasSelfImprovementActivationRejection {
  reviewer: string | null
  reason: string | null
  rejectedAt: string | null
  silent: boolean
}

export interface AtlasSelfImprovementActivationCreatedObra {
  obraId: string
  title: string
  status: string
  intakeId: string | null
  intakeStatus: 'filled' | 'pending' | string
  objective: string | null
  businessRule: string | null
  acceptanceCriteriaCount: number
  canonicalDocsCount: number
  scopeIn: string[]
  scopeOut: string[]
  riskLevel: string | null
  fastPathStarted: boolean
}

export interface AtlasSelfImprovementActivationOpenObraAction {
  enabled: boolean
  label: string
  obraId: string | null
}

export interface AtlasSelfImprovementActivationDetail {
  schemaVersion: string
  generatedAt: string
  activationId: string | null
  status: AtlasSelfImprovementActivationStatus
  statusLabel: string
  tone: AtlasSelfImprovementActivationTone
  riskLevel: string | null
  strategyBucket: string | null
  portfolioDeviation: boolean
  portfolioReason: string | null
  maturityTarget: number | string | null
  proposalSummary: AtlasSelfImprovementActivationProposalSummary | null
  powerGate: AtlasSelfImprovementActivationPowerGate | null
  beforeSnapshot: AtlasSelfImprovementActivationBeforeSnapshot | null
  approvalState: string
  approvalReceipt: AtlasSelfImprovementActivationApprovalReceipt | null
  rejection: AtlasSelfImprovementActivationRejection | null
  createdObra: AtlasSelfImprovementActivationCreatedObra | null
  forgeIntakeReady: boolean
  fastPathStarted: boolean
  openObraAction: AtlasSelfImprovementActivationOpenObraAction
  nextAction: string
  nextSafeAction: string
  humanSummary: string
  blockers: string[]
  missingRequiredDocs: string[]
  evidenceRefs: string[]
  commands: Record<string, string>
  externalProviderCall: boolean
  providerTokensSpent: boolean
  autoFastPathExecuted: boolean
  completionClaimPromoted: boolean
  separatedFrom: string
  isReadModel: boolean
}

export interface AtlasSelfImprovementActivationCockpitFilters {
  status?: string | null
  bucket?: string | null
  hasObra?: boolean | null
}

export interface AtlasSelfImprovementActivationAcceptPayload {
  reviewer: string
  reason: string
  acknowledgesNoFastPath: boolean
  obraTitle?: string | null
}

export interface AtlasSelfImprovementActivationRejectPayload {
  reviewer: string
  reason: string
}

export interface AtlasSelfImprovementActivationCreatePayload {
  proposal?: Record<string, unknown> | null
  proposalId?: string | null
  obraTitle?: string | null
  dryRun?: boolean
}

export interface AtlasForgeProviderFailureMemory {
  schemaVersion: string
  obraId: string | null
  eventCount: number
  events: AtlasForgeProviderFailureMemoryEvent[]
  updatedAt: string | null
  externalProviderCall: boolean
  cooldownPolicy?: Record<string, number>
  maxEvents?: number
  dedupeWindowSeconds?: number
  knownFailures?: string[]
}

export interface AtlasForgeProviderFallbackEvent {
  schemaVersion: string
  eventId: string
  occurredAt: string
  failureType: string
  failedRole: string | null
  failedProvider: string | null
  failedModel: string | null
  reason: string | null
  action: 'reroute' | 'retry_later' | 'block' | string
  selectedFallbackRole: string | null
  selectedFallbackProvider: string | null
  selectedFallbackModel: string | null
  blocker: string | null
  silent: boolean
  reducesQualityGates: boolean
  bypassesReviewCompletionGate: boolean
  autoCompletesWork: boolean
  fallbackChildReceiptRequired?: boolean
  runtimeDispatchAllowed?: boolean
  obraId: string | null
  providerTopologyId: string | null
  strategy: string | null
}

export interface AtlasForgeProviderTopology {
  schemaVersion: string
  status:
    | 'available'
    | 'rerouted'
    | 'retry_later'
    | 'blocked'
    | 'provider_capacity_exhausted'
    | 'blocked_obra_required'
    | string
  obraId: string | null
  obraPresent: boolean
  fastPathRunId: string | null
  decisionReceiptId: string | null
  decisionReceiptHash?: string | null
  receiptSchemaVersion?: string | null
  providerTopologyId: string
  generatedAt: string
  strategy: string | null
  decisionSource?: 'live_atlas_decide' | 'static_policy' | 'operator_override_pending' | string
  roles: AtlasForgeProviderRole[]
  fallbackChain: AtlasForgeProviderFallbackEntry[]
  providerCapacity: AtlasForgeProviderCapacityEntry[]
  blockers: string[]
  lastFallbackEvent: AtlasForgeProviderFallbackEvent | null
  fallbackChildReceiptRequired?: boolean
  runtimeDispatchAllowed?: boolean
  evidenceRefs: string[]
  nextAction: string
  externalProviderCall: boolean
  isReadModel: boolean
  note: string | null
}

/**
 * Atlas Forge Continuum Certification summary (slim state-projection).
 *
 * Full audit lives at `php artisan atlas:forge:continuum-certify --json --strict`.
 * The desktop snapshot only needs the canonical status + invariant pulse so the
 * cockpit can render "all green" / "backend ready, UI pending" / blockers.
 *
 * Schema: atlas.forge_continuum_certification.v1
 */
/**
 * Map of canonical Continuum invariants. Each key is a canonical invariant
 * id (e.g. `provider_topology_available`) and the value is whether that
 * invariant currently passes for the local repo state.
 *
 * The 25 canonical keys are enforced by the backend
 * `AtlasForgeContinuumCertificationService::REQUIRED_INVARIANTS`.
 */
export type AtlasForgeContinuumInvariantMap = Record<string, boolean>

export interface AtlasForgeContinuumCertificationSummary {
  schemaVersion: string
  status:
    | 'available'
    | 'available_without_obra_context'
    | 'backend_available_ui_pending'
    | 'missing_artifacts'
    | 'blocked'
    | 'blocked_obra_required_for_runtime_projection'
    | string
  obraId: string | null
  obraPresent: boolean
  invariantsAllTrue: boolean
  invariants: AtlasForgeContinuumInvariantMap
  blockers: string[]
  evidenceCommand: string | null
  externalProviderCall: boolean
  separatedFrom: string
  note: string | null
}

/**
 * Canonical alias for the Continuum certification snapshot. The cockpit, the
 * bridge adapter and the panel all consume this name; the long-form
 * `AtlasForgeContinuumCertificationSummary` exists for backwards compat.
 */
export type AtlasForgeContinuumCertification = AtlasForgeContinuumCertificationSummary

export interface AtlasCodeForgeFastPathStage {
  name: string
  status: string
  blocker?: string | null
  [key: string]: unknown
}

export interface AtlasCodeForgeFastPathSnapshot {
  schemaVersion: string
  fastPathRunId?: string | null
  generatedAt?: string | null
  startedAt?: string | null
  updatedAt?: string | null
  status: 'prepared' | 'queued' | 'running' | 'passed' | 'blocked' | 'degraded' | 'review_required' | 'completed' | 'failed' | string
  mode: 'prepare_only' | 'execute_async' | 'execute_sync' | string
  obraId: string | null
  operatorId?: string | null
  workItemId: string | null
  workItemCode: string | null
  specHash: string | null
  planHash: string | null
  taskCount: number
  executionId: string | null
  historyId: string | null
  checkpointId: string | null
  currentStage?: string | null
  progressPercent?: number | null
  stages: AtlasCodeForgeFastPathStage[]
  blockers: string[]
  evidenceRefs: string[]
  commands: Record<string, string>
  nextAction: string
  externalProviderCall: boolean
  note?: string | null
}

export interface AtlasCodeForgeFastPathRunStatus {
  schemaVersion: string
  fastPathRunId: string | null
  obraId: string | null
  workItemId: string | null
  workItemCode: string | null
  executionId: string | null
  historyId: string | null
  checkpointId: string | null
  status: 'prepared' | 'queued' | 'running' | 'passed' | 'degraded' | 'blocked' | 'review_required' | 'completed' | 'failed' | string
  mode: string
  currentStage: string
  progressPercent: number
  specHash: string | null
  planHash: string | null
  taskCount: number
  startedAt: string | null
  updatedAt: string | null
  completedAt: string | null
  blockers: string[]
  evidenceRefs: string[]
  evidenceRefCount: number
  ledgerEventCount: number
  asyncExecution: Record<string, unknown> | null
  forgeLiveExecution: Record<string, unknown> | null
  reviewGate: {
    schemaVersion: string
    reviewRequired: boolean
    reviewStatus: 'pending' | 'approved' | 'rejected' | 'not_required' | string
    completionClaimAllowed: boolean
    reviewRecordPresent: boolean
    reviewId: string | null
    approvalApi: string
    noAutoCompletionWithoutReview: boolean
  }
  repair: {
    schemaVersion: string
    repairAvailable: boolean
    repairLoopStatus: string
    repairLoopTriggered: boolean
    failurePacket: Record<string, unknown> | null
    suggestedRepairCommand: string | null
    blockers: string[]
    failClosedWithoutEvidence: boolean
  }
  commands: Record<string, string>
  nextAction: string
  runFound: boolean
  blocker?: string | null
  reason?: string | null
  externalProviderCall: boolean
}

export interface AtlasCodeForgeReviewPacket {
  schemaVersion: string
  reviewPacketId: string | null
  obraId: string | null
  fastPathRunId: string | null
  workItemId: string | null
  executionId: string | null
  historyId: string | null
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'rolled_back' | 'blocked' | string
  reviewId: string | null
  reviewerId: string | null
  reviewedAt: string | null
  reason: string | null
  runtimeStatus: 'passed' | 'blocked' | 'degraded' | 'missing' | string
  completionClaimAllowedBeforeReview: boolean
  completionClaimAllowedAfterReview: boolean
  evidencePackDigest: Record<string, unknown>
  stageTimelineDigest: Record<string, unknown>
  changedFiles: string[]
  taskContract: Record<string, unknown> | null
  diffScope: Record<string, unknown> | null
  gates: Array<Record<string, unknown>>
  blockers: string[]
  rollbackAvailable: boolean
  rollbackStatus: string | null
  approvalRequiresHuman: boolean
  externalProviderCall: boolean
  sourceAuthority: string | null
  correlation: {
    executionIdMatch: boolean
    historyIdMatch: boolean
    evidenceIdMatch: boolean
  } | null
  blocker?: string | null
  reasonText?: string | null
}

export interface AtlasCodeForgeCompletionClaim {
  schemaVersion: string
  obraId: string | null
  fastPathRunId: string | null
  reviewPacketId: string | null
  reviewId: string | null
  completionStatus: 'not_allowed' | 'allowed' | 'completed' | 'blocked' | 'rolled_back' | string
  humanApproved: boolean
  approvedBy: string | null
  approvedAt: string | null
  runtimePassed: boolean
  evidencePackVerified: boolean
  diffScopeVerified: boolean
  rollbackState: string | null
  finalCompletionAllowed: boolean
  blockers: string[]
  evidenceRefs: string[]
  ledgerEventIds: string[]
  nextAction: string
  externalProviderCall: boolean
}

export interface AtlasCodeForgeWorkIntake {
  schemaVersion: string
  intakeId: string | null
  obraId: string | null
  workItemId: string | null
  workItemCode: string | null
  objective: string | null
  businessRule: string | null
  scopeIn: string[]
  scopeOut: string[]
  acceptanceCriteria: string[]
  canonicalDocs: string[]
  riskLevel: string
  expectedOutputs: string[]
  constraints: string[]
  operatorNotes: string | null
  readinessStatus: 'ready' | 'blocked' | string
  enterpriseReady: boolean
  blockers: string[]
  nextAction: string
  createdAt: string | null
  updatedAt: string | null
  externalProviderCall: boolean
}

export interface AtlasCodeForgeWorkIntakePayload {
  objective?: string | null
  businessRule?: string | null
  scopeIn?: string[]
  scopeOut?: string[]
  acceptanceCriteria?: string[]
  canonicalDocs?: string[]
  riskLevel?: string
  expectedOutputs?: string[]
  constraints?: string[]
  operatorNotes?: string | null
}

export interface AtlasCodeForgeReviewDecisionResponse {
  schemaVersion: string
  workId: string | null
  status: 'approved' | 'rejected' | 'rolled_back' | 'blocked' | string
  blocker: string | null
  reason: string | null
  reviewPacket: AtlasCodeForgeReviewPacket | null
  completionClaim: AtlasCodeForgeCompletionClaim | null
  reviewResponse: Record<string, unknown> | null
  rollback: Record<string, unknown> | null
  externalProviderCall: boolean
}

export interface ForgeGovernedExecutionArtifact {
  schemaVersion?: string
  executionId?: string | null
  status: 'passed' | 'blocked' | 'degraded' | string
  executionMode?: string | null
  sourceAuthority?: string | null
  workItemId?: string | null
  workItemCode?: string | null
  taskId?: string | null
  changedFiles: string[]
  stageReceiptIds: string[]
  receiptId?: string | null
  validationResult?: {
    command?: string | null
    exitCode?: number | null
    passed: boolean
    stdoutHash?: string | null
    stderrHash?: string | null
    stdoutExcerpt?: string | null
    stderrExcerpt?: string | null
  } | null
  governanceFeedback?: {
    status?: string | null
    evidenceAppended?: boolean
    receiptId?: string | null
    allGreen?: boolean
  } | null
  remainingBlockers: string[]
  externalProviderCall?: boolean
  liveWorkspaceMutated?: boolean
  promotionStatus?: string | null
  promotionArtifact?: ForgePromotionPatchArtifact | null
  promotion?: ForgePromotionArtifact | null
  stageCount?: number
}

export interface ForgePromotionPatchArtifact {
  schemaVersion?: string | null
  path?: string | null
  sha256?: string | null
  operation?: string | null
  targetFile?: string | null
  expectedBeforeHash?: string | null
  expectedAfterHash?: string | null
  diffPath?: string | null
  diffHash?: string | null
}

export interface ForgePromotionArtifact {
  schemaVersion?: string | null
  promotionId?: string | null
  status?: string | null
  promotionStatus?: string | null
  changedFiles: string[]
  liveWorkspaceMutated: boolean
  idempotent?: boolean
  rollback?: {
    available: boolean
    backupPath?: string | null
    backupHash?: string | null
    command?: string | null
  }
  evidence?: {
    receiptId?: string | null
    engineeringEvidenceId?: string | null
    persisted: boolean
  }
  rollbackExecution?: ForgeRollbackArtifact | null
  remainingBlockers: string[]
}

export interface ForgeRollbackArtifact {
  schemaVersion?: string | null
  rollbackId?: string | null
  promotionId?: string | null
  status?: string | null
  promotionStatus?: string | null
  changedFiles: string[]
  liveWorkspaceMutated: boolean
  idempotent?: boolean
  targetHashAfterRollback?: string | null
  evidence?: {
    receiptId?: string | null
    engineeringEvidenceId?: string | null
    persisted: boolean
  }
  remainingBlockers: string[]
}

export interface ForgeEvidencePackArtifact {
  schemaVersion?: string
  status: 'passed' | 'blocked' | 'degraded' | string
  obraId?: string | null
  sourceAuthority?: string | null
  generatedAt?: string | null
  replay: {
    command?: string | null
    strictCommand?: string | null
    failureProbeCommand?: string | null
    externalProviderCall: boolean
  }
  persistence: {
    engineeringRunId?: string | null
    engineeringEvidenceId?: string | null
    engineeringRunPersisted: boolean
    engineeringEvidencePersisted: boolean
  }
  stageReceiptCount: number
  stageReceipts: ForgeEvidencePackStageReceipt[]
  ledgerEventCount: number
  ledgerEvents: ForgeEvidencePackLedgerEvent[]
  changedFiles: string[]
  remainingBlockers: string[]
  integrity: {
    reportHash?: string | null
    stageTimelineHash?: string | null
    evidencePackHash?: string | null
  }
}

export interface ForgeEvidencePackStageReceipt {
  index: number
  schemaVersion?: string | null
  receiptId: string
  stage: string
  status: string
  attempt: number
  inputHash?: string | null
  outputHash?: string | null
  validationStatus?: string | null
  evidenceRefs: string[]
  createdAt?: string | null
}

export interface ForgeEvidencePackLedgerEvent {
  index: number
  eventId: string
  source: string
}

export interface ForgeStageTimelineArtifact {
  schemaVersion?: string
  total: number
  passed: number
  blocked: number
  degraded: number
  skipped: number
  blocking: number
  entries: ForgeStageTimelineEntry[]
}

export interface ForgeStageTimelineEntry {
  index: number
  name: string
  phase: 'context' | 'execute' | 'verify' | 'evidence' | 'repair' | 'cleanup' | 'runtime' | string
  status: 'passed' | 'blocked' | 'degraded' | 'skipped_not_needed' | string
  blocking: boolean
  blocker?: string | null
  summary: string
}

export interface ForgeLiveExecutionAsync {
  schemaVersion?: string
  executionId: string
  status: 'queued' | 'running' | 'completed' | 'passed' | 'degraded' | 'blocked' | 'failed' | string
  obraId?: string | null
  simulateFailure?: boolean
  queuedAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  jobDispatched?: boolean
  command?: string | null
  snapshotStatus?: string | null
  runId?: string | null
  evidenceId?: string | null
  remainingBlockers: string[]
  completionClaimAllowed?: boolean
  error?: string | null
  updatedAt?: string | null
}

export interface ForgeLiveExecutionHistory {
  schemaVersion?: string
  obraId: string
  sourceAuthority?: string | null
  total: number
  latestEntryId?: string | null
  entries: ForgeLiveExecutionHistoryEntry[]
}

export interface ForgeLiveExecutionHistoryEntry {
  schemaVersion?: string
  historyId: string
  runId?: string | null
  evidenceId?: string | null
  status: 'passed' | 'blocked' | 'degraded' | string
  obraId?: string | null
  lastRunAt?: string | null
  command?: string | null
  strictCommand?: string | null
  simulateFailure?: boolean
  stageCount?: number | null
  contextPackHash?: string | null
  contextCompleteness?: string | null
  taskContractStatus?: string | null
  diffScopeStatus?: string | null
  scopeStatus?: string | null
  completionClaimAllowed?: boolean
  repairStatus?: string | null
  repairTriggered?: boolean
  evidenceRefCount?: number | null
  ledgerEventCount?: number | null
  evidencePackDigest?: ForgeEvidencePackDigest | null
  promotionStatus?: string | null
  promotionId?: string | null
  promotionEvidenceId?: string | null
  promotionReceiptId?: string | null
  rollbackId?: string | null
  rollbackEvidenceId?: string | null
  liveWorkspaceMutated?: boolean
  remainingBlockers: string[]
  externalProviderCall?: boolean
}

export interface ForgeEvidencePackDigest {
  schemaVersion?: string | null
  status: string
  stageReceiptCount: number
  stageReceiptIds: string[]
  ledgerEventCount: number
  ledgerEventIds: string[]
  changedFiles: string[]
  engineeringRunId?: string | null
  engineeringEvidenceId?: string | null
  engineeringRunPersisted: boolean
  engineeringEvidencePersisted: boolean
  reportHash?: string | null
  stageTimelineHash?: string | null
  evidencePackHash?: string | null
}

export interface ForgeTaskQueue {
  schemaVersion?: string
  obraId: string
  sourceAuthority?: string | null
  workItemId?: string | null
  workItemCode?: string | null
  specHash?: string | null
  planHash?: string | null
  requiresSpec?: boolean
  requiresPlan?: boolean
  total: number
  readyCount: number
  blockedCount: number
  verifiedCount: number
  needsReviewCount: number
  pendingCount: number
  activeTaskId?: string | null
  latestHistoryId?: string | null
  entries: ForgeTaskQueueEntry[]
}

export interface ForgeTaskQueueEntry {
  schemaVersion?: string
  taskId: string
  sequence: number
  title: string
  objective: string
  status: 'ready' | 'blocked' | 'verified' | 'needs_review' | 'pending' | string
  owner?: string | null
  riskLevel?: string | null
  allowedFiles: string[]
  forbiddenFiles: string[]
  expectedFiles: string[]
  validationCommands: string[]
  acceptanceCriteria: string[]
  evidenceRequired: string[]
  docsRequired: string[]
  blockers: string[]
  source?: string | null
  workItemId?: string | null
  workItemCode?: string | null
  runHistoryId?: string | null
  evidencePackHash?: string | null
  stageTimelineHash?: string | null
  completionClaimAllowed: boolean
}

export interface ForgeRunHistoryReplay {
  schemaVersion?: string
  workId: string
  historyId: string
  status: string
  sourceAuthority?: string | null
  error?: string | null
  blocker?: string | null
  historyEntry: ForgeLiveExecutionHistoryEntry | null
  evidencePackDigest: ForgeEvidencePackDigest | null
  stageTimelineDigest: {
    schemaVersion?: string | null
    status?: string | null
    stageTimelineHash?: string | null
    total?: number | null
    blocking?: number | null
  }
  replay: {
    readOnly: boolean
    command?: string | null
    strictCommand?: string | null
    failureProbeCommand?: string | null
    externalProviderCall: boolean
  }
  snapshot: ForgeLiveExecutionSnapshot | null
  snapshotAvailable: boolean
  review: AtlasCodeForgeReviewArtifact | null
}

export interface AtlasCodeForgeReviewArtifact {
  schemaVersion?: string
  reviewId: string
  obraId: string
  historyId?: string | null
  runId?: string | null
  evidenceId?: string | null
  decision: 'approved' | 'rejected' | string
  status: 'approved' | 'rejected' | 'blocked' | string
  reviewerId?: string | null
  reviewedAt?: string | null
  comment?: string | null
  approvalEffective: boolean
  sourceAuthority?: string | null
  promotion?: ForgePromotionArtifact | null
  rollback?: ForgeRollbackArtifact | null
  reviewGate: {
    completionClaimAllowed: boolean
    humanApproved: boolean
    finalCompletionAllowed: boolean
    blockers: string[]
  }
  summary?: string | null
}

export interface AtlasCodeForgeReviewHistory {
  schemaVersion?: string
  obraId: string
  sourceAuthority?: string | null
  total: number
  latestReviewId?: string | null
  entries: AtlasCodeForgeReviewHistoryEntry[]
}

export interface AtlasCodeForgeReviewHistoryEntry {
  schemaVersion?: string
  reviewId: string
  historyId?: string | null
  executionId?: string | null
  obraId: string
  decision: 'approved' | 'rejected' | string
  status: 'approved' | 'rejected' | 'blocked' | string
  comment?: string | null
  reviewedAt?: string | null
  reviewerId?: string | null
  approvalEffective: boolean
  finalCompletionAllowed: boolean
  completionClaimAllowed: boolean
  humanApproved: boolean
  liveExecutionStatus?: string | null
  runId?: string | null
  runEvidenceId?: string | null
  reviewEvidenceId?: string | null
  promotion?: ForgePromotionArtifact | null
  rollback?: ForgeRollbackArtifact | null
  promotionStatus?: string | null
  rollbackId?: string | null
  rollbackEvidenceId?: string | null
  liveWorkspaceMutated?: boolean
  stageReceiptCount: number
  ledgerEventCount: number
  reportHash?: string | null
  stageTimelineHash?: string | null
  evidencePackHash?: string | null
  blockers: string[]
  sourceAuthority?: string | null
  summary?: string | null
}

export interface ForgeTaskContractArtifact {
  schemaVersion?: string
  taskId: string
  status: string
  objective: string
  owner?: string | null
  riskLevel?: string | null
  allowedFiles: string[]
  forbiddenFiles: string[]
  expectedFiles: string[]
  validationCommands: string[]
  acceptanceCriteria: string[]
  rollback?: {
    available: boolean
    command?: string | null
  }
  evidenceRequired: string[]
  docsRequired: string[]
  cartographyRequired: boolean
}

export interface DiffScopeFile {
  path: string
  status: 'in_scope' | 'adjacent' | 'needs_replan' | 'forbidden' | 'unknown' | string
  ownership?: string | null
  manifestCovered?: boolean
  reason?: string | null
}

export interface DiffScopeArtifact {
  schemaVersion?: string
  status: 'passed' | 'blocked' | 'degraded' | string
  scopeStatus?: string | null
  changedFileCount?: number
  files: DiffScopeFile[]
  manifestId?: string | null
  patchTargetHash?: string | null
  rollbackAvailable?: boolean
  blockingReasons: string[]
  patchVerifier?: {
    schemaVersion?: string | null
    status?: string | null
    nextAction?: string | null
    completionClaimAllowed?: boolean
  }
  completionGate?: {
    status?: string | null
    completionClaimAllowed?: boolean
    reasons: string[]
  }
}

export interface ContextPackRef {
  rank: number
  path: string
  kind: string
  reason: string
  evidenceMarker: string
  contentHash?: string | null
  sizeBytes?: number | null
}

// ──────────────────────────────────────────────────────────────────────────────
// Programming Governance (SCOR-1 thin slice)
//
// Atlas Code SCOR-1 consumes /atlas-code/works/{id}/state expanded with a
// `programming_governance` block. The Desktop only renders what the runtime
// actually persisted (WorkItem, Spec, Plan, TaskContracts, GateRuns, Reviews,
// EvidenceReceipts, Artifacts). Empty arrays + null spec/plan mean
// "aguardando" — never fabricated values.

export type ProgrammingScopeMode = 'compact' | 'structural'

export type ProgrammingWorkStatus =
  | 'open'
  | 'spec_required'
  | 'plan_required'
  | 'executing'
  | 'verifying'
  | 'review'
  | 'closed'
  | 'blocked'

export interface ProgrammingWorkItemGap {
  name: string
  reason?: string | null
  recordedAt?: string | null
}

export interface ProgrammingWorkItemSnapshot {
  id: string
  code: string
  intentText: string
  intentType: string
  scopeMode: ProgrammingScopeMode
  riskLevel: string
  status: ProgrammingWorkStatus | string
  currentStage: string
  specHash: string | null
  planHash: string | null
  requiredGates: string[]
  gaps: ProgrammingWorkItemGap[]
}

export interface ProgrammingTaskContract {
  owner?: string | null
  allowedFiles: string[]
  forbiddenFiles: string[]
  expectedFiles: string[]
  dependencies: string[]
  riskLevel?: string | null
  validationCommands: string[]
  acceptanceCriteria: string[]
  rollback?: string | null
  evidenceRequired: string[]
  docsRequired: string[]
  cartographyRequired: boolean
}

export interface ProgrammingGateRunSnapshot {
  id?: string
  gateName: string
  status: 'passed' | 'failed' | 'skipped' | 'waived' | string
  blocking: boolean
  reason?: string | null
  waiverReason?: string | null
  payload?: unknown
  createdAt?: string | null
}

export interface ProgrammingEvidenceStorage {
  persisted: boolean
  table?: string
  reason?: string
  id?: string
}

export interface ProgrammingEvidenceReceiptSnapshot {
  receiptId?: string
  evidenceType: string
  status: string
  command?: string | null
  output?: string | null
  files: string[]
  tests: string[]
  diffPath?: string | null
  artifactUrl?: string | null
  summary?: string | null
  storage?: ProgrammingEvidenceStorage
  recordedAt?: string | null
}

export interface ProgrammingGovernanceSnapshot {
  workItem: ProgrammingWorkItemSnapshot | null
  spec: Record<string, unknown> | null
  plan: Record<string, unknown> | null
  tasks: ProgrammingTaskContract[]
  gateRuns: ProgrammingGateRunSnapshot[]
  reviews: Array<Record<string, unknown>>
  evidenceRefs: ProgrammingEvidenceReceiptSnapshot[]
  artifacts: Array<Record<string, unknown>>
  degraded: boolean
  degradedReason: string | null
}

// ──────────────────────────────────────────────────────────────────────────────
// Decision Receipt v2 (Atlas Server: AiDecision)

export type Confidence = 'low' | 'medium' | 'high' | 'unknown'

export interface DecisionReceipt {
  id: string
  obraId?: string
  traceId?: string | null
  primary: string
  model?: string
  confidence: Confidence
  confidenceScore: number
  routeMode?: string
  taskType?: string
  riskLevel?: string
  budgetEstUsd: number
  budgetUsedUsd: number
  fallbackChain: string[]
  signedBy?: string | null
  signature?: string | null
  signedAt?: string | null
  reason?: string
  createdAt?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Quality Gates

export type GateState = 'pending' | 'passed' | 'failed' | 'blocked'

export interface QualityGate {
  id: string
  name: string
  state: GateState
  detail?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Conversation messages

export type MessageRole = 'user' | 'atlas' | 'system'

export interface Message {
  id: string
  role: MessageRole
  body: string
  channel?: 'text' | 'voice'
  ts: string
  occurredAt?: string
  provider?: string
  model?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Plan + multi-agent packets

export interface PlanStep {
  index: number
  title: string
  files: string[]
  agentTag: string
}

export interface Packet {
  id: string
  agent: string
  title: string
  status: 'todo' | 'running' | 'done' | 'failed'
  costUsd?: number
  tokens?: number
  durationMs?: number
}

// ──────────────────────────────────────────────────────────────────────────────
// Diff payload

export interface DiffPatch {
  id: string
  path: string
  added: number
  removed: number
  receiptId: string
  hunks: Array<{
    lineNumber: number
    kind: 'add' | 'del' | 'context'
    text: string
  }>
}

// ──────────────────────────────────────────────────────────────────────────────
// Cartography surface (read-only graph of the canonical truth)

export type {
  BrokenPath,
  CartographyAtom,
  CartographyGraph,
  CartographyNote,
  CartographySources,
  CartographyView,
  Connection,
  Continent,
  GraphAudit,
  GraphSource,
  Lane,
  LateralNode,
  OrphanNode,
  PipelineStep,
  RecentChange,
  SemanticGraph,
  SemanticNode,
  SourceHealth,
  SourceRootHealth,
} from './cartography'
