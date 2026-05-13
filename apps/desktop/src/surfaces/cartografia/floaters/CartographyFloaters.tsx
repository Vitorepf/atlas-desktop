import type { CartographyView, Continent } from '@atlas/domain'
import type { VisualLens } from '../state/visualLens'
import type { ReturnTypeOfUseCartografiaSearch } from '../search/types'
import { Breadcrumb } from './Breadcrumb'
import { Minimap } from './Minimap'
import { VisualLensToolbar } from './VisualLensToolbar'
import { ZoomControls } from './ZoomControls'
import { CartografiaSearch } from '../search/CartografiaSearch'

interface CartographyFloatersProps {
  continents: Continent[]
  activeContinentId: string
  hereLabel: string
  view: CartographyView
  continent: Continent | null
  focusedName: string | null
  showBackToMap: boolean
  visualLens: VisualLens
  lensStats: { recent: number }
  search: ReturnTypeOfUseCartografiaSearch
  zoomPercent: number
  onSelectContinent: (graphId: string) => void
  onNavigate: (view: CartographyView) => void
  onSetVisualLens: (lens: VisualLens) => void
  onBackToMap: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onUniverse: () => void
}

export function CartographyFloaters({
  continents,
  activeContinentId,
  hereLabel,
  view,
  continent,
  focusedName,
  showBackToMap,
  visualLens,
  lensStats,
  search,
  zoomPercent,
  onSelectContinent,
  onNavigate,
  onSetVisualLens,
  onBackToMap,
  onZoomIn,
  onZoomOut,
  onFit,
  onUniverse,
}: CartographyFloatersProps) {
  return (
    <>
      <Minimap
        continents={continents}
        activeContinentId={activeContinentId}
        hereLabel={hereLabel}
        onSelect={onSelectContinent}
      />
      <Breadcrumb
        view={view}
        continent={continent}
        focusedName={focusedName}
        onNavigate={onNavigate}
      />
      <VisualLensToolbar active={visualLens} stats={lensStats} onChange={onSetVisualLens} />
      {showBackToMap ? (
        <button type="button" className="back-to-map floater no-pan" onClick={onBackToMap}>
          ← Voltar ao mapa
        </button>
      ) : null}
      <CartografiaSearch search={search} />
      <ZoomControls
        zoomPercent={zoomPercent}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFit={onFit}
        onUniverse={onUniverse}
      />
    </>
  )
}
