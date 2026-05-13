import type { Message, SddStage } from '@atlas/domain'

export type MainStageMode = 'conversation' | 'spec' | 'plan' | 'diff' | 'replay' | 'repair'

export interface MainStageContext {
  stages: SddStage[]
  messages: Message[]
  receiptHash: string
  loading: boolean
  busy: boolean
  hasObra: boolean
  onSend: (text: string) => Promise<void>
}
