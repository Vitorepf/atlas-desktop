/**
 * Project Profile Sheet · multi-project workspace inspector.
 *
 * Canon: docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
 *
 * Sheet/modal que mostra a ficha operacional completa do Projeto/Workspace
 * ativo: nome, kind, repo_root, workspace_path (e se EXISTE), production_status,
 * stack_summary, commands, test_commands, build_commands, dev_server_command,
 * critical_areas, docs_status, default_risk, deployment_notes, safety.
 *
 * Princípios:
 *   - Sem inventar campo. workspace_path inexistente é mostrado honestamente.
 *   - Read-only v1. Edição de profiles vive em config/atlas_projects.php.
 *   - Trocar de Projeto fica disponível via lista lateral curta.
 *   - Reaproveita tokens --cc-* — mesmo design system de Cartografia/Code/Atenção.
 */
import { useCallback, useEffect } from 'react'
import type { AtlasWorkspaceProfile, AtlasWorkspaceProfileList } from '@atlas/domain'
import './project-profile.css'

interface ProjectProfileSheetProps {
  open: boolean
  onClose: () => void
  workspaces: AtlasWorkspaceProfileList | null
  active: AtlasWorkspaceProfile | null
  activeSlug: string | null
  onSelect: (slug: string) => Promise<void> | void
}

export function ProjectProfileSheet({
  open,
  onClose,
  workspaces,
  active,
  activeSlug,
  onSelect,
}: ProjectProfileSheetProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSelect = useCallback(
    async (slug: string) => {
      if (slug === activeSlug) return
      await onSelect(slug)
    },
    [activeSlug, onSelect],
  )

  if (!open) return null

  const profiles = workspaces?.profiles ?? []
  const defaultSlug = workspaces?.defaultSlug ?? null

  return (
    <div
      className="atlas-project-profile-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Project/Workspace ativo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section className="atlas-project-profile-sheet">
        <header className="atlas-project-profile-header">
          <div>
            <p className="atlas-project-profile-eyebrow">Project / Workspace</p>
            <h2>{active?.name ?? activeSlug ?? 'Atlas'}</h2>
            {active ? (
              <p className="atlas-project-profile-sub">
                {active.slug} · {active.kind} ·
                <span className={`atlas-project-profile-status status-${active.productionStatus}`}>
                  {active.productionStatus}
                </span>
              </p>
            ) : (
              <p className="atlas-project-profile-sub atlas-project-profile-faint">
                read-model de projetos não disponível neste ambiente.
              </p>
            )}
          </div>
          <button
            type="button"
            className="atlas-project-profile-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        <div className="atlas-project-profile-grid">
          <aside className="atlas-project-profile-list" aria-label="Projetos disponíveis">
            <h3>Projetos</h3>
            {profiles.length === 0 ? (
              <p className="atlas-project-profile-empty">
                Backend não expôs a lista (`/atlas-code/projects/workspaces`). O escopo cai
                no default Atlas.
              </p>
            ) : (
              <ul role="list">
                {profiles.map((p) => {
                  const selected = p.slug === activeSlug
                  const isDefault = defaultSlug !== null && defaultSlug === p.slug
                  return (
                    <li
                      key={p.slug}
                      className={`atlas-project-profile-list-item${selected ? ' is-selected' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => void handleSelect(p.slug)}
                        aria-current={selected ? 'true' : undefined}
                      >
                        <span className="atlas-project-profile-list-name">{p.name}</span>
                        <span className="atlas-project-profile-list-meta">
                          {p.slug}
                          {isDefault ? ' · default' : ''}
                          {p.productionStatus === 'production' ? ' · prod' : ''}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          <article className="atlas-project-profile-detail">
            {active ? (
              <ProfileDetail profile={active} />
            ) : (
              <p className="atlas-project-profile-empty">
                Nenhum Projeto/Workspace ativo carregado.
              </p>
            )}
          </article>
        </div>

        <footer className="atlas-project-profile-footer">
          <span>Cmd+Shift+P para abrir · Esc para fechar</span>
          <span className="atlas-project-profile-faint">
            edição vive em <code>config/atlas_projects.php</code> (read-only no Desktop)
          </span>
        </footer>
      </section>
    </div>
  )
}

function ProfileDetail({ profile }: { profile: AtlasWorkspaceProfile }) {
  const pathExists = profile.workspacePathExists
  return (
    <>
      <section className="atlas-project-profile-section">
        <h4>Localização</h4>
        <dl className="atlas-project-profile-kv">
          <dt>repo_root</dt>
          <dd><code>{profile.repoRoot || '—'}</code></dd>
          <dt>workspace_path</dt>
          <dd>
            <code>{profile.workspacePath || '—'}</code>
            {profile.workspacePath ? (
              <span className={`atlas-project-profile-tag${pathExists ? ' tag-ok' : ' tag-warn'}`}>
                {pathExists ? 'existe' : 'não existe ainda'}
              </span>
            ) : null}
          </dd>
          <dt>kind</dt>
          <dd>{profile.kind}</dd>
          <dt>docs</dt>
          <dd>{profile.docsStatus}</dd>
          <dt>default_risk</dt>
          <dd>{profile.defaultRisk}</dd>
        </dl>
      </section>

      <section className="atlas-project-profile-section">
        <h4>Stack</h4>
        <p className="atlas-project-profile-paragraph">{profile.stackSummary || '—'}</p>
        {profile.criticalAreas.length > 0 ? (
          <ul className="atlas-project-profile-chips">
            {profile.criticalAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {profile.deploymentNotes ? (
        <section className="atlas-project-profile-section">
          <h4>Deploy</h4>
          <p className="atlas-project-profile-paragraph">{profile.deploymentNotes}</p>
        </section>
      ) : null}

      <section className="atlas-project-profile-section">
        <h4>Comandos canônicos</h4>
        <CommandList label="run" commands={objectToList(profile.commands)} />
        <CommandList label="test" commands={profile.testCommands} />
        <CommandList label="build" commands={profile.buildCommands} />
        {profile.devServerCommand ? (
          <CommandList label="dev_server" commands={[profile.devServerCommand]} />
        ) : null}
      </section>

      <section className="atlas-project-profile-section">
        <h4>Safety</h4>
        <dl className="atlas-project-profile-kv">
          <dt>execução permitida</dt>
          <dd>
            {profile.safety.executionAllowed ? 'sim' : 'não'}
            {!profile.safety.executionAllowed && profile.safety.executionBlockedReason ? (
              <span className="atlas-project-profile-tag tag-warn">
                {profile.safety.executionBlockedReason}
              </span>
            ) : null}
          </dd>
          <dt>risk_floor</dt>
          <dd>{profile.safety.riskFloor}</dd>
          <dt>revisão de intervenção explícita</dt>
          <dd>{profile.safety.requiresExplicitInterventionReview ? 'sim' : 'não'}</dd>
        </dl>
      </section>
    </>
  )
}

function objectToList(commands: Record<string, string>): string[] {
  return Object.entries(commands).map(([k, v]) => `${k}: ${v}`)
}

function CommandList({ label, commands }: { label: string; commands: string[] }) {
  if (!commands || commands.length === 0) {
    return (
      <div className="atlas-project-profile-command-group">
        <span className="atlas-project-profile-command-label">{label}</span>
        <span className="atlas-project-profile-faint">—</span>
      </div>
    )
  }
  return (
    <div className="atlas-project-profile-command-group">
      <span className="atlas-project-profile-command-label">{label}</span>
      <ul>
        {commands.map((cmd) => (
          <li key={cmd}>
            <code>{cmd}</code>
          </li>
        ))}
      </ul>
    </div>
  )
}
