import { useEffect, useRef } from 'react'
import type { ViewTransform } from './viewportTypes'
import { shouldStartViewportPan, wheelZoomFactor } from './viewportInteraction'

export function useViewportPanBindings({
  viewportRef,
  zoomBy,
  setAnimating,
  setTransform,
}: {
  viewportRef: React.RefObject<HTMLDivElement | null>
  zoomBy: (factor: number, focalX?: number, focalY?: number) => void
  setAnimating: (animating: boolean) => void
  setTransform: React.Dispatch<React.SetStateAction<ViewTransform>>
}) {
  const panState = useRef({ active: false, lastX: 0, lastY: 0, dragged: false })

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const onDown = (event: MouseEvent) => {
      if (!shouldStartViewportPan(event.target)) return
      panState.current = { active: true, lastX: event.clientX, lastY: event.clientY, dragged: false }
      viewport.classList.add('is-panning')
    }

    const onMove = (event: MouseEvent) => {
      const state = panState.current
      if (!state.active) return
      const dx = event.clientX - state.lastX
      const dy = event.clientY - state.lastY
      if (Math.abs(dx) + Math.abs(dy) > 2) state.dragged = true
      state.lastX = event.clientX
      state.lastY = event.clientY
      setAnimating(false)
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
    }

    const onUp = () => {
      const state = panState.current
      if (!state.active) return
      state.active = false
      viewport.classList.remove('is-panning')
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = viewport.getBoundingClientRect()
      const factor = wheelZoomFactor(event.deltaY)
      zoomBy(factor, event.clientX - rect.left, event.clientY - rect.top)
    }

    viewport.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    viewport.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      viewport.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      viewport.removeEventListener('wheel', onWheel)
    }
  }, [setAnimating, setTransform, viewportRef, zoomBy])

  return {
    didDrag: () => panState.current.dragged,
  }
}
