import { useCallback } from 'react'
import { TopBar } from './components/TopBar'
import { useBoot } from './hooks/useBoot'
import { useBridge } from './hooks/useBridge'
import { useKernelStatus } from './hooks/useKernelStatus'
import { useMcpStatus } from './hooks/useMcpStatus'
import { useSurface } from './hooks/useSurface'
import { AtlasShell } from './shell/AtlasShell'
import { SurfaceHost } from './shell/SurfaceHost'
import { TopBarLocationTrailProvider } from './shell/topbar/TopBarLocationTrailProvider'
import { useTerminalStore } from './state/terminalStore'

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

  return (
    <TopBarLocationTrailProvider>
      <AtlasShell surface={surface} terminalPlacement={terminalPlacement}>
        <TopBar
          mode={b.mode}
          loading={b.loading || b.busy}
          errors={b.errors}
          surface={surface}
          onSurfaceChange={setSurface}
          kernel={kernel}
          mcp={mcp}
        />

        <SurfaceHost surface={surface} bridge={b} boot={boot} />
      </AtlasShell>
    </TopBarLocationTrailProvider>
  )
}

export default App
