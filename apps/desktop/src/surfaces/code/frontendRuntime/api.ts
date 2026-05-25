/**
 * Atlas Frontend · selected-repository runtime HTTP client.
 *
 * Canonical flow:
 *   1. GET  /atlas-code/frontend/portfolio
 *   2. POST /atlas-code/frontend/selected-workspace
 *   3. POST /atlas-code/frontend/selection-receipt
 *   4. POST /atlas-code/frontend/project-activation
 *   5. POST /atlas-code/frontend/runtime-projection
 *   6. POST /atlas-code/frontend/control-plane
 *   7. POST /atlas-code/frontend/prepare-evidence
 *   8. POST /atlas-code/frontend/prepare-rival-replay
 *   9. POST /atlas-code/frontend/inspect-rival-replay
 *   10. POST /atlas-code/frontend/replay-external-receipt-template
 *   11. POST /atlas-code/frontend/replay-score-template
 *   12. POST /atlas-code/frontend/replay-apply-patch
 *   13. POST /atlas-code/frontend/proof-bundle
 *   14. POST /atlas-code/frontend/publication-receipt-template
 *   15. POST /atlas-code/frontend/publication-verify
 *   16. POST /atlas-code/frontend/run-certification
 *   17. POST /atlas-code/frontend/handoff
 *
 * The selected repository is always the primary workspace. `frontend_app` is a
 * relative sub-scope such as `apps/web`; it is never a Space runtime.
 */

const ENV = ((import.meta as ImportMeta & {
  env?: Record<string, string | undefined>
}).env ?? {})

const HTTP_BASE = ENV.VITE_ATLAS_SERVER_URL ?? ''
const ATLAS_TOKEN = ENV.VITE_ATLAS_TOKEN

export type AtlasFrontendApiStatus = 'ok' | 'blocked'

export interface AtlasFrontendApiError {
  kind: 'http_error' | 'invalid_json' | 'unsafe_policy'
  status?: number
  message: string
  requires_reselection: boolean
}

export interface AtlasFrontendMetaPolicy {
  selected_repository_is_primary_workspace?: boolean
  frontend_app_is_subscope_only?: boolean
  space_runtime_required?: boolean
  provider_dispatch_performed?: boolean
  world_best_claim_allowed?: boolean
  execution_allowed?: boolean
  provider_dispatch_allowed?: boolean
  frontend_completion_claim_allowed?: boolean
  customer_handoff_allowed?: boolean
}

export interface AtlasFrontendWorkspaceApiEnvelope<TPayload> {
  schema_version: string
  surface: string
  meta: AtlasFrontendMetaPolicy
  status_code: number
  transport_status: AtlasFrontendApiStatus
  payload: TPayload
}

export interface AtlasFrontendPortfolioRequest {
  root: string
  task?: string
  max_depth?: number
  max_repos?: number
}

export interface AtlasFrontendSelectedWorkspaceRequest {
  workspace: string
  task?: string
  frontend_app?: string
  selection_source?: string
}

export interface AtlasFrontendSelectionReceiptRequest extends AtlasFrontendSelectedWorkspaceRequest {
  portfolio_root?: string
  output?: string
}

export interface AtlasFrontendProjectActivationRequest extends AtlasFrontendSelectedWorkspaceRequest {
  project_slug?: string
  project_name?: string
}

export interface AtlasFrontendRuntimeProjectionRequest extends AtlasFrontendSelectedWorkspaceRequest {
  task: string
  provider?: string
  acceptance_criteria?: boolean
  test_plan?: boolean
  visual_quality_plan?: boolean
  evidence_plan?: boolean
  senior_design_review?: boolean
  asset_context?: boolean
  prototype?: boolean
  live?: boolean
  company_profile_ready?: boolean
}

export interface AtlasFrontendPrepareEvidenceRequest extends AtlasFrontendRuntimeProjectionRequest {
  output: string
}

export interface AtlasFrontendControlPlaneRequest extends AtlasFrontendRuntimeProjectionRequest {
  rival_evidence?: string
  bundle?: string
  publication_receipt?: string
  benchmark_run?: boolean
}

export interface AtlasFrontendPrepareRivalReplayRequest {
  workspace: string
  task: string
  output: string
  frontend_app?: string
}

export interface AtlasFrontendInspectRivalReplayRequest {
  workspace: string
  task: string
  evidence: string
  frontend_app?: string
}

export interface AtlasFrontendReplayApplyPatchRequest extends AtlasFrontendInspectRivalReplayRequest {
  patch: string
}

