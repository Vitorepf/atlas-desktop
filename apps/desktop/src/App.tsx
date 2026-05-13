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
 * The shell is layout-only. All payloads come from `useBridge()` which
 * dispatches to Tauri (in the desktop app), HTTP (browser fallback against
 * atlas-server) or — when both are unreachable — empty defaults from
 * data/mock.ts (which contains ZERO fake records, only neutral sentinels).
 */
function App() {
  const snap = useBridge()

  return (
    <div className="atlas-shell">
      <TopBar mode={snap.mode} loading={snap.loading} errors={snap.errors} />
      <ObraBar obra={snap.obra} />
      <LeftRail active={snap.active} recent={snap.recent} loading={snap.loading} />
      <MainStage
        stages={idlePipeline}
        messages={snap.messages}
        receiptHash={snap.receipt?.id ?? ''}
        loading={snap.loading}
      />
      <RightRail receipt={snap.receipt} gates={snap.gates} core={snap.core} />
      <TerminalDock lines={noTerminalLines} ptyMode={snap.core.pty} cwd={snap.core.workspacePath} />
    </div>
  )
}

export default App
