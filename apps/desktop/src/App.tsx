import { lazy, Suspense, useCallback, useEffect } from 'react'
import { TopBar } from './components/TopBar'
import { useBoot } from './hooks/useBoot'
import { useBridge } from './hooks/useBridge'
import { useKernelStatus } from './hooks/useKernelStatus'
import { useMcpStatus } from './hooks/useMcpStatus'
import { useSurface } from './hooks/useSurface'
import { useProjectProfile } from './shared/projectProfile/useProjectProfile'
import { AtlasShell } from './shell/AtlasShell'
import { SurfaceHost } from './shell/SurfaceHost'
import { TopBarLocationTrailProvider } from './shell/topbar/TopBarLocationTrailProvider'
import { useNativeMenuEvents } from './shell/useNativeMenuEvents'
import { useTerminalStore } from './state/terminalStore'

const ProjectProfileSheet = lazy(() =>
  import('./shared/projectProfile/ProjectProfileSheet').then((mod) => ({ default: mod.ProjectProfileSheet })),
)

/**
 * Atlas Desktop · single .app, multiple sovereign surfaces.
 *
 * - Code:        cabine onde você dirige o Atlas (programa).
 * - Cartografia: mapa read-only do canon (audita a verdade).
 *
 * Lifecycle:
 *   atlas-tauri sobe atlas-server como sidecar (php artisan serve + queue
 *   worker). useKernelStatus polla até `ready` (com retry+diagnóstico),
 *   onReady chama atlas_bridge_reconfigure (rehidrata AtlasBridge com
 *   ATLAS_TOKEN real) e dispara useBridge.refresh() pra puxar dados frescos.
 */
function App() {
  const { surface, setSurface } = useSurface()
  const b = useBridge()
  const terminalPlacement = useTerminalStore((s) => s.dockPlacement)
  const openTerminalDock = useTerminalStore((s) => s.openDock)
  const toggleTerminalDock = useTerminalStore((s) => s.toggleDock)

  useNativeMenuEvents(surface, setSurface)

  const onTerminalToggle = useCallback(() => {
    if (surface !== 'code') {
      setSurface('code')
      openTerminalDock()
      return
    }
    toggleTerminalDock()
  }, [openTerminalDock, setSurface, surface, toggleTerminalDock])

  useEffect(() => {
    if (surface === 'code') return

    const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
    function onKeyDown(e: KeyboardEvent) {
      const modifier = isMac ? e.metaKey : e.ctrlKey
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        onTerminalToggle()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onTerminalToggle, surface])

  const onKernelReady = useCallback(() => {
    void (async () => {
      try {
        const tauri = await import('@tauri-apps/api/core')
        await tauri.invoke('atlas_bridge_reconfigure')
      } catch {
        /* http/offline mode · nothing to reconfigure */
      }
      void b.refresh()
    })()
  }, [b])

  const kernel = useKernelStatus({ onReady: onKernelReady })
  const { boot } = useBoot(kernel.status === 'ready' || b.mode !== 'tauri')
  const { mcp } = useMcpStatus(kernel.status === 'ready' || b.mode !== 'tauri')

  // Project Profile Sheet · Cmd+Shift+P opens; reachable from WorkspacePill
  // and any future surface that needs to inspect the active Project profile.
  // Canon: docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
  const projectProfile = useProjectProfile()

  return (
    <TopBarLocationTrailProvider>
      <AtlasShell surface={surface} terminalPlacement={terminalPlacement}>
        <TopBar
          mode={b.mode}
          loading={b.loading || b.busy}
          errors={b.errors}
          surface={surface}
          kernel={kernel}
          mcp={mcp}
          workspaces={b.workspaces}
          activeWorkspace={b.activeWorkspace}
          activeWorkspaceSlug={b.activeWorkspaceSlug}
          onSurfaceChange={setSurface}
          onSelectWorkspace={b.setActiveWorkspaceSlug}
          onOpenWorkspaceProfile={projectProfile.show}
        />

        <SurfaceHost
          surface={surface}
          bridge={b}
          boot={boot}
          onSurfaceChange={setSurface}
          onOpenWorkspaceProfile={(mode) => projectProfile.show(mode ?? 'view')}
        />

        {projectProfile.open ? (
          <Suspense fallback={null}>
            <ProjectProfileSheet
              open={projectProfile.open}
              initialMode={projectProfile.mode}
              onClose={projectProfile.hide}
              workspaces={b.workspaces}
              active={b.activeWorkspace}
              activeSlug={b.activeWorkspaceSlug ?? null}
              onSelect={b.setActiveWorkspaceSlug}
              onCreate={b.createWorkspaceProfile}
              onUpdate={b.updateWorkspaceProfile}
              onArchive={b.archiveWorkspaceProfile}
              onPickWorkspaceFolder={b.pickWorkspaceFolder}
            />
          </Suspense>
        ) : null}
      </AtlasShell>
    </TopBarLocationTrailProvider>
  )
}

export default App
