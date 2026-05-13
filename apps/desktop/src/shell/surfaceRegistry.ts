import type { Surface } from '../hooks/useSurface'

export interface AtlasSurfaceDefinition {
  id: Surface
  label: string
  shortcut: string
  sub: string
  authority: 'kernel' | 'repo' | 'vault' | 'local'
  requiresKernel: boolean
}

export const ATLAS_SURFACES: AtlasSurfaceDefinition[] = [
  {
    id: 'cartografia',
    label: 'Cartografia',
    shortcut: '⌘1',
    sub: 'mapa da verdade canônica',
    authority: 'repo',
    requiresKernel: true,
  },
  {
    id: 'code',
    label: 'Code',
    shortcut: '⌘2',
    sub: 'cabine de programação',
    authority: 'kernel',
    requiresKernel: true,
  },
]

export function getSurfaceDefinition(surface: Surface): AtlasSurfaceDefinition {
  return ATLAS_SURFACES.find((s) => s.id === surface) ?? ATLAS_SURFACES[0]!
}
