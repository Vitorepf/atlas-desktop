/**
 * CartografiaSurface · root da segunda janela do Atlas Desktop.
 *
 * Layout grid 2 cols: inspector left + viewport (canvas + floaters).
 *
 * Compõe:
 * - useCartografia (state machine + data + hover/isolate/focus)
 * - useCartografiaViewport (pan/zoom)
 * - Floaters: Minimap (top-left), Breadcrumb (top-center), Timeline (top-right)
 * - World canvas com transform + 5 scenes (universe/system/flow/gear/subflow)
 * - Inspector aside com ficha 7 + markdown viewer
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useCartografia } from './useCartografia'
import { useCartografiaViewport } from './useCartografiaViewport'
import { Atom } from './Atom'
import { Breadcrumb } from './Breadcrumb'
import { Inspector } from './Inspector'
import { Minimap } from './Minimap'
import { ZoomControls } from './ZoomControls'
import { FlowScene } from './scenes/FlowScene'
import { GearScene } from './scenes/GearScene'
import { SubflowScene } from './scenes/SubflowScene'
import { SystemScene } from './scenes/SystemScene'
import { UniverseScene } from './scenes/UniverseScene'
import { WORLD_HEIGHT, WORLD_WIDTH } from './layout'
import type { CartographyAtom } from '@atlas/domain'

type VisualLens = 'flow' | 'relations' | 'risk' | 'recent' | 'evidence'

const INSPECTOR_WIDTH_KEY = 'atlas.cartografia.inspectorWidth'
const INSPECTOR_COLLAPSED_KEY = 'atlas.cartografia.inspectorCollapsed'
const VISUAL_LENS_KEY = 'atlas.cartografia.visualLens'
const INSPECTOR_MIN_WIDTH = 300
const INSPECTOR_MAX_WIDTH = 680
const INSPECTOR_DEFAULT_WIDTH = 360
const INSPECTOR_COLLAPSED_WIDTH = 56
const VISUAL_LENSES: VisualLens[] = ['flow', 'relations', 'risk', 'recent', 'evidence']

export function CartografiaSurface() {
  const c = useCartografia()
  const worldRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const resizeDragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const viewport = useCartografiaViewport({
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
  })

  const [searchInput, setSearchInput] = useState('')
  const [activeSearchIndex, setActiveSearchIndex] = useState(0)
  const [inspectorWidth, setInspectorWidth] = useState(() => readStoredInspectorWidth())
  const [inspectorCollapsed, setInspectorCollapsed] = useState(() => readStoredBoolean(INSPECTOR_COLLAPSED_KEY, false))
  const [visualLens, setVisualLens] = useState<VisualLens>(() => readStoredVisualLens())

  const searchResults = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    if (q.length < 2) return []
    return Object.values(c.atomIndex)
      .filter((a) => atomMatchesQuery(a, q))
      .sort((a, b) => scoreAtomForQuery(b, q) - scoreAtomForQuery(a, q))
      .slice(0, 9)
  }, [c.atomIndex, searchInput])

  useEffect(() => {
    setActiveSearchIndex(0)
  }, [searchInput, searchResults.length])

  // Fit to scene quando view trocar
  useEffect(() => {
    const id = window.setTimeout(() => viewport.fit(), 50)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.view, c.continent, c.systemParentId, c.focusedId])

  useEffect(() => {
    if (inspectorCollapsed) return
    writeStorage(INSPECTOR_WIDTH_KEY, String(inspectorWidth))
  }, [inspectorCollapsed, inspectorWidth])

  useEffect(() => {
    writeStorage(INSPECTOR_COLLAPSED_KEY, inspectorCollapsed ? '1' : '0')
  }, [inspectorCollapsed])

  useEffect(() => {
    writeStorage(VISUAL_LENS_KEY, visualLens)
  }, [visualLens])

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = resizeDragRef.current
      if (!drag) return
      const nextWidth = clampInspectorWidth(drag.startWidth + event.clientX - drag.startX)
      setInspectorCollapsed(false)
      setInspectorWidth(nextWidth)
    }

    function handlePointerUp() {
      if (!resizeDragRef.current) return
      resizeDragRef.current = null
      document.body.classList.remove('cart-resizing')
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      document.body.classList.remove('cart-resizing')
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      const isSearchTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)

      const hasSystemModifier = event.metaKey || event.ctrlKey || event.altKey

      if (!isSearchTarget && !hasSystemModifier) {
        const lens = lensFromShortcut(event.key)
        if (lens) {
          event.preventDefault()
          setVisualLens(lens)
          return
        }

        if (event.key === '/') {
          event.preventDefault()
          searchInputRef.current?.focus()
          return
        }

        if (event.key === '0') {
          event.preventDefault()
          viewport.fit()
          return
        }
      }

      if (event.key !== 'Escape') return

      if (isSearchTarget && searchInput) {
        setSearchInput('')
        return
      }

      if (c.view === 'gear' || c.view === 'subflow') {
        event.preventDefault()
        c.exitGear()
        return
      }

      if (c.isolatedId) {
        event.preventDefault()
        c.exitIsolate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [c, searchInput, viewport])

  function commitSearchResult(index = activeSearchIndex) {
    const selected = searchResults[index] ?? searchResults[0]
    if (!selected) return
    c.enterNode(selected.graphId)
    setSearchInput('')
    setActiveSearchIndex(0)
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

  const lensStats = useMemo(() => {
    const recentIds = new Set(c.recentChanges.map((change) => change.graphId))
    return {
      recent: recentIds.size,
    }
  }, [c.recentChanges])

  const hereLabel = currentLocationLabel({
    view: c.view,
    continent: continent?.name ?? null,
    systemParentName: c.systemParentId ? c.atomIndex[c.systemParentId]?.name ?? null : null,
    focusedName: focusedAtom?.name ?? null,
    isolatedName: isolatedAtom?.name ?? null,
  })

  const isOffline = !c.graph && !c.loading

  return (
    <section className="cartografia-surface">
      <div
        className={`cart-work${inspectorCollapsed ? ' inspector-collapsed' : ''}`}
        style={{
          '--cart-inspector-width': `${inspectorCollapsed ? INSPECTOR_COLLAPSED_WIDTH : inspectorWidth}px`,
        } as CSSProperties}
      >
        <Inspector
          atom={inspectorAtom}
          recent={inspectorRecent}
          noteCache={c.noteCache}
          loadNoteFor={c.loadNoteFor}
          sourceRoots={c.graph?.sources ?? null}
          recentChanges={c.recentChanges}
          atomIndex={c.atomIndex}
          onPickRecent={c.enterGear}
          collapsed={inspectorCollapsed}
          width={inspectorWidth}
          minWidth={INSPECTOR_MIN_WIDTH}
          maxWidth={INSPECTOR_MAX_WIDTH}
          onToggleCollapsed={() => setInspectorCollapsed((v) => !v)}
          onNudgeWidth={(delta) => {
            setInspectorCollapsed(false)
            setInspectorWidth((width) => clampInspectorWidth(width + delta))
          }}
          onResetWidth={() => {
            setInspectorCollapsed(false)
            setInspectorWidth(INSPECTOR_DEFAULT_WIDTH)
          }}
        />

        <div
          className="cart-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar largura da coluna da Cartografia"
          aria-valuemin={INSPECTOR_MIN_WIDTH}
          aria-valuemax={INSPECTOR_MAX_WIDTH}
          aria-valuenow={inspectorCollapsed ? INSPECTOR_COLLAPSED_WIDTH : inspectorWidth}
          title="Arraste para ajustar a coluna"
          onPointerDown={(event) => {
            event.preventDefault()
            resizeDragRef.current = {
              startX: event.clientX,
              startWidth: inspectorCollapsed ? INSPECTOR_MIN_WIDTH : inspectorWidth,
            }
            setInspectorCollapsed(false)
            document.body.classList.add('cart-resizing')
          }}
          onDoubleClick={() => {
            setInspectorCollapsed(false)
            setInspectorWidth(INSPECTOR_DEFAULT_WIDTH)
          }}
        />

        <div ref={viewport.viewportRef} className={`viewport viewport-${visualLens}`}>
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
              <VisualLensToolbar
                active={visualLens}
                stats={lensStats}
                onChange={setVisualLens}
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
                  ref={searchInputRef}
                  type="search"
                  placeholder="buscar engrenagem, lane, sistema, arquivo…"
                  value={searchInput}
                  aria-label="Buscar na Cartografia"
                  aria-keyshortcuts="/"
                  aria-expanded={searchResults.length > 0}
                  aria-controls="cartografia-search-results"
                  aria-activedescendant={
                    searchResults.length > 0
                      ? `cart-search-result-${searchResults[activeSearchIndex]?.graphId ?? searchResults[0]?.graphId}`
                      : undefined
                  }
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setActiveSearchIndex((index) =>
                        searchResults.length === 0 ? 0 : (index + 1) % searchResults.length
                      )
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setActiveSearchIndex((index) =>
                        searchResults.length === 0
                          ? 0
                          : (index - 1 + searchResults.length) % searchResults.length
                      )
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitSearchResult()
                    }
                    if (e.key === 'Escape') {
                      setSearchInput('')
                      setActiveSearchIndex(0)
                    }
                  }}
                />
                {searchResults.length > 0 ? (
                  <div id="cartografia-search-results" className="search-results" role="listbox">
                    {searchResults.map((a, index) => (
                      <button
                        key={a.graphId}
                        id={`cart-search-result-${a.graphId}`}
                        type="button"
                        role="option"
                        aria-selected={index === activeSearchIndex}
                        className={`search-result${index === activeSearchIndex ? ' active' : ''}`}
                        onMouseEnter={() => setActiveSearchIndex(index)}
                        onClick={() => {
                          commitSearchResult(index)
                        }}
                      >
                        <span className="sr-title">{a.name}</span>
                        <span className="sr-meta">
                          {a.kind} · {a.graphSource} · {a.sourcePath || a.graphId}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
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
              `lens-${visualLens}`,
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
              <SystemScene
                continent={continent}
                parentId={c.systemParentId ?? continent?.graphId ?? 'atlas'}
                semanticGraph={c.graph.semanticGraph}
                onEnterFlow={() => c.setView('flow')}
                onEnterNode={c.enterNode}
              />
            ) : null}

            {c.graph && c.view === 'flow' ? (
              <FlowScene
                graph={c.graph}
                worldRef={worldRef}
                recentChanges={c.recentChanges}
                atomIndex={c.atomIndex}
                isolatedId={c.isolatedId}
                highlightedId={c.hoverId}
                visualLens={visualLens}
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

      </div>
    </section>
  )
}

function VisualLensToolbar({
  active,
  stats,
  onChange,
}: {
  active: VisualLens
  stats: { recent: number }
  onChange: (lens: VisualLens) => void
}) {
  const items: Array<{ id: VisualLens; label: string; glyph: string; shortcut: string; meta?: number }> = [
    { id: 'flow', label: 'fluxo', glyph: 'I', shortcut: '1' },
    { id: 'relations', label: 'relacoes', glyph: '↔', shortcut: '2' },
    { id: 'risk', label: 'risco', glyph: '△', shortcut: '3' },
    { id: 'recent', label: 'recentes', glyph: '●', shortcut: '4', meta: stats.recent },
    { id: 'evidence', label: 'evidencia', glyph: '☷', shortcut: '5' },
  ]

  return (
    <div className="visual-lens-floater floater no-pan" aria-label="Lentes visuais da Cartografia">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`lens-button${active === item.id ? ' active' : ''}`}
          aria-pressed={active === item.id}
          aria-keyshortcuts={item.shortcut}
          onClick={() => onChange(item.id)}
          title={`Ver mapa por ${item.label} · ${item.shortcut}`}
        >
          <span className={`lens-glyph lens-${item.id}`} aria-hidden="true">{item.glyph}</span>
          <span>{item.label}</span>
          {item.meta != null ? <strong>{item.meta}</strong> : null}
        </button>
      ))}
    </div>
  )
}

function lensFromShortcut(key: string): VisualLens | null {
  if (key === '1') return 'flow'
  if (key === '2') return 'relations'
  if (key === '3') return 'risk'
  if (key === '4') return 'recent'
  if (key === '5') return 'evidence'
  return null
}

function readStoredInspectorWidth(): number {
  const raw = readStorage(INSPECTOR_WIDTH_KEY)
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  if (!Number.isFinite(parsed)) return INSPECTOR_DEFAULT_WIDTH
  return clampInspectorWidth(parsed)
}

function readStoredVisualLens(): VisualLens {
  const raw = readStorage(VISUAL_LENS_KEY)
  return VISUAL_LENSES.includes(raw as VisualLens) ? (raw as VisualLens) : 'flow'
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  const raw = readStorage(key)
  if (raw === '1') return true
  if (raw === '0') return false
  return fallback
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Prefer losing persistence over breaking the Cartografia surface.
  }
}

function clampInspectorWidth(width: number): number {
  return Math.min(INSPECTOR_MAX_WIDTH, Math.max(INSPECTOR_MIN_WIDTH, Math.round(width)))
}

function atomMatchesQuery(atom: CartographyAtom, q: string): boolean {
  return searchableText(atom).includes(q)
}

function scoreAtomForQuery(atom: CartographyAtom, q: string): number {
  const name = atom.name.toLowerCase()
  const id = atom.graphId.toLowerCase()
  let score = 0
  if (id === q || name === q) score += 100
  if (id.includes(q)) score += 40
  if (name.includes(q)) score += 35
  if ((atom.sourcePath || '').toLowerCase().includes(q)) score += 20
  if ((atom.risk || '').toLowerCase().includes(q)) score += 12
  if ((atom.next || '').toLowerCase().includes(q)) score += 8
  return score
}

function searchableText(atom: CartographyAtom): string {
  return [
    atom.graphId,
    atom.name,
    atom.deck,
    atom.role,
    atom.sourcePath,
    atom.input,
    atom.output,
    atom.evidence,
    atom.risk,
    atom.next,
    atom.graphLayer,
    atom.graphParent,
    ...(atom.depends ?? []),
    ...(atom.unblocks ?? []),
    ...(atom.flowsTo ?? []),
    ...(atom.governs ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function currentLocationLabel({
  view,
  continent,
  focusedName,
  isolatedName,
  systemParentName,
}: {
  view: import('@atlas/domain').CartographyView
  continent: string | null
  systemParentName: string | null
  focusedName: string | null
  isolatedName: string | null
}): string {
  if (view === 'universe') return 'Universo'
  if (view === 'system') return systemParentName ?? continent ?? 'Atlas'
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
