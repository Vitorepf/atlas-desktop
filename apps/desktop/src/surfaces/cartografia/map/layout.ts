/**
 * Layout coordinates for the Atlas AI Kernel Pipeline (flow scene).
 * Mirrors public/atlas-truth-cartography.html LAYOUT constant 1:1 so the
 * world canvas keeps the canonical visual.
 */

/*
 * Canonical layout · 4-column cockpit (iter 2 — calibrado por medição real).
 *
 *   col 1: Domain Plane, Capabilities       (left)
 *   col 2: Business / Product               (mid lateral)
 *   col 3: Atlas Kernel Pipeline            (hero center)
 *   col 4: HKS, Evidence Loop, Doc OS       (right)
 *
 * Alturas reais medidas via Playwright (clientRect, scale 1) sobre o
 * graph canônico do atlas-server:
 *
 *   domain-plane     8 atoms · 774px   →  y  80  fim  854
 *   capabilities     7 atoms · 707px   →  y 994  fim 1701   (gap 140)
 *   hks              4 atoms · 455px   →  y  80  fim  535
 *   evidence-loop    5 atoms · 553px   →  y 675  fim 1228   (gap 140)
 *   doc-os           1 atom  · 186px   →  y 1368 fim 1554   (gap 140)
 *   business-side    1 atom  · 186px   →  y 330  centrado no step iv
 *   pipeline        17 steps · 16×90 + 220 = 1660 →  y 80 fim 1740
 *
 * Gaps verticais entre regions na mesma coluna = 140px (DNA Corleone:
 * ar generoso, nunca raspar). World absorve tudo + 80px de borda inferior.
 */

export const WORLD_WIDTH = 1880
export const WORLD_HEIGHT = 2500

export const PIPELINE_LAYOUT = {
  x: 900,
  y: 80,
  w: 440,
  stepHeight: 110,   // canon 90 + 20 (atoms-pipe maiores: min-height 58→80)
  runtimeHeight: 240, // canon 220 + 20
}

/* Y ajustado pras lanes inferiores compensarem crescimento vertical
 * dos atoms (72→108, gap 12→18). X mantém canon — distância horizontal
 * entre lanes preservada como Vitor pediu. */
export const LANE_LAYOUT: Record<string, { x: number; y: number; w: number }> = {
  'domain-plane': { x: 80, y: 80, w: 340 },
  capabilities: { x: 80, y: 1430, w: 340 },         // canon 994 + 436 (Domain Plane growth)
  'business-context-side': { x: 540, y: 360, w: 280 },
  hks: { x: 1500, y: 80, w: 320 },
  'evidence-loop': { x: 1500, y: 900, w: 320 },     // canon 675 + 225 (HKS growth)
  'doc-os': { x: 1500, y: 1840, w: 320 },           // canon 1368 + 472 (HKS + Evi growth)
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
