import { useCallback, useMemo, useRef, useState } from 'react'
import { fitStage, fitWorld, zoomAroundPoint } from './viewportMath'
import type { StageSize, ViewportConfig, ViewTransform } from './viewportTypes'
import { useViewportPanBindings } from './useViewportPanBindings'

export type { ViewTransform } from './viewportTypes'

export function useCartografiaViewport(config: ViewportConfig) {
  const { worldWidth, worldHeight } = config
  const minScale = config.minScale ?? 0.3
  const maxScale = config.maxScale ?? 2.4

  const [transform, setTransform] = useState<ViewTransform>({
    scale: config.initialScale ?? 0.65,
    x: 0,
    y: 0,
  })
  const [animating, setAnimating] = useState(true)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  const zoomBy = useCallback(
    (factor: number, focalX?: number, focalY?: number) => {
      setAnimating(true)
      setTransform((prev) => {
        const x = focalX ?? viewportRef.current?.clientWidth ?? 0
        const y = focalY ?? viewportRef.current?.clientHeight ?? 0
        return zoomAroundPoint({ current: prev, factor, focalX: x, focalY: y, minScale, maxScale })
      })
    },
    [maxScale, minScale]
  )

  const fit = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    setAnimating(true)
    setTransform(fitWorld({ viewport, world: { width: worldWidth, height: worldHeight }, minScale, maxScale }))
  }, [maxScale, minScale, worldHeight, worldWidth])

  const fitToStage = useCallback(
    (stage: StageSize) => {
      const viewport = viewportRef.current
      if (!viewport) return
      setAnimating(true)
      setTransform(fitStage({ viewport, stage, minScale, maxScale }))
    },
    [maxScale, minScale]
  )

  const reset = useCallback(() => {
    setAnimating(true)
    setTransform({ scale: config.initialScale ?? 0.65, x: 0, y: 0 })
  }, [config.initialScale])

  const pan = useViewportPanBindings({ viewportRef, zoomBy, setAnimating, setTransform })

  return useMemo(
    () => ({
      viewportRef,
      transform,
      animating,
      zoomBy,
      fit,
      fitToStage,
      reset,
      setAnimating,
      didDrag: pan.didDrag,
    }),
    [animating, fit, fitToStage, pan.didDrag, reset, transform, zoomBy]
  )
}

export type CartografiaViewportController = ReturnType<typeof useCartografiaViewport>
