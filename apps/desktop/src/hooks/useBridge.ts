/**
 * useBridge · loads everything the cockpit needs from the bridge in one shot.
 *
 * CANON · feedback_atlas_no_mock.md:
 *   Bridge failures NEVER fall back to invented data. They fall back to:
 *   - empty array (sessions, messages, gates, evidence)
 *   - null (obra, receipt) → components render "—" / "aguardando Kernel"
 *   - error string captured in `errors[]` (so the UI can flag what's offline)
 *
 * This is the only place that talks to the bridge during boot. After boot,
 * components subscribe to live updates via specific bridge methods (stream,
 * sendIntent, signReceipt, etc.).
 */
import { useEffect, useState } from 'react'
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
  /** Errors captured during boot. Visible in the UI as a status row. */
  errors: string[]
  /** Active obra. `null` when the cockpit has no obra yet. */
  obra: Obra | null
  active: Session[]
  recent: Session[]
  messages: Message[]
  /** Receipt for the active obra. `null` when nothing has produced one. */
  receipt: DecisionReceipt | null
  gates: QualityGate[]
  core: CoreStatus
}

const INITIAL: BridgeSnapshot = {
  mode: bridge.mode,
  loading: true,
  errors: [],
  obra: null,
  active: noSessions,
  recent: noSessions,
  messages: noMessages,
  receipt: null,
  gates: noGates,
  core: browserCoreStatus,
}

export function useBridge(): BridgeSnapshot {
  const [snapshot, setSnapshot] = useState<BridgeSnapshot>(INITIAL)

  useEffect(() => {
    let cancelled = false
    const errors: string[] = []

    async function load() {
      const core = await bridge
        .coreStatus()
        .catch((e: unknown) => {
          errors.push(`coreStatus · ${describe(e)}`)
          return browserCoreStatus
        })

      const obrasRaw = await bridge
        .listObras()
        .catch((e: unknown) => {
          errors.push(`listObras · ${describe(e)}`)
          return []
        })
      const obras = normaliseObras(obrasRaw)
      const obra: Obra | null = obras[0] ?? null

      const gates = await bridge.listGates().catch((e: unknown) => {
        errors.push(`listGates · ${describe(e)}`)
        return noGates
      })

      let active: Session[] = []
      let recent: Session[] = []
      let messages: Message[] = []
      let receipt: DecisionReceipt | null = null

      if (obra) {
        const [activeRes, recentRes] = await Promise.all([
          bridge.listSessions(obra.id).catch((e: unknown) => {
            errors.push(`listSessions · ${describe(e)}`)
            return noSessions
          }),
          bridge.listRecentSessions().catch((e: unknown) => {
            errors.push(`listRecentSessions · ${describe(e)}`)
            return noSessions
          }),
        ])
        active = normaliseSessions(activeRes)
        recent = normaliseSessions(recentRes)

        const firstThread = active[0]?.threadId
        if (firstThread) {
          messages = await bridge.getSession(firstThread).catch((e: unknown) => {
            errors.push(`getSession · ${describe(e)}`)
            return noMessages
          })
        }
      }

      if (cancelled) return
      setSnapshot({
        mode: bridge.mode,
        loading: false,
        errors,
        obra,
        active,
        recent,
        messages,
        receipt,
        gates,
        core,
      })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return snapshot
}

// ──────────────────────────────────────────────────────────────────────────
// Shape normalisers — strip ambiguous payloads to the camelCase domain shape.
// Reject items missing required fields; never invent values.

function describe(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

function normaliseObras(raw: unknown): Obra[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { projects?: unknown[] })?.projects)
      ? (raw as { projects: unknown[] }).projects
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
      objective: (o.objective ?? o.description ?? o.goal ?? '') as string,
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
