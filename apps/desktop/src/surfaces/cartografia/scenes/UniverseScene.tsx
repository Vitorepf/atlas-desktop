/**
 * UniverseScene · top-level grid of continents.
 *
 * Each continent is a clickable card showing source path + count of pieces
 * catalogued. Click selects the continent and drills into the system view.
 */
import type { Continent } from '@atlas/domain'

interface UniverseSceneProps {
  universe: Continent[]
  onSelect: (continentId: string) => void
}

export function UniverseScene({ universe, onSelect }: UniverseSceneProps) {
  return (
    <div className="scene scene-universe">
      <header className="scene-head">
        <div className="scene-eyebrow">Universo do Vault</div>
        <h2 className="scene-title">AtlasVault</h2>
        <p className="scene-lede">
          Seis continentes. Atlas é o sistema operacional técnico — vive no repo. Memória,
          Obras, Filosofia, Gargalos vivem em diferentes fontes canônicas.
        </p>
      </header>
      <div className="continent-grid">
        {universe.map((c) => (
          <button
            key={c.graphId}
            type="button"
            className={`atom continent-card ${c.missingSource ? 'missing-source' : ''}`}
            onClick={() => onSelect(c.graphId)}
          >
            <span className="a-name continent-name">{c.name}</span>
            <span className="a-deck">
              {c.count} peças catalogadas
              {c.role ? ` · ${c.role}` : ''}
            </span>
            <span className="a-source">
              <span className={`a-source-badge ${c.graphSource === 'mixed' ? 'repo' : c.graphSource}`}>
                {c.graphSource === 'mixed' ? 'misto' : c.graphSource}
              </span>
              <span className="a-source-path">{c.sourcePath}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
