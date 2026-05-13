import { useEffect, useMemo, useRef, useState } from 'react'
import { useTerminalStore } from '../../../state/terminalStore'
import { selectSessionRuntime, useTerminalRuntime } from '../../../state/terminalRuntime'
import { useGitBranch } from '../../../hooks/useGitBranch'
import { TerminalSession } from './TerminalSession'
import { TerminalSearchBar } from './TerminalSearchBar'
import { TerminalStatusBar } from './TerminalStatusBar'
import { TerminalToolbar } from './TerminalToolbar'
import { useTerminalActions } from './useTerminalActions'
import { useTerminalDockSizing } from './useTerminalDockSizing'
import { useTerminalShortcuts } from './useTerminalShortcuts'
import { useTerminalStatusView } from './useTerminalStatusView'

interface TerminalTabsProps {
  initialCwd?: string
  ptyMode?: 'unavailable' | 'portable-pty'
}

export function TerminalTabs({ initialCwd, ptyMode }: TerminalTabsProps) {
  const sessions = useTerminalStore((s) => s.sessions)
  const activeId = useTerminalStore((s) => s.activeId)
  const dockHeight = useTerminalStore((s) => s.dockHeight)
  const dockMaximized = useTerminalStore((s) => s.dockMaximized)
  const dockPlacement = useTerminalStore((s) => s.dockPlacement)
  const open = useTerminalStore((s) => s.open)
  const close = useTerminalStore((s) => s.close)
  const select = useTerminalStore((s) => s.select)
  const setHeight = useTerminalStore((s) => s.setHeight)
  const toggleMaximize = useTerminalStore((s) => s.toggleMaximize)
  const togglePlacement = useTerminalStore((s) => s.togglePlacement)
  const hydrateInitial = useTerminalStore((s) => s.hydrateInitial)

  useEffect(() => {
    hydrateInitial(initialCwd ?? '')
  }, [hydrateInitial, initialCwd])

  const active = sessions.find((s) => s.id === activeId) ?? null
  const live = active != null && ptyMode === 'portable-pty'

  const runtimeById = useTerminalRuntime((s) => s.byId)
  const runtime = useMemo(() => selectSessionRuntime(runtimeById, activeId), [runtimeById, activeId])
  const displayCwd = runtime.liveCwd ?? active?.cwd ?? '-'
  const branch = useGitBranch(displayCwd)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [resizeNode, setResizeNode] = useState<HTMLDivElement | null>(null)
  const statusView = useTerminalStatusView(runtime)
  const terminalActions = useTerminalActions({
    activeId,
    displayCwd,
    activeCwd: active?.cwd ?? null,
    initialCwd,
    searchQuery,
    open,
  })

  useTerminalDockSizing({
    resizeNode,
    dockHeight,
    dockMaximized,
    dockPlacement,
    setHeight,
    toggleMaximize,
  })

  useTerminalShortcuts({
    initialCwd,
    open,
    close,
    select,
    toggleMaximize,
    toggleSearch: () => setSearchOpen((v) => !v),
  })

  useEffect(() => {
    if (!searchOpen) return
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [searchOpen])

  return (
    <section className={`terminal-dock terminal-dock-${dockPlacement}${dockMaximized ? ' is-maximized' : ''}`}>
      <div
        ref={setResizeNode}
        className="term-resize-handle"
        aria-label="Redimensionar terminal"
        title="Arraste para subir ou descer o terminal · duplo clique maximiza"
        role="separator"
      />

      <TerminalToolbar
        sessions={sessions}
        activeId={activeId}
        runtimeById={runtimeById}
        displayCwd={displayCwd}
        branch={branch}
        dockPlacement={dockPlacement}
        dockMaximized={dockMaximized}
        copyFlash={terminalActions.copyFlash}
        running={runtime.running}
        onSelect={select}
        onClose={close}
        onOpenNew={terminalActions.openNewTab}
        onToggleSearch={() => setSearchOpen((v) => !v)}
        onClear={terminalActions.clearActive}
        onCopyCwd={terminalActions.copyCwd}
        onRevealCwd={terminalActions.revealCwd}
        onToggleMaximize={toggleMaximize}
        onTogglePlacement={togglePlacement}
        onInterrupt={terminalActions.interruptActive}
      />

      {searchOpen ? (
        <TerminalSearchBar
          query={searchQuery}
          inputRef={searchInputRef}
          onQueryChange={setSearchQuery}
          onSearch={terminalActions.searchActive}
          onClose={() => setSearchOpen(false)}
        />
      ) : null}

      {sessions.length === 0 ? (
        <div className="term-empty">No terminal session.</div>
      ) : (
        sessions.map((s) => (
          <TerminalSession
            key={s.id}
            sessionId={s.id}
            cwd={s.cwd}
            isActive={s.id === activeId}
          />
        ))
      )}

      <TerminalStatusBar
        displayCwd={displayCwd}
        branch={branch}
        running={runtime.running}
        runningFor={statusView.runningFor}
        waitingForPrompt={statusView.waitingForPrompt}
        showReadyState={statusView.showReadyState}
        lastDuration={statusView.lastDuration}
        lastExit={runtime.lastExit}
        ptyMode={ptyMode}
        live={live}
      />
    </section>
  )
}
