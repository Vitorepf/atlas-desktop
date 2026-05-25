import assert from 'node:assert/strict'
import test from 'node:test'
import type { AtlasWorkspaceBrainSnapshot } from '../../../lib/bridge'
import {
  AWIS_WORKSPACE_ARTIFACT_STORAGE,
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
  buildAwisWorkspaceHandoffProjection,
  buildAwisWorkspaceImpactMapProjection,
  buildAwisWorkspaceLaunchContractProjection,
  buildAwisWorkspaceLearningProjection,
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
  loadAwisWorkspaceArtifactLakeSummary,
  loadAwisWorkspaceArtifactReplayProjection,
  loadAwisWorkspaceArtifacts,
  learnAwisWorkspaceMemory,
  loadAwisWorkspaceMemory,
  loadAwisWorkspaceSpaceProjection,
  recordAwisWorkspaceInteraction,
  recordAwisWorkspaceMaintenance,
  saveAwisWorkspaceArtifact,
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
    commands: [{ label: 'npm test', command: 'npm run test', kind: 'test', source: 'package.json' }],
    notes: ['scan limitado para manter desempenho'],
    ...partial,
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

test('AWIS launch contract compiles the living brain into a next-conversation contract', () => {
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
    provider: 'atlas_decide',
    contextPackApplied: true,
    taskKind: 'bug_fix',
    contextGoldLabels: ['component:atlas-desktop'],
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
  }).memory
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
  }).memory

  assert.equal(updated.interactionCount, 1)
  assert.equal(updated.successCount, 1)
  assert.equal(updated.failureCount, 0)
  assert.equal(updated.contextPackAppliedCount, 1)
  assert.equal(updated.lastInteractionAt, '2026-05-24T12:10:00Z')
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'canal:workbench'))
  assert.ok(updated.operationalSignals.some((signal) => signal.label === 'contexto aplicado'))
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
  assert.ok(pack?.current_truth_pack?.proof.validate_with.includes('npm run atlas-ai:test'))
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
  assert.ok(task?.recommended_context.evidence_gate.verify_before_trust.some((item) => item.includes('validar:npm run atlas-ai:test')))
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
  assert.ok(task?.learning_hooks.next_session_contract.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(task?.learning_hooks.next_session_contract.promote_when.some((item) => item.includes('validação verde')))
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
  assert.ok(capsule?.load_first.length)
  assert.ok(capsule?.load_first.some((item) => item.startsWith('pasta:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('folder-doc:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('folder-manifest:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('budget-full:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('ouro:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('folder-command-source:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('task-gold:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('evidence-gate:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('budget:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('folder-focus:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('arquivo:') || item.startsWith('doc:') || item.startsWith('comando:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('ouro:') || item.startsWith('componente:')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('evidência:') || item.startsWith('evidência stale:')))
  assert.ok(capsule?.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.validate_with.some((item) => item === 'folder-validation:npm run atlas-ai:test'))
  assert.equal(capsule?.continue_learning.record_outcome, true)
  assert.equal(capsule?.continue_learning.update_memory, true)
  assert.ok(capsule?.continue_learning.recovery_playbook.safe_resume.some((item) => item.includes('validar novamente')))
  assert.ok(capsule?.continue_learning.next_session_contract.first_load.some((item) => item.includes('atlas-desktop')))
  assert.ok(capsule?.continue_learning.next_session_contract.validate_with.includes('npm run atlas-ai:test'))
  assert.ok(capsule?.continue_learning.next_session_contract.promote_when.some((item) => item.includes('validação verde')))
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
      thread_count: 2,
      message_count: 12,
      mode_count: 2,
      decision_count: 1,
      pending_count: 0,
      risk_count: 1,
      artifact_count: 1,
      reusable_by: ['Atlas AI', 'Code', 'packs'],
      recommended_use: ['gerar pack seguro', 'trabalhar lado a lado'],
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
  assert.equal(projection?.safety.raw_conversation_included, false)
  assert.equal(projection?.safety.internal_ids_included, false)
  assert.doesNotMatch(JSON.stringify(projection), /thread-a|thread_id|source_thread_ids|mensagem completa/)
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
          session_summaries: [
            {
              id: 'thread-a',
              title: 'Resumo seguro',
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
  assert.doesNotMatch(all, /source_thread_ids|thread-a|content|texto bruto proibido/)
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
  const memory = learnAwisWorkspaceMemory(null, brain(), key).memory
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
    brain: brain({ truncated: true }),
    memory,
    spaces,
  })
  const artifact = firstPack ? buildAwisWorkspaceArtifact(firstPack, '2026-05-24T12:25:00Z') : null
  assert.ok(artifact)
  assert.equal(artifact.payload.current_truth_pack_projection?.schema_version, 'atlas.awis.current_truth_pack_projection.v1')
  assert.ok(artifact.payload.current_truth_pack_projection?.truth_hash.startsWith('truth-'))
  saveAwisWorkspaceArtifact(artifact, store)

  const replay = loadAwisWorkspaceArtifactReplayProjection(key, store)
  const directReplay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
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
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('truth-pack:truth-')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('truth-keep:')))
  assert.equal(replay?.cold_start_seed.schema_version, 'atlas.awis.artifact_cold_start_seed.v1')
  assert.ok(replay?.cold_start_seed.load_order.length)
  assert.ok(replay?.cold_start_seed.seed_hash.startsWith('cold-'))
  assert.ok(replay?.cold_start_seed.context_signals.length)
  assert.equal(replay?.cold_start_seed.source, 'local_workspace_artifacts')
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('validar artifact:') || action.startsWith('reusar artifact:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('brain: carregar') || action.startsWith('brain: priorizar')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.includes('usar Space forte antes de abrir conversa nova'))
  assert.ok(nextPack?.startup_snapshot?.startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('cold-seed:')))
  assert.ok(nextPack?.next_session_brain?.artifact_refs.some((ref) => ref.startsWith('cold-')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.startsWith('seed:')))
  assert.ok(task?.recommended_context.artifacts.some((item) => item.startsWith('cold-')))
  assert.ok(task?.recommended_context.artifacts.some((item) => item.startsWith('truth-')))
  assert.ok(task?.learning_hooks.next_session_contract.first_load.length)
  assert.ok(capsule?.load_first.some((item) => item.startsWith('cold-start:')))
  assert.ok(capsule?.load_first.some((item) => item.startsWith('truth:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('cold-start-seed:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('current-truth:')))
  assert.ok(capsule?.continue_learning.next_session_contract.first_load.length)
  assert.equal(nextPack?.artifact_replay?.safety.provider_safe, true)
  assert.doesNotMatch(JSON.stringify(nextPack?.artifact_replay), /operator_input|response_text|source_thread_ids|thread_id|full_message|"raw_conversation_included":true/)
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
      context_signals: ['maturidade:stable'],
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
  assert.ok(pack?.next_session_brain?.execution_priority.some((priority) => priority.command === 'npm run atlas-ai:test'))
  assert.ok(pack?.startup_snapshot?.startup_gold.next_best_actions.includes('reabrir Space forte'))
  assert.equal(pack?.artifact_replay?.latest_artifact_hash, 'awis-abc12345')
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
    handoffPack,
  })

  assert.equal(pack?.startup_snapshot?.readiness.next_session_brain_ready, true)
  assert.equal(pack?.startup_snapshot?.readiness.handoff_pack_ready, true)
  assert.ok(pack?.startup_snapshot?.startup_gold.commands.includes('npm run atlas-ai:test'))
  assert.ok(pack?.startup_snapshot?.startup_gold.reusable_patterns.includes('repo:atlas-desktop'))
  assert.equal(pack?.next_session_brain?.brain_hash, 'sha256:brain')
  assert.equal(pack?.handoff_pack?.handoff_hash, 'sha256:handoff')
  assert.equal(pack?.safety.provider_safe, true)
  assert.doesNotMatch(
    JSON.stringify(pack),
    new RegExp('raw_file_content|raw_conversation_returned":true|full_message_content_returned":true|/Users/'),
  )
})

test('AWIS workspace topology turns the folder map into component intelligence', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    importantFiles: [
      { path: 'atlas-desktop/package.json', kind: 'manifesto' },
      { path: 'atlas-desktop/crates/atlas-tauri/Cargo.toml', kind: 'config' },
      { path: 'atlas-desktop/apps/desktop/src-tauri/tauri.conf.json', kind: 'config' },
      { path: 'atlas-server/composer.json', kind: 'manifesto' },
      { path: 'atlas-server/artisan', kind: 'manifesto' },
      { path: 'docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md', kind: 'documento' },
    ],
    commands: [
      { label: 'Desktop test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
      { label: 'Desktop build', command: 'npm run build', kind: 'build', source: 'atlas-desktop/package.json' },
      { label: 'Server test', command: 'php artisan test', kind: 'test', source: 'atlas-server/artisan' },
    ],
  })
  const topology = buildAwisWorkspaceTopologyProjection(snapshot)
  const pack = buildAwisWorkspaceContextPack({
    workspaceKey: key,
    workspaceName: 'Atlas',
    brain: snapshot,
    memory: learnAwisWorkspaceMemory(null, snapshot, key).memory,
  })

  assert.equal(topology?.schema_version, 'atlas.awis.workspace_topology_projection.v1')
  assert.ok(topology?.components.some((component) => component.key === 'atlas-desktop' && component.role === 'aplicativo desktop'))
  assert.ok(topology?.components.some((component) => component.key === 'atlas-server' && component.role === 'serviço backend'))
  assert.ok(topology?.components.some((component) => component.key === 'docs' && component.role === 'conhecimento canônico'))
  assert.ok(topology?.connections.some((connection) => connection.from === 'atlas-desktop' && connection.to === 'atlas-server'))
  assert.ok(topology?.execution_map.test_commands.includes('npm run atlas-ai:test'))
  assert.ok(topology?.knowledge_map.load_first_docs.includes('docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'))
  assert.ok(topology?.knowledge_map.manifest_refs.includes('atlas-desktop/package.json'))
  assert.ok(topology?.knowledge_map.validation_entrypoints.includes('npm run atlas-ai:test'))
  assert.ok(topology?.knowledge_map.sensitive_zones.some((zone) => zone.includes('atlas-desktop') || zone.includes('atlas-server')))
  assert.equal(topology?.safety.absolute_paths_included, false)
  assert.equal(pack?.topology?.schema_version, 'atlas.awis.workspace_topology_projection.v1')
  assert.ok(pack?.workspace_twin?.context_autopilot.avoid.some((item) => item.includes('sensível:atlas-desktop') || item.includes('sensível:atlas-server')))
  assert.ok(pack?.workspace_twin?.context_autopilot.validate.includes('npm run atlas-ai:test'))
  assert.equal(pack?.startup_snapshot?.readiness.topology_ready, true)
  assert.ok(pack?.startup_snapshot?.startup_gold.workspace_components.some((component) => component.includes('atlas-desktop')))
  assert.ok(pack?.startup_briefing?.focus.repositories.includes('atlas-desktop'))
  assert.ok(pack?.startup_briefing?.context_gold.reusable_patterns.some((pattern) => pattern.includes('workspace:atlas-server')))
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
  assert.ok(relations?.related_workspaces[0]?.recommended_transfer.some((hint) => hint.includes('php artisan test')))
  assert.ok(relations?.transfer_matrix.some((transfer) => transfer.workspace_hint === 'atlas-server'))
  assert.ok(relations?.transfer_matrix[0]?.reuse.some((item) => item.includes('ouro:component:atlas-server')))
  assert.ok(relations?.transfer_matrix[0]?.reuse.some((item) => item.includes('validação:bug_fix:php artisan test')))
  assert.ok(relations?.transfer_matrix[0]?.reuse.some((item) => item.includes('recovery:bug_fix:failed:php artisan test')))
  assert.ok(relations?.transfer_matrix[0]?.reuse.some((item) => item.includes('php artisan test')))
  assert.ok(relations?.transfer_matrix[0]?.revalidate.some((item) => item.includes('validar comando antes de aplicar')))
  assert.ok(relations?.transfer_matrix[0]?.revalidate.some((item) => item.includes('confirmar validação transferida')))
  assert.ok(relations?.transfer_matrix[0]?.revalidate.some((item) => item.includes('aplicar recovery só com evidência local')))
  assert.ok(relations?.transfer_matrix[0]?.do_not_transfer.includes('paths absolutos'))
  assert.ok(relations?.connection_contracts.some((contract) => contract.workspace_hint === 'atlas-server'))
  assert.equal(relations?.connection_contracts.find((contract) => contract.workspace_hint === 'atlas-server')?.relationship, 'shared_context')
  assert.ok(relations?.connection_contracts[0]?.load_when.some((item) => item.includes('contexto já validado')))
  assert.ok(relations?.connection_contracts[0]?.reuse.some((item) => item.includes('contexto validado:component:atlas-server')))
  assert.ok(relations?.connection_contracts[0]?.validate.some((item) => item.includes('provar novamente:bug_fix:php artisan test')))
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
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir integração entre desktop e server')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  assert.ok(task?.recommended_context.related_workspace_hints.some((hint) => hint.startsWith('mesh:atlas-server')))
  assert.ok(task?.recommended_context.related_workspace_hints.some((hint) => hint.startsWith('transfer:atlas-server')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('workspace-mesh:')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('mesh-route:atlas-server')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('transfer:atlas-server')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('repo-connection:atlas-server')))
  assert.ok(capsule?.validate_with.some((item) => item.startsWith('conexão:atlas-server')))
  assert.ok(capsule?.avoid_loading.includes('paths absolutos'))
  assert.ok(capsule?.avoid_loading.includes('segredos ou decisões sensíveis'))
  const artifact = pack ? buildAwisWorkspaceArtifact(pack, '2026-05-24T15:30:00Z') : null
  const replay = artifact ? buildAwisWorkspaceArtifactReplayProjection([artifact]) : null
  assert.equal(artifact?.payload.workspace_mesh_projection?.schema_version, 'atlas.awis.workspace_mesh_projection.v1')
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('mesh:mesh-')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('mesh-route:atlas-server')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('repo-contract:atlas-server:shared_context')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.includes('repo-contract-reuse:atlas-server:contexto validado:component:atlas-server')))
  assert.ok(replay?.reusable_startup_gold.warnings.some((warning) => warning.includes('repo-contract-never:atlas-server:segredos')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.includes('conexão repo: validar atlas-server')))
  assert.doesNotMatch(JSON.stringify(pack), /\/Users\/|raw_conversation_included":true/)
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
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('live-memory:')))
  assert.ok(replay?.cold_start_seed.context_signals.some((signal) => signal.startsWith('live-memory:')))
  assert.ok(replay?.cold_start_seed.repository_hints.includes('atlas-desktop'))
  assert.ok(replay?.cold_start_seed.repository_hints.includes('atlas-server'))
  assert.doesNotMatch(JSON.stringify(pack?.live_execution_memory), /\/Users\/|raw_conversation_included":true|source_thread_ids|thread_id/)
  assert.doesNotMatch(JSON.stringify(pack?.repository_constellation), /\/Users\/|raw_conversation_included":true|source_thread_ids|thread_id/)
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
  saveAwisWorkspaceArtifact(artifact, store)

  const loaded = loadAwisWorkspaceArtifacts(key, store)
  const replay = loadAwisWorkspaceArtifactReplayProjection(key, store)

  assert.equal(loaded[0]?.payload.startup_briefing?.schema_version, 'atlas.awis.workspace_startup_briefing.v1')
  assert.equal(loaded[0]?.payload.startup_playbook?.schema_version, 'atlas.awis.workspace_startup_playbook.v1')
  assert.equal(loaded[0]?.payload.learning_projection?.schema_version, 'atlas.awis.workspace_learning_projection.v1')
  assert.equal(loaded[0]?.payload.topology_projection?.schema_version, 'atlas.awis.workspace_topology_projection.v1')
  assert.equal(loaded[0]?.payload.startup_briefing?.never_start_cold, true)
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('load:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('playbook:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('maturity:')))
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('component:')))
  assert.doesNotMatch(JSON.stringify(loaded), /\/Users\/|operator_input|response_text|full_message|"raw_conversation_included":true/)
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

  assert.equal(pack.automation.schema_version, 'atlas.awis.workspace_automation_projection.v1')
  assert.ok(pack.automation.maintenance_queue.some((item) => item.action === 'refresh_folder_map'))
  assert.ok(pack.automation.maintenance_queue.some((item) => item.action === 'record_outcome'))
  assert.ok(pack.automation.maintenance_queue.some((item) => item.action === 'revalidate_command'))
  assert.ok(pack.automation.autopilot_context.before_send.includes('Atualizar mapa local'))
  assert.ok(pack.automation.autopilot_context.after_send.includes('Registrar resultado da sessão'))
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
  }).memory
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
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug no desktop e validar')

  assert.equal(pack.session_gold.schema_version, 'atlas.awis.workspace_session_gold_projection.v1')
  assert.ok(pack.session_gold.strongest_outcomes.some((outcome) => outcome.label.includes('bug_fix')))
  assert.ok(pack.session_gold.proven_commands.some((command) => command.command === 'npm run atlas-ai:test'))
  assert.ok(pack.session_gold.recovery_patterns.some((pattern) => pattern.includes('send_failed')))
  assert.ok(pack.session_gold.next_session_hooks.validate_with.includes('npm run atlas-ai:test'))
  assert.equal(artifact?.payload.session_gold_projection?.schema_version, 'atlas.awis.workspace_session_gold_projection.v1')
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
  saveAwisWorkspaceArtifact(artifact, store)
  const loadedArtifact = loadAwisWorkspaceArtifacts(key, store)[0]
  const loadedReplay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))

  assert.equal(pack.memory_consolidation.schema_version, 'atlas.awis.workspace_memory_consolidation_projection.v1')
  assert.ok(pack.memory_consolidation.next_session_seed.length > 0)
  assert.ok(pack.memory_consolidation.consolidate.promote_to_gold.some((item) => item.includes('npm run atlas-ai:test') || item.startsWith('rota:')))
  assert.ok(pack.memory_consolidation.consolidate.rehearse_next.some((item) => item.includes('Space') || item.includes('rota:')))
  assert.ok(pack.memory_consolidation.consolidate.archive_as_artifact.some((item) => item.includes('Space') || item.includes('partida AWIS')))
  assert.ok(pack.memory_consolidation.consolidate.never_promote.includes('paths absolutos do Mac'))
  assert.ok(pack.memory_consolidation.learning_loop.capture_after_send.includes('resultado da rota'))
  assert.ok(pack.memory_consolidation.learning_loop.recalibrate_after_failure.includes('não promover contexto sem evidência'))
  assert.equal(pack.memory_consolidation.safety.provider_safe, true)
  assert.equal(pack.memory_consolidation.safety.external_side_effects_allowed, false)
  assert.ok(capsule?.load_first.some((item) => item.startsWith('seed:')))
  assert.ok(capsule?.avoid_loading.some((item) => item.startsWith('não promover:')))
  assert.equal(artifact.payload.memory_consolidation_projection?.schema_version, 'atlas.awis.workspace_memory_consolidation_projection.v1')
  assert.equal(loadedArtifact?.payload.memory_consolidation_projection?.schema_version, 'atlas.awis.workspace_memory_consolidation_projection.v1')
  assert.ok(loadedReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('seed:')))
  assert.ok(loadedReplay?.reusable_startup_gold.warnings.some((warning) => warning.startsWith('never-promote:')))
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
  assert.ok(task?.execution_plan.commands_to_avoid.includes('memória stale:usar resumo até revalidar'))
  assert.ok(capsule?.validate_with.some((item) => item.includes('frescor:scan antigo') || item.includes('scan antigo')))
  assert.ok(capsule?.avoid_loading.includes('memória stale:usar resumo até revalidar'))
  assert.equal(finalArtifact?.payload.memory_freshness_projection?.schema_version, 'atlas.awis.workspace_memory_freshness_projection.v1')
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('freshness:')))
  assert.ok(finalReplay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('frescor:')))
  assert.deepEqual(directFreshness, pack.memory_freshness)
  assert.doesNotMatch(JSON.stringify(pack.memory_freshness), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})

