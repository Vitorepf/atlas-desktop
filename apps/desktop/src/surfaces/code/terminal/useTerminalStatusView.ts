import { useEffect, useMemo, useState } from 'react'
import type { SessionRuntime } from '../../../state/terminalRuntime'
import { formatDuration } from './terminalFormat'

export function useTerminalStatusView(runtime: SessionRuntime) {
  const [clock, setClock] = useState(() => Date.now())

  useEffect(() => {
    if (!runtime.running) return
    const id = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [runtime.running])

  return useMemo(() => {
    const runningFor = runtime.running && runtime.commandStartedAt
      ? formatDuration(clock - runtime.commandStartedAt)
      : null
    const lastDuration = !runtime.running && runtime.lastDurationMs != null
      ? formatDuration(runtime.lastDurationMs)
      : null
    const waitingForPrompt =
      !runtime.running &&
      !runtime.inputReady &&
      runtime.completionKind === 'exit'
    const showReadyState =
      !runtime.running &&
      runtime.inputReady

    return {
      runningFor,
      lastDuration,
      waitingForPrompt,
      showReadyState,
    }
  }, [
    clock,
    runtime.commandStartedAt,
    runtime.completionKind,
    runtime.inputReady,
    runtime.lastDurationMs,
    runtime.running,
  ])
}
