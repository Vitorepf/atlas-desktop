import type { SemanticNode } from '@atlas/domain'
import { ATLAS_KERNEL_PIPELINE_GRAPH_ID } from './systemSceneModel'

interface SystemCardProps {
  node: SemanticNode
  onEnterFlow: () => void
  onEnterNode: (graphId: string) => void
}

export function SystemCard({ node, onEnterFlow, onEnterNode }: SystemCardProps) {
  const isFlow = node.graphId === ATLAS_KERNEL_PIPELINE_GRAPH_ID

  return (
    <button
      type="button"
      className={`atom system-card${isFlow ? ' system-card-flow' : ''}`}
      onClick={() => {
        if (isFlow) onEnterFlow()
        else onEnterNode(node.graphId)
      }}
    >
      <span className="a-name">{node.graphTitle}</span>
      <span className="a-deck">
        {node.graphLayer ?? 'node'} · {node.summary ?? node.graphKind ?? 'sem resumo'}
      </span>
      <span className="a-source">
        <span className={`a-source-badge ${node.graphSource}`}>{node.graphSource}</span>
        <span className="a-source-path">{node.sourcePath}</span>
      </span>
      {isFlow ? <span className="system-card-cta">▸ tem fluxo navegável</span> : null}
    </button>
  )
}
