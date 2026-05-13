/**
 * CartografiaSurface · root da segunda janela do Atlas Desktop.
 *
 * Layout grid 2 cols: viewport (canvas + floaters) + inspector right.
 *
 * Compõe:
 * - useCartografia (state machine + data + hover/isolate/focus)
 * - useCartografiaViewport (pan/zoom)
 * - Floaters: Minimap (top-left), Breadcrumb (top-center), Timeline (top-right)
 * - World canvas com transform + 5 scenes (universe/system/flow/gear/subflow)
 * - Inspector aside com ficha 7 + markdown viewer
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCartografia } from './useCartografia'
import { useCartografiaViewport } from './useCartografiaViewport'
import { Atom } from './Atom'
import { Breadcrumb } from './Breadcrumb'
import { Inspector } from './Inspector'
import { Minimap } from './Minimap'
import { TimelineFloater } from './TimelineFloater'
import { ZoomControls } from './ZoomControls'
import { FlowScene } from './scenes/FlowScene'
import { GearScene } from './scenes/GearScene'
import { SubflowScene } from './scenes/SubflowScene'
import { SystemScene } from './scenes/SystemScene'
import { UniverseScene } from './scenes/UniverseScene'
import { WORLD_HEIGHT, WORLD_WIDTH } from './layout'

export function CartografiaSurface() {
  const c = useCartografia()
  const worldRef = useRef<HTMLDivElement | null>(null)
  const viewport = useCartografiaViewport({
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
  })

  const [searchInput, setSearchInput] = useState('')

  // Fit to scene quando view trocar
  useEffect(() => {
    const id = window.setTimeout(() => viewport.fit(), 50)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.view, c.continent, c.focusedId])

  // Search overlay simples — Enter abre Foco do primeiro hit
  function handleSearch() {
    const q = searchInput.trim().toLowerCase()
    if (q.length < 2) return
    for (const a of Object.values(c.atomIndex)) {
      if (a.name.toLowerCase().includes(q) || a.graphId.toLowerCase().includes(q)) {
        c.enterGear(a.graphId)
        setSearchInput('')
        return
      }
    }
  }

  const continent = useMemo(
    () => c.graph?.universe.find((u) => u.graphId === c.continent) ?? null,
    [c.graph, c.continent]
  )

  const focusedAtom = c.focusedId ? c.atomIndex[c.focusedId] : null
  const isolatedAtom = c.isolatedId ? c.atomIndex[c.isolatedId] : null
  const hoveredAtom =
    c.hoverId && c.view !== 'gear' && c.view !== 'subflow' && !c.isolatedId
      ? c.atomIndex[c.hoverId]
      : null
  const inspectorAtom = focusedAtom ?? isolatedAtom ?? hoveredAtom ?? null
  const inspectorRecent =
    inspectorAtom != null
      ? c.recentChanges.find((r) => r.graphId === inspectorAtom.graphId) ?? null
      : null

  const hereLabel = currentLocationLabel({
    view: c.view,
    continent: continent?.name ?? null,
    focusedName: focusedAtom?.name ?? null,
    isolatedName: isolatedAtom?.name ?? null,
  })

  const isOffline = !c.graph && !c.loading

  return (
    <section className="cartografia-surface">
      <div className="cart-work">
        <div ref={viewport.viewportRef} className="viewport">
          {/* Floaters */}
          {c.graph ? (
            <>
              <Minimap
                continents={c.graph.universe}
                activeContinentId={c.continent}
                hereLabel={hereLabel}
                onSelect={c.selectContinent}
              />
              <Breadcrumb
                view={c.view}
                continent={continent}
                focusedName={focusedAtom?.name ?? null}
                onNavigate={(v) => c.setView(v)}
              />
              <TimelineFloater
                changes={c.recentChanges}
                atomIndex={c.atomIndex}
                onPick={c.enterGear}
              />
              {(c.view === 'gear' || c.view === 'subflow' || c.isolatedId) && (
                <button
                  type="button"
                  className="back-to-map floater no-pan"
                  onClick={() => {
                    if (c.view === 'gear' || c.view === 'subflow') c.exitGear()
                    else c.exitIsolate()
                  }}
                >
                  ← Voltar ao mapa
                </button>
              )}
              <div className="search-floater floater no-pan">
                <span className="glyph">∴</span>
                <input
                  type="search"
                  placeholder="buscar engrenagem, lane, sistema, arquivo…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch()
                  }}
                />
              </div>
              <ZoomControls
                zoomPercent={Math.round(viewport.transform.scale * 100)}
                onZoomIn={() => viewport.zoomBy(1.2)}
                onZoomOut={() => viewport.zoomBy(0.83)}
                onFit={viewport.fit}
                onUniverse={() => c.setView('universe')}
              />
            </>
          ) : null}

          {/* World canvas — transformed */}
          <div
            ref={worldRef}
            className={[
              'world',
              !viewport.animating ? 'no-transition' : '',
              c.isolatedId ? 'isolate-mode' : '',
              c.isolatedId || hoveredAtom ? 'dim-others' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              transform: `translate(${viewport.transform.x}px, ${viewport.transform.y}px) scale(${viewport.transform.scale})`,
              width: WORLD_WIDTH,
              height: WORLD_HEIGHT,
            }}
          >
            {c.graph && c.view === 'universe' ? (
              <UniverseScene universe={c.graph.universe} onSelect={c.selectContinent} />
            ) : null}

            {c.graph && c.view === 'system' ? (
              <SystemScene continent={continent} onEnterFlow={() => c.setView('flow')} />
            ) : null}

            {c.graph && c.view === 'flow' ? (
              <FlowScene
                graph={c.graph}
                worldRef={worldRef}
                recentChanges={c.recentChanges}
                atomIndex={c.atomIndex}
                isolatedId={c.isolatedId}
                onHover={c.setHover}
                onIsolate={(id) => {
                  if (c.isolatedId === id) c.exitIsolate()
                  else c.enterIsolate(id)
                }}
                onFocus={c.enterGear}
              />
            ) : null}

            {c.graph && c.view === 'gear' && focusedAtom ? (
              <GearScene
                atom={focusedAtom}
                atomIndex={c.atomIndex}
                onSatellite={c.enterGear}
                onBack={c.exitGear}
                onSubflow={c.enterSubflow}
                onLoop={() => c.enterGear('evidence-ledger')}
              />
            ) : null}

            {c.graph && c.view === 'subflow' && focusedAtom ? (
              <SubflowScene atom={focusedAtom} onBackToGear={() => c.setView('gear')} />
            ) : null}

            {/* Tiny ghost atom so isolate-mode kin highlighting can resolve via DOM
                even when those atoms are inside a different scene · no-op for current MVP */}
            {false && <Atom atom={c.atomIndex['evidence-ledger']!} />}
          </div>

          {/* Empty / loading / offline overlay */}
          {c.loading || isOffline ? (
            <CartographyOverlay
              loading={c.loading}
              offline={isOffline}
              errors={c.errors}
            />
          ) : null}
        </div>

        <Inspector
          atom={inspectorAtom}
          recent={inspectorRecent}
          noteCache={c.noteCache}
          loadNoteFor={c.loadNoteFor}
        />
      </div>
    </section>
  )
}

