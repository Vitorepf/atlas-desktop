/* eslint-disable react-hooks/refs -- Cartografia search refactor em curso; divida lateral isolada do Atlas Forge core (project_atlas_vault_cartografia). */
import type { ReturnTypeOfUseCartografiaSearch } from './types'

interface CartografiaSearchProps {
  search: ReturnTypeOfUseCartografiaSearch
}

export function CartografiaSearch({ search }: CartografiaSearchProps) {
  return (
    <div className="search-floater floater no-pan">
      <span className="glyph">∴</span>
      <input
        ref={search.inputRef}
        type="search"
        placeholder="buscar engrenagem, lane, sistema, arquivo…"
        value={search.query}
        aria-label="Buscar na Cartografia"
        aria-keyshortcuts="/"
        aria-expanded={search.results.length > 0}
        aria-controls="cartografia-search-results"
        aria-activedescendant={
          search.results.length > 0
            ? `cart-search-result-${
                search.results[search.activeIndex]?.graphId ?? search.results[0]?.graphId
              }`
            : undefined
        }
        onChange={(event) => search.setQuery(event.target.value)}
        onKeyDown={search.handleKeyDown}
      />
      {search.results.length > 0 ? (
        <div id="cartografia-search-results" className="search-results" role="listbox">
          {search.results.map((atom, index) => (
            <button
              key={atom.graphId}
              id={`cart-search-result-${atom.graphId}`}
              type="button"
              role="option"
              aria-selected={index === search.activeIndex}
              className={`search-result${index === search.activeIndex ? ' active' : ''}`}
              onMouseEnter={() => search.setActiveIndex(index)}
              onClick={() => search.commit(index)}
            >
              <span className="sr-title">{atom.name}</span>
              <span className="sr-meta">
                {atom.kind} · {atom.graphSource} · {atom.sourcePath || atom.graphId}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
