/**
 * useStewardshipCockpit · AP-739 Product Mode/Cockpit polling hook.
 *
 * Reads the canonical atlas-server cockpit endpoint. The hook is read-only:
 * it never records AP-731 decisions and never triggers Dev/Forge.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { StewardshipBridgeMode, StewardshipCockpit } from './types'

function detectMode(): StewardshipBridgeMode {
  if (typeof window === 'undefined') return 'offline'
  const w = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return 'tauri'
  if (import.meta.env.VITE_ATLAS_SERVER_URL) return 'http'
  return 'offline'
}

const MODE: StewardshipBridgeMode = detectMode()
const HTTP_BASE = (import.meta.env.VITE_ATLAS_SERVER_URL as string | undefined) ?? ''
const REFRESH_INTERVAL_MS = 5_000

function authHeaders(etag?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
  if (token) headers['X-Atlas-Token'] = token
  if (etag) headers['If-None-Match'] = etag
  return headers
}

async function fetchCockpit(
  portfolioId: string,
  areaId: string,
  etag: string | null,
): Promise<{ status: 'ok' | 'not_modified'; data: StewardshipCockpit | null; etag: string | null }> {
  const query = new URLSearchParams({ area: areaId })
  const url = `${HTTP_BASE}/ai/software-company-stewardship/product-mode-cockpit/${encodeURIComponent(portfolioId)}?${query.toString()}`
  const response = await fetch(url, { method: 'GET', headers: authHeaders(etag) })

  if (response.status === 304) {
    return { status: 'not_modified', data: null, etag }
  }
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`stewardship cockpit ${response.status}: ${body.slice(0, 200)}`)
  }

  return {
    status: 'ok',
    data: (await response.json()) as StewardshipCockpit,
    etag: response.headers.get('ETag'),
  }
}

export interface UseStewardshipCockpitState {
  cockpit: StewardshipCockpit | null
  loading: boolean
  error: Error | null
  mode: StewardshipBridgeMode
  lastFetchedAt: string | null
  refresh: () => Promise<void>
}

export function useStewardshipCockpit(
  portfolioId = 'atlas_software_company',
  areaId = 'agentic_engineering_os',
): UseStewardshipCockpitState {
  const [cockpit, setCockpit] = useState<StewardshipCockpit | null>(null)
  const [loading, setLoading] = useState<boolean>(MODE !== 'offline')
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const aliveRef = useRef<boolean>(true)
  const etagRef = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    if (MODE === 'offline') {
      setCockpit(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const next = await fetchCockpit(portfolioId, areaId, etagRef.current)
      if (!aliveRef.current) return
      if (next.status === 'ok' && next.data) {
        setCockpit(next.data)
        etagRef.current = next.etag
      }
      setError(null)
      setLastFetchedAt(new Date().toISOString())
    } catch (err) {
      if (aliveRef.current) setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [areaId, portfolioId])

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

  return { cockpit, loading, error, mode: MODE, lastFetchedAt, refresh }
}
