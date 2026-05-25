import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addThreadToLocalProjectSpace,
  buildLocalProjectSpaceContextPack,
  buildLocalProjectSpaceFallbackContextPack,
  createOrUpdateLocalProjectSpace,
  evaluateLocalProjectSpaceBrain,
  evaluateLocalProjectSpaceIntelligence,
  localProjectSpaceContextPackMarkdown,
  mergeLocalProjectSpaces,
  mergeLocalSavedProjectSpaceReceipts,
  parseLocalProjectSpaces,
  parseLocalSavedProjectSpaceReceipts,
  pruneLocalProjectSpacesForAvailableThreads,
  removeLocalProjectSpace,
  removeThreadFromLocalProjectSpace,
  resolvePointerFusionDropSnapshot,
  savedProjectSpaceKeyFromFusion,
  serializeLocalProjectSpaces,
  serializeLocalSavedProjectSpaceReceipts,
  summarizeLocalProjectSpaceBrainSignals,
  suggestedProjectSpaceThreadIds,
  touchLocalProjectSpacesFromThreads,
  type LocalProjectSpace,
  type LocalSavedProjectSpaceReceipt,
} from '../components/AtlasAiThreadList'
import type { AiThreadSummary, AtlasWorkspaceArtifactLakeEntry, AtlasWorkspaceConversationFusion } from '../types'

const createdAt = '2026-05-20T10:00:00.000Z'
const updatedAt = '2026-05-21T10:00:00.000Z'

const baseSpaces: LocalProjectSpace[] = [
  {
    id: 'thread-a|thread-b|thread-c',
    projectKey: 'atlas',
    title: 'Fluxo Atlas AI',
    threadIds: ['thread-a', 'thread-b', 'thread-c'],
    manualTitle: false,
    source: 'drag',
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'thread-d|thread-e',
    projectKey: 'atlas',
    title: 'Space Manual',
    threadIds: ['thread-d', 'thread-e'],
    manualTitle: true,
    source: 'suggested',
    createdAt,
    updatedAt: createdAt,
  },
]

function thread(partial: Partial<AiThreadSummary> & { id: string }): AiThreadSummary {
  return {
    id: partial.id,
    title: partial.title ?? partial.id,
    summary: partial.summary ?? null,
    status: partial.status ?? 'active',
    surface: partial.surface ?? 'atlas-ai',
    workspace: partial.workspace ?? 'atlas',
    source_type: partial.source_type ?? null,
    source_id: partial.source_id ?? null,
    last_trace_id: partial.last_trace_id ?? null,
    last_provider: partial.last_provider ?? null,
    message_count: partial.message_count ?? 1,
    last_message_at: partial.last_message_at ?? null,
    metadata: partial.metadata ?? null,
    created_at: partial.created_at ?? null,
    updated_at: partial.updated_at ?? null,
  }
}

test('AWIS Space lifecycle · drag conversation over conversation creates a local Space', () => {
  const next = createOrUpdateLocalProjectSpace(
    [],
    ['thread-b', 'thread-a', 'thread-a'],
    'atlas',
    (threadIds) => `Space ${threadIds.join('+')}`,
    'drag',
    createdAt,
  )

  assert.deepEqual(next, [
    {
      id: 'thread-a|thread-b',
      projectKey: 'atlas',
      title: 'Space thread-b+thread-a',
      threadIds: ['thread-b', 'thread-a'],
      manualTitle: false,
      source: 'drag',
      createdAt,
      updatedAt: createdAt,
    },
  ])
})

test('AWIS Space lifecycle · drag conversation over related conversation updates the existing Space', () => {
  const next = createOrUpdateLocalProjectSpace(
    baseSpaces,
    ['thread-c', 'thread-f'],
    'atlas',
    (threadIds) => `Atualizado ${threadIds.join(',')}`,
    'drag',
    updatedAt,
  )

  assert.equal(next.length, 2)
  assert.deepEqual(next[0], {
    id: 'thread-a|thread-b|thread-c|thread-f',
    projectKey: 'atlas',
    title: 'Atualizado thread-a,thread-b,thread-c,thread-f',
    threadIds: ['thread-a', 'thread-b', 'thread-c', 'thread-f'],
    manualTitle: false,
    source: 'drag',
    createdAt,
    updatedAt,
  })
  assert.equal(next[1], baseSpaces[1])
})

