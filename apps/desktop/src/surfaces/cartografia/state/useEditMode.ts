/**
 * Edit Mode state — Edit Mode (Fase 1+2).
 *
 * Toggle global lock/unlock. Quando true:
 *   · cursor grab nas lanes
 *   · resize handles aparecem nas bordas
 *   · drag/resize ativam · alteram useCustomLayout overlay
 *
 * Persisted em localStorage pra não perder ao recarregar. Default = locked.
 */
import { useCallback, useState } from 'react'
import { readCartografiaStorage, writeCartografiaStorage } from './browserStorage'

const STORAGE_KEY = 'atlas.cartografia.edit-mode'

function loadInitial(): boolean {
  const raw = readCartografiaStorage(STORAGE_KEY)
  return raw === '1'
}

export function useEditMode() {
  const [isEditMode, setIsEditMode] = useState<boolean>(loadInitial)

  const toggle = useCallback(() => {
    setIsEditMode((prev) => {
      const next = !prev
      writeCartografiaStorage(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const setMode = useCallback((next: boolean) => {
    setIsEditMode(next)
    writeCartografiaStorage(STORAGE_KEY, next ? '1' : '0')
  }, [])

  return { isEditMode, toggle, setMode }
}
