/// <reference types="node" />

import assert from 'node:assert/strict'

import {
  activateAtlasFrontendProjectWorkspace,
  applyAtlasFrontendReplayPatch,
  certifyAtlasFrontendRun,
  compileAtlasFrontendHandoff,
  compileAtlasFrontendProofBundle,
  inspectAtlasFrontendControlPlane,
  inspectAtlasFrontendRivalReplay,
  planAtlasFrontendCompetitiveBenchmark,
  prepareAtlasFrontendEvidence,
  prepareAtlasFrontendReplayExternalReceiptTemplate,
  prepareAtlasFrontendReplayScoreTemplate,
  prepareAtlasFrontendPublicationReceipt,
  prepareAtlasFrontendRivalReplay,
  projectAtlasFrontendRuntime,
  runAtlasFrontendLiveSourcePatch,
  scanAtlasFrontendPortfolio,
  selectAtlasFrontendWorkspace,
  suggestAtlasFrontendLiveTargets,
  syncAtlasFrontendLiveVisualSelection,
  verifyAtlasFrontendPublication,
  writeAtlasFrontendSelectionReceipt,
} from '../api.ts'

const cases: Array<{ name: string; run: () => Promise<void> }> = []
function test(name: string, run: () => Promise<void>): void {
  cases.push({ name, run })
}

type FetchInit = { method?: string; headers?: HeadersInit; body?: BodyInit }
type FetchCall = { url: string; init: FetchInit }

interface StubResponse {
  status?: number
  ok?: boolean
  jsonBody?: unknown
  textBody?: string
}

function installFetch(stub: (input: { url: string; init: FetchInit }) => StubResponse): {
  calls: FetchCall[]
  restore: () => void
} {
  const calls: FetchCall[] = []
  const original = globalThis.fetch
  globalThis.fetch = ((input: unknown, init?: FetchInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input as Request).url
    const safeInit = init ?? {}
    calls.push({ url, init: safeInit })
    const result = stub({ url, init: safeInit })
    const status = result.status ?? (result.ok === false ? 400 : 200)
    const ok = result.ok ?? (status >= 200 && status < 300)
    const text = result.textBody ?? (result.jsonBody !== undefined ? JSON.stringify(result.jsonBody) : '')
    const response = {
      ok,
      status,
      headers: new Headers(),
      url,
      async json() {
        return text === '' ? {} : JSON.parse(text)
      },
      async text() {
        return text
      },
      get body() {
        return null
      },
    } as unknown as Response
    return Promise.resolve(response)
  }) as typeof fetch
  return {
    calls,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

function meta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    selected_repository_is_primary_workspace: true,
    frontend_app_is_subscope_only: true,
    space_runtime_required: false,
    provider_dispatch_performed: false,
    world_best_claim_allowed: false,
    ...extra,
  }
}

test('portfolio client scans local repo folder through Atlas Code frontend endpoint', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.portfolio.v1',
      surface: 'atlas_code_frontend_workspace_selection',
      portfolio: { schema_version: 'atlas.frontend.company_portfolio.v1', summary: { candidate_repo_count: 2 } },
      meta: meta({ provider_dispatch_allowed: false }),
    },
  }))
  try {
    const result = await scanAtlasFrontendPortfolio({
      root: '/Users/example/company',
      task: 'melhorar checkout',
      max_depth: 2,
      max_repos: 20,
    })

    assert.equal(result.schema_version, 'atlas.frontend.workspace_api.portfolio.v1')
    assert.equal(result.surface, 'atlas_code_frontend_workspace_selection')
    assert.equal(result.status_code, 200)
    assert.equal(result.transport_status, 'ok')
    assert.deepEqual(result.payload, {
      schema_version: 'atlas.frontend.company_portfolio.v1',
      summary: { candidate_repo_count: 2 },
    })
    assert.equal(stub.calls[0]!.url.includes('/api/atlas-code/frontend/portfolio?'), true)
    assert.equal(stub.calls[0]!.url.includes('root=%2FUsers%2Fexample%2Fcompany'), true)
  } finally {
    stub.restore()
  }
})

