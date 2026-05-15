/**
 * useAttentionCount · lightweight polling hook for the top-bar badge.
 *
 * Pings `/atlas-code/attention` periodically and exposes only the
 * `health.total_items` value (so SurfaceSwitcher can render a numeric
 * badge without reloading the full snapshot). When the operator is in
 * the Atenção surface itself, polling is paused — the AtencaoSurface
 * already has the snapshot via `useAttentionQueue` and can update the
 * badge via the same path.
 *
 * Honest fallback: HTTP/Tauri unavailable → returns null and the badge
 * just disappears.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

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
const DEFAULT_INTERVAL_MS = 30_000

async function fetchAttentionHealth(workspaceSlug: string | null, signal: AbortSignal): Promise<number | null> {
  if (MODE === 'offline') return null
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = import.meta.env.VITE_ATLAS_TOKEN as string | undefined
  if (token) headers['X-Atlas-Token'] = token
  const qs = workspaceSlug ? `?workspace=${encodeURIComponent(workspaceSlug)}` : ''
  try {
    const response = await fetch(`${HTTP_BASE}/atlas-code/attention${qs}`, {
      method: 'GET',
      headers,
      signal,
    })
    if (!response.ok) return null
    const body = (await response.json()) as { health?: { total_items?: unknown } }
    const value = body?.health?.total_items
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function useAttentionCount(opts: {
  workspaceSlug: string | null
  enabled: boolean
  intervalMs?: number
}): number | null {
  const { workspaceSlug, enabled, intervalMs = DEFAULT_INTERVAL_MS } = opts
  const [count, setCount] = useState<number | null>(null)
  const mounted = useRef(true)

  const tick = useCallback(
    async (signal: AbortSignal) => {
      const next = await fetchAttentionHealth(workspaceSlug, signal)
      if (mounted.current && !signal.aborted) setCount(next)
    },
    [workspaceSlug]
  )

  useEffect(() => {
    mounted.current = true
    if (!enabled || MODE === 'offline') {
      // Defer the reset to a microtask so we don't trigger a synchronous
      // cascade render from inside the effect body (react-hooks/set-state-in-effect).
      const reset = setTimeout(() => {
        if (mounted.current) setCount(null)
      }, 0)
      return () => {
        mounted.current = false
        clearTimeout(reset)
      }
    }
    const controller = new AbortController()
    void tick(controller.signal)
    const handle = window.setInterval(() => {
      void tick(controller.signal)
    }, intervalMs)
    return () => {
      mounted.current = false
      controller.abort()
      window.clearInterval(handle)
    }
  }, [enabled, intervalMs, tick])

  return count
}
