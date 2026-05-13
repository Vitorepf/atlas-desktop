import { create } from 'zustand'

interface SessionRuntime {
  liveCwd: string | null
  lastExit: number | null
  running: boolean
  commandStartedAt: number | null
  lastDurationMs: number | null
  completionKind: 'exit' | 'prompt' | 'cwd' | null
}

interface TerminalRuntimeStore {
  byId: Record<string, SessionRuntime>
  setCwd: (sessionId: string, cwd: string) => void
  markPromptStart: (sessionId: string) => void
  markCommandStart: (sessionId: string) => void
  markExit: (sessionId: string, code: number | null) => void
  forget: (sessionId: string) => void
}

const EMPTY: SessionRuntime = {
  liveCwd: null,
  lastExit: null,
  running: false,
  commandStartedAt: null,
  lastDurationMs: null,
  completionKind: null,
}

function patch(byId: Record<string, SessionRuntime>, id: string, partial: Partial<SessionRuntime>) {
  const prev = byId[id] ?? EMPTY
  return { ...byId, [id]: { ...prev, ...partial } }
}

function durationSince(startedAt: number | null): number | null {
  return startedAt ? Math.max(0, Date.now() - startedAt) : null
}

export const useTerminalRuntime = create<TerminalRuntimeStore>((set) => ({
  byId: {},
  setCwd: (id, cwd) =>
    set((s) => {
      const prev = s.byId[id] ?? EMPTY
      const completedByCwd = prev.running
      return {
        byId: patch(s.byId, id, {
          liveCwd: cwd,
          running: completedByCwd ? false : prev.running,
          commandStartedAt: completedByCwd ? null : prev.commandStartedAt,
          lastDurationMs: completedByCwd ? durationSince(prev.commandStartedAt) : prev.lastDurationMs,
          completionKind: completedByCwd ? 'cwd' : prev.completionKind,
        }),
      }
    }),
  markPromptStart: (id) =>
    set((s) => {
      const prev = s.byId[id] ?? EMPTY
      const completedByPrompt = prev.running
      return {
        byId: patch(s.byId, id, {
          running: false,
          commandStartedAt: null,
          lastDurationMs: completedByPrompt ? durationSince(prev.commandStartedAt) : prev.lastDurationMs,
          completionKind: completedByPrompt ? 'prompt' : prev.completionKind,
        }),
      }
    }),
  markCommandStart: (id) =>
    set((s) => ({
      byId: patch(s.byId, id, {
        running: true,
        commandStartedAt: Date.now(),
        lastDurationMs: null,
        completionKind: null,
      }),
    })),
  markExit: (id, code) =>
    set((s) => {
      const startedAt = s.byId[id]?.commandStartedAt ?? null
      const lastDurationMs = startedAt ? Math.max(0, Date.now() - startedAt) : null
      return {
        byId: patch(s.byId, id, {
          lastExit: code,
          running: false,
          commandStartedAt: null,
          lastDurationMs,
          completionKind: 'exit',
        }),
      }
    }),
  forget: (id) =>
    set((s) => {
      const next = { ...s.byId }
      delete next[id]
      return { byId: next }
    }),
}))

export function selectSessionRuntime(byId: Record<string, SessionRuntime>, id: string | null): SessionRuntime {
  if (!id) return EMPTY
  return byId[id] ?? EMPTY
}
