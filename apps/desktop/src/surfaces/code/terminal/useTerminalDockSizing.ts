import { useEffect } from 'react'
import { clampHeight, useTerminalStore } from '../../../state/terminalStore'

const MAX_HEIGHT_RATIO = 0.85
const SIDE_MIN_HEIGHT = 120
const SIDE_TOP_PRESERVE = 214

interface UseTerminalDockSizingArgs {
  resizeNode: HTMLDivElement | null
  dockHeight: number
  dockMaximized: boolean
  dockPlacement: 'bottom' | 'right'
  setHeight: (px: number) => void
  toggleMaximize: () => void
}

export function useTerminalDockSizing({
  resizeNode,
  dockHeight,
  dockMaximized,
  dockPlacement,
  setHeight,
  toggleMaximize,
}: UseTerminalDockSizingArgs) {
  useEffect(() => {
    const root = document.documentElement
    const bottomPx = dockMaximized
      ? Math.floor(window.innerHeight * MAX_HEIGHT_RATIO)
      : dockHeight
    const sideMax = Math.max(SIDE_MIN_HEIGHT, window.innerHeight - SIDE_TOP_PRESERVE)
    const sidePx = dockMaximized
      ? sideMax
      : Math.max(SIDE_MIN_HEIGHT, Math.min(dockHeight, sideMax))
    root.style.setProperty('--terminal-dock-height', `${bottomPx}px`)
    root.style.setProperty('--terminal-side-height', `${sidePx}px`)
    return () => {
      root.style.setProperty('--terminal-dock-height', '260px')
      root.style.setProperty('--terminal-side-height', '320px')
    }
  }, [dockHeight, dockMaximized, dockPlacement])

  useEffect(() => {
    const node = resizeNode
    if (!node) return

    let dragging = false
    let pointerId: number | null = null
    let startY = 0
    let startHeight = 0

    const stopDrag = () => {
      if (!dragging) return
      dragging = false
      pointerId = null
      node.classList.remove('dragging')
      document.body.classList.remove('terminal-resizing')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging || (pointerId != null && e.pointerId !== pointerId)) return
      e.preventDefault()
      const delta = startY - e.clientY
      setHeight(clampHeight(startHeight + delta))
    }

    const onUp = (e: PointerEvent) => {
      if (pointerId != null && e.pointerId !== pointerId) return
      stopDrag()
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      dragging = true
      pointerId = e.pointerId
      startY = e.clientY
      startHeight = dockPlacement === 'right'
        ? Math.round(node.closest('.terminal-dock')?.getBoundingClientRect().height ?? useTerminalStore.getState().dockHeight)
        : useTerminalStore.getState().dockHeight
      node.classList.add('dragging')
      document.body.classList.add('terminal-resizing')
      window.addEventListener('pointermove', onMove, { passive: false })
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    }

    node.addEventListener('pointerdown', onDown)
    node.addEventListener('dblclick', toggleMaximize)
    return () => {
      stopDrag()
      node.removeEventListener('pointerdown', onDown)
      node.removeEventListener('dblclick', toggleMaximize)
    }
  }, [dockPlacement, resizeNode, setHeight, toggleMaximize])
}
