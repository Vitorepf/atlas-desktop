/**
 * Vox V4 · Auto Mode Decision · canonical wire shape + pure parser.
 *
 * Schema canon: `atlas.vox.auto_mode_decision.v1` (emitido pelo Kernel
 * VoxAutoModeRouter, ver `atlas-server/app/Services/Ai/Vox/Routing/`).
 *
 * Por que mora num módulo separado do bridge.ts:
 *   - `parseVoxAutoModeDecision` é puro (sem fetch, sem env), então pode ser
 *     testado direto com `npx tsx` sem precisar de Vite/`import.meta.env`.
 *   - O bridge.ts importa daqui e exporta um alias `parseVoxAutoModeDecision`
 *     pela compatibilidade da API existente.
 *   - Drift fica controlado: a forma camelCase do Desktop é declarada uma
 *     vez aqui e o bridge só normaliza.
 */

/** Modos canônicos aceitos no Vox (cópia mantida em sync com bridge.ts). */
export type VoxAutoMode =
  | 'dictation'
  | 'prompt_polish'
  | 'intent_compile'
  | 'governed_execute'

export interface VoxAutoModeAlternativeShape {
  mode: VoxAutoMode
  confidence: number
  reasonPtBr: string
}

export interface VoxAutoModeDecisionShape {
  selectedMode: VoxAutoMode
  confidence: number
  reasonPtBr: string
  needsConfirmation: boolean
  alternatives: VoxAutoModeAlternativeShape[]
  r4Marker: string | null
  routerVersion: string | null
}

const ALL_MODES: readonly VoxAutoMode[] = [
  'dictation',
  'prompt_polish',
  'intent_compile',
  'governed_execute',
] as const

/**
 * Normaliza o payload bruto do Kernel para o formato canônico camelCase do
 * Desktop. Tolerante a snake_case / camelCase. Quando o backend não envia
 * `auto_mode_decision` (ou envia algo malformado), retorna `null` para que
 * a UI possa renderizar o estado honesto "modo sugerido indisponível"
 * sem inventar uma decisão.
 */
export function parseVoxAutoModeDecisionShape(
  raw: Record<string, unknown> | null | undefined,
): VoxAutoModeDecisionShape | null {
  if (!raw || typeof raw !== 'object') return null
  const decisionRaw = (raw.auto_mode_decision ?? raw.autoModeDecision) as
    | Record<string, unknown>
    | undefined
  if (!decisionRaw || typeof decisionRaw !== 'object') return null
  const d = decisionRaw
  const dStr = (...keys: Array<[string, string?]>): string | null => {
    for (const [a, b] of keys) {
      const v = d[a] ?? (b ? d[b] : undefined)
      if (typeof v === 'string') return v
    }
    return null
  }
  const dNum = (...keys: Array<[string, string?]>): number => {
    for (const [a, b] of keys) {
      const v = d[a] ?? (b ? d[b] : undefined)
      if (typeof v === 'number' && Number.isFinite(v)) return v
    }
    return 0
  }
  const selectedRaw = dStr(['selectedMode', 'selected_mode'])
  const selected =
    selectedRaw && (ALL_MODES as readonly string[]).includes(selectedRaw)
      ? (selectedRaw as VoxAutoMode)
      : null
  if (!selected) return null
  const altsRaw = (d.alternatives ?? d.alternativesList) as unknown
  const alternatives: VoxAutoModeAlternativeShape[] = Array.isArray(altsRaw)
    ? altsRaw
        .map((entry): VoxAutoModeAlternativeShape | null => {
          if (!entry || typeof entry !== 'object') return null
          const e = entry as Record<string, unknown>
          const m = (e.mode ?? e.selectedMode ?? e.selected_mode) as unknown
          const modeStr = typeof m === 'string' ? m : null
          const modeOk =
            modeStr && (ALL_MODES as readonly string[]).includes(modeStr)
              ? (modeStr as VoxAutoMode)
              : null
          if (!modeOk) return null
          const conf = (e.confidence ?? 0) as unknown
          const confNum =
            typeof conf === 'number' && Number.isFinite(conf) ? conf : 0
          const reasonRaw = (e.reasonPtBr ?? e.reason_pt_br ?? e.reason) as unknown
          return {
            mode: modeOk,
            confidence: confNum,
            reasonPtBr: typeof reasonRaw === 'string' ? reasonRaw : '',
          }
        })
        .filter((x): x is VoxAutoModeAlternativeShape => x !== null)
    : []
  const markersRaw = (d.markers ?? null) as unknown
  let r4Marker: string | null = null
  if (markersRaw && typeof markersRaw === 'object') {
    const m = markersRaw as Record<string, unknown>
    const candidate = (m.r4_marker ?? m.r4Marker) as unknown
    if (typeof candidate === 'string') r4Marker = candidate
  }
  return {
    selectedMode: selected,
    confidence: dNum(['confidence']),
    reasonPtBr: dStr(['reasonPtBr', 'reason_pt_br'], ['reason']) ?? '',
    needsConfirmation: Boolean(
      (d.needsConfirmation ?? d.needs_confirmation) === true,
    ),
    alternatives,
    r4Marker,
    routerVersion: dStr(['routerVersion', 'router_version']),
  }
}
