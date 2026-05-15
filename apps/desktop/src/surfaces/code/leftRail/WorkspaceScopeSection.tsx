import type { LeftRailContext } from './leftRailTypes'

/**
 * LeftRail · Project/Workspace scope summary.
 *
 * Canon: docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
 *
 * Two-line dense display: project name + production tag, then a meta line
 * with docs_status and workspace_path resolution. The contract is "active
 * Project scoping", not a file explorer — so this is one section, not a
 * tree.
 */
export function WorkspaceScopeSection({ activeWorkspace }: LeftRailContext) {
  if (!activeWorkspace) {
    return (
      <div className="cc-eyebrow" style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontWeight: 600 }}>Atlas (default)</span>
        <span style={{ opacity: 0.7 }}>
          workspaces endpoint indisponível · escopo Atlas
        </span>
      </div>
    )
  }

  const {
    name,
    slug,
    productionStatus,
    docsStatus,
    workspacePath,
    workspacePathExists,
    safety,
  } = activeWorkspace
  const isProduction = productionStatus === 'production'
  const pathLabel = workspacePath
    ? compactPath(workspacePath)
    : 'workspace_path ausente'

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span>{name}</span>
        <span
          style={{
            fontFamily: 'var(--cc-font-mono, ui-monospace, monospace)',
            fontSize: 10,
            opacity: 0.55,
          }}
        >
          {slug}
        </span>
        {isProduction ? (
          <span
            title="Em produção · risco padrão maior · Intervenção e Obra exigem revisão explícita"
            style={{
              padding: '0 5px',
              fontSize: 9,
              lineHeight: '14px',
              borderRadius: 2,
              border: '1px solid var(--cc-warning, #d4a85a)',
              color: 'var(--cc-warning, #d4a85a)',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}
          >
            Prod
          </span>
        ) : null}
      </div>
      <div
        className="cc-eyebrow"
        style={{
          display: 'grid',
          gap: 2,
          fontSize: 10,
          opacity: 0.8,
          letterSpacing: 0.2,
        }}
      >
        <span>
          docs <strong style={{ opacity: 0.9 }}>{docsStatus}</strong>
          {' · '}
          risk floor <strong style={{ opacity: 0.9 }}>{safety.riskFloor}</strong>
        </span>
        <span
          title={workspacePath || 'workspace_path ausente'}
          style={{
            color: workspacePathExists ? undefined : 'var(--cc-warning, #d4a85a)',
            wordBreak: 'break-all',
            fontFamily: 'var(--cc-font-mono, ui-monospace, monospace)',
          }}
        >
          {pathLabel}
        </span>
        {!workspacePathExists ? (
          <span style={{ color: 'var(--cc-warning, #d4a85a)' }}>
            execução bloqueada — Consulta/Descoberta apenas
          </span>
        ) : null}
      </div>
    </div>
  )
}

function compactPath(path: string): string {
  if (path.length <= 36) return path
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 2) return path
  return `…/${parts.slice(-2).join('/')}`
}
