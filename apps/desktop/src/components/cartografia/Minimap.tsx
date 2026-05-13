/**
 * Minimap · top-left floater listing the 6 continents + "you are here" pin.
 */
import { useEffect, useState } from 'react'
import type { Continent } from '@atlas/domain'

interface MinimapProps {
  continents: Continent[]
  activeContinentId: string
  hereLabel: string
  onSelect: (continentId: string) => void
}

const MINIMAP_COLLAPSED_KEY = 'atlas.cartografia.minimapCollapsed'

export function Minimap({ continents, activeContinentId, hereLabel, onSelect }: MinimapProps) {
  const [collapsed, setCollapsed] = useState(() => readStoredCollapsed())

  useEffect(() => {
    writeStorage(MINIMAP_COLLAPSED_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <aside className={`minimap-floater floater no-pan${collapsed ? ' is-collapsed' : ''}`}>
      <div className="mf-head">
        <span>Continentes do Vault</span>
        <button
          type="button"
          className="mf-toggle"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? 'Mostrar continentes' : 'Minimizar continentes'}
          aria-label={collapsed ? 'Mostrar continentes' : 'Minimizar continentes'}
        >
          <span className={`mf-toggle-icon${collapsed ? ' restore' : ''}`} aria-hidden="true" />
        </button>
      </div>
      {collapsed ? null : (
        <>
          <div className="mf-list">
            {continents.map((c) => {
              const sourceLabel = c.graphSource === 'mixed' ? 'misto' : c.graphSource
              return (
                <button
                  key={c.graphId}
                  type="button"
                  className={`mf-row${c.graphId === activeContinentId ? ' active' : ''}`}
                  onClick={() => onSelect(c.graphId)}
                >
                  <span className="mf-dot" />
                  <span className="mf-name">{c.name}</span>
                  <span className="mf-count">{c.count}</span>
                  <span className="mf-source">
                    {sourceLabel} · {c.sourcePath}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mf-divider" />
          <div className="mf-here">
            <span className="mf-here-label">Você está aqui</span>
            <span className="mf-here-val">{hereLabel}</span>
          </div>
        </>
      )}
    </aside>
  )
}

function readStoredCollapsed(): boolean {
  const raw = readStorage(MINIMAP_COLLAPSED_KEY)
  return raw === '1'
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
    // Persistence is helpful but should never block the map.
  }
}
