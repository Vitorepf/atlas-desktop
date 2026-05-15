/**
 * useAttentionQueue · single source of state for the Atenção surface.
 *
 * - Fetches `atlas.code.attention_control_plane.v1` from atlas-server.
 * - Tolerates Tauri / HTTP / offline modes honestly: when neither transport is
 *   available, returns `null` and lets the surface render the empty state.
 * - Mutating calls (`decide`) refresh the snapshot on success so the UI
 *   converges on the next decision automatically.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AttentionDecisionPayload,
  AttentionReceipt,
  AttentionSnapshot,
} from './types'

type BridgeMode = 'tauri' | 'http' | 'offline'

function detectMode(): BridgeMode {
  if (typeof window === 'undefined') return 'offline'
  const w = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  if (w.__TAURI__ || w.__TAURI_INTERNALS__) return 'tauri'
  if (import.meta.env.VITE_ATLAS_SERVER_URL) return 'http'
  return 'offline'
}

const MODE: BridgeMode = detectMode()
const HTTP_BASE = (import.meta.env.VITE_ATLAS_SERVER_URL as string | undefined) ?? ''

async function http<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
  if (token) headers['X-Atlas-Token'] = token

  const response = await fetch(`${HTTP_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`attention http ${response.status}: ${body.slice(0, 160)}`)
  }
  return (await response.json()) as T
}

export interface UseAttentionQueueResult {
  snapshot: AttentionSnapshot | null
  loading: boolean
  error: string | null
  mode: BridgeMode
  workspaceSlug: string | null
  setWorkspaceSlug: (slug: string | null) => void
  refresh: () => Promise<void>
  decide: (
    obraId: string,
    payload: AttentionDecisionPayload,
  ) => Promise<AttentionReceipt>
  lastReceipt: AttentionReceipt | null
}

export function useAttentionQueue(initialWorkspaceSlug: string | null = null): UseAttentionQueueResult {
  const [snapshot, setSnapshot] = useState<AttentionSnapshot | null>(null)
  const [loading, setLoading] = useState<boolean>(MODE !== 'offline')
  const [error, setError] = useState<string | null>(null)
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(initialWorkspaceSlug)
  const [lastReceipt, setLastReceipt] = useState<AttentionReceipt | null>(null)
  const stillMounted = useRef(true)

  const refresh = useCallback(async () => {
    if (MODE === 'offline') {
      if (stillMounted.current) {
        setSnapshot(null)
        setError(null)
        setLoading(false)
      }
      return
    }
    const qs = workspaceSlug ? `?workspace=${encodeURIComponent(workspaceSlug)}` : ''
    try {
      const data = await http<AttentionSnapshot>(`/atlas-code/attention${qs}`)
      if (!stillMounted.current) return
      setSnapshot(data)
      setError(null)
    } catch (e) {
      if (!stillMounted.current) return
      setSnapshot(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (stillMounted.current) setLoading(false)
    }
  }, [workspaceSlug])

  const decide = useCallback(
    async (obraId: string, payload: AttentionDecisionPayload): Promise<AttentionReceipt> => {
      if (MODE === 'offline') {
        throw new Error('atencao_offline · backend not reachable')
      }
      const body: AttentionDecisionPayload = {
        item_key: payload.item_key,
        action: payload.action,
        ...(payload.reason !== undefined ? { reason: payload.reason } : {}),
        ...(payload.decided_by !== undefined ? { decided_by: payload.decided_by } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        ...(payload.pause_hours !== undefined ? { pause_hours: payload.pause_hours } : {}),
      }
      const result = await http<{ receipt: AttentionReceipt; snapshot: AttentionSnapshot }>(
        `/atlas-code/attention/${encodeURIComponent(obraId)}/decision`,
        { method: 'POST', body },
      )
      if (stillMounted.current) {
        setLastReceipt(result.receipt)
        setSnapshot(result.snapshot)
      }
      return result.receipt
    },
    [],
  )

  useEffect(() => {
    stillMounted.current = true
    if (MODE === 'offline') {
      return () => {
        stillMounted.current = false
      }
    }
    // Defer to a microtask so the initial render commits before any
    // setState from refresh fires — pattern aligned with useBridge.
    void Promise.resolve().then(() => {
      if (!stillMounted.current) return
      void refresh()
    })
    return () => {
      stillMounted.current = false
    }
  }, [refresh])

  return {
    snapshot,
    loading,
    error,
    mode: MODE,
    workspaceSlug,
    setWorkspaceSlug,
    refresh,
    decide,
    lastReceipt,
  }
}
