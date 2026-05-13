import type { CartographyView } from '@atlas/domain'
import type { VisualLens } from './visualLens'
import { lensFromShortcut } from './visualLens'

export type CartografiaShortcut =
  | { kind: 'lens'; lens: VisualLens }
  | { kind: 'search' }
  | { kind: 'fit' }
  | { kind: 'clear-search' }
  | { kind: 'exit-gear' }
  | { kind: 'exit-isolate' }
  | { kind: 'none' }

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

export function hasSystemShortcutModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey
}

export function resolveCartografiaShortcut({
  event,
  view,
  isolatedId,
  searchQuery,
}: {
  event: KeyboardEvent
  view: CartographyView
  isolatedId: string | null
  searchQuery: string
}): CartografiaShortcut {
  const isSearchTarget = isEditableShortcutTarget(event.target)
  const hasSystemModifier = hasSystemShortcutModifier(event)

  if (!isSearchTarget && !hasSystemModifier) {
    const lens = lensFromShortcut(event.key)
    if (lens) return { kind: 'lens', lens }
    if (event.key === '/') return { kind: 'search' }
    if (event.key === '0') return { kind: 'fit' }
  }

  if (event.key !== 'Escape') return { kind: 'none' }
  if (isSearchTarget && searchQuery) return { kind: 'clear-search' }
  if (view === 'gear' || view === 'subflow') return { kind: 'exit-gear' }
  if (isolatedId) return { kind: 'exit-isolate' }
  return { kind: 'none' }
}

export function shortcutConsumesEvent(shortcut: CartografiaShortcut): boolean {
  return shortcut.kind !== 'none' && shortcut.kind !== 'clear-search'
}
