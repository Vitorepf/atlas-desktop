import assert from 'node:assert/strict'
import test from 'node:test'
import type { AtlasWorkspaceProfile } from '@atlas/domain'
import { evaluateAwisWorkspaceIntelligence } from '../awisIntelligence'

function profile(partial: Partial<AtlasWorkspaceProfile> = {}): AtlasWorkspaceProfile {
  return {
    schemaVersion: 'atlas.workspace_profile.v1',
    id: 'workspace-atlas',
    slug: 'atlas',
    name: 'Atlas',
    kind: 'repo',
    source: 'local',
    status: 'active',
    workspacePath: '',
    workspacePathExists: false,
    repoRoot: '',
    productionStatus: 'development',
    stackSummary: '',
    commands: {},
    testCommands: [],
    buildCommands: [],
    devServerCommand: null,
    criticalAreas: [],
    docsStatus: 'complete',
    defaultRisk: 'medium',
    deploymentNotes: '',
    safety: {
      executionAllowed: false,
      executionBlockedReason: null,
      riskFloor: 'medium',
      requiresExplicitInterventionReview: false,
    },
    surfacesEnabled: ['atlas_ai', 'code'],
    ...partial,
  }
}

test('AWIS intelligence exposes clear gaps when project context is only initial', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: null,
    threadCount: 0,
    spaceCount: 0,
    workbenchPaneCount: 0,
    hasStoredWorkbench: false,
    historyHealthy: true,
    runtimeStatus: 'unavailable',
  })

  assert.equal(intelligence.level, 'context')
  assert.equal(intelligence.label, 'Contexto inicial')
  assert.ok(intelligence.score < 35)
  assert.deepEqual(intelligence.nextActions.slice(0, 2), ['criar projeto', 'escolher pasta local'])
})

test('AWIS intelligence reaches command level when workspace is executable and organized', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Tauri, React, TypeScript',
      commands: { test: 'npm run atlas-ai:test' },
      testCommands: ['npm run atlas-ai:test'],
      buildCommands: ['npm run tauri:build -- --workspace=@atlas/desktop'],
      devServerCommand: 'npm run dev',
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 8,
    spaceCount: 2,
    workbenchPaneCount: 3,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    learningLoop: {
      status: 'ready',
      loopClosed: true,
      action: 'prepare_provider_safe_handoff',
      learningScore: 0.98,
      hash: 'abc',
    },
    runtimeSnapshot: {
      status: 'ready',
      persisted: true,
      snapshotHash: 'hash',
      brainHash: 'brain',
      projectionCount: 5,
    },
    workspaceLiveExecutionMemory: {
      schema_version: 'atlas.awis.live_execution_memory_projection.v1',
      source: 'server_awis_live_execution_memory',
      readiness_score: 96,
      memory_hash: 'sha256:live',
      startup_packet: {
        load_first: ['workspace_live_execution_memory'],
        use_as_summary: ['estado vivo canônico do workspace'],
        validate_before_trust: ['hash da memória viva'],
        avoid: ['usar contexto antigo sem validar'],
        human_boundary: ['aprovar ações destrutivas'],
      },
      automation_loop: {
        before_send: ['refresh_context_pack'],
        after_success: ['promote_safe_evidence'],
        after_failure: ['preserve_failure_signal'],
        on_drift: ['revalidate_live_memory'],
      },
      promotion_rules: {
        promote_to_gold: ['evidence_ready'],
        preserve_as_artifact: ['session_closing'],
        revalidate: ['workspace_changed'],
        demote: ['stale_context'],
      },
      workspace_learning: {
        repositories: ['atlas-desktop'],
        components: ['Atlas AI'],
        spaces: ['Fluxo Atlas AI'],
        artifacts: ['live-memory:sha256:live'],
        commands: ['npm run atlas-ai:test'],
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        external_side_effects_allowed: false,
        bounded: true,
        provider_safe: true,
      },
    },
  })

  assert.equal(intelligence.level, 'command')
  assert.equal(intelligence.label, 'Comando AWIS')
  assert.ok(intelligence.score >= 85)
  assert.ok(intelligence.capabilities.includes('pasta real'))
  assert.ok(intelligence.capabilities.includes('execução local'))
  assert.ok(intelligence.capabilities.includes('comparação retomável'))
  assert.ok(intelligence.capabilities.includes('AWIS pronto'))
  assert.ok(!intelligence.capabilities.some((capability) => capability.includes('runtime')))
  assert.ok(intelligence.capabilities.includes('loop vivo'))
  assert.ok(intelligence.capabilities.includes('snapshot AWIS salvo'))
  assert.ok(intelligence.capabilities.includes('memória viva canônica'))
  assert.equal(intelligence.liveSignal.label, 'loop vivo')
  assert.equal(intelligence.liveSignal.tone, 'ok')
  assert.deepEqual(intelligence.gaps, [])
})

