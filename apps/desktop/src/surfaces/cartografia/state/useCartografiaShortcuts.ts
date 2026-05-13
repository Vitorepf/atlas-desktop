import { useEffect } from 'react'
import type { CartographyView } from '@atlas/domain'
import type { VisualLens } from './visualLens'
import type { ReturnTypeOfUseCartografiaSearch } from '../search/types'
import { resolveCartografiaShortcut, shortcutConsumesEvent } from './shortcutModel'

interface CartografiaShortcutsInput {
  view: CartographyView
  isolatedId: string | null
  search: ReturnTypeOfUseCartografiaSearch
  onFit: () => void
  onSetVisualLens: (lens: VisualLens) => void
  onExitGear: () => void
  onExitIsolate: () => void
}

export function useCartografiaShortcuts({
  view,
  isolatedId,
  search,
  onFit,
  onSetVisualLens,
  onExitGear,
  onExitIsolate,
}: CartografiaShortcutsInput) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const shortcut = resolveCartografiaShortcut({
        event,
        view,
        isolatedId,
        searchQuery: search.query,
      })

      if (shortcutConsumesEvent(shortcut)) event.preventDefault()

      if (shortcut.kind === 'lens') onSetVisualLens(shortcut.lens)
      if (shortcut.kind === 'search') search.focus()
      if (shortcut.kind === 'fit') onFit()
      if (shortcut.kind === 'clear-search') search.clear()
      if (shortcut.kind === 'exit-gear') onExitGear()
      if (shortcut.kind === 'exit-isolate') {
        onExitIsolate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isolatedId, onExitGear, onExitIsolate, onFit, onSetVisualLens, search, view])
}
