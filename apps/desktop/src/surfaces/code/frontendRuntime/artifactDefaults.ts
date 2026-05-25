export interface AtlasFrontendArtifactPlan {
  schema_version: 'atlas.frontend.desktop_artifact_defaults.v1'
  status: 'ready' | 'blocked'
  workspace: string
  frontend_app: string | null
  evidence_directory: string
  selection_receipt: string
  provider_packet: string
  visual_report: string
  design_review_report: string
  quality_budget_report: string
  evidence_manifest: string
  evidence_root: string
  product_proof_bundle: string
  publication_receipt: string
  publication_report: string
  rival_replay_directory: string
  rival_replay_runner_kit: string
  rival_replay_worklist: string
  rival_replay_proof_contract: string
  rival_replay_operator_packet: string
  rival_replay_proof_bundle: string
  outcome_store: string
  run_certification_report: string
  delivery_handoff_report: string
  commands: {
    provider_packet: string
    selection_receipt: string
    control_plane: string
    evidence_kit: string
    rival_replay: string
    rival_replay_proof_bundle: string
    publication_receipt_template: string
    publication_verify: string
    run_certification: string
    handoff: string
  }
  blockers: string[]
  claim_policy: {
    selected_repository_is_primary_workspace: true
    frontend_app_is_subscope_only: true
    space_runtime_required: false
    commands_are_suggestions_only: true
    provider_dispatch_performed: false
    world_best_claim_allowed: false
  }
}