test('selected workspace client posts repo as primary workspace and frontend app as subscope', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.selected_workspace.v1',
      surface: 'atlas_code_frontend_workspace_selection',
      selected_workspace: {
        schema_version: 'atlas.frontend.selected_workspace.v1',
        status: 'selected',
      },
      meta: meta({ execution_allowed: true }),
    },
  }))
  try {
    const result = await selectAtlasFrontendWorkspace({
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'criar dashboard',
    })

    assert.equal(result.transport_status, 'ok')
    assert.equal(result.meta.selected_repository_is_primary_workspace, true)
    assert.equal(result.meta.frontend_app_is_subscope_only, true)
    assert.equal(result.meta.space_runtime_required, false)
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/selected-workspace')
    assert.equal(stub.calls[0]!.init.method, 'POST')
    assert.deepEqual(JSON.parse(String(stub.calls[0]!.init.body)), {
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'criar dashboard',
    })
  } finally {
    stub.restore()
  }
})

test('selection receipt client writes selected repo receipt without authorizing execution', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.selection_receipt.v1',
      surface: 'atlas_code_frontend_workspace_selection_receipt',
      selection_receipt: {
        schema_version: 'atlas.frontend.selected_workspace.selection_receipt.v1',
        status: 'ready',
        runtime_policy: {
          selected_repository_is_primary_workspace: true,
          frontend_app_is_subscope_only: true,
          space_runtime_required: false,
        },
      },
      meta: meta({ execution_allowed: false, provider_dispatch_allowed: false }),
    },
  }))
  try {
    const result = await writeAtlasFrontendSelectionReceipt({
      portfolio_root: '/Users/example/company',
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'selecionar repo',
      output: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/selection-receipt.json',
    })

    assert.equal(result.schema_version, 'atlas.frontend.workspace_api.selection_receipt.v1')
    assert.equal(result.surface, 'atlas_code_frontend_workspace_selection_receipt')
    assert.equal(result.meta.provider_dispatch_allowed, false)
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/selection-receipt')
    assert.equal(stub.calls[0]!.init.method, 'POST')
    assert.deepEqual(JSON.parse(String(stub.calls[0]!.init.body)), {
      portfolio_root: '/Users/example/company',
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'selecionar repo',
      output: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/selection-receipt.json',
    })
  } finally {
    stub.restore()
  }
})

test('project activation client persists selected repo as Atlas Code workspace without dispatch', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.project_activation.v1',
      surface: 'atlas_code_frontend_project_workspace_activation',
      project_activation: {
        schema_version: 'atlas.frontend.selected_workspace.project_activation.v1',
        status: 'ready',
        project_workspace: {
          slug: 'shop',
          name: 'Shop',
          workspace_path_exists: true,
        },
        runtime_policy: {
          selected_repository_is_primary_workspace: true,
          atlas_code_project_workspace_persisted: true,
          frontend_app_is_subscope_only: true,
          space_runtime_required: false,
          provider_dispatch_performed: false,
        },
      },
      meta: meta({ execution_allowed: false, provider_dispatch_allowed: false }),
    },
  }))
  try {
    const result = await activateAtlasFrontendProjectWorkspace({
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'ativar projeto',
      project_slug: 'shop',
      project_name: 'Shop',
    })

    assert.equal(result.schema_version, 'atlas.frontend.workspace_api.project_activation.v1')
    assert.equal(result.surface, 'atlas_code_frontend_project_workspace_activation')
    assert.equal(result.meta.provider_dispatch_allowed, false)
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/project-activation')
    assert.equal(stub.calls[0]!.init.method, 'POST')
    assert.deepEqual(JSON.parse(String(stub.calls[0]!.init.body)), {
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'ativar projeto',
      project_slug: 'shop',
      project_name: 'Shop',
    })
  } finally {
    stub.restore()
  }
})

test('runtime projection client preserves blocked 422 payload for operator cockpit', async () => {
  const stub = installFetch(() => ({
    status: 422,
    ok: false,
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.runtime_projection.v1',
      surface: 'atlas_code_frontend_runtime_projection',
      runtime_projection: {
        schema_version: 'atlas.frontend.workspace_runtime_projection.v1',
        status: 'blocked',
        blockers: ['selected_workspace_missing'],
      },
      meta: meta({ execution_allowed: false }),
    },
  }))
  try {
    const result = await projectAtlasFrontendRuntime({
      workspace: '/missing/repo',
      task: 'criar dashboard',
    })

    assert.equal(result.status_code, 422)
    assert.equal(result.transport_status, 'blocked')
    assert.deepEqual(result.payload, {
      schema_version: 'atlas.frontend.workspace_runtime_projection.v1',
      status: 'blocked',
      blockers: ['selected_workspace_missing'],
    })
  } finally {
    stub.restore()
  }
})

