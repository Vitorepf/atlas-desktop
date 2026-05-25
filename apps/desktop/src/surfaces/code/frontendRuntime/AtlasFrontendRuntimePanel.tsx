import { useMemo, useState } from 'react'
import { PanelTitle } from '@atlas/ui'
import type { CoreStatus } from '@atlas/domain'
import { btnPrimary, EmptyText, Row, sectionHeading } from '../panels/RightRailPrimitives'
import {
  activateAtlasFrontendProjectWorkspace,
  applyAtlasFrontendReplayPatch,
  certifyAtlasFrontendRun,
  compileAtlasFrontendHandoff,
  compileAtlasFrontendProofBundle,
  inspectAtlasFrontendControlPlane,
  inspectAtlasFrontendRivalReplay,
  prepareAtlasFrontendEvidence,
  prepareAtlasFrontendReplayExternalReceiptTemplate,
  prepareAtlasFrontendReplayScoreTemplate,
  prepareAtlasFrontendRivalReplay,
  prepareAtlasFrontendPublicationReceipt,
  projectAtlasFrontendRuntime,
  scanAtlasFrontendPortfolio,
  selectAtlasFrontendWorkspace,
  verifyAtlasFrontendPublication,
  writeAtlasFrontendSelectionReceipt,
  type AtlasFrontendApiError,
  type AtlasFrontendWorkspaceApiEnvelope,
} from './api.ts'
import { summarizeAtlasFrontendRivalReplayActionQueue } from './actionQueueSummary.ts'
import { buildAtlasFrontendArtifactPlan, type AtlasFrontendArtifactPlan } from './artifactDefaults.ts'
import { buildAtlasFrontendCompetitiveReadiness } from './competitiveReadiness.ts'
import {
  extractAtlasFrontendPortfolioCandidates,
  extractAtlasFrontendSuggestedFrontendApp,
  type AtlasFrontendPortfolioCandidate,
} from './workspaceSelection.ts'

interface AtlasFrontendRuntimePanelProps {
  core: CoreStatus
  busy: boolean
}

type StageId = 'portfolio' | 'selected_workspace' | 'selection_receipt' | 'project_activation' | 'runtime_projection' | 'control_plane' | 'prepare_evidence' | 'prepare_rival_replay' | 'inspect_rival_replay' | 'replay_external_receipt_template' | 'replay_score_template' | 'replay_apply_patch' | 'proof_bundle' | 'publication_receipt_template' | 'publication_verify' | 'run_certification' | 'handoff'
type Envelope = AtlasFrontendWorkspaceApiEnvelope<unknown>

