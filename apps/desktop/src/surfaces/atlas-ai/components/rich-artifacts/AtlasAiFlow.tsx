/**
 * Atlas AI · Rich Artifact · Flow (architecture/decision graph)
 *
 * SVG inline com nodes + edges. Node hover revela info text.
 *
 * Source format (JSON dentro de ```atlas:flow):
 *   {
 *     "title": "Forge → Decide → Atlas Code",  // opcional
 *     "nodes": [
 *       {"id": "a", "label": "Forge", "x": 40, "y": 60, "info": "..."},
 *       ...
 *     ],
 *     "edges": [
 *       {"from": "a", "to": "b", "label": "intent"},
 *       ...
 *     ]
 *   }
 *
 * Coordenadas em px relativas ao viewBox 600x240 (largura responsiva, altura
 * ajusta pelo conteúdo). Node = rect arredondado 6px + label center,
 * edge = path com marker arrow no fim.
 *
 * DNA: stroke ink-muted, fill surface-raised, accent gold em hover, ink-strong
 * em label, mono pra info text no tooltip.
 */
import { useId, useState, type ReactElement } from 'react'

interface FlowNode {
  id: string
  label: string
  x: number
  y: number
  info?: string
}

interface FlowEdge {
  from: string
  to: string
  label?: string
}

interface FlowData {
  title?: string
  nodes?: FlowNode[]
  edges?: FlowEdge[]
}

function isFlowData(data: unknown): data is FlowData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (d.nodes !== undefined && !Array.isArray(d.nodes)) return false
  if (d.edges !== undefined && !Array.isArray(d.edges)) return false
  return true
}

const NODE_W = 110
const NODE_H = 36

export function AtlasAiFlow({ data }: { data: unknown }): ReactElement {
  const arrowId = useId().replace(/:/g, '-')
  const [hoverId, setHoverId] = useState<string | null>(null)

  if (!isFlowData(data)) {
    return (
      <div className="atlas-ai-rich-artifact atlas-ai-rich-artifact-error">
        flow malformado · esperado {'{ nodes: [], edges: [] }'}
      </div>
    )
  }
  const nodes = data.nodes ?? []
  const edges = data.edges ?? []
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // Calcula viewBox dimensions
  const maxX = nodes.reduce((m, n) => Math.max(m, n.x + NODE_W), 0)
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y + NODE_H), 0)
  const vbW = Math.max(maxX + 20, 240)
  const vbH = Math.max(maxY + 20, 80)

  const hoveredNode = hoverId ? nodeMap.get(hoverId) : null

  return (
    <article className="atlas-ai-rich-artifact atlas-ai-rich-artifact-flow" aria-label="Diagrama de fluxo">
      {data.title ? (
        <header className="atlas-ai-rich-artifact-head">
          <span className="atlas-ai-rich-artifact-kind">flow</span>
          <span className="atlas-ai-rich-artifact-title">{data.title}</span>
        </header>
      ) : null}
      <svg
        className="atlas-ai-flow-svg"
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
      >
        <defs>
          <marker
            id={`atlas-flow-arrow-${arrowId}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1 L 9 5 L 0 9 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* Edges */}
        <g className="atlas-ai-flow-edges">
          {edges.map((e, i) => {
            const from = nodeMap.get(e.from)
            const to = nodeMap.get(e.to)
            if (!from || !to) return null
            const x1 = from.x + NODE_W
            const y1 = from.y + NODE_H / 2
            const x2 = to.x
            const y2 = to.y + NODE_H / 2
            const mx = (x1 + x2) / 2
            return (
              <g key={i} className="atlas-ai-flow-edge">
                <path
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2 - 4} ${y2}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  markerEnd={`url(#atlas-flow-arrow-${arrowId})`}
                />
                {e.label ? (
                  <text x={mx} y={(y1 + y2) / 2 - 4} className="atlas-ai-flow-edge-label">
                    {e.label}
                  </text>
                ) : null}
              </g>
            )
          })}
        </g>

        {/* Nodes */}
        <g className="atlas-ai-flow-nodes">
          {nodes.map((n) => {
            const isHover = hoverId === n.id
            return (
              <g
                key={n.id}
                className={`atlas-ai-flow-node${isHover ? ' is-hover' : ''}`}
                transform={`translate(${n.x} ${n.y})`}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx="6"
                  ry="6"
                  className="atlas-ai-flow-node-rect"
                />
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 4}
                  textAnchor="middle"
                  className="atlas-ai-flow-node-label"
                >
                  {n.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {hoveredNode?.info ? (
        <p className="atlas-ai-flow-info">{hoveredNode.info}</p>
      ) : null}
    </article>
  )
}
