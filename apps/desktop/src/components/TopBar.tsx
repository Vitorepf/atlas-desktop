/**
 * TopBar · brand + folio.
 *
 * Atlas Code is one window inside Atlas Desktop. The window dock /
 * surface switcher lives at the OS shell level (future), not here.
 */
export function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <strong>Atlas · Code</strong>
        <span className="v">mvp</span>
        <span className="sub">você dirige · Atlas programa</span>
      </div>
      <div />
      <div className="folio">
        <span className="live" />
        core <span className="div">·</span> pid 24891 <span className="div">·</span> vol I no 008 <span className="div">·</span> 12 mai 2026
      </div>
    </header>
  )
}
