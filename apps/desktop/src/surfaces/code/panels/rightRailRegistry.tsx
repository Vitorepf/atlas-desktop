import { EvidencePanel } from './EvidencePanel'
import { PlanPanel } from './PlanPanel'
import { VerifyPanel } from './VerifyPanel'
import type { RightRailContext, RightRailPanelDefinition } from './rightRailTypes'

const PANELS: RightRailPanelDefinition[] = [
  {
    id: 'plan',
    label: 'Plan',
    priority: 10,
    render: (ctx: RightRailContext) => <PlanPanel {...ctx} />,
  },
  {
    id: 'verify',
    label: 'Verify',
    priority: 20,
    render: (ctx: RightRailContext) => <VerifyPanel {...ctx} />,
  },
  {
    id: 'evidence',
    label: 'Evidence',
    priority: 30,
    render: (ctx: RightRailContext) => <EvidencePanel {...ctx} />,
  },
]

export const RIGHT_RAIL_PANELS: RightRailPanelDefinition[] = [...PANELS].sort(
  (a, b) => a.priority - b.priority,
)