export function buildAtlasFrontendArtifactPlan(input: {
  workspace: string
  frontendApp?: string
  task?: string
}): AtlasFrontendArtifactPlan {
  const workspace = trimTrailingSlash(input.workspace.trim())
  const frontendApp = normalizeFrontendApp(input.frontendApp ?? '')
  const task = input.task?.trim() || 'Melhorar frontend do repositório selecionado'
  const blockers = workspace === '' ? ['selected_workspace_missing'] : []
  const scopeSlug = frontendApp ? slug(frontendApp) : 'repo-root'
  const evidenceDirectory = workspace === '' ? '' : joinPath(workspace, '.atlas', 'frontend-evidence', scopeSlug)
  const selectionReceipt = joinPath(evidenceDirectory, 'selection-receipt.json')
  const providerPacket = joinPath(evidenceDirectory, 'provider-instruction-packet.json')
  const visualReport = joinPath(evidenceDirectory, 'visual-quality-report.json')
  const designReviewReport = joinPath(evidenceDirectory, 'design-review-report.json')
  const qualityBudgetReport = joinPath(evidenceDirectory, 'quality-budget-report.json')
  const evidenceRoot = joinPath(evidenceDirectory, 'evidence')
  const evidenceManifest = joinPath(evidenceRoot, 'evidence-pack.json')
  const productProofBundle = joinPath(evidenceDirectory, 'product-proof')
  const publicationReceipt = joinPath(evidenceDirectory, 'publication-receipt.json')
  const publicationReport = joinPath(evidenceDirectory, 'publication-report.json')
  const rivalReplayDirectory = joinPath(evidenceDirectory, 'rival-replay')
  const rivalReplayRunnerKit = joinPath(rivalReplayDirectory, 'replay-runner-kit.json')
  const rivalReplayWorklist = joinPath(rivalReplayDirectory, 'replay-evidence-worklist.json')
  const rivalReplayProofContract = joinPath(rivalReplayDirectory, 'replay-competitive-proof-contract.json')
  const rivalReplayOperatorPacket = joinPath(rivalReplayDirectory, 'replay-operator-packet.json')
  const rivalReplayProofBundle = joinPath(rivalReplayDirectory, 'replay-competitive-proof-bundle.json')
  const outcomeStore = joinPath(evidenceDirectory, 'outcomes.jsonl')
  const runCertificationReport = joinPath(evidenceDirectory, 'run-certification.json')
  const deliveryHandoffReport = joinPath(evidenceDirectory, 'delivery-handoff.json')
  const frontendArg = frontendApp ? ` --frontend-app=${shellQuote(frontendApp)}` : ''

  return {
    schema_version: 'atlas.frontend.desktop_artifact_defaults.v1',
    status: blockers.length === 0 ? 'ready' : 'blocked',
    workspace,
    frontend_app: frontendApp || null,
    evidence_directory: evidenceDirectory,
    selection_receipt: selectionReceipt,
    provider_packet: providerPacket,
    visual_report: visualReport,
    design_review_report: designReviewReport,
    quality_budget_report: qualityBudgetReport,
    evidence_manifest: evidenceManifest,
    evidence_root: evidenceRoot,
    product_proof_bundle: productProofBundle,
    publication_receipt: publicationReceipt,
    publication_report: publicationReport,
    rival_replay_directory: rivalReplayDirectory,
    rival_replay_runner_kit: rivalReplayRunnerKit,
    rival_replay_worklist: rivalReplayWorklist,
    rival_replay_proof_contract: rivalReplayProofContract,
    rival_replay_operator_packet: rivalReplayOperatorPacket,
    rival_replay_proof_bundle: rivalReplayProofBundle,
    outcome_store: outcomeStore,
    run_certification_report: runCertificationReport,
    delivery_handoff_report: deliveryHandoffReport,
    commands: {
      selection_receipt: `php artisan atlas:frontend:selected-workspace --task=${shellQuote(task)} --workspace=${shellQuote(workspace)}${frontendArg} --selection-receipt --output=${shellQuote(selectionReceipt)} --json --strict`,
      provider_packet: `php artisan atlas:frontend:provider-packet --task=${shellQuote(task)} --workspace=${shellQuote(workspace)}${frontendArg} --acceptance --test-plan --visual-quality-plan --evidence-plan --json --strict > ${shellQuote(providerPacket)}`,
      control_plane: `php artisan atlas:frontend:control-plane --task=${shellQuote(task)} --workspace=${shellQuote(workspace)}${frontendArg} --acceptance --test-plan --visual-quality-plan --evidence-plan --senior-design-review --asset-context --company-profile-ready --rival-evidence=${shellQuote(rivalReplayDirectory)} --bundle=${shellQuote(productProofBundle)} --publication-receipt=${shellQuote(publicationReceipt)} --json`,
      evidence_kit: `php artisan atlas:frontend:evidence-kit prepare --task=${shellQuote(task)} --workspace=${shellQuote(workspace)}${frontendArg} --acceptance --output=${shellQuote(evidenceDirectory)} --json --strict`,
      rival_replay: `php artisan atlas:frontend:replay operator-packet --evidence=${shellQuote(rivalReplayDirectory)} --json`,
      rival_replay_proof_bundle: `php artisan atlas:frontend:replay proof-bundle --evidence=${shellQuote(rivalReplayDirectory)} --json`,
      publication_receipt_template: `php artisan atlas:frontend:publish receipt-template --bundle=${shellQuote(productProofBundle)} --output=${shellQuote(evidenceDirectory)} --json`,
      publication_verify: `php artisan atlas:frontend:publish verify --bundle=${shellQuote(productProofBundle)} --receipt=${shellQuote(publicationReceipt)} --json > ${shellQuote(publicationReport)}`,
      run_certification: `php artisan atlas:frontend:run-certify --provider-packet=${shellQuote(providerPacket)} --visual-report=${shellQuote(visualReport)} --design-review-report=${shellQuote(designReviewReport)} --quality-budget-report=${shellQuote(qualityBudgetReport)} --evidence-manifest=${shellQuote(evidenceManifest)} --evidence-root=${shellQuote(evidenceRoot)} --bundle=${shellQuote(productProofBundle)} --publication-receipt=${shellQuote(publicationReceipt)} --outcome-store=${shellQuote(outcomeStore)} --json --strict > ${shellQuote(runCertificationReport)}`,
      handoff: `php artisan atlas:frontend:handoff compile --run-certification=${shellQuote(runCertificationReport)} --evidence-manifest=${shellQuote(evidenceManifest)} --publication-report=${shellQuote(publicationReport)} --json --strict > ${shellQuote(deliveryHandoffReport)}`,
    },
    blockers,
    claim_policy: {
      selected_repository_is_primary_workspace: true,
      frontend_app_is_subscope_only: true,
      space_runtime_required: false,
      commands_are_suggestions_only: true,
      provider_dispatch_performed: false,
      world_best_claim_allowed: false,
    },
  }
}

function normalizeFrontendApp(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '')
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, '')
}

function joinPath(...parts: string[]): string {
  return parts
    .filter((part) => part !== '')
    .join('/')
    .replace(/([^:])\/{2,}/g, '$1/')
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'frontend-app'
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}
