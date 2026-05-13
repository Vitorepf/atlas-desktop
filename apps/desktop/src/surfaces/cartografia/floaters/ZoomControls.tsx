/**
 * ZoomControls · canvas controls (in/out/fit/universe).
 */
interface ZoomControlsProps {
  zoomPercent: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onUniverse: () => void
}

export function ZoomControls({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFit,
  onUniverse,
}: ZoomControlsProps) {
  return (
    <>
      <div className="zoom-indicator" aria-live="polite">{zoomPercent}%</div>
      <div className="canvas-controls floater no-pan">
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
