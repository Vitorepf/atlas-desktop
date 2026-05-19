import type { Terminal } from '@xterm/xterm'
import { registerOscHandlers } from '../../../../lib/oscParser'
import { useTerminalRuntime } from '../../../../state/terminalRuntime'

interface AttachTerminalPromptProtocolArgs {
  term: Terminal
  sessionId: string
  schedulePromptPaint: (delayMs?: number) => void
}

export function attachTerminalPromptProtocol({
  term,
  sessionId,
  schedulePromptPaint,
}: AttachTerminalPromptProtocolArgs): () => void {
  return registerOscHandlers(term, {
    onCwd: (liveCwd) => useTerminalRuntime.getState().setCwd(sessionId, liveCwd),
    onMark: (mark, exit) => {
      const rt = useTerminalRuntime.getState()
      if (mark === 'A') {
        rt.markPromptStart(sessionId)
        schedulePromptPaint(0)
      }
      else if (mark === 'B') {
        rt.markPromptInputReady(sessionId)
        schedulePromptPaint(0)
      }
      else if (mark === 'C') {
        rt.markCommandStart(sessionId)
      }
      else if (mark === 'D') {
        rt.markExit(sessionId, exit)
        schedulePromptPaint(120)
      }
    },
  })
}

