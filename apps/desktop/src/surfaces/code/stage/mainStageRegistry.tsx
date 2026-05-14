import type { ReactNode } from 'react'
import { ConversationPanel } from './ConversationPanel'
import type { MainStageContext, MainStageMode } from './mainStageTypes'

export interface MainStageModeDefinition {
  id: MainStageMode
  label: string
  priority: number
  render: (ctx: MainStageContext) => ReactNode
}

const MODES: MainStageModeDefinition[] = [
  {
    id: 'forge',
    label: 'Forge',
    priority: 10,
    render: (ctx) => <ConversationPanel {...ctx} />,
  },
]

export const MAIN_STAGE_MODES = [...MODES].sort((a, b) => a.priority - b.priority)