test('AWIS Space lifecycle · drag conversation into Space adds it without replacing manual name', () => {
  const next = addThreadToLocalProjectSpace(
    baseSpaces,
    'thread-d|thread-e',
    'thread-f',
    () => 'should not replace manual title',
    updatedAt,
  )

  assert.equal(next.length, 2)
  assert.deepEqual(next[1], {
    id: 'thread-d|thread-e|thread-f',
    projectKey: 'atlas',
    title: 'Space Manual',
    threadIds: ['thread-d', 'thread-e', 'thread-f'],
    manualTitle: true,
    source: 'suggested',
    createdAt,
    updatedAt,
  })
})

test('AWIS Space lifecycle · dragging an existing Space session into the same Space is a no-op', () => {
  const next = addThreadToLocalProjectSpace(
    baseSpaces,
    'thread-d|thread-e',
    'thread-d',
    () => 'unused',
  )

  assert.deepEqual(next, baseSpaces)
})

test('AWIS Space lifecycle · removing one session keeps a valid Space with regenerated id/title', () => {
  const next = removeThreadFromLocalProjectSpace(
    baseSpaces,
    'thread-a|thread-b|thread-c',
    'thread-b',
    (threadIds) => `Restantes ${threadIds.join(',')}`,
    updatedAt,
  )

  assert.equal(next.length, 2)
  assert.deepEqual(next[0], {
    id: 'thread-a|thread-c',
    projectKey: 'atlas',
    title: 'Restantes thread-a,thread-c',
    threadIds: ['thread-a', 'thread-c'],
    manualTitle: false,
    source: 'drag',
    createdAt,
    updatedAt,
  })
  assert.equal(next[1], baseSpaces[1])
})

test('AWIS Space lifecycle · removing a session from a two-session Space deletes the Space', () => {
  const next = removeThreadFromLocalProjectSpace(
    baseSpaces,
    'thread-d|thread-e',
    'thread-d',
    () => 'unused',
  )

  assert.equal(next.length, 1)
  assert.equal(next[0].id, 'thread-a|thread-b|thread-c')
  assert.equal(next.some((space) => space.id === 'thread-d|thread-e'), false)
})

test('AWIS Space lifecycle · manual Space title survives session removal while still valid', () => {
  const next = removeThreadFromLocalProjectSpace(
    [
      {
        id: 'thread-a|thread-b|thread-c',
        projectKey: 'atlas',
        title: 'Nome editado',
        threadIds: ['thread-a', 'thread-b', 'thread-c'],
        manualTitle: true,
        source: 'drag',
        createdAt,
        updatedAt: createdAt,
      },
    ],
    'thread-a|thread-b|thread-c',
    'thread-c',
    () => 'should not replace manual title',
    updatedAt,
  )

  assert.equal(next.length, 1)
  assert.equal(next[0].id, 'thread-a|thread-b')
  assert.equal(next[0].title, 'Nome editado')
  assert.deepEqual(next[0].threadIds, ['thread-a', 'thread-b'])
  assert.equal(next[0].updatedAt, updatedAt)
})

test('AWIS Space persistence · startup with unloaded threads must not dismantle saved Spaces', () => {
  const next = pruneLocalProjectSpacesForAvailableThreads(
    baseSpaces,
    new Set(),
    (threadIds) => `Space ${threadIds.join('+')}`,
    updatedAt,
  )

  assert.deepEqual(next, baseSpaces)
})

test('AWIS Space persistence · after threads load, missing sessions are preserved because the list can be partial', () => {
  const next = pruneLocalProjectSpacesForAvailableThreads(
    baseSpaces,
    new Set(['thread-a', 'thread-b', 'thread-d', 'thread-e']),
    (threadIds) => `Space ${threadIds.join('+')}`,
    updatedAt,
  )

  assert.deepEqual(next, baseSpaces)
})

