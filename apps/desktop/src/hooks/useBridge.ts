/**
 * useBridge · loads cockpit data + exposes interactive actions.
 *
 * CANON · feedback_atlas_no_mock.md
 *   Bridge failures NEVER fall back to invented data. They fall back to:
 *   - empty array (sessions, messages, gates, evidence)
 *   - null (obra, receipt) → components render "—" / "aguardando Kernel"
 *   - error string captured in `errors[]`
 *
 * Actions trigger refetch of the relevant slice so the UI reflects the new
 * Kernel state.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { bridge, type BridgeMode } from '../lib/bridge'
import type {
  CoreStatus,
  DecisionReceipt,
  Message,
  Obra,
  QualityGate,
  Session,
} from '@atlas/domain'
import { browserCoreStatus, noGates, noMessages, noSessions } from '../data/mock'

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
  core: CoreStatus
  /** True while a write action (createObra, sendIntent, etc.) is in flight. */
  busy: boolean
}

export interface BridgeActions {
  /** Refresh everything (used after large state changes). */
  refresh: () => Promise<void>
  /** Switch active obra (refetches sessions/messages). */
  selectObra: (obraId: string) => Promise<void>
  /** Create a new obra and select it. */
  createObra: (intent: string, objective: string) => Promise<Obra | null>
  /** Send a user message (creates new thread if no obra session yet). */
  sendIntent: (text: string) => Promise<void>
  /** Run a single quality gate by id. */
  runGate: (gateId: string) => Promise<void>
  /** Sign the current receipt (placeholder ed25519 stub). */
  signReceipt: () => Promise<void>
  /** Apply a diff patch (id from streamed event). */
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
  core: browserCoreStatus,
  busy: false,
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
    const [core, obrasRaw, gates] = await Promise.all([
      bridge.coreStatus().catch((e: unknown) => {
        pushError('coreStatus', e)
        return browserCoreStatus
      }),
      bridge.listObras().catch((e: unknown) => {
        pushError('listObras', e)
        return [] as Obra[]
      }),
      bridge.listGates().catch((e: unknown) => {
        pushError('listGates', e)
        return noGates
      }),
    ])
    const obras = normaliseObras(obrasRaw)
    return { core, obras, gates }
  }, [pushError])

  const loadObraDetail = useCallback(
    async (obra: Obra): Promise<{ active: Session[]; recent: Session[]; messages: Message[] }> => {
      const [activeRaw, recentRaw] = await Promise.all([
        bridge.listSessions(obra.id).catch((e: unknown) => {
          pushError('listSessions', e)
          return noSessions
        }),
        bridge.listRecentSessions().catch((e: unknown) => {
          pushError('listRecentSessions', e)
          return noSessions
        }),
      ])
      const active = normaliseSessions(activeRaw)
      const recent = normaliseSessions(recentRaw)
      const firstThread = active[0]?.threadId
      const messages = firstThread
        ? await bridge.getSession(firstThread).catch((e: unknown) => {
            pushError('getSession', e)
            return noMessages
          })
        : noMessages
      return { active, recent, messages }
    },
    [pushError]
  )

  const refresh = useCallback(async () => {
    setSnap((s) => ({ ...s, loading: true, busy: true }))
    const { core, obras, gates } = await loadObrasAndCore()
    const obra = obras[0] ?? null
    const detail = obra
      ? await loadObraDetail(obra)
      : { active: [] as Session[], recent: [] as Session[], messages: [] as Message[] }
    if (cancelRef.current) return
    setSnap({
      mode: bridge.mode,
      loading: false,
      busy: false,
      errors: [...errorBufRef.current],
      core,
      obras,
      obra,
      gates,
      ...detail,
      receipt: null,
    })
  }, [loadObrasAndCore, loadObraDetail])

  const selectObra = useCallback(
    async (obraId: string) => {
      const fromState = snap.obras.find((o) => o.id === obraId)
      let resolved: Obra | null = fromState ?? null
      if (!resolved) {
        try {
          const fresh = normaliseObras(await bridge.listObras())
          resolved = fresh.find((o) => o.id === obraId) ?? null
        } catch (e) {
          pushError('selectObra', e)
        }
      }
      if (!resolved) return
      setSnap((s) => ({ ...s, busy: true }))
      const detail = await loadObraDetail(resolved)
      if (cancelRef.current) return
      setSnap((s) => ({ ...s, busy: false, obra: resolved, ...detail, errors: [...errorBufRef.current] }))
    },
    [snap.obras, loadObraDetail, pushError]
  )

  const createObra = useCallback(
    async (intent: string, objective: string): Promise<Obra | null> => {
      setSnap((s) => ({ ...s, busy: true }))
      try {
        const created = await bridge.createObra(intent, objective)
        const obra = normaliseObras([created])[0] ?? null
        if (!obra) {
          pushError('createObra', new Error('server returned no obra'))
          setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
          return null
        }
        const detail = await loadObraDetail(obra)
        if (cancelRef.current) return obra
        setSnap((s) => ({
          ...s,
          busy: false,
          obra,
          obras: [obra, ...s.obras.filter((o) => o.id !== obra.id)],
          ...detail,
          errors: [...errorBufRef.current],
        }))
        return obra
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
      const threadId = snap.active[0]?.threadId ?? null
      const obraId = snap.obra?.id
      setSnap((s) => ({ ...s, busy: true }))
      // Optimistic user message (rendered immediately while Kernel processes).
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

        // Poll until the assistant replies or we time out (~30s · 15 × 2s).
        for (let attempt = 0; attempt < 15; attempt++) {
          await new Promise((r) => setTimeout(r, 2000))
          if (cancelRef.current) return
          try {
            const fresh = await bridge.getSession(newThreadId)
            if (fresh.length > 0) {
              setSnap((s) => ({ ...s, messages: fresh }))
              if (fresh.some((m) => m.role === 'atlas' || m.role === 'system')) break
            }
          } catch {
            /* keep polling */
          }
        }

        // Sidebar sync — inject the thread if AtlasCodeSessionController didn't
        // find it (atlas-server doesn't always link ai_threads → atlas_projects).
        if (obraId) {
          try {
            const sessRaw = await bridge.listSessions(obraId)
            const sessions = normaliseSessions(sessRaw)
            if (sessions.length === 0) {
              sessions.push({
                id: newThreadId,
                obraId,
                threadId: newThreadId,
                title: 'thread atual',
                status: 'running',
                turns: 0,
                durationMs: 0,
                origin: 'manual',
              })
            }
            if (!cancelRef.current) {
              setSnap((s) => ({ ...s, active: sessions }))
            }
          } catch {
            /* sidebar best-effort */
          }
        }

        if (!cancelRef.current) {
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
    [snap.obra, snap.active, pushError]
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
      // MVP: send a placeholder ed25519 payload. atlas-receipts crate (Rust)
      // generates real signatures when atlas-tauri is wired.
      const stubSig = btoa(String.fromCharCode(...new Uint8Array(64))).replace(/=+$/, '')
      const stubPub = btoa(String.fromCharCode(...new Uint8Array(32))).replace(/=+$/, '')
      await bridge.signReceipt(snap.receipt.id, {
        signature: stubSig,
        publicKey: stubPub,
        signedAt: new Date().toISOString(),
        signerId: 'atlas-desktop-mvp',
      })
      await refresh()
    } catch (e) {
      pushError('signReceipt', e)
      setSnap((s) => ({ ...s, busy: false, errors: [...errorBufRef.current] }))
    }
  }, [snap.receipt, refresh, pushError])

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

// ──────────────────────────────────────────────────────────────────────────
// Shape normalisers — strip ambiguous payloads to camelCase domain shape.

function normaliseObras(raw: unknown): Obra[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { projects?: unknown[] })?.projects)
      ? (raw as { projects: unknown[] }).projects
      : Array.isArray((raw as { project?: unknown })?.project)
        ? [(raw as { project: unknown }).project]
        : (raw as { project?: unknown })?.project
          ? [(raw as { project: unknown }).project]
          : []

  const obras: Obra[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id = (o.id ?? o.uuid) as string | undefined
    if (!id) continue
    obras.push({
      id,
      title: (o.title ?? o.name ?? id) as string,
      objective: (o.objective ?? o.description ?? o.goal ?? o.title ?? '') as string,
      status: ((o.status as Obra['status']) ?? 'active'),
      workspacePath: (o.workspace_path ?? o.workspacePath ?? '') as string,
      createdAt: (o.created_at ?? o.createdAt ?? '') as string,
    })
  }
  return obras
}

function normaliseSessions(raw: unknown): Session[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown[] })?.data)
      ? (raw as { data: unknown[] }).data
      : []

  const sessions: Session[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const s = item as Record<string, unknown>
    const id = (s.id ?? s.threadId ?? s.thread_id) as string | undefined
    if (!id) continue
    sessions.push({
      id,
      obraId: (s.obraId ?? s.obra_id ?? '') as string,
      threadId: (s.threadId ?? s.thread_id ?? id) as string,
      title: (s.title ?? '') as string,
      status: ((s.status as Session['status']) ?? 'paused'),
      turns: typeof s.turns === 'number' ? s.turns : 0,
      durationMs: typeof s.durationMs === 'number'
        ? s.durationMs
        : typeof s.duration_ms === 'number'
          ? s.duration_ms
          : 0,
      origin: ((s.origin as Session['origin']) ?? 'manual'),
      snapshot: undefined,
    })
  }
  return sessions
}
