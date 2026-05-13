import type { TerminalSessionProps } from './session/sessionTypes'
import { useAtlasTerminalSession } from './session/useAtlasTerminalSession'

export function TerminalSession({ sessionId, cwd, isActive, onSpawn }: TerminalSessionProps) {
  const terminal = useAtlasTerminalSession({ sessionId, cwd, isActive, onSpawn })

  if (!terminal.available) {
    return (
      <div className="term-empty" data-session={sessionId} hidden={!isActive}>
        PTY disponível somente dentro do Atlas Code .app (modo Tauri).
        {terminal.lastError ? <div className="term-empty-error">· {terminal.lastError}</div> : null}
      </div>
    )
  }

  return (
    <div
      ref={terminal.containerRef}
      className={`term-body atlas-xterm-terminal ${terminal.error ? ' has-error' : ''}`}
      data-session={sessionId}
      data-error={terminal.error ?? undefined}
      onMouseDown={terminal.focus}
      onClick={terminal.focus}
      style={{ display: isActive ? 'block' : 'none' }}
    />
  )
}