test('AWIS component memory gives each repo area its own load policy', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
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
  assert.ok(finalReplay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('component-memory:atlas-desktop:')))
  assert.deepEqual(directComponentMemory, pack.component_memory)
  assert.doesNotMatch(JSON.stringify(pack.component_memory), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
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
  assert.ok(replay?.reusable_startup_gold.reusable_patterns.some((pattern) => pattern.startsWith('semantic:')))
  assert.ok(replay?.reusable_startup_gold.next_best_actions.some((action) => action.startsWith('semântico:')))
  assert.deepEqual(directSemantic, pack.semantic_index)
  assert.doesNotMatch(JSON.stringify(pack.semantic_index), /operator_input|response_text|prompt|\/Users\/|thread_id|source_thread_ids|"raw_conversation_included":true/)
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
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir contrato backend que quebra desktop')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T23:11:00Z')
  assert.ok(artifact)
  saveAwisWorkspaceArtifact(artifact, store)
  const loadedArtifact = loadAwisWorkspaceArtifacts(key, store)[0]
  const replay = buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(key, store))
  const serverImpact = pack.impact_map.component_impacts.find((impact) => impact.component_key === 'atlas-server')

  assert.equal(pack.impact_map.schema_version, 'atlas.awis.workspace_impact_map_projection.v1')
  assert.ok(serverImpact)
  assert.ok(serverImpact.affected_components.includes('atlas-desktop'))
  assert.ok(serverImpact.validation_cascade.includes('php artisan test'))
  assert.ok(['medium', 'high'].includes(serverImpact.risk))
  assert.equal(pack.impact_map.safety.provider_safe, true)
  assert.equal(task?.recommended_context.impact_radius.primary_component, 'atlas-server')
  assert.ok(task?.recommended_context.impact_radius.affected_components.includes('atlas-desktop'))
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
  assert.ok(task?.execution_plan.recovery_playbook.fallback_validation.includes('npm run atlas-ai:test'))
  assert.ok(task?.execution_plan.recovery_playbook.demote_context.some((item) => item.includes('component:atlas-server') || item.includes('atlas-server')))
  assert.ok(task?.execution_plan.recovery_playbook.safe_resume.some((item) => item.includes('provider fallback') || item.includes('validar novamente')))
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

  assert.equal(pack.provider_strategy.schema_version, 'atlas.awis.workspace_provider_strategy_projection.v1')
  assert.equal(atlasProvider?.policy, 'prefer')
  assert.equal(atlasProvider?.success_count, 2)
  assert.equal(atlasProvider?.avg_latency_ms, 700)
  assert.equal(failedProvider?.policy, 'avoid')
  assert.ok(pack.provider_strategy.fallback_order.some((item) => item.startsWith('atlas_decide')))
  assert.ok(pack.provider_strategy.caution_signals.some((item) => item.includes('claude_cli')))
  assert.equal(capsule?.provider_strategy?.preferred_provider, 'atlas_decide')
  assert.ok(capsule?.provider_strategy?.avoid.some((item) => item.includes('claude_cli')))
  assert.ok(capsule?.use_as_summary.some((item) => item.startsWith('provider:prefer:atlas_decide')))
  assert.equal(artifact?.payload.provider_strategy_projection?.schema_version, 'atlas.awis.workspace_provider_strategy_projection.v1')
  assert.deepEqual(directStrategy, pack.provider_strategy)
  assert.doesNotMatch(JSON.stringify(pack.provider_strategy), /operator_input|response_text|prompt|\/Users\/|"raw_conversation_included":true/)
})

