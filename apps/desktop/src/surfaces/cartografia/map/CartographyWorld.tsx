import type { RefObject } from 'react'
import type {
  CartographyAtom,
  CartographyGraph,
  CartographyView,
  Continent,
  RecentChange,
} from '@atlas/domain'
import type { VisualLens } from '../state/visualLens'
import type { useCustomLayout } from '../state/useCustomLayout'
import type { useEditMode } from '../state/useEditMode'
import { WorldSceneSwitch } from './WorldSceneSwitch'
import { worldClassName, worldStyle } from './worldModel'

interface CartographyWorldProps {
  graph: CartographyGraph | null
  view: CartographyView
  worldRef: RefObject<HTMLDivElement | null>
  transform: { x: number; y: number; scale: number }
  animating: boolean
  visualLens: VisualLens
  atomIndex: Record<string, CartographyAtom>
  recentChanges: RecentChange[]
  continent: Continent | null
  systemParentId: string | null
  focusedAtom: CartographyAtom | null
  hoveredAtom: CartographyAtom | null
  isolatedId: string | null
  hoverId: string | null
  readingMode?: boolean
  density?: 'comfortable' | 'compact'
  onSetView: (view: CartographyView) => void
  onSelectContinent: (graphId: string) => void
  onEnterNode: (graphId: string) => void
  onEnterGear: (graphId: string) => void
  onExitGear: () => void
  onEnterSubflow: () => void
  onSetHover: (graphId: string | null) => void
  onEnterIsolate: (graphId: string) => void
  onExitIsolate: () => void
  editMode: ReturnType<typeof useEditMode>
  customLayout: ReturnType<typeof useCustomLayout>
}

export function CartographyWorld({
  graph,
  view,
  worldRef,
  transform,
  animating,
  visualLens,
  atomIndex,
  recentChanges,
  continent,
  systemParentId,
  focusedAtom,
  hoveredAtom,
  isolatedId,
  hoverId,
  readingMode,
  density,
  onSetView,
  onSelectContinent,
  onEnterNode,
  onEnterGear,
  onExitGear,
  onEnterSubflow,
  onSetHover,
  onEnterIsolate,
  onExitIsolate,
  editMode,
  customLayout,
}: CartographyWorldProps) {
  return (
    <div
      ref={worldRef}
      className={worldClassName({ visualLens, animating, isolatedId, hoveredAtom, scale: transform.scale, readingMode, density })}
      style={worldStyle({ transform })}
    >
      <WorldSceneSwitch
        graph={graph}
        view={view}
        worldRef={worldRef}
        visualLens={visualLens}
        atomIndex={atomIndex}
        recentChanges={recentChanges}
        continent={continent}
        systemParentId={systemParentId}
        focusedAtom={focusedAtom}
        isolatedId={isolatedId}
        hoverId={hoverId}
        onSetView={onSetView}
        onSelectContinent={onSelectContinent}
        onEnterNode={onEnterNode}
        onEnterGear={onEnterGear}
        onExitGear={onExitGear}
        onEnterSubflow={onEnterSubflow}
        onSetHover={onSetHover}
        onEnterIsolate={onEnterIsolate}
        onExitIsolate={onExitIsolate}
        scale={transform.scale}
        editMode={editMode}
        customLayout={customLayout}
      />
    </div>
  )
}
