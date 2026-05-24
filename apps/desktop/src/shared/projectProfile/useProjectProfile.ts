/**
 * useProjectProfile · estado simples para abrir/fechar o sheet, com keyboard
 * shortcut Cmd+Shift+P (Atalho clássico de "command palette" adaptado para o
 * Project Profile). Centralizar aqui evita prop-drilling do `open` por toda a
 * árvore.
 */
import { useCallback, useEffect, useState } from 'react'

export type ProjectProfileMode = 'view' | 'create' | 'edit'

export interface ProjectProfileController {
  open: boolean
  mode: ProjectProfileMode
  show: (mode?: ProjectProfileMode) => void
  hide: () => void
  toggle: (mode?: ProjectProfileMode) => void
}

export function useProjectProfile(): ProjectProfileController {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ProjectProfileMode>('view')
  const show = useCallback((nextMode: ProjectProfileMode = 'view') => {
    setMode(nextMode)
    setOpen(true)
  }, [])
  const hide = useCallback(() => setOpen(false), [])
  const toggle = useCallback((nextMode: ProjectProfileMode = 'view') => {
    setMode(nextMode)
    setOpen((v) => !v)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setMode('view')
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return { open, mode, show, hide, toggle }
}
