import { useMemo } from 'react'
import type { useCartografia } from './useCartografia'
import { currentLocationLabel } from '../layout/currentLocationLabel'

export function useCartografiaViewModel(cartografia: ReturnType<typeof useCartografia>) {
  const continent = useMemo(
    () => cartografia.graph?.universe.find((u) => u.graphId === cartografia.continent) ?? null,
    [cartografia.graph, cartografia.continent]
  )

  const focusedAtom = cartografia.focusedId ? cartografia.atomIndex[cartografia.focusedId] : null
  const isolatedAtom = cartografia.isolatedId ? cartografia.atomIndex[cartografia.isolatedId] : null
  const hoveredAtom =
    cartografia.hoverId &&
    cartografia.view !== 'gear' &&
    cartografia.view !== 'subflow' &&
    !cartografia.isolatedId
      ? cartografia.atomIndex[cartografia.hoverId]
      : null
  const inspectorAtom = focusedAtom ?? isolatedAtom ?? hoveredAtom ?? null
  const inspectorRecent =
    inspectorAtom != null
      ? cartografia.recentChanges.find((r) => r.graphId === inspectorAtom.graphId) ?? null
      : null

  const lensStats = useMemo(() => {
    const recentIds = new Set(cartografia.recentChanges.map((change) => change.graphId))
    return { recent: recentIds.size }
  }, [cartografia.recentChanges])

  const hereLabel = currentLocationLabel({
    view: cartografia.view,
    continent: continent?.name ?? null,
    systemParentName: cartografia.systemParentId
      ? cartografia.atomIndex[cartografia.systemParentId]?.name ?? null
      : null,
    focusedName: focusedAtom?.name ?? null,
    isolatedName: isolatedAtom?.name ?? null,
  })

  return {
    continent,
    focusedAtom,
    isolatedAtom,
    hoveredAtom,
    inspectorAtom,
    inspectorRecent,
    lensStats,
    hereLabel,
    isOffline: !cartografia.graph && !cartografia.loading,
  }
}

export type CartografiaViewModel = ReturnType<typeof useCartografiaViewModel>
