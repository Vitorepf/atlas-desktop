import type { Message, ProgrammingGovernanceSnapshot, SddStage } from '@atlas/domain'

export type MainStageMode = 'forge'

export interface MainStageContext {
  stages: SddStage[]
  messages: Message[]
  receiptHash: string
  loading: boolean
  busy: boolean
  hasObra: boolean
  /**
   * SCOR-1 Programming Governance snapshot. `null` means the runtime has no
   * governed work item bound; Forge must show an honest empty state instead of
   * inventing draft content.
   */
  programmingGovernance: ProgrammingGovernanceSnapshot | null
  onSend: (text: string) => Promise<void>
}
