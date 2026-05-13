import { useMemo } from 'react'
import { buildAtomIndex } from './atomIndex'
import type { CartografiaState } from './cartografiaTypes'
import { useCartografiaData } from './useCartografiaData'
import { useCartografiaNavigation } from './useCartografiaNavigation'
import { useCartografiaNotes } from './useCartografiaNotes'

export type { CartografiaState } from './cartografiaTypes'

export function useCartografia(): CartografiaState {
  const data = useCartografiaData()
  const notes = useCartografiaNotes()
  const navigation = useCartografiaNavigation({
    graph: data.graph,
    loadNoteFor: notes.loadNoteFor,
  })

  const atomIndex = useMemo(() => buildAtomIndex(data.graph), [data.graph])

  return {
    loading: data.loading,
    errors: data.errors,
    graph: data.graph,
    recentChanges: data.recentChanges,
    noteCache: notes.noteCache,
    atomIndex,
    refreshRecent: data.refreshRecent,
    loadNoteFor: notes.loadNoteFor,
    ...navigation,
  }
}
