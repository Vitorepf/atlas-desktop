import { useEffect, useState } from 'react'
import type { CartographyAtom, CartographyNote } from '@atlas/domain'

interface UseInspectorNoteArgs {
  atom: CartographyAtom | null
  noteCache: Record<string, CartographyNote | null>
  loadNoteFor: (graphId: string) => Promise<CartographyNote | null>
}

export function useInspectorNote({ atom, noteCache, loadNoteFor }: UseInspectorNoteArgs) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!atom || atom.missingSource) return
    if (atom.graphId in noteCache) return
    void loadNoteFor(atom.graphId).then(() => forceTick((tick) => tick + 1))
  }, [atom, noteCache, loadNoteFor])

  return atom ? noteCache[atom.graphId] ?? null : null
}
