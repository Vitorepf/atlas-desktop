/**
 * Atom · clickable canvas piece that represents a graph node.
 *
 * Two visual variants:
 * - Default: lateral / region atom (compact card)
 * - `variant='pipeline'`: numbered Atlas Kernel Pipeline step (roman numeral
 *   in the gutter + larger title + optional subcomponents grid)
 *
 * Click model mirrors the canonical Cartografia:
 *   single click → onIsolate (peça isolada, resto some)
 *   double click → onFocus   (cena de Foco / engrenagem)
 */
import type { CartographyAtom, RecentChange } from '@atlas/domain'
import { formatTimeAgo } from './layout'
import { atomClassName, hasRelations } from './atomModel'
import { atomPositionStyle, type AtomPosition } from './atomStyle'
import { DefaultAtomContent, PipelineAtomContent } from './AtomVariants'
import { useAtomActivation } from './useAtomActivation'

interface AtomProps {
  atom: CartographyAtom
  variant?: 'default' | 'pipeline'
  recent?: RecentChange | null
  isActive?: boolean
  isKin?: boolean
  onHover?: (graphId: string | null) => void
  onIsolate?: (graphId: string) => void
  onFocus?: (graphId: string) => void
  /** absolute positioning (world canvas coords). When omitted, atom flows naturally inside a region. */
  position?: AtomPosition
  /** id mirror: rendered as DOM id `atom-{graph_id}` so SVG trails can resolve ↔ rect via getElementById. */
}

export function Atom({
  atom,
  variant = 'default',
  recent,
  isActive,
  isKin,
  onHover,
  onIsolate,
  onFocus,
  position,
}: AtomProps) {
  const isPipeline = variant === 'pipeline'
  const className = atomClassName({ atom, isPipeline, isActive, isKin, recent })
  const handleClick = useAtomActivation({ graphId: atom.graphId, onIsolate, onFocus })

  return (
    <div
      id={`atom-${atom.graphId}`}
      className={className}
      style={atomPositionStyle(position)}
      onMouseEnter={() => onHover?.(atom.graphId)}
      onMouseLeave={() => onHover?.(null)}
      onClick={handleClick}
    >
      {hasRelations(atom) ? <span className="a-relation-port" aria-hidden="true" /> : null}

      {recent && recent.secondsAgo < 60 ? (
        <span className="a-live-badge">atualizado {formatTimeAgo(recent.secondsAgo)}</span>
      ) : null}

      {isPipeline ? <PipelineAtomContent atom={atom} /> : <DefaultAtomContent atom={atom} />}
    </div>
  )
}
