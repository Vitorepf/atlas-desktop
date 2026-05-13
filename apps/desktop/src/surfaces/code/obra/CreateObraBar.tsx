import type { Obra } from '@atlas/domain'
import { btnGhost, btnPrimary, inlineInputStyle } from './obraBarStyles'

interface CreateObraBarProps {
  objective: string
  intent: string
  busy: boolean
  hasExistingObra: boolean
  onObjectiveChange: (value: string) => void
  onIntentChange: (value: string) => void
  onCancel: () => void
  onCreate: () => Promise<Obra | null>
}

export function CreateObraBar({
  objective,
  intent,
  busy,
  hasExistingObra,
  onObjectiveChange,
  onIntentChange,
  onCancel,
  onCreate,
}: CreateObraBarProps) {
  return (
    <section className="obra-bar" style={{ gap: 12 }}>
      <span className="obra-id" style={{ background: 'transparent', border: 0, color: 'var(--bronze)' }}>
        ✦ nova obra
      </span>
      <input
        value={objective}
        onChange={(e) => onObjectiveChange(e.target.value)}
        placeholder="objetivo · ex: Refatorar Decide → trait Gated"
        style={inlineInputStyle}
      />
      <input
        value={intent}
        onChange={(e) => onIntentChange(e.target.value)}
        placeholder="intent · contexto opcional"
        style={inlineInputStyle}
      />
      <div className="status-board" style={{ gap: 6 }}>
        <button
          type="button"
          disabled={!objective.trim() || busy}
          onClick={() => void onCreate()}
          style={btnPrimary}
        >
          {busy ? 'criando…' : 'criar obra'}
        </button>
        {hasExistingObra && (
          <button type="button" onClick={onCancel} style={btnGhost}>
            cancelar
          </button>
        )}
      </div>
    </section>
  )
}
