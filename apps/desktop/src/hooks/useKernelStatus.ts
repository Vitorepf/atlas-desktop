/**
 * useKernelStatus · listens to the Tauri kernel manager.
 *
 * Quando o .app abre, atlas-tauri spawn o atlas-server como sidecar
 * (`php artisan serve --port=8001` + `queue:work`). Esse hook:
 *
 * - Polla `atlas_kernel_status` a cada 600ms até reportar `ready` ou `failed`
 * - Subscreve o evento `kernel://ready` pra reagir instantaneamente
 * - Em modo HTTP (browser), assume "ready" pq o usuário sobe o server manual
 *
 * Quando o status muda pra `ready`, dispara `onReady` UMA SÓ VEZ.
 *
 * `retry()` re-roda o boot (Tauri command `atlas_kernel_retry`). Em modo
 * HTTP/offline a função é no-op (não há sidecar pra ressuscitar).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { bridge } from '../lib/bridge'

export type KernelStatus = 'booting' | 'ready' | 'failed' | 'unconfigured'

export interface KernelStatusReport {
  status: KernelStatus
  message: string
  failureCode: string | null
  repairHint: string | null
  serverPath: string | null
  phpPath: string | null
  url: string
  port: number
  queueRunning: boolean
  stdoutTail: string[]
  stderrTail: string[]
}

const HTTP_READY_REPORT: KernelStatusReport = {
  status: 'ready',
  message: 'Atlas Server configured via HTTP env',
  failureCode: null,
  repairHint: null,
  serverPath: null,
  phpPath: null,
  url: (import.meta.env.VITE_ATLAS_SERVER_URL as string | undefined) ?? '',
  port: 8001,
  queueRunning: false,
  stdoutTail: [],
  stderrTail: [],
}

const OFFLINE_REPORT: KernelStatusReport = {
  status: 'unconfigured',
  message: 'Bridge offline · sem Atlas Server alcançável',
  failureCode: 'no_bridge',
  repairHint: 'Set VITE_ATLAS_SERVER_URL or run inside the Atlas Code .app',
  serverPath: null,
  phpPath: null,
  url: '',
  port: 0,
  queueRunning: false,
  stdoutTail: [],
  stderrTail: [],
}

interface UseKernelStatusOpts {
  onReady?: () => void
}

export interface UseKernelStatusResult extends KernelStatusReport {
  retry: () => Promise<void>
  retrying: boolean
}

export function useKernelStatus(opts: UseKernelStatusOpts = {}): UseKernelStatusResult {
  const onReadyRef = useRef(opts.onReady)
  useEffect(() => {
    onReadyRef.current = opts.onReady
  }, [opts.onReady])

  const [report, setReport] = useState<KernelStatusReport>(() => {
    if (bridge.mode === 'http') return HTTP_READY_REPORT
    if (bridge.mode === 'offline') return OFFLINE_REPORT
    return {
      status: 'booting',
      message: 'iniciando Atlas Server…',
      failureCode: null,
      repairHint: null,
      serverPath: null,
      phpPath: null,
      url: '',
      port: 8001,
      queueRunning: false,
      stdoutTail: [],
      stderrTail: [],
    }
  })

  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (bridge.mode === 'http') {
      onReadyRef.current?.()
      return
    }
    if (bridge.mode !== 'tauri') return

    let cancelled = false
    let pollHandle: ReturnType<typeof setInterval> | null = null
    let listenUnsub: (() => void) | null = null
    let reachedReady = false

    const stopPolling = () => {
      if (pollHandle) {
        clearInterval(pollHandle)
        pollHandle = null
      }
    }

    function announce(next: KernelStatusReport) {
      if (cancelled) return
      setReport((prev) => (sameReport(prev, next) ? prev : next))
      if (!reachedReady && next.status === 'ready') {
        reachedReady = true
        onReadyRef.current?.()
        stopPolling()
      }
      if (next.status === 'failed' || next.status === 'unconfigured') {
        stopPolling()
      }
    }

    void (async () => {
      try {
        const eventApi = await import('@tauri-apps/api/event')
        const off = await eventApi.listen<KernelStatusReport>('kernel://ready', (e) => {
          announce(normalise(e.payload))
        })
        listenUnsub = off
      } catch {
        /* no-op */
      }

      const tick = async () => {
        try {
          const tauri = await import('@tauri-apps/api/core')
          const next = await tauri.invoke<KernelStatusReport>('atlas_kernel_status')
          announce(normalise(next))
        } catch {
          /* keep polling */
        }
      }

      void tick()
      pollHandle = setInterval(tick, 800)
    })()

    return () => {
      cancelled = true
      stopPolling()
      if (listenUnsub) listenUnsub()
    }
  }, [])

  const retry = useCallback(async () => {
    if (bridge.mode !== 'tauri') return
    setRetrying(true)
    try {
      const tauri = await import('@tauri-apps/api/core')
      const next = await tauri.invoke<KernelStatusReport>('atlas_kernel_retry')
      const normalised = normalise(next)
      setReport(normalised)
      if (normalised.status === 'ready') {
        onReadyRef.current?.()
      }
    } catch (e) {
      setReport((prev) => ({
        ...prev,
        status: 'failed',
        message: `retry failed · ${e instanceof Error ? e.message : String(e)}`,
        failureCode: 'retry_failed',
        repairHint: 'Check stderr_tail for the underlying error',
      }))
    } finally {
      setRetrying(false)
    }
  }, [])

  return { ...report, retry, retrying }
}

function sameReport(a: KernelStatusReport, b: KernelStatusReport): boolean {
  return (
    a.status === b.status &&
    a.message === b.message &&
    a.failureCode === b.failureCode &&
    a.repairHint === b.repairHint &&
    a.serverPath === b.serverPath &&
    a.phpPath === b.phpPath &&
    a.url === b.url &&
    a.port === b.port &&
    a.queueRunning === b.queueRunning &&
    sameStrArr(a.stdoutTail, b.stdoutTail) &&
    sameStrArr(a.stderrTail, b.stderrTail)
  )
}

function sameStrArr(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function normalise(raw: unknown): KernelStatusReport {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    status: (r.status as KernelStatus) ?? 'booting',
    message: String(r.message ?? ''),
    failureCode: (r.failureCode ?? r.failure_code ?? null) as string | null,
    repairHint: (r.repairHint ?? r.repair_hint ?? null) as string | null,
    serverPath: (r.serverPath ?? r.server_path ?? null) as string | null,
    phpPath: (r.phpPath ?? r.php_path ?? null) as string | null,
    url: String(r.url ?? ''),
    port: Number(r.port ?? 0),
    queueRunning: Boolean(r.queueRunning ?? r.queue_running ?? false),
    stdoutTail: Array.isArray(r.stdoutTail) ? (r.stdoutTail as string[])
      : Array.isArray(r.stdout_tail) ? (r.stdout_tail as string[]) : [],
    stderrTail: Array.isArray(r.stderrTail) ? (r.stderrTail as string[])
      : Array.isArray(r.stderr_tail) ? (r.stderr_tail as string[]) : [],
  }
}
