import { LeftRail } from './components/LeftRail'
import { MainStage } from './components/MainStage'
import { ObraBar } from './components/ObraBar'
import { RightRail } from './components/RightRail'
import { TerminalDock } from './components/TerminalDock'
import { TopBar } from './components/TopBar'
import { terminalLines } from './data/mock'
import { useBridge } from './hooks/useBridge'

/**
 * Atlas Code · cabine operacional visual do Kernel Atlas.
 *
 * The shell is layout-only. All payloads come from `useBridge()` which
 * dispatches to Tauri (in the desktop app), HTTP (browser fallback against
 * atlas-server) or mock (zero-config dev). Components never reach data
 * directly — the bridge is the single boundary.
 */
function App() {
  const snap = useBridge()

  return (
    <div className="atlas-shell">
      <TopBar mode={snap.mode} />
      <ObraBar obra={snap.obra} />
      <LeftRail active={snap.active} recent={snap.recent} />
      <MainStage stages={defaultStages} messages={snap.messages} receiptHash={snap.receipt.id.slice(0, 6)} />
      <RightRail receipt={snap.receipt} gates={snap.gates} core={snap.core} />
      <TerminalDock lines={terminalLines} ptyMode={snap.core.pty} cwd={snap.core.workspacePath} />
    </div>
  )
}

// SDD pipeline state is part of the conversation stream — when the bridge
// starts emitting `sdd_pipeline` events we'll derive this from the stream.
// For the layout MVP it stays static.
const defaultStages = [
  { id: 'context' as const, label: 'Context', state: 'done' as const },
  { id: 'spec' as const, label: 'Spec', state: 'done' as const },
  { id: 'plan' as const, label: 'Plan', state: 'done' as const },
  { id: 'execute' as const, label: 'Execute', state: 'now' as const },
  { id: 'verify' as const, label: 'Verify', state: 'todo' as const },
]

export default App
