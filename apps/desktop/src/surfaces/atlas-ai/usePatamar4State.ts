/**
 * Atlas AI · Desktop · hook React para consumir Patamar 4 state aggregator.
 *
 *   GET /atlas/patamar4/state?tail=N (schema `atlas.patamar4.state.v1`)
 *
 * Filosofia silent: endpoint ausente/erro → estado `unavailable` e a Desktop
 * apenas não exibe o painel Patamar 4. Nunca propaga error.
 *
 * Polling: opcional via `pollMs`. Default = 30_000 ms (30s). 0 = sem polling.
 *
 * O builder puro `buildPatamar4View` vive em `patamar4StateView.ts` e é
 * testável isoladamente sem dependência de React ou import.meta.env.
 */
import { useCallback, useEffect, useState } from 'react'
import { getAtlasPatamar4State } from './client'
import { buildPatamar4View, type Patamar4View } from './patamar4StateView'

export type { Patamar4Status, Patamar4View } from './patamar4StateView'
export { buildPatamar4View, patamar4StatusLabel } from './patamar4StateView'

interface UsePatamar4StateOptions {
  /** Intervalo de re-poll em ms. 0 = sem polling. Default 30_000. */
  pollMs?: number
  /** Quando false, hook não faz nenhum fetch (modo CI/test). Default true. */
  enabled?: boolean
  /** Quantas linhas tail por seção. Default 5. Range 1..50. */
  tail?: number
}

export function usePatamar4State(options: UsePatamar4StateOptions = {}): Patamar4View {
  const pollMs = options.pollMs ?? 30_000
  const enabled = options.enabled ?? true
  const tail = options.tail ?? 5

  const [raw, setRaw] = useState<unknown | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const fetchOnce = useCallback(async () => {
    if (!enabled) return
    setIsFetching(true)
    try {
      const result = await getAtlasPatamar4State(tail)
      setRaw(result)
    } finally {
      setIsFetching(false)
      setIsLoaded(true)
    }
  }, [enabled, tail])

  useEffect(() => {
    void fetchOnce()
    if (!enabled || pollMs <= 0) return undefined
    const timer = window.setInterval(() => void fetchOnce(), pollMs)
    return () => window.clearInterval(timer)
  }, [fetchOnce, enabled, pollMs])

  return buildPatamar4View(raw as never, isFetching, isLoaded, () => void fetchOnce())
}
