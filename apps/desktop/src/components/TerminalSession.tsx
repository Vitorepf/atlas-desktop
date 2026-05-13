import { useEffect, useRef, useState } from 'react'
import { usePty } from '../hooks/usePty'
import { atlasTerminalTheme, loadFontReady } from '../lib/terminalTheme'
import { bridge } from '../lib/bridge'
import { registerOscHandlers } from '../lib/oscParser'
import { useTerminalRuntime } from '../state/terminalRuntime'

interface TerminalSessionProps {
  sessionId: string
  cwd: string
  isActive: boolean
  onSpawn?: (info: { ptyId: string; shell: string; cwd: string }) => void
}

interface TermControl {
  fit: () => void
  focus: () => void
  search: (query: string) => void
  clear: () => void
  dispose: () => void
  write: (data: string) => void
}

export function TerminalSession({ sessionId, cwd, isActive, onSpawn }: TerminalSessionProps) {
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
  }, [sessionId])

  useEffect(() => {
    if (!containerRef.current || !pty.available) return
    let disposed = false
    let resizeObserver: ResizeObserver | null = null

    void (async () => {
      await loadFontReady()
      const [xtermMod, fitMod, searchMod, linksMod, unicodeMod] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-search'),
        import('@xterm/addon-web-links'),
        import('@xterm/addon-unicode11'),
      ])
      await import('@xterm/xterm/css/xterm.css')

      if (disposed || !containerRef.current) return

      const atlasTheme = atlasTerminalTheme()
      const term = new xtermMod.Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontFamily: '"MesloLGS Nerd Font Mono", "MesloLGM Nerd Font Mono", "JetBrains Mono", ui-monospace, Menlo, monospace',
        fontSize: 12,
        lineHeight: 1.22,
        theme: atlasTheme,
        scrollback: 8000,
        allowProposedApi: true,
        macOptionIsMeta: true,
        macOptionClickForcesSelection: true,
        rightClickSelectsWord: true,
        smoothScrollDuration: 80,
      })

      const fit = new fitMod.FitAddon()
      term.loadAddon(fit)

      const unicode = new unicodeMod.Unicode11Addon()
      term.loadAddon(unicode)
      term.unicode.activeVersion = '11'

      const links = new linksMod.WebLinksAddon((event, uri) => {
        event.preventDefault()
        void bridge.openExternal(uri)
      })
      term.loadAddon(links)

      const search = new searchMod.SearchAddon()
      term.loadAddon(search)

      term.open(containerRef.current)
      term.options.theme = atlasTheme

      const oscOff = registerOscHandlers(term, {
        onCwd: (liveCwd) => useTerminalRuntime.getState().setCwd(sessionId, liveCwd),
        onMark: (mark, exit) => {
          const rt = useTerminalRuntime.getState()
          if (mark === 'A') rt.markPromptStart(sessionId)
          else if (mark === 'C') rt.markCommandStart(sessionId)
          else if (mark === 'D') rt.markExit(sessionId, exit)
        },
      })

      try { fit.fit() } catch { /* mid-mount */ }
      try { term.refresh(0, term.rows - 1) } catch { /* renderer not ready */ }

      term.onData((data) => {
        void ptyRef.current.write(data)
      })

      resizeObserver = new ResizeObserver(() => {
        try {
          fit.fit()
          void ptyRef.current.resize(term.cols, term.rows)
        } catch { /* ignore */ }
      })
      resizeObserver.observe(containerRef.current)

      termRef.current = {
        fit: () => { try { fit.fit() } catch { /* */ } },
        focus: () => term.focus(),
        search: (q: string) => { search.findNext(q, { incremental: false, caseSensitive: false }) },
        clear: () => {
          try { term.clear() } catch { /* */ }
        },
        write: (data: string) => term.write(data),
        dispose: () => {
          try { oscOff() } catch { /* */ }
          try { term.dispose() } catch { /* */ }
        },
      }

      const spawned = await ptyRef.current.open()
      if (!spawned) {
        setLocalError(ptyRef.current.lastError ?? 'Falha ao abrir PTY.')
        term.writeln('\x1b[31m[atlas] falha ao abrir PTY.\x1b[0m')
        return
      }

      setLocalError(null)
      setOpened(true)
      useTerminalRuntime.getState().setCwd(sessionId, spawned.cwd)
      if (spawned && onSpawn) {
        onSpawn({ ptyId: spawned.id, shell: spawned.shell, cwd: spawned.cwd })
      }
      if (isActiveRef.current) {
        try { term.focus() } catch { /* focus best-effort */ }
      }
      void ptyRef.current.resize(term.cols, term.rows)
    })()

    return () => {
      disposed = true
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
    const t = setTimeout(() => {
      termRef.current?.fit()
      termRef.current?.focus()
    }, 0)
    return () => clearTimeout(t)
  }, [isActive, opened])

  if (!pty.available) {
    return (
      <div className="term-empty" data-session={sessionId} hidden={!isActive}>
        PTY disponível somente dentro do Atlas Code .app (modo Tauri).
        {pty.lastError ? <div className="term-empty-error">· {pty.lastError}</div> : null}
      </div>
    )
  }

  const error = localError ?? pty.lastError

  return (
    <div
      ref={containerRef}
      className={`term-body atlas-xterm-terminal ${error ? ' has-error' : ''}`}
      data-session={sessionId}
      data-error={error ?? undefined}
      onMouseDown={() => termRef.current?.focus()}
      onClick={() => termRef.current?.focus()}
      style={{ display: isActive ? 'block' : 'none' }}
    />
  )
}
