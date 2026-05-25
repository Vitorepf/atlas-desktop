import type { AtlasFrontendWorkspaceApiEnvelope } from './api.ts'
import type { AtlasFrontendArtifactPlan } from './artifactDefaults.ts'

export type AtlasFrontendCompetitiveReadinessStatus = 'blocked' | 'evidence_ready' | 'rival_replay_prepared' | 'rival_replay_inspected' | 'proof_bundle_compiled' | 'publication_verified' | 'certified_handoff_ready' | 'private_benchmark_ready'

export interface AtlasFrontendCompetitiveReadiness {
  schema_version: 'atlas.frontend.desktop_competitive_readiness.v1'
  status: AtlasFrontendCompetitiveReadinessStatus
  rivals: Array<'pbakaus_impeccable' | 'claude_design' | 'generic_provider_design'>
  proof_ladder: Array<{
    id: string
    status: 'passed' | 'missing'
    label: string
  }>
  hard_questions: string[]
  blockers: string[]
  proof_contract: {
    status: string
    next_minimum_actions: string[]
  }
  operator_packet_verification: {
    status: string
    blockers: string[]
    warnings: string[]
  }
  proof_bundle: {
    status: string
    readiness: Record<string, unknown>
    required_next_actions: string[]
  }
  publication: {
    status: string
    public_receipt_status: string
    required_next_actions: string[]
  }
  claim_policy: {
    selected_repository_is_primary_workspace: true
    frontend_app_is_subscope_only: true
    space_runtime_required: false
    provider_dispatch_performed_by_panel: false
    local_certification_is_not_private_benchmark_proof: true
    private_benchmark_for_internal_improvement_only: true
    public_superiority_claims_disabled: true
    world_best_claim_allowed: boolean
  }
}

