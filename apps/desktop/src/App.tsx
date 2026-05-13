import { useEffect, useState } from 'react'
import { LeftRail } from './components/LeftRail'
import { MainStage } from './components/MainStage'
import { ObraBar } from './components/ObraBar'
import { RightRail } from './components/RightRail'
import { TerminalDock } from './components/TerminalDock'
import { TopBar } from './components/TopBar'
import {
  coreStatus as coreStatusFallback,
  gates,
  messages,
  obra,
  recentSessions,
  receipt,
  sddStages,
  sessions,
  terminalLines,
} from './data/mock'
import { getCoreStatus } from './hooks/useAtlasCore'
import type { CoreStatus } from '@atlas/domain'

/**
 * Atlas Code · cabine operacional visual do Kernel Atlas.
 *
 * Layout-only scaffold. Components render mock payloads from src/data/mock.ts
 * until atlas-bridge wires them to real atlas-server endpoints (passo 2).
 *
 * Canon:
 *   atlas-server  = Kernel · decide, route, execute, evidence, memory.
 *   atlas-desktop = cabine · show, command, sign, observe, send intents.
 */
function App() {
  const [core, setCore] = useState<CoreStatus>(coreStatusFallback)

  useEffect(() => {
    void getCoreStatus().then(setCore)
  }, [])

  return (
    <div className="atlas-shell">
      <TopBar />
      <ObraBar obra={obra} />
      <LeftRail active={sessions} recent={recentSessions} />
      <MainStage stages={sddStages} messages={messages} receiptHash="0x4f2c" />
      <RightRail receipt={receipt} gates={gates} core={core} />
      <TerminalDock lines={terminalLines} ptyMode={core.pty} cwd={core.workspacePath} />
    </div>
  )
}

export default App
