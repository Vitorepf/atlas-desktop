import type { WorldSceneSwitchProps } from './worldSceneTypes'
import {
  RenderFlow,
  RenderGear,
  RenderSubflow,
  RenderSystem,
  RenderUniverse,
} from './WorldSceneRenderers'

export function WorldSceneSwitch({
  graph,
  view,
  worldRef,
  visualLens,
  atomIndex,
  recentChanges,
  continent,
  systemParentId,
  focusedAtom,
  isolatedId,
  hoverId,
  onSetView,
  onSelectContinent,
  onEnterNode,
  onEnterGear,
  onExitGear,
  onEnterSubflow,
  onSetHover,
  onEnterIsolate,
  onExitIsolate,
  scale,
  editMode,
  customLayout,
}: WorldSceneSwitchProps) {
  if (!graph) return null

  if (view === 'universe') return <RenderUniverse graph={graph} onSelectContinent={onSelectContinent} />

  if (view === 'system') {
    return (
      <RenderSystem
        graph={graph}
        continent={continent}
        systemParentId={systemParentId}
        onSetView={onSetView}
        onEnterNode={onEnterNode}
      />
    )
  }

  if (view === 'flow') {
    return (
      <RenderFlow
        graph={graph}
        worldRef={worldRef}
        recentChanges={recentChanges}
        atomIndex={atomIndex}
        isolatedId={isolatedId}
        hoverId={hoverId}
        visualLens={visualLens}
        onSetHover={onSetHover}
        onEnterIsolate={onEnterIsolate}
        onExitIsolate={onExitIsolate}
        onEnterGear={onEnterGear}
        scale={scale}
        editMode={editMode}
        customLayout={customLayout}
      />
    )
  }

  if (view === 'gear' && focusedAtom) {
    return (
      <RenderGear
        atom={focusedAtom}
        atomIndex={atomIndex}
        onEnterGear={onEnterGear}
        onExitGear={onExitGear}
        onEnterSubflow={onEnterSubflow}
      />
    )
  }

  if (view === 'subflow' && focusedAtom) {
    return <RenderSubflow atom={focusedAtom} onSetView={onSetView} />
  }

  return null
}
