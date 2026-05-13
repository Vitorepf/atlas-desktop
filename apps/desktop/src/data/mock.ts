/**
 * apps/desktop/src/data/empty.ts (formerly mock.ts)
 *
 * CANON · feedback_atlas_no_mock.md
 *   Atlas Code never paints invented data. When the Kernel hasn't produced
 *   evidence yet, the cockpit shows the empty state honestly.
 *
 * The exports below are NOT mocks. They are the typed empty/default values
 * components fall back to when there's literally nothing to render — same
 * shape as the domain types, but populated with neutral sentinels (`—`,
 * empty arrays, "todo" pipeline state). Never call these "mock data".
 */
import type {
  CoreStatus,
  DecisionReceipt,
  Message,
  Obra,
  Packet,
  QualityGate,
  SddStage,
  Session,
} from '@atlas/domain'

/**
 * Browser fallback core status — accurate when running `npm run dev` outside
 * the Tauri shell. PTY/signing are honestly labeled "unavailable".
 */
export const browserCoreStatus: CoreStatus = {
  mode: 'browser-fallback',
  dbPath: '—',
  workspacePath: '—',
  pty: 'mock',
  signing: 'mock',
}

/** SDD pipeline before any obra has started — every stage is `todo`. */
export const idlePipeline: SddStage[] = [
  { id: 'context', label: 'Context', state: 'todo' },
  { id: 'spec', label: 'Spec', state: 'todo' },
  { id: 'plan', label: 'Plan', state: 'todo' },
  { id: 'execute', label: 'Execute', state: 'todo' },
  { id: 'verify', label: 'Verify', state: 'todo' },
]

/** Default obra placeholder when the user hasn't selected one. */
export const noObra: Obra = {
  id: '',
  title: '',
  objective: '',
  status: 'idle',
  workspacePath: '',
  createdAt: '',
}

/** Default empty receipt — components show "aguardando" when this is used. */
export const noReceipt: DecisionReceipt = {
  id: '',
  obraId: '',
  primary: '',
  confidence: 'low',
  confidenceScore: 0,
  budgetEstUsd: 0,
  budgetUsedUsd: 0,
  fallbackChain: [],
}

export const noSessions: Session[] = []
export const noMessages: Message[] = []
export const noPackets: Packet[] = []
export const noGates: QualityGate[] = []
export const noTerminalLines: Array<{
  kind: 'user' | 'atlas'
  indent?: boolean
  text: string
  ok?: boolean
}> = []
