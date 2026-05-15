import type { ReactNode } from 'react'
import type { AtlasWorkspaceProfile, Obra, Session } from '@atlas/domain'

export interface LeftRailContext {
  obras: Obra[]
  activeObraId: string | null
  active: Session[]
  recent: Session[]
  loading: boolean
  busy: boolean
  onSelectObra: (obraId: string) => Promise<void>
  onCreateObra: (intent: string, objective: string) => Promise<Obra | null>
  /**
   * Atlas Code · multi-project scoping. The active Project/Workspace drives
   * Obra filtering and the safety strip in the rail. `null` when the backend
   * has no workspaces endpoint yet — UI falls back to Atlas-default labels.
   *
   * Canon: docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
   */
  activeWorkspace: AtlasWorkspaceProfile | null
}

export interface LeftRailSectionDefinition {
  id:
    | 'workspace-scope'
    | 'obras'
    | 'work-type-lanes'
    | 'active-sessions'
    | 'recent'
  label: string
  priority: number
  /** Return null to hide the numeric badge (e.g. singleton header sections). */
  count: (ctx: LeftRailContext) => number | null
  render: (ctx: LeftRailContext) => ReactNode
}
