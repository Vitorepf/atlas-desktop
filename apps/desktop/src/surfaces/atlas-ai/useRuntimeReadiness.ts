/**
 * Atlas AI · Desktop · hook React para consumir o Runtime Readiness Gate.
 *
 *   GET /atlas/ai/runtime-readiness (schema `atlas.ai.runtime_readiness.v1`)
 *
 * Filosofia silent: endpoint ausente/erro → estado `unavailable` e a Desktop
 * apenas não exibe o painel. Nunca propaga error pra UI principal.
 *
 * Polling: opcional via `pollMs`. Default = 60_000 ms (1 min). Quando 0,
 * busca uma vez no mount + ao re-fetch manual via `refresh()`.
 *
 * O builder puro `buildRuntimeReadinessView` vive em `runtimeReadinessView.ts`
 * e é testado isoladamente sem dependência de `import.meta.env`.
 */
import { useCallback, useEffect, useState } from 'react'
import { getAtlasAiRuntimeReadiness } from './client'
import { buildRuntimeReadinessView, type RuntimeReadinessView } from './runtimeReadinessView'
import type { AtlasAiRuntimeReadiness } from './types'

export type { RuntimeReadinessStatus, RuntimeReadinessView } from './runtimeReadinessView'
export { buildRuntimeReadinessView, statusLabelFor } from './runtimeReadinessView'

interface UseRuntimeReadinessOptions {
  /** Intervalo de re-poll em ms. 0 = sem polling. Default 60_000. */
  pollMs?: number
  /** Quando false, hook não faz nenhum fetch (modo CI/test). Default true. */
  enabled?: boolean
}

export function useRuntimeReadiness(options: UseRuntimeReadinessOptions = {}): RuntimeReadinessView {
  const pollMs = options.pollMs ?? 60_000
  const enabled = options.enabled ?? true

  const [raw, setRaw] = useState<AtlasAiRuntimeReadiness | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const fetchOnce = useCallback(async () => {
    if (!enabled) return
    setIsFetching(true)
    try {
      const result = await getAtlasAiRuntimeReadiness()
      setRaw(result)
    } finally {
      setIsFetching(false)
      setIsLoaded(true)
    }
  }, [enabled])

  useEffect(() => {
    void fetchOnce()
    if (!enabled || pollMs <= 0) return undefined
    const timer = window.setInterval(() => void fetchOnce(), pollMs)
    return () => window.clearInterval(timer)
  }, [fetchOnce, enabled, pollMs])

  return buildRuntimeReadinessView(raw, isFetching, isLoaded, () => void fetchOnce())
}
