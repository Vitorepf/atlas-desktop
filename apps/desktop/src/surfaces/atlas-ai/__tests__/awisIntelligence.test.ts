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
  assert.equal(intelligence.liveSignal.label, 'loop vivo')
  assert.equal(intelligence.liveSignal.tone, 'ok')
  assert.deepEqual(intelligence.gaps, [])
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
