import { gateShape } from './trailShapes'
import type { ResolvedPath } from './trailTypes'

export function TrailMarker({ id }: { id: string }) {
  return (
    <marker id={id} viewBox="0 0 8 8" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 Z" fill="currentColor" />
    </marker>
  )
}

export function TrailNodes({ path }: { path: ResolvedPath }) {
  return (
    <>
      <circle className="trail-node-ripple trail-node-ripple-source" cx={path.start.x} cy={path.start.y} r="7" />
      <circle className="trail-node trail-node-source" cx={path.start.x} cy={path.start.y} r="4" />
      {path.active ? (
        <g className="trail-gate" transform={`translate(${path.gate.x} ${path.gate.y})`}>
          <path className="trail-gate-shape" d={gateShape(path.span)} />
          <circle className="trail-gate-core" r="2.2" />
        </g>
      ) : null}
      <circle className="trail-node-ripple trail-node-ripple-target" cx={path.end.x} cy={path.end.y} r="9" />
      <circle className="trail-node trail-node-target" cx={path.end.x} cy={path.end.y} r="5" />
    </>
  )
}

export function TrailBeacon({
  pathId,
  offset,
  index,
}: {
  pathId: string
  offset: number
  index: number
}) {
  return (
    <g className={['trail-beacon', index === 0 ? 'primary' : 'secondary'].join(' ')}>
      <path className="trail-beacon-shape" d="M -5 -4 L 5 0 L -5 4 L -2 0 Z" />
      <animateMotion dur="1s" begin="0s" fill="freeze" keyPoints={`${offset};${offset}`} keyTimes="0;1" repeatCount="1" rotate="auto">
        <mpath href={`#${pathId}`} />
      </animateMotion>
    </g>
  )
}

export function TrailVessel({ path, index }: { path: ResolvedPath; index: number }) {
  return (
    <g className={['trail-vessel', index === 0 ? 'primary' : 'secondary'].join(' ')}>
      <path className="trail-vessel-wake" d={path.kind === 'sequence' ? 'M -8 0 H -2' : 'M -13 0 H -4'} />
      <path
        className="trail-vessel-shape"
        d={path.kind === 'sequence' ? 'M -3 -2.5 L 4 0 L -3 2.5 Z' : 'M -6 -4 L 6 0 L -6 4 L -3 0 Z'}
      />
      <animateMotion
        dur={`${path.duration}s`}
        begin={`${path.delay + (index * path.duration) / path.packets}s`}
        repeatCount="indefinite"
        rotate="auto"
      >
        <mpath href={`#${path.pathId}`} />
      </animateMotion>
    </g>
  )
}
