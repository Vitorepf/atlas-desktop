import { AtlasDevPlanVisiblePanel } from './AtlasDevPlanVisiblePanel'
import { ForgeProviderCapacityPanel } from './ForgeProviderCapacityPanel'
import { ForgeProviderTopologyPanel } from './ForgeProviderTopologyPanel'
import { AtlasSelfImprovementGovernancePanel } from './AtlasSelfImprovementGovernancePanel'
import { PlanPanel } from './PlanPanel'
import type { RightRailContext } from './rightRailTypes'

export function ForgeAdvancedPanel(ctx: RightRailContext) {
  // Gap2.F3 — Plan Visible (A2) integrated. Plan data source wiring
  // (reading plan_json from the work item via bridge) is sibling AP;
  // panel renders the honest empty state until then.
  return (
    <>
      <AtlasDevPlanVisiblePanel plan={null} />
      <PlanPanel {...ctx} />
      <ForgeProviderTopologyPanel {...ctx} />
      <ForgeProviderCapacityPanel {...ctx} />
      <AtlasSelfImprovementGovernancePanel {...ctx} />
    </>
  )
}
