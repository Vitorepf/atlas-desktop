import { useEffect, useMemo, useRef, useState } from 'react'
import { TerminalSession } from './TerminalSession'
import { TerminalTab } from './TerminalTab'
import { useTerminalStore, clampHeight } from '../state/terminalStore'
import { selectSessionRuntime, useTerminalRuntime } from '../state/terminalRuntime'
import { useGitBranch } from '../hooks/useGitBranch'
import { bridge } from '../lib/bridge'

interface TerminalTabsProps {
  initialCwd?: string
  ptyMode?: 'unavailable' | 'portable-pty'
}

const MAX_HEIGHT_RATIO = 0.85

function compactPath(path: string): string {
  if (!path || path === '—') return '—'
  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)
  if (path === '/') return '/'
  if (parts.length <= 4) return path
  return `/${parts[0]}/…/${parts.slice(-3).join('/')}`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(1, Math.round(ms))}ms`
  const total = Math.max(0, Math.floor(ms / 1000))
  if (total < 60) return `${total}s`
  const min = Math.floor(total / 60)
  const sec = total % 60
  if (min < 60) return `${min}m ${sec}s`
  const h = Math.floor(min / 60)
  return `${h}h ${min % 60}m`
}

export function TerminalTabs({ initialCwd, ptyMode }: TerminalTabsProps) {
  const sessions = useTerminalStore((s) => s.sessions)
  const activeId = useTerminalStore((s) => s.activeId)
  const dockHeight = useTerminalStore((s) => s.dockHeight)
  const dockMaximized = useTerminalStore((s) => s.dockMaximized)
  const open = useTerminalStore((s) => s.open)
  const close = useTerminalStore((s) => s.close)
  const select = useTerminalStore((s) => s.select)
  const setHeight = useTerminalStore((s) => s.setHeight)
  const toggleMaximize = useTerminalStore((s) => s.toggleMaximize)
  const hydrateInitial = useTerminalStore((s) => s.hydrateInitial)

  useEffect(() => {
    hydrateInitial(initialCwd ?? '')
  }, [hydrateInitial, initialCwd])

  useEffect(() => {
    const root = document.documentElement
    const targetPx = dockMaximized
      ? Math.floor(window.innerHeight * MAX_HEIGHT_RATIO)
      : dockHeight
    root.style.setProperty('--terminal-dock-height', `${targetPx}px`)
    return () => {
      root.style.setProperty('--terminal-dock-height', '260px')
    }
  }, [dockHeight, dockMaximized])

  const resizeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = resizeRef.current
    if (!node) return

    let dragging = false
    let pointerId: number | null = null
    let startY = 0
    let startHeight = 0

    const stopDrag = () => {
      if (!dragging) return
      dragging = false
      pointerId = null
      node.classList.remove('dragging')
      document.body.classList.remove('terminal-resizing')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging || (pointerId != null && e.pointerId !== pointerId)) return
      e.preventDefault()
      const delta = startY - e.clientY
      setHeight(clampHeight(startHeight + delta))
    }

    const onUp = (e: PointerEvent) => {
      if (pointerId != null && e.pointerId !== pointerId) return
      stopDrag()
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      dragging = true
      pointerId = e.pointerId
      startY = e.clientY
      startHeight = useTerminalStore.getState().dockHeight
      node.classList.add('dragging')
      document.body.classList.add('terminal-resizing')
      window.addEventListener('pointermove', onMove, { passive: false })
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    }

    const onDoubleClick = () => {
      toggleMaximize()
    }

    node.addEventListener('pointerdown', onDown)
    node.addEventListener('dblclick', onDoubleClick)
    return () => {
      stopDrag()
      node.removeEventListener('pointerdown', onDown)
      node.removeEventListener('dblclick', onDoubleClick)
    }
  }, [setHeight, toggleMaximize])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || e.ctrlKey || e.altKey) return
      const { sessions: list, activeId: aid } = useTerminalStore.getState()

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        const fromCwd = list.find((s) => s.id === aid)?.cwd ?? initialCwd ?? ''
        open(fromCwd)
        return
      }
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        if (aid) close(aid)
        if (useTerminalStore.getState().sessions.length === 0) {
          open(initialCwd ?? '')
        }
        return
      }
      if (e.key === '\\') {
        e.preventDefault()
        toggleMaximize()
        return
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setSearchOpen((v) => !v)
        return
      }
      if (e.shiftKey && (e.key === ']' || e.key === '{')) {
        e.preventDefault()
        if (list.length < 2 || !aid) return
        const i = list.findIndex((s) => s.id === aid)
        select(list[(i + 1) % list.length].id)
        return
      }
      if (e.shiftKey && (e.key === '[' || e.key === '}')) {
        e.preventDefault()
        if (list.length < 2 || !aid) return
        const i = list.findIndex((s) => s.id === aid)
        select(list[(i - 1 + list.length) % list.length].id)
        return
      }
      if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1
        if (idx < list.length) {
          e.preventDefault()
          select(list[idx].id)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, select, toggleMaximize, initialCwd])

  const active = sessions.find((s) => s.id === activeId) ?? null
  const live = active != null && ptyMode === 'portable-pty'

  const runtimeById = useTerminalRuntime((s) => s.byId)
  const runtime = useMemo(() => selectSessionRuntime(runtimeById, activeId), [runtimeById, activeId])
  const displayCwd = runtime.liveCwd ?? active?.cwd ?? '—'
  const compactCwd = compactPath(displayCwd)
  const branch = useGitBranch(displayCwd)
  const [clock, setClock] = useState(() => Date.now())
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copyFlash, setCopyFlash] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!runtime.running) return
    const id = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [runtime.running])

  useEffect(() => {
    if (!searchOpen) return
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [searchOpen])

  const runningFor = runtime.running && runtime.commandStartedAt
    ? formatDuration(clock - runtime.commandStartedAt)
    : null
  const lastDuration = !runtime.running && runtime.lastDurationMs != null
    ? formatDuration(runtime.lastDurationMs)
    : null
  const completionLabel =
    runtime.lastExit == null ? 'pronto'
    : runtime.lastExit === 0 ? 'concluído'
    : 'falhou'

  const openNewTab = () => {
    const fromCwd = runtime.liveCwd ?? active?.cwd ?? initialCwd ?? ''
    open(fromCwd)
  }

  const clearActive = () => {
    if (!activeId) return
    window.dispatchEvent(new CustomEvent('atlas-terminal-clear', { detail: { sessionId: activeId } }))
  }

  const interruptActive = () => {
    if (!activeId) return
    window.dispatchEvent(new CustomEvent('atlas-terminal-interrupt', { detail: { sessionId: activeId } }))
  }

  const searchActive = () => {
    if (!activeId || !searchQuery.trim()) return
    window.dispatchEvent(new CustomEvent('atlas-terminal-search', {
      detail: { sessionId: activeId, query: searchQuery },
    }))
  }

  const copyCwd = () => {
    if (!displayCwd || displayCwd === '—') return
    void navigator.clipboard?.writeText(displayCwd).then(() => {
      setCopyFlash(true)
      window.setTimeout(() => setCopyFlash(false), 1200)
    })
  }

  const revealCwd = () => {
    if (!displayCwd || displayCwd === '—') return
    void bridge.revealInFinder(displayCwd)
  }

  return (
    <section className="terminal-dock">
      <div
        ref={resizeRef}
        className="term-resize-handle"
        aria-label="Redimensionar terminal"
        title="Arraste para subir ou descer o terminal · duplo clique maximiza"
        role="separator"
      />

      <div className="term-tabs" role="tablist">
        {sessions.map((s) => {
          const rt = selectSessionRuntime(runtimeById, s.id)
          const tail = rt.liveCwd ? rt.liveCwd.replace(/\/+$/, '').split('/').pop() : null
          const label = tail && tail.length > 0 ? tail : s.label
          return (
            <TerminalTab
              key={s.id}
              label={label}
              active={s.id === activeId}
              onSelect={() => select(s.id)}
              onClose={() => close(s.id)}
              closable={sessions.length > 1}
            />
          )
        })}
        <span
          className="term-tab-new"
          role="button"
          aria-label="New terminal tab"
          onClick={openNewTab}
        >
          +
        </span>
        <div className="term-context" title={displayCwd}>
          <span className="term-context-k">pasta</span>
          <span className="term-context-v">{compactCwd}</span>
          {branch ? <span className="term-context-branch">⎇ {branch}</span> : null}
        </div>
        <div className="term-actions" aria-label="Ações do terminal">
          {runtime.running ? (
            <button type="button" className="term-action danger" onClick={interruptActive} title="Interromper comando ativo · Ctrl+C">
              parar
            </button>
          ) : null}
          <button type="button" className="term-action" onClick={openNewTab} title="Nova aba no diretório atual · ⌘T">
            nova
          </button>
          <button type="button" className="term-action" onClick={() => setSearchOpen((v) => !v)} title="Buscar no terminal · ⌘F">
            buscar
          </button>
          <button type="button" className="term-action" onClick={clearActive} title="Limpar terminal">
            limpar
          </button>
          <button type="button" className="term-action" onClick={copyCwd} title="Copiar caminho atual">
            {copyFlash ? 'copiado' : 'copiar'}
          </button>
          <button type="button" className="term-action" onClick={revealCwd} title="Abrir pasta atual no Finder">
            finder
          </button>
          <button type="button" className="term-action primary" onClick={toggleMaximize} title="Maximizar/restaurar terminal · ⌘\\">
            {dockMaximized ? 'restaurar' : 'max'}
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div className="term-searchbar">
          <span className="term-searchbar-label">buscar</span>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                searchActive()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setSearchOpen(false)
              }
            }}
            placeholder="texto no buffer do terminal..."
          />
          <button type="button" className="term-searchbar-action" onClick={searchActive}>
            próximo
          </button>
          <button type="button" className="term-searchbar-action quiet" onClick={() => setSearchOpen(false)}>
            fechar
          </button>
        </div>
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

      <div className="term-status">
        <span className="term-status-cwd" title={displayCwd}>{displayCwd}</span>
        {branch ? <span className="term-status-branch">⎇ {branch}</span> : null}
        {runtime.running ? (
          <span className="term-status-running">executando{runningFor ? ` · ${runningFor}` : ''}</span>
        ) : lastDuration ? (
          <span className={`term-status-exit ${runtime.lastExit == null || runtime.lastExit === 0 ? 'ok' : 'err'}`}>
            {completionLabel}
            {runtime.lastExit != null ? ` · exit ${runtime.lastExit}` : ''}
            {` · ${lastDuration}`}
          </span>
        ) : null}
        <span className={`pty-badge${live ? '' : ' unavailable'}`} style={{ marginLeft: 'auto' }}>
          {live ? 'pty real' : ptyMode === 'unavailable' ? 'pty indisponível' : 'iniciando…'}
        </span>
      </div>
    </section>
  )
}
