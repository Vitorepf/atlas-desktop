import type { CartographyView, Continent } from '@atlas/domain'

export interface CartografiaBreadcrumbItem {
  id: string
  label: string
  view?: CartographyView
  current?: boolean
}

interface BuildCartografiaBreadcrumbInput {
  view: CartographyView
  continent: Continent | null
  focusedName: string | null
}

export function buildCartografiaBreadcrumb({
  view,
  continent,
  focusedName,
}: BuildCartografiaBreadcrumbInput): CartografiaBreadcrumbItem[] {
  const crumbs: CartografiaBreadcrumbItem[] = [
    { id: 'universe', label: 'AtlasVault', view: 'universe', current: view === 'universe' },
    {
      id: `continent-${continent?.graphId ?? 'atlas'}`,
      label: continent?.name ?? 'Atlas',
      view: 'system',
      current: view === 'system',
    },
  ]

  if (view === 'flow' || view === 'gear' || view === 'subflow') {
    crumbs.push({
      id: 'flow',
      label: 'AI Kernel · Pipeline',
      view: 'flow',
      current: view === 'flow',
    })
  }

  if (view === 'gear' || view === 'subflow') {
    crumbs.push({
      id: `focus-${focusedName ?? 'none'}`,
      label: focusedName || '—',
      view: 'gear',
      current: view === 'gear',
    })
  }

  if (view === 'subflow') {
    crumbs.push({ id: 'subflow', label: 'Subcomponentes', current: true })
  }

  return crumbs
}
