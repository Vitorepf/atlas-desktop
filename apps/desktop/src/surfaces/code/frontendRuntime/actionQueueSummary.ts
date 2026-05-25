export interface AtlasFrontendRivalReplayActionQueueSummary {
  schema_version: 'atlas.frontend.desktop_rival_replay_action_queue_summary.v1'
  status: 'not_available' | 'pending' | 'ready'
  work_item_count: number
  evidence_pack_items: number
  external_execution_receipt_items: number
  score_attestation_items: number
  manifest_patch_items: number
  next_work_item: AtlasFrontendRivalReplayNextWorkItem | null
  next_automatable_work_item: AtlasFrontendRivalReplayNextWorkItem | null
  next_actions: string[]
  operator_sequence: string[]
  first_blockers: string[]
  claim_policy: {
    summary_is_not_replay_evidence: true
    apply_patch_is_not_replay_evidence: true
    raw_absolute_path_returned: false
    world_best_claim_allowed: false
  }
}

export interface AtlasFrontendRivalReplayNextWorkItem {
  id: string
  case_id: string
  system: string
  kind: 'evidence_pack' | 'external_execution_receipt' | 'score_attestation' | 'unknown'
  suggested_action: 'fill_evidence_pack' | 'generate_external_receipt_template' | 'generate_score_attestation_template' | 'inspect_work_item'
  pack_manifest_ref: string
  run_manifest_ref: string
  task_spec_ref: string
  blockers: string[]
  completion_steps: string[]
  command_names: string[]
}

export function summarizeAtlasFrontendRivalReplayActionQueue(payload: unknown): AtlasFrontendRivalReplayActionQueueSummary {
  const queue = objectAt(payload, ['action_queue'])
  if (!queue) return emptySummary()

  const workItems = arrayAt(queue, ['work_items']).filter(isRecord)
  const nextActions = arrayAt(queue, ['next_actions']).filter(isString)
  const commandValues = workItems.flatMap((item) => Object.values(recordAt(item, ['commands'])).filter(isString))
  const classifiedItems = workItems.map((item) => ({ item, kind: workItemKind(item) }))
  const firstBlockers = workItems
    .flatMap((item) => arrayAt(item, ['blockers']).filter(isString))
    .filter(unique)
    .slice(0, 5)
  const status = stringAt(queue, ['status']) === 'ready' ? 'ready' : 'pending'
  const evidencePackItems = classifiedItems.filter(({ kind }) => kind === 'evidence_pack').length
  const externalExecutionReceiptItems = classifiedItems.filter(({ kind }) => kind === 'external_execution_receipt').length
  const scoreAttestationItems = classifiedItems.filter(({ kind }) => kind === 'score_attestation').length
  const manifestPatchItems = commandValues.filter((command) => command.includes('atlas:frontend:replay apply-patch')).length
  const nextWorkItem = buildNextWorkItem(classifiedItems)
  const nextAutomatableWorkItem = buildNextAutomatableWorkItem(classifiedItems)

  return {
    schema_version: 'atlas.frontend.desktop_rival_replay_action_queue_summary.v1',
    status,
    work_item_count: numberAt(queue, ['work_item_count'], workItems.length),
    evidence_pack_items: evidencePackItems,
    external_execution_receipt_items: externalExecutionReceiptItems,
    score_attestation_items: scoreAttestationItems,
    manifest_patch_items: manifestPatchItems,
    next_work_item: nextWorkItem,
    next_automatable_work_item: nextAutomatableWorkItem,
    next_actions: nextActions,
    operator_sequence: buildOperatorSequence({
      evidencePackItems,
      externalExecutionReceiptItems,
      scoreAttestationItems,
      manifestPatchItems,
      nextActions,
    }),
    first_blockers: firstBlockers,
    claim_policy: {
      summary_is_not_replay_evidence: true,
      apply_patch_is_not_replay_evidence: true,
      raw_absolute_path_returned: false,
      world_best_claim_allowed: false,
    },
  }
}

function emptySummary(): AtlasFrontendRivalReplayActionQueueSummary {
  return {
    schema_version: 'atlas.frontend.desktop_rival_replay_action_queue_summary.v1',
    status: 'not_available',
    work_item_count: 0,
    evidence_pack_items: 0,
    external_execution_receipt_items: 0,
    score_attestation_items: 0,
    manifest_patch_items: 0,
    next_work_item: null,
    next_automatable_work_item: null,
    next_actions: [],
    operator_sequence: [],
    first_blockers: [],
    claim_policy: {
      summary_is_not_replay_evidence: true,
      apply_patch_is_not_replay_evidence: true,
      raw_absolute_path_returned: false,
      world_best_claim_allowed: false,
    },
  }
}

