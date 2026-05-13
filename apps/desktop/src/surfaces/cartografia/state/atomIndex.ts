import type { CartographyAtom, CartographyGraph } from '@atlas/domain'
import {
  atomFromContinent,
  atomFromLane,
  atomFromPipelineNode,
  atomFromSemanticNode,
  atomsFromLaneNodes,
  graphCollections,
} from './atomBuilders'

export function buildAtomIndex(graph: CartographyGraph | null): Record<string, CartographyAtom> {
  const idx: Record<string, CartographyAtom> = {}
  if (!graph) return idx

  const { pipeline, lanes, universe, semanticNodes } = graphCollections(graph)

  for (const p of pipeline) {
    idx[p.graphId] = atomFromPipelineNode(p)
  }

  for (const lane of Object.values(lanes)) {
    if (!lane?.graphId) continue
    idx[lane.graphId] = atomFromLane(lane)
    for (const atom of atomsFromLaneNodes(lane)) {
      idx[atom.graphId] = atom
    }
  }

  for (const continent of universe) {
    if (idx[continent.graphId]) continue
    idx[continent.graphId] = atomFromContinent(continent)
  }

  for (const node of semanticNodes) {
    if (!node.graphId || idx[node.graphId]) continue
    idx[node.graphId] = atomFromSemanticNode(node)
  }

  return idx
}