test('AWIS task router precompiles intent routes from Spaces, components and artifacts', () => {
  const key = workspaceMemoryKey('/Users/vitorepf/develop/Atlas', 'atlas')
  const snapshot = brain({
    commands: [
      { label: 'Atlas AI test', command: 'npm run atlas-ai:test', kind: 'test', source: 'atlas-desktop/package.json' },
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
    validationCommands: ['npm run atlas-ai:test'],
    componentKeys: ['atlas-desktop'],
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
  })
  const task = buildAwisWorkspaceTaskContextProjection(pack, 'corrigir bug de drag no atlas ai space')
  const capsule = buildAwisWorkspaceProviderCapsule(pack, task)
  const artifact = buildAwisWorkspaceArtifact(pack, '2026-05-24T23:20:00Z')
  const bugRoute = pack.task_router.routes.find((route) => route.task_kind === 'bug_fix')

  assert.equal(pack.task_router.schema_version, 'atlas.awis.workspace_task_router_projection.v1')
  assert.ok((pack.task_router.route_count ?? 0) >= 1)
  assert.ok(bugRoute)
  assert.equal(bugRoute?.route_key, 'task:bug_fix')
  assert.equal(bugRoute?.policy, 'prefer')
  assert.equal(bugRoute?.success_count, 2)
  assert.equal(bugRoute?.failure_count, 0)
  assert.equal(bugRoute?.success_rate, 100)
  assert.equal(bugRoute?.suggested_surface, 'side_by_side')
  assert.ok(bugRoute?.load_first.some((item) => item.includes('mapa de componentes')))
  assert.ok(bugRoute?.use_spaces.some((item) => item.includes('Fluxo AWIS Spaces')))
  assert.ok(bugRoute?.validate_with.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(bugRoute?.intent_signals.includes('bug'))
  assert.ok(bugRoute?.evidence_plan.load.some((item) => item.includes('mapa de componentes')))
  assert.ok(bugRoute?.evidence_plan.verify.some((item) => item.includes('npm run atlas-ai:test')))
  assert.ok(bugRoute?.evidence_plan.preserve.some((item) => item.includes('atualizar pack do Space usado')))
  assert.ok(bugRoute?.evidence_plan.learn.some((item) => item.includes('registrar outcome:bug_fix')))
  assert.ok(bugRoute?.automation_hooks.before_send.length)
  assert.ok(bugRoute?.automation_hooks.after_success.some((item) => item.includes('promover rota:bug_fix')))
  assert.ok(bugRoute?.automation_hooks.after_failure.some((item) => item.includes('não promover contexto sem evidência')))
  assert.ok(task?.recommended_context.load_order.some((item) => item.includes('mapa de componentes')))
  assert.ok(task?.recommended_context.spaces.some((item) => item.includes('Fluxo AWIS Spaces')))
  assert.ok(capsule?.load_first.some((item) => item.includes('mapa de componentes')))
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
  assert.deepEqual(directOrchestration, pack.startup_orchestration)
  assert.doesNotMatch(JSON.stringify(pack.startup_orchestration), /\/Users\/|thread_id|source_thread_ids|operator_input|response_text|"raw_conversation_included":true/)
})
