/**
 * Layout coordinates for the Atlas AI Kernel Pipeline (flow scene).
 * Mirrors public/atlas-truth-cartography.html LAYOUT constant 1:1 so the
 * world canvas keeps the canonical visual.
 */

export const WORLD_WIDTH = 1800
export const WORLD_HEIGHT = 1380

export const PIPELINE_LAYOUT = {
  x: 660,
  y: 80,
  w: 480,
  stepHeight: 84,
  runtimeHeight: 260,
}

export const LANE_LAYOUT: Record<string, { x: number; y: number; w: number }> = {
  'domain-plane': { x: 40, y: 100, w: 240 },
  capabilities: { x: 40, y: 760, w: 240 },
  'business-context-side': { x: 340, y: 380, w: 260 },
  hks: { x: 1200, y: 100, w: 280 },
  'evidence-loop': { x: 1200, y: 480, w: 280 },
  'doc-os': { x: 1200, y: 1100, w: 280 },
}

/**
 * Compute the absolute Y for each pipeline step. Step 12 (Runtime) is taller.
 */
export function computeStepYs(
  pipeline: Array<{ graphOrder: number }>
): number[] {
  const ys: number[] = []
  let curY = PIPELINE_LAYOUT.y + 40
  for (const p of pipeline) {
    ys.push(curY)
    curY +=
      p.graphOrder === 12 ? PIPELINE_LAYOUT.runtimeHeight : PIPELINE_LAYOUT.stepHeight
  }
  return ys
}

const ROMAN = [
  '',
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
  'xi',
  'xii',
  'xiii',
  'xiv',
  'xv',
  'xvi',
  'xvii',
]

export function toRoman(n: number): string {
  return ROMAN[n] ?? String(n)
}

export function formatTimeAgo(seconds: number): string {
  if (seconds < 5) return `há ${seconds}s · agora`
  if (seconds < 60) return `há ${seconds}s`
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)}min`
  return `há ${Math.floor(seconds / 3600)}h`
}
