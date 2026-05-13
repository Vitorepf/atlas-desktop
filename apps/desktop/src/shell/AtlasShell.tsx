import type { ReactNode } from 'react'
import type { Surface } from '../hooks/useSurface'
import type { TerminalPlacement } from '../state/terminalStore'

interface AtlasShellProps {
  surface: Surface
  terminalPlacement: TerminalPlacement
  children: ReactNode
}

/**
 * Global layout boundary for Atlas Desktop.
 *
 * This component owns the shell class contract consumed by `index.css`.
 * Surfaces can compose regions, but they must not redefine the global grid.
 */
export function AtlasShell({ surface, terminalPlacement, children }: AtlasShellProps) {
  return (
    <div className={`atlas-shell surface-${surface} terminal-${terminalPlacement}`}>
      {children}
    </div>
  )
}
