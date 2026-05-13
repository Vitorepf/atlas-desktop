import { useEffect, useRef, useState } from 'react'
import { usePty } from '../../../../hooks/usePty'
import { useTerminalRuntime } from '../../../../state/terminalRuntime'
import type { TerminalSessionProps, TermControl } from './sessionTypes'
import { useTerminalSessionCommands } from './useTerminalSessionCommands'
import { createTerminalPaintScheduler } from './terminalPaint'
import { attachTerminalPromptProtocol } from './terminalPromptProtocol'
import { openAtlasXterm } from './openAtlasXterm'
import { attachTerminalResizeObserver } from './terminalResize'
import { createTermControl } from './terminalControl'

export function useAtlasTerminalSession({ sessionId, cwd, isActive, onSpawn }: TerminalSessionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<TermControl | null>(null)
  const isActiveRef = useRef(isActive)
  const [opened, setOpened] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const pty = usePty({
    id: sessionId,
    cwd,
    cols: 120,
    rows: 36,
    onData: (data) => {
      termRef.current?.write(data)
    },
    onExit: () => {
      termRef.current?.write('\r\n\x1b[2;3m[atlas] PTY encerrado.\x1b[0m\r\n')
    },
  })

  const ptyRef = useRef(pty)
  useEffect(() => {
    ptyRef.current = pty
  }, [pty])

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  useTerminalSessionCommands({ sessionId, ptyRef, termRef })

  useEffect(() => {
    if (!containerRef.current || !pty.available) return
    let disposed = false
    let resizeObserver: ResizeObserver | null = null
    let paintScheduler: ReturnType<typeof createTerminalPaintScheduler> | null = null

    void (async () => {
      if (disposed || !containerRef.current) return

      const xterm = await openAtlasXterm(containerRef.current, () => disposed)
      if (!xterm) return
      const { term, fit, search } = xterm

      paintScheduler = createTerminalPaintScheduler(term, isActiveRef, () => disposed)

      const oscOff = attachTerminalPromptProtocol({
        term,
        sessionId,
        schedulePromptPaint: paintScheduler.schedule,
      })

      try { fit.fit() } catch { /* mid-mount */ }
      try { term.refresh(0, term.rows - 1) } catch { /* renderer not ready */ }

      term.onData((data) => {
        void ptyRef.current.write(data)
      })

      resizeObserver = attachTerminalResizeObserver(containerRef.current, term, fit, ptyRef)
      termRef.current = createTermControl({ term, fit, search, disposeProtocol: oscOff })

      const spawned = await ptyRef.current.open()
      if (!spawned) {
        setLocalError(ptyRef.current.lastError ?? 'Falha ao abrir PTY.')
        term.writeln('\x1b[31m[atlas] falha ao abrir PTY.\x1b[0m')
        return
      }

      setLocalError(null)
      setOpened(true)
      useTerminalRuntime.getState().setCwd(sessionId, spawned.cwd)
      if (onSpawn) {
        onSpawn({ ptyId: spawned.id, shell: spawned.shell, cwd: spawned.cwd })
      }
      if (isActiveRef.current) {
        try { term.focus() } catch { /* focus best-effort */ }
      }
      void ptyRef.current.resize(term.cols, term.rows)
    })()

    return () => {
      disposed = true
      paintScheduler?.clear()
      if (resizeObserver) resizeObserver.disconnect()
      if (termRef.current) {
        termRef.current.dispose()
        termRef.current = null
      }
      void ptyRef.current.close()
      useTerminalRuntime.getState().forget(sessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pty.available, sessionId])

  useEffect(() => {
    if (!isActive || !termRef.current) return
    const timer = setTimeout(() => {
      termRef.current?.fit()
      termRef.current?.focus()
    }, 0)
    return () => clearTimeout(timer)
  }, [isActive, opened])

  return {
    available: pty.available,
    containerRef,
    error: localError ?? pty.lastError,
    lastError: pty.lastError,
    focus: () => termRef.current?.focus(),
  }
}

