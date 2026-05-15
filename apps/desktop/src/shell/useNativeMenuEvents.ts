import { useEffect } from 'react'
import type { Surface } from '../hooks/useSurface'
import { useTerminalStore } from '../state/terminalStore'

type SetSurface = (surface: Surface) => void

const MENU_EVENTS = {
  surfaceCartografia: 'atlas-menu:surface-cartografia',
  surfaceCode: 'atlas-menu:surface-code',
  settingsOpenCodeTerminal: 'atlas-menu:settings-open-code-terminal',
  settingsTerminalRight: 'atlas-menu:settings-terminal-right',
  settingsTerminalBottom: 'atlas-menu:settings-terminal-bottom',
  settingsResetTerminalLayout: 'atlas-menu:settings-reset-terminal-layout',
  terminalToggle: 'atlas-menu:terminal-toggle',
  terminalNewSession: 'atlas-menu:terminal-new-session',
  terminalCloseSession: 'atlas-menu:terminal-close-session',
  terminalSearch: 'atlas-menu:terminal-search',
  terminalClear: 'atlas-menu:terminal-clear',
  terminalInterrupt: 'atlas-menu:terminal-interrupt',
  terminalTogglePlacement: 'atlas-menu:terminal-toggle-placement',
  terminalToggleMaximize: 'atlas-menu:terminal-toggle-maximize',
  terminalHideDock: 'atlas-menu:terminal-hide-dock',
} as const

function dispatchTerminalRequest(type: string, waitForCodeSurface: boolean) {
  const delay = waitForCodeSurface ? 80 : 0
  window.setTimeout(() => window.dispatchEvent(new Event(type)), delay)
}

export function useNativeMenuEvents(surface: Surface, setSurface: SetSurface) {
  useEffect(() => {
    let disposed = false
    const unlistenFns: Array<() => void> = []

    const register = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event')
        const add = async (event: string, handler: () => void) => {
          const unlisten = await listen(event, handler)
          if (disposed) {
            unlisten()
            return
          }
          unlistenFns.push(unlisten)
        }

        await add(MENU_EVENTS.surfaceCartografia, () => setSurface('cartografia'))
        await add(MENU_EVENTS.surfaceCode, () => setSurface('code'))
        await add(MENU_EVENTS.settingsOpenCodeTerminal, () => {
          setSurface('code')
          useTerminalStore.getState().openDock()
        })
        await add(MENU_EVENTS.settingsTerminalRight, () => {
          setSurface('code')
          useTerminalStore.getState().setPlacement('right')
        })
        await add(MENU_EVENTS.settingsTerminalBottom, () => {
          setSurface('code')
          useTerminalStore.getState().setPlacement('bottom')
        })
        await add(MENU_EVENTS.settingsResetTerminalLayout, () => {
          setSurface('code')
          useTerminalStore.getState().resetDock()
        })
        await add(MENU_EVENTS.terminalToggle, () => {
          const { openDock, toggleDock } = useTerminalStore.getState()
          if (surface !== 'code') {
            setSurface('code')
            openDock()
            return
          }
          toggleDock()
        })
        await add(MENU_EVENTS.terminalNewSession, () => {
          const fromOtherSurface = surface !== 'code'
          setSurface('code')
          useTerminalStore.getState().openDock()
          dispatchTerminalRequest('atlas-terminal-new-tab-request', fromOtherSurface)
        })
        await add(MENU_EVENTS.terminalCloseSession, () => {
          const fromOtherSurface = surface !== 'code'
          setSurface('code')
          useTerminalStore.getState().openDock()
          dispatchTerminalRequest('atlas-terminal-close-active-request', fromOtherSurface)
        })
        await add(MENU_EVENTS.terminalSearch, () => {
          const fromOtherSurface = surface !== 'code'
          setSurface('code')
          useTerminalStore.getState().openDock()
          dispatchTerminalRequest('atlas-terminal-open-search-request', fromOtherSurface)
        })
        await add(MENU_EVENTS.terminalClear, () => {
          const fromOtherSurface = surface !== 'code'
          setSurface('code')
          useTerminalStore.getState().openDock()
          dispatchTerminalRequest('atlas-terminal-clear-request', fromOtherSurface)
        })
        await add(MENU_EVENTS.terminalInterrupt, () => {
          const fromOtherSurface = surface !== 'code'
          setSurface('code')
          useTerminalStore.getState().openDock()
          dispatchTerminalRequest('atlas-terminal-interrupt-request', fromOtherSurface)
        })
        await add(MENU_EVENTS.terminalTogglePlacement, () => {
          setSurface('code')
          const { openDock, togglePlacement } = useTerminalStore.getState()
          openDock()
          togglePlacement()
        })
        await add(MENU_EVENTS.terminalToggleMaximize, () => {
          setSurface('code')
          const { openDock, toggleMaximize } = useTerminalStore.getState()
          openDock()
          toggleMaximize()
        })
        await add(MENU_EVENTS.terminalHideDock, () => {
          useTerminalStore.getState().closeDock()
        })
      } catch {
        /* Browser/dev mode: native menu events exist only inside the .app. */
      }
    }

    void register()
    return () => {
      disposed = true
      unlistenFns.forEach((unlisten) => unlisten())
    }
  }, [setSurface, surface])
}
