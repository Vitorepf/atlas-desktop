/**
 * Atlas Dev · Run workbench.
 *
 * Composes the five Run-side panels around the `useAtlasDevRun` controller.
 * Drop this into the Atlas AI surface (or a Storybook fixture) once a plan
 * result is in hand. The component never auto-runs; it always waits for the
 * operator to click the RunPanel button.
 *
 * Integration note for Claude 17 (Plan-only): pass the canonical Plan result
 * via `plan`. The plan can be `null` while a new plan is being composed —
 * everything degrades to empty states, no crashes.
 */
import { DiffViewer } from './DiffViewer'
import { InlineIndicators } from './InlineIndicators'
import { PhaseProgress } from './PhaseProgress'
import { ReceiptCard } from './ReceiptCard'
import { RunPanel } from './RunPanel'
import { TestsPanel } from './TestsPanel'
import type { PlanOnlyResult } from './types'
import { useAtlasDevRun } from './useAtlasDevRun'
import styles from './atlasDev.module.css'

interface AtlasDevRunWorkbenchProps {
  plan: PlanOnlyResult | null
  /** Optional caller-controlled lock (e.g. while plan is being recomposed). */
  disabled?: boolean
}

export function AtlasDevRunWorkbench({ plan, disabled = false }: AtlasDevRunWorkbenchProps) {
  const controller = useAtlasDevRun(plan)

  const diffPreview =
    controller.receipt?.ui_hints?.diff_preview ?? plan?.ui_hints?.diff_preview ?? null
  const completion = controller.receipt?.completion?.status ?? null

  return (
    <div className={styles.workbench}>
      <RunPanel plan={plan} controller={controller} disabled={disabled} />
      <InlineIndicators
        status={controller.status}
        receipt={controller.receipt}
        repairAttempts={controller.repairAttempts}
        usingRestFallback={controller.usingRestFallback}
      />
      <PhaseProgress
        phases={controller.phases}
        currentPhase={controller.currentPhase}
        usingRestFallback={controller.usingRestFallback}
      />
      <DiffViewer diff={diffPreview} completionState={completion} />
      <TestsPanel tests={controller.tests} />
      <ReceiptCard receipt={controller.receipt} />
    </div>
  )
}
