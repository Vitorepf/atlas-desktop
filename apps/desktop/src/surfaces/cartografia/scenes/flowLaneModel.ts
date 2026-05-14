import type { CartographyAtom, Lane, RecentChange } from '@atlas/domain'
import { LANE_LAYOUT } from '../map/layout'
import type { CustomLayoutMap } from '../state/useCustomLayout'
import { computeRegionSignals, LANE_TONE } from './flowModel'

/**
 * Eyebrow editorial por lane · Mono caps acima do título Cormorant.
 * Traduz o conceito da lane, evitando label técnico ("Domain Plane" →
 * eyebrow "domínio" · título "Domain Plane"). Lowercase aqui, CSS aplica
 * `text-transform: uppercase` para mantê-lo como tipográfico.
 */
export const LANE_EYEBROW: Record<string, string> = {
  'domain-plane': 'domínio',
  capabilities: 'capacidade',
  'business-context-side': 'contexto',
  hks: 'humano',
  'evidence-loop': 'evidência',
  'doc-os': 'documentação',
}

export interface FlowLaneViewModel {
  key: string
  lane: Lane
  /** Layout aplicado (canon LANE_LAYOUT + override do edit mode se houver). */
  layout: { x: number; y: number; w: number; h?: number }
  /** Marca se layout veio do overlay (pra estilo "custom" sutil). */
  isCustom: boolean
  nodes: Lane['nodes']
  regionAtoms: CartographyAtom[]
  regionSignals: ReturnType<typeof computeRegionSignals>
  isolatedInside: boolean
  kinInside: boolean
  className: string
}

export function buildFlowLaneViewModel({
  key,
  lane,
  atomIndex,
  recentByGraphId,
  isolatedId,
  kinSet,
  customLayout,
}: {
  key: string
  lane: Lane
  atomIndex: Record<string, CartographyAtom>
  recentByGraphId: Record<string, RecentChange>
  isolatedId: string | null
  kinSet: Set<string>
  /** Overlay do edit mode. Se presente, sobrescreve campos individualmente. */
  customLayout?: CustomLayoutMap
}): FlowLaneViewModel | null {
  const canon = LANE_LAYOUT[key]
  if (!canon) return null
  const override = customLayout?.[key]
  const layout = override
    ? {
        x: override.x ?? canon.x,
        y: override.y ?? canon.y,
        w: override.w ?? canon.w,
        h: override.h,
      }
    : { ...canon }
  const isCustom = !!override

  const nodes = Array.isArray(lane.nodes) ? lane.nodes : []
  const regionAtoms = nodes
    .map((node) => atomIndex[node.graphId])
    .filter((atom): atom is CartographyAtom => !!atom)
  const regionSignals = computeRegionSignals(regionAtoms, recentByGraphId)
  const isolatedInside = Boolean(isolatedId && nodes.some((node) => node.graphId === isolatedId))
  const kinInside = Boolean(isolatedId && nodes.some((node) => kinSet.has(node.graphId)))

  return {
    key,
    lane,
    layout,
    isCustom,
    nodes,
    regionAtoms,
    regionSignals,
    isolatedInside,
    kinInside,
    className: flowLaneClassName(key, regionSignals, isolatedInside, kinInside, isCustom),
  }
}

function flowLaneClassName(
  key: string,
  signals: ReturnType<typeof computeRegionSignals>,
  isolatedInside: boolean,
  kinInside: boolean,
  isCustom: boolean
): string {
  return [
    'region',
    LANE_TONE[key] ?? '',
    signals.risk > 0 ? 'has-risk' : '',
    signals.recent > 0 ? 'has-recent' : '',
    signals.evidence > 0 ? 'has-evidence' : '',
    signals.relations > 0 ? 'has-relations' : '',
    isolatedInside || kinInside ? 'kin-host' : '',
    isCustom ? 'is-custom-layout' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
