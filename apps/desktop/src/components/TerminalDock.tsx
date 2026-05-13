interface TerminalLine {
  kind: 'user' | 'atlas'
  indent?: boolean
  text: string
  ok?: boolean
}

interface TerminalDockProps {
  lines: TerminalLine[]
  ptyMode: 'unavailable' | 'portable-pty'
  cwd: string
}

/**
 * Terminal dock · single zsh tab in the MVP.
 *
 * CANON · Atlas Code usa somente dados reais ou estados vazios explícitos.
 *   When PTY isn't actually connected, the dock shows an honest empty state.
 *   NEVER paints invented CLI output.
 */
export function TerminalDock({ lines, ptyMode, cwd }: TerminalDockProps) {
  const ptyLive = ptyMode === 'portable-pty'

  return (
    <section className="terminal-dock">
      <div className="term-head">
        <div className="term-tab">zsh · {ptyLive ? 'atlas' : '— sem PTY'}</div>
        <div className="term-meta">
          {cwd || '—'}
          <span className={`pty-badge${ptyLive ? '' : ' unavailable'}`}>
            {ptyLive ? 'pty real' : 'pty indisponível'}
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
              : 'PTY não conectado · aguardando implementação real do atlas-platform'}
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
