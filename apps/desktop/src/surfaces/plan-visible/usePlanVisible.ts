/**
 * usePlanVisible · Plan-Visible polling hook (AP-703 / Patamar A5).
 *
 * Polls the canonical read model endpoint shipped by AP-700:
 *   - `GET /atlas-code/programming/plan-visible` for the list
 *   - `GET /atlas-code/programming/work-items/{id}/plan-visible` for a single item
 *
 * Uses ETag + If-None-Match so identical plans return 304 with no body.
 * Cadence 2s aligns with the operator's review loop.
 *
 * Read-only. Never mutates.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  PlanVisibleBridgeMode,
  PlanVisibleIndexResponse,
  PlanVisibleShowResponse,
} from './types'

function detectMode(): PlanVisibleBridgeMode {
  if (typeof window === 'undefined') return 'offline'
  const w = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return 'tauri'
  if (import.meta.env.VITE_ATLAS_SERVER_URL) return 'http'
  return 'offline'
}

const MODE: PlanVisibleBridgeMode = detectMode()
const HTTP_BASE = (import.meta.env.VITE_ATLAS_SERVER_URL as string | undefined) ?? ''
const REFRESH_INTERVAL_MS = 2_000

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
  if (token) headers['X-Atlas-Token'] = token

  return headers
}

async function fetchIndex(): Promise<PlanVisibleIndexResponse> {
  const response = await fetch(`${HTTP_BASE}/atlas-code/programming/plan-visible`, {
    method: 'GET',
    headers: authHeaders(),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`plan-visible index ${response.status}: ${body.slice(0, 200)}`)
  }

  return (await response.json()) as PlanVisibleIndexResponse
}

async function fetchOne(
  workItemId: string,
  knownEtag: string | null,
): Promise<{ status: 'ok' | 'not_modified' | 'not_found'; data: PlanVisibleShowResponse | null; etag: string | null }> {
  const headers = authHeaders()
  if (knownEtag) headers['If-None-Match'] = knownEtag

  const response = await fetch(
    `${HTTP_BASE}/atlas-code/programming/work-items/${encodeURIComponent(workItemId)}/plan-visible`,
    { method: 'GET', headers },
  )

  if (response.status === 304) {
    return { status: 'not_modified', data: null, etag: knownEtag }
  }
  if (response.status === 404) {
    return { status: 'not_found', data: null, etag: null }
  }
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`plan-visible show ${response.status}: ${body.slice(0, 200)}`)
  }

  const etag = response.headers.get('ETag')
  const data = (await response.json()) as PlanVisibleShowResponse

  return { status: 'ok', data, etag }
}

export interface UsePlanVisibleIndexState {
  index: PlanVisibleIndexResponse | null
  loading: boolean
  error: Error | null
  mode: PlanVisibleBridgeMode
  refresh: () => Promise<void>
}

export function usePlanVisibleIndex(): UsePlanVisibleIndexState {
  const [index, setIndex] = useState<PlanVisibleIndexResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const aliveRef = useRef<boolean>(true)

  const refresh = useCallback(async () => {
    if (MODE === 'offline') {
      setIndex(null)
      return
    }
    setLoading(true)
    try {
      const next = await fetchIndex()
      if (aliveRef.current) {
        setIndex(next)
        setError(null)
      }
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

  return { index, loading, error, mode: MODE, refresh }
}

export interface UsePlanVisibleShowState {
  plan: PlanVisibleShowResponse | null
  status: 'idle' | 'loading' | 'ok' | 'not_found' | 'not_modified' | 'error'
  error: Error | null
  refresh: () => Promise<void>
}

export function usePlanVisibleShow(workItemId: string | null): UsePlanVisibleShowState {
  const [plan, setPlan] = useState<PlanVisibleShowResponse | null>(null)
  const [status, setStatus] = useState<UsePlanVisibleShowState['status']>('idle')
  const [error, setError] = useState<Error | null>(null)
  const etagRef = useRef<string | null>(null)
  const aliveRef = useRef<boolean>(true)

  const refresh = useCallback(async () => {
    if (!workItemId || MODE === 'offline') {
      setPlan(null)
      setStatus('idle')
      return
    }
    setStatus('loading')
    try {
      const result = await fetchOne(workItemId, etagRef.current)
      if (!aliveRef.current) return
      if (result.status === 'ok' && result.data) {
        setPlan(result.data)
        etagRef.current = result.etag
        setStatus('ok')
        setError(null)
      } else if (result.status === 'not_modified') {
        setStatus('not_modified')
      } else if (result.status === 'not_found') {
        setPlan(null)
        etagRef.current = null
        setStatus('not_found')
      }
    } catch (err) {
      if (aliveRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setStatus('error')
      }
    }
  }, [workItemId])

  useEffect(() => {
    aliveRef.current = true
    void refresh()
    if (MODE === 'offline' || !workItemId) return
    const handle = window.setInterval(() => {
      void refresh()
    }, REFRESH_INTERVAL_MS)

    return () => {
      aliveRef.current = false
      window.clearInterval(handle)
    }
  }, [refresh, workItemId])

  return { plan, status, error, refresh }
}
