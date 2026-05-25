/// <reference types="node" />

import assert from 'node:assert/strict'

import { buildAtlasFrontendArtifactPlan } from '../artifactDefaults.ts'

const plan = buildAtlasFrontendArtifactPlan({
  workspace: '/Users/example/company/shop/',
  frontendApp: '/apps/web/',
  task: "Melhorar checkout d'empresa",
})

assert.equal(plan.schema_version, 'atlas.frontend.desktop_artifact_defaults.v1')
assert.equal(plan.status, 'ready')
assert.equal(plan.workspace, '/Users/example/company/shop')
assert.equal(plan.frontend_app, 'apps/web')
assert.equal(plan.evidence_directory, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web')
assert.equal(plan.selection_receipt, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/selection-receipt.json')
assert.equal(plan.provider_packet, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/provider-instruction-packet.json')
assert.equal(plan.visual_report, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/visual-quality-report.json')
assert.equal(plan.design_review_report, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/design-review-report.json')
assert.equal(plan.quality_budget_report, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/quality-budget-report.json')
assert.equal(plan.evidence_manifest, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/evidence/evidence-pack.json')
assert.equal(plan.evidence_root, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/evidence')
assert.equal(plan.product_proof_bundle, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/product-proof')
assert.equal(plan.publication_receipt, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/publication-receipt.json')
assert.equal(plan.publication_report, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/publication-report.json')
assert.equal(plan.rival_replay_directory, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay')
assert.equal(plan.rival_replay_runner_kit, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay/replay-runner-kit.json')
assert.equal(plan.rival_replay_worklist, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay/replay-evidence-worklist.json')
assert.equal(plan.rival_replay_proof_contract, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay/replay-competitive-proof-contract.json')
assert.equal(plan.rival_replay_operator_packet, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay/replay-operator-packet.json')
assert.equal(plan.rival_replay_proof_bundle, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay/replay-competitive-proof-bundle.json')
assert.equal(plan.outcome_store, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/outcomes.jsonl')
assert.equal(plan.run_certification_report, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/run-certification.json')
assert.equal(plan.delivery_handoff_report, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/delivery-handoff.json')
assert.equal(plan.claim_policy.selected_repository_is_primary_workspace, true)
assert.equal(plan.claim_policy.frontend_app_is_subscope_only, true)
assert.equal(plan.claim_policy.space_runtime_required, false)
assert.equal(plan.claim_policy.commands_are_suggestions_only, true)
assert.equal(plan.claim_policy.provider_dispatch_performed, false)
assert.equal(plan.claim_policy.world_best_claim_allowed, false)
assert.match(plan.commands.provider_packet, /atlas:frontend:provider-packet/)
assert.match(plan.commands.selection_receipt, /atlas:frontend:selected-workspace/)
assert.match(plan.commands.selection_receipt, /--selection-receipt/)
assert.match(plan.commands.selection_receipt, /--output='\/Users\/example\/company\/shop\/\.atlas\/frontend-evidence\/apps-web\/selection-receipt\.json'/)
assert.match(plan.commands.provider_packet, /--frontend-app='apps\/web'/)
assert.match(plan.commands.provider_packet, /Melhorar checkout d'\\''empresa/)
assert.match(plan.commands.control_plane, /atlas:frontend:control-plane/)
assert.match(plan.commands.control_plane, /--rival-evidence='\/Users\/example\/company\/shop\/\.atlas\/frontend-evidence\/apps-web\/rival-replay'/)
assert.match(plan.commands.evidence_kit, /atlas:frontend:evidence-kit prepare/)
assert.match(plan.commands.rival_replay, /atlas:frontend:replay operator-packet/)
assert.match(plan.commands.rival_replay_proof_bundle, /atlas:frontend:replay proof-bundle/)
assert.match(plan.commands.publication_receipt_template, /atlas:frontend:publish receipt-template/)
assert.match(plan.commands.publication_verify, /atlas:frontend:publish verify/)
assert.match(plan.commands.run_certification, /atlas:frontend:run-certify/)
assert.match(plan.commands.run_certification, /--publication-receipt='\/Users\/example\/company\/shop\/\.atlas\/frontend-evidence\/apps-web\/publication-receipt\.json'/)
assert.match(plan.commands.run_certification, /--evidence-root='\/Users\/example\/company\/shop\/\.atlas\/frontend-evidence\/apps-web\/evidence'/)
assert.match(plan.commands.handoff, /atlas:frontend:handoff compile/)
assert.match(plan.commands.handoff, /--publication-report='\/Users\/example\/company\/shop\/\.atlas\/frontend-evidence\/apps-web\/publication-report\.json'/)

const blocked = buildAtlasFrontendArtifactPlan({ workspace: '', frontendApp: 'apps/web' })
assert.equal(blocked.status, 'blocked')
assert.deepEqual(blocked.blockers, ['selected_workspace_missing'])
assert.equal(blocked.claim_policy.space_runtime_required, false)

console.log('ok - Atlas Frontend artifact defaults derive evidence and handoff paths from the selected repo')
