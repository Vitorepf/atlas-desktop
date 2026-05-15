import type { McpStatus } from '@atlas/domain'
import type { Surface } from '../../hooks/useSurface'
import type { UseKernelStatusResult } from '../../hooks/useKernelStatus'
import type { BridgeMode } from '../../lib/bridge'

export interface TopBarProps {
  mode: BridgeMode
  loading: boolean
  errors: string[]
  surface: Surface
  onSurfaceChange: (surface: Surface) => void
  terminalVisible: boolean
  onTerminalToggle: () => void
  kernel: UseKernelStatusResult
  mcp: McpStatus | null
}
