import { useCallback, useEffect, useRef, useState } from 'react'
import type { BlogEditorialAreaState, BlogEditorialBridgeMode } from './types'

function detectMode(): BlogEditorialBridgeMode {
  if (typeof window === 'undefined') return 'offline'
  const w = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return 'tauri'
  if (import.meta.env.VITE_ATLAS_SERVER_URL) return 'http'
  return 'offline'
}

const MODE: BlogEditorialBridgeMode = detectMode()
const HTTP_BASE = (import.meta.env.VITE_ATLAS_SERVER_URL as string | undefined) ?? ''
const REFRESH_INTERVAL_MS = 10_000

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
  if (token) headers['X-Atlas-Token'] = token
  return headers
}

async function fetchBlogEditorialState(): Promise<BlogEditorialAreaState> {
  const query = new URLSearchParams({
    candidate_limit: '8',
    include_writing_packet: '1',
    include_graph_context: '1',
    include_graph_candidates: '1',
  })
  const response = await fetch(`${HTTP_BASE}/blog/editorial/state?${query.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`blog editorial state ${response.status}: ${body.slice(0, 220)}`)
  }

  return (await response.json()) as BlogEditorialAreaState
}

export interface UseBlogEditorialState {
  state: BlogEditorialAreaState | null
  loading: boolean
  error: Error | null
  mode: BlogEditorialBridgeMode
  lastFetchedAt: string | null
  refresh: () => Promise<void>
}

export function useBlogEditorialState(): UseBlogEditorialState {
  const [state, setState] = useState<BlogEditorialAreaState | null>(null)
  const [loading, setLoading] = useState<boolean>(MODE !== 'offline')
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const aliveRef = useRef<boolean>(true)

  const refresh = useCallback(async () => {
    if (MODE === 'offline') {
      setState(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const next = await fetchBlogEditorialState()
      if (!aliveRef.current) return
      setState(next)
      setError(null)
      setLastFetchedAt(new Date().toISOString())
    } catch (err) {
      if (aliveRef.current) setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    void refresh()
    if (MODE === 'offline') return
    const handle = window.setInterval(() => {
      void refresh()
    }, REFRESH_INTERVAL_MS)

    return () => {
      aliveRef.current = false
      window.clearInterval(handle)
    }
  }, [refresh])

  return { state, loading, error, mode: MODE, lastFetchedAt, refresh }
}
