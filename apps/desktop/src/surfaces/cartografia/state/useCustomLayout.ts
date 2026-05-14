/**
 * Custom layout overlay — Edit Mode (Fase 1+2).
 *
 * Camada opt-in que sobrescreve `LANE_LAYOUT` canon com posições/dimensões
 * salvas pelo usuário via drag/resize. Persistido em localStorage por view
 * (atlas-ai-kernel · memoria · obras · etc.).
 *
 * Schema:
 *   key   = `atlas.cartografia.custom-layout.${view}`
 *   value = JSON.stringify({ "domain-plane": {x, y, w, h?}, ... })
 *
 * Read: canon fallback when no override saved.
 * Write: per-graphId, merged into overlay map.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { readCartografiaStorage, writeCartografiaStorage } from './browserStorage'

export interface CustomLaneLayout {
  x: number
  y: number
  w?: number
  h?: number
}

export type CustomLayoutMap = Record<string, CustomLaneLayout>

function storageKey(view: string): string {
  return `atlas.cartografia.custom-layout.${view}`
}

function loadOverlay(view: string): CustomLayoutMap {
  const raw = readCartografiaStorage(storageKey(view))
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as CustomLayoutMap
  } catch {
    // corrupted JSON — descartar silente
  }
  return {}
}

function saveOverlay(view: string, overlay: CustomLayoutMap): void {
  writeCartografiaStorage(storageKey(view), JSON.stringify(overlay))
}

/** Tamanho máximo do histórico Undo/Redo (Feature #6). */
const HISTORY_LIMIT = 50

export function useCustomLayout(view: string) {
  const [overlay, setOverlay] = useState<CustomLayoutMap>(() => loadOverlay(view))
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  // Histórico pra undo/redo (Feature #6). past/future stacks de overlays.
  // `current` é o overlay ativo; tomamos snapshot toda update.
  const undoStack = useRef<CustomLayoutMap[]>([])
  const redoStack = useRef<CustomLayoutMap[]>([])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverlay(loadOverlay(view))
    undoStack.current = []
    redoStack.current = []
    setLastSavedAt(null)
  }, [view])

  const persist = useCallback(
    (next: CustomLayoutMap) => {
      saveOverlay(view, next)
      setLastSavedAt(Date.now())
    },
    [view]
  )

  const updateLane = useCallback(
    (graphId: string, patch: Partial<CustomLaneLayout>) => {
      setOverlay((prev) => {
        // Snapshot atual no undo stack (limit 50).
        undoStack.current = [...undoStack.current.slice(-HISTORY_LIMIT + 1), prev]
        redoStack.current = [] // qualquer nova mudança limpa redo
        const merged: CustomLayoutMap = {
          ...prev,
          [graphId]: { ...prev[graphId], ...patch } as CustomLaneLayout,
        }
        persist(merged)
        return merged
      })
    },
    [persist]
  )

  const resetAll = useCallback(() => {
    setOverlay((prev) => {
      undoStack.current = [...undoStack.current.slice(-HISTORY_LIMIT + 1), prev]
      redoStack.current = []
      persist({})
      return {}
    })
  }, [persist])

  const resetLane = useCallback(
    (graphId: string) => {
      setOverlay((prev) => {
        undoStack.current = [...undoStack.current.slice(-HISTORY_LIMIT + 1), prev]
        redoStack.current = []
        const next = { ...prev }
        delete next[graphId]
        persist(next)
        return next
      })
    },
    [persist]
  )

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return false
    setOverlay((prev) => {
      const last = undoStack.current[undoStack.current.length - 1]
      undoStack.current = undoStack.current.slice(0, -1)
      redoStack.current = [...redoStack.current, prev]
      persist(last)
      return last
    })
    return true
  }, [persist])

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return false
    setOverlay((prev) => {
      const next = redoStack.current[redoStack.current.length - 1]
      redoStack.current = redoStack.current.slice(0, -1)
      undoStack.current = [...undoStack.current, prev]
      persist(next)
      return next
    })
    return true
  }, [persist])

  /** Sobrescreve overlay inteiro (usado pra layout presets · Feature #4). */
  const replaceOverlay = useCallback(
    (next: CustomLayoutMap) => {
      setOverlay((prev) => {
        undoStack.current = [...undoStack.current.slice(-HISTORY_LIMIT + 1), prev]
        redoStack.current = []
        persist(next)
        return next
      })
    },
    [persist]
  )

  const hasOverrides = useMemo(() => Object.keys(overlay).length > 0, [overlay])
  const canUndo = useMemo(() => undoStack.current.length > 0, [overlay])
  const canRedo = useMemo(() => redoStack.current.length > 0, [overlay])

  return {
    overlay,
    updateLane,
    resetAll,
    resetLane,
    replaceOverlay,
    undo,
    redo,
    canUndo,
    canRedo,
    hasOverrides,
    lastSavedAt,
  }
}
