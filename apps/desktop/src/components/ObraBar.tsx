import { useState } from 'react'
import type { Obra } from '@atlas/domain'

interface ObraBarProps {
  obra: Obra | null
  onCreate: (intent: string, objective: string) => Promise<Obra | null>
  busy: boolean
}

/**
 * ObraBar · shows the active obra. When none exists, opens an inline form
 * that posts to bridge.createObra. NEVER paints an invented OBRA-ID.
 */
export function ObraBar({ obra, onCreate, busy }: ObraBarProps) {
  const [creating, setCreating] = useState(false)
  const [objective, setObjective] = useState('')
  const [intent, setIntent] = useState('')

  if (creating || (!obra && !busy)) {
    return (
      <section className="obra-bar" style={{ gap: 12 }}>
        <span className="obra-id" style={{ background: 'transparent', border: 0, color: 'var(--bronze)' }}>
          ✦ nova obra
        </span>
        <input
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="objetivo · ex: Refatorar Decide → trait Gated"
          style={inlineInputStyle}
        />
        <input
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="intent · contexto opcional"
          style={inlineInputStyle}
        />
        <div className="status-board" style={{ gap: 6 }}>
          <button
            type="button"
            disabled={!objective.trim() || busy}
            onClick={async () => {
              const result = await onCreate(intent.trim(), objective.trim())
              if (result) {
                setCreating(false)
                setObjective('')
                setIntent('')
              }
            }}
            style={btnPrimary}
          >
            {busy ? 'criando…' : 'criar obra'}
          </button>
          {obra && (
            <button type="button" onClick={() => setCreating(false)} style={btnGhost}>
              cancelar
            </button>
          )}
        </div>
      </section>
    )
  }

  if (!obra) {
    return (
      <section className="obra-bar">
        <div style={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
          <span className="obra-id" style={{ opacity: 0.45 }}>—</span>
          <span className="obra-objective" style={{ opacity: 0.55 }}>consultando Kernel…</span>
        </div>
      </section>
    )
  }

  return (
    <section className="obra-bar">
      <div style={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
        <span className="obra-id">{shortId(obra.id)}</span>
        <span className="obra-objective">{obra.objective || obra.title || '—'}</span>
      </div>
      <div />
      <div className="status-board" style={{ gap: 8 }}>
        <button type="button" onClick={() => setCreating(true)} style={btnGhost}>
          ✦ nova obra
        </button>
      </div>
    </section>
  )
}

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) : id
}

const inlineInputStyle: React.CSSProperties = {
  flex: '1 1 auto',
  minWidth: 100,
  padding: '5px 9px',
  border: '1px solid var(--hair)',
  borderRadius: 2,
  background: 'var(--cream)',
  fontFamily: 'var(--serif)',
  fontStyle: 'italic',
  fontSize: 13,
  color: 'var(--ink)',
  outline: 'none',
}

const btnGhost: React.CSSProperties = {
  padding: '4px 9px',
  fontFamily: 'var(--mono)',
  fontSize: 9.5,
  letterSpacing: '1.3px',
  textTransform: 'uppercase',
  color: 'var(--bronze)',
  border: '1px solid var(--bronze-soft)',
  borderRadius: 2,
  background: 'transparent',
  cursor: 'pointer',
}

const btnPrimary: React.CSSProperties = {
  ...btnGhost,
  background: 'var(--ink)',
  color: 'var(--cream)',
  borderColor: 'var(--ink)',
}
