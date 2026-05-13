import type { BridgeMode } from '../lib/bridge'

interface TopBarProps {
  mode: BridgeMode
  loading: boolean
  errors: string[]
}

/**
 * TopBar · brand + bridge-mode badge + folio.
 *
 * The mode badge tells you at a glance whether the cockpit is talking to the
 * Kernel (tauri/http) or running offline (mock). Errors collected during boot
 * surface in the title attribute so you can hover and see what's offline.
 */
export function TopBar({ mode, loading, errors }: TopBarProps) {
  const errorTitle = errors.length > 0 ? `Bridge errors:\n${errors.join('\n')}` : undefined

  return (
    <header className="topbar">
      <div className="brand">
        <strong>Atlas · Code</strong>
        <span className="v">mvp</span>
        <span className="sub">você dirige · Atlas programa</span>
        <span
          className={`v bridge-mode bridge-mode-${mode}${errors.length > 0 ? ' bridge-mode-degraded' : ''}`}
          title={errorTitle ?? `bridge dispatch: ${mode}`}
        >
          bridge · {mode}
          {loading ? ' · loading' : ''}
          {errors.length > 0 ? ` · ${errors.length} offline` : ''}
        </span>
      </div>
      <div />
      <div className="folio">
        <span className="live" />
        atlas desktop · v0.1.0 · main
      </div>
    </header>
  )
}
