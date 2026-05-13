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
  WORLD_HEIGHT,
  computeStepYs,
} from '../layout'

type VisualLens = 'flow' | 'relations' | 'risk' | 'recent' | 'evidence'

const FLOW_PHASES = [
  { label: 'intake', deck: 'captura', from: 1, to: 3, icon: '01' },
  { label: 'shape', deck: 'contexto', from: 4, to: 8, icon: '02' },
  { label: 'decide', deck: 'decisao', from: 9, to: 12, icon: '03' },
  { label: 'prove', deck: 'evidencia', from: 13, to: 15, icon: '04' },
  { label: 'render', deck: 'saida', from: 16, to: 17, icon: '05' },
]

const LANE_TONE: Record<string, string> = {
  'domain-plane': 'territory-domain',
  capabilities: 'territory-capability',
  'business-context-side': 'territory-business',
  hks: 'territory-human',
  'evidence-loop': 'territory-evidence',
  'doc-os': 'territory-docs',
}

interface FlowSceneProps {
  graph: CartographyGraph
  worldRef: React.RefObject<HTMLDivElement | null>
  recentChanges: RecentChange[]
  atomIndex: Record<string, CartographyAtom>
  isolatedId: string | null
  highlightedId: string | null
  visualLens: VisualLens
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
  highlightedId,
  visualLens,
  onHover,
  onIsolate,
  onFocus,
}: FlowSceneProps) {
  // Defensive: nunca confiar 100% no shape do payload do Kernel.
  const pipeline = Array.isArray(graph.pipeline) ? graph.pipeline : []
  const lanes = graph.lanes && typeof graph.lanes === 'object' ? graph.lanes : {}
  const connections = Array.isArray(graph.connections) ? graph.connections : []

  const stepYs = useMemo(() => computeStepYs(pipeline), [pipeline])
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
    for (const c of connections) {
      if (c.from === isolatedId) out.add(c.to)
      if (c.to === isolatedId) out.add(c.from)
    }
    return out
  }, [connections, isolatedId])

  return (
    <>
      <div className="flow-stage-frame" aria-hidden="true">
        <div
          className="flow-corridor corridor-intake"
          style={{
            left: 360,
            top: PIPELINE_LAYOUT.y + 70,
            width: PIPELINE_LAYOUT.x - 390,
            height: WORLD_HEIGHT - 190,
          }}
        />
        <div
          className="flow-corridor corridor-kernel"
          style={{
            left: PIPELINE_LAYOUT.x - 34,
            top: PIPELINE_LAYOUT.y + 34,
            width: PIPELINE_LAYOUT.w + 68,
            height: WORLD_HEIGHT - 128,
          }}
        />
        <div
          className="flow-corridor corridor-evidence"
          style={{
            left: PIPELINE_LAYOUT.x + PIPELINE_LAYOUT.w + 110,
            top: PIPELINE_LAYOUT.y + 86,
            width: LANE_LAYOUT['evidence-loop'].x - (PIPELINE_LAYOUT.x + PIPELINE_LAYOUT.w + 128),
            height: WORLD_HEIGHT - 210,
          }}
        />
        <div
          className="flow-machine-spine"
          style={{
            left: PIPELINE_LAYOUT.x - 28,
            top: PIPELINE_LAYOUT.y + 50,
            height: PIPELINE_LAYOUT.runtimeHeight + PIPELINE_LAYOUT.stepHeight * 15,
          }}
        />
        {FLOW_PHASES.map((phase) => (
          <div
            key={phase.label}
            className={`flow-phase phase-${phase.label}`}
            style={{
              left: PIPELINE_LAYOUT.x - 92,
              top: (stepYs[phase.from - 1] ?? PIPELINE_LAYOUT.y) - 6,
              height:
                ((stepYs[phase.to - 1] ?? PIPELINE_LAYOUT.y) -
                  (stepYs[phase.from - 1] ?? PIPELINE_LAYOUT.y)) +
                PIPELINE_LAYOUT.stepHeight -
                10,
            }}
          >
            <span className="phase-icon">{phase.icon}</span>
            <span className="phase-label">{phase.label}</span>
            <span className="phase-deck">{phase.deck}</span>
          </div>
        ))}
      </div>

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
      {pipeline.map((p, idx) => {
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
      {Object.entries(lanes).map(([key, lane]) => {
        if (!lane) return null
        const layout = LANE_LAYOUT[key]
        if (!layout) return null
        const nodes = Array.isArray(lane.nodes) ? lane.nodes : []
        const regionAtoms = nodes
          .map((n) => atomIndex[n.graphId])
          .filter((atom): atom is CartographyAtom => !!atom)
        const regionSignals = computeRegionSignals(regionAtoms, recentByGraphId)
        const isolatedInside =
          !!isolatedId && nodes.some((n) => n.graphId === isolatedId)
        const kinInside =
          !!isolatedId && nodes.some((n) => kinSet.has(n.graphId))
        return (
          <div
            key={key}
            id={`atom-${lane.graphId}`}
            className={[
              'region',
              LANE_TONE[key] ?? '',
              regionSignals.risk > 0 ? 'has-risk' : '',
              regionSignals.recent > 0 ? 'has-recent' : '',
              regionSignals.evidence > 0 ? 'has-evidence' : '',
              regionSignals.relations > 0 ? 'has-relations' : '',
              isolatedInside || kinInside ? 'kin-host' : '',
            ]
              .filter(Boolean)
              .join(' ')}
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
            <div className="region-signals" aria-hidden="true">
              <span className={`signal-dot signal-relations${regionSignals.relations > 0 ? ' on' : ''}`} />
              <span className={`signal-dot signal-risk${regionSignals.risk > 0 ? ' on' : ''}`} />
              <span className={`signal-dot signal-recent${regionSignals.recent > 0 ? ' on' : ''}`} />
              <span className={`signal-dot signal-evidence${regionSignals.evidence > 0 ? ' on' : ''}`} />
            </div>
            <div className="region-atoms">
              {nodes.map((n) => {
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
      <Trails
        worldElement={worldRef.current}
        connections={connections}
        isolatedId={isolatedId}
        highlightedId={highlightedId}
        visualLens={visualLens}
      />
    </>
  )
}

function computeRegionSignals(
  atoms: CartographyAtom[],
  recentByGraphId: Record<string, RecentChange>
) {
  return atoms.reduce(
    (acc, atom) => {
      if (atom.risk) acc.risk += 1
      if (recentByGraphId[atom.graphId]) acc.recent += 1
      if (atom.evidence || atom.next) acc.evidence += 1
      if (
        atom.graphParent ||
        (atom.depends?.length ?? 0) > 0 ||
        (atom.unblocks?.length ?? 0) > 0 ||
        (atom.flowsTo?.length ?? 0) > 0 ||
        (atom.governs?.length ?? 0) > 0
      ) {
        acc.relations += 1
      }
      return acc
    },
    { relations: 0, risk: 0, recent: 0, evidence: 0 }
  )
}
