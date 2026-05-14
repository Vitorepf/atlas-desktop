import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildAtomIndex } from './atomIndex'
import type { CartografiaState } from './cartografiaTypes'
import { useCartografiaData } from './useCartografiaData'
import { useCartografiaNavigation } from './useCartografiaNavigation'
import { useCartografiaNotes } from './useCartografiaNotes'

export type { CartografiaState } from './cartografiaTypes'

export function useCartografia(): CartografiaState {
  // notes hook owns the lazy cache; we wire SSE-driven invalidation through
  // useCartografiaData so a `graph_changed` event clears stale .md bodies.
  const notes = useCartografiaNotes()
  const data = useCartografiaData({ onGraphMutation: notes.invalidateAll })
  const navigation = useCartografiaNavigation({
    graph: data.graph,
    loadNoteFor: notes.loadNoteFor,
  })

  const atomIndex = useMemo(() => buildAtomIndex(data.graph), [data.graph])

  // ─── Reading mode + density (Agente J · narrativa sequencial) ───
  const [readingMode, setReadingModeState] = useState<boolean>(false)
  const [readingFocusOrder, setReadingFocusOrder] = useState<number | null>(null)
  // Pass O · default canon = comfortable (atom 84px com deck legível em
   // zoom-mid). Usuário ainda pode trocar pra compact via UI/atalho.
  const [density, setDensityState] = useState<'comfortable' | 'compact'>('comfortable')

  const pipelineLen = Array.isArray(data.graph?.pipeline) ? data.graph!.pipeline.length : 0

  const setReadingMode = useCallback(
    (next: boolean) => {
      setReadingModeState(next)
      if (next && readingFocusOrder == null && pipelineLen > 0) {
        setReadingFocusOrder(0)
      }
      if (!next) setReadingFocusOrder(null)
    },
    [pipelineLen, readingFocusOrder]
  )

  const toggleReadingMode = useCallback(() => {
    setReadingMode(!readingMode)
  }, [readingMode, setReadingMode])

  const readingNext = useCallback(() => {
    if (!readingMode || pipelineLen === 0) return
    setReadingFocusOrder((prev) => {
      const cur = prev == null ? 0 : prev
      return Math.min(cur + 1, pipelineLen - 1)
    })
  }, [readingMode, pipelineLen])

  const readingPrev = useCallback(() => {
    if (!readingMode || pipelineLen === 0) return
    setReadingFocusOrder((prev) => {
      const cur = prev == null ? 0 : prev
      return Math.max(cur - 1, 0)
    })
  }, [readingMode, pipelineLen])

  const setDensity = useCallback((next: 'comfortable' | 'compact') => {
    setDensityState(next)
  }, [])

  // DOM-side effect: aplicar `.reading-focus` no atom do pipeline em foco
  // sem precisar propagar prop até o FlowPipeline. Como cada atom já é
  // renderizado com id `atom-{graphId}`, basta resolver o id pelo passo.
  useEffect(() => {
    if (!readingMode || readingFocusOrder == null || !data.graph) return
    const pipeline = Array.isArray(data.graph.pipeline) ? data.graph.pipeline : []
    const step = pipeline[readingFocusOrder]
    if (!step) return
    const stepGraphId = (step as { graph_id?: string; graphId?: string }).graph_id
      ?? (step as { graph_id?: string; graphId?: string }).graphId
    if (!stepGraphId) return
    const el = document.getElementById(`atom-${stepGraphId}`)
    if (!el) return
    el.classList.add('reading-focus')
    // remove de outros pipe atoms
    const all = document.querySelectorAll('.atom-pipe.reading-focus')
    all.forEach((node) => {
      if (node !== el) node.classList.remove('reading-focus')
    })
    return () => {
      el.classList.remove('reading-focus')
    }
  }, [readingMode, readingFocusOrder, data.graph])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // ignore when typing in inputs/textareas
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        toggleReadingMode()
        return
      }
      if (!readingMode) return
      if (event.key === 'ArrowRight' || event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        readingNext()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        readingPrev()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [readingMode, readingNext, readingPrev, toggleReadingMode])

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
    readingMode,
    readingFocusOrder,
    density,
    toggleReadingMode,
    setReadingMode,
    readingNext,
    readingPrev,
    setDensity,
  }
}
