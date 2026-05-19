import type { RefObject } from 'react'

interface TerminalSearchBarProps {
  query: string
  inputRef: RefObject<HTMLInputElement | null>
  onQueryChange: (value: string) => void
  onSearch: () => void
  onClose: () => void
}

export function TerminalSearchBar({
  query,
  inputRef,
  onQueryChange,
  onSearch,
  onClose,
}: TerminalSearchBarProps) {
  return (
    <div className="term-searchbar">
      <span className="term-searchbar-label">buscar</span>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onSearch()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
          }
        }}
        placeholder="texto no buffer do terminal..."
      />
      <button type="button" className="term-searchbar-action" onClick={onSearch}>
        próximo
      </button>
      <button type="button" className="term-searchbar-action quiet" onClick={onClose}>
        fechar
      </button>
    </div>
  )
}
