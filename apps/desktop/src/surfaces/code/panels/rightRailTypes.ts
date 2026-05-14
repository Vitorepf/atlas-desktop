import type { ReactNode } from 'react'
import type {
  BootSnapshot,
  CoreStatus,
  DecisionReceipt,
  ProgrammingGovernanceSnapshot,
  QualityGate,
  WorkStateSnapshot,
} from '@atlas/domain'

export type OpsTab = 'plan' | 'verify' | 'evidence'

export interface RightRailContext {
  receipt: DecisionReceipt | null
  gates: QualityGate[]
  core: CoreStatus
  evidence: WorkStateSnapshot['evidence']
  boot: BootSnapshot | null
  busy: boolean
  /**
   * SCOR-1 Programming Governance snapshot. `null` when the backend has not
   * persisted governance for the selected Obra — panels MUST render the
   * canonical empty state, never invented values.
   */
  programmingGovernance: ProgrammingGovernanceSnapshot | null
  onSignReceipt: () => Promise<void>
  onRunGate: (gateId: string) => Promise<void>
}

export interface RightRailPanelDefinition {
  id: OpsTab
  label: string
  priority: number
  render: (ctx: RightRailContext) => ReactNode
}
