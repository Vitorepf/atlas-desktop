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
  programmingGovernance: ProgrammingGovernanceSnapshot | null
  generatedAt: string
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
