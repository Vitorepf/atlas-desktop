import type { Obra } from '@atlas/domain'
import type { AttachmentDraft } from '../../../lib/rich-input'
import { btnGhost, btnPrimary, inlineInputStyle } from './obraBarStyles'
import { RichInputControls } from './RichInputControls'

interface CreateObraBarProps {
  objective: string
  intent: string
  busy: boolean
  hasExistingObra: boolean
  /**
   * Atlas Unified Rich Input drafts attached to this Obra-creation cycle.
   * The hook lives on `ObraBar` so drafts survive intent/objective edits but
   * get cleared on cancel/create-success. CreateObraBar only renders pills
   * + picker controls — never duplicates attachment logic.
   */
  attachmentDrafts: AttachmentDraft[]
  onObjectiveChange: (value: string) => void
  onIntentChange: (value: string) => void
  onAddFiles: (files: FileList | File[]) => Promise<void> | void
  onAddUrl: (url: string) => Promise<void> | void
  onRemoveAttachment: (id: string) => void
  onCancel: () => void
  onCreate: () => Promise<Obra | null>
}

export function CreateObraBar({
  objective,
  intent,
  busy,
  hasExistingObra,
  attachmentDrafts,
  onObjectiveChange,
  onIntentChange,
  onAddFiles,
  onAddUrl,
  onRemoveAttachment,
  onCancel,
  onCreate,
}: CreateObraBarProps) {
  return (
    <section className="obra-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="obra-id" style={{ background: 'transparent', border: 0, color: 'var(--bronze)' }}>
          ✦ nova obra
        </span>
        <input
          value={objective}
          onChange={(e) => onObjectiveChange(e.target.value)}
          placeholder="objetivo · ex: Refatorar Decide → trait Gated"
          style={inlineInputStyle}
        />
        <input
          value={intent}
          onChange={(e) => onIntentChange(e.target.value)}
          placeholder="intent · contexto opcional"
          style={inlineInputStyle}
        />
        <div className="status-board" style={{ gap: 6 }}>
          <button
            type="button"
            disabled={!objective.trim() || busy}
            onClick={() => void onCreate()}
            style={btnPrimary}
          >
            {busy ? 'criando…' : 'criar obra'}
          </button>
          {hasExistingObra && (
            <button type="button" onClick={onCancel} style={btnGhost}>
              cancelar
            </button>
          )}
        </div>
      </div>
      <RichInputControls
        drafts={attachmentDrafts}
        busy={busy}
        onAddFiles={onAddFiles}
        onAddUrl={onAddUrl}
        onRemove={onRemoveAttachment}
        label="anexos da obra"
      />
    </section>
  )
}
