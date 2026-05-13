import type { FitAddon } from '@xterm/addon-fit'
import type { Terminal } from '@xterm/xterm'
import type { RefObject } from 'react'
import type { UsePtyResult } from '../../../../hooks/usePty'

export function attachTerminalResizeObserver(
  container: HTMLElement,
  term: Terminal,
  fit: FitAddon,
  ptyRef: RefObject<UsePtyResult>,
): ResizeObserver {
  const resizeObserver = new ResizeObserver(() => {
    try {
      fit.fit()
      void ptyRef.current.resize(term.cols, term.rows)
    } catch {
      /* xterm may be between mount/layout phases */
    }
  })
  resizeObserver.observe(container)
  return resizeObserver
}

