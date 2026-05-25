import { useEffect, useRef, useState } from 'react'
import type { AtlasWorkspaceProfile, AtlasWorkspaceProfileList } from '@atlas/domain'

interface AtlasAiWorkspacePickerProps {
  workspaces: AtlasWorkspaceProfileList | null
  activeWorkspace: AtlasWorkspaceProfile | null
  activeWorkspaceSlug: string | null
  locked: boolean
  onSelectWorkspace?: (slug: string) => Promise<void> | void
  onOpenWorkspaceProfile?: (mode?: 'view' | 'create' | 'edit') => void
}

export function AtlasAiWorkspacePicker({
  workspaces,
  activeWorkspace,
  activeWorkspaceSlug,
  locked,
  onSelectWorkspace,
  onOpenWorkspaceProfile,
}: AtlasAiWorkspacePickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement | null>(null)
  const profiles = workspaces?.profiles ?? []
  const slug = activeWorkspace?.slug ?? activeWorkspaceSlug ?? workspaces?.defaultSlug ?? 'atlas'
  const label = activeWorkspace?.name ?? slug
  const pathState = activeWorkspace?.workspacePathExists === true
    ? 'ready'
    : activeWorkspace?.workspacePath
      ? 'missing'
      : 'context'
  const pathLabel = pathState === 'ready'
    ? 'Pasta pronta'
    : pathState === 'missing'
      ? 'Pasta ausente'
      : 'Sem pasta local'
  const canChoose = !locked && typeof onSelectWorkspace === 'function' && profiles.length > 0
  const normalizedQuery = query.trim().toLowerCase()
  const visibleProfiles = normalizedQuery === ''
    ? profiles
    : profiles.filter((profile) => {
        const haystack = [
          profile.name,
          profile.slug,
          profile.workspacePath,
          profile.stackSummary,
        ].join(' ').toLowerCase()
        return haystack.includes(normalizedQuery)
      })

  useEffect(() => {
    if (!open) return
    function onDocClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function select(slugToSelect: string) {
    setOpen(false)
    setQuery('')
    if (slugToSelect === activeWorkspaceSlug || !onSelectWorkspace) return
    await onSelectWorkspace(slugToSelect)
  }

  return (
    <div className="atlas-ai-workspace-picker" ref={ref}>
      <button
        type="button"
        className="atlas-ai-workspace-picker-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Projeto ativo: ${label}. ${pathLabel}`}
        title={locked ? 'Esta conversa está vinculada a este projeto. Abra a ficha para ajustar a pasta.' : 'Selecionar projeto da conversa'}
        disabled={!locked && !canChoose && typeof onOpenWorkspaceProfile !== 'function'}
        onClick={() => {
          if (locked) {
            onOpenWorkspaceProfile?.('edit')
            return
          }
          if (!canChoose && typeof onOpenWorkspaceProfile === 'function') {
            onOpenWorkspaceProfile()
            return
          }
          if (!canChoose) return
          setOpen((value) => !value)
        }}
      >
        <span className="atlas-ai-workspace-picker-icon" aria-hidden="true">
          <svg viewBox="0 0 18 18" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 5.5h5l1.2 1.5h6.8v6.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 2.5 13.5v-8Z" />
            <path d="M2.5 5.5V4A1.5 1.5 0 0 1 4 2.5h3l1.2 1.5H14a1.5 1.5 0 0 1 1.5 1.5V7" opacity="0.55" />
          </svg>
        </span>
        <span className="atlas-ai-workspace-picker-label">{label}</span>
        {!locked ? (
          <span className="atlas-ai-workspace-picker-caret" aria-hidden="true">⌄</span>
        ) : null}
      </button>

      {open && !locked ? (
        <div className="atlas-ai-workspace-picker-menu" role="listbox" aria-label="Projetos disponíveis">
          <label className="atlas-ai-workspace-picker-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Pesquisar projetos"
              autoFocus
            />
          </label>
          {visibleProfiles.map((profile) => {
            const selected = profile.slug === activeWorkspaceSlug
            return (
              <button
                key={profile.slug}
                type="button"
                role="option"
                aria-selected={selected}
                className={`atlas-ai-workspace-picker-item${selected ? ' is-selected' : ''}`}
                onClick={() => void select(profile.slug)}
              >
                <span className="atlas-ai-workspace-picker-folder" aria-hidden="true">
                  <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 5.5h5l1.2 1.5h6.8v6.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 2.5 13.5v-8Z" />
                    <path d="M2.5 5.5V4A1.5 1.5 0 0 1 4 2.5h3l1.2 1.5H14a1.5 1.5 0 0 1 1.5 1.5V7" opacity="0.55" />
                  </svg>
                </span>
                <span className="atlas-ai-workspace-picker-item-copy">
                  <span>{profile.name}</span>
                  <small>
                    {profile.workspacePathExists
                      ? 'Pasta pronta'
                      : profile.workspacePath
                        ? 'Pasta ausente'
                        : 'Sem pasta local'}
                  </small>
                </span>
              </button>
            )
          })}
          {visibleProfiles.length === 0 ? (
            <p className="atlas-ai-workspace-picker-empty">
              Nenhum projeto encontrado.
            </p>
          ) : null}
          <button
            type="button"
            className="atlas-ai-workspace-picker-add"
            onClick={() => {
              setOpen(false)
              setQuery('')
              onOpenWorkspaceProfile?.('create')
            }}
          >
            <span aria-hidden="true">＋</span>
            Adicionar novo projeto
          </button>
        </div>
      ) : null}
    </div>
  )
}
