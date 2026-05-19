import { useCallback, useEffect, useState } from 'react'
import type { CartographyGraph, CartographyNote, CartographyView } from '@atlas/domain'
import {
  ATLAS_KERNEL_PIPELINE_ID,
  escapeTransition,
  initialViewForContinent,
  parentForContinent,
  parentForView,
  shouldClearFocusForView,
  viewAfterGear,
} from './navigationModel'

interface NavigationArgs {
  graph: CartographyGraph | null
  loadNoteFor: (graphId: string) => Promise<CartographyNote | null>
}

export function useCartografiaNavigation({ graph, loadNoteFor }: NavigationArgs) {
  const [view, setViewState] = useState<CartographyView>('flow')
  const [continent, setContinent] = useState<string>('atlas')
  const [systemParentId, setSystemParentId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [isolatedId, setIsolatedId] = useState<string | null>(null)
  const [hoverId, setHover] = useState<string | null>(null)
  const [searchQuery, setSearch] = useState<string>('')

  const setView = useCallback((nextView: CartographyView) => {
    setViewState(nextView)
    if (shouldClearFocusForView(nextView)) setFocusedId(null)
    const nextParent = parentForView(nextView, continent)
    if (nextParent !== undefined) setSystemParentId(nextParent)
  }, [continent])

  const selectContinent = useCallback((id: string) => {
    setContinent(id)
    setFocusedId(null)
    setIsolatedId(null)
    setSystemParentId(parentForContinent(id))
    setViewState(initialViewForContinent(id))
  }, [])

  const enterIsolate = useCallback((graphId: string) => setIsolatedId(graphId), [])
  const exitIsolate = useCallback(() => setIsolatedId(null), [])

  const enterGear = useCallback(
    (graphId: string) => {
      setFocusedId(graphId)
      setIsolatedId(null)
      setViewState('gear')
      void loadNoteFor(graphId)
    },
    [loadNoteFor]
  )

  const enterNode = useCallback(
    (graphId: string) => {
      const children = graph?.semanticGraph?.hierarchy?.[graphId] ?? []
      if (children.length > 0 && graphId !== ATLAS_KERNEL_PIPELINE_ID) {
        setSystemParentId(graphId)
        setFocusedId(null)
        setIsolatedId(null)
        setViewState('system')
        return
      }
      if (graphId === ATLAS_KERNEL_PIPELINE_ID) {
        setSystemParentId(graphId)
        setFocusedId(null)
        setIsolatedId(null)
        setViewState('flow')
        return
      }
      enterGear(graphId)
    },
    [enterGear, graph?.semanticGraph?.hierarchy]
  )

  const exitGear = useCallback(() => {
    setFocusedId(null)
    setViewState(viewAfterGear(systemParentId))
  }, [systemParentId])

  const enterSubflow = useCallback(() => setViewState('subflow'), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const patch = escapeTransition({ view, continent, isolatedId, systemParentId })
      if (!patch) return
      if (patch.focusedId !== undefined) setFocusedId(patch.focusedId)
      if (patch.isolatedId !== undefined) setIsolatedId(patch.isolatedId)
      if (patch.systemParentId !== undefined) setSystemParentId(patch.systemParentId)
      if (patch.view) setViewState(patch.view)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [continent, isolatedId, systemParentId, view])

  return {
    view,
    continent,
    systemParentId,
    focusedId,
    isolatedId,
    hoverId,
    searchQuery,
    setView,
    selectContinent,
    enterNode,
    enterIsolate,
    exitIsolate,
    enterGear,
    exitGear,
    enterSubflow,
    setHover,
    setSearch,
  }
}
