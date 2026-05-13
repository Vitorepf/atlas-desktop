import { useRef } from 'react'
import type { CartografiaState } from './state/cartografiaTypes'
import type { CartografiaViewModel } from './state/useCartografiaViewModel'
import type { CartografiaSearchController } from './search/useCartografiaSearch'
import type { CartografiaViewportController } from './viewport/useCartografiaViewport'
import type { VisualLens } from './state/visualLens'
import { CartographyFloaters } from './floaters/CartographyFloaters'
import { CartographyOverlay } from './layout/CartographyOverlay'
import { CartographyWorld } from './map/CartographyWorld'

export function CartografiaViewportSlot({
  cartografia,
  viewModel,
  viewport,
  visualLens,
  setVisualLens,
  search,
}: {
  cartografia: CartografiaState
  viewModel: CartografiaViewModel
  viewport: CartografiaViewportController
  visualLens: VisualLens
  setVisualLens: (lens: VisualLens) => void
  search: CartografiaSearchController
}) {
  const worldRef = useRef<HTMLDivElement | null>(null)

  return (
    <div ref={viewport.viewportRef} className={`viewport viewport-${visualLens}`}>
      {cartografia.graph ? (
        <CartographyFloaters
          continents={cartografia.graph.universe}
          activeContinentId={cartografia.continent}
          hereLabel={viewModel.hereLabel}
          view={cartografia.view}
          continent={viewModel.continent}
          focusedName={viewModel.focusedAtom?.name ?? null}
          showBackToMap={
            cartografia.view === 'gear' || cartografia.view === 'subflow' || !!cartografia.isolatedId
          }
          visualLens={visualLens}
          lensStats={viewModel.lensStats}
          search={search}
          zoomPercent={Math.round(viewport.transform.scale * 100)}
          onSelectContinent={cartografia.selectContinent}
          onNavigate={cartografia.setView}
          onSetVisualLens={setVisualLens}
          onBackToMap={() => {
            if (cartografia.view === 'gear' || cartografia.view === 'subflow') cartografia.exitGear()
            else cartografia.exitIsolate()
          }}
          onZoomIn={() => viewport.zoomBy(1.2)}
          onZoomOut={() => viewport.zoomBy(0.83)}
          onFit={viewport.fit}
          onUniverse={() => cartografia.setView('universe')}
        />
      ) : null}

      <CartographyWorld
        graph={cartografia.graph}
        view={cartografia.view}
        worldRef={worldRef}
        transform={viewport.transform}
        animating={viewport.animating}
        visualLens={visualLens}
        atomIndex={cartografia.atomIndex}
        recentChanges={cartografia.recentChanges}
        continent={viewModel.continent}
        systemParentId={cartografia.systemParentId}
        focusedAtom={viewModel.focusedAtom}
        hoveredAtom={viewModel.hoveredAtom}
        isolatedId={cartografia.isolatedId}
        hoverId={cartografia.hoverId}
        onSetView={cartografia.setView}
        onSelectContinent={cartografia.selectContinent}
        onEnterNode={cartografia.enterNode}
        onEnterGear={cartografia.enterGear}
        onExitGear={cartografia.exitGear}
        onEnterSubflow={cartografia.enterSubflow}
        onSetHover={cartografia.setHover}
        onEnterIsolate={cartografia.enterIsolate}
        onExitIsolate={cartografia.exitIsolate}
      />

      {cartografia.loading || viewModel.isOffline ? (
        <CartographyOverlay
          loading={cartografia.loading}
          offline={viewModel.isOffline}
          errors={cartografia.errors}
        />
      ) : null}
    </div>
  )
}
