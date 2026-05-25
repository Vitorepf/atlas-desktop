/// <reference types="node" />

import assert from 'node:assert/strict'

import {
  extractAtlasFrontendOperatorFlow,
  extractAtlasFrontendPortfolioCandidates,
  extractAtlasFrontendSuggestedFrontendApp,
  joinAtlasFrontendLocalPath,
} from '../workspaceSelection.ts'

const portfolio = {
  schema_version: 'atlas.frontend.company_portfolio.v1',
  operator_flow: {
    schema_version: 'atlas.frontend.company_portfolio.operator_flow.v1',
    status: 'ready_for_repository_choice',
    purpose: 'drive_atlas_ai_or_atlas_code_from_parent_folder_to_selected_repo_frontend_runtime',
    stages: [
      {
        id: 'choose_one_repository',
        status: 'ready',
        surface: 'operator_choice',
        contract: 'atlas.frontend.selected_workspace.v1',
        command: 'php artisan atlas:frontend:selected-workspace --workspace=<chosen-repo> --json --strict',
        execution_allowed: false,
      },
      {
        id: 'activate_atlas_code_project_workspace',
        status: 'ready_after_repository_selection',
        surface: 'atlas_code',
        contract: 'atlas.frontend.selected_workspace.project_activation.v1',
        endpoint: '/atlas-code/frontend/project-activation',
        execution_allowed: false,
      },
    ],
    invariants: {
      selected_repository_is_primary_workspace: true,
      frontend_app_is_relative_subscope_only: true,
      portfolio_root_is_inventory_only: true,
      provider_dispatch_requires_pre_execution_gate: true,
      selection_or_activation_is_not_delivery_evidence: true,
      space_runtime_required: false,
      public_superiority_claims_disabled: true,
    },
    claim_policy: {
      operator_flow_is_not_execution_evidence: true,
      raw_absolute_paths_returned: false,
      provider_dispatch_allowed: false,
      world_best_claim_allowed: false,
    },
  },
  repositories: [
    {
      repo_ref: {
        relative_name: 'shop',
        relative_name_hash: 'hash-shop',
        workspace_hash: 'workspace-hash',
      },
      status: 'ready_for_operator_execution',
      candidate_score: 94,
      framework: 'next',
      frontend_app_candidate_summary: {
        status: 'nested_frontend_app_candidate_recommended',
        candidate_count: 2,
      },
    },
    {
      repo_ref: {
        relative_name: 'admin',
      },
      status: 'prepared_needs_context',
      candidate_score: 61,
      framework: 'vite',
      frontend_app_candidate_summary: {
        status: 'root_frontend_app_candidate',
        candidate_count: 1,
      },
    },
  ],
}

const candidates = extractAtlasFrontendPortfolioCandidates(portfolio, '/Users/example/company/')
assert.equal(candidates.length, 2)
assert.equal(candidates[0]!.label, 'shop')
assert.equal(candidates[0]!.workspace, '/Users/example/company/shop')
assert.equal(candidates[0]!.status, 'ready_for_operator_execution')
assert.equal(candidates[0]!.score, 94)
assert.equal(candidates[0]!.framework, 'next')
assert.equal(candidates[0]!.frontendAppCandidateStatus, 'nested_frontend_app_candidate_recommended')
assert.equal(candidates[0]!.frontendAppCandidateCount, 2)
assert.equal(candidates[0]!.claim_policy.selected_repository_is_primary_workspace, true)
assert.equal(candidates[0]!.claim_policy.frontend_app_is_subscope_only, true)
assert.equal(candidates[0]!.claim_policy.space_runtime_required, false)
assert.equal(candidates[0]!.claim_policy.portfolio_candidate_is_not_execution_evidence, true)
assert.equal(candidates[1]!.workspace, '/Users/example/company/admin')

assert.equal(joinAtlasFrontendLocalPath('/Users/example/company/', '.'), '/Users/example/company')
assert.equal(joinAtlasFrontendLocalPath('/Users/example/company', '/apps/web/'), '/Users/example/company/apps/web')

assert.equal(extractAtlasFrontendSuggestedFrontendApp({
  frontend_app_candidates: {
    primary_candidate_relative_name: '/apps/web/',
  },
}), 'apps/web')

assert.equal(extractAtlasFrontendSuggestedFrontendApp({
  frontend_app_candidates: {
    primary_candidate_relative_name: '.',
  },
}), null)

assert.deepEqual(extractAtlasFrontendPortfolioCandidates({ repositories: 'unsafe' }, '/Users/example/company'), [])

const operatorFlow = extractAtlasFrontendOperatorFlow(portfolio)
assert.equal(operatorFlow?.schema_version, 'atlas.frontend.company_portfolio.operator_flow.v1')
assert.equal(operatorFlow?.status, 'ready_for_repository_choice')
assert.equal(operatorFlow?.purpose, 'drive_atlas_ai_or_atlas_code_from_parent_folder_to_selected_repo_frontend_runtime')
assert.equal(operatorFlow?.stages.length, 2)
assert.equal(operatorFlow?.stages[0]!.id, 'choose_one_repository')
assert.equal(operatorFlow?.stages[1]!.endpoint, '/atlas-code/frontend/project-activation')
assert.equal(operatorFlow?.invariants.selected_repository_is_primary_workspace, true)
assert.equal(operatorFlow?.invariants.frontend_app_is_relative_subscope_only, true)
assert.equal(operatorFlow?.invariants.space_runtime_required, false)
assert.equal(operatorFlow?.claim_policy.provider_dispatch_allowed, false)
assert.equal(operatorFlow?.claim_policy.raw_absolute_paths_returned, false)
assert.equal(extractAtlasFrontendOperatorFlow({ operator_flow: { schema_version: 'unknown' } }), null)

console.log('ok - Atlas Frontend workspace selection turns portfolio candidates into selected-repo cockpit state')
