/**
 * Atlas Dev · Run state machine hook.
 *
 * Flow:
 *   idle ──(receive Plan)──▶ awaiting_confirmation
 *   awaiting_confirmation ──(execute)──▶ submitting
 *   submitting ──(202/ok)──▶ running
 *                          │  ├─ SSE phases populate `phases[]`
 *                          │  ├─ receipt event sets `receipt`
 *                          │  └─ on stream close, REST fallback closes the run
 *   submitting ──(403/422)──▶ failed (requires_replan=true)
 *   running    ──(failed)───▶ failed
 *   running    ──(blocked)──▶ blocked
 *   running    ──(escalate_forge)──▶ escalated
 *   running    ──(passed/no_patch_needed)──▶ completed
 *
 * Cancel / discard: before execution, discards the plan locally. Once /run was
 * accepted, calls the backend cancellation endpoint so the worker can stop
 * before spending provider tokens when possible.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cancelAtlasDevRun,
  fetchAtlasDevRunStatus,
  runAtlasDev,
  streamAtlasDevRun,
} from './api'
import type {
  AtlasDevPhase,
  AtlasDevReceipt,
  AtlasDevRunError,
  AtlasDevRunStatus,
  AtlasDevSseEvent,
  AtlasDevTestRun,
  PlanOnlyResult,
} from './types'

export interface AtlasDevRunSnapshot {
  status: AtlasDevRunStatus
  phases: Array<{ phase: AtlasDevPhase; at: string }>
  /** Most recent phase, convenience for inline indicators. */
  currentPhase: AtlasDevPhase | null
  receipt: AtlasDevReceipt | null
  tests: AtlasDevTestRun[]
  repairAttempts: number
  escalation: { target: string; reasons: string[] } | null
  error: AtlasDevRunError | null
  /** True when the SSE stream dropped and we're using REST fallback. */
  usingRestFallback: boolean
}

export interface AtlasDevRunController extends AtlasDevRunSnapshot {
  execute: () => Promise<void>
  loadStatus: (runId: string) => Promise<void>
  cancel: () => void
  reset: () => void
}

const INITIAL: AtlasDevRunSnapshot = {
  status: 'idle',
  phases: [],
  currentPhase: null,
  receipt: null,
  tests: [],
  repairAttempts: 0,
  escalation: null,
  error: null,
  usingRestFallback: false,
}

const PHASE_FROM_COMPLETION: Record<string, AtlasDevPhase> = {
  passed: 'complete',
  no_patch_needed: 'no_patch_needed',
  failed: 'complete',
  blocked: 'complete',
  cancelled: 'complete',
  needs_review: 'complete',
  escalate_forge: 'escalation_triggered',
}

