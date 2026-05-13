/**
 * Atom · clickable canvas piece that represents a graph node.
 *
 * Two visual variants:
 * - Default: lateral / region atom (compact card)
 * - `variant='pipeline'`: numbered Atlas Kernel Pipeline step (roman numeral
 *   in the gutter + larger title + optional subcomponents grid)
 *
 * Click model mirrors the canonical cartography:
 *   single click → onIsolate (peça isolada, resto some)
 *   double click → onFocus   (cena de Foco / engrenagem)
 */
import { useRef } from 'react'
import type { CartographyAtom, RecentChange } from '@atlas/domain'
import { formatTimeAgo, toRoman } from './layout'

const DOUBLE_CLICK_MS = 320

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
  position?: { x: number; y: number; w: number }
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
  const lastClickRef = useRef<{ ts: number; timer: number | null }>({ ts: 0, timer: null })

  const isPipeline = variant === 'pipeline'
  const className = [
    'atom',
    isPipeline ? 'atom-pipe' : '',
    atom.missingSource ? 'missing-source' : '',
    atom.risk ? 'has-risk' : '',
    atom.next ? 'has-next' : '',
    hasRelations(atom) ? 'has-relations' : '',
    atom.evidence ? 'has-evidence' : '',
    isOperationalOrphan(atom) ? 'is-orphan' : '',
    isActive ? 'active' : '',
    isKin ? 'kin' : '',
    recent ? 'recently-touched' : '',
    recent && recent.secondsAgo < 60 ? 'just-edited' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const style: React.CSSProperties = position
    ? {
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: position.w,
      }
    : {}

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    const now = Date.now()
    const last = lastClickRef.current
    if (now - last.ts < DOUBLE_CLICK_MS) {
      if (last.timer != null) {
        window.clearTimeout(last.timer)
        last.timer = null
      }
      last.ts = 0
      onFocus?.(atom.graphId)
      return
    }
    last.ts = now
    if (last.timer != null) window.clearTimeout(last.timer)
    last.timer = window.setTimeout(() => {
      last.timer = null
      onIsolate?.(atom.graphId)
    }, DOUBLE_CLICK_MS)
  }

  return (
    <div
      id={`atom-${atom.graphId}`}
      className={className}
      style={style}
      onMouseEnter={() => onHover?.(atom.graphId)}
      onMouseLeave={() => onHover?.(null)}
      onClick={handleClick}
    >
      {hasRelations(atom) ? <span className="a-relation-port" aria-hidden="true" /> : null}

      {recent && recent.secondsAgo < 60 ? (
        <span className="a-live-badge">atualizado {formatTimeAgo(recent.secondsAgo)}</span>
      ) : null}

      {isPipeline ? (
        <>
          <span className="a-num">{toRoman(atom.graphOrder ?? 0)}.</span>
          <span className="a-symbol" aria-hidden="true">{pipelineSymbol(atom.graphOrder ?? 0)}</span>
          <div className="a-body">
            <span className="a-name">{atom.name}</span>
            {atom.deck ? <span className="a-deck">{atom.deck}</span> : null}
            <SourceLine atom={atom} />
            {atom.subs && atom.subs.length > 0 ? (
              <div className="a-subs">
                {atom.subs.map(([name, meta]) => (
                  <div className="a-sub" key={name}>
                    <span className="s-name">{name}</span>
                    <span className="s-meta">{meta}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <span className="a-name">{atom.name}</span>
          {atom.deck ? <span className="a-deck">{atom.deck}</span> : null}
          <SourceLine atom={atom} />
        </>
      )}
    </div>
  )
}

function pipelineSymbol(order: number): string {
  if (order <= 3) return 'in'
  if (order <= 8) return 'ctx'
  if (order <= 12) return 'run'
  if (order <= 15) return 'ok'
  return 'out'
}

function SourceLine({ atom }: { atom: CartographyAtom }) {
  return (
    <span className="a-source">
      <span className={`a-source-badge ${atom.graphSource}`}>{atom.graphSource}</span>
      <span className="a-source-path">{atom.sourcePath || '—'}</span>
    </span>
  )
}

function isOperationalOrphan(atom: CartographyAtom): boolean {
  if (atom.kind === 'continent' || atom.kind === 'lane') return false
  const depends = atom.depends ?? []
  const unblocks = atom.unblocks ?? []
  const flowsTo = atom.flowsTo ?? []
  return depends.length === 0 && unblocks.length === 0 && flowsTo.length === 0
}

function hasRelations(atom: CartographyAtom): boolean {
  return [
    atom.graphParent,
    ...(atom.depends ?? []),
    ...(atom.unblocks ?? []),
    ...(atom.flowsTo ?? []),
    ...(atom.governs ?? []),
  ].some(Boolean)
}
