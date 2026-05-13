import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { CartographyAtom } from '@atlas/domain'
import { nextSearchIndex, previousSearchIndex, searchAtoms } from './searchModel'

export function useCartografiaSearch(
  atomIndex: Record<string, CartographyAtom>,
  onCommit: (graphId: string) => void
) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(() => searchAtoms(atomIndex, query), [atomIndex, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, results.length])

  const clear = useCallback(() => {
    setQuery('')
    setActiveIndex(0)
  }, [])

  const focus = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const commit = useCallback(
    (index = activeIndex) => {
      const selected = results[index] ?? results[0]
      if (!selected) return
      onCommit(selected.graphId)
      clear()
    },
    [activeIndex, clear, onCommit, results]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => nextSearchIndex(index, results.length))
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((index) => previousSearchIndex(index, results.length))
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        commit()
        return
      }

      if (event.key === 'Escape') {
        clear()
      }
    },
    [clear, commit, results.length]
  )

  return {
    inputRef,
    query,
    setQuery,
    results,
    activeIndex,
    setActiveIndex,
    clear,
    focus,
    commit,
    handleKeyDown,
  }
}

export type CartografiaSearchController = ReturnType<typeof useCartografiaSearch>
