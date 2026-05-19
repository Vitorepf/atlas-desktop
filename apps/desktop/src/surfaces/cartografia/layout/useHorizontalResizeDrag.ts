import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface ResizeDrag {
  startX: number
  startWidth: number
}

interface UseHorizontalResizeDragArgs {
  currentWidth: number
  onResize: (nextWidth: number) => void
  onStart?: () => void
}

export function useHorizontalResizeDrag({
  currentWidth,
  onResize,
  onStart,
}: UseHorizontalResizeDragArgs) {
  const resizeDragRef = useRef<ResizeDrag | null>(null)

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = resizeDragRef.current
      if (!drag) return
      onResize(drag.startWidth + event.clientX - drag.startX)
    }

    function handlePointerUp() {
      if (!resizeDragRef.current) return
      resizeDragRef.current = null
      document.body.classList.remove('cart-resizing')
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      document.body.classList.remove('cart-resizing')
    }
  }, [onResize])

  return useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      event.preventDefault()
      onStart?.()
      resizeDragRef.current = {
        startX: event.clientX,
        startWidth: currentWidth,
      }
      document.body.classList.add('cart-resizing')
    },
    [currentWidth, onStart]
  )
}
