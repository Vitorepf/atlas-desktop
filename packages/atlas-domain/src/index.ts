/**
 * @atlas/domain
 *
 * TypeScript types mirroring atlas-server contracts. The Kernel decides; this
 * package only types what crosses the bridge. No business rules live here.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Core (atlas-tauri command bridge)

export type CoreMode = 'tauri-core' | 'browser-fallback'

export interface CoreStatus {
  mode: CoreMode
  dbPath: string
  workspacePath: string
  pty: 'mock' | 'portable-pty'
  signing: 'mock' | 'ed25519'
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
// SDD pipeline · 5 estágios MVP

export type SddStageId = 'context' | 'spec' | 'plan' | 'execute' | 'verify'

export type SddStageState = 'todo' | 'now' | 'done' | 'blocked'

export interface SddStage {
  id: SddStageId
  label: string
  state: SddStageState
}

// ──────────────────────────────────────────────────────────────────────────────
// Decision Receipt v2 (Atlas Server: AiDecision)

export type Confidence = 'low' | 'med' | 'high'

export interface DecisionReceipt {
  id: string
  obraId: string
  primary: string
  confidence: Confidence
  confidenceScore: number
  budgetEstUsd: number
  budgetUsedUsd: number
  fallbackChain: string[]
  signedBy?: string
  signature?: string
  signedAt?: string
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
  CartographyView,
  Connection,
  Continent,
  GraphAudit,
  GraphSource,
  Lane,
  LateralNode,
  PipelineStep,
  RecentChange,
} from './cartography'
