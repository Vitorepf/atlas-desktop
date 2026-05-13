import type { CartographyAtom } from '@atlas/domain'

export function GearHeader({ atom, eyebrow }: { atom: CartographyAtom; eyebrow: string }) {
  return (
    <header className="focus-header">
      <div className="focus-eyebrow">{eyebrow}</div>
      <h2 className="focus-title">{atom.name}</h2>
      <p className="focus-lede">{atom.role || atom.deck || ''}</p>
      <div className="focus-side-meta">
        <span className={`meta-source-badge ${atom.graphSource}`}>{atom.graphSource}</span>
        <span>{atom.sourcePath}</span>
        <span>● sincronizado</span>
      </div>
    </header>
  )
}
