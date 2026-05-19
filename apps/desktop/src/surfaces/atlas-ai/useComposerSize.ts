/**
 * useComposerSize · controla largura/altura do card composer.
 *
 * - Largura em px (centralizada simétrica via margin-inline auto)
 * - Altura: max-height da textarea (auto-grow continua valendo)
 * - Persiste em sessionStorage
 * - Constraints sane defaults + min/max
 * - Drag handler exporta `bind` pra usar no corner handle
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'atlas-desktop:atlas-ai-composer-size:v1'

export const COMPOSER_WIDTH_MIN = 360
export const COMPOSER_WIDTH_MAX = 1180
export const COMPOSER_WIDTH_DEFAULT = 1080

/* Min 32px = single-line textarea (line-height 24 + minúsculo padding interno).
   Suficiente pra digitar 1 linha de pergunta curta sem perder ergonomia. */
export const COMPOSER_HEIGHT_MIN = 32
export const COMPOSER_HEIGHT_MAX = 600
export const COMPOSER_HEIGHT_DEFAULT = 360

interface ComposerSize {
  width: number
  height: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function loadInitial(): ComposerSize {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { width: COMPOSER_WIDTH_DEFAULT, height: COMPOSER_HEIGHT_DEFAULT }
    const parsed = JSON.parse(raw) as Partial<ComposerSize>
    return {
      width: clamp(Number(parsed.width) || COMPOSER_WIDTH_DEFAULT, COMPOSER_WIDTH_MIN, COMPOSER_WIDTH_MAX),
      height: clamp(Number(parsed.height) || COMPOSER_HEIGHT_DEFAULT, COMPOSER_HEIGHT_MIN, COMPOSER_HEIGHT_MAX),
    }
  } catch {
    return { width: COMPOSER_WIDTH_DEFAULT, height: COMPOSER_HEIGHT_DEFAULT }
  }
}

export function useComposerSize() {
  const [size, setSize] = useState<ComposerSize>(loadInitial)
  const sizeRef = useRef<ComposerSize>(size)

  useEffect(() => {
    sizeRef.current = size
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(size))
    } catch {
      /* sandbox safe */
    }
  }, [size])

  /**
   * Drag handle DEDICADO de largura · borda esquerda do composer.
   * Drag p/ esquerda = aumenta largura simétrica (cresce dos 2 lados, 2x delta).
   * Drag p/ direita = diminui largura. Centralizado sempre.
   */
  const startWidthDrag = useCallback((event: React.MouseEvent | React.PointerEvent) => {
    event.preventDefault()
    const startX = event.clientX
    const startW = sizeRef.current.width
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      const dx = startX - ev.clientX
      const newW = clamp(startW + dx * 2, COMPOSER_WIDTH_MIN, COMPOSER_WIDTH_MAX)
      setSize((curr) => ({ ...curr, width: newW }))
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  /**
   * Drag handle DEDICADO de altura · borda superior do composer.
   * Drag p/ cima = aumenta altura. Drag p/ baixo = diminui.
   */
  const startHeightDrag = useCallback((event: React.MouseEvent | React.PointerEvent) => {
    event.preventDefault()
    const startY = event.clientY
    const startH = sizeRef.current.height
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      const dy = startY - ev.clientY
      const newH = clamp(startH + dy, COMPOSER_HEIGHT_MIN, COMPOSER_HEIGHT_MAX)
      setSize((curr) => ({ ...curr, height: newH }))
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  /** Reset rápido pra defaults (double-click em qualquer handle). */
  const reset = useCallback(() => {
    setSize({ width: COMPOSER_WIDTH_DEFAULT, height: COMPOSER_HEIGHT_DEFAULT })
  }, [])

  return { size, startWidthDrag, startHeightDrag, reset }
}
