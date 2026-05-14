/**
 * executionStore · live state for the Atlas Code Cockpit.
 *
 * Receives StreamEventDto frames from `bridge.streamSession()` and maps the
 * 6 canonical checkpoints (Intent · Context · Plan · Provider · Verify ·
 * Evidence) to a small reactive snapshot consumed by `<LiveCockpitBanner />`.
 *
 * CANON · NO MOCK. If the backend has not yet emitted a checkpoint, its
 * status stays `'idle'`. The banner renders the canonical empty state — never
 * fabricated progress. `metadata.checkpoint` discriminates kind because
 * `ai_stream_events.event_type` is a CHECK constraint with 8 fixed values
 * (lifecycle/permission/progress/stdout/stderr/token/response/error).
 *
 * Volatile by design: no `persist` middleware. Cleared on new trace and
 * 5 seconds after the trace completes.
 */
import { create } from 'zustand'
import type { StreamEventDto } from '../lib/bridge'

export type CheckpointId =
  | 'intent'
  | 'context'
  | 'plan'
  | 'provider'
  | 'verify'
  | 'evidence'

export type CheckpointStatus = 'idle' | 'running' | 'done' | 'failed'

export interface CheckpointState {
  status: CheckpointStatus
  startedAt: number | null
  completedAt: number | null
  durationMs: number | null
  detail: string | null
  meta: Record<string, unknown>
}

export interface ExecutionSnapshot {
  activeTraceId: string | null
  startedAt: number | null
  completedAt: number | null
  checkpoints: Record<CheckpointId, CheckpointState>
  thinkingText: string
  providerTokens: number
  providerModel: string | null
  totalCostUsd: number | null
  reconnecting: boolean
  terminal: boolean
}

const CHECKPOINT_IDS: CheckpointId[] = [
  'intent',
  'context',
  'plan',
  'provider',
  'verify',
  'evidence',
]

const EMPTY_CHECKPOINT: CheckpointState = {
  status: 'idle',
  startedAt: null,
  completedAt: null,
  durationMs: null,
  detail: null,
  meta: {},
}

function freshCheckpoints(): Record<CheckpointId, CheckpointState> {
  return Object.fromEntries(
    CHECKPOINT_IDS.map((id) => [id, { ...EMPTY_CHECKPOINT }]),
  ) as Record<CheckpointId, CheckpointState>
}

const INITIAL: ExecutionSnapshot = {
  activeTraceId: null,
  startedAt: null,
  completedAt: null,
  checkpoints: freshCheckpoints(),
  thinkingText: '',
  providerTokens: 0,
  providerModel: null,
  totalCostUsd: null,
  reconnecting: false,
  terminal: false,
}

