import type { SearchAddon } from '@xterm/addon-search'
import type { FitAddon } from '@xterm/addon-fit'
import type { Terminal } from '@xterm/xterm'
import type { TermControl } from './sessionTypes'

interface CreateTermControlArgs {
  term: Terminal
  fit: FitAddon
  search: SearchAddon
  disposeProtocol: () => void
}

export function createTermControl({
  term,
  fit,
  search,
  disposeProtocol,
}: CreateTermControlArgs): TermControl {
  return {
    fit: () => { try { fit.fit() } catch { /* */ } },
    focus: () => term.focus(),
    search: (q: string) => { search.findNext(q, { incremental: false, caseSensitive: false }) },
    clear: () => {
      try { term.clear() } catch { /* */ }
    },
    write: (data: string) => term.write(data),
    dispose: () => {
      try { disposeProtocol() } catch { /* */ }
      try { term.dispose() } catch { /* */ }
    },
  }
}

