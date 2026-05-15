import { BrandBlock } from './BrandBlock'
import { SurfaceSwitcher } from './SurfaceSwitcher'
import type { TopBarProps } from './topBarTypes'
import { TopBarLocationTrail } from './TopBarLocationTrail'
import { useTopBarLocationTrail } from './useTopBarLocationTrail'
import { WorkspacePill } from './WorkspacePill'

export function TopBar({
  surface,
  onSurfaceChange,
  workspaces,
  activeWorkspace,
  activeWorkspaceSlug,
  onSelectWorkspace,
  loading,
}: TopBarProps) {
  const locationTrail = useTopBarLocationTrail()
  const workspaceName = activeWorkspace?.name ?? null

  return (
    <header className="topbar">
      <div className="topbar-start">
        <BrandBlock surface={surface} workspaceName={workspaceName} />
        {onSelectWorkspace ? (
          <WorkspacePill
            workspaces={workspaces ?? null}
            active={activeWorkspace ?? null}
            activeSlug={activeWorkspaceSlug ?? null}
            onSelect={onSelectWorkspace}
            disabled={loading}
          />
        ) : null}
        <TopBarLocationTrail items={surface === 'cartografia' ? locationTrail : []} />
      </div>
      <SurfaceSwitcher surface={surface} onSurfaceChange={onSurfaceChange} />
    </header>
  )
}
