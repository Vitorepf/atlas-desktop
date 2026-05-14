/**
 * CartografiaSurface · composition root da Cartografia.
 *
 * Regra: este arquivo compoe regioes e hooks. Logica nova deve nascer nas
 * subareas `layout/`, `state/`, `viewport/`, `map/`, `search/` ou `inspector/`.
 */
import { useCallback, useMemo, useState } from 'react'
import { usePublishTopBarLocationTrail } from '../../shell/topbar/useTopBarLocationTrail'
import { useCartografia } from './state/useCartografia'
import { useCartografiaShortcuts } from './state/useCartografiaShortcuts'
import { useCartografiaViewModel } from './state/useCartografiaViewModel'
import { useCartografiaViewport } from './viewport/useCartografiaViewport'
import { useSceneAutoFit } from './viewport/useSceneAutoFit'
import { AuditPanel } from './layout/AuditPanel'
import { CartografiaInspectorSlot } from './inspector/CartografiaInspectorSlot'
import { CartografiaLayout } from './layout/CartografiaLayout'
import { WORLD_HEIGHT, WORLD_WIDTH } from './map/layout'
import { useCartografiaSearch } from './search/useCartografiaSearch'
import { useInspectorColumn } from './layout/useInspectorColumn'
import { useVisualLens } from './state/useVisualLens'
import { useCustomLayout } from './state/useCustomLayout'
import { useEditMode } from './state/useEditMode'
import { useLayoutPresets } from './state/useLayoutPresets'
import { useLayoutShortcuts } from './state/useLayoutShortcuts'
import { CartografiaViewportSlot } from './CartografiaViewportSlot'
import { buildCartografiaBreadcrumb } from './floaters/breadcrumbModel'

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
  const [auditOpen, setAuditOpen] = useState(false)
  const toggleAudit = useCallback(() => setAuditOpen((v) => !v), [])
  const closeAudit = useCallback(() => setAuditOpen(false), [])

  const topBarTrail = useMemo(
    () =>
      buildCartografiaBreadcrumb({
        view: c.view,
        continent: vm.continent,
        focusedName: vm.focusedAtom?.name ?? null,
      }).map((crumb) => ({
        id: crumb.id,
        label: crumb.label,
        current: crumb.current,
        onSelect: crumb.view && !crumb.current ? () => c.setView(crumb.view!) : undefined,
      })),
    [c.setView, c.view, vm.continent, vm.focusedAtom?.name]
  )
  usePublishTopBarLocationTrail(topBarTrail)

  // Edit mode (Fase 1+2) · lock/unlock + custom layout overlay por view.
  const editMode = useEditMode()
  const customLayout = useCustomLayout(c.continent)
  // Feature #4 · presets nomeados de layout
  const layoutPresets = useLayoutPresets(c.continent)
  // Feature #6 · Cmd+Z / Cmd+Shift+Z keyboard shortcuts pra undo/redo
  useLayoutShortcuts({
    isEditMode: editMode.isEditMode,
    undo: customLayout.undo,
    redo: customLayout.redo,
  })

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
    onToggleAuditPanel: toggleAudit,
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
        editMode={editMode}
        customLayout={customLayout}
        layoutPresets={layoutPresets}
      />
      {auditOpen ? (
        <AuditPanel
          graph={c.graph}
          onClose={closeAudit}
          onPickBrokenPath={c.enterGear}
        />
      ) : null}
    </CartografiaLayout>
  )
}
