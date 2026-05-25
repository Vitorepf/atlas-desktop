/// <reference types="node" />

import assert from 'node:assert/strict'

import type { AtlasFrontendWorkspaceApiEnvelope } from '../api.ts'
import { buildAtlasFrontendArtifactPlan } from '../artifactDefaults.ts'
import { buildAtlasFrontendCompetitiveReadiness } from '../competitiveReadiness.ts'

function envelope(
  schemaVersion: string,
  payload: Record<string, unknown>,
  meta: Partial<AtlasFrontendWorkspaceApiEnvelope<unknown>['meta']> = {},
): AtlasFrontendWorkspaceApiEnvelope<unknown> {
  return {
    schema_version: schemaVersion,
    surface: 'atlas_code_frontend_test',
    status_code: 200,
    transport_status: 'ok',
    payload,
    meta: {
      selected_repository_is_primary_workspace: true,
      frontend_app_is_subscope_only: true,
      space_runtime_required: false,
      provider_dispatch_performed: false,
      world_best_claim_allowed: false,
      ...meta,
    },
  }
}

const artifactPlan = buildAtlasFrontendArtifactPlan({
  workspace: '/Users/example/company/shop',
  frontendApp: 'apps/web',
  task: 'melhorar checkout',
})

const blocked = buildAtlasFrontendCompetitiveReadiness({
  artifactPlan,
  reports: {},
})
assert.equal(blocked.schema_version, 'atlas.frontend.desktop_competitive_readiness.v1')
assert.equal(blocked.status, 'blocked')
assert.equal(blocked.claim_policy.space_runtime_required, false)
assert.equal(blocked.claim_policy.world_best_claim_allowed, false)
assert.equal(blocked.proof_contract.status, 'not_available')
assert.equal(blocked.operator_packet_verification.status, 'not_available')
assert.equal(blocked.proof_bundle.status, 'unknown')
assert.equal(blocked.publication.status, 'unknown')
assert.ok(blocked.blockers.includes('evidence_kit_prepared'))
assert.ok(blocked.blockers.includes('rival_replay_runner_kit_prepared'))
assert.ok(blocked.blockers.includes('operator_packet_verified'))
assert.ok(blocked.blockers.includes('competitive_proof_bundle_compiled'))
assert.ok(blocked.blockers.includes('external_rival_replay_receipts'))
assert.ok(blocked.blockers.includes('public_distribution_receipt_verified'))
assert.ok(blocked.hard_questions.some((question) => question.includes('Impeccable')))
assert.ok(blocked.hard_questions.some((question) => question.includes('operator packet')))

const evidenceReady = buildAtlasFrontendCompetitiveReadiness({
  artifactPlan,
  reports: {
    prepare_evidence: envelope('atlas.frontend.workspace_api.prepare_evidence.v1', {
      status: 'ready_for_provider_dispatch',
    }),
  },
})
assert.equal(evidenceReady.status, 'evidence_ready')
assert.equal(evidenceReady.proof_ladder.find((item) => item.id === 'evidence_kit_prepared')?.status, 'passed')
assert.ok(evidenceReady.blockers.includes('rival_replay_runner_kit_prepared'))
assert.ok(evidenceReady.blockers.includes('run_certified'))

const replayReady = buildAtlasFrontendCompetitiveReadiness({
  artifactPlan,
  reports: {
    prepare_evidence: envelope('atlas.frontend.workspace_api.prepare_evidence.v1', {
      status: 'ready_for_provider_dispatch',
    }),
    prepare_rival_replay: envelope('atlas.frontend.workspace_api.prepare_rival_replay.v1', {
      status: 'ready_for_external_rival_replay',
      operator_packet_verification_status: 'passed',
      action_queue: {
        schema_version: 'atlas.frontend.rival_replay_evidence_worklist.v1',
        status: 'pending',
        work_item_count: 15,
      },
    }),
  },
})
assert.equal(replayReady.status, 'rival_replay_prepared')
assert.equal(replayReady.proof_ladder.find((item) => item.id === 'rival_replay_runner_kit_prepared')?.status, 'passed')
assert.equal(replayReady.proof_ladder.find((item) => item.id === 'operator_packet_verified')?.status, 'passed')
assert.equal(replayReady.operator_packet_verification.status, 'passed')
assert.ok(replayReady.blockers.includes('external_rival_replay_receipts'))

