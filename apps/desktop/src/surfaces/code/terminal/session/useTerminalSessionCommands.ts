import { useEffect, type RefObject } from 'react'
import type { UsePtyResult } from '../../../../hooks/usePty'
import type { TermControl } from './sessionTypes'

interface UseTerminalSessionCommandsArgs {
  sessionId: string
  ptyRef: RefObject<UsePtyResult>
  termRef: RefObject<TermControl | null>
}

export function useTerminalSessionCommands({ sessionId, ptyRef, termRef }: UseTerminalSessionCommandsArgs) {
  useEffect(() => {
    const onClear = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId?: string }>).detail
      if (detail?.sessionId && detail.sessionId !== sessionId) return
      termRef.current?.clear()
      void ptyRef.current.write('\x0c')
      termRef.current?.focus()
    }

    const onInterrupt = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId?: string }>).detail
      if (detail?.sessionId && detail.sessionId !== sessionId) return
      void ptyRef.current.write('\x03')
      termRef.current?.focus()
    }

    const onSearch = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId?: string; query?: string }>).detail
      if (detail?.sessionId && detail.sessionId !== sessionId) return
      if (!detail?.query?.trim()) return
      termRef.current?.search(detail.query.trim())
      termRef.current?.focus()
    }

    window.addEventListener('atlas-terminal-clear', onClear)
    window.addEventListener('atlas-terminal-interrupt', onInterrupt)
    window.addEventListener('atlas-terminal-search', onSearch)
    return () => {
      window.removeEventListener('atlas-terminal-clear', onClear)
      window.removeEventListener('atlas-terminal-interrupt', onInterrupt)
      window.removeEventListener('atlas-terminal-search', onSearch)
    }
  }, [ptyRef, sessionId, termRef])
}