test('AWIS intelligence treats a blocked runtime snapshot as real brain debt', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 3,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    serverHealth: {
      status: 'ready',
      dbConnected: true,
      overallOk: true,
    },
    learningLoop: {
      status: 'ready',
      loopClosed: true,
      action: 'prepare_provider_safe_handoff',
      learningScore: 0.98,
    },
    runtimeSnapshot: {
      status: 'blocked',
      persisted: false,
    },
  })

  assert.ok(intelligence.gaps.includes('recriar snapshot AWIS'))
  assert.ok(!intelligence.capabilities.includes('snapshot AWIS salvo'))
  assert.ok(intelligence.score < 100)
})

test('AWIS intelligence keeps backend/history failure visible without blocking local power', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'low',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 4,
    spaceCount: 1,
    workbenchPaneCount: 0,
    hasStoredWorkbench: false,
    historyHealthy: false,
    runtimeStatus: 'partial',
  })

  assert.ok(intelligence.capabilities.includes('pasta real'))
  assert.ok(intelligence.gaps.includes('histórico indisponível'))
  assert.ok(intelligence.nextActions.includes('histórico indisponível'))
})

test('AWIS intelligence treats a blocked certified loop as the next operational gap', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 3,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    learningLoop: {
      status: 'blocked',
      loopClosed: false,
      action: 'repair_workspace_contracts',
      learningScore: 0.4,
    },
  })

  assert.ok(intelligence.gaps.includes('fechar loop AWIS'))
  assert.ok(intelligence.nextActions.includes('fechar loop AWIS'))
  assert.equal(intelligence.liveSignal.label, 'loop incompleto')
  assert.equal(intelligence.liveSignal.tone, 'warn')
})

test('AWIS intelligence never shows 100 while an operational gap remains', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      buildCommands: ['npm run build'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 7,
    spaceCount: 1,
    workbenchPaneCount: 0,
    hasStoredWorkbench: false,
    historyHealthy: true,
    runtimeStatus: 'ready',
    learningLoop: {
      status: 'ready',
      loopClosed: true,
      action: 'prepare_provider_safe_handoff',
      learningScore: 0.98,
    },
  })

  assert.ok(intelligence.gaps.includes('comparar sessões'))
  assert.ok(intelligence.score < 100)
})

test('AWIS intelligence treats pending runtime certification as a real command-center gap', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      buildCommands: ['npm run build'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 7,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'blocked',
    serverHealth: {
      status: 'ready',
      dbConnected: true,
      overallOk: true,
    },
    learningLoop: {
      status: 'ready',
      loopClosed: true,
      action: 'prepare_provider_safe_handoff',
      learningScore: 0.98,
    },
  })

  assert.ok(intelligence.gaps.includes('concluir certificação AWIS'))
  assert.ok(intelligence.nextActions.includes('concluir certificação AWIS'))
  assert.ok(intelligence.score < 100)
  assert.doesNotMatch(intelligence.summary, /pronto para contexto/)
  assert.ok(!intelligence.capabilities.includes('AWIS pronto'))
})

test('AWIS intelligence surfaces local service and database failures as first-class gates', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 5,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    serverHealth: {
      status: 'degraded',
      dbConnected: false,
      overallOk: false,
      detail: 'atlas-server',
    },
    learningLoop: {
      status: 'ready',
      loopClosed: true,
      action: 'prepare_provider_safe_handoff',
      learningScore: 0.98,
    },
  })

  assert.ok(intelligence.gaps.includes('recuperar histórico local'))
  assert.ok(intelligence.nextActions.includes('recuperar histórico local'))
  assert.equal(intelligence.liveSignal.label, 'serviço local')
  assert.equal(intelligence.liveSignal.detail, 'histórico local indisponível')
  assert.equal(intelligence.liveSignal.tone, 'warn')
  assert.ok(intelligence.score < 100)
})

