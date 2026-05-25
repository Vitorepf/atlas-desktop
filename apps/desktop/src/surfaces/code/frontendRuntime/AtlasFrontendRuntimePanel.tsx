import { useEffect, useMemo, useState } from 'react'
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
  planAtlasFrontendCompetitiveBenchmark,
  prepareAtlasFrontendEvidence,
  prepareAtlasFrontendReplayExternalReceiptTemplate,
  prepareAtlasFrontendReplayScoreTemplate,
  prepareAtlasFrontendRivalReplay,
  prepareAtlasFrontendPublicationReceipt,
  projectAtlasFrontendRuntime,
  runAtlasFrontendLiveSourcePatch,
  scanAtlasFrontendPortfolio,
  selectAtlasFrontendWorkspace,
  suggestAtlasFrontendLiveTargets,
  syncAtlasFrontendLiveVisualSelection,
  verifyAtlasFrontendPublication,
  writeAtlasFrontendSelectionReceipt,
  type AtlasFrontendApiError,
  type AtlasFrontendWorkspaceApiEnvelope,
} from './api.ts'
import type { AtlasFrontendLiveVisualSelection } from './api.ts'
import { summarizeAtlasFrontendRivalReplayActionQueue } from './actionQueueSummary.ts'
import { buildAtlasFrontendArtifactPlan, type AtlasFrontendArtifactPlan } from './artifactDefaults.ts'
import { buildAtlasFrontendCompetitiveReadiness } from './competitiveReadiness.ts'
import {
  extractAtlasFrontendOperatorFlow,
  extractAtlasFrontendPortfolioCandidates,
  extractAtlasFrontendSuggestedFrontendApp,
  type AtlasFrontendPortfolioCandidate,
} from './workspaceSelection.ts'

interface AtlasFrontendRuntimePanelProps {
  core: CoreStatus
  busy: boolean
  activeWorkspaceSlug?: string | null
  onSetActiveWorkspaceSlug?: (slug: string) => Promise<void>
  onRefreshWorkspaces?: () => Promise<void>
}

type StageId = 'portfolio' | 'prepare_workspace' | 'prepare_competitive_proof' | 'selected_workspace' | 'selection_receipt' | 'project_activation' | 'runtime_projection' | 'control_plane' | 'competitive_benchmark_plan' | 'live_source_patch' | 'live_visual_selection' | 'live_target_suggestions' | 'prepare_evidence' | 'prepare_rival_replay' | 'inspect_rival_replay' | 'replay_external_receipt_template' | 'replay_score_template' | 'replay_apply_patch' | 'proof_bundle' | 'publication_receipt_template' | 'publication_verify' | 'run_certification' | 'handoff'
type Envelope = AtlasFrontendWorkspaceApiEnvelope<unknown>
interface PrivateImprovementWorkPacket {
  schema_version: string
  packet_id: string
  status: string
  target_scenario_id: string
  best_rival_system: string
  priority: string
  suggested_action: string
  required_context: string[]
  safe_execution_commands: string[]
  success_criteria: string[]
  repair_plan: {
    status: string
    repair_strategy: string
    severity: string
    repair_step_ids: string[]
    rerun_gates: string[]
    evidence_required: string[]
    repair_plan_hash: string
  }
  claim_policy: {
    operator_private_improvement_only: boolean
    public_claims_disabled: boolean
    raw_source_or_absolute_paths_returned: boolean
  }
  work_packet_hash: string
}

