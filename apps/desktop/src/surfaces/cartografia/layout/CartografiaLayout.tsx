import type { CSSProperties, ReactNode } from 'react'
import type { useInspectorColumn } from './useInspectorColumn'

interface CartografiaLayoutProps {
  inspector: ReactNode
  inspectorColumn: ReturnType<typeof useInspectorColumn>
  children: ReactNode
}

export function CartografiaLayout({ inspector, inspectorColumn, children }: CartografiaLayoutProps) {
  return (
    <section className="cartografia-surface">
      <div
        className={`cart-work${inspectorColumn.collapsed ? ' inspector-collapsed' : ''}`}
        style={{
          '--cart-inspector-width': `${inspectorColumn.cssWidth}px`,
        } as CSSProperties}
      >
        {inspector}
        <div
          className="cart-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar largura da coluna da Cartografia"
          aria-valuemin={inspectorColumn.minWidth}
          aria-valuemax={inspectorColumn.maxWidth}
          aria-valuenow={inspectorColumn.ariaWidth}
          title="Arraste para ajustar a coluna"
          onPointerDown={inspectorColumn.beginResize}
          onDoubleClick={inspectorColumn.resetWidth}
        />
        {children}
      </div>
    </section>
  )
}