test('AWIS intelligence surfaces unwritable local storage as a first-class execution gate', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 5,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    serverHealth: {
      status: 'degraded',
      dbConnected: true,
      overallOk: false,
      storageOk: false,
      storageWritable: false,
      storagePath: '/Users/vitorepf/develop/Atlas/atlas-server/storage/atlas-local',
      detail: 'atlas-server',
    },
    learningLoop: {
      status: 'ready',
      loopClosed: true,
      action: 'prepare_provider_safe_handoff',
      learningScore: 0.98,
    },
  })

  assert.ok(intelligence.gaps.includes('liberar armazenamento local'))
  assert.ok(intelligence.nextActions.includes('liberar armazenamento local'))
  assert.equal(intelligence.liveSignal.label, 'armazenamento local')
  assert.equal(intelligence.liveSignal.detail, 'sem escrita na pasta local do Atlas')
  assert.doesNotMatch(intelligence.liveSignal.detail, /\/Users\/vitorepf/)
  assert.equal(intelligence.liveSignal.tone, 'warn')
  assert.ok(intelligence.score < 100)
})

test('AWIS intelligence does not expose unknown loop action identifiers', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 5,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    learningLoop: {
      status: 'ready',
      loopClosed: true,
      action: 'unknown_backend_action',
      learningScore: 0.82,
    },
  })

  assert.match(intelligence.liveSignal.detail, /ação local registrada/)
  assert.doesNotMatch(intelligence.liveSignal.detail, /unknown_backend_action|backend action/)
})

test('AWIS intelligence rewards a healthy local service without hiding loop status', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 5,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    serverHealth: {
      status: 'ready',
      dbConnected: true,
      overallOk: true,
      detail: 'atlas-server',
    },
    learningLoop: {
      status: 'ready',
      loopClosed: true,
      action: 'prepare_provider_safe_handoff',
      learningScore: 0.98,
    },
  })

  assert.ok(intelligence.capabilities.includes('serviço local pronto'))
  assert.equal(intelligence.liveSignal.label, 'loop vivo')
  assert.equal(intelligence.liveSignal.tone, 'ok')
})

test('AWIS intelligence treats the local folder map as first-class workspace power', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      buildCommands: ['npm run build'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 6,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    workspaceBrain: {
      status: 'ready',
      rootName: 'Atlas',
      rootPath: '/Users/vitorepf/develop/Atlas',
      scannedAt: '2026-05-24T12:00:00Z',
      isGit: true,
      filesSeen: 2400,
      dirsSeen: 210,
      ignoredDirs: 14,
      maxDepth: 6,
      truncated: true,
      languages: [{ label: 'TypeScript', count: 1200 }],
      signals: ['Tauri', 'pnpm', 'Rust/Cargo'],
      importantFiles: [{ path: 'atlas-desktop/package.json', kind: 'manifesto' }],
      docDigests: [],
      dependencyEdges: [],
      commands: [{ label: 'npm test', command: 'npm run test', kind: 'test', source: 'package.json' }],
      notes: ['scan limitado para manter desempenho'],
    },
  })

  assert.ok(intelligence.capabilities.includes('mapa local'))
  assert.ok(intelligence.capabilities.includes('stack detectada'))
  assert.ok(intelligence.capabilities.includes('comandos inferidos'))
  assert.ok(!intelligence.gaps.includes('mapear pasta local'))
})

test('AWIS intelligence exposes workspace topology as a compact command-center capability', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop + Laravel',
      testCommands: ['npm test'],
      buildCommands: ['npm run build'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 6,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    workspaceBrain: {
      status: 'ready',
      rootName: 'Atlas',
      rootPath: '/Users/vitorepf/develop/Atlas',
      scannedAt: '2026-05-24T12:00:00Z',
      isGit: true,
      filesSeen: 2400,
      dirsSeen: 210,
      ignoredDirs: 14,
      maxDepth: 6,
      truncated: false,
      languages: [{ label: 'TypeScript', count: 1200 }],
      signals: ['Tauri', 'Laravel'],
      importantFiles: [{ path: 'atlas-desktop/package.json', kind: 'manifesto' }],
      docDigests: [],
      dependencyEdges: [],
      commands: [{ label: 'npm test', command: 'npm run test', kind: 'test', source: 'atlas-desktop/package.json' }],
      notes: [],
    },
    workspaceTopology: {
      schema_version: 'atlas.awis.workspace_topology_projection.v1',
      source: 'local_workspace_folder_map',
      root: {
        name: 'Atlas',
        is_git: true,
        scan_truncated: false,
        files_seen: 2400,
      },
      components: [
        {
          key: 'atlas-desktop',
          role: 'aplicativo desktop',
          stack: ['Tauri', 'TypeScript'],
          areas: ['atlas-desktop/apps/desktop/src/surfaces/atlas-ai'],
          manifests: ['atlas-desktop/package.json'],
          docs: [],
          commands: [{ command: 'npm run test', kind: 'test', source: 'atlas-desktop/package.json' }],
          confidence: 92,
        },
      ],
      connections: [],
      execution_map: {
        test_commands: ['npm run test'],
        build_commands: ['npm run build'],
        dev_commands: [],
        check_commands: [],
      },
      knowledge_map: {
        load_first_docs: [],
        manifest_refs: ['atlas-desktop/package.json'],
        command_sources: ['atlas-desktop/package.json'],
        doc_signals: [],
        doc_obligations: [],
        doc_summaries: [],
        area_refs: ['atlas-desktop/apps/desktop/src/surfaces/atlas-ai'],
        stack_dependency_signals: ['Tauri', 'TypeScript'],
        internal_dependency_edges: ['@atlas/desktop->@atlas/domain:dependencies:atlas-desktop/apps/desktop/package.json'],
        workspace_members: [],
        workspace_dependency_edges: [],
        command_intents: ['validate:auto-validar:atlas-desktop/package.json:npm run test'],
        validation_entrypoints: ['npm run test'],
        runtime_entrypoints: ['npm run build'],
        sensitive_zones: ['atlas-desktop'],
        workspace_notes: [],
        summarize_only: [],
      },
      safety: {
        raw_source_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        bounded: true,
        provider_safe: true,
      },
    },
  })

  assert.ok(intelligence.capabilities.includes('topologia local'))
  assert.ok(intelligence.capabilities.includes('partida inteligente'))
  assert.ok(!intelligence.gaps.includes('entender componentes'))
})