interface ExecutionStore extends ExecutionSnapshot {
  setActiveTrace: (traceId: string) => void
  ingest: (event: StreamEventDto) => void
  setReconnecting: (reconnecting: boolean) => void
  clearTrace: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function metaOf(event: StreamEventDto): Record<string, unknown> {
  const m = event.metadata
  return m && typeof m === 'object' && !Array.isArray(m)
    ? (m as Record<string, unknown>)
    : {}
}

function checkpointOf(meta: Record<string, unknown>): CheckpointId | null {
  const cp = meta.checkpoint
  if (typeof cp !== 'string') return null
  return CHECKPOINT_IDS.includes(cp as CheckpointId) ? (cp as CheckpointId) : null
}

function outcomeOf(meta: Record<string, unknown>): 'started' | 'done' | 'failed' | null {
  const o = meta.outcome
  return o === 'started' || o === 'done' || o === 'failed' ? o : null
}

function detailFor(checkpoint: CheckpointId, meta: Record<string, unknown>): string | null {
  switch (checkpoint) {
    case 'intent': {
      const it = typeof meta.intent_type === 'string' ? meta.intent_type : null
      const conf = typeof meta.confidence === 'number'
        ? `${Math.round(meta.confidence * 100)}%`
        : null
      return [it, conf].filter(Boolean).join(' · ') || null
    }
    case 'context': {
      const docs = typeof meta.docs_count === 'number' ? `${meta.docs_count} docs` : null
      const tokens = typeof meta.tokens_estimate === 'number'
        ? `${Math.round(meta.tokens_estimate / 100) / 10}k tokens`
        : null
      return [docs, tokens].filter(Boolean).join(' · ') || null
    }
    case 'plan': {
      const steps = typeof meta.steps === 'number' ? `${meta.steps} passos` : null
      const source = typeof meta.source === 'string' ? meta.source : null
      return steps ?? source
    }
    case 'provider': {
      const provider = typeof meta.provider === 'string' ? meta.provider : null
      const model = typeof meta.model === 'string' ? meta.model : null
      return [provider, model].filter(Boolean).join(' · ') || null
    }
    case 'verify': {
      const gate = typeof meta.gate_name === 'string' ? meta.gate_name : null
      const violations = Array.isArray(meta.violations) ? meta.violations.length : 0
      if (violations > 0) return `${gate ?? 'gate'} · ${violations} violações`
      return gate
    }
    case 'evidence': {
      const kind = typeof meta.kind === 'string' ? meta.kind : null
      const count = typeof meta.artifact_count === 'number'
        ? `${meta.artifact_count} artefatos`
        : null
      return [kind, count].filter(Boolean).join(' · ') || null
    }
    default:
      return null
  }
}

function applyTransition(
  prev: CheckpointState,
  outcome: 'started' | 'done' | 'failed',
  detail: string | null,
  meta: Record<string, unknown>,
  now: number,
): CheckpointState {
  if (outcome === 'started') {
    return {
      ...prev,
      status: 'running',
      startedAt: prev.startedAt ?? now,
      completedAt: null,
      durationMs: null,
      detail: detail ?? prev.detail,
      meta: { ...prev.meta, ...meta },
    }
  }
  const startedAt = prev.startedAt ?? now
  return {
    ...prev,
    status: outcome === 'done' ? 'done' : 'failed',
    startedAt,
    completedAt: now,
    durationMs: now - startedAt,
    detail: detail ?? prev.detail,
    meta: { ...prev.meta, ...meta },
  }
}

// Implicit promotion: when a later checkpoint fires `done`, any earlier
// checkpoint still in `idle` is bumped to `done` synthetically. Keeps the
// banner consistent even when events arrive out-of-order or some emitter
// is missing in backend.
function promoteEarlier(
  checkpoints: Record<CheckpointId, CheckpointState>,
  upTo: CheckpointId,
  now: number,
): Record<CheckpointId, CheckpointState> {
  const idx = CHECKPOINT_IDS.indexOf(upTo)
  if (idx <= 0) return checkpoints
  const next = { ...checkpoints }
  for (let i = 0; i < idx; i++) {
    const id = CHECKPOINT_IDS[i]!
    if (next[id].status === 'idle') {
      next[id] = {
        ...next[id],
        status: 'done',
        startedAt: now,
        completedAt: now,
        durationMs: 0,
      }
    }
  }
  return next
}

// ─── Store ────────────────────────────────────────────────────────────────

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  ...INITIAL,

  setActiveTrace: (traceId) => {
    if (get().activeTraceId === traceId) return
    set({
      ...INITIAL,
      activeTraceId: traceId,
      startedAt: Date.now(),
    })
  },

  setReconnecting: (reconnecting) => set({ reconnecting }),

  clearTrace: () => set({ ...INITIAL }),

