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
    // reset() ao invés de fit() — usa initialScale fixo (40% canon)
    // ao invés do scale calculado pra caber. Cards são fisicamente
    // maiores (A+B), 40% mostra topologia inteira com pan/zoom-in
    // disponíveis pra detalhe.
    const id = window.setTimeout(() => viewport.reset(), 50)
    return () => window.clearTimeout(id)
    // viewport.reset e estavel o bastante; as dependencias semanticas definem o re-init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, continent, systemParentId, focusedId])
}