test('AWIS intelligence does not claim full command state while the folder map is missing', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      buildCommands: ['npm run build'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 6,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    workspaceBrain: null,
  })

  assert.ok(intelligence.gaps.includes('mapear pasta local'))
  assert.ok(intelligence.nextActions.includes('mapear pasta local'))
  assert.ok(intelligence.score < 100)
})

test('AWIS intelligence rewards persistent local memory after the folder map learns the workspace', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      buildCommands: ['npm run build'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 6,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    workspaceBrain: {
      status: 'ready',
      rootName: 'Atlas',
      rootPath: '/Users/vitorepf/develop/Atlas',
      scannedAt: '2026-05-24T12:00:00Z',
      isGit: true,
      filesSeen: 2400,
      dirsSeen: 210,
      ignoredDirs: 14,
      maxDepth: 6,
      truncated: true,
      languages: [{ label: 'TypeScript', count: 1200 }],
      signals: ['Tauri', 'pnpm', 'Rust/Cargo'],
      importantFiles: [{ path: 'atlas-desktop/package.json', kind: 'manifesto' }],
      docDigests: [],
      dependencyEdges: [],
      commands: [{ label: 'npm test', command: 'npm run test', kind: 'test', source: 'package.json' }],
      notes: ['scan limitado para manter desempenho'],
    },
    workspaceMemory: {
      schemaVersion: 'atlas.awis.workspace_memory.v1',
      workspaceKey: '/users/vitorepf/develop/atlas',
      workspaceName: 'Atlas',
      rootPath: '/Users/vitorepf/develop/Atlas',
      firstSeenAt: '2026-05-24T12:00:00Z',
      lastSeenAt: '2026-05-24T12:05:00Z',
      scanCount: 2,
      lastFingerprint: 'fingerprint',
      stableSignals: [{ label: 'Tauri', firstSeenAt: '2026-05-24T12:00:00Z', lastSeenAt: '2026-05-24T12:05:00Z', seenCount: 2 }],
      stableLanguages: [{ label: 'TypeScript', firstSeenAt: '2026-05-24T12:00:00Z', lastSeenAt: '2026-05-24T12:05:00Z', seenCount: 2 }],
      stableCommands: [{ label: 'npm run test', firstSeenAt: '2026-05-24T12:00:00Z', lastSeenAt: '2026-05-24T12:05:00Z', seenCount: 2 }],
      operationalSignals: [],
      interactionCount: 0,
      successCount: 0,
      failureCount: 0,
      contextPackAppliedCount: 0,
      lastInteractionAt: null,
      recentOutcomes: [],
      recentMaintenance: [],
      observations: ['primeiro mapa local persistido'],
      driftEvents: [],
    },
  })

  assert.ok(intelligence.capabilities.includes('memória local'))
  assert.ok(intelligence.capabilities.includes('aprendizado incremental'))
  assert.ok(intelligence.capabilities.includes('partida inteligente'))
  assert.ok(!intelligence.gaps.includes('ativar memória local'))
})

