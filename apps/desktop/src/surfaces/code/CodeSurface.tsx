import type { BootSnapshot } from '@atlas/domain'
import { ErrorBoundary } from '../../shell/ErrorBoundary'
import { LeftRail } from './leftRail/LeftRail'
import { MainStage } from './stage/MainStage'
import { ObraBar } from './obra/ObraBar'
import { RightRail } from './panels/RightRail'
import type { BridgeActions, BridgeSnapshot } from '../../hooks/useBridge'
import { CodeSurfaceLayout } from './CodeSurfaceLayout'
import { TerminalDock } from './terminal/TerminalDock'

interface CodeSurfaceProps {
  bridge: BridgeSnapshot & BridgeActions
  boot: BootSnapshot | null
}

/**
 * Atlas Code operational cabin.
 *
 * This is the composition boundary for the Code surface. It keeps App.tsx from
 * becoming the place where every future panel, rail, terminal placement and
 * execution mode is wired by hand.
 */
export function CodeSurface({ bridge: b, boot }: CodeSurfaceProps) {
  return (
    <CodeSurfaceLayout
      obra={<ObraBar obra={b.obra} onCreate={b.createObra} busy={b.busy} />}
      left={
        <LeftRail
          obras={b.obras}
          activeObraId={b.obra?.id ?? null}
          active={b.active}
          recent={b.recent}
          loading={b.loading}
          busy={b.busy}
          onSelectObra={b.selectObra}
        />
      }
      stage={
        <MainStage
          stages={b.sdd}
          messages={b.messages}
          receiptHash={b.receipt?.id ?? ''}
          loading={b.loading}
          busy={b.busy}
          hasObra={!!b.obra}
          onSend={b.sendIntent}
        />
      }
      right={
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
      }
      terminal={<TerminalDock initialCwd={b.core.workspacePath} ptyMode={b.core.pty} />}
    />
  )
}
