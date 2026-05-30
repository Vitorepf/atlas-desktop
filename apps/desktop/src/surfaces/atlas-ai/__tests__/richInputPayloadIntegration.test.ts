/**
 * Atlas AI · Desktop · integração rich input × Hyperflow payload.
 *
 * Garante que o composer emite e o envio carrega o canon
 * `atlas.rich_input.payload.v1` (schema_version + source_manifest + hashes),
 * sem perder paridade com os campos legados aceitos por StoreAiInteractionRequest.
 *
 * Pipeline coberto:
 *   AtlasUnifiedComposer.uploadAllCanonical() → AtlasRichInputPayload
 *     → AtlasAiComposer repassa em SendExtras.richInputCanonical
 *     → AtlasAiSurface.handleSend repassa em atlas.send options.richInputPayload
 *     → useAtlasAi.send envia `rich_input_payload` no body do POST /ai/interactions
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ATLAS_AI_APP_SURFACE,
  ATLAS_AI_SURFACE_ID,
  buildInteractionPayload,
} from '../contract.ts'
import { isAutoAutoCleanPayload } from '../hyperflowRuntime.ts'
import {
  ATLAS_RICH_INPUT_PAYLOAD_SCHEMA,
  type AtlasRichInputPayload,
} from '../../../lib/rich-input/index.ts'
import type { AtlasAiInteractionRequest } from '../types.ts'

function simulateEnrichment(
  basePayload: Record<string, unknown>,
  options: {
    textBlocks?: Array<{ file_name: string; mime_type: string; content: string }>
    urlAttachments?: Array<{ url: string; kind: string }>
  },
): Record<string, unknown> {
  const enriched: Record<string, unknown> = { ...basePayload }
  if (options.textBlocks?.length) enriched.attachments_text = options.textBlocks
  if (options.urlAttachments?.length) enriched.attachments_url = options.urlAttachments
  return enriched
}

function fakeCanonicalPayload(opts: {
  imageIds?: string[]
  documentIds?: string[]
  textBlocks?: AtlasRichInputPayload['text_blocks']
  urlAttachments?: AtlasRichInputPayload['url_attachments']
  manifest?: AtlasRichInputPayload['source_manifest']
}): AtlasRichInputPayload {
  return {
    schema_version: ATLAS_RICH_INPUT_PAYLOAD_SCHEMA,
    uploaded_image_ids: opts.imageIds ?? [],
    uploaded_document_ids: opts.documentIds ?? [],
    text_blocks: opts.textBlocks ?? [],
    url_attachments: opts.urlAttachments ?? [],
    source_manifest: opts.manifest ?? [],
  }
}

function simulateRequestBody(
  enrichedPayload: Record<string, unknown>,
  options: {
    uploadedImageIds?: string[]
    uploadedDocumentIds?: string[]
    richInputPayload?: AtlasRichInputPayload
  },
): AtlasAiInteractionRequest {
  // Mirror exato do que `useAtlasAi.send()` monta antes de chamar
  // `createAiInteraction`. Mantém a mesma ordem condicional dos spreads.
  return {
    input_text: 'fixture',
    kind: 'interaction',
    source_type: 'app',
    include_semantic_context: true,
    context_note_limit: 5,
    payload: enrichedPayload,
    ...(options.uploadedImageIds?.length
      ? { uploaded_images: options.uploadedImageIds }
      : {}),
    ...(options.uploadedDocumentIds?.length
      ? { uploaded_documents: options.uploadedDocumentIds }
      : {}),
    ...(options.richInputPayload
      ? { rich_input_payload: options.richInputPayload }
      : {}),
  }
}

test('auto/auto + anexos texto/URL mantém invariante de limpeza', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  const enriched = simulateEnrichment(payload, {
    textBlocks: [{ file_name: 'note.md', mime_type: 'text/markdown', content: '# Hi' }],
    urlAttachments: [{ url: 'https://example.com', kind: 'generic' }],
  })

  assert.equal(isAutoAutoCleanPayload(enriched), true)
  assert.equal(enriched.atlas_mode, 'auto')
  assert.equal(enriched.routing_domain, 'auto')
})

test('AWIS workspace context pack entra como conversation_context sem virar runtime técnico', () => {
  const awisCapsule = {
    schema_version: 'atlas.awis.workspace_provider_capsule.v1',
    startup_contract: {
      never_start_cold: true,
      launch_mode: 'deep',
      context_mode: 'balanced',
      prefer_summary: true,
      bootstrap_manifest_hash: 'bootstrap-awis-123',
      load_sequence: ['load:session-gold', '/Users/vitorepf/private/path'],
      revalidate_before_send: ['validate:npm run atlas-ai:test'],
      human_boundary: ['confirmar risco antes de executar'],
      readiness: {
        startup: 94,
        context_kernel: 88,
        artifact_replay: 71,
        next_session_brain: 96,
      },
    },
    load_first: ['session-gold:Space forte', '/Users/vitorepf/private/path'],
    use_as_summary: ['resultado confirmado'],
    validate_with: ['npm run atlas-ai:test'],
    avoid_loading: ['raw_conversation'],
    golden_context: {
      top_load: [{ label: 'session-gold:Space forte', score: 94, reason: 'memória validada por resultado anterior' }],
      summary_gold: [{ label: 'resultado confirmado', score: 86, reason: 'resumo seguro para carregar sem inflar contexto' }],
      validation_gold: [{ label: 'npm run atlas-ai:test', score: 96, reason: 'validação executável conhecida' }],
      avoid_or_confirm: [{ label: 'raw_conversation', score: 90, reason: 'proteção para evitar contexto bruto ou perigoso' }],
      selection_reason: 'rank ouro provider-safe',
      provider_safe: true,
    },
    command_lanes: {
      auto_validate: ['npm run atlas-ai:test'],
      confirm_before_run: ['npm run dev'],
      manual_only: ['deploy produção'],
      preferred_validation: ['npm run atlas-ai:test'],
      reason: 'capsule preserva pistas operacionais',
    },
    bootstrap_plan: {
      manifest_hash: 'bootstrap-awis-123',
      launch_mode: 'deep',
      load_first: ['bootstrap:context-kernel', '/Users/vitorepf/private/path'],
      summarize_first: ['bootstrap:resumo seguro'],
      validate_before_use: ['bootstrap:npm run atlas-ai:test'],
      never_load_raw: ['conversa bruta completa', '/Users/vitorepf/private/path'],
      automation_hooks: ['before:revalidar contexto'],
      learning_hooks: ['promote:teste verde'],
      evidence: ['hash:sha256:bootstrap'],
      reason: 'manifesto vivo sem path bruto',
    },
    task_packet: {
      schema_version: 'atlas.awis.workspace_task_packet_projection.v1',
      source: 'local_awis_task_packet_compiler',
      packet_hash: 'task-awis-123',
      task_kind: 'bug_fix',
      confidence: 91,
      objective: {
        label: 'corrigir bug com contexto quente',
        suggested_surface: 'atlas_desktop',
        workspace_key: 'atlas',
        context_mode: 'balanced',
      },
      context: {
        load_first: ['component:atlas-ai', '/Users/vitorepf/private/path'],
        use_as_summary: ['erro reproduzido no Workbench'],
        working_set: {
          files: ['atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx'],
          docs: ['docs/engineering-knowledge-base/atlas-workspace-evolution-fabric.md'],
          commands: ['npm run atlas-ai:test'],
          reason: 'Surface e testes cobrem a tarefa',
        },
        spaces: ['AWIS cérebro vivo'],
        space_brain: [
          {
            title: 'AWIS cérebro vivo',
            state: 'strong',
            load_first: ['Space:AWIS cérebro vivo', '/Users/vitorepf/private/path'],
            carry_forward: ['decisão preservada'],
            validate_before_use: ['npm run atlas-ai:test'],
            artifact_refs: ['artifact-awis-123'],
            evidence: ['4 sessões protegidas'],
          },
        ],
        artifacts: ['artifact-awis-123'],
        related_workspaces: ['atlas-server'],
        bootstrap_plan: {
          manifest_hash: 'bootstrap-awis-123',
          load_first: ['bootstrap:context-kernel', '/Users/vitorepf/private/path'],
          validate_before_use: ['bootstrap:npm run atlas-ai:test'],
        },
      },
      execution: {
        preflight_gates: ['git diff --check'],
        validation_commands: ['npm run atlas-ai:test', 'npx tsc -b'],
        command_lanes: {
          auto_validate: ['npm run atlas-ai:test'],
          confirm_before_run: ['npm run dev'],
          manual_only: ['deploy produção'],
          preferred_validation: ['npm run atlas-ai:test'],
          reason: 'tarefas locais seguras antes de execução manual',
        },
        recovery: ['revalidar com tsc'],
      },
      risk: {
        cautions: ['não mexer no mobile'],
        human_boundary: ['confirmar execução destrutiva'],
        avoid_loading: ['contexto completo sem resumo', '/Users/vitorepf/private/path'],
      },
      learning: {
        record: ['resultado da tarefa'],
        promote_after_success: ['promover patch validado'],
        revalidate_after_failure: ['revalidar contexto falho'],
        archive_as_artifact: ['task_packet', 'startup_snapshot'],
        automation_plan: {
          safe_local: ['validar:npm run atlas-ai:test', '/Users/vitorepf/private/path'],
          confirm_first: ['confirmar:npm run dev', 'manual:deploy produção'],
          observe_only: ['não-promover:contexto falho', 'cautela:não mexer no mobile'],
          reason: 'separa automação local segura de confirmação humana',
        },
      },
      safety: {
        raw_user_message_included: false,
        raw_conversation_included: false,
        raw_source_included: false,
        absolute_paths_included: false,
        internal_ids_included: false,
        bounded: true,
        provider_safe: true,
      },
    },
    continue_learning: {
      record_outcome: true,
      update_memory: true,
      update_space_pack: true,
      preserve_artifact_after_success: true,
      maintenance_recent: ['promote_command:succeeded:npm run atlas-ai:test:x2', '/Users/vitorepf/private/path'],
      next_session_contract: {
        first_load: ['artifact-seed:workspace'],
        validate_with: ['npx tsc -b'],
        promote_when: ['teste verde'],
        demote_when: ['falha repetida'],
      },
      task_feedback_loop: {
        record: ['resultado da rota'],
        promote: ['promover comando validado'],
        revalidate: ['revalidar falha'],
        update_spaces: ['atualizar Space pack'],
        update_artifacts: ['preservar artifact'],
        update_components: ['componente:atlas-ai'],
        update_relations: ['relação:desktop-server'],
        update_mesh: ['mesh:atlas'],
        reason: 'loop fechado após resposta',
      },
      recovery_playbook: {
        demote_context: ['não promover contexto falho'],
        safe_resume: ['retomar com último artifact'],
        revalidate_with: ['npm run atlas-ai:test'],
      },
    },
    continuity_handoff: {
      restore_priority: ['Space AWIS primeiro'],
      hot_context: ['contexto quente'],
      first_load: ['handoff:artifact'],
      validate_with: ['handoff:npx tsc -b'],
      artifacts: ['artifact-awis-123'],
      handoff_units: ['unidade:surface'],
      human_boundary: ['confirmar antes de executar'],
    },
  }
  const awisPack = {
    schema_version: 'atlas.awis.workspace_context_pack.v1',
    source: 'atlas_desktop_awis',
    workspace: { key: 'atlas', name: 'Atlas', root_path_known: true },
    folder_map: {
      status: 'ready',
      files_seen: 6000,
      dirs_seen: 900,
      truncated: true,
      signals: ['Laravel', 'Tauri'],
      languages: ['TypeScript'],
      important_files: [{ path: 'package.json', kind: 'manifesto' }],
      commands: [{ command: 'npm run test', kind: 'test', source: 'package.json' }],
    },
    memory: {
      scan_count: 2,
      stable_signals: ['Laravel'],
      stable_languages: ['TypeScript'],
      stable_commands: ['npm run test'],
      latest_drift: null,
      observations: ['workspace grande: scan limitado para desempenho'],
    },
    bootstrap_manifest: {
      schema_version: 'atlas.awis.workspace_bootstrap_manifest_projection.v1',
      bootstrap_hash: 'bootstrap-awis-123',
      launch_mode: 'deep',
      readiness_score: 92,
      golden_boot_sequence: ['manifest:carregar kernel', '/Users/vitorepf/private/path'],
      context_gold: {
        load_first: ['manifest:Space AWIS', '/Users/vitorepf/private/path'],
        summarize_first: ['manifest:resumo vivo'],
        validate_before_use: ['manifest:npm run atlas-ai:test'],
        never_load_raw: ['manifest:conversa bruta completa', '/Users/vitorepf/private/path'],
      },
      workspace_scope: {
        repositories: ['atlas-desktop', '/Users/vitorepf/private/path'],
        components: ['atlas-ai'],
        spaces: ['AWIS cérebro vivo'],
        artifacts: ['artifact-awis-123'],
      },
      automation_plan: {
        before_send: ['manifest:revalidar contexto'],
        after_success: ['manifest:promover ouro'],
        after_failure: ['manifest:demover ruído'],
        safe_maintenance: ['manifest:refresh folder map'],
      },
      learning_contract: {
        capture_outcome: true,
        update_memory: true,
        update_spaces: true,
        preserve_artifact: true,
        promote_when: ['manifest:teste verde'],
        revalidate_when: ['manifest:falha repetida'],
      },
      human_boundary: ['manifest:confirmar risco'],
      evidence: {
        hashes: ['hash:sha256:manifest'],
        proven_by: ['workspaceBrainContract'],
        stale_or_guarded: ['manifest:scan antigo'],
      },
    },
    spaces: {
      schema_version: 'atlas.awis.workspace_space_projection.v1',
      strongest_spaces: [
        {
          title: 'AWIS cérebro vivo',
          session_count: 4,
          source: 'local_space',
          learned_memory: {
            outcome_count: 4,
            success_count: 3,
            failure_count: 1,
            comparison_open_count: 2,
            last_outcome_status: 'succeeded',
            signals: ['comparar:abertura explícita', 'pack:vivo', '/Users/vitorepf/private/path'],
            artifact_refs: ['artifact-awis-123', 'operator_input cru'],
          },
        },
      ],
    },
    artifact_replay: {
      schema_version: 'atlas.awis.workspace_artifact_replay_projection.v1',
      latest_artifact_hash: 'artifact-awis-123',
      cold_start_seed: {
        load_order: ['artifact:startup snapshot'],
        validate_with: ['artifact:revalidar snapshot'],
        command_lanes: {
          auto_validate: ['npm run atlas-ai:test'],
          confirm_before_run: ['npm run dev'],
          manual_only: ['deploy produção'],
          preferred_validation: ['npm run atlas-ai:test'],
          reason: 'fixture',
        },
        warnings: ['artifact antigo:revalidar'],
      },
      reusable_startup_gold: {
        strongest_spaces: ['AWIS cérebro vivo'],
        reusable_patterns: ['não nascer frio', 'usar Space pack'],
      },
    },
    memory_consolidation: {
      schema_version: 'atlas.awis.workspace_memory_consolidation_projection.v1',
      replay_contract: {
        load_first: ['artifact:startup snapshot', '/Users/vitorepf/private/path'],
        use_as_summary: ['ouro:decisão confirmada'],
        validate_before_trust: ['replay:npm run atlas-ai:test'],
        archive_after_success: ['snapshot AWIS após sucesso validado'],
        reason: 'replay quente provider-safe para próxima sessão',
      },
    },
    workspace_runbook: {
      schema_version: 'atlas.awis.workspace_runbook_projection.v1',
      readiness_score: 93,
      runbook_hash: 'runbook-awis-123',
      procedures: [
        {
          title: 'Partida quente do workspace',
          trigger: 'nova conversa no Atlas',
          load_first: ['runbook:context kernel', '/Users/vitorepf/private/path'],
          steps: ['carregar ouro', 'resumir Space ativo'],
          validate_with: ['npm run atlas-ai:test'],
          avoid: ['conversa bruta completa'],
          success_evidence: ['teste verde'],
          confidence: 91,
        },
      ],
      failure_response: {
        known_failure_signatures: ['kernel status 500'],
        safe_retry: ['revalidar serviço local'],
        preserve_as_artifact: ['failure capsule'],
        demote_or_revalidate: ['contexto stale'],
      },
      next_session: {
        start_here: ['Partida quente do workspace'],
        automate_when_safe: ['salvar outcome'],
        human_owns: ['execução destrutiva'],
      },
    },
    context_kernel: {
      schema_version: 'atlas.awis.workspace_context_kernel_projection.v1',
      priority_load: [
        { label: 'kernel:Space AWIS' },
        { label: '/Users/vitorepf/private/path' },
      ],
      budget: {
        mode: 'balanced',
        load_full: ['apps/desktop/src/surfaces/atlas-ai/contract.ts'],
        summarize: ['conversa bruta completa'],
        omit: ['raw_conversation'],
      },
    },
    preflight: {
      schema_version: 'atlas.awis.workspace_preflight_projection.v1',
      mode: 'ready',
      gates: [
        { id: 'tests', status: 'warn', reason: 'rodar atlas-ai:test' },
        { id: 'private', status: 'blocked', reason: '/Users/vitorepf/private/path' },
      ],
    },
    workspace_twin: {
      schema_version: 'atlas.awis.workspace_twin_projection.v1',
      status: 'ready',
      hashes: {
        genome_hash: 'sha256:genome',
        code_map_hash: 'sha256:code-map',
        risk_map_hash: 'sha256:risk',
        command_registry_hash: 'sha256:commands',
      },
    },
    retention: {
      schema_version: 'atlas.awis.workspace_retention_projection.v1',
      lifecycle: {
        keep_hot: ['Space AWIS'],
        promote: ['npm run atlas-ai:test'],
        revalidate: ['scan antigo'],
        drop_or_summarize: ['conversa bruta completa'],
      },
    },
    startup_orchestration: {
      schema_version: 'atlas.awis.workspace_startup_orchestration_projection.v1',
      launch_mode: 'deep',
      readiness_score: 91,
      startup_sequence: [
        { step: 'load', label: 'carregar Space AWIS', source: 'space' },
        { step: 'private', label: '/Users/vitorepf/private/path', source: 'unsafe' },
      ],
    },
    automation: {
      schema_version: 'atlas.awis.workspace_automation_projection.v1',
      automation_score: 82,
      mode: 'optimize',
      maintenance_queue: [
        {
          action: 'record_outcome',
          label: 'registrar resultado real da sessão',
          reason: 'fecha o loop de aprendizado',
          priority: 'high',
          requires_human_confirmation: false,
        },
        {
          action: 'review_risk',
          label: '/Users/vitorepf/private/path',
          reason: 'path absoluto deve ser filtrado',
          priority: 'medium',
          requires_human_confirmation: true,
        },
      ],
      autopilot_context: {
        before_send: ['revalidar contexto quente'],
        after_send: ['registrar outcome provider-safe'],
        on_startup: ['refresh folder map se stale'],
      },
      feedback_loop: {
        metrics_to_watch: ['sucesso por rota'],
        promote_when: ['2 sucessos consecutivos'],
        demote_when: ['falha repetida'],
      },
    },
    self_improvement: {
      schema_version: 'atlas.awis.workspace_self_improvement_projection.v1',
      readiness_score: 79,
      improvement_queue: [
        {
          action: 'update_space_pack',
          label: 'atualizar Space pack após sucesso',
          reason: 'Space precisa carregar ouro na próxima sessão',
          priority: 'high',
          evidence: ['projectSpacesLifecycle'],
        },
      ],
      promotion_policy: {
        promote_when: ['teste verde e outcome sucedido'],
        demote_when: ['contexto falhou duas vezes'],
        transfer_when: ['mesma stack validada'],
      },
      next_review: {
        metrics: ['taxa de reuso do Space'],
        validate_with: ['npm run atlas-ai:test'],
        human_confirmation_required: true,
      },
    },
    adaptive_learning_plan: {
      schema_version: 'atlas.awis.workspace_adaptive_learning_plan_projection.v1',
      readiness_score: 85,
      mode: 'compound',
      autonomous_cycle: {
        on_startup: ['carregar artifact replay'],
        before_send: ['aplicar current truth pack'],
        after_success: ['promover contexto validado'],
        after_failure: ['demover contexto ruidoso'],
        on_drift: ['revalidar folder map'],
      },
      context_economy: {
        promote_to_hot: ['Space AWIS cérebro vivo'],
        summarize_only: ['histórico longo'],
        retire_or_revalidate: ['scan antigo'],
        artifact_candidates: ['handoff AWIS'],
      },
      repository_compounding: {
        local_focus: ['atlas-desktop'],
        cross_repo_bridges: ['atlas-desktop -> atlas-server'],
        transfer_rules: ['transferir abstração, nunca path bruto'],
      },
      human_control: {
        requires_confirmation: ['execução local'],
        human_owned: ['risco de produção'],
        never_automate: ['deploy produção'],
      },
      proof: {
        evidence_refs: ['workspaceBrainContract'],
        validate_with: ['npx tsc -b'],
        outcome_metrics: ['aprendizado promovido'],
      },
    },
    component_memory: {
      schema_version: 'atlas.awis.workspace_component_memory_projection.v1',
      strongest_components: [
        {
          key: 'atlas-ai',
          role: 'surface desktop',
          maturity: 'stable',
          confidence: 91,
          load_first: ['AtlasAiSurface.tsx'],
          commands: ['npm run atlas-ai:test'],
          docs: ['docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'],
          cautions: ['revalidar layout antes de promover'],
        },
      ],
    },
    semantic_index: {
      schema_version: 'atlas.awis.workspace_semantic_index_projection.v1',
      readiness_score: 87,
      query_aliases: [
        {
          alias: 'comparar conversas',
          intent: 'workbench',
          component_keys: ['atlas-ai'],
          task_kinds: ['analysis'],
          load: ['Space pack'],
          validate: ['workbenchSelection'],
          confidence: 88,
        },
      ],
      retrieval_policy: {
        load_full_when: ['mudança em surface'],
        summarize_when: ['histórico longo'],
        revalidate_when: ['layout mudou'],
        never_load_raw: ['raw_conversation'],
      },
    },
    task_router: {
      schema_version: 'atlas.awis.workspace_task_router_projection.v1',
      route_count: 1,
      routes: [
        {
          task_kind: 'analysis',
          route_key: 'analysis:atlas-ai',
          policy: 'prefer',
          suggested_surface: 'side_by_side',
          load_first: ['índice semântico'],
          use_spaces: ['AWIS cérebro vivo'],
          use_components: ['atlas-ai'],
          use_artifacts: ['artifact-awis-123'],
          validate_with: ['npm run atlas-ai:test'],
          avoid_loading: ['raw_conversation'],
          confidence: 89,
        },
      ],
    },
    impact_map: {
      schema_version: 'atlas.awis.workspace_impact_map_projection.v1',
      readiness_score: 84,
      component_impacts: [
        {
          component_key: 'atlas-ai',
          affected_components: ['composer'],
          validation_cascade: ['npm run atlas-ai:test', 'npx tsc -b'],
          risk: 'medium',
          reason: 'surface central',
          confidence: 83,
        },
      ],
    },
    living_graph: {
      schema_version: 'atlas.awis.workspace_living_graph_projection.v1',
      readiness_score: 92,
      golden_path: ['Space -> Workbench -> Artifact'],
      nodes: [
        {
          kind: 'component',
          label: 'Atlas AI surface',
          role: 'coordena AWIS',
          confidence: 90,
          evidence: ['atlas-ai:test'],
        },
      ],
    },
    workspace_mesh: {
      schema_version: 'atlas.awis.workspace_mesh_projection.v1',
      readiness_score: 86,
      mesh_hash: 'mesh:atlas',
      next_conversation: {
        load_order: ['mesh:atlas-server'],
        reuse_rules: ['reusar só abstrações'],
        validate_with: ['php artisan test'],
        human_boundary: ['não transferir paths'],
      },
    },
    current_truth_pack: {
      schema_version: 'atlas.awis.current_truth_pack_projection.v1',
      readiness_score: 93,
      truth_hash: 'truth:atlas',
      current_truth: {
        must_keep: ['Space organiza, Workbench compara'],
        active_components: ['atlas-ai'],
        active_spaces: ['AWIS cérebro vivo'],
        active_artifacts: ['artifact-awis-123'],
        proven_commands: ['npm run atlas-ai:test'],
      },
      proof: {
        evidence_refs: ['workspaceBrainContract'],
        validate_with: ['npx tsc -b'],
      },
      trust_contract: {
        trust_first: ['contrato AWIS'],
        verify_before_send: ['git diff --check'],
        evidence_mode: 'ready',
      },
    },
    next_session_brain: {
      schema_version: 'atlas.awis.workspace_next_session_brain_projection.v1',
      brain_hash: 'sha256:brain-truth',
      context_loading: {
        truth_hints: {
          trust_first: ['contrato AWIS'],
          verify_before_send: ['git diff --check'],
          never_load_raw: ['conteúdo bruto de conversas'],
          refresh_when: ['workspace mudou'],
          current_truth: ['Space organiza, Workbench compara'],
          evidence_mode: 'guarded',
        },
      },
    },
    repository_constellation: {
      schema_version: 'atlas.awis.repository_constellation_projection.v1',
      readiness_score: 88,
      constellation_hash: 'repo:atlas',
      repositories: [
        {
          key: 'atlas-desktop',
          role: 'desktop surface',
          stack: ['Tauri', 'React'],
          maturity: 'stable',
          commands: ['npm run atlas-ai:test'],
          connected_to: ['atlas-server'],
          validate_with: ['npx tsc -b'],
          confidence: 90,
        },
      ],
      next_conversation: {
        load_first: ['repo:atlas-desktop'],
        validate_with: ['npm run atlas-ai:test'],
        human_boundary: ['confirmar impacto cross-repo'],
      },
    },
    provider_strategy: {
      schema_version: 'atlas.awis.workspace_provider_strategy_projection.v1',
      provider_count: 2,
      preferred: [
        {
          provider: 'atlas_decide',
          model: null,
          policy: 'prefer',
          success_count: 5,
          failure_count: 1,
          success_rate: 83,
          avg_latency_ms: 1200,
          task_kinds: ['analysis'],
          reason: 'melhor histórico para roteamento AWIS',
        },
      ],
      task_preferences: [
        {
          task_kind: 'analysis',
          preferred_provider: 'atlas_decide',
          fallback_order: ['codex_cli'],
          avoid: ['claude_cli'],
          confidence: 84,
          reason: 'Atlas Decide preserva roteamento',
        },
      ],
      fallback_order: ['atlas_decide', 'codex_cli'],
      caution_signals: ['revalidar provider após falha'],
    },
    execution_doctrine: {
      schema_version: 'atlas.awis.workspace_execution_doctrine_projection.v1',
      maturity: 'stable',
      doctrine_drivers: [
        {
          name: 'EvidenceDD',
          applies_to: ['analysis'],
          required: true,
          gate: 'provar antes de promover',
          reason: 'AWIS não promove memória sem evidência',
        },
      ],
      preflight: {
        required_before_execution: ['git diff --check'],
        human_responsibility: ['aprovar execução local'],
        automation: ['registrar outcome'],
      },
      command_policy: {
        trusted: ['npm run atlas-ai:test'],
        revalidate: ['npx tsc -b'],
        avoid: ['deploy produção'],
      },
      learning_contract: {
        promote_after_success: ['promover contexto validado'],
        demote_after_failure: ['demover contexto falho'],
      },
    },
    memory_freshness: {
      schema_version: 'atlas.awis.workspace_memory_freshness_projection.v1',
      freshness_score: 76,
      state: 'warm',
      scan_age_days: 1,
      interaction_age_days: 0,
      evidence: {
        hot: ['Space AWIS'],
        revalidate: ['scan antigo'],
        missing: ['prova visual recente'],
      },
      promotion_gate: {
        can_promote_commands: true,
        can_promote_spaces: false,
        required_before_promotion: ['rodar teste focado'],
      },
      next_refresh: {
        actions: ['refresh folder map'],
        reason: 'memória morna exige revalidação',
      },
    },
    confidence: {
      schema_version: 'atlas.awis.workspace_confidence_projection.v1',
      confidence_score: 81,
      ranked: {
        commands: [{ label: 'npm run atlas-ai:test', score: 95, evidence: ['passou'], caution: null }],
        spaces: [{ label: 'AWIS cérebro vivo', score: 86, evidence: ['4 sessões'], caution: 'revalidar se stale' }],
        artifacts: [{ label: 'artifact-awis-123', score: 78, evidence: ['replay'], caution: null }],
        transfers: [{ label: 'atlas-desktop -> atlas-server', score: 73, evidence: ['shared stack'], caution: 'confirmar contrato' }],
      },
      decision_policy: {
        prefer: ['npm run atlas-ai:test'],
        require_confirmation_for: ['execução local'],
        avoid_until_revalidated: ['deploy produção'],
      },
    },
    learning_flywheel: {
      schema_version: 'atlas.awis.workspace_learning_flywheel_projection.v1',
      readiness_score: 82,
      compounding_score: 79,
      mode: 'compounding',
      cycle: {
        captured: ['outcome real'],
        distilled: ['contexto ouro'],
        reused: ['Space pack'],
        validated: ['atlas-ai:test'],
        promoted: ['rota analysis'],
        gaps: ['prova visual'],
      },
      automation: {
        next_safe_automations: ['registrar outcome'],
        requires_evidence: ['teste verde'],
        human_owned: ['aprovar risco'],
      },
      next_session: {
        load_first: ['flywheel:Space pack'],
        validate_with: ['npm run atlas-ai:test'],
        update_after_send: ['atualizar flywheel'],
        preserve_as_artifact: ['handoff AWIS'],
      },
      repository_loop: {
        local_reuse: ['atlas-desktop'],
        cross_workspace_reuse: ['atlas-server'],
        bridge_candidates: ['desktop-server contract'],
      },
      proof: {
        evidence_refs: ['workspaceBrainContract'],
        never_promote: ['raw conversation'],
        refresh_when: ['workspace mudou'],
      },
    },
    launch_contract: {
      schema_version: 'atlas.awis.workspace_launch_contract_projection.v1',
      readiness_score: 89,
      launch_mode: 'deep',
      seed_hash: 'launch-seed-123',
      startup_contract: {
        first_load: ['launch:context kernel'],
        validate_before_trust: ['launch:npm run atlas-ai:test'],
        summarize_only: ['conversa longa'],
        avoid_loading: ['raw conversation'],
        promote_after_success: ['promover launch pack'],
        demote_after_failure: ['demover launch pack'],
      },
      automation_contract: {
        before_send: ['launch:verificar frescor'],
        after_success: ['launch:preservar artifact'],
        after_failure: ['launch:demover contexto'],
        maintenance_actions: ['launch:refresh map'],
      },
      recovery_contract: {
        demote_context: ['launch contexto falho'],
        safe_resume: ['launch artifact'],
      },
      human_contract: {
        owns: ['risco de produção'],
        confirm_before: ['execução local'],
        do_not_delegate: ['deploy produção'],
      },
      next_conversation: {
        load_order: ['launch primeiro'],
        provider_note: 'começar com contexto AWIS curado',
      },
    },
    topology: {
      schema_version: 'atlas.awis.workspace_topology_projection.v1',
      execution_map: {
        test_commands: ['npm run atlas-ai:test'],
        build_commands: ['npx tsc -b'],
        dev_commands: ['npm run dev'],
        check_commands: ['git diff --check'],
      },
      knowledge_map: {
        load_first_docs: ['docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'],
        doc_obligations: ['ler doc canônico antes de editar'],
        doc_summaries: ['AWIS governa workspace'],
        internal_dependency_edges: ['atlas-desktop -> atlas-server'],
        workspace_members: ['atlas-desktop', 'atlas-server'],
        workspace_dependency_edges: ['pnpm-workspace->atlas-desktop:workspace:pnpm-workspace.yaml'],
        validation_entrypoints: ['workspaceBrainContract'],
        sensitive_zones: ['apps/desktop/src/surfaces/atlas-ai'],
        summarize_only: ['histórico longo'],
      },
    },
    safety: { raw_source_included: false, bounded: true, provider_safe: true },
  }
  const taskContext = {
    schema_version: 'atlas.awis.workspace_task_context_projection.v1',
    recommended_context: {
      working_set: {
        files: ['apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx'],
        docs: ['docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'],
        commands: ['npm run atlas-ai:test'],
      },
      evidence_gate: {
        verify_before_trust: ['git diff --check'],
        human_boundary: ['confirmar risco antes de executar'],
      },
      transfer_contract: {
        workspace_hints: ['atlas-server', '/Users/vitorepf/private/path'],
        reuse: ['transfer:contexto validado:component:atlas-server'],
        validate_before_use: ['confirmar validação transferida:php artisan test'],
        never_transfer: ['paths absolutos do Mac', 'operator_input cru'],
        reason: 'atlas-server acelera backend com revalidação local',
      },
      dependency_edges: ['@atlas/desktop->@atlas/domain:dependencies:atlas-desktop/apps/desktop/package.json'],
      command_intents: ['validate:auto-validar:atlas-desktop/package.json:npm run atlas-ai:test'],
      command_lanes: {
        auto_validate: ['npm run atlas-ai:test'],
        confirm_before_run: ['npm run dev'],
        manual_only: ['deploy produção'],
        preferred_validation: ['npm run atlas-ai:test'],
        reason: '1 comando auto-validável · 1 comando exige confirmação',
      },
      spaces: ['AWIS cérebro vivo'],
      space_brain: [
        {
          title: 'AWIS cérebro vivo',
          load_first: ['Space pack:AWIS cérebro vivo'],
          carry_forward: ['decisão:Space organiza contexto'],
          validate_before_use: ['revalidar Space pack'],
          human_boundary: ['humano confirma risco do Space'],
          artifact_refs: ['artifact-awis-123'],
        },
      ],
    },
  }
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: 'atlas',
    conversationContext: [awisCapsule, awisPack, taskContext],
  })

  assert.equal(isAutoAutoCleanPayload(payload), true)
  assert.deepEqual(payload.conversation_context, [awisCapsule, awisPack, taskContext])
  assert.equal('programming_harness' in payload, false)
  assert.doesNotMatch(JSON.stringify(payload.conversation_context), /"content"|function|class|import .* from/)
  const runtimeContext = payload.awis_runtime_context as Record<string, unknown>
  assert.equal(runtimeContext.schema_version, 'atlas.awis.runtime_context_hint.v1')
  assert.equal(runtimeContext.never_start_cold, true)
  const taskPacket = runtimeContext.task_packet as Record<string, unknown>
  assert.equal(taskPacket.packet_hash, 'task-awis-123')
  assert.equal(taskPacket.task_kind, 'bug_fix')
  assert.deepEqual(taskPacket.objective, {
    label: 'corrigir bug com contexto quente',
    suggested_surface: 'atlas_desktop',
    workspace_key: 'atlas',
    context_mode: 'balanced',
  })
  assert.deepEqual((taskPacket.context as Record<string, unknown>).load_first, ['component:atlas-ai'])
  assert.equal((taskPacket.context as Record<string, unknown>).bootstrap_manifest_hash, 'bootstrap-awis-123')
  assert.deepEqual((taskPacket.context as Record<string, unknown>).bootstrap_load_first, ['bootstrap:context-kernel'])
  assert.deepEqual((taskPacket.context as Record<string, unknown>).bootstrap_validate_before_use, ['bootstrap:npm run atlas-ai:test'])
  assert.deepEqual((taskPacket.context as Record<string, unknown>).space_brain, [
    {
      title: 'AWIS cérebro vivo',
      state: 'strong',
      load_first: ['Space:AWIS cérebro vivo'],
      carry_forward: ['decisão preservada'],
      validate_before_use: ['npm run atlas-ai:test'],
      artifact_refs: ['artifact-awis-123'],
      evidence: ['4 sessões protegidas'],
    },
  ])
  assert.deepEqual(
    (taskPacket.context as Record<string, unknown>).files,
    ['atlas-desktop/apps/desktop/src/surfaces/atlas-ai/AtlasAiSurface.tsx'],
  )
  assert.deepEqual((taskPacket.execution as Record<string, unknown>).validation_commands, ['npm run atlas-ai:test', 'npx tsc -b'])
  assert.deepEqual((taskPacket.execution as Record<string, unknown>).auto_validate, ['npm run atlas-ai:test'])
  assert.deepEqual((taskPacket.risk as Record<string, unknown>).avoid_loading, ['contexto completo sem resumo'])
  assert.deepEqual((taskPacket.learning as Record<string, unknown>).archive_as_artifact, ['task_packet', 'startup_snapshot'])
  assert.deepEqual((taskPacket.learning as Record<string, unknown>).automation_plan, {
    safe_local: ['validar:npm run atlas-ai:test'],
    confirm_first: ['confirmar:npm run dev', 'manual:deploy produção'],
    observe_only: ['não-promover:contexto falho', 'cautela:não mexer no mobile'],
    reason: 'separa automação local segura de confirmação humana',
  })
  assert.deepEqual(runtimeContext.startup_contract, {
    launch_mode: 'deep',
    context_mode: 'balanced',
    prefer_summary: true,
    bootstrap_manifest_hash: 'bootstrap-awis-123',
    load_sequence: ['load:session-gold'],
    revalidate_before_send: ['validate:npm run atlas-ai:test'],
    human_boundary: ['confirmar risco antes de executar'],
    readiness: {
      startup: 94,
      context_kernel: 88,
      artifact_replay: 71,
      next_session_brain: 96,
    },
  })
  assert.deepEqual(runtimeContext.bootstrap_plan, {
    manifest_hash: 'bootstrap-awis-123',
    launch_mode: 'deep',
    load_first: ['bootstrap:context-kernel'],
    summarize_first: ['bootstrap:resumo seguro'],
    validate_before_use: ['bootstrap:npm run atlas-ai:test'],
    never_load_raw: ['conversa bruta completa'],
    automation_hooks: ['before:revalidar contexto'],
    learning_hooks: ['promote:teste verde'],
    evidence: ['hash:sha256:bootstrap'],
    reason: 'manifesto vivo sem path bruto',
  })
  assert.deepEqual(runtimeContext.bootstrap_manifest, {
    bootstrap_hash: 'bootstrap-awis-123',
    launch_mode: 'deep',
    readiness_score: 92,
    golden_boot_sequence: ['manifest:carregar kernel'],
    load_first: ['manifest:Space AWIS'],
    summarize_first: ['manifest:resumo vivo'],
    validate_before_use: ['manifest:npm run atlas-ai:test'],
    never_load_raw: ['manifest:conversa bruta completa'],
    repositories: ['atlas-desktop'],
    components: ['atlas-ai'],
    spaces: ['AWIS cérebro vivo'],
    artifacts: ['artifact-awis-123'],
    before_send: ['manifest:revalidar contexto'],
    after_success: ['manifest:promover ouro'],
    after_failure: ['manifest:demover ruído'],
    safe_maintenance: ['manifest:refresh folder map'],
    capture_outcome: true,
    update_memory: true,
    update_spaces: true,
    preserve_artifact: true,
    promote_when: ['manifest:teste verde'],
    revalidate_when: ['manifest:falha repetida'],
    human_boundary: ['manifest:confirmar risco'],
    evidence_hashes: ['hash:sha256:manifest'],
    proven_by: ['workspaceBrainContract'],
    stale_or_guarded: ['manifest:scan antigo'],
  })
  assert.deepEqual(runtimeContext.validate_with, ['npm run atlas-ai:test'])
  const goldenContext = runtimeContext.golden_context as Record<string, unknown>
  assert.equal(goldenContext.provider_safe, true)
  assert.deepEqual((goldenContext.top_load as Array<Record<string, unknown>>).map((item) => item.label), ['session-gold:Space forte'])
  assert.deepEqual((goldenContext.validation_gold as Array<Record<string, unknown>>).map((item) => item.label), ['npm run atlas-ai:test'])
  assert.deepEqual(runtimeContext.dependency_edges, ['@atlas/desktop->@atlas/domain:dependencies:atlas-desktop/apps/desktop/package.json'])
  assert.deepEqual(runtimeContext.workspace_members, ['atlas-desktop', 'atlas-server'])
  assert.deepEqual(runtimeContext.workspace_dependency_edges, ['pnpm-workspace->atlas-desktop:workspace:pnpm-workspace.yaml'])
  assert.deepEqual(runtimeContext.command_intents, ['validate:auto-validar:atlas-desktop/package.json:npm run atlas-ai:test'])
  assert.deepEqual((runtimeContext.command_lanes as Record<string, unknown>).auto_validate, ['npm run atlas-ai:test'])
  assert.deepEqual((runtimeContext.command_lanes as Record<string, unknown>).confirm_before_run, ['npm run dev'])
  assert.deepEqual((runtimeContext.command_lanes as Record<string, unknown>).manual_only, ['deploy produção'])
  assert.deepEqual((runtimeContext.command_lanes as Record<string, unknown>).preferred_validation, ['npm run atlas-ai:test'])
  assert.deepEqual((runtimeContext.continuity_handoff as Record<string, unknown>).restore_priority, ['Space AWIS primeiro'])
  assert.deepEqual((runtimeContext.continuity_handoff as Record<string, unknown>).first_load, ['handoff:artifact'])
  assert.deepEqual((runtimeContext.context_kernel as Record<string, unknown>).priority_load, ['kernel:Space AWIS'])
  assert.deepEqual((runtimeContext.context_kernel as Record<string, unknown>).load_full, ['apps/desktop/src/surfaces/atlas-ai/contract.ts'])
  assert.deepEqual((runtimeContext.preflight as Record<string, unknown>).mode, 'ready')
  assert.deepEqual((runtimeContext.preflight as Record<string, unknown>).gates, [
    { id: 'tests', status: 'warn', reason: 'rodar atlas-ai:test' },
    { id: 'private', status: 'blocked', reason: null },
  ])
  assert.deepEqual(runtimeContext.workspace_twin, {
    status: 'ready',
    genome_hash: 'sha256:genome',
    code_map_hash: 'sha256:code-map',
    risk_map_hash: 'sha256:risk',
    command_registry_hash: 'sha256:commands',
  })
  assert.deepEqual((runtimeContext.continue_learning as Record<string, unknown>).record_outcome, true)
  assert.deepEqual((runtimeContext.continue_learning as Record<string, unknown>).maintenance_recent, ['promote_command:succeeded:npm run atlas-ai:test:x2'])
  assert.deepEqual((runtimeContext.automation as Record<string, unknown>).before_send, ['revalidar contexto quente'])
  assert.deepEqual((runtimeContext.automation as Record<string, unknown>).maintenance_queue, [
    {
      action: 'record_outcome',
      label: 'registrar resultado real da sessão',
      reason: 'fecha o loop de aprendizado',
      priority: 'high',
      requires_human_confirmation: false,
    },
    {
      action: 'review_risk',
      label: null,
      reason: 'path absoluto deve ser filtrado',
      priority: 'medium',
      requires_human_confirmation: true,
    },
  ])
  assert.deepEqual((runtimeContext.self_improvement as Record<string, unknown>).promote_when, ['teste verde e outcome sucedido'])
  assert.deepEqual((runtimeContext.self_improvement as Record<string, unknown>).validate_with, ['npm run atlas-ai:test'])
  assert.deepEqual((runtimeContext.adaptive_learning as Record<string, unknown>).before_send, ['aplicar current truth pack'])
  assert.deepEqual((runtimeContext.adaptive_learning as Record<string, unknown>).never_automate, ['deploy produção'])
  assert.deepEqual((runtimeContext.adaptive_learning as Record<string, unknown>).cross_repo_bridges, ['atlas-desktop -> atlas-server'])
  assert.deepEqual((runtimeContext.provider_strategy as Record<string, unknown>).fallback_order, ['atlas_decide', 'codex_cli'])
  assert.deepEqual((runtimeContext.execution_doctrine as Record<string, unknown>).required_before_execution, ['git diff --check'])
  assert.deepEqual((runtimeContext.memory_freshness as Record<string, unknown>).revalidate, ['scan antigo'])
  assert.deepEqual((runtimeContext.confidence as Record<string, unknown>).avoid_until_revalidated, ['deploy produção'])
  assert.deepEqual((runtimeContext.learning_flywheel as Record<string, unknown>).next_safe_automations, ['registrar outcome'])
  assert.deepEqual((runtimeContext.launch_contract as Record<string, unknown>).first_load, ['launch:context kernel'])
  assert.deepEqual((runtimeContext.topology as Record<string, unknown>).test_commands, ['npm run atlas-ai:test'])
  assert.deepEqual((runtimeContext.next_session as Record<string, unknown>).first_load, ['artifact-seed:workspace'])
  assert.deepEqual((runtimeContext.transfer_contract as Record<string, unknown>).workspace_hints, ['atlas-server'])
  assert.deepEqual((runtimeContext.transfer_contract as Record<string, unknown>).reuse, ['transfer:contexto validado:component:atlas-server'])
  assert.deepEqual((runtimeContext.transfer_contract as Record<string, unknown>).validate_before_use, ['confirmar validação transferida:php artisan test'])
  assert.deepEqual((runtimeContext.transfer_contract as Record<string, unknown>).never_transfer, ['paths absolutos do Mac'])
  assert.deepEqual((runtimeContext.space_context as Record<string, unknown>).active_spaces, ['AWIS cérebro vivo'])
  assert.deepEqual((runtimeContext.space_context as Record<string, unknown>).load_first, ['Space pack:AWIS cérebro vivo'])
  assert.deepEqual((runtimeContext.space_context as Record<string, unknown>).artifact_refs, ['artifact-awis-123'])
  assert.deepEqual((runtimeContext.space_context as Record<string, unknown>).learned_memory, [
    {
      title: 'AWIS cérebro vivo',
      outcome_count: 4,
      success_count: 3,
      failure_count: 1,
      comparison_open_count: 2,
      last_outcome_status: 'succeeded',
      signals: ['comparar:abertura explícita', 'pack:vivo'],
      artifact_refs: ['artifact-awis-123'],
    },
  ])
  assert.equal((runtimeContext.artifact_context as Record<string, unknown>).latest_artifact_hash, 'artifact-awis-123')
  assert.deepEqual((runtimeContext.artifact_context as Record<string, unknown>).load_order, ['artifact:startup snapshot'])
  assert.deepEqual((runtimeContext.artifact_context as Record<string, unknown>).reusable_patterns, ['não nascer frio', 'usar Space pack'])
  assert.deepEqual((runtimeContext.replay_contract as Record<string, unknown>).load_first, ['artifact:startup snapshot'])
  assert.deepEqual((runtimeContext.replay_contract as Record<string, unknown>).use_as_summary, ['ouro:decisão confirmada'])
  assert.deepEqual((runtimeContext.replay_contract as Record<string, unknown>).validate_before_trust, ['replay:npm run atlas-ai:test'])
  assert.deepEqual((runtimeContext.replay_contract as Record<string, unknown>).archive_after_success, ['snapshot AWIS após sucesso validado'])
  assert.deepEqual((runtimeContext.workspace_runbook as Record<string, unknown>).runbook_hash, 'runbook-awis-123')
  assert.deepEqual((runtimeContext.workspace_runbook as Record<string, unknown>).readiness_score, 93)
  assert.deepEqual(((runtimeContext.workspace_runbook as Record<string, unknown>).procedures as Array<Record<string, unknown>>), [
    {
      title: 'Partida quente do workspace',
      trigger: 'nova conversa no Atlas',
      load_first: ['runbook:context kernel'],
      steps: ['carregar ouro', 'resumir Space ativo'],
      validate_with: ['npm run atlas-ai:test'],
      avoid: ['conversa bruta completa'],
      success_evidence: ['teste verde'],
      confidence: 91,
    },
  ])
  assert.deepEqual(((runtimeContext.workspace_runbook as Record<string, unknown>).failure_response as Record<string, unknown>).safe_retry, ['revalidar serviço local'])
  assert.deepEqual(((runtimeContext.workspace_runbook as Record<string, unknown>).next_session as Record<string, unknown>).start_here, ['Partida quente do workspace'])
  assert.deepEqual((runtimeContext.retention as Record<string, unknown>).keep_hot, ['Space AWIS'])
  assert.deepEqual((runtimeContext.retention as Record<string, unknown>).promote, ['npm run atlas-ai:test'])
  assert.deepEqual((runtimeContext.startup_orchestration as Record<string, unknown>).sequence, [
    { step: 'load', label: 'carregar Space AWIS', source: 'space' },
    { step: 'private', label: null, source: 'unsafe' },
  ])
  assert.deepEqual((runtimeContext.component_memory as Record<string, unknown>).strongest, [
    {
      key: 'atlas-ai',
      role: 'surface desktop',
      maturity: 'stable',
      confidence: 91,
      load_first: ['AtlasAiSurface.tsx'],
      commands: ['npm run atlas-ai:test'],
      docs: ['docs/engineering-knowledge-base/atlas-workspace-intelligence-system.md'],
      cautions: ['revalidar layout antes de promover'],
    },
  ])
  assert.deepEqual((runtimeContext.semantic_index as Record<string, unknown>).aliases, [
    {
      alias: 'comparar conversas',
      intent: 'workbench',
      component_keys: ['atlas-ai'],
      task_kinds: ['analysis'],
      load: ['Space pack'],
      validate: ['workbenchSelection'],
      confidence: 88,
    },
  ])
  assert.deepEqual((runtimeContext.task_router as Record<string, unknown>).routes, [
    {
      route_key: 'analysis:atlas-ai',
      task_kind: 'analysis',
      policy: 'prefer',
      suggested_surface: 'side_by_side',
      load_first: ['índice semântico'],
      use_spaces: ['AWIS cérebro vivo'],
      use_components: ['atlas-ai'],
      use_artifacts: ['artifact-awis-123'],
      validate_with: ['npm run atlas-ai:test'],
      avoid_loading: [],
      confidence: 89,
    },
  ])
  assert.deepEqual((runtimeContext.impact_map as Record<string, unknown>).component_impacts, [
    {
      component_key: 'atlas-ai',
      affected_components: ['composer'],
      validation_cascade: ['npm run atlas-ai:test', 'npx tsc -b'],
      risk: 'medium',
      reason: 'surface central',
      confidence: 83,
    },
  ])
  assert.deepEqual((runtimeContext.living_graph as Record<string, unknown>).golden_path, ['Space -> Workbench -> Artifact'])
  assert.deepEqual((runtimeContext.workspace_mesh as Record<string, unknown>).load_order, ['mesh:atlas-server'])
  assert.deepEqual((runtimeContext.current_truth_pack as Record<string, unknown>).must_keep, ['Space organiza, Workbench compara'])
  assert.deepEqual((runtimeContext.current_truth_pack as Record<string, unknown>).verify_before_send, ['git diff --check'])
  assert.deepEqual((runtimeContext.next_session_truth as Record<string, unknown>).never_load_raw, ['conteúdo bruto de conversas'])
  assert.deepEqual((runtimeContext.next_session_truth as Record<string, unknown>).current_truth, ['Space organiza, Workbench compara'])
  assert.deepEqual((runtimeContext.repository_constellation as Record<string, unknown>).load_first, ['repo:atlas-desktop'])
  assert.deepEqual((runtimeContext.repository_constellation as Record<string, unknown>).validate_with, ['npm run atlas-ai:test'])
  assert.deepEqual((runtimeContext.feedback_loop as Record<string, unknown>).update_components, ['componente:atlas-ai'])
  assert.deepEqual((runtimeContext.feedback_loop as Record<string, unknown>).update_relations, ['relação:desktop-server'])
  assert.deepEqual((runtimeContext.feedback_loop as Record<string, unknown>).update_mesh, ['mesh:atlas'])
  assert.deepEqual((runtimeContext.recovery_playbook as Record<string, unknown>).safe_resume, ['retomar com último artifact'])
  assert.doesNotMatch(JSON.stringify(runtimeContext), /\/Users\/|raw_conversation|response_text|operator_input/)
})

test('surface_id sempre atlas_desktop_ai (nunca vaza atlas_mobile_ai)', () => {
  const { payload } = buildInteractionPayload({
    mode: 'research',
    task: 'plan',
    provider: 'auto',
    workspaceSlug: null,
  })
  assert.equal(payload.surface_id, 'atlas_desktop_ai')
  assert.equal(payload.app_surface, 'atlas_desktop_ai')
  assert.equal(ATLAS_AI_SURFACE_ID, 'atlas_desktop_ai')
  assert.equal(ATLAS_AI_APP_SURFACE, 'atlas_desktop_ai')
})

test('research + anexos NÃO vira programming.dev nem força programming_harness', () => {
  const { payload } = buildInteractionPayload({
    mode: 'research',
    task: 'plan',
    provider: 'auto',
    workspaceSlug: 'atlas',
  })
  const enriched = simulateEnrichment(payload, {
    urlAttachments: [{ url: 'https://arxiv.org/abs/2403.0001', kind: 'generic' }],
  })
  assert.equal(enriched.atlas_mode, 'research')
  assert.equal(enriched.routing_domain, 'research')
  assert.notEqual(enriched.flow_id, 'programming.dev')
  assert.equal('programming_harness' in enriched, false)
  assert.equal('capability_profile' in enriched, false)
})

test('finance + PDF não dispara programming runtime policy', () => {
  const { payload } = buildInteractionPayload({
    mode: 'finance',
    task: 'review',
    provider: 'auto',
    workspaceSlug: null,
  })
  const enriched = simulateEnrichment(payload, {
    textBlocks: [{ file_name: 'balance.pdf', mime_type: 'application/pdf', content: '...' }],
  })
  assert.equal(enriched.atlas_mode, 'finance')
  assert.equal('programming_harness' in enriched, false)
  assert.equal('tool_permissions' in enriched, false)
})

test('programming + dev MANTÉM programming_harness (canon do modo explícito)', () => {
  const { payload } = buildInteractionPayload({
    mode: 'programming',
    task: 'dev',
    provider: 'auto',
    workspaceSlug: 'atlas',
  })
  assert.equal(payload.atlas_mode, 'programming')
  assert.equal('programming_harness' in payload, true)
  assert.equal('capability_profile' in payload, true)
  assert.equal(payload.capability_profile, 'atlas_programming')
})

/* ─────────── Canon `atlas.rich_input.payload.v1` no envio ─────────── */

