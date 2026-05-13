import { useMemo, useState } from 'react'
import type { Message, SddStage } from '@atlas/domain'
import { ComposerPanel } from './ComposerPanel'
import { MAIN_STAGE_MODES } from './mainStageRegistry'
import type { MainStageContext, MainStageMode } from './mainStageTypes'

interface MainStageProps {
  stages: SddStage[]
  messages: Message[]
  receiptHash: string
  loading: boolean
  busy: boolean
  hasObra: boolean
  onSend: (text: string) => Promise<void>
}

/**
 * Primary work mode for Atlas Code.
 *
 * Today only conversation is active, but the host already has the contract for
 * future modes: spec, plan, diff, replay and repair. Composer remains stable
 * across modes so the operator never loses the command surface.
 */
export function MainStage(props: MainStageProps) {
  const [mode] = useState<MainStageMode>('conversation')
  const ctx: MainStageContext = props
  const activeMode = useMemo(
    () => MAIN_STAGE_MODES.find((item) => item.id === mode) ?? MAIN_STAGE_MODES[0]!,
    [mode],
  )

  return (
    <main className="main-stage" data-mode={mode}>
      {activeMode.render(ctx)}
      <ComposerPanel busy={props.busy} hasObra={props.hasObra} onSend={props.onSend} />
    </main>
  )
}

