import type { CartographyAtom, CartographyNote, CartographySources } from '@atlas/domain'
import { bridge } from '../../../lib/bridge'
import {
  copyCartographyPath,
  openCartographyDocument,
  revealCartographyDocument,
} from '../source/sourceActions'
import { ActionRow, FitRow } from './InspectorRows'

export function InspectorFitSection({ atom }: { atom: CartographyAtom }) {
  return (
    <div className="ins-section ins-fit">
      <h3>Onde Isso Encaixa</h3>
      <div className="fit-grid">
        <FitRow label="Mundo" value={atom.graphSource === 'vault' ? 'AtlasVault' : 'Repo oficial'} />
        <FitRow label="Camada" value={atom.graphLayer ?? atom.kind} />
        <FitRow label="Pai" value={atom.graphParent ?? atom.regionHead ?? '—'} />
        <FitRow label="Arquivo" value={atom.sourcePath || '—'} mono />
      </div>
    </div>
  )
}

export function InspectorActions({
  atom,
  note,
  sourceRoots,
}: {
  atom: CartographyAtom
  note: CartographyNote | null
  sourceRoots: CartographySources | null
}) {
  return (
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
  )
}

export function InspectorTags({ tags }: { tags: string[] }) {
  return (
    <div className="ins-section">
      <h3>Tags</h3>
      <div className="ins-tags">
        {tags.map((tag) => (
          <span key={tag} className="ins-tag">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
