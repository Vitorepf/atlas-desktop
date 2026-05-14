/**
 * Atlas Premium Workbench · shared visual tokens (TS-side).
 *
 * Mantém em sincronia com os tokens CSS `--cc-*` em index.css. Sem hardcode
 * de cor; sempre referência variáveis CSS para suportar dark warm + tema
 * legacy (Cartografia) simultaneamente.
 */

export type WorkbenchTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

export type StatusKind =
  | 'idle'
  | 'ready'
  | 'running'
  | 'queued'
  | 'review'
  | 'blocked'
  | 'failed'
  | 'passed'
  | 'completed'
  | 'unknown'

export const TONE_BG: Record<WorkbenchTone, string> = {
  neutral: 'var(--cc-neutral-veil)',
  accent: 'var(--cc-accent-veil)',
  success: 'var(--cc-success-veil)',
  warning: 'var(--cc-warning-veil)',
  danger: 'var(--cc-danger-veil)',
  info: 'var(--cc-info-veil)',
}

export const TONE_BORDER: Record<WorkbenchTone, string> = {
  neutral: 'var(--cc-neutral-border)',
  accent: 'var(--cc-accent-border)',
  success: 'var(--cc-success-border)',
  warning: 'var(--cc-warning-border)',
  danger: 'var(--cc-danger-border)',
  info: 'var(--cc-info-border)',
}

export const TONE_FG: Record<WorkbenchTone, string> = {
  neutral: 'var(--cc-neutral-fg)',
  accent: 'var(--cc-accent-strong)',
  success: 'var(--cc-success-fg)',
  warning: 'var(--cc-warning-fg)',
  danger: 'var(--cc-danger-fg)',
  info: 'var(--cc-info-fg)',
}

/**
 * Mapa canônico de status humano → (tom + label curto + descrição base).
 * Descrições são genéricas; cenas concretas podem sobrescrever.
 */
export const STATUS_LABEL: Record<StatusKind, { label: string; tone: WorkbenchTone }> = {
  idle: { label: 'Ociosa', tone: 'neutral' },
  ready: { label: 'Pronta', tone: 'accent' },
  running: { label: 'Em execução', tone: 'info' },
  queued: { label: 'Enfileirada', tone: 'info' },
  review: { label: 'Aguardando revisão', tone: 'warning' },
  blocked: { label: 'Bloqueada', tone: 'danger' },
  failed: { label: 'Falhou', tone: 'danger' },
  passed: { label: 'Passou', tone: 'success' },
  completed: { label: 'Concluída', tone: 'success' },
  unknown: { label: 'Desconhecido', tone: 'neutral' },
}
