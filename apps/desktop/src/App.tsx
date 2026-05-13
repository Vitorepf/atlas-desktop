import { ErrorBoundary } from './components/ErrorBoundary'
import { LeftRail } from './components/LeftRail'
import { MainStage } from './components/MainStage'
import { ObraBar } from './components/ObraBar'
import { RightRail } from './components/RightRail'
import { TerminalDock } from './components/TerminalDock'
import { TopBar } from './components/TopBar'
import { idlePipeline, noTerminalLines } from './data/mock'
import { useBridge } from './hooks/useBridge'

/**
 * Atlas Code · cabine operacional visual do Kernel Atlas.
 *
 * CANON · feedback_atlas_no_mock.md
 *   No invented data. The cockpit renders exactly what the Kernel returns.
 *   When nothing is returned, components show honest empty states.
 *
 * Interactive: composer → bridge.sendIntent, ObraBar → bridge.createObra,
 * sidebar → bridge.selectObra, RightRail → bridge.signReceipt + runGate.
 */
function App() {
  const b = useBridge()

  return (
    <div className="atlas-shell">
      <TopBar mode={b.mode} loading={b.loading || b.busy} errors={b.errors} />
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
    </div>
  )
}

export default App
