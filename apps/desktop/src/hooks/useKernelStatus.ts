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
 * Quando o status muda pra `ready`, dispara `onReady` (a UI faz refetch
 * de tudo via useBridge.refresh).
 */
import { useEffect, useState } from 'react'
import { bridge } from '../lib/bridge'

export type KernelStatus = 'booting' | 'ready' | 'failed' | 'unconfigured'

export interface KernelStatusReport {
  status: KernelStatus
  message: string
  serverPath: string | null
  url: string
  queueRunning: boolean
}

const HTTP_READY_REPORT: KernelStatusReport = {
  status: 'ready',
  message: 'Atlas Server configured via HTTP env',
  serverPath: null,
  url: (import.meta.env.VITE_ATLAS_SERVER_URL as string | undefined) ?? '',
  queueRunning: false,
}

const OFFLINE_REPORT: KernelStatusReport = {
  status: 'unconfigured',
  message: 'Bridge offline · sem Atlas Server alcançável',
  serverPath: null,
  url: '',
  queueRunning: false,
}

interface UseKernelStatusOpts {
  onReady?: () => void
}

export function useKernelStatus(opts: UseKernelStatusOpts = {}): KernelStatusReport {
  const onReady = opts.onReady
  const [report, setReport] = useState<KernelStatusReport>(() => {
    if (bridge.mode === 'http') return HTTP_READY_REPORT
    if (bridge.mode === 'offline') return OFFLINE_REPORT
    return {
      status: 'booting',
      message: 'iniciando Atlas Server…',
      serverPath: null,
      url: '',
      queueRunning: false,
    }
  })

  useEffect(() => {
    if (bridge.mode !== 'tauri') return

    let cancelled = false
    let pollHandle: ReturnType<typeof setInterval> | null = null
    let listenUnsub: (() => void) | null = null
    let reachedReady = false

    function announce(next: KernelStatusReport) {
      if (cancelled) return
      setReport(next)
      if (!reachedReady && next.status === 'ready') {
        reachedReady = true
        onReady?.()
      }
    }

    void (async () => {
      // Subscribe pra evento push do Tauri (chega assim que ready)
      try {
        const eventApi = await import('@tauri-apps/api/event')
        const off = await eventApi.listen<KernelStatusReport>('kernel://ready', (e) => {
          announce(e.payload)
        })
        listenUnsub = off
      } catch {
        /* no-op */
      }

      // Polling fallback (e captura o estado initial booting)
      const tick = async () => {
        try {
          const tauri = await import('@tauri-apps/api/core')
          const next = await tauri.invoke<KernelStatusReport>('atlas_kernel_status')
          announce(next)
          if (next.status === 'ready' || next.status === 'failed' || next.status === 'unconfigured') {
            if (pollHandle) {
              clearInterval(pollHandle)
              pollHandle = null
            }
          }
        } catch {
          /* keep polling — kernel manager not yet registered */
        }
      }

      void tick()
      pollHandle = setInterval(tick, 600)
    })()

    return () => {
      cancelled = true
      if (pollHandle) clearInterval(pollHandle)
      if (listenUnsub) listenUnsub()
    }
  }, [onReady])

  return report
}
