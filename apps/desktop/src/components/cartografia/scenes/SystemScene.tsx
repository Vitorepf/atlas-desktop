/**
 * SystemScene · sistemas/fluxos dentro de um continente.
 *
 * Preferencia: semanticGraph.hierarchy vindo do backend. Fallback: lista
 * canonica antiga apenas se o backend ainda nao devolver semantic_graph.
 */
import type { Continent, SemanticGraph, SemanticNode } from '@atlas/domain'

interface SystemSceneProps {
  continent: Continent | null
  semanticGraph: SemanticGraph | null | undefined
  onEnterFlow: () => void
  onEnterNode: (graphId: string) => void
}

interface SystemDef {
  id: string
  name: string
  deck: string
  path: string
  hasFlow?: boolean
}

const SYSTEMS: readonly SystemDef[] = [
  {
    id: 'atlas-ai-kernel',
    name: 'Atlas AI Kernel',
    deck: '17 etapas + 4 lanes + loop de evidência',
    path: 'docs/engineering-knowledge-base/atlas-ai-kernel-architecture.md',
    hasFlow: true,
  },
  {
    id: 'self-construction',
    name: 'Self-Construction OS',
    deck: 'Atlas constrói Atlas via propostas',
    path: 'docs/engineering-knowledge-base/atlas-ai-self-construction-os.md',
  },
  {
    id: 'governance',
    name: 'Governance / Policy',
    deck: 'Policy, profile, autonomia, custo',
    path: 'docs/engineering-knowledge-base/atlas-ai-governance-policy-system.md',
  },
  {
    id: 'evidence-system',
    name: 'Evidence System',
    deck: 'Ledger append-only + telemetria',
    path: 'docs/engineering-knowledge-base/atlas-ai-telemetry-evidence-performance.md',
  },
  {
    id: 'runtime-capability',
    name: 'Runtime Capability',
    deck: 'Executors, drivers, harnesses, sandboxes',
    path: 'docs/engineering-knowledge-base/atlas-ai-runtime-capability-system.md',
  },
  {
    id: 'product-surface',
    name: 'Product Surface',
    deck: 'App, mobile, CLI, API, MCP',
    path: 'docs/engineering-knowledge-base/atlas-ai-mobile-surface-gateway.md',
  },
  {
    id: 'memory-vault',
    name: 'Memory Vault',
    deck: 'AtlasVault/Obsidian curado',
    path: 'docs/engineering-knowledge-base/obsidian-atlas-vault.md',
  },
]

export function SystemScene({ continent, semanticGraph, onEnterFlow, onEnterNode }: SystemSceneProps) {
  const semanticNodes = semanticChildren(continent?.graphId ?? 'atlas', semanticGraph)
  const useSemantic = semanticNodes.length > 0

  return (
    <div className="scene scene-system">
      <header className="scene-head">
        <div className="scene-eyebrow">Continente · {continent?.name ?? 'Atlas'}</div>
        <h2 className="scene-title">Sistemas do Atlas</h2>
        <p className="scene-lede">
          {useSemantic
            ? 'Mapa real vindo dos frontmatters: sistema, fluxo, modulo e engrenagem.'
            : '7 sistemas canônicos. O AI Kernel é o pipeline operacional — clique para descer.'}
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
        )) : SYSTEMS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`atom system-card${s.hasFlow ? ' system-card-flow' : ''}`}
            onClick={() => {
              if (s.hasFlow) onEnterFlow()
            }}
            disabled={!s.hasFlow}
          >
            <span className="a-name">{s.name}</span>
            <span className="a-deck">{s.deck}</span>
            <span className="a-source">
              <span className="a-source-badge repo">repo</span>
              <span className="a-source-path">{s.path}</span>
            </span>
            {s.hasFlow ? (
              <span className="system-card-cta">▸ tem fluxo navegável</span>
            ) : null}
          </button>
        ))}
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
