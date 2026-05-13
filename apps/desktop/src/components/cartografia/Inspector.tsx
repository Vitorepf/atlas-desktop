/**
 * Inspector · right-rail editorial · sempre presente.
 *
 * Renderiza:
 * - source line (badge repo|vault + path + status / "atualizado há Xs")
 * - kind eyebrow + title + lede
 * - ficha 7 (entrada/saída/depende/alimenta/evidência/gargalo/próxima ação)
 * - markdown viewer do .md real (lazy-loaded via loadNoteFor)
 * - actions list (read-only · placeholders pra ações futuras)
 * - tags
 *
 * Quando nada está hover/foco, mostra default "Atlas AI Kernel Pipeline".
 * Quando uma peça está sob hover/isolate/focus, mostra a ficha dela.
 */
import { useEffect, useState } from 'react'
import type { CartographyAtom, CartographyNote, RecentChange } from '@atlas/domain'
import { formatTimeAgo, toRoman } from './layout'
import { parseMarkdown } from './markdown'

interface InspectorProps {
  /** atom do hover/isolate/focus, ou null pra default */
  atom: CartographyAtom | null
  recent: RecentChange | null
  noteCache: Record<string, CartographyNote | null>
  loadNoteFor: (graphId: string) => Promise<CartographyNote | null>
}

interface FichaField {
  label: string
  glyph: string
  val: string | null | undefined
  risk?: boolean
  next?: boolean
}

