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
 */
export function TerminalDock({ initialCwd, ptyMode }: TerminalDockProps) {
  return <TerminalTabs initialCwd={initialCwd} ptyMode={ptyMode} />
}
