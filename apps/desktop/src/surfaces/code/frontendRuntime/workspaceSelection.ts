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

export function joinAtlasFrontendLocalPath(root: string, relativeName: string): string {
  return joinLocalPath(root, relativeName)
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
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
