/**
 * useBoot · keeps the GET /atlas-code/boot snapshot fresh.
 *
 * Polls every 5s. On successful read returns the snapshot; on error,
 * keeps the last good snapshot but flips loading=true so the topbar
 * can show a spinner without flashing back to "no data".
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { bridge } from '../lib/bridge'
import type { BootSnapshot } from '@atlas/domain'

const POLL_MS = 5000

export interface UseBootResult {
  boot: BootSnapshot | null
  loading: boolean
  refresh: () => Promise<void>
  lastError: string | null
}

export function useBoot(enabled = true): UseBootResult {
  const [boot, setBoot] = useState<BootSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastError, setLastError] = useState<string | null>(null)
  const cancelRef = useRef(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await bridge.boot()
      if (cancelRef.current) return
      if (snap) {
        setBoot(snap)
        setLastError(null)
      } else {
        setLastError('boot offline')
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e))
    } finally {
      if (!cancelRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    cancelRef.current = false
    queueMicrotask(() => {
      if (!cancelRef.current) void refresh()
    })
    const id = setInterval(() => void refresh(), POLL_MS)
    return () => {
      cancelRef.current = true
      clearInterval(id)
    }
  }, [enabled, refresh])

  return { boot, loading, refresh, lastError }
}
