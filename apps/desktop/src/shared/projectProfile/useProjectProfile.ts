/**
 * useProjectProfile · estado simples para abrir/fechar o sheet, com keyboard
 * shortcut Cmd+Shift+P (Atalho clássico de "command palette" adaptado para o
 * Project Profile). Centralizar aqui evita prop-drilling do `open` por toda a
 * árvore.
 */
import { useCallback, useEffect, useState } from 'react'

export interface ProjectProfileController {
  open: boolean
  show: () => void
  hide: () => void
  toggle: () => void
}

export function useProjectProfile(): ProjectProfileController {
  const [open, setOpen] = useState(false)
  const show = useCallback(() => setOpen(true), [])
  const hide = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((v) => !v), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return { open, show, hide, toggle }
}
