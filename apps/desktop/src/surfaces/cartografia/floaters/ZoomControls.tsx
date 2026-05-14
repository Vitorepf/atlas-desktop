/**
 * ZoomControls · canvas controls (in/out/fit/universe) + lock toggle (edit mode).
 */
interface ZoomControlsProps {
  zoomPercent: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onUniverse: () => void
  /** Edit mode (Fase 1+2) · destrava drag/resize das lanes. */
  isEditMode: boolean
  onToggleEditMode: () => void
  hasCustomLayout: boolean
  onResetLayout: () => void
}

export function ZoomControls({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFit,
  onUniverse,
  isEditMode,
  onToggleEditMode,
  hasCustomLayout,
  onResetLayout,
}: ZoomControlsProps) {
  return (
    <>
      <div className="zoom-indicator" aria-live="polite">{zoomPercent}%</div>
      <div className="canvas-controls floater no-pan">
        <button
          type="button"
          className={`edit-toggle${isEditMode ? ' is-on' : ''}`}
          onClick={onToggleEditMode}
          title={isEditMode ? 'Destravado · arrasta e redimensiona lanes (clica pra travar)' : 'Travado · clica pra liberar edição'}
          aria-label={isEditMode ? 'Travar layout' : 'Destravar layout'}
          aria-pressed={isEditMode}
        >
          {isEditMode ? '🔓' : '🔒'}
        </button>
        {hasCustomLayout ? (
          <button
            type="button"
            className="layout-reset"
            onClick={onResetLayout}
            title="Voltar layout canon (apaga customizações)"
            aria-label="Reset layout"
          >
            ↺
          </button>
        ) : null}
        <button type="button" onClick={onZoomOut} title="Diminuir" aria-label="Diminuir zoom">
          −
        </button>
        <button type="button" onClick={onZoomIn} title="Aumentar" aria-label="Aumentar zoom">
          +
        </button>
        <button type="button" onClick={onFit} title="Ajustar tudo · 0" aria-label="Ajustar tudo" aria-keyshortcuts="0">
          ⊟
        </button>
        <button type="button" className="alt" onClick={onUniverse} title="Vista do universo">
          universo
        </button>
      </div>
    </>
  )
}
