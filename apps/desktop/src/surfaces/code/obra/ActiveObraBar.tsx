import type { Obra } from '@atlas/domain'
import { useCodeLayoutStore } from '../../../state/codeLayoutStore'
import { shortObraId } from './obraBarUtils'

interface ActiveObraBarProps {
  obra: Obra
}

export function ActiveObraBar({ obra }: ActiveObraBarProps) {
  const leftCollapsed = useCodeLayoutStore((s) => s.leftCollapsed)
  const toggleLeftCollapsed = useCodeLayoutStore((s) => s.toggleLeftCollapsed)

  return (
    <section className="obra-bar obra-bar-active">
      <div className="obra-bar-left">
        <button
          type="button"
          className="obra-left-toggle"
          aria-label={leftCollapsed ? 'Mostrar coluna esquerda' : 'Esconder coluna esquerda'}
          aria-pressed={leftCollapsed}
          title={leftCollapsed ? 'Mostrar coluna esquerda' : 'Esconder coluna esquerda'}
          onClick={toggleLeftCollapsed}
        >
          <SidebarToggleGlyph collapsed={leftCollapsed} />
        </button>
        <span className="obra-id">{shortObraId(obra.id)}</span>
      </div>
      <h1 className="obra-objective" title={obra.objective || obra.title || ''}>
        {obra.objective || obra.title || '—'}
      </h1>
      <div className="obra-bar-right" aria-hidden="true" />
    </section>
  )
}

function SidebarToggleGlyph({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <line
        x1="5.5"
        y1="2.5"
        x2="5.5"
        y2="13.5"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity={collapsed ? 0.4 : 1}
      />
      {collapsed ? (
        <path d="M8 6l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M10 6l-2 2 2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}