test('control plane client posts selected repo proof scope and preserves warning payload', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.control_plane.v1',
      surface: 'atlas_code_frontend_control_plane',
      control_plane: {
        schema_version: 'atlas.frontend.control_plane.v1',
        status: 'warning',
        readiness_levels: {
          external_replay_ready: false,
          public_distribution_ready: false,
        },
        claim_policy: {
          may_claim_more_complete_than_impeccable: false,
          private_benchmark_for_internal_improvement_only: true,
          world_best_claim_allowed: false,
        },
      },
      meta: meta({ provider_dispatch_allowed: true, world_best_claim_allowed: false }),
    },
  }))
  try {
    const result = await inspectAtlasFrontendControlPlane({
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'auditar readiness',
      rival_evidence: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay',
      bundle: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/product-proof',
      publication_receipt: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/publication-receipt.json',
    })

    assert.equal(result.status_code, 200)
    assert.equal(result.transport_status, 'ok')
    assert.equal(result.surface, 'atlas_code_frontend_control_plane')
    assert.deepEqual(result.payload, {
      schema_version: 'atlas.frontend.control_plane.v1',
      status: 'warning',
      readiness_levels: {
        external_replay_ready: false,
        public_distribution_ready: false,
      },
      claim_policy: {
        may_claim_more_complete_than_impeccable: false,
        private_benchmark_for_internal_improvement_only: true,
        world_best_claim_allowed: false,
      },
    })
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/control-plane')
    assert.equal(JSON.parse(String(stub.calls[0]!.init.body)).rival_evidence, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay')
  } finally {
    stub.restore()
  }
})

test('prepare evidence client posts selected repo artifact output and preserves blocked payload', async () => {
  const stub = installFetch(() => ({
    status: 422,
    ok: false,
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.prepare_evidence.v1',
      surface: 'atlas_code_frontend_evidence_preparation',
      evidence_preparation: {
        schema_version: 'atlas.frontend.workspace_evidence_preparation.v1',
        status: 'blocked',
        blockers: ['scenario_matrix_not_ready'],
        claim_policy: {
          raw_absolute_path_returned: false,
          space_runtime_required: false,
        },
      },
      meta: meta({ provider_dispatch_allowed: false, frontend_completion_claim_allowed: false }),
    },
  }))
  try {
    const result = await prepareAtlasFrontendEvidence({
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'melhorar checkout',
      output: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web',
      acceptance_criteria: false,
      test_plan: true,
      visual_quality_plan: true,
      evidence_plan: true,
    })

    assert.equal(result.status_code, 422)
    assert.equal(result.transport_status, 'blocked')
    assert.equal(result.surface, 'atlas_code_frontend_evidence_preparation')
    assert.deepEqual(result.payload, {
      schema_version: 'atlas.frontend.workspace_evidence_preparation.v1',
      status: 'blocked',
      blockers: ['scenario_matrix_not_ready'],
      claim_policy: {
        raw_absolute_path_returned: false,
        space_runtime_required: false,
      },
    })
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/prepare-evidence')
    assert.equal(JSON.parse(String(stub.calls[0]!.init.body)).output, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web')
  } finally {
    stub.restore()
  }
})

test('prepare rival replay client posts selected repo replay directory without authorizing claims', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.prepare_rival_replay.v1',
      surface: 'atlas_code_frontend_rival_replay_preparation',
      rival_replay_preparation: {
        schema_version: 'atlas.frontend.workspace_rival_replay_preparation.v1',
        status: 'ready_for_external_rival_replay',
        run_packet_count: 15,
        blockers: ['external_rival_replay_receipts_missing'],
        claim_policy: {
          world_best_claim_allowed: false,
          raw_absolute_path_returned: false,
        },
      },
      meta: meta({ provider_dispatch_allowed: false, frontend_completion_claim_allowed: false }),
    },
  }))
  try {
    const result = await prepareAtlasFrontendRivalReplay({
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'provar superioridade',
      output: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay',
    })

    assert.equal(result.status_code, 200)
    assert.equal(result.transport_status, 'ok')
    assert.equal(result.surface, 'atlas_code_frontend_rival_replay_preparation')
    assert.deepEqual(result.payload, {
      schema_version: 'atlas.frontend.workspace_rival_replay_preparation.v1',
      status: 'ready_for_external_rival_replay',
      run_packet_count: 15,
      blockers: ['external_rival_replay_receipts_missing'],
      claim_policy: {
        world_best_claim_allowed: false,
        raw_absolute_path_returned: false,
      },
    })
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/prepare-rival-replay')
    assert.equal(JSON.parse(String(stub.calls[0]!.init.body)).output, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay')
  } finally {
    stub.restore()
  }
})

