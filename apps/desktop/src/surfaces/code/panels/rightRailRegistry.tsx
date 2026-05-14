import { EvidencePanel } from './EvidencePanel'
import { ForgeOperatorCockpitPanel } from './ForgeOperatorCockpitPanel'
import { ForgeProviderCapacityPanel } from './ForgeProviderCapacityPanel'
import { ForgeProviderTopologyPanel } from './ForgeProviderTopologyPanel'
import { ForgeWorkIntakePanel } from './ForgeWorkIntakePanel'
import { PlanPanel } from './PlanPanel'
import { VerifyPanel } from './VerifyPanel'
import type { RightRailContext, RightRailPanelDefinition } from './rightRailTypes'

const PANELS: RightRailPanelDefinition[] = [
  {
    id: 'intake',
    label: 'Intake',
    priority: 1,
    render: (ctx: RightRailContext) => (
      <ForgeWorkIntakePanel
        obraId={ctx.obra?.id ?? null}
        intake={ctx.forgeWorkIntake}
        busy={ctx.busy}
        onRefresh={ctx.onRefreshForgeWorkIntake}
        onSave={ctx.onSaveForgeWorkIntake}
      />
    ),
  },
  {
    id: 'cockpit',
    label: 'Cockpit',
    priority: 5,
    render: (ctx: RightRailContext) => <ForgeOperatorCockpitPanel {...ctx} />,
  },
  {
    id: 'topology',
    label: 'Topology',
    priority: 7,
    render: (ctx: RightRailContext) => <ForgeProviderTopologyPanel {...ctx} />,
  },
  {
    id: 'capacity',
    label: 'Capacity',
    priority: 8,
    render: (ctx: RightRailContext) => <ForgeProviderCapacityPanel {...ctx} />,
  },
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
