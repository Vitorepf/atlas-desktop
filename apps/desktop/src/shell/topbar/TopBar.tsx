import { BrandBlock } from './BrandBlock'
import { SurfaceSwitcher } from './SurfaceSwitcher'
import type { TopBarProps } from './topBarTypes'
import { TopBarLocationTrail } from './TopBarLocationTrail'
import { useTopBarLocationTrail } from './useTopBarLocationTrail'

/**
 * TopBar · pure product mark.
 * Operational diagnostics belong inside the right rail, not in the global brand.
 */
export function TopBar({ surface, onSurfaceChange }: TopBarProps) {
  const locationTrail = useTopBarLocationTrail()

  return (
    <header className="topbar">
      <div className="topbar-start">
        <BrandBlock surface={surface} />
        <TopBarLocationTrail items={surface === 'cartografia' ? locationTrail : []} />
      </div>
      <SurfaceSwitcher surface={surface} onSurfaceChange={onSurfaceChange} />
      <div className="topbar-spacer" aria-hidden="true" />
    </header>
  )
}
