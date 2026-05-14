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

/* Tudo escalado 5× fisicamente (Pass 5×). Atoms, fontes, padding, gaps
 * e coordenadas do canvas multiplicados por 5 pra que cada elemento fique
 * 5× maior preservando as relações proporcionais. Usuário ajusta via
 * Cmd+menos externo se ficar grande demais. */
export const WORLD_WIDTH = 9400
export const WORLD_HEIGHT = 9100

export const PIPELINE_LAYOUT = {
  x: 4500,
  y: 400,
  w: 2200,
  stepHeight: 450,   // (58px min-height + 20 padding + 12 gap) × 5
  runtimeHeight: 1100, // Runtime/Executor é o atom mais alto · canon 220 × 5
}

export const LANE_LAYOUT: Record<string, { x: number; y: number; w: number }> = {
  'domain-plane': { x: 400, y: 400, w: 1700 },
  capabilities: { x: 400, y: 4970, w: 1700 },
  'business-context-side': { x: 2700, y: 1650, w: 1400 },
  hks: { x: 7500, y: 400, w: 1600 },
  'evidence-loop': { x: 7500, y: 3375, w: 1600 },
  'doc-os': { x: 7500, y: 6840, w: 1600 },
}

/**
 * Compute the absolute Y for each pipeline step. Step 12 (Runtime) is taller.
 */
export function computeStepYs(
  pipeline: Array<{ graphOrder: number }>
): number[] {
  const ys: number[] = []
  let curY = PIPELINE_LAYOUT.y + 200 // canon 40 × 5
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
