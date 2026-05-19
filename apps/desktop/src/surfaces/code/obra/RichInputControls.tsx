import { useRef } from 'react'
import { estimateRichInputTokens, summarizeRichInputDrafts, type AttachmentDraft } from '../../../lib/rich-input'

/**
 * Atlas Code · shared Rich Input controls.
 *
 * Single tiny widget reused by `CreateObraBar` and `ComposerPanel`. Renders
 * a file picker, a URL prompt and a pill list of current attachment drafts.
 * All processing logic stays inside `useAtlasRichInputAttachments` — this component
 * only exposes the affordances.
 *
 * Backward compatible: when no drafts are present and the operator never
 * interacts, the surface keeps a minimal button strip; plain-text send
 * continues to work via `onSend(text)` without touching this widget.
 */
interface RichInputControlsProps {
  drafts: AttachmentDraft[]
  busy?: boolean
  disabled?: boolean
  onAddFiles: (files: FileList | File[]) => Promise<void> | void
  onAddUrl: (url: string) => Promise<void> | void
  onRemove: (id: string) => void
  /** Optional compact label for screen-reader / tooltip context. */
  label?: string
}

function describeDraft(draft: AttachmentDraft): string {
  switch (draft.kind) {
    case 'image':
      return draft.fileName
    case 'pdf':
      return `${draft.fileName}${draft.pageCount > 0 ? ` · ${draft.pageCount}p` : ''}`
    case 'text':
    case 'code':
      return draft.fileName
    case 'url':
      return draft.title ?? draft.url
    default:
      return 'anexo'
  }
}

function kindBadge(draft: AttachmentDraft): string {
  switch (draft.kind) {
    case 'image':
      return 'IMG'
    case 'pdf':
      return 'PDF'
    case 'text':
      return 'TXT'
    case 'code':
      return 'COD'
    case 'url':
      return draft.urlKind === 'youtube' ? 'YT' : 'URL'
    default:
      return '✦'
  }
}

export function RichInputControls({
  drafts,
  busy = false,
  disabled = false,
  onAddFiles,
  onAddUrl,
  onRemove,
  label = 'anexos',
}: RichInputControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const summary = summarizeRichInputDrafts(drafts)
  const tokenEstimate = estimateRichInputTokens('', drafts)

  function openPicker() {
    if (disabled || busy) return
    fileInputRef.current?.click()
  }

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) return
    const fileList = event.target.files
    event.target.value = ''
    await onAddFiles(fileList)
  }

  async function promptForUrl() {
    if (disabled || busy) return
    const url = window.prompt('URL · PDF, YouTube, página…', '')?.trim()
    if (!url) return
    await onAddUrl(url)
  }

  return (
    <div
      className="rich-input-controls"
      aria-label={label}
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFiles}
          accept="image/*,application/pdf,text/*,application/json,application/xml,.md,.txt,.csv,.log,.yml,.yaml,.toml,.ini"
          data-testid="rich-input-file-picker"
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || busy}
          title="anexar arquivos (imagens, PDFs, texto, código)"
          style={{
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 9,
            padding: '2px 6px',
            border: '1px solid var(--bronze-soft)',
            borderRadius: 2,
            background: 'transparent',
            color: 'var(--bronze)',
            cursor: disabled || busy ? 'not-allowed' : 'pointer',
          }}
        >
          + arquivo
        </button>
        <button
          type="button"
          onClick={() => void promptForUrl()}
          disabled={disabled || busy}
          title="anexar URL (YouTube, PDF, página)"
          style={{
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 9,
            padding: '2px 6px',
            border: '1px solid var(--bronze-soft)',
            borderRadius: 2,
            background: 'transparent',
            color: 'var(--bronze)',
            cursor: disabled || busy ? 'not-allowed' : 'pointer',
          }}
        >
          + url
        </button>
        {summary.total > 0 && (
          <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9, color: 'var(--ink3)' }}>
            {[
              summary.images && `${summary.images} img`,
              summary.pdfs && `${summary.pdfs} pdf`,
              summary.text && `${summary.text} txt`,
              summary.urls && `${summary.urls} url`,
            ].filter(Boolean).join(' · ')}
            {' · '}
            ~{tokenEstimate.toLocaleString('pt-BR')} tokens
          </span>
        )}
      </div>
      {drafts.length > 0 && (
        <div
          className="rich-input-pills"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
        >
          {drafts.map((draft) => (
            <span
              key={draft.id}
              data-testid="rich-input-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '1px 6px',
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 9,
                color:
                  draft.status === 'error'
                    ? 'var(--red-strong, #c0392b)'
                    : draft.status === 'uploaded'
                      ? 'var(--bronze)'
                      : 'var(--ink2)',
                border: '1px solid var(--bronze-soft)',
                borderRadius: 2,
              }}
              title={`${draft.kind}/${draft.status}${draft.error ? ' · ' + draft.error : ''}`}
            >
              <span style={{ fontWeight: 600 }}>{kindBadge(draft)}</span>
              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {describeDraft(draft)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(draft.id)}
                disabled={busy}
                aria-label={`remover ${describeDraft(draft)}`}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: 'var(--ink3)',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  padding: 0,
                  marginLeft: 2,
                  fontSize: 10,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
