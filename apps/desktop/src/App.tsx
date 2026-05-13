import { useCallback } from 'react'
import { CartografiaSurface } from './components/cartografia/CartografiaSurface'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LeftRail } from './components/LeftRail'
import { MainStage } from './components/MainStage'
import { ObraBar } from './components/ObraBar'
import { RightRail } from './components/RightRail'
import { TerminalTabs } from './components/TerminalTabs'
import { TopBar } from './components/TopBar'
import { useBoot } from './hooks/useBoot'
import { useBridge } from './hooks/useBridge'
import { useKernelStatus } from './hooks/useKernelStatus'
import { useMcpStatus } from './hooks/useMcpStatus'
import { useSurface } from './hooks/useSurface'

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
    <div className={`atlas-shell surface-${surface}`}>
      <TopBar
        mode={b.mode}
        loading={b.loading || b.busy}
        errors={b.errors}
        surface={surface}
        onSurfaceChange={setSurface}
        kernel={kernel}
        mcp={mcp}
      />

      {surface === 'code' ? (
        <>
          <ObraBar obra={b.obra} onCreate={b.createObra} busy={b.busy} />
          <LeftRail
            obras={b.obras}
            activeObraId={b.obra?.id ?? null}
            active={b.active}
            recent={b.recent}
            loading={b.loading}
            busy={b.busy}
            onSelectObra={b.selectObra}
          />
          <MainStage
            stages={b.sdd}
            messages={b.messages}
            receiptHash={b.receipt?.id ?? ''}
            loading={b.loading}
            busy={b.busy}
            hasObra={!!b.obra}
            onSend={b.sendIntent}
          />
          <ErrorBoundary label="RightRail">
            <RightRail
              receipt={b.receipt}
              gates={b.gates}
              core={b.core}
              evidence={b.evidence}
              boot={boot}
              busy={b.busy}
              onSignReceipt={b.signReceipt}
              onRunGate={b.runGate}
            />
          </ErrorBoundary>
          <TerminalTabs initialCwd={b.core.workspacePath} ptyMode={b.core.pty} />
        </>
      ) : (
        <ErrorBoundary label="Cartografia">
          <CartografiaSurface />
        </ErrorBoundary>
      )}
    </div>
  )
}

export default App