test('AWIS Space persistence · after threads load, a saved Space is not deleted just because one session is not in the current page', () => {
  const next = pruneLocalProjectSpacesForAvailableThreads(
    baseSpaces,
    new Set(['thread-a', 'thread-d', 'thread-e']),
    (threadIds) => `Space ${threadIds.join('+')}`,
    updatedAt,
  )

  assert.deepEqual(next, baseSpaces)
})

test('AWIS Space persistence · saved Space freshness follows activity from sessions inside it', () => {
  const next = touchLocalProjectSpacesFromThreads(baseSpaces, [
    thread({
      id: 'thread-b',
      title: 'Sessão ativa',
      updated_at: '2026-05-23T15:30:00.000Z',
    }),
    thread({
      id: 'thread-x',
      title: 'Fora do Space',
      updated_at: '2026-05-25T15:30:00.000Z',
    }),
  ])

  assert.equal(next[0].updatedAt, '2026-05-23T15:30:00.000Z')
  assert.equal(next[1].updatedAt, createdAt)
  assert.equal(next[0].title, 'Fluxo Atlas AI')
  assert.deepEqual(next[0].threadIds, ['thread-a', 'thread-b', 'thread-c'])
})

test('AWIS Space lifecycle · desfazer Space removes the entire group only', () => {
  const next = removeLocalProjectSpace(baseSpaces, 'thread-a|thread-b|thread-c')

  assert.deepEqual(next, [baseSpaces[1]])
})

test('AWIS Space drag/drop · pointer-up uses last valid conversation target when WebView loses final coordinates', () => {
  const target = resolvePointerFusionDropSnapshot({
    current: {
      threadId: null,
      projectKey: null,
      persistBackend: false,
      spaceId: null,
      stage: false,
    },
    last: {
      threadId: 'thread-b',
      projectKey: 'atlas',
      persistBackend: true,
      spaceId: null,
      stage: false,
    },
    fallbackProjectKey: 'chats',
  })

  assert.deepEqual(target, {
    threadId: 'thread-b',
    projectKey: 'atlas',
    persistBackend: true,
    spaceId: null,
    stage: false,
  })
})

test('AWIS Space drag/drop · current target wins over stale pointer snapshot', () => {
  const target = resolvePointerFusionDropSnapshot({
    current: {
      threadId: 'thread-c',
      projectKey: 'atlas',
      persistBackend: false,
      spaceId: null,
      stage: false,
    },
    last: {
      threadId: 'thread-b',
      projectKey: 'legacy',
      persistBackend: true,
      spaceId: null,
      stage: false,
    },
    fallbackProjectKey: 'chats',
  })

  assert.deepEqual(target, {
    threadId: 'thread-c',
    projectKey: 'atlas',
    persistBackend: false,
    spaceId: null,
    stage: false,
  })
})

test('AWIS Space drag/drop · stale backend persistence is not inherited by a known current target', () => {
  const target = resolvePointerFusionDropSnapshot({
    current: {
      threadId: 'thread-outside',
      projectKey: 'chats',
      persistBackend: false,
      spaceId: null,
      stage: false,
    },
    last: {
      threadId: 'thread-active-project',
      projectKey: 'atlas',
      persistBackend: true,
      spaceId: null,
      stage: false,
    },
    fallbackProjectKey: 'atlas',
  })

  assert.deepEqual(target, {
    threadId: 'thread-outside',
    projectKey: 'chats',
    persistBackend: false,
    spaceId: null,
    stage: false,
  })
})

test('AWIS Space drag/drop · lost pointer-up still opens the stage from the last valid stage target', () => {
  const target = resolvePointerFusionDropSnapshot({
    current: {
      threadId: null,
      projectKey: null,
      persistBackend: false,
      spaceId: null,
      stage: false,
    },
    last: {
      threadId: null,
      projectKey: null,
      persistBackend: false,
      spaceId: null,
      stage: true,
    },
    fallbackProjectKey: 'atlas',
  })

  assert.deepEqual(target, {
    threadId: null,
    projectKey: 'atlas',
    persistBackend: false,
    spaceId: null,
    stage: true,
  })
})