export function useAtlasDevRun(plan: PlanOnlyResult | null): AtlasDevRunController {
  const [snapshot, setSnapshot] = useState<AtlasDevRunSnapshot>(INITIAL)
  const streamRef = useRef<{ close(): void } | null>(null)
  const pollRef = useRef<number | null>(null)
  const finalizedRef = useRef(false)

  const finalize = useCallback((next: Partial<AtlasDevRunSnapshot>): void => {
    finalizedRef.current = true
    if (streamRef.current) {
      streamRef.current.close()
      streamRef.current = null
    }
    if (pollRef.current !== null) {
      window.clearTimeout(pollRef.current)
      pollRef.current = null
    }
    setSnapshot((prev) => ({ ...prev, ...next }))
  }, [])

  const applyReceipt = useCallback(
    (receipt: AtlasDevReceipt): void => {
      const completion = receipt.completion?.status
      const status: AtlasDevRunStatus = (() => {
        switch (completion) {
          case 'passed':
          case 'no_patch_needed':
            return 'completed'
          case 'blocked':
            return 'blocked'
          case 'cancelled':
            return 'cancelled'
          case 'escalate_forge':
            return 'escalated'
          case 'failed':
          case 'needs_review':
          default:
            return 'failed'
        }
      })()

      const phaseHint = completion ? PHASE_FROM_COMPLETION[completion] ?? 'complete' : 'complete'

      finalize({
        status,
        receipt,
        currentPhase: phaseHint,
        phases: appendPhase(snapshot.phases, phaseHint),
        tests: receipt.tests ?? snapshot.tests,
      })
    },
    [finalize, snapshot.phases, snapshot.tests],
  )

  const onSseEvent = useCallback(
    (event: AtlasDevSseEvent): void => {
      if (finalizedRef.current) return
      switch (event.kind) {
        case 'keepalive':
          // Never poison the UI with keepalives.
          return
        case 'stream_closed':
          // F-01 snapshot-replay end-of-stream marker. We treat it like the
          // ReadableStream `done` signal — the REST fallback below still owns
          // the truth, no UI side-effect here.
          return
        case 'phase':
          setSnapshot((prev) => ({
            ...prev,
            currentPhase: event.phase,
            phases: appendPhase(prev.phases, event.phase, event.at),
          }))
          return
        case 'test_started':
          setSnapshot((prev) => ({
            ...prev,
            tests: upsertTest(prev.tests, { command: event.command }),
          }))
          return
        case 'test_finished':
          setSnapshot((prev) => ({
            ...prev,
            tests: upsertTest(prev.tests, {
              command: event.command,
              ok: event.ok,
              exit_code: event.exit_code ?? null,
              duration_ms: event.duration_ms ?? null,
            }),
          }))
          return
        case 'repair_planned':
        case 'repair_executing': {
          const phase: AtlasDevPhase = event.kind === 'repair_planned' ? 'repair_planned' : 'repair_executing'
          setSnapshot((prev) => ({
            ...prev,
            currentPhase: phase,
            phases: appendPhase(prev.phases, phase),
            repairAttempts: Math.max(prev.repairAttempts, event.attempt ?? prev.repairAttempts),
          }))
          return
        }
        case 'repair_finished':
          setSnapshot((prev) => ({
            ...prev,
            repairAttempts: Math.max(prev.repairAttempts, event.attempt ?? prev.repairAttempts),
          }))
          return
        case 'escalation_triggered':
          setSnapshot((prev) => ({
            ...prev,
            currentPhase: 'escalation_triggered',
            phases: appendPhase(prev.phases, 'escalation_triggered'),
            escalation: { target: event.target, reasons: event.reasons ?? [] },
          }))
          return
        case 'receipt':
          applyReceipt(coerceReceipt(event))
          return
      }
    },
    [applyReceipt],
  )

  const pollOnce = useCallback(
    (runId: string): Promise<void> => {
      const tick = async (): Promise<void> => {
        try {
          const status = await fetchAtlasDevRunStatus(runId)
          if (finalizedRef.current) return

          setSnapshot((prev) => {
            let nextPhases = prev.phases
            if (Array.isArray(status.phases)) {
              for (const entry of status.phases) {
                nextPhases = appendPhase(nextPhases, entry.phase, entry.at ?? undefined)
              }
            }
            return {
              ...prev,
              currentPhase: status.state ?? prev.currentPhase,
              phases: nextPhases,
              usingRestFallback: true,
            }
          })

          if (status.receipt) {
            applyReceipt(status.receipt)
            return
          }

          // Continue polling while we don't have a receipt yet.
          pollRef.current = window.setTimeout(() => {
            if (!finalizedRef.current) void tick()
          }, 2000)
        } catch (cause) {
          const err = cause as AtlasDevRunError
          finalize({
            status: 'failed',
            error: err.kind
              ? err
              : { kind: 'network', message: 'falha ao consultar status', requires_replan: false },
          })
        }
      }
      return tick()
    },
    [applyReceipt, finalize],
  )

  const startStream = useCallback(
    (runId: string): void => {
      streamRef.current = streamAtlasDevRun(runId, {
        onEvent: onSseEvent,
        onError: () => {
          // Network blip — switch to REST fallback rather than failing.
          setSnapshot((prev) => ({ ...prev, usingRestFallback: true }))
          void pollOnce(runId)
        },
        onClose: () => {
          streamRef.current = null
          if (!finalizedRef.current) {
            // Stream closed cleanly without a receipt — confirm via REST.
            void pollOnce(runId)
          }
        },
      })
    },
    [onSseEvent, pollOnce],
  )

  const loadStatus = useCallback(
    async (runId: string): Promise<void> => {
      const normalizedRunId = runId.trim()
      if (!normalizedRunId) return

      finalizedRef.current = true
      if (streamRef.current) {
        streamRef.current.close()
        streamRef.current = null
      }
      if (pollRef.current !== null) {
        window.clearTimeout(pollRef.current)
        pollRef.current = null
      }
      finalizedRef.current = false

      setSnapshot({
        ...INITIAL,
        status: 'running',
        currentPhase: 'queued',
        phases: appendPhase([], 'queued'),
        usingRestFallback: true,
      })

      try {
        const status = await fetchAtlasDevRunStatus(normalizedRunId)
        if (finalizedRef.current) return

        setSnapshot((prev) => {
          let nextPhases = prev.phases
          if (Array.isArray(status.phases)) {
            for (const entry of status.phases) {
              nextPhases = appendPhase(nextPhases, entry.phase, entry.at ?? undefined)
            }
          }

          return {
            ...prev,
            status: status.receipt ? prev.status : statusToRunStatus(status.state),
            currentPhase: status.state ?? prev.currentPhase,
            phases: nextPhases,
            usingRestFallback: true,
          }
        })

        if (status.receipt) {
          applyReceipt(status.receipt)
          return
        }

        if (!isTerminalPhase(status.state)) {
          await pollOnce(normalizedRunId)
        }
      } catch (cause) {
        const err = cause as AtlasDevRunError
        finalize({
          status: 'failed',
          error: err.kind
            ? err
            : { kind: 'network', message: 'falha ao reabrir run', requires_replan: false },
        })
      }
    },
    [applyReceipt, finalize, pollOnce],
  )

  const execute = useCallback(async (): Promise<void> => {
    if (!plan) return
    if (snapshot.status !== 'awaiting_confirmation' && snapshot.status !== 'failed') return
    finalizedRef.current = false
    setSnapshot({ ...INITIAL, status: 'submitting' })

    try {
      await runAtlasDev({
        run_id: plan.run_id,
        task_contract_hash: plan.task_contract_hash,
        confirmation_token: plan.confirmation_token,
        operator_confirmed: true,
      })
    } catch (cause) {
      if (finalizedRef.current) return
      const err = cause as AtlasDevRunError
      setSnapshot({
        ...INITIAL,
        status: 'failed',
        error: err.kind ? err : { kind: 'unknown', message: 'falha ao iniciar run', requires_replan: false },
      })
      return
    }

    if (finalizedRef.current) return

    setSnapshot((prev) => ({
      ...prev,
      status: 'running',
      currentPhase: 'queued',
      phases: appendPhase(prev.phases, 'queued'),
    }))
    startStream(plan.run_id)
  }, [plan, snapshot.status, startStream])

  const cancel = useCallback((): void => {
    if (!plan) {
      finalize({ status: 'idle' })
      return
    }

    if (snapshot.status !== 'submitting' && snapshot.status !== 'running') {
      finalize({ status: 'idle' })
      return
    }

    void (async (): Promise<void> => {
      try {
        await cancelAtlasDevRun(plan.run_id, 'operator_cancelled_from_desktop')
        finalize({
          status: 'cancelled',
          currentPhase: 'complete',
          phases: appendPhase(snapshot.phases, 'complete'),
        })
      } catch (cause) {
        const err = cause as AtlasDevRunError
        finalize({
          status: 'failed',
          error: err.kind
            ? err
            : { kind: 'network', message: 'falha ao cancelar run', requires_replan: false },
        })
      }
    })()
  }, [finalize, plan, snapshot.phases, snapshot.status])

  const reset = useCallback((): void => {
    finalizedRef.current = false
    setSnapshot(INITIAL)
  }, [])

  // When a new plan arrives, advance from idle to awaiting_confirmation
  // (never auto-run — that's a contract invariant). React 19 pattern:
  // derive state during render by comparing the previous plan identity.
  const [planFingerprint, setPlanFingerprint] = useState<string | null>(null)
  const incomingFingerprint = plan ? `${plan.run_id}::${plan.task_contract_hash}` : null
  if (incomingFingerprint !== planFingerprint) {
    setPlanFingerprint(incomingFingerprint)
    setSnapshot(plan ? { ...INITIAL, status: 'awaiting_confirmation' } : INITIAL)
  }

  // Refs are mutated in an effect (lint rule react-hooks/refs forbids
  // assignments during render).
  useEffect(() => {
    finalizedRef.current = false
  }, [planFingerprint])

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.close()
      if (pollRef.current !== null) window.clearTimeout(pollRef.current)
    }
  }, [])

  return useMemo<AtlasDevRunController>(
    () => ({ ...snapshot, execute, loadStatus, cancel, reset }),
    [snapshot, execute, loadStatus, cancel, reset],
  )
}