export function AtlasFrontendRuntimePanel({ core, busy }: AtlasFrontendRuntimePanelProps) {
  const defaultWorkspace = core.workspacePath || ''
  const [folderRoot, setFolderRoot] = useState(defaultWorkspace)
  const [workspace, setWorkspace] = useState(defaultWorkspace)
  const [frontendApp, setFrontendApp] = useState('')
  const [task, setTask] = useState('Melhorar frontend do repositório selecionado')
  const [providerPacket, setProviderPacket] = useState('')
  const [visualReport, setVisualReport] = useState('')
  const [designReviewReport, setDesignReviewReport] = useState('')
  const [qualityBudgetReport, setQualityBudgetReport] = useState('')
  const [evidenceManifest, setEvidenceManifest] = useState('')
  const [evidenceRoot, setEvidenceRoot] = useState('')
  const [productProofBundle, setProductProofBundle] = useState('')
  const [publicationReceipt, setPublicationReceipt] = useState('')
  const [publicationReport, setPublicationReport] = useState('')
  const [rivalReplayCase, setRivalReplayCase] = useState('saas_dashboard_repair')
  const [rivalReplaySystem, setRivalReplaySystem] = useState('pbakaus_impeccable')
  const [rivalReplayPatch, setRivalReplayPatch] = useState('')
  const [outcomeStore, setOutcomeStore] = useState('')
  const [runCertificationReport, setRunCertificationReport] = useState('')
  const [artifactPlan, setArtifactPlan] = useState<AtlasFrontendArtifactPlan | null>(null)
  const [reports, setReports] = useState<Partial<Record<StageId, Envelope>>>({})
  const [error, setError] = useState<AtlasFrontendApiError | null>(null)
  const [loadingStage, setLoadingStage] = useState<StageId | null>(null)

  const latest = useMemo(() => {
    return reports.handoff
      ?? reports.run_certification
      ?? reports.publication_verify
      ?? reports.publication_receipt_template
      ?? reports.proof_bundle
      ?? reports.replay_apply_patch
      ?? reports.replay_score_template
      ?? reports.replay_external_receipt_template
      ?? reports.inspect_rival_replay
      ?? reports.prepare_rival_replay
      ?? reports.prepare_evidence
      ?? reports.control_plane
      ?? reports.runtime_projection
      ?? reports.project_activation
      ?? reports.selection_receipt
      ?? reports.selected_workspace
      ?? reports.portfolio
      ?? null
  }, [reports])
  const disabled = busy || loadingStage !== null
  const selectedPolicyOk = latest
    ? latest.meta.selected_repository_is_primary_workspace === true
      && latest.meta.frontend_app_is_subscope_only === true
      && latest.meta.space_runtime_required === false
    : false
  const competitiveReadiness = useMemo(() => buildAtlasFrontendCompetitiveReadiness({ artifactPlan, reports }), [artifactPlan, reports])
  const rivalReplayActionQueue = useMemo(
    () => summarizeAtlasFrontendRivalReplayActionQueue(reports.inspect_rival_replay?.payload ?? reports.prepare_rival_replay?.payload),
    [reports.inspect_rival_replay, reports.prepare_rival_replay],
  )
  const portfolioCandidates = useMemo(
    () => extractAtlasFrontendPortfolioCandidates(reports.portfolio?.payload, folderRoot),
    [reports.portfolio, folderRoot],
  )

  async function run(stage: StageId, action: () => Promise<Envelope>): Promise<Envelope | null> {
    setError(null)
    setLoadingStage(stage)
    try {
      const report = await action()
      setReports((current) => ({ ...current, [stage]: report }))
      return report
    } catch (cause) {
      setError(normalizeError(cause))
      return null
    } finally {
      setLoadingStage(null)
    }
  }

  function applyArtifactPlan(): void {
    applyArtifactPlanFor(workspace, frontendApp)
  }

  function applyArtifactPlanFor(nextWorkspace: string, nextFrontendApp: string): void {
    const plan = buildAtlasFrontendArtifactPlan({ workspace: nextWorkspace, frontendApp: nextFrontendApp, task })
    setArtifactPlan(plan)
    setProviderPacket(plan.provider_packet)
    setVisualReport(plan.visual_report)
    setDesignReviewReport(plan.design_review_report)
    setQualityBudgetReport(plan.quality_budget_report)
    setEvidenceManifest(plan.evidence_manifest)
    setEvidenceRoot(plan.evidence_root)
    setProductProofBundle(plan.product_proof_bundle)
    setPublicationReceipt(plan.publication_receipt)
    setPublicationReport(plan.publication_report)
    setOutcomeStore(plan.outcome_store)
    setRunCertificationReport(plan.run_certification_report)
  }

  function usePortfolioCandidate(candidate: AtlasFrontendPortfolioCandidate): void {
    setWorkspace(candidate.workspace)
    setFrontendApp('')
    setArtifactPlan(null)
    setReports((current) => ({
      portfolio: current.portfolio,
    }))
  }

  async function selectWorkspaceFromFields(): Promise<void> {
    const report = await run('selected_workspace', () => selectAtlasFrontendWorkspace({
      workspace,
      frontend_app: frontendApp,
      task,
      selection_source: 'atlas_code',
    }))
    if (!report) return

    const suggestedFrontendApp = extractAtlasFrontendSuggestedFrontendApp(report.payload)
    const nextFrontendApp = frontendApp.trim() || suggestedFrontendApp || ''
    if (suggestedFrontendApp && frontendApp.trim() === '') {
      setFrontendApp(suggestedFrontendApp)
    }
    applyArtifactPlanFor(workspace, nextFrontendApp)
  }

  return (
    <div className="ops-section">
      <PanelTitle label="Atlas Frontend" meta={latest ? `${latest.surface} · ${latest.transport_status}` : 'repo selecionado'} />

      <div style={{ display: 'grid', gap: 8 }}>
        <Field label="pasta com repos" value={folderRoot} onChange={setFolderRoot} placeholder="/Users/.../empresa" />
        <Field label="repo workspace" value={workspace} onChange={setWorkspace} placeholder={defaultWorkspace || '/Users/.../empresa/app'} />
        <Field label="frontend_app" value={frontendApp} onChange={setFrontendApp} placeholder="apps/web opcional" />
        <Field label="tarefa" value={task} onChange={setTask} placeholder="O que o Atlas deve entregar neste frontend" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || folderRoot.trim() === ''}
          onClick={() => void run('portfolio', () => scanAtlasFrontendPortfolio({ root: folderRoot, task, max_depth: 2 }))}
        >
          {loadingStage === 'portfolio' ? 'varrendo...' : 'varrer repos'}
        </button>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || workspace.trim() === ''}
          onClick={() => void selectWorkspaceFromFields()}
        >
          {loadingStage === 'selected_workspace' ? 'selecionando...' : 'selecionar repo'}
        </button>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || workspace.trim() === '' || task.trim() === ''}
          onClick={() => void run('runtime_projection', () => projectAtlasFrontendRuntime({
            workspace,
            frontend_app: frontendApp,
            task,
            provider: 'provider_neutral',
            acceptance_criteria: true,
            test_plan: true,
            visual_quality_plan: true,
            evidence_plan: true,
            senior_design_review: true,
            asset_context: true,
            company_profile_ready: true,
          }))}
        >
          {loadingStage === 'runtime_projection' ? 'projetando...' : 'projetar runtime'}
        </button>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || workspace.trim() === '' || task.trim() === ''}
          onClick={() => void run('control_plane', () => inspectAtlasFrontendControlPlane({
            workspace,
            frontend_app: frontendApp,
            task,
            provider: 'provider_neutral',
            acceptance_criteria: true,
            test_plan: true,
            visual_quality_plan: true,
            evidence_plan: true,
            senior_design_review: true,
            asset_context: true,
            company_profile_ready: true,
            rival_evidence: artifactPlan?.rival_replay_directory,
            bundle: productProofBundle || artifactPlan?.product_proof_bundle,
            publication_receipt: publicationReceipt || artifactPlan?.publication_receipt,
          }))}
        >
          {loadingStage === 'control_plane' ? 'auditando...' : 'control plane'}
        </button>
      </div>

      {portfolioCandidates.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <div style={sectionHeading}>Repos encontrados</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {portfolioCandidates.map((candidate) => (
              <button
                key={`${candidate.workspace}:${candidate.label}`}
                type="button"
                style={repoCandidateStyle(candidate.workspace === workspace)}
                disabled={disabled}
                onClick={() => usePortfolioCandidate(candidate)}
              >
                <span style={{ fontWeight: 700 }}>{candidate.label}</span>
                <span style={{ color: 'var(--cc-text-muted)' }}>
                  {candidate.status} · score {candidate.score} · {candidate.framework || 'framework indefinido'}
                </span>
                <span style={{ color: 'var(--cc-text-muted)' }}>
                  frontend_app: {candidate.frontendAppCandidateStatus} · {candidate.frontendAppCandidateCount} candidato(s)
                </span>
              </button>
            ))}
          </div>
          <EmptyText>Escolher um repo aqui só preenche o workspace local. A execução continua bloqueada até o contrato de selected workspace confirmar o repo primário.</EmptyText>
        </div>
      ) : null}

      <div style={sectionHeading}>Certificação pós-provider</div>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || workspace.trim() === ''}
        onClick={applyArtifactPlan}
      >
        preencher caminhos padrão de evidência
      </button>
      {artifactPlan ? (
        <div style={{ marginBottom: 8 }}>
          <dl style={{ margin: 0 }}>
            <Row k="artifact plan" v={artifactPlan.status} ok={artifactPlan.status === 'ready'} />
            <Row k="evidence dir" v={artifactPlan.evidence_directory || 'missing'} mono ok={artifactPlan.status === 'ready'} />
            <Row k="selection receipt" v={artifactPlan.selection_receipt || 'missing'} mono ok={artifactPlan.status === 'ready'} />
            <Row k="product proof" v={artifactPlan.product_proof_bundle || 'missing'} mono ok={artifactPlan.status === 'ready'} />
            <Row k="publication receipt" v={artifactPlan.publication_receipt || 'missing'} mono ok={artifactPlan.status === 'ready'} />
            <Row k="publication report" v={artifactPlan.publication_report || 'missing'} mono ok={artifactPlan.status === 'ready'} />
            <Row k="rival replay" v={artifactPlan.rival_replay_directory || 'missing'} mono ok={artifactPlan.status === 'ready'} />
            <Row k="proof file" v={artifactPlan.rival_replay_proof_contract || 'missing'} mono ok={artifactPlan.status === 'ready'} />
            <Row k="operator packet" v={artifactPlan.rival_replay_operator_packet || 'missing'} mono ok={artifactPlan.status === 'ready'} />
            <Row k="proof bundle" v={artifactPlan.rival_replay_proof_bundle || 'missing'} mono ok={artifactPlan.status === 'ready'} />
            <Row k="commands" v="sugestões" ok={artifactPlan.claim_policy.commands_are_suggestions_only} />
          </dl>
          <pre style={previewStyle}>{safePreview(artifactPlan.commands)}</pre>
        </div>
      ) : null}
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === ''}
        onClick={() => artifactPlan ? void run('selection_receipt', () => writeAtlasFrontendSelectionReceipt({
          portfolio_root: folderRoot,
          workspace,
          frontend_app: frontendApp,
          task,
          selection_source: 'atlas_code',
          output: artifactPlan.selection_receipt,
        })) : undefined}
      >
        {loadingStage === 'selection_receipt' ? 'registrando seleção...' : 'gerar receipt de seleção'}
      </button>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || workspace.trim() === ''}
        onClick={() => void run('project_activation', () => activateAtlasFrontendProjectWorkspace({
          workspace,
          frontend_app: frontendApp,
          task,
          selection_source: 'atlas_code',
          project_slug: slugifyProjectName(workspace),
          project_name: projectNameFromPath(workspace),
        }))}
      >
        {loadingStage === 'project_activation' ? 'ativando projeto...' : 'ativar projeto no Atlas Code'}
      </button>
      <div style={{ marginBottom: 8 }}>
        <dl style={{ margin: 0 }}>
          <Row k="competitive" v={competitiveReadiness.status} ok={competitiveReadiness.status === 'certified_handoff_ready'} />
          <Row k="rivals" v={competitiveReadiness.rivals.join(', ')} ok={competitiveReadiness.blockers.length === 1 && competitiveReadiness.blockers[0] === 'external_rival_replay_receipts'} />
          <Row k="world best" v="requer replay externo" ok={competitiveReadiness.claim_policy.world_best_claim_allowed === false} />
          <Row k="proof contract" v={competitiveReadiness.proof_contract.status} ok={competitiveReadiness.proof_contract.status === 'world_best_proof_ready'} />
          <Row k="operator verify" v={competitiveReadiness.operator_packet_verification.status} ok={competitiveReadiness.operator_packet_verification.status === 'passed'} />
          <Row k="proof bundle" v={competitiveReadiness.proof_bundle.status} ok={competitiveReadiness.proof_bundle.status === 'world_best_replay_proof_ready'} />
          <Row k="publication" v={`${competitiveReadiness.publication.status} · ${competitiveReadiness.publication.public_receipt_status}`} ok={competitiveReadiness.publication.status === 'public_verified'} />
          <Row k="replay queue" v={`${rivalReplayActionQueue.status} · ${rivalReplayActionQueue.work_item_count} itens`} ok={rivalReplayActionQueue.status === 'ready'} />
          <Row k="evidence packs" v={String(rivalReplayActionQueue.evidence_pack_items)} ok={rivalReplayActionQueue.evidence_pack_items === 0} />
          <Row k="external receipts" v={String(rivalReplayActionQueue.external_execution_receipt_items)} ok={rivalReplayActionQueue.external_execution_receipt_items === 0} />
          <Row k="score attestations" v={String(rivalReplayActionQueue.score_attestation_items)} ok={rivalReplayActionQueue.score_attestation_items === 0} />
          <Row k="manifest patches" v={String(rivalReplayActionQueue.manifest_patch_items)} ok={rivalReplayActionQueue.manifest_patch_items > 0 || rivalReplayActionQueue.status === 'ready'} />
        </dl>
        <pre style={previewStyle}>{safePreview(competitiveReadiness)}</pre>
        {rivalReplayActionQueue.status !== 'not_available' ? (
          <pre style={previewStyle}>{safePreview(rivalReplayActionQueue)}</pre>
        ) : null}
        {rivalReplayActionQueue.operator_sequence.length > 0 ? (
          <pre style={previewStyle}>{safePreview({ operator_sequence: rivalReplayActionQueue.operator_sequence })}</pre>
        ) : null}
        {competitiveReadiness.proof_contract.next_minimum_actions.length > 0 ? (
          <pre style={previewStyle}>{safePreview(competitiveReadiness.proof_contract)}</pre>
        ) : null}
        {competitiveReadiness.proof_bundle.required_next_actions.length > 0 ? (
          <pre style={previewStyle}>{safePreview(competitiveReadiness.proof_bundle)}</pre>
        ) : null}
        {competitiveReadiness.publication.required_next_actions.length > 0 ? (
          <pre style={previewStyle}>{safePreview(competitiveReadiness.publication)}</pre>
        ) : null}
      </div>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === ''}
        onClick={() => artifactPlan ? void run('prepare_evidence', () => prepareAtlasFrontendEvidence({
          workspace,
          frontend_app: frontendApp,
          task,
          provider: 'provider_neutral',
          output: artifactPlan.evidence_directory,
          acceptance_criteria: true,
          test_plan: true,
          visual_quality_plan: true,
          evidence_plan: true,
          senior_design_review: true,
          asset_context: true,
          company_profile_ready: true,
        })) : undefined}
      >
        {loadingStage === 'prepare_evidence' ? 'preparando...' : 'preparar kit no backend'}
      </button>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === ''}
        onClick={() => artifactPlan ? void run('prepare_rival_replay', () => prepareAtlasFrontendRivalReplay({
          workspace,
          frontend_app: frontendApp,
          task,
          output: artifactPlan.rival_replay_directory,
        })) : undefined}
      >
        {loadingStage === 'prepare_rival_replay' ? 'preparando replay...' : 'preparar replay competitivo'}
      </button>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === ''}
        onClick={() => artifactPlan ? void run('inspect_rival_replay', () => inspectAtlasFrontendRivalReplay({
          workspace,
          frontend_app: frontendApp,
          task,
          evidence: artifactPlan.rival_replay_directory,
        })) : undefined}
      >
        {loadingStage === 'inspect_rival_replay' ? 'inspecionando replay...' : 'inspecionar replay competitivo'}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="replay case" value={rivalReplayCase} onChange={setRivalReplayCase} placeholder="saas_dashboard_repair" />
        <Field label="replay system" value={rivalReplaySystem} onChange={setRivalReplaySystem} placeholder="pbakaus_impeccable" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === '' || rivalReplayCase.trim() === '' || rivalReplaySystem.trim() === ''}
          onClick={() => artifactPlan ? void run('replay_external_receipt_template', () => prepareAtlasFrontendReplayExternalReceiptTemplate({
            workspace,
            frontend_app: frontendApp,
            task,
            evidence: artifactPlan.rival_replay_directory,
            case_id: rivalReplayCase,
            system: rivalReplaySystem,
          })) : undefined}
        >
          {loadingStage === 'replay_external_receipt_template' ? 'gerando receipt...' : 'template receipt externo'}
        </button>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === '' || rivalReplayCase.trim() === '' || rivalReplaySystem.trim() === ''}
          onClick={() => artifactPlan ? void run('replay_score_template', () => prepareAtlasFrontendReplayScoreTemplate({
            workspace,
            frontend_app: frontendApp,
            task,
            evidence: artifactPlan.rival_replay_directory,
            case_id: rivalReplayCase,
            system: rivalReplaySystem,
          })) : undefined}
        >
          {loadingStage === 'replay_score_template' ? 'gerando score...' : 'template score attestation'}
        </button>
      </div>
      <Field label="rival replay patch" value={rivalReplayPatch} onChange={setRivalReplayPatch} placeholder="external-patch.json ou score-patch.json" />
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === '' || rivalReplayPatch.trim() === ''}
        onClick={() => artifactPlan ? void run('replay_apply_patch', () => applyAtlasFrontendReplayPatch({
          workspace,
          frontend_app: frontendApp,
          task,
          evidence: artifactPlan.rival_replay_directory,
          patch: rivalReplayPatch,
        })) : undefined}
      >
        {loadingStage === 'replay_apply_patch' ? 'aplicando patch...' : 'aplicar patch seguro do replay'}
      </button>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === ''}
        onClick={() => artifactPlan ? void run('proof_bundle', () => compileAtlasFrontendProofBundle({
          workspace,
          frontend_app: frontendApp,
          task,
          evidence: artifactPlan.rival_replay_directory,
        })) : undefined}
      >
        {loadingStage === 'proof_bundle' ? 'compilando proof bundle...' : 'compilar proof bundle competitivo'}
      </button>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === ''}
        onClick={() => artifactPlan ? void run('publication_receipt_template', () => prepareAtlasFrontendPublicationReceipt({
          workspace,
          frontend_app: frontendApp,
          task,
          bundle: productProofBundle || artifactPlan.product_proof_bundle,
          output: artifactPlan.evidence_directory,
        })) : undefined}
      >
        {loadingStage === 'publication_receipt_template' ? 'gerando receipt...' : 'gerar receipt de publicação'}
      </button>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === '' || productProofBundle.trim() === ''}
        onClick={() => artifactPlan ? void run('publication_verify', () => verifyAtlasFrontendPublication({
          workspace,
          frontend_app: frontendApp,
          task,
          bundle: productProofBundle,
          receipt: publicationReceipt,
        })) : undefined}
      >
        {loadingStage === 'publication_verify' ? 'verificando publicação...' : 'verificar publicação'}
      </button>
      <div style={{ display: 'grid', gap: 8 }}>
        <Field label="provider packet" value={providerPacket} onChange={setProviderPacket} placeholder="provider-instruction-packet.json" />
        <Field label="visual report" value={visualReport} onChange={setVisualReport} placeholder="visual-quality-report.json" />
        <Field label="design review" value={designReviewReport} onChange={setDesignReviewReport} placeholder="design-review-report.json" />
        <Field label="quality budget" value={qualityBudgetReport} onChange={setQualityBudgetReport} placeholder="quality-budget-report.json" />
        <Field label="evidence manifest" value={evidenceManifest} onChange={setEvidenceManifest} placeholder="evidence/evidence-pack.json" />
        <Field label="evidence root" value={evidenceRoot} onChange={setEvidenceRoot} placeholder="evidence/" />
        <Field label="product proof bundle" value={productProofBundle} onChange={setProductProofBundle} placeholder="product-proof/" />
        <Field label="publication receipt" value={publicationReceipt} onChange={setPublicationReceipt} placeholder="publication-receipt.json" />
        <Field label="publication report" value={publicationReport} onChange={setPublicationReport} placeholder="publication-report.json" />
        <Field label="outcome store" value={outcomeStore} onChange={setOutcomeStore} placeholder="outcomes.jsonl" />
      </div>

      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginTop: 8 }}
        disabled={disabled || !providerPacket || !visualReport || !designReviewReport || !qualityBudgetReport || !evidenceManifest || !evidenceRoot || !outcomeStore}
        onClick={() => void run('run_certification', () => certifyAtlasFrontendRun({
          provider_packet: providerPacket,
          visual_report: visualReport,
          design_review_report: designReviewReport,
          quality_budget_report: qualityBudgetReport,
          evidence_manifest: evidenceManifest,
          evidence_root: evidenceRoot,
          bundle: productProofBundle,
          publication_receipt: publicationReceipt,
          outcome_store: outcomeStore,
        }))}
      >
        {loadingStage === 'run_certification' ? 'certificando...' : 'certificar run'}
      </button>

      <div style={sectionHeading}>Handoff</div>
      <Field label="run certification" value={runCertificationReport} onChange={setRunCertificationReport} placeholder="run-certification.json" />
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginTop: 8 }}
        disabled={disabled || !runCertificationReport || !evidenceManifest}
        onClick={() => void run('handoff', () => compileAtlasFrontendHandoff({
          run_certification_report: runCertificationReport,
          evidence_manifest: evidenceManifest,
          publication_report: publicationReport,
        }))}
      >
        {loadingStage === 'handoff' ? 'compilando...' : 'compilar handoff'}
      </button>

      {latest ? (
        <div style={{ marginTop: 12 }}>
          <dl style={{ margin: 0 }}>
            <Row k="schema" v={latest.schema_version} mono ok={latest.schema_version.startsWith('atlas.frontend.workspace_api.')} />
            <Row k="status" v={latest.transport_status} ok={latest.transport_status === 'ok'} />
            <Row k="repo primário" v={latest.meta.selected_repository_is_primary_workspace ? 'sim' : 'não'} ok={latest.meta.selected_repository_is_primary_workspace === true} />
            <Row k="frontend_app" v={latest.meta.frontend_app_is_subscope_only ? 'subescopo' : 'indefinido'} ok={latest.meta.frontend_app_is_subscope_only === true} />
            <Row k="space runtime" v={latest.meta.space_runtime_required ? 'requerido' : 'ausente'} ok={latest.meta.space_runtime_required === false} />
            <Row k="world best" v={latest.meta.world_best_claim_allowed ? 'liberado' : 'bloqueado'} ok={latest.meta.world_best_claim_allowed === false} />
          </dl>
          {!selectedPolicyOk ? (
            <EmptyText>política de workspace insegura: re-selecione o repositório antes de executar.</EmptyText>
          ) : null}
          <pre style={previewStyle}>{safePreview(latest.payload)}</pre>
        </div>
      ) : (
        <EmptyText>Selecione um repositório local para ativar o runtime frontend. O Atlas não executa provider nesta aba.</EmptyText>
      )}

      {error ? (
        <div style={errorStyle}>
          {error.kind} · {error.message}
        </div>
      ) : null}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 11.5, color: 'var(--cc-text-muted)' }}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  )
}

