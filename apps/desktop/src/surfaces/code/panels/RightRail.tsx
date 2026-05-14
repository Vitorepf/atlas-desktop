import { useMemo, useState } from 'react'
import type {
  AtlasCodeEnterpriseCertificationReport,
  AtlasCodeForgeFastPathRunStatus,
  BootSnapshot,
  CoreStatus,
  DecisionReceipt,
  Obra,
  ProgrammingGovernanceSnapshot,
  QualityGate,
  WorkStateSnapshot,
} from '@atlas/domain'
import { RIGHT_RAIL_PANELS } from './rightRailRegistry'
import type { OpsTab, RightRailContext } from './rightRailTypes'

interface RightRailProps {
  obra: Obra | null
  receipt: DecisionReceipt | null
  gates: QualityGate[]
  core: CoreStatus
  evidence: WorkStateSnapshot['evidence']
  forgeLiveExecution: WorkStateSnapshot['forgeLiveExecution']
  forgeLiveExecutionAsync: WorkStateSnapshot['forgeLiveExecutionAsync']
  forgeLiveExecutionHistory: WorkStateSnapshot['forgeLiveExecutionHistory']
  forgeTaskQueue: WorkStateSnapshot['forgeTaskQueue']
  forgeFastPath: WorkStateSnapshot['forgeFastPath']
  forgeFastPathStatus: AtlasCodeForgeFastPathRunStatus | null
  forgeRunHistoryReplay: WorkStateSnapshot['forgeRunHistoryReplay']
  forgeReview: WorkStateSnapshot['forgeReview']
  forgeReviewHistory: WorkStateSnapshot['forgeReviewHistory']
  checkpoint: WorkStateSnapshot['checkpoint']
  atlasCodeEnterpriseCertification: AtlasCodeEnterpriseCertificationReport | null
  boot: BootSnapshot | null
  busy: boolean
  programmingGovernance: ProgrammingGovernanceSnapshot | null
  onSignReceipt: () => Promise<void>
  onRunGate: (gateId: string) => Promise<void>
  onRunForgeLiveExecution: () => Promise<void>
  onRunForgeFastPath: (mode?: 'prepare_only' | 'execute_async' | 'execute_sync') => Promise<void>
  onRefreshForgeFastPathStatus: (runId?: string) => Promise<void>
  onResumeForgeFastPath: (runId?: string) => Promise<void>
  onStartForgeLiveExecutionAsync: () => Promise<void>
  onRefreshForgeLiveExecutionAsync: () => Promise<void>
  onInspectForgeRunHistory: (historyId: string) => Promise<void>
  onCreateProgrammingWorkItem: () => Promise<void>
  onCompileProgrammingWorkItemSpecPlan: () => Promise<void>
  onReviewForgeRun: (decision?: 'approved' | 'rejected', comment?: string) => Promise<void>
  onRollbackForgePromotion: (promotionId?: string, comment?: string) => Promise<void>
  onCreateCheckpoint: () => Promise<void>
  onRunAtlasCodeEnterpriseCertification: () => Promise<void>
}

/**
 * Operational governance rail.
 *
 * It owns tab selection only. Concrete panels live under the Code surface
 * registry so future panels can be added without growing this component.
 */
export function RightRail(props: RightRailProps) {
  const [tab, setTab] = useState<OpsTab>('plan')

  const ctx: RightRailContext = props
  const activePanel = useMemo(
    () => RIGHT_RAIL_PANELS.find((panel) => panel.id === tab) ?? RIGHT_RAIL_PANELS[0]!,
    [tab],
  )

  return (
    <aside className="right-rail">
      <nav className="ops-tabs" role="tablist" aria-label="Painéis operacionais">
        {RIGHT_RAIL_PANELS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            role="tab"
            aria-selected={tab === panel.id}
            className={`ops-tab${tab === panel.id ? ' on' : ''}`}
            onClick={() => setTab(panel.id)}
          >
            {panel.label}
          </button>
        ))}
      </nav>

      {activePanel.render(ctx)}
    </aside>
  )
}
