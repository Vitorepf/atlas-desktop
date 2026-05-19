import type { Terminal } from '@xterm/xterm'
import type { RefObject } from 'react'

export interface TerminalPaintScheduler {
  schedule: (delayMs?: number) => void
  clear: () => void
}

export function createTerminalPaintScheduler(
  term: Terminal,
  isActiveRef: RefObject<boolean>,
  isDisposed: () => boolean,
): TerminalPaintScheduler {
  const timers: number[] = []

  return {
    schedule: (delayMs = 0) => {
      const timer = window.setTimeout(() => {
        if (isDisposed()) return
        try { term.scrollToBottom() } catch { /* renderer not ready */ }
        try { term.refresh(0, term.rows - 1) } catch { /* renderer not ready */ }
        if (isActiveRef.current) {
          try { term.focus() } catch { /* focus best-effort */ }
        }
      }, delayMs)
      timers.push(timer)
    },
    clear: () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.length = 0
    },
  }
}