test('AWIS Space drag/drop · current stage target wins over stale conversation target', () => {
  const target = resolvePointerFusionDropSnapshot({
    current: {
      threadId: null,
      projectKey: null,
      persistBackend: false,
      spaceId: null,
      stage: true,
    },
    last: {
      threadId: 'thread-b',
      projectKey: 'atlas',
      persistBackend: true,
      spaceId: null,
      stage: false,
    },
    fallbackProjectKey: 'atlas',
  })

  assert.deepEqual(target, {
    threadId: null,
    projectKey: 'atlas',
    persistBackend: false,
    spaceId: null,
    stage: true,
  })
})

test('AWIS Space drag/drop · current Space target wins over stale conversation target', () => {
  const target = resolvePointerFusionDropSnapshot({
    current: {
      threadId: null,
      projectKey: null,
      persistBackend: false,
      spaceId: 'space-a',
      stage: false,
    },
    last: {
      threadId: 'thread-b',
      projectKey: 'atlas',
      persistBackend: true,
      spaceId: null,
      stage: false,
    },
    fallbackProjectKey: 'atlas',
  })

  assert.deepEqual(target, {
    threadId: null,
    projectKey: 'atlas',
    persistBackend: false,
    spaceId: 'space-a',
    stage: false,
  })
})

test('AWIS Space intelligence · three useful sessions become strong context', () => {
  const intelligence = evaluateLocalProjectSpaceIntelligence([
    thread({ id: 'a', message_count: 3, metadata: { atlas_mode: 'programming' }, updated_at: '2026-05-20T10:00:00Z' }),
    thread({ id: 'b', message_count: 2, metadata: { atlas_mode: 'research' }, updated_at: '2026-05-21T10:00:00Z' }),
    thread({ id: 'c', message_count: 4, metadata: { atlas_mode: 'programming' }, updated_at: '2026-05-19T10:00:00Z' }),
  ])

  assert.equal(intelligence.level, 'forte')
  assert.equal(intelligence.label, 'Contexto forte')
  assert.equal(intelligence.messageCount, 9)
  assert.equal(intelligence.modeCount, 2)
  assert.equal(intelligence.lastActiveAt, '2026-05-21T10:00:00Z')
  assert.equal(intelligence.nextAction, 'pronto para comparar')
})

test('AWIS Space intelligence · thin spaces explain that context is still light', () => {
  const intelligence = evaluateLocalProjectSpaceIntelligence([
    thread({ id: 'a', message_count: 0 }),
    thread({ id: 'b', message_count: 1 }),
  ])

  assert.equal(intelligence.level, 'leve')
  assert.equal(intelligence.label, 'Contexto leve')
  assert.equal(intelligence.nextAction, 'adicione mais uma sessão')
})

test('AWIS Space brain · turns a Space into safe reusable context, not just grouping', () => {
  const brain = evaluateLocalProjectSpaceBrain([
    thread({
      id: 'a',
      title: 'Decisão aprovada para Forge',
      message_count: 3,
      metadata: { atlas_mode: 'programming', decision_count: 2, artifact_refs: ['pack-a'] },
    }),
    thread({
      id: 'b',
      title: 'Pendência de risco no rollback',
      message_count: 2,
      metadata: { atlas_mode: 'research', blocker_count: 1, risk_count: 1 },
    }),
  ])

  assert.equal(brain.schema_version, 'atlas.desktop_ai.space_brain.v1')
  assert.equal(brain.state, 'vivo')
  assert.equal(brain.contextPackReady, true)
  assert.equal(brain.providerSafe, true)
  assert.equal(brain.decisionCount, 3)
  assert.equal(brain.pendingCount, 2)
  assert.equal(brain.riskCount, 2)
  assert.equal(brain.artifactCount, 1)
  assert.deepEqual(brain.reusableBy, ['Atlas AI', 'Code', 'Forge', 'packs'])
  assert.deepEqual(brain.recommendedActions, ['gerar pack seguro', 'trabalhar lado a lado', 'revisar pendências'])
})

