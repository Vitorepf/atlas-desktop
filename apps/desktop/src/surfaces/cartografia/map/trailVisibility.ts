import type { Connection } from '@atlas/domain'
import type { VisualLens } from '../state/visualLens'

export function isTrailVisible(connection: Connection, active: boolean, visualLens: VisualLens): boolean {
  return (
    connection.kind === 'sequence' ||
    active ||
    (visualLens === 'relations' && connection.kind === 'feed') ||
    (visualLens === 'evidence' && connection.kind === 'feedback')
  )
}