test('inspect rival replay client reads safe replay summary and claim policy', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.inspect_rival_replay.v1',
      surface: 'atlas_code_frontend_rival_replay_inspection',
      rival_replay_inspection: {
        schema_version: 'atlas.frontend.workspace_rival_replay_inspection.v1',
        status: 'ready_for_replay',
        summary: { total_runs: 15, external_replay_completed: false },
        claim_policy: {
          may_claim_world_best_frontend_system: false,
          raw_absolute_path_returned: false,
        },
      },
      meta: meta({ world_best_claim_allowed: false }),
    },
  }))
  try {
    const result = await inspectAtlasFrontendRivalReplay({
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'inspecionar replay',
      evidence: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay',
    })

    assert.equal(result.status_code, 200)
    assert.equal(result.transport_status, 'ok')
    assert.equal(result.surface, 'atlas_code_frontend_rival_replay_inspection')
    assert.deepEqual(result.payload, {
      schema_version: 'atlas.frontend.workspace_rival_replay_inspection.v1',
      status: 'ready_for_replay',
      summary: { total_runs: 15, external_replay_completed: false },
      claim_policy: {
        may_claim_world_best_frontend_system: false,
        raw_absolute_path_returned: false,
      },
    })
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/inspect-rival-replay')
    assert.equal(JSON.parse(String(stub.calls[0]!.init.body)).evidence, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay')
  } finally {
    stub.restore()
  }
})

test('replay apply patch client applies provider safe manifest patch without claims', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.replay_apply_patch.v1',
      surface: 'atlas_code_frontend_rival_replay_manifest_patch_application',
      rival_replay_manifest_patch_application: {
        schema_version: 'atlas.frontend.workspace_rival_replay_manifest_patch_application.v1',
        status: 'applied',
        applied_keys: ['external_execution_receipt'],
        write_performed: true,
        claim_policy: {
          manifest_patch_application_is_not_world_best_evidence: true,
          raw_absolute_path_returned: false,
        },
      },
      meta: meta({ world_best_claim_allowed: false }),
    },
  }))
  try {
    const result = await applyAtlasFrontendReplayPatch({
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'aplicar receipt externo',
      evidence: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay',
      patch: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay/external-patch.json',
    })

    assert.equal(result.status_code, 200)
    assert.equal(result.transport_status, 'ok')
    assert.equal(result.surface, 'atlas_code_frontend_rival_replay_manifest_patch_application')
    assert.deepEqual(result.payload, {
      schema_version: 'atlas.frontend.workspace_rival_replay_manifest_patch_application.v1',
      status: 'applied',
      applied_keys: ['external_execution_receipt'],
      write_performed: true,
      claim_policy: {
        manifest_patch_application_is_not_world_best_evidence: true,
        raw_absolute_path_returned: false,
      },
    })
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/replay-apply-patch')
    assert.equal(JSON.parse(String(stub.calls[0]!.init.body)).patch, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay/external-patch.json')
  } finally {
    stub.restore()
  }
})

test('replay template clients generate provider safe patch templates without claims', async () => {
  const stub = installFetch(({ url }) => {
    if (url.endsWith('/atlas-code/frontend/replay-external-receipt-template')) {
      return {
        jsonBody: {
          schema_version: 'atlas.frontend.workspace_api.replay_external_receipt_template.v1',
          surface: 'atlas_code_frontend_rival_replay_external_receipt_template',
          rival_replay_external_receipt_template: {
            schema_version: 'atlas.frontend.workspace_rival_replay_external_receipt_template.v1',
            status: 'ready',
            claim_policy: {
              template_is_not_replay_evidence: true,
              raw_absolute_path_returned: false,
            },
          },
          meta: meta({ world_best_claim_allowed: false }),
        },
      }
    }

    return {
      jsonBody: {
        schema_version: 'atlas.frontend.workspace_api.replay_score_template.v1',
        surface: 'atlas_code_frontend_rival_replay_score_template',
        rival_replay_score_template: {
          schema_version: 'atlas.frontend.workspace_rival_replay_score_template.v1',
          status: 'ready',
          claim_policy: {
            template_is_not_replay_evidence: true,
            raw_absolute_path_returned: false,
          },
        },
        meta: meta({ world_best_claim_allowed: false }),
      },
    }
  })
  try {
    const base = {
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'gerar templates replay',
      evidence: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay',
      case_id: 'saas_dashboard_repair',
      system: 'pbakaus_impeccable',
    }
    const receipt = await prepareAtlasFrontendReplayExternalReceiptTemplate(base)
    const score = await prepareAtlasFrontendReplayScoreTemplate(base)

    assert.equal(receipt.surface, 'atlas_code_frontend_rival_replay_external_receipt_template')
    assert.equal(score.surface, 'atlas_code_frontend_rival_replay_score_template')
    assert.equal((receipt.payload as { status: string }).status, 'ready')
    assert.equal((score.payload as { status: string }).status, 'ready')
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/replay-external-receipt-template')
    assert.equal(stub.calls[1]!.url, '/api/atlas-code/frontend/replay-score-template')
    assert.equal(JSON.parse(String(stub.calls[0]!.init.body)).case_id, 'saas_dashboard_repair')
    assert.equal(JSON.parse(String(stub.calls[1]!.init.body)).system, 'pbakaus_impeccable')
  } finally {
    stub.restore()
  }
})

