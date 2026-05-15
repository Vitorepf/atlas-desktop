import type { AtlasWorkspaceProfile, AtlasWorkspaceProfileList, McpStatus } from '@atlas/domain'
import type { Surface } from '../../hooks/useSurface'
import type { UseKernelStatusResult } from '../../hooks/useKernelStatus'
import type { BridgeMode } from '../../lib/bridge'

export interface TopBarProps {
  mode: BridgeMode
  loading: boolean
  errors: string[]
  surface: Surface
  onSurfaceChange: (surface: Surface) => void
  kernel: UseKernelStatusResult
  mcp: McpStatus | null
  /**
   * Atlas Code · multi-project scoping (canon:
   * docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md).
   *
   * `workspaces` is the read-model returned by the backend. `null` when the
   * server has no workspaces endpoint yet (older atlas-server). UI falls back
   * to Atlas-only labeling.
   */
  workspaces?: AtlasWorkspaceProfileList | null
  activeWorkspace?: AtlasWorkspaceProfile | null
  activeWorkspaceSlug?: string | null
  onSelectWorkspace?: (slug: string) => Promise<void> | void
  /**
   * Opens the Project Profile sheet (read-only inspector of the active
   * workspace profile). Canon:
   * docs/engineering-knowledge-base/atlas-code-multi-project-workspace-os.md
   */
  onOpenWorkspaceProfile?: () => void
  /**
   * Numeric badges per surface (e.g. Atenção count). null/undefined hides
   * the chip.
   */
  attentionCount?: number | null
  /**
   * Surfaces declared as canonically enabled by the active Project. Tabs
   * outside this list still render but with a "lim" badge so the operator
   * knows the surface is not officially supported in this Project yet.
   */
  enabledSurfaces?: string[] | null
}
