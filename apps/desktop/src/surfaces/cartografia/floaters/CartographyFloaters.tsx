import type { Continent } from '@atlas/domain'
import type { VisualLens } from '../state/visualLens'
import type { ReturnTypeOfUseCartografiaSearch } from '../search/types'
import { Minimap } from './Minimap'
import { VisualLensToolbar } from './VisualLensToolbar'
import { ZoomControls } from './ZoomControls'
import { CartografiaSearch } from '../search/CartografiaSearch'

interface CartographyFloatersProps {
  continents: Continent[]
  activeContinentId: string
  hereLabel: string
  showBackToMap: boolean
  visualLens: VisualLens
  lensStats: { recent: number }
  search: ReturnTypeOfUseCartografiaSearch
  zoomPercent: number
  onSelectContinent: (graphId: string) => void
  onSetVisualLens: (lens: VisualLens) => void
  onBackToMap: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onUniverse: () => void
  isEditMode: boolean
  onToggleEditMode: () => void
  hasCustomLayout: boolean
  onResetLayout: () => void
}

export function CartographyFloaters({
  continents,
  activeContinentId,
  hereLabel,
  showBackToMap,
  visualLens,
  lensStats,
  search,
  zoomPercent,
  onSelectContinent,
  onSetVisualLens,
  onBackToMap,
  onZoomIn,
  onZoomOut,
  onFit,
  onUniverse,
  isEditMode,
  onToggleEditMode,
  hasCustomLayout,
  onResetLayout,
}: CartographyFloatersProps) {
  return (
    <>
      <div className="cartography-top-rail no-pan">
        <Minimap
          continents={continents}
          activeContinentId={activeContinentId}
          hereLabel={hereLabel}
          onSelect={onSelectContinent}
        />
        <CartografiaSearch search={search} />
        <VisualLensToolbar active={visualLens} stats={lensStats} onChange={onSetVisualLens} />
      </div>
      {showBackToMap ? (
        <button type="button" className="back-to-map floater no-pan" onClick={onBackToMap}>
          ← Voltar ao mapa
        </button>
      ) : null}
      <ZoomControls
        zoomPercent={zoomPercent}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFit={onFit}
        onUniverse={onUniverse}
        isEditMode={isEditMode}
        onToggleEditMode={onToggleEditMode}
        hasCustomLayout={hasCustomLayout}
        onResetLayout={onResetLayout}
      />
    </>
  )
}
