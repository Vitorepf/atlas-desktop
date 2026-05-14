/* eslint-disable react-hooks/refs -- Cartografia ref/viewport refactor em curso; divida lateral isolada do Atlas Forge core (project_atlas_vault_cartografia). */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CartografiaState } from './state/cartografiaTypes'
import type { CartografiaViewModel } from './state/useCartografiaViewModel'
import type { CartografiaSearchController } from './search/useCartografiaSearch'
import type { CartografiaViewportController } from './viewport/useCartografiaViewport'
import type { VisualLens } from './state/visualLens'
import type { useCustomLayout } from './state/useCustomLayout'
import type { useEditMode } from './state/useEditMode'
import type { useLayoutPresets } from './state/useLayoutPresets'
import { CartographyFloaters } from './floaters/CartographyFloaters'
import { LayoutPresetsMenu } from './floaters/LayoutPresetsMenu'
import { LayoutSaveIndicator } from './floaters/LayoutSaveIndicator'
import { ReadingModeNarrator } from './floaters/ReadingModeNarrator'
import { CartographyOverlay } from './layout/CartographyOverlay'
import { CartographyWorld } from './map/CartographyWorld'
import { AtomHoverPreview } from './map/AtomHoverPreview'
import { useAtomNotePreview } from './map/useAtomNotePreview'

export function CartografiaViewportSlot({
  cartografia,
  viewModel,
  viewport,
  visualLens,
  setVisualLens,
  search,
  editMode,
  customLayout,
  layoutPresets,
}: {
  cartografia: CartografiaState
  viewModel: CartografiaViewModel
  viewport: CartografiaViewportController
  visualLens: VisualLens
  setVisualLens: (lens: VisualLens) => void
  search: CartografiaSearchController
  editMode: ReturnType<typeof useEditMode>
  customLayout: ReturnType<typeof useCustomLayout>
  layoutPresets: ReturnType<typeof useLayoutPresets>
}) {
  const worldRef = useRef<HTMLDivElement | null>(null)

  // Feature #3 · hover insight (.md preview). Habilita só quando NÃO em
  // edit mode (no edit mode, hover é prompt pra drag, não pra leitura).
  // Não mostra durante isolate mode (peça já em foco — preview redundante).
  const hoveredAtomLite = useMemo(
    () =>
      viewModel.hoveredAtom
        ? {
            graphId: viewModel.hoveredAtom.graphId,
            name: viewModel.hoveredAtom.name,
            deck: viewModel.hoveredAtom.deck,
          }
        : null,
    [viewModel.hoveredAtom]
  )
  const previewEnabled = !editMode.isEditMode && !cartografia.isolatedId
  const notePreview = useAtomNotePreview({ atom: hoveredAtomLite, enabled: previewEnabled })
  const [previewAnchor, setPreviewAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  useEffect(() => {
    if (!notePreview) {
      setPreviewAnchor(null)
      return
    }
    const el = document.getElementById(`atom-${notePreview.graphId}`)
    if (!el) {
      setPreviewAnchor(null)
      return
    }
    const r = el.getBoundingClientRect()
    setPreviewAnchor({ x: r.x, y: r.y, w: r.width, h: r.height })
  }, [notePreview])

  return (
    <div
      ref={viewport.viewportRef}
      className={[
        'viewport',
        `viewport-${visualLens}`,
        cartografia.isolatedId ? 'is-isolated' : '',
        cartografia.view === 'gear' ? 'mode-focus' : '',
        editMode.isEditMode ? 'is-edit-mode' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
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
          isEditMode={editMode.isEditMode}
          onToggleEditMode={editMode.toggle}
          hasCustomLayout={customLayout.hasOverrides}
          onResetLayout={customLayout.resetAll}
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
        readingMode={cartografia.readingMode}
        density={cartografia.density}
        onSetView={cartografia.setView}
        onSelectContinent={cartografia.selectContinent}
        onEnterNode={cartografia.enterNode}
        onEnterGear={cartografia.enterGear}
        onExitGear={cartografia.exitGear}
        onEnterSubflow={cartografia.enterSubflow}
        onSetHover={cartografia.setHover}
        onEnterIsolate={cartografia.enterIsolate}
        onExitIsolate={cartografia.exitIsolate}
        editMode={editMode}
        customLayout={customLayout}
      />

      {cartografia.loading || viewModel.isOffline ? (
        <CartographyOverlay
          loading={cartografia.loading}
          offline={viewModel.isOffline}
          errors={cartografia.errors}
        />
      ) : null}

      {notePreview ? <AtomHoverPreview preview={notePreview} anchorRect={previewAnchor} /> : null}

      {cartografia.readingMode && cartografia.graph?.pipeline ? (
        <ReadingModeNarrator
          pipeline={cartografia.graph.pipeline}
          focusOrder={cartografia.readingFocusOrder ?? null}
          focusedAtom={(() => {
            const order = cartografia.readingFocusOrder
            if (order == null) return null
            const step = cartografia.graph.pipeline[order]
            return step ? cartografia.atomIndex[step.graphId] ?? null : null
          })()}
          onClose={() => cartografia.setReadingMode(false)}
          onNext={cartografia.readingNext}
          onPrev={cartografia.readingPrev}
        />
      ) : null}

      {editMode.isEditMode ? (
        <>
          <LayoutSaveIndicator
            lastSavedAt={customLayout.lastSavedAt}
            canUndo={customLayout.canUndo}
            canRedo={customLayout.canRedo}
            onUndo={customLayout.undo}
            onRedo={customLayout.redo}
          />
          <LayoutPresetsMenu
            presetList={layoutPresets.presetList}
            currentOverlay={customLayout.overlay}
            hasOverrides={customLayout.hasOverrides}
            onSavePreset={layoutPresets.savePreset}
            onLoadPreset={layoutPresets.loadPreset}
            onDeletePreset={layoutPresets.deletePreset}
            onApplyOverlay={customLayout.replaceOverlay}
          />
        </>
      ) : null}
    </div>
  )
}
