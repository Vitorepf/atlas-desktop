/**
 * Mock data for the layout-only MVP scaffold. NO business rules here — these
 * are placeholders the components render against until atlas-bridge starts
 * pulling real payloads from atlas-server.
 *
 * Schemas mirror @atlas/domain.
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

export const obra: Obra = {
  id: 'OBRA-238',
  title: 'Refatorar módulo Decide pra extrair trait Gated<T>',
  objective: 'Refatorar módulo Decide pra extrair trait Gated<T>',
  status: 'active',
  workspacePath: '~/develop/Atlas/atlas-server',
  createdAt: '2026-05-12T14:30:00Z',
}

export const coreStatus: CoreStatus = {
  mode: 'browser-fallback',
  dbPath: '~/.atlas/atlas.db',
  workspacePath: '~/develop/Atlas/atlas-server',
  pty: 'mock',
  signing: 'mock',
}

export const sddStages: SddStage[] = [
  { id: 'context', label: 'Context', state: 'done' },
  { id: 'spec', label: 'Spec', state: 'done' },
  { id: 'plan', label: 'Plan', state: 'done' },
  { id: 'execute', label: 'Execute', state: 'now' },
  { id: 'verify', label: 'Verify', state: 'todo' },
]

export const sessions: Session[] = [
  {
    id: 'sess-238',
    obraId: 'OBRA-238',
    threadId: 'thr-238-a',
    title: 'OBRA-238 · Refatorar Decide → trait Gated',
    status: 'running',
    turns: 12,
    durationMs: 124000,
    origin: 'cli',
    snapshot: { sizeKb: 3.2, intentPreserved: true, evidenceRefs: 4 },
  },
  {
    id: 'sess-239',
    obraId: 'OBRA-239',
    threadId: 'thr-239-a',
    title: 'OBRA-239 · Migrar policy gate versionado',
    status: 'running',
    turns: 7,
    durationMs: 184000,
    origin: 'cli',
  },
]

export const recentSessions: Session[] = [
  {
    id: 'sess-237',
    obraId: 'OBRA-237',
    threadId: 'thr-237-a',
    title: 'OBRA-237 · Source Authority canon',
    status: 'done',
    turns: 9,
    durationMs: 312000,
    origin: 'manual',
  },
  {
    id: 'sess-236',
    obraId: 'OBRA-236',
    threadId: 'thr-236-a',
    title: 'OBRA-236 · Cartografia backend reader',
    status: 'done',
    turns: 14,
    durationMs: 412000,
    origin: 'manual',
  },
]

export const messages: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    body:
      'refatora o módulo Decide pra extrair trait Gated<T> — padrão repetido em 4 funções. mantém policy gate canon, atualiza testes.',
    channel: 'text',
    ts: '14:32',
  },
  {
    id: 'msg-2',
    role: 'atlas',
    body:
      'Context Scout puxou 6 fontes. Spec Compiler interpretou intent → 3 requirements + 5 acceptance criteria. Plan Compiler emitiu 3 passos disjuntos. Decision Receipt assinado. Confirma antes de eu chamar providers.',
    ts: '14:32',
  },
]

export const packets: Packet[] = [
  { id: 'AIP-238-A', agent: 'claude sonnet 4', title: 'extrair trait Gated<T>', status: 'done', costUsd: 0.011, tokens: 8200, durationMs: 4100 },
  { id: 'AIP-238-B', agent: 'codex gpt-5.5', title: 'migrar budget + policy gates', status: 'running', tokens: 3400 },
  { id: 'AIP-238-C', agent: 'claude sonnet 4', title: 'atualizar 9 testes + 3 novos', status: 'todo' },
]

export const receipt: DecisionReceipt = {
  id: '0x4f2c8a1d',
  obraId: 'OBRA-238',
  primary: 'claude sonnet 4',
  confidence: 'high',
  confidenceScore: 0.87,
  budgetEstUsd: 0.024,
  budgetUsedUsd: 8.34,
  fallbackChain: ['claude opus', 'codex gpt-5.5'],
}

export const gates: QualityGate[] = [
  { id: 'contract', name: 'contract', state: 'passed' },
  { id: 'spec', name: 'spec', state: 'passed' },
  { id: 'scope', name: 'scope validator', state: 'passed' },
  { id: 'tests', name: 'tests · 9/9', state: 'passed' },
  { id: 'security', name: 'security scan', state: 'passed' },
  { id: 'ac', name: 'acceptance criteria', state: 'pending' },
  { id: 'scenario', name: 'scenario coverage', state: 'pending' },
  { id: 'manual_qa', name: 'manual QA', state: 'pending' },
  { id: 'deep_review', name: 'deep review P0/P1', state: 'pending' },
]

export const terminalLines: Array<{ kind: 'user' | 'atlas'; indent?: boolean; text: string; ok?: boolean }> = [
  { kind: 'user', text: 'atlas ~/develop/Atlas/atlas-server $ # comandos shell continuam disponíveis · Atlas observa' },
  { kind: 'atlas', text: '∴ Plan Compiler emitiu 3 packets disjuntos · receipt 0x4f2c8a1d' },
  { kind: 'atlas', text: '∴ agent i. (claude sonnet 4) extraindo trait Gated<T> em gated.rs' },
  { kind: 'atlas', indent: true, text: '✓ +18 linhas · 4.1s · $0.011 · scope ok', ok: true },
  { kind: 'atlas', text: '∴ agent ii. (codex gpt-5.5) migrando budget_gate + policy_gate · streaming' },
  { kind: 'atlas', indent: true, text: '47% · 3.4k tokens · ~3min restantes' },
  { kind: 'atlas', text: '▸ aguardando passo ii. concluir antes de iii.' },
]
