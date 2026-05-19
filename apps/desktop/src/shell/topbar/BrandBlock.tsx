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
  /**
   * Optional callback to open the Project Profile sheet (Cmd+Shift+P also
   * triggers it). When provided, the brand becomes a button so the operator
   * can audit `repo_root`, `workspace_path`, commands and safety with one
   * click — without leaving the active surface.
   */
  onOpenWorkspaceProfile?: () => void
}

const SURFACE_LABEL: Record<Surface, string> = {
  cartografia: 'Cartografia',
  code: 'Code',
  atencao: 'Atenção',
  atlas_ai: 'Atlas AI',
  control_plane: 'Control Plane',
}

export function BrandBlock({ surface, workspaceName, onOpenWorkspaceProfile }: BrandBlockProps) {
  const surfaceLabel = SURFACE_LABEL[surface]
  const project =
    typeof workspaceName === 'string' && workspaceName.trim() !== ''
      ? workspaceName.trim()
      : 'Atlas'

  if (onOpenWorkspaceProfile) {
    return (
      <button
        type="button"
        className="brand brand-interactive"
        onClick={onOpenWorkspaceProfile}
        title="Abrir ficha do Projeto/Workspace (Cmd+Shift+P)"
        aria-label={`Project/Workspace ativo: ${project} · abrir ficha`}
      >
        <strong>
          {project} · {surfaceLabel}
        </strong>
      </button>
    )
  }

  return (
    <div className="brand">
      <strong>
        {project} · {surfaceLabel}
      </strong>
    </div>
  )
}