function buildNextWorkItem(
  classifiedItems: Array<{ item: Record<string, unknown>, kind: AtlasFrontendRivalReplayNextWorkItem['kind'] }>,
): AtlasFrontendRivalReplayNextWorkItem | null {
  const priority = ['evidence_pack', 'external_execution_receipt', 'score_attestation', 'unknown']
  const selected = classifiedItems
    .filter(({ item }) => stringAt(item, ['id']) !== '')
    .sort((left, right) => priority.indexOf(left.kind) - priority.indexOf(right.kind))[0]
  if (!selected) return null

  const commands = recordAt(selected.item, ['commands'])

  return {
    id: stringAt(selected.item, ['id']),
    case_id: stringAt(selected.item, ['case_id']),
    system: stringAt(selected.item, ['system']),
    kind: selected.kind,
    suggested_action: suggestedActionFor(selected.kind),
    pack_manifest_ref: stringAt(selected.item, ['pack_manifest_ref']),
    run_manifest_ref: stringAt(selected.item, ['run_manifest_ref']),
    task_spec_ref: stringAt(selected.item, ['task_spec_ref']),
    blockers: arrayAt(selected.item, ['blockers']).filter(isString).slice(0, 6),
    completion_steps: arrayAt(selected.item, ['completion_steps']).filter(isString).slice(0, 8),
    command_names: Object.keys(commands).filter((key) => key.trim() !== '').slice(0, 6),
  }
}

function buildNextAutomatableWorkItem(
  classifiedItems: Array<{ item: Record<string, unknown>, kind: AtlasFrontendRivalReplayNextWorkItem['kind'] }>,
): AtlasFrontendRivalReplayNextWorkItem | null {
  return buildNextWorkItem(
    classifiedItems.filter(({ kind }) => kind === 'external_execution_receipt' || kind === 'score_attestation'),
  )
}

function suggestedActionFor(kind: AtlasFrontendRivalReplayNextWorkItem['kind']): AtlasFrontendRivalReplayNextWorkItem['suggested_action'] {
  if (kind === 'evidence_pack') return 'fill_evidence_pack'
  if (kind === 'external_execution_receipt') return 'generate_external_receipt_template'
  if (kind === 'score_attestation') return 'generate_score_attestation_template'

  return 'inspect_work_item'
}

function workItemKind(item: Record<string, unknown>): AtlasFrontendRivalReplayNextWorkItem['kind'] {
  const id = stringAt(item, ['id'])
  if (item.requires_evidence_pack === true || id.startsWith('fill_evidence_pack_') || arrayAt(item, ['artifact_slots']).length > 0) {
    return 'evidence_pack'
  }
  if (item.requires_external_execution_receipt === true || id.startsWith('fill_external_execution_receipt_') || stringAt(item, ['external_execution_receipt_schema_version']) !== '') {
    return 'external_execution_receipt'
  }
  if (item.requires_score_attestation === true || id.startsWith('fill_score_attestation_') || stringAt(item, ['score_attestation_schema_version']) !== '') {
    return 'score_attestation'
  }

  return 'unknown'
}

function buildOperatorSequence(input: {
  evidencePackItems: number
  externalExecutionReceiptItems: number
  scoreAttestationItems: number
  manifestPatchItems: number
  nextActions: string[]
}): string[] {
  const steps: string[] = []
  if (input.evidencePackItems > 0 || input.nextActions.includes('fill_and_hash_missing_rival_replay_evidence_packs')) {
    steps.push('fill_and_verify_evidence_packs')
  }
  if (input.externalExecutionReceiptItems > 0) {
    steps.push('generate_external_receipt_templates')
    steps.push('run_external_rivals_against_unchanged_task_specs')
  }
  if (input.scoreAttestationItems > 0) {
    steps.push('generate_score_attestation_templates')
    steps.push('review_artifacts_against_competitive_rubric')
  }
  if (input.manifestPatchItems > 0 || input.externalExecutionReceiptItems > 0 || input.scoreAttestationItems > 0) {
    steps.push('apply_provider_safe_manifest_patches')
  }
  if (steps.length > 0) {
    steps.push('rerun_replay_inspect_and_proof_bundle')
  }

  return steps.filter(unique)
}

function objectAt(payload: unknown, path: string[]): Record<string, unknown> | null {
  let current: unknown = payload
  for (const key of path) {
    if (!isRecord(current)) return null
    current = current[key]
  }

  return isRecord(current) ? current : null
}

function recordAt(payload: unknown, path: string[]): Record<string, unknown> {
  return objectAt(payload, path) ?? {}
}

function arrayAt(payload: unknown, path: string[]): unknown[] {
  let current: unknown = payload
  for (const key of path) {
    if (!isRecord(current)) return []
    current = current[key]
  }

  return Array.isArray(current) ? current : []
}

function stringAt(payload: unknown, path: string[]): string {
  let current: unknown = payload
  for (const key of path) {
    if (!isRecord(current)) return ''
    current = current[key]
  }

  return typeof current === 'string' ? current : ''
}

function numberAt(payload: unknown, path: string[], fallback: number): number {
  let current: unknown = payload
  for (const key of path) {
    if (!isRecord(current)) return fallback
    current = current[key]
  }

  return typeof current === 'number' && Number.isFinite(current) ? current : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

function unique(value: string, index: number, values: string[]): boolean {
  return values.indexOf(value) === index
}
