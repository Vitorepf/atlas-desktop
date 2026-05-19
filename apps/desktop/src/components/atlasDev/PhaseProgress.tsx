/**
 * Atlas Dev · PhaseProgress.
 *
 * Reads the timeline accumulated by `useAtlasDevRun`. Keepalive events are
 * filtered out by the hook; this component never sees them.
 *
 * Canonical phases per atlas-dev-efficient-programming-flow-v1 §8/§9:
 *   queued → executing → patch_projected | no_patch_needed → scope_guarding
 *   → verifying → repair_planned → repair_executing → escalation_triggered
 *   → receipt → complete
 */
import type { AtlasDevPhase } from './types'
import styles from './atlasDev.module.css'

interface PhaseProgressProps {
  phases: Array<{ phase: AtlasDevPhase; at: string }>
  currentPhase: AtlasDevPhase | null
  usingRestFallback: boolean
}

const PHASE_LABELS: Record<AtlasDevPhase, string> = {
  queued: 'fila',
  executing: 'executando',
  patch_projected: 'patch projetado',
  no_patch_needed: 'sem patch',
  scope_guarding: 'scope guard',
  verifying: 'verificação',
  repair_planned: 'repair planejado',
  repair_executing: 'repair em curso',
  escalation_triggered: 'escalada Forge',
  receipt: 'receipt',
  complete: 'concluído',
}

function formatHhmmss(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function PhaseProgress({ phases, currentPhase, usingRestFallback }: PhaseProgressProps) {
  return (
    <section className={styles.panel} aria-label="Atlas Dev run phases">
      <header className={styles.panelHeader}>
        <span className={styles.panelTitle}>Fases</span>
        <span>{usingRestFallback ? 'fonte: REST' : 'fonte: SSE'}</span>
      </header>

      {phases.length === 0 ? (
        <p className={styles.empty}>Nenhuma fase ainda. Confirme o plano para iniciar.</p>
      ) : (
        <ol className={styles.phaseList}>
          {phases.map((entry, index) => {
            const isCurrent = currentPhase === entry.phase && index === phases.length - 1
            return (
              <li
                key={`${entry.phase}-${entry.at}-${index}`}
                className={styles.phaseItem}
                data-active={isCurrent ? 'true' : 'false'}
              >
                <span className={styles.phaseLabel}>{PHASE_LABELS[entry.phase] ?? entry.phase}</span>
                <span className={styles.phaseTime}>{formatHhmmss(entry.at)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
