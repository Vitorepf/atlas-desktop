import { useCallback, useMemo, useRef, useState } from 'react'
import { fitStage, fitWorld, zoomAroundPoint } from './viewportMath'
import type { StageSize, ViewportConfig, ViewTransform } from './viewportTypes'
import { useViewportPanBindings } from './useViewportPanBindings'

export type { ViewTransform } from './viewportTypes'

export function useCartografiaViewport(config: ViewportConfig) {
  const { worldWidth, worldHeight } = config
  // Pass 5× · world cresceu 5× fisicamente (1880→9400) então o fit canônico
  // virou scale ~0.15 (mundo todo aparece em ~30% do canon antigo). Pra
  // manter os elementos 5× maiores visualmente ao abrir, fit() honra
  // initialScale como floor (Math.max). minScale ainda permite zoom-out
  // total via Cmd+menos do macOS / botão −.
  const minScale = config.minScale ?? 0.15
  const maxScale = config.maxScale ?? 2.4

  const [transform, setTransform] = useState<ViewTransform>({
    scale: config.initialScale ?? 0.55,
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
    setTransform(
      fitWorld({
        viewport,
        world: { width: worldWidth, height: worldHeight },
        minScale,
        maxScale,
        initialScale: config.initialScale ?? 0.55,
      })
    )
  }, [config.initialScale, maxScale, minScale, worldHeight, worldWidth])

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
    setTransform({ scale: config.initialScale ?? 0.55, x: 0, y: 0 })
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
