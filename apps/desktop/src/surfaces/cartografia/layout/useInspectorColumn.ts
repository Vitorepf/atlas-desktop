import { useCallback, useEffect, useState } from 'react'
import { writeCartografiaStorage } from '../state/browserStorage'
import {
  INSPECTOR_COLLAPSED_KEY,
  INSPECTOR_COLLAPSED_WIDTH,
  INSPECTOR_DEFAULT_WIDTH,
  INSPECTOR_MAX_WIDTH,
  INSPECTOR_MIN_WIDTH,
  INSPECTOR_WIDTH_KEY,
  clampInspectorWidth,
  readStoredBoolean,
  readStoredInspectorWidth,
} from './inspectorLayout'
import { useHorizontalResizeDrag } from './useHorizontalResizeDrag'

export function useInspectorColumn() {
  const [width, setWidth] = useState(() => readStoredInspectorWidth())
  const [collapsed, setCollapsed] = useState(() => readStoredBoolean(INSPECTOR_COLLAPSED_KEY, false))

  useEffect(() => {
    if (collapsed) return
    writeCartografiaStorage(INSPECTOR_WIDTH_KEY, String(width))
  }, [collapsed, width])

  useEffect(() => {
    writeCartografiaStorage(INSPECTOR_COLLAPSED_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const beginResize = useHorizontalResizeDrag({
    currentWidth: collapsed ? INSPECTOR_MIN_WIDTH : width,
    onResize: useCallback((nextWidth: number) => {
      setCollapsed(false)
      setWidth(clampInspectorWidth(nextWidth))
    }, []),
    onStart: useCallback(() => setCollapsed(false), []),
  })

  const nudgeWidth = useCallback((delta: number) => {
    setCollapsed(false)
    setWidth((current) => clampInspectorWidth(current + delta))
  }, [])

  const resetWidth = useCallback(() => {
    setCollapsed(false)
    setWidth(INSPECTOR_DEFAULT_WIDTH)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => !current)
  }, [])

  return {
    width,
    collapsed,
    cssWidth: collapsed ? INSPECTOR_COLLAPSED_WIDTH : width,
    minWidth: INSPECTOR_MIN_WIDTH,
    maxWidth: INSPECTOR_MAX_WIDTH,
    ariaWidth: collapsed ? INSPECTOR_COLLAPSED_WIDTH : width,
    beginResize,
    nudgeWidth,
    resetWidth,
    toggleCollapsed,
  }
}

export type InspectorColumnController = ReturnType<typeof useInspectorColumn>