test('AWIS intelligence rewards abstract cross-workspace learning without treating it as raw memory sharing', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      buildCommands: ['npm run build'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 6,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    workspaceEvolution: {
      schema_version: 'atlas.awis.workspace_evolution_projection.v1',
      source: 'local_abstract_workspace_memories',
      workspace_count: 3,
      current_workspace_seen: true,
      patterns: [{
        label: 'TypeScript',
        kind: 'language',
        seen_in_workspaces: 2,
        total_seen: 5,
        recommended_use: 'usar como pista de stack, nunca como prova única',
      }],
      failure_signatures: [],
      pattern_library: [],
      failure_signature_bank: [],
      transfer_policy: {
        privacy_level: 'abstracted',
        raw_workspace_names_returned: false,
        raw_paths_returned: false,
        raw_source_returned: false,
        apply_only_when_stack_matches: true,
      },
    },
  })

  assert.ok(intelligence.capabilities.includes('aprendizado entre projetos'))
})

test('AWIS intelligence rewards operational memory after the workspace is used', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      buildCommands: ['npm run build'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 6,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    workspaceMemory: {
      schemaVersion: 'atlas.awis.workspace_memory.v1',
      workspaceKey: '/users/vitorepf/develop/atlas',
      workspaceName: 'Atlas',
      rootPath: '/Users/vitorepf/develop/Atlas',
      firstSeenAt: '2026-05-24T12:00:00Z',
      lastSeenAt: '2026-05-24T12:10:00Z',
      scanCount: 1,
      lastFingerprint: 'fingerprint',
      stableSignals: [{ label: 'Tauri', firstSeenAt: '2026-05-24T12:00:00Z', lastSeenAt: '2026-05-24T12:05:00Z', seenCount: 1 }],
      stableLanguages: [],
      stableCommands: [],
      operationalSignals: [{ label: 'canal:workbench', firstSeenAt: '2026-05-24T12:10:00Z', lastSeenAt: '2026-05-24T12:10:00Z', seenCount: 1 }],
      interactionCount: 3,
      successCount: 2,
      failureCount: 1,
      contextPackAppliedCount: 2,
      lastInteractionAt: '2026-05-24T12:10:00Z',
      recentOutcomes: [{
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
        spaceLabels: [],
        spaceBrainLabels: [],
        liveMemoryLabels: [],
        priorityLoadLabels: [],
        continuityLabels: [],
        handoffLabels: [],
        artifactReplayLabels: [],
        evidenceGateLabels: [],
        nextSessionLabels: [],
        recoveryLabels: [],
        adaptiveLearningLabels: [],
        feedbackRecordLabels: [],
        feedbackPromoteLabels: [],
        feedbackRevalidateLabels: [],
        feedbackSpaceLabels: [],
        feedbackArtifactLabels: [],
        feedbackComponentLabels: [],
        feedbackRelationLabels: [],
        feedbackMeshLabels: [],
        componentMemoryLabels: [],
        semanticIndexLabels: [],
        taskRouterLabels: [],
        impactMapLabels: [],
        livingGraphLabels: [],
        workspaceMeshLabels: [],
        truthPackLabels: [],
        repositoryConstellationLabels: [],
      }],
      recentMaintenance: [],
      observations: ['workspace usado em conversa real'],
      driftEvents: [],
    },
  })

  assert.ok(intelligence.capabilities.includes('memória local'))
  assert.ok(intelligence.capabilities.includes('uso aprendido'))
})

