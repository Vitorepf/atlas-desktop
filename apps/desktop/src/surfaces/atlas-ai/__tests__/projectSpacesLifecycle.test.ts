import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
  recordLocalProjectSpaceOutcome,
  removeLocalProjectSpace,
  removeThreadFromLocalProjectSpace,
  resolvePointerFusionDropSnapshot,
  savedProjectSpaceKeyFromFusion,
  serializeLocalProjectSpaces,
  serializeLocalSavedProjectSpaceReceipts,
  shouldClearThreadDragOnGlobalRelease,
  summarizeLocalProjectSpaceBrainSignals,
  suggestedProjectSpaceThreadIds,
  touchLocalProjectSpacesFromThreads,
  type LocalProjectSpace,
  type LocalSavedProjectSpaceReceipt,
} from '../components/AtlasAiThreadList'
import type { AiThreadSummary, AtlasWorkspaceArtifactLakeEntry, AtlasWorkspaceConversationFusion } from '../types'

const threadListSource = readFileSync(new URL('../components/AtlasAiThreadList.tsx', import.meta.url), 'utf8')
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

test('AWIS Space drag/drop · global pointer cleanup waits for the active pointer drop handler', () => {
  assert.equal(shouldClearThreadDragOnGlobalRelease(true), false)
  assert.equal(shouldClearThreadDragOnGlobalRelease(false), true)
})

