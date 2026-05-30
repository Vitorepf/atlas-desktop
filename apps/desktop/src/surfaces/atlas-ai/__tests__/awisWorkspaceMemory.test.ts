import assert from 'node:assert/strict'
import test from 'node:test'
import type { AtlasWorkspaceBrainSnapshot } from '../../../lib/bridge'
import {
  AWIS_WORKSPACE_ARTIFACT_STORAGE,
  AWIS_WORKSPACE_LIVE_EXECUTION_MEMORY_STORAGE,
  AWIS_WORKSPACE_MEMORY_STORAGE,
  AWIS_WORKSPACE_SPACE_PROJECTIONS_STORAGE,
  buildAwisWorkspaceArtifact,
  buildAwisWorkspaceArtifactProjectionsFromServer,
  buildAwisWorkspaceArtifactReplayProjection,
  buildAwisWorkspaceAutomationProjection,
  buildAwisWorkspaceConfidenceProjection,
  buildAwisWorkspaceContextKernelProjection,
  buildAwisWorkspaceContinuityProjection,
  buildAwisWorkspaceContextPack,
  buildAwisWorkspaceComponentMemoryProjection,
  buildAwisWorkspaceExecutionDoctrineProjection,
  buildAwisWorkspaceEvolutionProjection,
  buildAwisWorkspaceFolderCortexProjection,
  buildAwisWorkspaceHandoffProjection,
  buildAwisWorkspaceImpactMapProjection,
  buildAwisWorkspaceLaunchContractProjection,
  buildAwisWorkspaceLearningProjection,
  buildAwisWorkspaceLiveExecutionMemoryProjectionFromServer,
  buildAwisWorkspaceLivingGraphProjection,
  buildAwisWorkspaceMemoryConsolidationProjection,
  buildAwisWorkspaceMemoryFreshnessProjection,
  buildAwisWorkspaceNextSessionBrainProjection,
  buildAwisWorkspacePreflightProjection,
  buildAwisWorkspaceProviderCapsule,
  buildAwisWorkspaceProviderStrategyProjection,
  buildAwisWorkspaceRelationProjection,
  buildAwisWorkspaceRetentionProjection,
  buildAwisWorkspaceSemanticIndexProjection,
  buildAwisWorkspaceSessionGoldProjection,
  buildAwisWorkspaceSelfImprovementProjection,
  buildAwisWorkspaceStartupOrchestrationProjection,
  buildAwisWorkspaceStartupBriefing,
  buildAwisWorkspaceTaskContextProjection,
  buildAwisWorkspaceTaskRouterProjection,
  buildAwisWorkspaceTopologyProjection,
  buildAwisWorkspaceTwinProjection,
  buildAwisWorkspaceSpaceProjection,
  clearAwisWorkspaceSpaceProjection,
  loadAwisWorkspaceArtifactLakeSummary,
  loadAwisWorkspaceArtifactReplayProjection,
  loadAwisWorkspaceArtifacts,
  loadAwisWorkspaceArtifactStore,
  loadAwisWorkspaceLiveExecutionMemoryProjection,
  learnAwisWorkspaceMemory,
  loadAwisWorkspaceMemory,
  loadAwisWorkspaceSpaceProjection,
  mergeAwisWorkspaceArtifactStores,
  mergeAwisWorkspaceMemoryStores,
  normalizeAwisWorkspaceArtifactStore,
  normalizeAwisWorkspaceMemoryStore,
  recordAwisWorkspaceInteraction,
  recordAwisWorkspaceMaintenance,
  saveAwisWorkspaceArtifact,
  saveAwisWorkspaceArtifactStore,
  saveAwisWorkspaceLiveExecutionMemoryProjection,
  saveAwisWorkspaceMemories,
  saveAwisWorkspaceSpaceProjection,
  saveAwisWorkspaceMemory,
  workspaceMemoryKey,
} from '../awisWorkspaceMemory'

function brain(partial: Partial<AtlasWorkspaceBrainSnapshot> = {}): AtlasWorkspaceBrainSnapshot {
  return {
    status: 'ready',
    rootName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    scannedAt: '2026-05-24T12:00:00Z',
    isGit: true,
    filesSeen: 6000,
    dirsSeen: 900,
    ignoredDirs: 18,
    maxDepth: 6,
    truncated: true,
    languages: [{ label: 'TypeScript', count: 1200 }],
    signals: ['Laravel', 'Next.js', 'Tauri'],
    importantFiles: [{ path: 'package.json', kind: 'manifesto' }],
    dependencyEdges: [],
    commands: [{ label: 'npm test', command: 'npm run test', kind: 'test', source: 'package.json' }],
    notes: ['scan limitado para manter desempenho'],
    ...partial,
    docDigests: partial.docDigests ?? [],
  }
}

function storage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => { map.delete(key) },
    setItem: (key, value) => { map.set(key, String(value)) },
  }
}

test('AWIS workspace memory persists learned folder signals per workspace', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const update = learnAwisWorkspaceMemory(null, brain(), key)
  const store = storage()

  saveAwisWorkspaceMemory(update.memory, store)
  const loaded = loadAwisWorkspaceMemory(key, store)

  assert.equal(loaded?.schemaVersion, 'atlas.awis.workspace_memory.v1')
  assert.equal(loaded?.scanCount, 1)
  assert.ok(loaded?.stableSignals.some((signal) => signal.label === 'Laravel'))
  assert.ok(loaded?.stableCommands.some((signal) => signal.label === 'npm run test'))
  assert.match(store.getItem(AWIS_WORKSPACE_MEMORY_STORAGE) ?? '', /atlas\.awis\.workspace_memory\.v1/)
})

test('AWIS workspace memory promotes folder docs dependencies and command intents into operational memory', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    docDigests: [{
      path: 'docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md',
      kind: 'doc',
      signals: ['docs canônicos governam implementação'],
      obligations: ['rodar session-bootstrap antes de implementar'],
      summary: 'governança do conhecimento Atlas',
    }],
    dependencyEdges: [{
      from: '@atlas/desktop',
      to: '@atlas/domain',
      kind: 'workspace',
      source: 'package.json',
    }],
    commands: [{
      label: 'atlas ai tests',
      command: 'npm run atlas-ai:test',
      kind: 'test',
      source: 'package.json',
    }],
  })
  const first = learnAwisWorkspaceMemory(null, snapshot, key).memory

  assert.ok(first.operationalSignals.some((signal) => signal.label.startsWith('folder-doc:docs/engineering-knowledge-base/')))
  assert.ok(first.operationalSignals.some((signal) => signal.label === 'folder-doc-signal:docs canônicos governam implementação'))
  assert.ok(first.operationalSignals.some((signal) => signal.label === 'folder-doc-rule:rodar session-bootstrap antes de implementar'))
  assert.ok(first.operationalSignals.some((signal) => signal.label === 'folder-dependency:@atlas/desktop->@atlas/domain:workspace:package.json'))
  assert.ok(first.operationalSignals.some((signal) => signal.label.includes('folder-command-intent:validate:auto-validar:package.json:npm run atlas-ai:test')))

  const second = learnAwisWorkspaceMemory(first, brain({
    ...snapshot,
    scannedAt: '2026-05-24T13:00:00Z',
    docDigests: [{
      path: 'AGENTS.md',
      kind: 'doc',
      signals: ['provider projection'],
      obligations: ['não confiar em projection sem docs canônicos'],
      summary: 'provider projection',
    }],
  }), key)

  assert.ok(second.changed.some((item) => item.includes('novo mapa:')))
  assert.ok(second.memory.driftEvents[0]?.includes('novo mapa:'))
})

test('AWIS native memory mirror keeps the newest workspace brain copy', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const local = learnAwisWorkspaceMemory(null, brain({ scannedAt: '2026-05-24T12:00:00Z' }), key).memory
  const native = recordAwisWorkspaceInteraction(local, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-25T12:00:00Z',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-desktop'],
  }).memory
  const merged = mergeAwisWorkspaceMemoryStores({ [key]: local }, normalizeAwisWorkspaceMemoryStore({ [key]: native }))
  const store = storage()
  saveAwisWorkspaceMemories(merged, store)
  const loaded = loadAwisWorkspaceMemory(key, store)

  assert.equal(loaded?.interactionCount, 1)
  assert.equal(loaded?.lastInteractionAt, '2026-05-25T12:00:00Z')
  assert.ok(loaded?.operationalSignals.some((signal) => signal.label === 'ouro:component:atlas-desktop'))
})

test('AWIS native artifact mirror keeps reusable startup snapshots durable', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory: learnAwisWorkspaceMemory(null, brain(), key).memory,
    spaces: buildAwisWorkspaceSpaceProjection([{
      title: 'Cérebro vivo AWIS',
      source: 'local_space',
      generated_at: '2026-05-24T12:00:00Z',
      thread_count: 2,
      message_count: 18,
      mode_count: 2,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['code', 'forge'],
      recommended_use: ['carregar antes de nova conversa AWIS'],
      sessions: [
        { title: 'Partida viva', mode: 'code', message_count: 9, last_active_at: '2026-05-24T12:00:00Z', provider: 'atlas' },
        { title: 'Artifact replay', mode: 'forge', message_count: 9, last_active_at: '2026-05-24T12:00:00Z', provider: 'atlas' },
      ],
    }]),
  })
  const artifact = firstPack ? buildAwisWorkspaceArtifact(firstPack, '2026-05-25T12:00:00Z') : null
  assert.ok(artifact)

  const native = normalizeAwisWorkspaceArtifactStore({ [key]: [artifact] })
  const merged = mergeAwisWorkspaceArtifactStores({}, native)
  const store = storage()
  saveAwisWorkspaceArtifactStore(merged, store)

  const loadedArtifacts = loadAwisWorkspaceArtifacts(key, store)
  const loadedStore = loadAwisWorkspaceArtifactStore(store)
  const replay = loadAwisWorkspaceArtifactReplayProjection(key, store)

  assert.equal(loadedArtifacts.length, 1)
  assert.equal(loadedStore[key]?.[0]?.artifact_hash, artifact.artifact_hash)
  assert.equal(loadAwisWorkspaceArtifactLakeSummary(key, store)?.latest_artifact_hash, artifact.artifact_hash)
  assert.ok(loadedArtifacts[0]?.manifest.command_lanes.auto_validate.includes('npm run test'))
  assert.ok(replay?.cold_start_seed.command_lanes.auto_validate.includes('npm run test'))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern === 'command-lane:auto:npm run test'))
  assert.ok(replay?.reusable_startup_gold.strongest_spaces.some((space) => space.includes('Cérebro vivo AWIS')))
  assert.doesNotMatch(store.getItem(AWIS_WORKSPACE_ARTIFACT_STORAGE) ?? '', /operator_input|response_text|source_thread_ids|thread_id|full_message|"raw_conversation_included":true/)
})

test('AWIS outcome memory promotes structural brain layers into future startup gold', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const memory = recordAwisWorkspaceInteraction(null, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-25T12:00:00Z',
    channel: 'conversation',
    status: 'succeeded',
    provider: 'atlas_decide',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    componentMemoryLabels: ['component:atlas-desktop:stable'],
    semanticIndexLabels: ['alias:drag compare->bug_fix'],
    taskRouterLabels: ['route:bug_fix:prefer:side_by_side'],
    impactMapLabels: ['impact:atlas-ai:medium'],
    livingGraphLabels: ['golden:carregar Space AWIS'],
    workspaceMeshLabels: ['route:atlas-server:shared_backend'],
    truthPackLabels: ['keep:pasta local governa execução'],
    repositoryConstellationLabels: ['bridge:atlas-desktop->atlas-server'],
    taskPacketLabels: ['hash:task-awis-123', 'kind:bug_fix', 'validate:npm run atlas-ai:test'],
    runbookLabels: ['hash:runbook-awis-123', 'start:Partida quente', 'validate:npm run atlas-ai:test'],
    providerStrategyLabels: ['prefer:atlas_decide:auto:98'],
    executionDoctrineLabels: ['preflight:ler owner docs'],
    memoryFreshnessLabels: ['hot:contrato AWIS atual'],
    confidenceLabels: ['prefer:evidência local'],
    learningFlywheelLabels: ['load:último pack validado'],
    launchContractLabels: ['load:Space brain'],
    topologyLabels: ['test:npm run atlas-ai:test'],
  }).memory

  const outcome = memory.recentOutcomes[0]
  assert.deepEqual(outcome.componentMemoryLabels, ['component:atlas-desktop:stable'])
  assert.deepEqual(outcome.semanticIndexLabels, ['alias:drag compare->bug_fix'])
  assert.deepEqual(outcome.taskRouterLabels, ['route:bug_fix:prefer:side_by_side'])
  assert.deepEqual(outcome.impactMapLabels, ['impact:atlas-ai:medium'])
  assert.deepEqual(outcome.livingGraphLabels, ['golden:carregar Space AWIS'])
  assert.deepEqual(outcome.workspaceMeshLabels, ['route:atlas-server:shared_backend'])
  assert.deepEqual(outcome.truthPackLabels, ['keep:pasta local governa execução'])
  assert.deepEqual(outcome.repositoryConstellationLabels, ['bridge:atlas-desktop->atlas-server'])
  assert.deepEqual(outcome.taskPacketLabels, ['hash:task-awis-123', 'kind:bug_fix', 'validate:npm run atlas-ai:test'])
  assert.deepEqual(outcome.runbookLabels, ['hash:runbook-awis-123', 'start:Partida quente', 'validate:npm run atlas-ai:test'])
  assert.deepEqual(outcome.providerStrategyLabels, ['prefer:atlas_decide:auto:98'])
  assert.deepEqual(outcome.executionDoctrineLabels, ['preflight:ler owner docs'])
  assert.deepEqual(outcome.memoryFreshnessLabels, ['hot:contrato AWIS atual'])
  assert.deepEqual(outcome.confidenceLabels, ['prefer:evidência local'])
  assert.deepEqual(outcome.learningFlywheelLabels, ['load:último pack validado'])
  assert.deepEqual(outcome.launchContractLabels, ['load:Space brain'])
  assert.deepEqual(outcome.topologyLabels, ['test:npm run atlas-ai:test'])
  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'component-memory:component:atlas-desktop:stable'))
  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'semantic-index:alias:drag compare->bug_fix'))
  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'repository-constellation:bridge:atlas-desktop->atlas-server'))
  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'task-packet:hash:task-awis-123'))
  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'runbook:hash:runbook-awis-123'))
  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'provider-strategy:prefer:atlas_decide:auto:98'))
  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'execution-doctrine:preflight:ler owner docs'))
  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'learning-flywheel:load:último pack validado'))

  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
  })
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('component-memory:component:atlas-desktop:stable'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('semantic-index:alias:drag compare->bug_fix'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('repository-constellation:bridge:atlas-desktop->atlas-server'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('provider-strategy:prefer:atlas_decide:auto:98'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('execution-doctrine:preflight:ler owner docs'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('topology:test:npm run atlas-ai:test'))
  assert.ok(pack?.session_gold?.strongest_outcomes.some((item) => item.label.includes('estrutura:component-memory:component:atlas-desktop:stable')))
  assert.ok(pack?.retention?.lifecycle.keep_hot.includes('estrutura:component-memory:component:atlas-desktop:stable'))
  assert.ok(pack?.retention?.lifecycle.promote.includes('estrutura:component-memory:component:atlas-desktop:stable'))
  assert.ok(pack?.memory_consolidation?.next_session_seed.some((item) => item.includes('estrutura:component-memory:component:atlas-desktop:stable')))
  assert.ok(pack?.memory_consolidation?.replay_contract.archive_after_success.some((item) => item.includes('estrutura:repository-constellation:bridge:atlas-desktop->atlas-server')))
  assert.ok(pack?.startup_orchestration?.startup_sequence.some((item) => item.source === 'retention' && item.label.includes('estrutura:component-memory:component:atlas-desktop:stable')))
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-25T12:10:00Z') : null
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  assert.ok(artifact?.manifest.load_first.some((item) => item === 'awis:task-packet:hash:task-awis-123'))
  assert.ok(artifact?.manifest.promote_signals.some((item) => item === 'awis-gold:task-packet:hash:task-awis-123'))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item === 'awis:task-packet:hash:task-awis-123'))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((item) => item === 'artifact-load:awis:task-packet:hash:task-awis-123'))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((item) => item === 'artifact-promote:awis-gold:task-packet:hash:task-awis-123'))
  assert.doesNotMatch(JSON.stringify(pack), /operator_input|response_text|source_thread_ids|thread_id|full_message|"raw_conversation_included":true/)
})

test('AWIS workspace runbook rewrites next startup from real runbook outcomes', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const learned = learnAwisWorkspaceMemory(null, brain(), key).memory
  const succeeded = recordAwisWorkspaceInteraction(learned, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-25T13:00:00Z',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    runbookLabels: [
      'start:Abrir AWIS quente',
      'validate:npm run atlas-ai:test',
      'auto:salvar outcome',
      'retry:recarregar pack',
    ],
  }).memory
  const memory = recordAwisWorkspaceInteraction(succeeded, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-25T13:05:00Z',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    runbookLabels: ['start:Fluxo antigo'],
  }).memory

  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
  })
  const runbook = pack?.workspace_runbook
  const startupProcedure = runbook?.procedures.find((procedure) => procedure.title === 'Partida quente do workspace')

  assert.ok(runbook?.next_session.start_here.includes('Abrir AWIS quente'))
  assert.ok(startupProcedure?.success_evidence.includes('runbook comprovado:start:Abrir AWIS quente'))
  assert.ok(startupProcedure?.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(runbook?.next_session.automate_when_safe.includes('salvar outcome'))
  assert.ok(runbook?.failure_response.safe_retry.includes('recarregar pack'))
  assert.ok(runbook?.failure_response.demote_or_revalidate.includes('runbook revalidar:start:Fluxo antigo'))
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-25T13:10:00Z') : null
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null

  assert.ok(artifact?.manifest.load_first.some((item) => item.includes('runbook:Abrir AWIS quente')))
  assert.ok(artifact?.manifest.validate_with.some((item) => item.includes('runbook:Partida quente do workspace:npm run atlas-ai:test')))
  assert.ok(artifact?.manifest.promote_signals.some((item) => item.includes('runbook:Partida quente do workspace:runbook comprovado:start:Abrir AWIS quente')))
  assert.ok(artifact?.manifest.caution_signals.some((item) => item.includes('runbook-revalidar:runbook revalidar:start:Fluxo antigo')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((item) => item.includes('runbook-start:Abrir AWIS quente')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((item) => item.includes('runbook-proof:Partida quente do workspace:runbook comprovado:start:Abrir AWIS quente')))
  assert.ok(replay?.reusable_startup_gold.warnings.some((item) => item.includes('runbook-revalidate:runbook revalidar:start:Fluxo antigo')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((item) => item.includes('runbook: iniciar Abrir AWIS quente')))
  assert.doesNotMatch(JSON.stringify(runbook), /operator_input|response_text|source_thread_ids|thread_id|full_message|"raw_conversation_included":true/)
  assert.doesNotMatch(JSON.stringify(replay), /operator_input|response_text|source_thread_ids|thread_id|full_message|"raw_conversation_included":true/)
})

test('AWIS launch contract compiles the living brain into a next-conversation contract', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
      { label: 'Server tests', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    provider: 'atlas_decide',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-desktop'],
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
  }).memory
  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'comando validado:npm run atlas-ai:test'))
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'AWIS final pass',
      thread_count: 3,
      message_count: 30,
      mode_count: 1,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code'],
      recommended_use: ['partida quente'],
      sessions: [],
    },
  ])
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(firstPack)
  const firstArtifact = buildAwisWorkspaceArtifact(firstPack, '2026-05-24T22:00:00Z')
  const replay = firstArtifact ? buildAwisWorkspaceArtifactReplayProjection([firstArtifact]) : null
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    artifactReplay: replay,
  })
  assert.ok(pack?.launch_contract)
  const directLaunchContract = buildAwisWorkspaceLaunchContractProjection({
    startupOrchestration: pack.startup_orchestration,
    preflight: pack.preflight,
    workspaceTwin: pack.workspace_twin,
    memoryConsolidation: pack.memory_consolidation,
    retention: pack.retention,
    contextKernel: pack.context_kernel,
    automation: pack.automation,
    selfImprovement: pack.self_improvement,
    providerStrategy: pack.provider_strategy,
    memoryFreshness: pack.memory_freshness,
    spaces,
    artifactReplay: replay,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no atlas desktop')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T22:01:00Z')
  const finalReplay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null

  assert.equal(pack.launch_contract.schema_version, 'atlas.awis.workspace_launch_contract_projection.v1')
  assert.equal(pack.launch_contract.startup_contract.never_start_cold, true)
  assert.ok(pack.launch_contract.startup_contract.first_load.length > 0)
  assert.ok(pack.launch_contract.startup_contract.validate_before_trust.length > 0)
  assert.ok(pack.launch_contract.automation_contract.after_success.length > 0)
  assert.ok(pack.launch_contract.next_conversation.load_order.length > 0)
  assert.match(pack.launch_contract.seed_hash, /^launch-/)
  assert.equal(artifact?.payload.launch_contract_projection?.schema_version, 'atlas.awis.workspace_launch_contract_projection.v1')
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('launch-contract:') || pattern.startsWith('launch-load:')))
  assert.ok(finalReplay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('partida viva:') || action.startsWith('aprender:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('launch:') || item.startsWith('launch-order:')))
  assert.ok(capsule?.continue_learning.next_session_contract.first_load.length)
  assert.deepEqual(directLaunchContract, pack.launch_contract)
  assert.doesNotMatch(JSON.stringify(pack.launch_contract), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS workspace memory migrates legacy absolute-path buckets without starting cold', () => {
  const legacyKey = '/users/vitorepf/develop/atlas'
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const legacyMemory = learnAwisWorkspaceMemory(null, brain(), legacyKey).memory
  const topology = buildAwisWorkspaceTopologyProjection(brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
  }))
  const spaceProjection = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Fluxo AWIS antigo',
      thread_count: 2,
      message_count: 12,
      mode_count: 1,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Atlas AI'],
      recommended_use: ['reusar contexto antigo'],
      sessions: [],
    },
  ])
  const legacyPack = buildAwisWorkspaceContextPack({
    workspaceKey: legacyKey,
    workspaceName: 'Atlas',
    brain: brain(),
    memory: legacyMemory,
    spaces: spaceProjection,
  })
  const legacyArtifact = legacyPack ? buildAwisWorkspaceArtifact(legacyPack, '2026-05-24T14:00:00Z') : null
  assert.ok(legacyArtifact)
  assert.ok(spaceProjection)

  store.setItem(AWIS_WORKSPACE_MEMORY_STORAGE, JSON.stringify({ [legacyKey]: legacyMemory }))
  store.setItem(AWIS_WORKSPACE_SPACE_PROJECTIONS_STORAGE, JSON.stringify({ [legacyKey]: spaceProjection }))
  store.setItem(AWIS_WORKSPACE_ARTIFACT_STORAGE, JSON.stringify({ [legacyKey]: [legacyArtifact] }))

  const loadedMemory = loadAwisWorkspaceMemory(key, store)
  const loadedSpace = loadAwisWorkspaceSpaceProjection(key, store)
  const loadedArtifacts = loadAwisWorkspaceArtifacts(key, store)
  const loadedReplay = loadAwisWorkspaceArtifactReplayProjection(key, store)

  assert.equal(key, 'atlas')
  assert.equal(loadedMemory?.scanCount, 1)
  assert.equal(loadedSpace?.strongest_spaces[0]?.title, 'Fluxo AWIS antigo')
  assert.equal(loadedArtifacts[0]?.artifact_hash, legacyArtifact.artifact_hash)
  assert.ok(loadedReplay?.reusable_startup_gold.next_best_actions.length)
  assert.equal(topology?.safety.absolute_paths_included, false)
  assert.doesNotMatch(JSON.stringify({ loadedMemory, loadedSpace, loadedReplay }), /"workspace_key":"\/users/)
})

test('AWIS workspace memory increments seen signals and records drift without raw source content', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const first = learnAwisWorkspaceMemory(null, brain(), key).memory
  const second = learnAwisWorkspaceMemory(first, brain({
    scannedAt: '2026-05-24T12:05:00Z',
    signals: ['Laravel', 'Next.js', 'Tauri', 'Rust/Cargo'],
    commands: [
      { label: 'npm test', command: 'npm run test', kind: 'test', source: 'package.json' },
      { label: 'cargo test', command: 'cargo test', kind: 'test', source: 'Cargo.toml' },
    ],
  }), key)

  assert.equal(second.memory.scanCount, 2)
  assert.equal(second.memory.stableSignals.find((signal) => signal.label === 'Laravel')?.seenCount, 2)
  assert.ok(second.memory.stableSignals.some((signal) => signal.label === 'Rust/Cargo'))
  assert.ok(second.changed.some((event) => event.includes('novos sinais')))
  assert.ok(second.changed.some((event) => event.includes('novos comandos')))
  assert.doesNotMatch(JSON.stringify(second.memory), /function|class|import .* from/)
})

test('AWIS workspace context pack is bounded and provider-safe for composer payloads', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const memory = learnAwisWorkspaceMemory(null, brain(), key).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain({
      importantFiles: Array.from({ length: 40 }, (_, index) => ({
        path: `docs/file-${index}.md`,
        kind: 'documento',
      })),
    }),
    memory,
  })

  assert.equal(pack?.schema_version, 'atlas.awis.workspace_context_pack.v1')
  assert.equal(pack?.safety.raw_source_included, false)
  assert.equal(pack?.safety.provider_safe, true)
  assert.ok((pack?.folder_map?.important_files.length ?? 0) <= 20)
  assert.ok((pack?.folder_map?.commands.length ?? 0) <= 12)
  assert.ok(pack?.memory?.stable_signals.includes('Laravel'))
  assert.equal(pack?.startup_snapshot?.schema_version, 'atlas.awis.workspace_startup_snapshot.v1')
  assert.equal(pack?.startup_snapshot?.readiness.folder_map_ready, true)
  assert.ok(pack?.startup_snapshot?.startup_gold.commands.includes('npm run test'))
  assert.doesNotMatch(JSON.stringify(pack), /"content"|function|class|import .* from/)
})

test('AWIS workspace memory learns real interaction outcomes without prompts or responses', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const initial = learnAwisWorkspaceMemory(null, brain(), key).memory
  const updated = recordAwisWorkspaceInteraction(initial, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:10:00Z',
    channel: 'workbench',
    status: 'succeeded',
    provider: 'atlas_decide',
    model: null,
    latencyMs: 420,
    contextPackApplied: true,
    spaceLabels: ['Fluxo Atlas AI'],
    spaceBrainLabels: ['Fluxo Atlas AI:comparar é ação explícita'],
    liveMemoryLabels: ['sha256:live'],
    priorityLoadLabels: ['atlas-desktop'],
    continuityLabels: ['handoff:atlas-ai', 'load:workspace_binding'],
    handoffLabels: ['hash:sha256:handoff', 'unit:context_pack'],
    artifactReplayLabels: ['latest:artifact-abc', 'seed:cold-abc'],
    evidenceGateLabels: ['trusted:component:atlas-desktop', 'verify:validar:npm run atlas-ai:test'],
    nextSessionLabels: ['load:full:atlas-desktop', 'promote:validação verde:npm run atlas-ai:test'],
    recoveryLabels: ['retry:retry com budget lean', 'resume:validar novamente:npm run atlas-ai:test'],
    adaptiveLearningLabels: ['mode:compound:91', 'success:registrar resultado real', 'promote:contexto validado'],
    feedbackRecordLabels: ['outcome:workbench_compare', 'Space:Fluxo Atlas AI'],
    feedbackPromoteLabels: ['space-brain:Fluxo Atlas AI:comparar é ação explícita'],
    feedbackRevalidateLabels: ['rodar npm run atlas-ai:test'],
    feedbackSpaceLabels: ['Fluxo Atlas AI'],
    feedbackArtifactLabels: ['Fluxo Atlas AI:pack-awis'],
    feedbackComponentLabels: ['atlas-desktop'],
    feedbackRelationLabels: ['workspace:atlas-server', 'reuso:component:atlas-server'],
    feedbackMeshLabels: ['atlas-server:shared_context:82', 'mesh:atlas-server:contexto validado'],
    componentMemoryLabels: [],
    semanticIndexLabels: [],
    taskRouterLabels: [],
    impactMapLabels: [],
    livingGraphLabels: [],
    workspaceMeshLabels: [],
    truthPackLabels: [],
    repositoryConstellationLabels: [],
    transferWorkspaceLabels: ['atlas-server'],
    transferRelevanceLabels: ['dependência:atlas-server:target:@atlas/domain'],
    transferReuseLabels: ['component:atlas-server'],
    transferValidateLabels: ['confirmar validação transferida'],
    transferNeverLabels: ['paths absolutos do Mac'],
  }).memory

  assert.equal(updated.interactionCount, 1)
  assert.equal(updated.successCount, 1)
  assert.equal(updated.failureCount, 0)
  assert.equal(updated.contextPackAppliedCount, 1)
  assert.equal(updated.lastInteractionAt, '2026-05-24T12:10:00Z')
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'canal:workbench'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'contexto aplicado'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'space:Fluxo Atlas AI'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'space-brain:Fluxo Atlas AI:comparar é ação explícita'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'memória viva:sha256:live'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'prioridade:atlas-desktop'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'continuidade:handoff:atlas-ai'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'handoff:hash:sha256:handoff'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'artifact-replay:latest:artifact-abc'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'evidence-gate:trusted:component:atlas-desktop'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'next-session:load:full:atlas-desktop'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'recovery:retry:retry com budget lean'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'adaptive-learning:mode:compound:91'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'adaptive-learning:success:registrar resultado real'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'feedback-record:outcome:workbench_compare'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'feedback-promote:space-brain:Fluxo Atlas AI:comparar é ação explícita'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'feedback-revalidate:rodar npm run atlas-ai:test'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'feedback-space:Fluxo Atlas AI'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'feedback-artifact:Fluxo Atlas AI:pack-awis'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'feedback-component:atlas-desktop'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'feedback-relation:workspace:atlas-server'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'feedback-mesh:atlas-server:shared_context:82'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'transfer-workspace:atlas-server'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'transfer-relevance:dependência:atlas-server:target:@atlas/domain'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'transfer-reuse:component:atlas-server'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'transfer-validar:confirmar validação transferida'))
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory: updated,
  })
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('space-brain:Fluxo Atlas AI:comparar é ação explícita'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('transfer-workspace:atlas-server'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('transfer-reuse:component:atlas-server'))
  assert.ok(pack?.memory?.operational.context_reputation.promoted.some((item) => item.label === 'transfer-relevance:dependência:atlas-server:target:@atlas/domain'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('transfer-validate:confirmar validação transferida'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('continuity:handoff:atlas-ai'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('handoff:hash:sha256:handoff'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('artifact-replay:latest:artifact-abc'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('evidence-gate:trusted:component:atlas-desktop'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('next-session:load:full:atlas-desktop'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('recovery:retry:retry com budget lean'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('adaptive-learning:mode:compound:91'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('feedback-promote:space-brain:Fluxo Atlas AI:comparar é ação explícita'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('feedback-space:Fluxo Atlas AI'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('feedback-artifact:Fluxo Atlas AI:pack-awis'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('feedback-component:atlas-desktop'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('feedback-relation:workspace:atlas-server'))
  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('feedback-mesh:atlas-server:shared_context:82'))
  assert.ok(pack?.adaptive_learning_plan?.context_economy.promote_to_hot.some((item) => item.includes('outcome:success:registrar resultado real')))
  assert.ok(pack?.learning_flywheel?.cycle.captured.some((item) => item === 'feedback-record:outcome:workbench_compare'))
  assert.ok(pack?.learning_flywheel?.cycle.distilled.some((item) => item === 'feedback-promote:space-brain:Fluxo Atlas AI:comparar é ação explícita'))
  assert.ok(pack?.learning_flywheel?.cycle.reused.some((item) => item === 'feedback-component:atlas-desktop'))
  assert.ok(pack?.learning_flywheel?.cycle.reused.some((item) => item === 'feedback-relation:workspace:atlas-server'))
  assert.ok(pack?.learning_flywheel?.cycle.validated.some((item) => item === 'feedback-revalidate:rodar npm run atlas-ai:test'))
  assert.ok(pack?.learning_flywheel?.cycle.promoted.some((item) => item === 'feedback-artifact:Fluxo Atlas AI:pack-awis'))
  assert.ok(pack?.learning_flywheel?.automation.next_safe_automations.some((item) => item === 'recalibrar componente:atlas-desktop'))
  assert.ok(pack?.learning_flywheel?.next_session.load_first.some((item) => item === 'feedback-space:Fluxo Atlas AI'))
  assert.ok(pack?.learning_flywheel?.next_session.update_after_send.some((item) => item === 'feedback-record:outcome:workbench_compare'))
  assert.ok(pack?.learning_flywheel?.next_session.preserve_as_artifact.some((item) => item === 'feedback-artifact:Fluxo Atlas AI:pack-awis'))
  assert.ok(pack?.learning_flywheel?.repository_loop.local_reuse.some((item) => item === 'feedback-component:atlas-desktop'))
  assert.ok(pack?.learning_flywheel?.repository_loop.cross_workspace_reuse.some((item) => item === 'feedback-relation:workspace:atlas-server'))
  assert.ok(pack?.learning_flywheel?.repository_loop.bridge_candidates.some((item) => item === 'feedback-mesh:atlas-server:shared_context:82'))
  assert.ok(pack?.memory?.operational.context_gold.space_brain.promoted.includes('Fluxo Atlas AI:comparar é ação explícita'))
  assert.deepEqual(updated.recentOutcomes[0], {
    occurredAt: '2026-05-24T12:10:00Z',
    channel: 'workbench',
    status: 'succeeded',
    provider: 'atlas_decide',
    model: null,
    latencyMs: 420,
    contextPackApplied: true,
    taskKind: null,
    routeKey: null,
    routeLabel: null,
    contextGoldLabels: [],
    validationCommands: [],
    componentKeys: [],
    spaceLabels: ['Fluxo Atlas AI'],
    spaceBrainLabels: ['Fluxo Atlas AI:comparar é ação explícita'],
    liveMemoryLabels: ['sha256:live'],
    priorityLoadLabels: ['atlas-desktop'],
    continuityLabels: ['handoff:atlas-ai', 'load:workspace_binding'],
    handoffLabels: ['hash:sha256:handoff', 'unit:context_pack'],
    artifactReplayLabels: ['latest:artifact-abc', 'seed:cold-abc'],
    evidenceGateLabels: ['trusted:component:atlas-desktop', 'verify:validar:npm run atlas-ai:test'],
    nextSessionLabels: ['load:full:atlas-desktop', 'promote:validação verde:npm run atlas-ai:test'],
    recoveryLabels: ['retry:retry com budget lean', 'resume:validar novamente:npm run atlas-ai:test'],
    adaptiveLearningLabels: ['mode:compound:91', 'success:registrar resultado real', 'promote:contexto validado'],
    feedbackRecordLabels: ['outcome:workbench_compare', 'Space:Fluxo Atlas AI'],
    feedbackPromoteLabels: ['space-brain:Fluxo Atlas AI:comparar é ação explícita'],
    feedbackRevalidateLabels: ['rodar npm run atlas-ai:test'],
    feedbackSpaceLabels: ['Fluxo Atlas AI'],
    feedbackArtifactLabels: ['Fluxo Atlas AI:pack-awis'],
    feedbackComponentLabels: ['atlas-desktop'],
    feedbackRelationLabels: ['workspace:atlas-server', 'reuso:component:atlas-server'],
    feedbackMeshLabels: ['atlas-server:shared_context:82', 'mesh:atlas-server:contexto validado'],
    componentMemoryLabels: [],
    semanticIndexLabels: [],
    taskRouterLabels: [],
    impactMapLabels: [],
    livingGraphLabels: [],
    workspaceMeshLabels: [],
    truthPackLabels: [],
    repositoryConstellationLabels: [],
    transferWorkspaceLabels: ['atlas-server'],
    transferRelevanceLabels: ['dependência:atlas-server:target:@atlas/domain'],
    transferReuseLabels: ['component:atlas-server'],
    transferValidateLabels: ['confirmar validação transferida'],
    transferNeverLabels: ['paths absolutos do Mac'],
  })
  assert.doesNotMatch(JSON.stringify(updated), /prompt|response_text|operator_input|function|class|import .* from/)
})

test('AWIS workspace context pack exposes bounded operational memory', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const memory = recordAwisWorkspaceInteraction(learnAwisWorkspaceMemory(null, brain(), key).memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'voice',
    status: 'send_failed',
    contextPackApplied: false,
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory,
  })

  assert.equal(pack?.memory?.operational.interaction_count, 1)
  assert.equal(pack?.memory?.operational.failure_count, 1)
  assert.equal(pack?.memory?.operational.context_pack_applied_count, 0)
  assert.deepEqual(pack?.memory?.operational.recent_channels, ['voice'])
  assert.equal(pack?.memory?.operational.latest_status, 'send_failed')
  assert.doesNotMatch(JSON.stringify(pack), /operator_input|response_text|prompt/)
})

test('AWIS maintenance actions teach the workspace what upkeep worked', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const initial = learnAwisWorkspaceMemory(null, brain(), key).memory
  const updated = recordAwisWorkspaceMaintenance(initial, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:20:00Z',
    action: 'preserve_artifact',
    label: 'Snapshot AWIS Atlas',
    status: 'succeeded',
    reason: 'artifact salvo para próxima partida',
    evidence: ['artifact-abc123', '2 artifacts'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory: updated,
  })
  const capsule = buildAwisWorkspaceProviderCapsule(pack, null)

  assert.equal(updated.recentMaintenance[0]?.action, 'preserve_artifact')
  assert.equal(updated.recentMaintenance[0]?.status, 'succeeded')
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'manutenção:preserve_artifact'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'manutenção ok:preserve_artifact'))
  assert.ok(pack?.memory?.operational.recent_maintenance.some((item) => item.includes('preserve_artifact:succeeded')))
  assert.ok(capsule?.continue_learning.maintenance_recent.some((item) => item.includes('preserve_artifact:succeeded')))
  assert.doesNotMatch(JSON.stringify(updated.recentMaintenance), /operator_input|response_text|prompt/)
})

test('AWIS advanced maintenance labels wake the next session as structural startup gold', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const initial = learnAwisWorkspaceMemory(null, brain(), key).memory
  const withProviderStrategy = recordAwisWorkspaceMaintenance(initial, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:20:00Z',
    action: 'record_outcome',
    label: 'provider-strategy:prefer:atlas_decide:auto:98',
    status: 'succeeded',
    reason: 'estratégia de provider funcionou em outcome real',
    evidence: ['provider:atlas_decide', 'status:succeeded'],
  }).memory
  const withTopology = recordAwisWorkspaceMaintenance(withProviderStrategy, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:21:00Z',
    action: 'record_outcome',
    label: 'topology:test:npm run atlas-ai:test',
    status: 'succeeded',
    reason: 'topologia apontou validação correta',
    evidence: ['validar:npm run atlas-ai:test'],
  }).memory
  const withTaskPacket = recordAwisWorkspaceMaintenance(withTopology, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:21:30Z',
    action: 'record_outcome',
    label: 'task-packet:hash:task-awis-hot-start',
    status: 'succeeded',
    reason: 'task packet carregou o contexto certo na próxima sessão',
    evidence: ['task_packet:startup_snapshot', 'space_brain:loaded'],
  }).memory
  const withFolderCortex = recordAwisWorkspaceMaintenance(withTaskPacket, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:21:45Z',
    action: 'record_outcome',
    label: 'folder-cortex:atlas-desktop:surface-context',
    status: 'succeeded',
    reason: 'folder cortex selecionou a área certa sem carregar repo bruto',
    evidence: ['folder:atlas-desktop', 'surface:atlas-ai'],
  }).memory
  const memory = recordAwisWorkspaceMaintenance(withFolderCortex, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:22:00Z',
    action: 'revalidate_context',
    label: 'memory-freshness:state:stale:42',
    status: 'failed',
    reason: 'memória stale precisa revalidação antes de virar ouro',
    evidence: ['stale:42'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
  })
  assert.ok(pack)
  const taskContext = buildAwisWorkspaceTaskContextProjection(pack, 'validar atlas ai')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, taskContext)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T12:23:00Z')
  assert.ok(artifact)
  saveAwisWorkspaceArtifact(artifact, store)
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const nextPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
    artifactReplay: replay,
  })

  assert.ok(pack?.memory?.operational.recent_maintenance.some((item) => item.includes('provider-strategy:prefer:atlas_decide:auto:98')))
  assert.ok(capsule?.load_first.some((item) => item.includes('awis:provider-strategy:prefer:atlas_decide:auto:98')))
  assert.ok(capsule?.load_first.some((item) => item.includes('awis:topology:test:npm run atlas-ai:test')))
  assert.ok(capsule?.load_first.some((item) => item.includes('awis:task-packet:hash:task-awis-hot-start')))
  assert.ok(capsule?.load_first.some((item) => item.includes('awis:folder-cortex:atlas-desktop:surface-context')))
  assert.ok(capsule?.use_as_summary.some((item) => item.includes('awis-aprendido:provider-strategy:prefer:atlas_decide:auto:98')))
  assert.ok(capsule?.validate_with.some((item) => item.includes('awis-revalidar:memory-freshness:state:stale:42')))
  assert.ok(capsule?.avoid_loading.some((item) => item.includes('awis-não-promover:memory-freshness:state:stale:42')))
  assert.ok(artifact.manifest.load_first.some((item) => item.includes('awis:provider-strategy:prefer:atlas_decide:auto:98')))
  assert.ok(artifact.manifest.load_first.some((item) => item.includes('awis:task-packet:hash:task-awis-hot-start')))
  assert.ok(artifact.manifest.load_first.some((item) => item.includes('awis:folder-cortex:atlas-desktop:surface-context')))
  assert.ok(artifact.manifest.promote_signals.some((item) => item.includes('awis-gold:topology:test:npm run atlas-ai:test')))
  assert.ok(artifact.manifest.promote_signals.some((item) => item.includes('awis-gold:task-packet:hash:task-awis-hot-start')))
  assert.ok(artifact.manifest.validate_with.some((item) => item.includes('awis-revalidar:memory-freshness:state:stale:42')))
  assert.ok(artifact.manifest.caution_signals.some((item) => item.includes('awis-não-promover:memory-freshness:state:stale:42')))
  assert.ok(replay?.cold_start_seed.validate_with.some((item) => item.includes('awis-revalidar:memory-freshness:state:stale:42')))
  assert.ok(replay?.cold_start_seed.warnings.some((item) => item.includes('awis-não-promover:memory-freshness:state:stale:42')))
  assert.ok(nextPack?.autonomic_queue?.priority_queue.some((item) => (
    item.action === 'revalidate_context' &&
    item.label.includes('memory-freshness:state:stale:42') &&
    item.source_layers.includes('awis_structural_revalidation') &&
    item.validate_with.some((validator) => validator.includes('awis-revalidar:memory-freshness:state:stale:42'))
  )))
  assert.ok(nextPack?.autonomic_queue?.heartbeat.before_send.some((item) => item.includes('revalidate_context:memory-freshness:state:stale:42')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((item) => item.includes('artifact-load:awis:provider-strategy:prefer:atlas_decide:auto:98')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((item) => item.includes('artifact-load:awis:task-packet:hash:task-awis-hot-start')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((item) => item.includes('artifact-load:awis:folder-cortex:atlas-desktop:surface-context')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((item) => item.includes('artifact-promote:awis-gold:topology:test:npm run atlas-ai:test')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((item) => item.includes('artifact-promote:awis-gold:task-packet:hash:task-awis-hot-start')))
  assert.ok(replay?.reusable_startup_gold.warnings.some((item) => item.includes('artifact-caution:awis-não-promover:memory-freshness:state:stale:42')))
  assert.doesNotMatch(JSON.stringify({ pack, capsule, artifact, replay }), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|prompt|"raw_conversation_included":true/)
})

test('AWIS maintenance memory consolidates repeated upkeep without losing evidence', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const initial = learnAwisWorkspaceMemory(null, brain(), key).memory
  const first = recordAwisWorkspaceMaintenance(initial, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:20:00Z',
    action: 'promote_command',
    label: 'npm run atlas-ai:test',
    status: 'succeeded',
    reason: 'comando validou outcome real',
    evidence: ['status:succeeded'],
  }).memory
  const second = recordAwisWorkspaceMaintenance(first, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:25:00Z',
    action: 'promote_command',
    label: 'npm run atlas-ai:test',
    status: 'succeeded',
    reason: 'comando validou outcome real',
    evidence: ['validar:npm run atlas-ai:test'],
  }).memory
  const matching = second.recentMaintenance.filter((event) => (
    event.action === 'promote_command' &&
    event.status === 'succeeded' &&
    event.label === 'npm run atlas-ai:test'
  ))
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain({
      commands: [
        { label: 'Atlas AI tests', command: 'npm run atlas-ai:test', kind: 'test', source: 'package.json' },
      ],
    }),
    memory: second,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'validar o Atlas AI')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)

  assert.equal(matching.length, 1)
  assert.equal(matching[0]?.seenCount, 2)
  assert.ok(matching[0]?.evidence.includes('status:succeeded'))
  assert.ok(matching[0]?.evidence.includes('validar:npm run atlas-ai:test'))
  assert.ok(pack?.memory?.operational.recent_maintenance.some((item) => item.includes('promote_command:succeeded:npm run atlas-ai:test:x2')))
  assert.ok(pack?.automation?.feedback_loop.promote_when.some((item) => item.includes('manutenção comprovada:promote_command:npm run atlas-ai:test')))
  assert.ok(task?.learning_hooks.next_session_contract.promote_when.some((item) => item.includes('manutenção comprovada:promote_command:npm run atlas-ai:test:x2')))
  assert.ok(capsule?.continue_learning.next_session_contract.promote_when.some((item) => item.includes('manutenção comprovada:promote_command:npm run atlas-ai:test:x2')))
  assert.doesNotMatch(JSON.stringify(second.recentMaintenance), /operator_input|response_text|prompt/)
})

test('AWIS command-center maintenance records cross-workspace and learning actions as durable memory', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const initial = learnAwisWorkspaceMemory(null, brain(), key).memory
  const updated = recordAwisWorkspaceMaintenance(initial, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:25:00Z',
    action: 'cross_workspace_transfer',
    label: 'atlas-server',
    status: 'succeeded',
    reason: 'Space Brain compatível validado no command center',
    evidence: ['confiança:86', 'shared_context'],
  }).memory
  const updatedAgain = recordAwisWorkspaceMaintenance(updated, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:26:00Z',
    action: 'record_outcome',
    label: 'resultado da sessão',
    status: 'succeeded',
    reason: 'operador preservou outcome para calibrar próxima conversa',
    evidence: ['acionado pelo command center'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory: updatedAgain,
  })

  assert.equal(updatedAgain.recentMaintenance[0]?.action, 'record_outcome')
  assert.equal(updatedAgain.recentMaintenance[1]?.action, 'cross_workspace_transfer')
  assert.ok(updatedAgain.operationalSignals.some((signal) => signal.label === 'manutenção ok:cross_workspace_transfer'))
  assert.ok(updatedAgain.operationalSignals.some((signal) => signal.label === 'manutenção ok:record_outcome'))
  assert.ok(pack?.memory?.operational.recent_maintenance.some((item) => item.includes('cross_workspace_transfer:succeeded:atlas-server')))
  assert.ok(pack?.memory?.operational.recent_maintenance.some((item) => item.includes('record_outcome:succeeded:resultado da sessão')))
  assert.doesNotMatch(JSON.stringify(pack), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS maintenance history recalibrates automation, confidence and self-improvement', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const initial = learnAwisWorkspaceMemory(null, brain({
    commands: [
      { label: 'Atlas AI tests', command: 'npm run atlas-ai:test', kind: 'test', source: 'package.json' },
    ],
  }), key).memory
  const withTransfer = recordAwisWorkspaceMaintenance(initial, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:30:00Z',
    action: 'cross_workspace_transfer',
    label: 'atlas-server',
    status: 'succeeded',
    reason: 'transferência validada pelo operador',
    evidence: ['shared_stack'],
  }).memory
  const withFailure = recordAwisWorkspaceMaintenance(withTransfer, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:31:00Z',
    action: 'revalidate_command',
    label: 'npm run atlas-ai:test',
    status: 'failed',
    reason: 'comando precisa nova evidência',
    evidence: ['exit 1'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain({
      commands: [
        { label: 'Atlas AI tests', command: 'npm run atlas-ai:test', kind: 'test', source: 'package.json' },
      ],
    }),
    memory: withFailure,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no Atlas AI e validar')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-24T12:32:00Z') : null

  assert.ok(pack?.automation?.maintenance_queue.some((item) => item.action === 'revalidate_command' && item.label === 'npm run atlas-ai:test'))
  assert.ok(pack?.automation?.feedback_loop.promote_when.some((item) => item.includes('manutenção comprovada:cross_workspace_transfer:atlas-server')))
  assert.ok(pack?.automation?.feedback_loop.demote_when.some((item) => item.includes('manutenção precisa revalidar:revalidate_command:npm run atlas-ai:test')))
  assert.ok(pack?.confidence?.ranked.commands.some((item) => item.label === 'npm run atlas-ai:test' && item.caution === 'manutenção recente pediu revalidação'))
  assert.ok(pack?.self_improvement?.improvement_queue.some((item) => item.action === 'transfer_learning' && item.label === 'atlas-server'))
  assert.ok(pack?.self_improvement?.improvement_queue.some((item) => item.action === 'demote_context' && item.label === 'npm run atlas-ai:test'))
  assert.ok(pack?.self_improvement?.promotion_policy.demote_when.some((item) => item.includes('manutenção precisa revalidar:revalidate_command:npm run atlas-ai:test')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.includes('manutenção-ok:cross_workspace_transfer:atlas-server')))
  assert.ok(task?.recommended_context.evidence_gate.verify_before_trust.some((item) => item.includes('manutenção-revalidar:revalidate_command:npm run atlas-ai:test')))
  assert.ok(task?.learning_hooks.next_session_contract.promote_when.some((item) => item.includes('manutenção comprovada:cross_workspace_transfer:atlas-server')))
  assert.ok(task?.learning_hooks.next_session_contract.demote_when.some((item) => item.includes('manutenção não promover:revalidate_command:npm run atlas-ai:test')))
  assert.ok(capsule?.load_first.some((item) => item.includes('manutenção-ok:cross_workspace_transfer:atlas-server')))
  assert.ok(capsule?.validate_with.some((item) => item.includes('manutenção-revalidar:revalidate_command:npm run atlas-ai:test')))
  assert.ok(capsule?.continue_learning.next_session_contract.promote_when.some((item) => item.includes('manutenção comprovada:cross_workspace_transfer:atlas-server')))
  assert.ok(capsule?.continue_learning.next_session_contract.demote_when.some((item) => item.includes('manutenção não promover:revalidate_command:npm run atlas-ai:test')))
  assert.ok(artifact?.manifest.load_first.some((item) => item.includes('manutenção-ok:cross_workspace_transfer:atlas-server')))
  assert.ok(artifact?.manifest.validate_with.some((item) => item.includes('manutenção-revalidar:revalidate_command:npm run atlas-ai:test')))
  assert.doesNotMatch(JSON.stringify(pack), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
  assert.doesNotMatch(JSON.stringify({ task, capsule, artifact }), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS task context autopilot selects provider-safe context for the next send', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const memory = recordAwisWorkspaceInteraction(learnAwisWorkspaceMemory(null, brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md', kind: 'documento' },
    ],
    commands: [
      { label: 'desktop test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'server test', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  }), key).memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'accepted',
    contextPackApplied: true,
    adaptiveLearningLabels: ['success:registrar resultado real', 'promote:contexto validado'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain({
      importantFiles: [
        { path: 'atlas-desktop/package.json', kind: 'manifesto' },
        { path: 'atlas-server/composer.json', kind: 'manifesto' },
        { path: 'docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md', kind: 'documento' },
      ],
      docDigests: [
        {
          path: 'AGENTS.md',
          kind: 'provider-projection',
          signals: ['ler docs canônicos antes de implementar'],
          obligations: ['rodar bootstrap AWIS antes de programar'],
          summary: 'contrato operacional do workspace Atlas',
        },
      ],
      commands: [
        { label: 'desktop test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
        { label: 'server test', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
      ],
    }),
    memory,
  })
  const task = buildAwisWorkspaceTaskContextProjection(
    pack,
    'Corrigir bug no Atlas AI desktop e validar com teste sem vazar este texto bruto',
  )

  assert.equal(pack?.current_truth_pack?.schema_version, 'atlas.awis.current_truth_pack_projection.v1')
  assert.ok(pack?.current_truth_pack?.truth_hash.startsWith('truth-'))
  assert.ok(pack?.current_truth_pack?.current_truth.active_components.some((item) => item.includes('atlas-desktop')))
  assert.ok(pack?.current_truth_pack?.current_truth.doc_rules.some((item) => item.includes('rodar bootstrap AWIS')))
  assert.ok(pack?.current_truth_pack?.current_truth.doc_rules.some((item) => item.includes('scan limitado para manter desempenho')))
  assert.ok(pack?.current_truth_pack?.proof.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(pack?.current_truth_pack?.proof.evidence_refs.some((item) => item.startsWith('doc:')))
  assert.ok(pack?.current_truth_pack?.proof.stale_or_unproven.some((item) => item.includes('scan limitado para manter desempenho')))
  assert.ok(pack?.current_truth_pack?.trust_contract.trust_first.some((item) => item.includes('atlas-desktop')))
  assert.ok(pack?.current_truth_pack?.trust_contract.trust_first.some((item) => item.startsWith('doc:')))
  assert.ok(pack?.current_truth_pack?.trust_contract.verify_before_send.includes('npm run atlas-ai:test'))
  assert.ok(pack?.current_truth_pack?.trust_contract.never_load_raw.includes('conteúdo bruto de conversas'))
  assert.ok(['ready', 'guarded', 'stale'].includes(pack?.current_truth_pack?.trust_contract.evidence_mode ?? ''))
  assert.equal(pack?.learning_flywheel?.schema_version, 'atlas.awis.workspace_learning_flywheel_projection.v1')
  assert.ok(pack?.learning_flywheel?.cycle.captured.some((item) => item.includes('interações')))
  assert.ok(pack?.learning_flywheel?.cycle.validated.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(pack?.learning_flywheel?.next_session.update_after_send.includes('registrar resultado real'))
  assert.equal(pack?.learning_flywheel?.safety.provider_safe, true)
  assert.equal(pack?.adaptive_learning_plan?.schema_version, 'atlas.awis.workspace_adaptive_learning_plan_projection.v1')
  assert.ok(['observe', 'stabilize', 'compound', 'guarded'].includes(pack?.adaptive_learning_plan?.mode ?? ''))
  assert.ok(pack?.adaptive_learning_plan?.autonomous_cycle.after_success.some((item) => item.includes('registrar') || item.includes('resultado')))
  assert.ok(pack?.adaptive_learning_plan?.context_economy.promote_to_hot.length)
  assert.ok(pack?.adaptive_learning_plan?.proof.outcome_metrics.includes('registrar status real'))
  assert.equal(pack?.adaptive_learning_plan?.safety.provider_safe, true)
  assert.equal(task?.schema_version, 'atlas.awis.workspace_task_context_projection.v1')
  assert.equal(task?.task_kind, 'bug_fix')
  assert.ok(task?.recommended_context.components.some((component) => component.key === 'atlas-desktop'))
  assert.equal(task?.recommended_context.folder_focus.primary_component, 'atlas-desktop')
  assert.equal(task?.recommended_context.folder_focus.load_scope, 'component')
  assert.ok(task?.recommended_context.folder_focus.include.some((item) => item.includes('atlas-desktop/package.json')))
  assert.ok(
    task?.recommended_context.folder_focus.summarize.some((item) => item.includes('atlas-server/'))
    || task?.recommended_context.folder_focus.avoid.some((item) => item.includes('varredura bruta')),
  )
  assert.ok(task?.recommended_context.task_gold.some((item) => item.kind === 'component' && item.label === 'atlas-desktop'))
  assert.ok(task?.recommended_context.task_gold.some((item) => item.kind === 'route' && item.label === 'task:bug_fix'))
  assert.ok(task?.recommended_context.task_gold.some((item) => item.kind === 'adaptive_learning' && item.label.includes('success:registrar resultado real')))
  assert.ok(task?.recommended_context.evidence_gate.verify_before_trust.some((item) => item.includes('validar:npm run atlas-ai:test')))
  assert.ok(task?.recommended_context.evidence_gate.verify_before_trust.some((item) => item.includes('npm run atlas-ai:test')))
  assert.match(task?.recommended_context.evidence_gate.reason ?? '', /evidência|contexto|partida/)
  assert.equal(task?.recommended_context.context_budget.mode, 'lean')
  assert.ok((task?.recommended_context.context_budget.max_items ?? 0) <= 4)
  assert.ok(task?.recommended_context.context_budget.load_full.some((item) => item.includes('atlas-desktop')))
  assert.ok(task?.recommended_context.context_budget.omit.some((item) => item.includes('atlas-server') || item.includes('varredura bruta')))
  assert.ok(task?.recommended_context.working_set.files.includes('atlas-desktop/package.json'))
  assert.ok(task?.recommended_context.working_set.docs.some((doc) => doc.includes('atlas-workspace-intelligence-system.md')))
  assert.ok(task?.recommended_context.working_set.commands.includes('npm run atlas-ai:test'))
  assert.ok(task?.execution_plan.validation_commands.includes('npm run atlas-ai:test'))
  assert.ok(task?.execution_plan.recovery_playbook.safe_resume.some((item) => item.includes('validar novamente')))
  assert.match(task?.execution_plan.recovery_playbook.reason ?? '', /retry|revalidação|falha|cautela|seguro/)
  assert.ok(task?.learning_hooks.next_session_contract.first_load.some((item) => item.includes('atlas-desktop')))
  assert.ok(task?.learning_hooks.next_session_contract.first_load.some((item) => item.includes('adaptive-hot:outcome:success:registrar resultado real')))
  assert.ok(task?.learning_hooks.next_session_contract.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(task?.learning_hooks.next_session_contract.promote_when.some((item) => item.includes('validação verde')))
  assert.ok(task?.learning_hooks.next_session_contract.promote_when.some((item) => item.includes('adaptive validado')))
  assert.ok(task?.learning_hooks.next_session_contract.demote_when.length > 0)
  assert.equal(task?.learning_hooks.record_task_outcome, true)
  assert.equal(task?.safety.raw_user_message_included, false)
  assert.doesNotMatch(JSON.stringify(task), /Corrigir bug|texto bruto|\/Users\/vitorepf/)
})

test('AWIS provider capsule distills the next send into compact executable context', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  let memory = learnAwisWorkspaceMemory(null, brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
    ],
  }), key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    contextGoldLabels: ['component:atlas-desktop'],
    componentKeys: ['atlas-desktop'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain({
      importantFiles: [
        { path: 'atlas-desktop/package.json', kind: 'manifesto' },
        { path: 'docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md', kind: 'documento' },
      ],
      commands: [
        { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      ],
    }),
    memory,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no Atlas AI e rodar testes')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)

  assert.equal(capsule?.schema_version, 'atlas.awis.workspace_provider_capsule.v1')
  assert.equal(capsule?.task_kind, 'bug_fix')
  assert.equal(capsule?.task_packet?.schema_version, 'atlas.awis.workspace_task_packet_projection.v1')
  assert.equal(capsule?.task_packet?.task_kind, 'bug_fix')
  assert.ok(capsule?.task_packet?.packet_hash.startsWith('task-'))
  assert.equal(capsule?.task_packet?.objective.workspace_key, key)
  assert.equal(capsule?.task_packet?.objective.suggested_surface, task?.execution_plan.suggested_surface)
  assert.ok(capsule?.task_packet?.context.load_first.length)
  assert.equal(capsule?.task_packet?.context.bootstrap_plan.manifest_hash, task?.recommended_context.bootstrap_plan.manifest_hash)
  assert.ok(capsule?.task_packet?.context.bootstrap_plan.load_first.length)
  assert.ok(capsule?.task_packet?.context.working_set.files.includes('atlas-desktop/package.json'))
  assert.ok(capsule?.task_packet?.execution.validation_commands.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.task_packet?.learning.archive_as_artifact.includes('task_packet'))
  assert.ok(capsule?.task_packet?.learning.automation_hooks.length)
  assert.ok(capsule?.task_packet?.learning.automation_hooks.some((item) => (
    item.startsWith('before:') ||
    item.startsWith('success:') ||
    item.startsWith('brain:') ||
    item.startsWith('artifact:') ||
    item.startsWith('space:')
  )))
  assert.ok(capsule?.task_packet?.learning.write_back_after_success.length)
  assert.ok(capsule?.task_packet?.learning.write_back_after_success.some((item) => (
    item.startsWith('evidence:') ||
    item.startsWith('archive:') ||
    item.startsWith('flywheel:') ||
    item.startsWith('launch:') ||
    item.startsWith('artifact:')
  )))
  assert.ok(capsule?.task_packet?.learning.next_session_first_load.length)
  assert.ok(capsule?.task_packet?.learning.next_session_first_load.some((item) => (
    item.includes('atlas-desktop') ||
    item.startsWith('continuity:') ||
    item.startsWith('launch:') ||
    item.startsWith('artifact:') ||
    item.startsWith('brain:')
  )))
  assert.ok(capsule?.task_packet?.learning.next_session_validate_with.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.task_packet?.learning.next_session_validate_with.some((item) => (
    item.startsWith('continuity:') ||
    item.startsWith('launch:') ||
    item.startsWith('artifact:') ||
    item.startsWith('evidence:') ||
    item.includes('npm run atlas-ai:test')
  )))
  assert.ok(capsule?.task_packet?.learning.next_session_promote_when.some((item) => (
    item.includes('validação verde') ||
    item.startsWith('launch:') ||
    item.startsWith('consolidate:') ||
    item.startsWith('flywheel:') ||
    item.startsWith('retention:')
  )))
  assert.ok(capsule?.task_packet?.learning.next_session_demote_when.length)
  assert.ok(capsule?.task_packet?.learning.next_session_demote_when.some((item) => (
    item.startsWith('consolidate:') ||
    item.startsWith('revalidate:') ||
    item.startsWith('flywheel:') ||
    item.startsWith('retention:') ||
    item.includes('falha') ||
    item.includes('revalidar') ||
    item.includes('não promover')
  )))
  assert.ok(capsule?.task_packet?.learning.automation_plan.safe_local.some((item) => (
    item.includes('npm run atlas-ai:test') ||
    item.startsWith('registrar:') ||
    item.startsWith('write-back:')
  )))
  assert.ok(capsule?.task_packet?.learning.automation_plan.confirm_first.length)
  assert.ok(capsule?.task_packet?.learning.automation_plan.confirm_first.some((item) => (
    item.includes('confirm') ||
    item.includes('humano') ||
    item.includes('manual') ||
    item.includes('risco')
  )))
  assert.ok(capsule?.task_packet?.learning.automation_plan.observe_only.length)
  assert.ok(capsule?.task_packet?.learning.automation_plan.observe_only.some((item) => (
    item.startsWith('não-promover:') ||
    item.startsWith('cautela:') ||
    item.startsWith('fila:')
  )))
  assert.match(capsule?.task_packet?.learning.automation_plan.reason ?? '', /automação local segura/)
  assert.equal(capsule?.task_packet?.safety.provider_safe, true)
  assert.equal(capsule?.bootstrap_plan.manifest_hash, task?.recommended_context.bootstrap_plan.manifest_hash)
  assert.ok(capsule?.bootstrap_plan.load_first.length)
  assert.ok(capsule?.bootstrap_plan.validate_before_use.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(capsule?.load_first.length)
  assert.ok(capsule?.load_first.some((item) => item.startsWith('bootstrap-plan:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('pasta:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('folder-doc:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('folder-manifest:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('budget-full:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('ouro:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('truth-trust:') || item.startsWith('truth:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('flywheel:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('session-gold:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('comando-provado:npm run atlas-ai:test')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('folder-command-source:')))
  assert.ok(capsule?.use_as_summary.some((item) => item === 'context-gold:component:atlas-desktop'))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('task-gold:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('session-hook:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('session-after:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('evidence-gate:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('truth-trust:') || item.startsWith('current-truth:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('learning-flywheel:') || item.startsWith('flywheel-promote:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('budget:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('folder-focus:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('arquivo:') || item.startsWith('doc:') || item.startsWith('comando:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('ouro:') || item.startsWith('componente:')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('evidência:') || item.startsWith('evidência stale:')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('session-gold:npm run atlas-ai:test')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('truth-check:') || item.includes('npm run atlas-ai:test')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('flywheel:') || item.includes('npm run atlas-ai:test')))
  assert.ok(capsule?.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.validate_with.some((item) => item === 'folder-validation:npm run atlas-ai:test'))
  assert.ok(capsule?.command_lanes.auto_validate.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.command_lanes.preferred_validation.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.validate_with.some((item) => item === 'auto-validar:npm run atlas-ai:test'))
  assert.equal(capsule?.startup_contract.never_start_cold, true)
  assert.equal(capsule?.startup_contract.bootstrap_manifest_hash, capsule?.bootstrap_plan.manifest_hash)
  assert.ok(['warm', 'deep'].includes(capsule?.startup_contract.launch_mode ?? ''))
  assert.ok(['lean', 'balanced', 'deep'].includes(capsule?.startup_contract.context_mode ?? ''))
  assert.ok(capsule?.startup_contract.load_sequence.length)
  assert.ok(capsule?.startup_contract.load_sequence.some((item) => item.startsWith('bootstrap:')))
  assert.ok(capsule?.startup_contract.revalidate_before_send.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.avoid_loading.some((item) => item.includes('conteúdo bruto') || item.startsWith('truth-never:')))
  assert.equal(typeof capsule?.startup_contract.prefer_summary, 'boolean')
  assert.equal(capsule?.continue_learning.record_outcome, true)
  assert.equal(capsule?.continue_learning.update_memory, true)
  assert.ok(capsule?.continue_learning.recovery_playbook.safe_resume.some((item) => item.includes('validar novamente')))
  assert.ok(capsule?.continue_learning.next_session_contract.first_load.some((item) => item.includes('atlas-desktop')))
  assert.ok(capsule?.continue_learning.next_session_contract.first_load.some((item) => item.includes('bootstrap')))
  assert.ok(capsule?.continue_learning.next_session_contract.first_load.some((item) => item.includes('verdade:') || item.includes('truth') || item.includes('atlas-desktop')))
  assert.ok(capsule?.continue_learning.next_session_contract.first_load.some((item) => item.includes('preferir validação comprovada')))
  assert.ok(capsule?.continue_learning.next_session_contract.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.continue_learning.next_session_contract.promote_when.some((item) => item.includes('validação verde')))
  assert.equal(capsule?.golden_context.provider_safe, true)
  assert.ok(capsule?.golden_context.top_load.some((item) => item.label.startsWith('session-gold:') || item.label.startsWith('ouro:') || item.label.startsWith('pasta:')))
  assert.ok(capsule?.golden_context.summary_gold.some((item) => item.label.startsWith('context-gold:') || item.label.startsWith('task-gold:')))
  assert.ok(capsule?.golden_context.validation_gold.some((item) => item.label.includes('npm run atlas-ai:test')))
  assert.ok(capsule?.golden_context.avoid_or_confirm.some((item) => item.label.includes('conteúdo bruto') || item.label.includes('paths absolutos')))
  assert.ok(capsule?.golden_context.top_load.every((item) => item.score >= 0 && item.score <= 100 && item.reason.length > 0))
  assert.ok(capsule?.golden_context.next_send_recipe.load_now.length)
  assert.ok(capsule?.golden_context.next_send_recipe.summarize_now.length)
  assert.ok(capsule?.golden_context.next_send_recipe.prove_before_trust.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(capsule?.golden_context.next_send_recipe.avoid_or_confirm.some((item) => item.includes('conteúdo bruto') || item.includes('paths absolutos')))
  assert.ok(capsule?.golden_context.activation_order.some((item) => item.step === 'load'))
  assert.ok(capsule?.golden_context.activation_order.some((item) => item.step === 'prove' && item.label.includes('npm run atlas-ai:test')))
  assert.ok(capsule?.golden_context.activation_order.every((item) => item.score >= 0 && item.score <= 100 && item.reason.length > 0))
  assert.equal(capsule?.safety.provider_safe, true)
  assert.doesNotMatch(JSON.stringify(capsule), /corrigir bug no Atlas AI|\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS task gold learns which context gold worked and revalidates failed gold', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  let memory = learnAwisWorkspaceMemory(null, brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
    ],
  }), key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-desktop'],
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'send_failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-server'],
    componentKeys: ['atlas-server'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain({
      importantFiles: [
        { path: 'atlas-desktop/package.json', kind: 'manifesto' },
        { path: 'atlas-server/composer.json', kind: 'manifesto' },
      ],
      commands: [
        { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      ],
    }),
    memory,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no atlas desktop')
  const desktopGold = task?.recommended_context.task_gold.find((item) => item.kind === 'component' && item.label === 'atlas-desktop')
  const serverGold = task?.recommended_context.task_gold.find((item) => item.kind === 'component' && item.label === 'atlas-server')

  assert.ok(pack?.memory?.operational.context_gold.promoted.includes('component:atlas-desktop'))
  assert.ok(pack?.memory?.operational.context_gold.revalidate.includes('component:atlas-server'))
  assert.ok((desktopGold?.confidence ?? 0) > 72)
  assert.match(desktopGold?.why ?? '', /comprovado em outcome real/)
  assert.ok(!serverGold || serverGold.confidence < 72 || /revalidar/.test(serverGold.why))
  assert.ok(task?.recommended_context.evidence_gate.trusted.includes('component:atlas-desktop'))
  assert.ok(task?.recommended_context.evidence_gate.verify_before_trust.includes('component:atlas-server'))
  assert.doesNotMatch(JSON.stringify({ pack, task }), /operator_input|response_text|\/Users\/vitorepf/)
})

test('AWIS context reputation promotes proven context and quarantines noisy context', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  let memory = learnAwisWorkspaceMemory(null, brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
    ],
  }), key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-desktop'],
    priorityLoadLabels: ['mapa de componentes'],
    componentMemoryLabels: ['atlas-desktop:surface'],
    semanticIndexLabels: ['atlas ai drag'],
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'send_failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-server'],
    priorityLoadLabels: ['server raw scan'],
    componentMemoryLabels: ['atlas-server:backend'],
    componentKeys: ['atlas-server'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-server'],
    priorityLoadLabels: ['server raw scan'],
    componentMemoryLabels: ['atlas-server:backend'],
    componentKeys: ['atlas-server'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain({
      importantFiles: [
        { path: 'atlas-desktop/package.json', kind: 'manifesto' },
        { path: 'atlas-server/composer.json', kind: 'manifesto' },
      ],
      commands: [
        { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      ],
    }),
    memory,
  })
  const reputation = pack?.memory?.operational.context_reputation
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no atlas desktop')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)

  assert.ok(reputation?.promoted.some((item) => item.label === 'context:component:atlas-desktop'))
  assert.ok(reputation?.promoted.some((item) => item.label === 'component:atlas-desktop:surface'))
  assert.ok(reputation?.revalidate.some((item) => item.label === 'context:component:atlas-server'))
  assert.ok(reputation?.noisy.some((item) => item.label === 'context:component:atlas-server' || item.label === 'load:server raw scan'))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('reputation:context:component:atlas-desktop')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('reputation-gold:context:component:atlas-desktop')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('reputation:context:component:atlas-server')))
  assert.ok(capsule?.avoid_loading.some((item) => item.startsWith('reputation-noisy:context:component:atlas-server') || item.startsWith('reputation-noisy:load:server raw scan')))
  assert.ok(capsule?.golden_context.summary_gold.some((item) => item.label.startsWith('reputation-gold:')))
  assert.ok(capsule?.golden_context.avoid_or_confirm.some((item) => item.label.startsWith('reputation-noisy:')))
  assert.ok(task?.recommended_context.task_gold.some((item) => item.kind === 'context_reputation' && item.label === 'context:component:atlas-desktop'))
  assert.ok(task?.recommended_context.task_gold.some((item) => item.kind === 'context_reputation' && item.why.includes('reputação comprovada')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('task-gold:context_reputation:context:component:atlas-desktop')))
  assert.ok(capsule?.golden_context.summary_gold.some((item) => item.label.startsWith('task-gold:context_reputation:context:component:atlas-desktop')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(task?.execution_plan.validation_commands.some((item) => item.startsWith('reputação:context:component:atlas-server')))
  assert.ok(task?.risk.cautions.some((item) => item.startsWith('ruído:context:component:atlas-server') || item.startsWith('ruído:load:server raw scan')))
  assert.ok(task?.recommended_context.next_session_contract.first_load.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(task?.recommended_context.next_session_contract.validate_with.some((item) => item.startsWith('reputação:context:component:atlas-server')))
  assert.ok(task?.learning_hooks.task_feedback_loop.promote.some((item) => item.startsWith('promover reputação:context:component:atlas-desktop')))
  assert.ok(task?.learning_hooks.task_feedback_loop.revalidate.some((item) => item.startsWith('revalidar reputação:context:component:atlas-server') || item.startsWith('quarentenar ruído:context:component:atlas-server')))
  assert.ok(task?.learning_hooks.next_session_contract.promote_when.some((item) => item.startsWith('promover reputação:context:component:atlas-desktop')))
  assert.ok(task?.learning_hooks.next_session_contract.demote_when.some((item) => item.startsWith('revalidar reputação:context:component:atlas-server') || item.startsWith('quarentenar ruído:context:component:atlas-server')))
  assert.ok(pack?.startup_orchestration?.startup_sequence.some((item) => item.source === 'gold' && item.step === 'restore' && item.label.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(pack?.startup_orchestration?.startup_sequence.some((item) => item.source === 'memory' && item.step === 'validate' && item.label.startsWith('reputação:context:component:atlas-server')))
  assert.ok(pack?.startup_orchestration?.revalidation_gate.required_before_send.some((item) => item.startsWith('reputação:context:component:atlas-server')))
  assert.ok(pack?.startup_orchestration?.revalidation_gate.required_before_send.some((item) => item.startsWith('ruído:context:component:atlas-server') || item.startsWith('ruído:load:server raw scan')))
  assert.ok(pack?.startup_orchestration?.revalidation_gate.can_autoload.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(pack?.automation?.maintenance_queue.some((item) => (
    item.action === 'revalidate_context' &&
    item.label === 'context:component:atlas-server' &&
    item.requires_human_confirmation === true
  )))
  assert.ok(pack?.automation?.maintenance_queue.some((item) => (
    item.action === 'revalidate_context' &&
    item.label === 'ruído:context:component:atlas-server' &&
    item.requires_human_confirmation === true
  )))
  assert.ok(pack?.automation?.feedback_loop.demote_when.some((item) => item.startsWith('revalidar reputação:context:component:atlas-server')))
  assert.ok(pack?.self_improvement?.improvement_queue.some((item) => item.action === 'demote_context' && item.label === 'context:component:atlas-server'))
  assert.ok(pack?.self_improvement?.improvement_queue.some((item) => item.action === 'demote_context' && item.label === 'ruído:context:component:atlas-server'))
  assert.ok(pack?.self_improvement?.promotion_policy.demote_when.some((item) => item.startsWith('quarentenar ruído:context:component:atlas-server')))
  assert.ok(pack?.learning_flywheel?.next_session.load_first.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(pack?.learning_flywheel?.next_session.validate_with.some((item) => item.startsWith('reputação:context:component:atlas-server')))
  assert.ok(pack?.learning_flywheel?.proof.never_promote.some((item) => item.startsWith('reputação:context:component:atlas-server')))
  assert.ok(pack?.adaptive_learning_plan?.autonomous_cycle.on_startup.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(pack?.adaptive_learning_plan?.autonomous_cycle.before_send.some((item) => item.startsWith('reputação:context:component:atlas-server')))
  assert.ok(pack?.adaptive_learning_plan?.autonomous_cycle.after_failure.some((item) => item.startsWith('quarentenar reputação:context:component:atlas-server')))
  assert.ok(pack?.adaptive_learning_plan?.context_economy.promote_to_hot.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(pack?.adaptive_learning_plan?.context_economy.retire_or_revalidate.some((item) => item.startsWith('ruído:context:component:atlas-server')))
  assert.ok(pack?.current_truth_pack?.current_truth.must_keep.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(pack?.current_truth_pack?.trust_contract.trust_first.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(pack?.current_truth_pack?.trust_contract.verify_before_send.some((item) => item.startsWith('reputação:context:component:atlas-server')))
  assert.ok(pack?.current_truth_pack?.proof.stale_or_unproven.some((item) => item.startsWith('ruído:context:component:atlas-server') || item.startsWith('ruído:load:server raw scan')))
  assert.ok(pack?.current_truth_pack?.next_conversation.promote_when.some((item) => item.startsWith('promover reputação:context:component:atlas-desktop')))
  assert.ok(pack?.current_truth_pack?.next_conversation.demote_when.some((item) => item.startsWith('revalidar reputação:context:component:atlas-server') || item.startsWith('quarentenar ruído:context:component:atlas-server')))
  assert.ok(pack?.next_session_brain?.load_order.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(pack?.next_session_brain?.context_loading.truth_hints.trust_first.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(pack?.next_session_brain?.context_loading.truth_hints.verify_before_send.some((item) => item.startsWith('reputação:context:component:atlas-server')))
  assert.ok(pack?.next_session_brain?.context_loading.truth_hints.refresh_when.some((item) => item.startsWith('ruído:context:component:atlas-server') || item.startsWith('ruído:load:server raw scan')))
  assert.ok(pack?.next_session_brain?.context_loading.avoid_commands.some((item) => item.startsWith('ruído:context:component:atlas-server') || item.startsWith('ruído:load:server raw scan')))
  assert.ok(pack?.next_session_brain?.context_loading.automation_hooks.some((item) => item.startsWith('manter quente:reputação:context:component:atlas-desktop')))
  assert.ok(pack?.next_session_brain?.context_loading.automation_hooks.some((item) => item.startsWith('revalidar:reputação:context:component:atlas-server')))
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-26T15:00:00Z') : null
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const replayOnlyPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    artifactReplay: replay,
  })
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(replay?.cold_start_seed.truth_hints?.trust_first.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(replay?.cold_start_seed.truth_hints?.verify_before_send.some((item) => item.startsWith('reputação:context:component:atlas-server')))
  assert.ok(replayOnlyPack?.next_session_brain?.load_order.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(replayOnlyPack?.next_session_brain?.context_loading.truth_hints.trust_first.some((item) => item.startsWith('reputação:context:component:atlas-desktop')))
  assert.ok(replayOnlyPack?.next_session_brain?.context_loading.truth_hints.verify_before_send.some((item) => item.startsWith('reputação:context:component:atlas-server')))
  assert.doesNotMatch(JSON.stringify(reputation), /operator_input|response_text|"raw_conversation_|source_thread_ids|\/Users\/vitorepf/)
})

test('AWIS transfer relevance reputation promotes useful cross-repo transfer and quarantines failed transfer', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  let memory = learnAwisWorkspaceMemory(null, brain(), key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-25T10:00:00Z',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    transferWorkspaceLabels: ['atlas-server'],
    transferRelevanceLabels: ['dependência:atlas-server:target:@atlas/domain'],
    transferReuseLabels: ['transfer:alvo dependência:target:@atlas/domain'],
    transferValidateLabels: ['confirmar alvo de dependência local:target:@atlas/domain'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-25T11:00:00Z',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    transferWorkspaceLabels: ['atlas-mobile'],
    transferRelevanceLabels: ['dependência:atlas-mobile:target:swift-only'],
    transferReuseLabels: ['transfer:alvo dependência:target:swift-only'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-25T12:00:00Z',
    channel: 'conversation',
    status: 'send_failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    transferWorkspaceLabels: ['atlas-mobile'],
    transferRelevanceLabels: ['dependência:atlas-mobile:target:swift-only'],
    transferReuseLabels: ['transfer:alvo dependência:target:swift-only'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
  })
  const reputation = pack?.memory?.operational.context_reputation
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug de integração no atlas server')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)

  assert.ok(reputation?.promoted.some((item) => item.label === 'transfer-relevance:dependência:atlas-server:target:@atlas/domain'))
  assert.ok(reputation?.noisy.some((item) => item.label === 'transfer-relevance:dependência:atlas-mobile:target:swift-only'))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('reputação:transfer-relevance:dependência:atlas-server')))
  assert.ok(task?.risk.cautions.some((item) => item.startsWith('ruído:transfer-relevance:dependência:atlas-mobile')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('reputation:transfer-relevance:dependência:atlas-server')))
  assert.ok(capsule?.avoid_loading.some((item) => item.startsWith('reputation-noisy:transfer-relevance:dependência:atlas-mobile')))
  assert.ok(pack?.automation?.maintenance_queue.some((item) => (
    item.action === 'revalidate_context' &&
    item.label === 'ruído:transfer-relevance:dependência:atlas-mobile:target:swift-only' &&
    item.requires_human_confirmation === true
  )))
  assert.ok(pack?.self_improvement?.improvement_queue.some((item) => (
    item.action === 'demote_context' &&
    item.label === 'ruído:transfer-relevance:dependência:atlas-mobile:target:swift-only'
  )))
  assert.doesNotMatch(JSON.stringify({ pack, task, capsule }), /\/Users\/|operator_input|response_text|source_thread_ids|thread_id/)
})

test('AWIS workspace memory learns task outcomes without storing prompts', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const memory = recordAwisWorkspaceInteraction(learnAwisWorkspaceMemory(null, brain(), key).memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'accepted',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    contextGoldLabels: ['component:atlas-desktop'],
    componentKeys: ['atlas-desktop'],
  }).memory

  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'tarefa:bug_fix'))
  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'validação sugerida:npm run atlas-ai:test'))
  assert.doesNotMatch(JSON.stringify(memory), /Corrigir|prompt|operator_input|response_text/)
})

test('AWIS workspace evolution projection learns abstract patterns across workspaces without leaking roots', () => {
  const atlasKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const mobileKey = workspaceMemoryKey('/Users/vitorepf/develop/AtlasMobile', 'atlas-mobile')
  const atlasMemory = recordAwisWorkspaceInteraction(learnAwisWorkspaceMemory(null, brain({
    rootName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    signals: ['Tauri', 'Laravel', 'TypeScript'],
    languages: [{ label: 'TypeScript', count: 1200 }],
    commands: [{ label: 'npm test', command: 'npm run atlas-ai:test', kind: 'test', source: 'package.json' }],
  }), atlasKey).memory, {
    workspaceKey: atlasKey,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'send_failed',
    contextPackApplied: true,
  }).memory
  const mobileMemory = learnAwisWorkspaceMemory(null, brain({
    rootName: 'Atlas Mobile',
    rootPath: '/Users/vitorepf/develop/AtlasMobile',
    signals: ['Expo', 'TypeScript'],
    languages: [{ label: 'TypeScript', count: 900 }],
    commands: [{ label: 'npm test', command: 'npm test', kind: 'test', source: 'package.json' }],
  }), mobileKey).memory

  const projection = buildAwisWorkspaceEvolutionProjection({
    [atlasKey]: atlasMemory,
    [mobileKey]: mobileMemory,
  }, atlasKey)

  assert.equal(projection?.schema_version, 'atlas.awis.workspace_evolution_projection.v1')
  assert.equal(projection?.workspace_count, 2)
  assert.equal(projection?.current_workspace_seen, true)
  assert.ok(projection?.patterns.some((pattern) => pattern.label === 'TypeScript'))
  assert.equal(projection?.transfer_policy.raw_paths_returned, false)
  assert.equal(projection?.transfer_policy.raw_workspace_names_returned, false)
  assert.doesNotMatch(JSON.stringify(projection), /Users|Atlas Mobile|develop\/Atlas/)
})

test('AWIS workspace context pack carries cross-workspace evolution as provider-safe abstract memory', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const memory = learnAwisWorkspaceMemory(null, brain(), key).memory
  const evolution = buildAwisWorkspaceEvolutionProjection({
    [key]: memory,
    'other-workspace': learnAwisWorkspaceMemory(null, brain({
      rootName: 'Other',
      rootPath: '/tmp/private-other',
      signals: ['Laravel', 'Tauri'],
      commands: [{ label: 'npm test', command: 'npm run test', kind: 'test', source: 'package.json' }],
    }), 'other-workspace').memory,
  }, key)
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory,
    evolution,
  })

  assert.equal(pack?.evolution?.schema_version, 'atlas.awis.workspace_evolution_projection.v1')
  assert.equal(pack?.safety.cross_workspace_raw_context_included, false)
  assert.equal(pack?.evolution?.transfer_policy.privacy_level, 'abstracted')
  assert.doesNotMatch(JSON.stringify(pack), /tmp\/private-other|Other/)
})

test('AWIS workspace space projection carries strongest Spaces without raw thread ids', () => {
  const projection = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Fluxo Atlas AI',
      source: 'local_space',
      generated_at: '2026-05-24T12:10:00Z',
      thread_count: 2,
      message_count: 12,
      mode_count: 2,
      decision_count: 1,
      pending_count: 0,
      risk_count: 1,
      artifact_count: 1,
      scope_label: '2 sessões · 2 modos',
      reusable_by: ['Atlas AI', 'Code', 'packs'],
      recommended_use: ['gerar pack seguro', 'trabalhar lado a lado'],
      learned_memory: {
        outcome_count: 3,
        success_count: 2,
        failure_count: 1,
        comparison_open_count: 2,
        last_outcome_at: '2026-05-24T12:09:00Z',
        last_outcome_status: 'failed',
        artifact_refs: ['artifact-space-learned'],
        signals: ['comparar:abertura explícita', 'pack:vivo'],
      },
      brain_contract: {
        state: 'vivo',
        load_first: ['Space:Fluxo Atlas AI', 'sessão:Corrigir AWIS'],
        carry_forward: ['artifact:pack-awis'],
        validate_before_use: ['revalidar riscos do Space'],
        automation_hooks: ['promover resumo do Space para próxima conversa'],
        human_boundary: ['humano confirma mudança em área de risco'],
        artifact_refs: ['pack-awis'],
        evidence: ['1 decisão', '1 risco'],
      },
      sessions: [
        {
          title: 'Corrigir AWIS',
          mode: 'programming',
          message_count: 8,
          last_active_at: '2026-05-24T12:00:00Z',
          provider: 'atlas_decide',
        },
        {
          title: 'Pesquisa UX',
          mode: 'research',
          message_count: 4,
          last_active_at: '2026-05-24T12:05:00Z',
          provider: null,
        },
      ],
    },
  ])

  assert.equal(projection?.schema_version, 'atlas.awis.workspace_space_projection.v1')
  assert.equal(projection?.space_count, 1)
  assert.equal(projection?.total_session_count, 2)
  assert.equal(projection?.strongest_spaces[0]?.title, 'Fluxo Atlas AI')
  assert.equal(projection?.continuity.never_start_cold, true)
  assert.equal(projection?.continuity.provider_safe, true)
  assert.ok(projection?.continuity.load_first.includes('Space:Fluxo Atlas AI'))
  assert.equal(projection?.strongest_spaces[0]?.source, 'local_space')
  assert.equal(projection?.strongest_spaces[0]?.scope_label, '2 sessões · 2 modos')
  assert.ok((projection?.strongest_spaces[0]?.strength_score ?? 0) > 0)
  assert.equal(projection?.strongest_spaces[0]?.brain_contract.state, 'vivo')
  assert.equal(projection?.strongest_spaces[0]?.learned_memory.outcome_count, 3)
  assert.equal(projection?.strongest_spaces[0]?.learned_memory.failure_count, 1)
  assert.ok(projection?.strongest_spaces[0]?.learned_memory.signals.includes('comparar:abertura explícita'))
  assert.ok(projection?.strongest_spaces[0]?.continuity_contract.load_when.includes('há aprendizado validado neste Space'))
  assert.ok(projection?.strongest_spaces[0]?.continuity_contract.load_when.includes('há falhas aprendidas para revalidar'))
  assert.ok(projection?.strongest_spaces[0]?.continuity_contract.carry_forward.includes('aprendizado:pack:vivo'))
  assert.ok(projection?.strongest_spaces[0]?.brain_contract.load_first.includes('Space:Fluxo Atlas AI'))
  assert.ok(projection?.strongest_spaces[0]?.brain_contract.artifact_refs.includes('pack-awis'))
  assert.ok(projection?.strongest_spaces[0]?.continuity_contract.carry_forward.some((item) => item.includes('2 sessões')))
  assert.equal(projection?.safety.raw_conversation_included, false)
  assert.equal(projection?.safety.internal_ids_included, false)
  assert.doesNotMatch(JSON.stringify(projection), /thread-a|thread_id|source_thread_ids|mensagem completa/)
})

test('AWIS task context loads Space brain for new conversations without raw sessions', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const memory = learnAwisWorkspaceMemory(null, brain({
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
    ],
  }), key).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Fluxo AWIS Spaces',
      source: 'local_space',
      generated_at: '2026-05-24T12:20:00Z',
      thread_count: 4,
      message_count: 31,
      mode_count: 2,
      decision_count: 2,
      pending_count: 0,
      risk_count: 1,
      artifact_count: 2,
      scope_label: '4 sessões · Atlas AI',
      reusable_by: ['Atlas AI', 'Code', 'Forge'],
      recommended_use: ['carregar cérebro do Space antes de corrigir AWIS', 'reusar pack seguro'],
      learned_memory: {
        outcome_count: 4,
        success_count: 3,
        failure_count: 1,
        comparison_open_count: 2,
        last_outcome_at: '2026-05-24T12:19:00Z',
        last_outcome_status: 'succeeded',
        artifact_refs: ['artifact-space-learned'],
        signals: ['comparar:abertura explícita', 'pack:vivo'],
      },
      brain_contract: {
        state: 'vivo',
        load_first: ['mapa seguro de Spaces', 'contrato drag conversa para Space'],
        carry_forward: ['não abrir todas ao clicar sessão', 'comparar é ação explícita'],
        validate_before_use: ['rodar npm run atlas-ai:test'],
        automation_hooks: ['promover resultado validado para pack do Space'],
        human_boundary: ['humano confirma mudança visual premium'],
        artifact_refs: ['pack-awis-spaces', 'handoff-space-brain'],
        evidence: ['2 decisões', '1 risco mapeado'],
      },
      sessions: [
        {
          title: 'Corrigir Space',
          mode: 'programming',
          message_count: 18,
          last_active_at: '2026-05-24T12:00:00Z',
          provider: 'atlas_decide',
        },
        {
          title: 'Polir Workbench',
          mode: 'programming',
          message_count: 13,
          last_active_at: '2026-05-24T12:10:00Z',
          provider: null,
        },
      ],
    },
  ])
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
    spaces,
  })
  assert.ok(pack)
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug de drag no AWIS Space sem nascer zerado')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T12:30:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null

  assert.equal(task?.recommended_context.space_brain[0]?.title, 'Fluxo AWIS Spaces')
  assert.equal(task?.recommended_context.space_brain[0]?.state, 'vivo')
  assert.ok(task?.recommended_context.space_brain[0]?.load_first.includes('mapa seguro de Spaces'))
  assert.ok(task?.recommended_context.space_brain[0]?.carry_forward.includes('comparar é ação explícita'))
  assert.ok(task?.recommended_context.space_brain[0]?.carry_forward.includes('memória aprendida:pack:vivo'))
  assert.ok(task?.recommended_context.space_brain[0]?.validate_before_use.includes('revalidar falhas aprendidas do Space'))
  assert.ok(task?.recommended_context.space_brain[0]?.validate_before_use.includes('rodar npm run atlas-ai:test'))
  assert.ok(task?.recommended_context.artifacts.includes('pack-awis-spaces'))
  assert.ok(spaces?.continuity.load_first.some((item) => item.includes('Space brain:Fluxo AWIS Spaces:mapa seguro de Spaces')))
  assert.ok(spaces?.continuity.carry_forward.some((item) => item.includes('Space:Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.ok(spaces?.continuity.carry_forward.some((item) => item.includes('evidência:Fluxo AWIS Spaces:2 decisões')))
  assert.ok(spaces?.continuity.refresh_when.some((item) => item.includes('revalidar Fluxo AWIS Spaces:rodar npm run atlas-ai:test')))
  assert.ok(spaces?.continuity.refresh_when.some((item) => item.includes('automatizar Fluxo AWIS Spaces:promover resultado validado para pack do Space')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.includes('space-brain:Fluxo AWIS Spaces:mapa seguro de Spaces')))
  assert.ok(task?.risk.cautions.some((item) => item.includes('Space:Fluxo AWIS Spaces:rodar npm run atlas-ai:test')))
  assert.ok(task?.learning_hooks.task_feedback_loop.record.some((item) => item.includes('outcome:bug_fix')))
  assert.ok(task?.learning_hooks.task_feedback_loop.record.some((item) => item.includes('Space:Fluxo AWIS Spaces')))
  assert.ok(task?.learning_hooks.task_feedback_loop.update_spaces.some((item) => item.includes('Fluxo AWIS Spaces')))
  assert.ok(task?.learning_hooks.task_feedback_loop.update_artifacts.some((item) => item.includes('pack-awis-spaces') || item.includes('artifact') || item.includes('artefato') || item.includes('replay:')))
  assert.ok(task?.learning_hooks.task_feedback_loop.revalidate.some((item) => item.includes('rodar npm run atlas-ai:test')))
  assert.ok(task?.learning_hooks.next_session_contract.first_load.some((item) => item.includes('space-selected:Fluxo AWIS Spaces:mapa seguro de Spaces')))
  assert.ok(task?.learning_hooks.next_session_contract.first_load.some((item) => item.includes('space-carry:Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.ok(task?.learning_hooks.next_session_contract.validate_with.some((item) => item.includes('space-revalidate:Fluxo AWIS Spaces:rodar npm run atlas-ai:test')))
  assert.ok(task?.learning_hooks.next_session_contract.promote_when.some((item) => item.includes('space-auto:Fluxo AWIS Spaces:promover resultado validado para pack do Space')))
  assert.ok(task?.learning_hooks.next_session_contract.demote_when.some((item) => item.includes('space-human:Fluxo AWIS Spaces:humano confirma mudança visual premium')))
  assert.ok(capsule?.load_first.some((item) => item.includes('space-brain:Fluxo AWIS Spaces:mapa seguro de Spaces')))
  assert.ok(capsule?.use_as_summary.some((item) => item.includes('space-carry:Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.ok(capsule?.use_as_summary.some((item) => item.includes('space-evidence:Fluxo AWIS Spaces:2 decisões')))
  assert.ok(capsule?.validate_with.some((item) => item.includes('space-validate:Fluxo AWIS Spaces:rodar npm run atlas-ai:test')))
  assert.ok(capsule?.task_packet?.context.space_brain[0]?.automation_hooks.includes('promover resultado validado para pack do Space'))
  assert.ok(capsule?.task_packet?.context.space_brain[0]?.human_boundary.includes('humano confirma mudança visual premium'))
  assert.ok(capsule?.task_packet?.context.space_brain[0]?.confidence)
  assert.ok(capsule?.task_packet?.risk.human_boundary.some((item) => item.includes('Space:Fluxo AWIS Spaces:humano confirma mudança visual premium')))
  assert.ok(capsule?.task_packet?.learning.next_session_first_load.some((item) => item.includes('space-selected:Fluxo AWIS Spaces:mapa seguro de Spaces')))
  assert.ok(capsule?.task_packet?.learning.next_session_promote_when.some((item) => item.includes('space-auto:Fluxo AWIS Spaces:promover resultado validado para pack do Space')))
  assert.ok(capsule?.task_packet?.learning.next_session_demote_when.some((item) => item.includes('space-human:Fluxo AWIS Spaces:humano confirma mudança visual premium')))
  assert.ok(capsule?.continue_learning.task_feedback_loop.update_spaces.some((item) => item.includes('Fluxo AWIS Spaces')))
  assert.ok(capsule?.continue_learning.task_feedback_loop.record.some((item) => item.includes('outcome:bug_fix')))
  assert.ok(artifact?.manifest.space_context_gold.some((item) => item.includes('space-carry:Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.ok(artifact?.manifest.space_context_gold.some((item) => item.includes('space-evidence:Fluxo AWIS Spaces:2 decisões')))
  assert.ok(artifact?.manifest.space_context_gold.some((item) => item.includes('space-artifact:pack-awis-spaces')))
  assert.ok(artifact?.manifest.space_context_gold.some((item) => item.includes('space-memory:Fluxo AWIS Spaces:pack:vivo')))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.includes('space-carry:Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.includes('space-evidence:Fluxo AWIS Spaces:2 decisões')))
  assert.ok(replay?.cold_start_seed.reuse_spaces.some((item) => item.includes('gold:space-carry:Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.ok(replay?.cold_start_seed.automation_hooks.some((item) => item.includes('artifact-promote:space-brain:Fluxo AWIS Spaces:promover resultado validado para pack do Space')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((item) => item.includes('artifact-space-gold:space-artifact:pack-awis-spaces')))
  assert.doesNotMatch(JSON.stringify(task), /thread_id|source_thread_ids|operator_input|response_text|raw_conversation_included":true/)
  assert.doesNotMatch(JSON.stringify(capsule), /thread_id|source_thread_ids|operator_input|response_text|raw_conversation_included":true/)
  assert.doesNotMatch(JSON.stringify({ artifact, replay }), /thread_id|source_thread_ids|operator_input|response_text|raw_conversation_included":true/)
})

test('AWIS Space brain outcomes promote good context and revalidate failed context', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  let memory = learnAwisWorkspaceMemory(null, brain(), key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T13:00:00Z',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    spaceBrainLabels: ['Fluxo AWIS Spaces:comparar é ação explícita'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T13:10:00Z',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    spaceBrainLabels: ['Fluxo AWIS Spaces:comparar é ação explícita'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T13:20:00Z',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    spaceBrainLabels: ['Fluxo AWIS Spaces:contrato antigo'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Fluxo AWIS Spaces',
      thread_count: 3,
      message_count: 22,
      mode_count: 1,
      decision_count: 2,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code'],
      recommended_use: ['corrigir AWIS Spaces'],
      sessions: [],
    },
  ])
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
    spaces,
  })
  assert.ok(pack)
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir AWIS Spaces')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T13:30:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null

  assert.ok(pack?.memory?.operational.context_gold.space_brain.promoted.includes('Fluxo AWIS Spaces:comparar é ação explícita'))
  assert.ok(pack?.memory?.operational.context_gold.space_brain.revalidate.includes('Fluxo AWIS Spaces:contrato antigo'))
  assert.ok(pack?.self_improvement?.improvement_queue.some((item) => item.action === 'update_space_pack' && item.label.includes('comparar é ação explícita')))
  assert.ok(pack?.self_improvement?.improvement_queue.some((item) => item.action === 'demote_context' && item.label.includes('contrato antigo')))
  assert.ok(pack?.memory_consolidation?.consolidate.promote_to_gold.some((item) => item.includes('space-brain:Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.ok(pack?.memory_consolidation?.consolidate.revalidate.some((item) => item.includes('space-brain:Fluxo AWIS Spaces:contrato antigo')))
  assert.ok(task?.recommended_context.space_brain[0]?.carry_forward.some((item) => item.includes('promovido por outcome')))
  assert.ok(task?.recommended_context.space_brain[0]?.validate_before_use.some((item) => item.includes('revalidar outcome')))
  assert.equal(capsule?.task_packet?.context.space_brain[0]?.title, 'Fluxo AWIS Spaces')
  assert.ok(capsule?.task_packet?.context.space_brain[0]?.carry_forward.some((item) => item.includes('promovido por outcome')))
  assert.ok(capsule?.task_packet?.context.space_brain[0]?.validate_before_use.some((item) => item.includes('revalidar outcome')))
  assert.ok(artifact?.manifest.load_first.some((item) => item.includes('space-brain-gold:Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.ok(artifact?.manifest.promote_signals.some((item) => item.includes('space-brain:Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.ok(artifact?.manifest.caution_signals.some((item) => item.includes('space-brain-revalidate:Fluxo AWIS Spaces:contrato antigo')))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.includes('space-brain-gold:Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.ok(replay?.cold_start_seed.warnings.some((item) => item.includes('space-brain-revalidate:Fluxo AWIS Spaces:contrato antigo')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((item) => item.includes('space-brain-gold:Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((item) => item.includes('Space brain: preservar Fluxo AWIS Spaces:comparar é ação explícita')))
  assert.doesNotMatch(JSON.stringify(pack), /thread_id|source_thread_ids|operator_input|response_text|raw_conversation_included":true/)
  assert.doesNotMatch(JSON.stringify(replay), /thread_id|source_thread_ids|operator_input|response_text|raw_conversation_included":true/)
})

test('AWIS workspace context pack includes Space projection as startup gold context', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const memory = learnAwisWorkspaceMemory(null, brain(), key).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Workbench final',
      thread_count: 3,
      message_count: 18,
      mode_count: 1,
      decision_count: 2,
      pending_count: 1,
      risk_count: 0,
      artifact_count: 0,
      reusable_by: ['Atlas AI', 'packs'],
      recommended_use: ['trabalhar lado a lado'],
      sessions: [],
    },
  ])
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory,
    spaces,
  })

  assert.equal(pack?.spaces?.schema_version, 'atlas.awis.workspace_space_projection.v1')
  assert.equal(pack?.spaces?.strongest_spaces[0]?.pending_count, 1)
  assert.equal(pack?.startup_snapshot?.readiness.spaces_ready, true)
  assert.ok(pack?.startup_snapshot?.startup_gold.strongest_spaces.some((space) => space.includes('Workbench final')))
  assert.ok(pack?.startup_snapshot?.startup_gold.next_best_actions.includes('usar Space forte antes de abrir conversa nova'))
  assert.ok(pack?.startup_snapshot?.startup_gold.next_best_actions.some((action) => action.includes('Space:Workbench final')))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.some((pattern) => pattern.includes('space-load:Space:Workbench final')))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.some((pattern) => pattern.includes('space-brain-load:Space:Workbench final')))
  assert.equal(pack?.safety.provider_safe, true)
})

test('AWIS workspace Space projection persists as startup memory when thread summaries are not loaded', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const projection = buildAwisWorkspaceSpaceProjection([
    {
      title: 'AWIS final',
      thread_count: 4,
      message_count: 42,
      mode_count: 2,
      decision_count: 3,
      pending_count: 1,
      risk_count: 1,
      artifact_count: 2,
      reusable_by: ['Atlas AI', 'Code', 'Forge', 'packs'],
      recommended_use: ['carregar contexto do Space', 'comparar sessões'],
      sessions: [
        {
          title: 'Implementar cérebro vivo',
          mode: 'programming',
          message_count: 20,
          last_active_at: '2026-05-24T12:00:00Z',
          provider: 'atlas_decide',
        },
        {
          title: 'Validar UX AWIS',
          mode: 'research',
          message_count: 22,
          last_active_at: '2026-05-24T13:00:00Z',
          provider: null,
        },
      ],
    },
  ])
  assert.ok(projection)

  saveAwisWorkspaceSpaceProjection(key, projection, store)
  const loaded = loadAwisWorkspaceSpaceProjection(key, store)
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    spaces: loaded,
  })

  assert.equal(loaded?.schema_version, 'atlas.awis.workspace_space_projection.v1')
  assert.equal(pack?.startup_snapshot?.readiness.spaces_ready, true)
  assert.ok(pack?.startup_snapshot?.startup_gold.strongest_spaces.some((space) => space.includes('AWIS final')))
  assert.match(store.getItem(AWIS_WORKSPACE_SPACE_PROJECTIONS_STORAGE) ?? '', /atlas\.awis\.workspace_space_projection\.v1/)
  assert.doesNotMatch(JSON.stringify(loaded), /thread_id|source_thread_ids|full_message|"raw_conversation_included":true/)
})

test('AWIS workspace Space projection clears stale startup memory when Spaces are deleted', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const legacyKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', null)
  const store = storage()
  const projection = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Space antigo',
      thread_count: 2,
      message_count: 8,
      mode_count: 1,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Atlas AI', 'packs'],
      recommended_use: ['reusar contexto antigo'],
      sessions: [
        {
          title: 'Sessão antiga',
          mode: 'general',
          message_count: 8,
          last_active_at: '2026-05-24T12:00:00Z',
          provider: null,
        },
      ],
    },
  ])
  assert.ok(projection)

  store.setItem(AWIS_WORKSPACE_SPACE_PROJECTIONS_STORAGE, JSON.stringify({
    [legacyKey]: projection,
  }))

  assert.ok(loadAwisWorkspaceSpaceProjection(key, store))
  clearAwisWorkspaceSpaceProjection(key, store)

  assert.equal(loadAwisWorkspaceSpaceProjection(key, store), null)
  assert.equal(store.getItem(AWIS_WORKSPACE_SPACE_PROJECTIONS_STORAGE), null)
})

test('AWIS workspace Space projection storage drops unsafe or malformed projections', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  store.setItem(AWIS_WORKSPACE_SPACE_PROJECTIONS_STORAGE, JSON.stringify({
    [key]: {
      schema_version: 'atlas.awis.workspace_space_projection.v1',
      source: 'local_project_spaces',
      space_count: 1,
      total_session_count: 2,
      total_message_count: 4,
      strongest_spaces: [
        {
          title: 'Space seguro',
          session_count: 2,
          message_count: 4,
          mode_count: 1,
          decision_count: 0,
          pending_count: 0,
          risk_count: 0,
          artifact_count: 0,
          reusable_by: ['Atlas AI', 'Code', 'extra', 'extra2', 'extra3'],
          recommended_use: ['reusar'],
          source_thread_ids: ['thread-a', 'thread-b'],
          scope_label: '2 sessões /Users/vitorepf/private',
          learned_memory: {
            outcome_count: 1,
            success_count: 1,
            failure_count: 0,
            comparison_open_count: 1,
            last_outcome_at: '2026-05-24T12:00:00Z',
            last_outcome_status: 'succeeded',
            artifact_refs: ['artifact-space-safe', '/Users/vitorepf/raw'],
            signals: ['pack:vivo', 'response_text cru'],
          },
          brain_contract: {
            state: 'vivo',
            load_first: ['Space seguro', 'operator_input cru'],
            carry_forward: ['contexto reutilizável', 'raw conversation inteira'],
            validate_before_use: ['validar pack', '/Users/vitorepf/private/file'],
            automation_hooks: ['atualizar pack', 'full_message content'],
            human_boundary: ['confirmar risco', 'thread_id privado'],
            artifact_refs: ['artifact-safe', '/Users/vitorepf/private/artifact'],
            evidence: ['2 sessões protegidas', 'response_text bruto'],
          },
          continuity_contract: {
            load_when: ['abrir conversa relacionada', '/Users/vitorepf/private'],
            carry_forward: ['comparar contexto', 'raw_conversation'],
            refresh_when: ['sessão mudar', 'operator_input'],
          },
          session_summaries: [
            {
              id: 'thread-a',
              title: '/Users/vitorepf/private/raw title',
              mode: 'programming',
              message_count: 4,
              last_active_at: '2026-05-24T12:00:00Z',
              provider: 'atlas_decide',
              content: 'texto bruto proibido',
            },
          ],
        },
      ],
      safety: {
        raw_conversation_included: true,
        internal_ids_included: true,
        bounded: false,
        provider_safe: false,
      },
    },
    broken: {
      schema_version: 'atlas.awis.workspace_space_projection.v1',
      strongest_spaces: [{ title: 'inválido', session_count: 1 }],
    },
  }))

  const loaded = loadAwisWorkspaceSpaceProjection(key, store)
  const all = JSON.stringify(loaded)

  assert.equal(loaded?.safety.raw_conversation_included, false)
  assert.equal(loaded?.safety.internal_ids_included, false)
  assert.equal(loaded?.safety.provider_safe, true)
  assert.equal(loaded?.strongest_spaces[0]?.reusable_by.length, 4)
  assert.deepEqual(loaded?.strongest_spaces[0]?.learned_memory.artifact_refs, ['artifact-space-safe'])
  assert.deepEqual(loaded?.strongest_spaces[0]?.learned_memory.signals, ['pack:vivo'])
  assert.deepEqual(loaded?.strongest_spaces[0]?.brain_contract.artifact_refs, ['artifact-safe'])
  assert.deepEqual(loaded?.strongest_spaces[0]?.brain_contract.load_first, ['Space seguro'])
  assert.deepEqual(loaded?.strongest_spaces[0]?.continuity_contract.refresh_when, ['sessão mudar'])
  assert.equal(loaded?.strongest_spaces[0]?.session_summaries[0]?.title, '(sem título)')
  assert.doesNotMatch(all, /source_thread_ids|thread-a|content|texto bruto proibido|\/Users\/|operator_input|response_text|raw conversation|full[_ ]message|thread_id/)
  assert.equal(loadAwisWorkspaceSpaceProjection('broken', store), null)
})

test('AWIS workspace artifact lake persists startup snapshots without raw payloads', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const memory = recordAwisWorkspaceInteraction(learnAwisWorkspaceMemory(null, brain(), key).memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
  })
  assert.ok(pack)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T12:20:00Z')

  assert.equal(artifact?.schema_version, 'atlas.awis.workspace_artifact.v1')
  assert.equal(artifact?.artifact_type, 'startup_snapshot')
  assert.match(artifact?.artifact_hash ?? '', /^awis-[0-9a-f]{8}$/)
  assert.equal(artifact?.safety.raw_source_included, false)
  assert.equal(artifact?.safety.raw_conversation_included, false)
  assert.equal(artifact?.safety.internal_ids_included, false)
  assert.equal(artifact?.manifest.schema_version, 'atlas.awis.workspace_artifact_manifest.v1')
  assert.ok((artifact?.manifest.quality_score ?? 0) > 0)
  assert.ok((artifact?.manifest.load_first.length ?? 0) > 0 || (artifact?.manifest.validate_with.length ?? 0) > 0)
  assert.ok(artifact?.manifest.load_first.length)
  assert.ok(artifact?.manifest.next_send_recipe.load_now.length)
  assert.ok(artifact?.manifest.next_send_recipe.prove_before_trust.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(artifact?.manifest.next_send_recipe.avoid_or_confirm.length)
  assert.equal(artifact?.manifest.safety.provider_safe, true)
  assert.equal(pack.next_session_brain?.schema_version, 'atlas.awis.workspace_next_session_brain_projection.v1')
  assert.equal(pack.next_session_brain?.source, 'local_awis_seed')
  assert.equal(pack.next_session_brain?.status, 'ready')
  assert.ok(pack.next_session_brain?.load_order.length)
  assert.ok(pack.next_session_brain?.execution_priority.some((priority) => priority.command === 'npm run atlas-ai:test'))
  assert.equal(pack.next_session_brain?.safety.provider_safe, true)
  assert.equal(artifact?.payload.next_session_brain_projection?.brain_hash, pack.next_session_brain?.brain_hash)

  const summary = artifact ? saveAwisWorkspaceArtifact(artifact, store) : null
  const duplicateSummary = artifact ? saveAwisWorkspaceArtifact({
    ...artifact,
    created_at: '2026-05-24T12:30:00Z',
  }, store) : null
  const loaded = loadAwisWorkspaceArtifacts(key, store)
  const loadedSummary = loadAwisWorkspaceArtifactLakeSummary(key, store)

  assert.equal(summary?.artifact_count, 1)
  assert.equal(duplicateSummary?.artifact_count, 1)
  assert.equal(loaded.length, 1)
  assert.equal(loaded[0]?.created_at, '2026-05-24T12:20:00Z')
  assert.equal(loadedSummary?.latest_artifact_hash, artifact?.artifact_hash)
  assert.equal(loaded[0]?.payload.next_session_brain_projection?.source, 'local_awis_seed')
  const replay = buildAwisWorkspaceArtifactReplayProjection(loaded)
  assert.ok(replay?.cold_start_seed.next_send_recipe.load_now.length)
  assert.ok(replay?.cold_start_seed.next_send_recipe.prove_before_trust.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(replay?.cold_start_seed.next_send_recipe.avoid_or_confirm.length)
  assert.doesNotMatch(JSON.stringify(loaded), /operator_input|response_text|prompt|function|class|import .* from/)
})

test('AWIS workspace context pack references artifact lake summary on the next startup', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const memory = learnAwisWorkspaceMemory(null, brain(), key).memory
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
  })
  const artifact = firstPack ? buildAwisWorkspaceArtifact(firstPack, '2026-05-24T12:21:00Z') : null
  assert.ok(artifact)
  const nextPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
    artifactLake: {
      schema_version: 'atlas.awis.workspace_artifact_lake_summary.v1',
      workspace_key: key,
      artifact_count: 1,
      latest_artifact_hash: artifact.artifact_hash,
      latest_artifact_type: artifact.artifact_type,
      latest_created_at: artifact.created_at,
      retained_limit: 24,
    },
  })

  assert.equal(nextPack?.artifact_lake?.schema_version, 'atlas.awis.workspace_artifact_lake_summary.v1')
  assert.equal(nextPack?.artifact_lake?.latest_artifact_hash, artifact.artifact_hash)
  assert.equal(nextPack?.startup_snapshot?.schema_version, 'atlas.awis.workspace_startup_snapshot.v1')
})

test('AWIS workspace artifact replay extracts reusable startup gold without raw history', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  let memory = learnAwisWorkspaceMemory(null, brain(), key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:10:00Z',
    channel: 'conversation',
    status: 'succeeded',
    provider: 'atlas_decide',
    model: 'auto',
    latencyMs: 900,
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T12:12:00Z',
    channel: 'conversation',
    status: 'succeeded',
    provider: 'atlas_decide',
    model: 'auto',
    latencyMs: 840,
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Cérebro vivo',
      thread_count: 3,
      message_count: 30,
      mode_count: 2,
      decision_count: 2,
      pending_count: 1,
      risk_count: 1,
      artifact_count: 1,
      reusable_by: ['Atlas AI', 'Code'],
      recommended_use: ['reusar decisões do Space', 'abrir comparação'],
      sessions: [],
    },
  ])
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain({
      truncated: true,
      docDigests: [
        {
          path: 'AGENTS.md',
          kind: 'provider-projection',
          signals: ['docs canônicos governam implementação'],
          obligations: ['não confiar em memória stale sem revalidar'],
          summary: 'contrato operacional provider-safe',
        },
      ],
    }),
    memory,
    spaces,
  })
  const artifact = firstPack ? buildAwisWorkspaceArtifact(firstPack, '2026-05-24T12:25:00Z') : null
  assert.ok(artifact)
  assert.equal(firstPack?.workspace_runbook?.schema_version, 'atlas.awis.workspace_runbook_projection.v1')
  assert.ok(firstPack?.workspace_runbook?.procedures.some((procedure) => procedure.title === 'Partida quente do workspace'))
  assert.ok(firstPack?.workspace_runbook?.next_session.start_here.some((item) => item.includes('Partida quente')))
  assert.ok(artifact.payload.workspace_runbook_projection?.runbook_hash.startsWith('runbook-'))
  assert.equal(artifact.payload.current_truth_pack_projection?.schema_version, 'atlas.awis.current_truth_pack_projection.v1')
  assert.ok(artifact.payload.current_truth_pack_projection?.truth_hash.startsWith('truth-'))
  assert.ok(artifact.payload.current_truth_pack_projection?.trust_contract.trust_first.length)
  assert.ok(artifact.payload.current_truth_pack_projection?.current_truth.doc_rules.some((item) => item.includes('memória stale')))
  assert.equal(artifact.payload.learning_flywheel_projection?.schema_version, 'atlas.awis.workspace_learning_flywheel_projection.v1')
  assert.ok(artifact.payload.learning_flywheel_projection?.next_session.update_after_send.includes('registrar resultado real'))
  assert.equal(artifact.payload.adaptive_learning_plan_projection?.schema_version, 'atlas.awis.workspace_adaptive_learning_plan_projection.v1')
  assert.ok(artifact.payload.adaptive_learning_plan_projection?.autonomous_cycle.after_success.some((item) => item.includes('registrar') || item.includes('resultado')))
  assert.equal(artifact.payload.task_router_projection?.schema_version, 'atlas.awis.workspace_task_router_projection.v1')
  assert.ok(artifact.payload.task_router_projection?.routes.some((route) => route.task_kind === 'bug_fix'))
  assert.equal(artifact.payload.execution_doctrine_projection?.schema_version, 'atlas.awis.workspace_execution_doctrine_projection.v1')
  assert.ok(artifact.payload.execution_doctrine_projection?.doctrine_drivers.some((driver) => driver.name === 'EvidenceDD'))
  assert.equal(artifact.payload.provider_strategy_projection?.schema_version, 'atlas.awis.workspace_provider_strategy_projection.v1')
  assert.ok(artifact.payload.provider_strategy_projection?.preferred.some((provider) => provider.provider === 'atlas_decide' && provider.policy === 'prefer'))
  assert.ok(artifact.payload.next_session_brain_projection?.context_loading.automation_hooks.length)
  const dirtyBrainArtifact = structuredClone(artifact) as typeof artifact
  assert.ok(dirtyBrainArtifact.payload.next_session_brain_projection)
  dirtyBrainArtifact.payload.next_session_brain_projection.load_order.unshift('/Users/vitorepf/private/raw')
  dirtyBrainArtifact.payload.next_session_brain_projection.artifact_refs.unshift('/Users/vitorepf/private/artifact')
  dirtyBrainArtifact.payload.next_session_brain_projection.context_loading.automation_hooks.unshift('response_text cru')
  dirtyBrainArtifact.payload.next_session_brain_projection.context_loading.truth_hints.trust_first.unshift('operator_input privado')
  dirtyBrainArtifact.payload.next_session_brain_projection.context_loading.truth_hints.never_load_raw.unshift('raw_conversation inteira')
  dirtyBrainArtifact.payload.next_session_brain_projection.context_loading.avoid_commands.unshift('full_message content')
  const dirtyStore = storage()
  saveAwisWorkspaceArtifact(dirtyBrainArtifact, dirtyStore)
  const loadedDirtyBrain = loadAwisWorkspaceArtifacts(key, dirtyStore)[0]?.payload.next_session_brain_projection
  const dirtyBrainJson = JSON.stringify(loadedDirtyBrain)
  assert.ok(loadedDirtyBrain)
  assert.doesNotMatch(dirtyBrainJson, /\/Users\/|operator_input privado|response_text cru|raw_conversation inteira|full_message content/)
  const dirtyLearningArtifact = structuredClone(artifact) as typeof artifact
  assert.ok(dirtyLearningArtifact.payload.learning_flywheel_projection)
  assert.ok(dirtyLearningArtifact.payload.adaptive_learning_plan_projection)
  dirtyLearningArtifact.payload.learning_flywheel_projection.cycle.captured.unshift('/Users/vitorepf/private/captured')
  dirtyLearningArtifact.payload.learning_flywheel_projection.cycle.promoted.unshift('operator_input promovido')
  dirtyLearningArtifact.payload.learning_flywheel_projection.next_session.load_first.unshift('raw_conversation inteira')
  dirtyLearningArtifact.payload.learning_flywheel_projection.next_session.update_after_send.unshift('response_text bruto')
  dirtyLearningArtifact.payload.learning_flywheel_projection.repository_loop.cross_workspace_reuse.unshift('full_message cross workspace')
  dirtyLearningArtifact.payload.learning_flywheel_projection.proof.never_promote.unshift('raw_conversation não promover')
  dirtyLearningArtifact.payload.adaptive_learning_plan_projection.autonomous_cycle.on_startup.unshift('/Users/vitorepf/private/adaptive')
  dirtyLearningArtifact.payload.adaptive_learning_plan_projection.autonomous_cycle.after_success.unshift('operator_input after success')
  dirtyLearningArtifact.payload.adaptive_learning_plan_projection.context_economy.promote_to_hot.unshift('response_text hot')
  dirtyLearningArtifact.payload.adaptive_learning_plan_projection.repository_compounding.cross_repo_bridges.unshift('full_message bridge')
  dirtyLearningArtifact.payload.adaptive_learning_plan_projection.human_control.never_automate.unshift('raw_conversation automatizar')
  dirtyLearningArtifact.payload.adaptive_learning_plan_projection.proof.validate_with.unshift('operator_input validar')
  const dirtyLearningStore = storage()
  saveAwisWorkspaceArtifact(dirtyLearningArtifact, dirtyLearningStore)
  const loadedDirtyLearning = loadAwisWorkspaceArtifacts(key, dirtyLearningStore)[0]
  const dirtyLearningReplay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, dirtyLearningStore))
  const dirtyLearningJson = JSON.stringify({ loadedDirtyLearning, dirtyLearningReplay })
  assert.ok(loadedDirtyLearning?.payload.learning_flywheel_projection)
  assert.ok(loadedDirtyLearning.payload.learning_flywheel_projection.next_session.update_after_send.includes('registrar resultado real'))
  assert.ok(dirtyLearningReplay?.cold_start_seed.context_signals.some((item) => item.startsWith('flywheel:') || item.startsWith('adaptive:')))
  assert.doesNotMatch(dirtyLearningJson, /\/Users\/|operator_input promovido|operator_input after success|operator_input validar|response_text bruto|response_text hot|full_message cross workspace|full_message bridge|raw_conversation inteira|raw_conversation não promover|raw_conversation automatizar/)
  assert.ok(artifact.manifest.load_first.some((item) => item.includes('verdade:') || item.includes('truth')))
  assert.ok(artifact.manifest.load_first.some((item) => item.startsWith('flywheel:')))
  assert.ok(artifact.manifest.promote_signals.some((item) => item.startsWith('adaptive:') || item.startsWith('adaptive-aprender:')))
  assert.ok(artifact.manifest.validate_with.some((item) => item.includes('truth') || item.includes('validar')))
  const legacyArtifactWithoutSpaceBrain = structuredClone(artifact) as typeof artifact
  delete (legacyArtifactWithoutSpaceBrain.payload.memory_operational?.context_gold as {
    space_brain?: unknown
  }).space_brain
  assert.doesNotThrow(() => buildAwisWorkspaceArtifactReplayProjection([legacyArtifactWithoutSpaceBrain]))
  saveAwisWorkspaceArtifact(artifact, store)

  const replay = loadAwisWorkspaceArtifactReplayProjection(key, store)
  const directReplay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('truth-trust:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('truth-doc:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('truth-check:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('learning-flywheel:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('flywheel-load:') || pattern.startsWith('flywheel-promote:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('adaptive-plan:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('task-router:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('task-route:bug_fix:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('execution-doctrine:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('provider-strategy:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('provider:prefer:atlas_decide')))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('runbook:')))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('task-route:bug_fix:')))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('doctrine:EvidenceDD:')))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('provider-task:bug_fix:atlas_decide')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('task-route:bug_fix:')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('provider:prefer:atlas_decide')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('doctrine:EvidenceDD:')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('runbook:') || item.startsWith('runbook-procedure:')))
  const nextPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory,
    artifactReplay: replay,
  })
  const task = buildAwisWorkspaceTaskContextProjection(nextPack, 'corrigir bug no Atlas Desktop e rodar testes')
  const capsule = buildAwisWorkspaceProviderCapsule(nextPack, task)

  assert.equal(replay?.schema_version, 'atlas.awis.workspace_artifact_replay_projection.v1')
  assert.equal(replay?.latest_artifact_hash, artifact.artifact_hash)
  assert.deepEqual(directReplay, replay)
  assert.ok(replay?.reusable_startup_gold.strongest_spaces.some((space) => space.includes('Cérebro vivo')))
  assert.ok(replay?.reusable_startup_gold.strongest_spaces.some((space) => space.startsWith('artifact-space:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('artifact-quality:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('artifact-load:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('brain-seed:local_awis_seed:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('brain-load:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('brain-auto:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('command-lane:auto:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('truth-pack:truth-')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('truth-keep:')))
  assert.equal(replay?.cold_start_seed.schema_version, 'atlas.awis.artifact_cold_start_seed.v1')
  assert.ok(replay?.cold_start_seed.command_lanes.auto_validate.includes('npm run test'))
  assert.ok(replay?.cold_start_seed.command_lanes.preferred_validation.includes('npm run test'))
  assert.ok(replay?.cold_start_seed.load_order.length)
  assert.ok(replay?.cold_start_seed.seed_hash.startsWith('cold-'))
  assert.ok(replay?.cold_start_seed.context_signals.length)
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('flywheel:') || item.startsWith('flywheel-promoted:')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('adaptive:') || item.startsWith('adaptive-hot:')))
  assert.ok(replay?.cold_start_seed.automation_hooks.length)
  assert.ok(replay?.cold_start_seed.automation_hooks.some((item) => item.startsWith('brain:')))
  assert.ok(replay?.cold_start_seed.automation_hooks.some((item) => item.startsWith('provider:registrar')))
  assert.ok(replay?.cold_start_seed.automation_hooks.some((item) => item.startsWith('doctrine-auto:')))
  const replayWithChangedAutomationArtifact = structuredClone(artifact) as typeof artifact
  replayWithChangedAutomationArtifact.payload.learning_flywheel_projection?.next_session.update_after_send.unshift('feedback-record:novo outcome comprovado')
  const replayWithChangedAutomation = buildAwisWorkspaceArtifactReplayProjection([replayWithChangedAutomationArtifact])
  assert.ok(replayWithChangedAutomation?.cold_start_seed.automation_hooks.includes('aprender:feedback-record:novo outcome comprovado'))
  assert.notEqual(
    replayWithChangedAutomation?.cold_start_seed.seed_hash,
    replay?.cold_start_seed.seed_hash,
    'Cold-start seed hash must change when replayed automation hooks change, otherwise the living brain can treat different learning loops as the same startup seed.',
  )
  const replayWithChangedBrainAutomationArtifact = structuredClone(artifact) as typeof artifact
  const brainProjection = replayWithChangedBrainAutomationArtifact.payload.next_session_brain_projection
  assert.ok(brainProjection)
  brainProjection.context_loading.automation_hooks.unshift('registrar aprendizado granular do cérebro')
  const replayWithChangedBrainAutomation = buildAwisWorkspaceArtifactReplayProjection([replayWithChangedBrainAutomationArtifact])
  assert.ok(replayWithChangedBrainAutomation?.cold_start_seed.automation_hooks.includes('brain:registrar aprendizado granular do cérebro'))
  assert.ok(replayWithChangedBrainAutomation?.reusable_startup_gold.reusable_patterns.includes('brain-auto:registrar aprendizado granular do cérebro'))
  assert.notEqual(
    replayWithChangedBrainAutomation?.cold_start_seed.seed_hash,
    replay?.cold_start_seed.seed_hash,
    'Cold-start seed hash must change when NextSessionBrain automation changes, otherwise startup replay loses living-brain evolution.',
  )
  assert.ok(replay?.cold_start_seed.document_hints?.rules.includes('não confiar em memória stale sem revalidar'))
  assert.ok(replay?.cold_start_seed.document_hints?.signals.includes('docs canônicos governam implementação'))
  assert.ok(replay?.cold_start_seed.document_hints?.summaries.some((summary) => summary.includes('AGENTS.md')))
  assert.ok(replay?.cold_start_seed.truth_hints?.trust_first.some((item) => item.includes('doc:')))
  assert.ok(replay?.cold_start_seed.truth_hints?.verify_before_send.length)
  assert.ok(replay?.cold_start_seed.truth_hints?.never_load_raw.includes('conteúdo bruto de conversas'))
  assert.ok(replay?.cold_start_seed.truth_hints?.current_truth.length)
  assert.equal(replay?.cold_start_seed.source, 'local_workspace_artifacts')
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action === 'auto-validar: npm run test'))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('validar artifact:') || action.startsWith('reusar artifact:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('brain: carregar') || action.startsWith('brain: priorizar')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('brain: automatizar')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('rota bug_fix:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('doutrina EvidenceDD:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('provider bug_fix: atlas_decide')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.includes('usar Space forte antes de abrir conversa nova'))
  assert.ok(nextPack?.startup_snapshot?.startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('cold-seed:')))
  assert.ok(nextPack?.next_session_brain?.artifact_refs.some((ref) => ref.startsWith('cold-')))
  assert.ok(nextPack?.next_session_brain?.context_loading.document_hints.rules.includes('não confiar em memória stale sem revalidar'))
  assert.ok(nextPack?.next_session_brain?.context_loading.document_hints.signals.includes('docs canônicos governam implementação'))
  assert.ok(nextPack?.next_session_brain?.context_loading.truth_hints.trust_first.length)
  assert.ok(nextPack?.next_session_brain?.context_loading.truth_hints.verify_before_send.length)
  assert.ok(nextPack?.next_session_brain?.context_loading.truth_hints.never_load_raw.includes('conteúdo bruto de conversas'))
  assert.ok(nextPack?.next_session_brain?.context_loading.automation_hooks.length)
  assert.ok(nextPack?.next_session_brain?.context_loading.automation_hooks.some((item) => item.startsWith('aprender:') || item.startsWith('flywheel:') || item.startsWith('adaptive-')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('seed:')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('runbook:')))
  assert.ok(task?.recommended_context.artifacts.some((item) => item.startsWith('cold-')))
  assert.ok(task?.recommended_context.artifacts.some((item) => item.startsWith('runbook:')))
  assert.ok(task?.recommended_context.artifacts.some((item) => item.startsWith('truth-')))
  assert.ok(task?.learning_hooks.next_session_contract.first_load.length)
  assert.ok(capsule?.load_first.some((item) => item.startsWith('cold-start:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('truth:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('flywheel:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('adaptive:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('runbook:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('cold-start-seed:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('runbook:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('current-truth:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('adaptive-plan:') || item.startsWith('adaptive-hot:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('brain-auto:')))
  assert.ok(capsule?.task_packet?.learning.write_back_after_success.some((item) => item.startsWith('artifact-replay:aprender:')))
  assert.ok(capsule?.task_packet?.learning.automation_plan.safe_local.some((item) => item.startsWith('write-back:artifact-replay:aprender:')))
  assert.ok(capsule?.continue_learning.next_session_contract.first_load.length)
  assert.equal(nextPack?.artifact_replay?.safety.provider_safe, true)
  assert.doesNotMatch(JSON.stringify(nextPack?.artifact_replay), /operator_input|response_text|source_thread_ids|thread_id|full_message|"raw_conversation_included":true/)
})

test('AWIS workspace artifact hash ignores self replay churn', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  const memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'AWIS memória estável',
      thread_count: 3,
      message_count: 30,
      mode_count: 2,
      decision_count: 2,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Atlas AI', 'Code'],
      recommended_use: ['reusar contexto validado'],
      sessions: [],
    },
  ])
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(firstPack)
  const firstArtifact = buildAwisWorkspaceArtifact(firstPack, '2026-05-24T12:25:00Z')
  assert.ok(firstArtifact)
  saveAwisWorkspaceArtifact(firstArtifact, store)

  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const replayPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    artifactReplay: replay,
  })
  assert.ok(replayPack)
  const replayArtifact = buildAwisWorkspaceArtifact(replayPack, '2026-05-24T12:26:00Z')
  assert.ok(replayArtifact)
  const summary = saveAwisWorkspaceArtifact(replayArtifact, store)

  assert.equal(replayArtifact.artifact_hash, firstArtifact.artifact_hash)
  assert.equal(summary?.artifact_count, 1)
  assert.equal(loadAwisWorkspaceArtifacts(key, store).length, 1)
  assert.ok(replayPack.startup_snapshot?.startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('cold-seed:')))
})

test('AWIS workspace context pack can start from artifact replay only', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const replay = {
    schema_version: 'atlas.awis.workspace_artifact_replay_projection.v1' as const,
    source: 'local_workspace_artifacts' as const,
    artifact_count: 2,
    latest_artifact_hash: 'awis-abc12345',
    cold_start_seed: {
      schema_version: 'atlas.awis.artifact_cold_start_seed.v1' as const,
      source: 'local_workspace_artifacts' as const,
      readiness_score: 81,
      seed_hash: 'cold-direct',
      load_order: ['startup_snapshot', 'artifact:awis-abc12345'],
      validate_with: ['npm run atlas-ai:test'],
      command_lanes: {
        auto_validate: ['npm run atlas-ai:test'],
        confirm_before_run: ['npm run dev'],
        manual_only: ['deploy produção'],
        preferred_validation: ['npm run atlas-ai:test'],
        reason: 'fixture',
      },
      next_send_recipe: {
        load_now: ['startup_snapshot', 'artifact:awis-abc12345'],
        summarize_now: ['maturidade:stable'],
        prove_before_trust: ['npm run atlas-ai:test'],
        avoid_or_confirm: ['workspace mudou desde leituras anteriores', 'confirmar execução local'],
      },
      context_signals: ['maturidade:stable'],
      truth_hints: {
        trust_first: ['artefato:awis-abc12345'],
        verify_before_send: ['npm run atlas-ai:test'],
        never_load_raw: ['conteúdo bruto de conversas'],
        refresh_when: ['workspace mudou'],
        current_truth: ['artifact:awis-abc12345'],
        evidence_mode: 'guarded' as const,
      },
      reuse_spaces: ['Fluxo AWIS'],
      repository_hints: ['atlas-desktop'],
      automation_hooks: ['registrar resultado real'],
      warnings: ['workspace mudou desde leituras anteriores'],
      human_boundary: ['confirmar execução local'],
    },
    reusable_startup_gold: {
      strongest_spaces: ['Fluxo AWIS · 3 sessões · 21 mensagens'],
      reusable_patterns: ['command:npm run atlas-ai:test'],
      warnings: ['workspace mudou desde leituras anteriores'],
      next_best_actions: ['reabrir Space forte'],
    },
    safety: {
      raw_source_included: false as const,
      raw_conversation_included: false as const,
      internal_ids_included: false as const,
      bounded: true as const,
      provider_safe: true as const,
    },
  }
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    artifactReplay: replay,
  })

  assert.equal(pack?.startup_snapshot?.readiness.artifact_replay_ready, true)
  assert.equal(pack?.startup_snapshot?.readiness.folder_map_ready, false)
  assert.ok(pack?.startup_snapshot?.startup_gold.strongest_spaces.includes('Fluxo AWIS · 3 sessões · 21 mensagens'))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.includes('command:npm run atlas-ai:test'))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.includes('cold-seed:cold-direct'))
  assert.ok(pack?.next_session_brain?.load_order.includes('startup_snapshot'))
  assert.ok(pack?.next_session_brain?.context_loading.truth_hints.trust_first.includes('artefato:awis-abc12345'))
  assert.ok(pack?.next_session_brain?.context_loading.truth_hints.verify_before_send.includes('npm run atlas-ai:test'))
  assert.ok(pack?.next_session_brain?.execution_priority.some((priority) => priority.command === 'npm run atlas-ai:test'))
  assert.ok(pack?.startup_snapshot?.startup_gold.next_best_actions.includes('reabrir Space forte'))
  assert.equal(pack?.artifact_replay?.latest_artifact_hash, 'awis-abc12345')

  const task = buildAwisWorkspaceTaskContextProjection(pack, 'continuar AWIS usando replay de artefatos')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const startupCapsule = buildAwisWorkspaceProviderCapsule(pack, null)

  assert.ok(task?.recommended_context.command_lanes.auto_validate.includes('npm run atlas-ai:test'))
  assert.ok(task?.recommended_context.command_lanes.confirm_before_run.includes('npm run dev'))
  assert.ok(task?.recommended_context.command_lanes.manual_only.includes('deploy produção'))
  assert.ok(task?.recommended_context.load_order.includes('recipe:startup_snapshot'))
  assert.ok(task?.learning_hooks.next_session_contract.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(task?.learning_hooks.next_session_contract.first_load.includes('startup_snapshot'))
  assert.ok(capsule?.command_lanes.auto_validate.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.load_first.includes('recipe:startup_snapshot'))
  assert.ok(capsule?.golden_context.next_send_recipe.load_now.includes('startup_snapshot'))
  assert.ok(capsule?.golden_context.next_send_recipe.avoid_or_confirm.includes('confirmar execução local'))
  assert.ok(capsule?.startup_contract.load_sequence.includes('recipe:startup_snapshot'))
  assert.ok(capsule?.startup_contract.human_boundary.includes('recipe:confirmar execução local'))
  assert.ok(capsule?.avoid_loading.some((item) => item === 'confirmar:npm run dev'))
  assert.ok(startupCapsule?.command_lanes.auto_validate.includes('npm run atlas-ai:test'))
  assert.ok(startupCapsule?.golden_context.next_send_recipe.load_now.includes('startup_snapshot'))
  assert.ok(startupCapsule?.validate_with.some((item) => item === 'auto-validar:npm run atlas-ai:test'))
})

test('AWIS workspace context pack can start from server Artifact Intelligence replay', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const projections = buildAwisWorkspaceArtifactProjectionsFromServer({
    schema_version: 'atlas.workspace_artifact_intelligence.v1',
    status: 'ready',
    workspace_id: 'atlas',
    artifact_intelligence_hash: 'sha256:awair',
    artifact_lake: {
      artifact_count: 3,
      lake_hash: 'sha256:lake',
    },
    artifact_graph: {
      nodes: [
        { id: 'sha256:brief', type: 'workspace_brief', status: 'ready', consumer: 'atlas_forge' },
        { id: 'sha256:context', type: 'context_pack', status: 'ready', consumer: 'atlas_dev' },
      ],
    },
    artifact_replay: {
      replay_ready: true,
      raw_conversation_required: false,
      required_inputs: ['workspace_id', 'artifact_hash'],
    },
    artifact_simulation: {
      decision: 'ready',
      blockers: [],
    },
    artifact_context_compiler: {
      context_units: ['workspace_brief', 'context_pack'],
      raw_conversation_included: false,
    },
    artifact_quality_governor: {
      all_executable_artifacts_ready: true,
    },
    artifact_marketplace: {
      reusable_templates: ['login_test_plan'],
    },
    artifact_outcome_learning: {
      requires_real_outcome: true,
    },
  }, key)
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    artifactLake: projections?.artifactLake ?? null,
    artifactReplay: projections?.artifactReplay ?? null,
  })

  assert.equal(projections?.artifactReplay?.source, 'server_awair_artifact_intelligence')
  assert.equal(projections?.artifactLake?.artifact_count, 3)
  assert.equal(projections?.artifactReplay?.cold_start_seed.schema_version, 'atlas.awis.artifact_cold_start_seed.v1')
  assert.ok(projections?.artifactReplay?.cold_start_seed.load_order.includes('contexto:context_pack'))
  assert.ok(projections?.artifactReplay?.cold_start_seed.seed_hash.startsWith('cold-'))
  assert.equal(pack?.startup_snapshot?.readiness.artifact_replay_ready, true)
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.includes('contexto:context_pack'))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('cold-seed:')))
  assert.ok(pack?.startup_snapshot?.startup_gold.next_best_actions.includes('registrar resultado real para o AWIS aprender'))
  assert.equal(pack?.artifact_replay?.safety.raw_conversation_included, false)
  assert.doesNotMatch(JSON.stringify(pack), /source_thread_ids|full_message|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS workspace context pack can start from next-session brain and handoff pack', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const liveExecutionMemory = buildAwisWorkspaceLiveExecutionMemoryProjectionFromServer({
    schema_version: 'atlas.awis.workspace_live_execution_memory.v1',
    status: 'ready',
    workspace_id: 'atlas',
    live_memory_hash: 'sha256:live',
    startup_packet: {
      load_first: ['workspace_live_execution_memory', 'repository_inventory', 'workspace_focus_map'],
      use_as_summary: ['focused_repositories_and_areas'],
      validate_before_trust: ['workspace_hash', 'workspace_live_execution_memory_hash'],
      avoid: ['raw_conversation_replay', 'absolute_workspace_path_in_provider_prompt'],
      human_boundary: ['mutative_execution_requires_operator_or_certified_contract'],
    },
    automation_loop: {
      before_send: ['refresh_workspace_hashes'],
      after_success: ['record_outcome', 'refresh_artifact_lake'],
      after_failure: ['create_failure_capsule'],
      on_drift: ['regenerate_focus_map'],
    },
    promotion_rules: {
      promote_to_gold: ['repeated_success'],
      preserve_as_artifact: ['workspace_runbook', 'context_pack'],
      revalidate: ['workspace_hash_changed'],
      demote: ['failed_validation'],
    },
    workspace_learning: {
      repositories: [
        { repo_key: 'atlas-desktop', stack: ['typescript'], manifest_count: 1, script_count: 2 },
      ],
      focused_repositories: [
        { repo_key: 'atlas-server', score: 88, reasons: ['runtime emits AWIS'] },
      ],
      focused_areas: ['atlas-ai'],
      focused_commands: ['npm run atlas-ai:test'],
      changed_files_preview: ['atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx'],
      canonical_source_count: 2,
    },
    source_policy: {
      raw_file_content_returned: false,
      raw_diff_returned: false,
      raw_conversation_returned: false,
      absolute_workspace_path_returned: false,
    },
  })
  const nextSessionBrain = buildAwisWorkspaceNextSessionBrainProjection({
    schema_version: 'atlas.awis.workspace_next_session_brain.v1',
    status: 'ready',
    workspace_id: 'atlas',
    readiness_score: 0.94,
    brain_hash: 'sha256:brain',
    resume_packet: {
      load_order: ['workspace_binding', 'repository_inventory', 'workspace_focus_map'],
      focused_repositories: [
        { repo_key: 'atlas-desktop', score: 96, reasons: ['surface active'], stack: ['typescript', 'tauri'] },
      ],
      focused_areas: ['atlas-ai'],
      owner_docs: ['docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'],
      artifact_refs: ['awis_artifact:abc'],
    },
    execution_priority: [
      { command: 'npm run atlas-ai:test', why: 'focused_command_from_workspace_inventory_or_profile', requires_operator_approval: true },
    ],
    context_loading_plan: {
      schema_version: 'atlas.awis.context_loading_plan.v1',
      mode: 'folder_first_provider_safe_resume',
      repository_count: 2,
      repository_inventory_hash: 'sha256:inventory',
      live_execution_memory_hash: 'sha256:live',
      live_execution_startup_packet: {
        load_first: ['workspace_live_execution_memory'],
        validate_before_trust: ['workspace_live_execution_memory_hash'],
      },
      working_set_hash: 'sha256:working',
      context_delta_plan_hash: 'sha256:delta',
      learning_snapshot_hash: 'sha256:learning',
      stack_tags: ['typescript', 'laravel'],
      command_hints: ['npm run atlas-ai:test'],
      focused_manifest_refs: [
        { repo_key: 'atlas-desktop', manifest_files: ['package.json'], stack: ['typescript'], script_names: ['atlas-ai:test'] },
      ],
      provider_policy: {
        raw_manifest_returned: false,
        script_bodies_returned: false,
        absolute_workspace_path_returned: false,
      },
    },
    source_policy: {
      raw_file_content_returned: false,
      raw_conversation_returned: false,
      absolute_workspace_path_returned: false,
    },
  })
  const handoffPack = buildAwisWorkspaceHandoffProjection({
    schema_version: 'atlas.workspace_handoff_pack.v1',
    status: 'ready',
    consumer: 'atlas_dev',
    handoff_hash: 'sha256:handoff',
    workspace: { readiness_status: 'ready' },
    required_artifacts: ['workspace_brief', 'task_packet', 'context_pack'],
    missing_artifacts: [],
    context_units: [
      { artifact_type: 'context_pack', artifact_hash: 'sha256:context', status: 'ready' },
    ],
    scope_guard: {
      risk_floor: 'medium',
      sensitive_areas: ['atlas-ai'],
      owner_docs: ['docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'],
    },
    test_contract: {
      focused_tests: ['npm run atlas-ai:test'],
      fallback_tests: ['npx tsc -b'],
    },
    next_session_brain: {
      brain_hash: 'sha256:brain',
    },
    claim_policy: {
      safe_for_provider_prompt: true,
      raw_conversation_returned: false,
      full_message_content_returned: false,
      next_session_brain_provider_safe: true,
    },
  })
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    nextSessionBrain,
    liveExecutionMemory,
    handoffPack,
  })

  assert.equal(liveExecutionMemory?.source, 'server_awis_live_execution_memory')
  assert.equal(pack?.live_execution_memory?.memory_hash, 'sha256:live')
  assert.equal(pack?.live_execution_memory?.source, 'server_awis_live_execution_memory')
  assert.ok(pack?.live_execution_memory?.startup_packet.load_first.includes('workspace_live_execution_memory'))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.some((pattern) => pattern.includes('live-memory:sha256:live')))
  assert.equal(pack?.next_session_brain?.context_loading.hashes.live_execution_memory_hash, 'sha256:live')
  assert.equal(pack?.startup_snapshot?.readiness.next_session_brain_ready, true)
  assert.equal(pack?.startup_snapshot?.readiness.handoff_pack_ready, true)
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no Atlas AI desktop com handoff seguro')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  assert.ok(task?.recommended_context.task_gold.some((item) => item.kind === 'live_memory' && item.label === 'sha256:live'))
  assert.ok(task?.recommended_context.task_gold.some((item) => item.kind === 'next_session_brain' && item.label === 'sha256:brain'))
  assert.ok(task?.recommended_context.task_gold.some((item) => item.kind === 'handoff' && item.label === 'sha256:handoff'))
  assert.ok(capsule?.use_as_summary.some((item) => item.includes('task-gold:live_memory:sha256:live')))
  assert.ok(capsule?.use_as_summary.some((item) => item.includes('task-gold:next_session_brain:sha256:brain')))
  assert.ok(capsule?.use_as_summary.some((item) => item.includes('task-gold:handoff:sha256:handoff')))
  assert.ok(capsule?.continuity_handoff.restore_priority.some((item) => item.includes('next-session:workspace_binding')))
  assert.ok(capsule?.continuity_handoff.hot_context.some((item) => item.includes('kernel:')))
  assert.ok(capsule?.continuity_handoff.first_load.some((item) => item.includes('handoff:context_pack')))
  assert.ok(capsule?.continuity_handoff.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.continuity_handoff.artifacts.some((item) => item.includes('required:context_pack')))
  assert.ok(capsule?.continuity_handoff.handoff_units.some((item) => item.includes('context_pack')))
  assert.ok(capsule?.continuity_handoff.human_boundary.some((item) => item.includes('owner-doc:docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md')))
  assert.equal(capsule?.continuity_handoff.readiness.handoff_ready, true)
  assert.equal(capsule?.continuity_handoff.readiness.missing_artifacts, 0)
  assert.ok(pack?.startup_snapshot?.startup_gold.commands.includes('npm run atlas-ai:test'))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.includes('repo:atlas-desktop'))
  assert.equal(pack?.next_session_brain?.brain_hash, 'sha256:brain')
  assert.equal(pack?.handoff_pack?.handoff_hash, 'sha256:handoff')
  assert.equal(pack?.safety.provider_safe, true)
  assert.doesNotMatch(
    JSON.stringify(pack),
    new RegExp('raw_file_content|raw_conversation_returned":true|full_message_content_returned":true|/Users/'),
  )
  assert.doesNotMatch(JSON.stringify({ task, capsule }), /corrigir bug|\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)

  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T12:40:00Z')
  const nextLiveExecutionMemory = buildAwisWorkspaceLiveExecutionMemoryProjectionFromServer({
    schema_version: 'atlas.awis.workspace_live_execution_memory.v1',
    status: 'ready',
    workspace_id: 'atlas',
    live_memory_hash: 'sha256:live-v2',
    startup_packet: {
      load_first: ['workspace_live_execution_memory', 'repository_inventory', 'workspace_focus_map'],
      use_as_summary: ['focused_repositories_and_areas'],
      validate_before_trust: ['workspace_hash', 'workspace_live_execution_memory_hash'],
      avoid: ['raw_conversation_replay', 'absolute_workspace_path_in_provider_prompt'],
      human_boundary: ['mutative_execution_requires_operator_or_certified_contract'],
    },
    automation_loop: {
      before_send: ['refresh_workspace_hashes'],
      after_success: ['record_outcome', 'refresh_artifact_lake'],
      after_failure: ['create_failure_capsule'],
      on_drift: ['regenerate_focus_map'],
    },
    promotion_rules: {
      promote_to_gold: ['repeated_success'],
      preserve_as_artifact: ['workspace_runbook', 'context_pack'],
      revalidate: ['workspace_hash_changed'],
      demote: ['failed_validation'],
    },
    workspace_learning: {
      repositories: [
        { repo_key: 'atlas-desktop', stack: ['typescript'], manifest_count: 1, script_count: 2 },
      ],
      focused_repositories: [
        { repo_key: 'atlas-server', score: 88, reasons: ['runtime emits AWIS'] },
      ],
      focused_areas: ['atlas-ai'],
      focused_commands: ['npm run atlas-ai:test'],
      changed_files_preview: ['atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx'],
      canonical_source_count: 2,
    },
    source_policy: {
      raw_file_content_returned: false,
      raw_diff_returned: false,
      raw_conversation_returned: false,
      absolute_workspace_path_returned: false,
    },
  })
  const nextPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    nextSessionBrain,
    liveExecutionMemory: nextLiveExecutionMemory,
    handoffPack,
  })
  const nextArtifact = nextPack ? buildAwisWorkspaceArtifact(nextPack, '2026-05-24T12:41:00Z') : null

  assert.ok(artifact)
  assert.ok(nextArtifact)
  assert.notEqual(nextArtifact.artifact_hash, artifact.artifact_hash)
})

test('AWIS live execution memory persists locally without losing canonical source', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const liveExecutionMemory = buildAwisWorkspaceLiveExecutionMemoryProjectionFromServer({
    schema_version: 'atlas.awis.workspace_live_execution_memory.v1',
    status: 'ready',
    workspace_id: 'atlas',
    live_memory_hash: 'sha256:live-cache',
    startup_packet: {
      load_first: ['workspace_live_execution_memory'],
      use_as_summary: ['golden startup packet'],
      validate_before_trust: ['workspace_live_execution_memory_hash'],
      avoid: ['raw conversation replay'],
      human_boundary: ['operator confirms destructive changes'],
    },
    automation_loop: {
      before_send: ['refresh_workspace_hashes'],
      after_success: ['record_outcome'],
      after_failure: ['create_failure_capsule'],
      on_drift: ['regenerate_focus_map'],
    },
    promotion_rules: {
      promote_to_gold: ['repeated_success'],
      preserve_as_artifact: ['workspace_runbook'],
      revalidate: ['workspace_hash_changed'],
      demote: ['failed_validation'],
    },
    workspace_learning: {
      repositories: [{ repo_key: 'atlas-desktop', stack: ['typescript'], manifest_count: 1, script_count: 2 }],
      focused_repositories: [],
      focused_areas: ['atlas-ai'],
      focused_commands: ['npm run atlas-ai:test'],
      changed_files_preview: [],
      canonical_source_count: 1,
    },
    source_policy: {
      raw_file_content_returned: false,
      raw_diff_returned: false,
      raw_conversation_returned: false,
      absolute_workspace_path_returned: false,
    },
  })

  const dirtyLiveMemory = structuredClone(liveExecutionMemory) as typeof liveExecutionMemory
  assert.ok(dirtyLiveMemory)
  dirtyLiveMemory.memory_hash = '/Users/vitorepf/private/live'
  dirtyLiveMemory.startup_packet.load_first.unshift('/Users/vitorepf/private/load')
  dirtyLiveMemory.startup_packet.use_as_summary.unshift('operator_input summary')
  dirtyLiveMemory.startup_packet.validate_before_trust.unshift('response_text validator')
  dirtyLiveMemory.startup_packet.avoid.unshift('raw_conversation avoid')
  dirtyLiveMemory.startup_packet.human_boundary.unshift('full_message human')
  dirtyLiveMemory.automation_loop.before_send.unshift('operator_input before')
  dirtyLiveMemory.automation_loop.after_success.unshift('response_text success')
  dirtyLiveMemory.promotion_rules.promote_to_gold.unshift('raw_conversation promote')
  dirtyLiveMemory.workspace_learning.repositories.unshift('/Users/vitorepf/private/repo')
  dirtyLiveMemory.workspace_learning.spaces.unshift('operator_input space')
  dirtyLiveMemory.workspace_learning.commands.unshift('full_message command')
  const dirtyStore = storage()
  saveAwisWorkspaceLiveExecutionMemoryProjection(key, dirtyLiveMemory, dirtyStore)
  const dirtyLoaded = loadAwisWorkspaceLiveExecutionMemoryProjection(key, dirtyStore)
  assert.ok(dirtyLoaded?.startup_packet.load_first.includes('workspace_live_execution_memory'))
  assert.doesNotMatch(JSON.stringify(dirtyLoaded), /\/Users\/|operator_input summary|operator_input before|operator_input space|response_text validator|response_text success|raw_conversation avoid|raw_conversation promote|full_message human|full_message command/)

  saveAwisWorkspaceLiveExecutionMemoryProjection(key, liveExecutionMemory, store)
  const loaded = loadAwisWorkspaceLiveExecutionMemoryProjection(key, store)

  assert.equal(loaded?.source, 'server_awis_live_execution_memory')
  assert.equal(loaded?.memory_hash, 'sha256:live-cache')
  assert.ok(loaded?.startup_packet.load_first.includes('workspace_live_execution_memory'))
  assert.equal(loaded?.safety.provider_safe, true)
  assert.match(store.getItem(AWIS_WORKSPACE_LIVE_EXECUTION_MEMORY_STORAGE) ?? '', /sha256:live-cache/)
})

test('AWIS server brain projections reject unsafe startup labels before local persistence', () => {
  const nextSessionBrain = buildAwisWorkspaceNextSessionBrainProjection({
    schema_version: 'atlas.awis.workspace_next_session_brain.v1',
    status: 'operator_input server status',
    workspace_id: 'atlas',
    readiness_score: 0.9,
    brain_hash: 'response_text brain hash',
    resume_packet: {
      load_order: ['workspace_binding', 'operator_input server load'],
      focused_repositories: [
        {
          repo_key: 'atlas-desktop',
          score: 90,
          reasons: ['surface active', 'response_text server reason'],
          stack: ['typescript', 'raw_conversation server stack'],
        },
        {
          repo_key: 'full_message server repo',
          score: 100,
          reasons: ['unsafe'],
          stack: ['unsafe'],
        },
      ],
      focused_areas: ['atlas-ai', 'operator_input server area'],
      owner_docs: ['docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md', '/Users/vitorepf/private/doc.md'],
      artifact_refs: ['awis_artifact:abc', 'response_text server artifact'],
    },
    execution_priority: [
      { command: 'npm run atlas-ai:test', why: 'validate workspace', requires_operator_approval: true },
      { command: 'raw_conversation server command', why: 'full_message server why', requires_operator_approval: true },
    ],
    context_loading_plan: {
      schema_version: 'atlas.awis.context_loading_plan.v1',
      mode: 'folder_first_provider_safe_resume',
      repository_count: 2,
      repository_inventory_hash: 'sha256:inventory',
      live_execution_memory_hash: 'operator_input server live hash',
      live_execution_startup_packet: {
        load_first: ['workspace_live_execution_memory'],
        validate_before_trust: ['workspace_live_execution_memory_hash'],
      },
      working_set_hash: '/Users/vitorepf/private/working',
      context_delta_plan_hash: 'response_text server delta hash',
      learning_snapshot_hash: 'sha256:learning',
      stack_tags: ['typescript', 'operator_input server stack tag'],
      command_hints: ['npm run atlas-ai:test', 'response_text server hint'],
      automation_hooks: ['record_outcome', 'raw_conversation server hook'],
      outcome_ranked_commands: ['npm run atlas-ai:test', 'full_message server ranked'],
      avoid_commands: ['dangerous command', 'operator_input server avoid'],
      flaky_commands: ['response_text server flaky'],
      slow_commands: ['raw_conversation server slow'],
      focused_manifest_refs: [
        { repo_key: 'atlas-desktop', manifest_files: ['package.json', '/Users/vitorepf/private/package.json'], stack: ['typescript', 'full_message server manifest stack'], script_names: ['atlas-ai:test', 'operator_input server script'] },
      ],
      provider_policy: {
        raw_manifest_returned: false,
        script_bodies_returned: false,
        absolute_workspace_path_returned: false,
      },
    },
    source_policy: {
      raw_file_content_returned: false,
      raw_conversation_returned: false,
      absolute_workspace_path_returned: false,
    },
  } as any)
  const liveExecutionMemory = buildAwisWorkspaceLiveExecutionMemoryProjectionFromServer({
    schema_version: 'atlas.awis.workspace_live_execution_memory.v1',
    status: 'ready',
    workspace_id: 'atlas',
    live_memory_hash: 'operator_input live hash',
    startup_packet: {
      load_first: ['workspace_live_execution_memory', 'operator_input live load'],
      use_as_summary: ['golden startup packet', 'response_text live summary'],
      validate_before_trust: ['workspace_live_execution_memory_hash', 'raw_conversation live validate'],
      avoid: ['raw_conversation_replay', 'full_message live avoid'],
      human_boundary: ['operator confirms destructive changes', 'operator_input live human'],
    },
    automation_loop: {
      before_send: ['refresh_workspace_hashes', 'response_text live before'],
      after_success: ['record_outcome', 'raw_conversation live success'],
      after_failure: ['create_failure_capsule', 'full_message live failure'],
      on_drift: ['regenerate_focus_map', 'operator_input live drift'],
    },
    promotion_rules: {
      promote_to_gold: ['repeated_success', 'response_text live promote'],
      preserve_as_artifact: ['workspace_runbook', 'raw_conversation live artifact'],
      revalidate: ['workspace_hash_changed', 'full_message live revalidate'],
      demote: ['failed_validation', 'operator_input live demote'],
    },
    workspace_learning: {
      repositories: [{ repo_key: 'atlas-desktop', stack: ['typescript'], manifest_count: 1, script_count: 2 }, { repo_key: 'response_text live repo', stack: [], manifest_count: 0, script_count: 0 }],
      focused_repositories: [{ repo_key: 'atlas-server', score: 80, reasons: ['runtime emits AWIS'] }, { repo_key: 'raw_conversation live focused repo', score: 90, reasons: [] }],
      focused_areas: ['atlas-ai', 'full_message live area'],
      focused_commands: ['npm run atlas-ai:test', 'operator_input live command'],
      changed_files_preview: [],
      canonical_source_count: 2,
    },
    source_policy: {
      raw_file_content_returned: false,
      raw_diff_returned: false,
      raw_conversation_returned: false,
      absolute_workspace_path_returned: false,
    },
  } as any)

  assert.ok(nextSessionBrain)
  assert.ok(liveExecutionMemory)
  assert.ok(nextSessionBrain.load_order.includes('workspace_binding'))
  assert.ok(nextSessionBrain.execution_priority.some((priority) => priority.command === 'npm run atlas-ai:test'))
  assert.ok(liveExecutionMemory.startup_packet.load_first.includes('workspace_live_execution_memory'))
  assert.ok(liveExecutionMemory.workspace_learning.commands.includes('npm run atlas-ai:test'))
  assert.doesNotMatch(
    JSON.stringify({ nextSessionBrain, liveExecutionMemory }),
    /operator_input (server|live)|response_text (server|live)|raw_conversation (server|live)|full_message (server|live)|\/Users\/vitorepf\/private/,
  )
})

test('AWIS workspace topology turns the folder map into component intelligence', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai', kind: 'área' },
      { path: 'atlas-desktop/crates/atlas-tauri', kind: 'área' },
      { path: 'atlas-server/app/Services/Ai', kind: 'área' },
      { path: 'atlas-server/database/migrations', kind: 'área' },
      { path: 'atlas-mobile', kind: 'área' },
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/crates/atlas-tauri/Cargo.toml', kind: 'config' },
      { path: 'atlas-desktop/apps/desktop/src-tauri/tauri.conf.json', kind: 'config' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'atlas-server/artisan', kind: 'manifesto' },
      { path: 'docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md', kind: 'documento' },
    ],
    docDigests: [
      {
        path: 'AGENTS.md',
        kind: 'contrato',
        signals: ['doc:provider-operating-contract', 'doc:awis'],
        obligations: ['sessão:bootstrap antes de implementar', 'governança:preferir docs canônicos'],
        summary: 'contrato operacional do provider; sinal principal doc:awis; regra governança:preferir docs canônicos',
      },
      {
        path: 'docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md',
        kind: 'documentação',
        signals: ['doc:awis', 'doc:spaces', 'doc:workbench'],
        obligations: ['validação:rodar comandos relevantes antes de confiar'],
        summary: 'documentação canônica de engenharia; sinal principal doc:awis; regra validação:rodar comandos relevantes antes de confiar',
      },
    ],
    commands: [
      { label: 'Desktop test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Desktop build', command: 'npm run build', kind: 'build', source: 'atlas-desktop/package.json' },
      { label: 'Server test', command: 'php artisan test', kind: 'test', source: 'atlas-server/artisan' },
    ],
    dependencyEdges: [
      { from: '@atlas/desktop', to: '@atlas/domain', kind: 'dependencies', source: 'atlas-desktop/apps/desktop/package.json' },
      { from: '@atlas/desktop', to: '@tauri-apps/api', kind: 'dependencies', source: 'atlas-desktop/apps/desktop/package.json' },
      { from: 'atlas/server', to: 'laravel/framework', kind: 'require', source: 'atlas-server/composer.json' },
    ],
    signals: ['React', 'Vite', 'Laravel', 'Tauri', 'PHP test suite'],
  })
  const topology = buildAwisWorkspaceTopologyProjection(snapshot)
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory: learnAwisWorkspaceMemory(null, snapshot, key).memory,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir AWIS desktop com segurança')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-26T18:00:00Z') : null
  const dirtyTopologyArtifact = artifact ? structuredClone(artifact) as typeof artifact : null
  assert.ok(dirtyTopologyArtifact?.payload.topology_projection)
  dirtyTopologyArtifact.payload.topology_projection.root.name = '/Users/vitorepf/private/root'
  dirtyTopologyArtifact.payload.topology_projection.components.unshift({
    key: 'atlas-desktop',
    role: 'operator_input role',
    stack: ['response_text stack'],
    areas: ['atlas-desktop/apps/desktop/src/surfaces/atlas-ai'],
    manifests: ['atlas-desktop/package.json'],
    docs: ['docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'],
    commands: [{ command: 'raw_conversation command', kind: 'test', source: 'atlas-desktop/package.json' }],
    confidence: 100,
  })
  dirtyTopologyArtifact.payload.topology_projection.connections.unshift({
    from: 'atlas-desktop',
    to: 'atlas-server',
    reason: 'full_message topology reason',
  })
  dirtyTopologyArtifact.payload.topology_projection.execution_map.test_commands.unshift('operator_input test command')
  dirtyTopologyArtifact.payload.topology_projection.knowledge_map.doc_signals.unshift('response_text doc signal')
  dirtyTopologyArtifact.payload.topology_projection.knowledge_map.command_intents.unshift('raw_conversation intent')
  saveAwisWorkspaceArtifact(dirtyTopologyArtifact, store)
  const dirtyTopologyArtifacts = loadAwisWorkspaceArtifacts(key, store)
  const dirtyTopologyReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyTopologyArtifacts)
  const dirtyTopologyJson = JSON.stringify({ artifact: dirtyTopologyArtifacts[0], replay: dirtyTopologyReplay })
  assert.ok(dirtyTopologyReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('component:') || pattern.startsWith('stack-signal:')))
  assert.doesNotMatch(dirtyTopologyJson, /\/Users\/|operator_input role|operator_input test command|response_text stack|response_text doc signal|raw_conversation command|raw_conversation intent|full_message topology reason/)

  assert.equal(topology?.schema_version, 'atlas.awis.workspace_topology_projection.v1')
  assert.ok(topology?.components.some((component) => component.key === 'atlas-desktop' && component.role === 'aplicativo desktop'))
  assert.ok(topology?.components.some((component) => component.key === 'atlas-server' && component.role === 'serviço backend'))
  assert.ok(topology?.components.some((component) => component.key === 'atlas-mobile' && component.role === 'aplicativo mobile'))
  assert.ok(topology?.components.some((component) => component.key === 'docs' && component.role === 'conhecimento canônico'))
  assert.ok(topology?.components.some((component) => component.key === 'atlas-desktop' && component.areas.includes('atlas-desktop/apps/desktop/src/surfaces/atlas-ai')))
  assert.ok(topology?.components.some((component) => component.key === 'atlas-server' && component.areas.includes('atlas-server/app/Services/Ai')))
  assert.ok(topology?.connections.some((connection) => connection.from === 'atlas-desktop' && connection.to === 'atlas-server'))
  assert.ok(topology?.execution_map.test_commands.includes('npm run atlas-ai:test'))
  assert.ok(topology?.knowledge_map.load_first_docs.includes('docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'))
  assert.ok(topology?.knowledge_map.area_refs.includes('atlas-desktop/apps/desktop/src/surfaces/atlas-ai'))
  assert.ok(topology?.knowledge_map.stack_dependency_signals.includes('React'))
  assert.ok(topology?.knowledge_map.stack_dependency_signals.includes('Laravel'))
  assert.ok(topology?.knowledge_map.stack_dependency_signals.includes('TypeScript'))
  assert.ok(topology?.knowledge_map.stack_dependency_signals.some((signal) => signal === 'linguagem:TypeScript:1200'))
  assert.ok(topology?.knowledge_map.internal_dependency_edges.some((edge) => edge.includes('@atlas/desktop->@atlas/domain')))
  assert.ok(topology?.knowledge_map.internal_dependency_edges.some((edge) => edge.includes('atlas/server->laravel/framework')))
  assert.ok(topology?.knowledge_map.command_intents.some((intent) => intent.includes('validate:auto-validar:atlas-desktop/package.json:npm run atlas-ai:test')))
  assert.ok(topology?.knowledge_map.command_intents.some((intent) => intent.includes('build:auto-validar:atlas-desktop/package.json:npm run build')))
  assert.ok(topology?.knowledge_map.doc_signals.includes('doc:provider-operating-contract'))
  assert.ok(topology?.knowledge_map.doc_obligations.includes('sessão:bootstrap antes de implementar'))
  assert.ok(topology?.knowledge_map.doc_summaries.some((summary) => summary.includes('AGENTS.md')))
  assert.ok(topology?.knowledge_map.manifest_refs.includes('atlas-desktop/package.json'))
  assert.ok(topology?.knowledge_map.validation_entrypoints.includes('npm run atlas-ai:test'))
  assert.ok(topology?.knowledge_map.sensitive_zones.some((zone) => zone.includes('atlas-desktop') || zone.includes('atlas-server')))
  assert.ok(topology?.knowledge_map.sensitive_zones.some((zone) => zone.includes('database/migrations')))
  assert.equal(topology?.safety.absolute_paths_included, false)
  assert.equal(pack?.topology?.schema_version, 'atlas.awis.workspace_topology_projection.v1')
  assert.ok(pack?.folder_map?.doc_digests.some((digest) => digest.path === 'AGENTS.md'))
  assert.ok(task?.recommended_context.load_order.some((item) => item.includes('doc-regra:')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.includes('área:atlas-desktop/apps/desktop/src/surfaces/atlas-ai')))
  assert.ok(task?.recommended_context.dependency_edges.some((edge) => edge.includes('@atlas/desktop->@atlas/domain')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.includes('dependency:@atlas/desktop->@atlas/domain')))
  assert.ok(task?.recommended_context.command_intents.some((intent) => intent.includes('validate:auto-validar:atlas-desktop/package.json:npm run atlas-ai:test')))
  assert.ok(task?.recommended_context.command_lanes.auto_validate.includes('npm run atlas-ai:test'))
  assert.ok(task?.recommended_context.command_lanes.preferred_validation.includes('npm run atlas-ai:test'))
  assert.ok(task?.learning_hooks.next_session_contract.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(task?.recommended_context.load_order.some((item) => item.includes('command-intent:validate:auto-validar:atlas-desktop/package.json:npm run atlas-ai:test')))
  assert.ok(capsule?.load_first.some((item) => item.includes('folder-doc-rule:')))
  assert.ok(capsule?.load_first.some((item) => item.includes('dependency:@atlas/desktop->@atlas/domain')))
  assert.ok(capsule?.use_as_summary.some((item) => item.includes('folder-doc-digest:AGENTS.md')))
  assert.ok(capsule?.use_as_summary.some((item) => item.includes('folder-command-intent:validate:auto-validar:atlas-desktop/package.json:npm run atlas-ai:test')))
  assert.ok(capsule?.use_as_summary.some((item) => item.includes('folder-dependency:atlas/server->laravel/framework')))
  assert.ok(pack?.workspace_twin?.context_autopilot.avoid.some((item) => item.includes('sensível:atlas-desktop') || item.includes('sensível:atlas-server')))
  assert.ok(pack?.workspace_twin?.genome.stack.includes('TypeScript'))
  assert.ok(pack?.workspace_twin?.context_autopilot.validate.includes('npm run atlas-ai:test'))
  assert.equal(pack?.startup_snapshot?.readiness.topology_ready, true)
  assert.ok(pack?.startup_snapshot?.startup_gold.workspace_components.some((component) => component.includes('atlas-desktop')))
  assert.ok(pack?.startup_snapshot?.startup_gold.stack_signals.includes('React'))
  assert.ok(pack?.startup_snapshot?.startup_gold.stack_signals.includes('TypeScript'))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.includes('stack-signal:React'))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.includes('stack-signal:linguagem:TypeScript:1200'))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.some((pattern) => pattern.includes('dependency-edge:@atlas/desktop->@atlas/domain')))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.some((pattern) => pattern.includes('command-intent:validate:auto-validar:atlas-desktop/package.json:npm run atlas-ai:test')))
  assert.ok(pack?.next_session_brain?.load_order.includes('stack:React'))
  assert.ok(pack?.next_session_brain?.load_order.includes('stack:TypeScript'))
  assert.ok(pack?.next_session_brain?.load_order.some((item) => item.includes('doc-regra:sessão:bootstrap antes de implementar')))
  assert.ok(pack?.next_session_brain?.load_order.some((item) => item.includes('doc-sinal:doc:provider-operating-contract')))
  assert.ok(pack?.next_session_brain?.load_order.some((item) => item.includes('dependency:@atlas/desktop->@atlas/domain')))
  assert.ok(pack?.next_session_brain?.context_loading.stack_tags.includes('Laravel'))
  assert.ok(pack?.next_session_brain?.context_loading.document_hints.load_first.includes('docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'))
  assert.ok(pack?.next_session_brain?.context_loading.document_hints.rules.includes('sessão:bootstrap antes de implementar'))
  assert.ok(pack?.next_session_brain?.context_loading.document_hints.signals.includes('doc:awis'))
  assert.ok(pack?.next_session_brain?.context_loading.document_hints.summaries.some((summary) => summary.includes('AGENTS.md')))
  assert.ok(pack?.next_session_brain?.context_loading.document_hints.notes.some((note) => note.includes('scan limitado')))
  assert.ok(pack?.startup_briefing?.focus.repositories.includes('atlas-desktop'))
  assert.ok(pack?.startup_briefing?.focus.load_sequence.includes('folder_stack_signals'))
  assert.ok(pack?.startup_briefing?.focus.load_sequence.includes('folder_dependency_edges'))
  assert.ok(pack?.startup_briefing?.focus.load_sequence.includes('folder_command_intents'))
  assert.ok(pack?.startup_briefing?.context_gold.reusable_patterns.includes('folder-stack:Tauri'))
  assert.ok(pack?.startup_briefing?.context_gold.reusable_patterns.some((pattern) => pattern.includes('folder-command-intent:validate:auto-validar:atlas-desktop/package.json:npm run atlas-ai:test')))
  assert.ok(pack?.startup_briefing?.context_gold.reusable_patterns.some((pattern) => pattern.includes('folder-dependency:atlas/server->laravel/framework')))
  assert.ok(pack?.startup_briefing?.context_gold.reusable_patterns.some((pattern) => pattern.includes('workspace:atlas-server')))
  assert.ok(pack?.repository_constellation?.repositories.some((repo) => repo.key === 'atlas-desktop' && repo.load_when.some((item) => item.includes('stack:React'))))
  assert.ok(pack?.repository_constellation?.repositories.some((repo) => repo.key === 'atlas-server' && repo.load_when.some((item) => item.includes('dependency:atlas/server->laravel/framework'))))
  assert.equal(pack?.startup_playbook?.schema_version, 'atlas.awis.workspace_startup_playbook.v1')
  assert.ok(pack?.startup_playbook?.context_loading.must_load.includes('workspace_topology'))
  assert.ok(pack?.startup_playbook?.execution.primary_validation_commands.includes('npm run atlas-ai:test'))
  assert.doesNotMatch(JSON.stringify(pack), /\/Users\/|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS workspace relations connect compatible local memories without raw paths', () => {
  const atlasKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const serverKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas/atlas-server', 'atlas-server')
  const mobileKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas/atlas-mobile', 'atlas-mobile')
  let atlasMemory = learnAwisWorkspaceMemory(null, brain({
    signals: ['Laravel', 'Tauri', 'workspace memory'],
    languages: [{ label: 'TypeScript', count: 80 }, { label: 'PHP', count: 55 }],
    commands: [
      { label: 'Desktop test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Server test', command: 'php artisan test', kind: 'test', source: 'atlas-server/artisan' },
    ],
  }), atlasKey).memory
  atlasMemory = recordAwisWorkspaceInteraction(atlasMemory, {
    workspaceKey: atlasKey,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-server'],
    validationCommands: ['php artisan test'],
    spaceLabels: ['AWIS runtime'],
    spaceBrainLabels: ['AWIS runtime:contexto protegido antes de abrir sessão'],
    liveMemoryLabels: ['workspace_live_execution_memory'],
    priorityLoadLabels: ['atlas-server'],
    evidenceGateLabels: ['trusted:component:atlas-server', 'verify:validar:php artisan test'],
    nextSessionLabels: ['load:full:atlas-server', 'validate:php artisan test', 'promote:validação verde:php artisan test'],
    transferWorkspaceLabels: ['atlas-server'],
    transferReuseLabels: ['component:atlas-server', 'plano validado:bug_fix'],
    transferValidateLabels: ['confirmar validação transferida:bug_fix:php artisan test'],
    transferNeverLabels: ['paths absolutos do Mac', '/Users/vitorepf/develop/Atlas/atlas-server/.env'],
  }).memory
  atlasMemory = recordAwisWorkspaceInteraction(atlasMemory, {
    workspaceKey: atlasKey,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-server'],
    validationCommands: ['php artisan test'],
    spaceLabels: ['AWIS runtime'],
    spaceBrainLabels: ['AWIS runtime:contexto protegido antes de abrir sessão'],
    liveMemoryLabels: ['workspace_live_execution_memory'],
    priorityLoadLabels: ['atlas-server'],
    evidenceGateLabels: ['verify:validar:php artisan test'],
    recoveryLabels: ['fallback:php artisan test', 'demote:ouro:component:atlas-server'],
  }).memory
  let serverMemory = learnAwisWorkspaceMemory(null, brain({
    rootName: 'Atlas Server',
    rootPath: '/Users/vitorepf/develop/Atlas/atlas-server',
    signals: ['Laravel', 'workspace memory'],
    languages: [{ label: 'PHP', count: 90 }],
    commands: [{ label: 'Server test', command: 'php artisan test', kind: 'test', source: 'artisan' }],
  }), serverKey).memory
  serverMemory = recordAwisWorkspaceInteraction(serverMemory, {
    workspaceKey: serverKey,
    workspaceName: 'Atlas Server',
    rootPath: '/Users/vitorepf/develop/Atlas/atlas-server',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-server'],
    validationCommands: ['php artisan test'],
    spaceLabels: ['AWIS runtime'],
    spaceBrainLabels: ['AWIS runtime:contexto protegido antes de abrir sessão'],
    liveMemoryLabels: ['workspace_live_execution_memory'],
    priorityLoadLabels: ['atlas-server'],
    evidenceGateLabels: ['trusted:component:atlas-server', 'verify:validar:php artisan test'],
    nextSessionLabels: ['load:full:atlas-server', 'validate:php artisan test', 'promote:validação verde:php artisan test'],
  }).memory
  serverMemory = recordAwisWorkspaceInteraction(serverMemory, {
    workspaceKey: serverKey,
    workspaceName: 'Atlas Server',
    rootPath: '/Users/vitorepf/develop/Atlas/atlas-server',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-server'],
    validationCommands: ['php artisan test'],
  }).memory
  const mobileMemory = learnAwisWorkspaceMemory(null, brain({
    rootName: 'Atlas Mobile',
    rootPath: '/Users/vitorepf/develop/Atlas/atlas-mobile',
    signals: ['Expo'],
    languages: [{ label: 'Swift', count: 22 }],
    commands: [{ label: 'Mobile test', command: 'npm run mobile:test', kind: 'test', source: 'package.json' }],
  }), mobileKey).memory
  const relations = buildAwisWorkspaceRelationProjection({
    [atlasKey]: atlasMemory,
    [serverKey]: serverMemory,
    [mobileKey]: mobileMemory,
  }, atlasKey)
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: atlasKey,
    workspaceName: 'Atlas',
    brain: brain(),
    memory: atlasMemory,
    relations,
  })

  assert.equal(relations?.schema_version, 'atlas.awis.workspace_relation_projection.v1')
  assert.equal(relations?.safety.absolute_paths_included, false)
  assert.equal(relations?.transfer_policy.raw_paths_returned, false)
  assert.ok(relations?.related_workspaces.some((workspace) => workspace.workspace_hint === 'atlas-server'))
  assert.ok(relations?.related_workspaces.some((workspace) => workspace.shared_context_gold.includes('component:atlas-server')))
  assert.ok(relations?.related_workspaces.some((workspace) => workspace.shared_validation_plans.includes('bug_fix:php artisan test')))
  assert.ok(relations?.related_workspaces.some((workspace) => workspace.shared_recovery_patterns.includes('bug_fix:failed:php artisan test')))
  assert.ok(relations?.related_workspaces.some((workspace) => workspace.shared_spaces.includes('AWIS runtime')))
  assert.ok(relations?.related_workspaces.some((workspace) => workspace.shared_space_brain.includes('AWIS runtime:contexto protegido antes de abrir sessão')))
  assert.ok(relations?.related_workspaces.some((workspace) => workspace.shared_live_memory.includes('workspace_live_execution_memory')))
  assert.ok(relations?.related_workspaces.some((workspace) => workspace.shared_priority_load.includes('atlas-server')))
  assert.ok(relations?.related_workspaces.some((workspace) => workspace.shared_evidence_gates.includes('trusted:component:atlas-server')))
  assert.ok(relations?.related_workspaces.some((workspace) => workspace.shared_next_session_contracts.includes('load:full:atlas-server')))
  assert.ok(relations?.related_workspaces[0]?.recommended_transfer.some((hint) => hint.includes('php artisan test')))
  assert.ok(relations?.related_workspaces[0]?.recommended_transfer.some((hint) => hint.includes('Space compatível')))
  assert.ok(relations?.related_workspaces[0]?.recommended_transfer.some((hint) => hint.includes('Space Brain transferível')))
  assert.ok(relations?.related_workspaces[0]?.recommended_transfer.some((hint) => hint.includes('memória viva compatível')))
  assert.ok(relations?.related_workspaces[0]?.recommended_transfer.some((hint) => hint.includes('evidence gate compatível')))
  assert.ok(relations?.related_workspaces[0]?.recommended_transfer.some((hint) => hint.includes('contrato de próxima sessão compatível')))
  const serverTransfer = relations?.transfer_matrix.find((transfer) => transfer.workspace_hint === 'atlas-server')
  assert.ok(serverTransfer)
  assert.ok(serverTransfer.reuse.some((item) => item.includes('ouro:component:atlas-server')))
  assert.ok(serverTransfer.reuse.some((item) => item.includes('validação:bug_fix:php artisan test')))
  assert.ok(serverTransfer.reuse.some((item) => item.includes('recovery:bug_fix:failed:php artisan test')))
  assert.ok(serverTransfer.reuse.some((item) => item.includes('space:AWIS runtime')))
  assert.ok(serverTransfer.reuse.some((item) => item.includes('space-brain:AWIS runtime:contexto protegido antes de abrir sessão')))
  assert.ok(serverTransfer.reuse.some((item) => item.includes('memória viva:workspace_live_execution_memory')))
  assert.ok(serverTransfer.reuse.some((item) => item.includes('prioridade:atlas-server')))
  assert.ok(serverTransfer.reuse.some((item) => item.includes('evidência:trusted:component:atlas-server')))
  assert.ok(serverTransfer.reuse.some((item) => item.includes('contrato sessão:load:full:atlas-server')))
  assert.ok(serverTransfer.reuse.some((item) => item.includes('contrato:component:atlas-server')))
  assert.ok(serverTransfer.reuse.some((item) => item.includes('contrato:plano validado:bug_fix')))
  assert.ok(serverTransfer.reuse.some((item) => item.includes('php artisan test')))
  assert.ok(serverTransfer.revalidate.some((item) => item.includes('validar comando antes de aplicar')))
  assert.ok(serverTransfer.revalidate.some((item) => item.includes('confirmar validação transferida')))
  assert.ok(serverTransfer.revalidate.some((item) => item.includes('confirmar validar contrato:confirmar validação transferida')))
  assert.ok(serverTransfer.revalidate.some((item) => item.includes('aplicar recovery só com evidência local')))
  assert.ok(serverTransfer.revalidate.some((item) => item.includes('revalidar Space Brain no workspace atual')))
  assert.ok(serverTransfer.revalidate.some((item) => item.includes('confirmar evidence gate local')))
  assert.ok(serverTransfer.revalidate.some((item) => item.includes('revalidar contrato de sessão local')))
  assert.ok(serverTransfer.do_not_transfer.includes('paths absolutos'))
  assert.ok(serverTransfer.do_not_transfer.some((item) => item.includes('[path]')))
  assert.equal(JSON.stringify(relations).includes('/Users/vitorepf'), false)
  assert.ok(relations?.connection_contracts.some((contract) => contract.workspace_hint === 'atlas-server'))
  assert.equal(relations?.connection_contracts.find((contract) => contract.workspace_hint === 'atlas-server')?.relationship, 'shared_context')
  assert.ok(relations?.connection_contracts[0]?.load_when.some((item) => item.includes('contexto já validado')))
  assert.ok(relations?.connection_contracts[0]?.reuse.some((item) => item.includes('contexto validado:component:atlas-server')))
  assert.ok(relations?.connection_contracts[0]?.reuse.some((item) => item.includes('Space Brain transferível:AWIS runtime:contexto protegido antes de abrir sessão')))
  assert.ok(relations?.connection_contracts[0]?.reuse.some((item) => item.includes('evidence gate transferível:trusted:component:atlas-server')))
  assert.ok(relations?.connection_contracts[0]?.reuse.some((item) => item.includes('contrato de sessão transferível:load:full:atlas-server')))
  assert.ok(relations?.connection_contracts[0]?.validate.some((item) => item.includes('provar novamente:bug_fix:php artisan test')))
  assert.ok(relations?.connection_contracts[0]?.validate.some((item) => item.includes('confirmar evidência no workspace atual')))
  assert.ok(relations?.connection_contracts[0]?.validate.some((item) => item.includes('revalidar contrato antes de carregar')))
  assert.ok(relations?.connection_contracts[0]?.never_transfer.includes('segredos ou decisões sensíveis'))
  assert.equal(pack?.startup_snapshot?.readiness.relations_ready, true)
  assert.ok(pack?.startup_briefing?.focus.load_sequence.includes('workspace_relations'))
  assert.ok(pack?.startup_briefing?.context_gold.reusable_patterns.some((pattern) => pattern.startsWith('workspace-rel:')))
  assert.ok(pack?.startup_briefing?.context_gold.reusable_patterns.some((pattern) => pattern.includes('transfer-validation:atlas-server:bug_fix:php artisan test')))
  assert.ok(pack?.startup_briefing?.context_gold.reusable_patterns.some((pattern) => pattern.includes('transfer-recovery:atlas-server:bug_fix:failed:php artisan test')))
  assert.equal(pack?.startup_playbook?.recommended_surface, 'side_by_side')
  assert.ok(pack?.startup_playbook?.collaboration.related_workspace_hints.includes('atlas-server'))
  assert.ok(pack?.startup_playbook?.context_loading.must_load.includes('workspace_relations'))
  assert.equal(pack?.workspace_mesh?.schema_version, 'atlas.awis.workspace_mesh_projection.v1')
  assert.ok(pack?.workspace_mesh?.mesh_hash.startsWith('mesh-'))
  assert.ok(pack?.workspace_mesh?.routes.some((route) => route.workspace_hint === 'atlas-server' && route.relationship === 'shared_context'))
  assert.ok(pack?.workspace_mesh?.routes.some((route) => route.relationship === 'local_component'))
  assert.equal(pack?.workspace_mesh?.safety.provider_safe, true)
  assert.ok(pack?.repository_constellation?.next_conversation.compare_when.some((item) => item.includes('comparar Space Brain de atlas-server')))
  assert.ok(pack?.repository_constellation?.next_conversation.preserve_as_artifact.some((item) => item.includes('space-brain-transfer:atlas-server:AWIS runtime')))
  assert.ok(pack?.repository_constellation?.learning_loop.promote_when.some((item) => item.includes('Space Brain reaproveitado com sucesso:atlas-server')))
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir integração entre desktop e server')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  assert.ok(task?.recommended_context.related_workspace_hints.some((hint) => hint.startsWith('mesh:atlas-server')))
  assert.ok(task?.recommended_context.related_workspace_hints.some((hint) => hint.startsWith('transfer:atlas-server')))
  assert.ok(task?.recommended_context.transfer_contract.workspace_hints.includes('atlas-server'))
  assert.ok(task?.recommended_context.transfer_contract.reuse.some((item) => item.includes('component:atlas-server')))
  assert.ok(task?.recommended_context.transfer_contract.validate_before_use.some((item) => item.includes('confirmar validação transferida')))
  assert.ok(task?.recommended_context.transfer_contract.never_transfer.includes('paths absolutos do Mac'))
  assert.ok(task?.learning_hooks.task_feedback_loop.update_relations.some((item) => item.includes('workspace:atlas-server')))
  assert.ok(task?.learning_hooks.task_feedback_loop.update_relations.some((item) => item.includes('reuso:') && item.includes('atlas-server')))
  assert.ok(task?.learning_hooks.task_feedback_loop.update_mesh.some((item) => item.includes('atlas-server:shared_context')))
  assert.ok(task?.learning_hooks.task_feedback_loop.reason.includes('relação'))
  assert.ok(task?.recommended_context.load_order.some((item) => item.includes('transfer:atlas-server')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('workspace-mesh:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('mesh-route:atlas-server')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('transfer:atlas-server')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('repo-connection:atlas-server')))
  assert.ok(capsule?.continue_learning.task_feedback_loop.update_relations.some((item) => item.includes('workspace:atlas-server')))
  assert.ok(capsule?.continue_learning.task_feedback_loop.update_mesh.some((item) => item.includes('atlas-server:shared_context')))
  assert.ok(capsule?.task_packet?.learning.write_back_after_success.some((item) => item.includes('relation:workspace:atlas-server')))
  assert.ok(capsule?.task_packet?.learning.write_back_after_success.some((item) => item.includes('mesh:atlas-server:shared_context')))
  assert.ok(capsule?.task_packet?.learning.write_back_after_success.some((item) => item.includes('transfer-workspace:atlas-server')))
  assert.ok(capsule?.task_packet?.learning.automation_plan.safe_local.some((item) => item.includes('write-back:relation:workspace:atlas-server')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('conexão:atlas-server')))
  assert.ok(capsule?.avoid_loading.includes('paths absolutos'))
  assert.ok(capsule?.avoid_loading.includes('segredos ou decisões sensíveis'))
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-24T15:30:00Z') : null
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const dirtyRelationArtifact = artifact ? structuredClone(artifact) as typeof artifact : null
  assert.ok(dirtyRelationArtifact?.payload.relation_projection)
  assert.ok(dirtyRelationArtifact.payload.workspace_mesh_projection)
  dirtyRelationArtifact.payload.relation_projection.related_workspaces.unshift({
    workspace_hint: 'atlas-server',
    overlap_score: 100,
    shared_signals: ['operator_input relation signal'],
    shared_languages: ['response_text relation language'],
    shared_commands: ['raw_conversation relation command'],
    shared_context_gold: ['full_message relation gold'],
    shared_validation_plans: ['operator_input relation validation'],
    shared_recovery_patterns: ['response_text relation recovery'],
    shared_spaces: ['raw_conversation relation space'],
    shared_space_brain: ['full_message relation brain'],
    shared_live_memory: ['operator_input relation live'],
    shared_priority_load: ['response_text relation priority'],
    shared_evidence_gates: ['raw_conversation relation evidence'],
    shared_next_session_contracts: ['full_message relation session'],
    shared_dependency_edges: ['operator_input relation dependency'],
    shared_dependency_targets: ['response_text relation target'],
    shared_command_intents: ['raw_conversation relation intent'],
    recommended_transfer: ['full_message relation transfer'],
  })
  dirtyRelationArtifact.payload.relation_projection.transfer_matrix.unshift({
    workspace_hint: 'atlas-server',
    reuse: ['operator_input transfer reuse'],
    revalidate: ['response_text transfer revalidate'],
    do_not_transfer: ['/Users/vitorepf/private/transfer'],
    confidence: 100,
  })
  dirtyRelationArtifact.payload.relation_projection.connection_contracts.unshift({
    workspace_hint: 'atlas-server',
    relationship: 'shared_context',
    load_when: ['raw_conversation contract load'],
    reuse: ['full_message contract reuse'],
    validate: ['operator_input contract validate'],
    never_transfer: ['response_text contract never'],
    confidence: 100,
  })
  dirtyRelationArtifact.payload.workspace_mesh_projection.mesh_hash = 'operator_input mesh hash'
  dirtyRelationArtifact.payload.workspace_mesh_projection.routes.unshift({
    route_id: 'response_text mesh route',
    workspace_hint: 'atlas-server',
    relationship: 'shared_context',
    load_when: ['raw_conversation mesh load'],
    reuse: ['full_message mesh reuse'],
    validate_with: ['operator_input mesh validate'],
    never_transfer: ['response_text mesh never'],
    linked_components: ['raw_conversation mesh component'],
    linked_spaces: ['full_message mesh space'],
    confidence: 100,
  })
  dirtyRelationArtifact.payload.workspace_mesh_projection.next_conversation.load_order.unshift('operator_input mesh next load')
  dirtyRelationArtifact.payload.workspace_mesh_projection.next_conversation.reuse_rules.unshift('response_text mesh reuse rule')
  dirtyRelationArtifact.payload.workspace_mesh_projection.next_conversation.validate_with.unshift('raw_conversation mesh next validate')
  dirtyRelationArtifact.payload.workspace_mesh_projection.next_conversation.human_boundary.unshift('full_message mesh human')
  const dirtyRelationStore = storage()
  saveAwisWorkspaceArtifact(dirtyRelationArtifact, dirtyRelationStore)
  const dirtyRelationArtifacts = loadAwisWorkspaceArtifacts(atlasKey, dirtyRelationStore)
  const dirtyRelationReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyRelationArtifacts)
  const dirtyRelationJson = JSON.stringify({ artifact: dirtyRelationArtifacts[0], replay: dirtyRelationReplay })
  assert.ok(dirtyRelationReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('mesh-route:atlas-server') || pattern.startsWith('repo-contract:atlas-server')))
  assert.doesNotMatch(dirtyRelationJson, /\/Users\/|operator_input relation signal|operator_input relation validation|operator_input relation live|operator_input relation dependency|operator_input transfer reuse|operator_input contract validate|operator_input mesh hash|operator_input mesh validate|operator_input mesh next load|response_text relation language|response_text relation recovery|response_text relation priority|response_text relation target|response_text transfer revalidate|response_text contract never|response_text mesh route|response_text mesh never|response_text mesh reuse rule|raw_conversation relation command|raw_conversation relation space|raw_conversation relation evidence|raw_conversation relation intent|raw_conversation contract load|raw_conversation mesh load|raw_conversation mesh component|raw_conversation mesh next validate|full_message relation gold|full_message relation brain|full_message relation session|full_message relation transfer|full_message contract reuse|full_message mesh reuse|full_message mesh space|full_message mesh human/)
  assert.equal(artifact?.payload.workspace_mesh_projection?.schema_version, 'atlas.awis.workspace_mesh_projection.v1')
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('mesh:mesh-')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('mesh-route:atlas-server')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('repo-contract:atlas-server:shared_context')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.includes('repo-contract-reuse:atlas-server:contexto validado:')))
  assert.ok(replay?.reusable_startup_gold.warnings.some((warning) => warning.includes('repo-contract-never:atlas-server:segredos')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.includes('conexão repo: validar atlas-server')))
  assert.doesNotMatch(JSON.stringify(pack), /\/Users\/|raw_conversation_included":true/)
})

test('AWIS workspace relations promote folder dependency targets and command intents into cross-repo memory', () => {
  const desktopKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas/atlas-desktop', 'atlas-desktop')
  const serverKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas/atlas-server', 'atlas-server')
  const desktopSnapshot = brain({
    rootName: 'Atlas Desktop',
    rootPath: '/Users/vitorepf/develop/Atlas/atlas-desktop',
    signals: ['Tauri'],
    languages: [{ label: 'TypeScript', count: 120 }],
    dependencyEdges: [{
      from: '@atlas/desktop',
      to: '@atlas/domain',
      kind: 'workspace',
      source: 'package.json',
    }],
    commands: [{
      label: 'desktop tests',
      command: 'npm run atlas-ai:test',
      kind: 'test',
      source: 'package.json',
    }],
  })
  const desktopMemory = learnAwisWorkspaceMemory(null, desktopSnapshot, desktopKey).memory
  const serverMemory = learnAwisWorkspaceMemory(null, brain({
    rootName: 'Atlas Server',
    rootPath: '/Users/vitorepf/develop/Atlas/atlas-server',
    signals: ['Laravel'],
    languages: [{ label: 'PHP', count: 120 }],
    dependencyEdges: [{
      from: '@atlas/server',
      to: '@atlas/domain',
      kind: 'workspace',
      source: 'composer.json',
    }],
    commands: [{
      label: 'server tests',
      command: 'php artisan test',
      kind: 'test',
      source: 'artisan',
    }],
  }), serverKey).memory
  const relations = buildAwisWorkspaceRelationProjection({
    [desktopKey]: desktopMemory,
    [serverKey]: serverMemory,
  }, desktopKey)
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: desktopKey,
    workspaceName: 'Atlas Desktop',
    brain: desktopSnapshot,
    memory: desktopMemory,
    relations,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'validar integração @atlas/domain entre desktop e server')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const serverRelation = relations?.related_workspaces.find((workspace) => workspace.workspace_hint === 'atlas-server')
  const serverTransfer = relations?.transfer_matrix.find((transfer) => transfer.workspace_hint === 'atlas-server')
  const serverContract = relations?.connection_contracts.find((contract) => contract.workspace_hint === 'atlas-server')

  assert.ok(serverRelation)
  assert.ok(serverRelation.shared_dependency_targets.includes('target:@atlas/domain'))
  assert.ok(serverRelation.shared_command_intents.includes('validate:auto-validar'))
  assert.ok(serverRelation.recommended_transfer.some((hint) => hint.includes('alvo de dependência compatível: target:@atlas/domain')))
  assert.ok(serverRelation.recommended_transfer.some((hint) => hint.includes('intenção de comando compatível: validate:auto-validar')))
  assert.ok(serverTransfer?.reuse.some((item) => item.includes('alvo dependência:target:@atlas/domain')))
  assert.ok(serverTransfer?.reuse.some((item) => item.includes('intenção comando:validate:auto-validar')))
  assert.ok(serverTransfer?.revalidate.some((item) => item.includes('confirmar alvo de dependência local:target:@atlas/domain')))
  assert.equal(serverContract?.relationship, 'shared_command')
  assert.ok(serverContract?.load_when.some((item) => item.includes('intenção de comando compatível')))
  assert.ok(serverContract?.reuse.some((item) => item.includes('alvo de dependência transferível:target:@atlas/domain')))
  assert.ok(serverContract?.validate.some((item) => item.includes('mapear comando concreto para intenção:validate:auto-validar')))
  assert.equal(JSON.stringify(relations).includes('/Users/vitorepf'), false)
  assert.ok(pack?.startup_briefing?.context_gold.reusable_patterns.some((pattern) => pattern.includes('transfer:atlas-server:alvo dependência:target:@atlas/domain')))
  assert.ok(task?.recommended_context.transfer_contract.task_relevance.some((item) => item.includes('dependência:atlas-server:target:@atlas/domain')))
  assert.ok(task?.recommended_context.transfer_contract.task_relevance.some((item) => item.includes('intenção:atlas-server:validate:auto-validar')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.includes('transfer-relevante:dependência:atlas-server:target:@atlas/domain')))
  assert.ok(task?.recommended_context.related_workspace_hints.some((item) => item.includes('transfer:atlas-server')))
  assert.ok(capsule?.load_first.some((item) => item.includes('transfer-relevance:dependência:atlas-server:target:@atlas/domain')))
  assert.ok(capsule?.use_as_summary.some((item) => item.includes('transfer-relevance:intenção:atlas-server:validate:auto-validar')))
})

test('AWIS repository constellation maps repo relationships into next-conversation gold', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    languages: [
      { label: 'TypeScript', count: 1200 },
      { label: 'PHP', count: 900 },
    ],
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'atlas-server/app/Http/Controllers/AtlasWorkspaceIntelligenceController.php', kind: 'codigo' },
    ],
    commands: [
      { label: 'Desktop AWIS test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Server tests', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test', 'php artisan test'],
    contextGoldLabels: ['component:atlas-desktop', 'component:atlas-server'],
    componentKeys: ['atlas-desktop', 'atlas-server'],
    folderCortexLabels: [
      'area:atlas-desktop:autoload:88',
      'area:atlas-server:autoload:78',
      'validate:atlas-desktop:npm run atlas-ai:test',
      'validate:atlas-server:php artisan test',
    ],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir integração entre desktop e server')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-24T16:15:00Z') : null
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null

  assert.equal(pack?.repository_constellation?.schema_version, 'atlas.awis.repository_constellation_projection.v1')
  assert.ok(pack?.repository_constellation?.constellation_hash.startsWith('repo-constellation-'))
  assert.ok(pack?.repository_constellation?.repositories.some((repo) => repo.key === 'atlas-desktop'))
  assert.ok(pack?.repository_constellation?.repositories.some((repo) => repo.key === 'atlas-server'))
  assert.ok(pack?.repository_constellation?.bridges.some((bridge) => bridge.from === 'atlas-desktop' && bridge.to === 'atlas-server'))
  const learnedBridge = pack?.repository_constellation?.bridges.find((bridge) => bridge.from === 'atlas-desktop' && bridge.to === 'atlas-server')
  assert.ok(learnedBridge?.reason.includes('sessão comprovou alteração conjunta'))
  assert.ok(learnedBridge?.validation_bridge.includes('npm run atlas-ai:test'))
  assert.ok(learnedBridge?.validation_bridge.includes('php artisan test'))
  assert.ok(learnedBridge?.context_bridge.some((item) => item.includes('outcome:bug_fix')))
  assert.ok(learnedBridge?.context_bridge.some((item) => item.includes('outcome-gold:component:atlas-desktop')))
  assert.ok(learnedBridge?.context_bridge.some((item) => item.startsWith('folder-cortex:atlas-desktop:') || item.startsWith('folder-cross:')))
  assert.ok(pack?.repository_constellation?.repositories.some((repo) => repo.key === 'atlas-desktop' && repo.load_when.some((item) => item.startsWith('folder-cortex:'))))
  assert.ok(pack?.repository_constellation?.repositories.some((repo) => repo.key === 'atlas-server' && repo.validate_with.includes('php artisan test')))
  assert.ok(pack?.repository_constellation?.next_conversation.load_first.some((item) => item.includes('atlas-desktop')))
  assert.ok(pack?.repository_constellation?.next_conversation.compare_when.some((item) => item.includes('atlas-desktop') && item.includes('atlas-server')))
  assert.ok(pack?.repository_constellation?.next_conversation.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(pack?.repository_constellation?.next_conversation.validate_with.includes('php artisan test'))
  assert.equal(pack?.live_execution_memory?.schema_version, 'atlas.awis.live_execution_memory_projection.v1')
  assert.ok(pack?.live_execution_memory?.memory_hash.startsWith('live-'))
  assert.ok(pack?.live_execution_memory?.startup_packet.load_first.some((item) => item.includes('atlas-desktop')))
  assert.ok(pack?.live_execution_memory?.startup_packet.validate_before_trust.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(pack?.live_execution_memory?.promotion_rules.promote_to_gold.some((item) => item.includes('validação verde') || item.includes('resultado:')))
  assert.ok(pack?.live_execution_memory?.workspace_learning.repositories.some((item) => item.includes('atlas-desktop')))
  assert.ok(task?.recommended_context.related_workspace_hints.some((item) => item.startsWith('repo:atlas-desktop')))
  assert.ok(task?.recommended_context.related_workspace_hints.some((item) => item.startsWith('live-repo:')))
  assert.ok(task?.learning_hooks.next_session_contract.first_load.some((item) => item.includes('atlas-desktop')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('repo-constellation:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('live:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('repository-constellation:')))
  assert.ok(capsule?.continue_learning.next_session_contract.first_load.some((item) => item.includes('atlas-desktop')))
  assert.equal(artifact?.payload.repository_constellation_projection?.schema_version, 'atlas.awis.repository_constellation_projection.v1')
  assert.equal(artifact?.payload.live_execution_memory_projection?.schema_version, 'atlas.awis.live_execution_memory_projection.v1')
  assert.ok(artifact?.manifest.load_first.some((item) => item.includes('atlas-desktop')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('repo-constellation:repo-constellation-')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('repo-bridge:atlas-desktop->atlas-server')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('repo-cochange:atlas-desktop->atlas-server:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('live-memory:')))
  assert.ok(replay?.cold_start_seed.context_signals.some((signal) => signal.startsWith('live-memory:')))
  assert.ok(replay?.cold_start_seed.context_signals.some((signal) => signal.startsWith('cochange:atlas-desktop->atlas-server:')))
  assert.ok(replay?.cold_start_seed.repository_hints.includes('atlas-desktop'))
  assert.ok(replay?.cold_start_seed.repository_hints.includes('atlas-server'))
  assert.doesNotMatch(JSON.stringify(pack?.live_execution_memory), /\/Users\/|raw_conversation_included":true|source_thread_ids|thread_id/)
  assert.doesNotMatch(JSON.stringify(pack?.repository_constellation), /\/Users\/|raw_conversation_included":true|source_thread_ids|thread_id/)
})

test('AWIS repository constellation replay keeps cross-repo memory without raw workspace leakage', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    commands: [
      { label: 'Desktop AWIS test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Server tests', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  const memory = recordAwisWorkspaceInteraction(learnAwisWorkspaceMemory(null, snapshot, key).memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test', 'php artisan test'],
    contextGoldLabels: ['component:atlas-desktop', 'component:atlas-server'],
    componentKeys: ['atlas-desktop', 'atlas-server'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-26T22:40:00Z') : null
  assert.ok(artifact)
  const projection = artifact.payload.repository_constellation_projection
  assert.ok(projection)
  artifact.payload.repository_constellation_projection = {
    ...projection,
    constellation_hash: '/Users/vitorepf/private/raw-repo-hash',
    repositories: projection.repositories.map((repo) => repo.key === 'atlas-desktop'
      ? {
          ...repo,
          role: 'raw_conversation full_message operator_input',
          stack: [...repo.stack, '/Users/vitorepf/private/stack'],
          commands: [...repo.commands, 'response_text cru'],
          load_when: [...repo.load_when, 'raw_conversation inteira'],
          summarize_when: [...repo.summarize_when, 'operator_input privado'],
          validate_with: [...repo.validate_with, 'full_message content'],
        }
      : repo),
    bridges: projection.bridges.map((bridge) => bridge.from === 'atlas-desktop' && bridge.to === 'atlas-server'
      ? {
          ...bridge,
          reason: 'sessão comprovou alteração conjunta sem raw',
          shared_stack: [...bridge.shared_stack, '/Users/vitorepf/private/shared-stack'],
          validation_bridge: [...bridge.validation_bridge, 'raw_conversation payload'],
          context_bridge: [...bridge.context_bridge, 'response_text bruto'],
        }
      : bridge),
    next_conversation: {
      ...projection.next_conversation,
      load_first: [...projection.next_conversation.load_first, '/Users/vitorepf/private/load'],
      compare_when: [...projection.next_conversation.compare_when, 'operator_input comparar cru'],
      validate_with: [...projection.next_conversation.validate_with, 'full_message validator'],
      preserve_as_artifact: [...projection.next_conversation.preserve_as_artifact, 'raw_conversation artifact'],
      human_boundary: [...projection.next_conversation.human_boundary, 'response_text humano'],
    },
    learning_loop: {
      ...projection.learning_loop,
      promote_when: [...projection.learning_loop.promote_when, 'operator_input promover'],
      revalidate_when: [...projection.learning_loop.revalidate_when, 'raw_conversation revalidar'],
      demote_when: [...projection.learning_loop.demote_when, 'full_message demover'],
    },
  }
  const store = storage()
  saveAwisWorkspaceArtifact(artifact, store)
  const loaded = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const serialized = JSON.stringify({ loaded, replay })

  assert.ok(loaded?.payload.repository_constellation_projection?.bridges.some((bridge) => bridge.from === 'atlas-desktop' && bridge.to === 'atlas-server'))
  assert.ok(replay?.cold_start_seed.context_signals.some((signal) => signal.startsWith('cochange:atlas-desktop->atlas-server:')))
  assert.ok(replay?.cold_start_seed.repository_hints.includes('atlas-desktop'))
  assert.doesNotMatch(serialized, /\/Users\/|operator_input|response_text|full_message|raw_conversation inteira|raw_conversation payload|raw_conversation artifact|"raw_conversation_included":true/)
})

test('AWIS workspace learning projection consolidates outcomes into next-session operating memory', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    commands: [
      { label: 'Desktop test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = learnAwisWorkspaceMemory(memory, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    contextGoldLabels: ['component:atlas-desktop'],
    componentKeys: ['atlas-desktop'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'send_failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npx tsc -b'],
  }).memory
  const topology = buildAwisWorkspaceTopologyProjection(snapshot)
  const learning = buildAwisWorkspaceLearningProjection({ memory, topology, brain: snapshot })
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no desktop e validar com teste')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)

  assert.equal(learning?.schema_version, 'atlas.awis.workspace_learning_projection.v1')
  assert.equal(learning?.maturity, 'learning')
  assert.ok(learning?.trusted_commands.includes('npm run atlas-ai:test'))
  assert.ok(learning?.task_memory.task_kinds.includes('bug_fix'))
  assert.ok(learning?.task_memory.trusted_task_commands.includes('npm run atlas-ai:test'))
  assert.ok(learning?.task_memory.validation_plans.some((plan) => (
    plan.task_kind === 'bug_fix'
    && plan.commands.includes('npm run atlas-ai:test')
    && plan.context_gold.includes('component:atlas-desktop')
    && plan.component_keys.includes('atlas-desktop')
    && plan.success_count === 1
    && plan.confidence >= 60
  )))
  assert.ok(learning?.caution_signals.some((signal) => signal.includes('envio')))
  assert.equal(learning?.safety.absolute_paths_included, false)
  assert.equal(pack?.learning?.schema_version, 'atlas.awis.workspace_learning_projection.v1')
  assert.equal(pack?.startup_snapshot?.readiness.learning_ready, true)
  assert.ok(pack?.startup_briefing?.focus.load_sequence.includes('workspace_learning'))
  assert.ok(pack?.startup_playbook?.context_loading.must_load.includes('aprendizado consolidado'))
  assert.ok(pack?.startup_briefing?.context_gold.reusable_patterns.includes('task-memory:bug_fix'))
  assert.ok(pack?.startup_playbook?.context_loading.optional.includes('tarefa aprendida:bug_fix'))
  assert.ok(pack?.startup_playbook?.risk_controls.some((control) => control.includes('envio')))
  assert.ok(task?.execution_plan.validation_commands.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('validation-plan:bug_fix:')))
  assert.doesNotMatch(JSON.stringify(pack), /\/Users\/|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS workspace startup briefing compiles the next conversation gold without raw context', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const startupBrain = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md', kind: 'documento' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
    ],
  })
  const memory = recordAwisWorkspaceInteraction(learnAwisWorkspaceMemory(null, brain(), key).memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Cérebro vivo AWIS',
      thread_count: 3,
      message_count: 42,
      mode_count: 2,
      decision_count: 2,
      pending_count: 0,
      risk_count: 1,
      artifact_count: 2,
      reusable_by: ['Atlas AI', 'packs'],
      recommended_use: ['reusar decisões do Space'],
      sessions: [],
    },
  ])
  const nextSessionBrain = buildAwisWorkspaceNextSessionBrainProjection({
    schema_version: 'atlas.awis.workspace_next_session_brain.v1',
    status: 'ready',
    brain_hash: 'sha256:brain',
    resume_packet: {
      load_order: ['workspace_binding', 'repository_inventory'],
      focused_repositories: [
        { repo_key: 'atlas-desktop', score: 96, reasons: ['surface active'], stack: ['typescript'] },
      ],
      focused_areas: ['atlas-ai'],
      owner_docs: ['docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'],
      artifact_refs: ['awis_artifact:abc'],
    },
    execution_priority: [
      { command: 'npm run atlas-ai:test', why: 'validate AWIS surface', requires_operator_approval: true },
    ],
    context_loading_plan: {
      stack_tags: ['typescript', 'tauri'],
      command_hints: ['npx tsc -b'],
      outcome_ranked_commands: ['npm run atlas-ai:test'],
    },
  })
  const handoffPack = buildAwisWorkspaceHandoffProjection({
    schema_version: 'atlas.workspace_handoff_pack.v1',
    status: 'ready',
    consumer: 'atlas_dev',
    handoff_hash: 'sha256:handoff',
    context_units: [{ artifact_type: 'context_pack', artifact_hash: 'sha256:context', status: 'ready' }],
    test_contract: {
      focused_tests: ['npm run atlas-ai:test'],
      fallback_tests: ['npx tsc -b'],
    },
    scope_guard: {
      sensitive_areas: ['atlas-ai'],
      owner_docs: ['docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'],
    },
  })
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: startupBrain,
    memory,
    spaces,
    nextSessionBrain,
    handoffPack,
  })
  const briefing = pack?.startup_briefing
  const directTopology = buildAwisWorkspaceTopologyProjection(startupBrain)
  const directLearning = buildAwisWorkspaceLearningProjection({
    memory,
    topology: directTopology,
    brain: startupBrain,
  })
  const directBriefing = pack?.startup_snapshot
    ? buildAwisWorkspaceStartupBriefing({
        workspaceName: 'Atlas',
        startupSnapshot: pack.startup_snapshot,
        brain: startupBrain,
        topology: directTopology,
        memory,
        learning: directLearning,
        evolution: null,
        spaces,
        artifactReplay: null,
        nextSessionBrain,
        handoffPack,
      })
    : null

  assert.equal(briefing?.schema_version, 'atlas.awis.workspace_startup_briefing.v1')
  assert.equal(briefing?.never_start_cold, true)
  assert.equal(briefing?.focus.primary, 'Cérebro vivo AWIS')
  assert.ok(briefing?.focus.load_sequence.includes('workspace_binding'))
  assert.ok(briefing?.focus.load_sequence.includes('folder_knowledge_docs'))
  assert.ok(briefing?.focus.load_sequence.includes('folder_manifests'))
  assert.ok(briefing?.focus.repositories.includes('atlas-desktop'))
  assert.ok(briefing?.focus.owner_docs.includes('docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'))
  assert.ok(briefing?.context_gold.commands.includes('npm run atlas-ai:test'))
  assert.ok(briefing?.context_gold.reusable_patterns.some((item) => item.startsWith('folder-doc:')))
  assert.ok(briefing?.context_gold.reusable_patterns.some((item) => item.startsWith('folder-manifest:')))
  assert.ok(briefing?.automation_plan.tests_to_run.includes('npx tsc -b'))
  assert.ok(briefing?.automation_plan.tests_to_run.includes('npm run atlas-ai:test'))
  assert.ok(briefing?.context_gold.handoff_units.includes('context_pack'))
  assert.deepEqual(directBriefing, briefing)
  assert.equal(briefing?.safety.provider_safe, true)
  assert.equal(briefing?.safety.absolute_paths_included, false)
  assert.doesNotMatch(JSON.stringify(briefing), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS startup briefing persists through Artifact Lake replay', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const memory = learnAwisWorkspaceMemory(null, brain(), key).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
  })
  assert.ok(pack?.startup_briefing)
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-24T13:00:00Z') : null
  assert.ok(artifact)
  const startupPlaybook = artifact.payload.startup_playbook
  assert.ok(startupPlaybook)
  artifact.payload.startup_playbook = {
    ...startupPlaybook,
    generated_for_workspace: '/Users/vitorepf/develop/Atlas',
    context_loading: {
      must_load: [...startupPlaybook.context_loading.must_load, '/Users/vitorepf/private/raw', 'operator_input privado'],
      optional: [...startupPlaybook.context_loading.optional, 'response_text cru'],
      avoid_loading: [...startupPlaybook.context_loading.avoid_loading, 'raw_conversation inteira'],
    },
    execution: {
      primary_validation_commands: [...startupPlaybook.execution.primary_validation_commands, 'npm run atlas-ai:test'],
      fallback_validation_commands: [...startupPlaybook.execution.fallback_validation_commands, 'full_message content'],
      requires_local_folder: startupPlaybook.execution.requires_local_folder === true,
    },
    collaboration: {
      resume_space: '/Users/vitorepf/private/space',
      compare_sessions: startupPlaybook.collaboration.compare_sessions === true,
      related_workspace_hints: startupPlaybook.collaboration.related_workspace_hints,
    },
    learning_hooks: startupPlaybook.learning_hooks,
    risk_controls: [...startupPlaybook.risk_controls, 'response_text bruto'],
  }
  saveAwisWorkspaceArtifact(artifact, store)

  const loaded = loadAwisWorkspaceArtifacts(key, store)
  const replay = loadAwisWorkspaceArtifactReplayProjection(key, store)

  assert.equal(loaded[0]?.payload.startup_briefing?.schema_version, 'atlas.awis.workspace_startup_briefing.v1')
  assert.equal(loaded[0]?.payload.startup_playbook?.schema_version, 'atlas.awis.workspace_startup_playbook.v1')
  assert.equal(loaded[0]?.payload.learning_projection?.schema_version, 'atlas.awis.workspace_learning_projection.v1')
  assert.equal(loaded[0]?.payload.topology_projection?.schema_version, 'atlas.awis.workspace_topology_projection.v1')
  assert.equal(loaded[0]?.payload.startup_briefing?.never_start_cold, true)
  assert.notEqual(loaded[0]?.payload.startup_playbook?.generated_for_workspace, '/Users/vitorepf/develop/Atlas')
  assert.equal(loaded[0]?.payload.startup_playbook?.collaboration.resume_space, null)
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('load:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('playbook:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('maturity:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('component:')))
  assert.doesNotMatch(JSON.stringify(loaded), /\/Users\/|operator_input privado|response_text|full_message|raw_conversation inteira|"raw_conversation_included":true/)
})

test('AWIS continuity projection restores the next session from Spaces, tasks and artifacts', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    commands: [
      { label: 'Desktop test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    adaptiveLearningLabels: ['compound:Space+replay validado', 'plano adaptativo validado'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npx tsc -b'],
    adaptiveLearningLabels: ['modo guardado precisa revalidar'],
  }).memory
  memory = recordAwisWorkspaceMaintenance(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T21:45:00Z',
    action: 'update_space_pack',
    label: 'Cérebro vivo AWIS',
    status: 'succeeded',
    reason: 'Space forte virou contexto quente',
    evidence: ['4 sessões', 'contexto pronto'],
  }).memory
  memory = recordAwisWorkspaceMaintenance(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T21:46:00Z',
    action: 'revalidate_command',
    label: 'npx tsc -b',
    status: 'failed',
    reason: 'typecheck precisa nova evidência',
    evidence: ['exit 2'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T21:47:00Z',
    channel: 'workbench',
    status: 'succeeded',
    provider: 'atlas_decide',
    model: null,
    latencyMs: 360,
    contextPackApplied: true,
    taskKind: 'code_change',
    adaptiveLearningLabels: ['mode:compound:88', 'success:registrar resultado real'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'AWIS cérebro vivo',
      thread_count: 4,
      message_count: 60,
      mode_count: 2,
      decision_count: 4,
      pending_count: 1,
      risk_count: 1,
      artifact_count: 2,
      reusable_by: ['Atlas AI', 'Code'],
      recommended_use: ['restaurar contexto do Space'],
      sessions: [],
    },
  ])
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(firstPack?.continuity)
  const artifact = firstPack ? buildAwisWorkspaceArtifact(firstPack, '2026-05-24T14:00:00Z') : null
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const nextPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    artifactReplay: replay,
  })
  const directContinuity = buildAwisWorkspaceContinuityProjection({
    workspaceName: 'Atlas',
    startupBriefing: nextPack?.startup_briefing ?? null,
    startupPlaybook: nextPack?.startup_playbook ?? null,
    topology: nextPack?.topology ?? null,
    memory,
    learning: nextPack?.learning ?? null,
    spaces,
    artifactLake: null,
    artifactReplay: replay,
    nextSessionBrain: nextPack?.next_session_brain ?? null,
    handoffPack: null,
  })
  const task = buildAwisWorkspaceTaskContextProjection(nextPack, 'corrigir bug no AWIS desktop')

  assert.equal(nextPack?.continuity?.schema_version, 'atlas.awis.workspace_continuity_projection.v1')
  assert.ok(nextPack?.continuity?.restore_priority.some((item) => item.kind === 'space' && item.label === 'AWIS cérebro vivo'))
  assert.ok(nextPack?.continuity?.hot_context.task_kinds.includes('bug_fix'))
  assert.ok(nextPack?.continuity?.next_session_plan.validate_with.includes('npm run atlas-ai:test'))
  assert.equal(nextPack?.continuity?.learning_hooks.capture_outcome, true)
  assert.equal(nextPack?.continuity?.safety.raw_conversation_included, false)
  assert.ok(task?.recommended_context.spaces.some((item) => item.includes('AWIS cérebro vivo')))
  assert.ok(task?.recommended_context.load_order.length)
  assert.equal(artifact?.payload.continuity_projection?.schema_version, 'atlas.awis.workspace_continuity_projection.v1')
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('restore:')))
  assert.deepEqual(directContinuity, nextPack?.continuity)
  assert.doesNotMatch(JSON.stringify(nextPack?.continuity), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS automation projection turns continuity into a safe maintenance loop', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    truncated: true,
    commands: [
      { label: 'Desktop test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    adaptiveLearningLabels: ['compound:Space+replay validado', 'plano adaptativo validado'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npx tsc -b'],
    adaptiveLearningLabels: ['modo guardado precisa revalidar'],
  }).memory
  memory = recordAwisWorkspaceMaintenance(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T21:45:00Z',
    action: 'update_space_pack',
    label: 'Cérebro vivo AWIS',
    status: 'succeeded',
    reason: 'Space forte virou contexto quente',
    evidence: ['4 sessões', 'contexto pronto'],
  }).memory
  memory = recordAwisWorkspaceMaintenance(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T21:46:00Z',
    action: 'revalidate_command',
    label: 'npx tsc -b',
    status: 'failed',
    reason: 'typecheck precisa nova evidência',
    evidence: ['exit 2'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'AWIS manutenção',
      thread_count: 3,
      message_count: 30,
      mode_count: 1,
      decision_count: 2,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Atlas AI'],
      recommended_use: ['manter contexto vivo'],
      sessions: [],
    },
  ])
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(pack?.automation)
  const directAutomation = buildAwisWorkspaceAutomationProjection({
    startupBriefing: pack.startup_briefing,
    startupPlaybook: pack.startup_playbook,
    continuity: pack.continuity,
    memory,
    learning: pack.learning ?? null,
    spaces,
    artifactReplay: null,
    handoffPack: null,
  })
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-24T14:30:00Z') : null
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const dirtyAutomationArtifact = artifact ? structuredClone(artifact) as typeof artifact : null
  assert.ok(dirtyAutomationArtifact?.payload.automation_projection)
  dirtyAutomationArtifact.payload.automation_projection.maintenance_queue.unshift({
    action: 'record_outcome',
    label: 'operator_input manutenção',
    reason: 'response_text reason',
    priority: 'high',
    requires_human_confirmation: false,
  })
  dirtyAutomationArtifact.payload.automation_projection.autopilot_context.before_send.unshift('/Users/vitorepf/private/before')
  dirtyAutomationArtifact.payload.automation_projection.autopilot_context.after_send.unshift('raw_conversation after')
  dirtyAutomationArtifact.payload.automation_projection.feedback_loop.metrics_to_watch.unshift('full_message metric')
  dirtyAutomationArtifact.payload.automation_projection.feedback_loop.promote_when.unshift('operator_input promote')
  dirtyAutomationArtifact.payload.automation_projection.feedback_loop.demote_when.unshift('response_text demote')
  saveAwisWorkspaceArtifact(dirtyAutomationArtifact, store)
  const dirtyAutomationReplay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const dirtyAutomationJson = JSON.stringify({
    loaded: loadAwisWorkspaceArtifacts(key, store)[0],
    replay: dirtyAutomationReplay,
  })
  assert.ok(dirtyAutomationReplay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('manter:')))
  assert.doesNotMatch(dirtyAutomationJson, /\/Users\/|operator_input manutenção|operator_input promote|response_text reason|response_text demote|raw_conversation after|full_message metric/)

  assert.equal(pack.automation.schema_version, 'atlas.awis.workspace_automation_projection.v1')
  assert.ok(pack.automation.maintenance_queue.some((item) => item.action === 'refresh_folder_map'))
  assert.ok(pack.automation.maintenance_queue.some((item) => item.action === 'record_outcome'))
  assert.ok(pack.automation.maintenance_queue.some((item) => item.action === 'revalidate_command'))
  assert.ok(pack.automation.maintenance_queue.some((item) => item.action === 'transfer_learning' && item.label.includes('compound')))
  assert.ok(pack.automation.maintenance_queue.some((item) => item.action === 'revalidate_context' && item.label.includes('revalidar')))
  assert.ok(pack.automation.autopilot_context.before_send.includes('Atualizar mapa local'))
  assert.ok(pack.automation.autopilot_context.before_send.some((item) => item.includes('revalidar')))
  assert.ok(pack.automation.autopilot_context.after_send.includes('Registrar resultado da sessão'))
  assert.ok(pack.automation.autopilot_context.after_send.some((item) => item.includes('compound')))
  assert.ok(pack.automation.feedback_loop.promote_when.some((item) => item.includes('plano adaptativo validado')))
  assert.equal(pack.automation.safety.external_side_effects_allowed, false)
  assert.equal(artifact?.payload.automation_projection?.schema_version, 'atlas.awis.workspace_automation_projection.v1')
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('manter:')))
  assert.deepEqual(directAutomation, pack.automation)
  assert.doesNotMatch(JSON.stringify(pack.automation), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS confidence projection ranks commands, Spaces, artifacts and transfers', () => {
  const atlasKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const serverKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas/atlas-server', 'atlas-server')
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    commands: [
      { label: 'Desktop test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, atlasKey).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: atlasKey,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: atlasKey,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'send_failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npx tsc -b'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'AWIS confiança',
      thread_count: 4,
      message_count: 64,
      mode_count: 2,
      decision_count: 3,
      pending_count: 1,
      risk_count: 1,
      artifact_count: 2,
      reusable_by: ['Atlas AI', 'Code'],
      recommended_use: ['usar contexto comprovado'],
      sessions: [],
    },
  ])
  const serverMemory = learnAwisWorkspaceMemory(null, brain({
    rootName: 'Atlas Server',
    rootPath: '/Users/vitorepf/develop/Atlas/atlas-server',
    signals: ['Laravel', 'Tauri'],
    languages: [{ label: 'TypeScript', count: 20 }],
    commands: [{ label: 'Desktop test', command: 'npm run atlas-ai:test', kind: 'test', source: 'package.json' }],
  }), serverKey).memory
  const relations = buildAwisWorkspaceRelationProjection({ [atlasKey]: memory, [serverKey]: serverMemory }, atlasKey)
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: atlasKey,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    relations,
  })
  assert.ok(firstPack)
  const artifact = buildAwisWorkspaceArtifact(firstPack, '2026-05-24T15:00:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: atlasKey,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    relations,
    artifactReplay: replay,
  })
  const directConfidence = buildAwisWorkspaceConfidenceProjection({
    memory,
    learning: pack?.learning ?? null,
    relations,
    spaces,
    artifactLake: null,
    artifactReplay: replay,
    continuity: pack?.continuity ?? null,
    automation: pack?.automation ?? null,
    handoffPack: null,
  })
  const finalArtifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-24T15:01:00Z') : null
  const finalReplay = finalArtifact ? buildAwisWorkspaceArtifactReplayProjection([finalArtifact]) : null
  const dirtyConfidenceArtifact = finalArtifact ? structuredClone(finalArtifact) as typeof finalArtifact : null
  assert.ok(dirtyConfidenceArtifact?.payload.confidence_projection)
  dirtyConfidenceArtifact.payload.confidence_projection.ranked.commands.unshift({
    label: '/Users/vitorepf/private/confidence-command',
    score: 99,
    evidence: ['operator_input evidence'],
    caution: 'response_text caution',
  })
  dirtyConfidenceArtifact.payload.confidence_projection.ranked.spaces.unshift({
    label: 'raw_conversation space',
    score: 88,
    evidence: ['full_message space evidence'],
    caution: null,
  })
  dirtyConfidenceArtifact.payload.confidence_projection.decision_policy.prefer.unshift('operator_input prefer')
  dirtyConfidenceArtifact.payload.confidence_projection.decision_policy.require_confirmation_for.unshift('response_text confirm')
  dirtyConfidenceArtifact.payload.confidence_projection.decision_policy.avoid_until_revalidated.unshift('raw_conversation avoid')
  const dirtyConfidenceStore = storage()
  saveAwisWorkspaceArtifact(dirtyConfidenceArtifact, dirtyConfidenceStore)
  const dirtyConfidenceArtifacts = loadAwisWorkspaceArtifacts(atlasKey, dirtyConfidenceStore)
  const dirtyConfidenceReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyConfidenceArtifacts)
  const dirtyConfidenceJson = JSON.stringify({ artifact: dirtyConfidenceArtifacts[0], replay: dirtyConfidenceReplay })
  assert.ok(dirtyConfidenceReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('confidence-command:')))
  assert.doesNotMatch(dirtyConfidenceJson, /\/Users\/|operator_input evidence|operator_input prefer|response_text caution|response_text confirm|raw_conversation space|raw_conversation avoid|full_message space evidence/)

  assert.equal(pack?.confidence?.schema_version, 'atlas.awis.workspace_confidence_projection.v1')
  assert.ok(pack?.confidence?.ranked.commands.some((item) => item.label === 'npm run atlas-ai:test' && item.score >= 70))
  assert.ok(pack?.confidence?.ranked.commands.some((item) => item.label === 'npx tsc -b' && item.caution))
  assert.ok(pack?.confidence?.ranked.spaces.some((item) => item.label === 'AWIS confiança' && item.caution))
  assert.ok(pack?.confidence?.ranked.artifacts.some((item) => item.label === replay?.latest_artifact_hash))
  assert.ok(pack?.confidence?.ranked.transfers.some((item) => item.label === 'atlas-server'))
  assert.ok(pack?.confidence?.decision_policy.prefer.some((item) => item.startsWith('comando:')))
  assert.ok(pack?.confidence?.decision_policy.require_confirmation_for.some((item) => item.includes('npx tsc -b')))
  assert.equal(pack?.confidence?.safety.raw_conversation_included, false)
  assert.equal(pack?.confidence?.safety.absolute_paths_included, false)
  assert.equal(finalArtifact?.payload.confidence_projection?.schema_version, 'atlas.awis.workspace_confidence_projection.v1')
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('confidence-command:')))
  assert.deepEqual(directConfidence, pack?.confidence)
  assert.doesNotMatch(JSON.stringify(pack?.confidence), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS living graph connects workspace, Spaces, artifacts, tasks and related workspaces', () => {
  const atlasKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const serverKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas/atlas-server', 'atlas-server')
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md', kind: 'documento' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, atlasKey).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: atlasKey,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
  }).memory
  const serverMemory = learnAwisWorkspaceMemory(null, brain({
    rootName: 'Atlas Server',
    rootPath: '/Users/vitorepf/develop/Atlas/atlas-server',
    signals: ['Laravel', 'Tauri'],
    languages: [{ label: 'TypeScript', count: 20 }],
    commands: [{ label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'package.json' }],
  }), serverKey).memory
  const relations = buildAwisWorkspaceRelationProjection({ [atlasKey]: memory, [serverKey]: serverMemory }, atlasKey)
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Fluxo Atlas AI',
      thread_count: 3,
      message_count: 28,
      mode_count: 2,
      decision_count: 2,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code', 'Forge'],
      recommended_use: ['alimentar contexto seguro'],
      sessions: [
        { title: 'corrigir drag and drop', mode: 'dev', message_count: 12, last_active_at: '2026-05-24T12:00:00Z', provider: 'atlas' },
      ],
    },
  ])
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: atlasKey,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    relations,
  })
  assert.ok(firstPack)
  const artifact = buildAwisWorkspaceArtifact(firstPack, '2026-05-24T16:00:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: atlasKey,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    relations,
    artifactReplay: replay,
  })
  assert.ok(pack?.living_graph)
  const directGraph = buildAwisWorkspaceLivingGraphProjection({
    workspaceName: 'Atlas',
    topology: pack.topology,
    learning: pack.learning ?? null,
    relations,
    spaces,
    artifactReplay: replay,
    continuity: pack.continuity,
    automation: pack.automation,
    confidence: pack.confidence,
    nextSessionBrain: pack.next_session_brain,
    handoffPack: null,
  })
  const finalArtifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T16:01:00Z')
  const finalReplay = finalArtifact ? buildAwisWorkspaceArtifactReplayProjection([finalArtifact]) : null
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no Atlas Desktop e rodar testes')
  const dirtyGraphArtifact = finalArtifact ? structuredClone(finalArtifact) as typeof finalArtifact : null
  assert.ok(dirtyGraphArtifact?.payload.living_graph_projection)
  dirtyGraphArtifact.payload.living_graph_projection.nodes.unshift({
    key: 'atlas-desktop',
    kind: 'component',
    label: 'operator_input graph label',
    role: 'response_text graph role',
    confidence: 100,
    evidence: ['raw_conversation graph evidence'],
  })
  dirtyGraphArtifact.payload.living_graph_projection.edges.unshift({
    from: 'atlas-desktop',
    to: 'atlas-server',
    reason: 'full_message graph reason',
    strength: 100,
  })
  dirtyGraphArtifact.payload.living_graph_projection.golden_path.unshift('/Users/vitorepf/private/graph')
  dirtyGraphArtifact.payload.living_graph_projection.autopilot_hints.before_send.unshift('operator_input graph before')
  dirtyGraphArtifact.payload.living_graph_projection.autopilot_hints.after_send.unshift('response_text graph after')
  dirtyGraphArtifact.payload.living_graph_projection.autopilot_hints.on_startup.unshift('raw_conversation graph startup')
  const dirtyGraphStore = storage()
  saveAwisWorkspaceArtifact(dirtyGraphArtifact, dirtyGraphStore)
  const dirtyGraphArtifacts = loadAwisWorkspaceArtifacts(atlasKey, dirtyGraphStore)
  const dirtyGraphReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyGraphArtifacts)
  const dirtyGraphJson = JSON.stringify({ artifact: dirtyGraphArtifacts[0], replay: dirtyGraphReplay })
  assert.ok(dirtyGraphReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('graph-route:') || pattern.startsWith('graph-node:')))
  assert.doesNotMatch(dirtyGraphJson, /\/Users\/|operator_input graph label|operator_input graph before|response_text graph role|response_text graph after|raw_conversation graph evidence|raw_conversation graph startup|full_message graph reason/)

  assert.equal(pack.living_graph.schema_version, 'atlas.awis.workspace_living_graph_projection.v1')
  assert.ok(pack.living_graph.nodes.some((node) => node.kind === 'component'))
  assert.ok(pack.living_graph.nodes.some((node) => node.kind === 'command'))
  assert.ok(pack.living_graph.nodes.some((node) => node.kind === 'space'))
  assert.ok(pack.living_graph.nodes.some((node) => node.kind === 'artifact'))
  assert.ok(pack.living_graph.nodes.some((node) => node.kind === 'task_memory'))
  assert.ok(pack.living_graph.nodes.some((node) => node.kind === 'related_workspace'))
  assert.ok(pack.living_graph.edges.length > 0)
  assert.ok(pack.living_graph.golden_path.length > 0)
  assert.ok(pack.living_graph.autopilot_hints.on_startup.length > 0)
  assert.equal(pack.living_graph.safety.raw_conversation_included, false)
  assert.equal(pack.living_graph.safety.absolute_paths_included, false)
  assert.equal(finalArtifact?.payload.living_graph_projection?.schema_version, 'atlas.awis.workspace_living_graph_projection.v1')
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('graph-route:') || pattern.startsWith('graph-node:')))
  assert.ok(task?.recommended_context.load_order.some((item) => pack.living_graph?.golden_path.includes(item)))
  assert.deepEqual(directGraph, pack.living_graph)
  assert.doesNotMatch(JSON.stringify(pack.living_graph), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS session gold distills real outcomes into reusable operational memory', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test', 'npx tsc -b'],
    componentKeys: ['atlas-desktop'],
    contextGoldLabels: ['component:atlas-desktop'],
    spaceLabels: ['Cérebro vivo AWIS'],
    liveMemoryLabels: ['workspace_live_execution_memory'],
    priorityLoadLabels: ['atlas-desktop'],
    evidenceGateLabels: ['trusted:component:atlas-desktop'],
    nextSessionLabels: [
      'load:full:atlas-desktop',
      'validate:npm run atlas-ai:test',
      'promote:validação verde:npm run atlas-ai:test',
    ],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'send_failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    evidenceGateLabels: ['verify:validar:npm run atlas-ai:test', 'stale:component:atlas-desktop'],
    recoveryLabels: ['fallback:npx tsc -b', 'demote:ouro:component:atlas-desktop'],
  }).memory
  assert.ok(memory.operationalSignals.some((signal) => signal.label === 'comando precisa revalidar:npm run atlas-ai:test'))
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  assert.ok(pack?.session_gold)
  const directGold = buildAwisWorkspaceSessionGoldProjection({
    memory,
    learning: pack.learning ?? null,
  })
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-24T17:00:00Z') : null
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const replayOnlyPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    artifactReplay: replay,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no desktop e validar')

  assert.equal(pack.session_gold.schema_version, 'atlas.awis.workspace_session_gold_projection.v1')
  assert.ok(pack.session_gold.strongest_outcomes.some((outcome) => outcome.label.includes('bug_fix')))
  assert.ok(pack.session_gold.proven_commands.some((command) => command.command === 'npm run atlas-ai:test'))
  assert.ok(pack.session_gold.recovery_patterns.some((pattern) => pattern.includes('send_failed')))
  assert.ok(pack.session_gold.recovery_patterns.some((pattern) => pattern.includes('recovery:fallback:npx tsc -b')))
  assert.ok(pack.session_gold.strongest_outcomes.some((outcome) => outcome.label.includes('evidence:component:atlas-desktop')))
  assert.ok(pack.session_gold.next_session_hooks.before_send.some((hook) => hook.includes('carregar contrato aprendido: full:atlas-desktop')))
  assert.ok(pack.session_gold.next_session_hooks.after_send.some((hook) => hook.includes('promover contrato aprendido: validação verde:npm run atlas-ai:test')))
  assert.ok(pack.session_gold.next_session_hooks.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(pack.memory?.operational.context_gold.promoted.includes('component:atlas-desktop'))
  assert.ok(pack.memory?.operational.context_gold.promoted.includes('space:Cérebro vivo AWIS'))
  assert.ok(pack.memory?.operational.context_gold.promoted.includes('live-memory:workspace_live_execution_memory'))
  assert.ok(pack.memory?.operational.context_gold.promoted.includes('priority:atlas-desktop'))
  assert.equal(artifact?.payload.session_gold_projection?.schema_version, 'atlas.awis.workspace_session_gold_projection.v1')
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('session-gold:')))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('proven-command:npm run atlas-ai:test')))
  assert.ok(replay?.cold_start_seed.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('session-recovery:')))
  assert.ok(replay?.cold_start_seed.automation_hooks.some((item) => item.startsWith('session-gold:')))
  assert.ok(replayOnlyPack?.next_session_brain?.load_order.some((item) => item.startsWith('session-gold:')))
  assert.ok(replayOnlyPack?.next_session_brain?.execution_priority.some((priority) => priority.command === 'npm run atlas-ai:test'))
  assert.ok(replayOnlyPack?.next_session_brain?.context_loading.automation_hooks.some((item) => item.startsWith('session-gold:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('session-gold:') || pattern.startsWith('proven-command:')))
  assert.ok(task?.execution_plan.validation_commands.includes('npm run atlas-ai:test'))
  assert.deepEqual(directGold, pack.session_gold)
  assert.doesNotMatch(JSON.stringify(pack.session_gold), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS context kernel budgets the next send from living workspace evidence', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md', kind: 'documento' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test', 'npx tsc -b'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Fluxo Atlas AI',
      thread_count: 3,
      message_count: 32,
      mode_count: 2,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code'],
      recommended_use: ['alimentar contexto seguro'],
      sessions: [
        { title: 'corrigir AWIS', mode: 'dev', message_count: 16, last_active_at: '2026-05-24T12:00:00Z', provider: 'atlas' },
      ],
    },
  ])
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(firstPack)
  const artifact = buildAwisWorkspaceArtifact(firstPack, '2026-05-24T18:00:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    artifactReplay: replay,
  })
  assert.ok(pack?.context_kernel)
  const directKernel = buildAwisWorkspaceContextKernelProjection({
    topology: pack.topology,
    learning: pack.learning ?? null,
    sessionGold: pack.session_gold,
    relations: null,
    spaces,
    artifactReplay: replay,
    continuity: pack.continuity,
    automation: pack.automation,
    confidence: pack.confidence,
    livingGraph: pack.living_graph,
    nextSessionBrain: pack.next_session_brain,
    handoffPack: null,
  })
  const finalArtifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T18:01:00Z')
  const finalReplay = finalArtifact ? buildAwisWorkspaceArtifactReplayProjection([finalArtifact]) : null
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug do AWIS e rodar testes')

  assert.equal(pack.context_kernel.schema_version, 'atlas.awis.workspace_context_kernel_projection.v1')
  assert.ok(['balanced', 'deep'].includes(pack.context_kernel.budget.mode))
  assert.ok(pack.context_kernel.priority_load.some((item) => item.kind === 'session_gold'))
  assert.ok(pack.context_kernel.priority_load.some((item) => item.kind === 'space'))
  assert.ok(pack.context_kernel.validation_plan.commands.includes('npm run atlas-ai:test'))
  assert.ok(pack.context_kernel.compression_plan.omit.includes('conversa bruta completa sem pedido explícito'))
  assert.equal(pack.context_kernel.learning_contract.capture_outcome, true)
  assert.equal(pack.context_kernel.safety.raw_conversation_included, false)
  assert.equal(finalArtifact?.payload.context_kernel_projection?.schema_version, 'atlas.awis.workspace_context_kernel_projection.v1')
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('kernel-load:')))
  assert.ok(finalReplay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('kernel: carregar')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('session_gold:') || item.startsWith('space:')))
  assert.ok(task?.execution_plan.commands_to_avoid.includes('conversa bruta completa sem pedido explícito'))
  assert.deepEqual(directKernel, pack.context_kernel)
  assert.doesNotMatch(JSON.stringify(pack.context_kernel), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS self improvement turns outcomes into a provider-safe evolution queue', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const serverKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas/atlas-server', 'atlas-server')
  const snapshot = brain({
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
  }).memory
  const serverMemory = learnAwisWorkspaceMemory(null, brain({
    rootName: 'Atlas Server',
    rootPath: '/Users/vitorepf/develop/Atlas/atlas-server',
    signals: ['Laravel', 'Tauri'],
    languages: [{ label: 'TypeScript', count: 20 }],
    commands: [{ label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'package.json' }],
  }), serverKey).memory
  const relations = buildAwisWorkspaceRelationProjection({ [key]: memory, [serverKey]: serverMemory }, key)
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'AWIS evolução',
      thread_count: 2,
      message_count: 18,
      mode_count: 1,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code'],
      recommended_use: ['promover contexto bom'],
      sessions: [],
    },
  ])
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    relations,
  })
  assert.ok(firstPack)
  const artifact = buildAwisWorkspaceArtifact(firstPack, '2026-05-24T19:00:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    relations,
    artifactReplay: replay,
  })
  assert.ok(pack?.self_improvement)
  const directSelfImprovement = buildAwisWorkspaceSelfImprovementProjection({
    memory,
    learning: pack.learning ?? null,
    sessionGold: pack.session_gold,
    relations,
    spaces,
    artifactReplay: replay,
    continuity: pack.continuity,
    automation: pack.automation,
    confidence: pack.confidence,
    contextKernel: pack.context_kernel,
  })
  const finalArtifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T19:01:00Z')
  const finalReplay = finalArtifact ? buildAwisWorkspaceArtifactReplayProjection([finalArtifact]) : null
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug e validar AWIS')

  assert.equal(pack.self_improvement.schema_version, 'atlas.awis.workspace_self_improvement_projection.v1')
  assert.ok(pack.self_improvement.improvement_queue.some((item) => item.action === 'promote_command'))
  assert.ok(pack.self_improvement.improvement_queue.some((item) => item.action === 'record_outcome'))
  assert.ok(pack.self_improvement.improvement_queue.some((item) => item.action === 'update_space_pack'))
  assert.ok(pack.self_improvement.promotion_policy.promote_when.length > 0)
  assert.ok(pack.self_improvement.next_review.validate_with.includes('npm run atlas-ai:test'))
  assert.equal(pack.self_improvement.safety.external_side_effects_allowed, false)
  assert.equal(finalArtifact?.payload.self_improvement_projection?.schema_version, 'atlas.awis.workspace_self_improvement_projection.v1')
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('self-improve:')))
  assert.ok(finalReplay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('evoluir:')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('melhoria:')))
  assert.deepEqual(directSelfImprovement, pack.self_improvement)
  assert.doesNotMatch(JSON.stringify(pack.self_improvement), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS retention governor keeps hot context and revalidates stale memory', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = learnAwisWorkspaceMemory(memory, brain({
    scannedAt: '2026-05-24T12:30:00Z',
    signals: ['Laravel', 'Next.js', 'Tauri', 'Rust/Cargo'],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  }), key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
  }).memory
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  assert.ok(firstPack)
  const artifact = buildAwisWorkspaceArtifact(firstPack, '2026-05-24T20:00:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    artifactReplay: replay,
  })
  assert.ok(pack?.retention)
  const directRetention = buildAwisWorkspaceRetentionProjection({
    memory,
    memoryFreshness: pack.memory_freshness,
    sessionGold: pack.session_gold,
    artifactReplay: replay,
    continuity: pack.continuity,
    confidence: pack.confidence,
    contextKernel: pack.context_kernel,
    selfImprovement: pack.self_improvement,
  })
  const finalArtifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T20:01:00Z')
  const finalReplay = finalArtifact ? buildAwisWorkspaceArtifactReplayProjection([finalArtifact]) : null
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug e validar sem carregar lixo')
  const dirtyRetentionArtifact = finalArtifact ? structuredClone(finalArtifact) as typeof finalArtifact : null
  assert.ok(dirtyRetentionArtifact?.payload.retention_projection)
  dirtyRetentionArtifact.payload.retention_projection.policy.reason = 'operator_input retention reason'
  dirtyRetentionArtifact.payload.retention_projection.lifecycle.keep_hot.unshift('/Users/vitorepf/private/keep')
  dirtyRetentionArtifact.payload.retention_projection.lifecycle.promote.unshift('response_text promote')
  dirtyRetentionArtifact.payload.retention_projection.lifecycle.revalidate.unshift('full_message revalidate')
  dirtyRetentionArtifact.payload.retention_projection.lifecycle.drop_or_summarize.unshift('raw_conversation drop')
  dirtyRetentionArtifact.payload.retention_projection.stale_signals.unshift('operator_input stale')
  const dirtyRetentionStore = storage()
  saveAwisWorkspaceArtifact(dirtyRetentionArtifact, dirtyRetentionStore)
  const dirtyRetentionArtifacts = loadAwisWorkspaceArtifacts(key, dirtyRetentionStore)
  const dirtyRetentionReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyRetentionArtifacts)
  const dirtyRetentionJson = JSON.stringify({ artifact: dirtyRetentionArtifacts[0], replay: dirtyRetentionReplay })
  assert.ok(dirtyRetentionReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('retention-keep:') || pattern.startsWith('retention-revalidate:')))
  assert.doesNotMatch(dirtyRetentionJson, /\/Users\/|operator_input retention reason|operator_input stale|response_text promote|full_message revalidate|raw_conversation drop/)

  assert.equal(pack.retention.schema_version, 'atlas.awis.workspace_retention_projection.v1')
  assert.ok(pack.retention.lifecycle.keep_hot.length > 0)
  assert.ok(pack.retention.lifecycle.promote.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(pack.retention.lifecycle.revalidate.length > 0)
  assert.ok(pack.retention.lifecycle.drop_or_summarize.includes('conversa bruta completa'))
  assert.equal(pack.retention.safety.external_side_effects_allowed, false)
  assert.equal(finalArtifact?.payload.retention_projection?.schema_version, 'atlas.awis.workspace_retention_projection.v1')
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('retention-keep:') || pattern.startsWith('retention-revalidate:')))
  assert.ok(finalReplay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('retenção:')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('retenção:')))
  assert.ok(task?.execution_plan.commands_to_avoid.includes('conversa bruta completa'))
  assert.deepEqual(directRetention, pack.retention)
  assert.doesNotMatch(JSON.stringify(pack.retention), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS memory consolidation promotes gold and quarantines noisy context', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
  }).memory
  memory = recordAwisWorkspaceMaintenance(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T21:45:00Z',
    action: 'update_space_pack',
    label: 'Cérebro vivo AWIS',
    status: 'succeeded',
    reason: 'Space forte virou contexto quente',
    evidence: ['4 sessões', 'contexto pronto'],
  }).memory
  memory = recordAwisWorkspaceMaintenance(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T21:46:00Z',
    action: 'revalidate_command',
    label: 'npx tsc -b',
    status: 'failed',
    reason: 'typecheck precisa nova evidência',
    evidence: ['exit 2'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Cérebro vivo AWIS',
      thread_count: 4,
      message_count: 22,
      mode_count: 1,
      decision_count: 2,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code', 'Forge'],
      recommended_use: ['preservar ouro da sessão', 'abrir comparação'],
      sessions: [],
    },
  ])
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(firstPack)
  const firstArtifact = buildAwisWorkspaceArtifact(firstPack, '2026-05-24T22:00:00Z')
  const replay = firstArtifact ? buildAwisWorkspaceArtifactReplayProjection([firstArtifact]) : null
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    artifactReplay: replay,
  })
  assert.ok(pack?.memory_consolidation)
  const directConsolidation = buildAwisWorkspaceMemoryConsolidationProjection({
    memory,
    learning: pack.learning ?? null,
    sessionGold: pack.session_gold ?? null,
    spaces,
    relations: pack.relations ?? null,
    componentMemory: pack.component_memory ?? null,
    taskRouter: pack.task_router ?? null,
    selfImprovement: pack.self_improvement ?? null,
    memoryFreshness: pack.memory_freshness ?? null,
    retention: pack.retention ?? null,
    startupOrchestration: pack.startup_orchestration ?? null,
    artifactReplay: replay,
  })
  const taskContext = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no AWIS')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, taskContext)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T22:01:00Z')
  assert.ok(artifact)
  const dirtyConsolidationArtifact = structuredClone(artifact) as typeof artifact
  assert.ok(dirtyConsolidationArtifact.payload.memory_consolidation_projection)
  dirtyConsolidationArtifact.payload.memory_consolidation_projection.compaction_policy.reason = 'operator_input compaction'
  dirtyConsolidationArtifact.payload.memory_consolidation_projection.next_session_seed.unshift('/Users/vitorepf/private/seed')
  dirtyConsolidationArtifact.payload.memory_consolidation_projection.replay_contract.load_first.unshift('raw_conversation load')
  dirtyConsolidationArtifact.payload.memory_consolidation_projection.replay_contract.use_as_summary.unshift('response_text summary')
  dirtyConsolidationArtifact.payload.memory_consolidation_projection.replay_contract.validate_before_trust.unshift('full_message validate')
  dirtyConsolidationArtifact.payload.memory_consolidation_projection.replay_contract.archive_after_success.unshift('operator_input archive')
  dirtyConsolidationArtifact.payload.memory_consolidation_projection.replay_contract.reason = 'raw_conversation replay reason'
  dirtyConsolidationArtifact.payload.memory_consolidation_projection.consolidate.promote_to_gold.unshift('response_text gold')
  dirtyConsolidationArtifact.payload.memory_consolidation_projection.consolidate.never_promote.unshift('full_message never')
  dirtyConsolidationArtifact.payload.memory_consolidation_projection.learning_loop.capture_after_send.unshift('operator_input capture')
  dirtyConsolidationArtifact.payload.memory_consolidation_projection.learning_loop.recalibrate_after_failure.unshift('raw_conversation recalibrate')
  const dirtyConsolidationStore = storage()
  saveAwisWorkspaceArtifact(dirtyConsolidationArtifact, dirtyConsolidationStore)
  const dirtyConsolidationArtifacts = loadAwisWorkspaceArtifacts(key, dirtyConsolidationStore)
  const dirtyConsolidationReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyConsolidationArtifacts)
  const dirtyConsolidationJson = JSON.stringify({ artifact: dirtyConsolidationArtifacts[0], replay: dirtyConsolidationReplay })
  assert.ok(dirtyConsolidationReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('seed:') || pattern.startsWith('replay-load:')))
  assert.doesNotMatch(dirtyConsolidationJson, /\/Users\/|operator_input compaction|operator_input archive|operator_input capture|raw_conversation load|raw_conversation replay reason|raw_conversation recalibrate|response_text summary|response_text gold|full_message validate|full_message never/)
  saveAwisWorkspaceArtifact(artifact, store)
  const loadedArtifact = loadAwisWorkspaceArtifacts(key, store)[0]
  const loadedReplay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))

  assert.equal(pack.memory_consolidation.schema_version, 'atlas.awis.workspace_memory_consolidation_projection.v1')
  assert.ok(pack.memory_consolidation.next_session_seed.length > 0)
  assert.ok(pack.memory_consolidation.replay_contract.load_first.some((item) => item.includes('manutenção:update_space_pack:Cérebro vivo AWIS') || item.includes('ensaiar:')))
  assert.ok(pack.memory_consolidation.replay_contract.use_as_summary.some((item) => item.includes('ouro:') || item.includes('Space:')))
  assert.ok(pack.memory_consolidation.replay_contract.validate_before_trust.some((item) => item.includes('manutenção:revalidate_command:npx tsc -b') || item.includes('não promover:')))
  assert.ok(pack.memory_consolidation.replay_contract.archive_after_success.some((item) => item.includes('manutenção:update_space_pack:Cérebro vivo AWIS') || item.includes('snapshot AWIS')))
  assert.match(pack.memory_consolidation.replay_contract.reason, /replay/)
  assert.ok(pack.memory_consolidation.consolidate.promote_to_gold.some((item) => item.includes('manutenção:update_space_pack:Cérebro vivo AWIS')))
  assert.ok(pack.memory_consolidation.consolidate.promote_to_gold.some((item) => item.includes('npm run atlas-ai:test') || item.startsWith('rota:')))
  assert.ok(pack.memory_consolidation.consolidate.rehearse_next.some((item) => item.includes('repetir manutenção:update_space_pack:Cérebro vivo AWIS')))
  assert.ok(pack.memory_consolidation.consolidate.rehearse_next.some((item) => item.includes('Space') || item.includes('rota:') || item.includes('repetir manutenção:')))
  assert.ok(pack.memory_consolidation.consolidate.archive_as_artifact.some((item) => item.includes('manutenção:update_space_pack:Cérebro vivo AWIS')))
  assert.ok(pack.memory_consolidation.consolidate.archive_as_artifact.some((item) => item.includes('Space') || item.includes('partida AWIS')))
  assert.ok(pack.memory_consolidation.consolidate.revalidate.some((item) => item.includes('manutenção:revalidate_command:npx tsc -b')))
  assert.ok(pack.memory_consolidation.consolidate.never_promote.some((item) => item.includes('manutenção falhou:revalidate_command:npx tsc -b')))
  assert.ok(pack.memory_consolidation.consolidate.never_promote.includes('paths absolutos do Mac'))
  assert.ok(pack.memory_consolidation.learning_loop.capture_after_send.includes('resultado da rota'))
  assert.ok(pack.memory_consolidation.learning_loop.recalibrate_after_failure.some((item) => item.includes('manutenção:revalidate_command:npx tsc -b')))
  assert.ok(pack.memory_consolidation.learning_loop.recalibrate_after_failure.includes('não promover contexto sem evidência'))
  assert.equal(pack.memory_consolidation.safety.provider_safe, true)
  assert.equal(pack.memory_consolidation.safety.external_side_effects_allowed, false)
  assert.ok(capsule?.load_first.some((item) => item.startsWith('seed:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('replay:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('replay-summary:')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('replay:')))
  assert.ok(capsule?.avoid_loading.some((item) => item.startsWith('não promover:')))
  assert.equal(artifact.payload.memory_consolidation_projection?.schema_version, 'atlas.awis.workspace_memory_consolidation_projection.v1')
  assert.equal(loadedArtifact?.payload.memory_consolidation_projection?.schema_version, 'atlas.awis.workspace_memory_consolidation_projection.v1')
  assert.ok(loadedReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('seed:')))
  assert.ok(loadedReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('replay-load:') || pattern.startsWith('replay-summary:')))
  assert.ok(loadedReplay?.reusable_startup_gold.warnings.some((warning) => warning.startsWith('never-promote:')))
  assert.ok(loadedReplay?.reusable_startup_gold.warnings.some((warning) => warning.startsWith('replay-validate:')))
  assert.deepEqual(directConsolidation, pack.memory_consolidation)
  assert.doesNotMatch(JSON.stringify(pack.memory_consolidation), /operator_input|response_text|prompt|\/Users\/|thread_id|source_thread_ids|"raw_conversation_included":true/)
})

test('AWIS memory freshness guard prevents stale context from becoming fake gold', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const oldSnapshot = brain({
    scannedAt: '2026-04-01T12:00:00Z',
    truncated: true,
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, oldSnapshot, key).memory
  memory = learnAwisWorkspaceMemory(memory, brain({
    scannedAt: '2026-04-02T12:00:00Z',
    signals: ['Laravel', 'Next.js', 'Tauri', 'Rust/Cargo'],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  }), key).memory
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: oldSnapshot,
    memory,
  })
  assert.ok(firstPack)
  const artifact = buildAwisWorkspaceArtifact(firstPack, '2026-04-02T13:00:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: oldSnapshot,
    memory,
    artifactReplay: replay,
  })
  assert.ok(pack?.memory_freshness)
  const directFreshness = buildAwisWorkspaceMemoryFreshnessProjection({
    brain: oldSnapshot,
    memory,
    artifactLake: null,
    artifactReplay: replay,
    confidence: pack.confidence,
    selfImprovement: pack.self_improvement,
  })
  const finalArtifact = buildAwisWorkspaceArtifact(pack, '2026-04-02T13:01:00Z')
  const finalReplay = finalArtifact ? buildAwisWorkspaceArtifactReplayProjection([finalArtifact]) : null
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug sem confiar em memória velha')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)

  assert.equal(pack.memory_freshness.schema_version, 'atlas.awis.workspace_memory_freshness_projection.v1')
  assert.ok(['stale', 'cold'].includes(pack.memory_freshness.state))
  assert.ok(pack.memory_freshness.evidence.revalidate.some((item) => item.includes('scan antigo')))
  assert.equal(pack.memory_freshness.promotion_gate.can_promote_commands, false)
  assert.ok(pack.retention?.lifecycle.revalidate.some((item) => item.includes('scan antigo')))
  assert.ok(pack.startup_orchestration?.startup_sequence.some((item) => item.step === 'validate' && item.label.includes('frescor:')))
  assert.ok(pack.launch_contract?.startup_contract.first_load.some((item) => item.startsWith('artifact-seed:')))
  assert.ok(pack.launch_contract?.startup_contract.validate_before_trust.some((item) => item.startsWith('artifact-seed:')))
  assert.ok(pack.launch_contract?.next_conversation.load_order.some((item) => item.startsWith('artifact-seed:')))
  assert.ok(pack.launch_contract?.recovery_contract.safe_resume.some((item) => item.includes('artifact-seed:')))
  assert.ok(task?.execution_plan.commands_to_avoid.includes('memória stale:usar resumo até revalidar'))
  assert.ok(capsule?.validate_with.some((item) => item.includes('frescor:scan antigo') || item.includes('scan antigo')))
  assert.ok(capsule?.load_first.some((item) => item.includes('launch:artifact-seed:') || item.includes('launch-order:artifact-seed:')))
  assert.ok(capsule?.avoid_loading.includes('memória stale:usar resumo até revalidar'))
  assert.equal(finalArtifact?.payload.memory_freshness_projection?.schema_version, 'atlas.awis.workspace_memory_freshness_projection.v1')
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('freshness:')))
  assert.ok(finalReplay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('frescor:')))
  assert.deepEqual(directFreshness, pack.memory_freshness)
  assert.doesNotMatch(JSON.stringify(pack.memory_freshness), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS component memory gives each repo area its own load policy', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md', kind: 'documento' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
      { label: 'PHPUnit', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test', 'npx tsc -b'],
  }).memory
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  assert.ok(firstPack)
  const artifact = buildAwisWorkspaceArtifact(firstPack, '2026-05-24T22:00:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    artifactReplay: replay,
  })
  assert.ok(pack?.component_memory)
  const directComponentMemory = buildAwisWorkspaceComponentMemoryProjection({
    topology: pack.topology,
    memory,
    learning: pack.learning ?? null,
    confidence: pack.confidence,
    memoryFreshness: pack.memory_freshness,
    artifactReplay: replay,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no atlas desktop e rodar tsc')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const finalArtifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T22:01:00Z')
  const finalReplay = finalArtifact ? buildAwisWorkspaceArtifactReplayProjection([finalArtifact]) : null
  const replayOnlyPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    artifactReplay: finalReplay,
  })
  const dirtyComponentArtifact = finalArtifact ? structuredClone(finalArtifact) as typeof finalArtifact : null
  assert.ok(dirtyComponentArtifact?.payload.component_memory_projection)
  dirtyComponentArtifact.payload.component_memory_projection.strongest_components.unshift({
    key: 'atlas-desktop',
    role: 'operator_input component role',
    maturity: 'battle_tested',
    confidence: 100,
    stack: ['response_text component stack'],
    areas: ['atlas-desktop/apps/desktop/src/surfaces/atlas-ai'],
    load_first: ['raw_conversation component load'],
    commands: ['full_message component command'],
    docs: ['atlas-desktop/package.json'],
    cautions: ['operator_input component caution'],
    outcome_memory: {
      success_count: 3,
      failure_count: 0,
      context_pack_applied_count: 3,
      last_used_at: '2026-05-26T18:05:00Z',
      trusted_commands: ['response_text trusted command'],
      caution_signals: ['raw_conversation caution signal'],
    },
    reuse_policy: {
      can_autoload: true,
      validate_before_execution: true,
      reason: 'full_message reuse reason',
    },
  })
  dirtyComponentArtifact.payload.component_memory_projection.routing_hints.unshift({
    signal: 'operator_input routing signal',
    component: 'atlas-desktop',
    confidence: 100,
  })
  saveAwisWorkspaceArtifact(dirtyComponentArtifact, store)
  const dirtyComponentArtifacts = loadAwisWorkspaceArtifacts(key, store)
  const dirtyComponentReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyComponentArtifacts)
  const dirtyComponentJson = JSON.stringify({ artifact: dirtyComponentArtifacts[0], replay: dirtyComponentReplay })
  assert.ok(dirtyComponentReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('component-memory:atlas-desktop:')))
  assert.doesNotMatch(dirtyComponentJson, /operator_input component role|operator_input component caution|operator_input routing signal|response_text component stack|response_text trusted command|raw_conversation component load|raw_conversation caution signal|full_message component command|full_message reuse reason|\/Users\//)
  const desktopMemory = pack.component_memory.strongest_components.find((component) => component.key === 'atlas-desktop')

  assert.equal(pack.component_memory.schema_version, 'atlas.awis.workspace_component_memory_projection.v1')
  assert.ok(desktopMemory)
  assert.ok(['stable', 'battle_tested', 'learning'].includes(desktopMemory.maturity))
  assert.ok(desktopMemory.commands.includes('npm run atlas-ai:test'))
  assert.equal(desktopMemory.outcome_memory.success_count, 1)
  assert.equal(desktopMemory.outcome_memory.failure_count, 0)
  assert.equal(desktopMemory.outcome_memory.context_pack_applied_count, 1)
  assert.deepEqual(desktopMemory.outcome_memory.trusted_commands, ['npm run atlas-ai:test', 'npx tsc -b'])
  assert.ok(desktopMemory.load_first.some((item) => item.includes('atlas-desktop/package.json')))
  assert.ok(pack.component_memory.routing_hints.some((hint) => hint.component === 'atlas-desktop'))
  assert.equal(task?.recommended_context.component_intent_ranking[0]?.key, 'atlas-desktop')
  assert.equal(task?.recommended_context.component_intent_ranking[0]?.action, 'revalidate')
  assert.ok((task?.recommended_context.component_intent_ranking[0]?.score ?? 0) >= 70)
  assert.ok(task?.recommended_context.component_intent_ranking[0]?.matched.some((item) => /desktop|tsc/i.test(item)))
  assert.equal(task?.recommended_context.component_context_packs[0]?.key, 'atlas-desktop')
  assert.equal(task?.recommended_context.component_context_packs[0]?.mode, 'guarded')
  assert.ok(task?.recommended_context.component_context_packs[0]?.load.some((item) => item.includes('atlas-desktop/package.json')))
  assert.ok(task?.recommended_context.component_context_packs[0]?.validate.includes('npm run atlas-ai:test'))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('área:atlas-desktop:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('pack:atlas-desktop:')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('pack:atlas-desktop:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('área:atlas-desktop:')))
  assert.equal(finalArtifact?.payload.component_memory_projection?.schema_version, 'atlas.awis.workspace_component_memory_projection.v1')
  assert.ok(finalReplay?.cold_start_seed.load_order.some((item) => item.startsWith('component-memory:atlas-desktop:')))
  assert.ok(finalReplay?.cold_start_seed.load_order.some((item) => item.startsWith('component-load:atlas-desktop:')))
  assert.ok(finalReplay?.cold_start_seed.context_signals.some((item) => item.startsWith('component-route:') || item.startsWith('component-hot:atlas-desktop:')))
  assert.ok(finalReplay?.cold_start_seed.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(finalReplay?.cold_start_seed.repository_hints.includes('atlas-desktop'))
  assert.ok(replayOnlyPack?.next_session_brain?.load_order.some((item) => item.startsWith('component-memory:atlas-desktop:')))
  assert.ok(replayOnlyPack?.next_session_brain?.focused_repositories.some((repo) => repo.repo_key === 'atlas-desktop') || replayOnlyPack?.next_session_brain?.focused_areas.some((area) => area.includes('atlas-desktop')))
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('component-memory:atlas-desktop:')))
  assert.deepEqual(directComponentMemory, pack.component_memory)
  assert.doesNotMatch(JSON.stringify(pack.component_memory), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS folder cortex turns the local folder map into replayable area capsules', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    truncated: false,
    importantFiles: [
      { path: 'AGENTS.md', kind: 'documento' },
      { path: 'pnpm-workspace.yaml', kind: 'manifesto' },
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx', kind: 'codigo' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/awisWorkspaceMemory.ts', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'atlas-server/app/Http/Controllers/AtlasCodeController.php', kind: 'codigo' },
      { path: 'docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md', kind: 'documento' },
    ],
    docDigests: [{
      path: 'docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md',
      kind: 'doc',
      signals: ['docs canônicos governam implementação'],
      obligations: ['rodar bootstrap antes de confiar em projeções'],
      summary: 'governança do conhecimento Atlas',
    }],
    dependencyEdges: [
      { from: 'pnpm-workspace', to: 'atlas-desktop', kind: 'workspace', source: 'pnpm-workspace.yaml' },
      { from: 'pnpm-workspace', to: 'atlas-server', kind: 'workspace', source: 'pnpm-workspace.yaml' },
      { from: '@atlas/desktop', to: '@atlas/domain', kind: 'dependency', source: 'atlas-desktop/package.json' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
      { label: 'PHPUnit', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test', 'npx tsc -b'],
    componentKeys: ['atlas-desktop'],
    componentMemoryLabels: ['atlas-desktop'],
    semanticIndexLabels: ['desktop', 'awis'],
    folderCortexLabels: [
      'area:atlas-desktop:autoload:88',
      'validate:atlas-desktop:npm run atlas-ai:test',
      'load:atlas-desktop:manifesto:atlas-desktop/package.json',
    ],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['php artisan test'],
    componentKeys: ['atlas-server'],
    folderCortexLabels: [
      'area:atlas-server:autoload:72',
      'validate:atlas-server:php artisan test',
    ],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  assert.ok(pack?.folder_cortex)
  const directFolderCortex = buildAwisWorkspaceFolderCortexProjection({
    workspaceName: 'Atlas',
    topology: pack.topology,
    componentMemory: pack.component_memory,
    semanticIndex: pack.semantic_index,
    memory,
    artifactReplay: null,
  })
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-26T17:00:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const replayOnlyPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    artifactReplay: replay,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no atlas desktop e validar o AWIS')
  const providerCapsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const desktopCapsule = pack.folder_cortex.area_capsules.find((capsule) => capsule.key === 'atlas-desktop')
  const serverCapsule = pack.folder_cortex.area_capsules.find((capsule) => capsule.key === 'atlas-server')
  const dirtyFolderArtifact = artifact ? structuredClone(artifact) as typeof artifact : null
  assert.ok(dirtyFolderArtifact?.payload.folder_cortex_projection)
  dirtyFolderArtifact.payload.folder_cortex_projection.cortex_hash = 'operator_input cortex hash'
  dirtyFolderArtifact.payload.folder_cortex_projection.root_summary.workspace_name = '/Users/vitorepf/private/workspace'
  dirtyFolderArtifact.payload.folder_cortex_projection.root_summary.stack.unshift('response_text root stack')
  dirtyFolderArtifact.payload.folder_cortex_projection.area_capsules.unshift({
    key: 'atlas-desktop',
    role: 'raw_conversation folder role',
    confidence: 100,
    stack: ['full_message folder stack'],
    load_first: ['operator_input folder load'],
    summarize_only: ['response_text folder summary'],
    validate_with: ['raw_conversation folder validate'],
    command_sources: ['atlas-desktop/package.json'],
    dependency_edges: ['full_message folder edge'],
    sensitive_zones: ['operator_input folder zone'],
    gold_signals: ['response_text folder gold'],
    retrieval_policy: 'autoload',
    outcome_memory: {
      success_count: 4,
      failure_count: 0,
      last_used_at: '2026-05-26T18:10:00Z',
      trusted_signals: ['raw_conversation trusted signal'],
      revalidate_signals: ['full_message revalidate signal'],
      confidence_delta: 10,
    },
  })
  dirtyFolderArtifact.payload.folder_cortex_projection.startup_recipe.load_order.unshift('operator_input recipe load')
  dirtyFolderArtifact.payload.folder_cortex_projection.startup_recipe.validate_with.unshift('response_text recipe validate')
  dirtyFolderArtifact.payload.folder_cortex_projection.validation_routes.unshift({
    component_key: 'atlas-desktop',
    primary_commands: ['raw_conversation route command'],
    fallback_commands: ['full_message fallback command'],
    evidence_sources: ['operator_input route evidence'],
    confidence: 100,
    reason: 'response_text route reason',
  })
  dirtyFolderArtifact.payload.folder_cortex_projection.cross_repo_clues.unshift('raw_conversation cross repo')
  dirtyFolderArtifact.payload.folder_cortex_projection.proof.evidence.unshift('full_message proof')
  saveAwisWorkspaceArtifact(dirtyFolderArtifact, store)
  const dirtyFolderArtifacts = loadAwisWorkspaceArtifacts(key, store)
  const dirtyFolderReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyFolderArtifacts)
  const dirtyFolderJson = JSON.stringify({ artifact: dirtyFolderArtifacts[0], replay: dirtyFolderReplay })
  assert.equal(dirtyFolderArtifacts[0]?.payload.folder_cortex_projection?.schema_version, 'atlas.awis.workspace_folder_cortex_projection.v1')
  assert.ok(dirtyFolderReplay?.cold_start_seed.load_order.some((item) => item.startsWith('folder-cortex:') || item.startsWith('folder-area:atlas-desktop:')))
  assert.doesNotMatch(dirtyFolderJson, /\/Users\/|operator_input cortex hash|operator_input folder load|operator_input folder zone|operator_input recipe load|operator_input route evidence|response_text root stack|response_text folder summary|response_text folder gold|response_text recipe validate|response_text route reason|raw_conversation folder role|raw_conversation folder validate|raw_conversation trusted signal|raw_conversation route command|raw_conversation cross repo|full_message folder stack|full_message folder edge|full_message revalidate signal|full_message fallback command|full_message proof/)

  assert.equal(pack.folder_cortex.schema_version, 'atlas.awis.workspace_folder_cortex_projection.v1')
  assert.equal(pack.folder_cortex.root_summary.folder_map_quality, 'complete')
  assert.ok((pack.folder_cortex.readiness_score ?? 0) >= 60)
  assert.ok(desktopCapsule)
  assert.ok(desktopCapsule.load_first.some((item) => item.includes('atlas-desktop/package.json')))
  assert.ok(desktopCapsule.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(desktopCapsule.gold_signals.some((signal) => signal.includes('sucessos:') || signal.includes('alias:')))
  assert.equal(desktopCapsule.outcome_memory.success_count, 1)
  assert.equal(desktopCapsule.outcome_memory.failure_count, 0)
  assert.ok(desktopCapsule.outcome_memory.trusted_signals.some((signal) => signal.includes('area:atlas-desktop')))
  const cortexDesktopRoute = pack.folder_cortex.validation_routes.find((route) => route.component_key === 'atlas-desktop')
  assert.ok(cortexDesktopRoute)
  assert.ok(cortexDesktopRoute.primary_commands.includes('npm run atlas-ai:test'))
  assert.ok(cortexDesktopRoute.evidence_sources.some((item) => item.startsWith('Folder Cortex:')))
  assert.ok((cortexDesktopRoute.confidence ?? 0) >= 80)
  assert.ok(serverCapsule)
  assert.equal(serverCapsule.outcome_memory.failure_count, 1)
  assert.equal(serverCapsule.retrieval_policy, 'guarded')
  assert.ok(serverCapsule.summarize_only.some((item) => item.includes('outcome falhou:atlas-server')))
  assert.ok(serverCapsule.outcome_memory.revalidate_signals.some((signal) => signal.includes('php artisan test')))
  assert.ok(pack.learning_flywheel?.cycle.reused.some((item) => item.startsWith('folder-cortex:atlas-desktop:')))
  assert.ok(pack.learning_flywheel?.cycle.validated.some((item) => item.includes('folder-cortex:atlas-server:php artisan test')))
  assert.ok(pack.learning_flywheel?.cycle.gaps.some((item) => item.includes('folder-cortex-revalidar:atlas-server')))
  assert.ok(pack.learning_flywheel?.automation.next_safe_automations.some((item) => item === 'preservar Folder Cortex:atlas-desktop'))
  assert.ok(pack.learning_flywheel?.next_session.preserve_as_artifact.some((item) => item === 'folder-cortex:atlas-desktop:artifact'))
  assert.ok(pack.learning_flywheel?.proof.never_promote.some((item) => item === 'folder-cortex:atlas-server:sem prova recente'))
  assert.ok(pack.evidence_ledger?.proven_memory.some((item) => item.kind === 'folder_cortex' && item.label === 'atlas-desktop'))
  assert.ok(pack.evidence_ledger?.revalidation_queue.some((item) => item.label === 'folder-cortex:atlas-server:guarded' && item.validate_with.includes('php artisan test')))
  assert.ok(pack.evidence_ledger?.next_session.trust_first.some((item) => item.startsWith('folder_cortex:atlas-desktop:')))
  assert.ok(pack.learning_cadence?.promote_today.some((item) => item.startsWith('folder-cortex:atlas-desktop:')))
  assert.ok(pack.learning_cadence?.revalidate_today.some((item) => item === 'folder-cortex:atlas-server:guarded'))
  assert.ok(pack.learning_cadence?.repository_focus.some((item) => item.key === 'atlas-desktop' && item.reason.includes('folder:')))
  assert.ok(pack.learning_chronicle?.gold_trail.some((item) => item.startsWith('folder-cortex:atlas-desktop:')))
  assert.ok(pack.learning_chronicle?.regression_radar.some((item) => item === 'folder-cortex:atlas-server:guarded'))
  assert.ok(pack.learning_chronicle?.repository_story.some((item) => item.key === 'atlas-server' && item.signals.some((signal) => signal.includes('folder:'))))
  assert.ok(pack.folder_cortex.startup_recipe.load_order.some((item) => item.includes('atlas-desktop')))
  assert.ok(pack.folder_cortex.startup_recipe.validate_with.includes('npx tsc -b'))
  assert.ok(pack.folder_cortex.cross_repo_clues.some((item) => item.includes('atlas-server')))
  assert.equal(artifact?.payload.folder_cortex_projection?.cortex_hash, pack.folder_cortex.cortex_hash)
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('folder-cortex:')))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('folder-area:atlas-desktop:')))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('folder-route:atlas-desktop:')))
  assert.ok(replay?.cold_start_seed.validate_with.some((item) => item === 'folder-route:atlas-desktop:npm run atlas-ai:test'))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('folder-route:atlas-desktop:')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('folder-proof:') || item.startsWith('folder-edge:atlas-desktop:')))
  assert.ok(replay?.cold_start_seed.document_hints?.load_first.some((item) => item.includes('atlas-desktop/package.json')))
  assert.ok(replay?.cold_start_seed.repository_hints.some((item) => item.includes('atlas-desktop') || item.includes('monorepo:atlas-desktop')))
  assert.ok(replayOnlyPack?.next_session_brain?.load_order.some((item) => item.startsWith('folder-cortex:') || item.startsWith('folder-area:atlas-desktop:')))
  assert.ok(replayOnlyPack?.next_session_brain?.load_order.some((item) => item.startsWith('folder-route:atlas-desktop:')))
  assert.ok(replayOnlyPack?.next_session_brain?.context_loading.document_hints.load_first.some((item) => item.includes('atlas-desktop/package.json')))
  assert.ok(task?.recommended_context.component_context_packs.find((item) => item.key === 'atlas-desktop')?.load.some((item) => item.startsWith('folder:')))
  assert.ok(task?.recommended_context.component_context_packs.find((item) => item.key === 'atlas-desktop')?.reason.startsWith('Folder Cortex:'))
  assert.ok(task?.recommended_context.folder_focus.include.some((item) => item.includes('folder:atlas-desktop:')))
  assert.ok(task?.recommended_context.working_set.files.includes('atlas-desktop/package.json'))
  assert.ok(task?.recommended_context.working_set.commands.includes('npm run atlas-ai:test'))
  const desktopValidationRoute = task?.recommended_context.validation_routes.find((route) => route.component_key === 'atlas-desktop')
  assert.ok(desktopValidationRoute)
  assert.ok(desktopValidationRoute.primary_commands.includes('npm run atlas-ai:test'))
  assert.ok(desktopValidationRoute.evidence_sources.some((item) => item.startsWith('Folder Cortex:')))
  assert.ok((desktopValidationRoute.confidence ?? 0) >= 70)
  assert.ok(task?.execution_plan.validation_commands.includes('npm run atlas-ai:test'))
  assert.ok(task?.learning_hooks.task_feedback_loop.record.some((item) => item.startsWith('validation-route:atlas-desktop:')))
  assert.ok(task?.learning_hooks.task_feedback_loop.promote.some((item) => item.startsWith('promover rota validação:atlas-desktop:npm run atlas-ai:test')))
  assert.ok(task?.learning_hooks.task_feedback_loop.update_components.includes('validation-route:atlas-desktop'))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('folder-cortex:')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('folder-area:atlas-desktop:')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('folder-load:atlas-desktop:')))
  assert.ok(providerCapsule?.load_first.some((item) => item.startsWith('folder-cortex:')))
  assert.ok(providerCapsule?.load_first.some((item) => item.startsWith('folder-area:atlas-desktop:')))
  assert.ok(providerCapsule?.use_as_summary.some((item) => item.startsWith('folder-capsule:atlas-desktop:')))
  assert.ok(providerCapsule?.use_as_summary.some((item) => item.startsWith('validation-route:atlas-desktop:')))
  assert.ok(providerCapsule?.golden_context.validation_gold.some((item) => item.label.includes('npm run atlas-ai:test')))
  assert.ok(providerCapsule?.validate_with.some((item) => item.includes('folder-area:atlas-desktop:npm run atlas-ai:test')))
  assert.deepEqual(directFolderCortex, pack.folder_cortex)
  assert.doesNotMatch(JSON.stringify(pack.folder_cortex), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|prompt|"raw_conversation_included":true/)
})

test('AWIS monorepo workspace edges become next-session living context', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    importantFiles: [
      { path: 'pnpm-workspace.yaml', kind: 'manifesto' },
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    dependencyEdges: [
      { from: 'pnpm-workspace', to: 'atlas-desktop', kind: 'workspace', source: 'pnpm-workspace.yaml' },
      { from: 'pnpm-workspace', to: 'atlas-server', kind: 'workspace', source: 'pnpm-workspace.yaml' },
      { from: '@atlas/desktop', to: 'react', kind: 'dependency', source: 'atlas-desktop/package.json' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'PHPUnit', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  const memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  assert.ok(pack)
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'comparar atlas desktop com atlas server no monorepo')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-26T14:00:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  assert.ok(pack.topology)
  assert.ok(pack.component_memory)
  assert.ok(pack.next_session_brain)
  assert.ok(pack.workspace_twin)
  assert.ok(pack.repository_constellation)

  assert.deepEqual(pack.topology.knowledge_map.workspace_members.slice(0, 2), ['atlas-desktop', 'atlas-server'])
  assert.ok(pack.topology.knowledge_map.workspace_dependency_edges.some((edge) => edge.includes('pnpm-workspace->atlas-desktop:workspace:pnpm-workspace.yaml')))
  assert.ok(pack.topology.connections.some((connection) => connection.from === 'workspace-root' && connection.to === 'atlas-desktop'))
  assert.ok(pack.component_memory.strongest_components.find((component) => component.key === 'atlas-desktop')?.load_first.includes('monorepo:atlas-desktop'))
  assert.ok(pack.next_session_brain.load_order.includes('monorepo:atlas-desktop'))
  assert.ok(pack.next_session_brain.focused_areas.includes('monorepo:atlas-server'))
  assert.ok(pack.workspace_twin.genome.apps.includes('atlas-desktop'))
  assert.ok(pack.workspace_twin.context_autopilot.load_first.includes('monorepo:atlas-desktop'))
  assert.ok(pack.repository_constellation.next_conversation.load_first.some((item) => item.startsWith('bridge:workspace-root->atlas-desktop')))
  assert.ok(pack.repository_constellation.repositories.find((repo) => repo.key === 'atlas-desktop')?.load_when.includes('monorepo:atlas-desktop'))
  assert.ok(capsule?.load_first.includes('monorepo-member:atlas-desktop'))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('monorepo-edge:pnpm-workspace->atlas-desktop')))
  assert.ok(capsule?.use_as_summary.includes('monorepo-member:atlas-server'))
  assert.ok(artifact?.manifest.load_first.includes('monorepo-member:atlas-desktop'))
  assert.ok(artifact?.manifest.repository_hints.includes('monorepo:atlas-server'))
  assert.ok(replay?.cold_start_seed.load_order.includes('monorepo-member:atlas-desktop'))
  assert.ok(replay?.cold_start_seed.context_signals.includes('monorepo-member:atlas-server'))
  assert.ok(replay?.cold_start_seed.repository_hints.includes('monorepo:atlas-desktop'))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.includes('monorepo-member:atlas-desktop'))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('artifact-monorepo-edge:pnpm-workspace->atlas-desktop')))
  assert.doesNotMatch(JSON.stringify(pack), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS semantic index routes human intent to the right workspace area', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'atlas-server/app/Http/Controllers/AtlasCodeController.php', kind: 'codigo' },
      { path: 'docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md', kind: 'documento' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'PHPUnit', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['php artisan test'],
    componentKeys: ['atlas-server'],
    folderCortexLabels: ['atlas-server'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Fluxo backend Atlas',
      thread_count: 3,
      message_count: 18,
      mode_count: 1,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code'],
      recommended_use: ['debug backend', 'reusar contexto Laravel'],
      sessions: [],
    },
  ])
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(pack?.semantic_index)
  const directSemantic = buildAwisWorkspaceSemanticIndexProjection({
    topology: pack.topology,
    componentMemory: pack.component_memory,
    learning: pack.learning ?? null,
    sessionGold: pack.session_gold ?? null,
    spaces,
    artifactReplay: null,
    memoryFreshness: pack.memory_freshness,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir 500 no backend laravel atlas-server')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T23:01:00Z')
  assert.ok(artifact)
  saveAwisWorkspaceArtifact(artifact, store)
  const loadedArtifact = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const replayOnlyPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    artifactReplay: replay,
  })
  const dirtySemanticArtifact = structuredClone(artifact) as typeof artifact
  assert.ok(dirtySemanticArtifact.payload.semantic_index_projection)
  dirtySemanticArtifact.payload.semantic_index_projection.query_aliases.unshift({
    alias: 'backend',
    intent: 'operator_input semantic intent',
    component_keys: ['atlas-server'],
    task_kinds: ['bug_fix'],
    load: ['response_text semantic load'],
    validate: ['raw_conversation semantic validate'],
    confidence: 100,
  })
  dirtySemanticArtifact.payload.semantic_index_projection.stack_map.unshift({
    stack: 'php',
    component_keys: ['atlas-server'],
    commands: ['full_message semantic command'],
    docs: ['atlas-server/composer.json'],
    confidence: 100,
  })
  dirtySemanticArtifact.payload.semantic_index_projection.retrieval_policy.load_full_when.unshift('operator_input full load')
  dirtySemanticArtifact.payload.semantic_index_projection.retrieval_policy.summarize_when.unshift('response_text summarize')
  dirtySemanticArtifact.payload.semantic_index_projection.retrieval_policy.revalidate_when.unshift('raw_conversation revalidate')
  dirtySemanticArtifact.payload.semantic_index_projection.retrieval_policy.never_load_raw.unshift('/Users/vitorepf/private/raw')
  const dirtySemanticStore = storage()
  saveAwisWorkspaceArtifact(dirtySemanticArtifact, dirtySemanticStore)
  const dirtySemanticArtifacts = loadAwisWorkspaceArtifacts(key, dirtySemanticStore)
  const dirtySemanticReplay = buildAwisWorkspaceArtifactReplayProjection(dirtySemanticArtifacts)
  const dirtySemanticJson = JSON.stringify({ artifact: dirtySemanticArtifacts[0], replay: dirtySemanticReplay })
  assert.ok(dirtySemanticReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('semantic:') || pattern.startsWith('semantic-stack:')))
  assert.doesNotMatch(dirtySemanticJson, /\/Users\/|operator_input semantic intent|operator_input full load|response_text semantic load|response_text summarize|raw_conversation semantic validate|raw_conversation revalidate|full_message semantic command/)

  assert.equal(pack.semantic_index.schema_version, 'atlas.awis.workspace_semantic_index_projection.v1')
  assert.ok(pack.semantic_index.query_aliases.some((alias) => alias.alias === 'backend' && alias.component_keys.includes('atlas-server')))
  assert.ok(pack.semantic_index.query_aliases.some((alias) => alias.alias === 'laravel' && alias.validate.includes('php artisan test')))
  assert.ok(pack.semantic_index.stack_map.some((stack) => stack.stack === 'php' && stack.component_keys.includes('atlas-server')))
  assert.ok(pack.semantic_index.retrieval_policy.never_load_raw.includes('workspace inteiro sem intenção'))
  assert.equal(pack.semantic_index.safety.provider_safe, true)
  assert.equal(task?.recommended_context.semantic_matches[0]?.component_keys.includes('atlas-server'), true)
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('semântico:')))
  assert.ok(task?.recommended_context.working_set.commands.includes('php artisan test'))
  assert.ok(task?.execution_plan.validation_commands.includes('php artisan test'))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('semântico:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('semantic-match:')))
  assert.equal(artifact.payload.semantic_index_projection?.schema_version, 'atlas.awis.workspace_semantic_index_projection.v1')
  assert.equal(loadedArtifact?.payload.semantic_index_projection?.schema_version, 'atlas.awis.workspace_semantic_index_projection.v1')
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('semantic:backend:atlas-server') || item.startsWith('semantic:laravel:atlas-server')))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('semantic-stack:php:atlas-server')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('semantic-alias:backend:') || item.startsWith('semantic-alias:laravel:')))
  assert.ok(replay?.cold_start_seed.validate_with.includes('php artisan test'))
  assert.ok(replay?.cold_start_seed.repository_hints.includes('atlas-server'))
  assert.ok(replay?.cold_start_seed.warnings.some((item) => item.startsWith('semantic-never:workspace inteiro sem intenção')))
  assert.ok(replayOnlyPack?.next_session_brain?.load_order.some((item) => item.startsWith('semantic:backend:atlas-server') || item.startsWith('semantic:laravel:atlas-server')))
  assert.ok(replayOnlyPack?.next_session_brain?.execution_priority.some((priority) => priority.command === 'php artisan test'))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('semantic:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('semântico:')))
  assert.deepEqual(directSemantic, pack.semantic_index)
  assert.doesNotMatch(JSON.stringify(pack.semantic_index), /operator_input|response_text|prompt|\/Users\/|thread_id|source_thread_ids|"raw_conversation_included":true/)
})

test('AWIS evidence ledger proves learned memory before promoting it into the next session', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'atlas-server/app/Http/Controllers/AtlasCodeController.php', kind: 'codigo' },
      { path: 'docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md', kind: 'documento' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'PHPUnit', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
    notes: ['scan local truncado para desempenho'],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['php artisan test'],
    componentKeys: ['atlas-server'],
    confidenceLabels: ['backend route validada por PHPUnit'],
    evidenceGateLabels: ['não promover sem teste verde'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'analysis',
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
    recoveryLabels: ['revalidar UI antes de promover contexto'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Fluxo backend Atlas',
      thread_count: 3,
      message_count: 18,
      mode_count: 1,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code'],
      recommended_use: ['debug backend', 'reusar contexto Laravel'],
      sessions: [],
    },
  ])
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(pack?.evidence_ledger)
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-26T18:00:00Z') : null
  assert.ok(artifact)
  saveAwisWorkspaceArtifact(artifact, store)
  const loadedArtifact = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const replayOnlyPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    artifactReplay: replay,
  })
  const dirtyEvidenceArtifact = structuredClone(artifact) as typeof artifact
  assert.ok(dirtyEvidenceArtifact.payload.evidence_ledger_projection)
  assert.ok(dirtyEvidenceArtifact.payload.current_truth_pack_projection)
  dirtyEvidenceArtifact.payload.evidence_ledger_projection.ledger_hash = 'operator_input ledger hash'
  dirtyEvidenceArtifact.payload.evidence_ledger_projection.proven_memory.unshift({
    kind: 'command',
    label: 'response_text evidence label',
    confidence: 100,
    evidence: ['raw_conversation evidence proof'],
    reuse_as: ['full_message evidence reuse'],
  })
  dirtyEvidenceArtifact.payload.evidence_ledger_projection.revalidation_queue.unshift({
    label: 'operator_input evidence queue',
    reason: 'response_text evidence reason',
    validate_with: ['raw_conversation evidence validate'],
  })
  dirtyEvidenceArtifact.payload.evidence_ledger_projection.human_boundary.unshift('full_message evidence human')
  dirtyEvidenceArtifact.payload.evidence_ledger_projection.next_session.trust_first.unshift('/Users/vitorepf/private/trust')
  dirtyEvidenceArtifact.payload.evidence_ledger_projection.next_session.verify_first.unshift('operator_input evidence verify')
  dirtyEvidenceArtifact.payload.evidence_ledger_projection.next_session.write_back_after_success.unshift('response_text evidence write')
  dirtyEvidenceArtifact.payload.evidence_ledger_projection.next_session.preserve_as_artifact.unshift('raw_conversation evidence artifact')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.truth_hash = 'full_message truth hash'
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.current_truth.must_keep.unshift('operator_input truth keep')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.current_truth.active_components.unshift('response_text truth component')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.current_truth.active_spaces.unshift('raw_conversation truth space')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.current_truth.active_artifacts.unshift('full_message truth artifact')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.current_truth.proven_commands.unshift('/Users/vitorepf/private/command')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.proof.evidence_refs.unshift('operator_input truth evidence')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.proof.validate_with.unshift('response_text truth validate')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.proof.stale_or_unproven.unshift('raw_conversation truth stale')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.proof.human_boundary.unshift('full_message truth human')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.next_conversation.load_first.unshift('operator_input truth load')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.next_conversation.summarize_only.unshift('response_text truth summary')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.next_conversation.promote_when.unshift('raw_conversation truth promote')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.next_conversation.demote_when.unshift('full_message truth demote')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.trust_contract.trust_first.unshift('operator_input truth trust')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.trust_contract.verify_before_send.unshift('response_text truth verify')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.trust_contract.never_load_raw.unshift('raw_conversation truth never')
  dirtyEvidenceArtifact.payload.current_truth_pack_projection.trust_contract.refresh_when.unshift('full_message truth refresh')
  const dirtyEvidenceStore = storage()
  saveAwisWorkspaceArtifact(dirtyEvidenceArtifact, dirtyEvidenceStore)
  const dirtyEvidenceArtifacts = loadAwisWorkspaceArtifacts(key, dirtyEvidenceStore)
  const dirtyEvidenceReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyEvidenceArtifacts)
  const dirtyEvidenceJson = JSON.stringify({ artifact: dirtyEvidenceArtifacts[0], replay: dirtyEvidenceReplay })
  assert.ok(dirtyEvidenceReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('evidence-ledger:') || pattern.startsWith('truth:')))
  assert.doesNotMatch(dirtyEvidenceJson, /\/Users\/|operator_input ledger hash|operator_input evidence queue|operator_input evidence verify|operator_input truth keep|operator_input truth evidence|operator_input truth load|operator_input truth trust|response_text evidence label|response_text evidence reason|response_text evidence write|response_text truth component|response_text truth validate|response_text truth summary|response_text truth verify|raw_conversation evidence proof|raw_conversation evidence validate|raw_conversation evidence artifact|raw_conversation truth space|raw_conversation truth stale|raw_conversation truth promote|raw_conversation truth never|full_message evidence reuse|full_message evidence human|full_message truth hash|full_message truth artifact|full_message truth human|full_message truth demote|full_message truth refresh/)

  assert.equal(pack.evidence_ledger.schema_version, 'atlas.awis.evidence_ledger_projection.v1')
  assert.ok(pack.evidence_ledger.ledger_hash.startsWith('ledger-'))
  assert.ok(pack.evidence_ledger.proven_memory.some((item) => item.kind === 'command' && item.label === 'php artisan test'))
  assert.ok(pack.evidence_ledger.proven_memory.some((item) => item.kind === 'component' && item.label === 'atlas-server'))
  assert.ok(pack.evidence_ledger.proven_memory.some((item) => item.kind === 'semantic_route' && item.label === 'backend'))
  assert.ok(pack.evidence_ledger.revalidation_queue.some((item) => item.label.includes('revalidar') || item.label.includes('truncado') || item.label.includes('verify')))
  assert.ok(pack.evidence_ledger.next_session.trust_first.length)
  assert.ok(pack.evidence_ledger.next_session.verify_first.length)
  assert.ok(pack.evidence_ledger.next_session.write_back_after_success.some((item) => item.includes('evidência') || item.includes('feedback') || item.includes('registrar')))
  assert.equal(artifact.payload.evidence_ledger_projection?.schema_version, 'atlas.awis.evidence_ledger_projection.v1')
  assert.equal(loadedArtifact?.payload.evidence_ledger_projection?.ledger_hash, pack.evidence_ledger.ledger_hash)
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('evidence-ledger:')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('evidence:')))
  assert.ok(replay?.cold_start_seed.validate_with.includes('php artisan test') || replay?.cold_start_seed.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(replay?.cold_start_seed.warnings.some((item) => item.startsWith('evidence-revalidate:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('evidence-ledger:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('evidência:')))
  assert.ok(replayOnlyPack?.evidence_ledger?.proven_memory.some((item) => item.kind === 'truth' || item.kind === 'artifact'))
  assert.ok(replayOnlyPack?.next_session_brain?.load_order.some((item) => item.startsWith('evidence-ledger:') || item.startsWith('evidence-trust:')))
  assert.doesNotMatch(JSON.stringify(pack.evidence_ledger), /operator_input|response_text|prompt|\/Users\/|thread_id|source_thread_ids|"raw_conversation_included":true/)
})

test('AWIS learning cadence turns daily outcomes into compounding cold-start memory', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'atlas-server/app/Http/Controllers/AtlasCodeController.php', kind: 'codigo' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'TypeScript build', command: 'npx tsc -b', kind: 'build', source: 'atlas-desktop/package.json' },
      { label: 'Server tests', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-26T10:00:00Z',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
    spaceBrainLabels: ['Fluxo AWIS:comparar funciona'],
    feedbackPromoteLabels: ['space-brain:Fluxo AWIS:comparar funciona'],
    feedbackArtifactLabels: ['Fluxo AWIS:pack'],
    repositoryConstellationLabels: ['bridge:atlas-desktop->atlas-server'],
    learningFlywheelLabels: ['load:contexto validado'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-26T11:00:00Z',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npx tsc -b'],
    componentKeys: ['atlas-server'],
    recoveryLabels: ['revalidar build antes de promover'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Fluxo AWIS comparar',
      thread_count: 2,
      message_count: 12,
      mode_count: 1,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code'],
      recommended_use: ['comparar sessões', 'reusar contexto AWIS'],
      sessions: [],
    },
  ])
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(pack?.learning_cadence)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-26T18:30:00Z')
  if (!artifact) throw new Error('expected AWIS learning cadence artifact')
  const dirtyCadenceArtifact = structuredClone(artifact) as typeof artifact
  assert.ok(dirtyCadenceArtifact.payload.learning_cadence_projection)
  dirtyCadenceArtifact.payload.learning_cadence_projection.cadence_hash = '/Users/vitorepf/private/cadence'
  dirtyCadenceArtifact.payload.learning_cadence_projection.promote_today.unshift('operator_input promover hoje')
  dirtyCadenceArtifact.payload.learning_cadence_projection.revalidate_today.unshift('response_text revalidar hoje')
  dirtyCadenceArtifact.payload.learning_cadence_projection.decay_candidates.unshift('raw_conversation decair')
  dirtyCadenceArtifact.payload.learning_cadence_projection.repository_focus.unshift({
    key: '/Users/vitorepf/private/repo',
    reason: 'full_message repo focus',
    confidence: 90,
  })
  dirtyCadenceArtifact.payload.learning_cadence_projection.next_session.load_first.unshift('raw_conversation load')
  dirtyCadenceArtifact.payload.learning_cadence_projection.next_session.write_back.unshift('operator_input writeback')
  dirtyCadenceArtifact.payload.learning_cadence_projection.next_session.preserve_artifacts.unshift('response_text artifact')
  dirtyCadenceArtifact.payload.learning_cadence_projection.proof.evidence_refs.unshift('full_message evidence')
  dirtyCadenceArtifact.payload.learning_cadence_projection.proof.human_review.unshift('raw_conversation human')
  const dirtyCadenceStore = storage()
  saveAwisWorkspaceArtifact(dirtyCadenceArtifact, dirtyCadenceStore)
  const dirtyCadenceReplay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, dirtyCadenceStore))
  const dirtyCadenceJson = JSON.stringify({
    loaded: loadAwisWorkspaceArtifacts(key, dirtyCadenceStore)[0],
    replay: dirtyCadenceReplay,
  })
  assert.ok(dirtyCadenceReplay?.cold_start_seed.load_order.some((item) => item.startsWith('cadence:')))
  assert.doesNotMatch(dirtyCadenceJson, /\/Users\/|operator_input promover hoje|operator_input writeback|response_text revalidar hoje|response_text artifact|raw_conversation decair|raw_conversation load|raw_conversation human|full_message repo focus|full_message evidence/)
  saveAwisWorkspaceArtifact(artifact, store)
  const loadedArtifact = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const replayOnlyPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    artifactReplay: replay,
  })

  assert.equal(pack.learning_cadence.schema_version, 'atlas.awis.workspace_learning_cadence_projection.v1')
  assert.equal(pack.learning_cadence.daily_key, '2026-05-26')
  assert.equal(pack.learning_cadence.pulse.sessions_today, 2)
  assert.equal(pack.learning_cadence.pulse.successful_today, 1)
  assert.equal(pack.learning_cadence.pulse.failed_today, 1)
  assert.ok(pack.learning_cadence.promote_today.some((item) => item.includes('npm run atlas-ai:test') || item.includes('space-brain')))
  assert.ok(pack.learning_cadence.revalidate_today.some((item) => item.includes('npx tsc -b') || item.includes('revalidar build')))
  assert.ok(pack.learning_cadence.repository_focus.some((repo) => repo.key === 'atlas-desktop'))
  assert.ok(pack.learning_cadence.next_session.load_first.length)
  assert.ok(pack.next_session_brain?.load_order.some((item) => item.startsWith('cadence:') || item.startsWith('cadence-load:')))
  assert.equal(artifact.payload.learning_cadence_projection?.cadence_hash, pack.learning_cadence.cadence_hash)
  assert.equal(loadedArtifact?.payload.learning_cadence_projection?.cadence_hash, pack.learning_cadence.cadence_hash)
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('cadence:')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('cadence-promote:')))
  assert.ok(replay?.cold_start_seed.validate_with.some((item) => item.startsWith('cadence:')))
  assert.ok(replay?.cold_start_seed.warnings.some((item) => item.startsWith('cadence-revalidate:')))
  assert.ok(replay?.cold_start_seed.automation_hooks.some((item) => item.startsWith('cadence:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('cadence:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('cadência:')))
  assert.ok(replayOnlyPack?.next_session_brain?.load_order.some((item) => item.startsWith('cadence:') || item.startsWith('cadence-load:')))
  assert.doesNotMatch(JSON.stringify(pack.learning_cadence), /operator_input|response_text|prompt|\/Users\/|thread_id|source_thread_ids|"raw_conversation_included":true/)
})

test('AWIS learning chronicle compresses multi-day outcomes into replayable workspace history', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/awisWorkspaceMemory.ts', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'TypeScript build', command: 'npx tsc -b', kind: 'build', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-25T09:00:00Z',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'analysis',
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
    feedbackPromoteLabels: ['composer:payload canon validado'],
    feedbackArtifactLabels: ['artifact:startup-pack'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-26T10:00:00Z',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npx tsc -b'],
    componentKeys: ['atlas-desktop'],
    repositoryConstellationLabels: ['bridge:atlas-desktop->atlas-server'],
    learningFlywheelLabels: ['promover crônica replayável'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-26T11:00:00Z',
    channel: 'workbench',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-server'],
    recoveryLabels: ['revalidar ponte desktop/server antes de promover'],
    feedbackRevalidateLabels: ['ponte atlas-desktop->atlas-server'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Crônica AWIS',
      thread_count: 2,
      message_count: 10,
      mode_count: 1,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code'],
      recommended_use: ['usar histórico comprimido', 'revalidar regressões'],
      sessions: [],
    },
  ])
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(pack?.learning_chronicle)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-26T18:45:00Z')
  if (!artifact) throw new Error('expected AWIS learning chronicle artifact')
  const dirtyChronicleArtifact = structuredClone(artifact) as typeof artifact
  assert.ok(dirtyChronicleArtifact.payload.learning_chronicle_projection)
  dirtyChronicleArtifact.payload.learning_chronicle_projection.chronicle_hash = '/Users/vitorepf/private/chronicle'
  dirtyChronicleArtifact.payload.learning_chronicle_projection.gold_trail.unshift('operator_input gold')
  dirtyChronicleArtifact.payload.learning_chronicle_projection.regression_radar.unshift('response_text regression')
  dirtyChronicleArtifact.payload.learning_chronicle_projection.timeline.unshift({
    day: '/Users/vitorepf/private/day',
    sessions: 1,
    successes: 1,
    failures: 0,
    promoted: ['raw_conversation promoted'],
    revalidated: ['operator_input revalidated'],
    repositories: ['/Users/vitorepf/private/repo'],
    artifacts: ['response_text artifact'],
    summary: 'full_message summary',
  })
  dirtyChronicleArtifact.payload.learning_chronicle_projection.repository_story.unshift({
    key: '/Users/vitorepf/private/repo',
    days_seen: 1,
    signals: ['raw_conversation signal'],
    confidence: 90,
  })
  dirtyChronicleArtifact.payload.learning_chronicle_projection.next_session.start_with.unshift('operator_input start')
  dirtyChronicleArtifact.payload.learning_chronicle_projection.next_session.write_back.unshift('response_text writeback')
  dirtyChronicleArtifact.payload.learning_chronicle_projection.next_session.preserve.unshift('full_message preserve')
  dirtyChronicleArtifact.payload.learning_chronicle_projection.proof.evidence_refs.unshift('raw_conversation evidence')
  dirtyChronicleArtifact.payload.learning_chronicle_projection.proof.human_review.unshift('operator_input human')
  const dirtyChronicleStore = storage()
  saveAwisWorkspaceArtifact(dirtyChronicleArtifact, dirtyChronicleStore)
  const dirtyChronicleReplay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, dirtyChronicleStore))
  const dirtyChronicleJson = JSON.stringify({
    loaded: loadAwisWorkspaceArtifacts(key, dirtyChronicleStore)[0],
    replay: dirtyChronicleReplay,
  })
  assert.ok(dirtyChronicleReplay?.cold_start_seed.load_order.some((item) => item.startsWith('chronicle:')))
  assert.doesNotMatch(dirtyChronicleJson, /\/Users\/|operator_input gold|operator_input revalidated|operator_input start|operator_input human|response_text regression|response_text artifact|response_text writeback|raw_conversation promoted|raw_conversation signal|raw_conversation evidence|full_message summary|full_message preserve/)
  saveAwisWorkspaceArtifact(artifact, store)
  const loadedArtifact = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const replayOnlyPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    artifactReplay: replay,
  })

  assert.equal(pack.learning_chronicle.schema_version, 'atlas.awis.workspace_learning_chronicle_projection.v1')
  assert.ok(pack.learning_chronicle.timeline.some((entry) => entry.day === '2026-05-25'))
  assert.ok(pack.learning_chronicle.timeline.some((entry) => entry.day === '2026-05-26' && entry.failures === 1))
  assert.ok(pack.learning_chronicle.gold_trail.some((item) => item.includes('npx tsc -b') || item.includes('composer:payload')))
  assert.ok(pack.learning_chronicle.regression_radar.some((item) => item.includes('ponte atlas-desktop') || item.includes('revalidar ponte')))
  assert.ok(pack.learning_chronicle.repository_story.some((repo) => repo.key === 'atlas-desktop'))
  assert.ok(pack.learning_chronicle.next_session.start_with.some((item) => item.startsWith('chronicle-gold:') || item.startsWith('chronicle-repo:')))
  assert.ok(pack.next_session_brain?.load_order.some((item) => item.startsWith('chronicle:') || item.startsWith('chronicle-load:')))
  assert.equal(artifact.payload.learning_chronicle_projection?.chronicle_hash, pack.learning_chronicle.chronicle_hash)
  assert.equal(loadedArtifact?.payload.learning_chronicle_projection?.chronicle_hash, pack.learning_chronicle.chronicle_hash)
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('chronicle:')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('chronicle-gold:')))
  assert.ok(replay?.cold_start_seed.warnings.some((item) => item.startsWith('chronicle-regression:')))
  assert.ok(replay?.cold_start_seed.automation_hooks.some((item) => item.startsWith('chronicle:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('chronicle:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('crônica:')))
  assert.ok(replayOnlyPack?.learning_chronicle)
  assert.ok(replayOnlyPack?.next_session_brain?.load_order.some((item) => item.startsWith('chronicle:') || item.startsWith('chronicle-load:')))
  assert.doesNotMatch(JSON.stringify(pack.learning_chronicle), /operator_input|response_text|prompt|\/Users\/|thread_id|source_thread_ids|"raw_conversation_included":true/)
})

test('AWIS autonomic queue turns memory into prioritized safe maintenance actions', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/awisWorkspaceMemory.ts', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'TypeScript build', command: 'npx tsc -b', kind: 'build', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-26T09:00:00Z',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
    contextGoldLabels: ['composer por pane validado'],
    feedbackPromoteLabels: ['workbench:comparar validado'],
    feedbackArtifactLabels: ['artifact:workbench-pack'],
    repositoryConstellationLabels: ['bridge:atlas-desktop->atlas-server'],
    folderCortexLabels: [
      'area:atlas-desktop:autoload:88',
      'validate:atlas-desktop:npm run atlas-ai:test',
    ],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-26T10:00:00Z',
    channel: 'conversation',
    status: 'failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['php artisan test'],
    componentKeys: ['atlas-server'],
    recoveryLabels: ['revalidar ponte server antes de promover'],
    feedbackRevalidateLabels: ['ponte atlas-desktop->atlas-server'],
    folderCortexLabels: [
      'area:atlas-server:autoload:68',
      'validate:atlas-server:php artisan test',
    ],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Workbench comparar',
      thread_count: 2,
      message_count: 16,
      mode_count: 1,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code'],
      recommended_use: ['comparar sessões', 'preservar pack seguro'],
      sessions: [],
    },
  ])
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(pack?.autonomic_queue)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-26T19:00:00Z')
  if (!artifact) throw new Error('expected AWIS autonomic queue artifact')
  const dirtyAutonomicArtifact = structuredClone(artifact) as typeof artifact
  assert.ok(dirtyAutonomicArtifact.payload.autonomic_queue_projection)
  dirtyAutonomicArtifact.payload.autonomic_queue_projection.queue_hash = '/Users/vitorepf/private/autonomic'
  dirtyAutonomicArtifact.payload.autonomic_queue_projection.priority_queue.unshift({
    action: 'record_outcome',
    label: 'operator_input queue',
    reason: 'response_text queue reason',
    priority: 'high',
    run_policy: 'safe_local',
    source_layers: ['raw_conversation layer'],
    validate_with: ['full_message validate'],
    write_back: ['operator_input writeback'],
  })
  dirtyAutonomicArtifact.payload.autonomic_queue_projection.heartbeat.before_send.unshift('/Users/vitorepf/private/before')
  dirtyAutonomicArtifact.payload.autonomic_queue_projection.heartbeat.after_success.unshift('response_text success')
  dirtyAutonomicArtifact.payload.autonomic_queue_projection.heartbeat.preserve_artifacts.unshift('raw_conversation artifact')
  dirtyAutonomicArtifact.payload.autonomic_queue_projection.human_boundary.unshift('full_message human')
  dirtyAutonomicArtifact.payload.autonomic_queue_projection.proof.evidence.unshift('operator_input evidence')
  dirtyAutonomicArtifact.payload.autonomic_queue_projection.proof.never_automate.unshift('raw_conversation never')
  const dirtyAutonomicStore = storage()
  saveAwisWorkspaceArtifact(dirtyAutonomicArtifact, dirtyAutonomicStore)
  const dirtyAutonomicReplay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, dirtyAutonomicStore))
  const dirtyAutonomicJson = JSON.stringify({
    loaded: loadAwisWorkspaceArtifacts(key, dirtyAutonomicStore)[0],
    replay: dirtyAutonomicReplay,
  })
  assert.ok(dirtyAutonomicReplay?.cold_start_seed.load_order.some((item) => item.startsWith('autonomic:')))
  assert.doesNotMatch(dirtyAutonomicJson, /\/Users\/|operator_input queue|operator_input writeback|operator_input evidence|response_text queue reason|response_text success|raw_conversation layer|raw_conversation artifact|raw_conversation never|full_message validate|full_message human/)
  saveAwisWorkspaceArtifact(artifact, store)
  const loadedArtifact = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const replayOnlyPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: null,
    memory: null,
    artifactReplay: replay,
  })

  assert.equal(pack.autonomic_queue.schema_version, 'atlas.awis.workspace_autonomic_queue_projection.v1')
  assert.ok(pack.autonomic_queue.priority_queue.some((item) => item.run_policy === 'manual_confirm'))
  assert.ok(pack.autonomic_queue.priority_queue.some((item) => item.run_policy === 'safe_local'))
  assert.ok(pack.autonomic_queue.priority_queue.some((item) => item.action === 'revalidate_context' || item.action === 'review_risk'))
  assert.ok(pack.autonomic_queue.priority_queue.some((item) => item.action === 'revalidate_context' && item.label === 'folder:atlas-server:guarded'))
  assert.ok(pack.autonomic_queue.priority_queue.some((item) => item.action === 'preserve_artifact' && item.label === 'folder:atlas-desktop:trusted'))
  assert.ok(pack.autonomic_queue.heartbeat.before_send.length)
  assert.ok(pack.autonomic_queue.heartbeat.after_success.length)
  assert.ok(pack.autonomic_queue.human_boundary.some((item) => item.includes('revalidate') || item.includes('command') || item.includes('comando')))
  assert.ok(artifact.manifest.promote_signals.some((item) => item.startsWith('autonomic-success:')))
  assert.ok(artifact.manifest.promote_signals.some((item) => item.startsWith('autonomic-preserve:')))
  assert.ok(artifact.manifest.caution_signals.some((item) => item.startsWith('autonomic-human:') || item.startsWith('autonomic-never:')))
  assert.ok(pack.next_session_brain?.load_order.some((item) => item.startsWith('autonomic:') || item.startsWith('autonomic-action:')))
  assert.ok(pack.next_session_brain?.context_loading.automation_hooks.some((item) => item.startsWith('autonomic-')))
  assert.equal(artifact.payload.autonomic_queue_projection?.queue_hash, pack.autonomic_queue.queue_hash)
  assert.ok(artifact.payload.autonomic_queue_projection?.priority_queue.some((item) => item.label === 'folder:atlas-server:guarded'))
  assert.equal(loadedArtifact?.payload.autonomic_queue_projection?.queue_hash, pack.autonomic_queue.queue_hash)
  assert.ok(loadedArtifact?.manifest.promote_signals.some((item) => item.startsWith('autonomic-success:')))
  assert.ok(loadedArtifact?.manifest.promote_signals.some((item) => item.startsWith('autonomic-preserve:')))
  assert.ok(loadedArtifact?.manifest.caution_signals.some((item) => item.startsWith('autonomic-human:') || item.startsWith('autonomic-never:')))
  assert.ok(replay?.cold_start_seed.load_order.some((item) => item.startsWith('autonomic:')))
  assert.ok(replay?.cold_start_seed.context_signals.some((item) => item.startsWith('autonomic-proof:')))
  assert.ok(replay?.cold_start_seed.validate_with.some((item) => item.startsWith('autonomic:')))
  assert.ok(replay?.cold_start_seed.automation_hooks.some((item) => item.startsWith('autonomic-before:') || item.startsWith('autonomic-success:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('artifact-promote:autonomic-success:') || pattern.startsWith('artifact-promote:autonomic-preserve:')))
  assert.ok(replay?.reusable_startup_gold.warnings.some((warning) => warning.startsWith('artifact-caution:autonomic-human:') || warning.startsWith('artifact-caution:autonomic-never:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('autonomia:')))
  assert.ok(replayOnlyPack?.autonomic_queue)
  assert.ok(replayOnlyPack?.next_session_brain?.load_order.some((item) => item.startsWith('autonomic:') || item.startsWith('autonomic-action:')))
  assert.doesNotMatch(JSON.stringify(pack.autonomic_queue), /operator_input|response_text|prompt|\/Users\/|thread_id|source_thread_ids|"raw_conversation_included":true/)
})

test('AWIS impact map computes blast radius and validation cascade before changes', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const serverKey = workspaceMemoryKey('/Users/vitorepf/develop/Atlas/atlas-server', 'atlas-server')
  const store = storage()
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'atlas-server/app/Http/Controllers/AtlasCodeController.php', kind: 'codigo' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'PHPUnit', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['php artisan test'],
    componentKeys: ['atlas-server'],
  }).memory
  const serverMemory = learnAwisWorkspaceMemory(null, brain({
    rootName: 'atlas-server',
    rootPath: '/Users/vitorepf/develop/Atlas/atlas-server',
    signals: ['Laravel', 'PHP'],
    commands: [{ label: 'PHPUnit', command: 'php artisan test', kind: 'test', source: 'composer.json' }],
  }), serverKey).memory
  const relations = buildAwisWorkspaceRelationProjection({ [key]: memory, [serverKey]: serverMemory }, key)
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    relations,
  })
  assert.ok(pack?.impact_map)
  const directImpactMap = buildAwisWorkspaceImpactMapProjection({
    topology: pack.topology,
    componentMemory: pack.component_memory,
    semanticIndex: pack.semantic_index,
    learning: pack.learning ?? null,
    relations,
    spaces: null,
    artifactReplay: null,
    memoryFreshness: pack.memory_freshness,
    folderCortex: pack.folder_cortex,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir contrato backend que quebra desktop')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T23:11:00Z')
  assert.ok(artifact)
  saveAwisWorkspaceArtifact(artifact, store)
  const loadedArtifact = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const serverImpact = pack.impact_map.component_impacts.find((impact) => impact.component_key === 'atlas-server')
  const dirtyImpactArtifact = structuredClone(artifact) as typeof artifact
  assert.ok(dirtyImpactArtifact.payload.impact_map_projection)
  dirtyImpactArtifact.payload.impact_map_projection.component_impacts.unshift({
    component_key: 'atlas-server',
    change_signals: ['operator_input impact signal'],
    affected_components: ['atlas-desktop'],
    validation_cascade: ['response_text impact validation'],
    risk: 'high',
    reason: 'raw_conversation impact reason',
    confidence: 100,
  })
  dirtyImpactArtifact.payload.impact_map_projection.cross_workspace_impacts.unshift({
    workspace_hint: '/Users/vitorepf/private/impact',
    trigger_components: ['atlas-server'],
    reuse: ['full_message impact reuse'],
    revalidate: ['operator_input impact revalidate'],
    confidence: 100,
  })
  const dirtyImpactStore = storage()
  saveAwisWorkspaceArtifact(dirtyImpactArtifact, dirtyImpactStore)
  const dirtyImpactArtifacts = loadAwisWorkspaceArtifacts(key, dirtyImpactStore)
  const dirtyImpactReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyImpactArtifacts)
  const dirtyImpactJson = JSON.stringify({ artifact: dirtyImpactArtifacts[0], replay: dirtyImpactReplay })
  assert.ok(dirtyImpactReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('impact:')))
  assert.doesNotMatch(dirtyImpactJson, /\/Users\/|operator_input impact signal|operator_input impact revalidate|response_text impact validation|raw_conversation impact reason|full_message impact reuse/)

  assert.equal(pack.impact_map.schema_version, 'atlas.awis.workspace_impact_map_projection.v1')
  assert.ok(serverImpact)
  assert.ok(serverImpact.affected_components.includes('atlas-desktop'))
  assert.ok(serverImpact.validation_cascade.includes('php artisan test'))
  assert.ok(['medium', 'high'].includes(serverImpact.risk))
  assert.ok(serverImpact.change_signals.some((signal) => signal.startsWith('folder-cortex:atlas-server:')))
  assert.match(serverImpact.reason, /Folder Cortex/)
  assert.equal(pack.impact_map.safety.provider_safe, true)
  assert.ok(['atlas-server', 'atlas-desktop'].includes(task?.recommended_context.impact_radius.primary_component ?? ''))
  assert.ok(task?.recommended_context.impact_radius.affected_components.some((component) => component === 'atlas-desktop' || component === 'atlas-server'))
  assert.ok(task?.execution_plan.validation_commands.includes('php artisan test'))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('impact-radius:')))
  assert.ok(capsule?.validate_with.some((item) => item.includes('php artisan test')))
  assert.equal(artifact.payload.impact_map_projection?.schema_version, 'atlas.awis.workspace_impact_map_projection.v1')
  assert.equal(loadedArtifact?.payload.impact_map_projection?.schema_version, 'atlas.awis.workspace_impact_map_projection.v1')
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('impact:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('impacto:')))
  assert.deepEqual(directImpactMap, pack.impact_map)
  assert.doesNotMatch(JSON.stringify(pack.impact_map), /operator_input|response_text|prompt|\/Users\/|thread_id|source_thread_ids|"raw_conversation_included":true/)
})

test('AWIS preflight compiles context impact validation and learning gates', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'atlas-server/app/Http/Controllers/AtlasCodeController.php', kind: 'codigo' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'PHPUnit', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'code_change',
    routeKey: 'task:code_change',
    routeLabel: 'mudança de código',
    validationCommands: ['npm run atlas-ai:test', 'php artisan test'],
    componentKeys: ['atlas-desktop', 'atlas-server'],
    folderCortexLabels: [
      'area:atlas-desktop:autoload:90',
      'area:atlas-server:guarded:74',
      'validate:atlas-desktop:npm run atlas-ai:test',
      'validate:atlas-server:php artisan test',
    ],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  assert.ok(pack?.preflight)
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'implementar ajuste no desktop que conversa com backend')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-25T01:12:00Z')
  assert.ok(artifact)
  saveAwisWorkspaceArtifact(artifact, store)
  const loadedArtifact = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const directPreflight = buildAwisWorkspacePreflightProjection({
    workspaceRootKnown: true,
    executionDoctrine: pack.execution_doctrine,
    startupOrchestration: pack.startup_orchestration,
    memoryConsolidation: pack.memory_consolidation,
    impactMap: pack.impact_map,
    semanticIndex: pack.semantic_index,
    taskRouter: pack.task_router,
    retention: pack.retention,
    memoryFreshness: pack.memory_freshness,
    componentMemory: pack.component_memory,
    contextKernel: pack.context_kernel,
    spaces: pack.spaces,
    artifactReplay: pack.artifact_replay,
  })
  const dirtyPreflightArtifact = structuredClone(artifact) as typeof artifact
  assert.ok(dirtyPreflightArtifact.payload.preflight_projection)
  dirtyPreflightArtifact.payload.preflight_projection.gates.unshift({
    gate: 'context',
    status: 'warn',
    label: 'operator_input preflight label',
    required: true,
    evidence: ['response_text preflight evidence'],
  })
  dirtyPreflightArtifact.payload.preflight_projection.execution_lanes.before_send.unshift('raw_conversation preflight before')
  dirtyPreflightArtifact.payload.preflight_projection.execution_lanes.before_execution.unshift('full_message preflight execution')
  dirtyPreflightArtifact.payload.preflight_projection.execution_lanes.after_success.unshift('operator_input preflight success')
  dirtyPreflightArtifact.payload.preflight_projection.execution_lanes.after_failure.unshift('response_text preflight failure')
  dirtyPreflightArtifact.payload.preflight_projection.promotion_contract.promote_when.unshift('/Users/vitorepf/private/preflight')
  dirtyPreflightArtifact.payload.preflight_projection.promotion_contract.demote_when.unshift('raw_conversation preflight demote')
  const dirtyPreflightStore = storage()
  saveAwisWorkspaceArtifact(dirtyPreflightArtifact, dirtyPreflightStore)
  const dirtyPreflightArtifacts = loadAwisWorkspaceArtifacts(key, dirtyPreflightStore)
  const dirtyPreflightReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyPreflightArtifacts)
  const dirtyPreflightJson = JSON.stringify({ artifact: dirtyPreflightArtifacts[0], replay: dirtyPreflightReplay })
  assert.ok(dirtyPreflightReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('preflight:')))
  assert.doesNotMatch(dirtyPreflightJson, /\/Users\/|operator_input preflight label|operator_input preflight success|response_text preflight evidence|response_text preflight failure|raw_conversation preflight before|raw_conversation preflight demote|full_message preflight execution/)

  assert.equal(pack.preflight.schema_version, 'atlas.awis.workspace_preflight_projection.v1')
  assert.ok(pack.preflight.gates.some((gate) => gate.gate === 'context'))
  assert.ok(pack.preflight.gates.some((gate) => gate.gate === 'validation'))
  assert.ok(pack.preflight.gates.some((gate) => gate.gate === 'learning'))
  assert.ok(pack.preflight.execution_lanes.before_send.length > 0)
  assert.ok(pack.preflight.execution_lanes.before_execution.some((item) => /test|validar|tsc|php/i.test(item)))
  assert.equal(pack.preflight.safety.provider_safe, true)
  assert.equal(pack.preflight.safety.external_side_effects_allowed, false)
  assert.ok(task?.execution_plan.preflight_gates.some((gate) => gate.startsWith('pré-voo:')))
  assert.ok(task?.execution_plan.preflight_gates.some((gate) => gate.includes('validation') || gate.includes('learning')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('preflight:')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('pré-execução:') || item.startsWith('pré-voo:')))
  assert.equal(artifact.payload.preflight_projection?.schema_version, 'atlas.awis.workspace_preflight_projection.v1')
  assert.equal(loadedArtifact?.payload.preflight_projection?.schema_version, 'atlas.awis.workspace_preflight_projection.v1')
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('preflight:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('pré-voo:') || action.startsWith('pré-execução:')))
  assert.deepEqual(directPreflight, pack.preflight)
  assert.doesNotMatch(JSON.stringify(pack.preflight), /operator_input|response_text|prompt|\/Users\/|thread_id|source_thread_ids|"raw_conversation_included":true/)
})

test('AWIS workspace twin compiles a living genome and context autopilot', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const store = storage()
  const snapshot = brain({
    signals: ['Laravel', 'Tauri', 'React', 'TypeScript'],
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx', kind: 'codigo' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/atlas-ai.css', kind: 'codigo' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'atlas-server/docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md', kind: 'documento' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'TypeScript', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
      { label: 'PHPUnit', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'code_change',
    validationCommands: ['npm run atlas-ai:test', 'npx tsc -b'],
    componentKeys: ['atlas-desktop'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  assert.ok(pack?.workspace_twin)
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir AWIS no desktop e validar backend')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-25T02:12:00Z')
  assert.ok(artifact)
  saveAwisWorkspaceArtifact(artifact, store)
  const loadedArtifact = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const directTwin = buildAwisWorkspaceTwinProjection({
    workspaceKey: key,
    topology: pack.topology,
    componentMemory: pack.component_memory,
    semanticIndex: pack.semantic_index,
    impactMap: pack.impact_map,
    executionDoctrine: pack.execution_doctrine,
    memoryFreshness: pack.memory_freshness,
    sessionGold: pack.session_gold,
    artifactReplay: pack.artifact_replay,
    preflight: pack.preflight,
  })
  const dirtyTwinArtifact = structuredClone(artifact) as typeof artifact
  assert.ok(dirtyTwinArtifact.payload.workspace_twin_projection)
  dirtyTwinArtifact.payload.workspace_twin_projection.hashes.genome_hash = 'operator_input twin hash'
  dirtyTwinArtifact.payload.workspace_twin_projection.genome.stack.unshift('response_text twin stack')
  dirtyTwinArtifact.payload.workspace_twin_projection.genome.commands.unshift('raw_conversation twin command')
  dirtyTwinArtifact.payload.workspace_twin_projection.genome.risk_zones.unshift('full_message twin risk')
  dirtyTwinArtifact.payload.workspace_twin_projection.live_map.components.unshift({
    key: 'atlas-desktop',
    role: 'operator_input twin role',
    maturity: 'stable',
    confidence: 100,
  })
  dirtyTwinArtifact.payload.workspace_twin_projection.live_map.connections.unshift('response_text twin connection')
  dirtyTwinArtifact.payload.workspace_twin_projection.live_map.fragile_areas.unshift('raw_conversation twin fragile')
  dirtyTwinArtifact.payload.workspace_twin_projection.context_autopilot.load_first.unshift('full_message twin load')
  dirtyTwinArtifact.payload.workspace_twin_projection.context_autopilot.validate.unshift('/Users/vitorepf/private/twin')
  dirtyTwinArtifact.payload.workspace_twin_projection.context_autopilot.reason = 'operator_input twin reason'
  dirtyTwinArtifact.payload.workspace_twin_projection.learning_loop.reuse_next_session.unshift('response_text twin reuse')
  const dirtyTwinStore = storage()
  saveAwisWorkspaceArtifact(dirtyTwinArtifact, dirtyTwinStore)
  const dirtyTwinArtifacts = loadAwisWorkspaceArtifacts(key, dirtyTwinStore)
  const dirtyTwinReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyTwinArtifacts)
  const dirtyTwinJson = JSON.stringify({ artifact: dirtyTwinArtifacts[0], replay: dirtyTwinReplay })
  assert.ok(dirtyTwinReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('twin-app:') || pattern.startsWith('twin-hash:')))
  assert.doesNotMatch(dirtyTwinJson, /\/Users\/|operator_input twin hash|operator_input twin role|operator_input twin reason|response_text twin stack|response_text twin connection|response_text twin reuse|raw_conversation twin command|raw_conversation twin fragile|full_message twin risk|full_message twin load/)

  assert.equal(pack.workspace_twin.schema_version, 'atlas.awis.workspace_twin_projection.v1')
  assert.ok(pack.workspace_twin.genome.stack.includes('Node/JavaScript') || pack.workspace_twin.genome.stack.includes('Tauri'))
  assert.ok(pack.workspace_twin.genome.apps.includes('atlas-desktop'))
  assert.ok(pack.workspace_twin.genome.commands.includes('npm run atlas-ai:test'))
  assert.ok(pack.workspace_twin.genome.test_families.length > 0)
  assert.ok(pack.workspace_twin.hashes.genome_hash.startsWith('twin-'))
  assert.ok(pack.workspace_twin.context_autopilot.validate.some((item) => /test|tsc/i.test(item)))
  assert.ok(pack.workspace_twin.learning_loop.reuse_next_session.length > 0)
  assert.equal(pack.workspace_twin.safety.provider_safe, true)
  assert.equal(pack.workspace_twin.safety.external_side_effects_allowed, false)
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('twin:')))
  assert.ok(task?.execution_plan.preflight_gates.some((gate) => gate.startsWith('twin:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('workspace-twin:')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('twin:')))
  assert.equal(artifact.payload.workspace_twin_projection?.schema_version, 'atlas.awis.workspace_twin_projection.v1')
  assert.equal(loadedArtifact?.payload.workspace_twin_projection?.schema_version, 'atlas.awis.workspace_twin_projection.v1')
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('twin-app:') || pattern.startsWith('twin-hash:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('twin:')))
  assert.deepEqual(directTwin, pack.workspace_twin)
  assert.doesNotMatch(JSON.stringify(pack.workspace_twin), /operator_input|response_text|prompt|\/Users\/|thread_id|source_thread_ids|"raw_conversation_included":true/)
})

test('AWIS component memory remembers failed areas without poisoning the whole workspace', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'PHPUnit', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'send_failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['php artisan test'],
    componentKeys: ['atlas-server'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  const serverMemory = pack?.component_memory?.strongest_components.find((component) => component.key === 'atlas-server')
  const desktopMemory = pack?.component_memory?.strongest_components.find((component) => component.key === 'atlas-desktop')
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no atlas server php')

  assert.ok(serverMemory)
  assert.equal(serverMemory.outcome_memory.success_count, 0)
  assert.equal(serverMemory.outcome_memory.failure_count, 1)
  assert.ok(serverMemory.outcome_memory.caution_signals.some((signal) => signal.includes('send_failed')))
  assert.equal(serverMemory.reuse_policy.can_autoload, false)
  assert.equal(serverMemory.reuse_policy.validate_before_execution, true)
  assert.ok(desktopMemory)
  assert.equal(desktopMemory.outcome_memory.failure_count, 0)
  assert.ok(task?.recommended_context.component_context_packs.find((componentPack) => (
    componentPack.key === 'atlas-server'
    && componentPack.avoid.some((item) => /revalidar|validar/i.test(item))
  )))
  assert.doesNotMatch(JSON.stringify(pack?.component_memory), /operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS task recovery playbook turns failed validation into safe retry policy', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'send_failed',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test', 'npx tsc -b'],
    contextGoldLabels: ['component:atlas-server'],
    componentKeys: ['atlas-server'],
    folderCortexLabels: [
      'area:atlas-server:guarded:68',
      'validate:atlas-server:php artisan test',
    ],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no atlas server e recuperar falha')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)

  assert.ok(task?.execution_plan.recovery_playbook.retry_order.some((item) => item.includes('fallback') || item.includes('demover')))
  assert.ok(task?.execution_plan.recovery_playbook.retry_order.some((item) => item.includes('Folder Cortex:atlas-server')))
  assert.ok(task?.execution_plan.recovery_playbook.fallback_validation.includes('npm run atlas-ai:test'))
  assert.ok(task?.execution_plan.recovery_playbook.fallback_validation.includes('php artisan test'))
  assert.ok(task?.execution_plan.recovery_playbook.demote_context.some((item) => item.includes('component:atlas-server') || item.includes('atlas-server')))
  assert.ok(task?.execution_plan.recovery_playbook.demote_context.some((item) => item.includes('folder-cortex:atlas-server')))
  assert.ok(task?.execution_plan.recovery_playbook.safe_resume.some((item) => item.includes('provider fallback') || item.includes('validar novamente')))
  assert.ok(task?.execution_plan.recovery_playbook.safe_resume.some((item) => item.includes('Folder Cortex:atlas-server')))
  assert.match(task?.execution_plan.recovery_playbook.reason ?? '', /Folder Cortex.*atlas-server/)
  assert.ok(capsule?.continue_learning.recovery_playbook.demote_context.some((item) => item.includes('atlas-server')))
  assert.doesNotMatch(JSON.stringify({ task, capsule }), /\/Users\/|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS execution doctrine turns workspace memory into task gates and human boundaries', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx', kind: 'codigo' },
      { path: 'atlas-server/routes/api.php', kind: 'codigo' },
      { path: 'docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md', kind: 'documento' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'code_change',
    validationCommands: ['npm run atlas-ai:test', 'npx tsc -b'],
    componentKeys: ['atlas-desktop'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  assert.ok(pack?.execution_doctrine)
  const directDoctrine = buildAwisWorkspaceExecutionDoctrineProjection({
    memory,
    learning: pack.learning ?? null,
    topology: pack.topology,
    componentMemory: pack.component_memory,
    contextKernel: pack.context_kernel,
    confidence: pack.confidence,
    memoryFreshness: pack.memory_freshness,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug visual no atlas desktop com teste')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T23:00:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const dirtyDoctrineArtifact = artifact ? structuredClone(artifact) as typeof artifact : null
  assert.ok(dirtyDoctrineArtifact?.payload.execution_doctrine_projection)
  dirtyDoctrineArtifact.payload.execution_doctrine_projection.doctrine_drivers.unshift({
    name: 'TDD',
    applies_to: ['bug_fix'],
    required: true,
    gate: 'operator_input doctrine gate',
    reason: 'response_text doctrine reason',
  })
  dirtyDoctrineArtifact.payload.execution_doctrine_projection.preflight.required_before_execution.unshift('raw_conversation doctrine required')
  dirtyDoctrineArtifact.payload.execution_doctrine_projection.preflight.human_responsibility.unshift('full_message doctrine human')
  dirtyDoctrineArtifact.payload.execution_doctrine_projection.preflight.automation.unshift('/Users/vitorepf/private/doctrine')
  dirtyDoctrineArtifact.payload.execution_doctrine_projection.command_policy.trusted.unshift('operator_input doctrine trusted')
  dirtyDoctrineArtifact.payload.execution_doctrine_projection.command_policy.revalidate.unshift('response_text doctrine revalidate')
  dirtyDoctrineArtifact.payload.execution_doctrine_projection.command_policy.avoid.unshift('raw_conversation doctrine avoid')
  dirtyDoctrineArtifact.payload.execution_doctrine_projection.learning_contract.promote_after_success.unshift('full_message doctrine promote')
  const dirtyDoctrineStore = storage()
  saveAwisWorkspaceArtifact(dirtyDoctrineArtifact, dirtyDoctrineStore)
  const dirtyDoctrineArtifacts = loadAwisWorkspaceArtifacts(key, dirtyDoctrineStore)
  const dirtyDoctrineReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyDoctrineArtifacts)
  const dirtyDoctrineJson = JSON.stringify({ artifact: dirtyDoctrineArtifacts[0], replay: dirtyDoctrineReplay })
  assert.equal(dirtyDoctrineArtifacts[0]?.payload.execution_doctrine_projection?.schema_version, 'atlas.awis.workspace_execution_doctrine_projection.v1')
  assert.doesNotMatch(dirtyDoctrineJson, /\/Users\/|operator_input doctrine gate|operator_input doctrine trusted|response_text doctrine reason|response_text doctrine revalidate|raw_conversation doctrine required|raw_conversation doctrine avoid|full_message doctrine human|full_message doctrine promote/)

  assert.equal(pack.execution_doctrine.schema_version, 'atlas.awis.workspace_execution_doctrine_projection.v1')
  assert.ok(pack.execution_doctrine.doctrine_drivers.some((driver) => driver.name === 'TDD' && driver.required))
  assert.ok(pack.execution_doctrine.doctrine_drivers.some((driver) => driver.name === 'UXD'))
  assert.ok(pack.execution_doctrine.doctrine_drivers.some((driver) => driver.name === 'EvidenceDD'))
  assert.ok(pack.execution_doctrine.preflight.human_responsibility.some((item) => /destrutivos|ambígua/i.test(item)))
  assert.ok(pack.execution_doctrine.preflight.automation.includes('anexar componentKeys ao outcome'))
  assert.ok(pack.execution_doctrine.command_policy.trusted.includes('npm run atlas-ai:test'))
  assert.ok(task?.execution_plan.doctrine_drivers.some((item) => item.startsWith('TDD:')))
  assert.ok(task?.execution_plan.preflight_gates.some((item) => item.startsWith('TDD:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('doutrina:TDD:')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('gate:TDD:')))
  assert.equal(artifact?.payload.execution_doctrine_projection?.schema_version, 'atlas.awis.workspace_execution_doctrine_projection.v1')
  assert.equal(replay?.artifact_count, 1)
  assert.deepEqual(directDoctrine, pack.execution_doctrine)
  assert.doesNotMatch(JSON.stringify(pack.execution_doctrine), /\/Users\/|operator_input|response_text|"raw_conversation_included":true|"external_side_effects_allowed":true/)
})

test('AWIS provider strategy learns reliable providers without storing conversation text', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain()
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T23:10:00Z',
    channel: 'conversation',
    status: 'succeeded',
    provider: 'atlas_decide',
    model: 'gpt-5.1',
    latencyMs: 800,
    contextPackApplied: true,
    taskKind: 'analysis',
    validationCommands: [],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T23:11:00Z',
    channel: 'workbench',
    status: 'succeeded',
    provider: 'atlas_decide',
    model: 'gpt-5.1',
    latencyMs: 600,
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
    folderCortexLabels: [
      'area:atlas-desktop:autoload:92',
      'validate:atlas-desktop:npm run atlas-ai:test',
    ],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T23:12:00Z',
    channel: 'conversation',
    status: 'send_failed',
    provider: 'claude_cli',
    model: 'sonnet',
    latencyMs: 1900,
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: [],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    occurredAt: '2026-05-24T23:13:00Z',
    channel: 'conversation',
    status: 'failed',
    provider: 'claude_cli',
    model: 'sonnet',
    latencyMs: 1700,
    contextPackApplied: false,
    taskKind: 'bug_fix',
    validationCommands: [],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
  })
  assert.ok(pack?.provider_strategy)
  const directStrategy = buildAwisWorkspaceProviderStrategyProjection({
    memory,
    learning: pack.learning ?? null,
    executionDoctrine: pack.execution_doctrine,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'investigar bug no atlas desktop')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T23:14:00Z')
  const atlasProvider = pack.provider_strategy.preferred.find((provider) => provider.provider === 'atlas_decide')
  const failedProvider = pack.provider_strategy.preferred.find((provider) => provider.provider === 'claude_cli')
  const dirtyProviderArtifact = artifact ? structuredClone(artifact) as typeof artifact : null
  assert.ok(dirtyProviderArtifact?.payload.provider_strategy_projection)
  dirtyProviderArtifact.payload.provider_strategy_projection.preferred.unshift({
    provider: 'operator_input provider',
    model: 'response_text model',
    policy: 'avoid',
    success_count: 0,
    failure_count: 2,
    success_rate: 0,
    avg_latency_ms: 100,
    task_kinds: ['raw_conversation provider task'],
    reason: 'full_message provider reason',
  })
  dirtyProviderArtifact.payload.provider_strategy_projection.task_preferences.unshift({
    task_kind: 'bug_fix',
    preferred_provider: 'operator_input preferred',
    fallback_order: ['response_text fallback'],
    avoid: ['raw_conversation avoid provider'],
    confidence: 100,
    reason: '/Users/vitorepf/private/provider',
  })
  dirtyProviderArtifact.payload.provider_strategy_projection.fallback_order.unshift('full_message provider fallback')
  dirtyProviderArtifact.payload.provider_strategy_projection.caution_signals.unshift('operator_input provider caution')
  const dirtyProviderStore = storage()
  saveAwisWorkspaceArtifact(dirtyProviderArtifact, dirtyProviderStore)
  const dirtyProviderArtifacts = loadAwisWorkspaceArtifacts(key, dirtyProviderStore)
  const dirtyProviderJson = JSON.stringify({ artifact: dirtyProviderArtifacts[0] })
  assert.equal(dirtyProviderArtifacts[0]?.payload.provider_strategy_projection?.schema_version, 'atlas.awis.workspace_provider_strategy_projection.v1')
  assert.doesNotMatch(dirtyProviderJson, /\/Users\/|operator_input provider|operator_input preferred|operator_input provider caution|response_text model|response_text fallback|raw_conversation provider task|raw_conversation avoid provider|full_message provider reason|full_message provider fallback/)

  assert.equal(pack.provider_strategy.schema_version, 'atlas.awis.workspace_provider_strategy_projection.v1')
  assert.equal(atlasProvider?.policy, 'prefer')
  assert.equal(atlasProvider?.success_count, 2)
  assert.equal(atlasProvider?.avg_latency_ms, 700)
  assert.equal(failedProvider?.policy, 'avoid')
  assert.ok(pack.provider_strategy.fallback_order.some((item) => item.startsWith('atlas_decide')))
  assert.ok(pack.provider_strategy.caution_signals.some((item) => item.includes('claude_cli')))
  assert.ok(pack.next_session_brain?.load_order.some((item) => item.startsWith('provider:prefer:atlas_decide')))
  assert.ok(pack.next_session_brain?.context_loading.provider_hints.prefer.some((item) => item.startsWith('atlas_decide')))
  assert.ok(pack.next_session_brain?.context_loading.provider_hints.avoid.some((item) => item.includes('claude_cli')))
  assert.ok(pack.next_session_brain?.context_loading.provider_hints.fallback_order.some((item) => item.startsWith('atlas_decide')))
  assert.match(pack.next_session_brain?.context_loading.provider_hints.reason ?? '', /sucessos/)
  const bugFixPreference = pack.provider_strategy.task_preferences.find((item) => item.task_kind === 'bug_fix')
  assert.equal(bugFixPreference?.preferred_provider, 'atlas_decide')
  assert.ok(bugFixPreference?.fallback_order.some((item) => item.startsWith('atlas_decide')))
  assert.ok(bugFixPreference?.avoid.some((item) => item.includes('claude_cli')))
  assert.ok((bugFixPreference?.confidence ?? 0) > 0)
  assert.match(bugFixPreference?.reason ?? '', /bug_fix/)
  assert.equal(capsule?.provider_strategy?.preferred_provider, 'atlas_decide')
  assert.ok(capsule?.provider_strategy?.avoid.some((item) => item.includes('claude_cli')))
  assert.equal(capsule?.provider_strategy?.confidence, bugFixPreference?.confidence)
  assert.ok(capsule?.provider_strategy?.reason.includes('bug_fix'))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('provider:prefer:atlas_decide')))
  assert.equal(artifact?.payload.provider_strategy_projection?.schema_version, 'atlas.awis.workspace_provider_strategy_projection.v1')
  assert.deepEqual(directStrategy, pack.provider_strategy)
  assert.doesNotMatch(JSON.stringify(pack.provider_strategy), /operator_input|response_text|prompt|\/Users\/|"raw_conversation_included":true/)
})

test('AWIS task router precompiles intent routes from Spaces, components and artifacts', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Server tests', command: 'php artisan test', kind: 'test', source: 'atlas-server/composer.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
      { label: 'Desktop build', command: 'npm run tauri:build -- --workspace=@atlas/desktop', kind: 'build', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    provider: 'atlas_decide',
    model: 'gpt-5.1',
    latencyMs: 700,
    contextPackApplied: true,
    taskKind: 'bug_fix',
    routeKey: 'task:bug_fix',
    routeLabel: 'side_by_side',
    validationCommands: ['npm run atlas-ai:test', 'php artisan test'],
    componentKeys: ['atlas-desktop', 'atlas-server'],
  }).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    provider: 'atlas_decide',
    model: 'gpt-5.1',
    latencyMs: 620,
    contextPackApplied: true,
    taskKind: 'bug_fix',
    routeKey: 'task:bug_fix',
    routeLabel: 'side_by_side',
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Fluxo AWIS Spaces',
      thread_count: 3,
      message_count: 18,
      mode_count: 2,
      decision_count: 2,
      pending_count: 1,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Atlas AI', 'Code', 'packs'],
      recommended_use: ['retomar contexto do Space', 'comparar sessões'],
      sessions: [
        { title: 'Corrigir Space', mode: 'programming', message_count: 8, last_active_at: '2026-05-24T10:00:00Z', provider: 'atlas' },
        { title: 'Polir Workbench', mode: 'programming', message_count: 6, last_active_at: '2026-05-24T11:00:00Z', provider: 'atlas' },
      ],
    },
  ])
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(pack?.task_router)
  const directRouter = buildAwisWorkspaceTaskRouterProjection({
    memory,
    topology: pack.topology,
    componentMemory: pack.component_memory,
    spaces: pack.spaces,
    artifactReplay: pack.artifact_replay,
    contextKernel: pack.context_kernel,
    executionDoctrine: pack.execution_doctrine,
    providerStrategy: pack.provider_strategy,
    sessionGold: pack.session_gold,
    learning: pack.learning ?? null,
    continuity: pack.continuity,
    startupPlaybook: pack.startup_playbook,
    memoryFreshness: pack.memory_freshness,
    folderCortex: pack.folder_cortex,
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug de drag no atlas ai space')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T23:20:00Z')
  const bugRoute = pack.task_router.routes.find((route) => route.task_kind === 'bug_fix')
  const dirtyRouterArtifact = artifact ? structuredClone(artifact) as typeof artifact : null
  assert.ok(dirtyRouterArtifact?.payload.task_router_projection)
  dirtyRouterArtifact.payload.task_router_projection.routes.unshift({
    task_kind: 'bug_fix',
    route_key: 'task:bug_fix',
    confidence: 100,
    success_count: 1,
    failure_count: 0,
    success_rate: 100,
    last_used_at: '2026-05-24T23:20:00Z',
    policy: 'prefer',
    suggested_surface: 'side_by_side',
    load_first: ['operator_input router load'],
    use_spaces: ['response_text router space'],
    use_components: ['raw_conversation router component'],
    use_artifacts: ['full_message router artifact'],
    validate_with: ['/Users/vitorepf/private/router'],
    avoid_loading: ['operator_input router avoid'],
    intent_signals: ['response_text router intent'],
    evidence_plan: {
      load: ['raw_conversation router evidence load'],
      verify: ['full_message router verify'],
      preserve: ['operator_input router preserve'],
      learn: ['response_text router learn'],
    },
    automation_hooks: {
      before_send: ['raw_conversation router before'],
      after_success: ['full_message router success'],
      after_failure: ['operator_input router failure'],
    },
    reason: 'response_text router reason',
  })
  dirtyRouterArtifact.payload.task_router_projection.fallback_route.load_first.unshift('raw_conversation fallback load')
  dirtyRouterArtifact.payload.task_router_projection.fallback_route.reason = 'full_message fallback reason'
  const dirtyRouterStore = storage()
  saveAwisWorkspaceArtifact(dirtyRouterArtifact, dirtyRouterStore)
  const dirtyRouterArtifacts = loadAwisWorkspaceArtifacts(key, dirtyRouterStore)
  const dirtyRouterJson = JSON.stringify({ artifact: dirtyRouterArtifacts[0] })
  assert.equal(dirtyRouterArtifacts[0]?.payload.task_router_projection?.schema_version, 'atlas.awis.workspace_task_router_projection.v1')
  assert.doesNotMatch(dirtyRouterJson, /\/Users\/|operator_input router load|operator_input router avoid|operator_input router preserve|operator_input router failure|response_text router space|response_text router intent|response_text router learn|response_text router reason|raw_conversation router component|raw_conversation router evidence load|raw_conversation router before|raw_conversation fallback load|full_message router artifact|full_message router verify|full_message router success|full_message fallback reason/)

  assert.equal(pack.task_router.schema_version, 'atlas.awis.workspace_task_router_projection.v1')
  assert.ok((pack.task_router.route_count ?? 0) >= 1)
  assert.ok(bugRoute)
  assert.equal(bugRoute?.route_key, 'task:bug_fix')
  assert.equal(bugRoute?.policy, 'prefer')
  assert.equal(bugRoute?.success_count, 2)
  assert.equal(bugRoute?.failure_count, 0)
  assert.equal(bugRoute?.success_rate, 100)
  assert.equal(bugRoute?.suggested_surface, 'side_by_side')
  assert.ok(bugRoute?.load_first.some((item) => item.startsWith('folder-cortex:atlas-desktop:')))
  assert.ok(bugRoute?.load_first.some((item) => item.startsWith('folder-cortex:atlas-server:')))
  assert.ok(bugRoute?.load_first.some((item) => item.startsWith('cochange:atlas-desktop->atlas-server:')))
  assert.ok(bugRoute?.load_first.some((item) => item.includes('mapa de componentes')))
  assert.ok(bugRoute?.use_components.includes('atlas-server'))
  assert.ok(bugRoute?.use_spaces.some((item) => item.includes('Fluxo AWIS Spaces')))
  assert.ok(bugRoute?.validate_with.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(bugRoute?.validate_with.some((item) => item.includes('php artisan test')))
  assert.ok(bugRoute?.avoid_loading.some((item) => item.includes('folder-cortex:atlas-server')))
  assert.ok(bugRoute?.intent_signals.includes('bug'))
  assert.ok(bugRoute?.evidence_plan.load.some((item) => item.includes('folder-cortex:atlas-desktop')))
  assert.ok(bugRoute?.evidence_plan.load.some((item) => item.includes('ponte aprendida:cochange:atlas-desktop->atlas-server')))
  assert.ok(bugRoute?.evidence_plan.load.some((item) => item.includes('mapa de componentes')))
  assert.ok(bugRoute?.evidence_plan.verify.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(bugRoute?.evidence_plan.preserve.some((item) => item.includes('cochange:atlas-desktop->atlas-server')))
  assert.ok(bugRoute?.evidence_plan.preserve.some((item) => item.includes('atualizar pack do Space usado')))
  assert.ok(bugRoute?.evidence_plan.learn.some((item) => item.includes('registrar outcome:bug_fix')))
  assert.ok(bugRoute?.evidence_plan.learn.some((item) => item.includes('registrar cochange:atlas-desktop->atlas-server')))
  assert.ok(bugRoute?.automation_hooks.before_send.length)
  assert.ok(bugRoute?.automation_hooks.after_success.some((item) => item.includes('promover rota:bug_fix')))
  assert.ok(bugRoute?.automation_hooks.after_failure.some((item) => item.includes('não promover contexto sem evidência')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.includes('mapa de componentes')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('cochange:atlas-desktop->atlas-server:')))
  assert.ok(task?.recommended_context.artifacts.some((item) => item.includes('cochange:atlas-desktop->atlas-server')))
  assert.ok(task?.recommended_context.related_workspace_hints.some((item) => item.includes('cochange:atlas-desktop->atlas-server')))
  assert.ok(task?.recommended_context.next_session_contract.first_load.some((item) => item.startsWith('cochange:atlas-desktop->atlas-server:')))
  assert.ok(task?.learning_hooks.next_session_contract.first_load.some((item) => item.includes('cochange:atlas-desktop->atlas-server')))
  assert.ok(task?.learning_hooks.next_session_contract.promote_when.some((item) => item.includes('cochange:atlas-desktop->atlas-server')))
  assert.ok(task?.recommended_context.spaces.some((item) => item.includes('Fluxo AWIS Spaces')))
  assert.ok(capsule?.load_first.some((item) => item.includes('mapa de componentes')))
  assert.ok(capsule?.load_first.some((item) => item.includes('cochange:atlas-desktop->atlas-server')))
  assert.ok(capsule?.continue_learning.next_session_contract.first_load.some((item) => item.includes('cochange:atlas-desktop->atlas-server')))
  assert.equal(artifact?.payload.task_router_projection?.schema_version, 'atlas.awis.workspace_task_router_projection.v1')
  assert.deepEqual(directRouter, pack.task_router)
  assert.doesNotMatch(JSON.stringify(pack.task_router), /operator_input|response_text|prompt|\/Users\/|thread_id|source_thread_ids|"raw_conversation_included":true/)
})

test('AWIS startup orchestration turns memory, Spaces and artifacts into a cold-start plan', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'Cérebro vivo AWIS',
      thread_count: 3,
      message_count: 24,
      mode_count: 1,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code'],
      recommended_use: ['carregar partida segura'],
      sessions: [],
    },
  ])
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(firstPack)
  const artifact = buildAwisWorkspaceArtifact(firstPack, '2026-05-24T21:00:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    artifactReplay: replay,
  })
  assert.ok(pack?.startup_orchestration)
  const directOrchestration = buildAwisWorkspaceStartupOrchestrationProjection({
    memory,
    spaces,
    artifactReplay: replay,
    livingGraph: pack.living_graph,
    sessionGold: pack.session_gold,
    contextKernel: pack.context_kernel,
    selfImprovement: pack.self_improvement,
    retention: pack.retention,
    memoryFreshness: pack.memory_freshness,
  })
  const finalArtifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T21:01:00Z')
  const finalReplay = finalArtifact ? buildAwisWorkspaceArtifactReplayProjection([finalArtifact]) : null
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir AWIS sem nascer zerado')
  const dirtyStartupArtifact = finalArtifact ? structuredClone(finalArtifact) as typeof finalArtifact : null
  assert.ok(dirtyStartupArtifact?.payload.startup_orchestration_projection)
  assert.ok(dirtyStartupArtifact.payload.bootstrap_manifest_projection)
  dirtyStartupArtifact.payload.startup_orchestration_projection.startup_sequence.unshift({
    step: 'load',
    label: 'operator_input startup label',
    source: 'memory',
    required: true,
  })
  dirtyStartupArtifact.payload.startup_orchestration_projection.context_budget.reason = 'response_text startup reason'
  dirtyStartupArtifact.payload.startup_orchestration_projection.revalidation_gate.required_before_send.unshift('raw_conversation startup required')
  dirtyStartupArtifact.payload.startup_orchestration_projection.revalidation_gate.can_autoload.unshift('full_message startup autoload')
  dirtyStartupArtifact.payload.bootstrap_manifest_projection.bootstrap_hash = 'operator_input bootstrap hash'
  dirtyStartupArtifact.payload.bootstrap_manifest_projection.golden_boot_sequence.unshift('/Users/vitorepf/private/bootstrap')
  dirtyStartupArtifact.payload.bootstrap_manifest_projection.context_gold.load_first.unshift('response_text bootstrap load')
  dirtyStartupArtifact.payload.bootstrap_manifest_projection.context_gold.summarize_first.unshift('raw_conversation bootstrap summary')
  dirtyStartupArtifact.payload.bootstrap_manifest_projection.context_gold.validate_before_use.unshift('full_message bootstrap validate')
  dirtyStartupArtifact.payload.bootstrap_manifest_projection.workspace_scope.components.unshift('operator_input bootstrap component')
  dirtyStartupArtifact.payload.bootstrap_manifest_projection.automation_plan.before_send.unshift('response_text bootstrap before')
  dirtyStartupArtifact.payload.bootstrap_manifest_projection.learning_contract.promote_when.unshift('raw_conversation bootstrap promote')
  dirtyStartupArtifact.payload.bootstrap_manifest_projection.human_boundary.unshift('full_message bootstrap human')
  const dirtyStartupStore = storage()
  saveAwisWorkspaceArtifact(dirtyStartupArtifact, dirtyStartupStore)
  const dirtyStartupArtifacts = loadAwisWorkspaceArtifacts(key, dirtyStartupStore)
  const dirtyStartupReplay = buildAwisWorkspaceArtifactReplayProjection(dirtyStartupArtifacts)
  const dirtyStartupJson = JSON.stringify({ artifact: dirtyStartupArtifacts[0], replay: dirtyStartupReplay })
  assert.ok(dirtyStartupReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('orchestrate:') || pattern.startsWith('bootstrap-manifest:')))
  assert.doesNotMatch(dirtyStartupJson, /\/Users\/|operator_input startup label|operator_input bootstrap hash|operator_input bootstrap component|response_text startup reason|response_text bootstrap load|response_text bootstrap before|raw_conversation startup required|raw_conversation bootstrap summary|raw_conversation bootstrap promote|full_message startup autoload|full_message bootstrap validate|full_message bootstrap human/)

  assert.equal(pack.startup_orchestration.schema_version, 'atlas.awis.workspace_startup_orchestration_projection.v1')
  assert.ok(['warm', 'deep'].includes(pack.startup_orchestration.launch_mode))
  assert.ok(pack.startup_orchestration.startup_sequence.some((item) => item.source === 'retention' || item.source === 'kernel'))
  assert.ok(pack.startup_orchestration.startup_sequence.some((item) => item.source === 'space'))
  assert.equal(pack.startup_orchestration.learning_loop.capture_outcome, true)
  assert.equal(pack.startup_orchestration.learning_loop.update_memory, true)
  assert.equal(pack.startup_orchestration.safety.external_side_effects_allowed, false)
  assert.equal(finalArtifact?.payload.startup_orchestration_projection?.schema_version, 'atlas.awis.workspace_startup_orchestration_projection.v1')
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('orchestrate:') || pattern.startsWith('launch-mode:')))
  assert.ok(finalReplay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('partida:')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('restore:') || item.startsWith('load:')))
  assert.ok(task?.execution_plan.commands_to_avoid.includes('partida:preferir resumo') || pack.startup_orchestration.launch_mode === 'deep')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  assert.equal(capsule?.startup_contract.never_start_cold, true)
  assert.equal(capsule?.startup_contract.launch_mode, pack.startup_orchestration.launch_mode)
  assert.equal(capsule?.startup_contract.readiness.startup, pack.startup_orchestration.readiness_score)
  assert.equal(capsule?.startup_contract.bootstrap_manifest_hash, pack.bootstrap_manifest?.bootstrap_hash)
  assert.equal(capsule?.bootstrap_plan.manifest_hash, pack.bootstrap_manifest?.bootstrap_hash)
  assert.ok(capsule?.bootstrap_plan.load_first.length)
  assert.ok(capsule?.load_first.some((item) => item.startsWith('bootstrap-plan:')))
  assert.equal(capsule?.task_packet?.context.bootstrap_plan.manifest_hash, pack.bootstrap_manifest?.bootstrap_hash)
  assert.ok(capsule?.startup_contract.load_sequence.some((item) => item.startsWith('load:') || item.startsWith('validate:')))
  assert.ok(capsule?.startup_contract.load_sequence.some((item) => item.startsWith('bootstrap:')))
  assert.ok(capsule?.startup_contract.revalidate_before_send.length)
  assert.equal(pack.bootstrap_manifest?.schema_version, 'atlas.awis.workspace_bootstrap_manifest_projection.v1')
  assert.equal(pack.bootstrap_manifest?.learning_contract.capture_outcome, true)
  assert.equal(pack.bootstrap_manifest?.learning_contract.update_memory, true)
  assert.ok(pack.bootstrap_manifest?.golden_boot_sequence.some((item) => item.includes('bootstrap') || item.includes('artifact') || item.includes('folder') || item.includes('launch') || item.includes('kernel')))
  assert.ok(pack.bootstrap_manifest?.context_gold.validate_before_use.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(pack.bootstrap_manifest?.workspace_scope.spaces.some((item) => item.includes('Cérebro vivo AWIS')))
  assert.ok(pack.bootstrap_manifest?.automation_plan.after_success.length)
  assert.equal(pack.bootstrap_manifest?.safety.provider_safe, true)
  assert.equal(task?.recommended_context.bootstrap_plan.manifest_hash, pack.bootstrap_manifest?.bootstrap_hash)
  assert.ok(task?.recommended_context.bootstrap_plan.validate_before_use.some((item) => item.includes('npm run atlas-ai:test')))
  assert.equal(finalArtifact?.payload.bootstrap_manifest_projection?.bootstrap_hash, pack.bootstrap_manifest?.bootstrap_hash)
  assert.ok(finalReplay?.cold_start_seed.load_order.some((item) => item.startsWith('bootstrap-manifest:') || item.startsWith('bootstrap-load:')))
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('bootstrap-manifest:') || pattern.startsWith('bootstrap-load:')))
  assert.deepEqual(directOrchestration, pack.startup_orchestration)
  assert.doesNotMatch(JSON.stringify(pack.startup_orchestration), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
  assert.doesNotMatch(JSON.stringify(pack.bootstrap_manifest), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS task context starts hot even when the prompt has no clear intent', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    signals: ['Tauri', 'Atlas AI', 'AWIS'],
    importantFiles: [
      { path: 'AGENTS.md', kind: 'provider-operating-contract' },
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
    ],
    docDigests: [
      {
        path: 'AGENTS.md',
        kind: 'provider-operating-contract',
        signals: ['doc:awis', 'doc:desktop-react', 'doc:validation'],
        obligations: ['sessão:bootstrap antes de implementar', 'governança:preferir docs canônicos'],
        summary: 'Contrato provider-safe para carregar contexto AWIS antes de programar.',
      },
    ],
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  })
  let memory = learnAwisWorkspaceMemory(null, snapshot, key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-desktop', 'doc:AGENTS.md'],
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
  }).memory
  const spaces = buildAwisWorkspaceSpaceProjection([
    {
      title: 'AWIS final pass',
      thread_count: 3,
      message_count: 28,
      mode_count: 1,
      decision_count: 1,
      pending_count: 0,
      risk_count: 0,
      artifact_count: 1,
      reusable_by: ['Code'],
      recommended_use: ['partida quente'],
      sessions: [],
    },
  ])
  const firstPack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
  })
  assert.ok(firstPack)
  const artifact = buildAwisWorkspaceArtifact(firstPack, '2026-05-24T22:30:00Z')
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory,
    spaces,
    artifactReplay: replay,
  })
  assert.ok(pack)

  const task = buildAwisWorkspaceTaskContextProjection(pack, 'oi')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)

  assert.equal(task?.task_kind, 'unknown')
  assert.ok(task?.matched_intent_signals.some((signal) => signal.includes('doc-regra') || signal.includes('doc-sinal')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('doc-regra:') || item.startsWith('doc-sinal:')))
  assert.ok(pack.next_session_brain?.context_loading.document_hints.rules.includes('sessão:bootstrap antes de implementar'))
  assert.ok(pack.next_session_brain?.context_loading.document_hints.signals.includes('doc:awis'))
  assert.ok(pack.next_session_brain?.context_loading.document_hints.summaries.some((summary) => summary.includes('Contrato provider-safe')))
  assert.ok(task?.recommended_context.working_set.commands.includes('npm run atlas-ai:test'))
  assert.equal(task?.recommended_context.bootstrap_plan.manifest_hash, pack.bootstrap_manifest?.bootstrap_hash)
  assert.ok(task?.recommended_context.bootstrap_plan.load_first.length)
  assert.ok(task?.recommended_context.bootstrap_plan.evidence.some((item) => item === 'doc-rule:sessão:bootstrap antes de implementar'))
  assert.ok(task?.recommended_context.bootstrap_plan.evidence.some((item) => item === 'doc-signal:doc:awis'))
  assert.ok(task?.recommended_context.task_gold.some((item) => item.kind === 'component' || item.kind === 'session_outcome' || item.kind === 'space'))
  assert.equal(task?.safety.provider_safe, true)
  assert.equal(capsule?.task_kind, 'unknown')
  assert.ok(capsule?.task_packet?.context.use_as_summary.some((item) => item === 'bootstrap-evidence:doc-rule:sessão:bootstrap antes de implementar'))
  assert.ok(capsule?.task_packet?.context.use_as_summary.some((item) => item === 'bootstrap-evidence:doc-signal:doc:awis'))
  assert.equal(capsule?.bootstrap_plan.manifest_hash, pack.bootstrap_manifest?.bootstrap_hash)
  assert.ok(capsule?.load_first.some((item) => item.startsWith('bootstrap-plan:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('folder-doc-rule:') || item.startsWith('folder-doc-signal:') || item.startsWith('doc-regra:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('folder-doc-digest:') || item.startsWith('context-gold:')))
  assert.doesNotMatch(JSON.stringify(task), /\/Users\/|operator_input|response_text|source_thread_ids|thread_id|"raw_conversation_included":true/)
})

test('AWIS memory replay drops unsafe learned outcome and maintenance labels on load', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'Atlas')
  const learned = learnAwisWorkspaceMemory(null, brain(), key).memory
  const dirty = structuredClone(learned)
  dirty.recentOutcomes.unshift({
    occurredAt: '2026-05-26T10:00:00Z',
    channel: 'conversation',
    status: 'succeeded',
    provider: 'operator_input provider',
    model: 'response_text model',
    latencyMs: 120,
    contextPackApplied: true,
    taskKind: 'bug_fix',
    routeKey: 'atlas-ai',
    routeLabel: 'full_message route',
    contextGoldLabels: ['component-memory:atlas-ai', 'raw_conversation gold'],
    validationCommands: ['npm run atlas-ai:test', 'raw_conversation command'],
    componentKeys: ['atlas-ai'],
    spaceLabels: ['AWIS Space', 'operator_input space'],
    spaceBrainLabels: ['contexto forte', 'response_text brain'],
    liveMemoryLabels: ['loop vivo', 'full_message live'],
    priorityLoadLabels: ['carregar runbook', 'raw_conversation priority'],
    continuityLabels: ['continuidade segura', 'operator_input continuity'],
    handoffLabels: ['handoff seguro', 'response_text handoff'],
    artifactReplayLabels: ['artifact bom', 'full_message artifact'],
    evidenceGateLabels: ['teste verde', 'raw_conversation evidence'],
    nextSessionLabels: ['partida quente', 'operator_input next'],
    recoveryLabels: ['retry seguro', 'response_text recovery'],
    adaptiveLearningLabels: ['promover regra', 'full_message adaptive'],
    feedbackRecordLabels: ['registrar outcome', 'raw_conversation record'],
    feedbackPromoteLabels: ['promover contexto', 'operator_input promote'],
    feedbackRevalidateLabels: ['revalidar contexto', 'response_text revalidate'],
    feedbackSpaceLabels: ['atualizar Space', 'full_message feedback space'],
    feedbackArtifactLabels: ['preservar artifact', 'raw_conversation feedback artifact'],
    feedbackComponentLabels: ['atlas-desktop', 'operator_input component'],
    feedbackRelationLabels: ['desktop-server', 'response_text relation'],
    feedbackMeshLabels: ['mesh seguro', 'full_message mesh'],
    componentMemoryLabels: ['component-memory:atlas-ai', 'raw_conversation component memory'],
    semanticIndexLabels: ['semantic-index:drag', 'operator_input semantic'],
    taskRouterLabels: ['task-router:bug_fix', 'response_text router'],
    impactMapLabels: ['impact-map:desktop', 'full_message impact'],
    livingGraphLabels: ['living-graph:awis', 'raw_conversation graph'],
    workspaceMeshLabels: ['workspace-mesh:atlas', 'operator_input mesh'],
    truthPackLabels: ['truth-pack:current', 'response_text truth'],
    repositoryConstellationLabels: ['repository-constellation:atlas', 'full_message repo'],
    folderCortexLabels: ['folder-cortex:desktop', 'raw_conversation folder'],
    taskPacketLabels: ['task-packet:awis', 'operator_input task'],
    runbookLabels: ['runbook:validar', 'response_text runbook'],
    providerStrategyLabels: ['provider-strategy:local', 'full_message strategy'],
    executionDoctrineLabels: ['execution-doctrine:testar', 'raw_conversation doctrine'],
    memoryFreshnessLabels: ['memory-freshness:fresh', 'operator_input freshness'],
    confidenceLabels: ['confidence:alta', 'response_text confidence'],
    learningFlywheelLabels: ['learning-flywheel:promover', 'full_message flywheel'],
    launchContractLabels: ['launch-contract:warm', 'raw_conversation launch'],
    topologyLabels: ['topology:atlas-desktop', 'operator_input topology'],
    transferWorkspaceLabels: [],
    transferRelevanceLabels: [],
    transferReuseLabels: [],
    transferValidateLabels: [],
    transferNeverLabels: [],
  })
  dirty.recentMaintenance.unshift({
    occurredAt: '2026-05-26T10:01:00Z',
    action: 'revalidate_context',
    label: 'operator_input manutenção',
    status: 'succeeded',
    reason: 'response_text manutenção',
    evidence: ['artifact preservado', 'raw_conversation evidence'],
    seenCount: 1,
  })

  const normalized = normalizeAwisWorkspaceMemoryStore({ [key]: dirty })[key]
  assert.ok(normalized)
  assert.ok(normalized.recentOutcomes[0]?.validationCommands.includes('npm run atlas-ai:test'))
  assert.ok(normalized.recentOutcomes[0]?.spaceLabels.includes('AWIS Space'))
  assert.ok(normalized.recentMaintenance[0]?.evidence.includes('artifact preservado'))
  assert.doesNotMatch(JSON.stringify({
    recentOutcomes: normalized.recentOutcomes,
    recentMaintenance: normalized.recentMaintenance,
  }), /\/Users\/|operator_input|response_text|raw_conversation|full_message/)
})

test('AWIS artifact manifest replay drops unsafe startup manifest labels on load', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'Atlas')
  const memory = learnAwisWorkspaceMemory(null, brain(), key).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
  })
  assert.ok(pack)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-26T11:00:00Z')
  assert.ok(artifact)
  const dirty = structuredClone(artifact)
  dirty.manifest.seed_hash = 'operator_input manifest hash'
  dirty.manifest.load_first.unshift('operator_input manifest load')
  dirty.manifest.validate_with.unshift('response_text manifest validate')
  dirty.manifest.promote_signals.unshift('raw_conversation manifest promote')
  dirty.manifest.caution_signals.unshift('full_message manifest caution')
  dirty.manifest.next_send_recipe.load_now.unshift('operator_input recipe load')
  dirty.manifest.next_send_recipe.summarize_now.unshift('response_text recipe summary')
  dirty.manifest.next_send_recipe.prove_before_trust.unshift('raw_conversation recipe prove')
  dirty.manifest.next_send_recipe.avoid_or_confirm.unshift('full_message recipe guard')
  dirty.manifest.linked_spaces.unshift('Space AWIS', 'operator_input linked space')
  dirty.manifest.space_context_gold.unshift('contexto reutilizável', 'response_text space gold')
  dirty.manifest.repository_hints.unshift('atlas-desktop', 'raw_conversation repository')

  const store = storage()
  saveAwisWorkspaceArtifact(dirty, store)
  const loaded = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))

  assert.ok(loaded)
  assert.ok(replay)
  assert.ok(loaded.manifest.linked_spaces.includes('Space AWIS'))
  assert.ok(loaded.manifest.space_context_gold.includes('contexto reutilizável'))
  assert.ok(loaded.manifest.repository_hints.includes('atlas-desktop'))
  assert.ok(loaded.manifest.next_send_recipe.load_now.length)
  assert.ok(replay.cold_start_seed.next_send_recipe.load_now.length)
  assert.doesNotMatch(
    JSON.stringify({ manifest: loaded.manifest, replay }),
    /operator_input (manifest|recipe)|response_text (manifest|recipe)|raw_conversation (manifest|recipe)|full_message (manifest|recipe)/,
  )
})

test('AWIS artifact replay drops unsafe gold kernel improvement and freshness projections on load', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'Atlas')
  let memory = learnAwisWorkspaceMemory(null, brain({
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Typecheck', command: 'npx tsc -b', kind: 'check', source: 'atlas-desktop/package.json' },
    ],
  }), key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'workbench',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
  })
  assert.ok(pack?.session_gold)
  assert.ok(pack.context_kernel)
  assert.ok(pack.self_improvement)
  assert.ok(pack.memory_freshness)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-26T12:00:00Z')
  assert.ok(artifact)
  const dirty = structuredClone(artifact)

  dirty.payload.session_gold_projection?.strongest_outcomes.unshift({
    label: 'operator_input session gold',
    confidence: 100,
    evidence: ['response_text session evidence'],
  })
  dirty.payload.session_gold_projection?.proven_commands.unshift({
    command: 'raw_conversation session command',
    success_count: 1,
    task_kinds: ['bug_fix'],
    channels: ['workbench'],
  })
  dirty.payload.session_gold_projection?.recovery_patterns.unshift('full_message session recovery')
  dirty.payload.session_gold_projection?.next_session_hooks.before_send.unshift('operator_input session hook')

  dirty.payload.context_kernel_projection?.priority_load.unshift({
    kind: 'session_gold',
    label: 'response_text kernel label',
    reason: 'raw_conversation kernel reason',
    confidence: 100,
  })
  dirty.payload.context_kernel_projection?.compression_plan.send_full.unshift('full_message kernel full')
  dirty.payload.context_kernel_projection?.validation_plan.commands.unshift('operator_input kernel command')

  dirty.payload.self_improvement_projection?.improvement_queue.unshift({
    action: 'record_outcome',
    label: 'operator_input improvement label',
    reason: 'response_text improvement reason',
    priority: 'high',
    evidence: ['raw_conversation improvement evidence'],
  })
  dirty.payload.self_improvement_projection?.promotion_policy.promote_when.unshift('full_message improvement promote')
  dirty.payload.self_improvement_projection?.next_review.metrics.unshift('operator_input improvement metric')
  dirty.payload.self_improvement_projection?.next_review.validate_with.unshift('response_text improvement validate')

  dirty.payload.memory_freshness_projection?.evidence.hot.unshift('operator_input freshness hot')
  dirty.payload.memory_freshness_projection?.evidence.revalidate.unshift('response_text freshness revalidate')
  dirty.payload.memory_freshness_projection?.evidence.missing.unshift('raw_conversation freshness missing')
  dirty.payload.memory_freshness_projection?.promotion_gate.required_before_promotion.unshift('full_message freshness required')
  dirty.payload.memory_freshness_projection?.next_refresh.actions.unshift('operator_input freshness action')
  if (dirty.payload.memory_freshness_projection) {
    dirty.payload.memory_freshness_projection.next_refresh.reason = 'response_text freshness reason'
  }

  const store = storage()
  saveAwisWorkspaceArtifact(dirty, store)
  const loaded = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  assert.ok(loaded)
  assert.ok(replay)
  assert.doesNotMatch(
    JSON.stringify({
      sessionGold: loaded.payload.session_gold_projection,
      contextKernel: loaded.payload.context_kernel_projection,
      selfImprovement: loaded.payload.self_improvement_projection,
      memoryFreshness: loaded.payload.memory_freshness_projection,
      replay,
    }),
    /operator_input (session|kernel|improvement|freshness)|response_text (session|kernel|improvement|freshness)|raw_conversation (session|kernel|improvement|freshness)|full_message (session|kernel|improvement|freshness)/,
  )
})

test('AWIS learning replay drops unsafe task memory commands on load', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'Atlas')
  let memory = learnAwisWorkspaceMemory(null, brain({
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
    ],
  }), key).memory
  memory = recordAwisWorkspaceInteraction(memory, {
    workspaceKey: key,
    workspaceName: 'Atlas',
    rootPath: '/Users/vitorepf/develop/Atlas',
    channel: 'conversation',
    status: 'succeeded',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
  }).memory
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: brain(),
    memory,
  })
  assert.ok(pack?.learning)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-26T12:30:00Z')
  assert.ok(artifact)
  const dirty = structuredClone(artifact)
  dirty.payload.learning_projection?.trusted_commands.unshift('operator_input learning command')
  dirty.payload.learning_projection?.caution_signals.unshift('response_text learning caution')
  dirty.payload.learning_projection?.recent_drift.unshift('raw_conversation learning drift')
  dirty.payload.learning_projection?.task_memory.trusted_task_commands.unshift('full_message task command')
  dirty.payload.learning_projection?.task_memory.validation_plans.unshift({
    task_kind: 'bug_fix',
    commands: ['npm run atlas-ai:test', 'operator_input plan command'],
    context_gold: ['component:atlas-desktop', 'response_text plan gold'],
    component_keys: ['atlas-desktop'],
    success_count: 1,
    failure_count: 0,
    confidence: 100,
  })
  if (dirty.payload.learning_projection) {
    dirty.payload.learning_projection.next_learning_event = 'raw_conversation next learning'
  }

  const store = storage()
  saveAwisWorkspaceArtifact(dirty, store)
  const loaded = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))

  assert.ok(loaded)
  assert.ok(replay)
  assert.ok(loaded.payload.learning_projection?.trusted_commands.includes('npm run atlas-ai:test'))
  assert.ok(loaded.payload.learning_projection?.task_memory.validation_plans.some((plan) => plan.commands.includes('npm run atlas-ai:test')))
  assert.doesNotMatch(
    JSON.stringify({ learning: loaded.payload.learning_projection, replay }),
    /operator_input learning|response_text learning|raw_conversation learning|full_message task|operator_input plan|response_text plan|raw_conversation next/,
  )
})