test('envio carrega rich_input_payload canon com schema_version correto', () => {
  const canon = fakeCanonicalPayload({
    imageIds: ['img-xyz'],
    documentIds: ['doc-abc'],
    textBlocks: [
      { file_name: 'a.md', mime_type: 'text/markdown', language: 'markdown', content: '# x' },
    ],
    urlAttachments: [
      {
        url: 'https://youtu.be/dQw4w9WgXcQ',
        kind: 'youtube',
        title: null,
        author: null,
        duration_sec: null,
        thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        ref_id: 'dQw4w9WgXcQ',
      },
    ],
    manifest: [
      {
        id: 'att-1',
        kind: 'image',
        file_name: 'photo.jpg',
        mime_type: 'image/jpeg',
        size: 12345,
        uploaded_id: 'img-xyz',
        source_hash: null,
        source: 'paste',
      },
      {
        id: 'att-2',
        kind: 'pdf',
        file_name: 'report.pdf',
        mime_type: 'application/pdf',
        size: 67890,
        uploaded_id: 'doc-abc',
        source_hash: null,
        source: 'picker',
      },
    ],
  })
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  const body = simulateRequestBody(payload, {
    uploadedImageIds: canon.uploaded_image_ids,
    uploadedDocumentIds: canon.uploaded_document_ids,
    richInputPayload: canon,
  })

  assert.ok(body.rich_input_payload, 'body deve carregar rich_input_payload no top-level')
  assert.equal(
    body.rich_input_payload.schema_version,
    'atlas.rich_input.payload.v1',
    'schema_version deve ser o canon v1',
  )
  assert.equal(body.rich_input_payload.uploaded_image_ids.length, 1)
  assert.equal(body.rich_input_payload.uploaded_document_ids.length, 1)
  assert.equal(body.rich_input_payload.text_blocks.length, 1)
  assert.equal(body.rich_input_payload.url_attachments.length, 1)
  assert.equal(body.rich_input_payload.source_manifest.length, 2)
})

