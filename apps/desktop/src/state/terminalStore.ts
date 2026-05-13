import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TerminalTabState {
  id: string
  cwd: string
  label: string
  createdAt: string
}

export type TerminalPlacement = 'bottom' | 'right'

interface TerminalStore {
  sessions: TerminalTabState[]
  activeId: string | null
  dockHeight: number
  dockMaximized: boolean
  dockPlacement: TerminalPlacement
  open: (cwd: string, label?: string) => string
  close: (id: string) => void
  select: (id: string) => void
  rename: (id: string, label: string) => void
  setHeight: (px: number) => void
  toggleMaximize: () => void
  togglePlacement: () => void
  hydrateInitial: (fallbackCwd: string) => void
}

interface PersistedTerminalState {
  sessions: TerminalTabState[]
  activeId: string | null
  dockHeight: number
  dockMaximized: boolean
  dockPlacement: TerminalPlacement
}

const DEFAULT_HEIGHT = 260
const DEFAULT_PLACEMENT: TerminalPlacement = 'right'
const MIN_HEIGHT = 120
const MAX_HEIGHT_RATIO = 0.85

function freshId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function deriveLabel(cwd: string): string {
  if (!cwd) return 'shell'
  const tail = cwd.replace(/\/+$/, '').split('/').pop()
  return tail && tail.length > 0 ? tail : '/'
}

export function clampHeight(px: number): number {
  if (typeof window === 'undefined') return Math.max(MIN_HEIGHT, px)
  const max = Math.floor(window.innerHeight * MAX_HEIGHT_RATIO)
  return Math.min(Math.max(MIN_HEIGHT, px), Math.max(MIN_HEIGHT, max))
}

export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeId: null,
      dockHeight: DEFAULT_HEIGHT,
      dockMaximized: false,
      dockPlacement: DEFAULT_PLACEMENT,

      open: (cwd, label) => {
        const id = freshId()
        const tab: TerminalTabState = {
          id,
          cwd: cwd || '',
          label: label && label.trim() ? label : deriveLabel(cwd),
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ sessions: [...s.sessions, tab], activeId: id }))
        return id
      },

      close: (id) => {
        const { sessions, activeId } = get()
        const idx = sessions.findIndex((t) => t.id === id)
        if (idx < 0) return
        const next = sessions.filter((t) => t.id !== id)
        let nextActive = activeId
        if (activeId === id) {
          nextActive = next[idx]?.id ?? next[idx - 1]?.id ?? next[0]?.id ?? null
        }
        set({ sessions: next, activeId: nextActive })
      },

      select: (id) => {
        if (!get().sessions.some((t) => t.id === id)) return
        set({ activeId: id })
      },

      rename: (id, label) => {
        set((s) => ({
          sessions: s.sessions.map((t) => (t.id === id ? { ...t, label } : t)),
        }))
      },

      setHeight: (px) => {
        const clamped = clampHeight(px)
        set({ dockHeight: clamped, dockMaximized: false })
      },

      toggleMaximize: () => {
        const { dockMaximized } = get()
        set({ dockMaximized: !dockMaximized })
      },

      togglePlacement: () => {
        const { dockPlacement } = get()
        set({
          dockPlacement: dockPlacement === 'bottom' ? 'right' : 'bottom',
          dockMaximized: false,
        })
      },

      hydrateInitial: (fallbackCwd) => {
        const { sessions, activeId } = get()
        if (sessions.length > 0) {
          const fallback = fallbackCwd || ''
          if (!fallback) return
          const onlyStaleRoot =
            sessions.length === 1 &&
            sessions[0]?.cwd === '/' &&
            sessions[0]?.label === '/'
          if (!onlyStaleRoot) return
          const tab = { ...sessions[0], cwd: fallback, label: deriveLabel(fallback) }
          set({ sessions: [tab], activeId: activeId ?? tab.id })
          return
        }
        const id = freshId()
        const tab: TerminalTabState = {
          id,
          cwd: fallbackCwd || '',
          label: deriveLabel(fallbackCwd),
          createdAt: new Date().toISOString(),
        }
        set({ sessions: [tab], activeId: id })
      },
    }),
    {
      name: 'atlas.terminal.v3',
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Partial<PersistedTerminalState> | undefined
        return {
          sessions: Array.isArray(state?.sessions) ? state.sessions : [],
          activeId: state?.activeId ?? null,
          dockHeight:
            typeof state?.dockHeight === 'number' ? state.dockHeight : DEFAULT_HEIGHT,
          dockMaximized: false,
          dockPlacement: DEFAULT_PLACEMENT,
        }
      },
      partialize: (s) => ({
        sessions: s.sessions,
        activeId: s.activeId,
        dockHeight: s.dockHeight,
        dockMaximized: s.dockMaximized,
        dockPlacement: s.dockPlacement,
      }),
    },
  ),
)
