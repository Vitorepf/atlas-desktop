import { useEffect } from 'react'
import { useTerminalStore } from '../../../state/terminalStore'
import { TerminalTabs } from './TerminalTabs'

interface TerminalDockProps {
  initialCwd?: string
  ptyMode?: 'unavailable' | 'portable-pty'
}

/**
 * Terminal boundary for Atlas Code.
 *
 * Work behind this boundary owns command protocol health, dock modes, session
 * inspector, destructive-command guards and evidence emission.
 *
 * Global ⌘J (macOS) / Ctrl+J (Linux/Win) toggles dock visibility. Listener
 * lives here (always mounted) so it works even when the dock is hidden.
 */
export function TerminalDock({ initialCwd, ptyMode }: TerminalDockProps) {
  const toggleDock = useTerminalStore((s) => s.toggleDock)
  const dockVisible = useTerminalStore((s) => s.dockVisible)

  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
    function onKeyDown(e: KeyboardEvent) {
      const modifier = isMac ? e.metaKey : e.ctrlKey
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        toggleDock()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleDock])

  useEffect(() => {
    document.documentElement.classList.toggle('code-terminal-hidden', !dockVisible)
  }, [dockVisible])

  return <TerminalTabs initialCwd={initialCwd} ptyMode={ptyMode} />
}
