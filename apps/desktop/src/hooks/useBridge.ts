/**
 * useBridge · loads cockpit data + exposes interactive actions.
 *
 * V2 (production-readiness ADR-0002):
 *   - listObras hits /atlas-code/works (normalised list)
 *   - selectObra hits /atlas-code/works/{id}/state (snapshot includes
 *     sessions, sdd, receipt, gates, evidence in one call)
 *   - sendIntent uses bridge.sendIntent → polls /atlas-code/threads/{id}
 *
 * CANON · Atlas Code usa somente dados reais ou estados vazios explícitos.
 *   Bridge failures NEVER fall back to invented data. They fall back to:
 *   - empty array (sessions, messages, gates, evidence)
 *   - null (obra, receipt) → components render "—" / "aguardando Kernel"
 *   - error string captured in `errors[]`
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { bridge, type BridgeMode } from '../lib/bridge'
import type {
  CoreStatus,
  DecisionReceipt,
  Message,
  Obra,
  QualityGate,
  SddStage,
  Session,
  WorkStateSnapshot,
} from '@atlas/domain'
import { browserCoreStatus, idlePipeline, noGates, noMessages, noSessions } from '../data/empty'

export interface BridgeSnapshot {
  mode: BridgeMode
  loading: boolean
  /** Errors captured during boot/actions (latest first). Visible in UI. */
  errors: string[]
  obra: Obra | null
  obras: Obra[]
  active: Session[]
  recent: Session[]
  messages: Message[]
  receipt: DecisionReceipt | null
  gates: QualityGate[]
  sdd: SddStage[]
  evidence: WorkStateSnapshot['evidence']
  core: CoreStatus
  /** True while a write action (createObra, sendIntent, etc.) is in flight. */
  busy: boolean
  /** Active threadId (from snapshot) so the composer/streamer knows where to send. */
  activeThreadId: string | null
}

export interface BridgeActions {
  refresh: () => Promise<void>
  selectObra: (obraId: string) => Promise<void>
  createObra: (intent: string, objective: string) => Promise<Obra | null>
  sendIntent: (text: string) => Promise<void>
  runGate: (gateId: string) => Promise<void>
  signReceipt: () => Promise<void>
  applyDiff: (patchId: string) => Promise<void>
}

const INITIAL: BridgeSnapshot = {
  mode: bridge.mode,
  loading: true,
  errors: [],
  obra: null,
  obras: [],
  active: noSessions,
  recent: noSessions,
  messages: noMessages,
  receipt: null,
  gates: noGates,
  sdd: idlePipeline,
  evidence: [],
  core: browserCoreStatus,
  busy: false,
  activeThreadId: null,
}