test('proof bundle client compiles selected repo competitive proof index without claims', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.proof_bundle.v1',
      surface: 'atlas_code_frontend_competitive_proof_bundle',
      rival_replay_proof_bundle: {
        schema_version: 'atlas.frontend.workspace_competitive_proof_bundle.v1',
        status: 'pending_external_replay_evidence',
        proof_bundle_schema_version: 'atlas.frontend.rival_replay_competitive_proof_bundle.v1',
        claim_policy: {
          proof_bundle_is_not_raw_artifact_storage: true,
          may_claim_world_best_frontend_system: false,
          raw_absolute_path_returned: false,
        },
      },
      meta: meta({ world_best_claim_allowed: false }),
    },
  }))
  try {
    const result = await compileAtlasFrontendProofBundle({
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'compilar proof bundle',
      evidence: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay',
    })

    assert.equal(result.status_code, 200)
    assert.equal(result.transport_status, 'ok')
    assert.equal(result.surface, 'atlas_code_frontend_competitive_proof_bundle')
    assert.deepEqual(result.payload, {
      schema_version: 'atlas.frontend.workspace_competitive_proof_bundle.v1',
      status: 'pending_external_replay_evidence',
      proof_bundle_schema_version: 'atlas.frontend.rival_replay_competitive_proof_bundle.v1',
      claim_policy: {
        proof_bundle_is_not_raw_artifact_storage: true,
        may_claim_world_best_frontend_system: false,
        raw_absolute_path_returned: false,
      },
    })
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/proof-bundle')
    assert.equal(JSON.parse(String(stub.calls[0]!.init.body)).evidence, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay')
  } finally {
    stub.restore()
  }
})

test('competitive benchmark plan client reads improvement action queue without authorizing claims', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.competitive_benchmark_plan.v1',
      surface: 'atlas_code_frontend_competitive_benchmark_plan',
      competitive_benchmark_plan: {
        schema_version: 'atlas.frontend.competitive_benchmark_plan.v1',
        status: 'blocked',
        plan_type: 'private_competitive_benchmark_and_improvement_loop',
        next_private_improvement_action: {
          id: 'improve_live_visual_iteration',
          suggested_action: 'improve_atlas_frontend_until_private_benchmark_leads_scenario',
        },
        next_private_work_packet: {
          schema_version: 'atlas.frontend.private_improvement_work_packet.v1',
          target_scenario_id: 'live_visual_iteration',
          safe_execution_commands: [
            'php artisan atlas:frontend:live prepare --workspace=<repo> --file=<relative-file> --target=<exact-snippet> --variant=<id:path> --json',
          ],
        },
        private_policy: {
          public_claims_disabled: true,
          world_best_claim_allowed: false,
        },
      },
      meta: meta({ world_best_claim_allowed: false }),
    },
  }))
  try {
    const result = await planAtlasFrontendCompetitiveBenchmark({
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'planejar benchmark competitivo',
      rival_evidence: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay',
      bundle: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/product-proof',
      publication_receipt: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/publication-receipt.json',
    })

    assert.equal(result.schema_version, 'atlas.frontend.workspace_api.competitive_benchmark_plan.v1')
    assert.equal(result.surface, 'atlas_code_frontend_competitive_benchmark_plan')
    assert.equal((result.payload as { status: string }).status, 'blocked')
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/competitive-benchmark-plan')
    const body = JSON.parse(String(stub.calls[0]!.init.body))
    assert.equal(body.rival_evidence, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/rival-replay')
    assert.equal(result.meta.world_best_claim_allowed, false)
  } finally {
    stub.restore()
  }
})

