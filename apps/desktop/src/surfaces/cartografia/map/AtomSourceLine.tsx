import type { CartographyAtom } from '@atlas/domain'

/** Encurta path canon `docs/.../atlas-decide.md` → `atlas-decide.md`.
 *  Mantém path full no `title` (tooltip nativo) pra auditoria. Pass O. */
function basename(path: string): string {
  if (!path) return '—'
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return idx >= 0 ? path.slice(idx + 1) : path
}

export function AtomSourceLine({ atom }: { atom: CartographyAtom }) {
  const path = atom.sourcePath || ''
  return (
    <span className="a-source">
      <span className={`a-source-badge ${atom.graphSource}`}>{atom.graphSource}</span>
      <span className="a-source-path" title={path}>
        {basename(path) || '—'}
      </span>
    </span>
  )
}
