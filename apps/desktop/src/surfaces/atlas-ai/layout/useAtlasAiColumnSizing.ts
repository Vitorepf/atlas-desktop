/**
 * Atlas AI · column sizing hook (mirror do useCodeColumnSizing).
 *
 * Sincroniza variáveis CSS `--atlas-ai-left-width` / `--atlas-ai-right-width`
 * com o store persistente. Binda pointer-drag nos resizer handles e expõe
 * setters para o caller. Double-click no handle restaura defaults.
 */
import { useCallback, useEffect, useState } from 'react'
import { clampAtlasAiLeft, clampAtlasAiRight, useAtlasAiLayoutStore } from '../../../state/atlasAiLayoutStore'

type ResizeSide = 'left' | 'right'

export function useAtlasAiColumnSizing() {
  const leftWidth = useAtlasAiLayoutStore((s) => s.leftWidth)
  const rightWidth = useAtlasAiLayoutStore((s) => s.rightWidth)
  const leftCollapsed = useAtlasAiLayoutStore((s) => s.leftCollapsed)
  const rightCollapsed = useAtlasAiLayoutStore((s) => s.rightCollapsed)
  const setLeftWidth = useAtlasAiLayoutStore((s) => s.setLeftWidth)
  const setRightWidth = useAtlasAiLayoutStore((s) => s.setRightWidth)
  const resetColumns = useAtlasAiLayoutStore((s) => s.resetColumns)

  const [leftNode, setLeftResizeNode] = useState<HTMLDivElement | null>(null)
  const [rightNode, setRightResizeNode] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = document.documentElement
    const safeLeftWidth = clampAtlasAiLeft(leftWidth, rightWidth)
    const safeRightWidth = clampAtlasAiRight(rightWidth, safeLeftWidth)
    root.style.setProperty(
      '--atlas-ai-left-width',
      leftCollapsed ? '0px' : `${safeLeftWidth}px`,
    )
    root.style.setProperty(
      '--atlas-ai-right-width',
      rightCollapsed ? '0px' : `${safeRightWidth}px`,
    )
    root.classList.toggle('atlas-ai-left-collapsed', leftCollapsed)
    root.classList.toggle('atlas-ai-right-collapsed', rightCollapsed)
  }, [leftWidth, rightWidth, leftCollapsed, rightCollapsed])

  const bindHandle = useCallback(
    (node: HTMLDivElement | null, side: ResizeSide) => {
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
        document.body.classList.remove('atlas-ai-column-resizing')
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
        const state = useAtlasAiLayoutStore.getState()
        startWidth = side === 'left' ? state.leftWidth : state.rightWidth
        node.classList.add('dragging')
        document.body.classList.add('atlas-ai-column-resizing')
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
    },
    [resetColumns, setLeftWidth, setRightWidth],
  )

  useEffect(() => bindHandle(leftNode, 'left'), [bindHandle, leftNode])
  useEffect(() => bindHandle(rightNode, 'right'), [bindHandle, rightNode])

  return {
    setLeftResizeNode,
    setRightResizeNode,
  }
}
