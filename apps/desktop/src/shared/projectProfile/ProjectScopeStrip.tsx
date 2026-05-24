/**
 * ProjectScopeStrip · cintinha "Scope" reaproveitável por qualquer surface.
 *
 * Mostra de forma densa o Projeto ativo + pasta local truncada + estado
 * da pasta. Clicável: abre o Project Profile Sheet quando o callback é
 * provido. Sem cores cyber, segue tokens --cc-*.
 */
import type { AtlasWorkspaceProfile } from '@atlas/domain'

interface ProjectScopeStripProps {
  active: AtlasWorkspaceProfile | null
  activeSlug: string | null
  onOpenProfile?: () => void
  /** Slug do default workspace; quando o ativo == default, mostra `· default`. */
  defaultSlug?: string | null
  /** Override de label (ex: "Atlas AI"). Default = não mostra. */
  surfaceLabel?: string | null
}

function truncate(value: string, max = 56): string {
  if (value.length <= max) return value
  return `…${value.slice(-(max - 1))}`
}

function folderStateLabel(active: AtlasWorkspaceProfile | null): string {
  if (!active?.workspacePath) return 'Sem pasta local'
  return active.workspacePathExists ? 'Pasta pronta' : 'Pasta ausente'
}

export function ProjectScopeStrip({
  active,
  activeSlug,
  onOpenProfile,
  defaultSlug,
  surfaceLabel,
}: ProjectScopeStripProps) {
  const name = active?.name ?? activeSlug ?? 'Atlas'
  const folderPath = active?.workspacePath || active?.repoRoot || null
  const wsExists = active?.workspacePathExists ?? null
  const status = active?.productionStatus ?? null
  const isDefault = defaultSlug !== null && defaultSlug !== undefined && (active?.slug ?? activeSlug) === defaultSlug
  const folderLabel = folderStateLabel(active)

  const interactive = typeof onOpenProfile === 'function'

  const content = (
    <>
      <span className="atlas-project-strip-eyebrow">Projeto</span>
      <span className="atlas-project-strip-name">{name}</span>
      <span className="atlas-project-strip-divider" aria-hidden="true">·</span>
      <span className={`atlas-project-strip-folder${wsExists === false ? ' is-missing' : ''}`}>
        {folderLabel}{isDefault ? ' · padrão' : ''}
      </span>
      {status === 'production' ? (
        <span className="atlas-project-strip-tag tag-prod" title="Projeto em produção · risco padrão maior">
          PROD
        </span>
      ) : null}
      {wsExists === false ? (
        <span className="atlas-project-strip-tag tag-warn" title="Pasta local configurada, mas não encontrada">
          pasta ausente
        </span>
      ) : null}
      {folderPath ? (
        <span className="atlas-project-strip-repo" title={folderPath}>
          <span className="atlas-project-strip-divider" aria-hidden="true">·</span>
          <code>{truncate(folderPath)}</code>
        </span>
      ) : null}
      {surfaceLabel ? (
        <>
          <span className="atlas-project-strip-divider" aria-hidden="true">·</span>
          <span className="atlas-project-strip-surface">{surfaceLabel}</span>
        </>
      ) : null}
      {interactive ? (
        <span className="atlas-project-strip-link" aria-hidden="true">ver perfil →</span>
      ) : null}
    </>
  )

  if (!interactive) {
    return <div className="atlas-project-strip">{content}</div>
  }

  return (
    <button
      type="button"
      className="atlas-project-strip atlas-project-strip-interactive"
      onClick={onOpenProfile}
      title="Abrir ficha do Projeto (Cmd+Shift+P)"
    >
      {content}
    </button>
  )
}
