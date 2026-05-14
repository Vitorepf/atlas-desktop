/**
 * AtomHoverPreview · tooltip Patek editorial que mostra title + summary +
 * primeiro parágrafo do .md real (Feature #3).
 *
 * Posicionamento: absolute no viewport, near do atom. Calculado pelo
 * caller via getBoundingClientRect. Pointer-events: none — não compete
 * com hover/click do próprio atom.
 */
import type { NotePreview } from './useAtomNotePreview'

interface AtomHoverPreviewProps {
  preview: NotePreview
  anchorRect: { x: number; y: number; w: number; h: number } | null
}

export function AtomHoverPreview({ preview, anchorRect }: AtomHoverPreviewProps) {
  if (!anchorRect) return null
  // Preferentially position to the right of the atom, falling back to left
  // if it would overflow viewport. Vertically aligned with atom top.
  const margin = 14
  const previewWidth = 320
  const wantsRight = anchorRect.x + anchorRect.w + margin + previewWidth < window.innerWidth
  const left = wantsRight ? anchorRect.x + anchorRect.w + margin : anchorRect.x - previewWidth - margin
  const top = Math.max(12, Math.min(anchorRect.y, window.innerHeight - 240))

  return (
    <div
      className={`atom-hover-preview floater no-pan${preview.loading ? ' is-loading' : ''}${preview.error ? ' is-error' : ''}`}
      style={{ left, top }}
      role="tooltip"
      aria-live="polite"
    >
      <div className="ahp-eyebrow">
        {preview.loading ? 'carregando…' : preview.error ? 'fonte indisponível' : 'do arquivo'}
      </div>
      <div className="ahp-title">{preview.title}</div>
      {preview.summary ? <div className="ahp-summary">{preview.summary}</div> : null}
      {!preview.loading && !preview.error && preview.firstParagraph ? (
        <div className="ahp-body">{preview.firstParagraph}</div>
      ) : null}
      {preview.sourcePath ? (
        <div className="ahp-source">
          <span className="ahp-source-badge">md</span>
          <span className="ahp-source-path">{preview.sourcePath.split('/').pop()}</span>
        </div>
      ) : null}
    </div>
  )
}
