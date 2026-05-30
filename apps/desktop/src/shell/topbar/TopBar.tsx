import { BrandBlock } from './BrandBlock'
import { SurfaceSwitcher } from './SurfaceSwitcher'
import type { TopBarProps } from './topBarTypes'
import { TopBarLocationTrail } from './TopBarLocationTrail'
import { useTopBarLocationTrail } from './useTopBarLocationTrail'
import { WorkspacePill } from './WorkspacePill'

export function TopBar({
  surface,
  workspaces,
  activeWorkspace,
  activeWorkspaceSlug,
  onSurfaceChange,
  onSelectWorkspace,
  onOpenWorkspaceProfile,
  loading,
}: TopBarProps) {
  const locationTrail = useTopBarLocationTrail()
  const workspaceName = activeWorkspace?.name ?? null

  return (
    <header className="topbar">
      <div className="topbar-start">
        <BrandBlock
          surface={surface}
          workspaceName={workspaceName}
          onOpenWorkspaceProfile={onOpenWorkspaceProfile}
        />
        {onSurfaceChange ? (
          <SurfaceSwitcher
            surface={surface}
            onSurfaceChange={onSurfaceChange}
            enabledSurfaces={activeWorkspace?.surfacesEnabled ?? null}
          />
        ) : null}
        {onSelectWorkspace ? (
          <WorkspacePill
            workspaces={workspaces ?? null}
            active={activeWorkspace ?? null}
            activeSlug={activeWorkspaceSlug ?? null}
            onSelect={onSelectWorkspace}
            disabled={loading}
            onOpenProfile={onOpenWorkspaceProfile}
          />
        ) : null}
        <TopBarLocationTrail items={surface === 'cartografia' ? locationTrail : []} />
      </div>
    </header>
  )
}