function isTerminalPhase(phase: AtlasDevPhase | null | undefined): boolean {
  return phase === 'complete' || phase === 'no_patch_needed' || phase === 'escalation_triggered'
}

function statusToRunStatus(phase: AtlasDevPhase | null | undefined): AtlasDevRunStatus {
  if (phase === 'complete' || phase === 'no_patch_needed') return 'completed'
  if (phase === 'escalation_triggered') return 'escalated'
  return 'running'
}

function appendPhase(
  current: Array<{ phase: AtlasDevPhase; at: string }>,
  phase: AtlasDevPhase,
  at?: string | null,
): Array<{ phase: AtlasDevPhase; at: string }> {
  const last = current[current.length - 1]
  if (last && last.phase === phase) return current
  return [...current, { phase, at: at ?? new Date().toISOString() }]
}

/**
 * The F-01 backend snapshot stream emits two receipt shapes:
 *
 *   1. **Full** (provider run path): `{ kind: 'receipt', receipt: AtlasDevReceipt }`
 *   2. **Snapshot replay** (StreamController short-lived): a flat payload where
 *      `kind: 'receipt'` sits next to `completion_state`, `receipt_hash`,
 *      `verification_status` and `scope_guard_status` — there's no nested
 *      `receipt` field, because the controller is reading the persisted
 *      `verification_receipt.v1` file directly.
 *
 * Coerce both into the canonical {@link AtlasDevReceipt} shape so the rest of
 * the reducer doesn't have to branch. Missing fields stay nullish — we never
 * synthesise data.
 */
