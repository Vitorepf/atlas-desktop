import type { AtlasDevRunStatusResponse, CompletionState } from './types'
import type { AtlasDevPlanResult } from '../../surfaces/atlas-ai/types'

/**
 * Normalise the /ai/interactions/atlas-dev/plan response into the canonical
 * Desktop shape (`AtlasDevPlanResult`).
 *
 * Accepts every shape currently emitted by the backend / legacy drafts:
 *   - `{ data: { confirmation:{token,expires_at,task_contract_hash}, routing:{kind}, hashes:{task_contract}, … } }`
 *   - `{ plan: { … } }`
 *   - bare `{ … }`
 *
 * Guarantees:
 *   - `confirmation_token` is surfaced as a top-level string.
 *   - `confirmation_expires_at` is normalised to an ISO 8601 string (the
 *     backend emits unix seconds; never a number).
 *   - `task_contract_hash` is surfaced top-level (preferring confirmation, then
 *     task_contract.task_contract_hash, then hashes.task_contract).
 *   - `routing_decision` is surfaced top-level (preferring routing.kind).
 *   - `status` is derived from routing_decision when absent so the UI never
 *     defaults to undefined.
 */
export function normaliseAtlasDevPlanResult(
  raw: AtlasDevPlanResult & {
    confirmation?: { token?: string; expires_at?: number | string; task_contract_hash?: string } | null
    routing?: { kind?: string } | null
  },
): AtlasDevPlanResult {
  const routingDecision =
    raw.routing_decision ??
    raw.routing?.kind ??
    (raw.status === 'blocked'
      ? 'blocked'
      : raw.status === 'forge_promotion_preview'
        ? 'forge_promotion_preview'
        : undefined)

  const status =
    raw.status ??
    (routingDecision === 'blocked'
      ? 'blocked'
      : routingDecision === 'forge_promotion_preview'
        ? 'forge_promotion_preview'
        : 'ready')

  const confirmationToken = raw.confirmation_token ?? raw.confirmation?.token
  const confirmationExpiresAt =
    raw.confirmation_expires_at ??
    normaliseUnixOrIsoTimestamp(raw.confirmation?.expires_at)
  const taskContractHash =
    raw.task_contract_hash ??
    raw.confirmation?.task_contract_hash ??
    raw.task_contract?.task_contract_hash ??
    (typeof raw.hashes?.task_contract === 'string' ? raw.hashes.task_contract : undefined)

  return {
    ...raw,
    status,
    ...(routingDecision ? { routing_decision: routingDecision } : {}),
    ...(confirmationToken ? { confirmation_token: confirmationToken } : {}),
    ...(confirmationExpiresAt ? { confirmation_expires_at: confirmationExpiresAt } : {}),
    ...(taskContractHash ? { task_contract_hash: taskContractHash } : {}),
  }
}

/**
 * Unwrap whichever envelope the backend wrapped the plan in
 * (`{ data:… }` / `{ plan:… }` / bare) and run it through
 * {@link normaliseAtlasDevPlanResult}.
 */
export function normalisePlanResponse(payload: unknown): AtlasDevPlanResult | null {
  if (!payload || typeof payload !== 'object') return null
  if (Array.isArray(payload)) return null
  const record = payload as Record<string, unknown>

  if ('data' in record && record.data && typeof record.data === 'object') {
    if (Array.isArray(record.data)) return null
    return normaliseValidPlanResult(record.data as unknown as AtlasDevPlanResult)
  }
  if ('plan' in record && record.plan && typeof record.plan === 'object') {
    if (Array.isArray(record.plan)) return null
    return normaliseValidPlanResult(record.plan as unknown as AtlasDevPlanResult)
  }
  // Two-step cast via `unknown` to disable TS2352's overlap check (Record<string,
  // unknown> and AtlasDevPlanResult share no required keys, so the direct
  // assertion is rejected — even though that's exactly what the caller wants).
  const bare = record as unknown
  return normaliseValidPlanResult(bare as AtlasDevPlanResult)
}

