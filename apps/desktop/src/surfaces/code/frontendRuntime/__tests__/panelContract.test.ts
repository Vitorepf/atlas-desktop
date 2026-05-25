/// <reference types="node" />

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const panel = readFileSync(resolve(here, '../AtlasFrontendRuntimePanel.tsx'), 'utf8')
const registry = readFileSync(resolve(here, '../../panels/rightRailRegistry.tsx'), 'utf8')
const types = readFileSync(resolve(here, '../../panels/rightRailTypes.ts'), 'utf8')

assert.match(registry, /id: 'frontend'/)
assert.match(registry, /label: 'Frontend'/)
assert.match(registry, /AtlasFrontendRuntimePanel/)
assert.match(types, /\| 'frontend'/)

for (const symbol of [
  'scanAtlasFrontendPortfolio',
  'selectAtlasFrontendWorkspace',
  'writeAtlasFrontendSelectionReceipt',
  'activateAtlasFrontendProjectWorkspace',
  'projectAtlasFrontendRuntime',
  'inspectAtlasFrontendControlPlane',
  'planAtlasFrontendCompetitiveBenchmark',
  'runAtlasFrontendLiveSourcePatch',
  'syncAtlasFrontendLiveVisualSelection',
  'prepareAtlasFrontendEvidence',
  'prepareAtlasFrontendRivalReplay',
  'inspectAtlasFrontendRivalReplay',
  'prepareAtlasFrontendReplayExternalReceiptTemplate',
  'prepareAtlasFrontendReplayScoreTemplate',
  'applyAtlasFrontendReplayPatch',
  'compileAtlasFrontendProofBundle',
  'prepareAtlasFrontendPublicationReceipt',
  'verifyAtlasFrontendPublication',
  'certifyAtlasFrontendRun',
  'compileAtlasFrontendHandoff',
  'summarizeAtlasFrontendRivalReplayActionQueue',
  'buildAtlasFrontendCompetitiveReadiness',
  'extractAtlasFrontendPortfolioCandidates',
  'extractAtlasFrontendSuggestedFrontendApp',
  'extractAtlasFrontendOperatorFlow',
]) {
  assert.match(panel, new RegExp(symbol))
}

