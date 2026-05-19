/**
 * useVoxGateV3 · isolated hook for the V3 promotion panel.
 *
 * Owns:
 *   - fetching gate status, metrics, rivals report
 *   - submitting a rivals case + refetching to reflect it
 *   - honest loading / unavailable / error states
 *
 * Deliberately separate from useVoxOverlay so the metrics panel can be
 * unmounted (collapsed) without re-rendering the main hook on every
 * report refresh, and so the network calls only fire when the operator
 * actually opens the panel.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  voxGateV3Get,
  voxMetricsGet,
  voxRivalsCaseCreate,
  voxRivalsReportGet,
  type VoxGateV3Response,
  type VoxMetricsResponse,
  type VoxRivalsCaseCreateRequest,
  type VoxRivalsCaseCreateResponse,
  type VoxRivalsReportResponse,
} from '../../lib/bridge'

export interface UseVoxGateV3Result {
  gate: VoxGateV3Response | null
  metrics: VoxMetricsResponse | null
  report: VoxRivalsReportResponse | null
  loading: boolean
  /** Surface-level error for the LAST attempted load. `null` when everything
   * resolved OR every endpoint cleanly reported `unavailable`. Loaders set
   * this only for `status='error'`, NOT for `unavailable` (which is normal
   * before Claude O ships the endpoints). */
  loadError: string | null
  loadAll: () => Promise<void>
  loadGate: () => Promise<void>
  loadMetrics: () => Promise<void>
  loadRivalsReport: () => Promise<void>
  submitRivalsCase: (req: VoxRivalsCaseCreateRequest) => Promise<VoxRivalsCaseCreateResponse>
  submitting: boolean
  lastSubmit: VoxRivalsCaseCreateResponse | null
}

export function useVoxGateV3(): UseVoxGateV3Result {
  const [gate, setGate] = useState<VoxGateV3Response | null>(null)
  const [metrics, setMetrics] = useState<VoxMetricsResponse | null>(null)
  const [report, setReport] = useState<VoxRivalsReportResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [lastSubmit, setLastSubmit] = useState<VoxRivalsCaseCreateResponse | null>(null)
  const mountedRef = useRef<boolean>(true)
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const trackError = useCallback(
    (
      ...responses: Array<{ status: 'ok' | 'unavailable' | 'error'; message: string | null }>
    ) => {
      const firstError = responses.find((r) => r.status === 'error')
      setLoadError(firstError?.message ?? null)
    },
    [],
  )

  const loadGate = useCallback(async () => {
    const r = await voxGateV3Get()
    if (!mountedRef.current) return
    setGate(r)
    if (r.status === 'error') setLoadError(r.message)
  }, [])

  const loadMetrics = useCallback(async () => {
    const r = await voxMetricsGet()
    if (!mountedRef.current) return
    setMetrics(r)
    if (r.status === 'error') setLoadError(r.message)
  }, [])

  const loadRivalsReport = useCallback(async () => {
    const r = await voxRivalsReportGet()
    if (!mountedRef.current) return
    setReport(r)
    if (r.status === 'error') setLoadError(r.message)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [g, m, rr] = await Promise.all([
        voxGateV3Get(),
        voxMetricsGet(),
        voxRivalsReportGet(),
      ])
      if (!mountedRef.current) return
      setGate(g)
      setMetrics(m)
      setReport(rr)
      trackError(g, m, rr)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [trackError])

  const submitRivalsCase = useCallback(
    async (req: VoxRivalsCaseCreateRequest): Promise<VoxRivalsCaseCreateResponse> => {
      setSubmitting(true)
      try {
        const response = await voxRivalsCaseCreate(req)
        if (mountedRef.current) setLastSubmit(response)
        if (response.status === 'ok' && mountedRef.current) {
          // refresh report + gate so the operator sees their case land in
          // the totals immediately. Metrics may take longer to flip; we
          // refresh them too — cheap and honest.
          await Promise.all([loadGate(), loadMetrics(), loadRivalsReport()])
        }
        return response
      } finally {
        if (mountedRef.current) setSubmitting(false)
      }
    },
    [loadGate, loadMetrics, loadRivalsReport],
  )

  return {
    gate,
    metrics,
    report,
    loading,
    loadError,
    loadAll,
    loadGate,
    loadMetrics,
    loadRivalsReport,
    submitRivalsCase,
    submitting,
    lastSubmit,
  }
}
