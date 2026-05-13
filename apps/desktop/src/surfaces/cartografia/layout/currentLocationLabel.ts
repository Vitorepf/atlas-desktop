import type { CartographyView } from '@atlas/domain'

interface CurrentLocationLabelInput {
  view: CartographyView
  continent: string | null
  systemParentName: string | null
  focusedName: string | null
  isolatedName: string | null
}

export function currentLocationLabel({
  view,
  continent,
  focusedName,
  isolatedName,
  systemParentName,
}: CurrentLocationLabelInput): string {
  if (view === 'universe') return 'Universo'
  if (view === 'system') return systemParentName ?? continent ?? 'Atlas'
  if (view === 'flow') {
    if (isolatedName) return `Atlas · isolando · ${isolatedName}`
    return 'Atlas · AI Kernel · Pipeline'
  }
  if (view === 'gear') return `Atlas · ${focusedName ?? ''}`
  if (view === 'subflow') return `Atlas · ${focusedName ?? ''} · Subfluxo`
  return '—'
}
