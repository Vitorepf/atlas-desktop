import type { Obra } from '@atlas/domain'
import { btnGhost } from './obraBarStyles'
import { shortObraId } from './obraBarUtils'

interface ActiveObraBarProps {
  obra: Obra
  onCreateNew: () => void
}

export function ActiveObraBar({ obra, onCreateNew }: ActiveObraBarProps) {
  return (
    <section className="obra-bar">
      <div style={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
        <span className="obra-id">{shortObraId(obra.id)}</span>
        <span className="obra-objective">{obra.objective || obra.title || '—'}</span>
      </div>
      <div />
      <div className="status-board" style={{ gap: 8 }}>
        <button type="button" onClick={onCreateNew} style={btnGhost}>
          ✦ nova obra
        </button>
      </div>
    </section>
  )
}