export function AtlasFrontendRuntimePanel({
  core,
  busy,
  activeWorkspaceSlug,
  onSetActiveWorkspaceSlug,
  onRefreshWorkspaces,
}: AtlasFrontendRuntimePanelProps) {
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
  const [liveFile, setLiveFile] = useState('')
  const [liveTarget, setLiveTarget] = useState('')
  const [liveVariantId, setLiveVariantId] = useState('v1')
  const [liveVariantPath, setLiveVariantPath] = useState('')
  const [liveSession, setLiveSession] = useState('atlas-live-session')
  const [liveVisualRoute, setLiveVisualRoute] = useState('')
  const [liveVisualSelector, setLiveVisualSelector] = useState('')
  const [liveVisualTextExcerpt, setLiveVisualTextExcerpt] = useState('')
  const [liveVisualComponentHint, setLiveVisualComponentHint] = useState('')
  const [liveVisualScreenshotHash, setLiveVisualScreenshotHash] = useState('')
  const [liveVisualBox, setLiveVisualBox] = useState('')
  const [liveVisualViewport, setLiveVisualViewport] = useState('')
  const [liveVisualConfidence, setLiveVisualConfidence] = useState('0.9')
  const [liveVisualSelectionJson, setLiveVisualSelectionJson] = useState('')
  const [liveVisualSelectionSource, setLiveVisualSelectionSource] = useState<'manual' | 'browser_bridge'>('manual')
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
      ?? reports.competitive_benchmark_plan
      ?? reports.live_source_patch
      ?? reports.live_target_suggestions
      ?? reports.live_visual_selection
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
  const privateImprovementWorkPacket = useMemo(
    () => extractPrivateImprovementWorkPacket(reports.competitive_benchmark_plan?.payload),
    [reports.competitive_benchmark_plan],
  )
  const rivalReplayActionQueue = useMemo(
    () => summarizeAtlasFrontendRivalReplayActionQueue(reports.inspect_rival_replay?.payload ?? reports.prepare_rival_replay?.payload),
    [reports.inspect_rival_replay, reports.prepare_rival_replay],
  )
  const portfolioCandidates = useMemo(
    () => extractAtlasFrontendPortfolioCandidates(reports.portfolio?.payload, folderRoot),
    [reports.portfolio, folderRoot],
  )
  const operatorFlow = useMemo(
    () => extractAtlasFrontendOperatorFlow(reports.portfolio?.payload),
    [reports.portfolio],
  )

  useEffect(() => {
    const storageKey = '__ATLAS_FRONTEND_LAST_LIVE_VISUAL_SELECTION__'
    const channelName = 'atlas:frontend:live-visual-selection'
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(channelName) : null

    function captureLiveVisualSelection(detail: unknown) {
      const selectionJson = serializeLiveVisualSelectionDetail(detail)
      if (!selectionJson) return
      setLiveVisualSelectionJson(selectionJson)
      setLiveVisualSelectionSource('browser_bridge')
      const selection = parseLiveVisualSelection(selectionJson)
      if (workspace.trim() !== '' && selection) {
        void syncAtlasFrontendLiveVisualSelection({
          workspace,
          action: 'record',
          session: liveSession,
          selection,
        }).then((report) => {
          setReports((current) => ({ ...current, live_visual_selection: report }))
        }).catch(() => undefined)
      }
    }

    function onLiveVisualSelection(event: Event) {
      captureLiveVisualSelection(event instanceof CustomEvent ? event.detail : null)
    }

    function onStorage(event: StorageEvent) {
      if (event.key !== storageKey || !event.newValue) return
      try {
        captureLiveVisualSelection(JSON.parse(event.newValue) as unknown)
      } catch {
        return
      }
    }

    function onMessage(event: MessageEvent) {
      captureLiveVisualSelection(event.data)
    }

    window.addEventListener(channelName, onLiveVisualSelection)
    window.addEventListener('storage', onStorage)
    window.addEventListener('message', onMessage)
    if (channel) channel.onmessage = (event) => captureLiveVisualSelection(event.data)

    return () => {
      window.removeEventListener(channelName, onLiveVisualSelection)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('message', onMessage)
      if (channel) channel.close()
    }
  }, [liveSession, workspace])

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

  async function suggestLiveTarget(): Promise<void> {
    const report = await run('live_target_suggestions', () => suggestAtlasFrontendLiveTargets({
      workspace,
      session: liveSession,
      file_hint: liveFile,
      max_candidates: 5,
      visual_selection: buildLiveVisualSelection({
        route: liveVisualRoute,
        selector: liveVisualSelector,
        textExcerpt: liveVisualTextExcerpt,
        componentHint: liveVisualComponentHint,
        screenshotHash: liveVisualScreenshotHash,
        box: liveVisualBox,
        viewport: liveVisualViewport,
        confidence: liveVisualConfidence,
        selectionJson: liveVisualSelectionJson,
      }),
    }))
    const candidate = extractLiveTargetSuggestionCandidate(report?.payload)
    if (!candidate) return
    if (candidate.file) setLiveFile(candidate.file)
    if (candidate.target_snippet) setLiveTarget(candidate.target_snippet)
  }

  function applyArtifactPlan(): void {
    applyArtifactPlanFor(workspace, frontendApp)
  }

  function applyArtifactPlanFor(nextWorkspace: string, nextFrontendApp: string): AtlasFrontendArtifactPlan {
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

    return plan
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

  async function activateProjectWorkspace(): Promise<void> {
    const report = await run('project_activation', () => activateAtlasFrontendProjectWorkspace({
      workspace,
      frontend_app: frontendApp,
      task,
      selection_source: 'atlas_code',
      project_slug: slugifyProjectName(workspace),
      project_name: projectNameFromPath(workspace),
    }))
    const slug = extractProjectActivationSlug(report?.payload)
    if (!slug) return
    await onRefreshWorkspaces?.()
    await onSetActiveWorkspaceSlug?.(slug)
  }

  async function prepareSelectedRepositoryWorkspace(): Promise<void> {
    setLoadingStage('prepare_workspace')
    setError(null)
    try {
      const selected = await selectAtlasFrontendWorkspace({
        workspace,
        frontend_app: frontendApp,
        task,
        selection_source: 'atlas_code',
      })
      setReports((current) => ({ ...current, selected_workspace: selected }))

      const suggestedFrontendApp = extractAtlasFrontendSuggestedFrontendApp(selected.payload)
      const nextFrontendApp = frontendApp.trim() || suggestedFrontendApp || ''
      if (suggestedFrontendApp && frontendApp.trim() === '') {
        setFrontendApp(suggestedFrontendApp)
      }

      const plan = applyArtifactPlanFor(workspace, nextFrontendApp)
      if (plan.status !== 'ready') return

      const receipt = await writeAtlasFrontendSelectionReceipt({
        portfolio_root: folderRoot,
        workspace,
        frontend_app: nextFrontendApp,
        task,
        selection_source: 'atlas_code',
        output: plan.selection_receipt,
      })
      setReports((current) => ({ ...current, selection_receipt: receipt }))

      const activation = await activateAtlasFrontendProjectWorkspace({
        workspace,
        frontend_app: nextFrontendApp,
        task,
        selection_source: 'atlas_code',
        project_slug: slugifyProjectName(workspace),
        project_name: projectNameFromPath(workspace),
      })
      setReports((current) => ({ ...current, project_activation: activation }))

      const runtimeProjection = await projectAtlasFrontendRuntime({
        workspace,
        frontend_app: nextFrontendApp,
        task,
        provider: 'provider_neutral',
        acceptance_criteria: true,
        test_plan: true,
        visual_quality_plan: true,
        evidence_plan: true,
        senior_design_review: true,
        asset_context: true,
        company_profile_ready: true,
      })
      setReports((current) => ({ ...current, runtime_projection: runtimeProjection }))

      const slug = extractProjectActivationSlug(activation.payload)
      if (!slug) return
      await onRefreshWorkspaces?.()
      await onSetActiveWorkspaceSlug?.(slug)
    } catch (cause) {
      setError(normalizeError(cause))
    } finally {
      setLoadingStage(null)
    }
  }

  async function prepareCompetitiveProofTrack(): Promise<void> {
    if (!artifactPlan || artifactPlan.status !== 'ready') return

    setLoadingStage('prepare_competitive_proof')
    setError(null)
    try {
      const evidence = await prepareAtlasFrontendEvidence({
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
      })
      setReports((current) => ({ ...current, prepare_evidence: evidence }))

      const replay = await prepareAtlasFrontendRivalReplay({
        workspace,
        frontend_app: frontendApp,
        task,
        output: artifactPlan.rival_replay_directory,
      })
      setReports((current) => ({ ...current, prepare_rival_replay: replay }))

      const inspection = await inspectAtlasFrontendRivalReplay({
        workspace,
        frontend_app: frontendApp,
        task,
        evidence: artifactPlan.rival_replay_directory,
      })
      setReports((current) => ({ ...current, inspect_rival_replay: inspection }))

      const bundle = await compileAtlasFrontendProofBundle({
        workspace,
        frontend_app: frontendApp,
        task,
        evidence: artifactPlan.rival_replay_directory,
      })
      setReports((current) => ({ ...current, proof_bundle: bundle }))
    } catch (cause) {
      setError(normalizeError(cause))
    } finally {
      setLoadingStage(null)
    }
  }

  function useNextReplayWorkItem(): void {
    const next = rivalReplayActionQueue.next_work_item
    if (!next) return
    if (next.case_id) setRivalReplayCase(next.case_id)
    if (next.system) setRivalReplaySystem(next.system)
  }

  function useNextAutomatableReplayWorkItem(): void {
    const next = rivalReplayActionQueue.next_automatable_work_item
    if (!next) return
    if (next.case_id) setRivalReplayCase(next.case_id)
    if (next.system) setRivalReplaySystem(next.system)
  }

  async function prepareExternalReceiptTemplateFor(caseId: string, system: string): Promise<void> {
    if (!artifactPlan || artifactPlan.status !== 'ready') return
    const report = await run('replay_external_receipt_template', () => prepareAtlasFrontendReplayExternalReceiptTemplate({
      workspace,
      frontend_app: frontendApp,
      task,
      evidence: artifactPlan.rival_replay_directory,
      case_id: caseId,
      system,
    }))
    applyTemplatePatchPath(report, 'external_receipt', caseId, system)
  }

  async function prepareScoreTemplateFor(caseId: string, system: string): Promise<void> {
    if (!artifactPlan || artifactPlan.status !== 'ready') return
    const report = await run('replay_score_template', () => prepareAtlasFrontendReplayScoreTemplate({
      workspace,
      frontend_app: frontendApp,
      task,
      evidence: artifactPlan.rival_replay_directory,
      case_id: caseId,
      system,
    }))
    applyTemplatePatchPath(report, 'score_attestation', caseId, system)
  }

  function applyTemplatePatchPath(report: Envelope | null, kind: 'external_receipt' | 'score_attestation', caseId: string, system: string): void {
    if (!artifactPlan || !templateWasWritten(report?.payload)) return
    setRivalReplayPatch(defaultReplayPatchPath(artifactPlan, kind, caseId, system))
  }

  async function runSuggestedReplayAction(): Promise<void> {
    const next = rivalReplayActionQueue.next_automatable_work_item ?? rivalReplayActionQueue.next_work_item
    if (!next || !artifactPlan || artifactPlan.status !== 'ready') return

    if (next.case_id) setRivalReplayCase(next.case_id)
    if (next.system) setRivalReplaySystem(next.system)

    if (next.suggested_action === 'generate_external_receipt_template') {
      await prepareExternalReceiptTemplateFor(next.case_id, next.system)
      return
    }

    if (next.suggested_action === 'generate_score_attestation_template') {
      await prepareScoreTemplateFor(next.case_id, next.system)
      return
    }

    await run('inspect_rival_replay', () => inspectAtlasFrontendRivalReplay({
      workspace,
      frontend_app: frontendApp,
      task,
      evidence: artifactPlan.rival_replay_directory,
    }))
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
      <div style={{ marginTop: 8 }}>
        <dl style={{ margin: 0 }}>
          <Row k="projeto ativo" v={activeWorkspaceSlug || 'nenhum'} ok={Boolean(activeWorkspaceSlug)} />
        </dl>
      </div>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginTop: 10 }}
        disabled={disabled || workspace.trim() === '' || task.trim() === ''}
        onClick={() => void prepareSelectedRepositoryWorkspace()}
      >
        {loadingStage === 'prepare_workspace' ? 'preparando repo...' : 'preparar repo selecionado'}
      </button>

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

      {operatorFlow ? (
        <div style={{ marginTop: 10 }}>
          <div style={sectionHeading}>Fluxo do operador</div>
          <dl style={{ margin: 0 }}>
            <Row k="flow" v={operatorFlow.status} ok={operatorFlow.status === 'ready_for_repository_choice'} />
            <Row k="repo primário" v={operatorFlow.invariants.selected_repository_is_primary_workspace ? 'sim' : 'não'} ok={operatorFlow.invariants.selected_repository_is_primary_workspace} />
            <Row k="frontend_app" v={operatorFlow.invariants.frontend_app_is_relative_subscope_only ? 'subescopo relativo' : 'indefinido'} ok={operatorFlow.invariants.frontend_app_is_relative_subscope_only} />
            <Row k="portfolio" v={operatorFlow.invariants.portfolio_root_is_inventory_only ? 'inventário' : 'runtime'} ok={operatorFlow.invariants.portfolio_root_is_inventory_only} />
            <Row k="provider dispatch" v={operatorFlow.claim_policy.provider_dispatch_allowed ? 'liberado' : 'bloqueado'} ok={operatorFlow.claim_policy.provider_dispatch_allowed === false} />
            <Row k="space runtime" v={operatorFlow.invariants.space_runtime_required ? 'requerido' : 'ausente'} ok={operatorFlow.invariants.space_runtime_required === false} />
          </dl>
          <pre style={previewStyle}>{safePreview({
            purpose: operatorFlow.purpose,
            stages: operatorFlow.stages.map((stage) => ({
              id: stage.id,
              status: stage.status,
              surface: stage.surface,
              contract: stage.contract,
              command: stage.command || stage.endpoint,
              execution_allowed: stage.execution_allowed,
            })),
            claim_policy: operatorFlow.claim_policy,
          })}</pre>
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
        disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === ''}
        onClick={() => artifactPlan ? void run('competitive_benchmark_plan', () => planAtlasFrontendCompetitiveBenchmark({
          workspace,
          frontend_app: frontendApp,
          task,
          rival_evidence: artifactPlan.rival_replay_directory,
          bundle: productProofBundle,
          publication_receipt: publicationReceipt,
        })) : undefined}
      >
        {loadingStage === 'competitive_benchmark_plan' ? 'planejando benchmark competitivo...' : 'planejar benchmark competitivo'}
      </button>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || workspace.trim() === ''}
        onClick={() => void activateProjectWorkspace()}
      >
        {loadingStage === 'project_activation' ? 'ativando projeto...' : 'ativar projeto no Atlas Code'}
      </button>
      <div style={{ marginBottom: 8 }}>
        <dl style={{ margin: 0 }}>
          <Row k="benchmark privado" v={competitiveReadiness.status} ok={competitiveReadiness.status === 'private_benchmark_ready' || competitiveReadiness.status === 'certified_handoff_ready'} />
          <Row k="rivals" v={competitiveReadiness.rivals.join(', ')} ok={competitiveReadiness.blockers.length === 1 && competitiveReadiness.blockers[0] === 'external_rival_replay_receipts'} />
          <Row k="claim público" v={competitiveReadiness.claim_policy.public_superiority_claims_disabled ? 'bloqueado' : 'liberado'} ok={competitiveReadiness.claim_policy.public_superiority_claims_disabled === true} />
          <Row k="proof contract" v={competitiveReadiness.proof_contract.status} ok={competitiveReadiness.proof_contract.status === 'private_benchmark_ready' || competitiveReadiness.proof_contract.status === 'world_best_proof_ready'} />
          <Row k="operator verify" v={competitiveReadiness.operator_packet_verification.status} ok={competitiveReadiness.operator_packet_verification.status === 'passed'} />
          <Row k="proof bundle" v={competitiveReadiness.proof_bundle.status} ok={competitiveReadiness.proof_bundle.status === 'private_benchmark_ready' || competitiveReadiness.proof_bundle.status === 'world_best_replay_proof_ready'} />
          <Row k="publication" v={`${competitiveReadiness.publication.status} · ${competitiveReadiness.publication.public_receipt_status}`} ok />
          <Row k="replay queue" v={`${rivalReplayActionQueue.status} · ${rivalReplayActionQueue.work_item_count} itens`} ok={rivalReplayActionQueue.status === 'ready'} />
          <Row k="evidence packs" v={String(rivalReplayActionQueue.evidence_pack_items)} ok={rivalReplayActionQueue.evidence_pack_items === 0} />
          <Row k="external receipts" v={String(rivalReplayActionQueue.external_execution_receipt_items)} ok={rivalReplayActionQueue.external_execution_receipt_items === 0} />
          <Row k="score attestations" v={String(rivalReplayActionQueue.score_attestation_items)} ok={rivalReplayActionQueue.score_attestation_items === 0} />
          <Row k="manifest patches" v={String(rivalReplayActionQueue.manifest_patch_items)} ok={rivalReplayActionQueue.manifest_patch_items > 0 || rivalReplayActionQueue.status === 'ready'} />
          <Row k="next replay work" v={rivalReplayActionQueue.next_work_item ? `${rivalReplayActionQueue.next_work_item.kind} · ${rivalReplayActionQueue.next_work_item.case_id}/${rivalReplayActionQueue.next_work_item.system}` : 'nenhum'} ok={rivalReplayActionQueue.next_work_item === null && rivalReplayActionQueue.status === 'ready'} />
          <Row k="next replay action" v={rivalReplayActionQueue.next_work_item?.suggested_action || 'nenhuma'} ok={rivalReplayActionQueue.next_work_item === null && rivalReplayActionQueue.status === 'ready'} />
          <Row k="next replay automation" v={rivalReplayActionQueue.next_automatable_work_item ? `${rivalReplayActionQueue.next_automatable_work_item.suggested_action} · ${rivalReplayActionQueue.next_automatable_work_item.case_id}/${rivalReplayActionQueue.next_automatable_work_item.system}` : 'nenhuma'} ok={rivalReplayActionQueue.next_automatable_work_item === null && rivalReplayActionQueue.status === 'ready'} />
        </dl>
        <pre style={previewStyle}>{safePreview(competitiveReadiness)}</pre>
        {rivalReplayActionQueue.status !== 'not_available' ? (
          <pre style={previewStyle}>{safePreview(rivalReplayActionQueue)}</pre>
        ) : null}
        {rivalReplayActionQueue.operator_sequence.length > 0 ? (
          <pre style={previewStyle}>{safePreview({ operator_sequence: rivalReplayActionQueue.operator_sequence })}</pre>
        ) : null}
        {rivalReplayActionQueue.next_work_item ? (
          <pre style={previewStyle}>{safePreview({ next_work_item: rivalReplayActionQueue.next_work_item })}</pre>
        ) : null}
        {rivalReplayActionQueue.next_automatable_work_item ? (
          <pre style={previewStyle}>{safePreview({ next_automatable_work_item: rivalReplayActionQueue.next_automatable_work_item })}</pre>
        ) : null}
        {privateImprovementWorkPacket ? (
          <div style={{ marginTop: 8 }}>
            <div style={sectionHeading}>Próximo pacote privado</div>
            <dl style={{ margin: 0 }}>
              <Row k="packet" v={privateImprovementWorkPacket.packet_id} mono ok={privateImprovementWorkPacket.status === 'ready_for_operator_or_agent_execution'} />
              <Row k="cenário" v={privateImprovementWorkPacket.target_scenario_id} ok={privateImprovementWorkPacket.target_scenario_id !== ''} />
              <Row k="rival" v={privateImprovementWorkPacket.best_rival_system || 'n/a'} ok={privateImprovementWorkPacket.best_rival_system === 'pbakaus_impeccable'} />
              <Row k="prioridade" v={privateImprovementWorkPacket.priority} ok={privateImprovementWorkPacket.priority === 'critical'} />
              <Row k="repair" v={`${privateImprovementWorkPacket.repair_plan.repair_strategy} · ${privateImprovementWorkPacket.repair_plan.severity}`} ok={privateImprovementWorkPacket.repair_plan.status === 'ready'} />
              <Row k="private only" v={privateImprovementWorkPacket.claim_policy.operator_private_improvement_only ? 'sim' : 'não'} ok={privateImprovementWorkPacket.claim_policy.operator_private_improvement_only === true} />
              <Row k="public claim" v={privateImprovementWorkPacket.claim_policy.public_claims_disabled ? 'bloqueado' : 'liberado'} ok={privateImprovementWorkPacket.claim_policy.public_claims_disabled === true} />
              <Row k="raw source" v={privateImprovementWorkPacket.claim_policy.raw_source_or_absolute_paths_returned ? 'retornado' : 'oculto'} ok={privateImprovementWorkPacket.claim_policy.raw_source_or_absolute_paths_returned === false} />
            </dl>
            <pre style={previewStyle}>{safePreview({
              required_context: privateImprovementWorkPacket.required_context,
              safe_execution_commands: privateImprovementWorkPacket.safe_execution_commands,
              repair_steps: privateImprovementWorkPacket.repair_plan.repair_step_ids,
              rerun_gates: privateImprovementWorkPacket.repair_plan.rerun_gates,
              evidence_required: privateImprovementWorkPacket.repair_plan.evidence_required,
              expected_live_patch_receipt: 'live_patch_decision_receipt_recorded_when_source_changes',
              success_criteria: privateImprovementWorkPacket.success_criteria,
              work_packet_hash: privateImprovementWorkPacket.work_packet_hash,
            })}</pre>
          </div>
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
      <div style={sectionHeading}>Live source patch</div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
        <Field label="live file" value={liveFile} onChange={setLiveFile} placeholder="src/components/Card.tsx" />
        <Field label="target snippet" value={liveTarget} onChange={setLiveTarget} placeholder="<button>Save</button>" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
          <Field label="variant id" value={liveVariantId} onChange={setLiveVariantId} placeholder="v1" />
          <Field label="variant path" value={liveVariantPath} onChange={setLiveVariantPath} placeholder="variants/card-primary.html" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="visual route" value={liveVisualRoute} onChange={setLiveVisualRoute} placeholder="/checkout" />
          <Field label="visual selector" value={liveVisualSelector} onChange={setLiveVisualSelector} placeholder="[data-testid=cta]" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="visual text excerpt" value={liveVisualTextExcerpt} onChange={setLiveVisualTextExcerpt} placeholder="selected button text" />
          <Field label="component hint" value={liveVisualComponentHint} onChange={setLiveVisualComponentHint} placeholder="CheckoutCta" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Field label="visual bbox" value={liveVisualBox} onChange={setLiveVisualBox} placeholder="x,y,width,height" />
          <Field label="visual viewport" value={liveVisualViewport} onChange={setLiveVisualViewport} placeholder="1440,900" />
          <Field label="visual confidence" value={liveVisualConfidence} onChange={setLiveVisualConfidence} placeholder="0.9" />
        </div>
        <Field
          label={liveVisualSelectionSource === 'browser_bridge' ? 'last browser selection' : 'browser selection JSON'}
          value={liveVisualSelectionJson}
          onChange={(value) => {
            setLiveVisualSelectionJson(value)
            setLiveVisualSelectionSource('manual')
          }}
          placeholder="captured from atlas:frontend:live-visual-selection or paste detail"
        />
        <Field label="screenshot hash" value={liveVisualScreenshotHash} onChange={setLiveVisualScreenshotHash} placeholder="optional sha256" />
        <Field label="live session" value={liveSession} onChange={setLiveSession} placeholder="atlas-live-session" />
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || workspace.trim() === '' || liveSession.trim() === ''}
          onClick={() => void run('live_visual_selection', () => syncAtlasFrontendLiveVisualSelection({
            workspace,
            action: 'latest',
            session: liveSession,
          })).then((report) => {
            const selectionJson = serializeLiveVisualSelectionDetail(extractInboxLiveVisualSelection(report?.payload))
            if (!selectionJson) return
            setLiveVisualSelectionJson(selectionJson)
            setLiveVisualSelectionSource('browser_bridge')
          })}
        >
          {loadingStage === 'live_visual_selection' ? 'buscando seleção...' : 'buscar seleção da sessão'}
        </button>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || workspace.trim() === ''}
          onClick={() => void suggestLiveTarget()}
        >
          {loadingStage === 'live_target_suggestions' ? 'sugerindo alvo...' : 'sugerir alvo do live patch'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || workspace.trim() === '' || liveFile.trim() === '' || liveTarget.trim() === '' || liveVariantId.trim() === '' || liveVariantPath.trim() === ''}
          onClick={() => void run('live_source_patch', () => runAtlasFrontendLiveSourcePatch({
            workspace,
            action: 'prepare',
            file: liveFile,
            target: liveTarget,
            variants: [{ id: liveVariantId, path: liveVariantPath }],
            visual_selection: buildLiveVisualSelection({
              route: liveVisualRoute,
              selector: liveVisualSelector,
              textExcerpt: liveVisualTextExcerpt,
              componentHint: liveVisualComponentHint,
              screenshotHash: liveVisualScreenshotHash,
              box: liveVisualBox,
              viewport: liveVisualViewport,
              confidence: liveVisualConfidence,
              selectionJson: liveVisualSelectionJson,
            }),
            session: liveSession,
          }))}
        >
          {loadingStage === 'live_source_patch' ? 'preparando live...' : 'preparar live patch'}
        </button>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || workspace.trim() === '' || liveSession.trim() === '' || liveVariantId.trim() === ''}
          onClick={() => void run('live_source_patch', () => runAtlasFrontendLiveSourcePatch({
            workspace,
            action: 'accept',
            session: liveSession,
            accept_variant: liveVariantId,
          }))}
        >
          aceitar live patch
        </button>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || workspace.trim() === '' || liveSession.trim() === ''}
          onClick={() => void run('live_source_patch', () => runAtlasFrontendLiveSourcePatch({
            workspace,
            action: 'discard',
            session: liveSession,
          }))}
        >
          descartar live patch
        </button>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || workspace.trim() === '' || liveSession.trim() === ''}
          onClick={() => void run('live_source_patch', () => runAtlasFrontendLiveSourcePatch({
            workspace,
            action: 'recover',
            session: liveSession,
          }))}
        >
          recuperar live patch
        </button>
      </div>
      <EmptyText>Live patch usa variante por arquivo dentro do repo selecionado e pode anexar seleção visual sanitizada. O receipt prova decisão/recovery, mas entrega final ainda exige visual quality gate e run certification.</EmptyText>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === ''}
        onClick={() => void prepareCompetitiveProofTrack()}
      >
        {loadingStage === 'prepare_competitive_proof' ? 'preparando prova competitiva...' : 'preparar prova competitiva'}
      </button>
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
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !rivalReplayActionQueue.next_work_item}
        onClick={useNextReplayWorkItem}
      >
        usar próximo item de replay
      </button>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !rivalReplayActionQueue.next_automatable_work_item}
        onClick={useNextAutomatableReplayWorkItem}
      >
        usar próxima automação de replay
      </button>
      <button
        type="button"
        style={{ ...btnPrimary, width: '100%', marginBottom: 8 }}
        disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || (!rivalReplayActionQueue.next_automatable_work_item && !rivalReplayActionQueue.next_work_item)}
        onClick={() => void runSuggestedReplayAction()}
      >
        executar ação sugerida do replay
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === '' || rivalReplayCase.trim() === '' || rivalReplaySystem.trim() === ''}
          onClick={() => void prepareExternalReceiptTemplateFor(rivalReplayCase, rivalReplaySystem)}
        >
          {loadingStage === 'replay_external_receipt_template' ? 'gerando receipt...' : 'template receipt externo'}
        </button>
        <button
          type="button"
          style={btnPrimary}
          disabled={disabled || !artifactPlan || artifactPlan.status !== 'ready' || workspace.trim() === '' || task.trim() === '' || rivalReplayCase.trim() === '' || rivalReplaySystem.trim() === ''}
          onClick={() => void prepareScoreTemplateFor(rivalReplayCase, rivalReplaySystem)}
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
            <Row k="claim público" v={latest.meta.world_best_claim_allowed ? 'liberado' : 'bloqueado'} ok={latest.meta.world_best_claim_allowed === false} />
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

