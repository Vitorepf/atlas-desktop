import type { CartographyAtom } from '@atlas/domain'

export function GearSatellites({
  side,
  label,
  glyph,
  atoms,
  onSatellite,
}: {
  side: 'left' | 'right'
  label: string
  glyph: string
  atoms: CartographyAtom[]
  onSatellite: (graphId: string) => void
}) {
  return (
    <aside className={`focus-side ${side}`}>
      <div className="side-label">
        <span className="side-glyph">{glyph}</span>
        {label}
      </div>
      {atoms.length === 0 ? (
        <div className="empty-state">—</div>
      ) : (
        atoms.map((atom) => (
          <SatelliteButton key={atom.graphId} atom={atom} onClick={() => onSatellite(atom.graphId)} />
        ))
      )}
    </aside>
  )
}

function SatelliteButton({
  atom,
  onClick,
}: {
  atom: CartographyAtom
  onClick: () => void
}) {
  return (
    <button type="button" className="satellite" onClick={onClick}>
      <span className="s-name">{atom.name}</span>
      {atom.deck ? <span className="s-sub">{atom.deck}</span> : null}
      <span className="s-source">
        {atom.graphSource} · {atom.sourcePath || ''}
      </span>
    </button>
  )
}
