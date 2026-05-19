import type { CartographyAtom, PipelineStep, RecentChange } from '@atlas/domain'
import { Atom } from '../map/Atom'
import { PIPELINE_LAYOUT } from '../map/layout'

interface FlowPipelineProps {
  pipeline: PipelineStep[]
  atomIndex: Record<string, CartographyAtom>
  stepYs: number[]
  recentByGraphId: Record<string, RecentChange>
  isolatedId: string | null
  kinSet: Set<string>
  onHover: (graphId: string | null) => void
  onIsolate: (graphId: string) => void
  onFocus: (graphId: string) => void
}

export function FlowPipeline({
  pipeline,
  atomIndex,
  stepYs,
  recentByGraphId,
  isolatedId,
  kinSet,
  onHover,
  onIsolate,
  onFocus,
}: FlowPipelineProps) {
  return (
    <>
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

      {pipeline.map((pipelineNode, idx) => {
        const atom = atomIndex[pipelineNode.graphId]
        if (!atom) return null
        return (
          <Atom
            key={pipelineNode.graphId}
            atom={atom}
            variant="pipeline"
            recent={recentByGraphId[pipelineNode.graphId] ?? null}
            isActive={isolatedId === pipelineNode.graphId}
            isKin={kinSet.has(pipelineNode.graphId)}
            onHover={onHover}
            onIsolate={onIsolate}
            onFocus={onFocus}
            position={{ x: PIPELINE_LAYOUT.x, y: stepYs[idx] ?? 0, w: PIPELINE_LAYOUT.w }}
          />
        )
      })}
    </>
  )
}