function buildLiveVisualSelection(input: {
  route: string
  selector: string
  textExcerpt: string
  componentHint: string
  screenshotHash: string
  box: string
  viewport: string
  confidence: string
  selectionJson: string
}): AtlasFrontendLiveVisualSelection | undefined {
  const parsedSelection = parseLiveVisualSelection(input.selectionJson)
  if (parsedSelection) return parsedSelection

  const route = input.route.trim()
  const selector = input.selector.trim()
  const textExcerpt = input.textExcerpt.trim()
  const componentHint = input.componentHint.trim()
  const screenshotHash = input.screenshotHash.trim()
  const box = parseNumberTuple(input.box, 4)
  const viewport = parseNumberTuple(input.viewport, 2)
  const confidence = Number.parseFloat(input.confidence)

  if (!route && !selector && !textExcerpt && !componentHint && !screenshotHash && !box && !viewport && Number.isNaN(confidence)) {
    return undefined
  }

  return {
    route: route || undefined,
    selector: selector || undefined,
    text_excerpt: textExcerpt || undefined,
    component_hint: componentHint || undefined,
    screenshot_hash: screenshotHash || undefined,
    confidence: Number.isNaN(confidence) ? undefined : Math.max(0, Math.min(1, confidence)),
    bounding_box: box ? { x: box[0], y: box[1], width: box[2], height: box[3] } : undefined,
    viewport: viewport ? { width: Math.max(0, Math.round(viewport[0])), height: Math.max(0, Math.round(viewport[1])) } : undefined,
  }
}

