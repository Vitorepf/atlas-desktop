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
  generatedAt: string
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
  PipelineStep,
  RecentChange,
  SemanticGraph,
  SemanticNode,
} from './cartography'
