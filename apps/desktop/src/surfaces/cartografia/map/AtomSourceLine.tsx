import type { CartographyAtom } from '@atlas/domain'

export function AtomSourceLine({ atom }: { atom: CartographyAtom }) {
  return (
    <span className="a-source">
      <span className={`a-source-badge ${atom.graphSource}`}>{atom.graphSource}</span>
      <span className="a-source-path">{atom.sourcePath || '—'}</span>
    </span>
  )
}
