/**
 * Minimap · top-left floater listing the 6 continents + "you are here" pin.
 */
import { useEffect, useState } from 'react'
import type { Continent } from '@atlas/domain'
import {
  minimapSourceLabel,
  persistMinimapCollapsed,
  readStoredMinimapCollapsed,
} from './minimapModel'

interface MinimapProps {
  continents: Continent[]
  activeContinentId: string
  hereLabel: string
  onSelect: (continentId: string) => void
}

export function Minimap({ continents, activeContinentId, hereLabel, onSelect }: MinimapProps) {
  const [collapsed, setCollapsed] = useState(() => readStoredMinimapCollapsed())

  useEffect(() => {
    persistMinimapCollapsed(collapsed)
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
              const sourceLabel = minimapSourceLabel(c)
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
