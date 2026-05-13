import type { ITheme, ITerminalOptions } from '@xterm/xterm'

export function createTerminalOptions(theme: ITheme): ITerminalOptions {
  return {
    cursorBlink: true,
    cursorStyle: 'bar',
    fontFamily: '"MesloLGS Nerd Font Mono", "MesloLGM Nerd Font Mono", "JetBrains Mono", ui-monospace, Menlo, monospace',
    fontSize: 12,
    lineHeight: 1.22,
    theme,
    scrollback: 8000,
    allowProposedApi: true,
    macOptionIsMeta: true,
    macOptionClickForcesSelection: true,
    rightClickSelectsWord: true,
    smoothScrollDuration: 80,
  }
}

