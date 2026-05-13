import { useEffect } from 'react'
import { useTerminalStore } from '../../../state/terminalStore'

interface UseTerminalShortcutsArgs {
  initialCwd?: string
  open: (cwd: string, label?: string) => string
  close: (id: string) => void
  select: (id: string) => void
  toggleMaximize: () => void
  toggleSearch: () => void
}

export function useTerminalShortcuts({
  initialCwd,
  open,
  close,
  select,
  toggleMaximize,
  toggleSearch,
}: UseTerminalShortcutsArgs) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || e.ctrlKey || e.altKey) return
      const { sessions: list, activeId: aid } = useTerminalStore.getState()

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        const fromCwd = list.find((s) => s.id === aid)?.cwd ?? initialCwd ?? ''
        open(fromCwd)
        return
      }
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        if (aid) close(aid)
        if (useTerminalStore.getState().sessions.length === 0) {
          open(initialCwd ?? '')
        }
        return
      }
      if (e.key === '\\') {
        e.preventDefault()
        toggleMaximize()
        return
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleSearch()
        return
      }
      if (e.shiftKey && (e.key === ']' || e.key === '{')) {
        e.preventDefault()
        if (list.length < 2 || !aid) return
        const i = list.findIndex((s) => s.id === aid)
        select(list[(i + 1) % list.length].id)
        return
      }
      if (e.shiftKey && (e.key === '[' || e.key === '}')) {
        e.preventDefault()
        if (list.length < 2 || !aid) return
        const i = list.findIndex((s) => s.id === aid)
        select(list[(i - 1 + list.length) % list.length].id)
        return
      }
      if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1
        if (idx < list.length) {
          e.preventDefault()
          select(list[idx].id)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, select, toggleMaximize, toggleSearch, initialCwd])
}