for (const invariant of [
  'selected_repository_is_primary_workspace',
  'frontend_app_is_subscope_only',
  'space_runtime_required',
  'world_best_claim_allowed',
  'O Atlas não executa provider nesta aba.',
]) {
  assert.match(panel, new RegExp(invariant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}

assert.match(panel, /frontend_app/)
assert.match(panel, /usePortfolioCandidate/)
assert.match(panel, /Repos encontrados/)
assert.match(panel, /Fluxo do operador/)
assert.match(panel, /operatorFlow/)
assert.match(panel, /operatorFlow\.purpose/)
assert.match(panel, /subescopo relativo/)
assert.match(panel, /Escolher um repo aqui só preenche o workspace local/)
assert.match(panel, /control plane/)
assert.match(panel, /competitive_benchmark_plan/)
assert.match(panel, /planejar benchmark competitivo/)
assert.match(panel, /extractPrivateImprovementWorkPacket/)
assert.match(panel, /Próximo pacote privado/)
assert.match(panel, /next_private_work_packet/)
assert.match(panel, /safe_execution_commands/)
assert.match(panel, /live_patch_decision_receipt_recorded_when_source_changes/)
assert.match(panel, /Live source patch/)
assert.match(panel, /live_source_patch/)
assert.match(panel, /preparar live patch/)
assert.match(panel, /aceitar live patch/)
assert.match(panel, /descartar live patch/)
assert.match(panel, /recuperar live patch/)
assert.match(panel, /variant path/)
assert.match(panel, /visual route/)
assert.match(panel, /visual selector/)
assert.match(panel, /visual text excerpt/)
assert.match(panel, /component hint/)
assert.match(panel, /visual bbox/)
assert.match(panel, /visual viewport/)
assert.match(panel, /screenshot hash/)
assert.match(panel, /browser selection JSON/)
assert.match(panel, /last browser selection/)
assert.match(panel, /live_visual_selection/)
assert.match(panel, /live_target_suggestions/)
assert.match(panel, /buscar seleção da sessão/)
assert.match(panel, /sugerir alvo do live patch/)
assert.match(panel, /extractInboxLiveVisualSelection/)
assert.match(panel, /extractLiveTargetSuggestionCandidate/)
assert.match(panel, /syncAtlasFrontendLiveVisualSelection/)
assert.match(panel, /suggestAtlasFrontendLiveTargets/)
assert.match(panel, /channelName = 'atlas:frontend:live-visual-selection'/)
assert.match(panel, /addEventListener\(channelName/)
assert.match(panel, /BroadcastChannel/)
assert.match(panel, /__ATLAS_FRONTEND_LAST_LIVE_VISUAL_SELECTION__/)
assert.match(panel, /addEventListener\('storage'/)
assert.match(panel, /addEventListener\('message'/)
assert.match(panel, /serializeLiveVisualSelectionDetail/)
assert.match(panel, /extractLiveVisualSelectionDetail/)
assert.match(panel, /atlas\.frontend\.live_visual_selection_message\.v1/)
assert.match(panel, /atlas.frontend.live_visual_selection_message.v1/)
assert.match(panel, /parseLiveVisualSelection/)
assert.match(panel, /atlas\.frontend\.live_visual_selection\.v1/)
assert.match(panel, /atlas.frontend.live_visual_selection.v1/)
assert.match(panel, /atlas.frontend.live_target_suggestions.v1/)
assert.match(panel, /buildLiveVisualSelection/)
assert.match(panel, /seleção visual sanitizada/)
assert.match(panel, /visual quality gate e run certification/)
assert.match(panel, /private only/)
assert.match(panel, /certificar run/)
assert.match(panel, /compilar handoff/)
assert.match(panel, /buildAtlasFrontendArtifactPlan/)
assert.match(panel, /competitiveReadiness/)
assert.match(panel, /benchmark privado/)
assert.match(panel, /claim público/)
assert.match(panel, /preencher caminhos padrão de evidência/)
assert.match(panel, /gerar receipt de seleção/)
assert.match(panel, /selection_receipt/)
assert.match(panel, /ativar projeto no Atlas Code/)
assert.match(panel, /project_activation/)
assert.match(panel, /prepareSelectedRepositoryWorkspace/)
assert.match(panel, /preparar repo selecionado/)
assert.match(panel, /projectAtlasFrontendRuntime\({/)
assert.match(panel, /setReports\(\(current\) => \({ \.\.\.current, runtime_projection: runtimeProjection }\)\)/)
assert.match(panel, /prepare_workspace/)
assert.match(panel, /prepareCompetitiveProofTrack/)
assert.match(panel, /preparar prova competitiva/)
assert.match(panel, /prepare_competitive_proof/)
assert.match(panel, /onRefreshWorkspaces/)
assert.match(panel, /onSetActiveWorkspaceSlug/)
assert.match(panel, /extractProjectActivationSlug/)
assert.match(panel, /projeto ativo/)
assert.match(panel, /preparar kit no backend/)
assert.match(panel, /preparar replay competitivo/)
assert.match(panel, /inspecionar replay competitivo/)
assert.match(panel, /template receipt externo/)
assert.match(panel, /template score attestation/)
assert.match(panel, /aplicar patch seguro do replay/)
assert.match(panel, /compilar proof bundle competitivo/)
assert.match(panel, /gerar receipt de publicação/)
assert.match(panel, /verificar publicação/)
assert.match(panel, /replay queue/)
assert.match(panel, /proof contract/)
assert.match(panel, /proof bundle/)
assert.match(panel, /publication/)
assert.match(panel, /operator verify/)
assert.match(panel, /external receipts/)
assert.match(panel, /score attestations/)
assert.match(panel, /manifest patches/)
assert.match(panel, /next replay work/)
assert.match(panel, /next replay action/)
assert.match(panel, /next replay automation/)
assert.match(panel, /next_work_item/)
assert.match(panel, /next_automatable_work_item/)
assert.match(panel, /suggested_action/)
assert.match(panel, /useNextReplayWorkItem/)
assert.match(panel, /usar próximo item de replay/)
assert.match(panel, /useNextAutomatableReplayWorkItem/)
assert.match(panel, /usar próxima automação de replay/)
assert.match(panel, /runSuggestedReplayAction/)
assert.match(panel, /executar ação sugerida do replay/)
assert.match(panel, /prepareExternalReceiptTemplateFor/)
assert.match(panel, /prepareScoreTemplateFor/)
assert.match(panel, /applyTemplatePatchPath/)
assert.match(panel, /templateWasWritten/)
assert.match(panel, /defaultReplayPatchPath/)
assert.match(panel, /safeReplaySegment/)
assert.match(panel, /external-execution-receipt-template\.json/)
assert.match(panel, /score-attestation-template\.json/)
for (const generatedReplayTemplate of [
  'external-execution-receipt-template.json',
  'score-attestation-template.json',
]) {
  assert.match(panel, new RegExp(generatedReplayTemplate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}
assert.match(panel, /operator_sequence/)

console.log('ok - Atlas Frontend RightRail panel is wired to the selected-repository runtime')