test('AWIS Space drag/drop · drag handle click is suppressed after pointer stage drop', () => {
  assert.match(
    threadListSource,
    /className="atlas-ai-thread-drag-handle"[\s\S]*onClick=\{\(event\) => \{[\s\S]*if \(suppressClick \|\| nativeDragClickSuppressRef\.current\)/,
    'The handle click must not select the dragged thread after pointer drop opens compare mode.',
  )
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

test('AWIS Space context pack · learned durable Space memory feeds next conversation gold', () => {
  const learnedSpace: LocalProjectSpace = {
    ...baseSpaces[0],
    outcomeCount: 3,
    successCount: 2,
    failureCount: 1,
    comparisonOpenCount: 2,
    lastOutcomeAt: updatedAt,
    lastOutcomeStatus: 'failed',
    artifactRefs: ['artifact-space-1'],
    learnedSignals: ['comparar:abertura explícita', 'pack:vivo'],
  }
  const pack = buildLocalProjectSpaceContextPack({
    title: learnedSpace.title,
    source: 'local_space',
    generatedAt: updatedAt,
    space: learnedSpace,
    threads: [
      thread({ id: 'thread-a', title: 'Comparar fluxo', message_count: 2 }),
      thread({ id: 'thread-b', title: 'Retomar fluxo', message_count: 2 }),
    ],
  })

  assert.equal(pack.artifact_count, 1)
  assert.ok(pack.brain_contract.artifact_refs.includes('artifact-space-1'))
  assert.ok(pack.brain_contract.carry_forward.includes('aprendizado:comparar:abertura explícita'))
  assert.ok(pack.brain_contract.carry_forward.includes('aprendizado:pack:vivo'))
  assert.ok(pack.brain_contract.validate_before_use.includes('revalidar falhas aprendidas antes de promover contexto'))
  assert.ok(pack.brain_contract.validate_before_use.includes('último outcome falhou; carregar como hipótese, não como verdade'))
  assert.ok(pack.brain_contract.automation_hooks.includes('recalibrar Space com outcomes acumulados'))
  assert.ok(pack.brain_contract.evidence.includes('3 outcome(s) aprendidos'))
  assert.ok(pack.brain_contract.evidence.includes('2 sucesso(s) validados'))
  assert.ok(pack.brain_contract.evidence.includes('1 falha(s) para revalidar'))
  assert.doesNotMatch(JSON.stringify(pack.brain_contract), /source_thread_ids|thread_id|operator_input|response_text|raw[_ ]conversation|full[_ ]message|\/Users\//)
})

test('AWIS Space brain contract reuses startup metadata from sessions', () => {
  const pack = buildLocalProjectSpaceContextPack({
    title: 'Partida AWIS',
    source: 'local_space',
    generatedAt: createdAt,
    threads: [
      thread({
        id: 'a',
        title: 'Partida viva com artifacts',
        message_count: 4,
        metadata: {
          atlas_mode: 'programming',
          awis_never_start_cold: true,
          awis_launch_mode: 'deep',
          awis_startup_context_mode: 'balanced',
          awis_startup_load_sequence: ['load:mapa vivo', 'load:Space brain'],
          awis_startup_revalidate_before_send: ['npm run atlas-ai:test'],
          awis_startup_human_boundary: ['confirmar risco antes de executar'],
          awis_startup_readiness: {
            startup: 96,
            context_kernel: 88,
            artifact_replay: 72,
            next_session_brain: 64,
          },
          awis_summary_gold: ['comando cargo build'],
          awis_folder_focus: {
            primary_component: 'atlas-desktop',
            load_scope: 'component',
            include: ['apps/desktop/src/surfaces/atlas-ai'],
            summarize: ['Space:Fluxo Atlas'],
            reason: 'carregar atlas-desktop primeiro',
          },
          awis_task_context_budget: {
            mode: 'lean',
            load_full: ['apps/desktop/src/surfaces/atlas-ai/useAtlasAi.ts'],
            summarize: ['component-pack:atlas-ai'],
            reason: 'carregar área foco atlas-desktop',
          },
          awis_evidence_gate: {
            trusted: ['component:atlas-ai'],
            verify_before_trust: ['validar:npm run atlas-ai:test'],
            missing_or_stale: ['artifact replay ausente'],
            human_boundary: ['confirmar risco antes de executar'],
            reason: 'contexto útil com evidência revalidável',
          },
          awis_working_set: {
            files: ['apps/desktop/src/surfaces/atlas-ai/useAtlasAi.ts'],
            docs: ['docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md'],
            commands: ['npm run atlas-ai:test'],
          },
          awis_impact_radius: {
            risk: 'medium',
            validation_cascade: ['npx tsc -b'],
            cross_workspace: ['atlas-server'],
            reason: 'impacto em envio Atlas AI',
          },
          awis_transfer_contract: {
            workspace_hints: ['atlas-server', '/Users/vitorepf/private/path'],
            reuse: ['transfer:contexto validado:component:atlas-server'],
            validate_before_use: ['confirmar validação transferida:php artisan test'],
            never_transfer: ['paths absolutos do Mac', 'operator_input cru'],
            reason: 'atlas-server acelera backend com revalidação local',
          },
          awis_next_session_contract: {
            first_load: ['full:atlas-ai'],
            validate_with: ['npx tsc -b'],
            promote_when: ['validação verde:npx tsc -b'],
            demote_when: ['stale:artifact replay ausente'],
            preserve_as_artifact: true,
          },
          awis_continue_learning: {
            update_space_pack: true,
            preserve_artifact_after_success: true,
          },
          awis_task_packet: {
            learning: {
              automation_plan: {
                safe_local: ['validar:npm run atlas-ai:test', '/Users/vitorepf/private/path'],
                confirm_first: ['confirmar:npm run dev'],
                observe_only: ['não-promover:contexto falho'],
              },
            },
          },
          awis_bootstrap_manifest: {
            bootstrap_hash: 'bootstrap-space-awis',
            launch_mode: 'deep',
            golden_boot_sequence: ['manifest:boot-context'],
            load_first: ['manifest:kernel vivo'],
            summarize_first: ['manifest:resumo Space'],
            validate_before_use: ['manifest:npm run atlas-ai:test'],
            never_load_raw: ['manifest:conversa bruta completa'],
            artifacts: ['artifact-manifest-1'],
            before_send: ['manifest:validar antes do envio'],
            after_success: ['manifest:promover Space'],
            after_failure: ['manifest:demover hipótese'],
            safe_maintenance: ['manifest:refresh pack'],
            update_spaces: true,
            preserve_artifact: true,
            promote_when: ['manifest:teste verde'],
            revalidate_when: ['manifest:falha repetida'],
            human_boundary: ['manifest:confirmar risco'],
            evidence_hashes: ['hash:manifest'],
            proven_by: ['workspaceBrainContract'],
            stale_or_guarded: ['manifest:scan antigo'],
          },
          awis_space_brain: [
            {
              title: 'Fluxo anterior',
              load: ['Space:Fluxo anterior'],
              carry: ['decisão preservada do Space anterior'],
              validate: ['revalidar pack anterior'],
              automation: ['atualizar pack herdado'],
              human: ['humano confirma boundary herdado'],
              artifacts: ['artifact-space-1'],
              evidence: ['Space anterior validado'],
            },
          ],
        },
      }),
      thread({
        id: 'b',
        title: 'Retomar contexto seguro',
        message_count: 2,
        metadata: {
          atlas_mode: 'research',
          awis_load_first: ['truth:workspace'],
          awis_validate_with: ['npx tsc -b'],
          awis_priority_load: ['Space Fluxo Atlas'],
        },
      }),
    ],
  })

  assert.ok(pack.brain_contract.load_first.some((item) => item === 'partida:load:mapa vivo'))
  assert.ok(pack.brain_contract.load_first.some((item) => item === 'partida:truth:workspace'))
  assert.ok(pack.brain_contract.load_first.some((item) => item === 'partida:manifest:boot-context'))
  assert.ok(pack.brain_contract.load_first.some((item) => item === 'partida:manifest:kernel vivo'))
  assert.ok(pack.brain_contract.load_first.some((item) => item === 'foco:atlas-desktop'))
  assert.ok(pack.brain_contract.load_first.some((item) => item === 'foco:apps/desktop/src/surfaces/atlas-ai'))
  assert.ok(pack.brain_contract.load_first.some((item) => item === 'foco:atlas-server'))
  assert.ok(pack.brain_contract.load_first.some((item) => item === 'foco:transfer:contexto validado:component:atlas-server'))
  assert.ok(pack.brain_contract.carry_forward.includes('modo partida:deep'))
  assert.ok(pack.brain_contract.carry_forward.includes('modo partida:balanced'))
  assert.ok(pack.brain_contract.carry_forward.includes('ouro:manifest:resumo Space'))
  assert.ok(pack.brain_contract.carry_forward.includes('workspace relacionado:atlas-server'))
  assert.ok(pack.brain_contract.carry_forward.includes('ouro:comando cargo build'))
  assert.ok(pack.brain_contract.carry_forward.includes('ouro:decisão preservada do Space anterior'))
  assert.ok(pack.brain_contract.carry_forward.includes('task-gold:component:atlas-ai'))
  assert.ok(pack.brain_contract.validate_before_use.includes('partida:npm run atlas-ai:test'))
  assert.ok(pack.brain_contract.validate_before_use.includes('partida:npx tsc -b'))
  assert.ok(pack.brain_contract.validate_before_use.includes('partida:manifest:npm run atlas-ai:test'))
  assert.ok(pack.brain_contract.validate_before_use.includes('partida:manifest:conversa bruta completa'))
  assert.ok(pack.brain_contract.validate_before_use.includes('partida:revalidar pack anterior'))
  assert.ok(pack.brain_contract.validate_before_use.includes('evidência:validar:npm run atlas-ai:test'))
  assert.ok(pack.brain_contract.validate_before_use.includes('evidência:artifact replay ausente'))
  assert.ok(pack.brain_contract.validate_before_use.includes('evidência:confirmar validação transferida:php artisan test'))
  assert.ok(pack.brain_contract.human_boundary.includes('partida:confirmar risco antes de executar'))
  assert.ok(pack.brain_contract.human_boundary.includes('partida:manifest:confirmar risco'))
  assert.ok(pack.brain_contract.human_boundary.includes('partida:humano confirma boundary herdado'))
  assert.ok(pack.brain_contract.human_boundary.includes('evidência:confirmar risco antes de executar'))
  assert.ok(pack.brain_contract.human_boundary.includes('task packet confirmar:confirmar:npm run dev'))
  assert.ok(pack.brain_contract.automation_hooks.includes('space-brain:atualizar pack herdado'))
  assert.ok(pack.brain_contract.automation_hooks.includes('manifesto:manifest:validar antes do envio'))
  assert.ok(pack.brain_contract.automation_hooks.includes('manifesto:manifest:promover Space'))
  assert.ok(pack.brain_contract.automation_hooks.includes('manifesto aprendizado:manifest:teste verde'))
  assert.ok(pack.brain_contract.automation_hooks.includes('task packet seguro:validar:npm run atlas-ai:test'))
  assert.ok(pack.brain_contract.automation_hooks.includes('atualizar Space pack pelo manifesto vivo'))
  assert.ok(pack.brain_contract.automation_hooks.includes('atualizar Space pack após outcome real'))
  assert.ok(pack.brain_contract.automation_hooks.includes('preservar artifact após sucesso validado'))
  assert.ok(pack.brain_contract.automation_hooks.includes('revalidar transferência entre workspaces antes de promover contexto'))
  assert.ok(pack.brain_contract.artifact_refs.includes('artifact-space-1'))
  assert.ok(pack.brain_contract.artifact_refs.includes('artifact-manifest-1'))
  assert.ok(pack.brain_contract.evidence.includes('partida viva:não começa zerado'))
  assert.ok(pack.brain_contract.evidence.includes('manifesto:workspaceBrainContract'))
  assert.ok(pack.brain_contract.evidence.includes('manifesto:hash:manifest'))
  assert.ok(pack.brain_contract.evidence.includes('task packet observar:não-promover:contexto falho'))
  assert.ok(pack.brain_contract.evidence.includes('space-brain:Space anterior validado'))
  assert.ok(pack.brain_contract.evidence.includes('task:lean'))
  assert.ok(pack.brain_contract.evidence.includes('task:component'))
  assert.ok(pack.brain_contract.evidence.includes('task:medium'))
  assert.ok(pack.brain_contract.evidence.includes('transfer:atlas-server'))
  assert.ok(pack.brain_contract.evidence.includes('readiness:startup:96%'))
  assert.ok(pack.brain_contract.evidence.includes('readiness:context_kernel:88%'))
  assert.doesNotMatch(JSON.stringify(pack.brain_contract), /\/Users\/|source_thread_ids|thread_id|operator_input|response_text|raw[_ ]conversation|full[_ ]message/)
})

test('AWIS Space brain contract promotes advanced projections from thread metadata', () => {
  const pack = buildLocalProjectSpaceContextPack({
    title: 'Space avançado',
    source: 'local_space',
    generatedAt: createdAt,
    threads: [
      thread({
        id: 'a',
        title: 'Implementar cérebro vivo',
        message_count: 4,
        metadata: {
          awis_provider_strategy: {
            preferred: [
              { provider: 'atlas-local', policy: 'coding', task_kinds: ['desktop'] },
            ],
            fallback_order: ['codex-high-reasoning'],
            caution_signals: ['trocar provider se backend 500'],
          },
          awis_execution_doctrine: {
            required_before_execution: ['ler owner docs'],
            human_responsibility: ['aprovar produção'],
            automation: ['rodar testes após patch'],
            trusted_commands: ['npm run atlas-ai:test'],
            revalidate_commands: ['npx tsc -b'],
            avoid_commands: ['deploy sem evidência'],
          },
          awis_memory_freshness: {
            hot: ['contrato AWIS atual'],
            revalidate: ['docs de governança'],
            missing: ['artifact visual recente'],
          },
          awis_confidence: {
            prefer: ['evidência local'],
            require_confirmation_for: ['área sensível'],
            avoid_until_revalidated: ['memória antiga'],
          },
        },
      }),
      thread({
        id: 'b',
        title: 'Retomar sem nascer zerado',
        message_count: 3,
        metadata: {
          awis_learning_flywheel: {
            next_safe_automations: ['atualizar pack após sucesso'],
            requires_evidence: ['teste verde'],
            load_first: ['último pack validado'],
            validate_with: ['git diff --check'],
            update_after_send: ['registrar outcome'],
          },
          awis_launch_contract: {
            first_load: ['Space brain'],
            validate_before_trust: ['revalidar freshness'],
            avoid_loading: ['conversa raw'],
            before_send: ['checar contexto'],
            after_success: ['promover aprendizado'],
            after_failure: ['demotar hipótese'],
          },
          awis_topology: {
            test_commands: ['npm run atlas-ai:test'],
            build_commands: ['npx tsc -b'],
            check_commands: ['git diff --check'],
            load_first_docs: ['docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md'],
            validation_entrypoints: ['apps/desktop/src/surfaces/atlas-ai'],
            sensitive_zones: ['execução local'],
          },
        },
      }),
    ],
  })

  assert.ok(pack.brain_contract.load_first.includes('aprendizado:último pack validado'))
  assert.ok(pack.brain_contract.load_first.includes('partida viva:Space brain'))
  assert.ok(pack.brain_contract.load_first.includes('topologia:docs/engineering-knowledge-base/atlas-ai-knowledge-governance-system.md'))
  assert.ok(pack.brain_contract.carry_forward.includes('provider preferido:atlas-local'))
  assert.ok(pack.brain_contract.carry_forward.includes('fallback provider:codex-high-reasoning'))
  assert.ok(pack.brain_contract.carry_forward.includes('comando confiável:npm run atlas-ai:test'))
  assert.ok(pack.brain_contract.carry_forward.includes('preferir:evidência local'))
  assert.ok(pack.brain_contract.validate_before_use.includes('provider:trocar provider se backend 500'))
  assert.ok(pack.brain_contract.validate_before_use.includes('doutrina:ler owner docs'))
  assert.ok(pack.brain_contract.validate_before_use.includes('revalidar comando:npx tsc -b'))
  assert.ok(pack.brain_contract.validate_before_use.includes('memória:docs de governança'))
  assert.ok(pack.brain_contract.validate_before_use.includes('aprendizado:git diff --check'))
  assert.ok(pack.brain_contract.validate_before_use.includes('partida viva:revalidar freshness'))
  assert.ok(pack.brain_contract.validate_before_use.includes('não carregar:conversa raw'))
  assert.ok(pack.brain_contract.validate_before_use.includes('topologia:npm run atlas-ai:test'))
  assert.ok(pack.brain_contract.automation_hooks.includes('doutrina:rodar testes após patch'))
  assert.ok(pack.brain_contract.automation_hooks.includes('aprendizado:registrar outcome'))
  assert.ok(pack.brain_contract.automation_hooks.includes('partida viva:promover aprendizado'))
  assert.ok(pack.brain_contract.human_boundary.includes('doutrina:aprovar produção'))
  assert.ok(pack.brain_contract.human_boundary.includes('confirmar:área sensível'))
  assert.ok(pack.brain_contract.human_boundary.includes('zona sensível:execução local'))
  assert.ok(pack.brain_contract.evidence.includes('provider:atlas-local'))
  assert.ok(pack.brain_contract.evidence.includes('memória quente:contrato AWIS atual'))
  assert.ok(pack.brain_contract.evidence.includes('confiança:evidência local'))
  assert.doesNotMatch(JSON.stringify(pack.brain_contract), /\/Users\/|source_thread_ids|thread_id|operator_input|response_text|raw[_ ]conversation|full[_ ]message/)
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

test('AWIS Space storage · learned outcome memory survives restart without raw content', () => {
  const serialized = serializeLocalProjectSpaces([
    {
      ...baseSpaces[0],
      lastOutcomeAt: updatedAt,
      lastOutcomeStatus: 'succeeded',
      outcomeCount: 3,
      successCount: 2,
      failureCount: 1,
      comparisonOpenCount: 4,
      artifactRefs: ['artifact-space-1', '/Users/vitorepf/private/raw'],
      learnedSignals: ['comparar:abertura explícita', 'operator_input cru'],
    },
  ])
  const parsed = parseLocalProjectSpaces(serialized, createdAt)

  assert.equal(parsed[0].lastOutcomeAt, updatedAt)
  assert.equal(parsed[0].lastOutcomeStatus, 'succeeded')
  assert.equal(parsed[0].outcomeCount, 3)
  assert.equal(parsed[0].successCount, 2)
  assert.equal(parsed[0].failureCount, 1)
  assert.equal(parsed[0].comparisonOpenCount, 4)
  assert.deepEqual(parsed[0].artifactRefs, ['artifact-space-1'])
  assert.deepEqual(parsed[0].learnedSignals, ['comparar:abertura explícita'])
  assert.doesNotMatch(JSON.stringify(parsed), /\/Users\/|operator_input/)
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

test('AWIS Space storage · durable memory keeps more than the visible startup set', () => {
  const manySpaces: LocalProjectSpace[] = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1
    return {
      id: `thread-${number}-a|thread-${number}-b`,
      projectKey: 'atlas',
      title: `Space ${number}`,
      threadIds: [`thread-${number}-a`, `thread-${number}-b`],
      manualTitle: false,
      source: 'drag',
      createdAt,
      updatedAt: `2026-05-21T10:${String(index).padStart(2, '0')}:00.000Z`,
    }
  })

  const parsed = parseLocalProjectSpaces(serializeLocalProjectSpaces(manySpaces), createdAt)
  const merged = mergeLocalProjectSpaces(parsed)

  assert.equal(parsed.length, 12)
  assert.equal(merged.length, 12)
  assert.equal(merged.some((space) => space.title === 'Space 12'), true)
  assert.equal(merged.some((space) => space.title === 'Space 1'), true)
})

test('AWIS Space storage · creating a new Space does not evict durable existing Spaces too early', () => {
  const existing: LocalProjectSpace[] = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1
    return {
      id: `thread-${number}-a|thread-${number}-b`,
      projectKey: 'atlas',
      title: `Space ${number}`,
      threadIds: [`thread-${number}-a`, `thread-${number}-b`],
      manualTitle: true,
      source: 'drag',
      createdAt,
      updatedAt: createdAt,
    }
  })

  const next = createOrUpdateLocalProjectSpace(
    existing,
    ['thread-new-a', 'thread-new-b'],
    'atlas',
    () => 'Space novo',
    'drag',
    updatedAt,
  )

  assert.equal(next.length, 13)
  assert.equal(next[0].title, 'Space novo')
  assert.equal(next.some((space) => space.title === 'Space 1'), true)
  assert.equal(next.some((space) => space.title === 'Space 12'), true)
})

test('AWIS Space learning · records outcomes into durable Space brain metadata', () => {
  const next = recordLocalProjectSpaceOutcome(baseSpaces, {
    projectKey: 'atlas',
    spaceId: baseSpaces[0].id,
    threadIds: ['thread-a'],
    status: 'succeeded',
    comparisonOpened: true,
    artifactRefs: ['artifact-space-1', '/Users/vitorepf/private/raw'],
    learnedSignals: ['pack:vivo', 'response_text cru'],
    timestamp: updatedAt,
  })

  assert.equal(next[0].lastOutcomeAt, updatedAt)
  assert.equal(next[0].lastOutcomeStatus, 'succeeded')
  assert.equal(next[0].outcomeCount, 1)
  assert.equal(next[0].successCount, 1)
  assert.equal(next[0].failureCount, undefined)
  assert.equal(next[0].comparisonOpenCount, 1)
  assert.deepEqual(next[0].artifactRefs, ['artifact-space-1'])
  assert.deepEqual(next[0].learnedSignals, ['pack:vivo'])
  assert.doesNotMatch(JSON.stringify(next[0]), /\/Users\/|response_text/)
})

test('AWIS Space learning · ThreadList consumes real outcome events from Surface', () => {
  assert.match(
    threadListSource,
    /projectSpaceOutcomeEvent\?: LocalProjectSpaceOutcomeEvent \| null/,
    'ThreadList must accept outcome events emitted by the Surface after terminal traces.',
  )
  assert.match(
    threadListSource,
    /useEffect\(\(\) => \{[\s\S]*if \(!projectSpaceOutcomeEvent\) return[\s\S]*recordLocalProjectSpaceOutcome\(prev, \{[\s\S]*projectKey: projectSpaceOutcomeEvent\.projectKey[\s\S]*threadIds: projectSpaceOutcomeEvent\.threadIds \?\? null[\s\S]*learnedSignals: projectSpaceOutcomeEvent\.learnedSignals \?\? null[\s\S]*timestamp: projectSpaceOutcomeEvent\.occurredAt \?\? nowIso\(\)/,
    'A terminal outcome must update persisted Space memory, not only workspace memory.',
  )
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

test('AWIS Space context pack · fallback startup memory sanitizes learned refs before sessions load', () => {
  const pack = buildLocalProjectSpaceFallbackContextPack({
    space: {
      ...baseSpaces[0],
      artifactRefs: ['artifact-space-1', '/Users/vitorepf/private/raw'],
      learnedSignals: ['pack:vivo', 'response_text cru'],
      outcomeCount: 2,
      successCount: 1,
    },
    generatedAt: updatedAt,
  })

  assert.ok(pack)
  assert.deepEqual(pack.learned_memory?.artifact_refs, ['artifact-space-1'])
  assert.deepEqual(pack.learned_memory?.signals, ['pack:vivo'])
  assert.deepEqual(pack.brain_contract.artifact_refs, ['artifact-space-1'])
  assert.ok(pack.brain_contract.carry_forward.some((item) => item === 'aprendizado:pack:vivo'))
  assert.ok(pack.brain_contract.carry_forward.some((item) => item === 'artifact:artifact-space-1'))
  assert.doesNotMatch(JSON.stringify(pack), /\/Users\/|response_text|operator_input|raw_conversation_returned":true/)
})

test('AWIS Space context pack · markdown is operator-readable and provider-safe', () => {
  const pack = buildLocalProjectSpaceContextPack({
    title: 'Fluxo Atlas AI',
    source: 'suggested_space',
    generatedAt: createdAt,
    threads: [
      thread({
        id: 'a',
        title: 'Diagnosticar AWIS',
        message_count: 3,
        metadata: {
          awis_folder_focus: {
            primary_component: 'atlas-desktop',
            include: ['apps/desktop/src/surfaces/atlas-ai'],
          },
          awis_evidence_gate: {
            trusted: ['component:atlas-ai', 'raw conversation'],
            verify_before_trust: ['validar:npm run atlas-ai:test'],
            human_boundary: ['confirmar risco antes de executar'],
          },
          awis_next_session_contract: {
            promote_when: ['validação verde:npx tsc -b'],
          },
        },
      }),
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
  assert.match(markdown, /## Cérebro do Space/)
  assert.match(markdown, /### Carregar primeiro[\s\S]*foco:atlas-desktop/)
  assert.match(markdown, /### Manter como contexto[\s\S]*task-gold:component:atlas-ai/)
  assert.match(markdown, /### Validar antes de confiar[\s\S]*evidência:validar:npm run atlas-ai:test/)
  assert.match(markdown, /### Limites humanos[\s\S]*evidência:confirmar risco antes de executar/)
  assert.match(markdown, /### Aprendizado automático[\s\S]*atualizar pack quando sessão do Space mudar/)
  assert.match(markdown, /### Evidência[\s\S]*2 sessões protegidas/)
  assert.match(markdown, /Diagnosticar AWIS · Geral · 3 mensagens/)
  assert.match(markdown, /não contém mensagens completas/)
  assert.doesNotMatch(markdown, /schema|gerado_em|conversa_bruta|source_thread_ids|thread-a|thread-b|raw[_ ]conversation|full[_ ]message|· a\b|· b\b/)
  assert.doesNotMatch(markdown, /content:/)
})
