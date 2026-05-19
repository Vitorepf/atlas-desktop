import type { CartographyAtom, CartographyGraph, Continent, Lane, PipelineStep, SemanticNode } from '@atlas/domain'

export function atomFromPipelineNode(node: PipelineStep): CartographyAtom {
  return {
    kind: 'pipeline',
    graphId: node.graphId,
    name: node.name,
    deck: node.deck,
    graphSource: node.graphSource,
    sourcePath: node.sourcePath,
    missingSource: node.missingSource,
    role: node.role,
    graphOrder: node.graphOrder,
    input: node.input,
    output: node.output,
    depends: node.depends,
    unblocks: node.unblocks,
    evidence: node.evidence,
    risk: node.risk,
    next: node.next,
    subs: node.subs,
  }
}

export function atomFromLane(lane: Lane): CartographyAtom {
  return {
    kind: 'lane',
    graphId: lane.graphId,
    name: lane.head,
    deck: lane.deck,
    graphSource: lane.graphSource,
    sourcePath: lane.sourcePath,
    missingSource: lane.missingSource,
    role: lane.role,
  }
}

export function atomsFromLaneNodes(lane: Lane): CartographyAtom[] {
  return (lane.nodes ?? []).map((node) => ({
    kind: 'lateral',
    graphId: node.graphId,
    name: node.name,
    deck: node.deck,
    graphSource: node.graphSource,
    sourcePath: node.sourcePath,
    missingSource: node.missingSource,
    role: node.role,
    input: node.input,
    output: node.output,
    depends: node.depends,
    unblocks: node.unblocks,
    evidence: node.evidence,
    risk: node.risk,
    next: node.next,
    regionId: lane.graphId,
    regionHead: lane.head,
  }))
}

export function atomFromContinent(continent: Continent): CartographyAtom {
  return {
    kind: 'continent',
    graphId: continent.graphId,
    name: continent.name,
    deck: null,
    graphSource: continent.graphSource,
    sourcePath: continent.sourcePath,
    missingSource: continent.missingSource,
    role: continent.role,
  }
}

export function atomFromSemanticNode(node: SemanticNode): CartographyAtom {
  return {
    kind: 'semantic',
    graphId: node.graphId,
    name: node.graphTitle,
    deck: node.summary,
    graphSource: node.graphSource,
    sourcePath: node.sourcePath,
    missingSource: false,
    role: node.summary,
    depends: node.dependsOn,
    unblocks: node.unlocks,
    evidence: node.evidence.length === 0 ? null : node.evidence.join(' · '),
    risk: node.riskLevel,
    next: node.nextActions.length === 0 ? null : node.nextActions.join(' · '),
    graphLayer: node.graphLayer,
    graphParent: node.graphParent,
    flowsTo: node.flowsTo,
    governs: node.governs,
  }
}

export function graphCollections(graph: CartographyGraph) {
  return {
    pipeline: Array.isArray(graph.pipeline) ? graph.pipeline : [],
    lanes: graph.lanes && typeof graph.lanes === 'object' ? graph.lanes : {},
    universe: Array.isArray(graph.universe) ? graph.universe : [],
    semanticNodes: graph.semanticGraph?.nodes ?? [],
  }
}