function normalizeError(cause: unknown): AtlasFrontendApiError {
  if (cause && typeof cause === 'object' && 'kind' in cause && 'message' in cause) {
    return cause as AtlasFrontendApiError
  }

  return {
    kind: 'http_error',
    message: cause instanceof Error ? cause.message : 'Falha desconhecida no Atlas Frontend.',
    requires_reselection: false,
  }
}

function safePreview(payload: unknown): string {
  return JSON.stringify(payload, null, 2)
    .replace(/\/Users\/[^"\s]+/g, '<local-path-redacted>')
    .slice(0, 2400)
}

function projectNameFromPath(path: string): string {
  const normalized = path.trim().replace(/\/+$/, '')
  const parts = normalized.split(/[\\/]/).filter(Boolean)
  return parts.at(-1) || 'Atlas Frontend Project'
}

function slugifyProjectName(path: string): string {
  const slug = projectNameFromPath(path)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length >= 3 ? slug : `frontend-${slug || 'project'}`
}

function repoCandidateStyle(active: boolean) {
  return {
    display: 'grid',
    gap: 3,
    width: '100%',
    padding: '9px 10px',
    border: `1px solid ${active ? 'var(--cc-accent, #5b8def)' : 'var(--cc-border-soft)'}`,
    borderRadius: 'var(--cc-radius-sm)',
    background: active ? 'var(--cc-surface-selected, rgba(91, 141, 239, 0.12))' : 'var(--cc-surface-raised)',
    color: 'var(--cc-text-strong)',
    textAlign: 'left',
    cursor: 'pointer',
  } as const
}

const inputStyle = {
  minWidth: 0,
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 9px',
  border: '1px solid var(--cc-border-soft)',
  borderRadius: 'var(--cc-radius-sm)',
  background: 'var(--cc-surface-raised)',
  color: 'var(--cc-text-strong)',
  fontFamily: 'var(--cc-font-mono)',
  fontSize: 11.5,
  letterSpacing: 0,
} as const

const previewStyle = {
  maxHeight: 260,
  overflow: 'auto',
  padding: 10,
  border: '1px solid var(--cc-border-soft)',
  borderRadius: 'var(--cc-radius-sm)',
  background: 'var(--cc-surface-raised)',
  color: 'var(--cc-text-muted)',
  fontFamily: 'var(--cc-font-mono)',
  fontSize: 10.5,
  lineHeight: 1.45,
  whiteSpace: 'pre-wrap',
} as const

const errorStyle = {
  marginTop: 10,
  padding: 10,
  border: '1px solid var(--rec-red, #8a3025)',
  borderRadius: 'var(--cc-radius-sm)',
  color: 'var(--rec-red, #8a3025)',
  background: 'var(--rec-red-veil, rgba(138,48,37,0.08))',
  fontFamily: 'var(--cc-font-sans)',
  fontSize: 12,
  lineHeight: 1.45,
} as const
