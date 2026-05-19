import type {
  AtlasCodeForgeUxOrchestrator,
  AtlasCodeObraCommandCenter,
  Message,
  Obra,
  ProgrammingGovernanceSnapshot,
  SddStage,
} from '@atlas/domain'
import { type AtlasRichInputPayload, useAtlasRichInputAttachments } from '../../../lib/rich-input'
import { ComposerPanel, type CodeComposerHints } from './ComposerPanel'
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
  onSend: (
    text: string,
    opts?: {
      richInput?: AtlasRichInputPayload | null
      composerHints?: CodeComposerHints
    },
  ) => Promise<void>
}

/**
 * Primary work mode for Atlas Code.
 * Atlas Code SCOR-1 has a single operator mode: Forge.
 *
 * The Atlas Unified Rich Input attachments hook lives here so each Obra
 * chat owns its own draft list — switching Obra creates a fresh stage and
 * therefore a fresh hook instance, which prevents accidental cross-Obra
 * attachment leakage.
 */
export function MainStage(props: MainStageProps) {
  const ctx: MainStageContext = props
  const activeMode = MAIN_STAGE_MODES[0]!
  const attachments = useAtlasRichInputAttachments()

  async function handleSend(
    text: string,
    opts: { richInput: AtlasRichInputPayload; composerHints: CodeComposerHints },
  ) {
    await props.onSend(text, {
      richInput: opts.richInput,
      composerHints: opts.composerHints,
    })
  }

  return (
    <main className="main-stage" data-mode={activeMode.id}>
      {activeMode.render(ctx)}
      <ComposerPanel
        busy={props.busy}
        hasObra={props.hasObra}
        onSend={handleSend}
        attachments={attachments}
      />
    </main>
  )
}
