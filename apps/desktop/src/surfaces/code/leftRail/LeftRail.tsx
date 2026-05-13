import type { Obra, Session } from '@atlas/domain'
import { LEFT_RAIL_SECTIONS, renderLeftRailSection } from './leftRailRegistry'
import type { LeftRailContext } from './leftRailTypes'

interface LeftRailProps {
  obras: Obra[]
  activeObraId: string | null
  active: Session[]
  recent: Session[]
  loading: boolean
  busy: boolean
  onSelectObra: (obraId: string) => Promise<void>
}

/**
 * Operational navigation rail.
 *
 * It hosts registered sections only. New navigation areas such as worktrees,
 * blocked runs or queue alerts should be added through the section registry.
 */
export function LeftRail(props: LeftRailProps) {
  const ctx: LeftRailContext = props

  return (
    <aside className="left-rail">
      {LEFT_RAIL_SECTIONS.map((section) => renderLeftRailSection(section, ctx))}
    </aside>
  )
}

