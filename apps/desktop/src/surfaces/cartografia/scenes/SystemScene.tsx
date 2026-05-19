/**
 * SystemScene · sistemas/fluxos dentro de um continente.
 *
 * Preferencia: semanticGraph.hierarchy vindo do backend. Sem semantic_graph,
 * renderiza vazio honesto.
 */
import type { Continent, SemanticGraph } from '@atlas/domain'
import { SystemCard } from './SystemCard'
import { buildSystemSceneModel } from './systemSceneModel'

interface SystemSceneProps {
  continent: Continent | null
  parentId: string
  semanticGraph: SemanticGraph | null | undefined
  onEnterFlow: () => void
  onEnterNode: (graphId: string) => void
}

export function SystemScene({ continent, parentId, semanticGraph, onEnterFlow, onEnterNode }: SystemSceneProps) {
  const model = buildSystemSceneModel({ continent, parentId, semanticGraph })

  return (
    <div className="scene scene-system">
      <header className="scene-head">
        <div className="scene-eyebrow">{model.layer} · {model.continentName}</div>
        <h2 className="scene-title">{model.title}</h2>
        <p className="scene-lede">{model.lede}</p>
      </header>
      <div className="system-grid">
        {model.useSemantic ? model.semanticNodes.map((node) => (
          <SystemCard key={node.graphId} node={node} onEnterFlow={onEnterFlow} onEnterNode={onEnterNode} />
        )) : (
          <div className="empty-state">
            semantic_graph vazio nesta camada · a cartografia não desenha fallback inventado.
          </div>
        )}
      </div>
    </div>
  )
}
