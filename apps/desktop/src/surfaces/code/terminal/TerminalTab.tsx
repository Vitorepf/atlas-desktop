interface TerminalTabProps {
  label: string
  active: boolean
  onSelect: () => void
  onClose: () => void
  closable: boolean
}

export function TerminalTab({ label, active, onSelect, onClose, closable }: TerminalTabProps) {
  return (
    <div
      role="tab"
      aria-selected={active}
      className={`term-tab${active ? ' active' : ''}`}
      onClick={onSelect}
      onMouseDown={(e) => {
        if (e.button === 1 && closable) {
          e.preventDefault()
          onClose()
        }
      }}
    >
      <span className="term-tab-label">{label}</span>
      {closable && (
        <span
          className="term-tab-close"
          role="button"
          aria-label={`Close ${label}`}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          ×
        </span>
      )}
    </div>
  )
}

