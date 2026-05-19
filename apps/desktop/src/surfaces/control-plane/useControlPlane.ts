/**
 * useControlPlane · single source of state for the Atlas Control Plane surface.
 *
 * - Fetches `atlas.ai.control_plane.snapshot.v1` from atlas-server via
 *   `GET /atlas/ai/control-plane`. The aggregate endpoint already includes
 *   readiness, blockers summary, recent events and next actions, so the
 *   surface only issues additional fetches on operator request (refresh).
 * - Honors the canonical bridge dispatch order: Tauri → HTTP → offline. The
 *   Control Plane is read-only and never mutates, so offline mode returns
 *   `null` and renders a degraded empty state — never invents records.
 * - Tolerates per-component `missing/degraded/blocked` statuses by passing the
 *   payload through unchanged; section components decide how to render them.
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-autonomous-control-plane.md
 *   - app/Http/Controllers/AtlasAiControlPlaneController.php
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ControlPlaneBridgeMode,
  ControlPlaneSnapshot,
} from './types'

function detectMode(): ControlPlaneBridgeMode {
  if (typeof window === 'undefined') return 'offline'
  const w = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return 'tauri'
  if (import.meta.env.VITE_ATLAS_SERVER_URL) return 'http'
  return 'offline'
}

const MODE: ControlPlaneBridgeMode = detectMode()
const HTTP_BASE = (import.meta.env.VITE_ATLAS_SERVER_URL as string | undefined) ?? ''
const REFRESH_INTERVAL_MS = 30_000

async function fetchSnapshot(): Promise<ControlPlaneSnapshot> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
  if (token) headers['X-Atlas-Token'] = token

  const url = `${HTTP_BASE}/atlas/ai/control-plane`
  const response = await fetch(url, { method: 'GET', headers })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`control-plane http ${response.status}: ${body.slice(0, 200)}`)
  }
  return (await response.json()) as ControlPlaneSnapshot
}

export interface UseControlPlaneResult {
  snapshot: ControlPlaneSnapshot | null
  loading: boolean
  error: string | null
  mode: ControlPlaneBridgeMode
  lastFetchedAt: string | null
  refresh: () => Promise<void>
}

export function useControlPlane(): UseControlPlaneResult {
  const [snapshot, setSnapshot] = useState<ControlPlaneSnapshot | null>(null)
  const [loading, setLoading] = useState<boolean>(MODE !== 'offline')
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const stillMounted = useRef<boolean>(true)

  const refresh = useCallback(async () => {
    if (MODE === 'offline') {
      if (stillMounted.current) {
        setSnapshot(null)
        setError(null)
        setLoading(false)
      }
      return
    }
    if (stillMounted.current) {
      setLoading(true)
    }
    try {
      const data = await fetchSnapshot()
      if (!stillMounted.current) return
      setSnapshot(data)
      setError(null)
      setLastFetchedAt(new Date().toISOString())
    } catch (e) {
      if (!stillMounted.current) return
      setSnapshot(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (stillMounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    stillMounted.current = true
    if (MODE === 'offline') {
      // `loading` already initialised to `false` for offline mode; nothing
      // synchronous to do here — return the cleanup hook only.
      return () => {
        stillMounted.current = false
      }
    }
    void Promise.resolve().then(() => {
      if (!stillMounted.current) return
      void refresh()
    })
    const interval = window.setInterval(() => {
      void refresh()
    }, REFRESH_INTERVAL_MS)
    return () => {
      stillMounted.current = false
      window.clearInterval(interval)
    }
  }, [refresh])

  return {
    snapshot,
    loading,
    error,
    mode: MODE,
    lastFetchedAt,
    refresh,
  }
}
