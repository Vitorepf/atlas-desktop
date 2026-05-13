/**
 * SystemScene · sistemas/fluxos dentro de um continente.
 *
 * Preferencia: semanticGraph.hierarchy vindo do backend. Fallback: lista
 * canonica antiga apenas se o backend ainda nao devolver semantic_graph.
 */
import type { Continent, SemanticGraph, SemanticNode } from '@atlas/domain'

interface SystemSceneProps {
  continent: Continent | null
  parentId: string
  semanticGraph: SemanticGraph | null | undefined
  onEnterFlow: () => void
  onEnterNode: (graphId: string) => void
}

export function SystemScene({ continent, parentId, semanticGraph, onEnterFlow, onEnterNode }: SystemSceneProps) {
  const parentNode = semanticGraph?.nodes.find((n) => n.graphId === parentId) ?? null
  const semanticNodes = semanticChildren(parentId, semanticGraph)
  const useSemantic = semanticNodes.length > 0
  const title = parentNode?.graphTitle ?? continent?.name ?? 'Atlas'
  const layer = parentNode?.graphLayer ?? 'continente'

  return (
    <div className="scene scene-system">
      <header className="scene-head">
        <div className="scene-eyebrow">{layer} · {continent?.name ?? 'Atlas'}</div>
        <h2 className="scene-title">{title}</h2>
        <p className="scene-lede">
          {useSemantic
            ? 'Mapa real vindo dos frontmatters: sistema, fluxo, modulo e engrenagem.'
            : 'Nenhum filho semântico encontrado no grafo real para esta camada.'}
        </p>
      </header>
      <div className="system-grid">
        {useSemantic ? semanticNodes.map((s) => (
          <button
            key={s.graphId}
            type="button"
            className={`atom system-card${s.graphId === 'atlas-ai-kernel-pipeline' ? ' system-card-flow' : ''}`}
            onClick={() => {
              if (s.graphId === 'atlas-ai-kernel-pipeline') onEnterFlow()
              else onEnterNode(s.graphId)
            }}
          >
            <span className="a-name">{s.graphTitle}</span>
            <span className="a-deck">
              {s.graphLayer ?? 'node'} · {s.summary ?? s.graphKind ?? 'sem resumo'}
            </span>
            <span className="a-source">
              <span className={`a-source-badge ${s.graphSource}`}>{s.graphSource}</span>
              <span className="a-source-path">{s.sourcePath}</span>
            </span>
            {s.graphId === 'atlas-ai-kernel-pipeline' ? (
              <span className="system-card-cta">▸ tem fluxo navegável</span>
            ) : null}
          </button>
        )) : (
          <div className="empty-state">
            semantic_graph vazio nesta camada · a cartografia não desenha fallback inventado.
          </div>
        )}
      </div>
    </div>
  )
}

function semanticChildren(parent: string, semanticGraph: SemanticGraph | null | undefined): SemanticNode[] {
  if (!semanticGraph) return []
  const ids = semanticGraph.hierarchy[parent] ?? []
  if (ids.length === 0) return []
  const byId = new Map(semanticGraph.nodes.map((n) => [n.graphId, n]))
  return ids
    .map((id) => byId.get(id))
    .filter((n): n is SemanticNode => !!n)
    .sort((a, b) => layerRank(a.graphLayer) - layerRank(b.graphLayer) || a.graphTitle.localeCompare(b.graphTitle))
}

function layerRank(layer: string | null): number {
  return ['world', 'system', 'flow', 'module', 'gear', 'subcomponent'].indexOf(layer ?? 'module')
}
