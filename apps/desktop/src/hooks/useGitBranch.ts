import { useEffect, useState } from 'react'
import { bridge } from '../lib/bridge'

const cache = new Map<string, string | null>()
const inflight = new Map<string, Promise<string | null>>()

export function useGitBranch(cwd: string | undefined | null): string | null {
  const [, force] = useState(0)

  useEffect(() => {
    if (!cwd || cache.has(cwd)) return
    let cancelled = false
    const existing = inflight.get(cwd)
    const promise = existing ?? bridge.gitBranch(cwd).then((value) => {
      cache.set(cwd, value)
      inflight.delete(cwd)
      return value
    })
    if (!existing) inflight.set(cwd, promise)
    void promise.then(() => {
      if (!cancelled) force((n) => n + 1)
    })
    return () => {
      cancelled = true
    }
  }, [cwd])

  if (!cwd) return null
  return cache.get(cwd) ?? null
}