export function buildAtlasFrontendCompetitiveReadiness(input: {
  artifactPlan: AtlasFrontendArtifactPlan | null
  reports: Partial<Record<string, AtlasFrontendWorkspaceApiEnvelope<unknown>>>
}): AtlasFrontendCompetitiveReadiness {
  const artifactPlanReady = input.artifactPlan?.status === 'ready'
  const preparation = input.reports.prepare_evidence
  const rivalReplay = input.reports.prepare_rival_replay
  const rivalReplayInspection = input.reports.inspect_rival_replay
  const proofBundle = input.reports.proof_bundle
  const publication = input.reports.publication_verify
  const certification = input.reports.run_certification
  const handoff = input.reports.handoff
  const evidencePrepared = preparation?.transport_status === 'ok'
    && payloadStatus(preparation.payload) === 'ready_for_provider_dispatch'
  const rivalReplayPrepared = rivalReplay?.transport_status === 'ok'
    && payloadStatus(rivalReplay.payload) === 'ready_for_external_rival_replay'
  const operatorPacketVerificationStatus = payloadString(rivalReplay?.payload, ['operator_packet_verification_status']) || 'not_available'
  const operatorPacketVerified = rivalReplay?.transport_status === 'ok'
    && operatorPacketVerificationStatus === 'passed'
  const rivalReplayInspected = rivalReplayInspection?.transport_status === 'ok'
  const rivalReplayActionQueueCompiled = rivalReplayInspected
    && payloadString(rivalReplayInspection.payload, ['action_queue', 'schema_version']) === 'atlas.frontend.rival_replay_evidence_worklist.v1'
  const proofContractStatus = payloadString(rivalReplayInspection?.payload, ['competitive_proof_contract', 'status']) || 'not_available'
  const proofContractComplete = ['private_benchmark_ready', 'world_best_proof_ready'].includes(proofContractStatus)
  const proofBundleStatus = payloadStatus(proofBundle?.payload)
  const proofBundleCompiled = proofBundle?.transport_status === 'ok'
    && payloadString(proofBundle.payload, ['proof_bundle_schema_version']) === 'atlas.frontend.rival_replay_competitive_proof_bundle.v1'
  const externalReplayCompleted = rivalReplayInspected
    && payloadBoolean(rivalReplayInspection.payload, ['claim_policy', 'may_claim_external_replay_completed'])
  const publicationVerified = publication?.transport_status === 'ok'
    && payloadStatus(publication.payload) === 'public_verified'
    && payloadBoolean(publication.payload, ['claim_policy', 'public_distribution_claim_allowed'])
  const privateBenchmarkReady = externalReplayCompleted
    && operatorPacketVerified
    && proofBundleCompiled
    && ['private_benchmark_ready', 'world_best_replay_proof_ready'].includes(proofBundleStatus)
    && proofContractComplete
  const runCertified = certification?.transport_status === 'ok'
    && ['certified', 'warning'].includes(payloadStatus(certification.payload))
    && certification.meta.frontend_completion_claim_allowed === true
  const handoffReady = handoff?.transport_status === 'ok'
    && payloadStatus(handoff.payload) === 'ready'
    && handoff.meta.customer_handoff_allowed === true

  const proofLadder = [
    { id: 'artifact_plan_ready', status: artifactPlanReady ? 'passed' : 'missing', label: 'paths and commands bound to selected repo' },
    { id: 'evidence_kit_prepared', status: evidencePrepared ? 'passed' : 'missing', label: 'backend prepared evidence kit and provider packet' },
    { id: 'rival_replay_runner_kit_prepared', status: rivalReplayPrepared ? 'passed' : 'missing', label: 'external rival replay runner kit and worklist prepared' },
    { id: 'operator_packet_verified', status: operatorPacketVerified ? 'passed' : 'missing', label: 'external operator packet integrity verified before replay' },
    { id: 'rival_replay_inspected', status: rivalReplayInspected ? 'passed' : 'missing', label: 'external rival replay evidence inspected by backend' },
    { id: 'rival_replay_action_queue_compiled', status: rivalReplayActionQueueCompiled ? 'passed' : 'missing', label: 'safe action queue names missing evidence, attestations and external receipts' },
    { id: 'competitive_proof_bundle_compiled', status: proofBundleCompiled ? 'passed' : 'missing', label: 'provider-safe proof bundle indexes replay evidence without raw artifacts' },
    { id: 'private_benchmark_contract_ready', status: proofContractComplete ? 'passed' : 'missing', label: 'backend proof contract proves the private benchmark without authorizing public claims' },
    { id: 'run_certified', status: runCertified ? 'passed' : 'missing', label: 'post-provider run certification allows completion claim' },
    { id: 'customer_handoff_ready', status: handoffReady ? 'passed' : 'missing', label: 'customer-safe handoff compiled from certified evidence' },
    { id: 'external_rival_replay_receipts', status: externalReplayCompleted ? 'passed' : 'missing', label: 'external rival replay receipts against Impeccable and Claude Design' },
    { id: 'optional_publication_receipt_verified', status: publicationVerified ? 'passed' : 'missing', label: 'optional publication receipt matches the product proof bundle without enabling public superiority claims' },
  ] as AtlasFrontendCompetitiveReadiness['proof_ladder']
  const blockers = proofLadder
    .filter((item) => item.id !== 'optional_publication_receipt_verified')
    .filter((item) => item.status !== 'passed')
    .map((item) => item.id)
  const status: AtlasFrontendCompetitiveReadinessStatus = privateBenchmarkReady
    ? 'private_benchmark_ready'
    : handoffReady
    ? 'certified_handoff_ready'
    : publicationVerified ? 'publication_verified' : proofBundleCompiled ? 'proof_bundle_compiled' : rivalReplayInspected ? 'rival_replay_inspected' : rivalReplayPrepared ? 'rival_replay_prepared' : evidencePrepared ? 'evidence_ready' : 'blocked'

  return {
    schema_version: 'atlas.frontend.desktop_competitive_readiness.v1',
    status,
    rivals: ['pbakaus_impeccable', 'claude_design', 'generic_provider_design'],
    proof_ladder: proofLadder,
    hard_questions: [
      'esta mais poderoso e mais completo que Impeccable?',
      'esta mais poderoso e mais completo que Claude Design?',
      'tem como deixar ainda mais inteligente?',
      'tem como deixar ainda mais impecavel?',
      'operator packet esta verificado sem path bruto e sem dispatch falso?',
      'proof bundle competitivo foi compilado sem guardar artefato bruto?',
      'benchmark privado ja gerou aprendizado operacional sem claim publico?',
      'existe evidencia real ou so preparacao local?',
    ],
    blockers,
    proof_contract: {
      status: proofContractStatus,
      next_minimum_actions: payloadStringArray(rivalReplayInspection?.payload, ['competitive_proof_contract', 'next_minimum_actions']),
    },
    operator_packet_verification: {
      status: operatorPacketVerificationStatus,
      blockers: payloadStringArray(rivalReplay?.payload, ['operator_packet_verification_blockers']),
      warnings: payloadStringArray(rivalReplay?.payload, ['operator_packet_verification_warnings']),
    },
    proof_bundle: {
      status: proofBundleStatus,
      readiness: payloadRecord(proofBundle?.payload, ['readiness']),
      required_next_actions: payloadStringArray(proofBundle?.payload, ['required_next_actions']),
    },
    publication: {
      status: payloadStatus(publication?.payload),
      public_receipt_status: payloadString(publication?.payload, ['public_receipt_status']) || 'not_available',
      required_next_actions: payloadStringArray(publication?.payload, ['required_next_actions']),
    },
    claim_policy: {
      selected_repository_is_primary_workspace: true,
      frontend_app_is_subscope_only: true,
      space_runtime_required: false,
      provider_dispatch_performed_by_panel: false,
      local_certification_is_not_private_benchmark_proof: true,
      private_benchmark_for_internal_improvement_only: true,
      public_superiority_claims_disabled: true,
      world_best_claim_allowed: false,
    },
  }
}

function payloadStatus(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'unknown'
  const record = payload as Record<string, unknown>

  return typeof record.status === 'string' ? record.status : 'unknown'
}

function payloadBoolean(payload: unknown, path: string[]): boolean {
  let current: unknown = payload
  for (const key of path) {
    if (!current || typeof current !== 'object') return false
    current = (current as Record<string, unknown>)[key]
  }

  return current === true
}

function payloadStringArray(payload: unknown, path: string[]): string[] {
  let current: unknown = payload
  for (const key of path) {
    if (!current || typeof current !== 'object') return []
    current = (current as Record<string, unknown>)[key]
  }

  return Array.isArray(current) ? current.filter((item): item is string => typeof item === 'string' && item !== '') : []
}

function payloadRecord(payload: unknown, path: string[]): Record<string, unknown> {
  let current: unknown = payload
  for (const key of path) {
    if (!current || typeof current !== 'object') return {}
    current = (current as Record<string, unknown>)[key]
  }

  return current && typeof current === 'object' && !Array.isArray(current) ? current as Record<string, unknown> : {}
}

function payloadString(payload: unknown, path: string[]): string {
  let current: unknown = payload
  for (const key of path) {
    if (!current || typeof current !== 'object') return ''
    current = (current as Record<string, unknown>)[key]
  }

  return typeof current === 'string' ? current : ''
}
