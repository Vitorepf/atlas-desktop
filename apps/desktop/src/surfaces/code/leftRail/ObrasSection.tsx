import { useMemo, useState } from 'react'
import type { LeftRailContext } from './leftRailTypes'
import { shortId } from './leftRailUtils'
import type { Obra } from '@atlas/domain'

/**
 * Atlas Code Visual Ergonomics v1 · ObrasSection enterprise.
 *
 * Cada Obra renderiza como `cc-obra-row` (token canônico): short_id + título +
 * status humano + last activity. Active state óbvio por borda lateral.
 * Hover/focus claros. Empty state honesto. Busca local opcional só quando há
 * volume; sem dependência externa.
 */
export function ObrasSection({ obras, activeObraId, loading, busy, onSelectObra }: LeftRailContext) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return obras
    return obras.filter((o) => {
      const title = (o.title || o.objective || '').toLowerCase()
      const id = o.id.toLowerCase()
      return title.includes(q) || id.includes(q)
    })
  }, [obras, query])

  if (loading && obras.length === 0) {
    return (
      <div className="cc-loading" role="status" aria-live="polite">
        <div className="cc-loading-title">Consultando Kernel…</div>
        <div className="cc-empty-hint">Aguardando lista de Obras do backend.</div>
      </div>
    )
  }

  if (obras.length === 0) {
    return (
      <div className="cc-empty" role="region" aria-label="Nenhuma Obra ativa">
        <div className="cc-empty-title">Nenhuma Obra ativa</div>
        <div className="cc-empty-hint">Use o botão ✦ acima para criar a primeira.</div>
      </div>
    )
  }

  return (
    <div role="list" aria-label="Lista de Obras">
      {obras.length >= 4 ? (
        <input
          type="search"
          className="cc-input cc-btn-sm"
          placeholder="Buscar obra…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar Obra"
          style={{ height: 28, fontSize: 12, marginBottom: 6 }}
        />
      ) : null}
      {filtered.length === 0 ? (
        <div className="cc-empty" role="status">
          <div className="cc-empty-title">Nada encontrado</div>
          <div className="cc-empty-hint">Ajuste a busca ou limpe o campo.</div>
        </div>
      ) : (
        filtered.map((o) => (
          <ObraRow
            key={o.id}
            obra={o}
            active={o.id === activeObraId}
            disabled={busy}
            onSelect={() => void onSelectObra(o.id)}
          />
        ))
      )}
    </div>
  )
}

interface ObraRowProps {
  obra: Obra
  active: boolean
  disabled: boolean
  onSelect: () => void
}

function ObraRow({ obra, active, disabled, onSelect }: ObraRowProps) {
  const title = obra.title || obra.objective || `obra ${shortId(obra.id)}`
  const status = mapObraStatus(obra.status)

  return (
    <button
      type="button"
      role="listitem"
      className="cc-obra-row"
      data-active={active ? 'true' : 'false'}
      onClick={onSelect}
      disabled={disabled}
      aria-current={active ? 'true' : undefined}
      aria-label={`Obra ${shortId(obra.id)} · ${title} · ${status.label}`}
      title={title}
    >
      <div className="cc-obra-row-head">
        <span className="cc-status-dot" data-status={status.dot} aria-hidden="true" />
        <span className="cc-obra-row-id">{shortId(obra.id)}</span>
        <span className="cc-obra-row-title">{title}</span>
      </div>
      <div className="cc-obra-row-meta">
        <span>{status.label}</span>
        {obra.workspacePath ? (
          <>
            <span className="sep">·</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {compactWorkspacePath(obra.workspacePath)}
            </span>
          </>
        ) : null}
      </div>
    </button>
  )
}

/**
 * Map Obra.status canônico para chip humano + status dot.
 * Honesto: estados desconhecidos viram "unknown" em vez de verde fake.
 */
function mapObraStatus(status: Obra['status']): { label: string; dot: string } {
  switch (status) {
    case 'active':
      return { label: 'ativa', dot: 'running' }
    case 'idle':
      return { label: 'ociosa', dot: 'unknown' }
    case 'archived':
      return { label: 'arquivada', dot: 'unknown' }
    default:
      return { label: 'estado desconhecido', dot: 'unknown' }
  }
}

/** Reduz `/Users/<long>/.../atlas-server` para `…/atlas-server`. */
function compactWorkspacePath(path: string): string {
  if (path.length <= 28) return path
  const segments = path.split('/').filter(Boolean)
  if (segments.length <= 2) return path
  return `…/${segments.slice(-2).join('/')}`
}
