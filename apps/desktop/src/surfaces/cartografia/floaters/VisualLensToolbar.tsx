import type { VisualLens } from '../state/visualLens'

interface VisualLensToolbarProps {
  active: VisualLens
  stats: { recent: number }
  onChange: (lens: VisualLens) => void
}

export function VisualLensToolbar({ active, stats, onChange }: VisualLensToolbarProps) {
  const items: Array<{ id: VisualLens; label: string; glyph: string; shortcut: string; meta?: number }> = [
    { id: 'flow', label: 'fluxo', glyph: 'I', shortcut: '1' },
    { id: 'relations', label: 'relações', glyph: '↔', shortcut: '2' },
    { id: 'risk', label: 'risco', glyph: '△', shortcut: '3' },
    { id: 'recent', label: 'recentes', glyph: '●', shortcut: '4', meta: stats.recent },
    { id: 'evidence', label: 'evidência', glyph: '☷', shortcut: '5' },
  ]

  return (
    <div className="visual-lens-floater floater no-pan" aria-label="Lentes visuais da Cartografia">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`lens-button${active === item.id ? ' active' : ''}`}
          aria-pressed={active === item.id}
          aria-keyshortcuts={item.shortcut}
          onClick={() => onChange(item.id)}
          title={`Ver mapa por ${item.label} · ${item.shortcut}`}
        >
          <span className={`lens-glyph lens-${item.id}`} aria-hidden="true">{item.glyph}</span>
          <span>{item.label}</span>
          {item.meta != null ? <strong>{item.meta}</strong> : null}
        </button>
      ))}
    </div>
  )
}
