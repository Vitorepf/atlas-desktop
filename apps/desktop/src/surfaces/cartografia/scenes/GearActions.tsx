import type { CartographyAtom } from '@atlas/domain'
import { openCartographyDocument } from '../source/sourceActions'

export function GearActions({
  atom,
  onSubflow,
  onLoop,
  onBack,
}: {
  atom: CartographyAtom
  onSubflow: () => void
  onLoop: () => void
  onBack: () => void
}) {
  return (
    <footer className="focus-footer">
      <button
        type="button"
        className="focus-action primary"
        onClick={() => void openCartographyDocument(atom)}
      >
        ↗ Abrir arquivo no editor
      </button>
      {atom.subs && atom.subs.length > 0 ? (
        <button type="button" className="focus-action" onClick={onSubflow}>
          ↓ Ver subcomponentes
        </button>
      ) : null}
      <button type="button" className="focus-action" onClick={onLoop}>
        ↻ Ver loop de evidência
      </button>
      <button type="button" className="focus-action" onClick={onBack}>
        ← Voltar ao mapa
      </button>
    </footer>
  )
}