test('AWIS Space brain contract carries reusable operational context without raw sessions', () => {
  const pack = buildLocalProjectSpaceContextPack({
    title: 'Cérebro vivo AWIS',
    source: 'local_space',
    generatedAt: createdAt,
    threads: [
      thread({
        id: 'a',
        title: 'Decisão aprovada para preservar artifact',
        message_count: 4,
        metadata: { atlas_mode: 'programming', decision_count: 1, artifact_refs: ['artifact-pack-a'] },
      }),
      thread({
        id: 'b',
        title: 'Pendência de risco no Workbench',
        message_count: 3,
        metadata: { atlas_mode: 'research', blocker_count: 1, risk_count: 1 },
      }),
    ],
  })

  assert.equal(pack.brain_contract.state, 'vivo')
  assert.ok(pack.brain_contract.load_first.includes('Space:Cérebro vivo AWIS'))
  assert.ok(pack.brain_contract.carry_forward.includes('artifact:artifact-pack-a'))
  assert.ok(pack.brain_contract.validate_before_use.includes('revalidar riscos do Space'))
  assert.ok(pack.brain_contract.automation_hooks.includes('reusar artifact do Space como contexto inicial'))
  assert.ok(pack.brain_contract.human_boundary.includes('humano confirma mudança em área de risco'))
  assert.deepEqual(pack.brain_contract.artifact_refs, ['artifact-pack-a'])
  assert.doesNotMatch(JSON.stringify(pack.brain_contract), /source_thread_ids|thread_id|operator_input|response_text|full_message/)
})

test('AWIS Space brain signals explain reusable memory without opening raw sessions', () => {
  const signals = summarizeLocalProjectSpaceBrainSignals([
    thread({
      id: 'a',
      title: 'Decisão aprovada para preservar artifact',
      message_count: 4,
      metadata: { atlas_mode: 'programming', decision_count: 1, artifact_refs: ['artifact-pack-a'] },
    }),
    thread({
      id: 'b',
      title: 'Pendência de risco no Workbench',
      message_count: 3,
      metadata: { atlas_mode: 'research', blocker_count: 1, risk_count: 1 },
    }),
  ], { saved: true, source: 'local_space' })

  assert.ok(signals.some((signal) => signal.label === 'cérebro vivo'))
  assert.ok(signals.some((signal) => signal.label === 'reutilizável' && signal.detail.includes('packs')))
  assert.ok(signals.some((signal) => signal.label === 'memória salva' && signal.detail === 'não começa zerado'))
  assert.ok(signals.some((signal) => signal.label === 'revalidar' && signal.detail.includes('risco')))
  assert.doesNotMatch(JSON.stringify(signals), /source_thread_ids|thread_id|operator_input|response_text|full_message|artifact-pack-a/)
})

test('AWIS Space storage · v2 envelope round-trips source and lifecycle metadata', () => {
  const serialized = serializeLocalProjectSpaces(baseSpaces)
  const parsed = parseLocalProjectSpaces(serialized, '2026-01-01T00:00:00.000Z')

  assert.deepEqual(parsed, baseSpaces)
  assert.match(serialized, /atlas\.desktop_ai\.project_spaces\.v2/)
})

test('AWIS Space storage · legacy array migrates into a lifecycle-aware local contract', () => {
  const parsed = parseLocalProjectSpaces(JSON.stringify([
    {
      id: 'thread-b|thread-a',
      projectKey: 'atlas',
      title: 'Legado',
      threadIds: ['thread-b', 'thread-a', 'thread-a'],
    },
  ]), createdAt)

  assert.deepEqual(parsed, [
    {
      id: 'thread-a|thread-b',
      projectKey: 'atlas',
      title: 'Legado',
      threadIds: ['thread-b', 'thread-a'],
      manualTitle: false,
      source: 'local',
      createdAt,
      updatedAt: createdAt,
    },
  ])
})

