import {
  AtlasUnifiedComposer,
  type AtlasUnifiedComposerSendPayload,
} from '../../../components/composer/AtlasUnifiedComposer'
import {
  useAtlasRichInputAttachments,
  type AtlasRichInputPayload,
  type UploadOutput,
} from '../../../lib/rich-input'
import type { VoxOverlayState } from '../../../components/vox/useVoxOverlay'
import type { AtlasAiMode, AtlasAiProviderChoice, AtlasAiTask } from '../types'

export interface AtlasAiComposerSendExtras {
  newThread?: boolean
  /** Legacy shape — mantido por back-compat com callers existentes. */
  attachments?: UploadOutput
  /**
   * Canonical Universal Rich Input Payload (`atlas.rich_input.payload.v1`).
   * Vem do composer compartilhado via `uploadAllCanonical()` e carrega
   * schema_version + source_manifest + hashes. O envio repassa para
   * `/ai/interactions` como `rich_input_payload`.
   */
  richInputCanonical?: AtlasRichInputPayload
}

interface AtlasAiComposerProps {
  draft: string
  onChange: (next: string) => void
  mode: AtlasAiMode
  onModeChange: (mode: AtlasAiMode) => void
  task: AtlasAiTask
  onTaskChange: (task: AtlasAiTask) => void
  provider: AtlasAiProviderChoice
  onProviderChange: (provider: AtlasAiProviderChoice) => void
  workspaceSlug: string | null
  sending: boolean
  sendError: string | null
  onSend: (extras?: AtlasAiComposerSendExtras) => Promise<void> | void
  /**
   * Kept as a deprecated prop so older call sites compile, but the `+ nova
   * thread` affordance was intentionally removed from the canonical composer.
   */
  onSendInNew?: (extras?: AtlasAiComposerSendExtras) => Promise<void> | void
  textareaMaxPx?: number
  onVoxClick?: () => void
  voxState?: VoxOverlayState
}

export function AtlasAiComposer({
  draft,
  onChange,
  mode,
  onModeChange,
  task,
  onTaskChange,
  provider,
  onProviderChange,
  workspaceSlug,
  sending,
  sendError,
  onSend,
  textareaMaxPx,
  onVoxClick,
  voxState = 'closed',
}: AtlasAiComposerProps) {
  const attachments = useAtlasRichInputAttachments()

  async function handleSend(payload: AtlasUnifiedComposerSendPayload) {
    await onSend({
      newThread: false,
      attachments: {
        uploaded_image_ids: payload.richInput.uploaded_image_ids,
        uploaded_document_ids: payload.richInput.uploaded_document_ids,
        text_blocks: payload.richInput.text_blocks,
        url_attachments: payload.richInput.url_attachments,
      },
      richInputCanonical: payload.richInput,
    })
  }

  return (
    <AtlasUnifiedComposer
      draft={draft}
      onChange={onChange}
      mode={mode}
      onModeChange={onModeChange}
      task={task}
      onTaskChange={onTaskChange}
      provider={provider}
      onProviderChange={onProviderChange}
      attachments={attachments}
      sending={sending}
      sendError={sendError}
      workspaceSlug={workspaceSlug}
      requireWorkspaceForProgramming
      textareaMaxPx={textareaMaxPx}
      onSend={handleSend}
      onVoxClick={onVoxClick}
      voxState={voxState}
    />
  )
}
