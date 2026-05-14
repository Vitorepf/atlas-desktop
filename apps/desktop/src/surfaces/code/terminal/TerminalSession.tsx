import type { TerminalSessionProps } from './session/sessionTypes'
import { useAtlasTerminalSession } from './session/useAtlasTerminalSession'

export function TerminalSession({ sessionId, cwd, isActive, onSpawn }: TerminalSessionProps) {
  const { available, containerRef, error, focus, lastError } = useAtlasTerminalSession({
    sessionId,
    cwd,
    isActive,
    onSpawn,
  })

  if (!available) {
    return (
      <div className="term-empty" data-session={sessionId} hidden={!isActive}>
        PTY disponível somente dentro do Atlas Code .app (modo Tauri).
        {lastError ? <div className="term-empty-error">· {lastError}</div> : null}
      </div>
    )
  }

  const className = `term-body atlas-xterm-terminal${error ? ' has-error' : ''}`

  return (
    <div
      ref={containerRef}
      className={className}
      data-session={sessionId}
      data-error={error ?? undefined}
      onMouseDown={focus}
      onClick={focus}
      style={{ display: isActive ? 'block' : 'none' }}
    />
  )
}

