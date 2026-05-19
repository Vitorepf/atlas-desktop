import { useCallback, useState } from 'react'
import type { CartographyNote } from '@atlas/domain'
import { bridge } from '../../../lib/bridge'

export function useCartografiaNotes() {
  const [noteCache, setNoteCache] = useState<Record<string, CartographyNote | null>>({})

  const loadNoteFor = useCallback(
    async (graphId: string): Promise<CartographyNote | null> => {
      if (graphId in noteCache) return noteCache[graphId] ?? null
      try {
        const note = await bridge.loadCartographyNote(graphId)
        setNoteCache((cache) => ({ ...cache, [graphId]: note }))
        return note
      } catch {
        setNoteCache((cache) => ({ ...cache, [graphId]: null }))
        return null
      }
    },
    [noteCache]
  )

  /** Drops a single entry so the next read re-fetches from the backend. */
  const invalidateNote = useCallback((graphId: string) => {
    setNoteCache((cache) => {
      if (!(graphId in cache)) return cache
      const next = { ...cache }
      delete next[graphId]
      return next
    })
  }, [])

  /** Drops every cached note. Used when the graph checksum moves (SSE). */
  const invalidateAll = useCallback(() => {
    setNoteCache({})
  }, [])

  return {
    noteCache,
    loadNoteFor,
    invalidateNote,
    invalidateAll,
  }
}
