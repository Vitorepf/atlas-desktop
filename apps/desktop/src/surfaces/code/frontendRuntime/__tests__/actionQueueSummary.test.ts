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
        requires_evidence_pack: true,
        blockers: ['evidence_pack_missing'],
      },
      {
        requires_external_execution_receipt: true,
        blockers: ['external_execution_receipt_required'],
        commands: {
          write_external_receipt_template: 'php artisan atlas:frontend:replay external-receipt-template --evidence=/tmp/replay --case=saas --system=impeccable --json',
          apply_manifest_patch: 'php artisan atlas:frontend:replay apply-patch --evidence=/tmp/replay --patch=<filled-template.json> --json',
        },
      },
      {
        requires_score_attestation: true,
        blockers: ['score_attestation_required'],
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
        blockers: ['evidence_pack_missing'],
      },
    ],
  },
})
assert.equal(preparedReplay.status, 'pending')
assert.equal(preparedReplay.evidence_pack_items, 1)

console.log('ok - Atlas Frontend action queue summary keeps replay work visible and claim-safe')
