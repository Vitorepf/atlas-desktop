import type { Surface } from '../hooks/useSurface'

export interface AtlasSurfaceDefinition {
  id: Surface
  label: string
  shortcut: string
  sub: string
  authority: 'kernel' | 'repo' | 'vault' | 'local'
  requiresKernel: boolean
}

/**
 * Ordem editorial das surfaces (esquerda → direita no SurfaceSwitcher e
 * mapeada para ⌘1..⌘4):
 *
 *   Atlas AI    →  começar          (conversa diária · Atlas Dev)
 *   Code        →  aprofundar       (cabine de programação)
 *   Atenção     →  decidir          (fila humana entre Obras)
 *   Cartografia →  entender/auditar (mapa da verdade canônica)
 */
export const ATLAS_SURFACES: AtlasSurfaceDefinition[] = [
  {
    id: 'atlas_ai',
    label: 'Atlas AI',
    shortcut: '⌘1',
    sub: 'começar · conversa diária',
    authority: 'kernel',
    requiresKernel: true,
  },
  {
    id: 'code',
    label: 'Code',
    shortcut: '⌘2',
    sub: 'aprofundar · cabine de programação',
    authority: 'kernel',
    requiresKernel: true,
  },
  {
    id: 'atencao',
    label: 'Atenção',
    shortcut: '⌘3',
    sub: 'decidir · fila humana entre Obras',
    authority: 'kernel',
    requiresKernel: true,
  },
  {
    id: 'cartografia',
    label: 'Cartografia',
    shortcut: '⌘4',
    sub: 'entender · auditar a verdade canônica',
    authority: 'repo',
    requiresKernel: true,
  },
  {
    id: 'control_plane',
    label: 'Operação',
    shortcut: '⌘5',
    sub: 'observar · saúde operacional do Atlas',
    authority: 'kernel',
    requiresKernel: true,
  },
  {
    id: 'stewardship',
    label: 'Stewardship',
    shortcut: '⌘6',
    sub: 'governar · Product Mode',
    authority: 'kernel',
    requiresKernel: true,
  },
  {
    id: 'mission_control',
    label: 'Mission',
    shortcut: '⌘7',
    sub: 'AAEOS · cockpit',
    authority: 'kernel',
    requiresKernel: true,
  },
  {
    id: 'plan_visible',
    label: 'Plan',
    shortcut: '⌘8',
    sub: 'Atlas Dev · plano',
    authority: 'kernel',
    requiresKernel: true,
  },
]

export function getSurfaceDefinition(surface: Surface): AtlasSurfaceDefinition {
  return ATLAS_SURFACES.find((s) => s.id === surface) ?? ATLAS_SURFACES[0]!
}
