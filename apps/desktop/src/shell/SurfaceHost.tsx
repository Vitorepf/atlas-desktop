import type { AtlasWorkspaceProfile, BootSnapshot } from '@atlas/domain'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { Surface } from '../hooks/useSurface'
import type { BridgeActions, BridgeSnapshot } from '../hooks/useBridge'
import type { AtlasWorkspaceProfileWritePayload } from '../lib/bridge'
import { AtencaoSurface } from '../surfaces/atencao/AtencaoSurface'
import { AtlasAiSurface } from '../surfaces/atlas-ai/AtlasAiSurface'
import { CartografiaSurface } from '../surfaces/cartografia/CartografiaSurface'
import { CodeSurface } from '../surfaces/code/CodeSurface'
import { ControlPlaneSurface } from '../surfaces/control-plane/ControlPlaneSurface'

interface SurfaceHostProps {
  surface: Surface
  bridge: BridgeSnapshot & BridgeActions
  boot: BootSnapshot | null
  onSurfaceChange: (surface: Surface) => void
  /**
   * Opens the Project Profile sheet. Surfaces that want to expose a scope
   * strip can forward this so the operator inspects the active workspace
   * profile without leaving the current view.
   */
  onOpenWorkspaceProfile?: (mode?: 'view' | 'create' | 'edit') => void
}

function workspacePayloadFromProfile(
  profile: AtlasWorkspaceProfile,
  workspacePath: string,
): AtlasWorkspaceProfileWritePayload {
  return {
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
  }
}

function basenameFromPath(path: string): string {
  const normalized = path.trim().replace(/\/+$/, '')
  const parts = normalized.split(/[\\/]/).filter(Boolean)
  return parts.at(-1) ?? 'Projeto'
}

function slugifyProjectName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'atlas'
}

function workspacePayloadFromFolder(workspacePath: string, preferredSlug?: string | null): AtlasWorkspaceProfileWritePayload {
  const folderName = basenameFromPath(workspacePath)
  const slug = preferredSlug?.trim() || slugifyProjectName(folderName)
  return {
    slug,
    name: folderName || slug,
    kind: 'product',
    workspace_path: workspacePath,
    repo_root: workspacePath,
    production_status: 'development',
    stack_summary: '',
    commands: {},
    test_commands: [],
    build_commands: [],
    dev_server_command: null,
    critical_areas: [],
    docs_status: 'unknown',
    default_risk: 'medium',
    deployment_notes: '',
    surfaces_enabled: ['atlas_ai', 'cartografia', 'code', 'atencao'],
    source: 'operator',
    status: 'active',
  }
}

/**
 * Mounts the active Atlas surface.
 *
 * App.tsx owns boot/bridge lifecycle. SurfaceHost owns which product surface is
 * rendered. New surfaces should be routed here after being registered in
 * `surfaceRegistry`.
 */
export function SurfaceHost({ surface, bridge, boot, onSurfaceChange, onOpenWorkspaceProfile }: SurfaceHostProps) {
  if (surface === 'code') {
    return <CodeSurface bridge={bridge} boot={boot} />
  }

  if (surface === 'atencao') {
    return (
      <ErrorBoundary label="Atenção">
        <AtencaoSurface
          activeWorkspaceSlug={bridge.activeWorkspaceSlug ?? null}
          onOpenObra={(obraId, workspaceSlug) => {
            // Route into Atlas Code with the right workspace selected.
            // Atencao itself never reads Code state; it only signals intent.
            if (workspaceSlug && bridge.setActiveWorkspaceSlug) {
              void bridge.setActiveWorkspaceSlug(workspaceSlug)
            }
            try {
              window.localStorage.setItem('atlas-code:pending-obra-id', obraId)
            } catch {
              /* storage unavailable */
            }
          }}
          onRequestSurfaceChange={onSurfaceChange}
        />
      </ErrorBoundary>
    )
  }

  if (surface === 'atlas_ai') {
    const chooseActiveWorkspaceFolder = async (): Promise<boolean> => {
      const profile = bridge.activeWorkspace
      const selected = await bridge.pickWorkspaceFolder()
      if (!selected) return false
      const updated = profile
        ? await bridge.updateWorkspaceProfile(
            profile.slug,
            workspacePayloadFromProfile(profile, selected),
          )
        : await bridge.createWorkspaceProfile(
            workspacePayloadFromFolder(selected, bridge.activeWorkspaceSlug ?? bridge.workspaces?.defaultSlug ?? null),
          )
      if (!updated?.slug) return false
      await bridge.setActiveWorkspaceSlug(updated.slug)
      return true
    }

    return (
      <ErrorBoundary label="Atlas AI">
        <AtlasAiSurface
          activeWorkspaceSlug={bridge.activeWorkspaceSlug ?? null}
          activeWorkspaceName={bridge.activeWorkspace?.name ?? null}
          activeWorkspace={bridge.activeWorkspace ?? null}
          workspaces={bridge.workspaces ?? null}
          defaultWorkspaceSlug={bridge.workspaces?.defaultSlug ?? null}
          onRequestSurfaceChange={onSurfaceChange}
          onSelectWorkspace={bridge.setActiveWorkspaceSlug}
          onOpenWorkspaceProfile={onOpenWorkspaceProfile}
          onChooseWorkspaceFolder={chooseActiveWorkspaceFolder}
        />
      </ErrorBoundary>
    )
  }

  if (surface === 'control_plane') {
    return (
      <ErrorBoundary label="Control Plane">
        <ControlPlaneSurface />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary label="Cartografia">
      <CartografiaSurface
        activeWorkspace={bridge.activeWorkspace}
        defaultWorkspaceSlug={bridge.workspaces?.defaultSlug ?? null}
      />
    </ErrorBoundary>
  )
}