  ingest: (event) => {
    const state = get()
    if (!state.activeTraceId) return
    // Cross-contamination guard: ignore stale events from prior traces.
    const traceId = (event as { traceId?: string }).traceId
    if (traceId && traceId !== state.activeTraceId) return

    const meta = metaOf(event)
    const now = Date.now()
    const type = event.eventType

    // Provider tokens (existing 'claude_text_delta' stream) — increment counter.
    if (type === 'token') {
      const rawCp = typeof meta.checkpoint === 'string' ? meta.checkpoint : null
      const cp = checkpointOf(meta)
      if (cp === 'provider' || (!rawCp && typeof meta.name === 'string' && meta.name.includes('text_delta'))) {
        set((s) => {
          // Auto-start provider checkpoint on first token if backend
          // failed to emit the explicit 'started' lifecycle.
          const provider = s.checkpoints.provider
          const nextProvider: CheckpointState =
            provider.status === 'idle'
              ? { ...provider, status: 'running', startedAt: now }
              : provider
          return {
            providerTokens: s.providerTokens + 1,
            providerModel:
              s.providerModel ?? (typeof meta.model === 'string' ? meta.model : null),
            checkpoints: promoteEarlier(
              { ...s.checkpoints, provider: nextProvider },
              'provider',
              now,
            ),
          }
        })
        return
      }
      // Extended thinking from Claude.
      if (rawCp === 'provider_thinking' || meta.name === 'claude_thinking_block') {
        const text = event.content as string
        if (typeof text === 'string' && text) {
          set({ thinkingText: text.slice(-1200) })
        }
        return
      }
    }

    // Terminal lifecycle events from the worker.
    if (type === 'response') {
      set((s) => {
        const next = { ...s.checkpoints }
        for (const id of CHECKPOINT_IDS) {
          if (next[id].status === 'running') {
            const startedAt = next[id].startedAt ?? now
            next[id] = {
              ...next[id],
              status: 'done',
              completedAt: now,
              durationMs: now - startedAt,
            }
          } else if (next[id].status === 'idle') {
            next[id] = {
              ...next[id],
              status: 'done',
              startedAt: now,
              completedAt: now,
              durationMs: 0,
            }
          }
        }
        return {
          checkpoints: next,
          totalCostUsd:
            typeof meta.total_cost_usd === 'number' ? meta.total_cost_usd : s.totalCostUsd,
          completedAt: now,
          terminal: true,
          thinkingText: '',
        }
      })
      return
    }

    if (type === 'error') {
      set((s) => {
        const next = { ...s.checkpoints }
        // Last running checkpoint becomes failed.
        for (let i = CHECKPOINT_IDS.length - 1; i >= 0; i--) {
          const id = CHECKPOINT_IDS[i]!
          if (next[id].status === 'running') {
            const startedAt = next[id].startedAt ?? now
            next[id] = {
              ...next[id],
              status: 'failed',
              completedAt: now,
              durationMs: now - startedAt,
              detail: typeof meta.reason === 'string' ? meta.reason : next[id].detail,
            }
            break
          }
        }
        return { checkpoints: next, completedAt: now, terminal: true }
      })
      return
    }

    // Checkpoint lifecycle event (event_type === 'lifecycle' carrying
    // metadata.checkpoint + metadata.outcome).
    const cp = checkpointOf(meta)
    const outcome = outcomeOf(meta) ?? (type === 'lifecycle' ? 'done' : null)
    if (cp && outcome) {
      const detail = detailFor(cp, meta)
      set((s) => {
        const updated = applyTransition(s.checkpoints[cp], outcome, detail, meta, now)
        let nextCheckpoints = { ...s.checkpoints, [cp]: updated }
        if (outcome === 'done' || outcome === 'failed') {
          nextCheckpoints = promoteEarlier(nextCheckpoints, cp, now)
        }
        const patch: Partial<ExecutionSnapshot> = { checkpoints: nextCheckpoints }
        if (cp === 'provider' && typeof meta.model === 'string') {
          patch.providerModel = meta.model
        }
        return patch as ExecutionStore
      })
    }
  },
}))

// ─── Selectors ────────────────────────────────────────────────────────────

export function useExecutionCheckpoint(id: CheckpointId): CheckpointState {
  return useExecutionStore((s) => s.checkpoints[id])
}

export function useExecutionIsActive(): boolean {
  return useExecutionStore((s) => {
    if (!s.activeTraceId) return false
    return Object.values(s.checkpoints).some((c) => c.status !== 'idle' && c.status !== 'done')
  })
}

export const CHECKPOINT_ORDER = CHECKPOINT_IDS

export const CHECKPOINT_LABELS: Record<CheckpointId, string> = {
  intent: 'Intent',
  context: 'Context',
  plan: 'Plan',
  provider: 'Provider',
  verify: 'Verify',
  evidence: 'Evidence',
}
