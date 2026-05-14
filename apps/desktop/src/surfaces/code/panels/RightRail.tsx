import { useMemo, useState } from 'react'
import type {
  BootSnapshot,
  CoreStatus,
  DecisionReceipt,
  ProgrammingGovernanceSnapshot,
  QualityGate,
  WorkStateSnapshot,
} from '@atlas/domain'
import { RIGHT_RAIL_PANELS } from './rightRailRegistry'
import type { OpsTab, RightRailContext } from './rightRailTypes'

interface RightRailProps {
  receipt: DecisionReceipt | null
  gates: QualityGate[]
  core: CoreStatus
  evidence: WorkStateSnapshot['evidence']
  boot: BootSnapshot | null
  busy: boolean
  programmingGovernance: ProgrammingGovernanceSnapshot | null
  onSignReceipt: () => Promise<void>
  onRunGate: (gateId: string) => Promise<void>
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

