import { AtlasConstructionPanel } from './AtlasConstructionPanel'
import { AtlasSelfImprovementLevel7Panel } from './AtlasSelfImprovementLevel7Panel'
import { EvidencePanel } from './EvidencePanel'
import { ForgeAdvancedPanel } from './ForgeAdvancedPanel'
import { ForgeHumanPanel } from './ForgeHumanPanel'
import { ForgeWorkIntakePanel } from './ForgeWorkIntakePanel'
import { ProviderArenaPanel } from './ProviderArenaPanel'
import { VerifyPanel } from './VerifyPanel'
import type { RightRailContext, RightRailPanelDefinition } from './rightRailTypes'

/**
 * Right rail canonical layout (Atlas Code Forge Human-First UX Orchestrator v1).
 *
 * Tabs reduzidas para o usuário humano:
 *   Forge → Definir → Revisar → Provas → Avançado.
 *
 * O cockpit técnico antigo (ForgeOperatorCockpitPanel) virou conteúdo da aba
 * `Avançado`. A aba primária (`forge`) é a única que o usuário precisa para
 * tocar o trabalho — botão único, segurança visível, blockers honestos.
 */
const PANELS: RightRailPanelDefinition[] = [
  {
    id: 'self_improvement',
    label: 'Self-Improvement',
    priority: 0,
    render: (ctx: RightRailContext) => <AtlasSelfImprovementLevel7Panel {...ctx} />,
  },
  {
    id: 'forge',
    label: 'Forge',
    priority: 1,
    render: (ctx: RightRailContext) => <ForgeHumanPanel {...ctx} />,
  },
  {
    id: 'provider_arena',
    label: 'Arena',
    priority: 5,
    render: (ctx: RightRailContext) => <ProviderArenaPanel {...ctx} />,
  },
  {
    id: 'intake',
    label: 'Definir',
    priority: 10,
    render: (ctx: RightRailContext) => (
      <ForgeWorkIntakePanel
        obraId={ctx.obra?.id ?? null}
        intake={ctx.forgeWorkIntake}
        busy={ctx.busy}
        onRefresh={ctx.onRefreshForgeWorkIntake}
        onSave={ctx.onSaveForgeWorkIntake}
        selfImprovementActivation={ctx.selfImprovementActivation}
      />
    ),
  },
  {
    id: 'verify',
    label: 'Revisar',
    priority: 20,
    render: (ctx: RightRailContext) => <VerifyPanel {...ctx} />,
  },
  {
    id: 'evidence',
    label: 'Provas',
    priority: 60,
    render: (ctx: RightRailContext) => <EvidencePanel {...ctx} />,
  },
  {
    id: 'advanced',
    label: 'Avançado',
    priority: 90,
    render: (ctx: RightRailContext) => <ForgeAdvancedPanel {...ctx} />,
  },
  {
    id: 'construction',
    label: 'Construction',
    priority: 95,
    render: (ctx: RightRailContext) => (
      <AtlasConstructionPanel
        snapshot={ctx.selfConstruction}
        busy={ctx.busy}
        onRefresh={ctx.onRefreshSelfConstruction}
      />
    ),
  },
]

export const RIGHT_RAIL_PANELS: RightRailPanelDefinition[] = [...PANELS].sort(
  (a, b) => a.priority - b.priority,
)