function coerceReceipt(event: Extract<AtlasDevSseEvent, { kind: 'receipt' }>): AtlasDevReceipt {
  const carrier = event as unknown as Record<string, unknown>
  if (carrier.receipt && typeof carrier.receipt === 'object') {
    return carrier.receipt as AtlasDevReceipt
  }

  const completionState = (carrier.completion_state as AtlasDevReceipt['completion']['status']) ?? 'failed'
  const verificationStatus = (carrier.verification_status as AtlasDevReceipt['verification_status']) ?? null
  const scopeGuardStatus = (carrier.scope_guard_status as AtlasDevReceipt['scope_guard_status']) ?? null
  const receiptHash = typeof carrier.receipt_hash === 'string' ? carrier.receipt_hash : null
  const runId = typeof carrier.run_id === 'string' ? carrier.run_id : ''

  return {
    run_id: runId,
    task_contract_hash: '',
    completion: { status: completionState },
    scope_guard_status: scopeGuardStatus,
    verification_status: verificationStatus,
    receipt_hash: receiptHash,
  }
}

function upsertTest(current: AtlasDevTestRun[], next: AtlasDevTestRun): AtlasDevTestRun[] {
  const idx = current.findIndex((entry) => entry.command === next.command)
  if (idx === -1) return [...current, next]
  const merged = { ...current[idx], ...next }
  const out = current.slice()
  out[idx] = merged
  return out
}
