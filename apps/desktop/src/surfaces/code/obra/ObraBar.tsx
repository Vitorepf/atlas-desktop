import { useState } from 'react'
import type { Obra } from '@atlas/domain'
import { ActiveObraBar } from './ActiveObraBar'
import { CreateObraBar } from './CreateObraBar'
import { LoadingObraBar } from './LoadingObraBar'

interface ObraBarProps {
  obra: Obra | null
  onCreate: (intent: string, objective: string) => Promise<Obra | null>
  busy: boolean
}

/**
 * Intent boundary for the active work.
 *
 * It chooses between create, loading and active states. Concrete UI states live
 * in the Code surface so the bar can grow with workspace/policy context without
 * becoming a monolith.
 */
export function ObraBar({ obra, onCreate, busy }: ObraBarProps) {
  const [creating, setCreating] = useState(false)
  const [objective, setObjective] = useState('')
  const [intent, setIntent] = useState('')

  async function create() {
    const result = await onCreate(intent.trim(), objective.trim())
    if (result) {
      setCreating(false)
      setObjective('')
      setIntent('')
    }
    return result
  }

  if (creating || (!obra && !busy)) {
    return (
      <CreateObraBar
        objective={objective}
        intent={intent}
        busy={busy}
        hasExistingObra={!!obra}
        onObjectiveChange={setObjective}
        onIntentChange={setIntent}
        onCancel={() => setCreating(false)}
        onCreate={create}
      />
    )
  }

  if (!obra) {
    return <LoadingObraBar />
  }

  return <ActiveObraBar obra={obra} />
}
