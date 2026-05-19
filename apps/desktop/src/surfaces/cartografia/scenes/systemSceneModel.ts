import type { Continent, SemanticGraph, SemanticNode } from '@atlas/domain'

export const ATLAS_KERNEL_PIPELINE_GRAPH_ID = 'atlas-ai-kernel-pipeline'

export interface SystemSceneModel {
  parentNode: SemanticNode | null
  semanticNodes: SemanticNode[]
  useSemantic: boolean
  title: string
  layer: string
  continentName: string
  lede: string
}

export function buildSystemSceneModel({
  continent,
  parentId,
  semanticGraph,
}: {
  continent: Continent | null
  parentId: string
  semanticGraph: SemanticGraph | null | undefined
}): SystemSceneModel {
  const parentNode = semanticGraph?.nodes.find((node) => node.graphId === parentId) ?? null
  const semanticNodes = semanticChildren(parentId, semanticGraph)
  const useSemantic = semanticNodes.length > 0

  return {
    parentNode,
    semanticNodes,
    useSemantic,
    title: parentNode?.graphTitle ?? continent?.name ?? 'Atlas',
    layer: parentNode?.graphLayer ?? 'continente',
    continentName: continent?.name ?? 'Atlas',
    lede: useSemantic
      ? 'Mapa real vindo dos frontmatters: sistema, fluxo, modulo e engrenagem.'
      : 'Nenhum filho semântico encontrado no grafo real para esta camada.',
  }
}

function semanticChildren(parent: string, semanticGraph: SemanticGraph | null | undefined): SemanticNode[] {
  if (!semanticGraph) return []
  const ids = semanticGraph.hierarchy[parent] ?? []
  if (ids.length === 0) return []
  const byId = new Map(semanticGraph.nodes.map((node) => [node.graphId, node]))
  return ids
    .map((id) => byId.get(id))
    .filter((node): node is SemanticNode => !!node)
    .sort((a, b) => layerRank(a.graphLayer) - layerRank(b.graphLayer) || a.graphTitle.localeCompare(b.graphTitle))
}

function layerRank(layer: string | null): number {
  const rank = ['world', 'system', 'flow', 'module', 'gear', 'subcomponent'].indexOf(layer ?? 'module')
  return rank === -1 ? 99 : rank
}
