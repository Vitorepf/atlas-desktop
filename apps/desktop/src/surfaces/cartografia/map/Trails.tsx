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
        </g>
      ))}
    </svg>
  )
}
