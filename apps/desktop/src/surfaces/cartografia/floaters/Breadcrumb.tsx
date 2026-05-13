/**
 * Breadcrumb · trilha editorial AtlasVault › Continente › AI Kernel · Pipeline › Foco › Subfluxo
 */
import type { CartographyView, Continent } from '@atlas/domain'

interface Crumb {
  label: string
  view?: CartographyView
  current?: boolean
}

interface BreadcrumbProps {
  view: CartographyView
  continent: Continent | null
  focusedName: string | null
  onNavigate: (view: CartographyView) => void
}

export function Breadcrumb({ view, continent, focusedName, onNavigate }: BreadcrumbProps) {
  const crumbs: Crumb[] = []
  crumbs.push({ label: 'AtlasVault', view: 'universe' })
  crumbs.push({ label: continent?.name ?? 'Atlas', view: 'system' })
  if (view === 'flow' || view === 'gear' || view === 'subflow') {
    crumbs.push({ label: 'AI Kernel · Pipeline', view: 'flow' })
  }
  if (view === 'gear' || view === 'subflow') {
    crumbs.push({
      label: focusedName || '—',
      view: 'gear',
      current: view === 'gear',
    })
  }
  if (view === 'subflow') {
    crumbs.push({ label: 'Subcomponentes', current: true })
  }

  return (
    <div className="breadcrumb-floater floater no-pan">
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`}>
          {i > 0 ? <span className="sep">›</span> : null}
          {c.current || !c.view ? (
            <span className={`crumb${c.current ? ' current' : ''}`}>{c.label}</span>
          ) : (
            <button type="button" className="crumb" onClick={() => onNavigate(c.view!)}>
              {c.label}
            </button>
          )}
        </span>
      ))}
    </div>
  )
}
