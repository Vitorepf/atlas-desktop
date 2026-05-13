import type { BridgeMode } from '../lib/bridge'

interface TopBarProps {
  mode: BridgeMode
}

/**
 * TopBar · brand + bridge-mode badge + folio.
 *
 * The mode badge tells you at a glance whether the cockpit is talking to the
 * Kernel (tauri/http) or running on canned data (mock).
 */
export function TopBar({ mode }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <strong>Atlas · Code</strong>
        <span className="v">mvp</span>
        <span className="sub">você dirige · Atlas programa</span>
        <span className={`v bridge-mode bridge-mode-${mode}`} title={`bridge dispatch: ${mode}`}>
          bridge · {mode}
        </span>
      </div>
      <div />
      <div className="folio">
        <span className="live" />
        core <span className="div">·</span> pid 24891 <span className="div">·</span> vol I no 008 <span className="div">·</span> 12 mai 2026
      </div>
    </header>
  )
}