function serializeLiveVisualSelectionDetail(detail: unknown): string | null {
  const record = extractLiveVisualSelectionDetail(detail)
  if (!record) return null

  try {
    return JSON.stringify(record, null, 2)
  } catch {
    return null
  }
}

function extractLiveVisualSelectionDetail(detail: unknown): Record<string, unknown> | null {
  if (!detail || typeof detail !== 'object') return null
  const record = detail as Record<string, unknown>
  if (record.schema_version === 'atlas.frontend.live_visual_selection.v1') return record
  if (record.schema_version !== 'atlas.frontend.live_visual_selection_message.v1') return null
  const nested = record.detail
  if (!nested || typeof nested !== 'object') return null
  const nestedRecord = nested as Record<string, unknown>
  return nestedRecord.schema_version === 'atlas.frontend.live_visual_selection.v1' ? nestedRecord : null
}

function extractInboxLiveVisualSelection(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  const selection = record.selection
  if (!selection || typeof selection !== 'object') return null
  const selectionRecord = selection as Record<string, unknown>
  return selectionRecord.schema_version === 'atlas.frontend.live_visual_selection.v1' ? selectionRecord : null
}

function extractLiveTargetSuggestionCandidate(payload: unknown): { file: string; target_snippet: string } | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  if (record.schema_version !== 'atlas.frontend.live_target_suggestions.v1') return null
  const candidates = Array.isArray(record.candidates) ? record.candidates : []
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const item = candidate as Record<string, unknown>
    const file = stringField(item.file)
    const targetSnippet = stringField(item.target_snippet)
    if (file && targetSnippet) {
      return { file, target_snippet: targetSnippet }
    }
  }

  return null
}