test('AWIS Space storage · legacy project key and title are normalized on read', () => {
  const parsed = parseLocalProjectSpaces(JSON.stringify([
    {
      id: 'thread-b|thread-a',
      projectKey: ' Atlas ',
      title: '  Fluxo   Atlas   AI  ',
      threadIds: ['thread-b', 'thread-a', 'thread-b'],
      manualTitle: true,
    },
  ]), createdAt)

  assert.equal(parsed.length, 1)
  assert.equal(parsed[0].projectKey, 'atlas')
  assert.equal(parsed[0].title, 'Fluxo Atlas AI')
  assert.equal(parsed[0].id, 'thread-a|thread-b')
  assert.deepEqual(parsed[0].threadIds, ['thread-b', 'thread-a'])
})

test('AWIS Space storage · redundant storage merge keeps newest durable Space copy', () => {
  const staleSpaces: LocalProjectSpace[] = [
    {
      ...baseSpaces[0],
      title: 'Nome antigo',
      updatedAt: createdAt,
    },
  ]
  const durableSpaces: LocalProjectSpace[] = [
    {
      ...baseSpaces[0],
      title: 'Nome durável',
      manualTitle: true,
      updatedAt,
    },
    baseSpaces[1],
  ]
  const merged = mergeLocalProjectSpaces(staleSpaces, durableSpaces)

  assert.equal(merged.length, 2)
  assert.equal(merged[0].title, 'Nome durável')
  assert.equal(merged[0].manualTitle, true)
  assert.equal(merged.some((space) => space.id === baseSpaces[1].id), true)
})

test('AWIS Space saved receipts · persist provider-safe saved Space state across app restarts', () => {
  const receipts: LocalSavedProjectSpaceReceipt[] = [
    {
      projectKey: 'atlas',
      spaceKey: 'hash:fusion-pack-123',
      artifactId: 'artifact-1',
      artifactHash: 'artifact-hash-1',
      savedAt: createdAt,
    },
  ]
  const serialized = serializeLocalSavedProjectSpaceReceipts(receipts)
  const parsed = parseLocalSavedProjectSpaceReceipts(serialized, updatedAt)

  assert.deepEqual(parsed, receipts)
  assert.match(serialized, /atlas\.desktop_ai\.saved_space_receipts\.v1/)
})

test('AWIS Space saved receipts · redundant merge keeps the newest saved artifact receipt', () => {
  const stale: LocalSavedProjectSpaceReceipt = {
    projectKey: 'atlas',
    spaceKey: 'hash:fusion-pack-123',
    artifactId: 'artifact-old',
    artifactHash: 'hash-old',
    savedAt: createdAt,
  }
  const fresh: LocalSavedProjectSpaceReceipt = {
    ...stale,
    artifactId: 'artifact-new',
    artifactHash: 'hash-new',
    savedAt: updatedAt,
  }
  const merged = mergeLocalSavedProjectSpaceReceipts([stale], [fresh])

  assert.deepEqual(merged, [fresh])
})

test('AWIS Space saved receipts · derive stable key without raw conversation content', () => {
  const byHash = savedProjectSpaceKeyFromFusion({
    fusion_pack: {
      fusion_pack_hash: 'pack-hash-1',
      source_thread_ids: ['thread-b', 'thread-a'],
    },
  } as AtlasWorkspaceConversationFusion)
  const byThreads = savedProjectSpaceKeyFromFusion({
    fusion_pack: {
      source_thread_ids: ['thread-b', 'thread-a', 'thread-b'],
    },
  } as AtlasWorkspaceConversationFusion)

  assert.equal(byHash, 'hash:pack-hash-1')
  assert.equal(byThreads, 'threads:thread-a|thread-b')
})

test('AWIS Space sidebar · suggested saved Space sessions are grouped once', () => {
  const ids = suggestedProjectSpaceThreadIds(
    {
      fusion_pack: {
        source_thread_ids: ['thread-b', 'thread-a', 'thread-b'],
      },
    } as AtlasWorkspaceConversationFusion,
    {
      status: 'ready',
      artifact: {
        body: {
          fusion_pack: {
            source_thread_ids: ['thread-c', 'thread-a'],
          },
        },
      },
    } as AtlasWorkspaceArtifactLakeEntry,
  )

  assert.deepEqual(ids, ['thread-b', 'thread-a', 'thread-c'])
})

