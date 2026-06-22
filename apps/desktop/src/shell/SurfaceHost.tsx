import type { AtlasWorkspaceProfile, BootSnapshot } from '@atlas/domain'
import { lazy, Suspense } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { Surface } from '../hooks/useSurface'
import type { BridgeActions, BridgeSnapshot } from '../hooks/useBridge'
import type { AtlasWorkspaceProfileWritePayload } from '../lib/bridge'

const AtencaoSurface = lazy(() =>
  import('../surfaces/atencao/AtencaoSurface').then((mod) => ({ default: mod.AtencaoSurface })),
)
const AtlasAiSurface = lazy(() =>
  import('../surfaces/atlas-ai/AtlasAiSurface').then((mod) => ({ default: mod.AtlasAiSurface })),
)
const BlogEditorialSurface = lazy(() =>
  import('../surfaces/blog-editorial').then((mod) => ({ default: mod.BlogEditorialSurface })),
)
const CartografiaSurface = lazy(() =>
  import('../surfaces/cartografia/CartografiaSurface').then((mod) => ({ default: mod.CartografiaSurface })),
)
const CodeSurface = lazy(() =>
  import('../surfaces/code/CodeSurface').then((mod) => ({ default: mod.CodeSurface })),
)
const ControlPlaneSurface = lazy(() =>
  import('../surfaces/control-plane/ControlPlaneSurface').then((mod) => ({ default: mod.ControlPlaneSurface })),
)
const MissionControlSurface = lazy(() =>
  import('../surfaces/mission-control').then((mod) => ({ default: mod.MissionControlSurface })),
)
const PlanVisibleSurface = lazy(() =>
  import('../surfaces/plan-visible').then((mod) => ({ default: mod.PlanVisibleSurface })),
)
const StewardshipSurface = lazy(() =>
  import('../surfaces/stewardship').then((mod) => ({ default: mod.StewardshipSurface })),
)
const ActiveLoopsSurface = lazy(() =>
  import('../surfaces/active-loops').then((mod) => ({ default: mod.ActiveLoopsSurface })),
)

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
  // Backend requires >= 3 chars (422 invalid_workspace_slug) \u2014 a 1-2 char
  // folder name like "AI" would otherwise mint a slug the server rejects.
  if (slug.length >= 3) return slug
  return slug ? `${slug}-local` : 'atlas'
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
    return (
      <Suspense fallback={<SurfaceLoading label="Code" />}>
        <CodeSurface bridge={bridge} boot={boot} />
      </Suspense>
    )
  }

  if (surface === 'atencao') {
    return (
      <ErrorBoundary label="Atenção">
        <Suspense fallback={<SurfaceLoading label="Atenção" />}>
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
        </Suspense>
      </ErrorBoundary>
    )
  }

  if (surface === 'atlas_ai') {
    const chooseActiveWorkspaceFolder = async (): Promise<boolean> => {
      const profile = bridge.activeWorkspace
      const selected = await bridge.pickWorkspaceFolder()
      if (!selected) return false
      try {
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
      } catch {
        // The bridge wrappers re-throw real failures so the Project sheet can
        // explain them; this CTA reports honestly via its boolean instead.
        return false
      }
    }

    return (
      <ErrorBoundary label="Atlas AI">
        <Suspense fallback={<SurfaceLoading label="Atlas AI" />}>
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
        </Suspense>
      </ErrorBoundary>
    )
  }

  if (surface === 'control_plane') {
    return (
      <ErrorBoundary label="Control Plane">
        <Suspense fallback={<SurfaceLoading label="Control Plane" />}>
          <ControlPlaneSurface />
        </Suspense>
      </ErrorBoundary>
    )
  }

  if (surface === 'mission_control') {
    return (
      <ErrorBoundary label="Mission Control">
        <Suspense fallback={<SurfaceLoading label="Mission Control" />}>
          <MissionControlSurface />
        </Suspense>
      </ErrorBoundary>
    )
  }

  if (surface === 'stewardship') {
    return (
      <ErrorBoundary label="Stewardship">
        <Suspense fallback={<SurfaceLoading label="Stewardship" />}>
          <StewardshipSurface />
        </Suspense>
      </ErrorBoundary>
    )
  }

  if (surface === 'plan_visible') {
    return (
      <ErrorBoundary label="Plan Visible">
        <Suspense fallback={<SurfaceLoading label="Plan Visible" />}>
          <PlanVisibleSurface />
        </Suspense>
      </ErrorBoundary>
    )
  }

  if (surface === 'blog_editorial') {
    return (
      <ErrorBoundary label="Blog Editorial">
        <Suspense fallback={<SurfaceLoading label="Blog Editorial" />}>
          <BlogEditorialSurface />
        </Suspense>
      </ErrorBoundary>
    )
  }

  if (surface === 'active_loops') {
    return (
      <ErrorBoundary label="Frota">
        <Suspense fallback={<SurfaceLoading label="Frota" />}>
          <ActiveLoopsSurface />
        </Suspense>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary label="Cartografia">
      <Suspense fallback={<SurfaceLoading label="Cartografia" />}>
        <CartografiaSurface
          activeWorkspace={bridge.activeWorkspace}
          defaultWorkspaceSlug={bridge.workspaces?.defaultSlug ?? null}
        />
      </Suspense>
    </ErrorBoundary>
  )
}

function SurfaceLoading({ label }: { label: string }) {
  return (
    <main className="atlas-ai-surface atlas-ai-stage atlas-ai-stage-fallback" role="status">
      <p className="atlas-ai-empty-line">abrindo {label}...</p>
    </main>
  )
}