function parseLiveVisualSelection(value: string): AtlasFrontendLiveVisualSelection | undefined {
  const raw = value.trim()
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return undefined
    const record = parsed as Record<string, unknown>
    const detail = record.detail && typeof record.detail === 'object'
      ? record.detail as Record<string, unknown>
      : record
    if (detail.schema_version !== 'atlas.frontend.live_visual_selection.v1') return undefined
    const boundingBox = detail.bounding_box && typeof detail.bounding_box === 'object'
      ? detail.bounding_box as Record<string, unknown>
      : undefined
    const viewport = detail.viewport && typeof detail.viewport === 'object'
      ? detail.viewport as Record<string, unknown>
      : undefined

    return {
      route_hash: stringField(detail.route_hash) || undefined,
      selector_hash: stringField(detail.selector_hash) || undefined,
      text_excerpt_hash: stringField(detail.text_excerpt_hash) || undefined,
      component_hint_hash: stringField(detail.component_hint_hash) || undefined,
      screenshot_hash: stringField(detail.screenshot_hash) || undefined,
      confidence: typeof detail.confidence === 'number' ? Math.max(0, Math.min(1, detail.confidence)) : undefined,
      bounding_box: boundingBox ? {
        x: numberField(boundingBox.x),
        y: numberField(boundingBox.y),
        width: numberField(boundingBox.width),
        height: numberField(boundingBox.height),
      } : undefined,
      viewport: viewport ? {
        width: Math.max(0, Math.round(numberField(viewport.width))),
        height: Math.max(0, Math.round(numberField(viewport.height))),
      } : undefined,
    }
  } catch {
    return undefined
  }
}

