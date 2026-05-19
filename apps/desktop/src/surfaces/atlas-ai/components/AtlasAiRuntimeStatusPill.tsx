/**
 * Atlas AI · Desktop · Runtime Status Pill (UX leve).
 *
 * Mostra de forma compacta:
 *   - status dot (ready/partial/blocked/unavailable/loading)
 *   - blocker primário OU active mission OU "Atlas pronto"
 *   - badge de approvals pendentes (quando > 0)
 *   - chevron Dev/Forge quando há handoff recente
 *
 * NÃO renderiza JSON cru, NÃO replica o Context Panel — clicar abre o painel
 * lateral via `onOpenContext`, onde o conteúdo técnico completo já vive.
 *
 * Estilo: slate dark canon, sem cor hardcoded. Tokens via `var(--cc-*)`.
 */
import type { RuntimeReadinessView } from '../runtimeReadinessView'

interface AtlasAiRuntimeStatusPillProps {
  readiness: RuntimeReadinessView
  onOpenContext?: () => void
}

function statusDotClass(status: RuntimeReadinessView['status']): string {
  return `atlas-ai-runtime-pill-dot is-${status}`
}

function pillLabel(readiness: RuntimeReadinessView): string {
  if (readiness.status === 'loading') return 'verificando runtime…'
  if (readiness.status === 'unavailable') return 'runtime indisponível'
  if (readiness.status === 'blocked' && readiness.primaryBlocker) {
    return `bloqueado · ${readiness.primaryBlocker}`
  }
  if (readiness.status === 'partial' && readiness.primaryBlocker) {
    return `parcial · ${readiness.primaryBlocker}`
  }
  if (readiness.activeMission) {
    return `missão · ${readiness.activeMission.title}`
  }
  return 'Atlas pronto'
}

function handoffGlyph(readiness: RuntimeReadinessView): string | null {
  if (!readiness.latestHandoff) return null
  if (readiness.latestHandoff.isForge) return 'forge'
  if (readiness.latestHandoff.isDev) return 'dev'
  return null
}

export function AtlasAiRuntimeStatusPill({ readiness, onOpenContext }: AtlasAiRuntimeStatusPillProps) {
  // Não renderiza nada enquanto o primeiro fetch ainda está em voo: evita
  // poluir o header com "verificando…" em estados estáveis subsequentes.
  if (readiness.status === 'loading' && !readiness.isLoaded) return null
  // Quando o endpoint não respondeu (404/timeout silencioso): nada de pill,
  // não polui composer e preserva o premium editorial.
  if (readiness.status === 'unavailable') return null

  const label = pillLabel(readiness)
  const handoff = handoffGlyph(readiness)
  const approvals = readiness.pendingApprovalsCount

  return (
    <button
      type="button"
      className={`atlas-ai-runtime-pill is-${readiness.status}`}
      onClick={onOpenContext}
      aria-label={`Runtime ${readiness.statusLabel}. Abrir contexto/trace.`}
      title={`${readiness.statusLabel} · clique para abrir contexto/trace`}
    >
      <span className={statusDotClass(readiness.status)} aria-hidden="true" />
      <span className="atlas-ai-runtime-pill-label">{label}</span>
      {readiness.activeMission?.nextAction ? (
        <span className="atlas-ai-runtime-pill-next" aria-label="próxima ação">
          · {readiness.activeMission.nextAction}
        </span>
      ) : null}
      {approvals > 0 ? (
        <span className="atlas-ai-runtime-pill-badge" aria-label={`${approvals} aprovações pendentes`}>
          {approvals} aprov.
        </span>
      ) : null}
      {handoff ? (
        <span className="atlas-ai-runtime-pill-handoff" aria-label={`handoff para Atlas ${handoff}`}>
          → {handoff}
        </span>
      ) : null}
    </button>
  )
}
