interface TerminalStatusBarProps {
  displayCwd: string
  branch: string | null
  running: boolean
  runningFor: string | null
  waitingForPrompt: boolean
  showReadyState: boolean
  lastDuration: string | null
  lastExit: number | null
  ptyMode?: 'unavailable' | 'portable-pty'
  live: boolean
}

export function TerminalStatusBar({
  displayCwd,
  branch,
  running,
  runningFor,
  waitingForPrompt,
  showReadyState,
  lastDuration,
  lastExit,
  ptyMode,
  live,
}: TerminalStatusBarProps) {
  const completionLabel =
    lastExit == null ? 'pronto'
    : lastExit === 0 ? 'concluído'
    : 'falhou'

  return (
    <div className="term-status">
      <span className="term-status-cwd" title={displayCwd}>{displayCwd}</span>
      {branch ? <span className="term-status-branch">⎇ {branch}</span> : null}
      {running ? (
        <span className="term-status-running">executando{runningFor ? ` · ${runningFor}` : ''}</span>
      ) : waitingForPrompt ? (
        <span className="term-status-pending">finalizando prompt…</span>
      ) : showReadyState || lastDuration ? (
        <span className={`term-status-exit ${lastExit == null || lastExit === 0 ? 'ok' : 'err'}`}>
          {completionLabel}
          {lastExit != null ? ` · exit ${lastExit}` : ''}
          {lastDuration ? ` · ${lastDuration}` : ''}
        </span>
      ) : null}
      <span className={`pty-badge${live ? '' : ' unavailable'}`} style={{ marginLeft: 'auto' }}>
        {live ? 'pty real' : ptyMode === 'unavailable' ? 'pty indisponível' : 'iniciando…'}
      </span>
    </div>
  )
}
