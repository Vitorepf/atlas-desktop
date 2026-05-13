/**
 * FlowScene · Atlas AI Kernel Pipeline (the canonical view).
 *
 * Renders:
 * - "Atlas Kernel Pipeline" ribbon at the top
 * - 17 numbered pipeline atoms vertically aligned
 * - 6 lateral lanes around the pipeline (positioned per LANE_LAYOUT)
 * - SVG trails connecting them via <Trails />
 *
 * Lateral atoms inherit absolute positions from their region wrapper.
 */
import { useMemo } from 'react'
import type { CartographyAtom, CartographyGraph, RecentChange } from '@atlas/domain'
import { Atom } from '../Atom'
import { Trails } from '../Trails'
import {
  LANE_LAYOUT,
  PIPELINE_LAYOUT,
  computeStepYs,
} from '../layout'

interface FlowSceneProps {
  graph: CartographyGraph
  worldRef: React.RefObject<HTMLDivElement | null>
  recentChanges: RecentChange[]
  atomIndex: Record<string, CartographyAtom>
  isolatedId: string | null
  onHover: (graphId: string | null) => void
  onIsolate: (graphId: string) => void
  onFocus: (graphId: string) => void
}

export function FlowScene({
  graph,
  worldRef,
  recentChanges,
  atomIndex,
  isolatedId,
  onHover,
  onIsolate,
  onFocus,
}: FlowSceneProps) {
  const stepYs = useMemo(() => computeStepYs(graph.pipeline), [graph.pipeline])
  const recentByGraphId = useMemo(() => {
    const map: Record<string, RecentChange> = {}
    for (const c of recentChanges) {
      const existing = map[c.graphId]
      if (!existing || c.secondsAgo < existing.secondsAgo) map[c.graphId] = c
    }
    return map
  }, [recentChanges])

  // kin set for isolate mode — direct neighbors via connections
  const kinSet = useMemo(() => {
    const out = new Set<string>()
    if (!isolatedId) return out
    for (const c of graph.connections) {
      if (c.from === isolatedId) out.add(c.to)
      if (c.to === isolatedId) out.add(c.from)
    }
    return out
  }, [graph.connections, isolatedId])

  return (
    <>
      {/* Ribbon */}
      <div
        className="ribbon"
        style={{
          left: PIPELINE_LAYOUT.x + PIPELINE_LAYOUT.w / 2,
          top: PIPELINE_LAYOUT.y,
          transform: 'translateX(-50%)',
        }}
      >
        Atlas Kernel Pipeline
      </div>

      {/* Pipeline atoms */}
      {graph.pipeline.map((p, idx) => {
        const atom = atomIndex[p.graphId]
        if (!atom) return null
        return (
          <Atom
            key={p.graphId}
            atom={atom}
            variant="pipeline"
            recent={recentByGraphId[p.graphId] ?? null}
            isActive={isolatedId === p.graphId}
            isKin={kinSet.has(p.graphId)}
            onHover={onHover}
            onIsolate={onIsolate}
            onFocus={onFocus}
            position={{ x: PIPELINE_LAYOUT.x, y: stepYs[idx] ?? 0, w: PIPELINE_LAYOUT.w }}
          />
        )
      })}

      {/* Lateral lanes */}
      {Object.entries(graph.lanes).map(([key, lane]) => {
        const layout = LANE_LAYOUT[key]
        if (!layout) return null
        const isolatedInside =
          !!isolatedId && lane.nodes.some((n) => n.graphId === isolatedId)
        const kinInside =
          !!isolatedId && lane.nodes.some((n) => kinSet.has(n.graphId))
        return (
          <div
            key={key}
            id={`atom-${lane.graphId}`}
            className={`region${isolatedInside || kinInside ? ' kin-host' : ''}`}
            style={{
              left: layout.x,
              top: layout.y,
              width: layout.w,
              position: 'absolute',
            }}
          >
            <div className="region-head">
              {lane.head}
              {lane.deck ? <span className="deck">{lane.deck}</span> : null}
            </div>
            <div className="region-atoms">
              {lane.nodes.map((n) => {
                const atom = atomIndex[n.graphId]
                if (!atom) return null
                return (
                  <Atom
                    key={n.graphId}
                    atom={atom}
                    recent={recentByGraphId[n.graphId] ?? null}
                    isActive={isolatedId === n.graphId}
                    isKin={kinSet.has(n.graphId)}
                    onHover={onHover}
                    onIsolate={onIsolate}
                    onFocus={onFocus}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {/* SVG trails (renderiza por último para z-index) */}
      <Trails worldElement={worldRef.current} connections={graph.connections} isolatedId={isolatedId} />
    </>
  )
}