function currentLocationLabel({
  view,
  continent,
  focusedName,
  isolatedName,
}: {
  view: import('@atlas/domain').CartographyView
  continent: string | null
  focusedName: string | null
  isolatedName: string | null
}): string {
  if (view === 'universe') return 'Universo'
  if (view === 'system') return continent ?? 'Atlas'
  if (view === 'flow') {
    if (isolatedName) return `Atlas · isolando · ${isolatedName}`
    return 'Atlas · AI Kernel · Pipeline'
  }
  if (view === 'gear') return `Atlas · ${focusedName ?? ''}`
  if (view === 'subflow') return `Atlas · ${focusedName ?? ''} · Subfluxo`
  return '—'
}

function CartographyOverlay({
  loading,
  offline,
  errors,
}: {
  loading: boolean
  offline: boolean
  errors: string[]
}) {
  return (
    <div className="cart-overlay">
      <div className="cart-overlay-card">
        {loading ? (
          <>
            <p style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink2)' }}>
              Carregando filesystem canônico (repo + AtlasVault)…
            </p>
          </>
        ) : offline ? (
          <>
            <p style={{ fontSize: 17, fontStyle: 'italic', color: 'var(--ink2)' }}>
              Atlas Server offline.
            </p>
            <p
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: 0.3,
                color: 'var(--ink3)',
                marginTop: 12,
              }}
            >
              php artisan serve --port=8001
            </p>
            {errors.length > 0 ? (
              <p
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9.5,
                  color: 'var(--rec-red)',
                  marginTop: 14,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {errors[0]}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
