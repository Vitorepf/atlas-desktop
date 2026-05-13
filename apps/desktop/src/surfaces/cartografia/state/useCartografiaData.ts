import { useCallback, useEffect, useRef, useState } from 'react'
import type { CartographyGraph, RecentChange } from '@atlas/domain'
import { bridge } from '../../../lib/bridge'

const POLL_INTERVAL_MS = 5000
const TICK_INTERVAL_MS = 1000

export function useCartografiaData() {
  const [graph, setGraph] = useState<CartographyGraph | null>(null)
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const cancelledRef = useRef(false)

  const refreshGraph = useCallback(async () => {
    try {
      const nextGraph = await bridge.loadCartographyGraph()
      if (cancelledRef.current) return
      if (nextGraph) setGraph(nextGraph)
      else setErrors((current) => ['cartography graph unavailable', ...current].slice(0, 8))
    } catch (error) {
      if (!cancelledRef.current) {
        setErrors((current) => [`graph · ${String(error)}`, ...current].slice(0, 8))
      }
    }
  }, [])

  const refreshRecent = useCallback(async () => {
    try {
      const nextChanges = await bridge.loadCartographyRecentChanges()
      if (!cancelledRef.current) setRecentChanges(nextChanges)
    } catch {
      // Mudancas recentes sao best-effort; erro aqui nao derruba leitura canonica.
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    void Promise.all([refreshGraph(), refreshRecent()]).finally(() => {
      if (!cancelledRef.current) setLoading(false)
    })

    const pollId = setInterval(() => {
      void refreshGraph()
      void refreshRecent()
    }, POLL_INTERVAL_MS)

    const tickId = setInterval(() => {
      setRecentChanges((changes) =>
        changes.map((change) => ({
          ...change,
          secondsAgo: change.secondsAgo + Math.floor(TICK_INTERVAL_MS / 1000),
        }))
      )
    }, TICK_INTERVAL_MS)

    return () => {
      cancelledRef.current = true
      clearInterval(pollId)
      clearInterval(tickId)
    }
  }, [refreshGraph, refreshRecent])

  return {
    loading,
    errors,
    graph,
    recentChanges,
    refreshRecent,
  }
}
