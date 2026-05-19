import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAtlasDevReadiness } from './api'
import type { AtlasDevReadinessCheck, AtlasDevReadinessResponse } from './types'
import styles from './atlasDev.module.css'

interface ReadinessGateProps {
  initialReadiness?: AtlasDevReadinessResponse | null
  onReadyChange?: (ready: boolean) => void
}

function isBlockingCheck(check: AtlasDevReadinessCheck): boolean {
  return check.status === 'failed' || (check.severity === 'blocker' && check.status !== 'passed')
}

function checkTone(check: AtlasDevReadinessCheck): 'positive' | 'warning' | 'danger' {
  if (check.status === 'passed') return 'positive'
  if (isBlockingCheck(check)) return 'danger'
  return 'warning'
}

export function ReadinessGate({ initialReadiness = null, onReadyChange }: ReadinessGateProps) {
  const [readiness, setReadiness] = useState<AtlasDevReadinessResponse | null>(initialReadiness)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      setReadiness(await fetchAtlasDevReadiness({ strict: true }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'falha ao consultar readiness')
      setReadiness(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialReadiness) {
      return undefined
    }
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [initialReadiness, refresh])

  const blockers = useMemo(
    () => readiness?.checks.filter(isBlockingCheck) ?? [],
    [readiness],
  )
  const ready = readiness?.status === 'passed' && readiness.provider_safe === true && blockers.length === 0

  useEffect(() => {
    onReadyChange?.(ready)
  }, [onReadyChange, ready])

  const visibleChecks = blockers.length > 0
    ? blockers.slice(0, 4)
    : readiness?.checks.filter((check) => check.status !== 'passed').slice(0, 4) ?? []

  return (
    <section
      className={styles.readinessGate}
      data-status={ready ? 'passed' : 'blocked'}
      aria-label="Atlas Dev readiness"
    >
      <header className={styles.panelHeader}>
        <span className={styles.panelTitle}>Readiness operacional</span>
        {readiness ? (
          <span>
            {readiness.status} · {readiness.summary.passed} ok · {readiness.summary.failed} bloqueios
          </span>
        ) : (
          <span>{loading ? 'verificando…' : 'não verificado'}</span>
        )}
      </header>

      {error ? (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      ) : readiness ? (
        <>
          <p>
            {ready
              ? 'Runtime pronto para executar este plano no Desktop.'
              : 'Run fica bloqueado até o runtime Atlas Dev passar no readiness estrito.'}
          </p>
          {visibleChecks.length > 0 ? (
            <ul className={styles.readinessList}>
              {visibleChecks.map((check) => (
                <li key={check.id} data-tone={checkTone(check)}>
                  <strong>{check.id}</strong>
                  <span>{check.message}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className={styles.empty}>
          Verificando flags, token, provider, storage e worker antes de liberar o Run.
        </p>
      )}

      <button
        type="button"
        className={styles.secondaryButton}
        disabled={loading}
        onClick={() => void refresh()}
      >
        {loading ? 'verificando…' : 'verificar readiness'}
      </button>
    </section>
  )
}
