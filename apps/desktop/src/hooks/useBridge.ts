/**
 * useBridge · centralised hook that loads everything the cockpit needs from
 * the bridge once and exposes the dispatch mode so the UI can show a badge.
 *
 * No business logic here — fetch, error-tolerate, hand to components.
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
import {
  coreStatus as fallbackCore,
  gates as fallbackGates,
  messages as fallbackMessages,
  obra as fallbackObra,
  recentSessions as fallbackRecent,
  receipt as fallbackReceipt,
  sessions as fallbackSessions,
} from '../data/mock'

export interface BridgeSnapshot {
  mode: BridgeMode
  loading: boolean
  obra: Obra
  active: Session[]
  recent: Session[]
  messages: Message[]
  receipt: DecisionReceipt
  gates: QualityGate[]
  core: CoreStatus
}

export function useBridge(): BridgeSnapshot {
  const [snapshot, setSnapshot] = useState<BridgeSnapshot>({
    mode: bridge.mode,
    loading: true,
    obra: fallbackObra,
    active: fallbackSessions,
    recent: fallbackRecent,
    messages: fallbackMessages,
    receipt: fallbackReceipt,
    gates: fallbackGates,
    core: fallbackCore,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [core, obras, gates, receipt] = await Promise.all([
          bridge.coreStatus().catch(() => fallbackCore),
          bridge.listObras().catch(() => [fallbackObra]),
          bridge.listGates().catch(() => fallbackGates),
          bridge.getReceipt(fallbackReceipt.id).catch(() => fallbackReceipt),
        ])

        const obra = obras[0] ?? fallbackObra

        const [active, recent] = await Promise.all([
          bridge.listSessions(obra.id).catch(() => fallbackSessions),
          bridge.listRecentSessions().catch(() => fallbackRecent),
        ])

        const firstThread = active[0]?.threadId
        const messages = firstThread
          ? await bridge.getSession(firstThread).catch(() => fallbackMessages)
          : fallbackMessages

        if (cancelled) return
        setSnapshot({
          mode: bridge.mode,
          loading: false,
          obra,
          active,
          recent,
          messages,
          receipt,
          gates,
          core,
        })
      } catch {
        if (!cancelled) setSnapshot((s) => ({ ...s, loading: false }))
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return snapshot
}
