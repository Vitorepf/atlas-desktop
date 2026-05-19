import { useCallback, useState } from 'react'
import { bridge } from '../../../lib/bridge'

interface UseTerminalActionsArgs {
  activeId: string | null
  displayCwd: string
  activeCwd: string | null
  initialCwd?: string
  searchQuery: string
  open: (cwd: string, label?: string) => string
}

export function useTerminalActions({
  activeId,
  displayCwd,
  activeCwd,
  initialCwd,
  searchQuery,
  open,
}: UseTerminalActionsArgs) {
  const [copyFlash, setCopyFlash] = useState(false)

  const openNewTab = useCallback(() => {
    const hasDisplayCwd = displayCwd && displayCwd !== '—' && displayCwd !== '-'
    const fromCwd = hasDisplayCwd ? displayCwd : activeCwd ?? initialCwd ?? ''
    open(fromCwd)
  }, [activeCwd, displayCwd, initialCwd, open])

  const clearActive = useCallback(() => {
    if (!activeId) return
    window.dispatchEvent(new CustomEvent('atlas-terminal-clear', { detail: { sessionId: activeId } }))
  }, [activeId])

  const interruptActive = useCallback(() => {
    if (!activeId) return
    window.dispatchEvent(new CustomEvent('atlas-terminal-interrupt', { detail: { sessionId: activeId } }))
  }, [activeId])

  const searchActive = useCallback(() => {
    if (!activeId || !searchQuery.trim()) return
    window.dispatchEvent(new CustomEvent('atlas-terminal-search', {
      detail: { sessionId: activeId, query: searchQuery },
    }))
  }, [activeId, searchQuery])

  const copyCwd = useCallback(() => {
    if (!displayCwd || displayCwd === '—') return
    void navigator.clipboard?.writeText(displayCwd).then(() => {
      setCopyFlash(true)
      window.setTimeout(() => setCopyFlash(false), 1200)
    })
  }, [displayCwd])

  const revealCwd = useCallback(() => {
    if (!displayCwd || displayCwd === '—') return
    void bridge.revealInFinder(displayCwd)
  }, [displayCwd])

  return {
    copyFlash,
    openNewTab,
    clearActive,
    interruptActive,
    searchActive,
    copyCwd,
    revealCwd,
  }
}
