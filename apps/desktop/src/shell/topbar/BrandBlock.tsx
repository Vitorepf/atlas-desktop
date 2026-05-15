import type { Surface } from '../../hooks/useSurface'

interface BrandBlockProps {
  surface: Surface
  /**
   * Atlas Code · multi-project scoping. When set, the brand reads
   * `{workspaceName} · {Surface}` so the operator always knows which
   * Project/Workspace is currently active (Atlas, Blackink, …).
   *
   * Canon: docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
   */
  workspaceName?: string | null
}

export function BrandBlock({ surface, workspaceName }: BrandBlockProps) {
  const surfaceLabel = surface === 'cartografia' ? 'Cartografia' : 'Code'
  const project =
    typeof workspaceName === 'string' && workspaceName.trim() !== ''
      ? workspaceName.trim()
      : 'Atlas'

  return (
    <div className="brand">
      <strong>
        {project} · {surfaceLabel}
      </strong>
    </div>
  )
}