test('source_manifest descreve cada attachment por kind + uploaded_id (audit trail)', () => {
  const canon = fakeCanonicalPayload({
    imageIds: ['img-1', 'img-2'],
    documentIds: ['doc-1'],
    manifest: [
      {
        id: 'att-img-1',
        kind: 'image',
        file_name: 'one.png',
        mime_type: 'image/png',
        size: 100,
        uploaded_id: 'img-1',
        source_hash: null,
        source: 'paste',
      },
      {
        id: 'att-img-2',
        kind: 'image',
        file_name: 'two.png',
        mime_type: 'image/png',
        size: 200,
        uploaded_id: 'img-2',
        source_hash: null,
        source: 'drop',
      },
      {
        id: 'att-doc-1',
        kind: 'pdf',
        file_name: 'three.pdf',
        mime_type: 'application/pdf',
        size: 300,
        uploaded_id: 'doc-1',
        source_hash: null,
        source: 'picker',
      },
    ],
  })

  for (const entry of canon.source_manifest) {
    assert.ok(entry.id, 'manifest entry precisa de id estável')
    assert.ok(entry.kind, 'manifest entry precisa declarar kind')
    assert.ok(entry.file_name, 'manifest entry precisa de file_name')
    assert.ok(entry.mime_type, 'manifest entry precisa de mime_type')
  }

  const images = canon.source_manifest.filter((e) => e.kind === 'image')
  const pdfs = canon.source_manifest.filter((e) => e.kind === 'pdf')
  assert.equal(images.length, 2)
  assert.equal(pdfs.length, 1)
  assert.equal(images[0].uploaded_id, 'img-1')
  assert.equal(pdfs[0].uploaded_id, 'doc-1')
})