test('live source patch client prepares workspace-scoped variant file without authorizing claims', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.live_source_patch.v1',
      surface: 'atlas_code_frontend_live_source_patch',
      live_source_patch: {
        schema_version: 'atlas.frontend.live_source_patch_result.v1',
        operation: 'prepare',
        status: 'prepared',
        session: {
          visual_selection: {
            schema_version: 'atlas.frontend.live_visual_selection.v1',
            status: 'provided',
            selection_hash: 'a'.repeat(64),
            policy: {
              raw_text_returned: false,
            },
          },
        },
        decision_receipt: {
          schema_version: 'atlas.frontend.live_source_patch_decision_receipt.v1',
          visual_selection_status: 'provided',
          visual_selection_hash: 'a'.repeat(64),
          claim_policy: {
            receipt_is_decision_evidence_not_delivery_completion: true,
            visual_selection_is_not_visual_quality_proof: true,
          },
        },
        claim_policy: {
          live_patch_decision_is_not_delivery_evidence: true,
        },
      },
      meta: meta({ execution_allowed: false, provider_dispatch_allowed: false }),
    },
  }))
  try {
    const result = await runAtlasFrontendLiveSourcePatch({
      workspace: '/Users/example/company/shop',
      action: 'prepare',
      file: 'src/Card.tsx',
      target: '<button>Save</button>',
      variants: [{ id: 'v1', path: 'variants/primary.html' }],
      visual_selection: {
        route: '/checkout',
        selector: '[data-testid=save]',
        text_excerpt: 'Save private draft',
        component_hint: 'SaveButton',
        screenshot_hash: 'b'.repeat(64),
        confidence: 0.91,
        bounding_box: { x: 12, y: 24, width: 144, height: 38 },
        viewport: { width: 1440, height: 900 },
      },
      session: 'session-1',
    })

    assert.equal(result.schema_version, 'atlas.frontend.workspace_api.live_source_patch.v1')
    assert.equal(result.surface, 'atlas_code_frontend_live_source_patch')
    assert.equal((result.payload as { status: string }).status, 'prepared')
    assert.equal(result.meta.provider_dispatch_allowed, false)
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/live-source-patch')
    assert.deepEqual(JSON.parse(String(stub.calls[0]!.init.body)), {
      workspace: '/Users/example/company/shop',
      action: 'prepare',
      file: 'src/Card.tsx',
      target: '<button>Save</button>',
      variants: [{ id: 'v1', path: 'variants/primary.html' }],
      visual_selection: {
        route: '/checkout',
        selector: '[data-testid=save]',
        text_excerpt: 'Save private draft',
        component_hint: 'SaveButton',
        screenshot_hash: 'b'.repeat(64),
        confidence: 0.91,
        bounding_box: { x: 12, y: 24, width: 144, height: 38 },
        viewport: { width: 1440, height: 900 },
      },
      session: 'session-1',
    })
  } finally {
    stub.restore()
  }
})

test('live visual selection client records provider-safe session inbox state', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.live_visual_selection.v1',
      surface: 'atlas_code_frontend_live_visual_selection',
      live_visual_selection: {
        schema_version: 'atlas.frontend.live_visual_selection_inbox.v1',
        status: 'recorded',
        session: 'session-1',
        workspace_hash: 'c'.repeat(64),
        selection: {
          schema_version: 'atlas.frontend.live_visual_selection.v1',
          status: 'provided',
          selector_hash: 'a'.repeat(64),
          selection_hash: 'b'.repeat(64),
          policy: {
            raw_text_returned: false,
          },
        },
        source_policy: {
          provider_safe_only: true,
          absolute_path_returned: false,
        },
        inbox_hash: 'd'.repeat(64),
      },
      meta: meta({ execution_allowed: false, provider_dispatch_allowed: false }),
    },
  }))
  try {
    const result = await syncAtlasFrontendLiveVisualSelection({
      workspace: '/Users/example/company/shop',
      action: 'record',
      session: 'session-1',
      selection: {
        route_hash: 'e'.repeat(64),
        selector_hash: 'a'.repeat(64),
        text_excerpt_hash: 'f'.repeat(64),
        confidence: 0.9,
        bounding_box: { x: 12, y: 24, width: 120, height: 32 },
        viewport: { width: 1440, height: 900 },
      },
    })

    assert.equal(result.schema_version, 'atlas.frontend.workspace_api.live_visual_selection.v1')
    assert.equal(result.surface, 'atlas_code_frontend_live_visual_selection')
    assert.equal((result.payload as { status: string }).status, 'recorded')
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/live-visual-selection')
    assert.deepEqual(JSON.parse(String(stub.calls[0]!.init.body)), {
      workspace: '/Users/example/company/shop',
      action: 'record',
      session: 'session-1',
      selection: {
        route_hash: 'e'.repeat(64),
        selector_hash: 'a'.repeat(64),
        text_excerpt_hash: 'f'.repeat(64),
        confidence: 0.9,
        bounding_box: { x: 12, y: 24, width: 120, height: 32 },
        viewport: { width: 1440, height: 900 },
      },
    })
    assert.equal(result.meta.provider_dispatch_allowed, false)
  } finally {
    stub.restore()
  }
})

