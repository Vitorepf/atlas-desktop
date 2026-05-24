import { useCallback, useEffect, useRef, useState } from 'react'
import type { AtlasWorkspaceProfile, AtlasWorkspaceProfileList } from '@atlas/domain'

/**
 * Atlas Code · Project/Workspace selector pill.
 *
 * Canon: docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
 *
 * Discreet pill anchored next to the brand block. Shows the active
 * Project (Atlas / Blackink / …) and, on click, opens a flat list of
 * available workspaces. Production status appears as a small caps tag
 * so the operator knows when they are scoped into a high-risk product.
 *
 * The component is intentionally dense and operational — no marketing
 * card, no nested cards, no full sidebar tree. The contract is
 * "active Project scoping", per canon.
 */
interface WorkspacePillProps {
  workspaces: AtlasWorkspaceProfileList | null
  active: AtlasWorkspaceProfile | null
  activeSlug: string | null
  onSelect: (slug: string) => Promise<void> | void
  /** Disable interaction (e.g. while busy / loading). */
  disabled?: boolean
  /** Opens the Project Profile sheet for the active workspace. */
  onOpenProfile?: () => void
}

function projectFolderLabel(profile: AtlasWorkspaceProfile): string {
  if (!profile.workspacePath) return 'Sem pasta local'
  return profile.workspacePathExists ? 'Pasta pronta' : 'Pasta ausente'
}

function projectDocsLabel(profile: AtlasWorkspaceProfile): string {
  if (profile.docsStatus === 'complete') return 'docs prontas'
  if (profile.docsStatus === 'partial') return 'docs parciais'
  return 'docs pendentes'
}

export function WorkspacePill({ workspaces, active, activeSlug, onSelect, disabled, onOpenProfile }: WorkspacePillProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const profiles = workspaces?.profiles ?? []
  const fallbackName = active?.name ?? (activeSlug ? activeSlug : 'Atlas')
  const activeFolderLabel = active ? projectFolderLabel(active) : 'Sem pasta local'
  const activeFolderReady = active?.workspacePathExists === true
  const productionStatus = active?.productionStatus ?? 'development'
  const isProduction = productionStatus === 'production'

  useEffect(() => {
    if (!open) return
    function onDocClick(event: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(event.target as Node)) setOpen(false)
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

  const handleSelect = useCallback(
    async (slug: string) => {
      setOpen(false)
      if (slug === activeSlug) return
      await onSelect(slug)
    },
    [activeSlug, onSelect]
  )

  // When the backend has no workspaces endpoint yet, still render the pill so
  // the operator sees the (Atlas-default) scope label, but disable interaction.
  // The dropdown is also reachable when only the active profile is known so the
  // operator can still open the profile inspector.
  const hasProfileInspector = typeof onOpenProfile === 'function'
  const interactive = !disabled && (profiles.length > 1 || hasProfileInspector)

  const handleOpenProfile = useCallback(() => {
    setOpen(false)
    onOpenProfile?.()
  }, [onOpenProfile])

  return (
    <div ref={ref} className="workspace-pill" style={{ position: 'relative' }}>
      <button
        type="button"
        className="workspace-pill-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Projeto ativo: ${fallbackName}. ${activeFolderLabel}`}
        disabled={!interactive}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'transparent',
          color: 'var(--cc-text, inherit)',
          border: '1px solid var(--cc-border-soft, rgba(255,255,255,0.12))',
          borderRadius: 4,
          fontSize: 11,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          fontFamily: 'var(--cc-font-mono, ui-monospace, SFMono-Regular, monospace)',
          cursor: interactive ? 'pointer' : 'default',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span aria-hidden="true" style={{ opacity: 0.7 }}>◆</span>
        <span>{fallbackName}</span>
        <span
          title={activeFolderReady ? 'Pasta local pronta para contexto e execução' : 'Escolha a pasta local do Mac'}
          style={{
            padding: '0 5px',
            fontSize: 9,
            lineHeight: '14px',
            borderRadius: 2,
            border: activeFolderReady
              ? '1px solid rgba(98, 160, 122, 0.45)'
              : '1px solid var(--cc-warning, #d4a85a)',
            color: activeFolderReady
              ? 'var(--cc-success, #8ad09a)'
              : 'var(--cc-warning, #d4a85a)',
            letterSpacing: 0.4,
            textTransform: 'none',
          }}
        >
          {activeFolderLabel}
        </span>
        {isProduction ? (
          <span
            aria-label="Projeto em produção"
            title="Projeto em produção · risco padrão maior"
            style={{
              padding: '0 5px',
              fontSize: 9,
              lineHeight: '14px',
              borderRadius: 2,
              border: '1px solid var(--cc-warning, #d4a85a)',
              color: 'var(--cc-warning, #d4a85a)',
              letterSpacing: 0.6,
            }}
          >
            PROD
          </span>
        ) : null}
        {interactive ? (
          <span aria-hidden="true" style={{ fontSize: 9, opacity: 0.6 }}>
            {open ? '▴' : '▾'}
          </span>
        ) : null}
      </button>
      {open && interactive ? (
        <ul
          role="listbox"
          aria-label="Selecionar projeto"
          className="workspace-pill-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            zIndex: 50,
            minWidth: 220,
            padding: 4,
            background: 'var(--cc-panel, #1d2b34)',
            border: '1px solid var(--cc-border, rgba(255,255,255,0.16))',
            borderRadius: 4,
            boxShadow: '0 8px 20px rgba(0,0,0,0.45)',
            listStyle: 'none',
            display: 'grid',
            gap: 2,
          }}
        >
          {profiles.length === 0 && hasProfileInspector ? (
            <li role="presentation" style={{ padding: '6px 8px', fontSize: 10, opacity: 0.6 }}>
              Apenas o Projeto padrão está disponível neste ambiente.
            </li>
          ) : null}
          {profiles.map((profile) => {
            const selected = profile.slug === activeSlug
            const prod = profile.productionStatus === 'production'
            const detail = `${projectFolderLabel(profile)} · ${projectDocsLabel(profile)}`
            return (
              <li key={profile.slug} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => void handleSelect(profile.slug)}
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    background: selected ? 'var(--cc-accent-soft, rgba(212,168,90,0.12))' : 'transparent',
                    color: 'inherit',
                    border: '1px solid transparent',
                    borderRadius: 3,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'grid', gap: 2 }}>
                    <span style={{ fontWeight: selected ? 600 : 500 }}>{profile.name}</span>
                    <span style={{ fontSize: 10, opacity: 0.6, letterSpacing: 0.2 }}>
                      {detail}
                    </span>
                  </span>
                  {prod ? (
                    <span
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
                </button>
              </li>
            )
          })}
          {hasProfileInspector ? (
            <li
              role="presentation"
              style={{
                borderTop: '1px solid var(--cc-border-soft, rgba(255,255,255,0.08))',
                marginTop: 2,
                paddingTop: 2,
              }}
            >
              <button
                type="button"
                onClick={handleOpenProfile}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  color: 'var(--cc-text-muted, rgba(255,255,255,0.7))',
                  border: 'none',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  fontFamily: 'var(--cc-font-mono, ui-monospace, monospace)',
                  fontSize: 10,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                configurar projeto · ⌘⇧P
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
