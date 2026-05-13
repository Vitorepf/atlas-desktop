import type { CartographyAtom, CartographyNote, RecentChange } from '@atlas/domain'
import { formatTimeAgo } from '../map/layout'
import { parseMarkdown } from './markdown'

interface InspectorFileContentProps {
  atom: CartographyAtom
  note: CartographyNote | null
  recent: RecentChange | null
}

export function InspectorFileContent({ atom, note, recent }: InspectorFileContentProps) {
  const hasNote = !!note?.body
  const fresh = recent && recent.secondsAgo < 60

  return (
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
            Fonte ausente · esta peça é canônica mas o arquivo correspondente ainda não existe em{' '}
            <code>{atom.sourcePath}</code>.
          </p>
        ) : (
          <p style={{ color: 'var(--ink3)', fontStyle: 'italic' }}>
            Carregando conteúdo de <code>{atom.sourcePath}</code>…
          </p>
        )}
      </div>
    </details>
  )
}
