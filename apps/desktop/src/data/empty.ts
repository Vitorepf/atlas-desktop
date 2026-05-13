/**
 * Empty states used when the Kernel has not returned data yet.
 *
 * Atlas Code must never paint invented Obras, packets, receipts, terminal
 * output or evidence. These values are neutral sentinels so components can
 * render "aguardando Kernel" without pretending work happened.
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

export const browserCoreStatus: CoreStatus = {
  mode: 'browser-offline',
  dbPath: '—',
  workspacePath: '—',
  pty: 'unavailable',
  signing: 'unavailable',
}

export const idlePipeline: SddStage[] = [
  { id: 'context', label: 'Context', state: 'todo' },
  { id: 'spec', label: 'Spec', state: 'todo' },
  { id: 'plan', label: 'Plan', state: 'todo' },
  { id: 'execute', label: 'Execute', state: 'todo' },
  { id: 'verify', label: 'Verify', state: 'todo' },
]

export const noObra: Obra = {
  id: '',
  title: '',
  objective: '',
  status: 'idle',
  workspacePath: '',
  createdAt: '',
}

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
