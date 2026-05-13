/**
 * SystemScene · 7 sistemas dentro do continente Atlas (canon).
 *
 * Apenas Atlas AI Kernel tem fluxo navegável (FlowScene). Os outros são
 * placeholders read-only que linkam pro doc canônico.
 */
import type { Continent } from '@atlas/domain'

interface SystemSceneProps {
  continent: Continent | null
  onEnterFlow: () => void
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

export function SystemScene({ continent, onEnterFlow }: SystemSceneProps) {
  return (
    <div className="scene scene-system">
      <header className="scene-head">
        <div className="scene-eyebrow">Continente · {continent?.name ?? 'Atlas'}</div>
        <h2 className="scene-title">Sistemas do Atlas</h2>
        <p className="scene-lede">
          7 sistemas canônicos. O AI Kernel é o pipeline operacional — clique para descer.
        </p>
      </header>
      <div className="system-grid">
        {SYSTEMS.map((s) => (
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