test('AWIS Space context pack · exports safe reusable context without raw conversation', () => {
  const pack = buildLocalProjectSpaceContextPack({
    title: 'Fluxo Atlas AI',
    source: 'local_space',
    generatedAt: createdAt,
    threads: [
      thread({
        id: 'a',
        title: 'Diagnosticar AWIS',
        message_count: 3,
        last_provider: 'atlas',
        metadata: { atlas_mode: 'programming' },
        updated_at: '2026-05-21T10:00:00Z',
      }),
      thread({
        id: 'b',
        title: 'Pesquisar contexto',
        message_count: 2,
        metadata: { atlas_mode: 'research' },
      }),
    ],
  })

  assert.equal(pack.schema_version, 'atlas.desktop_ai.space_context_pack.v1')
  assert.equal(pack.raw_conversation_returned, false)
  assert.equal(pack.full_message_content_returned, false)
  assert.equal(pack.decision_count, 0)
  assert.equal(pack.pending_count, 0)
  assert.equal(pack.risk_count, 0)
  assert.equal(pack.scope_label, '2 sessões · 2 modos')
  assert.deepEqual(pack.reusable_by, ['Atlas AI', 'Code', 'packs'])
  assert.deepEqual(pack.source_thread_ids, ['a', 'b'])
  assert.equal(pack.sessions[0].mode, 'programming')
  assert.equal(pack.sessions[1].mode, 'research')
})

test('AWIS Space context pack · saved Space still exports a minimal startup pack before threads load', () => {
  const pack = buildLocalProjectSpaceFallbackContextPack({
    space: baseSpaces[0],
    generatedAt: updatedAt,
  })

  assert.ok(pack)
  assert.equal(pack.schema_version, 'atlas.desktop_ai.space_context_pack.v1')
  assert.equal(pack.title, 'Fluxo Atlas AI')
  assert.equal(pack.thread_count, 3)
  assert.equal(pack.message_count, 0)
  assert.equal(pack.raw_conversation_returned, false)
  assert.equal(pack.full_message_content_returned, false)
  assert.deepEqual(pack.reusable_by, ['Atlas AI', 'packs'])
  assert.ok(pack.recommended_use.includes('recarregar sessões quando disponíveis'))
  assert.deepEqual(pack.sessions.map((session) => session.title), [
    'Sessão salva 1',
    'Sessão salva 2',
    'Sessão salva 3',
  ])
  assert.doesNotMatch(JSON.stringify(pack), /operator_input|response_text|raw_conversation_returned":true/)
})

test('AWIS Space context pack · markdown is operator-readable and provider-safe', () => {
  const pack = buildLocalProjectSpaceContextPack({
    title: 'Fluxo Atlas AI',
    source: 'suggested_space',
    generatedAt: createdAt,
    threads: [
      thread({ id: 'a', title: 'Diagnosticar AWIS', message_count: 3 }),
      thread({ id: 'b', title: 'Pesquisar contexto', message_count: 2 }),
    ],
  })
  const markdown = localProjectSpaceContextPackMarkdown(pack)

  assert.match(markdown, /# Space · Fluxo Atlas AI/)
  assert.match(markdown, /Origem: Space sugerido/)
  assert.match(markdown, /Resumo: 2 sessões · 5 mensagens · 1 modo/)
  assert.match(markdown, /Cérebro: 0 decisões · 0 pendências · 0 riscos/)
  assert.match(markdown, /Reutilizável por: Atlas AI, packs/)
  assert.match(markdown, /Conteúdo completo: não incluído por segurança\./)
  assert.match(markdown, /Diagnosticar AWIS · Geral · 3 mensagens/)
  assert.match(markdown, /não contém mensagens completas/)
  assert.doesNotMatch(markdown, /schema|gerado_em|conversa_bruta|source_thread_ids|thread-a|thread-b|· a\b|· b\b/)
  assert.doesNotMatch(markdown, /content:/)
})
