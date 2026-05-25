export interface AtlasFrontendPortfolioCandidate {
  label: string
  workspace: string
  status: string
  score: number
  framework: string
  frontendAppCandidateStatus: string
  frontendAppCandidateCount: number
  claim_policy: {
    selected_repository_is_primary_workspace: true
    frontend_app_is_subscope_only: true
    space_runtime_required: false
    portfolio_candidate_is_not_execution_evidence: true
  }
}

export interface AtlasFrontendOperatorFlowStage {
  id: string
  status: string
  surface: string
  contract: string
  command: string
  endpoint: string
  execution_allowed: boolean
}

export interface AtlasFrontendOperatorFlow {
  schema_version: string
  status: string
  purpose: string
  stages: AtlasFrontendOperatorFlowStage[]
  invariants: {
    selected_repository_is_primary_workspace: boolean
    frontend_app_is_relative_subscope_only: boolean
    portfolio_root_is_inventory_only: boolean
    provider_dispatch_requires_pre_execution_gate: boolean
    selection_or_activation_is_not_delivery_evidence: boolean
    space_runtime_required: boolean
    public_superiority_claims_disabled: boolean
  }
  claim_policy: {
    operator_flow_is_not_execution_evidence: boolean
    raw_absolute_paths_returned: boolean
    provider_dispatch_allowed: boolean
    world_best_claim_allowed: boolean
  }
}

export function extractAtlasFrontendPortfolioCandidates(payload: unknown, folderRoot: string): AtlasFrontendPortfolioCandidate[] {
  if (!payload || typeof payload !== 'object') return []
  const repositories = (payload as { repositories?: unknown }).repositories
  if (!Array.isArray(repositories)) return []

  return repositories
    .map((repo): AtlasFrontendPortfolioCandidate | null => {
      if (!repo || typeof repo !== 'object') return null
      const record = repo as Record<string, unknown>
      const repoRef = objectRecord(record.repo_ref)
      const relativeName = typeof repoRef.relative_name === 'string' ? repoRef.relative_name : ''
      const appSummary = objectRecord(record.frontend_app_candidate_summary)
      const label = relativeName && relativeName !== '.' ? relativeName : basename(folderRoot) || 'repo'

      return {
        label,
        workspace: joinLocalPath(folderRoot, relativeName),
        status: typeof record.status === 'string' ? record.status : 'unknown',
        score: typeof record.candidate_score === 'number' ? record.candidate_score : 0,
        framework: typeof record.framework === 'string' ? record.framework : '',
        frontendAppCandidateStatus: typeof appSummary.status === 'string' ? appSummary.status : 'not_evaluated',
        frontendAppCandidateCount: typeof appSummary.candidate_count === 'number' ? appSummary.candidate_count : 0,
        claim_policy: {
          selected_repository_is_primary_workspace: true,
          frontend_app_is_subscope_only: true,
          space_runtime_required: false,
          portfolio_candidate_is_not_execution_evidence: true,
        },
      }
    })
    .filter((candidate): candidate is AtlasFrontendPortfolioCandidate => candidate !== null && candidate.workspace !== '')
    .slice(0, 12)
}

export function extractAtlasFrontendSuggestedFrontendApp(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const candidates = objectRecord((payload as { frontend_app_candidates?: unknown }).frontend_app_candidates)
  const value = candidates.primary_candidate_relative_name
  if (typeof value !== 'string') return null
  const normalized = normalizeRelativeSubscope(value)
  return normalized !== '' && normalized !== '.' ? normalized : null
}

export function extractAtlasFrontendOperatorFlow(payload: unknown): AtlasFrontendOperatorFlow | null {
  if (!payload || typeof payload !== 'object') return null
  const flow = objectRecord((payload as { operator_flow?: unknown }).operator_flow)
  const schemaVersion = stringValue(flow.schema_version)
  if (schemaVersion !== 'atlas.frontend.company_portfolio.operator_flow.v1') return null

  return {
    schema_version: schemaVersion,
    status: stringValue(flow.status) || 'unknown',
    purpose: stringValue(flow.purpose),
    stages: arrayValue(flow.stages).map((stage): AtlasFrontendOperatorFlowStage => {
      const record = objectRecord(stage)

      return {
        id: stringValue(record.id) || 'unknown',
        status: stringValue(record.status) || 'unknown',
        surface: stringValue(record.surface),
        contract: stringValue(record.contract),
        command: stringValue(record.command),
        endpoint: stringValue(record.endpoint),
        execution_allowed: record.execution_allowed === true,
      }
    }),
    invariants: {
      selected_repository_is_primary_workspace: objectRecord(flow.invariants).selected_repository_is_primary_workspace === true,
      frontend_app_is_relative_subscope_only: objectRecord(flow.invariants).frontend_app_is_relative_subscope_only === true,
      portfolio_root_is_inventory_only: objectRecord(flow.invariants).portfolio_root_is_inventory_only === true,
      provider_dispatch_requires_pre_execution_gate: objectRecord(flow.invariants).provider_dispatch_requires_pre_execution_gate === true,
      selection_or_activation_is_not_delivery_evidence: objectRecord(flow.invariants).selection_or_activation_is_not_delivery_evidence === true,
      space_runtime_required: objectRecord(flow.invariants).space_runtime_required === true,
      public_superiority_claims_disabled: objectRecord(flow.invariants).public_superiority_claims_disabled === true,
    },
    claim_policy: {
      operator_flow_is_not_execution_evidence: objectRecord(flow.claim_policy).operator_flow_is_not_execution_evidence === true,
      raw_absolute_paths_returned: objectRecord(flow.claim_policy).raw_absolute_paths_returned === true,
      provider_dispatch_allowed: objectRecord(flow.claim_policy).provider_dispatch_allowed === true,
      world_best_claim_allowed: objectRecord(flow.claim_policy).world_best_claim_allowed === true,
    },
  }
}

export function joinAtlasFrontendLocalPath(root: string, relativeName: string): string {
  return joinLocalPath(root, relativeName)
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function joinLocalPath(root: string, relativeName: string): string {
  const base = root.trim().replace(/\/+$/g, '')
  const relative = normalizeRelativeSubscope(relativeName)
  if (base === '') return ''
  if (relative === '' || relative === '.') return base
  return `${base}/${relative}`
}

function normalizeRelativeSubscope(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '')
}

function basename(path: string): string {
  return path.trim().replace(/\/+$/g, '').split('/').filter(Boolean).at(-1) ?? ''
}