const inspected = buildAtlasFrontendCompetitiveReadiness({
  artifactPlan,
  reports: {
    prepare_rival_replay: envelope('atlas.frontend.workspace_api.prepare_rival_replay.v1', {
      status: 'ready_for_external_rival_replay',
      operator_packet_verification_status: 'passed',
    }),
    inspect_rival_replay: envelope('atlas.frontend.workspace_api.inspect_rival_replay.v1', {
      status: 'ready_for_replay',
      action_queue: {
        schema_version: 'atlas.frontend.rival_replay_evidence_worklist.v1',
        status: 'pending',
        work_item_count: 15,
      },
      claim_policy: {
        may_claim_external_replay_completed: false,
        may_claim_world_best_frontend_system: false,
      },
      competitive_proof_contract: {
        status: 'external_replay_receipts_required',
        next_minimum_actions: ['run_external_rivals_against_unchanged_task_specs'],
        claim_policy: {
          may_claim_world_best_frontend_system: false,
        },
      },
    }),
  },
})
assert.equal(inspected.status, 'rival_replay_inspected')
assert.equal(inspected.proof_ladder.find((item) => item.id === 'rival_replay_inspected')?.status, 'passed')
assert.equal(inspected.proof_ladder.find((item) => item.id === 'rival_replay_action_queue_compiled')?.status, 'passed')
assert.equal(inspected.proof_ladder.find((item) => item.id === 'operator_packet_verified')?.status, 'passed')
assert.equal(inspected.proof_contract.status, 'external_replay_receipts_required')
assert.deepEqual(inspected.proof_contract.next_minimum_actions, ['run_external_rivals_against_unchanged_task_specs'])
assert.ok(inspected.blockers.includes('external_rival_replay_receipts'))

const proofBundleCompiled = buildAtlasFrontendCompetitiveReadiness({
  artifactPlan,
  reports: {
    prepare_rival_replay: envelope('atlas.frontend.workspace_api.prepare_rival_replay.v1', {
      status: 'ready_for_external_rival_replay',
      operator_packet_verification_status: 'passed',
    }),
    inspect_rival_replay: envelope('atlas.frontend.workspace_api.inspect_rival_replay.v1', {
      status: 'ready_for_replay',
      action_queue: {
        schema_version: 'atlas.frontend.rival_replay_evidence_worklist.v1',
        status: 'pending',
        work_item_count: 15,
      },
      claim_policy: {
        may_claim_external_replay_completed: false,
        may_claim_world_best_frontend_system: false,
      },
      competitive_proof_contract: {
        status: 'external_replay_receipts_required',
        claim_policy: {
          may_claim_world_best_frontend_system: false,
        },
      },
    }),
    proof_bundle: envelope('atlas.frontend.workspace_api.proof_bundle.v1', {
      status: 'pending_external_replay_evidence',
      proof_bundle_schema_version: 'atlas.frontend.rival_replay_competitive_proof_bundle.v1',
      readiness: {
        external_replay_completed: false,
      },
      required_next_actions: ['fill_and_hash_missing_rival_replay_evidence_packs'],
      claim_policy: {
        may_claim_world_best_frontend_system: false,
      },
    }),
  },
})
assert.equal(proofBundleCompiled.status, 'proof_bundle_compiled')
assert.equal(proofBundleCompiled.proof_ladder.find((item) => item.id === 'competitive_proof_bundle_compiled')?.status, 'passed')
assert.equal(proofBundleCompiled.proof_bundle.status, 'pending_external_replay_evidence')
assert.deepEqual(proofBundleCompiled.proof_bundle.required_next_actions, ['fill_and_hash_missing_rival_replay_evidence_packs'])
assert.ok(proofBundleCompiled.blockers.includes('external_rival_replay_receipts'))
assert.ok(proofBundleCompiled.blockers.includes('public_distribution_receipt_verified'))

const publicationVerified = buildAtlasFrontendCompetitiveReadiness({
  artifactPlan,
  reports: {
    publication_verify: envelope('atlas.frontend.workspace_api.publication_verify.v1', {
      status: 'public_verified',
      public_receipt_status: 'verified',
      required_next_actions: [],
      claim_policy: {
        public_distribution_claim_allowed: true,
      },
    }, {
      customer_handoff_allowed: true,
    }),
  },
})
assert.equal(publicationVerified.status, 'publication_verified')
assert.equal(publicationVerified.proof_ladder.find((item) => item.id === 'public_distribution_receipt_verified')?.status, 'passed')
assert.equal(publicationVerified.publication.status, 'public_verified')
assert.equal(publicationVerified.publication.public_receipt_status, 'verified')

