/* eslint-disable react-hooks/refs -- Cartografia ref refactor em curso; divida lateral isolada do Atlas Forge core (project_atlas_vault_cartografia). */
import { useMemo } from 'react'
import { Trails } from '../map/Trails'
import { computeStepYs } from '../map/layout'
import { FlowLanes } from './FlowLanes'
import { FlowPipeline } from './FlowPipeline'
import { FlowStageFrame } from './FlowStageFrame'
import { computeRecentByGraphId } from './flowModel'
import type { FlowSceneProps } from './flowTypes'

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
  scale,
  editMode,
  customLayout,
}: FlowSceneProps) {
  // Defensive: nunca confiar 100% no shape do payload do Kernel.
  const pipeline = Array.isArray(graph.pipeline) ? graph.pipeline : []
  const lanes = graph.lanes && typeof graph.lanes === 'object' ? graph.lanes : {}
  const connections = Array.isArray(graph.connections) ? graph.connections : []

  const stepYs = useMemo(() => computeStepYs(pipeline), [pipeline])
  const recentByGraphId = useMemo(() => computeRecentByGraphId(recentChanges), [recentChanges])

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
      <FlowStageFrame stepYs={stepYs} />
      <FlowPipeline
        pipeline={pipeline}
        atomIndex={atomIndex}
        stepYs={stepYs}
        recentByGraphId={recentByGraphId}
        isolatedId={isolatedId}
        kinSet={kinSet}
        onHover={onHover}
        onIsolate={onIsolate}
        onFocus={onFocus}
      />
      <FlowLanes
        lanes={lanes}
        atomIndex={atomIndex}
        recentByGraphId={recentByGraphId}
        isolatedId={isolatedId}
        kinSet={kinSet}
        onHover={onHover}
        onIsolate={onIsolate}
        onFocus={onFocus}
        scale={scale}
        editMode={editMode}
        customLayout={customLayout}
      />
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
