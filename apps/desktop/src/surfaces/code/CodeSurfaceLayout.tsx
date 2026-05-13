import type { ReactNode } from 'react'
import { useCodeColumnSizing } from './layout/useCodeColumnSizing'

interface CodeSurfaceLayoutProps {
  obra: ReactNode
  left: ReactNode
  stage: ReactNode
  right: ReactNode
  terminal: ReactNode
}

/**
 * Stable slot contract for the Atlas Code surface.
 *
 * The CSS grid still uses each child component's className/grid-area, but the
 * composition itself is no longer an unstructured fragment. New product areas
 * must enter through an explicit slot or through a registered panel inside one
 * of these slots.
 */
export function CodeSurfaceLayout({ obra, left, stage, right, terminal }: CodeSurfaceLayoutProps) {
  const { setLeftResizeNode, setRightResizeNode } = useCodeColumnSizing()

  return (
    <>
      {obra}
      {left}
      <div
        ref={setLeftResizeNode}
        aria-label="Redimensionar coluna esquerda"
        className="code-column-resizer code-column-resizer-left"
        role="separator"
      />
      {stage}
      <div
        ref={setRightResizeNode}
        aria-label="Redimensionar coluna direita"
        className="code-column-resizer code-column-resizer-right"
        role="separator"
      />
      {right}
      {terminal}
    </>
  )
}
