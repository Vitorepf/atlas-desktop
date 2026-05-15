import { BrandBlock } from './BrandBlock'
import { SurfaceSwitcher } from './SurfaceSwitcher'
import type { TopBarProps } from './topBarTypes'
import { TopBarLocationTrail } from './TopBarLocationTrail'
import { useTopBarLocationTrail } from './useTopBarLocationTrail'

export function TopBar({
  surface,
  onSurfaceChange,
  terminalVisible,
  onTerminalToggle,
}: TopBarProps) {
  const locationTrail = useTopBarLocationTrail()
  const terminalTitle =
    surface === 'code' ? 'Mostrar ou ocultar terminal · ⌘J' : 'Ir para Code e abrir terminal'

  return (
    <header className="topbar">
      <div className="topbar-start">
        <BrandBlock surface={surface} />
        <TopBarLocationTrail items={surface === 'cartografia' ? locationTrail : []} />
      </div>
      <SurfaceSwitcher surface={surface} onSurfaceChange={onSurfaceChange} />
      <div className="topbar-actions">
        <button
          type="button"
          className={`topbar-terminal-button${terminalVisible ? ' is-active' : ''}`}
          aria-pressed={terminalVisible}
          onClick={onTerminalToggle}
          title={terminalTitle}
        >
          <span className="topbar-terminal-icon" aria-hidden="true" />
          <span className="topbar-terminal-label">Terminal</span>
          <span className="topbar-terminal-shortcut" aria-hidden="true">
            ⌘J
          </span>
        </button>
      </div>
    </header>
  )
}
