import type { AtlasDevRunStatusResponse, CompletionState } from './types'

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
