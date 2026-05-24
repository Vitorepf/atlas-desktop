/**
 * Project Profile Sheet · multi-project workspace inspector.
 *
 * Canon: docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
 *
 * Sheet/modal que mostra a ficha operacional completa do Projeto
 * ativo: nome, kind, repo_root, workspace_path (e se EXISTE), production_status,
 * stack_summary, commands, test_commands, build_commands, dev_server_command,
 * critical_areas, docs_status, default_risk, deployment_notes, safety.
 *
 * Princípios:
 *   - Sem inventar campo. workspace_path inexistente é mostrado honestamente.
 *   - Edição operacional usa backend persistido; config continua origem dos
 *     profiles shipped.
 *   - Trocar de Projeto fica disponível via lista lateral curta.
 *   - Reaproveita tokens --cc-* — mesmo design system de Cartografia/Code/Atenção.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { AtlasWorkspaceProfile, AtlasWorkspaceProfileList } from '@atlas/domain'
import type { AtlasWorkspaceProfileWritePayload } from '../../lib/bridge'
import type { ProjectProfileMode } from './useProjectProfile'
import './project-profile.css'

interface ProjectProfileSheetProps {
  open: boolean
  initialMode?: ProjectProfileMode
  onClose: () => void
  workspaces: AtlasWorkspaceProfileList | null
  active: AtlasWorkspaceProfile | null
  activeSlug: string | null
  onSelect: (slug: string) => Promise<void> | void
  onCreate?: (payload: AtlasWorkspaceProfileWritePayload) => Promise<AtlasWorkspaceProfile | null> | AtlasWorkspaceProfile | null
  onUpdate?: (slug: string, payload: AtlasWorkspaceProfileWritePayload) => Promise<AtlasWorkspaceProfile | null> | AtlasWorkspaceProfile | null
  onArchive?: (slug: string) => Promise<AtlasWorkspaceProfile | null> | AtlasWorkspaceProfile | null
  onPickWorkspaceFolder?: () => Promise<string | null> | string | null
}

function explainProjectProfileError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const compact = message.replace(/\s+/g, ' ').trim()
  const lower = compact.toLowerCase()

  if (
    lower.includes('backend') ||
    lower.includes('endpoint') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('http ')
  ) {
    return 'Não consegui salvar no serviço local agora. Verifique o Atlas e tente novamente.'
  }

  return compact || 'Não consegui salvar esta configuração agora.'
}

export function ProjectProfileSheet({
  open,
  initialMode = 'view',
  onClose,
  workspaces,
  active,
  activeSlug,
  onSelect,
  onCreate,
  onUpdate,
  onArchive,
  onPickWorkspaceFolder,
}: ProjectProfileSheetProps) {
  const [mode, setMode] = useState<ProjectProfileMode>(initialMode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setError(null)
    }
  }, [initialMode, open])

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

  const payloadFromProfile = useCallback((profile: AtlasWorkspaceProfile, workspacePath: string): AtlasWorkspaceProfileWritePayload => ({
    slug: profile.slug,
    name: profile.name,
    kind: profile.kind,
    workspace_path: workspacePath,
    repo_root: workspacePath,
    production_status: profile.productionStatus,
    stack_summary: profile.stackSummary,
    commands: profile.commands,
    test_commands: profile.testCommands,
    build_commands: profile.buildCommands,
    dev_server_command: profile.devServerCommand,
    critical_areas: profile.criticalAreas,
    docs_status: profile.docsStatus,
    default_risk: profile.defaultRisk,
    deployment_notes: profile.deploymentNotes,
    surfaces_enabled: profile.surfacesEnabled,
    source: 'operator',
    status: profile.status ?? 'active',
  }), [])

  const handlePickAndSave = useCallback(async () => {
    if (!active || !onUpdate || !onPickWorkspaceFolder) {
      setMode('edit')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const selected = await onPickWorkspaceFolder()
      if (!selected) {
        return
      }
      const updated = await onUpdate(active.slug, payloadFromProfile(active, selected))
      if (!updated?.slug) {
        setError('A pasta foi selecionada, mas o serviço local não confirmou a atualização.')
        return
      }
      await onSelect(updated.slug)
      setMode('view')
    } catch (e) {
      setError(explainProjectProfileError(e))
    } finally {
      setSaving(false)
    }
  }, [active, onPickWorkspaceFolder, onSelect, onUpdate, payloadFromProfile])

  if (!open) return null

  const profiles = workspaces?.profiles ?? []
  const defaultSlug = workspaces?.defaultSlug ?? null
  const detailTitle = mode === 'create' ? 'Novo projeto' : mode === 'edit' ? 'Editar projeto' : 'Configuração do projeto'

  return (
    <div
      className="atlas-project-profile-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Projeto e pasta local"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section className="atlas-project-profile-sheet">
        <header className="atlas-project-profile-header">
          <div>
            <p className="atlas-project-profile-eyebrow">Projeto / Pasta local</p>
            <h2>{active?.name ?? activeSlug ?? 'Atlas'}</h2>
            {active ? (
              <p className="atlas-project-profile-sub">
                {kindLabel(active.kind)} ·
                <span className={`atlas-project-profile-status status-${active.productionStatus}`}>
                  {productionStatusLabel(active.productionStatus)}
                </span>
              </p>
            ) : (
              <p className="atlas-project-profile-sub atlas-project-profile-faint">
                Lista de projetos indisponível neste ambiente.
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
            <div className="atlas-project-profile-list-head">
              <h3>Projetos</h3>
              <button
                type="button"
                className="atlas-project-profile-mini-action"
                onClick={() => setMode('create')}
                disabled={!onCreate}
              >
                + novo
              </button>
            </div>
            {profiles.length === 0 ? (
              <p className="atlas-project-profile-empty">
                A lista de projetos não está disponível agora. O Atlas mantém o Projeto padrão
                para você continuar.
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
                          {isDefault ? ' · padrão' : ''}
                          {p.productionStatus === 'production' ? ' · produção' : ''}
                          {p.status === 'archived' ? ' · arquivado' : ''}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          <article className="atlas-project-profile-detail">
            <div className="atlas-project-profile-detail-head">
              <p>{detailTitle}</p>
              {mode !== 'view' ? (
                <button
                  type="button"
                  className="atlas-project-profile-action-secondary"
                  disabled={saving}
                  onClick={() => setMode('view')}
                >
                  voltar
                </button>
              ) : null}
            </div>
            {error ? <p className="atlas-project-profile-error">{error}</p> : null}
            {mode === 'create' ? (
              <ProfileForm
                key="create"
                saving={saving}
                onPickWorkspaceFolder={onPickWorkspaceFolder}
                onCancel={() => setMode('view')}
                onSubmit={async (payload) => {
                  if (!onCreate) return
                  setSaving(true)
                  setError(null)
                  try {
                    const created = await onCreate(payload)
                    if (created?.slug) {
                      await onSelect(created.slug)
                      setMode('view')
                    }
                  } catch (e) {
                    setError(explainProjectProfileError(e))
                  } finally {
                    setSaving(false)
                  }
                }}
              />
            ) : mode === 'edit' && active ? (
              <ProfileForm
                key={`edit-${active.slug}`}
                profile={active}
                saving={saving}
                onPickWorkspaceFolder={onPickWorkspaceFolder}
                onCancel={() => setMode('view')}
                onArchive={
                  active.source === 'config' || !onArchive
                    ? undefined
                    : async () => {
                        setSaving(true)
                        setError(null)
                        try {
                          await onArchive(active.slug)
                          setMode('view')
                        } catch (e) {
                          setError(explainProjectProfileError(e))
                        } finally {
                          setSaving(false)
                        }
                      }
                }
                onSubmit={async (payload) => {
                  if (!onUpdate) return
                  setSaving(true)
                  setError(null)
                  try {
                    const updated = await onUpdate(active.slug, payload)
                    if (updated?.slug) setMode('view')
                  } catch (e) {
                    setError(explainProjectProfileError(e))
                  } finally {
                    setSaving(false)
                  }
                }}
              />
            ) : active ? (
              <ProfileDetail
                profile={active}
                saving={saving}
                onEdit={() => setMode('edit')}
                onLinkFolder={handlePickAndSave}
                canLinkFolder={Boolean(onUpdate)}
              />
            ) : (
              <p className="atlas-project-profile-empty">
                Nenhum Projeto ativo carregado.
              </p>
            )}
          </article>
        </div>

        <footer className="atlas-project-profile-footer">
          <span>Cmd+Shift+P para abrir · Esc para fechar</span>
          <span className="atlas-project-profile-faint">pasta local libera contexto real, testes, terminal e execução local</span>
        </footer>
      </section>
    </div>
  )
}

interface ProfileFormProps {
  profile?: AtlasWorkspaceProfile
  saving: boolean
  onSubmit: (payload: AtlasWorkspaceProfileWritePayload) => Promise<void> | void
  onCancel: () => void
  onArchive?: () => Promise<void> | void
  onPickWorkspaceFolder?: () => Promise<string | null> | string | null
}

function ProfileForm({ profile, saving, onSubmit, onCancel, onArchive, onPickWorkspaceFolder }: ProfileFormProps) {
  const [slug, setSlug] = useState(profile?.slug ?? '')
  const [name, setName] = useState(profile?.name ?? '')
  const [kind, setKind] = useState(profile?.kind ?? 'product')
  const [workspacePath, setWorkspacePath] = useState(profile?.workspacePath ?? '')
  const [repoRoot, setRepoRoot] = useState(profile?.repoRoot ?? profile?.workspacePath ?? '')
  const [productionStatus, setProductionStatus] = useState(profile?.productionStatus ?? 'development')
  const [docsStatus, setDocsStatus] = useState(profile?.docsStatus ?? 'unknown')
  const [defaultRisk, setDefaultRisk] = useState(profile?.defaultRisk ?? 'medium')
  const [stackSummary, setStackSummary] = useState(profile?.stackSummary ?? '')
  const [testCommands, setTestCommands] = useState((profile?.testCommands ?? []).join('\n'))
  const [buildCommands, setBuildCommands] = useState((profile?.buildCommands ?? []).join('\n'))
  const [devServerCommand, setDevServerCommand] = useState(profile?.devServerCommand ?? '')
  const [criticalAreas, setCriticalAreas] = useState((profile?.criticalAreas ?? []).join('\n'))
  const [surfacesEnabled, setSurfacesEnabled] = useState((profile?.surfacesEnabled ?? ['atlas_ai', 'cartografia', 'code', 'atencao']).join('\n'))
  const [deploymentNotes, setDeploymentNotes] = useState(profile?.deploymentNotes ?? '')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const generatedSlug = useMemo(() => slugify(name), [name])
  const canSubmit = slug.trim() !== '' && name.trim() !== '' && !saving

  const buildPayload = (overrides: Partial<AtlasWorkspaceProfileWritePayload> = {}): AtlasWorkspaceProfileWritePayload => {
    const nextWorkspacePath = String(overrides.workspace_path ?? workspacePath).trim()
    const nextSlug = String(overrides.slug ?? slug).trim()
    const nextName = String(overrides.name ?? name).trim()
    return {
      slug: nextSlug,
      name: nextName,
      kind: String(overrides.kind ?? kind),
      workspace_path: nextWorkspacePath,
      repo_root: String(overrides.repo_root ?? repoRoot).trim() || nextWorkspacePath,
      production_status: String(overrides.production_status ?? productionStatus),
      stack_summary: String(overrides.stack_summary ?? stackSummary).trim(),
      test_commands: Array.isArray(overrides.test_commands) ? overrides.test_commands : lines(testCommands),
      build_commands: Array.isArray(overrides.build_commands) ? overrides.build_commands : lines(buildCommands),
      dev_server_command: typeof overrides.dev_server_command === 'string' ? overrides.dev_server_command : (devServerCommand.trim() || null),
      critical_areas: Array.isArray(overrides.critical_areas) ? overrides.critical_areas : lines(criticalAreas),
      docs_status: String(overrides.docs_status ?? docsStatus),
      default_risk: String(overrides.default_risk ?? defaultRisk),
      deployment_notes: String(overrides.deployment_notes ?? deploymentNotes).trim(),
      surfaces_enabled: Array.isArray(overrides.surfaces_enabled) ? overrides.surfaces_enabled : lines(surfacesEnabled),
      source: 'operator',
      status: 'active',
    }
  }

  const submitCurrent = async () => {
    if (!canSubmit) return
    await onSubmit(buildPayload())
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await submitCurrent()
  }

  const pickFolder = async () => {
    if (!onPickWorkspaceFolder) return
    const selected = await onPickWorkspaceFolder()
    if (!selected) return
    const folderName = basenameFromPath(selected)
    setWorkspacePath(selected)
    if (repoRoot.trim() === '' || repoRoot.trim() === workspacePath.trim()) {
      setRepoRoot(selected)
    }
    if (!profile && name.trim() === '' && folderName) {
      setName(folderName)
      if (slug.trim() === '') setSlug(slugify(folderName))
    }
  }

  const createFromFolder = async () => {
    if (profile || !onPickWorkspaceFolder) return
    const selected = await onPickWorkspaceFolder()
    if (!selected) return
    const folderName = basenameFromPath(selected) || 'Projeto'
    const folderSlug = slugify(folderName) || `projeto-${Date.now()}`
    await onSubmit(buildPayload({
      slug: slug.trim() || folderSlug,
      name: name.trim() || folderName,
      workspace_path: selected,
      repo_root: selected,
    }))
  }

  return (
    <form className="atlas-project-profile-form" onSubmit={(event) => void submit(event)}>
      <div className="atlas-project-profile-form-intro">
        <strong>{profile ? 'Editar projeto' : 'Adicionar projeto'}</strong>
        <span>
          Escolha uma pasta real do Mac para liberar código, testes, terminal e Finder. Sem pasta local,
          o projeto continua como contexto de consulta.
        </span>
        {!profile ? (
          <button
            type="button"
            className="atlas-project-profile-folder-first"
            disabled={saving || !onPickWorkspaceFolder}
            onClick={() => void createFromFolder()}
          >
            escolher pasta do Mac e criar projeto
          </button>
        ) : null}
      </div>
      <div className="atlas-project-profile-form-grid">
        <label>
          <span>nome do projeto <InfoTip text="Nome humano que aparece na lista lateral e no seletor de projeto." /></span>
          <input value={name} onChange={(e) => {
            const next = e.target.value
            setName(next)
            if (!profile && (slug.trim() === '' || slug === generatedSlug)) setSlug(slugify(next))
          }} placeholder="Blackink" />
        </label>
        <label>
          <span>identificador <InfoTip text="Chave curta e estável usada internamente para agrupar conversas e obras deste projeto." /></span>
          <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="blackink" disabled={Boolean(profile)} />
        </label>
        <label>
          <span>tipo de projeto <InfoTip text="Ajuda o Atlas a decidir risco, linguagem e escopo padrão." /></span>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="product">Produto</option>
            <option value="client">Cliente</option>
            <option value="library">Biblioteca</option>
            <option value="experiment">Experimento</option>
          </select>
        </label>
        <label>
          <span>estado <InfoTip text="Produção aumenta o cuidado: rollback, testes e escopo ficam mais importantes." /></span>
          <select value={productionStatus} onChange={(e) => setProductionStatus(e.target.value)}>
            <option value="development">Desenvolvimento</option>
            <option value="staging">Homologação</option>
            <option value="production">Produção</option>
            <option value="unknown">Desconhecido</option>
          </select>
        </label>
      </div>

      <label>
        <span>pasta do Mac <InfoTip text="Escolha a pasta real do repositório no Finder. Sem isso o Atlas não deve executar código neste projeto." /></span>
        <div className="atlas-project-profile-path-row">
          <input value={workspacePath} onChange={(e) => setWorkspacePath(e.target.value)} placeholder="Escolha uma pasta real do projeto" />
          <button type="button" className="atlas-project-profile-action-secondary" onClick={() => void pickFolder()} disabled={saving || !onPickWorkspaceFolder}>
            escolher pasta…
          </button>
        </div>
        <small>Use o Finder. Esta é a pasta que libera execução, terminal, testes e contexto real.</small>
      </label>
      <details
        className="atlas-project-profile-advanced"
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
      >
        <summary>
          <span>Configuração avançada</span>
          <small>risco, comandos, áreas sensíveis e superfícies liberadas</small>
        </summary>
        <div className="atlas-project-profile-advanced-body">
          <label>
            <span>raiz do repositório <InfoTip text="Use quando a pasta do projeto contém vários repositórios e o código principal fica em uma subpasta." /></span>
            <input value={repoRoot} onChange={(e) => setRepoRoot(e.target.value)} placeholder="normalmente igual à pasta do Mac" />
            <small>Deixe igual à pasta do Mac quando o repositório começa nela.</small>
          </label>
          <label>
            <span>resumo técnico curto <InfoTip text="Explique a stack e os pontos críticos em uma frase curta. Isso melhora contexto e reduz suposição." /></span>
            <textarea value={stackSummary} onChange={(e) => setStackSummary(e.target.value)} rows={3} placeholder="Stack, apps principais, runtime e pontos críticos." />
          </label>

          <div className="atlas-project-profile-form-grid">
            <label>
              <span>documentação</span>
              <select value={docsStatus} onChange={(e) => setDocsStatus(e.target.value)}>
                <option value="canonical">Canônica</option>
                <option value="partial">Parcial</option>
                <option value="incomplete">Incompleta</option>
                <option value="unknown">Desconhecida</option>
              </select>
            </label>
            <label>
              <span>risco padrão</span>
              <select value={defaultRisk} onChange={(e) => setDefaultRisk(e.target.value)}>
                <option value="low">Baixo</option>
                <option value="medium">Médio</option>
                <option value="high">Alto</option>
                <option value="critical">Crítico</option>
              </select>
            </label>
          </div>

          <div className="atlas-project-profile-form-grid">
            <label>
              <span>comandos de teste</span>
              <textarea value={testCommands} onChange={(e) => setTestCommands(e.target.value)} rows={4} placeholder="npm test" />
            </label>
            <label>
              <span>comandos de build</span>
              <textarea value={buildCommands} onChange={(e) => setBuildCommands(e.target.value)} rows={4} placeholder="npm run build" />
            </label>
          </div>
          <label>
            <span>servidor local</span>
            <input value={devServerCommand} onChange={(e) => setDevServerCommand(e.target.value)} placeholder="npm run dev" />
          </label>
          <div className="atlas-project-profile-form-grid">
            <label>
              <span>áreas sensíveis</span>
              <textarea value={criticalAreas} onChange={(e) => setCriticalAreas(e.target.value)} rows={4} placeholder="auth&#10;billing&#10;runtime" />
            </label>
            <label>
              <span>superfícies liberadas</span>
              <textarea value={surfacesEnabled} onChange={(e) => setSurfacesEnabled(e.target.value)} rows={4} />
            </label>
          </div>
          <label>
            <span>notas de produção <InfoTip text="Registre regras de deploy, rollback e cuidados que a IA precisa respeitar antes de mexer." /></span>
            <textarea value={deploymentNotes} onChange={(e) => setDeploymentNotes(e.target.value)} rows={3} />
          </label>
        </div>
      </details>

      <div className="atlas-project-profile-form-actions">
        {onArchive ? (
          <button type="button" className="atlas-project-profile-danger" disabled={saving} onClick={() => void onArchive()}>
            arquivar
          </button>
        ) : <span />}
        <div>
          <button type="button" className="atlas-project-profile-action-secondary" disabled={saving} onClick={onCancel}>
            cancelar
          </button>
          <button type="button" className="atlas-project-profile-action-primary" disabled={!canSubmit} onClick={() => void submitCurrent()}>
            {saving ? 'salvando…' : 'salvar projeto'}
          </button>
        </div>
      </div>
    </form>
  )
}

function lines(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function basenameFromPath(value: string): string {
  const cleaned = value.trim().replace(/[\\/]+$/g, '')
  if (cleaned === '') return ''
  return cleaned.split(/[\\/]/).pop() ?? cleaned
}

function ProfileDetail({
  profile,
  saving,
  onEdit,
  onLinkFolder,
  canLinkFolder,
}: {
  profile: AtlasWorkspaceProfile
  saving: boolean
  onEdit: () => void
  onLinkFolder: () => Promise<void> | void
  canLinkFolder: boolean
}) {
  const pathExists = profile.workspacePathExists
  const hasPath = profile.workspacePath.trim() !== ''
  const localState = pathExists ? 'Pasta pronta' : hasPath ? 'Pasta ausente' : 'Sem pasta local'
  const executionState = profile.safety.executionAllowed ? 'Execução liberada' : 'Consulta segura'
  return (
    <>
      <section className="atlas-project-profile-hero">
        <div>
          <p className="atlas-project-profile-hero-kicker">Projeto ativo</p>
          <h3>{profile.name}</h3>
          <p>
            {pathExists
              ? 'Este projeto está ligado a uma pasta real do Mac. Atlas pode usar contexto, testes e execução local.'
              : hasPath
                ? 'Este projeto aponta para uma pasta que não está acessível agora. Corrija a pasta antes de usar execução local.'
                : 'Este projeto está salvo como contexto, mas ainda não está ligado a uma pasta real do Mac.'}
          </p>
        </div>
        <div className="atlas-project-profile-hero-actions">
          <button type="button" className="atlas-project-profile-action-primary" onClick={() => void onLinkFolder()} disabled={saving || !canLinkFolder}>
            {saving ? 'salvando...' : pathExists ? 'Trocar pasta' : 'Escolher pasta do Mac'}
          </button>
          <button type="button" className="atlas-project-profile-action-secondary" onClick={onEdit} disabled={saving}>
            editar ficha
          </button>
        </div>
      </section>

      <section className="atlas-project-profile-status-grid" aria-label="Estado operacional">
        <StatusCard label="Pasta local" value={localState} tone={pathExists ? 'ok' : 'warn'} detail={profile.workspacePath || 'Nenhuma pasta escolhida'} />
        <StatusCard label="Execução" value={executionState} tone={profile.safety.executionAllowed ? 'ok' : 'warn'} detail={profile.safety.executionBlockedReason ?? 'Código, testes e terminal dependem da pasta.'} />
        <StatusCard
          label="Risco"
          value={riskLabel(profile.defaultRisk)}
          tone={profile.defaultRisk === 'high' || profile.defaultRisk === 'critical' ? 'warn' : 'neutral'}
          detail={`${productionStatusLabel(profile.productionStatus)} · documentação ${docsStatusLabel(profile.docsStatus)}`}
        />
      </section>

      <section className="atlas-project-profile-section">
        <h4>O que este projeto é</h4>
        <p className="atlas-project-profile-paragraph">{profile.stackSummary || 'Stack ainda não catalogada. Vincule a pasta e registre os comandos principais para o Atlas trabalhar com menos suposição.'}</p>
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
          <h4>Produção</h4>
          <p className="atlas-project-profile-paragraph">{profile.deploymentNotes}</p>
        </section>
      ) : null}

      <section className="atlas-project-profile-section">
        <h4>Comandos que o Atlas pode usar</h4>
        <CommandList label="Run" commands={objectToList(profile.commands)} />
        <CommandList label="Testes" commands={profile.testCommands} />
        <CommandList label="Build" commands={profile.buildCommands} />
        {profile.devServerCommand ? (
          <CommandList label="Dev server" commands={[profile.devServerCommand]} />
        ) : null}
      </section>

      <details className="atlas-project-profile-technical">
        <summary>Detalhes técnicos</summary>
        <dl className="atlas-project-profile-kv">
          <dt>pasta do Mac</dt>
          <dd><code>{profile.workspacePath || '—'}</code></dd>
          <dt>raiz do repositório</dt>
          <dd><code>{profile.repoRoot || '—'}</code></dd>
          <dt>tipo</dt>
          <dd>{kindLabel(profile.kind)}</dd>
          <dt>execução permitida</dt>
          <dd>
            {profile.safety.executionAllowed ? 'sim' : 'não'}
            {!profile.safety.executionAllowed && profile.safety.executionBlockedReason ? (
              <span className="atlas-project-profile-tag tag-warn">
                {profile.safety.executionBlockedReason}
              </span>
            ) : null}
          </dd>
          <dt>risco mínimo</dt>
          <dd>{profile.safety.riskFloor}</dd>
          <dt>revisão de intervenção explícita</dt>
          <dd>{profile.safety.requiresExplicitInterventionReview ? 'sim' : 'não'}</dd>
        </dl>
      </details>
    </>
  )
}

function StatusCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone: 'ok' | 'warn' | 'neutral'
}) {
  return (
    <div className={`atlas-project-profile-status-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  )
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="atlas-project-profile-info" title={text} aria-label={text}>
      i
    </span>
  )
}

function productionStatusLabel(value: string): string {
  switch (value) {
    case 'production':
      return 'Produção'
    case 'staging':
      return 'Homologação'
    case 'development':
      return 'Desenvolvimento'
    default:
      return 'Desconhecido'
  }
}

function kindLabel(value: string): string {
  switch (value) {
    case 'product':
      return 'Produto'
    case 'client':
      return 'Cliente'
    case 'library':
      return 'Biblioteca'
    case 'experiment':
      return 'Experimento'
    default:
      return value
  }
}

function docsStatusLabel(value: string): string {
  switch (value) {
    case 'canonical':
      return 'canônica'
    case 'partial':
      return 'parcial'
    case 'incomplete':
      return 'incompleta'
    default:
      return 'desconhecida'
  }
}

function riskLabel(value: string): string {
  switch (value) {
    case 'low':
      return 'Baixo'
    case 'medium':
      return 'Médio'
    case 'high':
      return 'Alto'
    case 'critical':
      return 'Crítico'
    default:
      return value
  }
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
