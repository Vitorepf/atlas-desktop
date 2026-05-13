import type { RefObject } from 'react'
import type { CartographyAtom, CartographyGraph, RecentChange } from '@atlas/domain'
import type { VisualLens } from '../state/visualLens'

export interface FlowSceneProps {
  graph: CartographyGraph
  worldRef: RefObject<HTMLDivElement | null>
  recentChanges: RecentChange[]
  atomIndex: Record<string, CartographyAtom>
  isolatedId: string | null
  highlightedId: string | null
  visualLens: VisualLens
  onHover: (graphId: string | null) => void
  onIsolate: (graphId: string) => void
  onFocus: (graphId: string) => void
}

export interface FlowPhase {
  label: string
  deck: string
  from: number
  to: number
  icon: string
}

export interface RegionSignals {
  relations: number
  risk: number
  recent: number
  evidence: number
}
