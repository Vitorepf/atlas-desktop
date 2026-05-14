import { useState } from 'react'
import type { Obra, Session } from '@atlas/domain'
import { LEFT_RAIL_SECTIONS, renderLeftRailSection } from './leftRailRegistry'
import type { LeftRailContext } from './leftRailTypes'

interface LeftRailProps {
  obras: Obra[]
  activeObraId: string | null
  active: Session[]
  recent: Session[]
  loading: boolean
  busy: boolean
  onSelectObra: (obraId: string) => Promise<void>
  onCreateObra: (intent: string, objective: string) => Promise<Obra | null>
}

/**
 * Atlas Code Visual Ergonomics v1 · operational navigation rail.
 *
 * Hosts a single canonical "Nova Obra" CTA at the top, followed by registered
 * sections (Obras / Sessões em curso / Recentes). Enterprise-polished: sans
 * typography, status dots, calm hover/focus, honest empty states.
 */
export function LeftRail(props: LeftRailProps) {
  const ctx: LeftRailContext = props

  return (
    <aside className="left-rail" aria-label="Atlas Code · navegação esquerda">
      <CreateObraControl busy={props.busy} onCreateObra={props.onCreateObra} />
      {LEFT_RAIL_SECTIONS.map((section) => renderLeftRailSection(section, ctx))}
    </aside>
  )
}

function CreateObraControl({
  busy,
  onCreateObra,
}: {
  busy: boolean
  onCreateObra: (intent: string, objective: string) => Promise<Obra | null>
}) {
  const [open, setOpen] = useState(false)
  const [objective, setObjective] = useState('')
  const [intent, setIntent] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const cleanObjective = objective.trim()
    if (!cleanObjective) return
    setError(null)
    try {
      const created = await onCreateObra(intent.trim(), cleanObjective)
      if (created) {
        setOpen(false)
        setObjective('')
        setIntent('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section
      style={{
        margin: '0 0 12px',
        paddingBottom: 12,
        borderBottom: '1px solid var(--cc-border-soft)',
      }}
      aria-label="Criar Obra"
    >
      {!open ? (
        <button
          type="button"
          className="cc-btn cc-btn-primary"
          style={{ width: '100%' }}
          disabled={busy}
          onClick={() => setOpen(true)}
        >
          <span aria-hidden>✦</span>
          <span>Nova Obra</span>
        </button>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          <label className="cc-eyebrow">Nova Obra</label>
          <input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Objetivo desta Obra"
            className="cc-input"
            disabled={busy}
            autoFocus
          />
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="Contexto opcional · regra que não pode quebrar, escopo…"
            className="cc-textarea"
            disabled={busy}
            rows={3}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
            <button
              type="button"
              className="cc-btn cc-btn-primary"
              disabled={busy || !objective.trim()}
              onClick={() => void submit()}
            >
              Criar Obra
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-secondary"
              disabled={busy}
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
            >
              Cancelar
            </button>
          </div>
          {error ? (
            <div className="cc-error" role="alert" style={{ padding: '6px 10px' }}>
              <span className="cc-error-title">Falha ao criar Obra</span>
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
