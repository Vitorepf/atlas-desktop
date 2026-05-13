import { useCallback, useEffect, useState } from 'react'
import { useCodeLayoutStore } from '../../../state/codeLayoutStore'

type ResizeSide = 'left' | 'right'

export function useCodeColumnSizing() {
  const leftWidth = useCodeLayoutStore((s) => s.leftWidth)
  const rightWidth = useCodeLayoutStore((s) => s.rightWidth)
  const setLeftWidth = useCodeLayoutStore((s) => s.setLeftWidth)
  const setRightWidth = useCodeLayoutStore((s) => s.setRightWidth)
  const resetColumns = useCodeLayoutStore((s) => s.resetColumns)
  const [leftNode, setLeftResizeNode] = useState<HTMLDivElement | null>(null)
  const [rightNode, setRightResizeNode] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--code-left-width', `${leftWidth}px`)
    root.style.setProperty('--code-right-width', `${rightWidth}px`)
  }, [leftWidth, rightWidth])

  useEffect(() => {
    const onResize = () => {
      useCodeLayoutStore.getState().setLeftWidth(useCodeLayoutStore.getState().leftWidth)
      useCodeLayoutStore.getState().setRightWidth(useCodeLayoutStore.getState().rightWidth)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const bindHandle = useCallback((
    node: HTMLDivElement | null,
    side: ResizeSide,
  ) => {
    if (!node) return undefined

    let dragging = false
    let pointerId: number | null = null
    let startX = 0
    let startWidth = 0

    const stopDrag = () => {
      if (!dragging) return
      dragging = false
      pointerId = null
      node.classList.remove('dragging')
      document.body.classList.remove('code-column-resizing')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging || (pointerId != null && e.pointerId !== pointerId)) return
      e.preventDefault()
      const delta = e.clientX - startX
      if (side === 'left') {
        setLeftWidth(startWidth + delta)
      } else {
        setRightWidth(startWidth - delta)
      }
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
      startX = e.clientX
      const state = useCodeLayoutStore.getState()
      startWidth = side === 'left' ? state.leftWidth : state.rightWidth
      node.classList.add('dragging')
      document.body.classList.add('code-column-resizing')
      window.addEventListener('pointermove', onMove, { passive: false })
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    }

    node.addEventListener('pointerdown', onDown)
    node.addEventListener('dblclick', resetColumns)
    return () => {
      stopDrag()
      node.removeEventListener('pointerdown', onDown)
      node.removeEventListener('dblclick', resetColumns)
    }
  }, [resetColumns, setLeftWidth, setRightWidth])

  useEffect(() => bindHandle(leftNode, 'left'), [bindHandle, leftNode])
  useEffect(() => bindHandle(rightNode, 'right'), [bindHandle, rightNode])

  return {
    setLeftResizeNode,
    setRightResizeNode,
  }
}