test('envio mantém uploaded_images/uploaded_documents legados em paralelo ao canon', () => {
  const canon = fakeCanonicalPayload({
    imageIds: ['img-z'],
    documentIds: [],
  })
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  const body = simulateRequestBody(payload, {
    uploadedImageIds: canon.uploaded_image_ids,
    uploadedDocumentIds: canon.uploaded_document_ids,
    richInputPayload: canon,
  })

  // Legacy continua presente — backend ainda consome (back-compat).
  assert.deepEqual(body.uploaded_images, ['img-z'])
  // Canon presente em paralelo.
  assert.equal(body.rich_input_payload?.schema_version, 'atlas.rich_input.payload.v1')
})

test('envio SEM anexos não inclui rich_input_payload nem uploaded_images', () => {
  const { payload } = buildInteractionPayload({
    mode: 'auto',
    task: 'auto',
    provider: 'auto',
    workspaceSlug: null,
  })
  const body = simulateRequestBody(payload, {})
  assert.equal(body.rich_input_payload, undefined)
  assert.equal(body.uploaded_images, undefined)
  assert.equal(body.uploaded_documents, undefined)
})

test('research + canon rich_input_payload mantém routing limpo', () => {
  const { payload } = buildInteractionPayload({
    mode: 'research',
    task: 'plan',
    provider: 'auto',
    workspaceSlug: null,
  })
  const canon = fakeCanonicalPayload({
    urlAttachments: [
      {
        url: 'https://arxiv.org/abs/2403.0001',
        kind: 'generic',
        title: null,
        author: null,
        duration_sec: null,
        thumbnail_url: null,
        ref_id: null,
      },
    ],
  })
  const body = simulateRequestBody(payload, { richInputPayload: canon })
  const bodyPayload = body.payload as Record<string, unknown>

  assert.equal(bodyPayload.atlas_mode, 'research')
  assert.equal(bodyPayload.routing_domain, 'research')
  assert.notEqual(bodyPayload.flow_id, 'programming.dev')
  assert.equal(body.rich_input_payload?.schema_version, 'atlas.rich_input.payload.v1')
  assert.equal(body.rich_input_payload?.url_attachments[0].url, 'https://arxiv.org/abs/2403.0001')
})

test('programming + dev + canon rich_input_payload mantém harness + envia canon', () => {
  const { payload } = buildInteractionPayload({
    mode: 'programming',
    task: 'dev',
    provider: 'auto',
    workspaceSlug: 'atlas',
  })
  const canon = fakeCanonicalPayload({
    documentIds: ['doc-spec'],
    manifest: [
      {
        id: 'att-spec',
        kind: 'pdf',
        file_name: 'spec.pdf',
        mime_type: 'application/pdf',
        size: 4096,
        uploaded_id: 'doc-spec',
        source_hash: null,
        source: 'picker',
      },
    ],
  })
  const body = simulateRequestBody(payload, {
    uploadedDocumentIds: canon.uploaded_document_ids,
    richInputPayload: canon,
  })
  const bodyPayload = body.payload as Record<string, unknown>

  assert.equal(bodyPayload.atlas_mode, 'programming')
  assert.equal('programming_harness' in bodyPayload, true)
  assert.equal(body.rich_input_payload?.schema_version, 'atlas.rich_input.payload.v1')
  assert.equal(body.rich_input_payload?.source_manifest[0].kind, 'pdf')
})
