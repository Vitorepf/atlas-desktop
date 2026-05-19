import type { Surface } from '../../hooks/useSurface'
import { ATLAS_SURFACES } from '../surfaceRegistry'

interface SurfaceSwitcherProps {
  surface: Surface
  onSurfaceChange: (surface: Surface) => void
  /**
   * Map of `surface.id` → numeric badge (e.g. {atencao: 3}). When a surface
   * is in the badges map AND value > 0, a count chip is rendered next to
   * its label. Surfaces with `null`/undefined badge are unchanged.
   */
  badges?: Partial<Record<Surface, number | null>>
  /**
   * Subset of surfaces enabled for the active Project/Workspace. Surfaces
   * NOT in this list render with a "limited" badge and are still clickable
   * (the operator may want to inspect them) but the badge signals that the
   * current Project does not declare canonical support.
   * Canon: docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
   */
  enabledSurfaces?: string[] | null
}

export function SurfaceSwitcher({ surface, onSurfaceChange, badges, enabledSurfaces }: SurfaceSwitcherProps) {
  return (
    <nav className="surface-switcher" role="tablist" aria-label="Atlas surfaces">
      {ATLAS_SURFACES.map((s) => {
        const badge = badges?.[s.id]
        const hasBadge = typeof badge === 'number' && badge > 0
        const enabled =
          enabledSurfaces === undefined || enabledSurfaces === null
            ? true
            : enabledSurfaces.includes(s.id)
        const limited = !enabled
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={surface === s.id}
            className={`surface-tab${surface === s.id ? ' on' : ''}${hasBadge ? ' has-badge' : ''}${limited ? ' is-limited' : ''}`}
            onClick={() => onSurfaceChange(s.id)}
            title={
              limited
                ? `${s.label} · ${s.shortcut} · não declarada no Projeto ativo (limitado)`
                : hasBadge
                  ? `${s.label} · ${s.shortcut} · ${badge} decisão${badge === 1 ? '' : 'ões'} pendente${badge === 1 ? '' : 's'}`
                  : `${s.label} · ${s.shortcut}`
            }
          >
            <span className="surface-tab-label">{s.label}</span>
            {limited ? (
              <span
                className="surface-tab-limited"
                aria-label="Surface não declarada no Projeto ativo"
                style={{
                  marginLeft: 4,
                  fontSize: 9,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  color: 'var(--cc-text-faint, rgba(255,255,255,0.45))',
                  border: '1px solid var(--cc-border-soft, rgba(255,255,255,0.1))',
                  borderRadius: 2,
                  padding: '0 4px',
                  lineHeight: '12px',
                }}
              >
                lim
              </span>
            ) : null}
            {hasBadge ? (
              <span
                className="surface-tab-badge"
                aria-label={`${badge} item${badge === 1 ? '' : 's'} de atenção`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginLeft: 6,
                  color: 'var(--cc-accent, #d4a85a)',
                  fontFamily: 'var(--cc-font-mono, monospace)',
                  fontSize: 10.5,
                  fontWeight: 540,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: 0,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--cc-accent, #d4a85a)',
                    opacity: 0.7,
                  }}
                />
                {badge > 99 ? '99+' : badge}
              </span>
            ) : null}
            <span className="surface-tab-shortcut">{s.shortcut}</span>
          </button>
        )
      })}
    </nav>
  )
}

