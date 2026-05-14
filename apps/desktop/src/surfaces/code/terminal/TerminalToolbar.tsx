import { TerminalTab } from './TerminalTab'
import type { TerminalPlacement, TerminalTabState } from '../../../state/terminalStore'
import type { SessionRuntime } from '../../../state/terminalRuntime'
import { compactPath, terminalTabLabel } from './terminalFormat'

interface TerminalToolbarProps {
  sessions: TerminalTabState[]
  activeId: string | null
  runtimeById: Record<string, SessionRuntime>
  displayCwd: string
  branch: string | null
  dockPlacement: TerminalPlacement
  dockMaximized: boolean
  copyFlash: boolean
  running: boolean
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onOpenNew: () => void
  onToggleSearch: () => void
  onClear: () => void
  onCopyCwd: () => void
  onRevealCwd: () => void
  onToggleMaximize: () => void
  onTogglePlacement: () => void
  onInterrupt: () => void
  onCloseDock: () => void
}

export function TerminalToolbar({
  sessions,
  activeId,
  runtimeById,
  displayCwd,
  branch,
  dockPlacement,
  dockMaximized,
  copyFlash,
  running,
  onSelect,
  onClose,
  onOpenNew,
  onToggleSearch,
  onClear,
  onCopyCwd,
  onRevealCwd,
  onToggleMaximize,
  onTogglePlacement,
  onInterrupt,
  onCloseDock,
}: TerminalToolbarProps) {
  return (
    <div className="term-tabs" role="tablist">
      {sessions.map((s) => (
        <TerminalTab
          key={s.id}
          label={terminalTabLabel(runtimeById[s.id]?.liveCwd, s.label)}
          active={s.id === activeId}
          onSelect={() => onSelect(s.id)}
          onClose={() => onClose(s.id)}
          closable={sessions.length > 1}
        />
      ))}
      <span
        className="term-tab-new"
        role="button"
        aria-label="New terminal tab"
        onClick={onOpenNew}
      >
        +
      </span>
      <div className="term-context" title={displayCwd}>
        <span className="term-context-k">pasta</span>
        <span className="term-context-v">{compactPath(displayCwd)}</span>
        {branch ? <span className="term-context-branch">⎇ {branch}</span> : null}
      </div>
      <div className="term-actions" aria-label="Ações do terminal">
        {running ? (
          <button type="button" className="term-action danger" onClick={onInterrupt} title="Interromper comando ativo · Ctrl+C">
            parar
          </button>
        ) : null}
        <button type="button" className="term-action" onClick={onOpenNew} title="Nova aba no diretório atual · ⌘T">
          nova
        </button>
        <button type="button" className="term-action" onClick={onToggleSearch} title="Buscar no terminal · ⌘F">
          buscar
        </button>
        <button type="button" className="term-action" onClick={onClear} title="Limpar terminal">
          limpar
        </button>
        <button type="button" className="term-action" onClick={onCopyCwd} title="Copiar caminho atual">
          {copyFlash ? 'copiado' : 'copiar'}
        </button>
        <button type="button" className="term-action" onClick={onRevealCwd} title="Abrir pasta atual no Finder">
          finder
        </button>
        <button type="button" className="term-action primary" onClick={onToggleMaximize} title="Maximizar/restaurar terminal · ⌘\\">
          {dockMaximized ? 'restaurar' : 'max'}
        </button>
        <button
          type="button"
          className="term-action icon"
          onClick={onTogglePlacement}
          title={dockPlacement === 'bottom'
            ? 'Dockar terminal abaixo da coluna direita'
            : 'Voltar terminal para o rodapé'}
          aria-label={dockPlacement === 'bottom'
            ? 'Dockar terminal abaixo da coluna direita'
            : 'Voltar terminal para o rodapé'}
        >
          <span
            className={`term-dock-icon ${dockPlacement === 'bottom' ? 'to-right-bottom' : 'to-bottom'}`}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          className="term-action icon term-close-dock"
          onClick={onCloseDock}
          title="Fechar terminal · ⌘J reabre"
          aria-label="Fechar terminal"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none">
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