export interface AtlasFrontendReplayTemplateRequest extends AtlasFrontendInspectRivalReplayRequest {
  case_id: string
  system: string
  output?: string
  execution_surface?: string
  reviewer_ref_hash?: string
}

export interface AtlasFrontendPublicationReceiptTemplateRequest {
  workspace: string
  task: string
  output: string
  bundle?: string
  frontend_app?: string
}

export interface AtlasFrontendPublicationVerifyRequest {
  workspace: string
  task: string
  bundle: string
  receipt?: string
  frontend_app?: string
}

export interface AtlasFrontendRunCertificationRequest {
  provider_packet: string
  visual_report: string
  design_review_report: string
  quality_budget_report: string
  evidence_manifest: string
  evidence_root: string
  outcome_store: string
  bundle?: string
  publication_receipt?: string
}

export interface AtlasFrontendDeliveryHandoffRequest {
  run_certification_report: string
  evidence_manifest: string
  publication_report?: string
}

function apiUrl(path: string): string {
  const base = HTTP_BASE.replace(/\/+$/, '')
  if (!base) return `/api${path}`
  if (base.endsWith('/api')) return `${base}${path}`
  return `${base}${path}`
}

function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra ?? {})
  if (ATLAS_TOKEN) headers.set('X-Atlas-Token', ATLAS_TOKEN)
  return headers
}

function query(input: object): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const out = params.toString()
  return out === '' ? '' : `?${out}`
}

function compactMessage(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 240) || 'Resposta inesperada do Atlas Frontend.'
}

async function decodeJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.trim() === '') return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw {
      kind: 'invalid_json',
      status: response.status,
      message: compactMessage(text),
      requires_reselection: response.status === 422,
    } satisfies AtlasFrontendApiError
  }
}

function payloadKey(schemaVersion: string): string {
  if (schemaVersion.endsWith('.portfolio.v1')) return 'portfolio'
  if (schemaVersion.endsWith('.selected_workspace.v1')) return 'selected_workspace'
  if (schemaVersion.endsWith('.selection_receipt.v1')) return 'selection_receipt'
  if (schemaVersion.endsWith('.project_activation.v1')) return 'project_activation'
  if (schemaVersion.endsWith('.runtime_projection.v1')) return 'runtime_projection'
  if (schemaVersion.endsWith('.control_plane.v1')) return 'control_plane'
  if (schemaVersion.endsWith('.prepare_evidence.v1')) return 'evidence_preparation'
  if (schemaVersion.endsWith('.prepare_rival_replay.v1')) return 'rival_replay_preparation'
  if (schemaVersion.endsWith('.inspect_rival_replay.v1')) return 'rival_replay_inspection'
  if (schemaVersion.endsWith('.replay_external_receipt_template.v1')) return 'rival_replay_external_receipt_template'
  if (schemaVersion.endsWith('.replay_score_template.v1')) return 'rival_replay_score_template'
  if (schemaVersion.endsWith('.replay_apply_patch.v1')) return 'rival_replay_manifest_patch_application'
  if (schemaVersion.endsWith('.proof_bundle.v1')) return 'rival_replay_proof_bundle'
  if (schemaVersion.endsWith('.publication_receipt_template.v1')) return 'publication_receipt_template'
  if (schemaVersion.endsWith('.publication_verify.v1')) return 'publication_verification'
  if (schemaVersion.endsWith('.run_certification.v1')) return 'run_certification'
  if (schemaVersion.endsWith('.delivery_handoff.v1')) return 'delivery_handoff'
  return 'data'
}

function assertFrontendPolicy(schemaVersion: string, meta: AtlasFrontendMetaPolicy): void {
  const isFrontendEnvelope = schemaVersion.startsWith('atlas.frontend.workspace_api.')
  if (!isFrontendEnvelope) return
  if (meta.selected_repository_is_primary_workspace !== true) {
    throw {
      kind: 'unsafe_policy',
      message: 'Atlas Frontend sem confirmação de repositório selecionado como workspace primário.',
      requires_reselection: true,
    } satisfies AtlasFrontendApiError
  }
  if (meta.frontend_app_is_subscope_only !== true) {
    throw {
      kind: 'unsafe_policy',
      message: 'Atlas Frontend sem confirmação de frontend_app como subescopo.',
      requires_reselection: true,
    } satisfies AtlasFrontendApiError
  }
  if (meta.space_runtime_required !== false) {
    throw {
      kind: 'unsafe_policy',
      message: 'Atlas Frontend recebeu política incompatível: Space runtime requerido.',
      requires_reselection: true,
    } satisfies AtlasFrontendApiError
  }
}

