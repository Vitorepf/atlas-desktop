import { useEffect, useState } from 'react'
import type { Connection } from '@atlas/domain'
import type { VisualLens } from '../state/visualLens'
import { computeTrailPaths, type ResolvedPath } from './trailGeometry'

export function useTrailPaths({
  worldElement,
  connections,
  isolatedId,
  highlightedId,
  visualLens,
}: {
  worldElement: HTMLDivElement | null
  connections: Connection[]
  isolatedId: string | null
  highlightedId: string | null
  visualLens: VisualLens
}) {
  const [paths, setPaths] = useState<ResolvedPath[]>([])

  useEffect(() => {
    if (!worldElement) return

    function recompute() {
      if (!worldElement) return
      setPaths(
        computeTrailPaths({
          worldElement,
          connections,
          isolatedId,
          highlightedId,
          visualLens,
        })
      )
    }

    recompute()

    const ro = new ResizeObserver(() => recompute())
    ro.observe(worldElement)
    const mo = new MutationObserver(() => recompute())
    mo.observe(worldElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [worldElement, connections, isolatedId, highlightedId, visualLens])

  return paths
}
