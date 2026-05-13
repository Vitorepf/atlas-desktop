/**
 * Inspector · left-rail editorial · sempre presente.
 *
 * Renderiza:
 * - source line (badge repo|vault + path + status / "atualizado há Xs")
 * - kind eyebrow + title + lede
 * - ficha 7 (entrada/saída/depende/alimenta/evidência/gargalo/próxima ação)
 * - markdown viewer do .md real (lazy-loaded via loadNoteFor)
 * - actions list (read-only · open/copy/reveal source actions)
 * - tags
 *
 * Quando nada está hover/foco, mostra default "Atlas AI Kernel Pipeline".
 * Quando uma peça está sob hover/isolate/focus, mostra a ficha dela.
 */
import { useEffect, useState } from 'react'
import type { CartographyAtom, CartographyNote, CartographySources, RecentChange } from '@atlas/domain'
import { formatTimeAgo, toRoman } from './layout'
import { parseMarkdown } from './markdown'
import {
  copyCartographyPath,
  openCartographyDocument,
  revealCartographyDocument,
} from './sourceActions'
import { TimelineFloater } from './TimelineFloater'
import { bridge } from '../../lib/bridge'

interface InspectorProps {
  /** atom do hover/isolate/focus, ou null pra default */
  atom: CartographyAtom | null
  recent: RecentChange | null
  noteCache: Record<string, CartographyNote | null>
  loadNoteFor: (graphId: string) => Promise<CartographyNote | null>
  sourceRoots: CartographySources | null
  recentChanges: RecentChange[]
  atomIndex: Record<string, CartographyAtom>
  onPickRecent: (graphId: string) => void
  collapsed: boolean
  width: number
  minWidth: number
  maxWidth: number
  onToggleCollapsed: () => void
  onNudgeWidth: (delta: number) => void
  onResetWidth: () => void
}

interface FichaField {
  label: string
  glyph: string
  val: string | null | undefined
  risk?: boolean
  next?: boolean
}

export function Inspector({
  atom,
  recent,
  noteCache,
  loadNoteFor,
  sourceRoots,
  recentChanges,
  atomIndex,
  onPickRecent,
  collapsed,
  width,
  minWidth,
  maxWidth,
  onToggleCollapsed,
  onNudgeWidth,
  onResetWidth,
}: InspectorProps) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!atom || atom.missingSource) return
    if (atom.graphId in noteCache) return
    void loadNoteFor(atom.graphId).then(() => forceTick((n) => n + 1))
  }, [atom, noteCache, loadNoteFor])

  if (!atom) {
    return (
      <DefaultInspector
        recentChanges={recentChanges}
        atomIndex={atomIndex}
        onPickRecent={onPickRecent}
        collapsed={collapsed}
        width={width}
        minWidth={minWidth}
        maxWidth={maxWidth}
        onToggleCollapsed={onToggleCollapsed}
        onNudgeWidth={onNudgeWidth}
        onResetWidth={onResetWidth}
      />
    )
  }

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
    <aside className={`cart-inspector${collapsed ? ' is-collapsed' : ''}`}>
      <InspectorResizeToolbar
        collapsed={collapsed}
        width={width}
        minWidth={minWidth}
        maxWidth={maxWidth}
        onToggleCollapsed={onToggleCollapsed}
        onNudgeWidth={onNudgeWidth}
        onResetWidth={onResetWidth}
      />
      {collapsed ? <CollapsedInspectorRail onToggleCollapsed={onToggleCollapsed} /> : null}
      <div className="ins-content" aria-hidden={collapsed}>
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

        <div className="ins-section ins-fit">
          <h3>Onde Isso Encaixa</h3>
          <div className="fit-grid">
            <FitRow label="Mundo" value={atom.graphSource === 'vault' ? 'AtlasVault' : 'Repo oficial'} />
            <FitRow label="Camada" value={atom.graphLayer ?? atom.kind} />
            <FitRow label="Pai" value={atom.graphParent ?? atom.regionHead ?? '—'} />
            <FitRow label="Arquivo" value={atom.sourcePath || '—'} mono />
          </div>
        </div>

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
            <ActionRow
              label={atom.graphSource === 'vault' ? 'Abrir nota no Obsidian' : 'Abrir doc no editor'}
              glyph="↗"
              onClick={() => void openCartographyDocument(atom, note, sourceRoots)}
              disabled={atom.missingSource}
            />
            <ActionRow
              label="Copiar caminho canônico"
              glyph="⎘"
              onClick={() => void copyCartographyPath(atom)}
              disabled={!atom.sourcePath}
            />
            <ActionRow
              label="Revelar no Finder"
              glyph="✦"
              onClick={() => void revealCartographyDocument(atom, note, sourceRoots)}
              disabled={atom.missingSource || bridge.mode !== 'tauri'}
            />
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
      </div>
      <RecentChangesDock
        collapsed={collapsed}
        changes={recentChanges}
        atomIndex={atomIndex}
        onPickRecent={onPickRecent}
      />
    </aside>
  )
}

