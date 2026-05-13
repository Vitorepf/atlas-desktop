import { useCallback } from 'react'
import { CartografiaSurface } from './components/cartografia/CartografiaSurface'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LeftRail } from './components/LeftRail'
import { MainStage } from './components/MainStage'
import { ObraBar } from './components/ObraBar'
import { RightRail } from './components/RightRail'
import { TerminalDock } from './components/TerminalDock'
import { TopBar } from './components/TopBar'
import { idlePipeline, noTerminalLines } from './data/empty'
import { useBridge } from './hooks/useBridge'
import { useKernelStatus } from './hooks/useKernelStatus'
import { useSurface } from './hooks/useSurface'

/**
 * Atlas Desktop · single .app, multiple sovereign surfaces.
 *
 * - Code:        cabine onde você dirige o Atlas (programa).
 * - Cartografia: mapa read-only do canon (audita a verdade).
 *
 * Enterprise lifecycle:
 *   atlas-tauri sobe o atlas-server como sidecar (php artisan serve + queue
 *   worker). useKernelStatus polla o status; quando vira 'ready', invocamos
 *   atlas_bridge_reconfigure (Tauri rehidrata AtlasBridge com ATLAS_TOKEN
 *   real) e disparamos useBridge.refresh() pra puxar dados frescos. O
 *   usuário vê tudo acontecer sem abrir terminal.
 *
 * CANON · Atlas Code usa somente dados reais ou estados vazios explícitos.
 *   No invented data. The cockpit renders exactly what the Kernel returns.
 *   When nothing is returned, components show honest empty states.
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

  return (
    <div className={`atlas-shell surface-${surface}`}>
      <TopBar
        mode={b.mode}
        loading={b.loading || b.busy}
        errors={b.errors}
        surface={surface}
        onSurfaceChange={setSurface}
        kernel={kernel}
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
            stages={idlePipeline}
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
              busy={b.busy}
              onSignReceipt={b.signReceipt}
              onRunGate={b.runGate}
            />
          </ErrorBoundary>
          <TerminalDock lines={noTerminalLines} ptyMode={b.core.pty} cwd={b.core.workspacePath} />
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
