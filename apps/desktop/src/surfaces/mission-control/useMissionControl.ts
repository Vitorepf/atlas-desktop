/**
 * useMissionControl · single source of state for the Mission Control surface.
 *
 * Polls `GET /atlas-code/aaeos/cockpit` every 5 seconds. The endpoint is
 * cheap (baseline snapshot reads only canonical phase scaffolding) and
 * we expect ETag support in a follow-up AP to make polling free.
 *
 * Bridge dispatch order: Tauri → HTTP → offline. Mission Control is
 * read-only; offline returns null and the surface renders an empty
 * state — never invents records.
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-agentic-engineering-os.md
 *   - app/Http/Controllers/Ai/AgenticEngineeringOs/AtlasMissionControlCockpitController.php
 *   - docs/ap/AP-702-aaeos-mission-control-cockpit-http-and-desktop-surface.md
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  MissionControlBridgeMode,
  MissionControlResponse,
} from './types'

function detectMode(): MissionControlBridgeMode {
  if (typeof window === 'undefined') return 'offline'
  const w = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return 'tauri'
  if (import.meta.env.VITE_ATLAS_SERVER_URL) return 'http'
  return 'offline'
}

const MODE: MissionControlBridgeMode = detectMode()
const HTTP_BASE = (import.meta.env.VITE_ATLAS_SERVER_URL as string | undefined) ?? ''
const REFRESH_INTERVAL_MS = 5_000

async function fetchCockpit(intent: string | undefined): Promise<MissionControlResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
  if (token) headers['X-Atlas-Token'] = token

  const query = intent && intent.trim() !== '' ? `?intent=${encodeURIComponent(intent)}` : ''
  const url = `${HTTP_BASE}/atlas-code/aaeos/cockpit${query}`
  const response = await fetch(url, { method: 'GET', headers })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`mission-control http ${response.status}: ${body.slice(0, 200)}`)
  }

  return (await response.json()) as MissionControlResponse
}

export interface UseMissionControlState {
  snapshot: MissionControlResponse | null
  loading: boolean
  error: Error | null
  mode: MissionControlBridgeMode
  refresh: () => Promise<void>
}

export function useMissionControl(intent?: string): UseMissionControlState {
  const [snapshot, setSnapshot] = useState<MissionControlResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const aliveRef = useRef<boolean>(true)

  const load = useCallback(async () => {
    if (MODE === 'offline') {
      setSnapshot(null)
      setError(null)
      return
    }
    setLoading(true)
    try {
      const next = await fetchCockpit(intent)
      if (aliveRef.current) {
        setSnapshot(next)
        setError(null)
      }
    } catch (err) {
      if (aliveRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [intent])

  useEffect(() => {
    aliveRef.current = true
    void load()
    if (MODE === 'offline') return
    const handle = window.setInterval(() => {
      void load()
    }, REFRESH_INTERVAL_MS)

    return () => {
      aliveRef.current = false
      window.clearInterval(handle)
    }
  }, [load])

  return {
    snapshot,
    loading,
    error,
    mode: MODE,
    refresh: load,
  }
}
