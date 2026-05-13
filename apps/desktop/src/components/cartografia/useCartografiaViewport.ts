/**
 * useCartografiaViewport · pan + zoom state for the SVG canvas.
 *
 * Exposes:
 * - transform: { scale, x, y }
 * - panBindings: mouse handlers for the viewport ref
 * - zoomBy(factor, cx?, cy?)  — wheel-friendly zoom around a focal point
 * - fit(world, viewport)      — center+scale to fit current scene
 * - reset()                   — back to defaults
 *
 * Mirrors the canvas behavior of public/atlas-truth-cartography.html · pan
 * grab-cursor, scroll-zoom, scale clamp, animated transitions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface ViewTransform {
  scale: number
  x: number
  y: number
}

interface ViewportConfig {
  worldWidth: number
  worldHeight: number
  minScale?: number
  maxScale?: number
  initialScale?: number
}

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
  const panState = useRef({ active: false, lastX: 0, lastY: 0, dragged: false })

  const clampScale = useCallback(
    (s: number) => Math.max(minScale, Math.min(maxScale, s)),
    [minScale, maxScale]
  )

  const zoomBy = useCallback(
    (factor: number, focalX?: number, focalY?: number) => {
      setAnimating(true)
      setTransform((prev) => {
        const cx = focalX ?? viewportRef.current?.clientWidth ?? 0
        const cy = focalY ?? viewportRef.current?.clientHeight ?? 0
        const newScale = clampScale(prev.scale * factor)
        const ratio = newScale / prev.scale
        return {
          scale: newScale,
          x: cx - (cx - prev.x) * ratio,
          y: cy - (cy - prev.y) * ratio,
        }
      })
    },
    [clampScale]
  )

  const fit = useCallback(() => {
    const vp = viewportRef.current
    if (!vp) return
    const vw = vp.clientWidth - 60
    const vh = vp.clientHeight - 60
    const s = clampScale(Math.min(vw / worldWidth, vh / worldHeight))
    setAnimating(true)
    setTransform({
      scale: s,
      x: (vp.clientWidth - worldWidth * s) / 2,
      y: (vp.clientHeight - worldHeight * s) / 2,
    })
  }, [clampScale, worldWidth, worldHeight])

  const fitToStage = useCallback(
    (stage: { width: number; height: number }) => {
      const vp = viewportRef.current
      if (!vp) return
      const vw = vp.clientWidth - 60
      const vh = vp.clientHeight - 60
      const s = clampScale(Math.min(vw / stage.width, vh / stage.height, 1.05))
      setAnimating(true)
      setTransform({
        scale: s,
        x: vp.clientWidth / 2 - (stage.width / 2) * s,
        y: vp.clientHeight / 2 - (stage.height / 2) * s,
      })
    },
    [clampScale]
  )

  const reset = useCallback(() => {
    setAnimating(true)
    setTransform({ scale: config.initialScale ?? 0.65, x: 0, y: 0 })
  }, [config.initialScale])

  // ──────────────────────────────────────────────────────────────────────
  // Pan: the viewport listens. Children with .no-pan class skip drag.

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return

    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        target.closest(
          '.no-pan, .atom, .satellite, .focus-action, .floater, .canvas-controls, .breadcrumb, .back-to-map'
        )
      ) {
        return
      }
      panState.current = { active: true, lastX: e.clientX, lastY: e.clientY, dragged: false }
      vp.classList.add('is-panning')
    }

    const onMove = (e: MouseEvent) => {
      const ps = panState.current
      if (!ps.active) return
      const dx = e.clientX - ps.lastX
      const dy = e.clientY - ps.lastY
      if (Math.abs(dx) + Math.abs(dy) > 2) ps.dragged = true
      ps.lastX = e.clientX
      ps.lastY = e.clientY
      setAnimating(false)
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
    }

    const onUp = () => {
      const ps = panState.current
      if (!ps.active) return
      ps.active = false
      vp.classList.remove('is-panning')
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = vp.getBoundingClientRect()
      const factor = e.deltaY > 0 ? 0.92 : 1.08
      zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top)
    }

    vp.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    vp.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      vp.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      vp.removeEventListener('wheel', onWheel)
    }
  }, [zoomBy])

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
      didDrag: () => panState.current.dragged,
    }),
    [transform, animating, zoomBy, fit, fitToStage, reset]
  )
}
