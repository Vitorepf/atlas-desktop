/**
 * Trails · SVG renderer das conexoes entre atoms.
 *
 * A geometria/medicao vive em `trailGeometry` + `useTrailPaths`; este arquivo
 * so transforma ResolvedPath em SVG. Assim o desenho pode evoluir sem misturar
 * DOM measurement, roteamento e markup.
 */
import { useRef } from 'react'
import type { Connection } from '@atlas/domain'
import type { VisualLens } from '../state/visualLens'
import { WORLD_HEIGHT, WORLD_WIDTH } from './layout'
import { TrailBeacon, TrailMarker, TrailNodes, TrailVessel } from './TrailPrimitives'
import { trailLabelFor } from './trailLabels'
import { useTrailPaths } from './useTrailPaths'

interface TrailsProps {
  worldElement: HTMLDivElement | null
  connections: Connection[]
  isolatedId: string | null
  highlightedId: string | null
  visualLens: VisualLens
}

export function Trails({
  worldElement,
  connections,
  isolatedId,
  highlightedId,
  visualLens,
}: TrailsProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const paths = useTrailPaths({
    worldElement,
    connections,
    isolatedId,
    highlightedId,
    visualLens,
  })

  return (
    <svg
      ref={svgRef}
      className="world-svg"
      viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
      preserveAspectRatio="none"
    >
      <defs>
        <TrailMarker id="trail-tip" />
        <TrailMarker id="trail-tip-return" />
      </defs>
      {paths.map((path) => (
        <g
          key={path.key}
          className={[
            'trail-group',
            `trail-${path.kind}`,
            `trail-side-${path.side}`,
            `trail-lane-${Math.min(path.order, 3)}`,
            `trail-span-${path.span}`,
            path.kind === 'feedback' ? 'dashed' : '',
            path.visible ? 'path-visible' : 'path-hidden',
            path.active ? 'path-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <path id={path.pathId} className="trail-motion-path" d={path.d} />
          <path className="trail-halo" d={path.d} />
          <path className="trail-current" d={path.d} pathLength={100} />
          <path
            className="trail trail-core"
            d={path.d}
            markerEnd={path.kind === 'feedback' ? 'url(#trail-tip-return)' : 'url(#trail-tip)'}
          />
          <path className="trail-pulse" d={path.d} />
          {path.kind !== 'sequence' ? <TrailNodes path={path} /> : null}
          {path.beacons.map((offset, index) => (
            <TrailBeacon key={`${path.key}-beacon-${index}`} pathId={path.pathId} offset={offset} index={index} />
          ))}
          {Array.from({ length: path.packets }).map((_, index) => (
            <TrailVessel key={`${path.key}-packet-${index}`} path={path} index={index} />
          ))}
          <TrailLabel path={path} />
        </g>
      ))}
    </svg>
  )
}

/**
 * Mono caps tag rendered at the midpoint of an active trail. Hidden by
 * default (visible only when `.path-active` flips on via CSS). Background
 * is cream with a 0.8px bronze border — canon stack of the cartography.
 */
function TrailLabel({ path }: { path: { kind: string; fromId: string; toId: string; start: { x: number; y: number }; end: { x: number; y: number }; gate: { x: number; y: number } } }) {
  const label = trailLabelFor(path.fromId, path.toId, path.kind)
  if (!label) return null

  // For curved paths use the gate point (which already approximates the
  // visual midpoint); for straight sequence paths use the geometric mean.
  const mid = path.kind === 'sequence'
    ? { x: (path.start.x + path.end.x) / 2, y: (path.start.y + path.end.y) / 2 }
    : path.gate

  // Width grows with character count · 6px per char + 16px padding.
  const labelWidth = Math.max(54, label.length * 6.4 + 18)
  const labelHeight = 16

  return (
    <g className="trail-label-group" transform={`translate(${mid.x} ${mid.y})`}>
      <rect
        className="trail-label-bg"
        x={-labelWidth / 2}
        y={-labelHeight / 2}
        width={labelWidth}
        height={labelHeight}
        rx={2}
        ry={2}
      />
      <text
        className="trail-label-text"
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {label}
      </text>
    </g>
  )
}
