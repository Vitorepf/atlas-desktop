import type { CartographyAtom, CartographyNote, CartographySources } from '@atlas/domain'
import { bridge } from '../../../lib/bridge'
import { absoluteCartographyPath, cartographyOpenUri } from './sourcePath'

export async function openCartographyDocument(
  atom: CartographyAtom,
  note: CartographyNote | null = null,
  sources: CartographySources | null = null
): Promise<void> {
  const source = note?.source ?? atom.graphSource
  const relativePath = note?.sourcePath ?? atom.sourcePath
  if (!relativePath) return

  try {
    await bridge.openExternal(cartographyOpenUri({ source, relativePath, sources }))
  } catch {
    /* best-effort */
  }
}

export async function revealCartographyDocument(
  atom: CartographyAtom,
  note: CartographyNote | null = null,
  sources: CartographySources | null = null
): Promise<void> {
  const relative = note?.sourcePath ?? atom.sourcePath
  if (!relative) return
  const absolute = absoluteCartographyPath({
    source: note?.source ?? atom.graphSource,
    relativePath: relative,
    sources,
  })
  try {
    await bridge.revealInFinder(absolute)
  } catch {
    /* best-effort */
  }
}

export async function copyCartographyPath(atom: CartographyAtom): Promise<void> {
  if (!atom.sourcePath) return
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(atom.sourcePath)
    }
  } catch {
    /* clipboard permission denied */
  }
}
