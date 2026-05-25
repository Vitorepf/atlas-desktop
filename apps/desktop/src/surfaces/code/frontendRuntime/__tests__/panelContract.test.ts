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
assert.match(panel, /Escolher um repo aqui só preenche o workspace local/)
assert.match(panel, /control plane/)
assert.match(panel, /certificar run/)
assert.match(panel, /compilar handoff/)
assert.match(panel, /buildAtlasFrontendArtifactPlan/)
assert.match(panel, /competitiveReadiness/)
assert.match(panel, /requer replay externo/)
assert.match(panel, /preencher caminhos padrão de evidência/)
assert.match(panel, /gerar receipt de seleção/)
assert.match(panel, /selection_receipt/)
assert.match(panel, /ativar projeto no Atlas Code/)
assert.match(panel, /project_activation/)
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
assert.match(panel, /operator_sequence/)

console.log('ok - Atlas Frontend RightRail panel is wired to the selected-repository runtime')
