import type { ReactNode } from 'react'
import type { Obra, Session } from '@atlas/domain'

export interface LeftRailContext {
  obras: Obra[]
  activeObraId: string | null
  active: Session[]
  recent: Session[]
  loading: boolean
  busy: boolean
  onSelectObra: (obraId: string) => Promise<void>
  onCreateObra: (intent: string, objective: string) => Promise<Obra | null>
}

export interface LeftRailSectionDefinition {
  id: 'obras' | 'active-sessions' | 'recent'
  label: string
  priority: number
  count: (ctx: LeftRailContext) => number
  render: (ctx: LeftRailContext) => ReactNode
}
