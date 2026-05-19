import type { Terminal } from '@xterm/xterm'

export type Osc133Mark = 'A' | 'B' | 'C' | 'D'

export interface OscHandlerCallbacks {
  onCwd?: (cwd: string) => void
  onMark?: (mark: Osc133Mark, exitCode: number | null) => void
}

export interface ParsedOsc133 {
  mark: Osc133Mark
  exitCode: number | null
}

function decodeFileUri(uri: string): string | null {
  if (!uri.startsWith('file://')) return null
  const stripped = uri.slice('file://'.length)
  const slashIdx = stripped.indexOf('/')
  const path = slashIdx >= 0 ? stripped.slice(slashIdx) : stripped
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

export function parseOsc133(data: string): ParsedOsc133 | null {
  const parts = data.split(';')
  const head = (parts[0] ?? '').toUpperCase()
  if (head === 'A' || head === 'B' || head === 'C') {
    return { mark: head, exitCode: null }
  }
  if (head === 'D') {
    const raw = parts[1]
    const exitCode = raw && /^-?\d+$/.test(raw) ? Number(raw) : null
    return { mark: 'D', exitCode }
  }
  return null
}

export function registerOscHandlers(term: Terminal, cb: OscHandlerCallbacks): () => void {
  const off7 = term.parser.registerOscHandler(7, (data) => {
    const cwd = decodeFileUri(data)
    if (cwd && cb.onCwd) cb.onCwd(cwd)
    return true
  })

  const off133 = term.parser.registerOscHandler(133, (data) => {
    if (!cb.onMark) return true
    const parsed = parseOsc133(data)
    if (parsed) cb.onMark(parsed.mark, parsed.exitCode)
    return true
  })

  return () => {
    try { off7.dispose() } catch { /* */ }
    try { off133.dispose() } catch { /* */ }
  }
}
