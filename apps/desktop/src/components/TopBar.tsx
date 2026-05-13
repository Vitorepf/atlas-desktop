import type { BridgeMode } from '../lib/bridge'
import type { Surface } from '../hooks/useSurface'

interface TopBarProps {
  mode: BridgeMode
  loading: boolean
  errors: string[]
  surface: Surface
  onSurfaceChange: (s: Surface) => void
}

interface SurfaceTab {
  id: Surface
  label: string
  shortcut: string
  sub: string
}

const SURFACES: SurfaceTab[] = [
  { id: 'code', label: 'Code', shortcut: '⌘1', sub: 'cabine de programação' },
  { id: 'cartografia', label: 'Cartografia', shortcut: '⌘2', sub: 'mapa da verdade canônica' },
]

/**
 * TopBar · brand + surface switcher + bridge badge + folio.
 *
 * Atlas Desktop is a single .app with multiple sovereign surfaces — Code
 * (cabine que dirige Atlas) and Cartografia (mapa do canon). Cmd+1/Cmd+2
 * navega entre elas; sessionStorage preserva escolha após reload.
 */
export function TopBar({ mode, loading, errors, surface, onSurfaceChange }: TopBarProps) {
  const errorTitle =
    errors.length > 0 ? `Bridge errors:\n${errors.join('\n')}` : `bridge dispatch: ${mode}`

  const active = SURFACES.find((s) => s.id === surface) ?? SURFACES[0]!

  return (
    <header className="topbar">
      <div className="brand">
        <strong>Atlas · Desktop</strong>
        <span className="v">mvp</span>
        <span className="sub">{active.sub}</span>
      </div>

      <nav className="surface-switcher" role="tablist" aria-label="Atlas surfaces">
        {SURFACES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={surface === s.id}
            className={`surface-tab${surface === s.id ? ' on' : ''}`}
            onClick={() => onSurfaceChange(s.id)}
            title={`${s.label} · ${s.shortcut}`}
          >
            <span className="surface-tab-label">{s.label}</span>
            <span className="surface-tab-shortcut">{s.shortcut}</span>
          </button>
        ))}
      </nav>

      <div className="topbar-meta">
        <span
          className={`v bridge-mode bridge-mode-${mode}${errors.length > 0 ? ' bridge-mode-degraded' : ''}`}
          title={errorTitle}
        >
          bridge · {mode}
          {loading ? ' · loading' : ''}
          {errors.length > 0 ? ` · ${errors.length} offline` : ''}
        </span>
        <div className="folio">
          <span className="live" />
          atlas desktop · v0.1.0
        </div>
      </div>
    </header>
  )
}
