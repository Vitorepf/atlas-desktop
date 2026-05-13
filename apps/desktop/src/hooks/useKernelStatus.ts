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
 * IMPORTANTE: o useEffect roda APENAS uma vez (deps vazias). O callback
 * `onReady` é capturado por ref pra que mudanças de identidade no callback
 * (ex: closure que muda quando state da App.tsx muda) NÃO recriem o
 * polling — o que causaria loop infinito de refresh.
 */
import { useEffect, useRef, useState } from 'react'
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
  // Capture onReady em ref · estável entre renders. O useEffect abaixo NÃO
  // depende de onReady, então o polling não é recriado a cada render do App.
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
      serverPath: null,
      url: '',
      queueRunning: false,
    }
  })

  useEffect(() => {
    // For http mode the initial report is already 'ready'; ainda fire onReady
    // uma vez pra triggerar o refresh do useBridge.
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
      // Comparação rasa pra não disparar setState (que causaria re-render do
      // App + qualquer subscriber) quando o report é igual ao último.
      setReport((prev) => (sameReport(prev, next) ? prev : next))
      if (!reachedReady && next.status === 'ready') {
        reachedReady = true
        onReadyRef.current?.()
        // Uma vez que ficou ready, podemos parar o polling. O backend
        // continua emitindo via evento `kernel://ready` se quisermos
        // re-disparar (não é o caso hoje).
        stopPolling()
      }
      if (
        next.status === 'failed' ||
        next.status === 'unconfigured'
      ) {
        stopPolling()
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
        } catch {
          /* keep polling — kernel manager not yet registered */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return report
}

function sameReport(a: KernelStatusReport, b: KernelStatusReport): boolean {
  return (
    a.status === b.status &&
    a.message === b.message &&
    a.serverPath === b.serverPath &&
    a.url === b.url &&
    a.queueRunning === b.queueRunning
  )
}