function normaliseValidPlanResult(raw: AtlasDevPlanResult): AtlasDevPlanResult | null {
  if (!raw || typeof raw.run_id !== 'string' || raw.run_id.trim() === '') return null
  return normaliseAtlasDevPlanResult(raw)
}

function normaliseUnixOrIsoTimestamp(value: number | string | undefined): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString()
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return new Date(numeric * 1000).toISOString()
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString()
  }
  return null
}

export function normalizeRunStartResponse(payload: unknown): { ok: true; run_id: string } | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  if (record.ok === true && typeof record.run_id === 'string' && record.run_id !== '') {
    return { ok: true, run_id: record.run_id }
  }

  const data = record.data
  if (data && typeof data === 'object') {
    const inner = data as Record<string, unknown>
    if (typeof inner.run_id === 'string' && inner.run_id !== '') {
      return { ok: true, run_id: inner.run_id }
    }
  }

  return null
}

export function normalizeRunStatusResponse(payload: unknown): AtlasDevRunStatusResponse {
  const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const data = record.data && typeof record.data === 'object'
    ? record.data as Record<string, unknown>
    : record

  const runId = typeof data.run_id === 'string' ? data.run_id : ''
  const completionState = typeof data.completion_state === 'string' ? data.completion_state : null
  const state = normalizeStatusPhase(data.state, completionState)
  const receipt = normalizeReceiptFromStatus(data, completionState)

  return {
    run_id: runId,
    state,
    ...(receipt ? { completion: receipt.completion, receipt } : {}),
    phases: normalizeStatusPhases(data.persisted_artifact_refs),
  }
}

function normalizeStatusPhase(state: unknown, completionState: string | null): AtlasDevRunStatusResponse['state'] {
  if (typeof state === 'string' && state !== '') {
    return state as AtlasDevRunStatusResponse['state']
  }
  if (completionState === 'passed' || completionState === 'no_patch_needed' || completionState === 'failed' || completionState === 'blocked' || completionState === 'needs_review') {
    return 'complete'
  }
  if (completionState === 'escalate_forge') return 'escalation_triggered'
  return 'queued'
}

function normalizeReceiptFromStatus(
  data: Record<string, unknown>,
  completionState: string | null,
): AtlasDevRunStatusResponse['receipt'] {
  const existing = data.receipt
  if (existing && typeof existing === 'object') {
    return existing as AtlasDevRunStatusResponse['receipt']
  }
  if (!completionState) return null

  return {
    run_id: typeof data.run_id === 'string' ? data.run_id : '',
    task_contract_hash: typeof data.task_contract_hash === 'string' ? data.task_contract_hash : '',
    completion: { status: completionState as CompletionState },
    scope_guard_status: null,
    verification_status: null,
    receipt_hash: typeof data.verification_receipt_hash === 'string' ? data.verification_receipt_hash : null,
  }
}

function normalizeStatusPhases(
  artifactRefs: unknown,
): NonNullable<AtlasDevRunStatusResponse['phases']> {
  if (!artifactRefs || typeof artifactRefs !== 'object') return []
  const refs = artifactRefs as Record<string, unknown>
  const now = new Date().toISOString()
  const phaseByArtifact: Record<string, AtlasDevRunStatusResponse['state']> = {
    operation_envelope: 'queued',
    operation_envelope_json: 'queued',
    provider_call_result: 'executing',
    provider_call_result_json: 'executing',
    diff_parse_result: 'patch_projected',
    diff_parse_result_json: 'patch_projected',
    patch_apply_result: 'patch_projected',
    patch_apply_result_json: 'patch_projected',
    scope_guard_receipt: 'scope_guarding',
    scope_guard_receipt_json: 'scope_guarding',
    verification_receipt: 'complete',
    verification_receipt_json: 'complete',
  }

  return Object.keys(refs)
    .map((key) => key.replace(/\.json$/, '').replace(/[^A-Za-z0-9_]+/g, '_'))
    .map((key) => phaseByArtifact[key])
    .filter((phase): phase is AtlasDevRunStatusResponse['state'] => Boolean(phase))
    .map((phase) => ({ phase, at: now }))
}