export function useBridge(): BridgeSnapshot & BridgeActions {
  const [snap, setSnap] = useState<BridgeSnapshot>(INITIAL)
  const cancelRef = useRef(false)
  const errorBufRef = useRef<string[]>([])

  const pushError = useCallback((label: string, e: unknown) => {
    const msg = `${label} · ${e instanceof Error ? e.message : String(e)}`
    errorBufRef.current = [msg, ...errorBufRef.current].slice(0, 10)
    setSnap((s) => ({ ...s, errors: [...errorBufRef.current] }))
  }, [])

  const loadObrasAndCore = useCallback(async (): Promise<{ core: CoreStatus; obras: Obra[]; gates: QualityGate[] }> => {
    const [core, obrasRaw] = await Promise.all([
      bridge.coreStatus().catch((e: unknown) => {
        pushError('coreStatus', e)
        return browserCoreStatus
      }),
      bridge.listObras().catch((e: unknown) => {
        pushError('listObras', e)
        return [] as Obra[]
      }),
    ])
    return { core, obras: obrasRaw, gates: noGates }
  }, [pushError])

  const loadObraDetail = useCallback(
    async (obra: Obra): Promise<Partial<BridgeSnapshot>> => {
      const state = await bridge.getWorkState(obra.id).catch((e: unknown) => {
        pushError('getWorkState', e)
        return null
      })
      if (!state) {
        return {
          active: noSessions,
          messages: noMessages,
          sdd: idlePipeline,
          evidence: [],
          receipt: null,
          activeThreadId: null,
        }
      }
      const sessions: Session[] = state.sessions.map((s) => ({
        id: s.id,
        obraId: obra.id,
        threadId: s.id,
        title: s.title,
        status: s.status,
        turns: s.turns,
        durationMs: 0,
        origin: 'manual',
      }))
      return {
        active: sessions,
        messages: state.messages,
        sdd: state.sdd.steps.length > 0 ? state.sdd.steps : idlePipeline,
        gates: state.gates.length > 0 ? state.gates : snap.gates,
        evidence: state.evidence,
        receipt: state.receipt,
        activeThreadId: state.activeThreadId,
      }
    },
    [pushError, snap.gates]
  )

  const refresh = useCallback(async () => {
    setSnap((s) => ({ ...s, loading: true, busy: true }))
    const { core, obras, gates } = await loadObrasAndCore()
    const obra = obras[0] ?? null
    const detail = obra
      ? await loadObraDetail(obra)
      : {}
    if (cancelRef.current) return
    setSnap((s) => ({
      ...s,
      mode: bridge.mode,
      loading: false,
      busy: false,
      errors: [...errorBufRef.current],
      core,
      obras,
      obra,
      gates,
      ...detail,
    }))
  }, [loadObrasAndCore, loadObraDetail])

  const selectObra = useCallback(
    async (obraId: string) => {
      const fromState = snap.obras.find((o) => o.id === obraId)
      let resolved: Obra | null = fromState ?? null
      if (!resolved) {
        try {
          const fresh = await bridge.listObras()
          resolved = fresh.find((o) => o.id === obraId) ?? null
        } catch (e) {
          pushError('selectObra', e)
        }
      }
      if (!resolved) return
      setSnap((s) => ({ ...s, busy: true }))
      const detail = await loadObraDetail(resolved)
      if (cancelRef.current) return
      setSnap((s) => ({
        ...s,
        busy: false,
        obra: resolved,
        ...detail,
        errors: [...errorBufRef.current],
      }))
    },
    [snap.obras, loadObraDetail, pushError]
  )

  const createObra = useCallback(
    async (intent: string, objective: string): Promise<Obra | null> => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const created = await bridge.createObra(intent, objective)
        if (!created?.id) {
          pushError('createObra', new Error('server returned no obra'))
          setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
          return null
        }
        const detail = await loadObraDetail(created)
        if (cancelRef.current) return created
        setSnap((s) => ({
          ...s,
          busy: false,
          obra: created,
          obras: [created, ...s.obras.filter((o) => o.id !== created.id)],
          ...detail,
          errors: [...errorBufRef.current],
        }))
        return created
      } catch (e) {
        pushError('createObra', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        return null
      }
    },
    [loadObraDetail, pushError]
  )

  const sendIntent = useCallback(
    async (text: string) => {
      const threadId = snap.activeThreadId ?? snap.active[0]?.threadId ?? null
      const obraId = snap.obra?.id
      setSnap((s) => ({ ...s, busy: true }))

      const optimisticId = `local-${Date.now()}`
      const optimistic: Message = {
        id: optimisticId,
        role: 'user',
        body: text,
        ts: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }
      setSnap((s) => ({ ...s, messages: [...s.messages, optimistic] }))

      try {
        const res = await bridge.sendIntent(threadId, text, 'text', obraId)
        const newThreadId = res.threadId
        if (!newThreadId) {
          setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
          return
        }

        // Try SSE first; if no events arrive in 2s, fall back to polling /atlas-code/threads/{id}.
        let sseClosed = false
        let assistantSeen = false
        const unsubscribe = bridge.streamSession(res.traceId, (event) => {
          if (sseClosed) return
          if (event.eventType === 'message' || event.eventType === 'assistant_message') {
            assistantSeen = true
            void (async () => {
              try {
                const fresh = await bridge.getSession(newThreadId)
                if (!cancelRef.current && fresh.length > 0) {
                  setSnap((s) => ({ ...s, messages: fresh }))
                }
              } catch { /* ignore */ }
            })()
          }
        })

        // Polling fallback
        for (let attempt = 0; attempt < 20; attempt++) {
          await new Promise((r) => setTimeout(r, 1500))
          if (cancelRef.current) {
            unsubscribe()
            return
          }
          try {
            const fresh = await bridge.getSession(newThreadId)
            if (fresh.length > 0) {
              setSnap((s) => ({ ...s, messages: fresh }))
              if (fresh.some((m) => m.role === 'atlas' || m.role === 'system')) {
                assistantSeen = true
                break
              }
            }
          } catch {
            /* keep polling */
          }
          if (assistantSeen) break
        }
        sseClosed = true
        unsubscribe()

        if (obraId && snap.obra) {
          // Refresh snapshot so SDD pipeline + sessions reflect new turn.
          const detail = await loadObraDetail(snap.obra)
          if (!cancelRef.current) {
            setSnap((s) => ({ ...s, ...detail, busy: false, errors: [...errorBufRef.current] }))
          }
        } else if (!cancelRef.current) {
          setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
        }
      } catch (e) {
        pushError('sendIntent', e)
        setSnap((s) => ({
          ...s,
          busy: false,
          messages: s.messages.filter((m) => m.id !== optimisticId),
          errors: [...errorBufRef.current],
        }))
      }
    },
    [snap.obra, snap.active, snap.activeThreadId, loadObraDetail, pushError]
  )

  const runGate = useCallback(
    async (gateId: string) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        await bridge.runGate(gateId)
        await refresh()
      } catch (e) {
        pushError('runGate', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [refresh, pushError]
  )

  const signReceipt = useCallback(async () => {
    if (!snap.receipt?.id) return
    setSnap((s) => ({ ...s, busy: true }))
    try {
      const ack = await bridge.signAndSubmit(snap.receipt.id)
      if (!ack.signatureValid) throw new Error('server rejected signature')
      // Refresh receipt to reflect signed state
      const refreshed = await bridge.getReceipt(snap.receipt.id)
      if (!cancelRef.current) {
        setSnap((s) => ({ ...s, busy: false, receipt: refreshed ?? s.receipt, errors: [...errorBufRef.current] }))
      }
    } catch (e) {
      pushError('signReceipt', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.receipt, pushError])

  const applyDiff = useCallback(
    async (patchId: string) => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        await bridge.applyDiff(patchId, ['contract', 'tests', 'security_scan'])
        await refresh()
      } catch (e) {
        pushError('applyDiff', e)
        setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
      }
    },
    [refresh, pushError]
  )

  useEffect(() => {
    cancelRef.current = false
    void refresh()
    return () => {
      cancelRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    ...snap,
    refresh,
    selectObra,
    createObra,
    sendIntent,
    runGate,
    signReceipt,
    applyDiff,
  }
}
