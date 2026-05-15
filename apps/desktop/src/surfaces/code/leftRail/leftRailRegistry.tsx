import { LeftRailSection } from './LeftRailPrimitives'
import { ObrasSection } from './ObrasSection'
import { SessionsSection } from './SessionsSection'
import { WorkspaceScopeSection } from './WorkspaceScopeSection'
import { WorkTypeLanesSection } from './WorkTypeLanesSection'
import type { LeftRailContext, LeftRailSectionDefinition } from './leftRailTypes'

const SECTIONS: LeftRailSectionDefinition[] = [
  {
    id: 'workspace-scope',
    label: 'Projeto ativo',
    priority: 5,
    count: () => null,
    render: (ctx: LeftRailContext) => <WorkspaceScopeSection {...ctx} />,
  },
  {
    id: 'obras',
    label: 'Obras',
    priority: 10,
    count: (ctx) => ctx.obras.length,
    render: (ctx: LeftRailContext) => <ObrasSection {...ctx} />,
  },
  {
    id: 'work-type-lanes',
    label: 'Outros trabalhos',
    priority: 15,
    count: () => null,
    render: (ctx: LeftRailContext) => <WorkTypeLanesSection {...ctx} />,
  },
  {
    id: 'active-sessions',
    label: 'Sessões em curso',
    priority: 20,
    count: (ctx) => ctx.active.length,
    render: (ctx: LeftRailContext) => (
      <SessionsSection sessions={ctx.active} loading={ctx.loading} emptyText="nenhuma sessão nessa obra" />
    ),
  },
  {
    id: 'recent',
    label: 'Recentes',
    priority: 30,
    count: (ctx) => ctx.recent.length,
    render: (ctx: LeftRailContext) => (
      <SessionsSection sessions={ctx.recent} emptyText="—" />
    ),
  },
]

export const LEFT_RAIL_SECTIONS = [...SECTIONS].sort((a, b) => a.priority - b.priority)

export function renderLeftRailSection(section: LeftRailSectionDefinition, ctx: LeftRailContext) {
  return (
    <LeftRailSection key={section.id} label={section.label} count={section.count(ctx)}>
      {section.render(ctx)}
    </LeftRailSection>
  )
}
