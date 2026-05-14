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

export interface WorldSceneSwitchProps {
  graph: CartographyGraph | null
  view: CartographyView
  worldRef: RefObject<HTMLDivElement | null>
  visualLens: VisualLens
  atomIndex: Record<string, CartographyAtom>
  recentChanges: RecentChange[]
  continent: Continent | null
  systemParentId: string | null
  focusedAtom: CartographyAtom | null
  isolatedId: string | null
  hoverId: string | null
  onSetView: (view: CartographyView) => void
  onSelectContinent: (graphId: string) => void
  onEnterNode: (graphId: string) => void
  onEnterGear: (graphId: string) => void
  onExitGear: () => void
  onEnterSubflow: () => void
  onSetHover: (graphId: string | null) => void
  onEnterIsolate: (graphId: string) => void
  onExitIsolate: () => void
  scale: number
  editMode: ReturnType<typeof useEditMode>
  customLayout: ReturnType<typeof useCustomLayout>
}

export interface RenderUniverseProps {
  graph: CartographyGraph
  onSelectContinent: (graphId: string) => void
}

export interface RenderSystemProps {
  graph: CartographyGraph
  continent: Continent | null
  systemParentId: string | null
  onSetView: (view: CartographyView) => void
  onEnterNode: (graphId: string) => void
}

export interface RenderFlowProps {
  graph: CartographyGraph
  worldRef: RefObject<HTMLDivElement | null>
  recentChanges: RecentChange[]
  atomIndex: Record<string, CartographyAtom>
  isolatedId: string | null
  hoverId: string | null
  visualLens: VisualLens
  onSetHover: (graphId: string | null) => void
  onEnterIsolate: (graphId: string) => void
  onExitIsolate: () => void
  onEnterGear: (graphId: string) => void
  scale: number
  editMode: ReturnType<typeof useEditMode>
  customLayout: ReturnType<typeof useCustomLayout>
}

export interface RenderGearProps {
  atom: CartographyAtom
  atomIndex: Record<string, CartographyAtom>
  onEnterGear: (graphId: string) => void
  onExitGear: () => void
  onEnterSubflow: () => void
}

export interface RenderSubflowProps {
  atom: CartographyAtom
  onSetView: (view: CartographyView) => void
}
