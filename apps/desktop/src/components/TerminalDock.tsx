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
 * Terminal dock — single zsh tab for the MVP. PTY observation lives in
 * crates/atlas-platform; here we only render the stream.
 */
export function TerminalDock({ lines, ptyMode, cwd }: TerminalDockProps) {
  return (
    <section className="terminal-dock">
      <div className="term-head">
        <div className="term-tab">zsh · atlas-server</div>
        <div className="term-meta">
          {cwd}
          <span className={`pty-badge${ptyMode === 'mock' ? ' mock' : ''}`}>
            {ptyMode === 'mock' ? 'pty mock' : 'pty real'}
          </span>
        </div>
      </div>
      <div className="term-body">
        {lines.map((l, i) => (
          <div key={i} className={`term-line${l.indent ? ' indent' : ''}`}>
            {l.kind === 'atlas' ? <span className="glyph">∴ </span> : null}
            {l.ok ? <span className="ok">{l.text}</span> : l.text}
          </div>
        ))}
      </div>
    </section>
  )
}
