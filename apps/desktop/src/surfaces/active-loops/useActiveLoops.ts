import { useCallback, useEffect, useState } from 'react'
import {
  agentTurnOff,
  agentTurnOffAll,
  fetchAgentsActive,
  fetchAgentsHistory,
  fetchAgentsStatus,
  type AgentEvent,
  type FleetSnapshot,
} from '../../lib/agentsApi'

export interface UseActiveLoopsState {
  snapshot: FleetSnapshot | null
  history: AgentEvent[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  turnOff: (key: string) => Promise<void>
  turnOffAll: () => Promise<void>
}

/** Full fleet + history for the surface. Polls so the operator sees the loop move in near-real time. */
export function useActiveLoops(pollMs = 5_000): UseActiveLoopsState {
  const [snapshot, setSnapshot] = useState<FleetSnapshot | null>(null)
  const [history, setHistory] = useState<AgentEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [snap, hist] = await Promise.all([fetchAgentsStatus(), fetchAgentsHistory()])
      setSnapshot(snap)
      setHistory(hist.events)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = window.setInterval(() => void refresh(), pollMs)
    return () => window.clearInterval(t)
  }, [refresh, pollMs])

  const turnOff = useCallback(
    async (key: string) => {
      await agentTurnOff(key)
      await refresh()
    },
    [refresh],
  )

  const turnOffAll = useCallback(async () => {
    await agentTurnOffAll()
    await refresh()
  }, [refresh])

  return { snapshot, history, loading, error, refresh, turnOff, turnOffAll }
}

/** Lightweight global poll for the persistent badge — just how many agents are running + which accounts. */
export function useActiveAgentCount(pollMs = 6_000): { count: number; accounts: string[] } {
  const [count, setCount] = useState(0)
  const [accounts, setAccounts] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const snap = await fetchAgentsActive()
        if (!cancelled) {
          setCount(snap.active_count)
          setAccounts(snap.spending_accounts)
        }
      } catch {
        if (!cancelled) {
          setCount(0)
          setAccounts([])
        }
      }
    }
    void tick()
    const t = window.setInterval(() => void tick(), pollMs)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [pollMs])

  return { count, accounts }
}
