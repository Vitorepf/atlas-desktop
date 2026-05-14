import type { Obra } from '@atlas/domain'
import { shortObraId } from './obraBarUtils'

interface ActiveObraBarProps {
  obra: Obra
}

export function ActiveObraBar({ obra }: ActiveObraBarProps) {
  return (
    <section className="obra-bar">
      <div style={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
        <span className="obra-id">{shortObraId(obra.id)}</span>
        <span className="obra-objective">{obra.objective || obra.title || '—'}</span>
      </div>
    </section>
  )
}
