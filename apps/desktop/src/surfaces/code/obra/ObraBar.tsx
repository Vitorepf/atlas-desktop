import { useState } from 'react'
import type { Obra } from '@atlas/domain'
import { type AtlasRichInputPayload, useAtlasRichInputAttachments } from '../../../lib/rich-input'
import { ActiveObraBar } from './ActiveObraBar'
import { CreateObraBar } from './CreateObraBar'
import { LoadingObraBar } from './LoadingObraBar'

interface ObraBarProps {
  obra: Obra | null
  onCreate: (
    intent: string,
    objective: string,
    opts?: { richInput?: AtlasRichInputPayload | null },
  ) => Promise<Obra | null>
  busy: boolean
}

/**
 * Intent boundary for the active work.
 *
 * It chooses between create, loading and active states. Concrete UI states live
 * in the Code surface so the bar can grow with workspace/policy context without
 * becoming a monolith. The Atlas Unified Rich Input adapter is owned here so
 * attachment drafts survive intent/objective edits but get cleared after a
 * successful create.
 */
export function ObraBar({ obra, onCreate, busy }: ObraBarProps) {
  const [creating, setCreating] = useState(false)
  const [objective, setObjective] = useState('')
  const [intent, setIntent] = useState('')
  const attachments = useAtlasRichInputAttachments()

  async function create() {
    let richInput: AtlasRichInputPayload | null = null
    if (attachments.drafts.length > 0) {
      try {
        // uploadAllCanonical emits `atlas.rich_input.payload.v1`. The bridge
        // compacts it down to null when no attachments survive.
        richInput = await attachments.uploadAllCanonical()
      } catch (error) {
        // Attachment upload failures must NOT silently downgrade to plain
        // text — surface a visible failure and abort the create so the
        // operator can retry or remove the broken draft.
        console.warn('[ObraBar] rich input upload failed', error)
        return null
      }
    }
    const result = await onCreate(intent.trim(), objective.trim(), { richInput })
    if (result) {
      setCreating(false)
      setObjective('')
      setIntent('')
      attachments.clear()
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
        attachmentDrafts={attachments.drafts}
        onObjectiveChange={setObjective}
        onIntentChange={setIntent}
        onAddFiles={(files) => attachments.addFiles(files, 'picker')}
        onAddUrl={(url) => attachments.addUrl(url, 'manual')}
        onRemoveAttachment={attachments.remove}
        onCancel={() => {
          setCreating(false)
          attachments.clear()
        }}
        onCreate={create}
      />
    )
  }

  if (!obra) {
    return <LoadingObraBar />
  }

  return <ActiveObraBar obra={obra} />
}
