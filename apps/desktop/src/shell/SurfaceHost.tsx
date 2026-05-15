import type { BootSnapshot } from '@atlas/domain'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { Surface } from '../hooks/useSurface'
import type { BridgeActions, BridgeSnapshot } from '../hooks/useBridge'
import { AtencaoSurface } from '../surfaces/atencao/AtencaoSurface'
import { AtlasAiSurface } from '../surfaces/atlas-ai/AtlasAiSurface'
import { CartografiaSurface } from '../surfaces/cartografia/CartografiaSurface'
import { CodeSurface } from '../surfaces/code/CodeSurface'

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
  onOpenWorkspaceProfile?: () => void
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
    return (
      <ErrorBoundary label="Atlas AI">
        <AtlasAiSurface
          activeWorkspaceSlug={bridge.activeWorkspaceSlug ?? null}
          activeWorkspaceName={bridge.activeWorkspace?.name ?? null}
          activeWorkspace={bridge.activeWorkspace ?? null}
          defaultWorkspaceSlug={bridge.workspaces?.defaultSlug ?? null}
          onRequestSurfaceChange={onSurfaceChange}
          onOpenWorkspaceProfile={onOpenWorkspaceProfile}
        />
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
