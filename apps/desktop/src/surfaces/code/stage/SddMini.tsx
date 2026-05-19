import type { ProgrammingGovernanceSnapshot, SddStage } from '@atlas/domain'

const stateGlyph: Record<SddStage['state'], string> = {
  done: '✓',
  now: '⏳',
  todo: '○',
  blocked: '△',
}

interface SddMiniProps {
  stages: SddStage[]
  receiptHash: string
  /**
   * SCOR-1 governance snapshot. When present, SDD steps are derived from real
   * artifact state (specHash, planHash, tasks, gateRuns, reviews, status).
   * When absent, the legacy `stages` prop is used as-is (idle pipeline).
   */
  programmingGovernance?: ProgrammingGovernanceSnapshot | null
  hasObra?: boolean
}

export function SddMini({ stages, receiptHash, programmingGovernance, hasObra }: SddMiniProps) {
  const derived = programmingGovernance
    ? deriveStagesFromGovernance(programmingGovernance, hasObra ?? true)
    : null
  const effective = derived ?? stages

  const doneCount = effective.filter((s) => s.state === 'done').length
  const totalCount = effective.length

  return (
    <div className="sdd-mini">
      <span className="label">SDD</span>
      <div className="stages">
        {effective.map((s) => (
          <span key={s.id} className={`stage ${s.state}`}>
            <span className="glyph">{stateGlyph[s.state]}</span>
            {s.label}
          </span>
        ))}
      </div>
      <span className="meta">
        {doneCount}/{totalCount}
        {receiptHash ? <> · receipt <span className="v">{receiptHash.slice(0, 6)}</span></> : null}
      </span>
    </div>
  )
}

/**
 * Map persisted Programming Governance artifacts to the 6 SDD stage states.
 * Rules from atlas-code-scor-1-implementation-contract.md §8:
 *
 *   context · existe Obra selecionada
 *   spec    · workItem.specHash existe
 *   plan    · workItem.planHash existe E tasks.length > 0
 *   execute · status executing/verifying/review/closed
 *   verify  · gateRuns.length > 0
 *   learn   · reviews.length > 0 OU status closed
 */
function deriveStagesFromGovernance(
  governance: ProgrammingGovernanceSnapshot,
  hasObra: boolean,
): SddStage[] {
  const wi = governance.workItem
  const status = wi?.status ?? null
  const executionStarted =
    status === 'executing' || status === 'verifying' || status === 'review' || status === 'closed'
  const learnDone = governance.reviews.length > 0 || status === 'closed'
  const verifyDone = governance.gateRuns.length > 0
  const planDone = !!wi?.planHash && governance.tasks.length > 0
  const specDone = !!wi?.specHash
  const contextDone = hasObra && !!wi

  const computed: SddStage[] = [
    { id: 'context', label: 'Context', state: stateFor(contextDone, !contextDone && hasObra) },
    { id: 'spec', label: 'Spec', state: stateFor(specDone, contextDone && !specDone) },
    { id: 'plan', label: 'Plan', state: stateFor(planDone, specDone && !planDone) },
    {
      id: 'execute',
      label: 'Execute',
      state: stateFor(executionStarted, planDone && !executionStarted),
    },
    { id: 'verify', label: 'Verify', state: stateFor(verifyDone, executionStarted && !verifyDone) },
    { id: 'learn', label: 'Learn', state: stateFor(learnDone, verifyDone && !learnDone) },
  ]

  return computed
}

function stateFor(done: boolean, active: boolean): SddStage['state'] {
  if (done) return 'done'
  if (active) return 'now'
  return 'todo'
}
