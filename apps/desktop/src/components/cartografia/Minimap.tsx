/**
 * Minimap · top-left floater listing the 6 continents + "you are here" pin.
 */
import type { Continent } from '@atlas/domain'

interface MinimapProps {
  continents: Continent[]
  activeContinentId: string
  hereLabel: string
  onSelect: (continentId: string) => void
}

export function Minimap({ continents, activeContinentId, hereLabel, onSelect }: MinimapProps) {
  return (
    <aside className="minimap-floater floater no-pan">
      <div className="mf-head">Continentes do Vault</div>
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
    </aside>
  )
}
