/**
 * Keyboard shortcuts pra Edit Mode (Feature #6).
 *
 *   Cmd+Z       · undo última operação de drag/resize
 *   Cmd+Shift+Z · redo
 *
 * Só ativa quando isEditMode = true pra não competir com undo nativo
 * de inputs de texto.
 */
import { useEffect } from 'react'

export function useLayoutShortcuts({
  isEditMode,
  undo,
  redo,
}: {
  isEditMode: boolean
  undo: () => boolean
  redo: () => boolean
}) {
  useEffect(() => {
    if (!isEditMode) return
    const handler = (e: KeyboardEvent) => {
      // Skip se o usuário está digitando num input/textarea
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isEditMode, undo, redo])
}
