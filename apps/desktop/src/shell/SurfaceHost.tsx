import type { BootSnapshot } from '@atlas/domain'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { Surface } from '../hooks/useSurface'
import type { BridgeActions, BridgeSnapshot } from '../hooks/useBridge'
import { CartografiaSurface } from '../surfaces/cartografia/CartografiaSurface'
import { CodeSurface } from '../surfaces/code/CodeSurface'

interface SurfaceHostProps {
  surface: Surface
  bridge: BridgeSnapshot & BridgeActions
  boot: BootSnapshot | null
}

/**
 * Mounts the active Atlas surface.
 *
 * App.tsx owns boot/bridge lifecycle. SurfaceHost owns which product surface is
 * rendered. New surfaces should be routed here after being registered in
 * `surfaceRegistry`.
 */
export function SurfaceHost({ surface, bridge, boot }: SurfaceHostProps) {
  if (surface === 'code') {
    return <CodeSurface bridge={bridge} boot={boot} />
  }

  return (
    <ErrorBoundary label="Cartografia">
      <CartografiaSurface />
    </ErrorBoundary>
  )
}
