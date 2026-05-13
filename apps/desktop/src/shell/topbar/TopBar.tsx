import { BrandBlock } from './BrandBlock'
import { SurfaceSwitcher } from './SurfaceSwitcher'
import type { TopBarProps } from './topBarTypes'

/**
 * TopBar · pure product mark.
 * Operational diagnostics belong inside the right rail, not in the global brand.
 */
export function TopBar({ surface, onSurfaceChange }: TopBarProps) {
  return (
    <header className="topbar">
      <BrandBlock surface={surface} />
      <SurfaceSwitcher surface={surface} onSurfaceChange={onSurfaceChange} />
      <div className="topbar-spacer" aria-hidden="true" />
    </header>
  )
}
