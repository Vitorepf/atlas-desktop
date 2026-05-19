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

const STATUS_LABEL: Record<RuntimeReadinessStatus, string> = {
  ready: 'Pronto',
  partial: 'Parcial',
  blocked: 'Bloqueado',
  unavailable: 'Indisponível',
  loading: 'Verificando',
}

export function statusLabelFor(status: RuntimeReadinessStatus): string {
  return STATUS_LABEL[status]
}

/**
 * Converte um identificador `snake_case` técnico (vindo do backend) em um
 * rótulo humano para o pill. Não inventa conteúdo — apenas formata para a
 * UX leve. Mantém `blocker_id` intacto se já é legível.
 */
function humanizeBlockerId(id: string): string {
  return id.replace(/[._-]+/g, ' ').trim()
}

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
