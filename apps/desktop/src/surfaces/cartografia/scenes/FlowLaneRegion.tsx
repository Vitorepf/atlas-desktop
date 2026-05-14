import type { CartographyAtom, RecentChange } from '@atlas/domain'
import { Atom } from '../map/Atom'
import type { FlowLaneViewModel } from './flowLaneModel'
import { LANE_EYEBROW } from './flowLaneModel'

interface FlowLaneRegionProps {
  model: FlowLaneViewModel
  atomIndex: Record<string, CartographyAtom>
  recentByGraphId: Record<string, RecentChange>
  isolatedId: string | null
  kinSet: Set<string>
  onHover: (graphId: string | null) => void
  onIsolate: (graphId: string) => void
  onFocus: (graphId: string) => void
}

export function FlowLaneRegion({
  model,
  atomIndex,
  recentByGraphId,
  isolatedId,
  kinSet,
  onHover,
  onIsolate,
  onFocus,
}: FlowLaneRegionProps) {
  return (
    <div
      id={`atom-${model.lane.graphId}`}
      className={model.className}
      style={{
        left: model.layout.x,
        top: model.layout.y,
        width: model.layout.w,
        position: 'absolute',
      }}
    >
      <div className="region-head">
        <span className="eyebrow">
          {LANE_EYEBROW[model.key] ?? 'plano lateral'}
        </span>
        <span
          className="count"
          aria-label={`${model.nodes.length} peças`}
        >
          {String(model.nodes.length).padStart(2, '0')}
        </span>
        <span className="title">{model.lane.head}</span>
        {model.lane.deck ? (
          <span className="deck">{model.lane.deck}</span>
        ) : null}
      </div>
      <RegionSignals
        relations={model.regionSignals.relations}
        risk={model.regionSignals.risk}
        recent={model.regionSignals.recent}
        evidence={model.regionSignals.evidence}
      />
      <div className="region-atoms">
        {model.nodes.map((node) => {
          const atom = atomIndex[node.graphId]
          if (!atom) return null
          return (
            <Atom
              key={node.graphId}
              atom={atom}
              recent={recentByGraphId[node.graphId] ?? null}
              isActive={isolatedId === node.graphId}
              isKin={kinSet.has(node.graphId)}
              onHover={onHover}
              onIsolate={onIsolate}
              onFocus={onFocus}
            />
          )
        })}
      </div>
    </div>
  )
}

function RegionSignals({
  relations,
  risk,
  recent,
  evidence,
}: {
  relations: number
  risk: number
  recent: number
  evidence: number
}) {
  return (
    <div className="region-signals" aria-hidden="true">
      <span className={`signal-dot signal-relations${relations > 0 ? ' on' : ''}`} />
      <span className={`signal-dot signal-risk${risk > 0 ? ' on' : ''}`} />
      <span className={`signal-dot signal-recent${recent > 0 ? ' on' : ''}`} />
      <span className={`signal-dot signal-evidence${evidence > 0 ? ' on' : ''}`} />
    </div>
  )
}
