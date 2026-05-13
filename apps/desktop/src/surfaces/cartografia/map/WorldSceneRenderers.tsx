import { FlowScene } from '../scenes/FlowScene'
import { GearScene } from '../scenes/GearScene'
import { SubflowScene } from '../scenes/SubflowScene'
import { SystemScene } from '../scenes/SystemScene'
import { UniverseScene } from '../scenes/UniverseScene'
import { EVIDENCE_LEDGER_GRAPH_ID, nextIsolatedId, systemSceneParentId } from './worldSceneModel'
import type {
  RenderFlowProps,
  RenderGearProps,
  RenderSubflowProps,
  RenderSystemProps,
  RenderUniverseProps,
} from './worldSceneTypes'

export function RenderUniverse({
  graph,
  onSelectContinent,
}: RenderUniverseProps) {
  return <UniverseScene universe={graph.universe} onSelect={onSelectContinent} />
}

export function RenderSystem({
  graph,
  continent,
  systemParentId,
  onSetView,
  onEnterNode,
}: RenderSystemProps) {
  return (
    <SystemScene
      continent={continent}
      parentId={systemSceneParentId(systemParentId, continent)}
      semanticGraph={graph.semanticGraph}
      onEnterFlow={() => onSetView('flow')}
      onEnterNode={onEnterNode}
    />
  )
}

export function RenderFlow({
  graph,
  worldRef,
  recentChanges,
  atomIndex,
  isolatedId,
  hoverId,
  visualLens,
  onSetHover,
  onEnterIsolate,
  onExitIsolate,
  onEnterGear,
}: RenderFlowProps) {
  return (
    <FlowScene
      graph={graph}
      worldRef={worldRef}
      recentChanges={recentChanges}
      atomIndex={atomIndex}
      isolatedId={isolatedId}
      highlightedId={hoverId}
      visualLens={visualLens}
      onHover={onSetHover}
      onIsolate={(graphId) => {
        const next = nextIsolatedId(isolatedId, graphId)
        if (next) onEnterIsolate(next)
        else onExitIsolate()
      }}
      onFocus={onEnterGear}
    />
  )
}

export function RenderGear({
  atom,
  atomIndex,
  onEnterGear,
  onExitGear,
  onEnterSubflow,
}: RenderGearProps) {
  return (
    <GearScene
      atom={atom}
      atomIndex={atomIndex}
      onSatellite={onEnterGear}
      onBack={onExitGear}
      onSubflow={onEnterSubflow}
      onLoop={() => onEnterGear(EVIDENCE_LEDGER_GRAPH_ID)}
    />
  )
}

export function RenderSubflow({
  atom,
  onSetView,
}: RenderSubflowProps) {
  return <SubflowScene atom={atom} onBackToGear={() => onSetView('gear')} />
}
