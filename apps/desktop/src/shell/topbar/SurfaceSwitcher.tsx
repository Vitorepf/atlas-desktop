import type { Surface } from '../../hooks/useSurface'
import { ATLAS_SURFACES } from '../surfaceRegistry'

interface SurfaceSwitcherProps {
  surface: Surface
  onSurfaceChange: (surface: Surface) => void
}

export function SurfaceSwitcher({ surface, onSurfaceChange }: SurfaceSwitcherProps) {
  return (
    <nav className="surface-switcher" role="tablist" aria-label="Atlas surfaces">
      {ATLAS_SURFACES.map((s) => (
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
  )
}

