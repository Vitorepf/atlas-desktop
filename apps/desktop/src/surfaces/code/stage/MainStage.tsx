import type {
  AtlasCodeForgeUxOrchestrator,
  AtlasCodeObraCommandCenter,
  Message,
  Obra,
  ProgrammingGovernanceSnapshot,
  SddStage,
} from '@atlas/domain'
import { ComposerPanel } from './ComposerPanel'
import { MAIN_STAGE_MODES } from './mainStageRegistry'
import type { MainStageContext } from './mainStageTypes'

interface MainStageProps {
  stages: SddStage[]
  messages: Message[]
  receiptHash: string
  loading: boolean
  busy: boolean
  hasObra: boolean
  programmingGovernance: ProgrammingGovernanceSnapshot | null
  obra: Obra | null
  forgeUxOrchestrator: AtlasCodeForgeUxOrchestrator | null
  obraCommandCenter: AtlasCodeObraCommandCenter | null
  onSend: (text: string) => Promise<void>
}

/**
 * Primary work mode for Atlas Code.
 * Atlas Code SCOR-1 has a single operator mode: Forge.
 */
export function MainStage(props: MainStageProps) {
  const ctx: MainStageContext = props
  const activeMode = MAIN_STAGE_MODES[0]!

  return (
    <main className="main-stage" data-mode={activeMode.id}>
      {activeMode.render(ctx)}
      <ComposerPanel busy={props.busy} hasObra={props.hasObra} onSend={props.onSend} />
    </main>
  )
}