export function Inspector({ atom, recent, noteCache, loadNoteFor }: InspectorProps) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!atom || atom.missingSource) return
    if (atom.graphId in noteCache) return
    void loadNoteFor(atom.graphId).then(() => forceTick((n) => n + 1))
  }, [atom, noteCache, loadNoteFor])

  if (!atom) return <DefaultInspector />

  const isPipeline = atom.kind === 'pipeline'
  const isLateral = atom.kind === 'lateral'
  const note = noteCache[atom.graphId] ?? null
  const hasNote = !!note?.body
  const fresh = recent && recent.secondsAgo < 60

  const kind = isPipeline
    ? `Engrenagem · ${toRoman(atom.graphOrder ?? 0)}. Atlas AI Kernel`
    : isLateral
      ? `Lateral · ${atom.regionHead ?? ''}`
      : `Lane · ${atom.name}`

  const fields: FichaField[] = [
    { label: 'Entrada', glyph: '↑', val: atom.input },
    { label: 'Saída', glyph: '↓', val: atom.output },
    {
      label: 'Depende de',
      glyph: '←',
      val: (atom.depends ?? [])
        .map((id) => id)
        .join(' · ') || null,
    },
    {
      label: 'Alimenta',
      glyph: '→',
      val: (atom.unblocks ?? [])
        .map((id) => id)
        .join(' · ') || null,
    },
    { label: 'Evidência', glyph: '☷', val: atom.evidence },
    { label: 'Gargalo', glyph: '△', val: atom.risk, risk: true },
    { label: 'Próxima ação', glyph: '✦', val: atom.next, next: true },
  ]

  const editedBadge =
    recent && recent.secondsAgo < 60
      ? `atualizado ${formatTimeAgo(recent.secondsAgo)}`
      : 'sincronizado'

  const tags = isPipeline
    ? ['engrenagem', 'atlas-ai-kernel', atom.graphId]
    : ['lateral', atom.regionId ?? '', atom.graphId].filter(Boolean)

  return (
    <aside className="cart-inspector">
      <div className="ins-header">
        <div className="ins-source">
          <span className={`ins-source-badge ${atom.graphSource}`}>{atom.graphSource}</span>
          <span className="ins-source-path">{atom.sourcePath || '—'}</span>
          <span className="ins-source-status">{editedBadge}</span>
        </div>
        <div className="ins-kind">{kind}</div>
        <h2 className="ins-title">{atom.name}</h2>
        <p className="ins-lede">{atom.role || atom.deck || ''}</p>
      </div>

      <div className="ins-body">
        <Ficha fields={fields} />

        <details className="ins-md" open>
          <summary>
            <span className="ins-md-title">Conteúdo do arquivo</span>
            <span className={`ins-md-meta${fresh ? '' : ' stale'}`}>
              {hasNote
                ? note?.sourcePath ?? '—'
                : recent
                  ? `${recent.time} · ${formatTimeAgo(recent.secondsAgo)}`
                  : '— carregando arquivo real…'}
            </span>
          </summary>
          <div className="ins-md-body">
            {hasNote ? (
              <div dangerouslySetInnerHTML={{ __html: parseMarkdown(note!.body) }} />
            ) : atom.missingSource ? (
              <p style={{ color: 'var(--rec-red)', fontStyle: 'italic' }}>
                Fonte ausente · esta peça é canônica mas o arquivo correspondente
                ainda não existe em <code>{atom.sourcePath}</code>.
              </p>
            ) : (
              <p style={{ color: 'var(--ink3)', fontStyle: 'italic' }}>
                Carregando conteúdo de <code>{atom.sourcePath}</code>…
              </p>
            )}
          </div>
        </details>

        <div className="ins-section">
          <h3>Ações</h3>
          <div className="ins-actions">
            <ActionRow label="Abrir arquivo no editor" glyph="↗" />
            <ActionRow label="Ver loop de evidência" glyph="↻" />
            <ActionRow label="Filtrar peças conectadas" glyph="∴" />
            <ActionRow label="Copiar caminho do arquivo" glyph="⎘" />
          </div>
        </div>

        <div className="ins-section">
          <h3>Tags</h3>
          <div className="ins-tags">
            {tags.map((t) => (
              <span key={t} className="ins-tag">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

function DefaultInspector() {
  return (
    <aside className="cart-inspector">
      <div className="ins-header">
        <div className="ins-source">
          <span className="ins-source-badge repo">repo</span>
          <span className="ins-source-path">
            docs/engineering-knowledge-base/atlas-ai-pipeline.md
          </span>
          <span className="ins-source-status">sincronizado</span>
        </div>
        <div className="ins-kind">Fluxo operacional</div>
        <h2 className="ins-title">Atlas AI Kernel Pipeline</h2>
        <p className="ins-lede">
          17 etapas em sequência. Lateral alimenta; loop de evidência volta ao Decide. Passe o
          mouse sobre uma peça pra ver conexões; clique pra entrar em Foco.
        </p>
      </div>
      <div className="ins-body">
        <details className="ins-md" open>
          <summary>
            <span className="ins-md-title">Conteúdo do arquivo</span>
            <span className="ins-md-meta">— passe o mouse sobre uma peça</span>
          </summary>
          <div className="ins-md-body">
            <p style={{ color: 'var(--ink3)', fontStyle: 'italic' }}>
              Selecione uma engrenagem ou lateral pra carregar o arquivo canônico
              correspondente.
            </p>
          </div>
        </details>
        <div className="ins-section">
          <h3>Tags</h3>
          <div className="ins-tags">
            <span className="ins-tag">kernel</span>
            <span className="ins-tag">pipeline</span>
            <span className="ins-tag">atlas-system-graph</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Ficha({ fields }: { fields: FichaField[] }) {
  const hasAny = fields.some((f) => f.val)
  if (!hasAny) return null
  return (
    <div className="ficha-7">
      {fields.map((f) => {
        const val = f.val || '—'
        const cls = `row${f.risk && val !== '—' ? ' risk' : ''}${f.next ? ' next' : ''}`
        return (
          <div key={f.label} className={cls}>
            <span className="label">
              <span className="glyph">{f.glyph}</span>
              {f.label}
            </span>
            <span className={`value${val === '—' ? ' empty' : ''}`}>{val}</span>
          </div>
        )
      })}
    </div>
  )
}

function ActionRow({ label, glyph }: { label: string; glyph: string }) {
  return (
    <div className="ins-action">
      <span className="a-label">{label}</span>
      <span className="a-glyph">{glyph}</span>
    </div>
  )
}
