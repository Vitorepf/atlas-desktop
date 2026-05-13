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
      <div className="zoom-indicator">{zoomPercent}%</div>
      <div className="canvas-controls floater no-pan">
        <button type="button" onClick={onZoomOut} title="Diminuir">
          −
        </button>
        <button type="button" onClick={onZoomIn} title="Aumentar">
          +
        </button>
        <button type="button" onClick={onFit} title="Ajustar tudo">
          ⊟
        </button>
        <button type="button" className="alt" onClick={onUniverse} title="Vista do universo">
          universo
        </button>
      </div>
    </>
  )
}
