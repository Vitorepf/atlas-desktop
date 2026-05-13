/**
 * CartografiaSurface · composition root da Cartografia.
 *
 * Regra: este arquivo compoe regioes e hooks. Logica nova deve nascer nas
 * subareas `layout/`, `state/`, `viewport/`, `map/`, `search/` ou `inspector/`.
 */
import { useCartografia } from './state/useCartografia'
import { useCartografiaShortcuts } from './state/useCartografiaShortcuts'
import { useCartografiaViewModel } from './state/useCartografiaViewModel'
import { useCartografiaViewport } from './viewport/useCartografiaViewport'
import { useSceneAutoFit } from './viewport/useSceneAutoFit'
import { CartografiaInspectorSlot } from './inspector/CartografiaInspectorSlot'
import { CartografiaLayout } from './layout/CartografiaLayout'
import { WORLD_HEIGHT, WORLD_WIDTH } from './map/layout'
import { useCartografiaSearch } from './search/useCartografiaSearch'
import { useInspectorColumn } from './layout/useInspectorColumn'
import { useVisualLens } from './state/useVisualLens'
import { CartografiaViewportSlot } from './CartografiaViewportSlot'

export function CartografiaSurface() {
  const c = useCartografia()
  const viewport = useCartografiaViewport({
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
  })

  const inspector = useInspectorColumn()
  const { visualLens, setVisualLens } = useVisualLens()
  const search = useCartografiaSearch(c.atomIndex, c.enterNode)
  const vm = useCartografiaViewModel(c)

  useSceneAutoFit({
    viewport,
    view: c.view,
    continent: c.continent,
    systemParentId: c.systemParentId,
    focusedId: c.focusedId,
  })

  useCartografiaShortcuts({
    view: c.view,
    isolatedId: c.isolatedId,
    search,
    onFit: viewport.fit,
    onSetVisualLens: setVisualLens,
    onExitGear: c.exitGear,
    onExitIsolate: c.exitIsolate,
  })

  const inspectorPanel = (
    <CartografiaInspectorSlot
      cartografia={c}
      viewModel={vm}
      inspectorColumn={inspector}
    />
  )

  return (
    <CartografiaLayout inspector={inspectorPanel} inspectorColumn={inspector}>
      <CartografiaViewportSlot
        cartografia={c}
        viewModel={vm}
        viewport={viewport}
        visualLens={visualLens}
        setVisualLens={setVisualLens}
        search={search}
      />
    </CartografiaLayout>
  )
}
