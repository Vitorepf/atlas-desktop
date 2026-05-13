export function InspectorResizeToolbar({
  collapsed,
  width,
  minWidth,
  maxWidth,
  onToggleCollapsed,
  onNudgeWidth,
  onResetWidth,
}: {
  collapsed: boolean
  width: number
  minWidth: number
  maxWidth: number
  onToggleCollapsed: () => void
  onNudgeWidth: (delta: number) => void
  onResetWidth: () => void
}) {
  return (
    <div className="ins-resize-toolbar" aria-label="Controles da coluna de navegação">
      <button
        type="button"
        className="ins-tool"
        onClick={onToggleCollapsed}
        title={collapsed ? 'Restaurar coluna' : 'Minimizar coluna e ampliar navegação'}
        aria-label={collapsed ? 'Restaurar coluna' : 'Minimizar coluna e ampliar navegação'}
      >
        <span className={`ins-tool-icon${collapsed ? ' restore' : ''}`} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="ins-tool"
        onClick={() => onNudgeWidth(-40)}
        disabled={collapsed || width <= minWidth}
        title="Diminuir coluna"
      >
        −
      </button>
      <button
        type="button"
        className="ins-tool"
        onClick={() => onNudgeWidth(40)}
        disabled={collapsed || width >= maxWidth}
        title="Aumentar coluna"
      >
        +
      </button>
      <button
        type="button"
        className="ins-tool text"
        onClick={onResetWidth}
        disabled={collapsed}
        title="Voltar para largura padrão"
      >
        reset
      </button>
    </div>
  )
}

export function CollapsedInspectorRail({ onToggleCollapsed }: { onToggleCollapsed: () => void }) {
  return (
    <button
      type="button"
      className="collapsed-inspector-rail"
      onClick={onToggleCollapsed}
      title="Restaurar coluna da Cartografia"
    >
      <span>Abrir painel</span>
    </button>
  )
}