function DefaultInspector({
  recentChanges,
  atomIndex,
  onPickRecent,
  collapsed,
  width,
  minWidth,
  maxWidth,
  onToggleCollapsed,
  onNudgeWidth,
  onResetWidth,
}: {
  recentChanges: RecentChange[]
  atomIndex: Record<string, CartographyAtom>
  onPickRecent: (graphId: string) => void
  collapsed: boolean
  width: number
  minWidth: number
  maxWidth: number
  onToggleCollapsed: () => void
  onNudgeWidth: (delta: number) => void
  onResetWidth: () => void
}) {
  return (
    <aside className={`cart-inspector${collapsed ? ' is-collapsed' : ''}`}>
      <InspectorResizeToolbar
        collapsed={collapsed}
        width={width}
        minWidth={minWidth}
        maxWidth={maxWidth}
        onToggleCollapsed={onToggleCollapsed}
        onNudgeWidth={onNudgeWidth}
        onResetWidth={onResetWidth}
      />
      {collapsed ? <CollapsedInspectorRail onToggleCollapsed={onToggleCollapsed} /> : null}
      <div className="ins-content" aria-hidden={collapsed}>
      <div className="ins-header">
        <div className="ins-source">
          <span className="ins-source-badge mixed">cartografia</span>
          <span className="ins-source-path">repo oficial + AtlasVault</span>
          <span className="ins-source-status">aguardando seleção</span>
        </div>
        <div className="ins-kind">Leitura canônica</div>
        <h2 className="ins-title">Selecione uma peça do mapa</h2>
        <p className="ins-lede">
          O painel carrega o arquivo real quando uma engrenagem, sistema ou nota fica em foco.
        </p>
      </div>
      <div className="ins-body">
        <details className="ins-md" open>
          <summary>
            <span className="ins-md-title">Conteúdo do arquivo</span>
            <span className="ins-md-meta">— nenhum arquivo selecionado</span>
          </summary>
          <div className="ins-md-body">
            <p style={{ color: 'var(--ink3)', fontStyle: 'italic' }}>
              Este painel só renderiza conteúdo depois que a Cartografia recebe uma fonte real do backend.
            </p>
          </div>
        </details>
      </div>
      </div>
      <RecentChangesDock
        collapsed={collapsed}
        changes={recentChanges}
        atomIndex={atomIndex}
        onPickRecent={onPickRecent}
      />
    </aside>
  )
}

function RecentChangesDock({
  collapsed,
  changes,
  atomIndex,
  onPickRecent,
}: {
  collapsed: boolean
  changes: RecentChange[]
  atomIndex: Record<string, CartographyAtom>
  onPickRecent: (graphId: string) => void
}) {
  if (collapsed) return null
  return (
    <div className="ins-recent-dock">
      <TimelineFloater
        changes={changes}
        atomIndex={atomIndex}
        onPick={onPickRecent}
      />
    </div>
  )
}

function InspectorResizeToolbar({
  collapsed,
  width,
  minWidth,
  maxWidth,
  onToggleCollapsed,
  onNudgeWidth,
  onResetWidth,
}: {
  collapsed: boolean
  width: number
  minWidth: number
  maxWidth: number
  onToggleCollapsed: () => void
  onNudgeWidth: (delta: number) => void
  onResetWidth: () => void
}) {
  return (
    <div className="ins-resize-toolbar" aria-label="Controles da coluna de navegação">
      <button
        type="button"
        className="ins-tool"
        onClick={onToggleCollapsed}
        title={collapsed ? 'Restaurar coluna' : 'Minimizar coluna e ampliar navegação'}
        aria-label={collapsed ? 'Restaurar coluna' : 'Minimizar coluna e ampliar navegação'}
      >
        <span className={`ins-tool-icon${collapsed ? ' restore' : ''}`} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="ins-tool"
        onClick={() => onNudgeWidth(-40)}
        disabled={collapsed || width <= minWidth}
        title="Diminuir coluna"
      >
        −
      </button>
      <button
        type="button"
        className="ins-tool"
        onClick={() => onNudgeWidth(40)}
        disabled={collapsed || width >= maxWidth}
        title="Aumentar coluna"
      >
        +
      </button>
      <button
        type="button"
        className="ins-tool text"
        onClick={onResetWidth}
        disabled={collapsed}
        title="Voltar para largura padrão"
      >
        reset
      </button>
    </div>
  )
}

function CollapsedInspectorRail({ onToggleCollapsed }: { onToggleCollapsed: () => void }) {
  return (
    <button
      type="button"
      className="collapsed-inspector-rail"
      onClick={onToggleCollapsed}
      title="Restaurar coluna da Cartografia"
    >
      <span>Abrir painel</span>
    </button>
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

function FitRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="fit-row">
      <span>{label}</span>
      <strong className={mono ? 'mono' : ''}>{value}</strong>
    </div>
  )
}

function ActionRow({
  label,
  glyph,
  onClick,
  disabled = false,
}: {
  label: string
  glyph: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className="ins-action"
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: 'none',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        padding: 0,
        font: 'inherit',
        color: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span className="a-label">{label}</span>
      <span className="a-glyph">{glyph}</span>
    </button>
  )
}
