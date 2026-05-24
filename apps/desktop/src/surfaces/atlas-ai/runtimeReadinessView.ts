/**
 * Atlas AI · Desktop · view-model puro do Runtime Readiness Gate.
 *
 * Separado do hook React para permitir testes diretos via `node:test`
 * sem depender de `import.meta.env` do Vite.
 */
import type { AtlasAiRuntimeReadiness } from './types'

export type RuntimeReadinessStatus = 'ready' | 'partial' | 'blocked' | 'unavailable' | 'loading'

export interface RuntimeReadinessActiveMission {
  id: string
  title: string
  status: string
  missionType: string | null
  nextAction: string | null
}

export interface RuntimeReadinessLatestHandoff {
  target: 'atlas_dev' | 'atlas_forge' | string
  reason: string
  status: string
  createdAt: string | null
  isDev: boolean
  isForge: boolean
}

export interface RuntimeReadinessView {
  raw: AtlasAiRuntimeReadiness | null
  status: RuntimeReadinessStatus
  statusLabel: string
  isLoaded: boolean
  isFetching: boolean
  criticalFailed: number
  warnFailed: number
  blockers: ReadonlyArray<string>
  warnings: ReadonlyArray<string>
  /** Primeiro blocker (rótulo limpo para o pill). Null se status=ready. */
  primaryBlocker: string | null
  certificationHash: string | null
  /** Hash truncado para chip (12 chars + ellipsis). */
  certificationHashShort: string | null
  /** Bundle UX dinâmico — Atlas Mission ativa, contadores, handoff. */
  activeMission: RuntimeReadinessActiveMission | null
  pendingApprovalsCount: number
  latestHandoff: RuntimeReadinessLatestHandoff | null
  refresh: () => void
}

export interface AwisOperationalHealthInput {
  historyHealthy: boolean
  serverHealth?: {
    status: 'ready' | 'degraded' | 'loading' | 'unavailable' | string
    dbConnected?: boolean | null
  } | null
}

const STATUS_LABEL: Record<RuntimeReadinessStatus, string> = {
  ready: 'Pronto',
  partial: 'Parcial',
  blocked: 'Certificação pendente',
  unavailable: 'Indisponível',
  loading: 'Verificando',
}

const BLOCKER_LABELS: Record<string, string> = {
  control_plane_runtime: 'contexto e execução',
  memory_learning_loop: 'memória e aprendizado',
  mission_foundation_readiness: 'base operacional da missão',
  operator_approval_gates: 'aprovações do operador',
  router_runtime_readiness: 'roteamento inteligente',
}

export function statusLabelFor(status: RuntimeReadinessStatus): string {
  return STATUS_LABEL[status]
}

/**
 * Converte um identificador `snake_case` técnico (vindo do backend) em um
 * rótulo humano para o pill. Não inventa conteúdo — apenas formata para a
 * UX leve. Mantém `blocker_id` intacto se já é legível.
 */
export function humanizeBlockerId(id: string): string {
  return BLOCKER_LABELS[id] ?? id.replace(/[._-]+/g, ' ').trim()
}

export const humanizeRuntimeSignal = humanizeBlockerId

export function buildRuntimeReadinessView(
  raw: AtlasAiRuntimeReadiness | null,
  isFetching: boolean,
  isLoaded: boolean,
  refresh: () => void,
): RuntimeReadinessView {
  if (!raw) {
    const status: RuntimeReadinessStatus = isLoaded ? 'unavailable' : 'loading'
    return {
      raw: null,
      status,
      statusLabel: STATUS_LABEL[status],
      isLoaded,
      isFetching,
      criticalFailed: 0,
      warnFailed: 0,
      blockers: [],
      warnings: [],
      primaryBlocker: null,
      certificationHash: null,
      certificationHashShort: null,
      activeMission: null,
      pendingApprovalsCount: 0,
      latestHandoff: null,
      refresh,
    }
  }

  const rawStatus = (raw.status ?? 'unavailable') as RuntimeReadinessStatus
  const status: RuntimeReadinessStatus
    = rawStatus === 'ready' || rawStatus === 'partial' || rawStatus === 'blocked'
      ? rawStatus
      : 'unavailable'

  const blockers = raw.blockers ?? []
  const warnings = raw.warnings ?? []
  const primaryBlocker = blockers.length > 0
    ? humanizeBlockerId(blockers[0]!)
    : warnings.length > 0
      ? humanizeBlockerId(warnings[0]!)
      : null

  const hash = raw.certification_hash ?? null

  const bundleMission = raw.ux_bundle?.active_mission ?? null
  const activeMission: RuntimeReadinessActiveMission | null = bundleMission && bundleMission.id
    ? {
        id: String(bundleMission.id),
        title: String(bundleMission.title ?? 'Sem título'),
        status: String(bundleMission.status ?? 'unknown'),
        missionType: bundleMission.mission_type ?? null,
        nextAction: bundleMission.next_action ?? null,
      }
    : null

  const bundleHandoff = raw.ux_bundle?.latest_handoff ?? null
  const latestHandoff: RuntimeReadinessLatestHandoff | null = bundleHandoff && bundleHandoff.target
    ? {
        target: String(bundleHandoff.target),
        reason: String(bundleHandoff.reason ?? ''),
        status: String(bundleHandoff.status ?? 'unknown'),
        createdAt: bundleHandoff.created_at ?? null,
        isDev: String(bundleHandoff.target).toLowerCase().includes('dev'),
        isForge: String(bundleHandoff.target).toLowerCase().includes('forge'),
      }
    : null

  return {
    raw,
    status,
    statusLabel: STATUS_LABEL[status],
    isLoaded,
    isFetching,
    criticalFailed: raw.summary?.critical_failed ?? 0,
    warnFailed: raw.summary?.warn_failed ?? 0,
    blockers,
    warnings,
    primaryBlocker,
    certificationHash: hash,
    certificationHashShort: hash ? `${hash.slice(0, 12)}…` : null,
    activeMission,
    pendingApprovalsCount: raw.ux_bundle?.pending_approvals_count ?? 0,
    latestHandoff,
    refresh,
  }
}

export function applyAwisOperationalHealth(
  view: RuntimeReadinessView,
  health: AwisOperationalHealthInput,
): RuntimeReadinessView {
  if (view.status === 'loading' || view.status === 'unavailable') return view

  const serverStatus = health.serverHealth?.status ?? null
  const dbUnavailable = health.serverHealth?.dbConnected === false
  const warnings = [...view.warnings]

  if (!health.historyHealthy || dbUnavailable) {
    warnings.push('histórico local indisponível')
  }
  if (serverStatus === 'unavailable') {
    warnings.push('serviço local indisponível')
  } else if (serverStatus === 'degraded' && !dbUnavailable) {
    warnings.push('serviço local requer atenção')
  }

  const uniqueWarnings = Array.from(new Set(warnings))
  if (uniqueWarnings.length === view.warnings.length) return view

  const nextStatus: RuntimeReadinessStatus = view.status === 'blocked' ? 'blocked' : 'partial'
  return {
    ...view,
    status: nextStatus,
    statusLabel: STATUS_LABEL[nextStatus],
    warnFailed: Math.max(view.warnFailed, uniqueWarnings.length),
    warnings: uniqueWarnings,
    primaryBlocker: view.primaryBlocker ?? uniqueWarnings[0] ?? null,
  }
}
