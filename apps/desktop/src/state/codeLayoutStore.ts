import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_LEFT_WIDTH = 260
const DEFAULT_RIGHT_WIDTH = 320

const MIN_LEFT_WIDTH = 112
const MAX_LEFT_WIDTH = 640
const MIN_RIGHT_WIDTH = 260
const MAX_RIGHT_WIDTH = 780
const MIN_STAGE_WIDTH = 420

interface CodeLayoutStore {
  leftWidth: number
  rightWidth: number
  leftCollapsed: boolean
  setLeftWidth: (px: number) => void
  setRightWidth: (px: number) => void
  resetColumns: () => void
  toggleLeftCollapsed: () => void
}

interface PersistedCodeLayoutState {
  leftWidth: number
  rightWidth: number
  leftCollapsed: boolean
}

function viewportWidth(): number {
  if (typeof window === 'undefined') return 1440
  return window.innerWidth
}

function clamp(px: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(px, min), Math.max(min, max)))
}

export function clampLeftWidth(px: number, rightWidth: number): number {
  const maxByStage = viewportWidth() - rightWidth - MIN_STAGE_WIDTH
  return clamp(px, MIN_LEFT_WIDTH, Math.min(MAX_LEFT_WIDTH, maxByStage))
}

export function clampRightWidth(px: number, leftWidth: number): number {
  const maxByStage = viewportWidth() - leftWidth - MIN_STAGE_WIDTH
  return clamp(px, MIN_RIGHT_WIDTH, Math.min(MAX_RIGHT_WIDTH, maxByStage))
}

export const useCodeLayoutStore = create<CodeLayoutStore>()(
  persist(
    (set, get) => ({
      leftWidth: DEFAULT_LEFT_WIDTH,
      rightWidth: DEFAULT_RIGHT_WIDTH,
      leftCollapsed: false,

      setLeftWidth: (px) => {
        const { rightWidth } = get()
        set({ leftWidth: clampLeftWidth(px, rightWidth) })
      },

      setRightWidth: (px) => {
        const { leftWidth } = get()
        set({ rightWidth: clampRightWidth(px, leftWidth) })
      },

      resetColumns: () => {
        set({
          leftWidth: DEFAULT_LEFT_WIDTH,
          rightWidth: DEFAULT_RIGHT_WIDTH,
          leftCollapsed: false,
        })
      },

      toggleLeftCollapsed: () => set({ leftCollapsed: !get().leftCollapsed }),
    }),
    {
      name: 'atlas.code.layout.v1',
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as Partial<PersistedCodeLayoutState> | undefined
        const leftWidth =
          typeof state?.leftWidth === 'number' ? state.leftWidth : DEFAULT_LEFT_WIDTH
        const rightWidth =
          typeof state?.rightWidth === 'number' ? state.rightWidth : DEFAULT_RIGHT_WIDTH
        return {
          leftWidth: clampLeftWidth(leftWidth, rightWidth),
          rightWidth: clampRightWidth(rightWidth, leftWidth),
          leftCollapsed: state?.leftCollapsed ?? false,
        }
      },
      partialize: (s) => ({
        leftWidth: s.leftWidth,
        rightWidth: s.rightWidth,
        leftCollapsed: s.leftCollapsed,
      }),
    },
  ),
)
