import { useEffect } from 'react'
import type { CartographyView } from '@atlas/domain'
import type { CartografiaViewportController } from './useCartografiaViewport'

export function useSceneAutoFit({
  viewport,
  view,
  continent,
  systemParentId,
  focusedId,
}: {
  viewport: CartografiaViewportController
  view: CartographyView
  continent: string
  systemParentId: string | null
  focusedId: string | null
}) {
  useEffect(() => {
    const id = window.setTimeout(() => viewport.fit(), 50)
    return () => window.clearTimeout(id)
    // viewport.fit e estavel o bastante; as dependencias semanticas definem o refit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, continent, systemParentId, focusedId])
}
