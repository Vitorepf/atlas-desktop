interface TerminalLine {
  kind: 'user' | 'atlas'
  indent?: boolean
  text: string
  ok?: boolean
}

interface TerminalDockProps {
  lines: TerminalLine[]
  ptyMode: 'mock' | 'portable-pty'
  cwd: string
}

/**
 * Terminal dock · single zsh tab in the MVP.
 *
 * CANON · feedback_atlas_no_mock.md
 *   When PTY isn't actually connected (mock mode), the dock shows an honest
 *   placeholder explaining what's missing. NEVER paints fake CLI output.
 */
export function TerminalDock({ lines, ptyMode, cwd }: TerminalDockProps) {
  const ptyLive = ptyMode === 'portable-pty'

  return (
    <section className="terminal-dock">
      <div className="term-head">
        <div className="term-tab">zsh · {ptyLive ? 'atlas' : '— sem PTY'}</div>
        <div className="term-meta">
          {cwd || '—'}
          <span className={`pty-badge${ptyLive ? '' : ' mock'}`}>
            {ptyLive ? 'pty real' : 'pty mock'}
          </span>
        </div>
      </div>
      <div className="term-body">
        {lines.length === 0 ? (
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--ink3)',
              padding: '8px 0',
            }}
          >
            {ptyLive
              ? 'aguardando comando…'
              : 'PTY não conectado · atlas-platform crate é placeholder · wire portable-pty no passo 5'}
          </div>
        ) : (
          lines.map((l, i) => (
            <div key={i} className={`term-line${l.indent ? ' indent' : ''}`}>
              {l.kind === 'atlas' ? <span className="glyph">∴ </span> : null}
              {l.ok ? <span className="ok">{l.text}</span> : l.text}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