function numberField(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function parseNumberTuple(value: string, length: number): number[] | null {
  const parts = value.split(',').map((part) => Number.parseFloat(part.trim()))
  return parts.length === length && parts.every((part) => Number.isFinite(part)) ? parts : null
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

function extractProjectActivationSlug(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const projectWorkspace = (payload as { project_workspace?: unknown }).project_workspace
  if (!projectWorkspace || typeof projectWorkspace !== 'object') return null
  const slug = (projectWorkspace as { slug?: unknown }).slug
  return typeof slug === 'string' && slug.trim() !== '' ? slug.trim() : null
}

function extractPrivateImprovementWorkPacket(payload: unknown): PrivateImprovementWorkPacket | null {
  if (!payload || typeof payload !== 'object') return null
  const packet = (payload as { next_private_work_packet?: unknown }).next_private_work_packet
  if (!packet || typeof packet !== 'object') return null
  const record = packet as Record<string, unknown>
  if (record.schema_version !== 'atlas.frontend.private_improvement_work_packet.v1') return null
  const repairPlan = record.repair_plan && typeof record.repair_plan === 'object'
    ? record.repair_plan as Record<string, unknown>
    : {}
  const claimPolicy = record.claim_policy && typeof record.claim_policy === 'object'
    ? record.claim_policy as Record<string, unknown>
    : {}

  return {
    schema_version: stringField(record.schema_version),
    packet_id: stringField(record.packet_id),
    status: stringField(record.status),
    target_scenario_id: stringField(record.target_scenario_id),
    best_rival_system: stringField(record.best_rival_system),
    priority: stringField(record.priority),
    suggested_action: stringField(record.suggested_action),
    required_context: stringArray(record.required_context),
    safe_execution_commands: stringArray(record.safe_execution_commands),
    success_criteria: stringArray(record.success_criteria),
    repair_plan: {
      status: stringField(repairPlan.status),
      repair_strategy: stringField(repairPlan.repair_strategy),
      severity: stringField(repairPlan.severity),
      repair_step_ids: stringArray(repairPlan.repair_step_ids),
      rerun_gates: stringArray(repairPlan.rerun_gates),
      evidence_required: stringArray(repairPlan.evidence_required),
      repair_plan_hash: stringField(repairPlan.repair_plan_hash),
    },
    claim_policy: {
      operator_private_improvement_only: claimPolicy.operator_private_improvement_only === true,
      public_claims_disabled: claimPolicy.public_claims_disabled === true,
      raw_source_or_absolute_paths_returned: claimPolicy.raw_source_or_absolute_paths_returned === true,
    },
    work_packet_hash: stringField(record.work_packet_hash),
  }
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : []
}

function templateWasWritten(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const record = payload as { status?: unknown, write_performed?: unknown }
  return record.status === 'ready' && record.write_performed === true
}

function defaultReplayPatchPath(
  plan: AtlasFrontendArtifactPlan,
  kind: 'external_receipt' | 'score_attestation',
  caseId: string,
  system: string,
): string {
  const filename = kind === 'external_receipt'
    ? 'external-execution-receipt-template.json'
    : 'score-attestation-template.json'
  return [
    plan.rival_replay_directory.replace(/\/+$/, ''),
    safeReplaySegment(caseId),
    safeReplaySegment(system),
    filename,
  ].filter(Boolean).join('/')
}

function safeReplaySegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]/g, '')
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
