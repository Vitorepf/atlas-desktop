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
          bridge
            .listObras()
            .then((list) => normaliseObras(list))
            .catch(() => [fallbackObra]),
          bridge
            .listGates()
            .then((list) => (Array.isArray(list) && list.length > 0 ? list : fallbackGates))
            .catch(() => fallbackGates),
          bridge
            .getReceipt(fallbackReceipt.id)
            .then((r) => normaliseReceipt(r) ?? fallbackReceipt)
            .catch(() => fallbackReceipt),
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

// ──────────────────────────────────────────────────────────────────────────
// Shape normalisers — Atlas Server is rich; the cockpit only needs the
// camelCase MVP shape. These tolerate snake_case (legacy resources) and
// fall back to defaults when fields are missing.

function normaliseObras(raw: unknown): Obra[] {
  // atlas-server returns { projects: [...] } — listObras() pulls the array
  // already, but if a wrapper object slips through, unwrap.
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
      objective: (o.objective ?? o.description ?? o.goal ?? o.title ?? '') as string,
      status: (o.status as Obra['status']) ?? 'active',
      workspacePath: (o.workspace_path ?? o.workspacePath ?? '~/develop/Atlas') as string,
      createdAt: (o.created_at ?? o.createdAt ?? new Date().toISOString()) as string,
    })
  }
  return obras.length > 0 ? obras : [fallbackObra]
}

function normaliseReceipt(raw: unknown): DecisionReceipt | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  // Reject shapes that don't carry the camelCase wrap (passo-3.5)
  if (typeof r.confidence !== 'string' && typeof r.confidence_score !== 'number') {
    return null
  }
  return {
    id: (r.id as string) ?? '',
    obraId: (r.obraId ?? r.obra_id ?? '') as string,
    primary: (r.primary ?? r.selected_provider ?? '') as string,
    confidence: ((r.confidence as DecisionReceipt['confidence']) ?? 'med'),
    confidenceScore: typeof r.confidenceScore === 'number'
      ? r.confidenceScore
      : typeof r.confidence_score === 'number'
        ? r.confidence_score
        : 0,
    budgetEstUsd: typeof r.budgetEstUsd === 'number' ? r.budgetEstUsd : 0,
    budgetUsedUsd: typeof r.budgetUsedUsd === 'number' ? r.budgetUsedUsd : 0,
    fallbackChain: Array.isArray(r.fallbackChain) ? (r.fallbackChain as string[]) : [],
    signedBy: (r.signedBy ?? r.signed_by) as string | undefined,
    signature: (r.signature) as string | undefined,
    signedAt: (r.signedAt ?? r.signed_at) as string | undefined,
  }
}
