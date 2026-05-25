/**
 * Atlas AI · layout store (persist).
 *
 * Replica o pattern do `codeLayoutStore` para escopo Atlas AI:
 *   - leftWidth   (Conversas rail)
 *   - rightWidth  (SidePanel rail)
 *   - leftCollapsed / rightCollapsed
 *
 * Clamps respeitam tamanho mínimo de stage central. Persistência via
 * Zustand persist (`localStorage`) sobrevive a reload e a reinício do app.
 *
 * Reuso do mesmo pattern garante: drag-resize idêntico ao Code, dbl-click
 * reseta, colapsar via toggle vira `var(--atlas-ai-*-width: 0px)`.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_LEFT_WIDTH = 300
const DEFAULT_RIGHT_WIDTH = 340

const MIN_LEFT_WIDTH = 280
const MAX_LEFT_WIDTH = 520
const MIN_RIGHT_WIDTH = 280
const MAX_RIGHT_WIDTH = 560
const MIN_STAGE_WIDTH = 520

interface AtlasAiLayoutStore {
  leftWidth: number
  rightWidth: number
  leftCollapsed: boolean
  rightCollapsed: boolean
  setLeftWidth: (px: number) => void
  setRightWidth: (px: number) => void
  resetColumns: () => void
  toggleLeftCollapsed: () => void
  toggleRightCollapsed: () => void
}

function viewportWidth(): number {
  if (typeof window === 'undefined') return 1440
  return window.innerWidth
}

function clamp(px: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(px, min), Math.max(min, max)))
}

export function clampAtlasAiLeft(px: number, rightWidth: number): number {
  const maxByStage = viewportWidth() - rightWidth - MIN_STAGE_WIDTH
  return clamp(px, MIN_LEFT_WIDTH, Math.min(MAX_LEFT_WIDTH, maxByStage))
}

export function clampAtlasAiRight(px: number, leftWidth: number): number {
  const maxByStage = viewportWidth() - leftWidth - MIN_STAGE_WIDTH
  return clamp(px, MIN_RIGHT_WIDTH, Math.min(MAX_RIGHT_WIDTH, maxByStage))
}

export const useAtlasAiLayoutStore = create<AtlasAiLayoutStore>()(
  persist(
    (set, get) => ({
      leftWidth: DEFAULT_LEFT_WIDTH,
      rightWidth: DEFAULT_RIGHT_WIDTH,
      leftCollapsed: false,
      rightCollapsed: false,

      setLeftWidth: (px) => {
        const { rightWidth } = get()
        set({ leftWidth: clampAtlasAiLeft(px, rightWidth) })
      },

      setRightWidth: (px) => {
        const { leftWidth } = get()
        set({ rightWidth: clampAtlasAiRight(px, leftWidth) })
      },

      resetColumns: () =>
        set({
          leftWidth: DEFAULT_LEFT_WIDTH,
          rightWidth: DEFAULT_RIGHT_WIDTH,
          leftCollapsed: false,
          rightCollapsed: false,
        }),

      toggleLeftCollapsed: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
      toggleRightCollapsed: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
    }),
    {
      name: 'atlas-desktop:atlas-ai-layout',
      version: 1,
      partialize: (s) => ({
        leftWidth: s.leftWidth,
        rightWidth: s.rightWidth,
        leftCollapsed: s.leftCollapsed,
        rightCollapsed: s.rightCollapsed,
      }),
    },
  ),
)
