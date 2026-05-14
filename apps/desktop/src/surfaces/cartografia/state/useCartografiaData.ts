import { useCallback, useEffect, useRef, useState } from 'react'
import type { CartographyGraph, RecentChange } from '@atlas/domain'
import { bridge } from '../../../lib/bridge'

const POLL_INTERVAL_MS = 30_000 // slow fallback when SSE is alive
const POLL_INTERVAL_OFFLINE_MS = 5_000 // tight loop when SSE not available
const TICK_INTERVAL_MS = 1000

let cachedGraph: CartographyGraph | null = null
let cachedRecentChanges: RecentChange[] = []
let cachedChecksum: string | null = null

export interface UseCartografiaDataOptions {
  /** Called when SSE emits `graph_changed` so callers can drop dependent caches. */
  onGraphMutation?: () => void
}

export function useCartografiaData(options: UseCartografiaDataOptions = {}) {
  const { onGraphMutation } = options
  const hasWarmGraphRef = useRef(cachedGraph !== null)
  const [graph, setGraph] = useState<CartographyGraph | null>(() => cachedGraph)
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>(() => cachedRecentChanges)
  const [loading, setLoading] = useState(() => cachedGraph === null)
  const [errors, setErrors] = useState<string[]>([])
  const [streamAlive, setStreamAlive] = useState(false)
  const cancelledRef = useRef(false)
  const lastChecksumRef = useRef<string | null>(cachedChecksum)
  const onGraphMutationRef = useRef(onGraphMutation)
  onGraphMutationRef.current = onGraphMutation

  const refreshGraph = useCallback(async (force = false) => {
    try {
      const nextGraph = await bridge.loadCartographyGraph()
      if (cancelledRef.current) return
      if (!nextGraph) {
        setErrors((current) => ['cartography graph unavailable', ...current].slice(0, 8))
        return
      }
      // Cheap diff: skip state update + cache invalidation when nothing moved.
      const incomingChecksum = nextGraph.checksum
      const previousChecksum = lastChecksumRef.current
      if (incomingChecksum && incomingChecksum === previousChecksum) {
        return
      }
      lastChecksumRef.current = incomingChecksum ?? previousChecksum
      cachedChecksum = lastChecksumRef.current
      cachedGraph = nextGraph
      setGraph(nextGraph)
      if (incomingChecksum && force && previousChecksum !== null && incomingChecksum !== previousChecksum) {
        // Mutation acknowledged via SSE — let consumers drop dependent caches
        // (notes, search index, derived view models).
        onGraphMutationRef.current?.()
      }
    } catch (error) {
      if (!cancelledRef.current) {
        setErrors((current) => [`graph · ${String(error)}`, ...current].slice(0, 8))
      }
    }
  }, [])

  const refreshRecent = useCallback(async () => {
    try {
      const nextChanges = await bridge.loadCartographyRecentChanges()
      if (!cancelledRef.current) {
        cachedRecentChanges = nextChanges
        setRecentChanges(nextChanges)
      }
    } catch {
      // Mudancas recentes sao best-effort; erro aqui nao derruba leitura canonica.
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    void refreshGraph(true).finally(() => {
      if (!cancelledRef.current && !hasWarmGraphRef.current) setLoading(false)
    })
    void refreshRecent()

    // SSE drives the live path; polling is a slow safety net (30s vs 5s offline).
    const unsubscribe = bridge.streamCartography((kind, payload) => {
      if (cancelledRef.current) return
      if (kind === 'graph_changed') {
        setStreamAlive(true)
        const incoming = typeof payload.checksum === 'string' ? payload.checksum : null
        // Force only when checksum is new — connect event re-broadcasts the
        // current checksum and we don't want to thrash caches on reconnect.
        const force = incoming != null && incoming !== lastChecksumRef.current
        if (force) {
          void refreshGraph(true)
          void refreshRecent()
        }
      } else if (kind === 'heartbeat') {
        setStreamAlive(true)
      } else if (kind === 'reconnect') {
        // Server cycled the worker; client EventSource auto-reconnects.
      }
    })

    const pollMs = streamAlive || bridge.mode === 'tauri' ? POLL_INTERVAL_MS : POLL_INTERVAL_OFFLINE_MS
    const pollId = setInterval(() => {
      void refreshGraph()
      void refreshRecent()
    }, pollMs)

    const tickId = setInterval(() => {
      setRecentChanges((changes) => {
        const nextChanges = changes.map((change) => ({
          ...change,
          secondsAgo: change.secondsAgo + Math.floor(TICK_INTERVAL_MS / 1000),
        }))
        cachedRecentChanges = nextChanges
        return nextChanges
      })
    }, TICK_INTERVAL_MS)

    return () => {
      cancelledRef.current = true
      unsubscribe()
      clearInterval(pollId)
      clearInterval(tickId)
    }
  }, [refreshGraph, refreshRecent, streamAlive])

  return {
    loading,
    errors,
    graph,
    recentChanges,
    refreshRecent,
    streamAlive,
  }
}
