import { ForgeProviderCapacityPanel } from './ForgeProviderCapacityPanel'
import { ForgeProviderTopologyPanel } from './ForgeProviderTopologyPanel'
import { AtlasSelfImprovementGovernancePanel } from './AtlasSelfImprovementGovernancePanel'
import { PlanPanel } from './PlanPanel'
import type { RightRailContext } from './rightRailTypes'

export function ForgeAdvancedPanel(ctx: RightRailContext) {
  return (
    <>
      <PlanPanel {...ctx} />
      <ForgeProviderTopologyPanel {...ctx} />
      <ForgeProviderCapacityPanel {...ctx} />
      <AtlasSelfImprovementGovernancePanel {...ctx} />
    </>
  )
}
