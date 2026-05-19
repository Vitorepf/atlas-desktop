import type { CartographyView } from '@atlas/domain'

export const ATLAS_CONTINENT_ID = 'atlas'
export const ATLAS_KERNEL_PIPELINE_ID = 'atlas-ai-kernel-pipeline'

interface EscapeTransitionInput {
  view: CartographyView
  continent: string
  isolatedId: string | null
  systemParentId: string | null
}

export interface NavigationPatch {
  view?: CartographyView
  focusedId?: string | null
  isolatedId?: string | null
  systemParentId?: string | null
}

export function parentForContinent(continentId: string): string {
  return continentId === ATLAS_CONTINENT_ID ? ATLAS_KERNEL_PIPELINE_ID : continentId
}

export function initialViewForContinent(continentId: string): CartographyView {
  return continentId === ATLAS_CONTINENT_ID ? 'flow' : 'system'
}

export function parentForView(view: CartographyView, continentId: string): string | null | undefined {
  if (view === 'universe') return null
  if (view === 'system') return continentId === ATLAS_CONTINENT_ID ? ATLAS_CONTINENT_ID : continentId
  if (view === 'flow') return ATLAS_KERNEL_PIPELINE_ID
  return undefined
}

export function shouldClearFocusForView(view: CartographyView): boolean {
  return view === 'flow' || view === 'universe' || view === 'system'
}

export function viewAfterGear(systemParentId: string | null): CartographyView {
  return systemParentId && systemParentId !== ATLAS_KERNEL_PIPELINE_ID ? 'system' : 'flow'
}

export function escapeTransition({
  view,
  continent,
  isolatedId,
  systemParentId,
}: EscapeTransitionInput): NavigationPatch | null {
  if (view === 'subflow') return { view: 'gear' }
  if (view === 'gear') return { view: viewAfterGear(systemParentId), focusedId: null }
  if (isolatedId) return { isolatedId: null }
  if (view === 'system') {
    return {
      systemParentId: parentForContinent(continent),
      view: continent === ATLAS_CONTINENT_ID ? 'flow' : 'universe',
    }
  }
  if (view === 'universe') return { view: 'flow' }
  return null
}
