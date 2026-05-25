/// <reference types="node" />

import assert from 'node:assert/strict'

import {
  extractAtlasFrontendPortfolioCandidates,
  extractAtlasFrontendSuggestedFrontendApp,
  joinAtlasFrontendLocalPath,
} from '../workspaceSelection.ts'

const portfolio = {
  schema_version: 'atlas.frontend.company_portfolio.v1',
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

console.log('ok - Atlas Frontend workspace selection turns portfolio candidates into selected-repo cockpit state')
