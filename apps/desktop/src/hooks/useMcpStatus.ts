/**
 * useMcpStatus · keeps GET /atlas-code/mcp/status fresh for the MCP pill.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { bridge } from '../lib/bridge'
import type { McpStatus } from '@atlas/domain'

const POLL_MS = 8000

export interface UseMcpStatusResult {
  mcp: McpStatus | null
  loading: boolean
  refresh: () => Promise<void>
}

export function useMcpStatus(enabled = true): UseMcpStatusResult {
  const [mcp, setMcp] = useState<McpStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const cancelRef = useRef(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const next = await bridge.mcpStatus()
      if (cancelRef.current) return
      setMcp(next)
    } catch {
      /* keep last */
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

  return { mcp, loading, refresh }
}
