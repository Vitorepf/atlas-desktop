import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAtlasDevRunIndex } from './api'
import type { AtlasDevRunError, AtlasDevRunIndexEntry, PlanOnlyResult } from './types'
import styles from './atlasDev.module.css'

interface AtlasDevRunHistoryPanelProps {
  plan: PlanOnlyResult | null
  onOpenRun: (runId: string) => Promise<void>
  refreshKey?: string | null
}

export function AtlasDevRunHistoryPanel({ plan, onOpenRun, refreshKey = null }: AtlasDevRunHistoryPanelProps) {
  const workspaceHash = plan?.workspace_hash ?? null
  const threadId = plan?.thread_id ?? null
  const [items, setItems] = useState<AtlasDevRunIndexEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [openingRunId, setOpeningRunId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canLoad = Boolean(workspaceHash || threadId)
  const filterLabel = useMemo(() => {
    if (workspaceHash && threadId) return 'workspace + thread'
    if (workspaceHash) return 'workspace'
    if (threadId) return 'thread'
    return 'sem filtro'
  }, [threadId, workspaceHash])

  const refresh = useCallback(async (): Promise<void> => {
    if (!canLoad) {
      setItems([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetchAtlasDevRunIndex({
        workspace_hash: workspaceHash,
        thread_id: threadId,
        limit: 6,
      })
      setItems(response.items)
    } catch (cause) {
      const err = cause as AtlasDevRunError
      setError(err.message || 'falha ao carregar runs recentes')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [canLoad, threadId, workspaceHash])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh, refreshKey])

  const openRun = useCallback(
    async (runId: string): Promise<void> => {
      setOpeningRunId(runId)
      setError(null)
      try {
        await onOpenRun(runId)
      } catch (cause) {
        const err = cause as AtlasDevRunError
        setError(err.message || 'falha ao reabrir run')
      } finally {
        setOpeningRunId(null)
      }
    },
    [onOpenRun],
  )

  return (
    <section className={styles.panel} aria-label="Runs recentes do Atlas Dev">
      <header className={styles.panelHeader}>
        <span className={styles.panelTitle}>Runs recentes</span>
        <span>{filterLabel}</span>
      </header>

      {!canLoad ? (
        <p className={styles.empty}>
          Histórico disponível quando o Plan trouxer workspace_hash ou thread_id.
        </p>
      ) : error ? (
        <p className={styles.errorBanner}>{error}</p>
      ) : items.length === 0 && !loading ? (
        <p className={styles.empty}>Nenhum run anterior para este contexto.</p>
      ) : (
        <ul className={styles.historyList}>
          {items.map((item) => (
            <li key={item.run_id} className={styles.historyItem}>
              <div className={styles.historyMain}>
                <strong>{shortRunId(item.run_id)}</strong>
                <span>{item.task_kind} / {item.risk_level}</span>
                <span>{item.routing_decision}</span>
              </div>
              <div className={styles.historyMeta}>
                <span>{item.completion_state ?? 'sem receipt'}</span>
                <span>{formatTimestamp(item.updated_at ?? item.created_at)}</span>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={openingRunId === item.run_id}
                onClick={() => void openRun(item.run_id)}
              >
                {openingRunId === item.run_id ? 'abrindo' : 'reabrir'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {canLoad ? (
        <div className={styles.historyActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={loading}
            onClick={() => void refresh()}
          >
            {loading ? 'atualizando' : 'atualizar'}
          </button>
        </div>
      ) : null}
    </section>
  )
}

function shortRunId(runId: string): string {
  if (runId.length <= 18) return runId
  return `${runId.slice(0, 10)}...${runId.slice(-6)}`
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '-'
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return value
  return new Intl.DateTimeFormat(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(parsed))
}
