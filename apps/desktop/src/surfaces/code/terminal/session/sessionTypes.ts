export interface TerminalSessionProps {
  sessionId: string
  cwd: string
  isActive: boolean
  onSpawn?: (info: { ptyId: string; shell: string; cwd: string }) => void
}

export interface TermControl {
  fit: () => void
  focus: () => void
  search: (query: string) => void
  clear: () => void
  dispose: () => void
  write: (data: string) => void
}

