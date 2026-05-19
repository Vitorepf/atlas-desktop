import { create } from 'zustand'

export interface SessionRuntime {
  liveCwd: string | null
  lastExit: number | null
  running: boolean
  inputReady: boolean
  lastPromptAt: number | null
  commandStartedAt: number | null
  lastDurationMs: number | null
  completionKind: 'exit' | 'prompt' | 'input' | null
}

interface TerminalRuntimeStore {
  byId: Record<string, SessionRuntime>
  setCwd: (sessionId: string, cwd: string) => void
  markPromptStart: (sessionId: string) => void
  markPromptInputReady: (sessionId: string) => void
  markCommandStart: (sessionId: string) => void
  markExit: (sessionId: string, code: number | null) => void
  forget: (sessionId: string) => void
}

const EMPTY: SessionRuntime = {
  liveCwd: null,
  lastExit: null,
  running: false,
  inputReady: false,
  lastPromptAt: null,
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
      return {
        byId: patch(s.byId, id, {
          liveCwd: cwd,
          running: prev.running,
          commandStartedAt: prev.commandStartedAt,
          lastDurationMs: prev.lastDurationMs,
          completionKind: prev.completionKind,
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
          inputReady: false,
          lastPromptAt: Date.now(),
          commandStartedAt: null,
          lastDurationMs: completedByPrompt ? durationSince(prev.commandStartedAt) : prev.lastDurationMs,
          completionKind: completedByPrompt ? 'prompt' : prev.completionKind,
        }),
      }
    }),
  markPromptInputReady: (id) =>
    set((s) => ({
      byId: patch(s.byId, id, {
        running: false,
        inputReady: true,
        lastPromptAt: Date.now(),
        commandStartedAt: null,
        completionKind: 'input',
      }),
    })),
  markCommandStart: (id) =>
    set((s) => ({
      byId: patch(s.byId, id, {
        running: true,
        inputReady: false,
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
          inputReady: false,
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
