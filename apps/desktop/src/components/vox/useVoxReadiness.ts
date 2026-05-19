/**
 * useVoxReadiness · loads + refreshes the Vox first-run readiness
 * checklist. Honest about state: starts in `loading`, transitions to
 * `ready` when probes complete, and any probe failure ends up as an
 * `unavailable` item in the summary — never a fake `passed`.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { voxReadinessGet } from '../../lib/bridge'
import type { VoxReadinessSummary } from '../../lib/voxReadiness'

export interface UseVoxReadinessResult {
  loading: boolean
  summary: VoxReadinessSummary | null
  error: string | null
  refresh: () => Promise<void>
  lastRefreshedAt: string | null
}

export interface UseVoxReadinessOptions {
  /** Auto-load when the overlay opens. Defaults to true. */
  autoLoad?: boolean
  /** Signal that the panel is currently visible — used to throttle. */
  open?: boolean
}

export function useVoxReadiness(options: UseVoxReadinessOptions = {}): UseVoxReadinessResult {
  const { autoLoad = true, open = true } = options
  const [summary, setSummary] = useState<VoxReadinessSummary | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null)
  const mountedRef = useRef<boolean>(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const next = await voxReadinessGet()
      if (!mountedRef.current) return
      setSummary(next)
      setLastRefreshedAt(next.generatedAt)
    } catch (e) {
      if (!mountedRef.current) return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [loading])

  // Initial load when the panel becomes visible (autoLoad).
  const didLoadRef = useRef<boolean>(false)
  useEffect(() => {
    if (!autoLoad || !open) return
    if (didLoadRef.current) return
    didLoadRef.current = true
    void refresh()
  }, [autoLoad, open, refresh])

  return { loading, summary, error, refresh, lastRefreshedAt }
}