async function requestFrontend<TPayload>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<AtlasFrontendWorkspaceApiEnvelope<TPayload>> {
  const response = await fetch(apiUrl(path), {
    method: init.method ?? 'GET',
    headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const decoded = await decodeJson(response)
  if (!response.ok && response.status !== 422) {
    throw {
      kind: 'http_error',
      status: response.status,
      message: compactMessage(JSON.stringify(decoded)),
      requires_reselection: response.status === 404,
    } satisfies AtlasFrontendApiError
  }
  if (!decoded || typeof decoded !== 'object') {
    throw {
      kind: 'invalid_json',
      status: response.status,
      message: 'Envelope inválido do Atlas Frontend.',
      requires_reselection: response.status === 422,
    } satisfies AtlasFrontendApiError
  }

  const envelope = decoded as Record<string, unknown>
  const schemaVersion = String(envelope.schema_version ?? '')
  const meta = (envelope.meta && typeof envelope.meta === 'object'
    ? envelope.meta
    : {}) as AtlasFrontendMetaPolicy
  assertFrontendPolicy(schemaVersion, meta)
  const key = payloadKey(schemaVersion)

  return {
    schema_version: schemaVersion,
    surface: String(envelope.surface ?? ''),
    meta,
    status_code: response.status,
    transport_status: response.ok ? 'ok' : 'blocked',
    payload: envelope[key] as TPayload,
  }
}

export async function scanAtlasFrontendPortfolio(input: AtlasFrontendPortfolioRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend(`/atlas-code/frontend/portfolio${query(input)}`)
}

export async function selectAtlasFrontendWorkspace(input: AtlasFrontendSelectedWorkspaceRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/selected-workspace', {
    method: 'POST',
    body: input,
  })
}

export async function writeAtlasFrontendSelectionReceipt(input: AtlasFrontendSelectionReceiptRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/selection-receipt', {
    method: 'POST',
    body: input,
  })
}

export async function activateAtlasFrontendProjectWorkspace(input: AtlasFrontendProjectActivationRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/project-activation', {
    method: 'POST',
    body: input,
  })
}

export async function projectAtlasFrontendRuntime(input: AtlasFrontendRuntimeProjectionRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/runtime-projection', {
    method: 'POST',
    body: input,
  })
}

export async function inspectAtlasFrontendControlPlane(input: AtlasFrontendControlPlaneRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/control-plane', {
    method: 'POST',
    body: input,
  })
}

export async function prepareAtlasFrontendEvidence(input: AtlasFrontendPrepareEvidenceRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/prepare-evidence', {
    method: 'POST',
    body: input,
  })
}

export async function prepareAtlasFrontendRivalReplay(input: AtlasFrontendPrepareRivalReplayRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/prepare-rival-replay', {
    method: 'POST',
    body: input,
  })
}

export async function inspectAtlasFrontendRivalReplay(input: AtlasFrontendInspectRivalReplayRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/inspect-rival-replay', {
    method: 'POST',
    body: input,
  })
}

export async function applyAtlasFrontendReplayPatch(input: AtlasFrontendReplayApplyPatchRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/replay-apply-patch', {
    method: 'POST',
    body: input,
  })
}

export async function prepareAtlasFrontendReplayExternalReceiptTemplate(input: AtlasFrontendReplayTemplateRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/replay-external-receipt-template', {
    method: 'POST',
    body: input,
  })
}

export async function prepareAtlasFrontendReplayScoreTemplate(input: AtlasFrontendReplayTemplateRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/replay-score-template', {
    method: 'POST',
    body: input,
  })
}

export async function compileAtlasFrontendProofBundle(input: AtlasFrontendInspectRivalReplayRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/proof-bundle', {
    method: 'POST',
    body: input,
  })
}

export async function prepareAtlasFrontendPublicationReceipt(input: AtlasFrontendPublicationReceiptTemplateRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/publication-receipt-template', {
    method: 'POST',
    body: input,
  })
}

export async function verifyAtlasFrontendPublication(input: AtlasFrontendPublicationVerifyRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/publication-verify', {
    method: 'POST',
    body: input,
  })
}

export async function certifyAtlasFrontendRun(input: AtlasFrontendRunCertificationRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/run-certification', {
    method: 'POST',
    body: input,
  })
}

export async function compileAtlasFrontendHandoff(input: AtlasFrontendDeliveryHandoffRequest): Promise<AtlasFrontendWorkspaceApiEnvelope<unknown>> {
  return requestFrontend('/atlas-code/frontend/handoff', {
    method: 'POST',
    body: input,
  })
}
