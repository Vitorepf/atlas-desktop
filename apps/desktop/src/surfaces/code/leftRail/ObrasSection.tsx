import { useMemo, useState } from 'react'
import type { Obra } from '@atlas/domain'
import type { LeftRailContext } from './leftRailTypes'
import { shortId } from './leftRailUtils'
import { EmptyState, ObraListItem } from '../workbench'
import type { StatusKind } from '../workbench/tokens'

/**
 * Atlas Code Premium Workbench v1 · lista de Obras enterprise.
 *
 * Cada Obra renderiza via `ObraListItem` (workbench primitive): short_id
 * em mono, título sans semibold, status dot semântico, meta humano + path
 * compacto. Active state inequívoco. Search local quando há volume.
 * Empty/loading states honestos.
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
      <EmptyState
        title="Consultando Kernel…"
        hint="Aguardando lista de Obras do backend."
        tone="info"
      />
    )
  }

  if (obras.length === 0) {
    return (
      <EmptyState
        title="Nenhuma Obra ativa"
        hint="Use o botão ✦ acima para criar a primeira."
      />
    )
  }

  return (
    <div role="list" aria-label="Lista de Obras" style={{ display: 'grid', gap: 2 }}>
      {obras.length >= 4 ? (
        <input
          type="search"
          className="cc-input"
          placeholder="Buscar obra…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar Obra"
          style={{ height: 30, fontSize: 12, marginBottom: 6 }}
        />
      ) : null}
      {filtered.length === 0 ? (
        <EmptyState title="Nada encontrado" hint="Ajuste a busca ou limpe o campo." />
      ) : (
        filtered.map((o) => {
          const status = mapObraStatus(o)
          return (
            <ObraListItem
              key={o.id}
              shortId={shortId(o.id)}
              title={o.title || o.objective || `obra ${shortId(o.id)}`}
              status={status.dot}
              statusLabel={status.label}
              hint={o.workspacePath ? compactWorkspacePath(o.workspacePath) : undefined}
              active={o.id === activeObraId}
              disabled={busy}
              onClick={() => void onSelectObra(o.id)}
            />
          )
        })
      )}
    </div>
  )
}

function mapObraStatus(obra: Obra): { label: string; dot: StatusKind } {
  switch (obra.status) {
    case 'active':
      return { label: 'ativa', dot: 'running' }
    case 'idle':
      return { label: 'ociosa', dot: 'idle' }
    case 'archived':
      return { label: 'arquivada', dot: 'unknown' }
    default:
      return { label: 'estado desconhecido', dot: 'unknown' }
  }
}

function compactWorkspacePath(path: string): string {
  if (path.length <= 28) return path
  const segments = path.split('/').filter(Boolean)
  if (segments.length <= 2) return path
  return `…/${segments.slice(-2).join('/')}`
}
