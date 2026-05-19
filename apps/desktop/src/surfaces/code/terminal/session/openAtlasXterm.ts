import type { FitAddon } from '@xterm/addon-fit'
import type { SearchAddon } from '@xterm/addon-search'
import type { Terminal } from '@xterm/xterm'
import { bridge } from '../../../../lib/bridge'
import { atlasTerminalTheme, loadFontReady } from '../../../../lib/terminalTheme'
import { createTerminalOptions } from './terminalSessionOptions'

export interface AtlasXtermKit {
  term: Terminal
  fit: FitAddon
  search: SearchAddon
}

export async function openAtlasXterm(
  container: HTMLElement,
  isCancelled: () => boolean = () => false,
): Promise<AtlasXtermKit | null> {
  await loadFontReady()
  const [xtermMod, fitMod, searchMod, linksMod, unicodeMod] = await Promise.all([
    import('@xterm/xterm'),
    import('@xterm/addon-fit'),
    import('@xterm/addon-search'),
    import('@xterm/addon-web-links'),
    import('@xterm/addon-unicode11'),
  ])
  await import('@xterm/xterm/css/xterm.css')

  if (isCancelled()) return null

  const atlasTheme = atlasTerminalTheme()
  const term = new xtermMod.Terminal(createTerminalOptions(atlasTheme))

  const fit = new fitMod.FitAddon()
  term.loadAddon(fit)

  const unicode = new unicodeMod.Unicode11Addon()
  term.loadAddon(unicode)
  term.unicode.activeVersion = '11'

  const links = new linksMod.WebLinksAddon((event, uri) => {
    event.preventDefault()
    void bridge.openExternal(uri)
  })
  term.loadAddon(links)

  const search = new searchMod.SearchAddon()
  term.loadAddon(search)

  term.open(container)
  term.options.theme = atlasTheme

  return { term, fit, search }
}
