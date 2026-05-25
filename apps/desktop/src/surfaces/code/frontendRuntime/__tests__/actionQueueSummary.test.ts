/// <reference types="node" />

import assert from 'node:assert/strict'

import { summarizeAtlasFrontendRivalReplayActionQueue } from '../actionQueueSummary.ts'

const missing = summarizeAtlasFrontendRivalReplayActionQueue({})
assert.equal(missing.status, 'not_available')
assert.equal(missing.work_item_count, 0)
assert.equal(missing.claim_policy.world_best_claim_allowed, false)

const pending = summarizeAtlasFrontendRivalReplayActionQueue({
  action_queue: {
    status: 'pending',
    work_item_count: 3,
    next_actions: [
      'fill_and_hash_missing_rival_replay_evidence_packs',
      'run_external_rivals_and_embed_execution_receipts',
    ],
    work_items: [
      {
        id: 'fill_evidence_pack_saas_atlas_frontend',
        case_id: 'saas',
        system: 'atlas_frontend',
        blockers: ['evidence_pack_missing'],
        pack_manifest_ref: 'saas/atlas_frontend/evidence/evidence-pack.json',
        run_manifest_ref: 'saas/atlas_frontend/manifest.json',
        task_spec_ref: 'saas/task-spec.json',
        artifact_slots: [{ kind: 'output_artifact' }],
        completion_steps: ['capture_real_artifact_files_under_artifact_refs'],
      },
      {
        id: 'fill_external_execution_receipt_saas_impeccable',
        case_id: 'saas',
        system: 'impeccable',
        blockers: ['external_execution_receipt_required'],
        external_execution_receipt_schema_version: 'atlas.frontend.rival_replay.external_execution_receipt.v1',
        commands: {
          write_external_receipt_template: 'php artisan atlas:frontend:replay external-receipt-template --evidence=/tmp/replay --case=saas --system=impeccable --json',
          apply_manifest_patch: 'php artisan atlas:frontend:replay apply-patch --evidence=/tmp/replay --patch=<filled-template.json> --json',
        },
      },
      {
        id: 'fill_score_attestation_saas_atlas_frontend',
        case_id: 'saas',
        system: 'atlas_frontend',
        blockers: ['score_attestation_required'],
        score_attestation_schema_version: 'atlas.frontend.rival_replay.score_attestation.v1',
        commands: {
          write_score_template: 'php artisan atlas:frontend:replay score-template --evidence=/tmp/replay --case=saas --system=atlas_frontend --json',
          apply_manifest_patch: 'php artisan atlas:frontend:replay apply-patch --evidence=/tmp/replay --patch=<filled-template.json> --json',
        },
      },
    ],
  },
})

assert.equal(pending.schema_version, 'atlas.frontend.desktop_rival_replay_action_queue_summary.v1')
assert.equal(pending.status, 'pending')
assert.equal(pending.work_item_count, 3)
assert.equal(pending.evidence_pack_items, 1)
assert.equal(pending.external_execution_receipt_items, 1)
assert.equal(pending.score_attestation_items, 1)
assert.equal(pending.manifest_patch_items, 2)
assert.deepEqual(pending.next_work_item, {
  id: 'fill_evidence_pack_saas_atlas_frontend',
  case_id: 'saas',
  system: 'atlas_frontend',
  kind: 'evidence_pack',
  suggested_action: 'fill_evidence_pack',
  pack_manifest_ref: 'saas/atlas_frontend/evidence/evidence-pack.json',
  run_manifest_ref: 'saas/atlas_frontend/manifest.json',
  task_spec_ref: 'saas/task-spec.json',
  blockers: ['evidence_pack_missing'],
  completion_steps: ['capture_real_artifact_files_under_artifact_refs'],
  command_names: [],
})
assert.deepEqual(pending.next_automatable_work_item, {
  id: 'fill_external_execution_receipt_saas_impeccable',
  case_id: 'saas',
  system: 'impeccable',
  kind: 'external_execution_receipt',
  suggested_action: 'generate_external_receipt_template',
  pack_manifest_ref: '',
  run_manifest_ref: '',
  task_spec_ref: '',
  blockers: ['external_execution_receipt_required'],
  completion_steps: [],
  command_names: ['write_external_receipt_template', 'apply_manifest_patch'],
})
assert.deepEqual(pending.next_actions, [
  'fill_and_hash_missing_rival_replay_evidence_packs',
  'run_external_rivals_and_embed_execution_receipts',
])
assert.deepEqual(pending.operator_sequence, [
  'fill_and_verify_evidence_packs',
  'generate_external_receipt_templates',
  'run_external_rivals_against_unchanged_task_specs',
  'generate_score_attestation_templates',
  'review_artifacts_against_competitive_rubric',
  'apply_provider_safe_manifest_patches',
  'rerun_replay_inspect_and_proof_bundle',
])
assert.deepEqual(pending.first_blockers, [
  'evidence_pack_missing',
  'external_execution_receipt_required',
  'score_attestation_required',
])
assert.equal(pending.claim_policy.apply_patch_is_not_replay_evidence, true)

const ready = summarizeAtlasFrontendRivalReplayActionQueue({
  action_queue: {
    status: 'ready',
    work_item_count: 0,
    work_items: [],
  },
})
assert.equal(ready.status, 'ready')
assert.equal(ready.claim_policy.summary_is_not_replay_evidence, true)

const preparedReplay = summarizeAtlasFrontendRivalReplayActionQueue({
  status: 'ready_for_external_rival_replay',
  action_queue: {
    status: 'pending',
    work_item_count: 1,
    work_items: [
      {
        requires_evidence_pack: true,
        id: 'legacy_evidence_pack_item',
        blockers: ['evidence_pack_missing'],
      },
    ],
  },
})
assert.equal(preparedReplay.status, 'pending')
assert.equal(preparedReplay.evidence_pack_items, 1)

const receiptFirst = summarizeAtlasFrontendRivalReplayActionQueue({
  action_queue: {
    status: 'pending',
    work_items: [
      {
        id: 'fill_external_execution_receipt_saas_pbakaus_impeccable',
        case_id: 'saas',
        system: 'pbakaus_impeccable',
        external_execution_receipt_schema_version: 'atlas.frontend.rival_replay.external_execution_receipt.v1',
      },
    ],
  },
})
assert.equal(receiptFirst.next_work_item?.suggested_action, 'generate_external_receipt_template')
assert.equal(receiptFirst.next_automatable_work_item?.suggested_action, 'generate_external_receipt_template')

const scoreFirst = summarizeAtlasFrontendRivalReplayActionQueue({
  action_queue: {
    status: 'pending',
    work_items: [
      {
        id: 'fill_score_attestation_saas_atlas_frontend',
        case_id: 'saas',
        system: 'atlas_frontend',
        score_attestation_schema_version: 'atlas.frontend.rival_replay.score_attestation.v1',
      },
    ],
  },
})
assert.equal(scoreFirst.next_work_item?.suggested_action, 'generate_score_attestation_template')
assert.equal(scoreFirst.next_automatable_work_item?.suggested_action, 'generate_score_attestation_template')

console.log('ok - Atlas Frontend action queue summary keeps replay work visible and claim-safe')
