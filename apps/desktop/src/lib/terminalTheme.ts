import type { ITheme } from '@xterm/xterm'

const FALLBACK = {
  '--cream-paper': '#f7f1e3',
  '--cream': '#f3ecda',
  '--ink': '#1a1714',
  '--ink2': '#4a4138',
  '--ink3': '#8a7f70',
  '--bronze': '#8a6a35',
  '--bronze-deep': '#5e4520',
  '--rec-red': '#8a3025',
  '--moss': '#4a5f3a',
  '--prussian': '#2b3e54',
  '--ansi-magenta': '#6b3a52',
  '--ansi-magenta-bright': '#8a5072',
  '--ansi-cyan': '#2f5a6b',
  '--ansi-cyan-bright': '#4a7588',
  '--ansi-red-bright': '#a8453a',
  '--ansi-green-bright': '#5e7548',
  '--ansi-blue-bright': '#3d5570',
} as const

type TokenKey = keyof typeof FALLBACK

function token(name: TokenKey): string {
  if (typeof window === 'undefined') return FALLBACK[name]
  const computed = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return computed || FALLBACK[name]
}

export function atlasTerminalTheme(): ITheme {
  return {
    background: token('--cream-paper'),
    foreground: token('--ink'),
    cursor: token('--bronze'),
    cursorAccent: token('--cream-paper'),
    selectionBackground: 'rgba(138, 106, 53, 0.28)',
    selectionForeground: token('--ink'),

    black: token('--ink'),
    red: token('--rec-red'),
    green: token('--moss'),
    yellow: token('--bronze-deep'),
    blue: token('--prussian'),
    magenta: token('--ansi-magenta'),
    cyan: token('--ansi-cyan'),
    white: token('--ink2'),

    brightBlack: token('--ink3'),
    brightRed: token('--ansi-red-bright'),
    brightGreen: token('--ansi-green-bright'),
    brightYellow: token('--bronze'),
    brightBlue: token('--ansi-blue-bright'),
    brightMagenta: token('--ansi-magenta-bright'),
    brightCyan: token('--ansi-cyan-bright'),
    brightWhite: token('--ink'),
  }
}

export async function loadFontReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return
  try {
    await document.fonts.load('13px "MesloLGS Nerd Font Mono"')
    await document.fonts.load('13px "MesloLGM Nerd Font Mono"')
    await document.fonts.load('13px "JetBrains Mono"')
  } catch {
    /* fallback to default font without blocking */
  }
}
