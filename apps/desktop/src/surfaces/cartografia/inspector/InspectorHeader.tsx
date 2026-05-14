import type { CartographyAtom, RecentChange } from '@atlas/domain'
import { formatTimeAgo } from '../map/layout'

interface InspectorHeaderProps {
  atom: CartographyAtom
  recent: RecentChange | null
}

export function InspectorHeader({ atom, recent }: InspectorHeaderProps) {
  const isPipeline = atom.kind === 'pipeline'
  const isLateral = atom.kind === 'lateral'
  const kind = isPipeline
    ? `Engrenagem · ${atom.graphOrder ?? 0}. Atlas AI Kernel`
    : isLateral
      ? `Lateral · ${atom.regionHead ?? ''}`
      : `Lane · ${atom.name}`
  const editedBadge =
    recent && recent.secondsAgo < 60 ? `atualizado ${formatTimeAgo(recent.secondsAgo)}` : 'sincronizado'

  return (
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
  )
}