test('live target suggestions client returns operator-local target snippet candidates', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.live_target_suggestions.v1',
      surface: 'atlas_code_frontend_live_target_suggestions',
      live_target_suggestions: {
        schema_version: 'atlas.frontend.live_target_suggestions.v1',
        status: 'suggested',
        candidate_count: 1,
        candidates: [{
          file: 'src/components/CheckoutHeroCta.tsx',
          file_hash: 'a'.repeat(64),
          line: 7,
          target_snippet: '<button data-testid="checkout-cta">Checkout private cart draft</button>',
          target_hash: 'b'.repeat(64),
          target_occurrence_count: 1,
          can_prepare_directly: true,
          operator_local: true,
          target_snippet_is_not_provider_safe: true,
        }],
        policy: {
          operator_local_target_snippet_returned: true,
          target_snippet_is_not_provider_safe: true,
          provider_dispatch_allowed: false,
          absolute_path_returned: false,
          suggestion_is_not_delivery_evidence: true,
        },
        suggestions_hash: 'c'.repeat(64),
      },
      meta: meta({ execution_allowed: false, provider_dispatch_allowed: false }),
    },
  }))
  try {
    const result = await suggestAtlasFrontendLiveTargets({
      workspace: '/Users/example/company/shop',
      session: 'session-1',
      file_hint: 'CheckoutHeroCta',
      max_candidates: 3,
      visual_selection: {
        selector: '[data-testid=checkout-cta]',
        text_excerpt: 'Checkout private cart draft',
        component_hint: 'CheckoutHeroCta',
      },
    })

    assert.equal(result.schema_version, 'atlas.frontend.workspace_api.live_target_suggestions.v1')
    assert.equal(result.surface, 'atlas_code_frontend_live_target_suggestions')
    assert.equal((result.payload as { status: string }).status, 'suggested')
    assert.equal(result.meta.provider_dispatch_allowed, false)
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/live-target-suggestions')
    assert.deepEqual(JSON.parse(String(stub.calls[0]!.init.body)), {
      workspace: '/Users/example/company/shop',
      session: 'session-1',
      file_hint: 'CheckoutHeroCta',
      max_candidates: 3,
      visual_selection: {
        selector: '[data-testid=checkout-cta]',
        text_excerpt: 'Checkout private cart draft',
        component_hint: 'CheckoutHeroCta',
      },
    })
  } finally {
    stub.restore()
  }
})

