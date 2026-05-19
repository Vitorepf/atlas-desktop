import { useEffect, useState } from 'react'
import { writeCartografiaStorage } from './browserStorage'
import { readStoredVisualLens, type VisualLens } from './visualLens'

const VISUAL_LENS_KEY = 'atlas.cartografia.visualLens'

export function useVisualLens() {
  const [visualLens, setVisualLens] = useState<VisualLens>(() => readStoredVisualLens(VISUAL_LENS_KEY))

  useEffect(() => {
    writeCartografiaStorage(VISUAL_LENS_KEY, visualLens)
  }, [visualLens])

  return { visualLens, setVisualLens }
}
