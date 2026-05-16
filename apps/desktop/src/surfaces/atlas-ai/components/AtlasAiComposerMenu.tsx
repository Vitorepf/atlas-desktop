/**
 * Atlas AI · popover menu primitive (Modo / Tarefa / Provider).
 *
 * Apple-class dropdown: tile do trigger é um pill discreto; quando clicado,
 * abre uma sheet flutuante com radio-like options + descrição. Fecha com
 * Esc, click-outside ou seleção.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface MenuOption<T extends string> {
  value: T
  label: string
  description?: string
  badge?: ReactNode
  disabled?: boolean
}

interface AtlasAiComposerMenuProps<T extends string> {
  /** Texto curto que aparece no pill (ex: "Programação", "Atlas Decide") */
  triggerLabel: ReactNode
  /** Eyebrow opcional acima do label no pill (ex: "Modo", "Provider") */
  triggerEyebrow?: string
  /** Ícone à esquerda do label */
  triggerIcon?: ReactNode
  options: MenuOption<T>[]
  value: T
  onChange: (next: T) => void
  /** Alinhamento do menu: 'start' = align-left, 'end' = align-right */
  align?: 'start' | 'end'
  disabled?: boolean
  ariaLabel?: string
}

export function AtlasAiComposerMenu<T extends string>({
  triggerLabel,
  triggerEyebrow,
  triggerIcon,
  options,
  value,
  onChange,
  align = 'start',
  disabled,
  ariaLabel,
}: AtlasAiComposerMenuProps<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`atlas-ai-cmenu align-${align}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="atlas-ai-cmenu-trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? triggerEyebrow}
      >
        {triggerIcon ? <span className="atlas-ai-cmenu-icon" aria-hidden="true">{triggerIcon}</span> : null}
        {triggerEyebrow ? <span className="atlas-ai-cmenu-eyebrow">{triggerEyebrow}</span> : null}
        <span className="atlas-ai-cmenu-label">{triggerLabel}</span>
        <span className="atlas-ai-cmenu-chevron" aria-hidden="true">
          <svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 1 5 5 9 1" />
          </svg>
        </span>
      </button>

      {open ? (
        <div className="atlas-ai-cmenu-sheet" role="listbox" aria-label={ariaLabel ?? triggerEyebrow ?? 'menu'}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={`atlas-ai-cmenu-item${opt.value === value ? ' is-selected' : ''}`}
              onClick={() => {
                if (!opt.disabled) {
                  onChange(opt.value)
                  setOpen(false)
                }
              }}
              disabled={opt.disabled}
            >
              <span className="atlas-ai-cmenu-check" aria-hidden="true">
                {opt.value === value ? (
                  <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                ) : null}
              </span>
              <span className="atlas-ai-cmenu-text">
                <span className="atlas-ai-cmenu-item-label">{opt.label}</span>
                {opt.description ? (
                  <span className="atlas-ai-cmenu-item-desc">{opt.description}</span>
                ) : null}
              </span>
              {opt.badge ? <span className="atlas-ai-cmenu-badge">{opt.badge}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
