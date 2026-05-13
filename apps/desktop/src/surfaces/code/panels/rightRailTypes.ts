import type { ReactNode } from 'react'
import type { BootSnapshot, CoreStatus, DecisionReceipt, QualityGate, WorkStateSnapshot } from '@atlas/domain'

export type OpsTab = 'plan' | 'verify' | 'evidence'

export interface RightRailContext {
  receipt: DecisionReceipt | null
  gates: QualityGate[]
  core: CoreStatus
  evidence: WorkStateSnapshot['evidence']
  boot: BootSnapshot | null
  busy: boolean
  onSignReceipt: () => Promise<void>
  onRunGate: (gateId: string) => Promise<void>
}

export interface RightRailPanelDefinition {
  id: OpsTab
  label: string
  priority: number
  render: (ctx: RightRailContext) => ReactNode
}
