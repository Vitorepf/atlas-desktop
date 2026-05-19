import type { TopBarLocationTrailItem } from './topBarLocationTrailContext'

export function TopBarLocationTrail({ items }: { items: TopBarLocationTrailItem[] }) {
  if (items.length === 0) return null

  return (
    <nav className="topbar-location" aria-label="Localizacao atual na Cartografia">
      <span className="topbar-location-marker" aria-hidden="true" />
      <ol className="topbar-location-list">
        {items.map((item, index) => (
          <li key={item.id} className="topbar-location-step">
            {index > 0 ? <span className="topbar-location-separator" aria-hidden="true" /> : null}
            {item.onSelect && !item.current ? (
              <button type="button" className="topbar-location-crumb" onClick={item.onSelect}>
                {item.label}
              </button>
            ) : (
              <span className={`topbar-location-crumb${item.current ? ' is-current' : ''}`}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