test('publication clients prepare receipt template and verify public distribution gate', async () => {
  const stub = installFetch(({ url }) => {
    if (url.endsWith('/atlas-code/frontend/publication-receipt-template')) {
      return {
        jsonBody: {
          schema_version: 'atlas.frontend.workspace_api.publication_receipt_template.v1',
          surface: 'atlas_code_frontend_publication_receipt_template',
          publication_receipt_template: {
            schema_version: 'atlas.frontend.workspace_publication_receipt_template.v1',
            status: 'ready',
            template_schema_version: 'atlas.frontend.publication_receipt_template.v1',
            claim_policy: {
              template_is_not_public_verification: true,
              raw_absolute_path_returned: false,
            },
          },
          meta: meta({ world_best_claim_allowed: false }),
        },
      }
    }

    return {
      jsonBody: {
        schema_version: 'atlas.frontend.workspace_api.publication_verify.v1',
        surface: 'atlas_code_frontend_publication_verification',
        publication_verification: {
          schema_version: 'atlas.frontend.workspace_publication_verification.v1',
          status: 'local_ready',
          public_receipt_status: 'missing',
          claim_policy: {
            public_distribution_claim_allowed: false,
            raw_absolute_path_returned: false,
          },
        },
        meta: meta({ customer_handoff_allowed: false }),
      },
    }
  })
  try {
    const template = await prepareAtlasFrontendPublicationReceipt({
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'publicar prova',
      bundle: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/product-proof',
      output: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web',
    })
    const publication = await verifyAtlasFrontendPublication({
      workspace: '/Users/example/company/shop',
      frontend_app: 'apps/web',
      task: 'verificar publicacao',
      bundle: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/product-proof',
      receipt: '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/publication-receipt.json',
    })

    assert.equal(template.surface, 'atlas_code_frontend_publication_receipt_template')
    assert.equal(publication.surface, 'atlas_code_frontend_publication_verification')
    assert.equal((publication.payload as { status: string }).status, 'local_ready')
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/publication-receipt-template')
    assert.equal(stub.calls[1]!.url, '/api/atlas-code/frontend/publication-verify')
    assert.equal(JSON.parse(String(stub.calls[0]!.init.body)).output, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web')
    assert.equal(JSON.parse(String(stub.calls[1]!.init.body)).receipt, '/Users/example/company/shop/.atlas/frontend-evidence/apps-web/publication-receipt.json')
  } finally {
    stub.restore()
  }
})

test('run certification and handoff clients expose post-provider proof surfaces', async () => {
  const stub = installFetch(({ url }) => {
    if (url.endsWith('/atlas-code/frontend/run-certification')) {
      return {
        jsonBody: {
          schema_version: 'atlas.frontend.workspace_api.run_certification.v1',
          surface: 'atlas_code_frontend_delivery_certification',
          run_certification: {
            schema_version: 'atlas.frontend.run_certification.v1',
            status: 'certified',
            run_certification_hash: 'a'.repeat(64),
          },
          meta: meta({ frontend_completion_claim_allowed: true }),
        },
      }
    }

    return {
      jsonBody: {
        schema_version: 'atlas.frontend.workspace_api.delivery_handoff.v1',
        surface: 'atlas_code_frontend_delivery_handoff',
        delivery_handoff: {
          schema_version: 'atlas.frontend.delivery_handoff.v1',
          status: 'ready',
          handoff_hash: 'b'.repeat(64),
        },
        meta: meta({ customer_handoff_allowed: true }),
      },
    }
  })
  try {
    const certification = await certifyAtlasFrontendRun({
      provider_packet: '/tmp/provider.json',
      visual_report: '/tmp/visual.json',
      design_review_report: '/tmp/design.json',
      quality_budget_report: '/tmp/budget.json',
      evidence_manifest: '/tmp/evidence/evidence-pack.json',
      evidence_root: '/tmp/evidence',
      outcome_store: '/tmp/outcomes.jsonl',
    })
    const handoff = await compileAtlasFrontendHandoff({
      run_certification_report: '/tmp/run-certification.json',
      evidence_manifest: '/tmp/evidence/evidence-pack.json',
    })

    assert.equal(certification.surface, 'atlas_code_frontend_delivery_certification')
    assert.equal(certification.meta.frontend_completion_claim_allowed, true)
    assert.equal(handoff.surface, 'atlas_code_frontend_delivery_handoff')
    assert.equal(handoff.meta.customer_handoff_allowed, true)
    assert.equal(stub.calls[0]!.url, '/api/atlas-code/frontend/run-certification')
    assert.equal(stub.calls[1]!.url, '/api/atlas-code/frontend/handoff')
  } finally {
    stub.restore()
  }
})

test('client rejects unsafe Space runtime policy before the UI can proceed', async () => {
  const stub = installFetch(() => ({
    jsonBody: {
      schema_version: 'atlas.frontend.workspace_api.selected_workspace.v1',
      surface: 'atlas_code_frontend_workspace_selection',
      selected_workspace: { status: 'selected' },
      meta: meta({ space_runtime_required: true }),
    },
  }))
  try {
    let raised: unknown = null
    try {
      await selectAtlasFrontendWorkspace({
        workspace: '/Users/example/company/shop',
        frontend_app: 'apps/web',
      })
    } catch (error) {
      raised = error
    }

    assert.ok(raised && typeof raised === 'object')
    const error = raised as { kind: string; requires_reselection: boolean; message: string }
    assert.equal(error.kind, 'unsafe_policy')
    assert.equal(error.requires_reselection, true)
    assert.match(error.message, /Space runtime/)
  } finally {
    stub.restore()
  }
})

for (const t of cases) {
  await t.run()
  console.log(`ok - ${t.name}`)
}