const handoffReady = buildAtlasFrontendCompetitiveReadiness({
  artifactPlan,
  reports: {
    prepare_evidence: envelope('atlas.frontend.workspace_api.prepare_evidence.v1', {
      status: 'ready_for_provider_dispatch',
    }),
    prepare_rival_replay: envelope('atlas.frontend.workspace_api.prepare_rival_replay.v1', {
      status: 'ready_for_external_rival_replay',
      operator_packet_verification_status: 'passed',
    }),
    run_certification: envelope('atlas.frontend.workspace_api.run_certification.v1', {
      status: 'certified',
    }, {
      frontend_completion_claim_allowed: true,
    }),
    handoff: envelope('atlas.frontend.workspace_api.delivery_handoff.v1', {
      status: 'ready',
    }, {
      customer_handoff_allowed: true,
    }),
  },
})
assert.equal(handoffReady.status, 'certified_handoff_ready')
assert.equal(handoffReady.claim_policy.local_certification_is_not_world_best_proof, true)
assert.equal(handoffReady.proof_ladder.find((item) => item.id === 'external_rival_replay_receipts')?.status, 'missing')
assert.ok(handoffReady.blockers.includes('external_rival_replay_receipts'))

const worldBestReady = buildAtlasFrontendCompetitiveReadiness({
  artifactPlan,
  reports: {
    prepare_rival_replay: envelope('atlas.frontend.workspace_api.prepare_rival_replay.v1', {
      status: 'ready_for_external_rival_replay',
      operator_packet_verification_status: 'passed',
    }),
    inspect_rival_replay: envelope('atlas.frontend.workspace_api.inspect_rival_replay.v1', {
      status: 'ready',
      action_queue: {
        schema_version: 'atlas.frontend.rival_replay_evidence_worklist.v1',
        status: 'ready',
        work_item_count: 0,
      },
      claim_policy: {
        may_claim_external_replay_completed: true,
        may_claim_world_best_frontend_system: true,
      },
      competitive_proof_contract: {
        status: 'world_best_proof_ready',
        next_minimum_actions: ['preserve_verified_replay_evidence_and_publish_world_best_proof_packet'],
        claim_policy: {
          may_claim_world_best_frontend_system: true,
        },
      },
    }, {
      world_best_claim_allowed: true,
    }),
    proof_bundle: envelope('atlas.frontend.workspace_api.proof_bundle.v1', {
      status: 'world_best_replay_proof_ready',
      proof_bundle_schema_version: 'atlas.frontend.rival_replay_competitive_proof_bundle.v1',
      readiness: {
        external_replay_completed: true,
      },
      required_next_actions: ['preserve_verified_replay_evidence_and_attach_public_distribution_receipt_before_product_world_best_claim'],
      claim_policy: {
        may_claim_world_best_frontend_system: true,
      },
    }, {
      world_best_claim_allowed: true,
    }),
    publication_verify: envelope('atlas.frontend.workspace_api.publication_verify.v1', {
      status: 'public_verified',
      public_receipt_status: 'verified',
      claim_policy: {
        public_distribution_claim_allowed: true,
      },
    }, {
      customer_handoff_allowed: true,
    }),
  },
})
assert.equal(worldBestReady.status, 'world_best_proof_ready')
assert.equal(worldBestReady.claim_policy.world_best_claim_allowed, true)
assert.equal(worldBestReady.proof_ladder.find((item) => item.id === 'external_rival_replay_receipts')?.status, 'passed')
assert.equal(worldBestReady.proof_ladder.find((item) => item.id === 'operator_packet_verified')?.status, 'passed')
assert.equal(worldBestReady.proof_ladder.find((item) => item.id === 'competitive_proof_bundle_compiled')?.status, 'passed')
assert.equal(worldBestReady.proof_ladder.find((item) => item.id === 'public_distribution_receipt_verified')?.status, 'passed')
assert.equal(worldBestReady.proof_ladder.find((item) => item.id === 'competitive_proof_contract_ready')?.status, 'passed')
assert.equal(worldBestReady.proof_contract.status, 'world_best_proof_ready')
assert.equal(worldBestReady.operator_packet_verification.status, 'passed')
assert.equal(worldBestReady.proof_bundle.status, 'world_best_replay_proof_ready')

console.log('ok - Atlas Frontend competitive readiness keeps rival proof honest')