test('AWIS intelligence treats Artifact Lake replay as real startup power', () => {
  const intelligence = evaluateAwisWorkspaceIntelligence({
    profile: profile({
      workspacePath: '/Users/vitorepf/develop/Atlas',
      workspacePathExists: true,
      repoRoot: '/Users/vitorepf/develop/Atlas',
      stackSummary: 'Desktop',
      testCommands: ['npm test'],
      buildCommands: ['npm run build'],
      safety: {
        executionAllowed: true,
        executionBlockedReason: null,
        riskFloor: 'medium',
        requiresExplicitInterventionReview: false,
      },
    }),
    threadCount: 4,
    spaceCount: 1,
    workbenchPaneCount: 2,
    hasStoredWorkbench: true,
    historyHealthy: true,
    runtimeStatus: 'ready',
    workspaceArtifactLake: {
      schema_version: 'atlas.awis.workspace_artifact_lake_summary.v1',
      workspace_key: '/users/vitorepf/develop/atlas',
      artifact_count: 3,
      latest_artifact_hash: 'awis-abc12345',
      latest_artifact_type: 'startup_snapshot',
      latest_created_at: '2026-05-24T12:00:00Z',
      retained_limit: 24,
    },
    workspaceArtifactReplay: {
      schema_version: 'atlas.awis.workspace_artifact_replay_projection.v1',
      source: 'local_workspace_artifacts',
      artifact_count: 3,
      latest_artifact_hash: 'awis-abc12345',
      cold_start_seed: {
        schema_version: 'atlas.awis.artifact_cold_start_seed.v1',
        source: 'local_workspace_artifacts',
        readiness_score: 84,
        seed_hash: 'cold-awis-abc12345',
        load_order: ['startup_snapshot', 'context_pack'],
        validate_with: ['npm run atlas-ai:test'],
        command_lanes: {
          auto_validate: ['npm run atlas-ai:test'],
          confirm_before_run: [],
          manual_only: [],
          preferred_validation: ['npm run atlas-ai:test'],
          reason: 'fixture',
        },
        next_send_recipe: {
          load_now: ['startup_snapshot', 'context_pack'],
          summarize_now: ['maturidade:stable'],
          prove_before_trust: ['npm run atlas-ai:test'],
          avoid_or_confirm: ['confirmar execução local'],
        },
        context_signals: ['maturidade:stable'],
        reuse_spaces: ['Fluxo AWIS'],
        repository_hints: ['atlas-desktop'],
        automation_hooks: ['registrar resultado real'],
        warnings: [],
        human_boundary: ['confirmar execução local'],
      },
      reusable_startup_gold: {
        strongest_spaces: ['Fluxo AWIS · 3 sessões · 21 mensagens'],
        reusable_patterns: ['command:npm run atlas-ai:test'],
        warnings: [],
        next_best_actions: ['reabrir Space forte'],
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        internal_ids_included: false,
        bounded: true,
        provider_safe: true,
      },
    },
    workspaceContinuity: {
      schema_version: 'atlas.awis.workspace_continuity_projection.v1',
      source: 'local_awis_continuity_compiler',
      readiness_score: 75,
      restore_priority: [
        { kind: 'space', label: 'Fluxo AWIS', why: '3 sessões úteis', confidence: 86 },
      ],
      hot_context: {
        spaces: ['Fluxo AWIS'],
        components: ['atlas-desktop · aplicativo desktop'],
        commands: ['npm run atlas-ai:test'],
        artifacts: ['awis-abc12345'],
        task_kinds: ['bug_fix'],
        related_workspace_hints: [],
      },
      stale_or_risky_context: [],
      next_session_plan: {
        open_surface: 'space_first',
        first_load: ['space:Fluxo AWIS'],
        validate_with: ['npm run atlas-ai:test'],
        preserve_as_artifact: true,
      },
      learning_hooks: {
        capture_outcome: true,
        refresh_folder_map: false,
        update_space_pack: true,
        replay_artifacts_before_send: true,
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        bounded: true,
        provider_safe: true,
      },
    },
    workspaceAutomation: {
      schema_version: 'atlas.awis.workspace_automation_projection.v1',
      source: 'local_awis_maintenance_compiler',
      automation_score: 80,
      mode: 'optimize',
      maintenance_queue: [
        {
          action: 'record_outcome',
          label: 'Registrar resultado da sessão',
          reason: 'memória operacional melhora a próxima partida',
          priority: 'high',
          requires_human_confirmation: false,
        },
      ],
      autopilot_context: {
        before_send: ['Reusar replay AWIS'],
        after_send: ['Registrar resultado da sessão'],
        on_startup: ['workspace_memory'],
      },
      feedback_loop: {
        metrics_to_watch: ['taxa de sucesso'],
        promote_when: ['comando validado com sucesso'],
        demote_when: ['envio falha ou é cancelado'],
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        external_side_effects_allowed: false,
        bounded: true,
        provider_safe: true,
      },
    },
    workspaceConfidence: {
      schema_version: 'atlas.awis.workspace_confidence_projection.v1',
      source: 'local_awis_confidence_compiler',
      confidence_score: 78,
      ranked: {
        commands: [{ label: 'npm run atlas-ai:test', score: 90, evidence: ['validou tarefa real'], caution: null }],
        spaces: [{ label: 'Fluxo AWIS', score: 82, evidence: ['3 sessões'], caution: null }],
        artifacts: [{ label: 'awis-abc12345', score: 75, evidence: ['replay disponível'], caution: null }],
        transfers: [],
      },
      decision_policy: {
        prefer: ['comando:npm run atlas-ai:test'],
        require_confirmation_for: [],
        avoid_until_revalidated: [],
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        bounded: true,
        provider_safe: true,
      },
    },
    workspaceSessionGold: {
      schema_version: 'atlas.awis.workspace_session_gold_projection.v1',
      source: 'local_workspace_session_outcomes',
      readiness_score: 84,
      outcome_count: 4,
      success_rate: 75,
      strongest_outcomes: [
        { label: 'tarefa:bug_fix', confidence: 86, evidence: ['3 outcomes úteis'] },
      ],
      proven_commands: [
        { command: 'npm run atlas-ai:test', success_count: 3, task_kinds: ['bug_fix'], channels: ['conversation'] },
      ],
      recovery_patterns: ['workbench:send_failed'],
      next_session_hooks: {
        before_send: ['preferir validação comprovada: npm run atlas-ai:test'],
        after_send: ['registrar outcome real da sessão'],
        validate_with: ['npm run atlas-ai:test'],
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        bounded: true,
        provider_safe: true,
      },
    },
    workspaceLivingGraph: {
      schema_version: 'atlas.awis.workspace_living_graph_projection.v1',
      source: 'local_awis_living_graph_compiler',
      readiness_score: 76,
      nodes: [
        {
          key: 'component:atlas-desktop',
          kind: 'component',
          label: 'atlas-desktop',
          role: 'app desktop',
          confidence: 88,
          evidence: ['stack:Tauri'],
        },
        {
          key: 'command:npm-run-atlas-ai-test',
          kind: 'command',
          label: 'npm run atlas-ai:test',
          role: 'validação',
          confidence: 90,
          evidence: ['validou tarefa real'],
        },
      ],
      edges: [
        {
          from: 'component:atlas-desktop',
          to: 'command:npm-run-atlas-ai-test',
          reason: 'componente declara comando',
          strength: 78,
        },
      ],
      golden_path: ['component:atlas-desktop', 'command:npm run atlas-ai:test'],
      autopilot_hints: {
        before_send: ['reusar artifact replay antes de enviar'],
        after_send: ['registrar resultado da sessão'],
        on_startup: ['component:atlas-desktop'],
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        bounded: true,
        provider_safe: true,
      },
    },
    workspaceContextKernel: {
      schema_version: 'atlas.awis.workspace_context_kernel_projection.v1',
      source: 'local_awis_context_kernel_compiler',
      readiness_score: 82,
      budget: {
        mode: 'deep',
        max_context_items: 10,
        reason: 'múltiplas fontes vivas concordam sobre o próximo contexto',
      },
      priority_load: [
        { kind: 'session_gold', label: 'tarefa:bug_fix', reason: 'resultado real reutilizável', confidence: 86 },
        { kind: 'command', label: 'npm run atlas-ai:test', reason: 'comando comprovado', confidence: 92 },
      ],
      compression_plan: {
        send_full: ['tarefa:bug_fix'],
        summarize: ['component:atlas-desktop'],
        omit: ['conversa bruta completa sem pedido explícito'],
      },
      validation_plan: {
        commands: ['npm run atlas-ai:test'],
        confidence_floor: 78,
        requires_human_confirmation: false,
      },
      learning_contract: {
        capture_outcome: true,
        update_space_pack: true,
        promote_artifact_after_success: true,
        refresh_folder_map_on_drift: false,
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        bounded: true,
        provider_safe: true,
      },
    },
    workspaceSelfImprovement: {
      schema_version: 'atlas.awis.workspace_self_improvement_projection.v1',
      source: 'local_awis_self_improvement_compiler',
      readiness_score: 84,
      improvement_queue: [
        { action: 'promote_command', label: 'npm run atlas-ai:test', reason: 'comando validou sessão real', priority: 'high', evidence: ['3 sucessos'] },
      ],
      promotion_policy: {
        promote_when: ['comando validado com sucesso'],
        demote_when: ['envio falha ou é cancelado'],
        transfer_when: ['somente pistas abstratas provider-safe'],
      },
      next_review: {
        metrics: ['taxa de promoção de comandos'],
        validate_with: ['npm run atlas-ai:test'],
        human_confirmation_required: false,
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        external_side_effects_allowed: false,
        bounded: true,
        provider_safe: true,
      },
    },
    workspaceRetention: {
      schema_version: 'atlas.awis.workspace_retention_projection.v1',
      source: 'local_awis_retention_governor',
      readiness_score: 74,
      policy: {
        mode: 'balanced',
        reason: 'manter contexto quente com revalidação seletiva',
        max_hot_items: 7,
      },
      lifecycle: {
        keep_hot: ['ouro:tarefa:bug_fix'],
        promote: ['comando:npm run atlas-ai:test'],
        revalidate: ['workspace mudou desde leituras anteriores'],
        drop_or_summarize: ['conversa bruta completa'],
      },
      stale_signals: ['workspace mudou desde leituras anteriores'],
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        external_side_effects_allowed: false,
        bounded: true,
        provider_safe: true,
      },
    },
    workspaceStartupOrchestration: {
      schema_version: 'atlas.awis.workspace_startup_orchestration_projection.v1',
      source: 'local_awis_startup_orchestrator',
      readiness_score: 82,
      launch_mode: 'deep',
      startup_sequence: [
        { step: 'restore', label: 'ouro:tarefa:bug_fix', source: 'retention', required: true },
        { step: 'load', label: 'session_gold:tarefa:bug_fix', source: 'kernel', required: true },
      ],
      context_budget: {
        max_items: 10,
        prefer_summary: false,
        reason: 'partida governada por memória local e artefatos AWIS',
      },
      revalidation_gate: {
        required_before_send: ['workspace mudou desde leituras anteriores'],
        can_autoload: ['ouro:tarefa:bug_fix'],
        needs_human_confirmation: false,
      },
      learning_loop: {
        capture_outcome: true,
        update_memory: true,
        update_space_pack: true,
        preserve_artifact_after_success: true,
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        external_side_effects_allowed: false,
        bounded: true,
        provider_safe: true,
      },
    },
    workspacePreflight: {
      schema_version: 'atlas.awis.workspace_preflight_projection.v1',
      source: 'local_awis_preflight_compiler',
      readiness_score: 86,
      mode: 'ready',
      gates: [
        {
          gate: 'validation',
          status: 'ready',
          label: 'Validação pronta',
          required: true,
          evidence: ['npm run atlas-ai:test'],
        },
      ],
      execution_lanes: {
        before_send: ['carregar contexto ouro'],
        before_execution: ['npm run atlas-ai:test'],
        after_success: ['promover artifact'],
        after_failure: ['registrar falha'],
      },
      promotion_contract: {
        promote_when: ['validação passou'],
        demote_when: ['validação falhou'],
        preserve_as_artifact: true,
        update_space_pack: true,
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        external_side_effects_allowed: false,
        bounded: true,
        provider_safe: true,
      },
    },
    workspaceTwin: {
      schema_version: 'atlas.awis.workspace_twin_projection.v1',
      source: 'local_awis_workspace_twin_compiler',
      workspace_id: 'atlas',
      readiness_score: 88,
      stale: false,
      hashes: {
        genome_hash: 'twin-abc12345',
        code_map_hash: 'code-abc12345',
        command_registry_hash: 'cmd-abc12345',
        risk_map_hash: 'risk-abc12345',
      },
      genome: {
        stack: ['Tauri', 'React'],
        apps: ['atlas-desktop'],
        owner_docs: ['docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'],
        commands: ['npm run atlas-ai:test'],
        risk_zones: ['atlas-ai surface'],
        test_families: ['atlas-ai:test'],
      },
      live_map: {
        components: [
          { key: 'atlas-desktop', role: 'app desktop', maturity: 'stable', confidence: 88 },
        ],
        connections: ['atlas-desktop -> atlas-server'],
        fragile_areas: [],
      },
      context_autopilot: {
        load_first: ['atlas-ai surface'],
        summarize: ['docs grandes'],
        validate: ['npm run atlas-ai:test'],
        avoid: ['conversa bruta completa'],
        reason: 'mapa vivo escolhe contexto e validação antes de executar',
      },
      learning_loop: {
        learned_from_outcomes: ['bug_fix'],
        next_refresh: ['scan local após mudanças'],
        reuse_next_session: ['carregar atlas-ai surface primeiro'],
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        raw_message_content_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        external_side_effects_allowed: false,
        bounded: true,
        provider_safe: true,
      },
    },
  })

  assert.ok(intelligence.capabilities.includes('Artifact Lake local'))
  assert.ok(intelligence.capabilities.includes('replay de partida'))
  assert.ok(intelligence.capabilities.includes('continuidade viva'))
  assert.ok(intelligence.capabilities.includes('otimizando'))
  assert.ok(intelligence.capabilities.includes('ranking de confiança'))
  assert.ok(intelligence.capabilities.includes('ouro de sessão'))
  assert.ok(intelligence.capabilities.includes('grafo vivo'))
  assert.ok(intelligence.capabilities.includes('kernel de contexto'))
  assert.ok(intelligence.capabilities.includes('autoevolução'))
  assert.ok(intelligence.capabilities.includes('retenção viva'))
  assert.ok(intelligence.capabilities.includes('partida orquestrada'))
  assert.ok(intelligence.capabilities.includes('pré-checagem pronta'))
  assert.ok(intelligence.capabilities.includes('mapa vivo'))
  assert.ok(!intelligence.capabilities.some((capability) => /learning|optimize|maintain|observe/.test(capability)))
  assert.ok(intelligence.score >= 65)
})
