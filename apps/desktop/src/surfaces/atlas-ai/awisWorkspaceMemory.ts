import type { AtlasWorkspaceBrainSnapshot } from '../../lib/bridge'
import type { AtlasAwisArtifactIntelligence, AtlasAwisHandoffPack, AtlasAwisLiveExecutionMemory, AtlasAwisNextSessionBrain } from './types'

export const AWIS_WORKSPACE_MEMORY_STORAGE = 'atlas-desktop:atlas-ai-workspace-memory'
export const AWIS_WORKSPACE_ARTIFACT_STORAGE = 'atlas-desktop:atlas-ai-workspace-artifacts'
export const AWIS_WORKSPACE_SPACE_PROJECTIONS_STORAGE = 'atlas-desktop:atlas-ai-workspace-space-projections'
export const AWIS_WORKSPACE_LIVE_EXECUTION_MEMORY_STORAGE = 'atlas-desktop:atlas-ai-live-execution-memory'

export interface AwisWorkspaceMemorySignal {
  label: string
  firstSeenAt: string
  lastSeenAt: string
  seenCount: number
}

export interface AwisWorkspaceMemoryOutcome {
  occurredAt: string
  channel: 'conversation' | 'workbench' | 'voice'
  status: string
  provider: string | null
  model: string | null
  latencyMs: number | null
  contextPackApplied: boolean
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'] | null
  routeKey: string | null
  routeLabel: string | null
  contextGoldLabels: string[]
  validationCommands: string[]
  componentKeys: string[]
  spaceLabels: string[]
  spaceBrainLabels: string[]
  liveMemoryLabels: string[]
  priorityLoadLabels: string[]
}

export type AwisWorkspaceMaintenanceAction =
  | 'refresh_folder_map'
  | 'preserve_artifact'
  | 'open_side_by_side'
  | 'update_space_pack'
  | 'revalidate_context'
  | 'replay_artifacts'
  | 'record_outcome'
  | 'revalidate_command'
  | 'review_risk'
  | 'cross_workspace_transfer'
  | 'promote_command'
  | 'demote_context'
  | 'transfer_learning'

export interface AwisWorkspaceMaintenanceEvent {
  occurredAt: string
  action: AwisWorkspaceMaintenanceAction
  label: string
  status: 'succeeded' | 'failed' | 'skipped'
  reason: string | null
  evidence: string[]
}

export interface AwisWorkspaceMemorySnapshot {
  schemaVersion: 'atlas.awis.workspace_memory.v1'
  workspaceKey: string
  workspaceName: string
  rootPath: string
  firstSeenAt: string
  lastSeenAt: string
  scanCount: number
  lastFingerprint: string
  stableSignals: AwisWorkspaceMemorySignal[]
  stableLanguages: AwisWorkspaceMemorySignal[]
  stableCommands: AwisWorkspaceMemorySignal[]
  operationalSignals: AwisWorkspaceMemorySignal[]
  interactionCount: number
  successCount: number
  failureCount: number
  contextPackAppliedCount: number
  lastInteractionAt: string | null
  recentOutcomes: AwisWorkspaceMemoryOutcome[]
  recentMaintenance: AwisWorkspaceMaintenanceEvent[]
  observations: string[]
  driftEvents: string[]
}

export interface AwisWorkspaceMemoryUpdate {
  memory: AwisWorkspaceMemorySnapshot
  learned: string[]
  changed: string[]
}

export interface AwisWorkspaceInteractionInput {
  workspaceKey: string
  workspaceName: string
  rootPath: string
  occurredAt?: string | null
  channel: AwisWorkspaceMemoryOutcome['channel']
  status: string | null | undefined
  provider?: string | null
  model?: string | null
  latencyMs?: number | null
  contextPackApplied: boolean
  taskKind?: AwisWorkspaceTaskContextProjection['task_kind'] | null
  routeKey?: string | null
  routeLabel?: string | null
  contextGoldLabels?: string[] | null
  validationCommands?: string[] | null
  componentKeys?: string[] | null
  spaceLabels?: string[] | null
  spaceBrainLabels?: string[] | null
  liveMemoryLabels?: string[] | null
  priorityLoadLabels?: string[] | null
}

export interface AwisWorkspaceMaintenanceInput {
  workspaceKey: string
  workspaceName: string
  rootPath: string
  occurredAt?: string | null
  action: AwisWorkspaceMaintenanceAction
  label: string
  status: AwisWorkspaceMaintenanceEvent['status']
  reason?: string | null
  evidence?: string[] | null
}

export interface AwisWorkspaceContextPack {
  schema_version: 'atlas.awis.workspace_context_pack.v1'
  source: 'atlas_desktop_awis'
  workspace: {
    key: string
    name: string
    root_path_known: boolean
  }
  folder_map: {
    status: string
    files_seen: number
    dirs_seen: number
    truncated: boolean
    signals: string[]
    languages: string[]
    important_files: Array<{ path: string; kind: string }>
    commands: Array<{ command: string; kind: string; source: string }>
  } | null
  memory: {
    scan_count: number
    stable_signals: string[]
    stable_languages: string[]
    stable_commands: string[]
    latest_drift: string | null
    observations: string[]
    operational: {
      interaction_count: number
      success_count: number
      failure_count: number
      context_pack_applied_count: number
      last_interaction_at: string | null
      recent_channels: string[]
      latest_status: string | null
      recent_maintenance: string[]
      context_gold: {
        promoted: string[]
        revalidate: string[]
        space_brain: {
          promoted: string[]
          revalidate: string[]
        }
      }
    }
  } | null
  learning?: AwisWorkspaceLearningProjection | null
  session_gold: AwisWorkspaceSessionGoldProjection | null
  evolution: AwisWorkspaceEvolutionProjection | null
  relations: AwisWorkspaceRelationProjection | null
  workspace_mesh: AwisWorkspaceMeshProjection | null
  current_truth_pack: AwisWorkspaceCurrentTruthPackProjection | null
  repository_constellation: AwisWorkspaceRepositoryConstellationProjection | null
  live_execution_memory: AwisWorkspaceLiveExecutionMemoryProjection | null
  topology: AwisWorkspaceTopologyProjection | null
  component_memory: AwisWorkspaceComponentMemoryProjection | null
  semantic_index: AwisWorkspaceSemanticIndexProjection | null
  impact_map: AwisWorkspaceImpactMapProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  startup_snapshot: AwisWorkspaceStartupSnapshot | null
  startup_briefing: AwisWorkspaceStartupBriefing | null
  startup_playbook: AwisWorkspaceStartupPlaybook | null
  continuity: AwisWorkspaceContinuityProjection | null
  automation: AwisWorkspaceAutomationProjection | null
  confidence: AwisWorkspaceConfidenceProjection | null
  living_graph: AwisWorkspaceLivingGraphProjection | null
  context_kernel: AwisWorkspaceContextKernelProjection | null
  execution_doctrine: AwisWorkspaceExecutionDoctrineProjection | null
  provider_strategy: AwisWorkspaceProviderStrategyProjection | null
  task_router: AwisWorkspaceTaskRouterProjection | null
  self_improvement: AwisWorkspaceSelfImprovementProjection | null
  memory_freshness: AwisWorkspaceMemoryFreshnessProjection | null
  retention: AwisWorkspaceRetentionProjection | null
  memory_consolidation: AwisWorkspaceMemoryConsolidationProjection | null
  startup_orchestration: AwisWorkspaceStartupOrchestrationProjection | null
  preflight: AwisWorkspacePreflightProjection | null
  workspace_twin: AwisWorkspaceTwinProjection | null
  launch_contract: AwisWorkspaceLaunchContractProjection | null
  artifact_lake: AwisWorkspaceArtifactLakeSummary | null
  artifact_replay: AwisWorkspaceArtifactReplayProjection | null
  next_session_brain: AwisWorkspaceNextSessionBrainProjection | null
  handoff_pack: AwisWorkspaceHandoffProjection | null
  safety: {
    raw_source_included: false
    bounded: true
    provider_safe: true
    cross_workspace_raw_context_included: false
  }
}

export interface AwisWorkspaceArtifactEntry {
  schema_version: 'atlas.awis.workspace_artifact.v1'
  artifact_type: 'startup_snapshot'
  workspace_key: string
  workspace_name: string
  artifact_hash: string
  created_at: string
  title: string
  summary: string
  manifest: {
    schema_version: 'atlas.awis.workspace_artifact_manifest.v1'
    quality_score: number
    replay_priority: number
    seed_hash: string
    load_first: string[]
    validate_with: string[]
    promote_signals: string[]
    caution_signals: string[]
    linked_spaces: string[]
    repository_hints: string[]
    safety: {
      raw_source_included: false
      raw_conversation_included: false
      internal_ids_included: false
      bounded: true
      provider_safe: true
    }
  }
  payload: {
    startup_snapshot: AwisWorkspaceStartupSnapshot
    startup_briefing: AwisWorkspaceStartupBriefing | null
    startup_playbook: AwisWorkspaceStartupPlaybook | null
    continuity_projection: AwisWorkspaceContinuityProjection | null
    automation_projection: AwisWorkspaceAutomationProjection | null
    confidence_projection: AwisWorkspaceConfidenceProjection | null
    living_graph_projection: AwisWorkspaceLivingGraphProjection | null
    session_gold_projection: AwisWorkspaceSessionGoldProjection | null
    context_kernel_projection: AwisWorkspaceContextKernelProjection | null
    execution_doctrine_projection: AwisWorkspaceExecutionDoctrineProjection | null
    provider_strategy_projection: AwisWorkspaceProviderStrategyProjection | null
    task_router_projection: AwisWorkspaceTaskRouterProjection | null
    self_improvement_projection: AwisWorkspaceSelfImprovementProjection | null
    memory_freshness_projection: AwisWorkspaceMemoryFreshnessProjection | null
    retention_projection: AwisWorkspaceRetentionProjection | null
    memory_consolidation_projection: AwisWorkspaceMemoryConsolidationProjection | null
    startup_orchestration_projection: AwisWorkspaceStartupOrchestrationProjection | null
    preflight_projection: AwisWorkspacePreflightProjection | null
    workspace_twin_projection: AwisWorkspaceTwinProjection | null
    launch_contract_projection: AwisWorkspaceLaunchContractProjection | null
    next_session_brain_projection: AwisWorkspaceNextSessionBrainProjection | null
    learning_projection: AwisWorkspaceLearningProjection | null
    topology_projection: AwisWorkspaceTopologyProjection | null
    component_memory_projection: AwisWorkspaceComponentMemoryProjection | null
    semantic_index_projection: AwisWorkspaceSemanticIndexProjection | null
    impact_map_projection: AwisWorkspaceImpactMapProjection | null
    space_projection: AwisWorkspaceSpaceProjection | null
    evolution_projection: AwisWorkspaceEvolutionProjection | null
    relation_projection: AwisWorkspaceRelationProjection | null
    workspace_mesh_projection: AwisWorkspaceMeshProjection | null
    current_truth_pack_projection: AwisWorkspaceCurrentTruthPackProjection | null
    repository_constellation_projection: AwisWorkspaceRepositoryConstellationProjection | null
    live_execution_memory_projection: AwisWorkspaceLiveExecutionMemoryProjection | null
    memory_operational: NonNullable<AwisWorkspaceContextPack['memory']>['operational'] | null
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceArtifactLakeSummary {
  schema_version: 'atlas.awis.workspace_artifact_lake_summary.v1'
  workspace_key: string
  artifact_count: number
  latest_artifact_hash: string | null
  latest_artifact_type: AwisWorkspaceArtifactEntry['artifact_type'] | string | null
  latest_created_at: string | null
  retained_limit: number
}

export interface AwisWorkspaceArtifactReplayProjection {
  schema_version: 'atlas.awis.workspace_artifact_replay_projection.v1'
  source: 'local_workspace_artifacts' | 'server_awair_artifact_intelligence'
  artifact_count: number
  latest_artifact_hash: string | null
  cold_start_seed: {
    schema_version: 'atlas.awis.artifact_cold_start_seed.v1'
    source: AwisWorkspaceArtifactReplayProjection['source']
    readiness_score: number
    seed_hash: string
    load_order: string[]
    validate_with: string[]
    context_signals: string[]
    reuse_spaces: string[]
    repository_hints: string[]
    automation_hooks: string[]
    warnings: string[]
    human_boundary: string[]
  }
  reusable_startup_gold: {
    strongest_spaces: string[]
    reusable_patterns: string[]
    warnings: string[]
    next_best_actions: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceLearningProjection {
  schema_version: 'atlas.awis.workspace_learning_projection.v1'
  source: 'local_workspace_outcomes'
  maturity: 'new' | 'learning' | 'stable' | 'battle_tested'
  interaction_count: number
  success_rate: number | null
  context_pack_effectiveness: number | null
  preferred_channels: string[]
  trusted_commands: string[]
  caution_signals: string[]
  recent_drift: string[]
  task_memory: {
    task_kinds: string[]
    recent_task_kinds: string[]
    trusted_task_commands: string[]
    validation_plans: Array<{
      task_kind: AwisWorkspaceTaskContextProjection['task_kind']
      commands: string[]
      context_gold: string[]
      component_keys: string[]
      success_count: number
      failure_count: number
      confidence: number
    }>
  }
  next_learning_event: string
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceSessionGoldProjection {
  schema_version: 'atlas.awis.workspace_session_gold_projection.v1'
  source: 'local_workspace_session_outcomes'
  readiness_score: number
  outcome_count: number
  success_rate: number | null
  strongest_outcomes: Array<{
    label: string
    confidence: number
    evidence: string[]
  }>
  proven_commands: Array<{
    command: string
    success_count: number
    task_kinds: string[]
    channels: string[]
  }>
  recovery_patterns: string[]
  next_session_hooks: {
    before_send: string[]
    after_send: string[]
    validate_with: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceArtifactServerProjections {
  artifactLake: AwisWorkspaceArtifactLakeSummary | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
}

export interface AwisWorkspaceNextSessionBrainProjection {
  schema_version: 'atlas.awis.workspace_next_session_brain_projection.v1'
  source: 'server_awnsb' | 'local_awis_seed'
  status: string
  brain_hash: string | null
  readiness_score: number | null
  load_order: string[]
  focused_repositories: Array<{
    repo_key: string
    score: number
    reasons: string[]
    stack: string[]
  }>
  focused_areas: string[]
  artifact_refs: string[]
  owner_docs: string[]
  execution_priority: Array<{
    command: string
    why: string | null
    requires_operator_approval: boolean
  }>
  context_loading: {
    mode: string | null
    repository_count: number
    stack_tags: string[]
    command_hints: string[]
    outcome_ranked_commands: string[]
    avoid_commands: string[]
    flaky_commands: string[]
    slow_commands: string[]
    focused_manifest_refs: Array<{
      repo_key: string
      manifest_files: string[]
      stack: string[]
      script_names: string[]
    }>
    hashes: {
      repository_inventory_hash: string | null
      working_set_hash: string | null
      context_delta_plan_hash: string | null
      learning_snapshot_hash: string | null
      live_execution_memory_hash: string | null
    }
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    internal_ids_included: false
    absolute_paths_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceHandoffProjection {
  schema_version: 'atlas.awis.workspace_handoff_projection.v1'
  source: 'server_handoff_pack'
  status: string
  consumer: string | null
  handoff_hash: string | null
  workspace_readiness: string | null
  required_artifacts: string[]
  missing_artifacts: string[]
  context_units: Array<{
    artifact_type: string
    artifact_hash: string | null
    status: string | null
  }>
  scope_guard: {
    risk_floor: string | null
    sensitive_areas: string[]
    owner_docs: string[]
  }
  test_contract: {
    focused_tests: string[]
    fallback_tests: string[]
  }
  next_session_brain_hash: string | null
  artifact_refs: string[]
  handoff_units: string[]
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceStartupSnapshot {
  schema_version: 'atlas.awis.workspace_startup_snapshot.v1'
  source: 'workspace_memory_space_evolution'
  generated_for_workspace: string
  readiness: {
    folder_map_ready: boolean
    topology_ready: boolean
    memory_ready: boolean
    operational_memory_ready: boolean
    learning_ready: boolean
    spaces_ready: boolean
    evolution_ready: boolean
    relations_ready: boolean
    artifact_replay_ready: boolean
    live_execution_memory_ready: boolean
    next_session_brain_ready: boolean
    handoff_pack_ready: boolean
  }
  startup_gold: {
    stack_signals: string[]
    workspace_components: string[]
    commands: string[]
    strongest_spaces: string[]
    recent_channels: string[]
    reusable_patterns: string[]
    warnings: string[]
    next_best_actions: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included?: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceStartupBriefing {
  schema_version: 'atlas.awis.workspace_startup_briefing.v1'
  source: 'local_awis_context_compiler'
  generated_for_workspace: string
  never_start_cold: true
  readiness: {
    score: number
    folder_map: boolean
    topology: boolean
    memory: boolean
    operational_memory: boolean
    learning: boolean
    spaces: boolean
    relations: boolean
    artifact_replay: boolean
    next_session_brain: boolean
    handoff_pack: boolean
  }
  focus: {
    primary: string
    load_sequence: string[]
    repositories: string[]
    areas: string[]
    owner_docs: string[]
  }
  context_gold: {
    stack: string[]
    commands: string[]
    strongest_spaces: string[]
    reusable_patterns: string[]
    artifact_refs: string[]
    handoff_units: string[]
  }
  operational_memory: {
    interaction_count: number
    success_rate: number | null
    recent_channels: string[]
    latest_status: string | null
  }
  automation_plan: {
    next_best_actions: string[]
    commands_to_prioritize: string[]
    tests_to_run: string[]
    missing_artifacts: string[]
    warnings: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    internal_ids_included: false
    absolute_paths_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceStartupPlaybook {
  schema_version: 'atlas.awis.workspace_startup_playbook.v1'
  source: 'local_awis_execution_compiler'
  generated_for_workspace: string
  recommended_surface: 'single_conversation' | 'space_first' | 'side_by_side'
  context_loading: {
    must_load: string[]
    optional: string[]
    avoid_loading: string[]
  }
  execution: {
    primary_validation_commands: string[]
    fallback_validation_commands: string[]
    requires_local_folder: boolean
  }
  collaboration: {
    resume_space: string | null
    compare_sessions: boolean
    related_workspace_hints: string[]
  }
  learning_hooks: {
    record_outcome: boolean
    update_memory_after_send: boolean
    persist_startup_artifact: boolean
    watch_for_drift: boolean
  }
  risk_controls: string[]
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceTaskContextProjection {
  schema_version: 'atlas.awis.workspace_task_context_projection.v1'
  source: 'local_awis_task_autopilot'
  workspace_key: string
  task_kind: 'code_change' | 'bug_fix' | 'research' | 'ops' | 'design' | 'analysis' | 'unknown'
  confidence: number
  matched_intent_signals: string[]
  recommended_context: {
    load_order: string[]
    components: Array<{
      key: string
      role: string
      stack: string[]
      why: string
    }>
    component_intent_ranking: Array<{
      key: string
      score: number
      matched: string[]
      action: 'load_first' | 'summarize' | 'revalidate'
    }>
    component_context_packs: Array<{
      key: string
      mode: 'full' | 'summary' | 'guarded'
      load: string[]
      validate: string[]
      avoid: string[]
      reason: string
    }>
    folder_focus: {
      primary_component: string | null
      load_scope: 'workspace_root' | 'component' | 'multi_component'
      include: string[]
      summarize: string[]
      avoid: string[]
      reason: string
    }
    task_gold: Array<{
      kind: 'session_outcome' | 'command' | 'space' | 'artifact' | 'component' | 'route'
      label: string
      why: string
      confidence: number
    }>
    evidence_gate: {
      trusted: string[]
      verify_before_trust: string[]
      missing_or_stale: string[]
      human_boundary: string[]
      reason: string
    }
    context_budget: {
      mode: 'lean' | 'balanced' | 'deep'
      max_items: number
      load_full: string[]
      summarize: string[]
      omit: string[]
      reason: string
    }
    working_set: {
      files: string[]
      docs: string[]
      commands: string[]
      reason: string
    }
    semantic_matches: Array<{
      alias: string
      intent: string
      component_keys: string[]
      load: string[]
      validate: string[]
      confidence: number
    }>
    impact_radius: {
      primary_component: string | null
      affected_components: string[]
      validation_cascade: string[]
      cross_workspace: string[]
      risk: 'low' | 'medium' | 'high'
      reason: string
    }
    space_brain: Array<{
      title: string
      state: 'vivo' | 'pronto' | 'leve'
      load_first: string[]
      carry_forward: string[]
      validate_before_use: string[]
      automation_hooks: string[]
      human_boundary: string[]
      artifact_refs: string[]
      evidence: string[]
      confidence: number
    }>
    spaces: string[]
    artifacts: string[]
    owner_docs: string[]
    related_workspace_hints: string[]
  }
  execution_plan: {
    suggested_surface: 'single_conversation' | 'space_first' | 'side_by_side'
    doctrine_drivers: string[]
    preflight_gates: string[]
    validation_commands: string[]
    commands_to_avoid: string[]
    recovery_playbook: {
      retry_order: string[]
      fallback_validation: string[]
      demote_context: string[]
      safe_resume: string[]
      reason: string
    }
    requires_local_folder: boolean
  }
  learning_hooks: {
    record_task_outcome: true
    update_command_confidence: true
    watch_for_workspace_drift: boolean
    next_session_contract: {
      first_load: string[]
      validate_with: string[]
      preserve_as_artifact: boolean
      promote_when: string[]
      demote_when: string[]
    }
  }
  risk: {
    cautions: string[]
    needs_human_confirmation: boolean
  }
  safety: {
    raw_user_message_included: false
    raw_conversation_included: false
    raw_source_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceProviderCapsuleProjection {
  schema_version: 'atlas.awis.workspace_provider_capsule.v1'
  source: 'local_awis_provider_capsule_compiler'
  workspace_key: string
  task_kind: AwisWorkspaceTaskContextProjection['task_kind'] | 'startup'
  confidence: number
  load_first: string[]
  use_as_summary: string[]
  validate_with: string[]
  avoid_loading: string[]
  provider_strategy: {
    preferred_provider: string | null
    fallback_order: string[]
    avoid: string[]
    reason: string
  } | null
  continue_learning: {
    record_outcome: true
    update_memory: true
    update_space_pack: boolean
    preserve_artifact_after_success: boolean
    maintenance_recent: string[]
    recovery_playbook: {
      retry_order: string[]
      fallback_validation: string[]
      demote_context: string[]
      safe_resume: string[]
    }
    next_session_contract: {
      first_load: string[]
      validate_with: string[]
      promote_when: string[]
      demote_when: string[]
    }
  }
  safety: {
    raw_user_message_included: false
    raw_conversation_included: false
    raw_source_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceProviderStrategyProjection {
  schema_version: 'atlas.awis.workspace_provider_strategy_projection.v1'
  source: 'local_awis_provider_strategy_compiler'
  provider_count: number
  preferred: Array<{
    provider: string
    model: string | null
    policy: 'prefer' | 'use_when_matched' | 'revalidate' | 'avoid'
    success_count: number
    failure_count: number
    success_rate: number | null
    avg_latency_ms: number | null
    task_kinds: string[]
    reason: string
  }>
  fallback_order: string[]
  caution_signals: string[]
  learning_contract: {
    record_provider: true
    record_model: true
    record_latency: true
    promote_after_successes: number
    demote_after_failures: number
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceContinuityProjection {
  schema_version: 'atlas.awis.workspace_continuity_projection.v1'
  source: 'local_awis_continuity_compiler'
  readiness_score: number
  restore_priority: Array<{
    kind: 'space' | 'artifact' | 'command' | 'component' | 'relation' | 'handoff' | 'task_memory'
    label: string
    why: string
    confidence: number
  }>
  hot_context: {
    spaces: string[]
    components: string[]
    commands: string[]
    artifacts: string[]
    task_kinds: string[]
    related_workspace_hints: string[]
  }
  stale_or_risky_context: string[]
  next_session_plan: {
    open_surface: 'single_conversation' | 'space_first' | 'side_by_side'
    first_load: string[]
    validate_with: string[]
    preserve_as_artifact: boolean
  }
  learning_hooks: {
    capture_outcome: true
    refresh_folder_map: boolean
    update_space_pack: boolean
    replay_artifacts_before_send: boolean
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceAutomationProjection {
  schema_version: 'atlas.awis.workspace_automation_projection.v1'
  source: 'local_awis_maintenance_compiler'
  automation_score: number
  mode: 'observe' | 'maintain' | 'optimize'
  maintenance_queue: Array<{
    action: 'refresh_folder_map' | 'replay_artifacts' | 'update_space_pack' | 'record_outcome' | 'revalidate_command' | 'review_risk' | 'cross_workspace_transfer'
    label: string
    reason: string
    priority: 'high' | 'medium' | 'low'
    requires_human_confirmation: boolean
  }>
  autopilot_context: {
    before_send: string[]
    after_send: string[]
    on_startup: string[]
  }
  feedback_loop: {
    metrics_to_watch: string[]
    promote_when: string[]
    demote_when: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    external_side_effects_allowed: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceTaskRouterProjection {
  schema_version: 'atlas.awis.workspace_task_router_projection.v1'
  source: 'local_awis_task_router_compiler'
  route_count: number
  routes: Array<{
    task_kind: AwisWorkspaceTaskContextProjection['task_kind']
    route_key: string
    confidence: number
    success_count: number
    failure_count: number
    success_rate: number | null
    last_used_at: string | null
    policy: 'prefer' | 'use_when_matched' | 'revalidate'
    suggested_surface: 'single_conversation' | 'space_first' | 'side_by_side'
    load_first: string[]
    use_spaces: string[]
    use_components: string[]
    use_artifacts: string[]
    validate_with: string[]
    avoid_loading: string[]
    intent_signals: string[]
    evidence_plan: {
      load: string[]
      verify: string[]
      preserve: string[]
      learn: string[]
    }
    automation_hooks: {
      before_send: string[]
      after_success: string[]
      after_failure: string[]
    }
    reason: string
  }>
  fallback_route: {
    load_first: string[]
    validate_with: string[]
    avoid_loading: string[]
    reason: string
  }
  learning_contract: {
    record_task_kind: true
    record_selected_route: true
    promote_route_after_successes: number
    revalidate_route_after_failures: number
  }
  safety: {
    raw_user_message_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceConfidenceProjection {
  schema_version: 'atlas.awis.workspace_confidence_projection.v1'
  source: 'local_awis_confidence_compiler'
  confidence_score: number
  ranked: {
    commands: Array<{ label: string; score: number; evidence: string[]; caution: string | null }>
    spaces: Array<{ label: string; score: number; evidence: string[]; caution: string | null }>
    artifacts: Array<{ label: string; score: number; evidence: string[]; caution: string | null }>
    transfers: Array<{ label: string; score: number; evidence: string[]; caution: string | null }>
  }
  decision_policy: {
    prefer: string[]
    require_confirmation_for: string[]
    avoid_until_revalidated: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceLivingGraphProjection {
  schema_version: 'atlas.awis.workspace_living_graph_projection.v1'
  source: 'local_awis_living_graph_compiler'
  readiness_score: number
  nodes: Array<{
    key: string
    kind: 'component' | 'command' | 'space' | 'artifact' | 'task_memory' | 'related_workspace' | 'handoff'
    label: string
    role: string
    confidence: number
    evidence: string[]
  }>
  edges: Array<{
    from: string
    to: string
    reason: string
    strength: number
  }>
  golden_path: string[]
  autopilot_hints: {
    before_send: string[]
    after_send: string[]
    on_startup: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceContextKernelProjection {
  schema_version: 'atlas.awis.workspace_context_kernel_projection.v1'
  source: 'local_awis_context_kernel_compiler'
  readiness_score: number
  budget: {
    mode: 'lean' | 'balanced' | 'deep'
    max_context_items: number
    reason: string
  }
  priority_load: Array<{
    kind: 'space' | 'component' | 'command' | 'artifact' | 'task_memory' | 'relation' | 'handoff' | 'session_gold'
    label: string
    reason: string
    confidence: number
  }>
  compression_plan: {
    send_full: string[]
    summarize: string[]
    omit: string[]
  }
  validation_plan: {
    commands: string[]
    confidence_floor: number
    requires_human_confirmation: boolean
  }
  learning_contract: {
    capture_outcome: true
    update_space_pack: boolean
    promote_artifact_after_success: boolean
    refresh_folder_map_on_drift: boolean
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceExecutionDoctrineProjection {
  schema_version: 'atlas.awis.workspace_execution_doctrine_projection.v1'
  source: 'local_awis_execution_doctrine_compiler'
  maturity: 'new' | 'learning' | 'stable' | 'battle_tested'
  doctrine_drivers: Array<{
    name: 'TDD' | 'CDD' | 'FDD' | 'UXD' | 'RiskDD' | 'DocsDD' | 'PerformanceDD' | 'SecurityDD' | 'EvidenceDD'
    applies_to: Array<AwisWorkspaceTaskContextProjection['task_kind']>
    required: boolean
    gate: string
    reason: string
  }>
  preflight: {
    required_before_execution: string[]
    human_responsibility: string[]
    automation: string[]
  }
  command_policy: {
    trusted: string[]
    revalidate: string[]
    avoid: string[]
  }
  learning_contract: {
    record_outcome: true
    attach_component_keys: true
    promote_after_success: string[]
    demote_after_failure: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    external_side_effects_allowed: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceSelfImprovementProjection {
  schema_version: 'atlas.awis.workspace_self_improvement_projection.v1'
  source: 'local_awis_self_improvement_compiler'
  readiness_score: number
  improvement_queue: Array<{
    action: 'promote_command' | 'demote_context' | 'refresh_folder_map' | 'update_space_pack' | 'preserve_artifact' | 'transfer_learning' | 'record_outcome'
    label: string
    reason: string
    priority: 'high' | 'medium' | 'low'
    evidence: string[]
  }>
  promotion_policy: {
    promote_when: string[]
    demote_when: string[]
    transfer_when: string[]
  }
  next_review: {
    metrics: string[]
    validate_with: string[]
    human_confirmation_required: boolean
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    external_side_effects_allowed: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceMemoryFreshnessProjection {
  schema_version: 'atlas.awis.workspace_memory_freshness_projection.v1'
  source: 'local_awis_memory_freshness_guard'
  freshness_score: number
  state: 'fresh' | 'warm' | 'stale' | 'cold'
  scan_age_days: number | null
  interaction_age_days: number | null
  evidence: {
    hot: string[]
    revalidate: string[]
    missing: string[]
  }
  promotion_gate: {
    can_promote_commands: boolean
    can_promote_spaces: boolean
    required_before_promotion: string[]
  }
  next_refresh: {
    actions: string[]
    reason: string
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    external_side_effects_allowed: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceRetentionProjection {
  schema_version: 'atlas.awis.workspace_retention_projection.v1'
  source: 'local_awis_retention_governor'
  readiness_score: number
  policy: {
    mode: 'conservative' | 'balanced' | 'aggressive'
    reason: string
    max_hot_items: number
  }
  lifecycle: {
    keep_hot: string[]
    promote: string[]
    revalidate: string[]
    drop_or_summarize: string[]
  }
  stale_signals: string[]
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    external_side_effects_allowed: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceMemoryConsolidationProjection {
  schema_version: 'atlas.awis.workspace_memory_consolidation_projection.v1'
  source: 'local_awis_memory_consolidator'
  readiness_score: number
  compaction_policy: {
    mode: 'strict' | 'balanced' | 'expansive'
    reason: string
    max_seed_items: number
  }
  next_session_seed: string[]
  consolidate: {
    promote_to_gold: string[]
    rehearse_next: string[]
    archive_as_artifact: string[]
    summarize_only: string[]
    revalidate: string[]
    never_promote: string[]
  }
  learning_loop: {
    capture_after_send: string[]
    recalibrate_after_failure: string[]
    refresh_when: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    external_side_effects_allowed: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceStartupOrchestrationProjection {
  schema_version: 'atlas.awis.workspace_startup_orchestration_projection.v1'
  source: 'local_awis_startup_orchestrator'
  readiness_score: number
  launch_mode: 'guarded' | 'warm' | 'deep'
  startup_sequence: Array<{
    step: 'restore' | 'load' | 'validate' | 'compose' | 'learn'
    label: string
    source: 'space' | 'artifact' | 'kernel' | 'retention' | 'gold' | 'graph' | 'memory'
    required: boolean
  }>
  context_budget: {
    max_items: number
    prefer_summary: boolean
    reason: string
  }
  revalidation_gate: {
    required_before_send: string[]
    can_autoload: string[]
    needs_human_confirmation: boolean
  }
  learning_loop: {
    capture_outcome: true
    update_memory: true
    update_space_pack: boolean
    preserve_artifact_after_success: boolean
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    external_side_effects_allowed: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspacePreflightProjection {
  schema_version: 'atlas.awis.workspace_preflight_projection.v1'
  source: 'local_awis_preflight_compiler'
  readiness_score: number
  mode: 'blocked' | 'guarded' | 'ready'
  gates: Array<{
    gate: 'context' | 'evidence' | 'impact' | 'validation' | 'human' | 'learning'
    status: 'ready' | 'warn' | 'blocked'
    label: string
    required: boolean
    evidence: string[]
  }>
  execution_lanes: {
    before_send: string[]
    before_execution: string[]
    after_success: string[]
    after_failure: string[]
  }
  promotion_contract: {
    promote_when: string[]
    demote_when: string[]
    preserve_as_artifact: boolean
    update_space_pack: boolean
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    external_side_effects_allowed: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceTwinProjection {
  schema_version: 'atlas.awis.workspace_twin_projection.v1'
  source: 'local_awis_workspace_twin_compiler'
  workspace_id: string
  readiness_score: number
  stale: boolean
  hashes: {
    genome_hash: string
    code_map_hash: string
    command_registry_hash: string
    risk_map_hash: string
  }
  genome: {
    stack: string[]
    apps: string[]
    owner_docs: string[]
    commands: string[]
    risk_zones: string[]
    test_families: string[]
  }
  live_map: {
    components: Array<{
      key: string
      role: string
      maturity: 'new' | 'learning' | 'stable' | 'battle_tested'
      confidence: number
    }>
    connections: string[]
    fragile_areas: string[]
  }
  context_autopilot: {
    load_first: string[]
    summarize: string[]
    validate: string[]
    avoid: string[]
    reason: string
  }
  learning_loop: {
    learned_from_outcomes: string[]
    next_refresh: string[]
    reuse_next_session: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    external_side_effects_allowed: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceLaunchContractProjection {
  schema_version: 'atlas.awis.workspace_launch_contract_projection.v1'
  source: 'local_awis_launch_contract_compiler'
  readiness_score: number
  launch_mode: 'guarded' | 'warm' | 'deep'
  seed_hash: string
  startup_contract: {
    never_start_cold: true
    first_load: string[]
    validate_before_trust: string[]
    summarize_only: string[]
    avoid_loading: string[]
    promote_after_success: string[]
    demote_after_failure: string[]
    preserve_artifact_after_success: boolean
    update_space_pack: boolean
    needs_human_confirmation: boolean
  }
  automation_contract: {
    before_send: string[]
    after_success: string[]
    after_failure: string[]
    maintenance_actions: string[]
  }
  recovery_contract: {
    demote_context: string[]
    safe_resume: string[]
    reason: string
  }
  human_contract: {
    owns: string[]
    confirm_before: string[]
    do_not_delegate: string[]
  }
  next_conversation: {
    load_order: string[]
    context_budget: {
      max_items: number
      prefer_summary: boolean
      reason: string
    }
    provider_note: string
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    external_side_effects_allowed: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceEvolutionPattern {
  label: string
  kind: 'signal' | 'language' | 'command' | 'failure'
  seen_in_workspaces: number
  total_seen: number
  recommended_use: string
}

export interface AwisWorkspaceEvolutionProjection {
  schema_version: 'atlas.awis.workspace_evolution_projection.v1'
  source: 'local_abstract_workspace_memories'
  workspace_count: number
  current_workspace_seen: boolean
  patterns: AwisWorkspaceEvolutionPattern[]
  failure_signatures: AwisWorkspaceEvolutionPattern[]
  transfer_policy: {
    privacy_level: 'abstracted'
    raw_workspace_names_returned: false
    raw_paths_returned: false
    raw_source_returned: false
    apply_only_when_stack_matches: true
  }
}

export interface AwisWorkspaceRelationProjection {
  schema_version: 'atlas.awis.workspace_relation_projection.v1'
  source: 'local_provider_safe_workspace_memories'
  workspace_count: number
  current_workspace_seen: boolean
  related_workspaces: Array<{
    workspace_hint: string
    overlap_score: number
    shared_signals: string[]
    shared_languages: string[]
    shared_commands: string[]
    shared_context_gold: string[]
    shared_validation_plans: string[]
    shared_recovery_patterns: string[]
    shared_spaces: string[]
    shared_space_brain: string[]
    shared_live_memory: string[]
    shared_priority_load: string[]
    recommended_transfer: string[]
  }>
  transfer_matrix: Array<{
    workspace_hint: string
    reuse: string[]
    revalidate: string[]
    do_not_transfer: string[]
    confidence: number
  }>
  connection_contracts: Array<{
    workspace_hint: string
    relationship: 'shared_stack' | 'shared_command' | 'shared_context' | 'shared_recovery'
    load_when: string[]
    reuse: string[]
    validate: string[]
    never_transfer: string[]
    confidence: number
  }>
  transfer_policy: {
    privacy_level: 'provider_safe_hints'
    raw_workspace_names_returned: false
    raw_paths_returned: false
    raw_source_returned: false
    raw_conversation_returned: false
    apply_only_when_stack_matches: true
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceMeshProjection {
  schema_version: 'atlas.awis.workspace_mesh_projection.v1'
  source: 'local_awis_operational_mesh'
  readiness_score: number
  mesh_hash: string
  routes: Array<{
    route_id: string
    workspace_hint: string
    relationship: AwisWorkspaceRelationProjection['connection_contracts'][number]['relationship'] | 'local_component' | 'space_context' | 'artifact_replay'
    load_when: string[]
    reuse: string[]
    validate_with: string[]
    never_transfer: string[]
    linked_components: string[]
    linked_spaces: string[]
    confidence: number
  }>
  next_conversation: {
    load_order: string[]
    reuse_rules: string[]
    validate_with: string[]
    human_boundary: string[]
  }
  transfer_policy: {
    privacy_level: 'provider_safe_operational_mesh'
    raw_workspace_names_returned: false
    raw_paths_returned: false
    raw_source_returned: false
    raw_conversation_returned: false
    apply_only_when_stack_matches: true
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceCurrentTruthPackProjection {
  schema_version: 'atlas.awis.current_truth_pack_projection.v1'
  source: 'local_awis_truth_compiler'
  workspace_key: string
  readiness_score: number
  truth_hash: string
  current_truth: {
    must_keep: string[]
    active_components: string[]
    active_spaces: string[]
    active_artifacts: string[]
    proven_commands: string[]
    mesh_routes: string[]
  }
  proof: {
    evidence_refs: string[]
    validate_with: string[]
    stale_or_unproven: string[]
    human_boundary: string[]
  }
  next_conversation: {
    load_first: string[]
    summarize_only: string[]
    promote_when: string[]
    demote_when: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceRepositoryConstellationProjection {
  schema_version: 'atlas.awis.repository_constellation_projection.v1'
  source: 'local_awis_repository_constellation'
  readiness_score: number
  constellation_hash: string
  repositories: Array<{
    key: string
    role: string
    stack: string[]
    maturity: 'new' | 'learning' | 'stable' | 'battle_tested'
    manifests: string[]
    docs: string[]
    commands: string[]
    connected_to: string[]
    load_when: string[]
    summarize_when: string[]
    validate_with: string[]
    confidence: number
  }>
  bridges: Array<{
    from: string
    to: string
    reason: string
    shared_stack: string[]
    validation_bridge: string[]
    context_bridge: string[]
    confidence: number
  }>
  next_conversation: {
    load_first: string[]
    compare_when: string[]
    validate_with: string[]
    preserve_as_artifact: string[]
    human_boundary: string[]
  }
  learning_loop: {
    promote_when: string[]
    revalidate_when: string[]
    demote_when: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceLiveExecutionMemoryProjection {
  schema_version: 'atlas.awis.live_execution_memory_projection.v1'
  source: 'local_awis_live_execution_memory_compiler' | 'server_awis_live_execution_memory'
  readiness_score: number
  memory_hash: string
  startup_packet: {
    load_first: string[]
    use_as_summary: string[]
    validate_before_trust: string[]
    avoid: string[]
    human_boundary: string[]
  }
  automation_loop: {
    before_send: string[]
    after_success: string[]
    after_failure: string[]
    on_drift: string[]
  }
  promotion_rules: {
    promote_to_gold: string[]
    preserve_as_artifact: string[]
    revalidate: string[]
    demote: string[]
  }
  workspace_learning: {
    repositories: string[]
    components: string[]
    spaces: string[]
    artifacts: string[]
    commands: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    external_side_effects_allowed: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceTopologyProjection {
  schema_version: 'atlas.awis.workspace_topology_projection.v1'
  source: 'local_workspace_folder_map'
  root: {
    name: string
    is_git: boolean
    scan_truncated: boolean
    files_seen: number
  }
  components: Array<{
    key: string
    role: string
    stack: string[]
    manifests: string[]
    docs: string[]
    commands: Array<{
      command: string
      kind: string
      source: string
    }>
    confidence: number
  }>
  connections: Array<{
    from: string
    to: string
    reason: string
  }>
  execution_map: {
    test_commands: string[]
    build_commands: string[]
    dev_commands: string[]
    check_commands: string[]
  }
  knowledge_map: {
    load_first_docs: string[]
    manifest_refs: string[]
    command_sources: string[]
    validation_entrypoints: string[]
    runtime_entrypoints: string[]
    sensitive_zones: string[]
    summarize_only: string[]
  }
  safety: {
    raw_source_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceComponentMemoryProjection {
  schema_version: 'atlas.awis.workspace_component_memory_projection.v1'
  source: 'local_awis_component_memory_compiler'
  component_count: number
  strongest_components: Array<{
    key: string
    role: string
    maturity: 'new' | 'learning' | 'stable' | 'battle_tested'
    confidence: number
    stack: string[]
    load_first: string[]
    commands: string[]
    docs: string[]
    cautions: string[]
    outcome_memory: {
      success_count: number
      failure_count: number
      context_pack_applied_count: number
      last_used_at: string | null
      trusted_commands: string[]
      caution_signals: string[]
    }
    reuse_policy: {
      can_autoload: boolean
      validate_before_execution: boolean
      reason: string
    }
  }>
  routing_hints: Array<{
    signal: string
    component: string
    confidence: number
  }>
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceSemanticIndexProjection {
  schema_version: 'atlas.awis.workspace_semantic_index_projection.v1'
  source: 'local_awis_semantic_indexer'
  readiness_score: number
  query_aliases: Array<{
    alias: string
    intent: string
    component_keys: string[]
    task_kinds: AwisWorkspaceTaskContextProjection['task_kind'][]
    load: string[]
    validate: string[]
    confidence: number
  }>
  stack_map: Array<{
    stack: string
    component_keys: string[]
    commands: string[]
    docs: string[]
    confidence: number
  }>
  retrieval_policy: {
    load_full_when: string[]
    summarize_when: string[]
    revalidate_when: string[]
    never_load_raw: string[]
  }
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceImpactMapProjection {
  schema_version: 'atlas.awis.workspace_impact_map_projection.v1'
  source: 'local_awis_impact_mapper'
  readiness_score: number
  component_impacts: Array<{
    component_key: string
    change_signals: string[]
    affected_components: string[]
    validation_cascade: string[]
    risk: 'low' | 'medium' | 'high'
    reason: string
    confidence: number
  }>
  cross_workspace_impacts: Array<{
    workspace_hint: string
    trigger_components: string[]
    reuse: string[]
    revalidate: string[]
    confidence: number
  }>
  safety: {
    raw_source_included: false
    raw_conversation_included: false
    raw_message_content_included: false
    absolute_paths_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

export interface AwisWorkspaceSpacePackInput {
  title: string
  source?: 'local_space' | 'suggested_space'
  generated_at?: string
  thread_count: number
  message_count: number
  mode_count: number
  decision_count: number
  pending_count: number
  risk_count: number
  artifact_count: number
  scope_label?: string
  reusable_by: string[]
  recommended_use: string[]
  brain_contract?: {
    state?: 'vivo' | 'pronto' | 'leve'
    load_first?: string[]
    carry_forward?: string[]
    validate_before_use?: string[]
    automation_hooks?: string[]
    human_boundary?: string[]
    artifact_refs?: string[]
    evidence?: string[]
  }
  sessions: Array<{
    title: string
    mode: string
    message_count: number
    last_active_at: string | null
    provider: string | null
  }>
}

export interface AwisWorkspaceSpaceProjection {
  schema_version: 'atlas.awis.workspace_space_projection.v1'
  source: 'local_project_spaces'
  space_count: number
  total_session_count: number
  total_message_count: number
  spaces: Array<{
    name: string
    session_count: number
  }>
  continuity: {
    never_start_cold: true
    load_first: string[]
    carry_forward: string[]
    refresh_when: string[]
    provider_safe: true
  }
  strongest_spaces: Array<{
    title: string
    source: 'local_space' | 'suggested_space'
    session_count: number
    message_count: number
    mode_count: number
    decision_count: number
    pending_count: number
    risk_count: number
    artifact_count: number
    strength_score: number
    freshness: 'recente' | 'estavel' | 'frio'
    scope_label: string
    reusable_by: string[]
    recommended_use: string[]
    brain_contract: {
      state: 'vivo' | 'pronto' | 'leve'
      load_first: string[]
      carry_forward: string[]
      validate_before_use: string[]
      automation_hooks: string[]
      human_boundary: string[]
      artifact_refs: string[]
      evidence: string[]
    }
    continuity_contract: {
      load_when: string[]
      carry_forward: string[]
      refresh_when: string[]
    }
    session_summaries: Array<{
      title: string
      mode: string
      message_count: number
      last_active_at: string | null
      provider: string | null
    }>
  }>
  safety: {
    raw_conversation_included: false
    internal_ids_included: false
    bounded: true
    provider_safe: true
  }
}

const MAX_SIGNALS = 18
const MAX_LANGUAGES = 10
const MAX_COMMANDS = 14
const MAX_OBSERVATIONS = 10
const MAX_DRIFT_EVENTS = 12
const MAX_OPERATIONAL_SIGNALS = 14
const MAX_RECENT_OUTCOMES = 8
const MAX_RECENT_MAINTENANCE = 10
const MAX_EVOLUTION_PATTERNS = 8
const MAX_FAILURE_SIGNATURES = 4
const MAX_SPACE_PROJECTION_SPACES = 4
const MAX_SPACE_PROJECTION_SESSIONS = 4
const MAX_STARTUP_ITEMS = 10
const MAX_WORKSPACE_ARTIFACTS = 24
const MAX_TOPOLOGY_COMPONENTS = 8
const MAX_TOPOLOGY_CONNECTIONS = 10
const MAX_RELATED_WORKSPACES = 4

export function workspaceMemoryKey(workspacePath: string | null | undefined, fallbackSlug: string | null | undefined): string {
  const slug = fallbackSlug?.trim()
  if (slug) return slug.toLowerCase()
  const path = workspacePath?.trim().replaceAll('\\', '/') ?? ''
  const name = path.split('/').filter(Boolean).at(-1)
  return (name || 'workspace').toLowerCase()
}

export function loadAwisWorkspaceMemories(storage: Storage | null = safeLocalStorage()): Record<string, AwisWorkspaceMemorySnapshot> {
  if (!storage) return {}
  try {
    const raw = storage.getItem(AWIS_WORKSPACE_MEMORY_STORAGE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return normalizeAwisWorkspaceMemoryStore(parsed)
  } catch {
    return {}
  }
}

export function normalizeAwisWorkspaceMemoryStore(raw: unknown): Record<string, AwisWorkspaceMemorySnapshot> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const memories: Record<string, AwisWorkspaceMemorySnapshot> = {}
  for (const [key, value] of Object.entries(raw)) {
    const memory = normalizeMemory(value)
    if (memory) memories[key] = memory
  }
  return memories
}

export function mergeAwisWorkspaceMemoryStores(
  first: Record<string, AwisWorkspaceMemorySnapshot>,
  second: Record<string, AwisWorkspaceMemorySnapshot>,
): Record<string, AwisWorkspaceMemorySnapshot> {
  const merged: Record<string, AwisWorkspaceMemorySnapshot> = { ...first }
  for (const [key, memory] of Object.entries(second)) {
    const existingKey = Object.keys(merged).find((candidateKey) => {
      const candidate = merged[candidateKey]
      return legacyWorkspaceKeyMatches(key, candidateKey)
        || legacyWorkspaceKeyMatches(memory.workspaceKey, candidate.workspaceKey)
        || legacyWorkspaceKeyMatches(memory.rootPath, candidate.rootPath)
    }) ?? key
    const existing = merged[existingKey]
    if (!existing || awisWorkspaceMemorySortScore(memory) >= awisWorkspaceMemorySortScore(existing)) {
      if (existingKey !== key) delete merged[existingKey]
      merged[memory.workspaceKey || key] = memory
    }
  }
  return merged
}

export function saveAwisWorkspaceMemories(
  memories: Record<string, AwisWorkspaceMemorySnapshot>,
  storage: Storage | null = safeLocalStorage(),
) {
  if (!storage) return
  try {
    storage.setItem(AWIS_WORKSPACE_MEMORY_STORAGE, JSON.stringify(memories))
  } catch {
    /* ignore */
  }
}

export function loadAwisWorkspaceMemory(
  workspaceKeyValue: string,
  storage: Storage | null = safeLocalStorage(),
): AwisWorkspaceMemorySnapshot | null {
  const memories = loadAwisWorkspaceMemories(storage)
  return memories[workspaceKeyValue]
    ?? Object.entries(memories).find(([key, memory]) => (
      legacyWorkspaceKeyMatches(workspaceKeyValue, key) ||
      legacyWorkspaceKeyMatches(workspaceKeyValue, memory.workspaceKey) ||
      legacyWorkspaceKeyMatches(workspaceKeyValue, memory.rootPath)
    ))?.[1]
    ?? null
}

export function loadAwisWorkspaceLiveExecutionMemoryProjections(
  storage: Storage | null = safeLocalStorage(),
): Record<string, AwisWorkspaceLiveExecutionMemoryProjection> {
  if (!storage) return {}
  try {
    const raw = storage.getItem(AWIS_WORKSPACE_LIVE_EXECUTION_MEMORY_STORAGE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const projections: Record<string, AwisWorkspaceLiveExecutionMemoryProjection> = {}
    for (const [key, value] of Object.entries(parsed)) {
      const projection = normalizeLiveExecutionMemoryProjection(value)
      if (projection) projections[key] = projection
    }
    return projections
  } catch {
    return {}
  }
}

export function loadAwisWorkspaceLiveExecutionMemoryProjection(
  workspaceKeyValue: string,
  storage: Storage | null = safeLocalStorage(),
): AwisWorkspaceLiveExecutionMemoryProjection | null {
  const projections = loadAwisWorkspaceLiveExecutionMemoryProjections(storage)
  return projections[workspaceKeyValue]
    ?? Object.entries(projections).find(([key]) => legacyWorkspaceKeyMatches(workspaceKeyValue, key))?.[1]
    ?? null
}

export function loadAwisWorkspaceArtifacts(
  workspaceKeyValue: string,
  storage: Storage | null = safeLocalStorage(),
): AwisWorkspaceArtifactEntry[] {
  const artifacts = loadAwisWorkspaceArtifactStore(storage)
  const bucketKey = bucketKeyForWorkspace(artifacts, workspaceKeyValue)
  return bucketKey ? artifacts[bucketKey] ?? [] : []
}

export function normalizeAwisWorkspaceArtifactStore(raw: unknown): Record<string, AwisWorkspaceArtifactEntry[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const normalized: Record<string, AwisWorkspaceArtifactEntry[]> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue
    const artifacts = value
      .map(normalizeArtifact)
      .filter((item): item is AwisWorkspaceArtifactEntry => Boolean(item))
      .sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at))
      .slice(0, MAX_WORKSPACE_ARTIFACTS)
    if (artifacts.length > 0) normalized[key] = artifacts
  }
  return normalized
}

export function loadAwisWorkspaceArtifactStore(
  storage: Storage | null = safeLocalStorage(),
): Record<string, AwisWorkspaceArtifactEntry[]> {
  if (!storage) return {}
  try {
    const raw = storage.getItem(AWIS_WORKSPACE_ARTIFACT_STORAGE)
    if (!raw) return {}
    return normalizeAwisWorkspaceArtifactStore(JSON.parse(raw) as unknown)
  } catch {
    return {}
  }
}

export function mergeAwisWorkspaceArtifactStores(
  first: Record<string, AwisWorkspaceArtifactEntry[]>,
  second: Record<string, AwisWorkspaceArtifactEntry[]>,
): Record<string, AwisWorkspaceArtifactEntry[]> {
  const merged: Record<string, AwisWorkspaceArtifactEntry[]> = {}
  for (const key of unique([...Object.keys(first), ...Object.keys(second)])) {
    const byHash = new Map<string, AwisWorkspaceArtifactEntry>()
    for (const artifact of [...(first[key] ?? []), ...(second[key] ?? [])]) {
      const existing = byHash.get(artifact.artifact_hash)
      if (!existing || Date.parse(artifact.created_at) >= Date.parse(existing.created_at)) {
        byHash.set(artifact.artifact_hash, artifact)
      }
    }
    const artifacts = [...byHash.values()]
      .sort((left, right) => {
        const priorityDelta = right.manifest.replay_priority - left.manifest.replay_priority
        if (priorityDelta !== 0) return priorityDelta
        return Date.parse(right.created_at) - Date.parse(left.created_at)
      })
      .slice(0, MAX_WORKSPACE_ARTIFACTS)
    if (artifacts.length > 0) merged[key] = artifacts
  }
  return merged
}

export function saveAwisWorkspaceArtifactStore(
  artifacts: Record<string, AwisWorkspaceArtifactEntry[]>,
  storage: Storage | null = safeLocalStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(AWIS_WORKSPACE_ARTIFACT_STORAGE, JSON.stringify(normalizeAwisWorkspaceArtifactStore(artifacts)))
  } catch {
    /* ignore */
  }
}

export function loadAwisWorkspaceArtifactLakeSummary(
  workspaceKeyValue: string,
  storage: Storage | null = safeLocalStorage(),
): AwisWorkspaceArtifactLakeSummary | null {
  const artifacts = loadAwisWorkspaceArtifacts(workspaceKeyValue, storage)
  if (artifacts.length === 0) return null
  return summarizeAwisWorkspaceArtifacts(workspaceKeyValue, artifacts)
}

export function loadAwisWorkspaceArtifactReplayProjection(
  workspaceKeyValue: string,
  storage: Storage | null = safeLocalStorage(),
): AwisWorkspaceArtifactReplayProjection | null {
  return buildAwisWorkspaceArtifactReplayProjection(loadAwisWorkspaceArtifacts(workspaceKeyValue, storage))
}

export function learnAwisWorkspaceMemory(
  previous: AwisWorkspaceMemorySnapshot | null,
  snapshot: AtlasWorkspaceBrainSnapshot,
  workspaceKeyValue: string,
): AwisWorkspaceMemoryUpdate {
  const now = snapshot.scannedAt || new Date().toISOString()
  const fingerprint = workspaceBrainFingerprint(snapshot)
  const signals = snapshot.signals.slice(0, MAX_SIGNALS)
  const languages = snapshot.languages.map((language) => language.label).slice(0, MAX_LANGUAGES)
  const commands = snapshot.commands.map((command) => command.command).slice(0, MAX_COMMANDS)
  const learned: string[] = []
  const changed: string[] = []

  const memory: AwisWorkspaceMemorySnapshot = {
    schemaVersion: 'atlas.awis.workspace_memory.v1',
    workspaceKey: workspaceKeyValue,
    workspaceName: snapshot.rootName,
    rootPath: snapshot.rootPath,
    firstSeenAt: previous?.firstSeenAt ?? now,
    lastSeenAt: now,
    scanCount: (previous?.scanCount ?? 0) + 1,
    lastFingerprint: fingerprint,
    stableSignals: mergeSignals(previous?.stableSignals ?? [], signals, now, learned),
    stableLanguages: mergeSignals(previous?.stableLanguages ?? [], languages, now, learned),
    stableCommands: mergeSignals(previous?.stableCommands ?? [], commands, now, learned),
    operationalSignals: previous?.operationalSignals?.slice(0, MAX_OPERATIONAL_SIGNALS) ?? [],
    interactionCount: previous?.interactionCount ?? 0,
    successCount: previous?.successCount ?? 0,
    failureCount: previous?.failureCount ?? 0,
    contextPackAppliedCount: previous?.contextPackAppliedCount ?? 0,
    lastInteractionAt: previous?.lastInteractionAt ?? null,
    recentOutcomes: previous?.recentOutcomes?.slice(0, MAX_RECENT_OUTCOMES) ?? [],
    recentMaintenance: previous?.recentMaintenance?.slice(0, MAX_RECENT_MAINTENANCE) ?? [],
    observations: buildObservations(snapshot, previous).concat(previous?.observations ?? []).slice(0, MAX_OBSERVATIONS),
    driftEvents: previous?.driftEvents?.slice(0, MAX_DRIFT_EVENTS) ?? [],
  }

  if (previous && previous.lastFingerprint !== fingerprint) {
    const drift = describeDrift(previous, snapshot, now)
    if (drift) {
      memory.driftEvents = [drift, ...memory.driftEvents].slice(0, MAX_DRIFT_EVENTS)
      changed.push(drift)
    }
  }

  return { memory, learned: unique(learned), changed: unique(changed) }
}

export function recordAwisWorkspaceInteraction(
  previous: AwisWorkspaceMemorySnapshot | null,
  input: AwisWorkspaceInteractionInput,
): AwisWorkspaceMemoryUpdate {
  const now = input.occurredAt || new Date().toISOString()
  const status = normalizeStatus(input.status)
  const failed = status === 'failed' || status === 'rejected' || status === 'cancelled' || status === 'send_failed'
  const learned: string[] = []
  const changed: string[] = []
  const operationalLabels = [
    `canal:${input.channel}`,
    input.contextPackApplied ? 'contexto aplicado' : 'sem context pack',
    input.taskKind && input.taskKind !== 'unknown' ? `tarefa:${input.taskKind}` : null,
    input.routeKey ? `rota:${input.routeKey}` : null,
    ...(input.contextGoldLabels ?? []).slice(0, 3).map((label) => `ouro:${label}`),
    ...(input.componentKeys ?? [])
      .map(sanitizeComponentKey)
      .filter(isString)
      .slice(0, 3)
      .map((componentKey) => `área:${componentKey}`),
    ...(input.spaceLabels ?? [])
      .map(sanitizeProviderSafeText)
      .filter(isString)
      .slice(0, 3)
      .map((space) => `space:${space}`),
    ...(input.spaceBrainLabels ?? [])
      .map(sanitizeProviderSafeText)
      .filter(isString)
      .slice(0, 4)
      .map((label) => `space-brain:${label}`),
    ...(input.liveMemoryLabels ?? [])
      .map(sanitizeProviderSafeText)
      .filter(isString)
      .slice(0, 2)
      .map((label) => `memória viva:${label}`),
    ...(input.priorityLoadLabels ?? [])
      .map(sanitizeProviderSafeText)
      .filter(isString)
      .slice(0, 3)
      .map((label) => `prioridade:${label}`),
    ...(input.validationCommands ?? [])
      .filter((command) => /test|tsc|lint|check|build/i.test(command))
      .slice(0, 2)
      .map((command) => `validação sugerida:${command}`),
    input.provider ? `provider:${input.provider}` : null,
  ].filter(isString)
  const baseMemory = previous ?? emptyMemory(input.workspaceKey, input.workspaceName, input.rootPath, now)
  const outcome: AwisWorkspaceMemoryOutcome = {
    occurredAt: now,
    channel: input.channel,
    status,
    provider: input.provider ?? null,
    model: input.model ?? null,
    latencyMs: typeof input.latencyMs === 'number' ? input.latencyMs : null,
    contextPackApplied: input.contextPackApplied,
    taskKind: normalizeTaskKind(input.taskKind),
    routeKey: sanitizeRouteKey(input.routeKey),
    routeLabel: input.routeLabel ? sanitizeProviderSafeText(input.routeLabel).slice(0, 120) : null,
    contextGoldLabels: normalizeContextGoldLabels(input.contextGoldLabels),
    validationCommands: normalizeStringList(input.validationCommands, MAX_STARTUP_ITEMS),
    componentKeys: normalizeComponentKeys(input.componentKeys),
    spaceLabels: normalizeStringList(input.spaceLabels, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    spaceBrainLabels: normalizeStringList(input.spaceBrainLabels, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    liveMemoryLabels: normalizeStringList(input.liveMemoryLabels, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    priorityLoadLabels: normalizeStringList(input.priorityLoadLabels, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
  }
  const memory: AwisWorkspaceMemorySnapshot = {
    ...baseMemory,
    workspaceName: input.workspaceName || baseMemory.workspaceName,
    rootPath: input.rootPath || baseMemory.rootPath,
    lastSeenAt: now,
    operationalSignals: mergeSignals(baseMemory.operationalSignals, operationalLabels, now, learned).slice(0, MAX_OPERATIONAL_SIGNALS),
    interactionCount: baseMemory.interactionCount + 1,
    successCount: baseMemory.successCount + (failed ? 0 : 1),
    failureCount: baseMemory.failureCount + (failed ? 1 : 0),
    contextPackAppliedCount: baseMemory.contextPackAppliedCount + (input.contextPackApplied ? 1 : 0),
    lastInteractionAt: now,
    recentOutcomes: [outcome, ...baseMemory.recentOutcomes].slice(0, MAX_RECENT_OUTCOMES),
    observations: [
      failed ? 'último envio exigiu recuperação' : 'workspace usado em conversa real',
      input.contextPackApplied ? 'context pack AWIS aplicado em envio' : null,
      ...baseMemory.observations,
    ].filter(isString).slice(0, MAX_OBSERVATIONS),
  }
  if (failed) changed.push(`${now}: envio não concluído (${status})`)
  return { memory, learned: unique(learned), changed: unique(changed) }
}

export function recordAwisWorkspaceMaintenance(
  previous: AwisWorkspaceMemorySnapshot | null,
  input: AwisWorkspaceMaintenanceInput,
): AwisWorkspaceMemoryUpdate {
  const now = input.occurredAt || new Date().toISOString()
  const learned: string[] = []
  const changed: string[] = []
  const baseMemory = previous ?? emptyMemory(input.workspaceKey, input.workspaceName, input.rootPath, now)
  const label = sanitizeProviderSafeText(input.label).slice(0, 140) || input.action
  const event: AwisWorkspaceMaintenanceEvent = {
    occurredAt: now,
    action: input.action,
    label,
    status: input.status,
    reason: input.reason ? sanitizeProviderSafeText(input.reason).slice(0, 180) : null,
    evidence: normalizeStringList(input.evidence, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
  }
  const operationalLabels = [
    `manutenção:${input.action}`,
    `manutenção:${input.status}`,
    input.status === 'succeeded' ? `manutenção ok:${input.action}` : null,
    event.evidence[0] ? `manutenção evidência:${event.evidence[0]}` : null,
  ].filter(isString)
  const memory: AwisWorkspaceMemorySnapshot = {
    ...baseMemory,
    workspaceName: input.workspaceName || baseMemory.workspaceName,
    rootPath: input.rootPath || baseMemory.rootPath,
    lastSeenAt: now,
    operationalSignals: mergeSignals(baseMemory.operationalSignals, operationalLabels, now, learned).slice(0, MAX_OPERATIONAL_SIGNALS),
    recentMaintenance: [event, ...(baseMemory.recentMaintenance ?? [])].slice(0, MAX_RECENT_MAINTENANCE),
    observations: [
      input.status === 'succeeded'
        ? `manutenção AWIS aplicada:${input.action}`
        : `manutenção AWIS ${input.status}:${input.action}`,
      ...baseMemory.observations,
    ].filter(isString).slice(0, MAX_OBSERVATIONS),
  }
  changed.push(`${now}: manutenção ${input.action} ${input.status}`)
  return { memory, learned: unique(learned), changed: unique(changed) }
}

export function saveAwisWorkspaceMemory(
  memory: AwisWorkspaceMemorySnapshot,
  storage: Storage | null = safeLocalStorage(),
) {
  if (!storage) return
  try {
    const memories = loadAwisWorkspaceMemories(storage)
    memories[memory.workspaceKey] = memory
    saveAwisWorkspaceMemories(memories, storage)
  } catch {
    /* ignore */
  }
}

export function saveAwisWorkspaceLiveExecutionMemoryProjection(
  workspaceKeyValue: string,
  projection: AwisWorkspaceLiveExecutionMemoryProjection | null,
  storage: Storage | null = safeLocalStorage(),
) {
  if (!storage || !projection) return
  const normalized = normalizeLiveExecutionMemoryProjection(projection)
  if (!normalized) return
  try {
    const projections = loadAwisWorkspaceLiveExecutionMemoryProjections(storage)
    projections[workspaceKeyValue] = normalized
    storage.setItem(AWIS_WORKSPACE_LIVE_EXECUTION_MEMORY_STORAGE, JSON.stringify(projections))
  } catch {
    /* ignore */
  }
}

export function buildAwisWorkspaceArtifact(
  pack: AwisWorkspaceContextPack,
  createdAt = new Date().toISOString(),
): AwisWorkspaceArtifactEntry | null {
  if (!pack.startup_snapshot) return null
  const manifest = buildAwisWorkspaceArtifactManifest(pack)
  const payload: AwisWorkspaceArtifactEntry['payload'] = {
    startup_snapshot: pack.startup_snapshot,
    startup_briefing: pack.startup_briefing,
    startup_playbook: pack.startup_playbook,
    continuity_projection: pack.continuity,
    automation_projection: pack.automation,
    confidence_projection: pack.confidence,
    living_graph_projection: pack.living_graph,
    session_gold_projection: pack.session_gold,
    context_kernel_projection: pack.context_kernel,
    execution_doctrine_projection: pack.execution_doctrine,
    provider_strategy_projection: pack.provider_strategy,
    task_router_projection: pack.task_router,
    self_improvement_projection: pack.self_improvement,
    memory_freshness_projection: pack.memory_freshness,
    retention_projection: pack.retention,
    memory_consolidation_projection: pack.memory_consolidation,
    startup_orchestration_projection: pack.startup_orchestration,
    preflight_projection: pack.preflight,
    workspace_twin_projection: pack.workspace_twin,
    launch_contract_projection: pack.launch_contract,
    next_session_brain_projection: pack.next_session_brain,
    learning_projection: pack.learning ?? null,
    topology_projection: pack.topology,
    component_memory_projection: pack.component_memory,
    semantic_index_projection: pack.semantic_index,
    impact_map_projection: pack.impact_map,
    space_projection: pack.spaces,
    evolution_projection: pack.evolution,
    relation_projection: pack.relations,
    workspace_mesh_projection: pack.workspace_mesh,
    current_truth_pack_projection: pack.current_truth_pack,
    repository_constellation_projection: pack.repository_constellation,
    live_execution_memory_projection: pack.live_execution_memory,
    memory_operational: pack.memory?.operational ?? null,
  }
  const artifactHash = `awis-${stableStringHash(JSON.stringify(payload))}`
  return {
    schema_version: 'atlas.awis.workspace_artifact.v1',
    artifact_type: 'startup_snapshot',
    workspace_key: pack.workspace.key,
    workspace_name: pack.workspace.name,
    artifact_hash: artifactHash,
    created_at: createdAt,
    title: `Partida AWIS · ${pack.workspace.name}`,
    summary: startupArtifactSummary(pack),
    manifest,
    payload,
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

export function saveAwisWorkspaceArtifact(
  artifact: AwisWorkspaceArtifactEntry,
  storage: Storage | null = safeLocalStorage(),
): AwisWorkspaceArtifactLakeSummary | null {
  if (!storage) return null
  try {
    const allArtifacts = loadAwisWorkspaceArtifactStore(storage)
    const current = Array.isArray(allArtifacts[artifact.workspace_key]) ? allArtifacts[artifact.workspace_key] : []
    if (current.some((item) => item.artifact_hash === artifact.artifact_hash)) {
      return summarizeAwisWorkspaceArtifacts(artifact.workspace_key, current)
    }
    const next = [
      artifact,
      ...current,
    ].slice(0, MAX_WORKSPACE_ARTIFACTS)
    allArtifacts[artifact.workspace_key] = next
    saveAwisWorkspaceArtifactStore(allArtifacts, storage)
    return summarizeAwisWorkspaceArtifacts(artifact.workspace_key, next)
  } catch {
    return null
  }
}

export function loadAwisWorkspaceSpaceProjections(
  storage: Storage | null = safeLocalStorage(),
): Record<string, AwisWorkspaceSpaceProjection> {
  if (!storage) return {}
  try {
    const raw = storage.getItem(AWIS_WORKSPACE_SPACE_PROJECTIONS_STORAGE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const projections: Record<string, AwisWorkspaceSpaceProjection> = {}
    for (const [key, value] of Object.entries(parsed)) {
      const projection = normalizeSpaceProjection(value)
      if (projection) projections[key] = projection
    }
    return projections
  } catch {
    return {}
  }
}

export function loadAwisWorkspaceSpaceProjection(
  workspaceKeyValue: string,
  storage: Storage | null = safeLocalStorage(),
): AwisWorkspaceSpaceProjection | null {
  const projections = loadAwisWorkspaceSpaceProjections(storage)
  return projections[workspaceKeyValue]
    ?? Object.entries(projections).find(([key]) => legacyWorkspaceKeyMatches(workspaceKeyValue, key))?.[1]
    ?? null
}

export function saveAwisWorkspaceSpaceProjection(
  workspaceKeyValue: string,
  projection: AwisWorkspaceSpaceProjection,
  storage: Storage | null = safeLocalStorage(),
) {
  if (!storage) return
  try {
    const projections = loadAwisWorkspaceSpaceProjections(storage)
    projections[workspaceKeyValue] = projection
    storage.setItem(AWIS_WORKSPACE_SPACE_PROJECTIONS_STORAGE, JSON.stringify(projections))
  } catch {
    /* ignore */
  }
}

export function workspaceBrainFingerprint(snapshot: AtlasWorkspaceBrainSnapshot): string {
  return [
    snapshot.rootPath,
    snapshot.filesSeen,
    snapshot.dirsSeen,
    snapshot.truncated ? 'truncated' : 'complete',
    snapshot.signals.slice().sort().join('|'),
    snapshot.languages.map((language) => `${language.label}:${language.count}`).join('|'),
    snapshot.commands.map((command) => command.command).sort().join('|'),
  ].join('::')
}

export function buildAwisWorkspaceContextPack(input: {
  workspaceKey: string
  workspaceName: string | null
  brain: AtlasWorkspaceBrainSnapshot | null
  memory: AwisWorkspaceMemorySnapshot | null
  evolution?: AwisWorkspaceEvolutionProjection | null
  relations?: AwisWorkspaceRelationProjection | null
  spaces?: AwisWorkspaceSpaceProjection | null
  artifactLake?: AwisWorkspaceArtifactLakeSummary | null
  artifactReplay?: AwisWorkspaceArtifactReplayProjection | null
  nextSessionBrain?: AwisWorkspaceNextSessionBrainProjection | null
  liveExecutionMemory?: AwisWorkspaceLiveExecutionMemoryProjection | null
  handoffPack?: AwisWorkspaceHandoffProjection | null
}): AwisWorkspaceContextPack | null {
  if (
    !input.brain &&
    !input.memory &&
    !input.evolution &&
    !input.relations &&
    !input.spaces &&
    !input.artifactLake &&
    !input.artifactReplay &&
    !input.nextSessionBrain &&
    !input.liveExecutionMemory &&
    !input.handoffPack
  ) return null
  const workspaceName = input.workspaceName?.trim()
    || input.memory?.workspaceName
    || input.brain?.rootName
    || input.workspaceKey
  const topology = buildAwisWorkspaceTopologyProjection(input.brain)
  const learning = buildAwisWorkspaceLearningProjection({
    memory: input.memory,
    topology,
    brain: input.brain,
  })
  const sessionGold = buildAwisWorkspaceSessionGoldProjection({
    memory: input.memory,
    learning,
  })
  const nextSessionBrain = input.nextSessionBrain ?? buildAwisWorkspaceLocalNextSessionBrainProjection({
    workspaceName,
    topology,
    memory: input.memory,
    learning,
    sessionGold,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
  })
  const startupSnapshot = buildAwisWorkspaceStartupSnapshot({
    workspaceName,
    brain: input.brain,
    topology,
    memory: input.memory,
    learning,
    evolution: input.evolution ?? null,
    relations: input.relations ?? null,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    liveExecutionMemory: input.liveExecutionMemory ?? null,
    nextSessionBrain,
    handoffPack: input.handoffPack ?? null,
  })
  const startupBriefing = buildAwisWorkspaceStartupBriefing({
    workspaceName,
    startupSnapshot,
    brain: input.brain,
    topology,
    memory: input.memory,
    learning,
    evolution: input.evolution ?? null,
    relations: input.relations ?? null,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    nextSessionBrain,
    handoffPack: input.handoffPack ?? null,
  })
  const startupPlaybook = buildAwisWorkspaceStartupPlaybook({
    workspaceName,
    startupSnapshot,
    startupBriefing,
    brain: input.brain,
    topology,
    memory: input.memory,
    learning,
    relations: input.relations ?? null,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    handoffPack: input.handoffPack ?? null,
  })
  const continuity = buildAwisWorkspaceContinuityProjection({
    workspaceName,
    startupBriefing,
    startupPlaybook,
    topology,
    memory: input.memory,
    learning,
    relations: input.relations ?? null,
    spaces: input.spaces ?? null,
    artifactLake: input.artifactLake ?? null,
    artifactReplay: input.artifactReplay ?? null,
    nextSessionBrain,
    handoffPack: input.handoffPack ?? null,
  })
  const automation = buildAwisWorkspaceAutomationProjection({
    startupBriefing,
    startupPlaybook,
    continuity,
    memory: input.memory,
    learning,
    relations: input.relations ?? null,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    handoffPack: input.handoffPack ?? null,
  })
  const confidence = buildAwisWorkspaceConfidenceProjection({
    memory: input.memory,
    learning,
    relations: input.relations ?? null,
    spaces: input.spaces ?? null,
    artifactLake: input.artifactLake ?? null,
    artifactReplay: input.artifactReplay ?? null,
    continuity,
    automation,
    handoffPack: input.handoffPack ?? null,
  })
  const livingGraph = buildAwisWorkspaceLivingGraphProjection({
    workspaceName,
    topology,
    learning,
    relations: input.relations ?? null,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    continuity,
    automation,
    confidence,
    nextSessionBrain,
    handoffPack: input.handoffPack ?? null,
  })
  const contextKernel = buildAwisWorkspaceContextKernelProjection({
    topology,
    learning,
    sessionGold,
    relations: input.relations ?? null,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    continuity,
    automation,
    confidence,
    livingGraph,
    nextSessionBrain,
    handoffPack: input.handoffPack ?? null,
  })
  const selfImprovement = buildAwisWorkspaceSelfImprovementProjection({
    memory: input.memory,
    learning,
    sessionGold,
    relations: input.relations ?? null,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    continuity,
    automation,
    confidence,
    contextKernel,
  })
  const memoryFreshness = buildAwisWorkspaceMemoryFreshnessProjection({
    brain: input.brain,
    memory: input.memory,
    artifactLake: input.artifactLake ?? null,
    artifactReplay: input.artifactReplay ?? null,
    confidence,
    selfImprovement,
  })
  const componentMemory = buildAwisWorkspaceComponentMemoryProjection({
    topology,
    memory: input.memory,
    learning,
    confidence,
    memoryFreshness,
    artifactReplay: input.artifactReplay ?? null,
  })
  const semanticIndex = buildAwisWorkspaceSemanticIndexProjection({
    topology,
    componentMemory,
    learning,
    sessionGold,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    memoryFreshness,
  })
  const impactMap = buildAwisWorkspaceImpactMapProjection({
    topology,
    componentMemory,
    semanticIndex,
    learning,
    relations: input.relations ?? null,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    memoryFreshness,
  })
  const executionDoctrine = buildAwisWorkspaceExecutionDoctrineProjection({
    memory: input.memory,
    learning,
    topology,
    componentMemory,
    contextKernel,
    confidence,
    memoryFreshness,
  })
  const providerStrategy = buildAwisWorkspaceProviderStrategyProjection({
    memory: input.memory,
    learning,
    executionDoctrine,
  })
  const taskRouter = buildAwisWorkspaceTaskRouterProjection({
    memory: input.memory,
    topology,
    componentMemory,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    contextKernel,
    executionDoctrine,
    providerStrategy,
    sessionGold,
    learning,
    continuity,
    startupPlaybook,
    memoryFreshness,
  })
  const retention = buildAwisWorkspaceRetentionProjection({
    memory: input.memory,
    memoryFreshness,
    sessionGold,
    artifactReplay: input.artifactReplay ?? null,
    continuity,
    confidence,
    contextKernel,
    selfImprovement,
  })
  const startupOrchestration = buildAwisWorkspaceStartupOrchestrationProjection({
    memory: input.memory,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    livingGraph,
    sessionGold,
    contextKernel,
    selfImprovement,
    retention,
    memoryFreshness,
  })
  const memoryConsolidation = buildAwisWorkspaceMemoryConsolidationProjection({
    memory: input.memory,
    learning,
    sessionGold,
    spaces: input.spaces ?? null,
    relations: input.relations ?? null,
    componentMemory,
    taskRouter,
    selfImprovement,
    memoryFreshness,
    retention,
    startupOrchestration,
    artifactReplay: input.artifactReplay ?? null,
  })
  const preflight = buildAwisWorkspacePreflightProjection({
    workspaceRootKnown: Boolean(input.brain?.rootPath || input.memory?.rootPath),
    executionDoctrine,
    startupOrchestration,
    memoryConsolidation,
    impactMap,
    semanticIndex,
    taskRouter,
    retention,
    memoryFreshness,
    componentMemory,
    contextKernel,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
  })
  const workspaceTwin = buildAwisWorkspaceTwinProjection({
    workspaceKey: input.workspaceKey,
    topology,
    componentMemory,
    semanticIndex,
    impactMap,
    executionDoctrine,
    memoryFreshness,
    sessionGold,
    artifactReplay: input.artifactReplay ?? null,
    preflight,
  })
  const launchContract = buildAwisWorkspaceLaunchContractProjection({
    startupOrchestration,
    preflight,
    workspaceTwin,
    memoryConsolidation,
    retention,
    contextKernel,
    automation,
    selfImprovement,
    providerStrategy,
    memoryFreshness,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
  })
  const workspaceMesh = buildAwisWorkspaceMeshProjection({
    workspaceKey: input.workspaceKey,
    relations: input.relations ?? null,
    topology,
    spaces: input.spaces ?? null,
    artifactReplay: input.artifactReplay ?? null,
    workspaceTwin,
    launchContract,
  })
  const currentTruthPack = buildAwisWorkspaceCurrentTruthPackProjection({
    workspaceKey: input.workspaceKey,
    topology,
    learning,
    sessionGold,
    spaces: input.spaces ?? null,
    artifactLake: input.artifactLake ?? null,
    artifactReplay: input.artifactReplay ?? null,
    continuity,
    contextKernel,
    memoryFreshness,
    retention,
    memoryConsolidation,
    startupOrchestration,
    preflight,
    workspaceTwin,
    launchContract,
    workspaceMesh,
    handoffPack: input.handoffPack ?? null,
  })
  const repositoryConstellation = buildAwisWorkspaceRepositoryConstellationProjection({
    topology,
    componentMemory,
    semanticIndex,
    impactMap,
    relations: input.relations ?? null,
    workspaceMesh,
    currentTruthPack,
    artifactReplay: input.artifactReplay ?? null,
    sessionGold,
    launchContract,
  })
  const liveExecutionMemory = input.liveExecutionMemory ?? buildAwisWorkspaceLiveExecutionMemoryProjection({
    topology,
    learning,
    sessionGold,
    spaces: input.spaces ?? null,
    artifactLake: input.artifactLake ?? null,
    artifactReplay: input.artifactReplay ?? null,
    continuity,
    automation,
    contextKernel,
    memoryFreshness,
    retention,
    memoryConsolidation,
    startupOrchestration,
    preflight,
    workspaceTwin,
    launchContract,
    nextSessionBrain,
    workspaceMesh,
    currentTruthPack,
    repositoryConstellation,
  })
  return {
    schema_version: 'atlas.awis.workspace_context_pack.v1',
    source: 'atlas_desktop_awis',
    workspace: {
      key: input.workspaceKey,
      name: workspaceName,
      root_path_known: Boolean(input.brain?.rootPath || input.memory?.rootPath),
    },
    folder_map: input.brain
      ? {
          status: input.brain.status,
          files_seen: input.brain.filesSeen,
          dirs_seen: input.brain.dirsSeen,
          truncated: input.brain.truncated,
          signals: input.brain.signals.slice(0, 12),
          languages: input.brain.languages.slice(0, 8).map((language) => language.label),
          important_files: input.brain.importantFiles.slice(0, 20).map((file) => ({
            path: file.path,
            kind: file.kind,
          })),
          commands: input.brain.commands.slice(0, 12).map((command) => ({
            command: command.command,
            kind: command.kind,
            source: command.source,
          })),
        }
      : null,
    memory: input.memory
      ? {
          scan_count: input.memory.scanCount,
          stable_signals: input.memory.stableSignals.slice(0, 12).map((signal) => signal.label),
          stable_languages: input.memory.stableLanguages.slice(0, 8).map((signal) => signal.label),
          stable_commands: input.memory.stableCommands.slice(0, 12).map((signal) => signal.label),
          latest_drift: input.memory.driftEvents[0] ?? null,
          observations: input.memory.observations.slice(0, 6),
          operational: {
            interaction_count: input.memory.interactionCount,
            success_count: input.memory.successCount,
            failure_count: input.memory.failureCount,
            context_pack_applied_count: input.memory.contextPackAppliedCount,
            last_interaction_at: input.memory.lastInteractionAt,
            recent_channels: unique(input.memory.recentOutcomes.map((outcome) => outcome.channel)).slice(0, 4),
            latest_status: input.memory.recentOutcomes[0]?.status ?? null,
            recent_maintenance: unique(input.memory.recentMaintenance.map((event) => `${event.action}:${event.status}:${event.label}`)).slice(0, 4),
            context_gold: buildContextGoldOperationalMemory(input.memory),
          },
        }
      : null,
    learning,
    session_gold: sessionGold,
    evolution: input.evolution ?? null,
    relations: input.relations ?? null,
    workspace_mesh: workspaceMesh,
    current_truth_pack: currentTruthPack,
    repository_constellation: repositoryConstellation,
    live_execution_memory: liveExecutionMemory,
    topology,
    component_memory: componentMemory,
    semantic_index: semanticIndex,
    impact_map: impactMap,
    spaces: input.spaces ?? null,
    startup_snapshot: startupSnapshot,
    startup_briefing: startupBriefing,
    startup_playbook: startupPlaybook,
    continuity,
    automation,
    confidence,
    living_graph: livingGraph,
    context_kernel: contextKernel,
    execution_doctrine: executionDoctrine,
    provider_strategy: providerStrategy,
    task_router: taskRouter,
    self_improvement: selfImprovement,
    memory_freshness: memoryFreshness,
    retention,
    memory_consolidation: memoryConsolidation,
    startup_orchestration: startupOrchestration,
    preflight,
    workspace_twin: workspaceTwin,
    launch_contract: launchContract,
    artifact_lake: input.artifactLake ?? null,
    artifact_replay: input.artifactReplay ?? null,
    next_session_brain: nextSessionBrain,
    handoff_pack: input.handoffPack ?? null,
    safety: {
      raw_source_included: false,
      bounded: true,
      provider_safe: true,
      cross_workspace_raw_context_included: false,
    },
  }
}

export function buildAwisWorkspaceArtifactReplayProjection(
  artifacts: AwisWorkspaceArtifactEntry[],
): AwisWorkspaceArtifactReplayProjection | null {
  const validArtifacts = artifacts
    .filter((artifact) => artifact.schema_version === 'atlas.awis.workspace_artifact.v1')
    .slice(0, MAX_WORKSPACE_ARTIFACTS)
  if (validArtifacts.length === 0) return null
  const replayArtifacts = [...validArtifacts].sort((a, b) => (
    b.manifest.replay_priority - a.manifest.replay_priority
    || b.manifest.quality_score - a.manifest.quality_score
    || Date.parse(b.created_at) - Date.parse(a.created_at)
  ))
  const startupGold = replayArtifacts.flatMap((artifact) => [artifact.payload.startup_snapshot])
  const startupBriefings = replayArtifacts
    .map((artifact) => artifact.payload.startup_briefing)
    .filter((briefing): briefing is AwisWorkspaceStartupBriefing => Boolean(briefing))
  const startupPlaybooks = replayArtifacts
    .map((artifact) => artifact.payload.startup_playbook)
    .filter((playbook): playbook is AwisWorkspaceStartupPlaybook => Boolean(playbook))
  const continuityProjections = replayArtifacts
    .map((artifact) => artifact.payload.continuity_projection)
    .filter((continuity): continuity is AwisWorkspaceContinuityProjection => Boolean(continuity))
  const automationProjections = replayArtifacts
    .map((artifact) => artifact.payload.automation_projection)
    .filter((automation): automation is AwisWorkspaceAutomationProjection => Boolean(automation))
  const confidenceProjections = replayArtifacts
    .map((artifact) => artifact.payload.confidence_projection)
    .filter((confidence): confidence is AwisWorkspaceConfidenceProjection => Boolean(confidence))
  const learningProjections = replayArtifacts
    .map((artifact) => artifact.payload.learning_projection)
    .filter((learning): learning is AwisWorkspaceLearningProjection => Boolean(learning))
  const topologyProjections = replayArtifacts
    .map((artifact) => artifact.payload.topology_projection)
    .filter((topology): topology is AwisWorkspaceTopologyProjection => Boolean(topology))
  const relationProjections = replayArtifacts
    .map((artifact) => artifact.payload.relation_projection)
    .filter((relations): relations is AwisWorkspaceRelationProjection => Boolean(relations))
  const meshProjections = replayArtifacts
    .map((artifact) => artifact.payload.workspace_mesh_projection)
    .filter((mesh): mesh is AwisWorkspaceMeshProjection => Boolean(mesh))
  const truthPackProjections = replayArtifacts
    .map((artifact) => artifact.payload.current_truth_pack_projection)
    .filter((truth): truth is AwisWorkspaceCurrentTruthPackProjection => Boolean(truth))
  const repositoryConstellationProjections = replayArtifacts
    .map((artifact) => artifact.payload.repository_constellation_projection)
    .filter((constellation): constellation is AwisWorkspaceRepositoryConstellationProjection => Boolean(constellation))
  const liveExecutionMemoryProjections = replayArtifacts
    .map((artifact) => artifact.payload.live_execution_memory_projection)
    .filter((memory): memory is AwisWorkspaceLiveExecutionMemoryProjection => Boolean(memory))
  const componentMemoryProjections = replayArtifacts
    .map((artifact) => artifact.payload.component_memory_projection)
    .filter((componentMemory): componentMemory is AwisWorkspaceComponentMemoryProjection => Boolean(componentMemory))
  const semanticIndexProjections = replayArtifacts
    .map((artifact) => artifact.payload.semantic_index_projection)
    .filter((semanticIndex): semanticIndex is AwisWorkspaceSemanticIndexProjection => Boolean(semanticIndex))
  const impactMapProjections = replayArtifacts
    .map((artifact) => artifact.payload.impact_map_projection)
    .filter((impactMap): impactMap is AwisWorkspaceImpactMapProjection => Boolean(impactMap))
  const livingGraphProjections = replayArtifacts
    .map((artifact) => artifact.payload.living_graph_projection)
    .filter((graph): graph is AwisWorkspaceLivingGraphProjection => Boolean(graph))
  const sessionGoldProjections = replayArtifacts
    .map((artifact) => artifact.payload.session_gold_projection)
    .filter((gold): gold is AwisWorkspaceSessionGoldProjection => Boolean(gold))
  const contextKernelProjections = replayArtifacts
    .map((artifact) => artifact.payload.context_kernel_projection)
    .filter((kernel): kernel is AwisWorkspaceContextKernelProjection => Boolean(kernel))
  const selfImprovementProjections = replayArtifacts
    .map((artifact) => artifact.payload.self_improvement_projection)
    .filter((self): self is AwisWorkspaceSelfImprovementProjection => Boolean(self))
  const memoryFreshnessProjections = replayArtifacts
    .map((artifact) => artifact.payload.memory_freshness_projection)
    .filter((freshness): freshness is AwisWorkspaceMemoryFreshnessProjection => Boolean(freshness))
  const retentionProjections = replayArtifacts
    .map((artifact) => artifact.payload.retention_projection)
    .filter((retention): retention is AwisWorkspaceRetentionProjection => Boolean(retention))
  const memoryConsolidationProjections = replayArtifacts
    .map((artifact) => artifact.payload.memory_consolidation_projection)
    .filter((consolidation): consolidation is AwisWorkspaceMemoryConsolidationProjection => Boolean(consolidation))
  const startupOrchestrationProjections = replayArtifacts
    .map((artifact) => artifact.payload.startup_orchestration_projection)
    .filter((orchestration): orchestration is AwisWorkspaceStartupOrchestrationProjection => Boolean(orchestration))
  const preflightProjections = replayArtifacts
    .map((artifact) => artifact.payload.preflight_projection)
    .filter((preflight): preflight is AwisWorkspacePreflightProjection => Boolean(preflight))
  const workspaceTwinProjections = replayArtifacts
    .map((artifact) => artifact.payload.workspace_twin_projection)
    .filter((twin): twin is AwisWorkspaceTwinProjection => Boolean(twin))
  const launchContractProjections = replayArtifacts
    .map((artifact) => artifact.payload.launch_contract_projection)
    .filter((contract): contract is AwisWorkspaceLaunchContractProjection => Boolean(contract))
  const nextSessionBrainProjections = replayArtifacts
    .map((artifact) => artifact.payload.next_session_brain_projection)
    .filter((brain): brain is AwisWorkspaceNextSessionBrainProjection => Boolean(brain))
  const promotedSpaceBrain = replayArtifacts.flatMap((artifact) => artifact.payload.memory_operational?.context_gold.space_brain.promoted ?? [])
    .map(sanitizeProviderSafeText)
    .filter(isString)
  const revalidateSpaceBrain = replayArtifacts.flatMap((artifact) => artifact.payload.memory_operational?.context_gold.space_brain.revalidate ?? [])
    .map(sanitizeProviderSafeText)
    .filter(isString)
  const coldStartSeed = buildAwisWorkspaceArtifactColdStartSeed({
    source: 'local_workspace_artifacts',
    artifactCount: validArtifacts.length,
    latestArtifactHash: replayArtifacts[0]?.artifact_hash ?? null,
    replayArtifacts,
    startupBriefings,
    startupPlaybooks,
    continuityProjections,
    automationProjections,
    learningProjections,
    topologyProjections,
    relationProjections,
    meshProjections,
    repositoryConstellationProjections,
    liveExecutionMemoryProjections,
    contextKernelProjections,
    memoryFreshnessProjections,
    retentionProjections,
    startupOrchestrationProjections,
    preflightProjections,
    workspaceTwinProjections,
    launchContractProjections,
    nextSessionBrainProjections,
  })
  return {
    schema_version: 'atlas.awis.workspace_artifact_replay_projection.v1',
    source: 'local_workspace_artifacts',
    artifact_count: validArtifacts.length,
    latest_artifact_hash: replayArtifacts[0]?.artifact_hash ?? null,
    cold_start_seed: coldStartSeed,
    reusable_startup_gold: {
      strongest_spaces: unique([
        ...replayArtifacts.flatMap((artifact) => artifact.manifest.linked_spaces.map((space) => `artifact-space:${space}`)),
        ...startupGold.flatMap((snapshot) => snapshot.startup_gold.strongest_spaces),
      ]).slice(0, MAX_STARTUP_ITEMS),
      reusable_patterns: unique([
        ...replayArtifacts.map((artifact) => `artifact-quality:${artifact.artifact_hash}:${artifact.manifest.quality_score}:${artifact.manifest.seed_hash}`),
        ...liveExecutionMemoryProjections.map((memory) => `live-memory:${memory.memory_hash}:${memory.readiness_score}`),
        ...liveExecutionMemoryProjections.flatMap((memory) => memory.startup_packet.load_first.map((item) => `live-load:${item}`)).slice(0, 6),
        ...liveExecutionMemoryProjections.flatMap((memory) => memory.promotion_rules.promote_to_gold.map((item) => `live-promote:${item}`)).slice(0, 4),
        ...repositoryConstellationProjections.map((constellation) => `repo-constellation:${constellation.constellation_hash}:${constellation.readiness_score}`),
        ...repositoryConstellationProjections.flatMap((constellation) => constellation.bridges.map((bridge) => `repo-bridge:${bridge.from}->${bridge.to}:${bridge.confidence}`)).slice(0, 6),
        ...repositoryConstellationProjections.flatMap((constellation) => constellation.repositories.map((repo) => `repo-node:${repo.key}:${repo.maturity}:${repo.confidence}`)).slice(0, 6),
        ...confidenceProjections.flatMap((confidence) => confidence.ranked.commands.map((item) => `confidence-command:${item.label}:${item.score}`)).slice(0, 2),
        ...memoryConsolidationProjections.flatMap((consolidation) => consolidation.next_session_seed.map((item) => `seed:${item}`)).slice(0, 4),
        ...promotedSpaceBrain.map((item) => `space-brain-gold:${item}`).slice(0, 6),
        ...revalidateSpaceBrain.map((item) => `space-brain-revalidate:${item}`).slice(0, 4),
        ...memoryFreshnessProjections.map((freshness) => `freshness:${freshness.state}:${freshness.freshness_score}`),
        ...componentMemoryProjections.flatMap((memory) => memory.strongest_components.map((component) => `component-memory:${component.key}:${component.maturity}:${component.confidence}`)).slice(0, 4),
        ...preflightProjections.flatMap((preflight) => preflight.gates.map((gate) => `preflight:${gate.gate}:${gate.status}:${gate.label}`)).slice(0, 4),
        ...replayArtifacts.flatMap((artifact) => artifact.manifest.load_first.map((item) => `artifact-load:${item}`)).slice(0, 6),
        ...replayArtifacts.flatMap((artifact) => artifact.manifest.validate_with.map((item) => `artifact-validate:${item}`)).slice(0, 6),
        ...replayArtifacts.flatMap((artifact) => artifact.manifest.promote_signals.map((item) => `artifact-promote:${item}`)).slice(0, 6),
        ...replayArtifacts.flatMap((artifact) => artifact.manifest.repository_hints.map((item) => `artifact-repo:${item}`)).slice(0, 6),
        ...relationProjections.flatMap((relations) => relations.connection_contracts.map((contract) => `repo-contract:${contract.workspace_hint}:${contract.relationship}:${contract.confidence}`)),
        ...relationProjections.flatMap((relations) => relations.connection_contracts.flatMap((contract) => (
          contract.reuse.map((item) => `repo-contract-reuse:${contract.workspace_hint}:${item}`)
        ))).slice(0, 4),
        ...meshProjections.map((mesh) => `mesh:${mesh.mesh_hash}:${mesh.readiness_score}`),
        ...meshProjections.flatMap((mesh) => mesh.routes.map((route) => `mesh-route:${route.workspace_hint}:${route.relationship}:${route.confidence}`)).slice(0, 6),
        ...meshProjections.flatMap((mesh) => mesh.next_conversation.reuse_rules.map((rule) => `mesh-reuse:${rule}`)).slice(0, 4),
        ...confidenceProjections.flatMap((confidence) => confidence.ranked.commands.map((item) => `confidence-command:${item.label}:${item.score}`)).slice(0, 2),
        ...confidenceProjections.flatMap((confidence) => confidence.decision_policy.prefer.map((item) => `confidence-prefer:${item}`)).slice(0, 2),
        ...livingGraphProjections.flatMap((graph) => graph.golden_path.map((item) => `graph-route:${item}`)).slice(0, 2),
        ...livingGraphProjections.flatMap((graph) => graph.nodes.map((node) => `graph-node:${node.kind}:${node.label}`)).slice(0, 3),
        ...continuityProjections.flatMap((continuity) => continuity.restore_priority.map((item) => `restore:${item.kind}:${item.label}`)).slice(0, 3),
        ...sessionGoldProjections.flatMap((gold) => gold.strongest_outcomes.map((outcome) => `session-gold:${outcome.label}:${outcome.confidence}`)).slice(0, 3),
        ...sessionGoldProjections.flatMap((gold) => gold.proven_commands.map((command) => `proven-command:${command.command}:${command.success_count}`)).slice(0, 3),
        ...contextKernelProjections.flatMap((kernel) => kernel.priority_load.map((item) => `kernel-load:${item.kind}:${item.label}:${item.confidence}`)).slice(0, 4),
        ...contextKernelProjections.map((kernel) => `kernel-budget:${kernel.budget.mode}:${kernel.readiness_score}`),
        ...selfImprovementProjections.flatMap((self) => self.improvement_queue.map((item) => `self-improve:${item.action}:${item.label}:${item.priority}`)).slice(0, 4),
        ...impactMapProjections.flatMap((impact) => impact.component_impacts.map((item) => `impact:${item.component_key}:${item.affected_components.join('+')}:${item.risk}`)).slice(0, 4),
        ...memoryFreshnessProjections.map((freshness) => `freshness:${freshness.state}:${freshness.freshness_score}`),
        ...memoryFreshnessProjections.flatMap((freshness) => freshness.evidence.hot.map((item) => `fresh-hot:${item}`)).slice(0, 3),
        ...startupGold.flatMap((snapshot) => snapshot.startup_gold.recent_channels.map((channel) => `startup-channel:${channel}`)).slice(0, 2),
        ...componentMemoryProjections.flatMap((memory) => memory.strongest_components.map((component) => `component-memory:${component.key}:${component.maturity}:${component.confidence}`)).slice(0, 4),
        ...semanticIndexProjections.flatMap((semantic) => semantic.query_aliases.map((alias) => `semantic:${alias.alias}:${alias.component_keys.join('+')}:${alias.confidence}`)).slice(0, 4),
        ...retentionProjections.flatMap((retention) => retention.lifecycle.keep_hot.map((item) => `retention-keep:${item}`)).slice(0, 3),
        ...retentionProjections.flatMap((retention) => retention.lifecycle.revalidate.map((item) => `retention-revalidate:${item}`)).slice(0, 3),
        ...startupOrchestrationProjections.flatMap((orchestration) => orchestration.startup_sequence.map((item) => `orchestrate:${item.step}:${item.source}:${item.label}`)).slice(0, 4),
        ...startupOrchestrationProjections.map((orchestration) => `launch-mode:${orchestration.launch_mode}:${orchestration.readiness_score}`),
        ...preflightProjections.flatMap((preflight) => preflight.gates.map((gate) => `preflight:${gate.gate}:${gate.status}:${gate.label}`)).slice(0, 4),
        ...preflightProjections.map((preflight) => `preflight-mode:${preflight.mode}:${preflight.readiness_score}`),
        ...workspaceTwinProjections.flatMap((twin) => twin.genome.apps.map((app) => `twin-app:${app}:${twin.readiness_score}`)).slice(0, 4),
        ...workspaceTwinProjections.flatMap((twin) => twin.genome.test_families.map((family) => `twin-test:${family}`)).slice(0, 3),
        ...workspaceTwinProjections.map((twin) => `twin-hash:${twin.hashes.genome_hash}`),
        ...launchContractProjections.flatMap((contract) => contract.startup_contract.first_load.map((item) => `launch-load:${item}`)).slice(0, 4),
        ...launchContractProjections.flatMap((contract) => contract.automation_contract.maintenance_actions.map((item) => `launch-maintain:${item}`)).slice(0, 3),
        ...launchContractProjections.map((contract) => `launch-contract:${contract.launch_mode}:${contract.readiness_score}:${contract.seed_hash}`),
        ...nextSessionBrainProjections.flatMap((brain) => brain.load_order.map((item) => `brain-load:${item}`)).slice(0, 4),
        ...nextSessionBrainProjections.flatMap((brain) => brain.focused_repositories.map((repo) => `brain-repo:${repo.repo_key}:${repo.score}`)).slice(0, 4),
        ...nextSessionBrainProjections.map((brain) => `brain-seed:${brain.source}:${brain.readiness_score ?? 0}:${brain.brain_hash ?? 'no-hash'}`),
        ...truthPackProjections.map((truth) => `truth-pack:${truth.truth_hash}:${truth.readiness_score}`),
        ...truthPackProjections.flatMap((truth) => truth.current_truth.must_keep.map((item) => `truth-keep:${item}`)).slice(0, 6),
        ...truthPackProjections.flatMap((truth) => truth.current_truth.proven_commands.map((item) => `truth-command:${item}`)).slice(0, 4),
        ...memoryConsolidationProjections.flatMap((consolidation) => consolidation.next_session_seed.map((item) => `seed:${item}`)).slice(0, 4),
        ...memoryConsolidationProjections.flatMap((consolidation) => consolidation.consolidate.promote_to_gold.map((item) => `consolidate-gold:${item}`)).slice(0, 3),
        ...semanticIndexProjections.flatMap((semantic) => semantic.stack_map.map((stack) => `stack:${stack.stack}:${stack.component_keys.join('+')}:${stack.confidence}`)).slice(0, 3),
        ...startupPlaybooks.flatMap((playbook) => playbook.context_loading.must_load.map((item) => `playbook:${item}`)).slice(0, 1),
        ...startupBriefings.flatMap((briefing) => briefing.focus.load_sequence.map((item) => `load:${item}`)).slice(0, 1),
        ...learningProjections.map((learning) => `maturity:${learning.maturity}`),
        ...learningProjections.flatMap((learning) => learning.task_memory.task_kinds.map((taskKind) => `task:${taskKind}`)),
        ...topologyProjections.flatMap((topology) => topology.components.map((component) => `component:${component.key}:${component.role}`)).slice(0, 1),
        ...continuityProjections.flatMap((continuity) => continuity.hot_context.task_kinds.map((taskKind) => `continuity-task:${taskKind}`)),
        ...automationProjections.flatMap((automation) => automation.maintenance_queue.map((item) => `auto:${item.action}:${item.priority}`)).slice(0, 2),
        ...startupPlaybooks.flatMap((playbook) => playbook.collaboration.related_workspace_hints.map((item) => `related:${item}`)),
        ...learningProjections.flatMap((learning) => learning.trusted_commands.map((command) => `trusted:${command}`)),
        ...learningProjections.flatMap((learning) => learning.task_memory.trusted_task_commands.map((command) => `task-command:${command}`)),
        ...learningProjections.flatMap((learning) => learning.task_memory.validation_plans.map((plan) => `validation-plan:${plan.task_kind}:${plan.commands.join('+')}:${plan.confidence}`)).slice(0, 3),
        ...startupBriefings.flatMap((briefing) => briefing.context_gold.reusable_patterns),
        ...startupGold.flatMap((snapshot) => snapshot.startup_gold.reusable_patterns),
        ...topologyProjections.flatMap((topology) => topology.connections.map((connection) => `connection:${connection.from}->${connection.to}`)),
        ...relationProjections.flatMap((relations) => relations.related_workspaces.map((workspace) => `workspace-rel:${workspace.workspace_hint}:${workspace.overlap_score}`)),
        ...relationProjections.flatMap((relations) => relations.related_workspaces.flatMap((workspace) => (
          workspace.shared_validation_plans.map((plan) => `workspace-validation:${workspace.workspace_hint}:${plan}`)
        ))).slice(0, 3),
        ...relationProjections.flatMap((relations) => relations.related_workspaces.flatMap((workspace) => (
          workspace.shared_recovery_patterns.map((pattern) => `workspace-recovery:${workspace.workspace_hint}:${pattern}`)
        ))).slice(0, 3),
      ]).slice(0, MAX_STARTUP_ITEMS * 12),
      warnings: unique([
        ...relationProjections.flatMap((relations) => relations.connection_contracts.flatMap((contract) => (
          contract.never_transfer.map((item) => `repo-contract-never:${contract.workspace_hint}:${item}`)
        ))).slice(0, MAX_STARTUP_ITEMS),
        ...memoryConsolidationProjections.flatMap((consolidation) => consolidation.consolidate.never_promote.map((item) => `never-promote:${item}`)).slice(0, 4),
        ...revalidateSpaceBrain.map((item) => `space-brain-revalidate:${item}`).slice(0, 4),
        ...memoryFreshnessProjections.flatMap((freshness) => freshness.evidence.revalidate.map((item) => `freshness-revalidate:${item}`)),
        ...memoryFreshnessProjections.flatMap((freshness) => freshness.evidence.missing.map((item) => `freshness-missing:${item}`)),
        ...meshProjections.flatMap((mesh) => mesh.next_conversation.human_boundary.map((item) => `mesh-boundary:${item}`)).slice(0, 4),
        ...truthPackProjections.flatMap((truth) => truth.proof.stale_or_unproven.map((item) => `truth-stale:${item}`)).slice(0, 4),
        ...truthPackProjections.flatMap((truth) => truth.proof.human_boundary.map((item) => `truth-human:${item}`)).slice(0, 3),
        ...repositoryConstellationProjections.flatMap((constellation) => constellation.next_conversation.human_boundary.map((item) => `repo-human:${item}`)).slice(0, 4),
        ...liveExecutionMemoryProjections.flatMap((memory) => memory.startup_packet.human_boundary.map((item) => `live-human:${item}`)).slice(0, 4),
        ...liveExecutionMemoryProjections.flatMap((memory) => memory.startup_packet.avoid.map((item) => `live-avoid:${item}`)).slice(0, 4),
        ...startupGold.flatMap((snapshot) => snapshot.startup_gold.warnings),
        ...memoryFreshnessProjections.flatMap((freshness) => freshness.evidence.revalidate.map((item) => `freshness-revalidate:${item}`)),
        ...memoryFreshnessProjections.flatMap((freshness) => freshness.evidence.missing.map((item) => `freshness-missing:${item}`)),
        ...memoryConsolidationProjections.flatMap((consolidation) => consolidation.consolidate.never_promote.map((item) => `never-promote:${item}`)).slice(0, 4),
        ...replayArtifacts.flatMap((artifact) => artifact.manifest.caution_signals.map((item) => `artifact-caution:${item}`)).slice(0, 6),
        ...semanticIndexProjections.flatMap((semantic) => semantic.retrieval_policy.revalidate_when.map((item) => `semantic-revalidate:${item}`)).slice(0, 4),
        ...impactMapProjections.flatMap((impact) => impact.component_impacts.filter((item) => item.risk !== 'low').map((item) => `impact-risk:${item.component_key}:${item.risk}`)).slice(0, 4),
        ...preflightProjections.flatMap((preflight) => preflight.gates.filter((gate) => gate.status !== 'ready').map((gate) => `preflight-${gate.status}:${gate.gate}:${gate.label}`)).slice(0, 4),
        ...workspaceTwinProjections.flatMap((twin) => twin.genome.risk_zones.map((risk) => `twin-risk:${risk}`)).slice(0, 4),
        ...workspaceTwinProjections.filter((twin) => twin.stale).map(() => 'twin-stale:revalidar antes de executar'),
        ...launchContractProjections.flatMap((contract) => contract.startup_contract.avoid_loading.map((item) => `launch-avoid:${item}`)).slice(0, 4),
        ...launchContractProjections.flatMap((contract) => contract.human_contract.confirm_before.map((item) => `launch-human:${item}`)).slice(0, 4),
        ...nextSessionBrainProjections.flatMap((brain) => brain.context_loading.avoid_commands.map((item) => `brain-avoid:${item}`)).slice(0, 4),
        ...nextSessionBrainProjections.flatMap((brain) => brain.context_loading.flaky_commands.map((item) => `brain-flaky:${item}`)).slice(0, 4),
        ...componentMemoryProjections.flatMap((memory) => memory.strongest_components.flatMap((component) => component.cautions.map((caution) => `component-caution:${component.key}:${caution}`))),
      ]).slice(0, MAX_STARTUP_ITEMS * 2),
      next_best_actions: unique([
        ...replayArtifacts.flatMap((artifact) => artifact.manifest.validate_with.map((command) => `validar artifact: ${command}`)).slice(0, 3),
        ...promotedSpaceBrain.map((item) => `Space brain: preservar ${item}`).slice(0, 3),
        ...revalidateSpaceBrain.map((item) => `Space brain: revalidar ${item}`).slice(0, 3),
        ...replayArtifacts.flatMap((artifact) => artifact.manifest.load_first.map((item) => `reusar artifact: ${item}`)).slice(0, 3),
        ...startupGold.flatMap((snapshot) => snapshot.startup_gold.next_best_actions),
        ...memoryFreshnessProjections.flatMap((freshness) => freshness.next_refresh.actions.map((action) => `frescor: ${action}`)),
        ...semanticIndexProjections.flatMap((semantic) => semantic.retrieval_policy.load_full_when.map((item) => `semântico: ${item}`)).slice(0, 2),
        ...automationProjections.flatMap((automation) => automation.maintenance_queue.map((item) => `manter: ${item.label}`)).slice(0, 2),
        ...confidenceProjections.flatMap((confidence) => confidence.decision_policy.prefer.map((item) => `preferir: ${item}`)).slice(0, 2),
        ...startupBriefings.flatMap((briefing) => briefing.automation_plan.next_best_actions),
        ...continuityProjections.flatMap((continuity) => continuity.next_session_plan.first_load.map((item) => `restaurar: ${item}`)),
        ...startupPlaybooks.flatMap((playbook) => playbook.execution.primary_validation_commands.map((command) => `validar: ${command}`)),
        ...learningProjections.map((learning) => learning.next_learning_event),
        ...topologyProjections.map(() => 'carregar topologia do workspace antes de escolher arquivos'),
        ...livingGraphProjections.flatMap((graph) => graph.autopilot_hints.on_startup.map((hint) => `rota viva: ${hint}`)).slice(0, 2),
        ...sessionGoldProjections.flatMap((gold) => gold.next_session_hooks.before_send.map((hook) => `ouro: ${hook}`)).slice(0, 2),
        ...contextKernelProjections.flatMap((kernel) => kernel.priority_load.slice(0, 2).map((item) => `kernel: carregar ${item.kind}:${item.label}`)),
        ...selfImprovementProjections.flatMap((self) => self.improvement_queue.slice(0, 2).map((item) => `evoluir: ${item.action}:${item.label}`)),
        ...retentionProjections.flatMap((retention) => retention.lifecycle.revalidate.slice(0, 2).map((item) => `retenção: revalidar ${item}`)),
        ...startupOrchestrationProjections.flatMap((orchestration) => orchestration.startup_sequence.slice(0, 2).map((item) => `partida: ${item.step} ${item.label}`)),
        ...impactMapProjections.flatMap((impact) => impact.component_impacts.slice(0, 2).map((item) => `impacto: validar ${item.component_key}`)),
        ...preflightProjections.flatMap((preflight) => preflight.execution_lanes.before_send.slice(0, 2).map((item) => `pré-voo: ${item}`)),
        ...preflightProjections.flatMap((preflight) => preflight.execution_lanes.before_execution.slice(0, 2).map((item) => `pré-execução: ${item}`)),
        ...launchContractProjections.flatMap((contract) => contract.next_conversation.load_order.slice(0, 3).map((item) => `partida viva: ${item}`)),
        ...launchContractProjections.flatMap((contract) => contract.automation_contract.after_success.slice(0, 2).map((item) => `aprender: ${item}`)),
        ...relationProjections.flatMap((relations) => relations.connection_contracts.slice(0, 2).map((contract) => `conexão repo: validar ${contract.workspace_hint}`)),
        ...meshProjections.flatMap((mesh) => mesh.next_conversation.validate_with.slice(0, 2).map((item) => `mesh: validar ${item}`)),
        ...truthPackProjections.flatMap((truth) => truth.proof.validate_with.slice(0, 2).map((item) => `truth: validar ${item}`)),
        ...repositoryConstellationProjections.flatMap((constellation) => constellation.next_conversation.load_first.slice(0, 2).map((item) => `constelação: carregar ${item}`)),
        ...repositoryConstellationProjections.flatMap((constellation) => constellation.next_conversation.validate_with.slice(0, 2).map((item) => `constelação: validar ${item}`)),
        ...liveExecutionMemoryProjections.flatMap((memory) => memory.startup_packet.load_first.slice(0, 2).map((item) => `memória viva: carregar ${item}`)),
        ...liveExecutionMemoryProjections.flatMap((memory) => memory.automation_loop.after_success.slice(0, 2).map((item) => `memória viva: aprender ${item}`)),
        ...workspaceTwinProjections.flatMap((twin) => twin.context_autopilot.validate.slice(0, 2).map((item) => `twin: validar ${item}`)),
        ...workspaceTwinProjections.flatMap((twin) => twin.learning_loop.next_refresh.slice(0, 2).map((item) => `twin: atualizar ${item}`)),
        ...nextSessionBrainProjections.flatMap((brain) => brain.execution_priority.slice(0, 2).map((priority) => `brain: priorizar ${priority.command}`)),
        ...nextSessionBrainProjections.flatMap((brain) => brain.load_order.slice(0, 2).map((item) => `brain: carregar ${item}`)),
      ]).slice(0, MAX_STARTUP_ITEMS * 10),
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function buildAwisWorkspaceArtifactColdStartSeed(input: {
  source: AwisWorkspaceArtifactReplayProjection['source']
  artifactCount: number
  latestArtifactHash: string | null
  replayArtifacts: AwisWorkspaceArtifactEntry[]
  startupBriefings: AwisWorkspaceStartupBriefing[]
  startupPlaybooks: AwisWorkspaceStartupPlaybook[]
  continuityProjections: AwisWorkspaceContinuityProjection[]
  automationProjections: AwisWorkspaceAutomationProjection[]
  learningProjections: AwisWorkspaceLearningProjection[]
  topologyProjections: AwisWorkspaceTopologyProjection[]
  relationProjections: AwisWorkspaceRelationProjection[]
  meshProjections: AwisWorkspaceMeshProjection[]
  repositoryConstellationProjections: AwisWorkspaceRepositoryConstellationProjection[]
  liveExecutionMemoryProjections: AwisWorkspaceLiveExecutionMemoryProjection[]
  contextKernelProjections: AwisWorkspaceContextKernelProjection[]
  memoryFreshnessProjections: AwisWorkspaceMemoryFreshnessProjection[]
  retentionProjections: AwisWorkspaceRetentionProjection[]
  startupOrchestrationProjections: AwisWorkspaceStartupOrchestrationProjection[]
  preflightProjections: AwisWorkspacePreflightProjection[]
  workspaceTwinProjections: AwisWorkspaceTwinProjection[]
  launchContractProjections: AwisWorkspaceLaunchContractProjection[]
  nextSessionBrainProjections: AwisWorkspaceNextSessionBrainProjection[]
}): AwisWorkspaceArtifactReplayProjection['cold_start_seed'] {
  const loadOrder = unique([
    ...input.replayArtifacts.flatMap((artifact) => artifact.payload.memory_operational?.context_gold.space_brain.promoted.map((item) => `space-brain-gold:${item}`) ?? []),
    ...input.liveExecutionMemoryProjections.flatMap((memory) => memory.startup_packet.load_first),
    ...input.nextSessionBrainProjections.flatMap((brain) => brain.load_order),
    ...input.launchContractProjections.flatMap((contract) => contract.next_conversation.load_order),
    ...input.startupOrchestrationProjections.flatMap((orchestration) => orchestration.startup_sequence.map((item) => item.label)),
    ...input.startupBriefings.flatMap((briefing) => briefing.focus.load_sequence),
    ...input.startupPlaybooks.flatMap((playbook) => playbook.context_loading.must_load),
    ...input.contextKernelProjections.flatMap((kernel) => kernel.priority_load.map((item) => `${item.kind}:${item.label}`)),
    ...input.meshProjections.flatMap((mesh) => mesh.next_conversation.load_order),
    ...input.repositoryConstellationProjections.flatMap((constellation) => constellation.next_conversation.load_first),
    ...input.continuityProjections.flatMap((continuity) => continuity.next_session_plan.first_load),
    ...input.replayArtifacts.flatMap((artifact) => artifact.manifest.load_first),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const validateWith = unique([
    ...input.replayArtifacts.flatMap((artifact) => artifact.payload.memory_operational?.context_gold.space_brain.revalidate.map((item) => `space-brain:${item}`) ?? []),
    ...input.liveExecutionMemoryProjections.flatMap((memory) => memory.startup_packet.validate_before_trust),
    ...input.nextSessionBrainProjections.flatMap((brain) => brain.execution_priority.map((priority) => priority.command)),
    ...input.launchContractProjections.flatMap((contract) => contract.startup_contract.validate_before_trust),
    ...input.startupPlaybooks.flatMap((playbook) => playbook.execution.primary_validation_commands),
    ...input.preflightProjections.flatMap((preflight) => preflight.execution_lanes.before_execution),
    ...input.meshProjections.flatMap((mesh) => mesh.next_conversation.validate_with),
    ...input.repositoryConstellationProjections.flatMap((constellation) => constellation.next_conversation.validate_with),
    ...input.workspaceTwinProjections.flatMap((twin) => twin.context_autopilot.validate),
    ...input.learningProjections.flatMap((learning) => learning.trusted_commands),
    ...input.replayArtifacts.flatMap((artifact) => artifact.manifest.validate_with),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const contextSignals = unique([
    ...input.replayArtifacts.flatMap((artifact) => artifact.payload.memory_operational?.context_gold.space_brain.promoted.map((item) => `space-brain-gold:${item}`) ?? []),
    ...input.liveExecutionMemoryProjections.map((memory) => `live-memory:${memory.memory_hash}:${memory.readiness_score}`),
    ...input.liveExecutionMemoryProjections.flatMap((memory) => memory.startup_packet.use_as_summary),
    ...input.nextSessionBrainProjections.flatMap((brain) => brain.context_loading.command_hints),
    ...input.startupBriefings.flatMap((briefing) => briefing.context_gold.reusable_patterns),
    ...input.contextKernelProjections.flatMap((kernel) => kernel.priority_load.map((item) => item.reason)),
    ...input.learningProjections.map((learning) => `maturidade:${learning.maturity}`),
    ...input.memoryFreshnessProjections.map((freshness) => `frescor:${freshness.state}:${freshness.freshness_score}`),
    ...input.meshProjections.flatMap((mesh) => mesh.routes.map((route) => `mesh:${route.workspace_hint}:${route.relationship}:${route.confidence}`)),
    ...input.repositoryConstellationProjections.flatMap((constellation) => constellation.repositories.map((repo) => `repo:${repo.key}:${repo.maturity}:${repo.confidence}`)),
    ...input.repositoryConstellationProjections.flatMap((constellation) => constellation.bridges.map((bridge) => `bridge:${bridge.from}->${bridge.to}:${bridge.confidence}`)),
    ...input.topologyProjections.flatMap((topology) => topology.components.map((component) => `${component.key}:${component.role}`)),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const reuseSpaces = unique([
    ...input.replayArtifacts.flatMap((artifact) => artifact.payload.memory_operational?.context_gold.space_brain.promoted.map((item) => `brain:${item}`) ?? []),
    ...input.replayArtifacts.flatMap((artifact) => artifact.manifest.linked_spaces),
    ...input.continuityProjections.flatMap((continuity) => continuity.hot_context.spaces),
    ...input.startupBriefings.flatMap((briefing) => briefing.context_gold.strongest_spaces),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const repositoryHints = unique([
    ...input.liveExecutionMemoryProjections.flatMap((memory) => memory.workspace_learning.repositories),
    ...input.nextSessionBrainProjections.flatMap((brain) => brain.focused_repositories.map((repo) => repo.repo_key)),
    ...input.replayArtifacts.flatMap((artifact) => artifact.manifest.repository_hints),
    ...input.meshProjections.flatMap((mesh) => mesh.routes.map((route) => route.workspace_hint)),
    ...input.repositoryConstellationProjections.flatMap((constellation) => constellation.repositories.map((repo) => repo.key)),
    ...input.topologyProjections.flatMap((topology) => topology.components.map((component) => component.key)),
    ...input.relationProjections.flatMap((relations) => relations.related_workspaces.map((workspace) => workspace.workspace_hint)),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const automationHooks = unique([
    ...input.liveExecutionMemoryProjections.flatMap((memory) => memory.automation_loop.before_send.map((item) => `antes:${item}`)),
    ...input.liveExecutionMemoryProjections.flatMap((memory) => memory.automation_loop.after_success.map((item) => `sucesso:${item}`)),
    ...input.launchContractProjections.flatMap((contract) => contract.automation_contract.after_success),
    ...input.automationProjections.flatMap((automation) => automation.maintenance_queue.map((item) => `${item.action}:${item.label}`)),
    ...input.startupBriefings.flatMap((briefing) => briefing.automation_plan.next_best_actions),
    ...input.retentionProjections.flatMap((retention) => retention.lifecycle.revalidate.map((item) => `revalidar:${item}`)),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const warnings = unique([
    ...input.replayArtifacts.flatMap((artifact) => artifact.payload.memory_operational?.context_gold.space_brain.revalidate.map((item) => `space-brain-revalidate:${item}`) ?? []),
    ...input.liveExecutionMemoryProjections.flatMap((memory) => memory.startup_packet.avoid.map((item) => `live:${item}`)),
    ...input.nextSessionBrainProjections.flatMap((brain) => brain.context_loading.avoid_commands),
    ...input.launchContractProjections.flatMap((contract) => contract.startup_contract.avoid_loading),
    ...input.preflightProjections.flatMap((preflight) => preflight.gates.filter((gate) => gate.status !== 'ready').map((gate) => `${gate.gate}:${gate.label}`)),
    ...input.meshProjections.flatMap((mesh) => mesh.next_conversation.human_boundary),
    ...input.repositoryConstellationProjections.flatMap((constellation) => constellation.next_conversation.human_boundary),
    ...input.workspaceTwinProjections.flatMap((twin) => twin.genome.risk_zones),
    ...input.replayArtifacts.flatMap((artifact) => artifact.manifest.caution_signals),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const humanBoundary = unique([
    ...input.liveExecutionMemoryProjections.flatMap((memory) => memory.startup_packet.human_boundary),
    ...input.launchContractProjections.flatMap((contract) => contract.human_contract.confirm_before),
    ...input.meshProjections.flatMap((mesh) => mesh.next_conversation.human_boundary),
    ...input.repositoryConstellationProjections.flatMap((constellation) => constellation.next_conversation.human_boundary),
    ...input.nextSessionBrainProjections.flatMap((brain) => brain.execution_priority.filter((priority) => priority.requires_operator_approval).map((priority) => priority.command)),
    ...input.preflightProjections.flatMap((preflight) => preflight.execution_lanes.before_execution),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const readinessScore = normalizePercent(
    24
      + Math.min(18, input.artifactCount * 3)
      + Math.min(18, loadOrder.length * 2)
      + Math.min(16, validateWith.length * 2)
      + Math.min(12, contextSignals.length)
      + Math.min(12, repositoryHints.length * 2),
  )
  const seedPayload = {
    source: input.source,
    artifact: input.latestArtifactHash,
    loadOrder,
    validateWith,
    contextSignals,
    reuseSpaces,
    repositoryHints,
    warnings,
    humanBoundary,
  }
  return {
    schema_version: 'atlas.awis.artifact_cold_start_seed.v1',
    source: input.source,
    readiness_score: readinessScore,
    seed_hash: `cold-${stableStringHash(JSON.stringify(seedPayload))}`,
    load_order: loadOrder,
    validate_with: validateWith,
    context_signals: contextSignals,
    reuse_spaces: reuseSpaces,
    repository_hints: repositoryHints,
    automation_hooks: automationHooks,
    warnings,
    human_boundary: humanBoundary,
  }
}

export function buildAwisWorkspaceTopologyProjection(
  brain: AtlasWorkspaceBrainSnapshot | null | undefined,
): AwisWorkspaceTopologyProjection | null {
  if (!brain || brain.status !== 'ready') return null
  const componentMap = new Map<string, {
    key: string
    manifests: string[]
    docs: string[]
    commands: AwisWorkspaceTopologyProjection['components'][number]['commands']
    stack: string[]
  }>()
  const ensureComponent = (rawKey: string) => {
    const key = sanitizeComponentKey(rawKey)
    const existing = componentMap.get(key)
    if (existing) return existing
    const created = { key, manifests: [], docs: [], commands: [], stack: [] }
    componentMap.set(key, created)
    return created
  }

  for (const file of brain.importantFiles) {
    const path = sanitizeRelativePath(file.path)
    if (!path) continue
    const component = ensureComponent(componentKeyForPath(path))
    if (file.kind === 'documento') {
      component.docs.push(path)
    } else {
      component.manifests.push(path)
    }
    component.stack.push(...stackForPath(path))
  }

  for (const command of brain.commands) {
    const source = sanitizeRelativePath(command.source)
    if (!source) continue
    const component = ensureComponent(componentKeyForPath(source))
    component.commands.push({
      command: command.command.slice(0, 180),
      kind: command.kind.slice(0, 32),
      source,
    })
    component.stack.push(...stackForPath(source), ...stackForCommand(command.command))
  }

  if (componentMap.size === 0) return null
  const components = Array.from(componentMap.values())
    .map((component) => {
      const stack = unique(component.stack).slice(0, MAX_STARTUP_ITEMS)
      const manifests = unique(component.manifests).slice(0, MAX_STARTUP_ITEMS)
      const docs = unique(component.docs).slice(0, MAX_STARTUP_ITEMS)
      const commands = uniqueCommands(component.commands).slice(0, MAX_STARTUP_ITEMS)
      return {
        key: component.key,
        role: roleForComponent(component.key, stack, manifests, docs),
        stack,
        manifests,
        docs,
        commands,
        confidence: Math.min(100, 35 + stack.length * 12 + manifests.length * 10 + commands.length * 8 + docs.length * 4),
      }
    })
    .sort((a, b) => b.confidence - a.confidence || a.key.localeCompare(b.key))
    .slice(0, MAX_TOPOLOGY_COMPONENTS)
  const knowledgeMap = buildAwisWorkspaceTopologyKnowledgeMap(components, brain.truncated)

  return {
    schema_version: 'atlas.awis.workspace_topology_projection.v1',
    source: 'local_workspace_folder_map',
    root: {
      name: brain.rootName,
      is_git: brain.isGit,
      scan_truncated: brain.truncated,
      files_seen: brain.filesSeen,
    },
    components,
    connections: inferTopologyConnections(components),
    execution_map: {
      test_commands: commandsByKind(components, /test|typecheck|tsc/i),
      build_commands: commandsByKind(components, /build/i),
      dev_commands: commandsByKind(components, /dev|start|serve/i),
      check_commands: commandsByKind(components, /lint|check|typecheck|tsc/i),
    },
    knowledge_map: knowledgeMap,
    safety: {
      raw_source_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function buildAwisWorkspaceTopologyKnowledgeMap(
  components: AwisWorkspaceTopologyProjection['components'],
  scanTruncated: boolean,
): AwisWorkspaceTopologyProjection['knowledge_map'] {
  const docs = unique(components.flatMap((component) => component.docs).map(sanitizeRelativePath).filter(isString))
  const manifests = unique(components.flatMap((component) => component.manifests).map(sanitizeRelativePath).filter(isString))
  const commands = uniqueCommands(components.flatMap((component) => component.commands))
  const validationCommands = commands.filter((command) => /test|spec|vitest|jest|phpunit|tsc|lint|check/i.test(`${command.kind} ${command.command}`))
  const runtimeCommands = commands.filter((command) => /build|dev|start|serve|run|cargo|artisan/i.test(`${command.kind} ${command.command}`))
  const loadFirstDocs = docs
    .filter((path) => /agents\.md|readme|docs\/engineering-knowledge-base|knowledge|governance|awis|workspace/i.test(path))
    .slice(0, MAX_STARTUP_ITEMS)
  const sensitiveZones = unique([
    ...components
      .filter((component) => /auth|security|billing|payment|database|migration|secret|token|kernel|tauri|bridge|release|production/i.test([
        component.key,
        component.role,
        ...component.stack,
        ...component.manifests,
        ...component.docs,
        ...component.commands.map((command) => `${command.kind} ${command.command} ${command.source}`),
      ].join(' ')))
      .map((component) => component.key),
    ...manifests.filter((path) => /migration|database|auth|security|tauri|cargo|composer|package\.json/i.test(path)),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const summarizeOnly = unique([
    scanTruncated ? 'mapa local truncado' : null,
    ...components
      .filter((component) => component.confidence < 55)
      .map((component) => `área:${component.key}`),
  ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  return {
    load_first_docs: loadFirstDocs,
    manifest_refs: manifests.slice(0, MAX_STARTUP_ITEMS),
    command_sources: unique(commands.map((command) => sanitizeRelativePath(command.source)).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
    validation_entrypoints: unique(validationCommands.map((command) => command.command).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
    runtime_entrypoints: unique(runtimeCommands.map((command) => command.command).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
    sensitive_zones: sensitiveZones,
    summarize_only: summarizeOnly,
  }
}

export function buildAwisWorkspaceComponentMemoryProjection(input: {
  topology: AwisWorkspaceTopologyProjection | null
  memory: AwisWorkspaceMemorySnapshot | null
  learning: AwisWorkspaceLearningProjection | null
  confidence: AwisWorkspaceConfidenceProjection | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
}): AwisWorkspaceComponentMemoryProjection | null {
  const components = input.topology?.components ?? []
  if (components.length === 0) return null
  const trustedCommands = new Set([
    ...(input.learning?.trusted_commands ?? []),
    ...(input.learning?.task_memory.trusted_task_commands ?? []),
  ].map((command) => command.toLowerCase()))
  const cautionSignals = [
    ...(input.learning?.caution_signals ?? []),
    ...(input.memoryFreshness?.evidence.revalidate ?? []),
    ...(input.artifactReplay?.reusable_startup_gold.warnings ?? []),
  ]
  const recentOutcomes = input.memory?.recentOutcomes ?? []
  const strongestComponents = components
    .map((component) => {
      const commands = component.commands.map((command) => command.command)
      const trustedCount = commands.filter((command) => trustedCommands.has(command.toLowerCase())).length
      const outcomeMemory = buildComponentOutcomeMemory(component, recentOutcomes)
      const componentCautions = unique([
        input.topology?.root.scan_truncated ? 'scan local truncado' : null,
        ...cautionSignals.filter((signal) => componentMatchesSignal(component, signal)),
        ...outcomeMemory.caution_signals,
        ...commands
          .filter((command) => input.confidence?.decision_policy.avoid_until_revalidated.includes(command))
          .map((command) => `revalidar comando:${command}`),
      ].filter(isString).map(sanitizeProviderSafeText)).slice(0, 4)
      const confidence = clampConfidence(
        component.confidence
        + trustedCount * 8
        + outcomeMemory.success_count * 6
        + outcomeMemory.context_pack_applied_count * 3
        + (input.memoryFreshness?.state === 'fresh' ? 8 : input.memoryFreshness?.state === 'warm' ? 4 : -8)
        + (input.artifactReplay?.artifact_count ? 5 : 0)
        - outcomeMemory.failure_count * 10
        - componentCautions.length * 7,
      )
      const maturity: AwisWorkspaceComponentMemoryProjection['strongest_components'][number]['maturity'] =
        confidence >= 86 && (trustedCount > 0 || outcomeMemory.success_count >= 2)
          ? 'battle_tested'
          : confidence >= 72 && (trustedCount > 0 || outcomeMemory.success_count > 0)
            ? 'stable'
            : confidence >= 48
              ? 'learning'
              : 'new'
      const loadFirst = unique([
        ...component.manifests.map((item) => `manifesto:${item}`),
        ...component.docs.map((item) => `doc:${item}`),
        ...component.stack.map((item) => `stack:${item}`),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
      return {
        key: component.key,
        role: component.role,
        maturity,
        confidence,
        stack: component.stack.slice(0, MAX_STARTUP_ITEMS),
        load_first: loadFirst,
        commands: commands.slice(0, MAX_STARTUP_ITEMS),
        docs: component.docs.slice(0, MAX_STARTUP_ITEMS),
        cautions: componentCautions,
        outcome_memory: outcomeMemory,
        reuse_policy: {
          can_autoload: confidence >= 70 && componentCautions.length === 0 && outcomeMemory.failure_count === 0,
          validate_before_execution: componentCautions.length > 0 || outcomeMemory.failure_count > 0 || input.memoryFreshness?.state === 'stale' || input.memoryFreshness?.state === 'cold',
          reason: componentCautions.length > 0
            ? 'área útil, mas precisa revalidar sinais antes de executar'
            : outcomeMemory.success_count > 0
              ? 'área validada por resultados reais do workspace'
              : trustedCount > 0
              ? 'área tem comando validado por uso real'
              : 'área inferida pelo mapa local do workspace',
        },
      }
    })
    .sort((a, b) => b.confidence - a.confidence || a.key.localeCompare(b.key))
    .slice(0, MAX_TOPOLOGY_COMPONENTS)
  const routingHints = strongestComponents.flatMap((component) => unique([
    component.key,
    component.role,
    ...component.stack,
    ...component.docs.map((doc) => doc.split('/').filter(Boolean).at(-1) ?? doc),
  ]).slice(0, 4).map((signal) => ({
    signal: sanitizeProviderSafeText(signal).slice(0, 80),
    component: component.key,
    confidence: component.confidence,
  }))).filter((hint) => hint.signal !== '').slice(0, MAX_STARTUP_ITEMS * 2)
  if (strongestComponents.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_component_memory_projection.v1',
    source: 'local_awis_component_memory_compiler',
    component_count: strongestComponents.length,
    strongest_components: strongestComponents,
    routing_hints: routingHints,
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

export function buildAwisWorkspaceSemanticIndexProjection(input: {
  topology: AwisWorkspaceTopologyProjection | null
  componentMemory: AwisWorkspaceComponentMemoryProjection | null
  learning: AwisWorkspaceLearningProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
}): AwisWorkspaceSemanticIndexProjection | null {
  const components = input.topology?.components ?? []
  if (components.length === 0) return null
  const componentMemory = new Map((input.componentMemory?.strongest_components ?? []).map((component) => [component.key, component]))
  const aliasMap = new Map<string, {
    alias: string
    intent: string
    componentKeys: string[]
    taskKinds: AwisWorkspaceTaskContextProjection['task_kind'][]
    load: string[]
    validate: string[]
    confidence: number
  }>()
  const pushAlias = (rawAlias: string | null | undefined, inputItem: {
    intent: string
    componentKey: string
    taskKinds: AwisWorkspaceTaskContextProjection['task_kind'][]
    load: string[]
    validate: string[]
    confidence: number
  }) => {
    const alias = sanitizeSemanticAlias(rawAlias)
    if (!alias) return
    const existing = aliasMap.get(alias) ?? {
      alias,
      intent: sanitizeProviderSafeText(inputItem.intent).slice(0, 120),
      componentKeys: [],
      taskKinds: [],
      load: [],
      validate: [],
      confidence: 0,
    }
    existing.intent = existing.intent || sanitizeProviderSafeText(inputItem.intent).slice(0, 120)
    existing.componentKeys = unique([...existing.componentKeys, inputItem.componentKey]).slice(0, 4)
    existing.taskKinds = unique([...existing.taskKinds, ...inputItem.taskKinds]).slice(0, 5) as AwisWorkspaceTaskContextProjection['task_kind'][]
    existing.load = unique([...existing.load, ...inputItem.load].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
    existing.validate = unique([...existing.validate, ...inputItem.validate].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
    existing.confidence = Math.max(existing.confidence, normalizePercent(inputItem.confidence))
    aliasMap.set(alias, existing)
  }

  for (const component of components) {
    const memory = componentMemory.get(component.key)
    const load = unique([
      ...component.manifests.map((item) => `manifesto:${item}`),
      ...component.docs.map((item) => `doc:${item}`),
      ...(memory?.load_first ?? []),
    ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
    const validate = unique([
      ...component.commands.map((command) => command.command),
      ...(memory?.outcome_memory.trusted_commands ?? []),
      ...(input.learning?.trusted_commands.filter((command) => component.commands.some((item) => item.command === command)) ?? []),
    ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
    const confidence = clampConfidence(
      component.confidence
      + (memory?.confidence ?? 0) / 5
      + (memory?.reuse_policy.can_autoload ? 8 : 0)
      + (input.memoryFreshness?.state === 'fresh' ? 5 : input.memoryFreshness?.state === 'stale' ? -8 : 0),
    )
    const taskKinds = taskKindsForSemanticComponent(component)
    const aliases = unique([
      component.key,
      component.role,
      ...component.stack,
      ...component.stack.flatMap(semanticStackAliases),
      ...component.manifests.map((item) => item.split('/').filter(Boolean).at(-1) ?? item),
      ...component.docs.map((item) => item.split('/').filter(Boolean).at(-1) ?? item),
      ...semanticAliasesForComponent(component),
    ].map(sanitizeSemanticAlias).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
    for (const alias of aliases) {
      pushAlias(alias, {
        intent: `${component.role} · ${component.stack.slice(0, 3).join(', ') || 'workspace'}`,
        componentKey: component.key,
        taskKinds,
        load,
        validate,
        confidence,
      })
    }
  }

  for (const space of input.spaces?.strongest_spaces ?? []) {
    for (const alias of unique([
      space.title,
      ...space.recommended_use,
      ...space.session_summaries.map((session) => session.title),
    ].map(sanitizeSemanticAlias).filter(isString)).slice(0, 4)) {
      const strongest = components[0]
      if (!strongest) continue
      pushAlias(alias, {
        intent: `Space reutilizável · ${space.session_count} sessões`,
        componentKey: strongest.key,
        taskKinds: ['analysis', 'research', 'design'],
        load: [`Space:${space.title}`],
        validate: space.risk_count > 0 ? ['revalidar riscos do Space'] : [],
        confidence: clampConfidence(58 + space.session_count * 6 + space.decision_count * 5 + space.artifact_count * 4),
      })
    }
  }

  const stackMap = buildSemanticStackMap(components, input.componentMemory)
  const queryAliases = [...aliasMap.values()]
    .map((item) => ({
      alias: item.alias,
      intent: item.intent,
      component_keys: item.componentKeys,
      task_kinds: item.taskKinds,
      load: item.load,
      validate: item.validate,
      confidence: item.confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence || a.alias.localeCompare(b.alias))
    .slice(0, MAX_STARTUP_ITEMS * 3)
  if (queryAliases.length === 0 && stackMap.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_semantic_index_projection.v1',
    source: 'local_awis_semantic_indexer',
    readiness_score: clampConfidence(
      34
      + Math.min(30, queryAliases.length * 3)
      + Math.min(18, stackMap.length * 4)
      + (input.artifactReplay?.artifact_count ? 8 : 0)
      + (input.sessionGold?.strongest_outcomes.length ? 6 : 0),
    ),
    query_aliases: queryAliases,
    stack_map: stackMap,
    retrieval_policy: {
      load_full_when: unique([
        'alias bate em componente principal',
        'tarefa exige edição ou debug',
        ...(input.sessionGold?.next_session_hooks.before_send.slice(0, 2) ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      summarize_when: unique([
        'alias aponta para múltiplos componentes',
        'Space entra como contexto de apoio',
        input.memoryFreshness?.state === 'stale' ? 'memória stale exige resumo até revalidar' : null,
      ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      revalidate_when: unique([
        ...(input.memoryFreshness?.evidence.revalidate ?? []),
        ...(input.componentMemory?.strongest_components.flatMap((component) => component.cautions.map((caution) => `${component.key}:${caution}`)) ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      never_load_raw: [
        'workspace inteiro sem intenção',
        'conversa bruta completa',
        'paths absolutos do Mac',
        'arquivos fora da pasta local selecionada',
      ],
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
  }
}

export function buildAwisWorkspaceImpactMapProjection(input: {
  topology: AwisWorkspaceTopologyProjection | null
  componentMemory: AwisWorkspaceComponentMemoryProjection | null
  semanticIndex: AwisWorkspaceSemanticIndexProjection | null
  learning: AwisWorkspaceLearningProjection | null
  relations: AwisWorkspaceRelationProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
}): AwisWorkspaceImpactMapProjection | null {
  const components = input.topology?.components ?? []
  if (components.length === 0) return null
  const memoryByComponent = new Map((input.componentMemory?.strongest_components ?? []).map((component) => [component.key, component]))
  const connectionMap = new Map<string, Set<string>>()
  for (const connection of input.topology?.connections ?? []) {
    if (!connectionMap.has(connection.from)) connectionMap.set(connection.from, new Set())
    if (!connectionMap.has(connection.to)) connectionMap.set(connection.to, new Set())
    connectionMap.get(connection.from)?.add(connection.to)
    connectionMap.get(connection.to)?.add(connection.from)
  }
  const componentImpacts = components.map((component) => {
    const memory = memoryByComponent.get(component.key)
    const semanticAliases = (input.semanticIndex?.query_aliases ?? [])
      .filter((alias) => alias.component_keys.includes(component.key))
      .map((alias) => alias.alias)
    const stackPeers = components
      .filter((candidate) => candidate.key !== component.key && candidate.stack.some((stack) => component.stack.includes(stack)))
      .map((candidate) => candidate.key)
    const affectedComponents = unique([
      ...(connectionMap.get(component.key) ? [...connectionMap.get(component.key)!] : []),
      ...stackPeers,
      ...(semanticAliases.some((alias) => /backend|server|api|laravel/.test(alias))
        ? components.filter((candidate) => /desktop|frontend|surface|client/i.test(candidate.key + ' ' + candidate.role)).map((candidate) => candidate.key)
        : []),
      ...(semanticAliases.some((alias) => /frontend|desktop|atlas ai|awis/.test(alias))
        ? components.filter((candidate) => /server|backend|api|laravel/i.test(candidate.key + ' ' + candidate.role)).map((candidate) => candidate.key)
        : []),
    ].map(sanitizeComponentKey).filter(isString)).filter((key) => key !== component.key).slice(0, 5)
    const affectedCommands = components
      .filter((candidate) => candidate.key === component.key || affectedComponents.includes(candidate.key))
      .flatMap((candidate) => candidate.commands.map((command) => command.command))
    const validationCascade = unique([
      ...affectedCommands,
      ...(memory?.outcome_memory.trusted_commands ?? []),
      ...(input.learning?.task_memory.validation_plans
        .filter((plan) => plan.component_keys.includes(component.key) || plan.component_keys.some((key) => affectedComponents.includes(key)))
        .flatMap((plan) => plan.commands) ?? []),
    ].filter((command) => /test|tsc|lint|check|build|php artisan/i.test(command)).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
    const changeSignals = unique([
      component.key,
      component.role,
      ...component.stack,
      ...semanticAliases,
    ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
    const cautionCount = (memory?.cautions.length ?? 0) + (input.memoryFreshness?.state === 'stale' || input.memoryFreshness?.state === 'cold' ? 1 : 0)
    const risk: AwisWorkspaceImpactMapProjection['component_impacts'][number]['risk'] =
      cautionCount > 1 || affectedComponents.length >= 4
        ? 'high'
        : affectedComponents.length >= 2 || validationCascade.length >= 2
          ? 'medium'
          : 'low'
    return {
      component_key: component.key,
      change_signals: changeSignals,
      affected_components: affectedComponents,
      validation_cascade: validationCascade,
      risk,
      reason: affectedComponents.length > 0
        ? `mudanças em ${component.key} podem afetar ${affectedComponents.join(', ')}`
        : `mudanças em ${component.key} ficam majoritariamente na própria área`,
      confidence: clampConfidence(
        component.confidence
        + (memory?.confidence ?? 0) / 6
        + affectedComponents.length * 4
        + validationCascade.length * 3
        + (input.artifactReplay?.artifact_count ? 4 : 0)
        - cautionCount * 8,
      ),
    }
  })
    .sort((a, b) => b.confidence - a.confidence || b.affected_components.length - a.affected_components.length || a.component_key.localeCompare(b.component_key))
    .slice(0, MAX_TOPOLOGY_COMPONENTS)
  const crossWorkspaceImpacts = (input.relations?.related_workspaces ?? [])
    .map((workspace) => ({
      workspace_hint: workspace.workspace_hint,
      trigger_components: unique(componentImpacts
        .filter((impact) => workspace.shared_context_gold.some((item) => signalMatchesText(item, impact.component_key))
          || workspace.shared_validation_plans.some((item) => impact.validation_cascade.some((command) => signalMatchesText(item, command))))
        .map((impact) => impact.component_key)).slice(0, MAX_STARTUP_ITEMS),
      reuse: workspace.shared_context_gold.slice(0, MAX_STARTUP_ITEMS),
      revalidate: workspace.shared_validation_plans.slice(0, MAX_STARTUP_ITEMS),
      confidence: workspace.overlap_score,
    }))
    .filter((workspace) => workspace.trigger_components.length > 0 || workspace.reuse.length > 0 || workspace.revalidate.length > 0)
    .slice(0, MAX_STARTUP_ITEMS)
  if (componentImpacts.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_impact_map_projection.v1',
    source: 'local_awis_impact_mapper',
    readiness_score: clampConfidence(
      32
      + Math.min(28, componentImpacts.length * 4)
      + Math.min(24, componentImpacts.flatMap((impact) => impact.validation_cascade).length * 2)
      + Math.min(12, crossWorkspaceImpacts.length * 4)
      + (input.spaces?.space_count ? 4 : 0),
    ),
    component_impacts: componentImpacts,
    cross_workspace_impacts: crossWorkspaceImpacts,
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function sanitizeSemanticAlias(raw: string | null | undefined): string {
  const value = sanitizeProviderSafeText(raw ?? '')
    .toLowerCase()
    .replace(/[_/]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  if (value.length < 2 || value.length > 80) return ''
  if (/^package-lock|^pnpm-lock|^yarn-lock|^cargo-lock|^composer-lock/.test(value)) return ''
  return value
}

function semanticAliasesForComponent(component: AwisWorkspaceTopologyProjection['components'][number]): string[] {
  const haystack = [
    component.key,
    component.role,
    ...component.stack,
    ...component.manifests,
    ...component.docs,
    ...component.commands.map((command) => command.command),
  ].join(' ').toLowerCase()
  return unique([
    /laravel|php|composer|artisan/.test(haystack) ? 'backend' : null,
    /laravel|php|composer|artisan/.test(haystack) ? 'server' : null,
    /tauri|rust|cargo/.test(haystack) ? 'desktop runtime' : null,
    /react|tsx|vite|typescript/.test(haystack) ? 'frontend' : null,
    /atlas-ai|surfaces\/atlas-ai|awis/.test(haystack) ? 'atlas ai' : null,
    /atlas-ai|surfaces\/atlas-ai|awis/.test(haystack) ? 'awis' : null,
    /test|spec|vitest|tsx --test|npm run atlas-ai:test/.test(haystack) ? 'testes' : null,
    /docs|engineering-knowledge-base|readme/.test(haystack) ? 'documentação' : null,
    /database|postgres|migration|sql/.test(haystack) ? 'dados' : null,
    /mobile|expo|ios|android/.test(haystack) ? 'mobile' : null,
  ].filter(isString))
}

function semanticStackAliases(rawStack: string): string[] {
  const stack = sanitizeSemanticAlias(rawStack)
  if (!stack) return []
  return unique([
    stack,
    ...stack.split(/[-+]/).filter((item) => item.length >= 2),
  ])
}

function taskKindsForSemanticComponent(
  component: AwisWorkspaceTopologyProjection['components'][number],
): AwisWorkspaceTaskContextProjection['task_kind'][] {
  const haystack = [
    component.key,
    component.role,
    ...component.stack,
    ...component.manifests,
    ...component.docs,
    ...component.commands.map((command) => command.command),
  ].join(' ').toLowerCase()
  const kinds: AwisWorkspaceTaskContextProjection['task_kind'][] = ['analysis']
  if (/test|spec|lint|tsc|check|bug|repair/.test(haystack)) kinds.push('bug_fix')
  if (/src|app|tsx|ts|php|rs|swift|component|controller|service/.test(haystack)) kinds.push('code_change')
  if (/doc|readme|knowledge|research|paper/.test(haystack)) kinds.push('research')
  if (/design|css|surface|component|ui|ux/.test(haystack)) kinds.push('design')
  if (/deploy|ops|docker|ci|release|tauri build/.test(haystack)) kinds.push('ops')
  return unique(kinds) as AwisWorkspaceTaskContextProjection['task_kind'][]
}

function buildSemanticStackMap(
  components: AwisWorkspaceTopologyProjection['components'],
  componentMemory: AwisWorkspaceComponentMemoryProjection | null,
): AwisWorkspaceSemanticIndexProjection['stack_map'] {
  const memoryByComponent = new Map((componentMemory?.strongest_components ?? []).map((component) => [component.key, component]))
  const stackMap = new Map<string, {
    stack: string
    componentKeys: string[]
    commands: string[]
    docs: string[]
    confidence: number
  }>()
  for (const component of components) {
    const memory = memoryByComponent.get(component.key)
    for (const rawStack of component.stack.flatMap(semanticStackAliases)) {
      const stack = sanitizeSemanticAlias(rawStack)
      if (!stack) continue
      const existing = stackMap.get(stack) ?? {
        stack,
        componentKeys: [],
        commands: [],
        docs: [],
        confidence: 0,
      }
      existing.componentKeys = unique([...existing.componentKeys, component.key]).slice(0, 5)
      existing.commands = unique([...existing.commands, ...component.commands.map((command) => command.command), ...(memory?.commands ?? [])]).slice(0, MAX_STARTUP_ITEMS)
      existing.docs = unique([...existing.docs, ...component.docs, ...(memory?.docs ?? [])]).slice(0, MAX_STARTUP_ITEMS)
      existing.confidence = Math.max(existing.confidence, normalizePercent(component.confidence + (memory?.confidence ?? 0) / 6))
      stackMap.set(stack, existing)
    }
  }
  return [...stackMap.values()]
    .map((item) => ({
      stack: item.stack,
      component_keys: item.componentKeys,
      commands: item.commands.map(sanitizeProviderSafeText).filter(isString).slice(0, MAX_STARTUP_ITEMS),
      docs: item.docs.map(sanitizeRelativePath).filter(isString).slice(0, MAX_STARTUP_ITEMS),
      confidence: item.confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence || a.stack.localeCompare(b.stack))
    .slice(0, MAX_STARTUP_ITEMS)
}

function buildComponentOutcomeMemory(
  component: AwisWorkspaceTopologyProjection['components'][number],
  outcomes: AwisWorkspaceMemoryOutcome[],
): AwisWorkspaceComponentMemoryProjection['strongest_components'][number]['outcome_memory'] {
  const commandSet = new Set(component.commands.map((command) => command.command.toLowerCase()))
  const componentOutcomes = outcomes.filter((outcome) => (
    outcome.componentKeys.includes(component.key)
    || outcome.validationCommands.some((command) => commandSet.has(command.toLowerCase()))
  ))
  const successes = componentOutcomes.filter((outcome) => !isFailedOutcome(outcome.status))
  const failures = componentOutcomes.filter((outcome) => isFailedOutcome(outcome.status))
  const trustedCommands = unique(successes
    .flatMap((outcome) => outcome.validationCommands)
    .filter((command) => commandSet.has(command.toLowerCase()))
    .map(sanitizeProviderSafeText)
    .filter(isString))
    .slice(0, MAX_STARTUP_ITEMS)
  const cautionSignals = unique(failures.flatMap((outcome) => [
    `resultado falhou:${outcome.status}`,
    ...outcome.validationCommands
      .filter((command) => commandSet.has(command.toLowerCase()))
      .map((command) => `revalidar comando:${command}`),
  ]).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  return {
    success_count: successes.length,
    failure_count: failures.length,
    context_pack_applied_count: componentOutcomes.filter((outcome) => outcome.contextPackApplied).length,
    last_used_at: componentOutcomes[0]?.occurredAt ?? null,
    trusted_commands: trustedCommands,
    caution_signals: cautionSignals,
  }
}

function buildTaskValidationPlans(
  outcomes: AwisWorkspaceMemoryOutcome[],
): AwisWorkspaceLearningProjection['task_memory']['validation_plans'] {
  const plans = new Map<string, {
    taskKind: AwisWorkspaceTaskContextProjection['task_kind']
    commands: string[]
    contextGold: string[]
    componentKeys: string[]
    successCount: number
    failureCount: number
  }>()

  for (const outcome of outcomes) {
    const taskKind = outcome.taskKind ?? 'unknown'
    if (taskKind === 'unknown') continue
    const commands = normalizeStringList(outcome.validationCommands, MAX_STARTUP_ITEMS)
      .filter((command) => /test|tsc|lint|check|build/i.test(command))
    if (commands.length === 0) continue
    const contextGold = normalizeContextGoldLabels(outcome.contextGoldLabels).slice(0, 3)
    const componentKeys = normalizeComponentKeys(outcome.componentKeys).slice(0, 3)
    const signature = [
      taskKind,
      commands.slice(0, 3).join('|'),
      contextGold.join('|'),
      componentKeys.join('|'),
    ].join('::')
    const existing = plans.get(signature) ?? {
      taskKind,
      commands: [],
      contextGold: [],
      componentKeys: [],
      successCount: 0,
      failureCount: 0,
    }
    existing.commands = unique([...existing.commands, ...commands]).slice(0, MAX_STARTUP_ITEMS)
    existing.contextGold = unique([...existing.contextGold, ...contextGold]).slice(0, MAX_STARTUP_ITEMS)
    existing.componentKeys = unique([...existing.componentKeys, ...componentKeys]).slice(0, MAX_STARTUP_ITEMS)
    if (isFailedOutcome(outcome.status)) {
      existing.failureCount += 1
    } else {
      existing.successCount += 1
    }
    plans.set(signature, existing)
  }

  return [...plans.values()]
    .map((plan) => ({
      task_kind: plan.taskKind,
      commands: plan.commands,
      context_gold: plan.contextGold,
      component_keys: plan.componentKeys,
      success_count: plan.successCount,
      failure_count: plan.failureCount,
      confidence: normalizePercent(50 + plan.successCount * 18 - plan.failureCount * 22 + plan.contextGold.length * 4 + plan.componentKeys.length * 3),
    }))
    .sort((a, b) => b.confidence - a.confidence || b.success_count - a.success_count || a.task_kind.localeCompare(b.task_kind))
    .slice(0, MAX_STARTUP_ITEMS)
}

export function buildAwisWorkspaceLearningProjection(input: {
  memory: AwisWorkspaceMemorySnapshot | null
  topology: AwisWorkspaceTopologyProjection | null
  brain: AtlasWorkspaceBrainSnapshot | null
}): AwisWorkspaceLearningProjection | null {
  const memory = input.memory
  if (!memory || memory.scanCount <= 0) return null
  const interactionCount = memory.interactionCount
  const successRate = interactionCount > 0
    ? Math.round((memory.successCount / interactionCount) * 100)
    : null
  const contextPackEffectiveness = interactionCount > 0
    ? Math.round((memory.contextPackAppliedCount / interactionCount) * 100)
    : null
  const maturity: AwisWorkspaceLearningProjection['maturity'] =
    interactionCount >= 12 && (successRate ?? 0) >= 80
      ? 'battle_tested'
      : interactionCount >= 4 && (successRate ?? 0) >= 65
        ? 'stable'
        : interactionCount > 0 || memory.scanCount > 1
          ? 'learning'
          : 'new'
  const preferredChannels = rankSignals(memory.recentOutcomes.map((outcome) => outcome.channel)).slice(0, MAX_STARTUP_ITEMS)
  const taskKindLabels = memory.recentOutcomes.flatMap((outcome) => outcome.taskKind ? [outcome.taskKind] : [])
  const taskKinds = rankSignals(taskKindLabels).slice(0, MAX_STARTUP_ITEMS)
  const recentTaskKinds = unique(taskKindLabels).slice(0, MAX_STARTUP_ITEMS)
  const trustedTaskCommands = unique(memory.recentOutcomes
    .filter((outcome) => !isFailedOutcome(outcome.status))
    .flatMap((outcome) => outcome.validationCommands)
    .filter((command) => /test|tsc|lint|check|build/i.test(command)))
    .slice(0, MAX_STARTUP_ITEMS)
  const validationPlans = buildTaskValidationPlans(memory.recentOutcomes)
  const topologyCommands = unique([
    ...(input.topology?.execution_map.test_commands ?? []),
    ...(input.topology?.execution_map.check_commands ?? []),
    ...(input.topology?.execution_map.build_commands ?? []),
  ])
  const trustedCommands = unique([
    ...trustedTaskCommands,
    ...topologyCommands,
    ...memory.stableCommands
      .filter((signal) => signal.seenCount >= 2 || /test|tsc|lint|build|check/i.test(signal.label))
      .map((signal) => signal.label),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const failedStatuses = memory.recentOutcomes
    .filter((outcome) => isFailedOutcome(outcome.status))
    .map((outcome) => `${outcome.channel}:${outcome.status}`)
  const cautionSignals = unique([
    memory.failureCount > 0 ? `${memory.failureCount} envio(s) exigiram recuperação` : null,
    input.brain?.truncated ? 'scan local limitado para desempenho' : null,
    contextPackEffectiveness !== null && contextPackEffectiveness < 50 ? 'context pack pouco usado nas últimas sessões' : null,
    ...failedStatuses.map((status) => `falha recente:${status}`),
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const nextLearningEvent = maturity === 'new'
    ? 'registrar primeiro resultado real deste workspace'
    : cautionSignals.length > 0
      ? 'validar cautelas antes de reaproveitar comandos'
      : trustedCommands.length > 0
        ? `revalidar comando confiável: ${trustedCommands[0]}`
        : 'registrar outcome da próxima conversa para fortalecer memória'

  return {
    schema_version: 'atlas.awis.workspace_learning_projection.v1',
    source: 'local_workspace_outcomes',
    maturity,
    interaction_count: interactionCount,
    success_rate: successRate,
    context_pack_effectiveness: contextPackEffectiveness,
    preferred_channels: preferredChannels,
    trusted_commands: trustedCommands,
    caution_signals: cautionSignals,
    recent_drift: memory.driftEvents.slice(0, MAX_STARTUP_ITEMS),
    task_memory: {
      task_kinds: taskKinds,
      recent_task_kinds: recentTaskKinds,
      trusted_task_commands: trustedTaskCommands,
      validation_plans: validationPlans,
    },
    next_learning_event: nextLearningEvent,
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

export function buildAwisWorkspaceSessionGoldProjection(input: {
  memory: AwisWorkspaceMemorySnapshot | null
  learning: AwisWorkspaceLearningProjection | null
}): AwisWorkspaceSessionGoldProjection | null {
  const memory = input.memory
  if (!memory || memory.recentOutcomes.length === 0) return null
  const outcomes = memory.recentOutcomes.slice(0, MAX_RECENT_OUTCOMES)
  const successful = outcomes.filter((outcome) => !isFailedOutcome(outcome.status))
  const failed = outcomes.filter((outcome) => isFailedOutcome(outcome.status))
  const commandStats = new Map<string, {
    command: string
    success_count: number
    task_kinds: string[]
    channels: string[]
  }>()
  for (const outcome of successful) {
    for (const command of outcome.validationCommands.filter((item) => /test|tsc|lint|check|build/i.test(item))) {
      const existing = commandStats.get(command) ?? {
        command,
        success_count: 0,
        task_kinds: [],
        channels: [],
      }
      existing.success_count += 1
      if (outcome.taskKind) existing.task_kinds.push(outcome.taskKind)
      existing.channels.push(outcome.channel)
      commandStats.set(command, existing)
    }
  }
  const provenCommands = Array.from(commandStats.values())
    .map((item) => ({
      command: sanitizeProviderSafeText(item.command).slice(0, 180),
      success_count: item.success_count,
      task_kinds: unique(item.task_kinds).slice(0, MAX_STARTUP_ITEMS),
      channels: unique(item.channels).slice(0, MAX_STARTUP_ITEMS),
    }))
    .filter((item) => item.command !== '')
    .sort((a, b) => b.success_count - a.success_count || a.command.localeCompare(b.command))
    .slice(0, MAX_STARTUP_ITEMS)
  const successRate = Math.round((successful.length / outcomes.length) * 100)
  const strongestOutcomes = unique([
    ...rankSignals(successful.map((outcome) => outcome.taskKind ? `tarefa:${outcome.taskKind}` : `canal:${outcome.channel}`)),
    ...rankSignals(successful.map((outcome) => `canal:${outcome.channel}`)),
    input.learning?.maturity && input.learning.maturity !== 'new' ? `maturidade:${input.learning.maturity}` : null,
    input.learning?.context_pack_effectiveness !== null && input.learning?.context_pack_effectiveness !== undefined
      ? `context pack:${input.learning.context_pack_effectiveness}%`
      : null,
  ].filter(isString))
    .slice(0, MAX_STARTUP_ITEMS)
    .map((label) => ({
      label,
      confidence: clampConfidence(48 + successRate / 3 + (label.startsWith('tarefa:') ? 12 : 0)),
      evidence: unique([
        `${successful.length} outcome(s) útil(eis)`,
        provenCommands[0] ? `comando:${provenCommands[0].command}` : null,
        input.learning?.preferred_channels[0] ? `canal:${input.learning.preferred_channels[0]}` : null,
      ].filter(isString)).slice(0, 4),
    }))
  const recoveryPatterns = unique([
    ...failed.map((outcome) => `${outcome.channel}:${outcome.status}`),
    ...failed.flatMap((outcome) => outcome.validationCommands.map((command) => `revalidar:${command}`)),
    ...(input.learning?.caution_signals ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 3)
  const validateWith = unique([
    ...provenCommands.map((item) => item.command),
    ...(input.learning?.trusted_commands ?? []),
    ...(input.learning?.task_memory.trusted_task_commands ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const readinessSignals = [
    outcomes.length > 0,
    successful.length > 0,
    provenCommands.length > 0,
    strongestOutcomes.length > 0,
    input.learning && input.learning.maturity !== 'new',
    validateWith.length > 0,
  ].filter(Boolean).length
  return {
    schema_version: 'atlas.awis.workspace_session_gold_projection.v1',
    source: 'local_workspace_session_outcomes',
    readiness_score: Math.min(100, 24 + readinessSignals * 12),
    outcome_count: outcomes.length,
    success_rate: successRate,
    strongest_outcomes: strongestOutcomes,
    proven_commands: provenCommands,
    recovery_patterns: recoveryPatterns,
    next_session_hooks: {
      before_send: unique([
        validateWith[0] ? `preferir validação comprovada: ${validateWith[0]}` : null,
        recoveryPatterns[0] ? `checar cautela recente: ${recoveryPatterns[0]}` : null,
        input.learning?.context_pack_effectiveness && input.learning.context_pack_effectiveness >= 50 ? 'carregar context pack AWIS antes do envio' : null,
      ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      after_send: unique([
        'registrar outcome real da sessão',
        provenCommands[0] ? `atualizar confiança de comando: ${provenCommands[0].command}` : null,
        recoveryPatterns.length > 0 ? 'demover padrão que exigiu recuperação' : null,
      ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      validate_with: validateWith,
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
  }
}

export function buildAwisWorkspaceArtifactProjectionsFromServer(
  awair: AtlasAwisArtifactIntelligence | null | undefined,
  workspaceKeyValue: string,
): AwisWorkspaceArtifactServerProjections | null {
  if (!awair || awair.schema_version !== 'atlas.workspace_artifact_intelligence.v1') return null

  const nodes = Array.isArray(awair.artifact_graph?.nodes)
    ? awair.artifact_graph.nodes
      .filter((node) => Boolean(node && typeof node === 'object'))
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  const artifactCount = normalizeCount(awair.artifact_lake?.artifact_count) || nodes.length
  const latestNode = nodes.find((node) => isString(node.id)) ?? null
  const latestArtifactHash = latestNode?.id ?? awair.artifact_intelligence_hash ?? awair.artifact_lake?.lake_hash ?? null
  if (artifactCount === 0 && !latestArtifactHash) return null

  const contextUnits = Array.isArray(awair.artifact_context_compiler?.context_units)
    ? awair.artifact_context_compiler.context_units.filter(isString)
    : []
  const templates = Array.isArray(awair.artifact_marketplace?.reusable_templates)
    ? awair.artifact_marketplace.reusable_templates.filter(isString)
    : []
  const consumers = unique(nodes.map((node) => node.consumer).filter(isString))
  const artifactTypes = unique(nodes.map((node) => node.type).filter(isString))
  const replayReady = awair.artifact_replay?.replay_ready === true
  const simulationReady = awair.artifact_simulation?.decision === 'ready'
  const qualityReady = awair.artifact_quality_governor?.all_executable_artifacts_ready === true
  const blockers = Array.isArray(awair.artifact_simulation?.blockers)
    ? awair.artifact_simulation.blockers.filter(isString)
    : []
  const serverLoadOrder = unique([
    ...contextUnits.map((unit) => `contexto:${unit}`),
    ...templates.map((template) => `template:${template}`),
    ...artifactTypes.map((type) => `artifact:${type}`),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const serverWarnings = unique([
    replayReady ? null : 'replay de artefatos ainda não está pronto',
    simulationReady ? null : 'simulação de artefatos bloqueada',
    qualityReady ? null : 'qualidade dos artefatos exige revisão',
    awair.artifact_context_compiler?.raw_conversation_included === true ? 'payload contém conversa bruta e foi tratado como inseguro' : null,
    ...blockers,
  ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS)
  const serverNextActions = unique([
    replayReady ? 'reusar grafo de artefatos antes de abrir nova sessão' : 'materializar artefatos do workspace',
    simulationReady ? 'usar artefatos certificados para preparar execução' : 'resolver bloqueios do Artifact Intelligence',
    qualityReady ? 'promover contexto seguro para próxima conversa' : 'revisar qualidade dos artefatos antes de executar',
    awair.artifact_outcome_learning?.requires_real_outcome === true ? 'registrar resultado real para o AWIS aprender' : null,
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  return {
    artifactLake: {
      schema_version: 'atlas.awis.workspace_artifact_lake_summary.v1',
      workspace_key: workspaceKeyValue,
      artifact_count: artifactCount,
      latest_artifact_hash: latestArtifactHash,
      latest_artifact_type: latestNode?.type ?? 'server_awair',
      latest_created_at: null,
      retained_limit: Math.max(MAX_WORKSPACE_ARTIFACTS, artifactCount),
    },
    artifactReplay: {
      schema_version: 'atlas.awis.workspace_artifact_replay_projection.v1',
      source: 'server_awair_artifact_intelligence',
      artifact_count: artifactCount,
      latest_artifact_hash: latestArtifactHash,
      cold_start_seed: {
        schema_version: 'atlas.awis.artifact_cold_start_seed.v1',
        source: 'server_awair_artifact_intelligence',
        readiness_score: normalizePercent(
          35
            + Math.min(20, artifactCount * 4)
            + (replayReady ? 15 : 0)
            + (simulationReady ? 15 : 0)
            + (qualityReady ? 15 : 0),
        ),
        seed_hash: `cold-${stableStringHash(JSON.stringify({
          latestArtifactHash,
          serverLoadOrder,
          contextUnits,
          templates,
          consumers,
          serverWarnings,
        }))}`,
        load_order: serverLoadOrder,
        validate_with: serverNextActions.filter((action) => action.includes('validar') || action.includes('certificados')),
        context_signals: unique([
          ...contextUnits.map((unit) => `contexto:${unit}`),
          ...consumers.map((consumer) => `consumer:${consumer}`),
        ]).slice(0, MAX_STARTUP_ITEMS),
        reuse_spaces: artifactTypes.map((type) => `${type} · artefato AWIS reutilizável`).slice(0, MAX_STARTUP_ITEMS),
        repository_hints: consumers.slice(0, MAX_STARTUP_ITEMS),
        automation_hooks: serverNextActions,
        warnings: serverWarnings,
        human_boundary: serverWarnings,
      },
      reusable_startup_gold: {
        strongest_spaces: artifactTypes.map((type) => `${type} · artefato AWIS reutilizável`).slice(0, MAX_STARTUP_ITEMS),
        reusable_patterns: unique([
          ...contextUnits.map((unit) => `contexto:${unit}`),
          ...templates.map((template) => `template:${template}`),
          ...consumers.map((consumer) => `consumer:${consumer}`),
        ]).slice(0, MAX_STARTUP_ITEMS),
        warnings: serverWarnings,
        next_best_actions: serverNextActions,
      },
      safety: {
        raw_source_included: false,
        raw_conversation_included: false,
        internal_ids_included: false,
        bounded: true,
        provider_safe: true,
      },
    },
  }
}

export function buildAwisWorkspaceNextSessionBrainProjection(
  brain: AtlasAwisNextSessionBrain | null | undefined,
): AwisWorkspaceNextSessionBrainProjection | null {
  if (!brain || brain.schema_version !== 'atlas.awis.workspace_next_session_brain.v1') return null
  const plan = brain.context_loading_plan
  const resume = brain.resume_packet
  const loadOrder = Array.isArray(resume?.load_order) ? resume.load_order.filter(isString).slice(0, MAX_STARTUP_ITEMS) : []
  const executionPriority = Array.isArray(brain.execution_priority)
    ? brain.execution_priority
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.command)))
      .map((item) => ({
        command: String(item.command).slice(0, 180),
        why: isString(item.why) ? item.why.slice(0, 120) : null,
        requires_operator_approval: item.requires_operator_approval !== false,
      }))
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  const focusedRepositories = Array.isArray(resume?.focused_repositories)
    ? resume.focused_repositories
      .filter((repo) => Boolean(repo && typeof repo === 'object' && isString(repo.repo_key)))
      .map((repo) => ({
        repo_key: String(repo.repo_key).slice(0, 80),
        score: normalizeCount(repo.score),
        reasons: Array.isArray(repo.reasons) ? repo.reasons.filter(isString).slice(0, 4) : [],
        stack: Array.isArray(repo.stack) ? repo.stack.filter(isString).slice(0, 6) : [],
      }))
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  const focusedManifestRefs = Array.isArray(plan?.focused_manifest_refs)
    ? plan.focused_manifest_refs
      .filter((ref) => Boolean(ref && typeof ref === 'object' && isString(ref.repo_key)))
      .map((ref) => ({
        repo_key: String(ref.repo_key).slice(0, 80),
        manifest_files: Array.isArray(ref.manifest_files) ? ref.manifest_files.filter(isString).slice(0, 6) : [],
        stack: Array.isArray(ref.stack) ? ref.stack.filter(isString).slice(0, 6) : [],
        script_names: Array.isArray(ref.script_names) ? ref.script_names.filter(isString).slice(0, 8) : [],
      }))
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (!brain.brain_hash && loadOrder.length === 0 && executionPriority.length === 0 && focusedRepositories.length === 0) return null

  return {
    schema_version: 'atlas.awis.workspace_next_session_brain_projection.v1',
    source: 'server_awnsb',
    status: brain.status ?? 'unknown',
    brain_hash: brain.brain_hash ?? null,
    readiness_score: typeof brain.readiness_score === 'number' ? brain.readiness_score : null,
    load_order: loadOrder,
    focused_repositories: focusedRepositories,
    focused_areas: Array.isArray(resume?.focused_areas) ? resume.focused_areas.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
    artifact_refs: Array.isArray(resume?.artifact_refs) ? resume.artifact_refs.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
    owner_docs: Array.isArray(resume?.owner_docs) ? resume.owner_docs.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
    execution_priority: executionPriority,
    context_loading: {
      mode: isString(plan?.mode) ? plan.mode : null,
      repository_count: normalizeCount(plan?.repository_count),
      stack_tags: Array.isArray(plan?.stack_tags) ? plan.stack_tags.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
      command_hints: Array.isArray(plan?.command_hints) ? plan.command_hints.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
      outcome_ranked_commands: Array.isArray(plan?.outcome_ranked_commands) ? plan.outcome_ranked_commands.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
      avoid_commands: Array.isArray(plan?.avoid_commands) ? plan.avoid_commands.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
      flaky_commands: Array.isArray(plan?.flaky_commands) ? plan.flaky_commands.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
      slow_commands: Array.isArray(plan?.slow_commands) ? plan.slow_commands.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
      focused_manifest_refs: focusedManifestRefs,
      hashes: {
        repository_inventory_hash: plan?.repository_inventory_hash ?? null,
        working_set_hash: plan?.working_set_hash ?? null,
        context_delta_plan_hash: plan?.context_delta_plan_hash ?? null,
        learning_snapshot_hash: plan?.learning_snapshot_hash ?? null,
        live_execution_memory_hash: plan?.live_execution_memory_hash ?? null,
      },
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      internal_ids_included: false,
      absolute_paths_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

export function buildAwisWorkspaceLiveExecutionMemoryProjectionFromServer(
  memory: AtlasAwisLiveExecutionMemory | null | undefined,
): AwisWorkspaceLiveExecutionMemoryProjection | null {
  if (!memory || memory.schema_version !== 'atlas.awis.workspace_live_execution_memory.v1') return null
  const startup = memory.startup_packet
  const automation = memory.automation_loop
  const promotion = memory.promotion_rules
  const learning = memory.workspace_learning
  const loadFirst = normalizeStringList(startup?.load_first, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString)
  const useAsSummary = normalizeStringList(startup?.use_as_summary, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString)
  const validateBeforeTrust = normalizeStringList(startup?.validate_before_trust, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString)
  const repositories = unique([
    ...((Array.isArray(learning?.repositories) ? learning.repositories : [])
      .map((repo) => repo?.repo_key)
      .filter(isString)),
    ...((Array.isArray(learning?.focused_repositories) ? learning.focused_repositories : [])
      .map((repo) => repo?.repo_key)
      .filter(isString)),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const components = normalizeStringList(learning?.focused_areas, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const commands = normalizeStringList(learning?.focused_commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const artifacts = normalizeStringList(promotion?.preserve_as_artifact, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  if (loadFirst.length === 0 && useAsSummary.length === 0 && validateBeforeTrust.length === 0 && repositories.length === 0 && commands.length === 0) return null

  return {
    schema_version: 'atlas.awis.live_execution_memory_projection.v1',
    source: 'server_awis_live_execution_memory',
    readiness_score: memory.status === 'ready' ? 96 : 45,
    memory_hash: isString(memory.live_memory_hash)
      ? sanitizeProviderSafeText(memory.live_memory_hash).slice(0, 120)
      : `server-live-${stableStringHash(JSON.stringify({ loadFirst, repositories, commands }))}`,
    startup_packet: {
      load_first: loadFirst,
      use_as_summary: useAsSummary,
      validate_before_trust: validateBeforeTrust,
      avoid: normalizeStringList(startup?.avoid, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString),
      human_boundary: normalizeStringList(startup?.human_boundary, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    automation_loop: {
      before_send: normalizeStringList(automation?.before_send, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      after_success: normalizeStringList(automation?.after_success, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      after_failure: normalizeStringList(automation?.after_failure, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      on_drift: normalizeStringList(automation?.on_drift, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    promotion_rules: {
      promote_to_gold: normalizeStringList(promotion?.promote_to_gold, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString),
      preserve_as_artifact: artifacts,
      revalidate: normalizeStringList(promotion?.revalidate, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString),
      demote: normalizeStringList(promotion?.demote, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    workspace_learning: {
      repositories,
      components,
      spaces: [],
      artifacts,
      commands,
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
  }
}

function buildAwisWorkspaceLocalNextSessionBrainProjection(input: {
  workspaceName: string
  topology: AwisWorkspaceTopologyProjection | null
  memory: AwisWorkspaceMemorySnapshot | null
  learning?: AwisWorkspaceLearningProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
}): AwisWorkspaceNextSessionBrainProjection | null {
  const focusedRepositories = (input.topology?.components ?? [])
    .slice(0, MAX_STARTUP_ITEMS)
    .map((component) => ({
      repo_key: component.key,
      score: normalizePercent(component.confidence),
      reasons: unique([
        component.role,
        ...component.stack.slice(0, 2),
        component.commands[0]?.command ? `comando:${component.commands[0].command}` : null,
      ].filter(isString)).slice(0, 4),
      stack: component.stack.slice(0, 6),
    }))
  const focusedManifestRefs = (input.topology?.components ?? [])
    .filter((component) => component.manifests.length > 0 || component.stack.length > 0 || component.commands.length > 0)
    .slice(0, MAX_STARTUP_ITEMS)
    .map((component) => ({
      repo_key: component.key,
      manifest_files: component.manifests.slice(0, 6),
      stack: component.stack.slice(0, 6),
      script_names: component.commands.map((command) => command.command).slice(0, 8),
    }))
  const loadOrder = unique([
    ...(input.artifactReplay?.cold_start_seed.load_order ?? []),
    ...(input.topology?.knowledge_map.load_first_docs.map((path) => `doc:${path}`) ?? []),
    ...(input.topology?.knowledge_map.manifest_refs.map((path) => `manifest:${path}`) ?? []),
    ...(input.spaces?.strongest_spaces.map((space) => `space:${space.title}`) ?? []),
    ...(input.artifactReplay?.latest_artifact_hash ? [`artifact:${input.artifactReplay.latest_artifact_hash}`] : []),
    ...(input.sessionGold?.next_session_hooks.before_send.map((hook) => `ouro:${hook}`) ?? []),
    ...(input.memory?.stableCommands.slice(0, 4).map((signal) => `comando:${signal.label}`) ?? []),
    ...(input.learning?.task_memory.validation_plans.slice(0, 3).map((plan) => `plano:${plan.task_kind}:${plan.commands.join('+')}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const commandHints = unique([
    ...(input.artifactReplay?.cold_start_seed.validate_with ?? []),
    ...(input.artifactReplay?.cold_start_seed.context_signals ?? []),
    ...(input.topology?.knowledge_map.validation_entrypoints ?? []),
    ...(input.topology?.knowledge_map.runtime_entrypoints ?? []),
    ...(input.learning?.trusted_commands ?? []),
    ...(input.learning?.task_memory.trusted_task_commands ?? []),
    ...(input.memory?.stableCommands.map((signal) => signal.label) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const executionPriority = unique([
    ...(input.artifactReplay?.cold_start_seed.validate_with ?? []),
    ...(input.sessionGold?.proven_commands.map((command) => command.command) ?? []),
    ...(input.topology?.knowledge_map.validation_entrypoints ?? []),
    ...(input.learning?.trusted_commands ?? []),
    ...(input.memory?.stableCommands.map((signal) => signal.label) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString))
    .slice(0, MAX_STARTUP_ITEMS)
    .map((command) => ({
      command,
      why: /test|tsc|lint|check|build/i.test(command)
        ? 'validação aprendida do workspace'
        : 'comando detectado pelo mapa local',
      requires_operator_approval: true,
    }))
  const focusedAreas = unique([
    ...(input.artifactReplay?.cold_start_seed.reuse_spaces.map((space) => `artifact:${space}`) ?? []),
    ...(input.spaces?.strongest_spaces.map((space) => space.title) ?? []),
    ...(input.topology?.components.map((component) => component.role) ?? []),
    ...(input.learning?.task_memory.task_kinds.map((kind) => `tarefa:${kind}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const artifactRefs = unique([
    input.artifactReplay?.latest_artifact_hash ?? null,
    input.artifactReplay?.cold_start_seed.seed_hash ?? null,
    ...(input.artifactReplay?.reusable_startup_gold.reusable_patterns
      .filter((item) => item.startsWith('artifact-quality:'))
      .slice(0, 3) ?? []),
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const ownerDocs = unique([
    ...(input.topology?.knowledge_map.load_first_docs ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  if (
    loadOrder.length === 0 &&
    focusedRepositories.length === 0 &&
    focusedAreas.length === 0 &&
    executionPriority.length === 0 &&
    artifactRefs.length === 0
  ) return null
  const readinessScore = normalizePercent(
    30
    + Math.min(20, loadOrder.length * 4)
    + Math.min(16, focusedRepositories.length * 4)
    + Math.min(16, executionPriority.length * 4)
    + (input.sessionGold?.strongest_outcomes.length ? 8 : 0)
    + (input.artifactReplay?.artifact_count ? 8 : 0),
  )
  const hashSeed = JSON.stringify({
    workspace: input.workspaceName,
    loadOrder,
    focusedRepositories: focusedRepositories.map((repo) => repo.repo_key),
    focusedAreas,
    executionPriority: executionPriority.map((item) => item.command),
    artifactRefs,
  })

  return {
    schema_version: 'atlas.awis.workspace_next_session_brain_projection.v1',
    source: 'local_awis_seed',
    status: 'ready',
    brain_hash: `local-${stableStringHash(hashSeed)}`,
    readiness_score: readinessScore,
    load_order: loadOrder,
    focused_repositories: focusedRepositories,
    focused_areas: focusedAreas,
    artifact_refs: artifactRefs,
    owner_docs: ownerDocs,
    execution_priority: executionPriority,
    context_loading: {
      mode: readinessScore >= 82 ? 'deep' : readinessScore >= 64 ? 'guided' : 'warm',
      repository_count: focusedRepositories.length,
      stack_tags: unique(focusedRepositories.flatMap((repo) => repo.stack)).slice(0, MAX_STARTUP_ITEMS),
      command_hints: commandHints,
      outcome_ranked_commands: input.sessionGold?.proven_commands.map((command) => command.command).slice(0, MAX_STARTUP_ITEMS) ?? [],
      avoid_commands: unique([
        ...(input.artifactReplay?.cold_start_seed.warnings ?? []),
        ...(input.topology?.knowledge_map.sensitive_zones.map((zone) => `zona sensível:${zone}`) ?? []),
        ...(input.artifactReplay?.reusable_startup_gold.warnings.slice(0, 4) ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      flaky_commands: input.sessionGold?.recovery_patterns.filter((pattern) => /fail|erro|flaky|retry/i.test(pattern)).slice(0, MAX_STARTUP_ITEMS) ?? [],
      slow_commands: [],
      focused_manifest_refs: focusedManifestRefs,
      hashes: {
        repository_inventory_hash: input.topology ? `topology-${stableStringHash(JSON.stringify(input.topology.components.map((component) => component.key)))}` : null,
        working_set_hash: input.topology ? `working-${stableStringHash(JSON.stringify(input.topology.knowledge_map))}` : null,
        context_delta_plan_hash: input.artifactReplay?.latest_artifact_hash ?? null,
        learning_snapshot_hash: input.memory ? `memory-${stableStringHash(JSON.stringify(input.memory.stableCommands.map((signal) => signal.label)))}` : null,
        live_execution_memory_hash: null,
      },
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      internal_ids_included: false,
      absolute_paths_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

export function buildAwisWorkspaceHandoffProjection(
  handoff: AtlasAwisHandoffPack | null | undefined,
): AwisWorkspaceHandoffProjection | null {
  if (!handoff || handoff.schema_version !== 'atlas.workspace_handoff_pack.v1') return null
  const contextUnits = Array.isArray(handoff.context_units)
    ? handoff.context_units
      .filter((unit) => Boolean(unit && typeof unit === 'object' && isString(unit.artifact_type)))
      .map((unit) => ({
        artifact_type: String(unit.artifact_type).slice(0, 80),
        artifact_hash: isString(unit.artifact_hash) ? unit.artifact_hash : null,
        status: isString(unit.status) ? unit.status : null,
      }))
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  const requiredArtifacts = Array.isArray(handoff.required_artifacts) ? handoff.required_artifacts.filter(isString).slice(0, MAX_STARTUP_ITEMS) : []
  const missingArtifacts = Array.isArray(handoff.missing_artifacts) ? handoff.missing_artifacts.filter(isString).slice(0, MAX_STARTUP_ITEMS) : []
  const artifactRefs = unique(contextUnits.map((unit) => unit.artifact_hash).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const handoffUnits = unique(contextUnits.map((unit) => unit.artifact_type)).slice(0, MAX_STARTUP_ITEMS)
  if (!handoff.handoff_hash && contextUnits.length === 0 && requiredArtifacts.length === 0) return null

  return {
    schema_version: 'atlas.awis.workspace_handoff_projection.v1',
    source: 'server_handoff_pack',
    status: handoff.status ?? 'unknown',
    consumer: handoff.consumer ?? null,
    handoff_hash: handoff.handoff_hash ?? null,
    workspace_readiness: handoff.workspace?.readiness_status ?? null,
    required_artifacts: requiredArtifacts,
    missing_artifacts: missingArtifacts,
    context_units: contextUnits,
    scope_guard: {
      risk_floor: handoff.scope_guard?.risk_floor ?? null,
      sensitive_areas: Array.isArray(handoff.scope_guard?.sensitive_areas) ? handoff.scope_guard.sensitive_areas.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
      owner_docs: Array.isArray(handoff.scope_guard?.owner_docs) ? handoff.scope_guard.owner_docs.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
    },
    test_contract: {
      focused_tests: Array.isArray(handoff.test_contract?.focused_tests) ? handoff.test_contract.focused_tests.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
      fallback_tests: Array.isArray(handoff.test_contract?.fallback_tests) ? handoff.test_contract.fallback_tests.filter(isString).slice(0, MAX_STARTUP_ITEMS) : [],
    },
    next_session_brain_hash: handoff.next_session_brain?.brain_hash ?? null,
    artifact_refs: artifactRefs,
    handoff_units: handoffUnits,
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

export function buildAwisWorkspaceStartupSnapshot(input: {
  workspaceName: string
  brain: AtlasWorkspaceBrainSnapshot | null
  topology: AwisWorkspaceTopologyProjection | null
  memory: AwisWorkspaceMemorySnapshot | null
  learning?: AwisWorkspaceLearningProjection | null
  evolution: AwisWorkspaceEvolutionProjection | null
  relations?: AwisWorkspaceRelationProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  liveExecutionMemory?: AwisWorkspaceLiveExecutionMemoryProjection | null
  nextSessionBrain: AwisWorkspaceNextSessionBrainProjection | null
  handoffPack: AwisWorkspaceHandoffProjection | null
}): AwisWorkspaceStartupSnapshot | null {
  const folderMapReady = input.brain?.status === 'ready' && input.brain.filesSeen > 0
  const topologyReady = Boolean(input.topology && input.topology.components.length > 0)
  const memoryReady = Boolean(input.memory && input.memory.scanCount > 0)
  const operationalMemoryReady = Boolean(input.memory && input.memory.interactionCount > 0)
  const learningReady = Boolean(input.learning && input.learning.maturity !== 'new')
  const spacesReady = Boolean(input.spaces && input.spaces.space_count > 0)
  const evolutionReady = Boolean(input.evolution && (
    input.evolution.patterns.length > 0 ||
    input.evolution.failure_signatures.length > 0
  ))
  const relationsReady = Boolean(input.relations && input.relations.related_workspaces.length > 0)
  const artifactReplayReady = Boolean(input.artifactReplay && input.artifactReplay.artifact_count > 0)
  const liveExecutionMemoryReady = Boolean(input.liveExecutionMemory && input.liveExecutionMemory.readiness_score >= 40)
  const nextSessionBrainReady = input.nextSessionBrain?.status === 'ready'
  const handoffPackReady = input.handoffPack?.status === 'ready'
  if (
    !folderMapReady &&
    !topologyReady &&
    !memoryReady &&
    !operationalMemoryReady &&
    !learningReady &&
    !spacesReady &&
    !evolutionReady &&
    !relationsReady &&
    !artifactReplayReady &&
    !liveExecutionMemoryReady &&
    !nextSessionBrainReady &&
    !handoffPackReady
  ) return null

  const warnings = [
    input.brain?.truncated ? 'mapa local limitado para desempenho' : null,
    input.topology?.root.scan_truncated ? 'topologia local derivada de scan limitado' : null,
    input.memory?.failureCount ? `${input.memory.failureCount} envio(s) exigiram recuperação` : null,
    ...(input.learning?.caution_signals ?? []),
    input.memory?.driftEvents[0] ? 'workspace mudou desde leituras anteriores' : null,
    input.nextSessionBrain && !nextSessionBrainReady ? 'next-session brain canônico ainda bloqueado' : null,
    input.handoffPack?.missing_artifacts.length ? `handoff com ${input.handoffPack.missing_artifacts.length} artefato(s) pendente(s)` : null,
    ...(input.evolution?.failure_signatures ?? []).map((failure) => failure.label),
    ...(input.artifactReplay?.cold_start_seed.warnings ?? []),
    ...(input.artifactReplay?.reusable_startup_gold.warnings ?? []),
  ].filter(isString).slice(0, MAX_STARTUP_ITEMS)
  const nextBestActions = unique([
    ...(input.artifactReplay?.reusable_startup_gold.next_best_actions ?? []),
    ...(input.artifactReplay?.cold_start_seed.automation_hooks.slice(0, 3).map((hook) => `partida fria: ${hook}`) ?? []),
    ...(input.artifactReplay?.cold_start_seed.load_order.slice(0, 2).map((item) => `carregar seed: ${item}`) ?? []),
    ...(input.nextSessionBrain?.execution_priority.map((priority) => `priorizar comando: ${priority.command}`) ?? []),
    ...(input.handoffPack?.missing_artifacts.length ? ['completar artefatos pendentes do handoff'] : []),
    ...(input.topology?.knowledge_map.load_first_docs.length ? ['carregar documentos-guia da pasta antes de responder'] : []),
    ...(input.topology?.knowledge_map.validation_entrypoints.length ? ['validar com comandos detectados no mapa local'] : []),
    spacesReady ? 'usar Space forte antes de abrir conversa nova' : 'criar Space com sessões relacionadas',
    folderMapReady ? 'preferir comandos inferidos do workspace' : 'mapear pasta local',
    topologyReady ? 'carregar mapa de componentes antes de decidir arquivos' : null,
    operationalMemoryReady ? 'reaproveitar canal de trabalho mais recente' : 'registrar uso real da próxima conversa',
    learningReady ? input.learning?.next_learning_event : null,
    evolutionReady ? 'comparar padrões abstratos entre repositórios compatíveis' : 'acumular aprendizado entre repositórios',
    relationsReady ? 'reusar aprendizados de workspaces compatíveis' : null,
    ...(input.spaces?.continuity.load_first.map((item) => `carregar ${item}`) ?? []),
    ...(input.spaces?.continuity.carry_forward ?? []),
    ...((input.spaces?.strongest_spaces ?? []).flatMap((space) => space.recommended_use)),
    ...((input.spaces?.strongest_spaces ?? []).flatMap((space) => space.brain_contract.load_first.map((item) => `Space brain: carregar ${item}`))),
    ...((input.spaces?.strongest_spaces ?? []).flatMap((space) => space.brain_contract.automation_hooks.map((item) => `Space brain: ${item}`))),
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  return {
    schema_version: 'atlas.awis.workspace_startup_snapshot.v1',
    source: 'workspace_memory_space_evolution',
    generated_for_workspace: input.workspaceName,
    readiness: {
      folder_map_ready: folderMapReady,
      topology_ready: topologyReady,
      memory_ready: memoryReady,
      operational_memory_ready: operationalMemoryReady,
      learning_ready: learningReady,
      spaces_ready: spacesReady,
      evolution_ready: evolutionReady,
      relations_ready: relationsReady,
      artifact_replay_ready: artifactReplayReady,
      live_execution_memory_ready: liveExecutionMemoryReady,
      next_session_brain_ready: nextSessionBrainReady,
      handoff_pack_ready: handoffPackReady,
    },
    startup_gold: {
      stack_signals: unique([
        ...(input.brain?.signals ?? []),
        ...(input.memory?.stableSignals.map((signal) => signal.label) ?? []),
        ...(input.memory?.stableLanguages.map((signal) => signal.label) ?? []),
        ...(input.topology?.components.flatMap((component) => component.stack) ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
      workspace_components: (input.topology?.components ?? [])
        .map((component) => `${component.key} · ${component.role}`)
        .slice(0, MAX_STARTUP_ITEMS),
      commands: unique([
        ...(input.brain?.commands.map((command) => command.command) ?? []),
        ...(input.topology?.knowledge_map.validation_entrypoints ?? []),
        ...(input.topology?.knowledge_map.runtime_entrypoints ?? []),
        ...(input.topology?.execution_map.test_commands ?? []),
        ...(input.topology?.execution_map.build_commands ?? []),
        ...(input.memory?.stableCommands.map((signal) => signal.label) ?? []),
        ...(input.learning?.trusted_commands ?? []),
        ...(input.learning?.task_memory.trusted_task_commands ?? []),
        ...(input.artifactReplay?.cold_start_seed.validate_with ?? []),
        ...(input.nextSessionBrain?.execution_priority.map((priority) => priority.command) ?? []),
        ...(input.nextSessionBrain?.context_loading.command_hints ?? []),
        ...(input.handoffPack?.test_contract.focused_tests ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
      strongest_spaces: (input.spaces?.strongest_spaces ?? [])
        .map((space) => `${space.title} · ${space.session_count} sessões · ${space.message_count} mensagens`)
        .concat(input.artifactReplay?.reusable_startup_gold.strongest_spaces ?? [])
        .slice(0, MAX_STARTUP_ITEMS),
      recent_channels: unique(input.memory?.recentOutcomes.map((outcome) => outcome.channel) ?? []).slice(0, MAX_STARTUP_ITEMS),
      reusable_patterns: [
        ...(input.artifactReplay?.cold_start_seed.seed_hash ? [`cold-seed:${input.artifactReplay.cold_start_seed.seed_hash}`] : []),
        ...(input.artifactReplay?.cold_start_seed.load_order.slice(0, 3).map((item) => `cold-load:${item}`) ?? []),
        ...(input.artifactReplay?.cold_start_seed.context_signals.slice(0, 3).map((item) => `cold-context:${item}`) ?? []),
        ...(input.artifactReplay?.cold_start_seed.repository_hints.slice(0, 3).map((item) => `cold-repo:${item}`) ?? []),
        ...(input.relations?.related_workspaces.flatMap((workspace) => workspace.shared_validation_plans.map((item) => `transfer-validation:${workspace.workspace_hint}:${item}`)) ?? []),
        ...(input.relations?.related_workspaces.flatMap((workspace) => workspace.shared_recovery_patterns.map((item) => `transfer-recovery:${workspace.workspace_hint}:${item}`)) ?? []),
        ...(input.relations?.related_workspaces.flatMap((workspace) => workspace.recommended_transfer.map((item) => `transfer:${workspace.workspace_hint}:${item}`)) ?? []),
        ...(input.topology?.knowledge_map.load_first_docs.map((path) => `knowledge-doc:${path}`) ?? []),
        ...(input.topology?.knowledge_map.manifest_refs.map((path) => `manifest:${path}`) ?? []),
        ...(input.spaces?.continuity.load_first.map((item) => `space-load:${item}`) ?? []),
        ...(input.spaces?.continuity.carry_forward.map((item) => `space-carry:${item}`) ?? []),
        ...(input.spaces?.strongest_spaces.flatMap((space) => space.brain_contract.load_first.map((item) => `space-brain-load:${item}`)) ?? []),
        ...(input.spaces?.strongest_spaces.flatMap((space) => space.brain_contract.carry_forward.map((item) => `space-brain-carry:${item}`)) ?? []),
        ...(input.spaces?.strongest_spaces.flatMap((space) => space.brain_contract.artifact_refs.map((ref) => `space-artifact:${ref}`)) ?? []),
        ...(input.spaces?.strongest_spaces.flatMap((space) => space.brain_contract.evidence.map((item) => `space-evidence:${space.title}:${item}`)) ?? []),
        ...(input.topology?.knowledge_map.command_sources.map((path) => `command-source:${path}`) ?? []),
        ...(input.topology?.knowledge_map.sensitive_zones.map((zone) => `sensitive-zone:${zone}`) ?? []),
        ...(input.topology?.knowledge_map.summarize_only.map((item) => `summarize-only:${item}`) ?? []),
        ...(input.evolution?.patterns.map((pattern) => `${pattern.kind}:${pattern.label}`) ?? []),
        ...(input.evolution?.failure_signatures.map((pattern) => `${pattern.kind}:${pattern.label}`) ?? []),
        ...(input.learning ? [`learning:${input.learning.maturity}`] : []),
        ...(input.learning?.task_memory.task_kinds.map((taskKind) => `task:${taskKind}`) ?? []),
        ...(input.artifactReplay?.reusable_startup_gold.reusable_patterns ?? []),
        ...(input.liveExecutionMemory ? [`live-memory:${input.liveExecutionMemory.memory_hash}:${input.liveExecutionMemory.readiness_score}`] : []),
        ...(input.liveExecutionMemory?.startup_packet.load_first.slice(0, 3).map((item) => `live-load:${item}`) ?? []),
        ...(input.liveExecutionMemory?.startup_packet.use_as_summary.slice(0, 3).map((item) => `live-summary:${item}`) ?? []),
        ...(input.nextSessionBrain?.load_order.map((item) => `load:${item}`) ?? []),
        ...(input.nextSessionBrain?.focused_repositories.map((repo) => `repo:${repo.repo_key}`) ?? []),
        ...(input.topology?.components.map((component) => `component:${component.key}:${component.role}`) ?? []),
        ...(input.topology?.connections.map((connection) => `connection:${connection.from}->${connection.to}`) ?? []),
        ...(input.handoffPack?.context_units.map((unit) => `artifact:${unit.artifact_type}`) ?? []),
      ].slice(0, MAX_STARTUP_ITEMS * 2),
      warnings,
      next_best_actions: nextBestActions,
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

export function buildAwisWorkspaceStartupBriefing(input: {
  workspaceName: string
  startupSnapshot: AwisWorkspaceStartupSnapshot | null
  brain: AtlasWorkspaceBrainSnapshot | null
  topology: AwisWorkspaceTopologyProjection | null
  memory: AwisWorkspaceMemorySnapshot | null
  learning?: AwisWorkspaceLearningProjection | null
  evolution: AwisWorkspaceEvolutionProjection | null
  relations?: AwisWorkspaceRelationProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  nextSessionBrain: AwisWorkspaceNextSessionBrainProjection | null
  handoffPack: AwisWorkspaceHandoffProjection | null
}): AwisWorkspaceStartupBriefing | null {
  const startup = input.startupSnapshot
  if (!startup) return null
  const readinessFlags = Object.values(startup.readiness).filter(Boolean).length
  const readinessScore = Math.min(100, Math.round((readinessFlags / Object.values(startup.readiness).length) * 100))
  const repositories = unique([
    ...(input.nextSessionBrain?.focused_repositories.map((repo) => repo.repo_key) ?? []),
    ...(input.nextSessionBrain?.context_loading.focused_manifest_refs.map((ref) => ref.repo_key) ?? []),
    ...(input.topology?.components.map((component) => component.key) ?? []),
    ...(input.relations?.related_workspaces.map((workspace) => workspace.workspace_hint) ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const areas = unique([
    ...(input.nextSessionBrain?.focused_areas ?? []),
    ...(input.handoffPack?.scope_guard.sensitive_areas ?? []),
    ...(input.topology?.components.map((component) => component.role) ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const ownerDocs = unique([
    ...(input.topology?.knowledge_map.load_first_docs ?? []),
    ...(input.nextSessionBrain?.owner_docs ?? []),
    ...(input.handoffPack?.scope_guard.owner_docs ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const artifactRefs = unique([
    ...(input.nextSessionBrain?.artifact_refs ?? []),
    ...(input.artifactReplay?.latest_artifact_hash ? [input.artifactReplay.latest_artifact_hash] : []),
    ...(input.handoffPack?.context_units.map((unit) => unit.artifact_hash).filter(isString) ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const handoffUnits = unique(input.handoffPack?.context_units.map((unit) => unit.artifact_type) ?? []).slice(0, MAX_STARTUP_ITEMS)
  const focusedSpace = input.spaces?.strongest_spaces[0]?.title ?? null
  const primaryFocus = focusedSpace
    || areas[0]
    || repositories[0]
    || startup.startup_gold.stack_signals[0]
    || input.workspaceName
  const interactionCount = input.memory?.interactionCount ?? 0
  const successRate = interactionCount > 0 && input.memory
    ? Math.round((input.memory.successCount / interactionCount) * 100)
    : null

  return {
    schema_version: 'atlas.awis.workspace_startup_briefing.v1',
    source: 'local_awis_context_compiler',
    generated_for_workspace: input.workspaceName,
    never_start_cold: true,
    readiness: {
      score: readinessScore,
      folder_map: startup.readiness.folder_map_ready,
      topology: startup.readiness.topology_ready,
      memory: startup.readiness.memory_ready,
      operational_memory: startup.readiness.operational_memory_ready,
      learning: startup.readiness.learning_ready,
      spaces: startup.readiness.spaces_ready,
      relations: startup.readiness.relations_ready,
      artifact_replay: startup.readiness.artifact_replay_ready,
      next_session_brain: startup.readiness.next_session_brain_ready,
      handoff_pack: startup.readiness.handoff_pack_ready,
    },
    focus: {
      primary: primaryFocus.slice(0, 120),
      load_sequence: unique([
        ...(input.topology?.knowledge_map.load_first_docs.length ? ['folder_knowledge_docs'] : []),
        ...(input.topology?.knowledge_map.manifest_refs.length ? ['folder_manifests'] : []),
        startup.readiness.topology_ready ? 'workspace_topology' : null,
        startup.readiness.folder_map_ready ? 'folder_map' : null,
        startup.readiness.memory_ready ? 'workspace_memory' : null,
        startup.readiness.learning_ready ? 'workspace_learning' : null,
        startup.readiness.spaces_ready ? 'spaces' : null,
        startup.readiness.relations_ready ? 'workspace_relations' : null,
        startup.readiness.artifact_replay_ready ? 'artifact_replay' : null,
        ...(input.nextSessionBrain?.load_order ?? []),
      ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      repositories,
      areas,
      owner_docs: ownerDocs,
    },
    context_gold: {
      stack: startup.startup_gold.stack_signals.slice(0, MAX_STARTUP_ITEMS),
      commands: startup.startup_gold.commands.slice(0, MAX_STARTUP_ITEMS),
      strongest_spaces: startup.startup_gold.strongest_spaces.slice(0, MAX_STARTUP_ITEMS),
      reusable_patterns: unique([
        ...startup.startup_gold.workspace_components.map((component) => `workspace:${component}`),
        ...(input.relations?.related_workspaces.map((workspace) => `workspace-rel:${workspace.workspace_hint}:${workspace.overlap_score}`) ?? []),
        ...(input.learning?.trusted_commands.map((command) => `trusted-command:${command}`) ?? []),
        ...(input.learning?.task_memory.task_kinds.map((taskKind) => `task-memory:${taskKind}`) ?? []),
        ...(input.topology?.knowledge_map.load_first_docs.map((path) => `folder-doc:${path}`) ?? []),
        ...(input.topology?.knowledge_map.manifest_refs.map((path) => `folder-manifest:${path}`) ?? []),
        ...(input.topology?.knowledge_map.command_sources.map((path) => `folder-command-source:${path}`) ?? []),
        ...startup.startup_gold.reusable_patterns,
      ]).slice(0, MAX_STARTUP_ITEMS * 2),
      artifact_refs: artifactRefs,
      handoff_units: handoffUnits,
    },
    operational_memory: {
      interaction_count: interactionCount,
      success_rate: successRate,
      recent_channels: startup.startup_gold.recent_channels.slice(0, MAX_STARTUP_ITEMS),
      latest_status: input.memory?.recentOutcomes[0]?.status ?? null,
    },
    automation_plan: {
      next_best_actions: startup.startup_gold.next_best_actions.slice(0, MAX_STARTUP_ITEMS),
      commands_to_prioritize: unique([
        ...(input.nextSessionBrain?.execution_priority.map((priority) => priority.command) ?? []),
        ...(input.nextSessionBrain?.context_loading.outcome_ranked_commands ?? []),
        ...(input.nextSessionBrain?.context_loading.command_hints ?? []),
        ...(input.topology?.knowledge_map.validation_entrypoints ?? []),
        ...(input.topology?.knowledge_map.runtime_entrypoints ?? []),
        ...(input.topology?.execution_map.test_commands ?? []),
        ...(input.learning?.trusted_commands.filter((command) => /test|tsc|lint|check/i.test(command)) ?? []),
        ...(input.learning?.task_memory.trusted_task_commands ?? []),
        ...(input.topology?.execution_map.build_commands ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
      tests_to_run: unique([
        ...(input.topology?.knowledge_map.validation_entrypoints ?? []),
        ...(input.topology?.execution_map.test_commands ?? []),
        ...(input.handoffPack?.test_contract.focused_tests ?? []),
        ...(input.handoffPack?.test_contract.fallback_tests ?? []),
        ...startup.startup_gold.commands.filter((command) => /test|tsc|build|lint/i.test(command)),
      ]).slice(0, MAX_STARTUP_ITEMS),
      missing_artifacts: (input.handoffPack?.missing_artifacts ?? []).slice(0, MAX_STARTUP_ITEMS),
      warnings: unique([
        ...startup.startup_gold.warnings,
        ...(input.topology?.knowledge_map.sensitive_zones.map((zone) => `zona sensível:${zone}`) ?? []),
        ...(input.topology?.knowledge_map.summarize_only.map((item) => `usar como resumo:${item}`) ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      internal_ids_included: false,
      absolute_paths_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

export function buildAwisWorkspaceStartupPlaybook(input: {
  workspaceName: string
  startupSnapshot: AwisWorkspaceStartupSnapshot | null
  startupBriefing: AwisWorkspaceStartupBriefing | null
  brain: AtlasWorkspaceBrainSnapshot | null
  topology: AwisWorkspaceTopologyProjection | null
  memory: AwisWorkspaceMemorySnapshot | null
  learning: AwisWorkspaceLearningProjection | null
  relations?: AwisWorkspaceRelationProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  handoffPack: AwisWorkspaceHandoffProjection | null
}): AwisWorkspaceStartupPlaybook | null {
  const startup = input.startupSnapshot
  const briefing = input.startupBriefing
  if (!startup || !briefing) return null

  const strongestSpace = input.spaces?.strongest_spaces[0] ?? null
  const hasMultipleUsefulSessions = Boolean(strongestSpace && strongestSpace.session_count >= 2)
  const hasRelations = Boolean(input.relations && input.relations.related_workspaces.length > 0)
  const hasValidation = briefing.automation_plan.tests_to_run.length > 0 || briefing.automation_plan.commands_to_prioritize.length > 0
  const recommendedSurface: AwisWorkspaceStartupPlaybook['recommended_surface'] = hasMultipleUsefulSessions
    ? 'space_first'
    : hasRelations
      ? 'side_by_side'
      : 'single_conversation'
  const avoidLoading = unique([
    'conversa bruta completa sem pedido explícito',
    'paths absolutos do Mac no provider',
    input.brain?.truncated ? 'scan profundo além do limite local' : null,
    ...(startup.startup_gold.warnings.map((warning) => `evitar:${warning}`)),
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const primaryValidationCommands = unique([
    ...briefing.automation_plan.tests_to_run,
    ...briefing.automation_plan.commands_to_prioritize.filter((command) => /test|tsc|lint|check/i.test(command)),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const fallbackValidationCommands = unique([
    ...(input.topology?.execution_map.check_commands ?? []),
    ...(input.topology?.execution_map.build_commands ?? []),
    ...startup.startup_gold.commands.filter((command) => !primaryValidationCommands.includes(command) && /build|check|lint|tsc/i.test(command)),
  ]).slice(0, MAX_STARTUP_ITEMS)

  return {
    schema_version: 'atlas.awis.workspace_startup_playbook.v1',
    source: 'local_awis_execution_compiler',
    generated_for_workspace: input.workspaceName,
    recommended_surface: recommendedSurface,
    context_loading: {
      must_load: unique([
        startup.readiness.learning_ready ? 'aprendizado consolidado' : null,
        ...briefing.focus.load_sequence,
        startup.readiness.topology_ready ? 'mapa de componentes' : null,
        startup.readiness.memory_ready ? 'memória local estabilizada' : null,
        startup.readiness.spaces_ready ? 'Space mais forte' : null,
        startup.readiness.relations_ready ? 'relações entre workspaces' : null,
      ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      optional: unique([
        ...briefing.context_gold.artifact_refs.map((ref) => `artefato:${ref}`),
        ...(input.artifactReplay?.reusable_startup_gold.reusable_patterns ?? []),
        ...(input.learning?.trusted_commands.map((command) => `comando confiável:${command}`) ?? []),
        ...(input.learning?.task_memory.task_kinds.map((taskKind) => `tarefa aprendida:${taskKind}`) ?? []),
        ...(input.relations?.related_workspaces.flatMap((workspace) => workspace.recommended_transfer) ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
      avoid_loading: avoidLoading,
    },
    execution: {
      primary_validation_commands: primaryValidationCommands,
      fallback_validation_commands: fallbackValidationCommands,
      requires_local_folder: startup.readiness.folder_map_ready || hasValidation,
    },
    collaboration: {
      resume_space: strongestSpace?.title ?? null,
      compare_sessions: recommendedSurface !== 'single_conversation',
      related_workspace_hints: (input.relations?.related_workspaces ?? [])
        .map((workspace) => workspace.workspace_hint)
        .slice(0, MAX_STARTUP_ITEMS),
    },
    learning_hooks: {
      record_outcome: true,
      update_memory_after_send: true,
      persist_startup_artifact: true,
      watch_for_drift: startup.readiness.folder_map_ready,
    },
    risk_controls: unique([
      ...briefing.automation_plan.warnings,
      ...(input.handoffPack?.scope_guard.sensitive_areas.map((area) => `área sensível: ${area}`) ?? []),
      ...(input.learning?.caution_signals ?? []),
      'aplicar transferência entre workspaces só quando stack combinar',
    ]).slice(0, MAX_STARTUP_ITEMS),
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

export function buildAwisWorkspaceContinuityProjection(input: {
  workspaceName: string
  startupBriefing: AwisWorkspaceStartupBriefing | null
  startupPlaybook: AwisWorkspaceStartupPlaybook | null
  topology: AwisWorkspaceTopologyProjection | null
  memory: AwisWorkspaceMemorySnapshot | null
  learning: AwisWorkspaceLearningProjection | null
  relations?: AwisWorkspaceRelationProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactLake: AwisWorkspaceArtifactLakeSummary | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  nextSessionBrain: AwisWorkspaceNextSessionBrainProjection | null
  handoffPack: AwisWorkspaceHandoffProjection | null
}): AwisWorkspaceContinuityProjection | null {
  const restorePriority: AwisWorkspaceContinuityProjection['restore_priority'] = []
  const strongestSpace = input.spaces?.strongest_spaces[0] ?? null
  if (strongestSpace) {
    restorePriority.push({
      kind: 'space',
      label: strongestSpace.title,
      why: `${strongestSpace.session_count} sessões com ${strongestSpace.message_count} mensagens úteis`,
      confidence: Math.min(100, 55 + strongestSpace.session_count * 8 + strongestSpace.artifact_count * 6),
    })
  }
  for (const command of unique([
    ...(input.learning?.task_memory.trusted_task_commands ?? []),
    ...(input.startupBriefing?.automation_plan.commands_to_prioritize ?? []),
    ...(input.startupPlaybook?.execution.primary_validation_commands ?? []),
  ]).slice(0, 2)) {
    restorePriority.push({
      kind: 'command',
      label: command,
      why: 'comando apareceu como validação confiável ou prioridade de partida',
      confidence: input.learning?.task_memory.trusted_task_commands.includes(command) ? 92 : 76,
    })
  }
  for (const component of (input.topology?.components ?? []).slice(0, 2)) {
    restorePriority.push({
      kind: 'component',
      label: `${component.key} · ${component.role}`,
      why: component.stack.length > 0 ? `stack detectada: ${component.stack.slice(0, 2).join(', ')}` : 'componente forte do mapa local',
      confidence: component.confidence,
    })
  }
  for (const taskKind of (input.learning?.task_memory.task_kinds ?? []).slice(0, 2)) {
    restorePriority.push({
      kind: 'task_memory',
      label: taskKind,
      why: 'tipo de tarefa recorrente neste workspace',
      confidence: 82,
    })
  }
  if (input.artifactReplay?.latest_artifact_hash || input.artifactLake?.latest_artifact_hash) {
    restorePriority.push({
      kind: 'artifact',
      label: input.artifactReplay?.latest_artifact_hash ?? input.artifactLake?.latest_artifact_hash ?? 'artifact-lake',
      why: 'snapshot AWIS reutilizável disponível para replay',
      confidence: input.artifactReplay ? 88 : 72,
    })
  }
  if (input.handoffPack?.status === 'ready') {
    restorePriority.push({
      kind: 'handoff',
      label: input.handoffPack.consumer ?? 'handoff seguro',
      why: 'handoff canônico pronto para consumo',
      confidence: 90,
    })
  }
  for (const workspace of (input.relations?.related_workspaces ?? []).slice(0, 1)) {
    restorePriority.push({
      kind: 'relation',
      label: workspace.workspace_hint,
      why: workspace.recommended_transfer[0] ?? 'workspace compatível por sinais locais',
      confidence: workspace.overlap_score,
    })
  }

  const rankedRestore = restorePriority
    .sort((a, b) => b.confidence - a.confidence || a.kind.localeCompare(b.kind))
    .slice(0, MAX_STARTUP_ITEMS)
  const firstLoad = unique([
    ...(input.nextSessionBrain?.load_order ?? []),
    ...(input.startupBriefing?.focus.load_sequence ?? []),
    ...rankedRestore.map((item) => `${item.kind}:${item.label}`),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const validateWith = unique([
    ...(input.learning?.task_memory.trusted_task_commands ?? []),
    ...(input.startupPlaybook?.execution.primary_validation_commands ?? []),
    ...(input.handoffPack?.test_contract.focused_tests ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const staleOrRiskyContext = unique([
    ...(input.learning?.caution_signals ?? []),
    ...(input.startupBriefing?.automation_plan.warnings ?? []),
    ...(input.artifactReplay?.reusable_startup_gold.warnings ?? []),
    ...(input.handoffPack?.missing_artifacts.map((artifact) => `artefato pendente:${artifact}`) ?? []),
    input.memory?.driftEvents[0] ? 'mapa local mudou desde a memória anterior' : null,
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const signalCount = [
    rankedRestore.length > 0,
    firstLoad.length > 0,
    validateWith.length > 0,
    input.memory && input.memory.interactionCount > 0,
    input.learning && input.learning.maturity !== 'new',
    input.artifactReplay && input.artifactReplay.artifact_count > 0,
    input.nextSessionBrain?.status === 'ready',
    input.handoffPack?.status === 'ready',
  ].filter(Boolean).length
  if (signalCount === 0) return null

  return {
    schema_version: 'atlas.awis.workspace_continuity_projection.v1',
    source: 'local_awis_continuity_compiler',
    readiness_score: Math.min(100, Math.round((signalCount / 8) * 100)),
    restore_priority: rankedRestore,
    hot_context: {
      spaces: (input.spaces?.strongest_spaces ?? []).map((space) => space.title).slice(0, MAX_STARTUP_ITEMS),
      components: (input.topology?.components ?? []).map((component) => `${component.key} · ${component.role}`).slice(0, MAX_STARTUP_ITEMS),
      commands: validateWith,
      artifacts: unique([
        input.artifactReplay?.latest_artifact_hash ?? null,
        input.artifactLake?.latest_artifact_hash ?? null,
        ...(input.startupBriefing?.context_gold.artifact_refs ?? []),
      ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      task_kinds: input.learning?.task_memory.task_kinds.slice(0, MAX_STARTUP_ITEMS) ?? [],
      related_workspace_hints: input.relations?.related_workspaces.map((workspace) => workspace.workspace_hint).slice(0, MAX_STARTUP_ITEMS) ?? [],
    },
    stale_or_risky_context: staleOrRiskyContext,
    next_session_plan: {
      open_surface: input.startupPlaybook?.recommended_surface ?? 'single_conversation',
      first_load: firstLoad,
      validate_with: validateWith,
      preserve_as_artifact: true,
    },
    learning_hooks: {
      capture_outcome: true,
      refresh_folder_map: Boolean(input.memory?.driftEvents.length || input.topology?.root.scan_truncated),
      update_space_pack: Boolean(input.spaces && input.spaces.space_count > 0),
      replay_artifacts_before_send: Boolean(input.artifactReplay && input.artifactReplay.artifact_count > 0),
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
  }
}

export function buildAwisWorkspaceAutomationProjection(input: {
  startupBriefing: AwisWorkspaceStartupBriefing | null
  startupPlaybook: AwisWorkspaceStartupPlaybook | null
  continuity: AwisWorkspaceContinuityProjection | null
  memory: AwisWorkspaceMemorySnapshot | null
  learning: AwisWorkspaceLearningProjection | null
  relations?: AwisWorkspaceRelationProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  handoffPack: AwisWorkspaceHandoffProjection | null
}): AwisWorkspaceAutomationProjection | null {
  const queue: AwisWorkspaceAutomationProjection['maintenance_queue'] = []
  const push = (item: AwisWorkspaceAutomationProjection['maintenance_queue'][number]) => {
    if (queue.some((existing) => existing.action === item.action && existing.label === item.label)) return
    queue.push(item)
  }
  const maintenanceMemory = buildMaintenanceOperationalMemory(input.memory)
  if (input.continuity?.learning_hooks.refresh_folder_map) {
    push({
      action: 'refresh_folder_map',
      label: 'Atualizar mapa local',
      reason: 'continuidade detectou drift ou scan local limitado',
      priority: 'high',
      requires_human_confirmation: false,
    })
  }
  if (input.continuity?.learning_hooks.replay_artifacts_before_send || input.artifactReplay?.artifact_count) {
    push({
      action: 'replay_artifacts',
      label: 'Reusar replay AWIS',
      reason: 'artefatos de partida podem evitar sessão fria',
      priority: input.artifactReplay?.reusable_startup_gold.warnings.length ? 'medium' : 'high',
      requires_human_confirmation: false,
    })
  }
  if (input.continuity?.learning_hooks.update_space_pack || (input.spaces?.space_count ?? 0) > 0) {
    push({
      action: 'update_space_pack',
      label: 'Fortalecer Space ativo',
      reason: 'Space tem sessões reutilizáveis para pack seguro',
      priority: 'medium',
      requires_human_confirmation: false,
    })
  }
  if (input.startupPlaybook?.learning_hooks.record_outcome || input.continuity?.learning_hooks.capture_outcome) {
    push({
      action: 'record_outcome',
      label: 'Registrar resultado da sessão',
      reason: 'memória operacional melhora a próxima partida',
      priority: 'high',
      requires_human_confirmation: false,
    })
  }
  const commandToRevalidate = input.learning?.trusted_commands[0] ?? input.continuity?.next_session_plan.validate_with[0] ?? null
  if (commandToRevalidate) {
    push({
      action: 'revalidate_command',
      label: commandToRevalidate,
      reason: 'comando confiável deve ser revalidado quando o workspace muda',
      priority: input.memory?.driftEvents.length ? 'high' : 'medium',
      requires_human_confirmation: true,
    })
  }
  const riskSignal = input.handoffPack?.missing_artifacts[0] ?? input.continuity?.stale_or_risky_context[0] ?? input.learning?.caution_signals[0] ?? null
  if (riskSignal) {
    push({
      action: 'review_risk',
      label: riskSignal,
      reason: 'cautela precisa ficar visível antes de automatizar execução',
      priority: 'high',
      requires_human_confirmation: true,
    })
  }
  const relatedWorkspace = input.relations?.related_workspaces[0] ?? null
  if (relatedWorkspace) {
    push({
      action: 'cross_workspace_transfer',
      label: relatedWorkspace.workspace_hint,
      reason: relatedWorkspace.recommended_transfer[0] ?? 'workspace compatível pode transferir aprendizado abstrato',
      priority: relatedWorkspace.overlap_score >= 60 ? 'medium' : 'low',
      requires_human_confirmation: false,
    })
  }
  for (const item of maintenanceMemory.revalidate.slice(0, 4)) {
    const action = automationActionForMaintenance(item.action)
    push({
      action,
      label: item.label,
      reason: item.status === 'skipped'
        ? 'manutenção foi pulada recentemente; reavaliar antes de confiar de novo'
        : 'manutenção falhou recentemente; AWIS precisa recalibrar este ponto',
      priority: item.failures >= 2 ? 'high' : 'medium',
      requires_human_confirmation: action === 'revalidate_command' || action === 'review_risk',
    })
  }
  const sortedQueue = queue
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || a.action.localeCompare(b.action))
    .slice(0, MAX_STARTUP_ITEMS)
  if (sortedQueue.length === 0) return null
  const automationScore = Math.min(100, 28 + sortedQueue.length * 10 + maintenanceMemory.proven.length * 3 + (input.continuity?.readiness_score ?? 0) / 2)
  const mode: AwisWorkspaceAutomationProjection['mode'] = automationScore >= 75
    ? 'optimize'
    : automationScore >= 50
      ? 'maintain'
      : 'observe'
  return {
    schema_version: 'atlas.awis.workspace_automation_projection.v1',
    source: 'local_awis_maintenance_compiler',
    automation_score: Math.round(automationScore),
    mode,
    maintenance_queue: sortedQueue,
    autopilot_context: {
      before_send: sortedQueue
        .filter((item) => item.action === 'replay_artifacts' || item.action === 'review_risk' || item.action === 'refresh_folder_map')
        .map((item) => item.label)
        .slice(0, MAX_STARTUP_ITEMS),
      after_send: sortedQueue
        .filter((item) => item.action === 'record_outcome' || item.action === 'update_space_pack')
        .map((item) => item.label)
        .slice(0, MAX_STARTUP_ITEMS),
      on_startup: unique([
        ...(input.startupBriefing?.focus.load_sequence ?? []),
        ...(input.continuity?.next_session_plan.first_load ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
    },
    feedback_loop: {
      metrics_to_watch: unique([
        'taxa de sucesso',
        'uso do context pack',
        'drift do mapa local',
        input.spaces ? 'força dos Spaces' : null,
        input.artifactReplay ? 'replay de artefatos' : null,
      ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      promote_when: unique([
        'comando validado com sucesso',
        'Space reutilizado sem risco novo',
        'context pack aplicado em sessão real',
        ...maintenanceMemory.proven
          .slice(0, 3)
          .map((item) => `manutenção comprovada:${item.action}:${item.label}`),
      ]).slice(0, MAX_STARTUP_ITEMS),
      demote_when: unique([
        'envio falha ou é cancelado',
        'workspace muda antes de revalidar',
        'handoff reporta artefato pendente',
        ...maintenanceMemory.revalidate
          .slice(0, 3)
          .map((item) => `manutenção precisa revalidar:${item.action}:${item.label}`),
      ]).slice(0, MAX_STARTUP_ITEMS),
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
  }
}

export function buildAwisWorkspaceConfidenceProjection(input: {
  memory: AwisWorkspaceMemorySnapshot | null
  learning: AwisWorkspaceLearningProjection | null
  relations?: AwisWorkspaceRelationProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactLake: AwisWorkspaceArtifactLakeSummary | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  continuity: AwisWorkspaceContinuityProjection | null
  automation: AwisWorkspaceAutomationProjection | null
  handoffPack: AwisWorkspaceHandoffProjection | null
}): AwisWorkspaceConfidenceProjection | null {
  const maintenanceMemory = buildMaintenanceOperationalMemory(input.memory)
  const failedCommands = new Set(
    (input.memory?.recentOutcomes ?? [])
      .filter((outcome) => isFailedOutcome(outcome.status))
      .flatMap((outcome) => outcome.validationCommands),
  )
  const commandLabels = unique([
    ...(input.learning?.trusted_commands ?? []),
    ...(input.learning?.task_memory.trusted_task_commands ?? []),
    ...(input.continuity?.next_session_plan.validate_with ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const commands = commandLabels
    .map((command) => {
      const provenMaintenance = maintenanceMemory.proven.find((item) => item.action === 'revalidate_command' && item.label === command)
      const failedMaintenance = maintenanceMemory.revalidate.find((item) => item.action === 'revalidate_command' && item.label === command)
      const evidence = unique([
        input.learning?.trusted_commands.includes(command) ? 'aprendizado confiável' : null,
        input.learning?.task_memory.trusted_task_commands.includes(command) ? 'validou tarefa real' : null,
        input.continuity?.next_session_plan.validate_with.includes(command) ? 'plano de continuidade' : null,
        input.automation?.maintenance_queue.some((item) => item.action === 'revalidate_command' && item.label === command) ? 'fila de revalidação' : null,
        provenMaintenance ? `manutenção validou ${provenMaintenance.successes}x` : null,
      ].filter(isString))
      const caution = failedCommands.has(command)
        ? 'falhou em outcome recente'
        : failedMaintenance ? 'manutenção recente pediu revalidação'
        : input.memory?.driftEvents.length ? 'workspace mudou desde última confiança' : null
      return {
        label: command,
        score: clampConfidence(48 + evidence.length * 13 + (provenMaintenance ? 5 : 0) - (caution ? 18 : 0)),
        evidence,
        caution,
      }
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, MAX_STARTUP_ITEMS)
  const spaces = (input.spaces?.strongest_spaces ?? [])
    .map((space) => {
      const provenMaintenance = maintenanceMemory.proven.find((item) => (
        (item.action === 'update_space_pack' || item.action === 'open_side_by_side' || item.action === 'revalidate_context') && item.label === space.title
      ))
      const failedMaintenance = maintenanceMemory.revalidate.find((item) => (
        (item.action === 'update_space_pack' || item.action === 'open_side_by_side' || item.action === 'revalidate_context') && item.label === space.title
      ))
      const evidence = unique([
        `${space.session_count} sessões`,
        `${space.message_count} mensagens`,
        space.artifact_count > 0 ? `${space.artifact_count} artefato(s)` : null,
        space.decision_count > 0 ? `${space.decision_count} decisão(ões)` : null,
        input.continuity?.restore_priority.some((item) => item.kind === 'space' && item.label === space.title) ? 'prioridade de restauração' : null,
        provenMaintenance ? `manutenção validou ${provenMaintenance.successes}x` : null,
      ].filter(isString))
      const caution = space.risk_count > 0
        ? `${space.risk_count} risco(s) no Space`
        : failedMaintenance ? 'manutenção recente pediu revalidação'
        : space.pending_count > 0 ? `${space.pending_count} pendência(s)` : null
      return {
        label: space.title,
        score: clampConfidence(44 + space.session_count * 8 + space.artifact_count * 8 + space.decision_count * 5 + (provenMaintenance ? 5 : 0) - space.risk_count * 12 - space.pending_count * 6 - (failedMaintenance ? 8 : 0)),
        evidence,
        caution,
      }
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, MAX_STARTUP_ITEMS)
  const artifactLabels = unique([
    input.artifactReplay?.latest_artifact_hash ?? null,
    input.artifactLake?.latest_artifact_hash ?? null,
    ...(input.continuity?.hot_context.artifacts ?? []),
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const artifacts = artifactLabels
    .map((artifact) => {
      const provenMaintenance = maintenanceMemory.proven.find((item) => (
        (item.action === 'preserve_artifact' || item.action === 'replay_artifacts') && item.label === artifact
      ))
      const failedMaintenance = maintenanceMemory.revalidate.find((item) => (
        (item.action === 'preserve_artifact' || item.action === 'replay_artifacts') && item.label === artifact
      ))
      const evidence = unique([
        input.artifactReplay?.latest_artifact_hash === artifact ? 'replay disponível' : null,
        input.artifactLake?.latest_artifact_hash === artifact ? 'Artifact Lake local' : null,
        input.handoffPack?.context_units.some((unit) => unit.artifact_hash === artifact) ? 'handoff referencia' : null,
        provenMaintenance ? `manutenção validou ${provenMaintenance.successes}x` : null,
      ].filter(isString))
      const caution = failedMaintenance ? 'manutenção recente pediu revalidação' : input.artifactReplay?.reusable_startup_gold.warnings[0] ?? null
      return {
        label: artifact,
        score: clampConfidence(50 + evidence.length * 14 + (provenMaintenance ? 5 : 0) - (caution ? 15 : 0)),
        evidence,
        caution,
      }
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, MAX_STARTUP_ITEMS)
  const transfers = (input.relations?.related_workspaces ?? [])
    .map((workspace) => {
      const provenMaintenance = maintenanceMemory.proven.find((item) => (
        (item.action === 'cross_workspace_transfer' || item.action === 'transfer_learning') && item.label === workspace.workspace_hint
      ))
      const failedMaintenance = maintenanceMemory.revalidate.find((item) => (
        (item.action === 'cross_workspace_transfer' || item.action === 'transfer_learning') && item.label === workspace.workspace_hint
      ))
      return {
        label: workspace.workspace_hint,
        score: clampConfidence(workspace.overlap_score + (provenMaintenance ? 8 : 0) - (failedMaintenance ? 12 : 0)),
        evidence: unique([
          ...workspace.shared_languages.map((item) => `stack:${item}`),
          ...workspace.shared_commands.map((item) => `comando:${item}`),
          ...workspace.recommended_transfer,
          provenMaintenance ? `manutenção validou ${provenMaintenance.successes}x` : null,
        ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
        caution: failedMaintenance ? 'transferência pediu revalidação recente' : workspace.overlap_score < 60 ? 'transferir só como pista fraca' : null,
      }
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, MAX_STARTUP_ITEMS)
  const strongestScores = [
    commands[0]?.score ?? 0,
    spaces[0]?.score ?? 0,
    artifacts[0]?.score ?? 0,
    transfers[0]?.score ?? 0,
  ].filter((score) => score > 0)
  if (strongestScores.length === 0) return null
  const prefer = unique([
    commands[0] ? `comando:${commands[0].label}` : null,
    spaces[0] ? `Space:${spaces[0].label}` : null,
    artifacts[0] ? `artefato:${artifacts[0].label}` : null,
    transfers[0] && transfers[0].score >= 60 ? `transferência:${transfers[0].label}` : null,
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  return {
    schema_version: 'atlas.awis.workspace_confidence_projection.v1',
    source: 'local_awis_confidence_compiler',
    confidence_score: Math.round(strongestScores.reduce((sum, score) => sum + score, 0) / strongestScores.length),
    ranked: {
      commands,
      spaces,
      artifacts,
      transfers,
    },
    decision_policy: {
      prefer,
      require_confirmation_for: unique([
        ...commands.filter((item) => item.caution).map((item) => `comando:${item.label}`),
        ...spaces.filter((item) => item.caution).map((item) => `Space:${item.label}`),
        ...(input.automation?.maintenance_queue.filter((item) => item.requires_human_confirmation).map((item) => item.label) ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
      avoid_until_revalidated: unique([
        ...commands.filter((item) => item.score < 60 || item.caution).map((item) => item.label),
        ...(input.learning?.caution_signals ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
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
  }
}

export function buildAwisWorkspaceLivingGraphProjection(input: {
  workspaceName: string
  topology: AwisWorkspaceTopologyProjection | null
  learning: AwisWorkspaceLearningProjection | null
  relations?: AwisWorkspaceRelationProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  continuity: AwisWorkspaceContinuityProjection | null
  automation: AwisWorkspaceAutomationProjection | null
  confidence: AwisWorkspaceConfidenceProjection | null
  nextSessionBrain: AwisWorkspaceNextSessionBrainProjection | null
  handoffPack: AwisWorkspaceHandoffProjection | null
}): AwisWorkspaceLivingGraphProjection | null {
  const nodes = new Map<string, AwisWorkspaceLivingGraphProjection['nodes'][number]>()
  const edges: AwisWorkspaceLivingGraphProjection['edges'] = []
  const nodeKey = (kind: AwisWorkspaceLivingGraphProjection['nodes'][number]['kind'], label: string) => (
    `${kind}:${sanitizeComponentKey(label).slice(0, 72) || stableStringHash(label)}`
  )
  const addNode = (
    kind: AwisWorkspaceLivingGraphProjection['nodes'][number]['kind'],
    label: string,
    role: string,
    confidence: number,
    evidence: string[],
  ) => {
    const safeLabel = sanitizeProviderSafeText(label).slice(0, 160)
    if (!safeLabel) return null
    const key = nodeKey(kind, safeLabel)
    const nextNode = {
      key,
      kind,
      label: safeLabel,
      role: sanitizeProviderSafeText(role).slice(0, 96) || kind,
      confidence: normalizePercent(confidence),
      evidence: normalizeStringList(evidence, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString).slice(0, 4),
    }
    const previous = nodes.get(key)
    nodes.set(key, previous && previous.confidence >= nextNode.confidence
      ? {
          ...previous,
          evidence: unique([...previous.evidence, ...nextNode.evidence]).slice(0, 4),
        }
      : nextNode)
    return key
  }
  const addEdge = (from: string | null, to: string | null, reason: string, strength: number) => {
    if (!from || !to || from === to) return
    const safeReason = sanitizeProviderSafeText(reason).slice(0, 140)
    if (edges.some((edge) => edge.from === from && edge.to === to && edge.reason === safeReason)) return
    edges.push({
      from,
      to,
      reason: safeReason || 'contexto relacionado',
      strength: normalizePercent(strength),
    })
  }

  const commandNodes = new Map<string, string>()
  const ensureCommand = (command: string, confidence: number, evidence: string[]) => {
    const safeCommand = sanitizeProviderSafeText(command)
    if (!safeCommand) return null
    const existing = commandNodes.get(safeCommand)
    if (existing) return existing
    const key = addNode('command', safeCommand, 'validação ou execução provável', confidence, evidence)
    if (key) commandNodes.set(safeCommand, key)
    return key
  }

  for (const component of input.topology?.components ?? []) {
    const componentKey = addNode(
      'component',
      component.key,
      component.role,
      component.confidence,
      [
        component.stack[0] ? `stack:${component.stack[0]}` : null,
        component.manifests[0] ? `manifesto:${component.manifests[0]}` : null,
        component.docs[0] ? `doc:${component.docs[0]}` : null,
      ].filter(isString),
    )
    for (const command of component.commands.slice(0, 3)) {
      const commandKey = ensureCommand(command.command, Math.max(62, component.confidence - 6), [
        `componente:${component.key}`,
        `tipo:${command.kind}`,
      ])
      addEdge(componentKey, commandKey, 'componente declara ou sugere este comando', 78)
    }
  }

  for (const command of unique([
    ...(input.learning?.trusted_commands ?? []),
    ...(input.learning?.task_memory.trusted_task_commands ?? []),
    ...(input.continuity?.next_session_plan.validate_with ?? []),
    ...(input.nextSessionBrain?.execution_priority.map((priority) => priority.command) ?? []),
    ...(input.confidence?.ranked.commands.map((item) => item.label) ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)) {
    ensureCommand(command, input.confidence?.ranked.commands.find((item) => item.label === command)?.score ?? 82, [
      input.learning?.trusted_commands.includes(command) ? 'aprendizado confiável' : null,
      input.continuity?.next_session_plan.validate_with.includes(command) ? 'plano de continuidade' : null,
    ].filter(isString))
  }

  const strongestSpaceKeys = new Map<string, string>()
  for (const space of input.spaces?.strongest_spaces ?? []) {
    const key = addNode('space', space.title, `${space.session_count} sessões protegidas`, Math.min(100, 54 + space.session_count * 9 + space.artifact_count * 6), [
      `${space.message_count} mensagens`,
      space.artifact_count > 0 ? `${space.artifact_count} artefato(s)` : null,
      space.decision_count > 0 ? `${space.decision_count} decisão(ões)` : null,
    ].filter(isString))
    if (key) strongestSpaceKeys.set(space.title, key)
    for (const taskKind of input.learning?.task_memory.task_kinds.slice(0, 2) ?? []) {
      const taskKey = addNode('task_memory', taskKind, 'tipo de tarefa recorrente', 76, ['memória operacional'])
      addEdge(key, taskKey, 'Space preserva sessões desse tipo de trabalho', 68)
    }
  }

  const artifactLabels = unique([
    input.artifactReplay?.latest_artifact_hash ?? null,
    ...(input.continuity?.hot_context.artifacts ?? []),
    ...(input.nextSessionBrain?.artifact_refs ?? []),
    ...(input.handoffPack?.context_units.map((unit) => unit.artifact_hash).filter(isString) ?? []),
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  for (const artifact of artifactLabels) {
    const artifactKey = addNode('artifact', artifact, 'contexto reutilizável provider-safe', input.artifactReplay?.latest_artifact_hash === artifact ? 86 : 72, [
      input.artifactReplay?.latest_artifact_hash === artifact ? 'replay disponível' : null,
      input.handoffPack?.context_units.some((unit) => unit.artifact_hash === artifact) ? 'handoff referencia' : null,
    ].filter(isString))
    for (const spaceKey of Array.from(strongestSpaceKeys.values()).slice(0, 2)) {
      addEdge(spaceKey, artifactKey, 'Space pode alimentar artifact/context pack', 72)
    }
  }

  for (const workspace of input.relations?.related_workspaces ?? []) {
    const relationKey = addNode('related_workspace', workspace.workspace_hint, 'aprendizado transferível por stack compatível', workspace.overlap_score, [
      workspace.shared_languages[0] ? `stack:${workspace.shared_languages[0]}` : null,
      workspace.shared_commands[0] ? `comando:${workspace.shared_commands[0]}` : null,
    ].filter(isString))
    for (const command of workspace.shared_commands.slice(0, 2)) {
      addEdge(relationKey, ensureCommand(command, workspace.overlap_score, ['comando compartilhado']), 'workspace relacionado reforça comando conhecido', 58)
    }
  }

  if (input.handoffPack?.status === 'ready') {
    const handoffKey = addNode('handoff', input.handoffPack.consumer ?? 'handoff seguro', 'contrato de retomada seguro', 90, [
      input.handoffPack.workspace_readiness ?? null,
      input.handoffPack.context_units[0]?.artifact_type ?? null,
    ].filter(isString))
    for (const artifact of artifactLabels.slice(0, 2)) {
      addEdge(handoffKey, nodeKey('artifact', sanitizeProviderSafeText(artifact)), 'handoff aponta artefato reutilizável', 82)
    }
  }

  const sortedNodes = Array.from(nodes.values())
    .sort((a, b) => b.confidence - a.confidence || a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label))
  const graphNodeMap = new Map<string, AwisWorkspaceLivingGraphProjection['nodes'][number]>()
  for (const node of [
    ...[
      'component',
      'command',
      'space',
      'artifact',
      'task_memory',
      'related_workspace',
      'handoff',
    ].flatMap((kind) => sortedNodes.filter((node) => node.kind === kind).slice(0, 1)),
    ...sortedNodes,
  ]) {
    if (!graphNodeMap.has(node.key)) graphNodeMap.set(node.key, node)
  }
  const graphNodes = Array.from(graphNodeMap.values()).slice(0, MAX_STARTUP_ITEMS)
  const allowedKeys = new Set(graphNodes.map((node) => node.key))
  const graphEdges = edges
    .filter((edge) => allowedKeys.has(edge.from) && allowedKeys.has(edge.to))
    .sort((a, b) => b.strength - a.strength || a.reason.localeCompare(b.reason))
    .slice(0, MAX_STARTUP_ITEMS)
  if (graphNodes.length === 0) return null

  const goldenPath = unique([
    ...(input.continuity?.next_session_plan.first_load ?? []),
    ...(input.nextSessionBrain?.load_order ?? []),
    ...graphNodes.slice(0, 5).map((node) => `${node.kind}:${node.label}`),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const readinessSignals = [
    input.topology && input.topology.components.length > 0,
    input.spaces && input.spaces.space_count > 0,
    input.learning && input.learning.maturity !== 'new',
    input.artifactReplay && input.artifactReplay.artifact_count > 0,
    input.continuity && input.continuity.readiness_score >= 40,
    input.automation && input.automation.automation_score >= 40,
    input.confidence && input.confidence.confidence_score >= 40,
    graphEdges.length > 0,
    input.relations && input.relations.related_workspaces.length > 0,
    input.handoffPack?.status === 'ready',
  ].filter(Boolean).length

  return {
    schema_version: 'atlas.awis.workspace_living_graph_projection.v1',
    source: 'local_awis_living_graph_compiler',
    readiness_score: Math.min(100, 20 + readinessSignals * 8),
    nodes: graphNodes,
    edges: graphEdges,
    golden_path: goldenPath,
    autopilot_hints: {
      before_send: unique([
        ...(input.automation?.autopilot_context.before_send ?? []),
        artifactLabels.length > 0 ? 'reusar artifact replay antes de enviar' : null,
        input.confidence?.decision_policy.require_confirmation_for[0] ? `confirmar: ${input.confidence.decision_policy.require_confirmation_for[0]}` : null,
      ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS),
      after_send: unique([
        ...(input.automation?.autopilot_context.after_send ?? []),
        input.learning?.next_learning_event ?? null,
        'persistir rota viva se o resultado for útil',
      ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS),
      on_startup: unique([
        ...(input.automation?.autopilot_context.on_startup ?? []),
        ...goldenPath,
        input.workspaceName ? `workspace:${input.workspaceName}` : null,
      ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS),
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
  }
}

export function buildAwisWorkspaceContextKernelProjection(input: {
  topology: AwisWorkspaceTopologyProjection | null
  learning: AwisWorkspaceLearningProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  relations?: AwisWorkspaceRelationProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  continuity: AwisWorkspaceContinuityProjection | null
  automation: AwisWorkspaceAutomationProjection | null
  confidence: AwisWorkspaceConfidenceProjection | null
  livingGraph: AwisWorkspaceLivingGraphProjection | null
  nextSessionBrain: AwisWorkspaceNextSessionBrainProjection | null
  handoffPack: AwisWorkspaceHandoffProjection | null
}): AwisWorkspaceContextKernelProjection | null {
  const priorityLoad: AwisWorkspaceContextKernelProjection['priority_load'] = []
  const pushPriority = (item: AwisWorkspaceContextKernelProjection['priority_load'][number]) => {
    const safeLabel = sanitizeProviderSafeText(item.label).slice(0, 160)
    if (!safeLabel) return
    if (priorityLoad.some((existing) => existing.kind === item.kind && existing.label === safeLabel)) return
    priorityLoad.push({
      ...item,
      label: safeLabel,
      reason: sanitizeProviderSafeText(item.reason).slice(0, 160) || 'contexto prioritário',
      confidence: normalizePercent(item.confidence),
    })
  }

  for (const outcome of input.sessionGold?.strongest_outcomes ?? []) {
    pushPriority({
      kind: 'session_gold',
      label: outcome.label,
      reason: outcome.evidence[0] ?? 'resultado real reutilizável',
      confidence: outcome.confidence,
    })
  }
  for (const item of input.continuity?.restore_priority ?? []) {
    pushPriority({
      kind: contextKernelKindForRestore(item.kind),
      label: item.label,
      reason: item.why,
      confidence: item.confidence,
    })
  }
  for (const node of input.livingGraph?.nodes ?? []) {
    pushPriority({
      kind: contextKernelKindForGraphNode(node.kind),
      label: node.label,
      reason: node.evidence[0] ?? node.role,
      confidence: node.confidence,
    })
  }
  for (const item of input.confidence?.decision_policy.prefer ?? []) {
    const [rawKind, ...labelParts] = item.split(':')
    pushPriority({
      kind: contextKernelKindForPreference(rawKind),
      label: labelParts.join(':') || item,
      reason: 'política de confiança recomenda carregar primeiro',
      confidence: input.confidence?.confidence_score ?? 70,
    })
  }
  for (const command of unique([
    ...(input.sessionGold?.proven_commands.map((item) => item.command) ?? []),
    ...(input.nextSessionBrain?.execution_priority.map((item) => item.command) ?? []),
    ...(input.continuity?.next_session_plan.validate_with ?? []),
  ]).slice(0, 4)) {
    pushPriority({
      kind: 'command',
      label: command,
      reason: 'comando comprovado ou prioritário para validar a próxima ação',
      confidence: input.sessionGold?.proven_commands.some((item) => item.command === command) ? 92 : 78,
    })
  }

  const sortedPriority = priorityLoad
    .sort((a, b) => b.confidence - a.confidence || a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label))
    .slice(0, MAX_STARTUP_ITEMS)
  const signalCount = [
    sortedPriority.length > 0,
    input.sessionGold && input.sessionGold.readiness_score >= 40,
    input.livingGraph && input.livingGraph.readiness_score >= 40,
    input.continuity && input.continuity.readiness_score >= 40,
    input.confidence && input.confidence.confidence_score >= 40,
    input.automation && input.automation.automation_score >= 40,
    input.artifactReplay && input.artifactReplay.artifact_count > 0,
    input.handoffPack?.status === 'ready',
    input.relations && input.relations.related_workspaces.length > 0,
  ].filter(Boolean).length
  if (signalCount === 0) return null

  const readinessScore = Math.min(100, 18 + signalCount * 9 + Math.min(16, sortedPriority.length * 2))
  const mode: AwisWorkspaceContextKernelProjection['budget']['mode'] = readinessScore >= 82
    ? 'deep'
    : readinessScore >= 58
      ? 'balanced'
      : 'lean'
  const validationCommands = unique([
    ...(input.sessionGold?.next_session_hooks.validate_with ?? []),
    ...(input.continuity?.next_session_plan.validate_with ?? []),
    ...(input.handoffPack?.test_contract.focused_tests ?? []),
    ...(input.learning?.trusted_commands.filter((command) => /test|tsc|lint|check|build/i.test(command)) ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const riskySignals = unique([
    ...(input.confidence?.decision_policy.require_confirmation_for ?? []),
    ...(input.confidence?.decision_policy.avoid_until_revalidated ?? []),
    ...(input.continuity?.stale_or_risky_context ?? []),
    ...(input.sessionGold?.recovery_patterns ?? []),
    ...(input.handoffPack?.missing_artifacts.map((artifact) => `artefato pendente:${artifact}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  return {
    schema_version: 'atlas.awis.workspace_context_kernel_projection.v1',
    source: 'local_awis_context_kernel_compiler',
    readiness_score: readinessScore,
    budget: {
      mode,
      max_context_items: mode === 'deep' ? MAX_STARTUP_ITEMS : mode === 'balanced' ? 7 : 4,
      reason: mode === 'deep'
        ? 'múltiplas fontes vivas concordam sobre o próximo contexto'
        : mode === 'balanced'
          ? 'contexto suficiente para carregar sem excesso'
          : 'carregar só o essencial até haver mais evidência',
    },
    priority_load: sortedPriority,
    compression_plan: {
      send_full: unique([
        sortedPriority.find((item) => item.kind === 'session_gold')?.label ?? null,
        sortedPriority.find((item) => item.kind === 'command')?.label ?? null,
        input.handoffPack?.status === 'ready' ? 'handoff seguro' : null,
      ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      summarize: unique([
        ...(input.livingGraph?.golden_path ?? []),
        ...(input.spaces?.strongest_spaces.map((space) => `Space:${space.title}`) ?? []),
        ...(input.topology?.components.map((component) => `componente:${component.key}`) ?? []),
        ...(input.relations?.related_workspaces.map((workspace) => `relação:${workspace.workspace_hint}`) ?? []),
        input.artifactReplay ? 'artifact replay' : null,
      ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS),
      omit: unique([
        'conversa bruta completa sem pedido explícito',
        'conteúdo livre de arquivos',
        'paths absolutos do Mac',
        'ids internos de conversa',
        ...riskySignals.map((signal) => `revalidar antes:${signal}`),
      ]).slice(0, MAX_STARTUP_ITEMS),
    },
    validation_plan: {
      commands: validationCommands,
      confidence_floor: input.confidence?.confidence_score ?? readinessScore,
      requires_human_confirmation: riskySignals.length > 0 || validationCommands.length === 0,
    },
    learning_contract: {
      capture_outcome: true,
      update_space_pack: Boolean(input.spaces && input.spaces.space_count > 0),
      promote_artifact_after_success: Boolean(input.artifactReplay || input.sessionGold?.strongest_outcomes.length),
      refresh_folder_map_on_drift: input.continuity?.learning_hooks.refresh_folder_map === true,
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
  }
}

export function buildAwisWorkspaceExecutionDoctrineProjection(input: {
  memory: AwisWorkspaceMemorySnapshot | null
  learning: AwisWorkspaceLearningProjection | null
  topology: AwisWorkspaceTopologyProjection | null
  componentMemory: AwisWorkspaceComponentMemoryProjection | null
  contextKernel: AwisWorkspaceContextKernelProjection | null
  confidence: AwisWorkspaceConfidenceProjection | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
}): AwisWorkspaceExecutionDoctrineProjection | null {
  const trustedCommands = unique([
    ...(input.learning?.trusted_commands ?? []),
    ...(input.learning?.task_memory.trusted_task_commands ?? []),
    ...(input.componentMemory?.strongest_components.flatMap((component) => component.outcome_memory.trusted_commands) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const revalidate = unique([
    ...(input.contextKernel?.validation_plan.commands ?? []),
    ...(input.confidence?.decision_policy.avoid_until_revalidated ?? []),
    ...(input.memoryFreshness?.evidence.revalidate ?? []),
    ...(input.componentMemory?.strongest_components
      .filter((component) => component.reuse_policy.validate_before_execution)
      .map((component) => `validar área:${component.key}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const avoid = unique([
    ...(input.contextKernel?.compression_plan.omit ?? []),
    ...(input.componentMemory?.strongest_components.flatMap((component) => component.outcome_memory.caution_signals) ?? []),
    ...(input.confidence?.decision_policy.require_confirmation_for.map((item) => `confirmar antes:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const hasCodeSignals = Boolean(input.topology?.components.length || trustedCommands.length || revalidate.length)
  const hasFrontendSignals = input.topology?.components.some((component) => /desktop|frontend|react|ui|app/i.test([
    component.key,
    component.role,
    ...component.stack,
  ].join(' '))) === true
  const hasBackendSignals = input.topology?.components.some((component) => /server|backend|api|laravel|php/i.test([
    component.key,
    component.role,
    ...component.stack,
  ].join(' '))) === true
  const drivers: AwisWorkspaceExecutionDoctrineProjection['doctrine_drivers'] = [
    hasCodeSignals
      ? {
          name: 'TDD',
          applies_to: ['bug_fix', 'code_change'],
          required: true,
          gate: revalidate[0] ?? trustedCommands[0] ?? 'definir validação mínima antes do patch',
          reason: 'mudança de código precisa preservar aprendizado por teste ou checagem equivalente',
        }
      : null,
    {
      name: 'CDD',
      applies_to: ['code_change', 'ops'],
      required: hasBackendSignals,
      gate: hasBackendSignals ? 'confirmar contrato ou endpoint antes de alterar integração' : 'usar contrato quando houver API ou payload',
      reason: 'evita alterar payload, bridge ou backend sem contrato verificável',
    },
    {
      name: 'FDD',
      applies_to: ['code_change', 'design'],
      required: false,
      gate: 'entregar fatia pequena e verificável',
      reason: 'mantém o workspace evoluindo por incrementos auditáveis',
    },
    hasFrontendSignals
      ? {
          name: 'UXD',
          applies_to: ['design', 'code_change'],
          required: true,
          gate: 'validar tela real quando a mudança afetar experiência',
          reason: 'mudança visual precisa reduzir carga cognitiva, não só compilar',
        }
      : null,
    {
      name: 'RiskDD',
      applies_to: ['ops', 'bug_fix', 'code_change'],
      required: avoid.length > 0 || input.contextKernel?.validation_plan.requires_human_confirmation === true,
      gate: avoid[0] ?? 'avaliar risco antes de executar comando destrutivo',
      reason: 'AWIS não deve transformar memória fraca ou falha recente em ação automática',
    },
    {
      name: 'DocsDD',
      applies_to: ['research', 'analysis', 'code_change'],
      required: input.topology?.components.some((component) => component.docs.length > 0) === true,
      gate: 'ler doc dono quando houver documentação canônica',
      reason: 'documentação canônica vence memória de conversa e projeções antigas',
    },
    {
      name: 'EvidenceDD',
      applies_to: ['research', 'analysis', 'bug_fix', 'code_change', 'ops', 'design', 'unknown'],
      required: true,
      gate: 'registrar evidência de resultado ao final',
      reason: 'cada sessão precisa alimentar memória futura com outcome verificável',
    },
  ].filter((driver): driver is AwisWorkspaceExecutionDoctrineProjection['doctrine_drivers'][number] => Boolean(driver))
  const signalCount = [
    input.memory && input.memory.interactionCount > 0,
    input.learning && input.learning.maturity !== 'new',
    input.contextKernel,
    input.confidence,
    input.componentMemory,
    input.memoryFreshness && input.memoryFreshness.state !== 'cold',
  ].filter(Boolean).length
  if (signalCount === 0 && drivers.length === 0) return null
  const maturity: AwisWorkspaceExecutionDoctrineProjection['maturity'] =
    input.learning?.maturity === 'battle_tested' || (input.memory?.successCount ?? 0) >= 8
      ? 'battle_tested'
      : input.learning?.maturity === 'stable' || (input.memory?.successCount ?? 0) >= 3
        ? 'stable'
        : input.learning?.maturity === 'learning' || (input.memory?.interactionCount ?? 0) > 0
          ? 'learning'
          : 'new'

  return {
    schema_version: 'atlas.awis.workspace_execution_doctrine_projection.v1',
    source: 'local_awis_execution_doctrine_compiler',
    maturity,
    doctrine_drivers: drivers.slice(0, MAX_STARTUP_ITEMS),
    preflight: {
      required_before_execution: unique([
        input.memoryFreshness?.state === 'stale' || input.memoryFreshness?.state === 'cold' ? 'revalidar memória antes de confiar' : null,
        input.contextKernel?.validation_plan.requires_human_confirmation ? 'confirmar risco humano antes de executar' : null,
        revalidate.length > 0 ? 'rodar ou justificar validação mínima' : null,
      ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      human_responsibility: unique([
        'aprovar comandos destrutivos ou com side effects externos',
        'corrigir objetivo quando a intenção estiver ambígua',
        ...(avoid.length > 0 ? ['decidir se contexto arriscado deve ser reusado'] : []),
      ]).slice(0, MAX_STARTUP_ITEMS),
      automation: unique([
        'carregar context pack AWIS antes do envio',
        'anexar componentKeys ao outcome',
        'promover comandos após sucesso comprovado',
        'demover contexto após falha repetida',
      ]).slice(0, MAX_STARTUP_ITEMS),
    },
    command_policy: {
      trusted: trustedCommands,
      revalidate,
      avoid,
    },
    learning_contract: {
      record_outcome: true,
      attach_component_keys: true,
      promote_after_success: unique([
        ...trustedCommands.map((command) => `comando:${command}`),
        'artifact startup snapshot',
      ]).slice(0, MAX_STARTUP_ITEMS),
      demote_after_failure: unique([
        ...revalidate.map((item) => `revalidar:${item}`),
        ...avoid.map((item) => `evitar:${item}`),
      ]).slice(0, MAX_STARTUP_ITEMS),
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
  }
}

export function buildAwisWorkspaceProviderStrategyProjection(input: {
  memory: AwisWorkspaceMemorySnapshot | null
  learning: AwisWorkspaceLearningProjection | null
  executionDoctrine: AwisWorkspaceExecutionDoctrineProjection | null
}): AwisWorkspaceProviderStrategyProjection | null {
  const outcomes = (input.memory?.recentOutcomes ?? []).filter((outcome) => isString(outcome.provider))
  if (outcomes.length === 0) return null
  const stats = new Map<string, {
    provider: string
    model: string | null
    success: number
    failure: number
    latencies: number[]
    taskKinds: Set<string>
  }>()
  for (const outcome of outcomes) {
    if (!outcome.provider) continue
    const provider = sanitizeProviderSafeText(outcome.provider).slice(0, 80)
    const model = outcome.model ? sanitizeProviderSafeText(outcome.model).slice(0, 96) : null
    if (!provider) continue
    const key = `${provider}::${model ?? 'default'}`
    const existing = stats.get(key) ?? {
      provider,
      model,
      success: 0,
      failure: 0,
      latencies: [],
      taskKinds: new Set<string>(),
    }
    if (isFailedOutcome(outcome.status)) existing.failure += 1
    else existing.success += 1
    if (typeof outcome.latencyMs === 'number' && Number.isFinite(outcome.latencyMs) && outcome.latencyMs > 0) {
      existing.latencies.push(outcome.latencyMs)
    }
    if (outcome.taskKind && outcome.taskKind !== 'unknown') existing.taskKinds.add(outcome.taskKind)
    stats.set(key, existing)
  }
  const preferred = Array.from(stats.values())
    .map((stat) => {
      const total = stat.success + stat.failure
      const successRate = total > 0 ? Math.round((stat.success / total) * 100) : null
      const avgLatency = stat.latencies.length
        ? Math.round(stat.latencies.reduce((sum, item) => sum + item, 0) / stat.latencies.length)
        : null
      const policy: AwisWorkspaceProviderStrategyProjection['preferred'][number]['policy'] =
        stat.failure >= 2 && stat.failure >= stat.success
          ? 'avoid'
          : stat.failure > 0
            ? 'revalidate'
            : stat.success >= 2 && (successRate ?? 0) >= 75
              ? 'prefer'
              : 'use_when_matched'
      return {
        provider: stat.provider,
        model: stat.model,
        policy,
        success_count: stat.success,
        failure_count: stat.failure,
        success_rate: successRate,
        avg_latency_ms: avgLatency,
        task_kinds: Array.from(stat.taskKinds).sort().slice(0, MAX_STARTUP_ITEMS),
        reason: providerStrategyReason(policy, stat.success, stat.failure, avgLatency),
      }
    })
    .sort((a, b) => providerPolicyWeight(b.policy) - providerPolicyWeight(a.policy)
      || b.success_count - a.success_count
      || (a.avg_latency_ms ?? Number.MAX_SAFE_INTEGER) - (b.avg_latency_ms ?? Number.MAX_SAFE_INTEGER)
      || a.provider.localeCompare(b.provider))
    .slice(0, MAX_STARTUP_ITEMS)
  if (preferred.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_provider_strategy_projection.v1',
    source: 'local_awis_provider_strategy_compiler',
    provider_count: preferred.length,
    preferred,
    fallback_order: preferred
      .filter((item) => item.policy !== 'avoid')
      .map((item) => item.model ? `${item.provider}:${item.model}` : item.provider)
      .slice(0, MAX_STARTUP_ITEMS),
    caution_signals: unique([
      ...preferred
        .filter((item) => item.policy === 'avoid' || item.policy === 'revalidate')
        .map((item) => `${item.policy}:${item.model ? `${item.provider}:${item.model}` : item.provider}`),
      ...(input.executionDoctrine?.preflight.required_before_execution.map((item) => `preflight:${item}`) ?? []),
      ...(input.learning?.caution_signals.filter((item) => /provider|modelo|latência|falha/i.test(item)) ?? []),
    ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
    learning_contract: {
      record_provider: true,
      record_model: true,
      record_latency: true,
      promote_after_successes: 2,
      demote_after_failures: 2,
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
  }
}

export function buildAwisWorkspaceTaskRouterProjection(input: {
  memory: AwisWorkspaceMemorySnapshot | null
  topology: AwisWorkspaceTopologyProjection | null
  componentMemory: AwisWorkspaceComponentMemoryProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  contextKernel: AwisWorkspaceContextKernelProjection | null
  executionDoctrine: AwisWorkspaceExecutionDoctrineProjection | null
  providerStrategy: AwisWorkspaceProviderStrategyProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  learning: AwisWorkspaceLearningProjection | null
  continuity: AwisWorkspaceContinuityProjection | null
  startupPlaybook: AwisWorkspaceStartupPlaybook | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
}): AwisWorkspaceTaskRouterProjection | null {
  const routeKinds: AwisWorkspaceTaskContextProjection['task_kind'][] = [
    'bug_fix',
    'code_change',
    'research',
    'analysis',
    'design',
    'ops',
  ]
  const topSpaces = (input.spaces?.strongest_spaces ?? []).slice(0, 3)
  const routeOutcomeStats = buildRouteOutcomeStats(input.memory)
  const topComponents = (input.componentMemory?.strongest_components ?? [])
    .slice(0, 4)
    .map((component) => component.key)
  const topologyComponents = (input.topology?.components ?? [])
    .slice(0, 4)
    .map((component) => component.key)
  const reusableArtifacts = unique([
    input.artifactReplay?.latest_artifact_hash ?? null,
    ...(input.artifactReplay?.reusable_startup_gold.reusable_patterns ?? []),
    ...(input.continuity?.hot_context.artifacts ?? []),
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const testCommands = unique([
    ...(input.contextKernel?.validation_plan.commands ?? []),
    ...(input.sessionGold?.proven_commands.map((command) => command.command) ?? []),
    ...(input.topology?.execution_map.test_commands ?? []),
    ...(input.topology?.execution_map.check_commands ?? []),
    ...(input.startupPlaybook?.execution.primary_validation_commands ?? []),
  ]).filter((command) => /test|tsc|lint|check/i.test(command)).slice(0, MAX_STARTUP_ITEMS)
  const buildCommands = unique([
    ...(input.topology?.execution_map.build_commands ?? []),
    ...(input.startupPlaybook?.execution.fallback_validation_commands ?? []),
  ]).filter((command) => /build|compile|typecheck|tsc/i.test(command)).slice(0, MAX_STARTUP_ITEMS)
  const fallbackLoad = unique([
    ...(input.contextKernel?.priority_load.map((item) => `${item.kind}:${item.label}`) ?? []),
    ...(input.continuity?.next_session_plan.first_load ?? []),
    ...(topSpaces[0] ? [`Space:${topSpaces[0].title}`] : []),
    ...(topComponents.length ? [`componente:${topComponents[0]}`] : []),
    ...(reusableArtifacts[0] ? [`artefato:${reusableArtifacts[0]}`] : []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const fallbackAvoid = unique([
    'conversa bruta completa sem pedido explícito',
    'paths absolutos do Mac no provider',
    ...(input.memoryFreshness?.evidence.revalidate.map((item) => `revalidar:${item}`) ?? []),
    ...(input.providerStrategy?.caution_signals.map((item) => `provider:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  const routeFor = (taskKind: AwisWorkspaceTaskContextProjection['task_kind']): AwisWorkspaceTaskRouterProjection['routes'][number] => {
    const routeKey = `task:${taskKind}`
    const routeStats = routeOutcomeStats.get(routeKey) ?? routeOutcomeStats.get(taskKind) ?? null
    const codeLike = taskKind === 'bug_fix' || taskKind === 'code_change'
    const exploratory = taskKind === 'research' || taskKind === 'analysis' || taskKind === 'design'
    const opsLike = taskKind === 'ops'
    const useComponents = codeLike
      ? unique([...topComponents, ...topologyComponents]).slice(0, 4)
      : taskKind === 'design'
        ? unique([...topComponents, ...topologyComponents].filter((item) => /desktop|ui|surface|app|composer|atlas-ai/i.test(item))).slice(0, 4)
        : topologyComponents.slice(0, 2)
    const useSpaces = exploratory || taskKind === 'bug_fix'
      ? topSpaces.map((space) => `${space.title} · ${space.session_count} sessões`).slice(0, 3)
      : []
    const validateWith = unique([
      ...(codeLike ? [...testCommands, ...buildCommands] : []),
      ...(taskKind === 'design' ? testCommands.filter((command) => /atlas-ai|test|tsc/i.test(command)) : []),
      ...(opsLike ? [...testCommands, ...buildCommands] : []),
      ...(input.executionDoctrine?.doctrine_drivers
        .filter((driver) => driver.required && driver.applies_to.includes(taskKind))
        .map((driver) => `${driver.name}:${driver.gate}`) ?? []),
    ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
    const loadFirst = unique([
      codeLike ? 'mapa de componentes' : null,
      exploratory && topSpaces[0] ? `Space:${topSpaces[0].title}` : null,
      taskKind === 'design' ? 'surface:Atlas AI' : null,
      opsLike ? 'gates de execução' : null,
      ...useComponents.map((component) => `componente:${component}`),
      ...useSpaces.map((space) => `Space:${space}`),
      ...(exploratory ? reusableArtifacts.map((artifact) => `artefato:${artifact}`) : reusableArtifacts.slice(0, 2).map((artifact) => `artefato:${artifact}`)),
      ...(input.learning?.task_memory.trusted_task_commands.map((command) => `comando confiável:${command}`) ?? []),
    ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
    const routeSuccessRate = routeStats && routeStats.total > 0 ? Math.round((routeStats.success / routeStats.total) * 100) : null
    const routePolicy: AwisWorkspaceTaskRouterProjection['routes'][number]['policy'] =
      routeStats && routeStats.failure > 0 && routeStats.failure >= routeStats.success
        ? 'revalidate'
        : routeStats && routeStats.success >= 2 && (routeSuccessRate ?? 0) >= 75
          ? 'prefer'
          : 'use_when_matched'
    const intentSignals = intentSignalsForTaskRoute(taskKind, useComponents, useSpaces, validateWith)
    const evidencePlan = buildTaskRouteEvidencePlan({
      taskKind,
      loadFirst,
      useComponents,
      useSpaces,
      useArtifacts: reusableArtifacts,
      validateWith,
      contextKernel: input.contextKernel,
      sessionGold: input.sessionGold,
      memoryFreshness: input.memoryFreshness,
      routePolicy,
      routeSuccessRate,
    })
    const automationHooks = buildTaskRouteAutomationHooks({
      taskKind,
      validateWith,
      useComponents,
      useSpaces,
      evidencePlan,
      routePolicy,
      providerStrategy: input.providerStrategy,
    })
    const confidenceSignals = [
      loadFirst.length > 0,
      useComponents.length > 0,
      useSpaces.length > 0,
      validateWith.length > 0,
      reusableArtifacts.length > 0,
      input.providerStrategy?.preferred.length,
      input.memoryFreshness?.state === 'fresh' || input.memoryFreshness?.state === 'warm',
    ].filter(Boolean).length
    const suggestedSurface: AwisWorkspaceTaskRouterProjection['routes'][number]['suggested_surface'] =
      exploratory && useSpaces.length > 0
        ? 'space_first'
        : codeLike && useSpaces.length > 0
          ? 'side_by_side'
          : input.startupPlaybook?.recommended_surface ?? 'single_conversation'
    return {
      task_kind: taskKind,
      route_key: routeKey,
      confidence: Math.min(100, 35 + confidenceSignals * 9 + (routePolicy === 'prefer' ? 8 : routePolicy === 'revalidate' ? -8 : 0)),
      success_count: routeStats?.success ?? 0,
      failure_count: routeStats?.failure ?? 0,
      success_rate: routeSuccessRate,
      last_used_at: routeStats?.lastUsedAt ?? null,
      policy: routePolicy,
      suggested_surface: suggestedSurface,
      load_first: loadFirst,
      use_spaces: useSpaces,
      use_components: useComponents,
      use_artifacts: reusableArtifacts.slice(0, exploratory ? 4 : 2),
      validate_with: validateWith,
      avoid_loading: fallbackAvoid,
      intent_signals: intentSignals,
      evidence_plan: evidencePlan,
      automation_hooks: automationHooks,
      reason: taskRouterReason(taskKind, loadFirst.length, validateWith.length, useSpaces.length, routePolicy, routeSuccessRate),
    }
  }

  const routes = routeKinds
    .map(routeFor)
    .filter((route) => route.load_first.length > 0 || route.validate_with.length > 0 || route.use_spaces.length > 0)
    .sort((a, b) => b.confidence - a.confidence || a.task_kind.localeCompare(b.task_kind))
    .slice(0, MAX_STARTUP_ITEMS)
  if (routes.length === 0 && fallbackLoad.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_task_router_projection.v1',
    source: 'local_awis_task_router_compiler',
    route_count: routes.length,
    routes,
    fallback_route: {
      load_first: fallbackLoad,
      validate_with: unique([...testCommands, ...buildCommands]).slice(0, MAX_STARTUP_ITEMS),
      avoid_loading: fallbackAvoid,
      reason: fallbackLoad.length > 0 ? 'partida genérica baseada no contexto quente do workspace' : 'sem contexto suficiente para rota especializada',
    },
    learning_contract: {
      record_task_kind: true,
      record_selected_route: true,
      promote_route_after_successes: 2,
      revalidate_route_after_failures: 1,
    },
    safety: {
      raw_user_message_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function buildRouteOutcomeStats(memory: AwisWorkspaceMemorySnapshot | null): Map<string, {
  success: number
  failure: number
  total: number
  lastUsedAt: string | null
}> {
  const stats = new Map<string, { success: number; failure: number; total: number; lastUsedAt: string | null }>()
  for (const outcome of memory?.recentOutcomes ?? []) {
    const keys = unique([
      outcome.routeKey ?? null,
      outcome.taskKind ? `task:${outcome.taskKind}` : null,
    ].filter(isString))
    for (const key of keys) {
      const existing = stats.get(key) ?? { success: 0, failure: 0, total: 0, lastUsedAt: null }
      if (isFailedOutcome(outcome.status)) existing.failure += 1
      else existing.success += 1
      existing.total += 1
      if (!existing.lastUsedAt || Date.parse(outcome.occurredAt) > Date.parse(existing.lastUsedAt)) {
        existing.lastUsedAt = outcome.occurredAt
      }
      stats.set(key, existing)
    }
  }
  return stats
}

function buildContextGoldOperationalMemory(
  memory: AwisWorkspaceMemorySnapshot,
): NonNullable<AwisWorkspaceContextPack['memory']>['operational']['context_gold'] {
  const stats = buildContextGoldOutcomeStats(memory.recentOutcomes)
  const spaceBrain = buildSpaceBrainOperationalMemory(memory)
  const ranked = Array.from(stats.entries())
    .map(([label, stat]) => ({
      label,
      success: stat.success,
      failure: stat.failure,
      total: stat.success + stat.failure,
      lastUsedAt: stat.lastUsedAt,
    }))
    .sort((a, b) => b.success - a.success || a.failure - b.failure || a.label.localeCompare(b.label))
  return {
    promoted: ranked
      .filter((item) => item.success > 0 && item.success >= item.failure)
      .map((item) => item.label)
      .slice(0, MAX_STARTUP_ITEMS),
    revalidate: ranked
      .filter((item) => item.failure > 0 && item.failure >= item.success)
      .map((item) => item.label)
      .slice(0, MAX_STARTUP_ITEMS),
    space_brain: {
      promoted: spaceBrain.promoted.map((item) => item.label).slice(0, MAX_STARTUP_ITEMS),
      revalidate: spaceBrain.revalidate.map((item) => item.label).slice(0, MAX_STARTUP_ITEMS),
    },
  }
}

function buildSpaceBrainOperationalMemory(memory: AwisWorkspaceMemorySnapshot | null): {
  promoted: Array<{ label: string; success: number; failure: number; lastUsedAt: string | null }>
  revalidate: Array<{ label: string; success: number; failure: number; lastUsedAt: string | null }>
} {
  const stats = new Map<string, { success: number; failure: number; lastUsedAt: string | null }>()
  for (const outcome of memory?.recentOutcomes ?? []) {
    const labels = normalizeStringList(outcome.spaceBrainLabels, MAX_STARTUP_ITEMS)
      .map(sanitizeProviderSafeText)
      .filter(isString)
    for (const label of labels) {
      const existing = stats.get(label) ?? { success: 0, failure: 0, lastUsedAt: null }
      if (isFailedOutcome(outcome.status)) existing.failure += 1
      else existing.success += 1
      if (!existing.lastUsedAt || Date.parse(outcome.occurredAt) > Date.parse(existing.lastUsedAt)) {
        existing.lastUsedAt = outcome.occurredAt
      }
      stats.set(label, existing)
    }
  }
  const ranked = Array.from(stats.entries())
    .map(([label, stat]) => ({
      label,
      success: stat.success,
      failure: stat.failure,
      lastUsedAt: stat.lastUsedAt,
    }))
    .sort((a, b) => b.success - a.success || a.failure - b.failure || a.label.localeCompare(b.label))
  return {
    promoted: ranked.filter((item) => item.success > 0 && item.success >= item.failure),
    revalidate: ranked.filter((item) => item.failure > 0 && item.failure >= item.success),
  }
}

function buildMaintenanceOperationalMemory(memory: AwisWorkspaceMemorySnapshot | null): {
  proven: Array<{
    action: AwisWorkspaceMaintenanceAction
    label: string
    successes: number
    failures: number
    status: AwisWorkspaceMaintenanceEvent['status']
    lastSeenAt: string | null
  }>
  revalidate: Array<{
    action: AwisWorkspaceMaintenanceAction
    label: string
    successes: number
    failures: number
    status: AwisWorkspaceMaintenanceEvent['status']
    lastSeenAt: string | null
  }>
} {
  const stats = new Map<string, {
    action: AwisWorkspaceMaintenanceAction
    label: string
    successes: number
    failures: number
    status: AwisWorkspaceMaintenanceEvent['status']
    lastSeenAt: string | null
  }>()
  for (const event of memory?.recentMaintenance ?? []) {
    const label = sanitizeProviderSafeText(event.label).slice(0, 140)
    if (!label) continue
    const key = `${event.action}:${label}`
    const existing = stats.get(key) ?? {
      action: event.action,
      label,
      successes: 0,
      failures: 0,
      status: event.status,
      lastSeenAt: null,
    }
    if (event.status === 'succeeded') existing.successes += 1
    else existing.failures += 1
    if (!existing.lastSeenAt || Date.parse(event.occurredAt) > Date.parse(existing.lastSeenAt)) {
      existing.lastSeenAt = event.occurredAt
      existing.status = event.status
    }
    stats.set(key, existing)
  }
  const ranked = Array.from(stats.values())
    .sort((a, b) => (Date.parse(b.lastSeenAt ?? '') || 0) - (Date.parse(a.lastSeenAt ?? '') || 0) || b.successes - a.successes || a.label.localeCompare(b.label))
  return {
    proven: ranked.filter((item) => item.successes > 0 && item.successes >= item.failures),
    revalidate: ranked.filter((item) => item.failures > 0 && item.failures >= item.successes),
  }
}

function automationActionForMaintenance(
  action: AwisWorkspaceMaintenanceAction,
): AwisWorkspaceAutomationProjection['maintenance_queue'][number]['action'] {
  if (action === 'refresh_folder_map') return 'refresh_folder_map'
  if (action === 'replay_artifacts' || action === 'preserve_artifact') return 'replay_artifacts'
  if (action === 'update_space_pack' || action === 'open_side_by_side') return 'update_space_pack'
  if (action === 'record_outcome') return 'record_outcome'
  if (action === 'revalidate_command' || action === 'promote_command') return 'revalidate_command'
  if (action === 'cross_workspace_transfer' || action === 'transfer_learning') return 'cross_workspace_transfer'
  return 'review_risk'
}

function selfImprovementActionForMaintenance(
  action: AwisWorkspaceMaintenanceAction,
  succeeded: boolean,
): AwisWorkspaceSelfImprovementProjection['improvement_queue'][number]['action'] {
  if (!succeeded) return action === 'refresh_folder_map' ? 'refresh_folder_map' : 'demote_context'
  if (action === 'refresh_folder_map') return 'refresh_folder_map'
  if (action === 'preserve_artifact' || action === 'replay_artifacts') return 'preserve_artifact'
  if (action === 'update_space_pack' || action === 'open_side_by_side' || action === 'revalidate_context') return 'update_space_pack'
  if (action === 'record_outcome') return 'record_outcome'
  if (action === 'revalidate_command' || action === 'promote_command') return 'promote_command'
  if (action === 'cross_workspace_transfer' || action === 'transfer_learning') return 'transfer_learning'
  return 'demote_context'
}

function buildContextGoldOutcomeStats(outcomes: AwisWorkspaceMemoryOutcome[]): Map<string, {
  success: number
  failure: number
  lastUsedAt: string | null
}> {
  const stats = new Map<string, { success: number; failure: number; lastUsedAt: string | null }>()
  for (const outcome of outcomes) {
    for (const label of contextGoldLabelsForOutcome(outcome)) {
      const existing = stats.get(label) ?? { success: 0, failure: 0, lastUsedAt: null }
      if (isFailedOutcome(outcome.status)) existing.failure += 1
      else existing.success += 1
      if (!existing.lastUsedAt || Date.parse(outcome.occurredAt) > Date.parse(existing.lastUsedAt)) {
        existing.lastUsedAt = outcome.occurredAt
      }
      stats.set(label, existing)
    }
  }
  return stats
}

function contextGoldLabelsForOutcome(outcome: AwisWorkspaceMemoryOutcome): string[] {
  return unique([
    ...outcome.contextGoldLabels,
    ...outcome.spaceLabels.map((space) => `space:${space}`),
    ...outcome.spaceBrainLabels.map((label) => `space-brain:${label}`),
    ...outcome.liveMemoryLabels.map((label) => `live-memory:${label}`),
    ...outcome.priorityLoadLabels.map((label) => `priority:${label}`),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
}

export function buildAwisWorkspaceSelfImprovementProjection(input: {
  memory: AwisWorkspaceMemorySnapshot | null
  learning: AwisWorkspaceLearningProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  relations?: AwisWorkspaceRelationProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  continuity: AwisWorkspaceContinuityProjection | null
  automation: AwisWorkspaceAutomationProjection | null
  confidence: AwisWorkspaceConfidenceProjection | null
  contextKernel: AwisWorkspaceContextKernelProjection | null
}): AwisWorkspaceSelfImprovementProjection | null {
  const queue: AwisWorkspaceSelfImprovementProjection['improvement_queue'] = []
  const push = (item: AwisWorkspaceSelfImprovementProjection['improvement_queue'][number]) => {
    const label = sanitizeProviderSafeText(item.label).slice(0, 160)
    if (!label) return
    if (queue.some((existing) => existing.action === item.action && existing.label === label)) return
    queue.push({
      ...item,
      label,
      reason: sanitizeProviderSafeText(item.reason).slice(0, 160) || 'melhorar a próxima sessão AWIS',
      evidence: normalizeStringList(item.evidence, 4).map(sanitizeProviderSafeText).filter(isString),
    })
  }
  const maintenanceMemory = buildMaintenanceOperationalMemory(input.memory)

  for (const command of input.sessionGold?.proven_commands ?? []) {
    push({
      action: 'promote_command',
      label: command.command,
      reason: 'comando validou sessão real e pode subir no contexto inicial',
      priority: command.success_count >= 2 ? 'high' : 'medium',
      evidence: [`${command.success_count} sucesso(s)`, ...command.task_kinds.map((kind) => `tarefa:${kind}`)],
    })
  }
  for (const signal of input.confidence?.decision_policy.avoid_until_revalidated ?? []) {
    push({
      action: 'demote_context',
      label: signal,
      reason: 'sinal exige revalidação antes de continuar carregando automaticamente',
      priority: 'high',
      evidence: ['política de confiança'],
    })
  }
  const spaceBrainMemory = buildSpaceBrainOperationalMemory(input.memory)
  for (const item of spaceBrainMemory.promoted.slice(0, 3)) {
    push({
      action: 'update_space_pack',
      label: item.label,
      reason: 'cérebro do Space ajudou sessão real e deve ficar mais quente',
      priority: item.success >= 2 ? 'high' : 'medium',
      evidence: [`${item.success} sucesso(s)`, item.lastUsedAt ? `último uso:${item.lastUsedAt}` : 'uso recente'],
    })
  }
  for (const item of spaceBrainMemory.revalidate.slice(0, 3)) {
    push({
      action: 'demote_context',
      label: `space-brain:${item.label}`,
      reason: 'cérebro do Space apareceu em falha recente; revalidar antes de autocarregar',
      priority: 'high',
      evidence: [`${item.failure} falha(s)`, item.lastUsedAt ? `último uso:${item.lastUsedAt}` : 'uso recente'],
    })
  }
  for (const item of maintenanceMemory.proven.slice(0, 4)) {
    const action = selfImprovementActionForMaintenance(item.action, true)
    push({
      action,
      label: item.label,
      reason: 'manutenção recente deu certo; transformar em comportamento mais automático',
      priority: item.successes >= 2 ? 'high' : 'medium',
      evidence: [`${item.successes} sucesso(s)`, item.lastSeenAt ? `último uso:${item.lastSeenAt}` : 'uso recente'],
    })
  }
  for (const item of maintenanceMemory.revalidate.slice(0, 4)) {
    const action = selfImprovementActionForMaintenance(item.action, false)
    push({
      action,
      label: item.label,
      reason: item.status === 'skipped'
        ? 'manutenção foi pulada; manter como revisão explícita'
        : 'manutenção falhou; reduzir confiança até nova evidência',
      priority: item.failures >= 2 ? 'high' : 'medium',
      evidence: [`${item.failures} alerta(s)`, item.lastSeenAt ? `último uso:${item.lastSeenAt}` : 'uso recente'],
    })
  }
  if (input.contextKernel?.learning_contract.refresh_folder_map_on_drift || input.memory?.driftEvents[0]) {
    push({
      action: 'refresh_folder_map',
      label: 'mapa local',
      reason: 'drift ou scan limitado pode envelhecer o contexto carregado',
      priority: 'high',
      evidence: [input.memory?.driftEvents[0] ?? 'kernel pediu refresh'].filter(isString),
    })
  }
  if (input.contextKernel?.learning_contract.update_space_pack || (input.spaces?.space_count ?? 0) > 0) {
    push({
      action: 'update_space_pack',
      label: input.spaces?.strongest_spaces[0]?.title ?? 'Space ativo',
      reason: 'Space forte deve virar pack reutilizável após sessão útil',
      priority: 'medium',
      evidence: [`${input.spaces?.space_count ?? 0} Space(s)`],
    })
  }
  if (input.contextKernel?.learning_contract.promote_artifact_after_success || input.artifactReplay?.artifact_count) {
    push({
      action: 'preserve_artifact',
      label: input.artifactReplay?.latest_artifact_hash ?? 'snapshot AWIS',
      reason: 'artifact replay evita partida fria na próxima conversa',
      priority: 'medium',
      evidence: [input.artifactReplay ? `${input.artifactReplay.artifact_count} artefato(s)` : 'kernel pediu promoção'],
    })
  }
  for (const relation of input.relations?.related_workspaces ?? []) {
    if (relation.overlap_score < 60) continue
    push({
      action: 'transfer_learning',
      label: relation.workspace_hint,
      reason: relation.recommended_transfer[0] ?? 'workspace compatível pode receber aprendizado abstrato',
      priority: 'low',
      evidence: [`${relation.overlap_score}% compatível`, ...relation.shared_languages.slice(0, 2)],
    })
  }
  if (input.automation?.maintenance_queue.some((item) => item.action === 'record_outcome') || input.contextKernel?.learning_contract.capture_outcome) {
    push({
      action: 'record_outcome',
      label: 'resultado da sessão',
      reason: 'cada envio real deve recalibrar confiança, comandos e contexto',
      priority: 'high',
      evidence: ['contrato de aprendizado ativo'],
    })
  }

  const sortedQueue = queue
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || a.action.localeCompare(b.action))
    .slice(0, MAX_STARTUP_ITEMS)
  if (sortedQueue.length === 0) return null
  const readinessScore = Math.min(100, 24 + sortedQueue.length * 8 + (input.contextKernel?.readiness_score ?? 0) / 3)
  return {
    schema_version: 'atlas.awis.workspace_self_improvement_projection.v1',
    source: 'local_awis_self_improvement_compiler',
    readiness_score: Math.round(readinessScore),
    improvement_queue: sortedQueue,
    promotion_policy: {
      promote_when: unique([
        ...(input.automation?.feedback_loop.promote_when ?? []),
        ...(input.contextKernel?.validation_plan.commands.length ? ['validação comprovada passa novamente'] : []),
        ...maintenanceMemory.proven.slice(0, 3).map((item) => `manutenção comprovada:${item.action}:${item.label}`),
        'resultado real sem novo risco',
      ]).slice(0, MAX_STARTUP_ITEMS),
      demote_when: unique([
        ...(input.automation?.feedback_loop.demote_when ?? []),
        ...maintenanceMemory.revalidate.slice(0, 3).map((item) => `manutenção precisa revalidar:${item.action}:${item.label}`),
        'falha recente ou drift sem revalidação',
      ]).slice(0, MAX_STARTUP_ITEMS),
      transfer_when: unique([
        ...(input.relations?.related_workspaces.filter((item) => item.overlap_score >= 60).map((item) => `stack compatível:${item.workspace_hint}`) ?? []),
        'somente pistas abstratas provider-safe',
      ]).slice(0, MAX_STARTUP_ITEMS),
    },
    next_review: {
      metrics: unique([
        ...(input.automation?.feedback_loop.metrics_to_watch ?? []),
        'taxa de promoção de comandos',
        'contexto omitido por segurança',
      ]).slice(0, MAX_STARTUP_ITEMS),
      validate_with: unique([
        ...(input.contextKernel?.validation_plan.commands ?? []),
        ...(input.sessionGold?.next_session_hooks.validate_with ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
      human_confirmation_required: sortedQueue.some((item) => item.action === 'demote_context') || input.contextKernel?.validation_plan.requires_human_confirmation === true,
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
  }
}

export function buildAwisWorkspaceRetentionProjection(input: {
  memory: AwisWorkspaceMemorySnapshot | null
  memoryFreshness?: AwisWorkspaceMemoryFreshnessProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  continuity: AwisWorkspaceContinuityProjection | null
  confidence: AwisWorkspaceConfidenceProjection | null
  contextKernel: AwisWorkspaceContextKernelProjection | null
  selfImprovement: AwisWorkspaceSelfImprovementProjection | null
}): AwisWorkspaceRetentionProjection | null {
  const staleSignals = unique([
    ...(input.memoryFreshness?.evidence.revalidate ?? []),
    ...(input.memoryFreshness?.evidence.missing.map((item) => `faltando:${item}`) ?? []),
    ...(input.memory?.driftEvents ?? []),
    ...(input.continuity?.stale_or_risky_context ?? []),
    ...(input.artifactReplay?.reusable_startup_gold.warnings ?? []),
    ...(input.confidence?.decision_policy.avoid_until_revalidated ?? []),
    ...(input.contextKernel?.compression_plan.omit.filter((item) => item.startsWith('revalidar antes:')) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const keepHot = unique([
    ...(input.memoryFreshness?.evidence.hot.map((item) => `fresco:${item}`) ?? []),
    ...(input.sessionGold?.strongest_outcomes.map((item) => `ouro:${item.label}`) ?? []),
    ...(input.contextKernel?.priority_load.slice(0, 4).map((item) => `${item.kind}:${item.label}`) ?? []),
    ...(input.continuity?.next_session_plan.first_load.slice(0, 4) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const promote = unique([
    ...(input.selfImprovement?.improvement_queue
      .filter((item) => item.action === 'promote_command' || item.action === 'preserve_artifact')
      .map((item) => `${item.action}:${item.label}`) ?? []),
    ...(input.sessionGold?.proven_commands.map((item) => `comando:${item.command}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const revalidate = unique([
    ...staleSignals,
    ...(input.memoryFreshness?.promotion_gate.required_before_promotion ?? []),
    ...(input.selfImprovement?.improvement_queue
      .filter((item) => item.action === 'demote_context' || item.action === 'refresh_folder_map')
      .map((item) => `${item.action}:${item.label}`) ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const dropOrSummarize = unique([
    'conversa bruta completa',
    'conteúdo livre de arquivos sem pedido explícito',
    ...(input.contextKernel?.compression_plan.omit ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const signalCount = [keepHot.length, promote.length, revalidate.length, dropOrSummarize.length].filter((count) => count > 0).length
  if (signalCount === 0) return null
  const mode: AwisWorkspaceRetentionProjection['policy']['mode'] = staleSignals.length >= 3
    || input.memoryFreshness?.state === 'stale'
    || input.memoryFreshness?.state === 'cold'
    ? 'conservative'
    : promote.length >= 3 && revalidate.length === 0
      ? 'aggressive'
      : 'balanced'
  return {
    schema_version: 'atlas.awis.workspace_retention_projection.v1',
    source: 'local_awis_retention_governor',
    readiness_score: Math.min(100, 30 + signalCount * 12 + Math.min(22, keepHot.length * 3)),
    policy: {
      mode,
      reason: mode === 'conservative'
        ? 'há sinais stale; revalidar antes de carregar como ouro'
        : mode === 'aggressive'
          ? 'vários sinais comprovados podem ser promovidos'
          : 'manter contexto quente com revalidação seletiva',
      max_hot_items: mode === 'aggressive' ? MAX_STARTUP_ITEMS : mode === 'balanced' ? 7 : 4,
    },
    lifecycle: {
      keep_hot: keepHot,
      promote,
      revalidate,
      drop_or_summarize: dropOrSummarize,
    },
    stale_signals: staleSignals,
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
  }
}

export function buildAwisWorkspaceMemoryConsolidationProjection(input: {
  memory: AwisWorkspaceMemorySnapshot | null
  learning: AwisWorkspaceLearningProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  relations: AwisWorkspaceRelationProjection | null
  componentMemory: AwisWorkspaceComponentMemoryProjection | null
  taskRouter: AwisWorkspaceTaskRouterProjection | null
  selfImprovement: AwisWorkspaceSelfImprovementProjection | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
  retention: AwisWorkspaceRetentionProjection | null
  startupOrchestration: AwisWorkspaceStartupOrchestrationProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
}): AwisWorkspaceMemoryConsolidationProjection | null {
  const spaceBrainMemory = buildSpaceBrainOperationalMemory(input.memory)
  const promoteToGold = unique([
    ...(input.retention?.lifecycle.promote ?? []),
    ...spaceBrainMemory.promoted.slice(0, 4).map((item) => `space-brain:${item.label}:${item.success}`),
    ...(input.sessionGold?.strongest_outcomes.filter((item) => item.confidence >= 72).map((item) => `ouro:${item.label}`) ?? []),
    ...(input.sessionGold?.proven_commands.map((item) => `comando:${item.command}`) ?? []),
    ...(input.componentMemory?.strongest_components
      .filter((component) => component.reuse_policy.can_autoload && component.maturity !== 'new')
      .map((component) => `área:${component.key}:${component.maturity}`) ?? []),
    ...(input.taskRouter?.routes
      .filter((route) => route.policy === 'prefer')
      .map((route) => `rota:${route.route_key}:${route.success_rate ?? route.confidence}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const rehearseNext = unique([
    ...(input.startupOrchestration?.startup_sequence
      .filter((item) => item.required)
      .map((item) => `${item.step}:${item.label}`) ?? []),
    ...(input.retention?.lifecycle.keep_hot ?? []),
    ...(input.memoryFreshness?.evidence.hot ?? []),
    ...(input.taskRouter?.routes.slice(0, 3).flatMap((route) => route.automation_hooks.before_send.map((hook) => `rota:${route.task_kind}:${hook}`)) ?? []),
    ...(input.spaces?.strongest_spaces.slice(0, 2).map((space) => `Space:${space.title}:${space.session_count}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const archiveAsArtifact = unique([
    input.startupOrchestration?.learning_loop.preserve_artifact_after_success ? 'partida AWIS após sucesso' : null,
    ...(input.selfImprovement?.improvement_queue
      .filter((item) => item.action === 'preserve_artifact' || item.action === 'update_space_pack')
      .map((item) => `${item.action}:${item.label}`) ?? []),
    ...(input.spaces?.strongest_spaces
      .filter((space) => space.message_count >= 4 || space.artifact_count > 0)
      .map((space) => `Space pack:${space.title}`) ?? []),
    input.artifactReplay?.latest_artifact_hash ? `replay:${input.artifactReplay.latest_artifact_hash}` : null,
  ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const summarizeOnly = unique([
    ...(input.retention?.lifecycle.drop_or_summarize ?? []),
    ...(input.startupOrchestration?.context_budget.prefer_summary ? ['partida grande:preferir resumo'] : []),
    ...(input.relations?.related_workspaces.map((workspace) => `workspace relacionado:${workspace.workspace_hint}`) ?? []),
    ...(input.artifactReplay?.reusable_startup_gold.reusable_patterns.slice(0, 3).map((item) => `artifact:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const neverPromote = unique([
    'conversa bruta completa',
    'conteúdo livre de arquivos sem pedido explícito',
    'paths absolutos do Mac',
    'ids internos',
    ...(input.memoryFreshness?.evidence.revalidate.map((item) => `stale:${item}`) ?? []),
    ...(input.retention?.stale_signals.map((item) => `revalidar:${item}`) ?? []),
    ...(input.selfImprovement?.promotion_policy.demote_when ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const revalidate = unique([
    ...(input.memoryFreshness?.evidence.revalidate ?? []),
    ...(input.retention?.lifecycle.revalidate ?? []),
    ...(input.selfImprovement?.promotion_policy.demote_when.map((item) => `demote:${item}`) ?? []),
    ...spaceBrainMemory.revalidate.slice(0, 4).map((item) => `space-brain:${item.label}:${item.failure}`),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const nextSessionSeed = unique([
    ...promoteToGold.slice(0, 4),
    ...rehearseNext.slice(0, 4),
    ...archiveAsArtifact.slice(0, 2),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const signalCount = [
    promoteToGold.length,
    rehearseNext.length,
    archiveAsArtifact.length,
    summarizeOnly.length,
    neverPromote.length,
  ].filter((count) => count > 0).length
  if (signalCount === 0) return null
  const stale = input.memoryFreshness?.state === 'stale' || input.memoryFreshness?.state === 'cold'
  const mode: AwisWorkspaceMemoryConsolidationProjection['compaction_policy']['mode'] = stale
    ? 'strict'
    : promoteToGold.length >= 4 && neverPromote.length <= 4
      ? 'expansive'
      : 'balanced'
  return {
    schema_version: 'atlas.awis.workspace_memory_consolidation_projection.v1',
    source: 'local_awis_memory_consolidator',
    readiness_score: clampConfidence(
      28 +
        signalCount * 10 +
        Math.min(24, nextSessionSeed.length * 3) +
        (input.memory?.interactionCount ?? 0) +
        (stale ? -12 : 0),
    ),
    compaction_policy: {
      mode,
      reason: mode === 'strict'
        ? 'há sinais stale; consolidar só como resumo até revalidar'
        : mode === 'expansive'
          ? 'múltiplos sinais comprovados podem acordar a próxima sessão quente'
          : 'equilibrar ouro, resumo e revalidação para evitar ruído',
      max_seed_items: mode === 'expansive' ? MAX_STARTUP_ITEMS : mode === 'balanced' ? 7 : 4,
    },
    next_session_seed: nextSessionSeed,
    consolidate: {
      promote_to_gold: promoteToGold,
      rehearse_next: rehearseNext,
      archive_as_artifact: archiveAsArtifact,
      summarize_only: summarizeOnly,
      revalidate,
      never_promote: neverPromote,
    },
    learning_loop: {
      capture_after_send: unique([
        'resultado da rota',
        'contexto carregado',
        'validação executada',
        ...(input.taskRouter?.routes.slice(0, 2).map((route) => `rota:${route.route_key}`) ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
      recalibrate_after_failure: unique([
        ...(input.taskRouter?.routes
          .filter((route) => route.policy === 'revalidate')
          .map((route) => `rota:${route.route_key}`) ?? []),
        ...(input.selfImprovement?.promotion_policy.demote_when ?? []),
        'não promover contexto sem evidência',
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      refresh_when: unique([
        ...(input.memoryFreshness?.next_refresh.actions ?? []),
        ...(input.retention?.lifecycle.revalidate ?? []),
        input.memory?.driftEvents[0] ? 'drift novo detectado' : null,
      ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
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
  }
}

export function buildAwisWorkspaceMemoryFreshnessProjection(input: {
  brain: AtlasWorkspaceBrainSnapshot | null
  memory: AwisWorkspaceMemorySnapshot | null
  artifactLake: AwisWorkspaceArtifactLakeSummary | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  confidence: AwisWorkspaceConfidenceProjection | null
  selfImprovement: AwisWorkspaceSelfImprovementProjection | null
}, now = new Date()): AwisWorkspaceMemoryFreshnessProjection | null {
  if (!input.brain && !input.memory && !input.artifactLake && !input.artifactReplay) return null
  const scanAgeDays = ageInDays(input.brain?.scannedAt ?? input.memory?.lastSeenAt ?? null, now)
  const interactionAgeDays = ageInDays(input.memory?.lastInteractionAt ?? null, now)
  const driftCount = input.memory?.driftEvents.length ?? 0
  const hasOperationalMemory = (input.memory?.interactionCount ?? 0) > 0
  const hasArtifactReplay = Boolean(input.artifactReplay?.artifact_count || input.artifactLake?.artifact_count)
  const revalidate = unique([
    !input.brain ? 'mapa local ausente' : null,
    input.brain?.status && input.brain.status !== 'ready' ? `mapa local:${input.brain.status}` : null,
    input.brain?.truncated ? 'mapa local truncado' : null,
    scanAgeDays !== null && scanAgeDays > 7 ? `scan antigo:${scanAgeDays}d` : null,
    interactionAgeDays !== null && interactionAgeDays > 14 ? `uso antigo:${interactionAgeDays}d` : null,
    ...((input.memory?.driftEvents ?? []).slice(0, 4)),
    ...(input.confidence?.decision_policy.avoid_until_revalidated ?? []),
    ...(input.selfImprovement?.improvement_queue
      .filter((item) => item.action === 'demote_context' || item.action === 'refresh_folder_map')
      .map((item) => `${item.action}:${item.label}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const missing = unique([
    !input.memory ? 'memória local' : null,
    !input.brain ? 'scan de pasta' : null,
    !hasOperationalMemory ? 'outcomes reais' : null,
    !hasArtifactReplay ? 'artifact replay' : null,
    (input.memory?.scanCount ?? 0) < 2 ? 'segunda leitura para estabilidade' : null,
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const hot = unique([
    ...(input.memory?.stableCommands.slice(0, 4).map((signal) => `comando:${signal.label}`) ?? []),
    ...(input.memory?.stableLanguages.slice(0, 3).map((signal) => `stack:${signal.label}`) ?? []),
    ...(input.artifactReplay?.reusable_startup_gold.reusable_patterns.slice(0, 3).map((item) => `artifact:${item}`) ?? []),
    ...(input.confidence?.decision_policy.prefer.slice(0, 3).map((item) => `confiança:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const recencyScore = scanAgeDays === null
    ? 0
    : scanAgeDays <= 1
      ? 25
      : scanAgeDays <= 7
        ? 17
        : scanAgeDays <= 30
          ? 8
          : -10
  const interactionScore = interactionAgeDays === null
    ? 0
    : interactionAgeDays <= 7
      ? 15
      : interactionAgeDays <= 30
        ? 8
        : -8
  const freshnessScore = clampConfidence(
    25
    + (input.brain?.status === 'ready' ? 16 : 0)
    + Math.min(18, (input.memory?.scanCount ?? 0) * 6)
    + recencyScore
    + interactionScore
    + (hasArtifactReplay ? 10 : 0)
    + ((input.confidence?.confidence_score ?? 0) >= 70 ? 8 : 0)
    - Math.min(28, driftCount * 7)
    - Math.min(18, revalidate.length * 3),
  )
  const state: AwisWorkspaceMemoryFreshnessProjection['state'] = freshnessScore >= 82
    ? 'fresh'
    : freshnessScore >= 58
      ? 'warm'
      : freshnessScore >= 28
        ? 'stale'
        : 'cold'
  const requiredBeforePromotion = unique([
    ...revalidate,
    ...(state === 'stale' || state === 'cold' ? missing.map((item) => `completar:${item}`) : []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const actions = unique([
    scanAgeDays === null || scanAgeDays > 7 ? 'atualizar mapa local' : null,
    driftCount > 0 ? 'revalidar drift antes de promover contexto' : null,
    !hasOperationalMemory ? 'registrar outcome da próxima conversa' : null,
    !hasArtifactReplay ? 'preservar artifact de partida após sucesso' : null,
    revalidate.length > 0 ? 'carregar como resumo até revalidar' : null,
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  return {
    schema_version: 'atlas.awis.workspace_memory_freshness_projection.v1',
    source: 'local_awis_memory_freshness_guard',
    freshness_score: freshnessScore,
    state,
    scan_age_days: scanAgeDays,
    interaction_age_days: interactionAgeDays,
    evidence: {
      hot,
      revalidate,
      missing,
    },
    promotion_gate: {
      can_promote_commands: state === 'fresh' || (state === 'warm' && revalidate.length === 0),
      can_promote_spaces: state !== 'cold' && hasArtifactReplay,
      required_before_promotion: requiredBeforePromotion,
    },
    next_refresh: {
      actions,
      reason: state === 'fresh'
        ? 'memória recente pode alimentar partida quente'
        : state === 'warm'
          ? 'memória útil, mas promoção exige evidência seletiva'
          : 'contexto precisa revalidação antes de virar ouro',
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
  }
}

export function buildAwisWorkspaceStartupOrchestrationProjection(input: {
  memory: AwisWorkspaceMemorySnapshot | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  livingGraph: AwisWorkspaceLivingGraphProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  contextKernel: AwisWorkspaceContextKernelProjection | null
  selfImprovement: AwisWorkspaceSelfImprovementProjection | null
  retention: AwisWorkspaceRetentionProjection | null
  memoryFreshness?: AwisWorkspaceMemoryFreshnessProjection | null
}): AwisWorkspaceStartupOrchestrationProjection | null {
  const startupSequence: AwisWorkspaceStartupOrchestrationProjection['startup_sequence'] = []
  const push = (item: AwisWorkspaceStartupOrchestrationProjection['startup_sequence'][number]) => {
    if (!item.label.trim()) return
    const label = sanitizeProviderSafeText(item.label)
    if (startupSequence.some((existing) => existing.step === item.step && existing.label === label)) return
    startupSequence.push({ ...item, label })
  }
  for (const item of input.retention?.lifecycle.keep_hot.slice(0, 3) ?? []) {
    push({ step: 'restore', label: item, source: 'retention', required: true })
  }
  for (const item of input.contextKernel?.priority_load.slice(0, 4) ?? []) {
    push({ step: 'load', label: `${item.kind}:${item.label}`, source: 'kernel', required: item.confidence >= 70 })
  }
  for (const item of input.sessionGold?.strongest_outcomes.slice(0, 2) ?? []) {
    push({ step: 'compose', label: `ouro:${item.label}`, source: 'gold', required: item.confidence >= 70 })
  }
  for (const item of input.livingGraph?.golden_path.slice(0, 2) ?? []) {
    push({ step: 'load', label: item, source: 'graph', required: false })
  }
  for (const item of input.artifactReplay?.reusable_startup_gold.reusable_patterns.slice(0, 2) ?? []) {
    push({ step: 'restore', label: item, source: 'artifact', required: false })
  }
  for (const space of input.spaces?.strongest_spaces.slice(0, 2) ?? []) {
    push({ step: 'load', label: `Space:${space.title}`, source: 'space', required: space.session_count >= 2 })
  }
  for (const item of input.selfImprovement?.improvement_queue.slice(0, 2) ?? []) {
    push({ step: 'learn', label: `${item.action}:${item.label}`, source: 'memory', required: item.priority === 'high' })
  }
  const freshnessState = input.memoryFreshness?.state ?? null
  for (const item of input.memoryFreshness?.next_refresh.actions.slice(0, 2) ?? []) {
    push({ step: 'validate', label: `frescor:${item}`, source: 'memory', required: freshnessState === 'stale' || freshnessState === 'cold' })
  }
  const requiredBeforeSend = unique([
    ...(input.memoryFreshness?.promotion_gate.required_before_promotion ?? []),
    ...(input.retention?.lifecycle.revalidate ?? []),
    ...(input.contextKernel?.compression_plan.omit.filter((item) => item.startsWith('revalidar antes:')) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const canAutoload = unique([
    ...(input.memoryFreshness?.evidence.hot ?? []),
    ...(input.retention?.lifecycle.keep_hot ?? []),
    ...(input.contextKernel?.compression_plan.send_full ?? []),
    ...(input.sessionGold?.next_session_hooks.before_send ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const signalCount = [
    startupSequence.length,
    requiredBeforeSend.length,
    canAutoload.length,
    input.memory?.interactionCount ?? 0,
  ].filter((count) => count > 0).length
  if (signalCount === 0) return null
  const readinessScore = Math.min(100, signalCount * 18 + Math.min(40, startupSequence.length * 5))
  const launchMode: AwisWorkspaceStartupOrchestrationProjection['launch_mode'] = readinessScore >= 78
    ? 'deep'
    : readinessScore >= 45
      ? 'warm'
      : 'guarded'
  return {
    schema_version: 'atlas.awis.workspace_startup_orchestration_projection.v1',
    source: 'local_awis_startup_orchestrator',
    readiness_score: readinessScore,
    launch_mode: launchMode,
    startup_sequence: startupSequence.slice(0, MAX_STARTUP_ITEMS * 2),
    context_budget: {
      max_items: input.contextKernel?.budget.max_context_items ?? (launchMode === 'deep' ? MAX_STARTUP_ITEMS : 5),
      prefer_summary: launchMode !== 'deep' || requiredBeforeSend.length > 0,
      reason: input.contextKernel?.budget.reason ?? 'partida governada por memória local e artefatos AWIS',
    },
    revalidation_gate: {
      required_before_send: requiredBeforeSend,
      can_autoload: canAutoload,
      needs_human_confirmation: input.contextKernel?.validation_plan.requires_human_confirmation === true
        || input.selfImprovement?.next_review.human_confirmation_required === true,
    },
    learning_loop: {
      capture_outcome: true,
      update_memory: true,
      update_space_pack: Boolean(input.contextKernel?.learning_contract.update_space_pack || input.spaces?.space_count),
      preserve_artifact_after_success: Boolean(input.contextKernel?.learning_contract.promote_artifact_after_success),
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
  }
}

export function buildAwisWorkspacePreflightProjection(input: {
  workspaceRootKnown: boolean
  executionDoctrine: AwisWorkspaceExecutionDoctrineProjection | null
  startupOrchestration: AwisWorkspaceStartupOrchestrationProjection | null
  memoryConsolidation: AwisWorkspaceMemoryConsolidationProjection | null
  impactMap: AwisWorkspaceImpactMapProjection | null
  semanticIndex: AwisWorkspaceSemanticIndexProjection | null
  taskRouter: AwisWorkspaceTaskRouterProjection | null
  retention: AwisWorkspaceRetentionProjection | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
  componentMemory: AwisWorkspaceComponentMemoryProjection | null
  contextKernel: AwisWorkspaceContextKernelProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
}): AwisWorkspacePreflightProjection | null {
  const validationCommands = unique([
    ...(input.executionDoctrine?.command_policy.revalidate ?? []),
    ...(input.contextKernel?.validation_plan.commands ?? []),
    ...(input.taskRouter?.routes.flatMap((route) => route.validate_with) ?? []),
    ...(input.impactMap?.component_impacts.flatMap((impact) => impact.validation_cascade) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const evidence = unique([
    ...(input.memoryConsolidation?.next_session_seed ?? []),
    ...(input.retention?.lifecycle.keep_hot ?? []),
    ...(input.semanticIndex?.query_aliases.slice(0, 3).map((alias) => `semântico:${alias.alias}`) ?? []),
    ...(input.componentMemory?.strongest_components.slice(0, 3).map((component) => `área:${component.key}:${component.maturity}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const highImpact = (input.impactMap?.component_impacts ?? [])
    .filter((impact) => impact.risk === 'high')
    .slice(0, 3)
  const staleMemory = input.memoryFreshness?.state === 'cold' || input.memoryFreshness?.state === 'stale'
  const requiresHuman = input.startupOrchestration?.revalidation_gate.needs_human_confirmation === true
    || input.contextKernel?.validation_plan.requires_human_confirmation === true
    || highImpact.length > 0

  const gates: AwisWorkspacePreflightProjection['gates'] = [
    {
      gate: 'context',
      status: input.workspaceRootKnown || evidence.length > 0 ? (staleMemory ? 'warn' : 'ready') : 'blocked',
      label: input.workspaceRootKnown ? 'pasta e memória disponíveis' : 'vincular pasta ou usar artifact replay',
      required: true,
      evidence: unique([
        ...(input.workspaceRootKnown ? ['pasta local pronta'] : []),
        ...(input.artifactReplay ? ['artifact replay disponível'] : []),
        ...evidence.slice(0, 4),
      ]).slice(0, MAX_STARTUP_ITEMS),
    },
    {
      gate: 'evidence',
      status: evidence.length > 0 || input.memoryConsolidation ? (staleMemory ? 'warn' : 'ready') : 'warn',
      label: staleMemory ? 'revalidar memória antes de confiar' : 'usar evidências promovidas',
      required: true,
      evidence: unique([
        ...(input.memoryConsolidation?.consolidate.promote_to_gold.slice(0, 3) ?? []),
        ...(input.retention?.lifecycle.revalidate.slice(0, 3) ?? []),
        ...(input.memoryFreshness?.evidence.revalidate.slice(0, 3) ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
    },
    {
      gate: 'impact',
      status: highImpact.length > 0 ? 'warn' : input.impactMap ? 'ready' : 'warn',
      label: highImpact[0] ? `impacto alto em ${highImpact[0].component_key}` : 'raio de impacto calculado',
      required: validationCommands.length > 0,
      evidence: unique([
        ...(input.impactMap?.component_impacts.slice(0, 4).map((impact) => `${impact.component_key}:${impact.risk}`) ?? []),
        ...(input.impactMap?.cross_workspace_impacts.slice(0, 2).map((impact) => `workspace:${impact.workspace_hint}`) ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
    },
    {
      gate: 'validation',
      status: validationCommands.length > 0 ? 'ready' : 'warn',
      label: validationCommands[0] ?? 'definir validação mínima antes de alterar',
      required: true,
      evidence: validationCommands,
    },
    {
      gate: 'human',
      status: requiresHuman ? 'warn' : 'ready',
      label: requiresHuman ? 'confirmação humana para risco ou side effect' : 'sem confirmação humana pendente',
      required: requiresHuman,
      evidence: unique([
        ...(input.executionDoctrine?.preflight.human_responsibility ?? []),
        ...(highImpact.map((impact) => `impacto:${impact.component_key}:${impact.reason}`)),
      ]).slice(0, MAX_STARTUP_ITEMS),
    },
    {
      gate: 'learning',
      status: input.memoryConsolidation || input.startupOrchestration?.learning_loop.capture_outcome ? 'ready' : 'warn',
      label: 'registrar outcome e atualizar memória',
      required: true,
      evidence: unique([
        ...(input.memoryConsolidation?.learning_loop.capture_after_send ?? []),
        ...(input.startupOrchestration?.learning_loop.update_space_pack ? ['atualizar pack do Space'] : []),
        ...(input.startupOrchestration?.learning_loop.preserve_artifact_after_success ? ['preservar artifact após sucesso'] : []),
      ]).slice(0, MAX_STARTUP_ITEMS),
    },
  ]

  const blockedCount = gates.filter((gate) => gate.status === 'blocked').length
  const warnCount = gates.filter((gate) => gate.status === 'warn').length
  const readiness = normalizePercent(
    100
    - blockedCount * 34
    - warnCount * 10
    + Math.min(12, evidence.length * 2)
    + Math.min(12, validationCommands.length * 2),
  )
  const mode: AwisWorkspacePreflightProjection['mode'] = blockedCount > 0
    ? 'blocked'
    : warnCount > 1
      ? 'guarded'
      : 'ready'

  const beforeSend = unique([
    ...(input.startupOrchestration?.startup_sequence.filter((item) => item.required).map((item) => `${item.step}:${item.label}`) ?? []),
    ...(input.startupOrchestration?.revalidation_gate.required_before_send.map((item) => `revalidar:${item}`) ?? []),
    ...(input.memoryConsolidation?.next_session_seed.slice(0, 4).map((item) => `seed:${item}`) ?? []),
    ...(input.semanticIndex?.retrieval_policy.load_full_when.slice(0, 3).map((item) => `semântico:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const beforeExecution = unique([
    ...(input.executionDoctrine?.preflight.required_before_execution ?? []),
    ...validationCommands,
    ...(highImpact.map((impact) => `validar impacto:${impact.component_key}`)),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const afterSuccess = unique([
    ...(input.memoryConsolidation?.consolidate.promote_to_gold.slice(0, 4) ?? []),
    ...(input.memoryConsolidation?.consolidate.archive_as_artifact.slice(0, 3).map((item) => `artifact:${item}`) ?? []),
    ...(input.startupOrchestration?.learning_loop.update_space_pack ? ['atualizar Space/context pack'] : []),
    'registrar outcome com componentKeys',
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const afterFailure = unique([
    ...(input.memoryConsolidation?.learning_loop.recalibrate_after_failure ?? []),
    ...(input.executionDoctrine?.learning_contract.demote_after_failure ?? []),
    ...(input.retention?.lifecycle.revalidate.map((item) => `revalidar:${item}`) ?? []),
    'não promover contexto sem evidência',
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  if (gates.length === 0 && beforeSend.length === 0 && beforeExecution.length === 0) return null

  return {
    schema_version: 'atlas.awis.workspace_preflight_projection.v1',
    source: 'local_awis_preflight_compiler',
    readiness_score: readiness,
    mode,
    gates,
    execution_lanes: {
      before_send: beforeSend,
      before_execution: beforeExecution,
      after_success: afterSuccess,
      after_failure: afterFailure,
    },
    promotion_contract: {
      promote_when: unique([
        ...(input.executionDoctrine?.learning_contract.promote_after_success ?? []),
        ...(input.memoryConsolidation?.consolidate.promote_to_gold ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      demote_when: unique([
        ...(input.executionDoctrine?.learning_contract.demote_after_failure ?? []),
        ...(input.memoryConsolidation?.consolidate.never_promote ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      preserve_as_artifact: Boolean(input.startupOrchestration?.learning_loop.preserve_artifact_after_success || input.memoryConsolidation?.consolidate.archive_as_artifact.length),
      update_space_pack: Boolean(input.startupOrchestration?.learning_loop.update_space_pack || input.spaces?.space_count),
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
  }
}

export function buildAwisWorkspaceTwinProjection(input: {
  workspaceKey: string
  topology: AwisWorkspaceTopologyProjection | null
  componentMemory: AwisWorkspaceComponentMemoryProjection | null
  semanticIndex: AwisWorkspaceSemanticIndexProjection | null
  impactMap: AwisWorkspaceImpactMapProjection | null
  executionDoctrine: AwisWorkspaceExecutionDoctrineProjection | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  preflight: AwisWorkspacePreflightProjection | null
}): AwisWorkspaceTwinProjection | null {
  const components = input.componentMemory?.strongest_components ?? []
  const topologyComponents = input.topology?.components ?? []
  if (components.length === 0 && topologyComponents.length === 0) return null

  const stack = unique([
    ...(input.topology?.components.flatMap((component) => component.stack) ?? []),
    ...(input.semanticIndex?.stack_map.map((item) => item.stack) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const apps = unique((components.length > 0 ? components : topologyComponents).map((component) => component.key))
    .map(sanitizeComponentKey)
    .filter(isString)
    .slice(0, MAX_TOPOLOGY_COMPONENTS)
  const ownerDocs = unique([
    ...(input.topology?.knowledge_map.load_first_docs ?? []),
    ...(input.topology?.components.flatMap((component) => component.docs) ?? []),
    ...(components.flatMap((component) => component.docs) ?? []),
  ].map(sanitizeRelativePath).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const commands = unique([
    ...(input.topology?.execution_map.test_commands ?? []),
    ...(input.topology?.execution_map.check_commands ?? []),
    ...(input.topology?.execution_map.build_commands ?? []),
    ...(components.flatMap((component) => component.commands) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const testFamilies = unique(commands
    .filter((command) => /test|spec|phpunit|vitest|jest|tsx --test|tsc|lint|check/i.test(command))
    .map((command) => {
      if (/php|artisan|phpunit/i.test(command)) return 'php/laravel'
      if (/tsx --test|vitest|jest|npm|pnpm|tsc|lint/i.test(command)) return 'typescript/desktop'
      return 'validation'
    })).slice(0, MAX_STARTUP_ITEMS)
  const riskZones = unique([
    ...(input.impactMap?.component_impacts
      .filter((impact) => impact.risk !== 'low')
      .map((impact) => `${impact.component_key}:${impact.risk}`) ?? []),
    ...(components.flatMap((component) => component.cautions.map((caution) => `${component.key}:${caution}`)) ?? []),
    ...(input.memoryFreshness?.evidence.revalidate.map((item) => `frescor:${item}`) ?? []),
    ...(input.preflight?.gates.filter((gate) => gate.status !== 'ready').map((gate) => `pré-voo:${gate.gate}:${gate.label}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const liveComponents = (components.length > 0
    ? components.map((component) => ({
        key: component.key,
        role: component.role,
        maturity: component.maturity,
        confidence: component.confidence,
      }))
    : topologyComponents.map((component) => ({
        key: component.key,
        role: component.role,
        maturity: 'learning' as const,
        confidence: component.confidence,
      })))
    .slice(0, MAX_TOPOLOGY_COMPONENTS)
  const fragileAreas = unique([
    ...(components.filter((component) => component.reuse_policy.validate_before_execution).map((component) => component.key)),
    ...(input.impactMap?.component_impacts.filter((impact) => impact.risk === 'high').map((impact) => impact.component_key) ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const validate = unique([
    ...(input.topology?.knowledge_map.validation_entrypoints ?? []),
    ...(input.impactMap?.component_impacts.flatMap((impact) => impact.validation_cascade) ?? []),
    ...(input.executionDoctrine?.command_policy.revalidate ?? []),
    ...(input.preflight?.execution_lanes.before_execution ?? []),
    ...commands.filter((command) => /test|tsc|lint|check|build/i.test(command)),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const loadFirst = unique([
    ...(components.filter((component) => component.reuse_policy.can_autoload).flatMap((component) => component.load_first) ?? []),
    ...(input.preflight?.execution_lanes.before_send ?? []),
    ...(input.topology?.knowledge_map.load_first_docs.map((doc) => `doc:${doc}`) ?? []),
    ...(input.topology?.knowledge_map.manifest_refs.map((path) => `manifest:${path}`) ?? []),
    ...ownerDocs.map((doc) => `doc:${doc}`),
    ...apps.slice(0, 3).map((app) => `área:${app}`),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const summarize = unique([
    ...(components.filter((component) => !component.reuse_policy.can_autoload).map((component) => `área:${component.key}`) ?? []),
    ...(input.topology?.knowledge_map.summarize_only.map((item) => `resumo:${item}`) ?? []),
    ...(input.artifactReplay?.reusable_startup_gold.reusable_patterns.slice(0, 3).map((item) => `artifact:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const avoid = unique([
    input.topology?.root.scan_truncated ? 'varredura bruta completa sem foco' : null,
    ...(input.topology?.knowledge_map.sensitive_zones.map((zone) => `sensível:${zone}`) ?? []),
    ...(input.executionDoctrine?.command_policy.avoid ?? []),
    ...(input.preflight?.gates.filter((gate) => gate.status === 'blocked').map((gate) => `bloqueado:${gate.label}`) ?? []),
    'paths absolutos do Mac',
    'conversa bruta como contexto principal',
  ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const learnedFromOutcomes = unique([
    ...(input.sessionGold?.strongest_outcomes.map((outcome) => `ouro:${outcome.label}:${outcome.confidence}`) ?? []),
    ...(input.sessionGold?.proven_commands.map((command) => `comando:${command.command}:${command.success_count}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const stale = input.memoryFreshness?.state === 'stale' || input.memoryFreshness?.state === 'cold'
  const readiness = normalizePercent(
    34
    + Math.min(18, stack.length * 3)
    + Math.min(18, liveComponents.length * 4)
    + Math.min(14, validate.length * 2)
    + Math.min(10, learnedFromOutcomes.length * 2)
    - (stale ? 16 : 0)
    - Math.min(12, riskZones.length * 2),
  )
  const genomeSeed = JSON.stringify({ stack, apps, ownerDocs, commands, riskZones, testFamilies })
  const codeMapSeed = JSON.stringify({ components: liveComponents, connections: input.topology?.connections ?? [] })
  const commandSeed = JSON.stringify({ commands, validate })
  const riskSeed = JSON.stringify({ riskZones, fragileAreas })

  return {
    schema_version: 'atlas.awis.workspace_twin_projection.v1',
    source: 'local_awis_workspace_twin_compiler',
    workspace_id: sanitizeComponentKey(input.workspaceKey) || 'workspace',
    readiness_score: readiness,
    stale,
    hashes: {
      genome_hash: `twin-${stableStringHash(genomeSeed)}`,
      code_map_hash: `twin-${stableStringHash(codeMapSeed)}`,
      command_registry_hash: `twin-${stableStringHash(commandSeed)}`,
      risk_map_hash: `twin-${stableStringHash(riskSeed)}`,
    },
    genome: {
      stack,
      apps,
      owner_docs: ownerDocs,
      commands,
      risk_zones: riskZones,
      test_families: testFamilies,
    },
    live_map: {
      components: liveComponents,
      connections: (input.topology?.connections ?? []).map((connection) => `${connection.from}->${connection.to}:${connection.reason}`).slice(0, MAX_STARTUP_ITEMS),
      fragile_areas: fragileAreas,
    },
    context_autopilot: {
      load_first: loadFirst,
      summarize,
      validate,
      avoid,
      reason: stale
        ? 'twin útil, mas memória precisa revalidação antes de executar'
        : 'twin local compila mapa, comandos, riscos e aprendizado do workspace',
    },
    learning_loop: {
      learned_from_outcomes: learnedFromOutcomes,
      next_refresh: unique([
        ...(input.memoryFreshness?.next_refresh.actions ?? []),
        ...(input.preflight?.execution_lanes.after_success ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      reuse_next_session: unique([
        ...loadFirst,
        ...(input.artifactReplay?.reusable_startup_gold.reusable_patterns.slice(0, 3) ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
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
  }
}

export function buildAwisWorkspaceLaunchContractProjection(input: {
  startupOrchestration: AwisWorkspaceStartupOrchestrationProjection | null
  preflight: AwisWorkspacePreflightProjection | null
  workspaceTwin: AwisWorkspaceTwinProjection | null
  memoryConsolidation: AwisWorkspaceMemoryConsolidationProjection | null
  retention: AwisWorkspaceRetentionProjection | null
  contextKernel: AwisWorkspaceContextKernelProjection | null
  automation: AwisWorkspaceAutomationProjection | null
  selfImprovement: AwisWorkspaceSelfImprovementProjection | null
  providerStrategy: AwisWorkspaceProviderStrategyProjection | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
}): AwisWorkspaceLaunchContractProjection | null {
  const shouldPrioritizeColdSeed = input.memoryFreshness?.state === 'stale'
    || input.memoryFreshness?.state === 'cold'
    || input.workspaceTwin?.stale === true
  const artifactSeedLoad = shouldPrioritizeColdSeed
    ? input.artifactReplay?.cold_start_seed.load_order.map((item) => `artifact-seed:${item}`) ?? []
    : []
  const artifactSeedValidate = shouldPrioritizeColdSeed
    ? input.artifactReplay?.cold_start_seed.validate_with.map((item) => `artifact-seed:${item}`) ?? []
    : []
  const artifactSeedWarnings = shouldPrioritizeColdSeed
    ? input.artifactReplay?.cold_start_seed.warnings.map((item) => `artifact-seed:${item}`) ?? []
    : []
  const artifactSeedPromote = shouldPrioritizeColdSeed
    ? input.artifactReplay?.cold_start_seed.automation_hooks.map((item) => `artifact-seed:${item}`) ?? []
    : []
  const firstLoad = unique([
    ...artifactSeedLoad,
    ...(input.startupOrchestration?.revalidation_gate.can_autoload ?? []),
    ...(input.startupOrchestration?.startup_sequence.filter((item) => item.required).map((item) => `${item.step}:${item.label}`) ?? []),
    ...(input.workspaceTwin?.context_autopilot.load_first ?? []),
    ...(input.memoryConsolidation?.next_session_seed ?? []),
    ...(input.retention?.lifecycle.keep_hot ?? []),
    ...(input.contextKernel?.priority_load.slice(0, 4).map((item) => `${item.kind}:${item.label}`) ?? []),
    ...(input.spaces?.strongest_spaces.slice(0, 2).map((space) => `Space:${space.title}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const validateBeforeTrust = unique([
    ...artifactSeedValidate,
    ...(input.startupOrchestration?.revalidation_gate.required_before_send ?? []),
    ...(input.preflight?.execution_lanes.before_execution ?? []),
    ...(input.workspaceTwin?.context_autopilot.validate ?? []),
    ...(input.memoryFreshness?.evidence.revalidate ?? []),
    ...(input.contextKernel?.validation_plan.commands ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const summarizeOnly = unique([
    ...(input.workspaceTwin?.context_autopilot.summarize ?? []),
    ...(input.memoryConsolidation?.consolidate.summarize_only ?? []),
    ...(input.contextKernel?.compression_plan.summarize ?? []),
    ...(input.artifactReplay?.reusable_startup_gold.reusable_patterns.slice(0, 3).map((item) => `artifact:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const avoidLoading = unique([
    ...(input.workspaceTwin?.context_autopilot.avoid ?? []),
    ...(input.memoryConsolidation?.consolidate.never_promote ?? []),
    ...(input.contextKernel?.compression_plan.omit ?? []),
    ...(input.preflight?.gates.filter((gate) => gate.status === 'blocked').map((gate) => `bloqueado:${gate.label}`) ?? []),
    ...(input.memoryFreshness?.state === 'stale' || input.memoryFreshness?.state === 'cold'
      ? ['memória fria:usar só como resumo até revalidar']
      : []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const promoteAfterSuccess = unique([
    ...artifactSeedPromote,
    ...(input.preflight?.promotion_contract.promote_when ?? []),
    ...(input.memoryConsolidation?.consolidate.promote_to_gold ?? []),
    ...(input.selfImprovement?.promotion_policy.promote_when ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const demoteAfterFailure = unique([
    ...artifactSeedWarnings,
    ...(input.preflight?.promotion_contract.demote_when ?? []),
    ...(input.memoryConsolidation?.consolidate.never_promote ?? []),
    ...(input.selfImprovement?.promotion_policy.demote_when ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const beforeSend = unique([
    ...artifactSeedLoad.map((item) => `carregar:${item}`),
    ...firstLoad.map((item) => `carregar:${item}`),
    ...(input.preflight?.execution_lanes.before_send ?? []),
    ...(input.automation?.autopilot_context.before_send ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const afterSuccess = unique([
    ...(input.preflight?.execution_lanes.after_success ?? []),
    ...(input.memoryConsolidation?.learning_loop.capture_after_send ?? []),
    ...(input.startupOrchestration?.learning_loop.update_space_pack ? ['atualizar Space/context pack'] : []),
    ...(input.startupOrchestration?.learning_loop.preserve_artifact_after_success ? ['preservar artifact de partida'] : []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const afterFailure = unique([
    ...(input.preflight?.execution_lanes.after_failure ?? []),
    ...(input.memoryConsolidation?.learning_loop.recalibrate_after_failure ?? []),
    ...(input.retention?.lifecycle.revalidate.map((item) => `revalidar:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const recoveryDemoteContext = unique([
    ...demoteAfterFailure,
    ...artifactSeedWarnings.map((item) => `revalidar:${item}`),
    ...(input.memoryConsolidation?.consolidate.revalidate.map((item) => `revalidar:${item}`) ?? []),
    ...(input.memoryFreshness?.evidence.revalidate.map((item) => `frescor:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const recoverySafeResume = unique([
    ...(artifactSeedLoad[0] ? [`retomar:${artifactSeedLoad[0]}`] : []),
    ...(validateBeforeTrust[0] ? [`validar:${validateBeforeTrust[0]}`] : []),
    ...(firstLoad[0] ? [`retomar:${firstLoad[0]}`] : []),
    ...(input.providerStrategy?.fallback_order.slice(0, 2).map((provider) => `provider:${provider}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const maintenanceActions = unique([
    ...(input.automation?.maintenance_queue.map((item) => `${item.action}:${item.label}`) ?? []),
    ...(input.selfImprovement?.improvement_queue.map((item) => `${item.action}:${item.label}`) ?? []),
    ...(input.memoryFreshness?.next_refresh.actions.map((item) => `frescor:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const confirmBefore = unique([
    ...(input.preflight?.gates.filter((gate) => gate.required && gate.status !== 'ready').map((gate) => `${gate.gate}:${gate.label}`) ?? []),
    ...(input.contextKernel?.validation_plan.requires_human_confirmation ? ['mudança com risco ou side effect'] : []),
    ...(input.startupOrchestration?.revalidation_gate.needs_human_confirmation ? ['partida pede confirmação humana'] : []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const humanOwns = unique([
    ...(input.preflight?.gates.filter((gate) => gate.gate === 'human').flatMap((gate) => gate.evidence) ?? []),
    ...(input.workspaceTwin?.live_map.fragile_areas.map((area) => `área frágil:${area}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const doNotDelegate = unique([
    'aprovar execução destrutiva',
    'promover contexto sem evidência',
    ...avoidLoading.slice(0, 4),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const readiness = normalizePercent(Math.max(
    input.startupOrchestration?.readiness_score ?? 0,
    input.preflight?.readiness_score ?? 0,
    input.workspaceTwin?.readiness_score ?? 0,
    input.contextKernel?.readiness_score ?? 0,
  ))
  const launchMode: AwisWorkspaceLaunchContractProjection['launch_mode'] = input.preflight?.mode === 'blocked'
    ? 'guarded'
    : input.startupOrchestration?.launch_mode ?? (readiness >= 78 ? 'deep' : readiness >= 45 ? 'warm' : 'guarded')
  const loadOrder = unique([
    ...artifactSeedLoad,
    ...firstLoad,
    ...(input.startupOrchestration?.startup_sequence.map((item) => `${item.step}:${item.source}:${item.label}`) ?? []),
    ...(input.workspaceTwin?.learning_loop.reuse_next_session ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const seedHash = `launch-${stableStringHash(JSON.stringify({
    firstLoad,
    validateBeforeTrust,
    summarizeOnly,
    avoidLoading,
    promoteAfterSuccess,
    demoteAfterFailure,
    maintenanceActions,
  }))}`
  if (firstLoad.length === 0 && validateBeforeTrust.length === 0 && maintenanceActions.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_launch_contract_projection.v1',
    source: 'local_awis_launch_contract_compiler',
    readiness_score: readiness,
    launch_mode: launchMode,
    seed_hash: seedHash,
    startup_contract: {
      never_start_cold: true,
      first_load: firstLoad,
      validate_before_trust: validateBeforeTrust,
      summarize_only: summarizeOnly,
      avoid_loading: avoidLoading,
      promote_after_success: promoteAfterSuccess,
      demote_after_failure: demoteAfterFailure,
      preserve_artifact_after_success: Boolean(input.startupOrchestration?.learning_loop.preserve_artifact_after_success || input.preflight?.promotion_contract.preserve_as_artifact),
      update_space_pack: Boolean(input.startupOrchestration?.learning_loop.update_space_pack || input.preflight?.promotion_contract.update_space_pack || input.spaces?.space_count),
      needs_human_confirmation: confirmBefore.length > 0,
    },
    automation_contract: {
      before_send: beforeSend,
      after_success: afterSuccess,
      after_failure: afterFailure,
      maintenance_actions: maintenanceActions,
    },
    recovery_contract: {
      demote_context: recoveryDemoteContext,
      safe_resume: recoverySafeResume,
      reason: recoveryDemoteContext.length > 0
        ? 'falhas ou contexto stale exigem revalidação antes de promover memória'
        : 'sem falha crítica recente; usar validação padrão antes de retry',
    },
    human_contract: {
      owns: humanOwns,
      confirm_before: confirmBefore,
      do_not_delegate: doNotDelegate,
    },
    next_conversation: {
      load_order: loadOrder,
      context_budget: {
        max_items: input.startupOrchestration?.context_budget.max_items ?? input.contextKernel?.budget.max_context_items ?? (launchMode === 'deep' ? MAX_STARTUP_ITEMS : 5),
        prefer_summary: Boolean(input.startupOrchestration?.context_budget.prefer_summary || validateBeforeTrust.length > 0 || summarizeOnly.length > 0),
        reason: input.startupOrchestration?.context_budget.reason
          ?? input.contextKernel?.budget.reason
          ?? 'contrato de partida AWIS compila memória, Spaces, artifacts e validação',
      },
      provider_note: input.providerStrategy?.preferred[0]?.reason
        ?? 'usar contexto provider-safe e aprender pelo outcome da sessão',
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
  }
}

export function buildAwisWorkspaceTaskContextProjection(
  pack: AwisWorkspaceContextPack | null | undefined,
  userInput: string | null | undefined,
): AwisWorkspaceTaskContextProjection | null {
  const promptSignals = taskSignalsFromInput(userInput)
  if (!pack || promptSignals.length === 0) return null

  const taskKind = taskKindFromSignals(promptSignals)
  const taskRoute = pack.task_router?.routes.find((route) => route.task_kind === taskKind) ?? null
  const topology = pack.topology
  const componentIntentRanking = buildComponentIntentRanking(pack, promptSignals)
  const semanticMatches = selectSemanticMatches(pack.semantic_index, promptSignals, taskKind)
  const components = (topology?.components ?? [])
    .map((component) => {
      const semanticMatch = semanticMatches.find((match) => match.component_keys.includes(component.key))
      const haystack = [
        component.key,
        component.role,
        ...component.stack,
        ...component.manifests,
        ...component.docs,
        ...component.commands.map((command) => command.command),
      ].join(' ').toLowerCase()
      const matches = promptSignals.filter((signal) => haystack.includes(signal.toLowerCase()))
      const intentBoost = taskKind === 'bug_fix' && /test|lint|check|tsc/i.test(haystack) ? 1 : 0
      const ranked = componentIntentRanking.find((item) => item.key === component.key)
      const score = matches.length + intentBoost + Math.round((ranked?.score ?? 0) / 20) + Math.round((semanticMatch?.confidence ?? 0) / 25)
      return {
        score,
        key: component.key,
        role: component.role,
        stack: component.stack.slice(0, MAX_STARTUP_ITEMS),
        why: semanticMatch?.alias
          ? `índice semântico:${semanticMatch.alias}`
          : ranked?.matched[0] ? `sinal: ${ranked.matched[0]}` : matches[0] ? `sinal: ${matches[0]}` : component.role,
      }
    })
    .filter((component) => component.score > 0)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, 3)
    .map((component) => ({
      key: component.key,
      role: component.role,
      stack: component.stack,
      why: component.why,
    }))

  const fallbackComponents = components.length > 0
    ? components
    : (topology?.components ?? []).slice(0, 2).map((component) => ({
        key: component.key,
        role: component.role,
        stack: component.stack.slice(0, MAX_STARTUP_ITEMS),
        why: 'componente forte do workspace',
      }))
  const selectedComponentKeys = new Set(fallbackComponents.map((component) => component.key))
  const impactRadius = selectImpactRadius(pack.impact_map, fallbackComponents, semanticMatches)
  const selectedTopologyComponents = fallbackComponents
    .flatMap((selected) => (topology?.components ?? []).filter((component) => component.key === selected.key))
  const selectedComponentMemory = (pack.component_memory?.strongest_components ?? [])
    .filter((component) => selectedComponentKeys.has(component.key))
  const componentContextPacks = buildComponentContextPacks(pack, componentIntentRanking, selectedComponentKeys)
  const folderFocus = buildFolderFocusPlan(pack, taskKind, selectedTopologyComponents, componentContextPacks)
  const taskGold = buildTaskGoldSelection(pack, taskKind, fallbackComponents, folderFocus)
  const spaceBrain = selectSpaceBrainForTask(pack.spaces, promptSignals, taskKind, pack.memory?.operational.context_gold ?? null)
  const workingSet = {
    files: unique([
      ...selectedTopologyComponents.flatMap((component) => component.manifests),
      ...(topology?.knowledge_map.manifest_refs ?? []),
    ])
      .map(sanitizeRelativePath)
      .filter(isString)
      .slice(0, MAX_STARTUP_ITEMS),
    docs: unique([
      ...(topology?.knowledge_map.load_first_docs ?? []),
      ...selectedTopologyComponents.flatMap((component) => component.docs),
      ...(pack.startup_briefing?.focus.owner_docs ?? []),
      ...(topology?.components.flatMap((component) => component.docs) ?? []),
    ])
      .map(sanitizeRelativePath)
      .filter(isString)
      .slice(0, MAX_STARTUP_ITEMS),
    commands: unique([
      ...(topology?.knowledge_map.validation_entrypoints ?? []),
      ...(topology?.knowledge_map.runtime_entrypoints ?? []),
      ...selectedTopologyComponents.flatMap((component) => component.commands.map((command) => command.command)),
    ])
      .concat(semanticMatches.flatMap((match) => match.validate))
      .slice(0, MAX_STARTUP_ITEMS),
    reason: fallbackComponents[0]?.why ?? 'working set derivado do mapa de pasta AWIS',
  }
  const validationCommands = unique([
    ...(pack.artifact_replay?.cold_start_seed.validate_with ?? []),
    ...(pack.learning?.task_memory.validation_plans
      .filter((plan) => plan.task_kind === taskKind && plan.confidence >= 60)
      .flatMap((plan) => plan.commands) ?? []),
    ...(pack.context_kernel?.validation_plan.commands ?? []),
    ...(topology?.knowledge_map.validation_entrypoints ?? []),
    ...(pack.self_improvement?.next_review.validate_with ?? []),
    ...(pack.startup_orchestration?.startup_sequence
      .filter((item) => item.step === 'validate')
      .map((item) => item.label) ?? []),
    ...commandsForTaskKind(taskKind, pack),
    ...(pack.session_gold?.next_session_hooks.validate_with ?? []),
    ...(pack.execution_doctrine?.command_policy.trusted.filter((command) => /test|tsc|lint|check|build/i.test(command)) ?? []),
    ...(pack.execution_doctrine?.command_policy.revalidate.filter((command) => /test|tsc|lint|check|build/i.test(command)) ?? []),
    ...(taskRoute?.validate_with ?? []),
    ...semanticMatches.flatMap((match) => match.validate),
    ...impactRadius.validation_cascade,
    ...(pack.workspace_mesh?.next_conversation.validate_with ?? []),
    ...(pack.repository_constellation?.next_conversation.validate_with ?? []),
    ...(pack.current_truth_pack?.proof.validate_with ?? []),
    ...(pack.live_execution_memory?.startup_packet.validate_before_trust ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const cautions = unique([
    ...spaceBrain.flatMap((space) => space.validate_before_use.map((item) => `Space:${space.title}:${item}`)),
    ...spaceBrain.flatMap((space) => space.human_boundary.map((item) => `humano:${space.title}:${item}`)),
    ...(pack.artifact_replay?.cold_start_seed.warnings.map((item) => `partida fria:${item}`) ?? []),
    ...(pack.learning?.caution_signals ?? []),
    ...(pack.startup_playbook?.risk_controls ?? []),
    ...(pack.startup_briefing?.automation_plan.warnings ?? []),
    ...(pack.artifact_replay?.reusable_startup_gold.warnings ?? []),
    ...(pack.context_kernel?.compression_plan.omit.filter((item) => item.startsWith('revalidar antes:')) ?? []),
    ...(pack.self_improvement?.improvement_queue.filter((item) => item.action === 'demote_context').map((item) => `revalidar antes:${item.label}`) ?? []),
    ...(pack.memory_freshness?.evidence.revalidate.map((item) => `frescor:${item}`) ?? []),
    ...(pack.retention?.lifecycle.revalidate.map((item) => `retenção:${item}`) ?? []),
    ...(pack.startup_orchestration?.revalidation_gate.required_before_send.map((item) => `partida:${item}`) ?? []),
    ...(topology?.knowledge_map.sensitive_zones.map((zone) => `pasta sensível:${zone}`) ?? []),
    ...(topology?.knowledge_map.summarize_only.map((item) => `pasta resumida:${item}`) ?? []),
    ...(taskRoute?.automation_hooks.after_failure.map((item) => `rota:${item}`) ?? []),
    ...(pack.semantic_index?.retrieval_policy.revalidate_when.map((item) => `semântico:${item}`) ?? []),
    ...(pack.preflight?.gates.filter((gate) => gate.status !== 'ready').map((gate) => `pré-voo:${gate.gate}:${gate.label}`) ?? []),
    ...(pack.workspace_twin?.stale ? ['twin:revalidar antes de executar'] : []),
    ...(pack.artifact_replay?.cold_start_seed.human_boundary.map((item) => `humano:${item}`) ?? []),
    ...(pack.workspace_mesh?.next_conversation.human_boundary.map((item) => `mesh:${item}`) ?? []),
    ...(pack.repository_constellation?.next_conversation.human_boundary.map((item) => `repo:${item}`) ?? []),
    ...(pack.current_truth_pack?.proof.stale_or_unproven.map((item) => `truth:${item}`) ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const evidenceGate = buildTaskEvidenceGate(pack, taskKind, taskGold, componentContextPacks, validationCommands, cautions)
  const taskContextBudget = buildTaskContextBudget(pack, taskKind, folderFocus, componentContextPacks, evidenceGate)
  const recoveryPlaybook = buildTaskRecoveryPlaybook(pack, taskKind, evidenceGate, taskContextBudget, validationCommands)
  const loadOrder = unique([
    ...(pack.living_graph?.golden_path ?? []),
    ...semanticMatches.flatMap((match) => match.load.map((item) => `semântico:${match.alias}:${item}`)),
    ...(topology?.knowledge_map.load_first_docs.map((path) => `doc-guia:${path}`) ?? []),
    ...(topology?.knowledge_map.manifest_refs.map((path) => `manifest:${path}`) ?? []),
    ...(pack.startup_orchestration?.startup_sequence.map((item) => `${item.step}:${item.label}`) ?? []),
    ...(pack.preflight?.execution_lanes.before_send.map((item) => `pré-voo:${item}`) ?? []),
    ...(pack.workspace_twin?.context_autopilot.load_first.map((item) => `twin:${item}`) ?? []),
    ...(selectedComponentMemory.flatMap((component) => component.load_first.map((item) => `área:${component.key}:${item}`))),
    ...(pack.memory_freshness?.state === 'stale' || pack.memory_freshness?.state === 'cold'
      ? pack.memory_freshness.next_refresh.actions.map((action) => `frescor:${action}`)
      : []),
    ...(pack.retention?.lifecycle.keep_hot.map((item) => `retenção:${item}`) ?? []),
    ...(pack.self_improvement?.improvement_queue.map((item) => `melhoria:${item.action}:${item.label}`) ?? []),
    ...(pack.context_kernel?.priority_load.map((item) => `${item.kind}:${item.label}`) ?? []),
    ...spaceBrain.flatMap((space) => space.load_first.map((item) => `space-brain:${space.title}:${item}`)),
    ...spaceBrain.flatMap((space) => space.carry_forward.map((item) => `space-brain-carry:${space.title}:${item}`)),
    ...(pack.artifact_replay?.cold_start_seed.load_order.map((item) => `seed:${item}`) ?? []),
    ...(taskRoute?.load_first ?? []),
    impactRadius.primary_component ? `impacto:${impactRadius.primary_component}:${impactRadius.reason}` : null,
    folderFocus.primary_component ? `pasta foco:${folderFocus.primary_component}` : null,
    ...(pack.continuity?.next_session_plan.first_load ?? []),
    taskKind === 'bug_fix' || taskKind === 'code_change' ? 'mapa de componentes' : null,
    ...(pack.startup_briefing?.focus.load_sequence ?? []),
    ...(pack.session_gold?.strongest_outcomes.map((outcome) => `ouro:${outcome.label}`) ?? []),
    ...(pack.startup_playbook?.context_loading.must_load ?? []),
    pack.spaces?.strongest_spaces[0] ? 'Space mais forte' : null,
    pack.artifact_replay ? 'replay de artefatos' : null,
    ...(pack.workspace_mesh?.next_conversation.load_order.map((item) => `mesh:${item}`) ?? []),
    ...(pack.current_truth_pack?.next_conversation.load_first.map((item) => `truth:${item}`) ?? []),
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS * 10)
  const spaces = (pack.spaces?.strongest_spaces ?? [])
    .filter((space) => taskKind !== 'unknown' || space.session_count >= 2)
    .map((space) => `${space.title} · ${space.session_count} sessões`)
    .concat(taskRoute?.use_spaces ?? [])
    .filter((space, index, list) => list.indexOf(space) === index)
    .slice(0, 2)
  const suggestedSurface: AwisWorkspaceTaskContextProjection['execution_plan']['suggested_surface'] =
    taskRoute?.suggested_surface ??
    (taskKind === 'analysis' && spaces.length > 0
      ? 'side_by_side'
      : spaces.length > 0 && (taskKind === 'research' || taskKind === 'analysis')
        ? 'space_first'
        : pack.startup_playbook?.recommended_surface ?? 'single_conversation')
  const confidence = Math.min(100, 30 + promptSignals.length * 8 + fallbackComponents.length * 12 + validationCommands.length * 6)
  const nextSessionContract = buildTaskNextSessionContract(pack, taskKind, taskContextBudget, evidenceGate, validationCommands)

  return {
    schema_version: 'atlas.awis.workspace_task_context_projection.v1',
    source: 'local_awis_task_autopilot',
    workspace_key: pack.workspace.key,
    task_kind: taskKind,
    confidence,
    matched_intent_signals: promptSignals.slice(0, MAX_STARTUP_ITEMS),
    recommended_context: {
      load_order: loadOrder,
      components: fallbackComponents,
      component_intent_ranking: componentIntentRanking.slice(0, MAX_STARTUP_ITEMS),
      component_context_packs: componentContextPacks,
      folder_focus: folderFocus,
      task_gold: taskGold,
      evidence_gate: evidenceGate,
      context_budget: taskContextBudget,
      working_set: workingSet,
      semantic_matches: semanticMatches,
      impact_radius: impactRadius,
      space_brain: spaceBrain,
      spaces,
      artifacts: unique([
        ...spaceBrain.flatMap((space) => space.artifact_refs),
        pack.live_execution_memory?.memory_hash ?? null,
        ...(pack.continuity?.hot_context.artifacts ?? []),
        ...(pack.startup_briefing?.context_gold.artifact_refs ?? []),
        ...(pack.living_graph?.nodes.filter((node) => node.kind === 'artifact').map((node) => node.label) ?? []),
        pack.current_truth_pack?.truth_hash ?? null,
        pack.artifact_replay?.cold_start_seed.seed_hash ?? null,
        pack.artifact_lake?.latest_artifact_hash ?? null,
        pack.artifact_replay?.latest_artifact_hash ?? null,
      ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      owner_docs: pack.startup_briefing?.focus.owner_docs.slice(0, MAX_STARTUP_ITEMS) ?? [],
      related_workspace_hints: unique([
        ...(pack.artifact_replay?.cold_start_seed.repository_hints.map((hint) => `seed:${hint}`) ?? []),
        ...(pack.current_truth_pack?.current_truth.mesh_routes.map((route) => `truth:${route}`) ?? []),
        ...(pack.repository_constellation?.repositories.map((repo) => `repo:${repo.key}:${repo.maturity}`) ?? []),
        ...(pack.repository_constellation?.bridges.map((bridge) => `repo-bridge:${bridge.from}->${bridge.to}`) ?? []),
        ...(pack.workspace_mesh?.routes.map((route) => `mesh:${route.workspace_hint}:${route.relationship}`) ?? []),
        ...(pack.relations?.related_workspaces.map((workspace) => workspace.workspace_hint) ?? []),
        ...(pack.living_graph?.nodes.filter((node) => node.kind === 'related_workspace').map((node) => node.label) ?? []),
        ...(pack.relations?.transfer_matrix.map((item) => `transfer:${item.workspace_hint}:${item.reuse[0] ?? 'provider-safe'}`) ?? []),
        ...(pack.live_execution_memory?.workspace_learning.repositories.map((repo) => `live-repo:${repo}`) ?? []),
        ...(pack.live_execution_memory?.workspace_learning.components.map((component) => `live-component:${component}`) ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
    },
    execution_plan: {
      suggested_surface: suggestedSurface,
      doctrine_drivers: selectDoctrineDriversForTask(pack.execution_doctrine, taskKind),
      preflight_gates: unique([
        ...(pack.execution_doctrine?.preflight.required_before_execution ?? []),
        ...(pack.execution_doctrine?.doctrine_drivers
          .filter((driver) => driver.required && driver.applies_to.includes(taskKind))
          .map((driver) => `${driver.name}:${driver.gate}`) ?? []),
        ...(pack.preflight?.gates.filter((gate) => gate.required).map((gate) => `pré-voo:${gate.gate}:${gate.status}:${gate.label}`) ?? []),
        ...(pack.workspace_twin?.context_autopilot.validate.map((item) => `twin:${item}`) ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2),
      validation_commands: validationCommands,
      commands_to_avoid: unique([
        ...selectedComponentMemory
          .filter((component) => component.reuse_policy.validate_before_execution)
          .map((component) => `área:${component.key}:validar antes de executar`),
        ...(pack.memory_freshness?.state === 'stale' || pack.memory_freshness?.state === 'cold'
          ? ['memória stale:usar resumo até revalidar']
          : []),
        ...(pack.retention?.lifecycle.drop_or_summarize ?? []),
        ...(pack.startup_orchestration?.context_budget.prefer_summary ? ['partida:preferir resumo'] : []),
        ...(pack.context_kernel?.compression_plan.omit ?? []),
        ...(pack.next_session_brain?.context_loading.avoid_commands ?? []),
        ...(pack.continuity?.stale_or_risky_context ?? []),
        ...(pack.startup_playbook?.context_loading.avoid_loading ?? []),
        ...(pack.execution_doctrine?.command_policy.avoid ?? []),
        ...(taskRoute?.avoid_loading ?? []),
        ...(pack.semantic_index?.retrieval_policy.never_load_raw ?? []),
        ...(impactRadius.risk === 'high' ? [`impacto alto:${impactRadius.reason}`] : []),
        ...(pack.preflight?.gates.filter((gate) => gate.status === 'blocked').map((gate) => `pré-voo bloqueado:${gate.label}`) ?? []),
        ...(pack.workspace_twin?.context_autopilot.avoid.map((item) => `twin:${item}`) ?? []),
      ]).slice(0, MAX_STARTUP_ITEMS),
      recovery_playbook: recoveryPlaybook,
      requires_local_folder: pack.workspace.root_path_known && (taskKind === 'bug_fix' || taskKind === 'code_change' || validationCommands.length > 0),
    },
    learning_hooks: {
      record_task_outcome: true,
      update_command_confidence: true,
      watch_for_workspace_drift: pack.startup_playbook?.learning_hooks.watch_for_drift === true
        || pack.context_kernel?.learning_contract.refresh_folder_map_on_drift === true,
      next_session_contract: {
      first_load: unique([
          ...(pack.artifact_replay?.cold_start_seed.load_order ?? []),
          ...(topology?.knowledge_map.load_first_docs.map((path) => `doc-guia:${path}`) ?? []),
          ...(topology?.knowledge_map.manifest_refs.map((path) => `manifest:${path}`) ?? []),
          ...nextSessionContract.first_load,
          ...(pack.preflight?.execution_lanes.before_send ?? []),
          ...(pack.workspace_twin?.learning_loop.reuse_next_session ?? []),
          ...(pack.workspace_mesh?.next_conversation.load_order ?? []),
          ...(pack.repository_constellation?.next_conversation.load_first ?? []),
          ...(pack.current_truth_pack?.next_conversation.load_first ?? []),
          ...(pack.live_execution_memory?.startup_packet.load_first ?? []),
        ]).slice(0, MAX_STARTUP_ITEMS),
      validate_with: unique([
          ...(pack.artifact_replay?.cold_start_seed.validate_with ?? []),
          ...(topology?.knowledge_map.validation_entrypoints ?? []),
          ...(pack.preflight?.execution_lanes.before_execution ?? []),
          ...(pack.workspace_twin?.context_autopilot.validate ?? []),
          ...nextSessionContract.validate_with,
          ...(pack.workspace_mesh?.next_conversation.validate_with ?? []),
          ...(pack.repository_constellation?.next_conversation.validate_with ?? []),
          ...(pack.current_truth_pack?.proof.validate_with ?? []),
          ...(pack.live_execution_memory?.startup_packet.validate_before_trust ?? []),
        ]).slice(0, MAX_STARTUP_ITEMS),
        preserve_as_artifact: nextSessionContract.preserve_as_artifact || pack.preflight?.promotion_contract.preserve_as_artifact === true,
        promote_when: unique([
          ...nextSessionContract.promote_when,
          ...(pack.current_truth_pack?.next_conversation.promote_when ?? []),
          ...(pack.repository_constellation?.learning_loop.promote_when ?? []),
          ...(pack.artifact_replay?.cold_start_seed.automation_hooks ?? []),
          ...(pack.workspace_mesh?.next_conversation.reuse_rules.map((item) => `mesh:${item}`) ?? []),
          ...(pack.preflight?.promotion_contract.promote_when ?? []),
          ...(pack.live_execution_memory?.promotion_rules.promote_to_gold ?? []),
        ]).slice(0, MAX_STARTUP_ITEMS),
        demote_when: unique([
          ...nextSessionContract.demote_when,
          ...(pack.current_truth_pack?.next_conversation.demote_when ?? []),
          ...(pack.repository_constellation?.learning_loop.demote_when ?? []),
          ...(pack.preflight?.promotion_contract.demote_when ?? []),
          ...(pack.live_execution_memory?.promotion_rules.demote ?? []),
        ]).slice(0, MAX_STARTUP_ITEMS),
      },
    },
    risk: {
      cautions,
      needs_human_confirmation: taskKind === 'ops'
        || pack.startup_orchestration?.revalidation_gate.needs_human_confirmation === true
        || pack.context_kernel?.validation_plan.requires_human_confirmation === true
        || pack.self_improvement?.next_review.human_confirmation_required === true
        || cautions.some((caution) => /sensível|risco|bloquead|recuper/i.test(caution)),
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
  }
}

export function buildAwisWorkspaceProviderCapsule(
  pack: AwisWorkspaceContextPack | null | undefined,
  taskContext: AwisWorkspaceTaskContextProjection | null | undefined,
): AwisWorkspaceProviderCapsuleProjection | null {
  if (!pack) return null
  const startup = pack.startup_orchestration
  const loadFirst = unique([
    pack.live_execution_memory ? `live:${pack.live_execution_memory.memory_hash}` : null,
    ...(pack.artifact_replay?.cold_start_seed.load_order.map((item) => `cold-start:${item}`) ?? []),
    ...(pack.current_truth_pack ? [`truth:${pack.current_truth_pack.truth_hash}`] : []),
    ...(pack.repository_constellation ? [`repo-constellation:${pack.repository_constellation.constellation_hash}`] : []),
    ...(pack.workspace_mesh?.next_conversation.load_order.map((item) => `mesh:${item}`) ?? []),
    ...(pack.topology?.knowledge_map.load_first_docs.map((path) => `folder-doc:${path}`) ?? []),
    ...(pack.topology?.knowledge_map.manifest_refs.map((path) => `folder-manifest:${path}`) ?? []),
    ...(pack.launch_contract?.startup_contract.first_load.map((item) => `launch:${item}`) ?? []),
    ...(pack.launch_contract?.next_conversation.load_order.slice(0, 4).map((item) => `launch-order:${item}`) ?? []),
    taskContext?.recommended_context.folder_focus.primary_component
      ? `pasta:${taskContext.recommended_context.folder_focus.primary_component}:${taskContext.recommended_context.folder_focus.load_scope}`
      : null,
    ...(taskContext?.recommended_context.task_gold
      .filter((item) => item.confidence >= 72)
      .map((item) => `ouro:${item.kind}:${item.label}`) ?? []),
    ...(pack.memory_consolidation?.next_session_seed.slice(0, 4).map((item) => `seed:${item}`) ?? []),
    ...(taskContext?.recommended_context.folder_focus.include.map((item) => `pasta:${item}`) ?? []),
    ...(taskContext?.recommended_context.semantic_matches.flatMap((match) => match.load.map((item) => `semântico:${match.alias}:${item}`)) ?? []),
    ...(taskContext?.recommended_context.impact_radius.affected_components.map((item) => `impacto:${item}`) ?? []),
    ...(taskContext?.recommended_context.space_brain.flatMap((space) => space.load_first.map((item) => `space-brain:${space.title}:${item}`)) ?? []),
    ...(taskContext?.recommended_context.load_order
      .filter((item) => /mapa de componentes/i.test(item))
      .slice(0, 2) ?? []),
    ...(taskContext?.recommended_context.load_order
      .filter((item) => /mapa de componentes|gates de execução|surface:|Space:/i.test(item))
      .slice(0, 4) ?? []),
    ...(taskContext?.recommended_context.component_context_packs.flatMap((pack) => pack.load.map((item) => `pack:${pack.key}:${item}`)) ?? []),
    ...(taskContext?.recommended_context.context_budget.load_full.map((item) => `budget-full:${item}`) ?? []),
    ...(taskContext?.recommended_context.load_order ?? []),
    ...(pack.preflight?.execution_lanes.before_send.map((item) => `pré-voo:${item}`) ?? []),
    ...(pack.workspace_twin?.context_autopilot.load_first.map((item) => `twin:${item}`) ?? []),
    ...(pack.relations?.connection_contracts
      .filter((contract) => contract.confidence >= 60)
      .flatMap((contract) => contract.load_when.map((item) => `conexão:${contract.workspace_hint}:${item}`)) ?? []),
    ...(startup?.startup_sequence.filter((item) => item.required).map((item) => `${item.step}:${item.label}`) ?? []),
    ...(pack.context_kernel?.priority_load.slice(0, 4).map((item) => `${item.kind}:${item.label}`) ?? []),
    ...(pack.retention?.lifecycle.keep_hot ?? []),
    ...(pack.repository_constellation?.next_conversation.load_first.map((item) => `repo:${item}`) ?? []),
    ...(pack.current_truth_pack?.next_conversation.load_first.map((item) => `truth:${item}`) ?? []),
    ...(pack.live_execution_memory?.startup_packet.load_first.map((item) => `live:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 10)
  const useAsSummary = unique([
    ...(pack.component_memory?.strongest_components.slice(0, 3).map((component) => `área:${component.key}:${component.maturity}:${component.role}`) ?? []),
    ...(pack.artifact_replay?.cold_start_seed.seed_hash ? [`cold-start-seed:${pack.artifact_replay.cold_start_seed.seed_hash}:${pack.artifact_replay.cold_start_seed.readiness_score}`] : []),
    ...(pack.artifact_replay?.cold_start_seed.context_signals.slice(0, 5).map((item) => `cold-context:${item}`) ?? []),
    ...(pack.artifact_replay?.cold_start_seed.reuse_spaces.slice(0, 3).map((item) => `cold-space:${item}`) ?? []),
    ...(pack.artifact_replay?.cold_start_seed.repository_hints.slice(0, 4).map((item) => `cold-repo:${item}`) ?? []),
    ...(pack.current_truth_pack ? [`current-truth:${pack.current_truth_pack.truth_hash}:${pack.current_truth_pack.readiness_score}`] : []),
    ...(pack.repository_constellation ? [`repository-constellation:${pack.repository_constellation.constellation_hash}:${pack.repository_constellation.readiness_score}`] : []),
    ...(pack.current_truth_pack?.current_truth.must_keep.slice(0, 6).map((item) => `truth-keep:${item}`) ?? []),
    ...(pack.current_truth_pack?.proof.evidence_refs.slice(0, 5).map((item) => `truth-evidence:${item}`) ?? []),
    ...(pack.workspace_mesh ? [`workspace-mesh:${pack.workspace_mesh.mesh_hash}:${pack.workspace_mesh.readiness_score}`] : []),
    ...(pack.workspace_mesh?.routes.slice(0, 6).map((route) => `mesh-route:${route.workspace_hint}:${route.relationship}:${route.confidence}`) ?? []),
    ...(pack.workspace_mesh?.next_conversation.reuse_rules.slice(0, 5).map((item) => `mesh-reuse:${item}`) ?? []),
    ...(pack.provider_strategy?.preferred.slice(0, 3).map((item) => `provider:${item.policy}:${item.model ? `${item.provider}:${item.model}` : item.provider}:${item.reason}`) ?? []),
    ...(taskContext?.recommended_context.task_gold.map((item) => `task-gold:${item.kind}:${item.label}:${item.why}`) ?? []),
    ...(taskContext?.recommended_context.evidence_gate.trusted.map((item) => `evidência confiável:${item}`) ?? []),
    taskContext?.recommended_context.evidence_gate.reason
      ? `evidence-gate:${taskContext.recommended_context.evidence_gate.reason}`
      : null,
    taskContext?.recommended_context.context_budget.reason
      ? `budget:${taskContext.recommended_context.context_budget.mode}:${taskContext.recommended_context.context_budget.reason}`
      : null,
    ...(pack.learning?.task_memory.validation_plans
      .filter((plan) => plan.confidence >= 60 && (!taskContext || plan.task_kind === taskContext.task_kind))
      .map((plan) => `validation-plan:${plan.task_kind}:${plan.commands.join(' + ')}:${plan.confidence}`) ?? []),
    ...(taskContext?.execution_plan.doctrine_drivers.map((item) => `doutrina:${item}`) ?? []),
    ...(pack.execution_doctrine?.doctrine_drivers.slice(0, 4).map((driver) => `doutrina:${driver.name}:${driver.reason}`) ?? []),
    ...(taskContext?.recommended_context.component_context_packs.map((pack) => `component-pack:${pack.key}:${pack.mode}:${pack.reason}`) ?? []),
    ...(taskContext?.recommended_context.semantic_matches.map((match) => `semantic-match:${match.alias}:${match.intent}:${match.confidence}`) ?? []),
    ...(taskContext ? [`impact-radius:${taskContext.recommended_context.impact_radius.primary_component}:${taskContext.recommended_context.impact_radius.risk}:${taskContext.recommended_context.impact_radius.reason}`] : []),
    ...(taskContext?.recommended_context.space_brain.flatMap((space) => [
      `space-brain:${space.title}:${space.state}:${space.confidence}`,
      ...space.carry_forward.map((item) => `space-carry:${space.title}:${item}`),
      ...space.evidence.map((item) => `space-evidence:${space.title}:${item}`),
    ]) ?? []),
    ...(pack.preflight?.gates.map((gate) => `preflight:${gate.gate}:${gate.status}:${gate.label}`) ?? []),
    ...(pack.preflight ? [`preflight-mode:${pack.preflight.mode}:${pack.preflight.readiness_score}`] : []),
    ...(pack.workspace_twin ? [`workspace-twin:${pack.workspace_twin.readiness_score}:${pack.workspace_twin.hashes.genome_hash}`] : []),
    ...(pack.workspace_twin?.genome.apps.map((app) => `twin-app:${app}`) ?? []),
    ...(pack.workspace_twin?.context_autopilot.summarize.map((item) => `twin-summary:${item}`) ?? []),
    ...(pack.launch_contract ? [`launch-contract:${pack.launch_contract.launch_mode}:${pack.launch_contract.seed_hash}`] : []),
    ...(pack.launch_contract?.startup_contract.summarize_only.map((item) => `launch-summary:${item}`) ?? []),
    pack.launch_contract?.next_conversation.provider_note
      ? `launch-provider:${pack.launch_contract.next_conversation.provider_note}`
      : null,
    ...(pack.relations?.connection_contracts.flatMap((contract) => [
      `repo-connection:${contract.workspace_hint}:${contract.relationship}:${contract.confidence}`,
      ...contract.reuse.slice(0, 3).map((item) => `repo-reuse:${contract.workspace_hint}:${item}`),
    ]) ?? []),
    ...(taskContext?.recommended_context.working_set.files.map((item) => `arquivo:${item}`) ?? []),
    ...(taskContext?.recommended_context.working_set.docs.map((item) => `doc:${item}`) ?? []),
    ...(taskContext?.recommended_context.working_set.commands.map((item) => `comando:${item}`) ?? []),
    taskContext?.recommended_context.folder_focus.reason
      ? `folder-focus:${taskContext.recommended_context.folder_focus.reason}`
      : null,
    ...(taskContext?.recommended_context.folder_focus.summarize.map((item) => `resumir pasta:${item}`) ?? []),
    ...(taskContext?.recommended_context.context_budget.summarize.map((item) => `budget-summary:${item}`) ?? []),
    ...(taskContext?.execution_plan.recovery_playbook.safe_resume.map((item) => `recovery:${item}`) ?? []),
    ...(pack.relations?.transfer_matrix.flatMap((item) => item.reuse.slice(0, 3).map((reuse) => `transfer:${item.workspace_hint}:${reuse}`)) ?? []),
    ...(taskContext?.recommended_context.spaces.map((item) => `Space:${item}`) ?? []),
    ...(taskContext?.recommended_context.space_brain.flatMap((space) => space.artifact_refs.map((ref) => `space-artifact:${space.title}:${ref}`)) ?? []),
    ...(taskContext?.recommended_context.components.map((item) => `componente:${item.key}:${item.why}`) ?? []),
    ...(pack.topology?.knowledge_map.command_sources.map((path) => `folder-command-source:${path}`) ?? []),
    ...(pack.topology?.knowledge_map.runtime_entrypoints.map((command) => `folder-runtime:${command}`) ?? []),
    ...(pack.topology?.knowledge_map.summarize_only.map((item) => `folder-summary:${item}`) ?? []),
    ...(pack.repository_constellation?.repositories.slice(0, 5).map((repo) => `repo-node:${repo.key}:${repo.maturity}:${repo.role}`) ?? []),
    ...(pack.repository_constellation?.bridges.slice(0, 5).map((bridge) => `repo-bridge:${bridge.from}->${bridge.to}:${bridge.reason}`) ?? []),
    ...(taskContext?.recommended_context.artifacts.map((item) => `artefato:${item}`) ?? []),
    ...(pack.session_gold?.strongest_outcomes.slice(0, 3).map((item) => `ouro:${item.label}:${item.confidence}`) ?? []),
    ...(pack.memory_consolidation?.consolidate.rehearse_next.slice(0, 4).map((item) => `consolidar:${item}`) ?? []),
    ...(pack.memory_consolidation?.consolidate.archive_as_artifact.slice(0, 2).map((item) => `artifact-candidato:${item}`) ?? []),
    ...(pack.live_execution_memory ? [`live-memory:${pack.live_execution_memory.memory_hash}:${pack.live_execution_memory.readiness_score}`] : []),
    ...(pack.live_execution_memory?.startup_packet.use_as_summary.map((item) => `live-summary:${item}`) ?? []),
    ...(pack.live_execution_memory?.workspace_learning.repositories.map((item) => `live-repo:${item}`) ?? []),
    ...(pack.artifact_replay?.reusable_startup_gold.reusable_patterns.slice(0, 4) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 10)
  const validateWith = unique([
    ...(taskContext?.execution_plan.validation_commands ?? []),
    ...(taskContext?.execution_plan.preflight_gates.map((item) => `gate:${item}`) ?? []),
    ...(taskContext?.recommended_context.component_context_packs.flatMap((pack) => pack.validate.map((item) => `pack:${pack.key}:${item}`)) ?? []),
    ...(pack.preflight?.execution_lanes.before_execution.map((item) => `pré-execução:${item}`) ?? []),
    ...(pack.preflight?.gates.filter((gate) => gate.status !== 'ready').map((gate) => `pré-voo:${gate.gate}:${gate.label}`) ?? []),
    ...(pack.artifact_replay?.cold_start_seed.validate_with.map((item) => `cold-start:${item}`) ?? []),
    ...(pack.workspace_twin?.context_autopilot.validate.map((item) => `twin:${item}`) ?? []),
    ...(pack.artifact_replay?.cold_start_seed.human_boundary.map((item) => `humano:${item}`) ?? []),
    ...(pack.topology?.knowledge_map.validation_entrypoints.map((command) => `folder-validation:${command}`) ?? []),
    ...(pack.relations?.connection_contracts.flatMap((contract) => contract.validate.slice(0, 3).map((item) => `conexão:${contract.workspace_hint}:${item}`)) ?? []),
    ...(pack.launch_contract?.startup_contract.validate_before_trust.map((item) => `launch:${item}`) ?? []),
    ...(pack.launch_contract?.human_contract.confirm_before.map((item) => `humano:${item}`) ?? []),
    ...(taskContext?.recommended_context.evidence_gate.verify_before_trust.map((item) => `evidência:${item}`) ?? []),
    ...(taskContext?.recommended_context.evidence_gate.missing_or_stale.map((item) => `evidência stale:${item}`) ?? []),
    ...(taskContext?.recommended_context.evidence_gate.human_boundary.map((item) => `humano:${item}`) ?? []),
    ...(taskContext?.recommended_context.space_brain.flatMap((space) => space.validate_before_use.map((item) => `space-validate:${space.title}:${item}`)) ?? []),
    ...(taskContext?.recommended_context.impact_radius.validation_cascade.map((item) => `impacto:${item}`) ?? []),
    ...(startup?.revalidation_gate.required_before_send.map((item) => `revalidar:${item}`) ?? []),
    ...(pack.memory_freshness?.evidence.revalidate.map((item) => `frescor:${item}`) ?? []),
    ...(taskContext?.execution_plan.recovery_playbook.fallback_validation.map((item) => `fallback:${item}`) ?? []),
    ...(pack.relations?.transfer_matrix.flatMap((item) => item.revalidate.slice(0, 2)) ?? []),
    ...(pack.context_kernel?.validation_plan.commands ?? []),
    ...(pack.workspace_mesh?.next_conversation.validate_with.map((item) => `mesh:${item}`) ?? []),
    ...(pack.repository_constellation?.next_conversation.validate_with.map((item) => `repo:${item}`) ?? []),
    ...(pack.current_truth_pack?.proof.validate_with.map((item) => `truth:${item}`) ?? []),
    ...(pack.live_execution_memory?.startup_packet.validate_before_trust.map((item) => `live:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 10)
  const avoidLoading = unique([
    ...(pack.memory_freshness?.state === 'stale' || pack.memory_freshness?.state === 'cold'
      ? ['memória stale:usar resumo até revalidar']
      : []),
    ...(pack.memory_consolidation?.consolidate.never_promote.map((item) => `não promover:${item}`) ?? []),
    ...(pack.topology?.knowledge_map.sensitive_zones.map((zone) => `folder-sensitive:${zone}`) ?? []),
    ...(pack.topology?.knowledge_map.summarize_only.map((item) => `folder-summary-only:${item}`) ?? []),
    ...(pack.relations?.transfer_matrix.flatMap((item) => item.do_not_transfer) ?? []),
    ...(taskContext?.recommended_context.folder_focus.avoid.map((item) => `fora da pasta foco:${item}`) ?? []),
    ...(taskContext?.recommended_context.component_context_packs.flatMap((pack) => pack.avoid.map((item) => `pack:${pack.key}:${item}`)) ?? []),
    ...(pack.memory_consolidation?.consolidate.summarize_only.map((item) => `só resumo:${item}`) ?? []),
    ...(pack.artifact_replay?.cold_start_seed.warnings.map((item) => `cold-start:${item}`) ?? []),
    ...(taskContext?.execution_plan.commands_to_avoid ?? []),
    ...(taskContext?.execution_plan.recovery_playbook.demote_context.map((item) => `recovery:${item}`) ?? []),
    ...(taskContext?.recommended_context.context_budget.omit.map((item) => `budget:${item}`) ?? []),
    ...(pack.execution_doctrine?.command_policy.avoid.map((item) => `doutrina:${item}`) ?? []),
    ...(pack.provider_strategy?.caution_signals.map((item) => `provider:${item}`) ?? []),
    ...(pack.preflight?.gates.filter((gate) => gate.status === 'blocked').map((gate) => `pré-voo bloqueado:${gate.label}`) ?? []),
    ...(pack.workspace_twin?.context_autopilot.avoid.map((item) => `twin:${item}`) ?? []),
    ...(pack.launch_contract?.startup_contract.avoid_loading.map((item) => `launch:${item}`) ?? []),
    ...(pack.launch_contract?.human_contract.do_not_delegate.map((item) => `não delegar:${item}`) ?? []),
    ...(pack.relations?.connection_contracts.flatMap((contract) => contract.never_transfer) ?? []),
    ...(pack.workspace_mesh?.next_conversation.human_boundary.map((item) => `mesh:${item}`) ?? []),
    ...(pack.repository_constellation?.next_conversation.human_boundary.map((item) => `repo:${item}`) ?? []),
    ...(startup?.context_budget.prefer_summary ? ['conteúdo grande:preferir resumo'] : []),
    ...(pack.retention?.lifecycle.drop_or_summarize ?? []),
    ...(pack.current_truth_pack?.proof.stale_or_unproven.map((item) => `truth:${item}`) ?? []),
    ...(pack.current_truth_pack?.proof.human_boundary.map((item) => `truth-human:${item}`) ?? []),
    ...(pack.live_execution_memory?.startup_packet.avoid.map((item) => `live:${item}`) ?? []),
    ...(pack.live_execution_memory?.startup_packet.human_boundary.map((item) => `live-human:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const confidence = Math.max(
    taskContext?.confidence ?? 0,
    startup?.readiness_score ?? 0,
    pack.context_kernel?.readiness_score ?? 0,
    pack.session_gold?.readiness_score ?? 0,
  )
  if (loadFirst.length === 0 && useAsSummary.length === 0 && validateWith.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_provider_capsule.v1',
    source: 'local_awis_provider_capsule_compiler',
    workspace_key: pack.workspace.key,
    task_kind: taskContext?.task_kind ?? 'startup',
    confidence: normalizePercent(confidence),
    load_first: loadFirst,
    use_as_summary: useAsSummary,
    validate_with: validateWith,
    avoid_loading: avoidLoading,
    provider_strategy: pack.provider_strategy
      ? {
          preferred_provider: pack.provider_strategy.preferred.find((item) => item.policy === 'prefer')?.provider
            ?? pack.provider_strategy.preferred.find((item) => item.policy === 'use_when_matched')?.provider
            ?? null,
          fallback_order: pack.provider_strategy.fallback_order,
          avoid: pack.provider_strategy.preferred
            .filter((item) => item.policy === 'avoid')
            .map((item) => item.model ? `${item.provider}:${item.model}` : item.provider),
          reason: pack.provider_strategy.preferred[0]?.reason ?? 'sem histórico suficiente de provider',
        }
      : null,
    continue_learning: {
      record_outcome: true,
      update_memory: true,
      update_space_pack: Boolean(startup?.learning_loop.update_space_pack || pack.context_kernel?.learning_contract.update_space_pack || pack.preflight?.promotion_contract.update_space_pack || pack.workspace_twin?.learning_loop.next_refresh.length || pack.launch_contract?.startup_contract.update_space_pack),
      preserve_artifact_after_success: Boolean(startup?.learning_loop.preserve_artifact_after_success || pack.context_kernel?.learning_contract.promote_artifact_after_success || pack.preflight?.promotion_contract.preserve_as_artifact || pack.launch_contract?.startup_contract.preserve_artifact_after_success || pack.live_execution_memory?.promotion_rules.preserve_as_artifact.length || pack.live_execution_memory?.automation_loop.after_success.length),
      maintenance_recent: pack.memory?.operational.recent_maintenance ?? [],
      recovery_playbook: taskContext?.execution_plan.recovery_playbook
        ? {
            retry_order: taskContext.execution_plan.recovery_playbook.retry_order,
            fallback_validation: taskContext.execution_plan.recovery_playbook.fallback_validation,
            demote_context: taskContext.execution_plan.recovery_playbook.demote_context,
            safe_resume: taskContext.execution_plan.recovery_playbook.safe_resume,
          }
        : {
            retry_order: [],
            fallback_validation: [],
            demote_context: [],
            safe_resume: [],
          },
      next_session_contract: taskContext?.learning_hooks.next_session_contract
        ? {
            first_load: unique([
              ...(pack.artifact_replay?.cold_start_seed.load_order ?? []),
              ...taskContext.learning_hooks.next_session_contract.first_load,
              ...(pack.launch_contract?.startup_contract.first_load ?? []),
              ...(pack.workspace_mesh?.next_conversation.load_order ?? []),
              ...(pack.repository_constellation?.next_conversation.load_first ?? []),
              ...(pack.current_truth_pack?.next_conversation.load_first ?? []),
              ...(pack.live_execution_memory?.startup_packet.load_first ?? []),
            ]).slice(0, MAX_STARTUP_ITEMS),
            validate_with: unique([
              ...(pack.artifact_replay?.cold_start_seed.validate_with ?? []),
              ...taskContext.learning_hooks.next_session_contract.validate_with,
              ...(pack.launch_contract?.startup_contract.validate_before_trust ?? []),
              ...(pack.workspace_mesh?.next_conversation.validate_with ?? []),
              ...(pack.repository_constellation?.next_conversation.validate_with ?? []),
              ...(pack.current_truth_pack?.proof.validate_with ?? []),
              ...(pack.live_execution_memory?.startup_packet.validate_before_trust ?? []),
            ]).slice(0, MAX_STARTUP_ITEMS),
            promote_when: unique([
              ...taskContext.learning_hooks.next_session_contract.promote_when,
              ...(pack.current_truth_pack?.next_conversation.promote_when ?? []),
              ...(pack.repository_constellation?.learning_loop.promote_when ?? []),
              ...(pack.artifact_replay?.cold_start_seed.automation_hooks ?? []),
              ...(pack.workspace_mesh?.next_conversation.reuse_rules.map((item) => `mesh:${item}`) ?? []),
              ...(pack.launch_contract?.startup_contract.promote_after_success ?? []),
              ...(pack.live_execution_memory?.promotion_rules.promote_to_gold ?? []),
            ]).slice(0, MAX_STARTUP_ITEMS),
            demote_when: unique([
              ...taskContext.learning_hooks.next_session_contract.demote_when,
              ...(pack.current_truth_pack?.next_conversation.demote_when ?? []),
              ...(pack.repository_constellation?.learning_loop.demote_when ?? []),
              ...(pack.artifact_replay?.cold_start_seed.warnings ?? []),
              ...(pack.launch_contract?.startup_contract.demote_after_failure ?? []),
              ...(pack.live_execution_memory?.promotion_rules.demote ?? []),
            ]).slice(0, MAX_STARTUP_ITEMS),
          }
        : {
            first_load: unique([
              ...(pack.artifact_replay?.cold_start_seed.load_order ?? []),
              ...(pack.launch_contract?.startup_contract.first_load ?? []),
              ...(pack.live_execution_memory?.startup_packet.load_first ?? []),
            ]).slice(0, MAX_STARTUP_ITEMS),
            validate_with: unique([
              ...(pack.artifact_replay?.cold_start_seed.validate_with ?? []),
              ...(pack.launch_contract?.startup_contract.validate_before_trust ?? []),
              ...(pack.live_execution_memory?.startup_packet.validate_before_trust ?? []),
            ]).slice(0, MAX_STARTUP_ITEMS),
            promote_when: unique([
              ...(pack.artifact_replay?.cold_start_seed.automation_hooks ?? []),
              ...(pack.launch_contract?.startup_contract.promote_after_success ?? []),
              ...(pack.live_execution_memory?.promotion_rules.promote_to_gold ?? []),
            ]).slice(0, MAX_STARTUP_ITEMS),
            demote_when: unique([
              ...(pack.artifact_replay?.cold_start_seed.warnings ?? []),
              ...(pack.launch_contract?.startup_contract.demote_after_failure ?? []),
              ...(pack.live_execution_memory?.promotion_rules.demote ?? []),
            ]).slice(0, MAX_STARTUP_ITEMS),
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
  }
}

export function buildAwisWorkspaceSpaceProjection(
  packs: AwisWorkspaceSpacePackInput[],
): AwisWorkspaceSpaceProjection | null {
  const validPacks = packs
    .filter((pack) => pack.thread_count >= 2)
    .sort((a, b) => spacePackStrength(b) - spacePackStrength(a) || a.title.localeCompare(b.title))
    .slice(0, MAX_SPACE_PROJECTION_SPACES)
  if (validPacks.length === 0) return null

  return {
    schema_version: 'atlas.awis.workspace_space_projection.v1',
    source: 'local_project_spaces',
    space_count: validPacks.length,
    total_session_count: validPacks.reduce((sum, pack) => sum + pack.thread_count, 0),
    total_message_count: validPacks.reduce((sum, pack) => sum + pack.message_count, 0),
    spaces: validPacks.map((pack) => ({
      name: pack.title,
      session_count: pack.thread_count,
    })),
    continuity: {
      never_start_cold: true,
      load_first: unique(validPacks.map((pack) => `Space:${pack.title}`)).slice(0, MAX_STARTUP_ITEMS),
      carry_forward: unique(validPacks.flatMap((pack) => [
        `${pack.title}: ${pack.thread_count} sessões`,
        ...pack.recommended_use,
      ])).slice(0, MAX_STARTUP_ITEMS),
      refresh_when: unique([
        'Space aberto para comparar',
        'sessão adicionada ou removida do Space',
        'conversa do Space recebe nova decisão, pendência ou risco',
      ]).slice(0, MAX_STARTUP_ITEMS),
      provider_safe: true,
    },
    strongest_spaces: validPacks.map((pack) => ({
      title: pack.title,
      source: pack.source === 'suggested_space' ? 'suggested_space' : 'local_space',
      session_count: pack.thread_count,
      message_count: pack.message_count,
      mode_count: pack.mode_count,
      decision_count: pack.decision_count,
      pending_count: pack.pending_count,
      risk_count: pack.risk_count,
      artifact_count: pack.artifact_count,
      strength_score: spacePackStrength(pack),
      freshness: spacePackFreshness(pack),
      scope_label: pack.scope_label ?? `${pack.thread_count} sessões · ${pack.mode_count} ${pack.mode_count === 1 ? 'modo' : 'modos'}`,
      reusable_by: pack.reusable_by.slice(0, 4),
      recommended_use: pack.recommended_use.slice(0, 4),
      brain_contract: normalizeSpaceBrainContract(pack),
      continuity_contract: {
        load_when: unique([
          `trabalho voltar para ${pack.title}`,
          pack.pending_count > 0 ? 'há pendências neste Space' : null,
          pack.risk_count > 0 ? 'há riscos neste Space' : null,
          pack.artifact_count > 0 ? 'há artefatos reutilizáveis neste Space' : null,
        ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
        carry_forward: unique([
          `${pack.thread_count} sessões relacionadas`,
          `${pack.message_count} mensagens resumidas`,
          ...pack.recommended_use,
        ]).slice(0, MAX_STARTUP_ITEMS),
        refresh_when: unique([
          'nova mensagem em uma sessão do Space',
          'renomear, desfazer ou editar Space',
          pack.generated_at ? `pack gerado em ${pack.generated_at}` : null,
        ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      },
      session_summaries: pack.sessions.slice(0, MAX_SPACE_PROJECTION_SESSIONS).map((session) => ({
        title: session.title,
        mode: session.mode,
        message_count: session.message_count,
        last_active_at: session.last_active_at,
        provider: session.provider,
      })),
    })),
    safety: {
      raw_conversation_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

export function buildAwisWorkspaceEvolutionProjection(
  memories: Record<string, AwisWorkspaceMemorySnapshot>,
  currentWorkspaceKey: string,
): AwisWorkspaceEvolutionProjection | null {
  const entries = Object.entries(memories)
    .filter(([, memory]) => memory.schemaVersion === 'atlas.awis.workspace_memory.v1')
  if (entries.length < 2) return null

  const signalStats = collectEvolutionStats(entries, (memory) => memory.stableSignals, 'signal')
  const languageStats = collectEvolutionStats(entries, (memory) => memory.stableLanguages, 'language')
  const commandStats = collectEvolutionStats(entries, (memory) => memory.stableCommands, 'command')
  const failureStats = collectFailureSignatureStats(entries)
  const patterns = [
    ...signalStats,
    ...languageStats,
    ...commandStats,
  ]
    .filter((pattern) => pattern.seen_in_workspaces >= 2 || pattern.total_seen >= 3)
    .sort((a, b) => b.seen_in_workspaces - a.seen_in_workspaces || b.total_seen - a.total_seen || a.label.localeCompare(b.label))
    .slice(0, MAX_EVOLUTION_PATTERNS)
  const failureSignatures = failureStats
    .sort((a, b) => b.seen_in_workspaces - a.seen_in_workspaces || b.total_seen - a.total_seen || a.label.localeCompare(b.label))
    .slice(0, MAX_FAILURE_SIGNATURES)

  if (patterns.length === 0 && failureSignatures.length === 0) return null

  return {
    schema_version: 'atlas.awis.workspace_evolution_projection.v1',
    source: 'local_abstract_workspace_memories',
    workspace_count: entries.length,
    current_workspace_seen: entries.some(([key]) => key === currentWorkspaceKey),
    patterns,
    failure_signatures: failureSignatures,
    transfer_policy: {
      privacy_level: 'abstracted',
      raw_workspace_names_returned: false,
      raw_paths_returned: false,
      raw_source_returned: false,
      apply_only_when_stack_matches: true,
    },
  }
}

export function buildAwisWorkspaceRelationProjection(
  memories: Record<string, AwisWorkspaceMemorySnapshot>,
  currentWorkspaceKey: string,
): AwisWorkspaceRelationProjection | null {
  const entries = Object.entries(memories)
    .filter(([, memory]) => memory.schemaVersion === 'atlas.awis.workspace_memory.v1')
  const currentEntry = entries.find(([key, memory]) => (
    key === currentWorkspaceKey ||
    memory.workspaceKey === currentWorkspaceKey ||
    legacyWorkspaceKeyMatches(currentWorkspaceKey, key) ||
    legacyWorkspaceKeyMatches(currentWorkspaceKey, memory.workspaceKey) ||
    legacyWorkspaceKeyMatches(currentWorkspaceKey, memory.rootPath)
  ))
  const current = currentEntry?.[1] ?? null
  if (!current || entries.length < 2) return null

  const currentSignals = labelsForRelation(current.stableSignals)
  const currentLanguages = labelsForRelation(current.stableLanguages)
  const currentCommands = labelsForRelation(current.stableCommands)
  const currentContextGold = contextGoldLabelsForRelation(current)
  const currentValidationPlans = validationPlanLabelsForRelation(current)
  const currentRecoveryPatterns = recoveryPatternLabelsForRelation(current)
  const currentSpaces = spaceLabelsForRelation(current)
  const currentSpaceBrain = spaceBrainLabelsForRelation(current)
  const currentLiveMemory = liveMemoryLabelsForRelation(current)
  const currentPriorityLoad = priorityLoadLabelsForRelation(current)
  const related = entries
    .filter(([key, memory]) => key !== currentEntry?.[0] && memory.workspaceKey !== current.workspaceKey)
    .map(([, memory]) => {
      const sharedSignals = overlap(currentSignals, labelsForRelation(memory.stableSignals)).slice(0, MAX_STARTUP_ITEMS)
      const sharedLanguages = overlap(currentLanguages, labelsForRelation(memory.stableLanguages)).slice(0, MAX_STARTUP_ITEMS)
      const sharedCommands = overlap(currentCommands, labelsForRelation(memory.stableCommands)).slice(0, MAX_STARTUP_ITEMS)
      const sharedContextGold = overlap(currentContextGold, contextGoldLabelsForRelation(memory)).slice(0, MAX_STARTUP_ITEMS)
      const sharedValidationPlans = overlap(currentValidationPlans, validationPlanLabelsForRelation(memory)).slice(0, MAX_STARTUP_ITEMS)
      const sharedRecoveryPatterns = overlap(currentRecoveryPatterns, recoveryPatternLabelsForRelation(memory)).slice(0, MAX_STARTUP_ITEMS)
      const sharedSpaces = overlap(currentSpaces, spaceLabelsForRelation(memory)).slice(0, MAX_STARTUP_ITEMS)
      const sharedSpaceBrain = overlap(currentSpaceBrain, spaceBrainLabelsForRelation(memory)).slice(0, MAX_STARTUP_ITEMS)
      const sharedLiveMemory = overlap(currentLiveMemory, liveMemoryLabelsForRelation(memory)).slice(0, MAX_STARTUP_ITEMS)
      const sharedPriorityLoad = overlap(currentPriorityLoad, priorityLoadLabelsForRelation(memory)).slice(0, MAX_STARTUP_ITEMS)
      const overlapScore = Math.min(
        100,
        sharedSignals.length * 12 +
          sharedLanguages.length * 18 +
          sharedCommands.length * 20 +
          sharedContextGold.length * 16 +
          sharedValidationPlans.length * 14 +
          sharedRecoveryPatterns.length * 12 +
          sharedSpaces.length * 15 +
          sharedSpaceBrain.length * 18 +
          sharedLiveMemory.length * 10 +
          sharedPriorityLoad.length * 12,
      )
      return {
        workspace_hint: providerSafeWorkspaceHint(memory),
        overlap_score: overlapScore,
        shared_signals: sharedSignals,
        shared_languages: sharedLanguages,
        shared_commands: sharedCommands,
        shared_context_gold: sharedContextGold,
        shared_validation_plans: sharedValidationPlans,
        shared_recovery_patterns: sharedRecoveryPatterns,
        shared_spaces: sharedSpaces,
        shared_space_brain: sharedSpaceBrain,
        shared_live_memory: sharedLiveMemory,
        shared_priority_load: sharedPriorityLoad,
        recommended_transfer: relationTransferHints(
          sharedSignals,
          sharedLanguages,
          sharedCommands,
          sharedContextGold,
          sharedValidationPlans,
          sharedRecoveryPatterns,
          sharedSpaces,
          sharedSpaceBrain,
          sharedLiveMemory,
          sharedPriorityLoad,
        ),
      }
    })
    .filter((item) => item.overlap_score > 0)
    .sort((a, b) => b.overlap_score - a.overlap_score || a.workspace_hint.localeCompare(b.workspace_hint))
    .slice(0, MAX_RELATED_WORKSPACES)

  if (related.length === 0) return null
  const transferMatrix = related.map((workspace) => ({
    workspace_hint: workspace.workspace_hint,
    reuse: unique([
      ...workspace.shared_languages.map((item) => `linguagem:${item}`),
      ...workspace.shared_signals.map((item) => `stack:${item}`),
      ...workspace.shared_commands.map((item) => `comando:${item}`),
      ...workspace.shared_context_gold.map((item) => `ouro:${item}`),
      ...workspace.shared_spaces.map((item) => `space:${item}`),
      ...workspace.shared_space_brain.map((item) => `space-brain:${item}`),
      ...workspace.shared_live_memory.map((item) => `memória viva:${item}`),
      ...workspace.shared_priority_load.map((item) => `prioridade:${item}`),
      ...workspace.shared_validation_plans.map((item) => `validação:${item}`),
      ...workspace.shared_recovery_patterns.map((item) => `recovery:${item}`),
      ...workspace.recommended_transfer,
    ]).slice(0, MAX_STARTUP_ITEMS * 2),
    revalidate: unique([
      ...workspace.shared_commands.map((item) => `validar comando antes de aplicar:${item}`),
      ...workspace.shared_validation_plans.map((item) => `confirmar validação transferida:${item}`),
      ...workspace.shared_recovery_patterns.map((item) => `aplicar recovery só com evidência local:${item}`),
      ...workspace.shared_space_brain.map((item) => `revalidar Space Brain no workspace atual:${item}`),
      workspace.overlap_score < 60 ? `revalidar compatibilidade:${workspace.workspace_hint}` : null,
    ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
    do_not_transfer: [
      'conteúdo bruto de conversas',
      'paths absolutos',
      'ids internos',
      'decisões sensíveis sem confirmação',
      'segredos ou decisões sensíveis',
    ],
    confidence: workspace.overlap_score,
  }))
  const connectionContracts = related.map((workspace) => {
    const relationship: AwisWorkspaceRelationProjection['connection_contracts'][number]['relationship'] =
      workspace.shared_context_gold.length > 0
        ? 'shared_context'
        : workspace.shared_recovery_patterns.length > 0
          ? 'shared_recovery'
          : workspace.shared_commands.length > 0
            ? 'shared_command'
            : 'shared_stack'
    return {
      workspace_hint: workspace.workspace_hint,
      relationship,
      load_when: unique([
        workspace.shared_context_gold.length > 0 ? 'tarefa toca contexto já validado em outro workspace' : null,
        workspace.shared_commands.length > 0 ? 'tarefa depende de comando semelhante' : null,
        workspace.shared_recovery_patterns.length > 0 ? 'erro recente parece recuperação já vista' : null,
        workspace.shared_spaces.length > 0 ? 'Space operacional reaparece em outro workspace' : null,
        workspace.shared_space_brain.length > 0 ? 'Space Brain validado reaparece em outro workspace' : null,
        workspace.shared_live_memory.length > 0 ? 'memória viva compatível já foi usada' : null,
        workspace.shared_priority_load.length > 0 ? 'prioridade de carregamento já foi validada' : null,
        workspace.shared_languages.length > 0 || workspace.shared_signals.length > 0 ? 'stack compatível aparece no mapa local' : null,
      ].filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      reuse: unique([
        ...workspace.shared_context_gold.map((item) => `contexto validado:${item}`),
        ...workspace.shared_validation_plans.map((item) => `plano validado:${item}`),
        ...workspace.shared_spaces.map((item) => `Space validado:${item}`),
        ...workspace.shared_space_brain.map((item) => `Space Brain transferível:${item}`),
        ...workspace.shared_live_memory.map((item) => `memória viva validada:${item}`),
        ...workspace.shared_priority_load.map((item) => `prioridade validada:${item}`),
        ...workspace.recommended_transfer,
      ]).slice(0, MAX_STARTUP_ITEMS),
      validate: unique([
        ...workspace.shared_commands.map((item) => `rodar/confirmar equivalente local:${item}`),
        ...workspace.shared_validation_plans.map((item) => `provar novamente:${item}`),
        ...workspace.shared_recovery_patterns.map((item) => `não aplicar recovery sem evidência local:${item}`),
      ]).slice(0, MAX_STARTUP_ITEMS),
      never_transfer: [
        'conteúdo bruto de conversas',
        'paths absolutos',
        'ids internos',
        'segredos ou decisões sensíveis',
      ],
      confidence: workspace.overlap_score,
    }
  }).slice(0, MAX_RELATED_WORKSPACES)

  return {
    schema_version: 'atlas.awis.workspace_relation_projection.v1',
    source: 'local_provider_safe_workspace_memories',
    workspace_count: entries.length,
    current_workspace_seen: true,
    related_workspaces: related,
    transfer_matrix: transferMatrix,
    connection_contracts: connectionContracts,
    transfer_policy: {
      privacy_level: 'provider_safe_hints',
      raw_workspace_names_returned: false,
      raw_paths_returned: false,
      raw_source_returned: false,
      raw_conversation_returned: false,
      apply_only_when_stack_matches: true,
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function buildAwisWorkspaceMeshProjection(input: {
  workspaceKey: string
  relations?: AwisWorkspaceRelationProjection | null
  topology?: AwisWorkspaceTopologyProjection | null
  spaces?: AwisWorkspaceSpaceProjection | null
  artifactReplay?: AwisWorkspaceArtifactReplayProjection | null
  workspaceTwin?: AwisWorkspaceTwinProjection | null
  launchContract?: AwisWorkspaceLaunchContractProjection | null
}): AwisWorkspaceMeshProjection | null {
  const routes: AwisWorkspaceMeshProjection['routes'] = []
  const pushRoute = (route: Omit<AwisWorkspaceMeshProjection['routes'][number], 'route_id'>) => {
    const workspaceHint = sanitizeProviderSafeText(route.workspace_hint).slice(0, 80)
    if (!workspaceHint) return
    const normalizedRoute = {
      workspace_hint: workspaceHint,
      relationship: route.relationship,
      load_when: unique(route.load_when.map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      reuse: unique(route.reuse.map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      validate_with: unique(route.validate_with.map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      never_transfer: unique(route.never_transfer.map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      linked_components: unique(route.linked_components.map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      linked_spaces: unique(route.linked_spaces.map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
      confidence: normalizePercent(route.confidence),
    }
    routes.push({
      route_id: `mesh-${stableStringHash(JSON.stringify(normalizedRoute))}`,
      ...normalizedRoute,
    })
  }

  for (const contract of input.relations?.connection_contracts ?? []) {
    pushRoute({
      workspace_hint: contract.workspace_hint,
      relationship: contract.relationship,
      load_when: contract.load_when,
      reuse: contract.reuse,
      validate_with: contract.validate,
      never_transfer: contract.never_transfer,
      linked_components: (input.topology?.components ?? [])
        .filter((component) => contract.reuse.some((item) => item.includes(component.key)))
        .map((component) => component.key),
      linked_spaces: input.spaces?.strongest_spaces.map((space) => space.title) ?? [],
      confidence: contract.confidence,
    })
  }

  for (const component of input.topology?.components.slice(0, MAX_STARTUP_ITEMS) ?? []) {
    pushRoute({
      workspace_hint: component.key,
      relationship: 'local_component',
      load_when: [
        component.role,
        ...component.stack.map((stack) => `stack:${stack}`),
      ],
      reuse: [
        ...component.docs.map((doc) => `doc:${doc}`),
        ...component.manifests.map((manifest) => `manifest:${manifest}`),
      ],
      validate_with: component.commands.map((command) => command.command),
      never_transfer: input.topology?.knowledge_map.sensitive_zones ?? [],
      linked_components: [
        component.key,
        ...(input.topology?.connections
          .filter((connection) => connection.from === component.key || connection.to === component.key)
          .flatMap((connection) => [connection.from, connection.to]) ?? []),
      ],
      linked_spaces: input.spaces?.strongest_spaces
        .filter((space) => space.recommended_use.some((context) => context.toLowerCase().includes(component.key.toLowerCase())))
        .map((space) => space.title) ?? [],
      confidence: input.workspaceTwin?.readiness_score ?? 60,
    })
  }

  for (const space of input.spaces?.strongest_spaces ?? []) {
    pushRoute({
      workspace_hint: `space:${space.title}`,
      relationship: 'space_context',
      load_when: [`Space com ${space.session_count} sessões`, ...space.recommended_use],
      reuse: space.recommended_use,
      validate_with: input.launchContract?.startup_contract.validate_before_trust ?? [],
      never_transfer: ['conteúdo bruto de conversas', 'ids internos', 'segredos ou decisões sensíveis'],
      linked_components: input.topology?.components
        .filter((component) => space.recommended_use.some((context) => context.toLowerCase().includes(component.key.toLowerCase())))
        .map((component) => component.key) ?? [],
      linked_spaces: [space.title],
      confidence: clampConfidence(56 + space.session_count * 5 + space.decision_count * 4 + space.artifact_count * 4),
    })
  }

  const artifactSeed = input.artifactReplay?.cold_start_seed
  if (artifactSeed) {
    for (const hint of artifactSeed.repository_hints.slice(0, MAX_STARTUP_ITEMS)) {
      pushRoute({
        workspace_hint: hint,
        relationship: 'artifact_replay',
        load_when: artifactSeed.load_order,
        reuse: artifactSeed.context_signals,
        validate_with: artifactSeed.validate_with,
        never_transfer: artifactSeed.warnings,
        linked_components: input.topology?.components.filter((component) => hint.includes(component.key)).map((component) => component.key) ?? [],
        linked_spaces: artifactSeed.reuse_spaces,
        confidence: artifactSeed.readiness_score,
      })
    }
  }

  const dedupedRoutes = Array.from(new Map(
    routes
      .filter((route) => route.load_when.length > 0 || route.reuse.length > 0 || route.validate_with.length > 0)
      .sort((a, b) => b.confidence - a.confidence || a.workspace_hint.localeCompare(b.workspace_hint))
      .map((route) => [`${route.workspace_hint}:${route.relationship}`, route] as const),
  ).values()).slice(0, MAX_STARTUP_ITEMS * 2)
  if (dedupedRoutes.length === 0) return null

  const loadOrder = unique([
    ...(input.launchContract?.next_conversation.load_order.map((item) => `launch:${item}`) ?? []),
    ...dedupedRoutes.flatMap((route) => route.load_when.map((item) => `mesh:${route.workspace_hint}:${item}`)),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const reuseRules = unique(dedupedRoutes.flatMap((route) => (
    route.reuse.map((item) => `mesh:${route.workspace_hint}:${item}`)
  ))).slice(0, MAX_STARTUP_ITEMS)
  const validateWith = unique([
    ...(input.launchContract?.startup_contract.validate_before_trust ?? []),
    ...dedupedRoutes.flatMap((route) => route.validate_with.map((item) => `mesh:${route.workspace_hint}:${item}`)),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const humanBoundary = unique([
    ...(input.launchContract?.human_contract.confirm_before ?? []),
    ...dedupedRoutes.flatMap((route) => route.never_transfer.map((item) => `mesh:${route.workspace_hint}:${item}`)),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const readinessScore = normalizePercent(
    28
      + Math.min(26, dedupedRoutes.length * 4)
      + Math.min(18, validateWith.length * 2)
      + Math.min(18, reuseRules.length * 2)
      + (input.relations ? 8 : 0)
      + (artifactSeed ? 6 : 0),
  )
  const meshPayload = {
    workspace: sanitizeProviderSafeText(input.workspaceKey),
    routes: dedupedRoutes.map((route) => ({
      workspace_hint: route.workspace_hint,
      relationship: route.relationship,
      confidence: route.confidence,
    })),
    loadOrder,
    reuseRules,
    validateWith,
  }

  return {
    schema_version: 'atlas.awis.workspace_mesh_projection.v1',
    source: 'local_awis_operational_mesh',
    readiness_score: readinessScore,
    mesh_hash: `mesh-${stableStringHash(JSON.stringify(meshPayload))}`,
    routes: dedupedRoutes,
    next_conversation: {
      load_order: loadOrder,
      reuse_rules: reuseRules,
      validate_with: validateWith,
      human_boundary: humanBoundary,
    },
    transfer_policy: {
      privacy_level: 'provider_safe_operational_mesh',
      raw_workspace_names_returned: false,
      raw_paths_returned: false,
      raw_source_returned: false,
      raw_conversation_returned: false,
      apply_only_when_stack_matches: true,
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function buildAwisWorkspaceCurrentTruthPackProjection(input: {
  workspaceKey: string
  topology: AwisWorkspaceTopologyProjection | null
  learning?: AwisWorkspaceLearningProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactLake: AwisWorkspaceArtifactLakeSummary | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  continuity: AwisWorkspaceContinuityProjection | null
  contextKernel: AwisWorkspaceContextKernelProjection | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
  retention: AwisWorkspaceRetentionProjection | null
  memoryConsolidation: AwisWorkspaceMemoryConsolidationProjection | null
  startupOrchestration: AwisWorkspaceStartupOrchestrationProjection | null
  preflight: AwisWorkspacePreflightProjection | null
  workspaceTwin: AwisWorkspaceTwinProjection | null
  launchContract: AwisWorkspaceLaunchContractProjection | null
  workspaceMesh: AwisWorkspaceMeshProjection | null
  handoffPack: AwisWorkspaceHandoffProjection | null
}): AwisWorkspaceCurrentTruthPackProjection | null {
  const mustKeep = unique([
    ...(input.contextKernel?.priority_load.map((item) => `${item.kind}:${item.label}:${item.confidence}`) ?? []),
    ...(input.sessionGold?.strongest_outcomes.map((outcome) => `outcome:${outcome.label}:${outcome.confidence}`) ?? []),
    ...(input.memoryConsolidation?.consolidate.promote_to_gold.map((item) => `promover:${item}`) ?? []),
    ...(input.artifactReplay?.cold_start_seed.context_signals.map((item) => `artifact:${item}`) ?? []),
    ...(input.workspaceMesh?.routes.slice(0, 6).map((route) => `mesh:${route.workspace_hint}:${route.relationship}:${route.confidence}`) ?? []),
    ...(input.handoffPack?.context_units.map((unit) => `handoff:${unit.artifact_type}:${unit.status ?? 'unknown'}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const activeComponents = unique([
    ...(input.topology?.components.slice(0, MAX_STARTUP_ITEMS).map((component) => `${component.key}:${component.role}`) ?? []),
    ...(input.sessionGold?.strongest_outcomes
      .filter((outcome) => outcome.label.startsWith('component:'))
      .map((outcome) => outcome.label.replace(/^component:/, '')) ?? []),
    ...(input.workspaceTwin?.context_autopilot.load_first ?? []),
    ...(input.continuity?.hot_context.components ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const activeSpaces = unique([
    ...(input.spaces?.strongest_spaces.map((space) => `${space.title}:${space.session_count} sessões`) ?? []),
    ...(input.continuity?.hot_context.spaces ?? []),
    ...(input.artifactReplay?.cold_start_seed.reuse_spaces ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const activeArtifacts = unique([
    input.artifactLake?.latest_artifact_hash ?? null,
    input.artifactReplay?.latest_artifact_hash ?? null,
    input.artifactReplay?.cold_start_seed.seed_hash ?? null,
    ...(input.continuity?.hot_context.artifacts ?? []),
    ...(input.handoffPack?.context_units.map((unit) => unit.artifact_hash).filter(isString) ?? []),
  ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const provenCommands = unique([
    ...(input.sessionGold?.proven_commands.map((command) => `${command.command}:${command.success_count}`) ?? []),
    ...(input.learning?.trusted_commands ?? []),
    ...(input.learning?.task_memory.trusted_task_commands ?? []),
    ...(input.workspaceTwin?.context_autopilot.validate ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const meshRoutes = unique([
    ...(input.workspaceMesh?.routes.map((route) => `${route.workspace_hint}:${route.relationship}:${route.confidence}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const evidenceRefs = unique([
    ...(input.preflight?.gates.flatMap((gate) => gate.evidence.map((item) => `preflight:${gate.gate}:${item}`)) ?? []),
    ...(input.contextKernel?.priority_load.map((item) => `kernel:${item.kind}:${item.label}`) ?? []),
    ...(input.workspaceTwin ? [`twin:${input.workspaceTwin.hashes.genome_hash}`] : []),
    ...(input.launchContract ? [`launch:${input.launchContract.seed_hash}`] : []),
    ...(input.workspaceMesh ? [`mesh:${input.workspaceMesh.mesh_hash}`] : []),
    ...(input.artifactReplay?.latest_artifact_hash ? [`artifact:${input.artifactReplay.latest_artifact_hash}`] : []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const validateWith = unique([
    ...(input.preflight?.execution_lanes.before_execution ?? []),
    ...(input.launchContract?.startup_contract.validate_before_trust ?? []),
    ...(input.workspaceTwin?.context_autopilot.validate ?? []),
    ...(input.workspaceMesh?.next_conversation.validate_with ?? []),
    ...(input.artifactReplay?.cold_start_seed.validate_with ?? []),
    ...(input.sessionGold?.next_session_hooks.validate_with ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const staleOrUnproven = unique([
    ...(input.memoryFreshness?.evidence.revalidate.map((item) => `revalidar:${item}`) ?? []),
    ...(input.memoryFreshness?.evidence.missing.map((item) => `faltando:${item}`) ?? []),
    ...(input.memoryConsolidation?.consolidate.never_promote.map((item) => `não promover:${item}`) ?? []),
    ...(input.retention?.lifecycle.revalidate.map((item) => `retenção:${item}`) ?? []),
    ...(input.artifactReplay?.cold_start_seed.warnings.map((item) => `artifact:${item}`) ?? []),
    ...(input.workspaceTwin?.stale ? ['twin stale:revalidar antes de executar'] : []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const humanBoundary = unique([
    ...(input.launchContract?.human_contract.confirm_before ?? []),
    ...(input.preflight?.execution_lanes.before_execution ?? []),
    ...(input.workspaceMesh?.next_conversation.human_boundary ?? []),
    ...(input.artifactReplay?.cold_start_seed.human_boundary ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const loadFirst = unique([
    ...(input.topology?.components.slice(0, MAX_STARTUP_ITEMS).map((component) => `mapa de componentes:${component.key}:${component.role}`) ?? []),
    ...(input.launchContract?.next_conversation.load_order ?? []),
    ...(input.workspaceMesh?.next_conversation.load_order ?? []),
    ...(input.artifactReplay?.cold_start_seed.load_order ?? []),
    ...(input.contextKernel?.priority_load.map((item) => `${item.kind}:${item.label}`) ?? []),
    ...(input.startupOrchestration?.startup_sequence.map((item) => `${item.step}:${item.label}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const summarizeOnly = unique([
    ...(input.contextKernel?.compression_plan.summarize ?? []),
    ...(input.launchContract?.startup_contract.summarize_only ?? []),
    ...(input.workspaceTwin?.context_autopilot.summarize ?? []),
    ...(input.retention?.lifecycle.drop_or_summarize ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const promoteWhen = unique([
    ...(input.preflight?.promotion_contract.promote_when ?? []),
    ...(input.launchContract?.startup_contract.promote_after_success ?? []),
    ...(input.memoryConsolidation?.consolidate.promote_to_gold ?? []),
    ...(input.artifactReplay?.cold_start_seed.automation_hooks ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const demoteWhen = unique([
    ...(input.preflight?.promotion_contract.demote_when ?? []),
    ...(input.launchContract?.startup_contract.demote_after_failure ?? []),
    ...staleOrUnproven,
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  const hasTruth = mustKeep.length > 0 || activeComponents.length > 0 || activeSpaces.length > 0 || activeArtifacts.length > 0 || provenCommands.length > 0
  if (!hasTruth && evidenceRefs.length === 0) return null
  const readinessScore = normalizePercent(
    20
      + Math.min(20, mustKeep.length * 3)
      + Math.min(18, evidenceRefs.length * 2)
      + Math.min(18, validateWith.length * 2)
      + Math.min(14, provenCommands.length * 2)
      + Math.min(10, activeArtifacts.length * 2)
      - Math.min(18, staleOrUnproven.length * 2),
  )
  const truthPayload = {
    workspace: sanitizeProviderSafeText(input.workspaceKey),
    mustKeep,
    activeComponents,
    activeSpaces,
    activeArtifacts,
    provenCommands,
    meshRoutes,
    evidenceRefs,
    validateWith,
    staleOrUnproven,
  }

  return {
    schema_version: 'atlas.awis.current_truth_pack_projection.v1',
    source: 'local_awis_truth_compiler',
    workspace_key: sanitizeProviderSafeText(input.workspaceKey),
    readiness_score: readinessScore,
    truth_hash: `truth-${stableStringHash(JSON.stringify(truthPayload))}`,
    current_truth: {
      must_keep: mustKeep,
      active_components: activeComponents,
      active_spaces: activeSpaces,
      active_artifacts: activeArtifacts,
      proven_commands: provenCommands,
      mesh_routes: meshRoutes,
    },
    proof: {
      evidence_refs: evidenceRefs,
      validate_with: validateWith,
      stale_or_unproven: staleOrUnproven,
      human_boundary: humanBoundary,
    },
    next_conversation: {
      load_first: loadFirst,
      summarize_only: summarizeOnly,
      promote_when: promoteWhen,
      demote_when: demoteWhen,
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
  }
}

function buildAwisWorkspaceRepositoryConstellationProjection(input: {
  topology: AwisWorkspaceTopologyProjection | null
  componentMemory: AwisWorkspaceComponentMemoryProjection | null
  semanticIndex: AwisWorkspaceSemanticIndexProjection | null
  impactMap: AwisWorkspaceImpactMapProjection | null
  relations: AwisWorkspaceRelationProjection | null
  workspaceMesh: AwisWorkspaceMeshProjection | null
  currentTruthPack: AwisWorkspaceCurrentTruthPackProjection | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  launchContract: AwisWorkspaceLaunchContractProjection | null
}): AwisWorkspaceRepositoryConstellationProjection | null {
  const topologyComponents = input.topology?.components ?? []
  const memoryByComponent = new Map(
    (input.componentMemory?.strongest_components ?? []).map((component) => [component.key, component]),
  )
  const connectionByComponent = new Map<string, string[]>()
  for (const connection of input.topology?.connections ?? []) {
    connectionByComponent.set(connection.from, unique([...(connectionByComponent.get(connection.from) ?? []), connection.to]))
    connectionByComponent.set(connection.to, unique([...(connectionByComponent.get(connection.to) ?? []), connection.from]))
  }
  for (const route of input.workspaceMesh?.routes ?? []) {
    for (const component of route.linked_components) {
      connectionByComponent.set(component, unique([
        ...(connectionByComponent.get(component) ?? []),
        route.workspace_hint,
      ]))
    }
  }

  const repositories = topologyComponents
    .map((component) => {
      const memory = memoryByComponent.get(component.key) ?? null
      const semanticMatches = (input.semanticIndex?.query_aliases ?? [])
        .filter((alias) => alias.component_keys.includes(component.key))
      const impact = input.impactMap?.component_impacts.find((item) => item.component_key === component.key) ?? null
      const commands = unique([
        ...(memory?.commands ?? []),
        ...component.commands.map((command) => command.command),
        ...(semanticMatches.flatMap((match) => match.validate)),
        ...(impact?.validation_cascade ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
      const loadWhen = unique([
        ...(memory?.load_first.map((item) => `memória:${item}`) ?? []),
        ...component.manifests.map((path) => `manifest:${path}`),
        ...component.docs.map((path) => `doc:${path}`),
        ...semanticMatches.flatMap((match) => match.load.map((item) => `semântico:${match.alias}:${item}`)),
        ...(input.currentTruthPack?.current_truth.active_components
          .filter((item) => item.includes(component.key))
          .map((item) => `verdade atual:${item}`) ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
      const summarizeWhen = unique([
        ...(memory?.cautions.map((item) => `cautela:${item}`) ?? []),
        ...(impact?.risk === 'high' ? [`impacto alto:${impact.reason}`] : []),
        ...(input.artifactReplay?.cold_start_seed.warnings.filter((warning) => warning.includes(component.key)) ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
      const connectedTo = unique(connectionByComponent.get(component.key) ?? [])
        .map(sanitizeProviderSafeText)
        .filter(isString)
        .slice(0, MAX_STARTUP_ITEMS)
      const confidence = clampConfidence(
        Math.max(component.confidence, memory?.confidence ?? 0)
          + Math.min(10, connectedTo.length * 2)
          + Math.min(8, commands.length)
          - (impact?.risk === 'high' ? 10 : 0),
      )
      return {
        key: component.key,
        role: component.role,
        stack: component.stack.slice(0, 6),
        maturity: memory?.maturity ?? 'new',
        manifests: component.manifests.slice(0, 6),
        docs: component.docs.slice(0, 6),
        commands,
        connected_to: connectedTo,
        load_when: loadWhen,
        summarize_when: summarizeWhen,
        validate_with: commands.filter((command) => /test|tsc|lint|check|build|artisan|cargo/i.test(command)).slice(0, MAX_STARTUP_ITEMS),
        confidence,
      }
    })
    .sort((a, b) => b.confidence - a.confidence || a.key.localeCompare(b.key))
    .slice(0, MAX_TOPOLOGY_COMPONENTS)

  const repositoryKeys = new Set(repositories.map((repo) => repo.key))
  const bridges = unique([
    ...(input.topology?.connections.map((connection) => `${connection.from}:::${connection.to}:::${connection.reason}`) ?? []),
    ...(input.impactMap?.component_impacts.flatMap((impact) => (
      impact.affected_components.map((target) => `${impact.component_key}:::${target}:::${impact.reason}`)
    )) ?? []),
  ])
    .map((item) => {
      const [fromRaw, toRaw, reasonRaw] = item.split(':::')
      const from = sanitizeComponentKey(fromRaw)
      const to = sanitizeComponentKey(toRaw)
      if (!from || !to || from === to || !repositoryKeys.has(from) || !repositoryKeys.has(to)) return null
      const fromRepo = repositories.find((repo) => repo.key === from)
      const toRepo = repositories.find((repo) => repo.key === to)
      const sharedStack = unique([
        ...(fromRepo?.stack ?? []),
      ].filter((stack) => (toRepo?.stack ?? []).includes(stack))).slice(0, 4)
      const impact = input.impactMap?.component_impacts.find((candidate) => (
        candidate.component_key === from && candidate.affected_components.includes(to)
      )) ?? null
      const validationBridge = unique([
        ...(impact?.validation_cascade ?? []),
        ...(fromRepo?.validate_with ?? []),
        ...(toRepo?.validate_with ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
      const contextBridge = unique([
        ...(input.workspaceMesh?.routes
          .filter((route) => route.linked_components.includes(from) || route.linked_components.includes(to))
          .flatMap((route) => route.reuse.map((reuse) => `mesh:${route.workspace_hint}:${reuse}`)) ?? []),
        ...(input.relations?.connection_contracts
          .filter((contract) => contract.workspace_hint === from || contract.workspace_hint === to)
          .flatMap((contract) => contract.reuse.map((reuse) => `relation:${contract.workspace_hint}:${reuse}`)) ?? []),
        ...(input.currentTruthPack?.current_truth.must_keep.filter((truth) => truth.includes(from) || truth.includes(to)) ?? []),
      ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
      return {
        from,
        to,
        reason: sanitizeProviderSafeText(reasonRaw ?? 'componentes relacionados').slice(0, 160),
        shared_stack: sharedStack,
        validation_bridge: validationBridge,
        context_bridge: contextBridge,
        confidence: clampConfidence(
          50
            + sharedStack.length * 8
            + Math.min(18, validationBridge.length * 3)
            + Math.min(14, contextBridge.length * 2),
        ),
      }
    })
    .filter((bridge): bridge is AwisWorkspaceRepositoryConstellationProjection['bridges'][number] => Boolean(bridge))
    .sort((a, b) => b.confidence - a.confidence || a.from.localeCompare(b.from) || a.to.localeCompare(b.to))
    .slice(0, MAX_TOPOLOGY_CONNECTIONS)

  const crossWorkspaceHints = unique([
    ...(input.relations?.connection_contracts.map((contract) => `${contract.workspace_hint}:${contract.relationship}`) ?? []),
    ...(input.workspaceMesh?.routes
      .filter((route) => route.relationship !== 'local_component')
      .map((route) => `${route.workspace_hint}:${route.relationship}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const loadFirst = unique([
    ...repositories.slice(0, 4).map((repo) => `repo:${repo.key}:${repo.role}`),
    ...bridges.slice(0, 4).map((bridge) => `bridge:${bridge.from}->${bridge.to}`),
    ...crossWorkspaceHints.map((hint) => `workspace:${hint}`),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const validateWith = unique([
    ...repositories.flatMap((repo) => repo.validate_with),
    ...bridges.flatMap((bridge) => bridge.validation_bridge),
    ...(input.launchContract?.startup_contract.validate_before_trust ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const humanBoundary = unique([
    ...(input.workspaceMesh?.next_conversation.human_boundary ?? []),
    ...(input.relations?.connection_contracts.flatMap((contract) => contract.never_transfer) ?? []),
    'não carregar conversa bruta para provar ligação entre repositórios',
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const compareWhen = unique([
    ...bridges.map((bridge) => `alteração cruza ${bridge.from} e ${bridge.to}`),
    ...crossWorkspaceHints.map((hint) => `reusar aprendizado de ${hint}`),
    ...(input.relations?.transfer_matrix.flatMap((transfer) => (
      transfer.reuse
        .filter((item) => item.startsWith('space-brain:'))
        .map((item) => `comparar Space Brain de ${transfer.workspace_hint}: ${item.replace(/^space-brain:/, '')}`)
    )) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const preserveAsArtifact = unique([
    ...bridges.slice(0, 3).map((bridge) => `bridge:${bridge.from}->${bridge.to}`),
    ...(input.sessionGold?.strongest_outcomes.slice(0, 3).map((outcome) => `ouro:${outcome.label}`) ?? []),
    ...(input.relations?.transfer_matrix.flatMap((transfer) => (
      transfer.reuse
        .filter((item) => item.startsWith('space-brain:'))
        .map((item) => `space-brain-transfer:${transfer.workspace_hint}:${item.replace(/^space-brain:/, '')}`)
    )) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const promoteWhen = unique([
    ...validateWith.slice(0, 4).map((command) => `validação verde:${command}`),
    ...bridges.slice(0, 3).map((bridge) => `ponte confirmada:${bridge.from}->${bridge.to}`),
    ...(input.relations?.transfer_matrix.flatMap((transfer) => (
      transfer.reuse
        .filter((item) => item.startsWith('space-brain:'))
        .map((item) => `Space Brain reaproveitado com sucesso:${transfer.workspace_hint}:${item.replace(/^space-brain:/, '')}`)
    )) ?? []),
  ]).slice(0, MAX_STARTUP_ITEMS)
  const revalidateWhen = unique([
    'manifesto muda',
    'comando de validação falha',
    ...repositories.flatMap((repo) => repo.summarize_when).slice(0, 4),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const demoteWhen = unique([
    'workspace muda antes da prova',
    'ponte cruza área sensível sem confirmação',
    ...humanBoundary.slice(0, 3),
  ]).slice(0, MAX_STARTUP_ITEMS)
  if (repositories.length === 0 && bridges.length === 0 && crossWorkspaceHints.length === 0) return null
  const readinessScore = normalizePercent(
    24
      + Math.min(24, repositories.length * 5)
      + Math.min(20, bridges.length * 5)
      + Math.min(16, validateWith.length * 2)
      + Math.min(12, crossWorkspaceHints.length * 3),
  )
  const hashSeed = JSON.stringify({
    repositories: repositories.map((repo) => `${repo.key}:${repo.maturity}:${repo.confidence}`),
    bridges: bridges.map((bridge) => `${bridge.from}->${bridge.to}:${bridge.confidence}`),
    crossWorkspaceHints,
    validateWith,
  })

  return {
    schema_version: 'atlas.awis.repository_constellation_projection.v1',
    source: 'local_awis_repository_constellation',
    readiness_score: readinessScore,
    constellation_hash: `repo-constellation-${stableStringHash(hashSeed)}`,
    repositories,
    bridges,
    next_conversation: {
      load_first: loadFirst,
      compare_when: compareWhen,
      validate_with: validateWith,
      preserve_as_artifact: preserveAsArtifact,
      human_boundary: humanBoundary,
    },
    learning_loop: {
      promote_when: promoteWhen,
      revalidate_when: revalidateWhen,
      demote_when: demoteWhen,
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
  }
}

function buildAwisWorkspaceLiveExecutionMemoryProjection(input: {
  topology: AwisWorkspaceTopologyProjection | null
  learning: AwisWorkspaceLearningProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  spaces: AwisWorkspaceSpaceProjection | null
  artifactLake: AwisWorkspaceArtifactLakeSummary | null
  artifactReplay: AwisWorkspaceArtifactReplayProjection | null
  continuity: AwisWorkspaceContinuityProjection | null
  automation: AwisWorkspaceAutomationProjection | null
  contextKernel: AwisWorkspaceContextKernelProjection | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
  retention: AwisWorkspaceRetentionProjection | null
  memoryConsolidation: AwisWorkspaceMemoryConsolidationProjection | null
  startupOrchestration: AwisWorkspaceStartupOrchestrationProjection | null
  preflight: AwisWorkspacePreflightProjection | null
  workspaceTwin: AwisWorkspaceTwinProjection | null
  launchContract: AwisWorkspaceLaunchContractProjection | null
  nextSessionBrain: AwisWorkspaceNextSessionBrainProjection | null
  workspaceMesh: AwisWorkspaceMeshProjection | null
  currentTruthPack: AwisWorkspaceCurrentTruthPackProjection | null
  repositoryConstellation: AwisWorkspaceRepositoryConstellationProjection | null
}): AwisWorkspaceLiveExecutionMemoryProjection | null {
  const loadFirst = unique([
    ...(input.nextSessionBrain?.load_order.map((item) => `brain:${item}`) ?? []),
    ...(input.launchContract?.startup_contract.first_load.map((item) => `launch:${item}`) ?? []),
    ...(input.currentTruthPack?.next_conversation.load_first.map((item) => `truth:${item}`) ?? []),
    ...(input.repositoryConstellation?.next_conversation.load_first.map((item) => `repo:${item}`) ?? []),
    ...(input.workspaceMesh?.next_conversation.load_order.map((item) => `mesh:${item}`) ?? []),
    ...(input.artifactReplay?.cold_start_seed.load_order.map((item) => `artifact:${item}`) ?? []),
    ...(input.contextKernel?.priority_load.map((item) => `kernel:${item.kind}:${item.label}`) ?? []),
    ...(input.continuity?.next_session_plan.first_load.map((item) => `continuidade:${item}`) ?? []),
    ...(input.topology?.knowledge_map.load_first_docs.map((path) => `doc:${path}`) ?? []),
    ...(input.topology?.knowledge_map.manifest_refs.map((path) => `manifest:${path}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const useAsSummary = unique([
    ...(input.currentTruthPack ? [`truth:${input.currentTruthPack.truth_hash}:${input.currentTruthPack.readiness_score}`] : []),
    ...(input.repositoryConstellation ? [`repo-constellation:${input.repositoryConstellation.constellation_hash}:${input.repositoryConstellation.readiness_score}`] : []),
    ...(input.artifactReplay?.cold_start_seed.context_signals.map((item) => `artifact-context:${item}`) ?? []),
    ...(input.sessionGold?.strongest_outcomes.slice(0, 4).map((outcome) => `ouro:${outcome.label}:${outcome.confidence}`) ?? []),
    ...(input.memoryConsolidation?.next_session_seed.map((item) => `seed:${item}`) ?? []),
    ...(input.workspaceTwin ? [`twin:${input.workspaceTwin.hashes.genome_hash}:${input.workspaceTwin.readiness_score}`] : []),
    ...(input.repositoryConstellation?.repositories.slice(0, 6).map((repo) => `repo:${repo.key}:${repo.maturity}:${repo.confidence}`) ?? []),
    ...(input.repositoryConstellation?.bridges.slice(0, 6).map((bridge) => `bridge:${bridge.from}->${bridge.to}:${bridge.confidence}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const validateBeforeTrust = unique([
    ...(input.nextSessionBrain?.execution_priority.map((priority) => priority.command) ?? []),
    ...(input.launchContract?.startup_contract.validate_before_trust ?? []),
    ...(input.currentTruthPack?.proof.validate_with.map((item) => `truth:${item}`) ?? []),
    ...(input.repositoryConstellation?.next_conversation.validate_with.map((item) => `repo:${item}`) ?? []),
    ...(input.workspaceMesh?.next_conversation.validate_with.map((item) => `mesh:${item}`) ?? []),
    ...(input.artifactReplay?.cold_start_seed.validate_with.map((item) => `artifact:${item}`) ?? []),
    ...(input.preflight?.execution_lanes.before_execution.map((item) => `pré-execução:${item}`) ?? []),
    ...(input.contextKernel?.validation_plan.commands ?? []),
    ...(input.learning?.trusted_commands.filter((command) => /test|tsc|lint|check|build/i.test(command)) ?? []),
    ...(input.topology?.knowledge_map.validation_entrypoints ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const avoid = unique([
    ...(input.launchContract?.startup_contract.avoid_loading.map((item) => `launch:${item}`) ?? []),
    ...(input.currentTruthPack?.proof.stale_or_unproven.map((item) => `truth:${item}`) ?? []),
    ...(input.repositoryConstellation?.next_conversation.human_boundary.map((item) => `repo:${item}`) ?? []),
    ...(input.workspaceMesh?.next_conversation.human_boundary.map((item) => `mesh:${item}`) ?? []),
    ...(input.memoryFreshness?.evidence.missing.map((item) => `frescor:${item}`) ?? []),
    ...(input.memoryConsolidation?.consolidate.never_promote.map((item) => `não promover:${item}`) ?? []),
    ...(input.retention?.lifecycle.drop_or_summarize.map((item) => `retenção:${item}`) ?? []),
    ...(input.topology?.knowledge_map.sensitive_zones.map((zone) => `sensível:${zone}`) ?? []),
    ...(input.topology?.knowledge_map.summarize_only.map((item) => `resumir:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const humanBoundary = unique([
    ...(input.launchContract?.human_contract.confirm_before.map((item) => `confirmar:${item}`) ?? []),
    ...(input.launchContract?.human_contract.do_not_delegate.map((item) => `não delegar:${item}`) ?? []),
    ...(input.currentTruthPack?.proof.human_boundary.map((item) => `truth:${item}`) ?? []),
    ...(input.repositoryConstellation?.next_conversation.human_boundary.map((item) => `repo:${item}`) ?? []),
    ...(input.artifactReplay?.cold_start_seed.human_boundary.map((item) => `artifact:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const beforeSend = unique([
    ...(input.automation?.autopilot_context.before_send ?? []),
    ...(input.sessionGold?.next_session_hooks.before_send ?? []),
    ...(input.preflight?.execution_lanes.before_send ?? []),
    ...(input.startupOrchestration?.revalidation_gate.required_before_send ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const afterSuccess = unique([
    ...(input.launchContract?.automation_contract.after_success ?? []),
    ...(input.automation?.autopilot_context.after_send ?? []),
    ...(input.sessionGold?.next_session_hooks.after_send ?? []),
    ...(input.memoryConsolidation?.consolidate.archive_as_artifact.map((item) => `arquivar:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const afterFailure = unique([
    ...(input.launchContract?.recovery_contract.demote_context ?? []),
    ...(input.currentTruthPack?.next_conversation.demote_when ?? []),
    ...(input.repositoryConstellation?.learning_loop.demote_when ?? []),
    ...(input.memoryConsolidation?.consolidate.revalidate.map((item) => `revalidar:${item}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const onDrift = unique([
    ...(input.memoryFreshness?.next_refresh.actions ?? []),
    ...(input.workspaceTwin?.learning_loop.next_refresh ?? []),
    ...(input.repositoryConstellation?.learning_loop.revalidate_when ?? []),
    ...(input.currentTruthPack?.proof.stale_or_unproven ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const promoteToGold = unique([
    ...(input.memoryConsolidation?.consolidate.promote_to_gold ?? []),
    ...(input.currentTruthPack?.next_conversation.promote_when ?? []),
    ...(input.repositoryConstellation?.learning_loop.promote_when ?? []),
    ...(input.workspaceMesh?.next_conversation.reuse_rules.map((item) => `mesh:${item}`) ?? []),
    ...(input.sessionGold?.strongest_outcomes.slice(0, 4).map((outcome) => `resultado:${outcome.label}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const preserveAsArtifact = unique([
    ...(input.repositoryConstellation?.next_conversation.preserve_as_artifact.map((item) => `repo:${item}`) ?? []),
    ...(input.launchContract?.startup_contract.preserve_artifact_after_success ? ['partida validada'] : []),
    ...(input.preflight?.promotion_contract.preserve_as_artifact ? ['pré-voo validado'] : []),
    ...(input.currentTruthPack?.current_truth.active_artifacts.map((item) => `truth:${item}`) ?? []),
    input.artifactLake?.latest_artifact_hash ? `artifact:${input.artifactLake.latest_artifact_hash}` : null,
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const revalidate = unique([
    ...validateBeforeTrust,
    ...(input.memoryFreshness?.evidence.revalidate ?? []),
    ...(input.repositoryConstellation?.learning_loop.revalidate_when ?? []),
    ...(input.retention?.lifecycle.revalidate ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)
  const demote = unique([
    ...afterFailure,
    ...(input.memoryConsolidation?.consolidate.never_promote ?? []),
    ...(input.currentTruthPack?.next_conversation.demote_when ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const repositories = unique([
    ...(input.nextSessionBrain?.focused_repositories.map((repo) => `${repo.repo_key}:${repo.score}`) ?? []),
    ...(input.repositoryConstellation?.repositories.map((repo) => `${repo.key}:${repo.maturity}:${repo.confidence}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const components = unique([
    ...(input.topology?.components.map((component) => `${component.key}:${component.role}`) ?? []),
    ...(input.workspaceTwin?.genome.apps.map((app) => `app:${app}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const spaces = unique([
    ...(input.spaces?.strongest_spaces.map((space) => `${space.title}:${space.session_count}`) ?? []),
    ...(input.continuity?.hot_context.spaces ?? []),
    ...(input.artifactReplay?.cold_start_seed.reuse_spaces ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const artifacts = unique([
    input.artifactLake?.latest_artifact_hash ?? null,
    input.artifactReplay?.latest_artifact_hash ?? null,
    input.artifactReplay?.cold_start_seed.seed_hash ?? null,
    input.currentTruthPack?.truth_hash ?? null,
    input.nextSessionBrain?.brain_hash ?? null,
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const commands = unique([
    ...validateBeforeTrust,
    ...(input.sessionGold?.proven_commands.map((command) => `${command.command}:${command.success_count}`) ?? []),
    ...(input.learning?.task_memory.trusted_task_commands ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  if (
    loadFirst.length === 0
    && useAsSummary.length === 0
    && validateBeforeTrust.length === 0
    && repositories.length === 0
    && components.length === 0
  ) return null

  const readinessScore = normalizePercent(
    22
      + Math.min(18, loadFirst.length * 2)
      + Math.min(18, validateBeforeTrust.length * 2)
      + Math.min(12, promoteToGold.length * 2)
      + Math.min(12, repositories.length * 2)
      + Math.min(10, artifacts.length * 3)
      + (input.memoryFreshness?.state === 'fresh' || input.memoryFreshness?.state === 'warm' ? 8 : 0),
  )
  const hashSeed = JSON.stringify({
    loadFirst,
    useAsSummary,
    validateBeforeTrust,
    promoteToGold,
    repositories,
    components,
    artifacts,
  })

  return {
    schema_version: 'atlas.awis.live_execution_memory_projection.v1',
    source: 'local_awis_live_execution_memory_compiler',
    readiness_score: readinessScore,
    memory_hash: `live-${stableStringHash(hashSeed)}`,
    startup_packet: {
      load_first: loadFirst,
      use_as_summary: useAsSummary,
      validate_before_trust: validateBeforeTrust,
      avoid,
      human_boundary: humanBoundary,
    },
    automation_loop: {
      before_send: beforeSend,
      after_success: afterSuccess,
      after_failure: afterFailure,
      on_drift: onDrift,
    },
    promotion_rules: {
      promote_to_gold: promoteToGold,
      preserve_as_artifact: preserveAsArtifact,
      revalidate,
      demote,
    },
    workspace_learning: {
      repositories,
      components,
      spaces,
      artifacts,
      commands,
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
  }
}

function mergeSignals(
  previous: AwisWorkspaceMemorySignal[],
  labels: string[],
  now: string,
  learned: string[],
): AwisWorkspaceMemorySignal[] {
  const byLabel = new Map(previous.map((item) => [item.label, item]))
  for (const label of unique(labels)) {
    const existing = byLabel.get(label)
    if (existing) {
      byLabel.set(label, {
        ...existing,
        lastSeenAt: now,
        seenCount: existing.seenCount + 1,
      })
    } else {
      byLabel.set(label, {
        label,
        firstSeenAt: now,
        lastSeenAt: now,
        seenCount: 1,
      })
      learned.push(label)
    }
  }
  return Array.from(byLabel.values())
    .sort((a, b) => b.seenCount - a.seenCount || a.label.localeCompare(b.label))
}

function buildObservations(
  snapshot: AtlasWorkspaceBrainSnapshot,
  previous: AwisWorkspaceMemorySnapshot | null,
): string[] {
  const observations: string[] = []
  if (!previous) observations.push('primeiro mapa local persistido')
  if (snapshot.truncated) observations.push('workspace grande: scan limitado para desempenho')
  if (snapshot.commands.length > 0) observations.push(`${snapshot.commands.length} comando(s) operacional(is) inferido(s)`)
  if (snapshot.importantFiles.length > 0) observations.push(`${snapshot.importantFiles.length} arquivo(s) de contexto relevante(s)`)
  return unique(observations)
}

function describeDrift(previous: AwisWorkspaceMemorySnapshot, snapshot: AtlasWorkspaceBrainSnapshot, now: string): string | null {
  const newSignals = snapshot.signals.filter((signal) => !previous.stableSignals.some((item) => item.label === signal))
  const newCommands = snapshot.commands
    .map((command) => command.command)
    .filter((command) => !previous.stableCommands.some((item) => item.label === command))
  const parts: string[] = []
  if (newSignals.length > 0) parts.push(`novos sinais: ${newSignals.slice(0, 3).join(', ')}`)
  if (newCommands.length > 0) parts.push(`novos comandos: ${newCommands.slice(0, 2).join(', ')}`)
  if (parts.length === 0 && previous.lastFingerprint !== workspaceBrainFingerprint(snapshot)) {
    parts.push('estrutura local mudou')
  }
  return parts.length > 0 ? `${now}: ${parts.join(' · ')}` : null
}

function normalizeMemory(raw: unknown): AwisWorkspaceMemorySnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceMemorySnapshot>
  if (value.schemaVersion !== 'atlas.awis.workspace_memory.v1') return null
  if (!value.workspaceKey) return null
  return {
    schemaVersion: 'atlas.awis.workspace_memory.v1',
    workspaceKey: value.workspaceKey,
    workspaceName: value.workspaceName || value.workspaceKey,
    rootPath: value.rootPath || '',
    firstSeenAt: value.firstSeenAt || value.lastSeenAt || new Date().toISOString(),
    lastSeenAt: value.lastSeenAt || value.firstSeenAt || new Date().toISOString(),
    scanCount: typeof value.scanCount === 'number' ? value.scanCount : 1,
    lastFingerprint: value.lastFingerprint || '',
    stableSignals: normalizeSignals(value.stableSignals),
    stableLanguages: normalizeSignals(value.stableLanguages),
    stableCommands: normalizeSignals(value.stableCommands),
    operationalSignals: normalizeSignals(value.operationalSignals),
    interactionCount: typeof value.interactionCount === 'number' ? value.interactionCount : 0,
    successCount: typeof value.successCount === 'number' ? value.successCount : 0,
    failureCount: typeof value.failureCount === 'number' ? value.failureCount : 0,
    contextPackAppliedCount: typeof value.contextPackAppliedCount === 'number' ? value.contextPackAppliedCount : 0,
    lastInteractionAt: isString(value.lastInteractionAt) ? value.lastInteractionAt : null,
    recentOutcomes: normalizeOutcomes(value.recentOutcomes),
    recentMaintenance: normalizeMaintenanceEvents(value.recentMaintenance),
    observations: Array.isArray(value.observations) ? value.observations.filter(isString).slice(0, MAX_OBSERVATIONS) : [],
    driftEvents: Array.isArray(value.driftEvents) ? value.driftEvents.filter(isString).slice(0, MAX_DRIFT_EVENTS) : [],
  }
}

function awisWorkspaceMemorySortScore(memory: AwisWorkspaceMemorySnapshot): number {
  const timestamps = [
    memory.lastInteractionAt,
    memory.lastSeenAt,
    memory.recentOutcomes[0]?.occurredAt,
    memory.recentMaintenance[0]?.occurredAt,
  ]
    .map((value) => value ? Date.parse(value) : 0)
    .filter((value) => Number.isFinite(value))
  const latest = Math.max(0, ...timestamps)
  return latest
    + memory.scanCount
    + memory.interactionCount * 10
    + memory.successCount * 20
    - memory.failureCount
}

function normalizeSpaceProjection(raw: unknown): AwisWorkspaceSpaceProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceSpaceProjection>
  if (value.schema_version !== 'atlas.awis.workspace_space_projection.v1') return null
  if (!Array.isArray(value.strongest_spaces)) return null
  const strongestSpaces = value.strongest_spaces
    .filter((space) => Boolean(space && typeof space === 'object'))
    .map((space) => {
      const candidate = space as AwisWorkspaceSpaceProjection['strongest_spaces'][number]
      return {
        title: isString(candidate.title) ? candidate.title.slice(0, 96) : 'Space',
        session_count: normalizeCount(candidate.session_count),
        message_count: normalizeCount(candidate.message_count),
        mode_count: normalizeCount(candidate.mode_count),
        decision_count: normalizeCount(candidate.decision_count),
        pending_count: normalizeCount(candidate.pending_count),
        risk_count: normalizeCount(candidate.risk_count),
        artifact_count: normalizeCount(candidate.artifact_count),
        strength_score: normalizeCount(candidate.strength_score),
        freshness: candidate.freshness === 'recente' || candidate.freshness === 'estavel' || candidate.freshness === 'frio'
          ? candidate.freshness
          : 'estavel',
        source: candidate.source === 'suggested_space' ? 'suggested_space' as const : 'local_space' as const,
        scope_label: isString(candidate.scope_label)
          ? candidate.scope_label.slice(0, 96)
          : `${normalizeCount(candidate.session_count)} sessões`,
        reusable_by: Array.isArray(candidate.reusable_by) ? candidate.reusable_by.filter(isString).slice(0, 4) : [],
        recommended_use: Array.isArray(candidate.recommended_use) ? candidate.recommended_use.filter(isString).slice(0, 4) : [],
        brain_contract: {
          state: candidate.brain_contract?.state === 'vivo' || candidate.brain_contract?.state === 'pronto' || candidate.brain_contract?.state === 'leve'
            ? candidate.brain_contract.state
            : 'pronto',
          load_first: normalizeStringList(candidate.brain_contract?.load_first, MAX_STARTUP_ITEMS),
          carry_forward: normalizeStringList(candidate.brain_contract?.carry_forward, MAX_STARTUP_ITEMS),
          validate_before_use: normalizeStringList(candidate.brain_contract?.validate_before_use, MAX_STARTUP_ITEMS),
          automation_hooks: normalizeStringList(candidate.brain_contract?.automation_hooks, MAX_STARTUP_ITEMS),
          human_boundary: normalizeStringList(candidate.brain_contract?.human_boundary, MAX_STARTUP_ITEMS),
          artifact_refs: normalizeStringList(candidate.brain_contract?.artifact_refs, MAX_STARTUP_ITEMS),
          evidence: normalizeStringList(candidate.brain_contract?.evidence, MAX_STARTUP_ITEMS),
        },
        continuity_contract: {
          load_when: normalizeStringList(candidate.continuity_contract?.load_when, MAX_STARTUP_ITEMS),
          carry_forward: normalizeStringList(candidate.continuity_contract?.carry_forward, MAX_STARTUP_ITEMS),
          refresh_when: normalizeStringList(candidate.continuity_contract?.refresh_when, MAX_STARTUP_ITEMS),
        },
        session_summaries: Array.isArray(candidate.session_summaries)
          ? candidate.session_summaries
            .filter((session) => Boolean(session && typeof session === 'object'))
            .map((session) => ({
              title: isString(session.title) ? session.title.slice(0, 96) : '(sem título)',
              mode: isString(session.mode) ? session.mode.slice(0, 32) : 'auto',
              message_count: normalizeCount(session.message_count),
              last_active_at: isString(session.last_active_at) ? session.last_active_at : null,
              provider: isString(session.provider) ? session.provider : null,
            }))
            .slice(0, MAX_SPACE_PROJECTION_SESSIONS)
          : [],
      }
    })
    .filter((space) => space.session_count >= 2)
    .slice(0, MAX_SPACE_PROJECTION_SPACES)
  if (strongestSpaces.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_space_projection.v1',
    source: 'local_project_spaces',
    space_count: normalizeCount(value.space_count) || strongestSpaces.length,
    total_session_count: normalizeCount(value.total_session_count) || strongestSpaces.reduce((sum, space) => sum + space.session_count, 0),
    total_message_count: normalizeCount(value.total_message_count) || strongestSpaces.reduce((sum, space) => sum + space.message_count, 0),
    spaces: strongestSpaces.map((space) => ({
      name: space.title,
      session_count: space.session_count,
    })),
    continuity: {
      never_start_cold: true,
      load_first: normalizeStringList(value.continuity?.load_first, MAX_STARTUP_ITEMS),
      carry_forward: normalizeStringList(value.continuity?.carry_forward, MAX_STARTUP_ITEMS),
      refresh_when: normalizeStringList(value.continuity?.refresh_when, MAX_STARTUP_ITEMS),
      provider_safe: true,
    },
    strongest_spaces: strongestSpaces,
    safety: {
      raw_conversation_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeStartupBriefing(raw: unknown): AwisWorkspaceStartupBriefing | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceStartupBriefing>
  if (value.schema_version !== 'atlas.awis.workspace_startup_briefing.v1') return null
  return {
    schema_version: 'atlas.awis.workspace_startup_briefing.v1',
    source: 'local_awis_context_compiler',
    generated_for_workspace: isString(value.generated_for_workspace) ? value.generated_for_workspace.slice(0, 120) : 'workspace',
    never_start_cold: true,
    readiness: {
      score: normalizePercent(value.readiness?.score),
      folder_map: value.readiness?.folder_map === true,
      topology: value.readiness?.topology === true,
      memory: value.readiness?.memory === true,
      operational_memory: value.readiness?.operational_memory === true,
      learning: value.readiness?.learning === true,
      spaces: value.readiness?.spaces === true,
      relations: value.readiness?.relations === true,
      artifact_replay: value.readiness?.artifact_replay === true,
      next_session_brain: value.readiness?.next_session_brain === true,
      handoff_pack: value.readiness?.handoff_pack === true,
    },
    focus: {
      primary: isString(value.focus?.primary) ? value.focus.primary.slice(0, 120) : 'workspace',
      load_sequence: normalizeStringList(value.focus?.load_sequence, MAX_STARTUP_ITEMS),
      repositories: normalizeStringList(value.focus?.repositories, MAX_STARTUP_ITEMS),
      areas: normalizeStringList(value.focus?.areas, MAX_STARTUP_ITEMS),
      owner_docs: normalizeStringList(value.focus?.owner_docs, MAX_STARTUP_ITEMS),
    },
    context_gold: {
      stack: normalizeStringList(value.context_gold?.stack, MAX_STARTUP_ITEMS),
      commands: normalizeStringList(value.context_gold?.commands, MAX_STARTUP_ITEMS),
      strongest_spaces: normalizeStringList(value.context_gold?.strongest_spaces, MAX_STARTUP_ITEMS),
      reusable_patterns: normalizeStringList(value.context_gold?.reusable_patterns, MAX_STARTUP_ITEMS),
      artifact_refs: normalizeStringList(value.context_gold?.artifact_refs, MAX_STARTUP_ITEMS),
      handoff_units: normalizeStringList(value.context_gold?.handoff_units, MAX_STARTUP_ITEMS),
    },
    operational_memory: {
      interaction_count: normalizeCount(value.operational_memory?.interaction_count),
      success_rate: typeof value.operational_memory?.success_rate === 'number' ? normalizePercent(value.operational_memory.success_rate) : null,
      recent_channels: normalizeStringList(value.operational_memory?.recent_channels, MAX_STARTUP_ITEMS),
      latest_status: isString(value.operational_memory?.latest_status) ? value.operational_memory.latest_status : null,
    },
    automation_plan: {
      next_best_actions: normalizeStringList(value.automation_plan?.next_best_actions, MAX_STARTUP_ITEMS),
      commands_to_prioritize: normalizeStringList(value.automation_plan?.commands_to_prioritize, MAX_STARTUP_ITEMS),
      tests_to_run: normalizeStringList(value.automation_plan?.tests_to_run, MAX_STARTUP_ITEMS),
      missing_artifacts: normalizeStringList(value.automation_plan?.missing_artifacts, MAX_STARTUP_ITEMS),
      warnings: normalizeStringList(value.automation_plan?.warnings, MAX_STARTUP_ITEMS),
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      internal_ids_included: false,
      absolute_paths_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeStartupPlaybook(raw: unknown): AwisWorkspaceStartupPlaybook | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceStartupPlaybook>
  if (value.schema_version !== 'atlas.awis.workspace_startup_playbook.v1') return null
  const surface = value.recommended_surface === 'space_first' || value.recommended_surface === 'side_by_side'
    ? value.recommended_surface
    : 'single_conversation'
  return {
    schema_version: 'atlas.awis.workspace_startup_playbook.v1',
    source: 'local_awis_execution_compiler',
    generated_for_workspace: isString(value.generated_for_workspace) ? value.generated_for_workspace.slice(0, 120) : 'workspace',
    recommended_surface: surface,
    context_loading: {
      must_load: normalizeStringList(value.context_loading?.must_load, MAX_STARTUP_ITEMS),
      optional: normalizeStringList(value.context_loading?.optional, MAX_STARTUP_ITEMS),
      avoid_loading: normalizeStringList(value.context_loading?.avoid_loading, MAX_STARTUP_ITEMS),
    },
    execution: {
      primary_validation_commands: normalizeStringList(value.execution?.primary_validation_commands, MAX_STARTUP_ITEMS),
      fallback_validation_commands: normalizeStringList(value.execution?.fallback_validation_commands, MAX_STARTUP_ITEMS),
      requires_local_folder: value.execution?.requires_local_folder === true,
    },
    collaboration: {
      resume_space: isString(value.collaboration?.resume_space) ? value.collaboration.resume_space.slice(0, 120) : null,
      compare_sessions: value.collaboration?.compare_sessions === true,
      related_workspace_hints: normalizeStringList(value.collaboration?.related_workspace_hints, MAX_STARTUP_ITEMS).map(sanitizeComponentKey).filter(isString),
    },
    learning_hooks: {
      record_outcome: value.learning_hooks?.record_outcome !== false,
      update_memory_after_send: value.learning_hooks?.update_memory_after_send !== false,
      persist_startup_artifact: value.learning_hooks?.persist_startup_artifact !== false,
      watch_for_drift: value.learning_hooks?.watch_for_drift === true,
    },
    risk_controls: normalizeStringList(value.risk_controls, MAX_STARTUP_ITEMS),
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeLearningProjection(raw: unknown): AwisWorkspaceLearningProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceLearningProjection>
  if (value.schema_version !== 'atlas.awis.workspace_learning_projection.v1') return null
  const maturity: AwisWorkspaceLearningProjection['maturity'] =
    value.maturity === 'battle_tested' || value.maturity === 'stable' || value.maturity === 'learning'
      ? value.maturity
      : 'new'
  return {
    schema_version: 'atlas.awis.workspace_learning_projection.v1',
    source: 'local_workspace_outcomes',
    maturity,
    interaction_count: normalizeCount(value.interaction_count),
    success_rate: typeof value.success_rate === 'number' ? normalizePercent(value.success_rate) : null,
    context_pack_effectiveness: typeof value.context_pack_effectiveness === 'number' ? normalizePercent(value.context_pack_effectiveness) : null,
    preferred_channels: normalizeStringList(value.preferred_channels, MAX_STARTUP_ITEMS),
    trusted_commands: normalizeStringList(value.trusted_commands, MAX_STARTUP_ITEMS),
    caution_signals: normalizeStringList(value.caution_signals, MAX_STARTUP_ITEMS),
    recent_drift: normalizeStringList(value.recent_drift, MAX_STARTUP_ITEMS),
    task_memory: {
      task_kinds: normalizeStringList(value.task_memory?.task_kinds, MAX_STARTUP_ITEMS).flatMap((taskKind) => {
        const normalized = normalizeTaskKind(taskKind)
        return normalized ? [normalized] : []
      }),
      recent_task_kinds: normalizeStringList(value.task_memory?.recent_task_kinds, MAX_STARTUP_ITEMS).flatMap((taskKind) => {
        const normalized = normalizeTaskKind(taskKind)
        return normalized ? [normalized] : []
      }),
      trusted_task_commands: normalizeStringList(value.task_memory?.trusted_task_commands, MAX_STARTUP_ITEMS),
      validation_plans: normalizeValidationPlans(value.task_memory?.validation_plans),
    },
    next_learning_event: isString(value.next_learning_event) ? value.next_learning_event.slice(0, 180) : 'registrar outcome da próxima conversa',
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeValidationPlans(raw: unknown): AwisWorkspaceLearningProjection['task_memory']['validation_plans'] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Partial<AwisWorkspaceLearningProjection['task_memory']['validation_plans'][number]> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const taskKind = normalizeTaskKind(item.task_kind) ?? 'unknown'
      return {
        task_kind: taskKind,
        commands: normalizeStringList(item.commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        context_gold: normalizeContextGoldLabels(item.context_gold),
        component_keys: normalizeComponentKeys(item.component_keys),
        success_count: normalizeCount(item.success_count),
        failure_count: normalizeCount(item.failure_count),
        confidence: normalizePercent(item.confidence),
      }
    })
    .filter((item) => item.task_kind !== 'unknown' && item.commands.length > 0)
    .slice(0, MAX_STARTUP_ITEMS)
}

function normalizeSessionGoldProjection(raw: unknown): AwisWorkspaceSessionGoldProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceSessionGoldProjection>
  if (value.schema_version !== 'atlas.awis.workspace_session_gold_projection.v1') return null
  const strongestOutcomes = Array.isArray(value.strongest_outcomes)
    ? value.strongest_outcomes
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.label)))
      .map((item) => ({
        label: sanitizeProviderSafeText(item.label).slice(0, 160),
        confidence: normalizePercent(item.confidence),
        evidence: normalizeStringList(item.evidence, 4).map(sanitizeProviderSafeText).filter(isString),
      }))
      .filter((item) => item.label !== '')
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  const provenCommands = Array.isArray(value.proven_commands)
    ? value.proven_commands
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.command)))
      .map((item) => ({
        command: sanitizeProviderSafeText(item.command).slice(0, 180),
        success_count: normalizeCount(item.success_count),
        task_kinds: normalizeStringList(item.task_kinds, MAX_STARTUP_ITEMS).flatMap((taskKind) => {
          const normalized = normalizeTaskKind(taskKind)
          return normalized ? [normalized] : []
        }),
        channels: normalizeStringList(item.channels, MAX_STARTUP_ITEMS),
      }))
      .filter((item) => item.command !== '')
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (strongestOutcomes.length === 0 && provenCommands.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_session_gold_projection.v1',
    source: 'local_workspace_session_outcomes',
    readiness_score: normalizePercent(value.readiness_score),
    outcome_count: normalizeCount(value.outcome_count),
    success_rate: typeof value.success_rate === 'number' ? normalizePercent(value.success_rate) : null,
    strongest_outcomes: strongestOutcomes,
    proven_commands: provenCommands,
    recovery_patterns: normalizeStringList(value.recovery_patterns, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    next_session_hooks: {
      before_send: normalizeStringList(value.next_session_hooks?.before_send, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      after_send: normalizeStringList(value.next_session_hooks?.after_send, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      validate_with: normalizeStringList(value.next_session_hooks?.validate_with, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
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
  }
}

function normalizeContinuityProjection(raw: unknown): AwisWorkspaceContinuityProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceContinuityProjection>
  if (value.schema_version !== 'atlas.awis.workspace_continuity_projection.v1') return null
  const restoreKinds = new Set(['space', 'artifact', 'command', 'component', 'relation', 'handoff', 'task_memory'])
  const restorePriority = Array.isArray(value.restore_priority)
    ? value.restore_priority
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.label)))
      .map((item) => ({
        kind: restoreKinds.has(String(item.kind)) ? item.kind as AwisWorkspaceContinuityProjection['restore_priority'][number]['kind'] : 'artifact',
        label: item.label.slice(0, 180),
        why: isString(item.why) ? item.why.slice(0, 180) : 'contexto útil para restaurar a próxima sessão',
        confidence: normalizePercent(item.confidence),
      }))
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (restorePriority.length === 0 && !value.hot_context) return null
  const surface = value.next_session_plan?.open_surface === 'space_first' || value.next_session_plan?.open_surface === 'side_by_side'
    ? value.next_session_plan.open_surface
    : 'single_conversation'
  return {
    schema_version: 'atlas.awis.workspace_continuity_projection.v1',
    source: 'local_awis_continuity_compiler',
    readiness_score: normalizePercent(value.readiness_score),
    restore_priority: restorePriority,
    hot_context: {
      spaces: normalizeStringList(value.hot_context?.spaces, MAX_STARTUP_ITEMS),
      components: normalizeStringList(value.hot_context?.components, MAX_STARTUP_ITEMS),
      commands: normalizeStringList(value.hot_context?.commands, MAX_STARTUP_ITEMS),
      artifacts: normalizeStringList(value.hot_context?.artifacts, MAX_STARTUP_ITEMS),
      task_kinds: normalizeStringList(value.hot_context?.task_kinds, MAX_STARTUP_ITEMS).flatMap((taskKind) => {
        const normalized = normalizeTaskKind(taskKind)
        return normalized ? [normalized] : []
      }),
      related_workspace_hints: normalizeStringList(value.hot_context?.related_workspace_hints, MAX_STARTUP_ITEMS).map(sanitizeComponentKey).filter(isString),
    },
    stale_or_risky_context: normalizeStringList(value.stale_or_risky_context, MAX_STARTUP_ITEMS),
    next_session_plan: {
      open_surface: surface,
      first_load: normalizeStringList(value.next_session_plan?.first_load, MAX_STARTUP_ITEMS),
      validate_with: normalizeStringList(value.next_session_plan?.validate_with, MAX_STARTUP_ITEMS),
      preserve_as_artifact: value.next_session_plan?.preserve_as_artifact !== false,
    },
    learning_hooks: {
      capture_outcome: true,
      refresh_folder_map: value.learning_hooks?.refresh_folder_map === true,
      update_space_pack: value.learning_hooks?.update_space_pack === true,
      replay_artifacts_before_send: value.learning_hooks?.replay_artifacts_before_send === true,
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
  }
}

function normalizeAutomationProjection(raw: unknown): AwisWorkspaceAutomationProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceAutomationProjection>
  if (value.schema_version !== 'atlas.awis.workspace_automation_projection.v1') return null
  const actions = new Set(['refresh_folder_map', 'replay_artifacts', 'update_space_pack', 'record_outcome', 'revalidate_command', 'review_risk', 'cross_workspace_transfer'])
  const priorities = new Set(['high', 'medium', 'low'])
  const queue = Array.isArray(value.maintenance_queue)
    ? value.maintenance_queue
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.label)))
      .map((item) => ({
        action: actions.has(String(item.action)) ? item.action as AwisWorkspaceAutomationProjection['maintenance_queue'][number]['action'] : 'record_outcome',
        label: item.label.slice(0, 180),
        reason: isString(item.reason) ? item.reason.slice(0, 180) : 'manter aprendizado AWIS',
        priority: priorities.has(String(item.priority)) ? item.priority as AwisWorkspaceAutomationProjection['maintenance_queue'][number]['priority'] : 'medium',
        requires_human_confirmation: item.requires_human_confirmation === true,
      }))
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (queue.length === 0) return null
  const mode = value.mode === 'optimize' || value.mode === 'maintain' ? value.mode : 'observe'
  return {
    schema_version: 'atlas.awis.workspace_automation_projection.v1',
    source: 'local_awis_maintenance_compiler',
    automation_score: normalizePercent(value.automation_score),
    mode,
    maintenance_queue: queue,
    autopilot_context: {
      before_send: normalizeStringList(value.autopilot_context?.before_send, MAX_STARTUP_ITEMS),
      after_send: normalizeStringList(value.autopilot_context?.after_send, MAX_STARTUP_ITEMS),
      on_startup: normalizeStringList(value.autopilot_context?.on_startup, MAX_STARTUP_ITEMS),
    },
    feedback_loop: {
      metrics_to_watch: normalizeStringList(value.feedback_loop?.metrics_to_watch, MAX_STARTUP_ITEMS),
      promote_when: normalizeStringList(value.feedback_loop?.promote_when, MAX_STARTUP_ITEMS),
      demote_when: normalizeStringList(value.feedback_loop?.demote_when, MAX_STARTUP_ITEMS),
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
  }
}

function normalizeConfidenceProjection(raw: unknown): AwisWorkspaceConfidenceProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceConfidenceProjection>
  if (value.schema_version !== 'atlas.awis.workspace_confidence_projection.v1') return null
  const normalizeRanked = (items: unknown): AwisWorkspaceConfidenceProjection['ranked']['commands'] => (
    Array.isArray(items)
      ? items
        .filter((item) => Boolean(item && typeof item === 'object' && isString(item.label)))
        .map((item) => ({
          label: item.label.slice(0, 180),
          score: normalizePercent(item.score),
          evidence: normalizeStringList(item.evidence, MAX_STARTUP_ITEMS),
          caution: isString(item.caution) ? item.caution.slice(0, 180) : null,
        }))
        .slice(0, MAX_STARTUP_ITEMS)
      : []
  )
  const ranked = {
    commands: normalizeRanked(value.ranked?.commands),
    spaces: normalizeRanked(value.ranked?.spaces),
    artifacts: normalizeRanked(value.ranked?.artifacts),
    transfers: normalizeRanked(value.ranked?.transfers),
  }
  if (
    ranked.commands.length === 0 &&
    ranked.spaces.length === 0 &&
    ranked.artifacts.length === 0 &&
    ranked.transfers.length === 0
  ) return null
  return {
    schema_version: 'atlas.awis.workspace_confidence_projection.v1',
    source: 'local_awis_confidence_compiler',
    confidence_score: normalizePercent(value.confidence_score),
    ranked,
    decision_policy: {
      prefer: normalizeStringList(value.decision_policy?.prefer, MAX_STARTUP_ITEMS),
      require_confirmation_for: normalizeStringList(value.decision_policy?.require_confirmation_for, MAX_STARTUP_ITEMS),
      avoid_until_revalidated: normalizeStringList(value.decision_policy?.avoid_until_revalidated, MAX_STARTUP_ITEMS),
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
  }
}

function normalizeTopologyProjection(raw: unknown): AwisWorkspaceTopologyProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceTopologyProjection>
  if (value.schema_version !== 'atlas.awis.workspace_topology_projection.v1') return null
  const components = Array.isArray(value.components)
    ? value.components
      .filter((component) => Boolean(component && typeof component === 'object'))
      .map((component) => {
        const candidate = component as AwisWorkspaceTopologyProjection['components'][number]
        return {
          key: sanitizeComponentKey(candidate.key),
          role: isString(candidate.role) ? candidate.role.slice(0, 80) : 'área do workspace',
          stack: normalizeStringList(candidate.stack, MAX_STARTUP_ITEMS),
          manifests: normalizeStringList(candidate.manifests, MAX_STARTUP_ITEMS).map(sanitizeRelativePath).filter(isString),
          docs: normalizeStringList(candidate.docs, MAX_STARTUP_ITEMS).map(sanitizeRelativePath).filter(isString),
          commands: Array.isArray(candidate.commands)
            ? uniqueCommands(candidate.commands
              .filter((command) => Boolean(command && typeof command === 'object' && isString(command.command)))
              .map((command) => ({
                command: command.command.slice(0, 180),
                kind: isString(command.kind) ? command.kind.slice(0, 32) : 'run',
                source: sanitizeRelativePath(command.source) || 'workspace',
              })))
              .slice(0, MAX_STARTUP_ITEMS)
            : [],
          confidence: normalizePercent(candidate.confidence),
        }
      })
      .filter((component) => component.key !== '')
      .slice(0, MAX_TOPOLOGY_COMPONENTS)
    : []
  if (components.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_topology_projection.v1',
    source: 'local_workspace_folder_map',
    root: {
      name: isString(value.root?.name) ? value.root.name.slice(0, 120) : 'workspace',
      is_git: value.root?.is_git === true,
      scan_truncated: value.root?.scan_truncated === true,
      files_seen: normalizeCount(value.root?.files_seen),
    },
    components,
    connections: Array.isArray(value.connections)
      ? value.connections
        .filter((connection) => Boolean(connection && typeof connection === 'object'))
        .map((connection) => ({
          from: sanitizeComponentKey(connection.from),
          to: sanitizeComponentKey(connection.to),
          reason: isString(connection.reason) ? connection.reason.slice(0, 140) : 'relação inferida pelo mapa local',
        }))
        .filter((connection) => connection.from !== '' && connection.to !== '' && connection.from !== connection.to)
        .slice(0, MAX_TOPOLOGY_CONNECTIONS)
      : [],
    execution_map: {
      test_commands: normalizeStringList(value.execution_map?.test_commands, MAX_STARTUP_ITEMS),
      build_commands: normalizeStringList(value.execution_map?.build_commands, MAX_STARTUP_ITEMS),
      dev_commands: normalizeStringList(value.execution_map?.dev_commands, MAX_STARTUP_ITEMS),
      check_commands: normalizeStringList(value.execution_map?.check_commands, MAX_STARTUP_ITEMS),
    },
    knowledge_map: normalizeTopologyKnowledgeMap(value.knowledge_map),
    safety: {
      raw_source_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeTopologyKnowledgeMap(raw: unknown): AwisWorkspaceTopologyProjection['knowledge_map'] {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Partial<AwisWorkspaceTopologyProjection['knowledge_map']>
    : {}
  return {
    load_first_docs: normalizeStringList(value.load_first_docs, MAX_STARTUP_ITEMS).map(sanitizeRelativePath).filter(isString),
    manifest_refs: normalizeStringList(value.manifest_refs, MAX_STARTUP_ITEMS).map(sanitizeRelativePath).filter(isString),
    command_sources: normalizeStringList(value.command_sources, MAX_STARTUP_ITEMS).map(sanitizeRelativePath).filter(isString),
    validation_entrypoints: normalizeStringList(value.validation_entrypoints, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    runtime_entrypoints: normalizeStringList(value.runtime_entrypoints, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    sensitive_zones: normalizeStringList(value.sensitive_zones, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    summarize_only: normalizeStringList(value.summarize_only, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
  }
}

function normalizeComponentMemoryProjection(raw: unknown): AwisWorkspaceComponentMemoryProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceComponentMemoryProjection>
  if (value.schema_version !== 'atlas.awis.workspace_component_memory_projection.v1') return null
  const maturities = new Set(['new', 'learning', 'stable', 'battle_tested'])
  const strongestComponents = Array.isArray(value.strongest_components)
    ? value.strongest_components
      .filter((component) => Boolean(component && typeof component === 'object' && isString(component.key)))
      .map((component) => ({
        key: sanitizeComponentKey(component.key),
        role: isString(component.role) ? sanitizeProviderSafeText(component.role).slice(0, 80) : 'área do workspace',
        maturity: maturities.has(String(component.maturity))
          ? component.maturity as AwisWorkspaceComponentMemoryProjection['strongest_components'][number]['maturity']
          : 'new',
        confidence: normalizePercent(component.confidence),
        stack: normalizeStringList(component.stack, MAX_STARTUP_ITEMS),
        load_first: normalizeStringList(component.load_first, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        commands: normalizeStringList(component.commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        docs: normalizeStringList(component.docs, MAX_STARTUP_ITEMS).map(sanitizeRelativePath).filter(isString),
        cautions: normalizeStringList(component.cautions, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        outcome_memory: normalizeComponentOutcomeMemory(component.outcome_memory),
        reuse_policy: {
          can_autoload: component.reuse_policy?.can_autoload === true,
          validate_before_execution: component.reuse_policy?.validate_before_execution === true,
          reason: isString(component.reuse_policy?.reason) ? sanitizeProviderSafeText(component.reuse_policy.reason).slice(0, 160) : 'política local de área',
        },
      }))
      .filter((component) => component.key !== '')
      .slice(0, MAX_TOPOLOGY_COMPONENTS)
    : []
  if (strongestComponents.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_component_memory_projection.v1',
    source: 'local_awis_component_memory_compiler',
    component_count: normalizeCount(value.component_count) || strongestComponents.length,
    strongest_components: strongestComponents,
    routing_hints: Array.isArray(value.routing_hints)
      ? value.routing_hints
        .filter((hint) => Boolean(hint && typeof hint === 'object' && isString(hint.signal)))
        .map((hint) => ({
          signal: sanitizeProviderSafeText(hint.signal).slice(0, 80),
          component: sanitizeComponentKey(hint.component),
          confidence: normalizePercent(hint.confidence),
        }))
        .filter((hint) => hint.signal !== '' && hint.component !== '')
        .slice(0, MAX_STARTUP_ITEMS * 2)
      : [],
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeComponentOutcomeMemory(raw: unknown): AwisWorkspaceComponentMemoryProjection['strongest_components'][number]['outcome_memory'] {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Partial<AwisWorkspaceComponentMemoryProjection['strongest_components'][number]['outcome_memory']>
    : {}
  return {
    success_count: normalizeCount(value.success_count),
    failure_count: normalizeCount(value.failure_count),
    context_pack_applied_count: normalizeCount(value.context_pack_applied_count),
    last_used_at: isString(value.last_used_at) ? value.last_used_at : null,
    trusted_commands: normalizeStringList(value.trusted_commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    caution_signals: normalizeStringList(value.caution_signals, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
  }
}

function normalizeSemanticIndexProjection(raw: unknown): AwisWorkspaceSemanticIndexProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceSemanticIndexProjection>
  if (value.schema_version !== 'atlas.awis.workspace_semantic_index_projection.v1') return null
  const allowedTaskKinds = new Set(['code_change', 'bug_fix', 'research', 'ops', 'design', 'analysis', 'unknown'])
  const queryAliases = Array.isArray(value.query_aliases)
    ? value.query_aliases
      .filter((alias) => Boolean(alias && typeof alias === 'object' && isString(alias.alias)))
      .map((alias) => ({
        alias: sanitizeSemanticAlias(alias.alias),
        intent: isString(alias.intent) ? sanitizeProviderSafeText(alias.intent).slice(0, 120) : 'intenção inferida',
        component_keys: normalizeStringList(alias.component_keys, 4).map(sanitizeComponentKey).filter(isString),
        task_kinds: normalizeStringList(alias.task_kinds, 5)
          .filter((taskKind) => allowedTaskKinds.has(taskKind)) as AwisWorkspaceTaskContextProjection['task_kind'][],
        load: normalizeStringList(alias.load, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        validate: normalizeStringList(alias.validate, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        confidence: normalizePercent(alias.confidence),
      }))
      .filter((alias) => alias.alias !== '' && alias.component_keys.length > 0)
      .slice(0, MAX_STARTUP_ITEMS * 3)
    : []
  const stackMap = Array.isArray(value.stack_map)
    ? value.stack_map
      .filter((stack) => Boolean(stack && typeof stack === 'object' && isString(stack.stack)))
      .map((stack) => ({
        stack: sanitizeSemanticAlias(stack.stack),
        component_keys: normalizeStringList(stack.component_keys, 5).map(sanitizeComponentKey).filter(isString),
        commands: normalizeStringList(stack.commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        docs: normalizeStringList(stack.docs, MAX_STARTUP_ITEMS).map(sanitizeRelativePath).filter(isString),
        confidence: normalizePercent(stack.confidence),
      }))
      .filter((stack) => stack.stack !== '' && stack.component_keys.length > 0)
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (queryAliases.length === 0 && stackMap.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_semantic_index_projection.v1',
    source: 'local_awis_semantic_indexer',
    readiness_score: normalizePercent(value.readiness_score),
    query_aliases: queryAliases,
    stack_map: stackMap,
    retrieval_policy: {
      load_full_when: normalizeStringList(value.retrieval_policy?.load_full_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      summarize_when: normalizeStringList(value.retrieval_policy?.summarize_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      revalidate_when: normalizeStringList(value.retrieval_policy?.revalidate_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      never_load_raw: normalizeStringList(value.retrieval_policy?.never_load_raw, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
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
  }
}

function normalizeImpactMapProjection(raw: unknown): AwisWorkspaceImpactMapProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceImpactMapProjection>
  if (value.schema_version !== 'atlas.awis.workspace_impact_map_projection.v1') return null
  const risks = new Set(['low', 'medium', 'high'])
  const componentImpacts = Array.isArray(value.component_impacts)
    ? value.component_impacts
      .filter((impact) => Boolean(impact && typeof impact === 'object' && isString(impact.component_key)))
      .map((impact) => ({
        component_key: sanitizeComponentKey(impact.component_key),
        change_signals: normalizeStringList(impact.change_signals, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        affected_components: normalizeStringList(impact.affected_components, MAX_STARTUP_ITEMS).map(sanitizeComponentKey).filter(isString),
        validation_cascade: normalizeStringList(impact.validation_cascade, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        risk: risks.has(String(impact.risk)) ? impact.risk as AwisWorkspaceImpactMapProjection['component_impacts'][number]['risk'] : 'low',
        reason: isString(impact.reason) ? sanitizeProviderSafeText(impact.reason).slice(0, 180) : 'impacto inferido localmente',
        confidence: normalizePercent(impact.confidence),
      }))
      .filter((impact) => impact.component_key !== '')
      .slice(0, MAX_TOPOLOGY_COMPONENTS)
    : []
  if (componentImpacts.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_impact_map_projection.v1',
    source: 'local_awis_impact_mapper',
    readiness_score: normalizePercent(value.readiness_score),
    component_impacts: componentImpacts,
    cross_workspace_impacts: Array.isArray(value.cross_workspace_impacts)
      ? value.cross_workspace_impacts
        .filter((impact) => Boolean(impact && typeof impact === 'object' && isString(impact.workspace_hint)))
        .map((impact) => ({
          workspace_hint: sanitizeProviderSafeText(impact.workspace_hint).slice(0, 120),
          trigger_components: normalizeStringList(impact.trigger_components, MAX_STARTUP_ITEMS).map(sanitizeComponentKey).filter(isString),
          reuse: normalizeStringList(impact.reuse, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          revalidate: normalizeStringList(impact.revalidate, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          confidence: normalizePercent(impact.confidence),
        }))
        .filter((impact) => impact.workspace_hint !== '')
        .slice(0, MAX_STARTUP_ITEMS)
      : [],
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeRelationProjection(raw: unknown): AwisWorkspaceRelationProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceRelationProjection>
  if (value.schema_version !== 'atlas.awis.workspace_relation_projection.v1') return null
  const related = Array.isArray(value.related_workspaces)
    ? value.related_workspaces
      .filter((workspace) => Boolean(workspace && typeof workspace === 'object'))
      .map((workspace) => ({
        workspace_hint: providerSafeWorkspaceHint({
          workspaceKey: workspace.workspace_hint,
          workspaceName: workspace.workspace_hint,
          rootPath: '',
        } as AwisWorkspaceMemorySnapshot),
        overlap_score: normalizePercent(workspace.overlap_score),
        shared_signals: normalizeStringList(workspace.shared_signals, MAX_STARTUP_ITEMS),
        shared_languages: normalizeStringList(workspace.shared_languages, MAX_STARTUP_ITEMS),
        shared_commands: normalizeStringList(workspace.shared_commands, MAX_STARTUP_ITEMS),
        shared_context_gold: normalizeContextGoldLabels(workspace.shared_context_gold),
        shared_validation_plans: normalizeStringList(workspace.shared_validation_plans, MAX_STARTUP_ITEMS)
          .map(sanitizeProviderSafeText)
          .filter(isString),
        shared_recovery_patterns: normalizeStringList(workspace.shared_recovery_patterns, MAX_STARTUP_ITEMS)
          .map(sanitizeProviderSafeText)
          .filter(isString),
        shared_spaces: normalizeStringList(workspace.shared_spaces, MAX_STARTUP_ITEMS)
          .map(sanitizeProviderSafeText)
          .filter(isString),
        shared_space_brain: normalizeStringList(workspace.shared_space_brain, MAX_STARTUP_ITEMS)
          .map(sanitizeProviderSafeText)
          .filter(isString),
        shared_live_memory: normalizeStringList(workspace.shared_live_memory, MAX_STARTUP_ITEMS)
          .map(sanitizeProviderSafeText)
          .filter(isString),
        shared_priority_load: normalizeStringList(workspace.shared_priority_load, MAX_STARTUP_ITEMS)
          .map(sanitizeProviderSafeText)
          .filter(isString),
        recommended_transfer: normalizeStringList(workspace.recommended_transfer, MAX_STARTUP_ITEMS),
      }))
      .filter((workspace) => workspace.workspace_hint !== '' && workspace.overlap_score > 0)
      .slice(0, MAX_RELATED_WORKSPACES)
    : []
  if (related.length === 0) return null
  const transferMatrix = Array.isArray(value.transfer_matrix)
    ? value.transfer_matrix
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.workspace_hint)))
      .map((item) => ({
        workspace_hint: providerSafeWorkspaceHint({
          workspaceKey: item.workspace_hint,
          workspaceName: item.workspace_hint,
          rootPath: '',
        } as AwisWorkspaceMemorySnapshot),
        reuse: normalizeStringList(item.reuse, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        revalidate: normalizeStringList(item.revalidate, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        do_not_transfer: normalizeStringList(item.do_not_transfer, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        confidence: normalizePercent(item.confidence),
      }))
      .filter((item) => item.workspace_hint !== '')
      .slice(0, MAX_RELATED_WORKSPACES)
    : related.map((workspace) => ({
        workspace_hint: workspace.workspace_hint,
        reuse: workspace.recommended_transfer,
        revalidate: [
          ...workspace.shared_commands.map((item) => `validar comando antes de aplicar:${item}`),
          ...workspace.shared_validation_plans.map((item) => `confirmar validação transferida:${item}`),
          ...workspace.shared_recovery_patterns.map((item) => `aplicar recovery só com evidência local:${item}`),
          ...workspace.shared_spaces.map((item) => `revalidar Space no workspace atual:${item}`),
          ...workspace.shared_space_brain.map((item) => `revalidar Space Brain no workspace atual:${item}`),
          ...workspace.shared_live_memory.map((item) => `confirmar memória viva local:${item}`),
          ...workspace.shared_priority_load.map((item) => `confirmar prioridade local:${item}`),
        ],
        do_not_transfer: ['conteúdo bruto de conversas', 'paths absolutos', 'ids internos'],
        confidence: workspace.overlap_score,
      }))
  const relationships = new Set(['shared_stack', 'shared_command', 'shared_context', 'shared_recovery'])
  const connectionContracts = Array.isArray(value.connection_contracts)
    ? value.connection_contracts
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.workspace_hint)))
      .map((item) => ({
        workspace_hint: providerSafeWorkspaceHint({
          workspaceKey: item.workspace_hint,
          workspaceName: item.workspace_hint,
          rootPath: '',
        } as AwisWorkspaceMemorySnapshot),
        relationship: relationships.has(String(item.relationship))
          ? item.relationship as AwisWorkspaceRelationProjection['connection_contracts'][number]['relationship']
          : 'shared_stack',
        load_when: normalizeStringList(item.load_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        reuse: normalizeStringList(item.reuse, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        validate: normalizeStringList(item.validate, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        never_transfer: normalizeStringList(item.never_transfer, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        confidence: normalizePercent(item.confidence),
      }))
      .filter((item) => item.workspace_hint !== '')
      .slice(0, MAX_RELATED_WORKSPACES)
    : transferMatrix.map((item) => ({
        workspace_hint: item.workspace_hint,
        relationship: item.reuse.some((reuse) => reuse.startsWith('ouro:'))
          ? 'shared_context' as const
          : item.reuse.some((reuse) => reuse.startsWith('recovery:'))
            ? 'shared_recovery' as const
            : item.reuse.some((reuse) => reuse.startsWith('comando:') || reuse.startsWith('validação:'))
              ? 'shared_command' as const
              : 'shared_stack' as const,
        load_when: ['stack compatível aparece no mapa local'],
        reuse: item.reuse,
        validate: item.revalidate,
        never_transfer: item.do_not_transfer,
        confidence: item.confidence,
      }))
  return {
    schema_version: 'atlas.awis.workspace_relation_projection.v1',
    source: 'local_provider_safe_workspace_memories',
    workspace_count: normalizeCount(value.workspace_count),
    current_workspace_seen: value.current_workspace_seen === true,
    related_workspaces: related,
    transfer_matrix: transferMatrix,
    connection_contracts: connectionContracts,
    transfer_policy: {
      privacy_level: 'provider_safe_hints',
      raw_workspace_names_returned: false,
      raw_paths_returned: false,
      raw_source_returned: false,
      raw_conversation_returned: false,
      apply_only_when_stack_matches: true,
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeLivingGraphProjection(raw: unknown): AwisWorkspaceLivingGraphProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceLivingGraphProjection>
  if (value.schema_version !== 'atlas.awis.workspace_living_graph_projection.v1') return null
  const kinds = new Set(['component', 'command', 'space', 'artifact', 'task_memory', 'related_workspace', 'handoff'])
  const nodes = Array.isArray(value.nodes)
    ? value.nodes
      .filter((node) => Boolean(node && typeof node === 'object' && isString(node.label)))
      .map((node) => {
        const kind = kinds.has(String(node.kind))
          ? node.kind as AwisWorkspaceLivingGraphProjection['nodes'][number]['kind']
          : 'artifact'
        const label = sanitizeProviderSafeText(node.label).slice(0, 160)
        return {
          key: isString(node.key) ? sanitizeComponentKey(node.key).slice(0, 96) : `${kind}:${sanitizeComponentKey(label)}`,
          kind,
          label,
          role: isString(node.role) ? sanitizeProviderSafeText(node.role).slice(0, 96) : kind,
          confidence: normalizePercent(node.confidence),
          evidence: normalizeStringList(node.evidence, 4).map(sanitizeProviderSafeText).filter(isString),
        }
      })
      .filter((node) => node.key !== '' && node.label !== '')
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (nodes.length === 0) return null
  const allowedKeys = new Set(nodes.map((node) => node.key))
  const edges = Array.isArray(value.edges)
    ? value.edges
      .filter((edge) => Boolean(edge && typeof edge === 'object' && isString(edge.from) && isString(edge.to)))
      .map((edge) => ({
        from: sanitizeComponentKey(edge.from).slice(0, 96),
        to: sanitizeComponentKey(edge.to).slice(0, 96),
        reason: isString(edge.reason) ? sanitizeProviderSafeText(edge.reason).slice(0, 140) : 'contexto relacionado',
        strength: normalizePercent(edge.strength),
      }))
      .filter((edge) => allowedKeys.has(edge.from) && allowedKeys.has(edge.to) && edge.from !== edge.to)
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  return {
    schema_version: 'atlas.awis.workspace_living_graph_projection.v1',
    source: 'local_awis_living_graph_compiler',
    readiness_score: normalizePercent(value.readiness_score),
    nodes,
    edges,
    golden_path: normalizeStringList(value.golden_path, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    autopilot_hints: {
      before_send: normalizeStringList(value.autopilot_hints?.before_send, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      after_send: normalizeStringList(value.autopilot_hints?.after_send, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      on_startup: normalizeStringList(value.autopilot_hints?.on_startup, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
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
  }
}

function normalizeContextKernelProjection(raw: unknown): AwisWorkspaceContextKernelProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceContextKernelProjection>
  if (value.schema_version !== 'atlas.awis.workspace_context_kernel_projection.v1') return null
  const kinds = new Set(['space', 'component', 'command', 'artifact', 'task_memory', 'relation', 'handoff', 'session_gold'])
  const priorityLoad = Array.isArray(value.priority_load)
    ? value.priority_load
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.label)))
      .map((item) => ({
        kind: kinds.has(String(item.kind))
          ? item.kind as AwisWorkspaceContextKernelProjection['priority_load'][number]['kind']
          : 'session_gold',
        label: sanitizeProviderSafeText(item.label).slice(0, 160),
        reason: isString(item.reason) ? sanitizeProviderSafeText(item.reason).slice(0, 160) : 'contexto prioritário',
        confidence: normalizePercent(item.confidence),
      }))
      .filter((item) => item.label !== '')
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (priorityLoad.length === 0) return null
  const mode = value.budget?.mode === 'deep' || value.budget?.mode === 'balanced' || value.budget?.mode === 'lean'
    ? value.budget.mode
    : 'lean'
  return {
    schema_version: 'atlas.awis.workspace_context_kernel_projection.v1',
    source: 'local_awis_context_kernel_compiler',
    readiness_score: normalizePercent(value.readiness_score),
    budget: {
      mode,
      max_context_items: Math.max(1, Math.min(MAX_STARTUP_ITEMS, normalizeCount(value.budget?.max_context_items))),
      reason: isString(value.budget?.reason) ? sanitizeProviderSafeText(value.budget.reason).slice(0, 160) : 'carregar contexto AWIS prioritário',
    },
    priority_load: priorityLoad,
    compression_plan: {
      send_full: normalizeStringList(value.compression_plan?.send_full, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      summarize: normalizeStringList(value.compression_plan?.summarize, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      omit: normalizeStringList(value.compression_plan?.omit, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    validation_plan: {
      commands: normalizeStringList(value.validation_plan?.commands, MAX_STARTUP_ITEMS),
      confidence_floor: normalizePercent(value.validation_plan?.confidence_floor),
      requires_human_confirmation: value.validation_plan?.requires_human_confirmation === true,
    },
    learning_contract: {
      capture_outcome: true,
      update_space_pack: value.learning_contract?.update_space_pack === true,
      promote_artifact_after_success: value.learning_contract?.promote_artifact_after_success === true,
      refresh_folder_map_on_drift: value.learning_contract?.refresh_folder_map_on_drift === true,
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
  }
}

function normalizeSelfImprovementProjection(raw: unknown): AwisWorkspaceSelfImprovementProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceSelfImprovementProjection>
  if (value.schema_version !== 'atlas.awis.workspace_self_improvement_projection.v1') return null
  const actions = new Set(['promote_command', 'demote_context', 'refresh_folder_map', 'update_space_pack', 'preserve_artifact', 'transfer_learning', 'record_outcome'])
  const priorities = new Set(['high', 'medium', 'low'])
  const queue = Array.isArray(value.improvement_queue)
    ? value.improvement_queue
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.label)))
      .map((item) => ({
        action: actions.has(String(item.action)) ? item.action as AwisWorkspaceSelfImprovementProjection['improvement_queue'][number]['action'] : 'record_outcome',
        label: sanitizeProviderSafeText(item.label).slice(0, 160),
        reason: isString(item.reason) ? sanitizeProviderSafeText(item.reason).slice(0, 160) : 'melhorar próxima sessão AWIS',
        priority: priorities.has(String(item.priority)) ? item.priority as AwisWorkspaceSelfImprovementProjection['improvement_queue'][number]['priority'] : 'medium',
        evidence: normalizeStringList(item.evidence, 4).map(sanitizeProviderSafeText).filter(isString),
      }))
      .filter((item) => item.label !== '')
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (queue.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_self_improvement_projection.v1',
    source: 'local_awis_self_improvement_compiler',
    readiness_score: normalizePercent(value.readiness_score),
    improvement_queue: queue,
    promotion_policy: {
      promote_when: normalizeStringList(value.promotion_policy?.promote_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      demote_when: normalizeStringList(value.promotion_policy?.demote_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      transfer_when: normalizeStringList(value.promotion_policy?.transfer_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    next_review: {
      metrics: normalizeStringList(value.next_review?.metrics, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      validate_with: normalizeStringList(value.next_review?.validate_with, MAX_STARTUP_ITEMS),
      human_confirmation_required: value.next_review?.human_confirmation_required === true,
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
  }
}

function normalizeRetentionProjection(raw: unknown): AwisWorkspaceRetentionProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceRetentionProjection>
  if (value.schema_version !== 'atlas.awis.workspace_retention_projection.v1') return null
  const keepHot = normalizeStringList(value.lifecycle?.keep_hot, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const promote = normalizeStringList(value.lifecycle?.promote, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const revalidate = normalizeStringList(value.lifecycle?.revalidate, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const drop = normalizeStringList(value.lifecycle?.drop_or_summarize, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  if (keepHot.length === 0 && promote.length === 0 && revalidate.length === 0 && drop.length === 0) return null
  const mode = value.policy?.mode === 'aggressive' || value.policy?.mode === 'conservative' || value.policy?.mode === 'balanced'
    ? value.policy.mode
    : 'balanced'
  return {
    schema_version: 'atlas.awis.workspace_retention_projection.v1',
    source: 'local_awis_retention_governor',
    readiness_score: normalizePercent(value.readiness_score),
    policy: {
      mode,
      reason: isString(value.policy?.reason) ? sanitizeProviderSafeText(value.policy.reason).slice(0, 160) : 'retenção AWIS provider-safe',
      max_hot_items: Math.max(1, Math.min(MAX_STARTUP_ITEMS, normalizeCount(value.policy?.max_hot_items))),
    },
    lifecycle: {
      keep_hot: keepHot,
      promote,
      revalidate,
      drop_or_summarize: drop,
    },
    stale_signals: normalizeStringList(value.stale_signals, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
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
  }
}

function normalizeMemoryConsolidationProjection(raw: unknown): AwisWorkspaceMemoryConsolidationProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceMemoryConsolidationProjection>
  if (value.schema_version !== 'atlas.awis.workspace_memory_consolidation_projection.v1') return null
  const modes = new Set(['strict', 'balanced', 'expansive'])
  const nextSessionSeed = normalizeStringList(value.next_session_seed, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const promote = normalizeStringList(value.consolidate?.promote_to_gold, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const rehearse = normalizeStringList(value.consolidate?.rehearse_next, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const archive = normalizeStringList(value.consolidate?.archive_as_artifact, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const summarize = normalizeStringList(value.consolidate?.summarize_only, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const revalidate = normalizeStringList(value.consolidate?.revalidate, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const neverPromote = normalizeStringList(value.consolidate?.never_promote, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  if (nextSessionSeed.length === 0 && promote.length === 0 && rehearse.length === 0 && archive.length === 0 && summarize.length === 0 && revalidate.length === 0 && neverPromote.length === 0) return null
  const mode = modes.has(String(value.compaction_policy?.mode))
    ? value.compaction_policy?.mode as AwisWorkspaceMemoryConsolidationProjection['compaction_policy']['mode']
    : 'balanced'
  return {
    schema_version: 'atlas.awis.workspace_memory_consolidation_projection.v1',
    source: 'local_awis_memory_consolidator',
    readiness_score: normalizePercent(value.readiness_score),
    compaction_policy: {
      mode,
      reason: isString(value.compaction_policy?.reason) ? sanitizeProviderSafeText(value.compaction_policy.reason).slice(0, 180) : 'consolidação AWIS provider-safe',
      max_seed_items: Math.max(1, Math.min(MAX_STARTUP_ITEMS, normalizeCount(value.compaction_policy?.max_seed_items))),
    },
    next_session_seed: nextSessionSeed,
    consolidate: {
      promote_to_gold: promote,
      rehearse_next: rehearse,
      archive_as_artifact: archive,
      summarize_only: summarize,
      revalidate,
      never_promote: neverPromote,
    },
    learning_loop: {
      capture_after_send: normalizeStringList(value.learning_loop?.capture_after_send, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      recalibrate_after_failure: normalizeStringList(value.learning_loop?.recalibrate_after_failure, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      refresh_when: normalizeStringList(value.learning_loop?.refresh_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
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
  }
}

function normalizeMemoryFreshnessProjection(raw: unknown): AwisWorkspaceMemoryFreshnessProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceMemoryFreshnessProjection>
  if (value.schema_version !== 'atlas.awis.workspace_memory_freshness_projection.v1') return null
  const state: AwisWorkspaceMemoryFreshnessProjection['state'] =
    value.state === 'fresh' || value.state === 'warm' || value.state === 'stale' || value.state === 'cold'
      ? value.state
      : 'cold'
  const hot = normalizeStringList(value.evidence?.hot, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const revalidate = normalizeStringList(value.evidence?.revalidate, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const missing = normalizeStringList(value.evidence?.missing, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  if (hot.length === 0 && revalidate.length === 0 && missing.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_memory_freshness_projection.v1',
    source: 'local_awis_memory_freshness_guard',
    freshness_score: normalizePercent(value.freshness_score),
    state,
    scan_age_days: typeof value.scan_age_days === 'number' ? normalizeCount(value.scan_age_days) : null,
    interaction_age_days: typeof value.interaction_age_days === 'number' ? normalizeCount(value.interaction_age_days) : null,
    evidence: {
      hot,
      revalidate,
      missing,
    },
    promotion_gate: {
      can_promote_commands: value.promotion_gate?.can_promote_commands === true,
      can_promote_spaces: value.promotion_gate?.can_promote_spaces === true,
      required_before_promotion: normalizeStringList(value.promotion_gate?.required_before_promotion, MAX_STARTUP_ITEMS)
        .map(sanitizeProviderSafeText)
        .filter(isString),
    },
    next_refresh: {
      actions: normalizeStringList(value.next_refresh?.actions, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      reason: isString(value.next_refresh?.reason) ? sanitizeProviderSafeText(value.next_refresh.reason).slice(0, 160) : 'revalidar frescor antes de promover contexto',
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
  }
}

function normalizeStartupOrchestrationProjection(raw: unknown): AwisWorkspaceStartupOrchestrationProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceStartupOrchestrationProjection>
  if (value.schema_version !== 'atlas.awis.workspace_startup_orchestration_projection.v1') return null
  const steps = new Set(['restore', 'load', 'validate', 'compose', 'learn'])
  const sources = new Set(['space', 'artifact', 'kernel', 'retention', 'gold', 'graph', 'memory'])
  const startupSequence = Array.isArray(value.startup_sequence)
    ? value.startup_sequence
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.label)))
      .map((item) => ({
        step: steps.has(String(item.step)) ? item.step as AwisWorkspaceStartupOrchestrationProjection['startup_sequence'][number]['step'] : 'load',
        label: sanitizeProviderSafeText(item.label).slice(0, 180),
        source: sources.has(String(item.source)) ? item.source as AwisWorkspaceStartupOrchestrationProjection['startup_sequence'][number]['source'] : 'memory',
        required: item.required === true,
      }))
      .filter((item) => item.label !== '')
      .slice(0, MAX_STARTUP_ITEMS * 2)
    : []
  const launchMode = value.launch_mode === 'deep' || value.launch_mode === 'warm' || value.launch_mode === 'guarded'
    ? value.launch_mode
    : 'guarded'
  if (startupSequence.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_startup_orchestration_projection.v1',
    source: 'local_awis_startup_orchestrator',
    readiness_score: normalizePercent(value.readiness_score),
    launch_mode: launchMode,
    startup_sequence: startupSequence,
    context_budget: {
      max_items: Math.max(1, Math.min(MAX_STARTUP_ITEMS, normalizeCount(value.context_budget?.max_items))),
      prefer_summary: value.context_budget?.prefer_summary !== false,
      reason: isString(value.context_budget?.reason) ? sanitizeProviderSafeText(value.context_budget.reason).slice(0, 180) : 'partida AWIS governada',
    },
    revalidation_gate: {
      required_before_send: normalizeStringList(value.revalidation_gate?.required_before_send, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      can_autoload: normalizeStringList(value.revalidation_gate?.can_autoload, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      needs_human_confirmation: value.revalidation_gate?.needs_human_confirmation === true,
    },
    learning_loop: {
      capture_outcome: true,
      update_memory: true,
      update_space_pack: value.learning_loop?.update_space_pack === true,
      preserve_artifact_after_success: value.learning_loop?.preserve_artifact_after_success === true,
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
  }
}

function normalizePreflightProjection(raw: unknown): AwisWorkspacePreflightProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspacePreflightProjection>
  if (value.schema_version !== 'atlas.awis.workspace_preflight_projection.v1') return null
  const gates = new Set(['context', 'evidence', 'impact', 'validation', 'human', 'learning'])
  const statuses = new Set(['ready', 'warn', 'blocked'])
  const normalizedGates = Array.isArray(value.gates)
    ? value.gates
      .filter((gate) => Boolean(gate && typeof gate === 'object' && isString(gate.label)))
      .map((gate) => ({
        gate: gates.has(String(gate.gate)) ? gate.gate as AwisWorkspacePreflightProjection['gates'][number]['gate'] : 'context',
        status: statuses.has(String(gate.status)) ? gate.status as AwisWorkspacePreflightProjection['gates'][number]['status'] : 'warn',
        label: sanitizeProviderSafeText(gate.label).slice(0, 180),
        required: gate.required === true,
        evidence: normalizeStringList(gate.evidence, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      }))
      .filter((gate) => gate.label !== '')
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (normalizedGates.length === 0) return null
  const mode: AwisWorkspacePreflightProjection['mode'] =
    value.mode === 'ready' || value.mode === 'guarded' || value.mode === 'blocked'
      ? value.mode
      : normalizedGates.some((gate) => gate.status === 'blocked')
        ? 'blocked'
        : normalizedGates.some((gate) => gate.status === 'warn')
          ? 'guarded'
          : 'ready'
  return {
    schema_version: 'atlas.awis.workspace_preflight_projection.v1',
    source: 'local_awis_preflight_compiler',
    readiness_score: normalizePercent(value.readiness_score),
    mode,
    gates: normalizedGates,
    execution_lanes: {
      before_send: normalizeStringList(value.execution_lanes?.before_send, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      before_execution: normalizeStringList(value.execution_lanes?.before_execution, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      after_success: normalizeStringList(value.execution_lanes?.after_success, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      after_failure: normalizeStringList(value.execution_lanes?.after_failure, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    promotion_contract: {
      promote_when: normalizeStringList(value.promotion_contract?.promote_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      demote_when: normalizeStringList(value.promotion_contract?.demote_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      preserve_as_artifact: value.promotion_contract?.preserve_as_artifact === true,
      update_space_pack: value.promotion_contract?.update_space_pack === true,
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
  }
}

function normalizeWorkspaceTwinProjection(raw: unknown): AwisWorkspaceTwinProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceTwinProjection>
  if (value.schema_version !== 'atlas.awis.workspace_twin_projection.v1') return null
  const genome = {
    stack: normalizeStringList(value.genome?.stack, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    apps: normalizeStringList(value.genome?.apps, MAX_TOPOLOGY_COMPONENTS).map(sanitizeComponentKey).filter(isString),
    owner_docs: normalizeStringList(value.genome?.owner_docs, MAX_STARTUP_ITEMS).map(sanitizeRelativePath).filter(isString),
    commands: normalizeStringList(value.genome?.commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    risk_zones: normalizeStringList(value.genome?.risk_zones, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    test_families: normalizeStringList(value.genome?.test_families, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
  }
  const components = Array.isArray(value.live_map?.components)
    ? value.live_map.components
      .filter((component) => Boolean(component && typeof component === 'object' && isString(component.key)))
      .map((component) => ({
        key: sanitizeComponentKey(component.key),
        role: isString(component.role) ? sanitizeProviderSafeText(component.role).slice(0, 120) : 'workspace area',
        maturity: component.maturity === 'battle_tested' || component.maturity === 'stable' || component.maturity === 'learning' || component.maturity === 'new'
          ? component.maturity
          : 'learning',
        confidence: normalizePercent(component.confidence),
      }))
      .filter((component) => component.key !== '')
      .slice(0, MAX_TOPOLOGY_COMPONENTS)
    : []
  if (genome.apps.length === 0 && components.length === 0) return null
  const hashes = {
    genome_hash: isString(value.hashes?.genome_hash) ? sanitizeProviderSafeText(value.hashes.genome_hash).slice(0, 80) : `twin-${stableStringHash(JSON.stringify(genome))}`,
    code_map_hash: isString(value.hashes?.code_map_hash) ? sanitizeProviderSafeText(value.hashes.code_map_hash).slice(0, 80) : `twin-${stableStringHash(JSON.stringify(components))}`,
    command_registry_hash: isString(value.hashes?.command_registry_hash) ? sanitizeProviderSafeText(value.hashes.command_registry_hash).slice(0, 80) : `twin-${stableStringHash(JSON.stringify(genome.commands))}`,
    risk_map_hash: isString(value.hashes?.risk_map_hash) ? sanitizeProviderSafeText(value.hashes.risk_map_hash).slice(0, 80) : `twin-${stableStringHash(JSON.stringify(genome.risk_zones))}`,
  }
  return {
    schema_version: 'atlas.awis.workspace_twin_projection.v1',
    source: 'local_awis_workspace_twin_compiler',
    workspace_id: isString(value.workspace_id) ? sanitizeComponentKey(value.workspace_id) : 'workspace',
    readiness_score: normalizePercent(value.readiness_score),
    stale: value.stale === true,
    hashes,
    genome,
    live_map: {
      components,
      connections: normalizeStringList(value.live_map?.connections, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      fragile_areas: normalizeStringList(value.live_map?.fragile_areas, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    context_autopilot: {
      load_first: normalizeStringList(value.context_autopilot?.load_first, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      summarize: normalizeStringList(value.context_autopilot?.summarize, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      validate: normalizeStringList(value.context_autopilot?.validate, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      avoid: normalizeStringList(value.context_autopilot?.avoid, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      reason: isString(value.context_autopilot?.reason) ? sanitizeProviderSafeText(value.context_autopilot.reason).slice(0, 180) : 'twin AWIS provider-safe',
    },
    learning_loop: {
      learned_from_outcomes: normalizeStringList(value.learning_loop?.learned_from_outcomes, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      next_refresh: normalizeStringList(value.learning_loop?.next_refresh, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      reuse_next_session: normalizeStringList(value.learning_loop?.reuse_next_session, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
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
  }
}

function normalizeExecutionDoctrineProjection(raw: unknown): AwisWorkspaceExecutionDoctrineProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceExecutionDoctrineProjection>
  if (value.schema_version !== 'atlas.awis.workspace_execution_doctrine_projection.v1') return null
  const driverNames = new Set(['TDD', 'CDD', 'FDD', 'UXD', 'RiskDD', 'DocsDD', 'PerformanceDD', 'SecurityDD', 'EvidenceDD'])
  const taskKinds = new Set(['code_change', 'bug_fix', 'research', 'ops', 'design', 'analysis', 'unknown'])
  const maturities = new Set(['new', 'learning', 'stable', 'battle_tested'])
  const doctrineDrivers = Array.isArray(value.doctrine_drivers)
    ? value.doctrine_drivers
      .filter((driver) => Boolean(driver && typeof driver === 'object' && driverNames.has(String(driver.name))))
      .map((driver) => ({
        name: driver.name as AwisWorkspaceExecutionDoctrineProjection['doctrine_drivers'][number]['name'],
        applies_to: normalizeStringList(driver.applies_to, MAX_STARTUP_ITEMS)
          .filter((task): task is AwisWorkspaceTaskContextProjection['task_kind'] => taskKinds.has(task)),
        required: driver.required === true,
        gate: isString(driver.gate) ? sanitizeProviderSafeText(driver.gate).slice(0, 160) : 'validar antes de executar',
        reason: isString(driver.reason) ? sanitizeProviderSafeText(driver.reason).slice(0, 160) : 'doutrina operacional AWIS',
      }))
      .filter((driver) => driver.applies_to.length > 0)
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (doctrineDrivers.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_execution_doctrine_projection.v1',
    source: 'local_awis_execution_doctrine_compiler',
    maturity: maturities.has(String(value.maturity))
      ? value.maturity as AwisWorkspaceExecutionDoctrineProjection['maturity']
      : 'new',
    doctrine_drivers: doctrineDrivers,
    preflight: {
      required_before_execution: normalizeStringList(value.preflight?.required_before_execution, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      human_responsibility: normalizeStringList(value.preflight?.human_responsibility, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      automation: normalizeStringList(value.preflight?.automation, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    command_policy: {
      trusted: normalizeStringList(value.command_policy?.trusted, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      revalidate: normalizeStringList(value.command_policy?.revalidate, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      avoid: normalizeStringList(value.command_policy?.avoid, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    learning_contract: {
      record_outcome: true,
      attach_component_keys: true,
      promote_after_success: normalizeStringList(value.learning_contract?.promote_after_success, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      demote_after_failure: normalizeStringList(value.learning_contract?.demote_after_failure, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
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
  }
}

function normalizeProviderStrategyProjection(raw: unknown): AwisWorkspaceProviderStrategyProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceProviderStrategyProjection>
  if (value.schema_version !== 'atlas.awis.workspace_provider_strategy_projection.v1') return null
  const policies = new Set(['prefer', 'use_when_matched', 'revalidate', 'avoid'])
  const preferred = Array.isArray(value.preferred)
    ? value.preferred
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.provider)))
      .map((item) => ({
        provider: sanitizeProviderSafeText(item.provider).slice(0, 80),
        model: isString(item.model) ? sanitizeProviderSafeText(item.model).slice(0, 96) : null,
        policy: policies.has(String(item.policy)) ? item.policy as AwisWorkspaceProviderStrategyProjection['preferred'][number]['policy'] : 'use_when_matched',
        success_count: normalizeCount(item.success_count),
        failure_count: normalizeCount(item.failure_count),
        success_rate: typeof item.success_rate === 'number' ? normalizePercent(item.success_rate) : null,
        avg_latency_ms: typeof item.avg_latency_ms === 'number' ? Math.max(0, Math.round(item.avg_latency_ms)) : null,
        task_kinds: normalizeStringList(item.task_kinds, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        reason: isString(item.reason) ? sanitizeProviderSafeText(item.reason).slice(0, 160) : 'histórico provider-safe',
      }))
      .filter((item) => item.provider !== '')
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (preferred.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_provider_strategy_projection.v1',
    source: 'local_awis_provider_strategy_compiler',
    provider_count: normalizeCount(value.provider_count) || preferred.length,
    preferred,
    fallback_order: normalizeStringList(value.fallback_order, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    caution_signals: normalizeStringList(value.caution_signals, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    learning_contract: {
      record_provider: true,
      record_model: true,
      record_latency: true,
      promote_after_successes: normalizeCount(value.learning_contract?.promote_after_successes) || 2,
      demote_after_failures: normalizeCount(value.learning_contract?.demote_after_failures) || 2,
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
  }
}

function normalizeTaskRouterProjection(raw: unknown): AwisWorkspaceTaskRouterProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceTaskRouterProjection>
  if (value.schema_version !== 'atlas.awis.workspace_task_router_projection.v1') return null
  const surfaces = new Set(['single_conversation', 'space_first', 'side_by_side'])
  const policies = new Set(['prefer', 'use_when_matched', 'revalidate'])
  const routes = Array.isArray(value.routes)
    ? value.routes
      .filter((item) => Boolean(item && typeof item === 'object'))
      .map((item) => {
        const taskKind = normalizeTaskKind(item.task_kind) ?? 'unknown'
        const suggestedSurface = surfaces.has(String(item.suggested_surface))
          ? item.suggested_surface as AwisWorkspaceTaskRouterProjection['routes'][number]['suggested_surface']
          : 'single_conversation'
        return {
          task_kind: taskKind,
          route_key: sanitizeRouteKey(item.route_key) ?? `task:${taskKind}`,
          confidence: normalizePercent(item.confidence),
          success_count: normalizeCount(item.success_count),
          failure_count: normalizeCount(item.failure_count),
          success_rate: typeof item.success_rate === 'number' ? normalizePercent(item.success_rate) : null,
          last_used_at: isString(item.last_used_at) ? item.last_used_at : null,
          policy: policies.has(String(item.policy)) ? item.policy as AwisWorkspaceTaskRouterProjection['routes'][number]['policy'] : 'use_when_matched',
          suggested_surface: suggestedSurface,
          load_first: normalizeStringList(item.load_first, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          use_spaces: normalizeStringList(item.use_spaces, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          use_components: normalizeStringList(item.use_components, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          use_artifacts: normalizeStringList(item.use_artifacts, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          validate_with: normalizeStringList(item.validate_with, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          avoid_loading: normalizeStringList(item.avoid_loading, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          intent_signals: normalizeStringList(item.intent_signals, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          evidence_plan: {
            load: normalizeStringList(item.evidence_plan?.load, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
            verify: normalizeStringList(item.evidence_plan?.verify, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
            preserve: normalizeStringList(item.evidence_plan?.preserve, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
            learn: normalizeStringList(item.evidence_plan?.learn, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          },
          automation_hooks: {
            before_send: normalizeStringList(item.automation_hooks?.before_send, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
            after_success: normalizeStringList(item.automation_hooks?.after_success, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
            after_failure: normalizeStringList(item.automation_hooks?.after_failure, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          },
          reason: isString(item.reason) ? sanitizeProviderSafeText(item.reason).slice(0, 160) : 'rota AWIS provider-safe',
        }
      })
      .filter((item) => item.task_kind !== 'unknown' && (item.load_first.length > 0 || item.validate_with.length > 0 || item.use_spaces.length > 0))
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (routes.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_task_router_projection.v1',
    source: 'local_awis_task_router_compiler',
    route_count: normalizeCount(value.route_count) || routes.length,
    routes,
    fallback_route: {
      load_first: normalizeStringList(value.fallback_route?.load_first, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      validate_with: normalizeStringList(value.fallback_route?.validate_with, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      avoid_loading: normalizeStringList(value.fallback_route?.avoid_loading, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      reason: isString(value.fallback_route?.reason) ? sanitizeProviderSafeText(value.fallback_route.reason).slice(0, 160) : 'fallback AWIS provider-safe',
    },
    learning_contract: {
      record_task_kind: true,
      record_selected_route: true,
      promote_route_after_successes: normalizeCount(value.learning_contract?.promote_route_after_successes) || 2,
      revalidate_route_after_failures: normalizeCount(value.learning_contract?.revalidate_route_after_failures) || 1,
    },
    safety: {
      raw_user_message_included: false,
      raw_conversation_included: false,
      raw_message_content_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeWorkspaceMeshProjection(raw: unknown): AwisWorkspaceMeshProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceMeshProjection>
  if (value.schema_version !== 'atlas.awis.workspace_mesh_projection.v1') return null
  const relationships = new Set(['shared_stack', 'shared_command', 'shared_context', 'shared_recovery', 'local_component', 'space_context', 'artifact_replay'])
  const routes = Array.isArray(value.routes)
    ? value.routes
      .filter((route) => Boolean(route && typeof route === 'object' && isString(route.workspace_hint)))
      .map((route) => {
        const workspaceHint = sanitizeProviderSafeText(String(route.workspace_hint)).slice(0, 80)
        const relationship = relationships.has(String(route.relationship))
          ? route.relationship as AwisWorkspaceMeshProjection['routes'][number]['relationship']
          : 'local_component'
        const normalized = {
          workspace_hint: workspaceHint,
          relationship,
          load_when: normalizeStringList(route.load_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          reuse: normalizeStringList(route.reuse, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          validate_with: normalizeStringList(route.validate_with, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          never_transfer: normalizeStringList(route.never_transfer, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          linked_components: normalizeStringList(route.linked_components, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          linked_spaces: normalizeStringList(route.linked_spaces, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
          confidence: normalizePercent(route.confidence),
        }
        return {
          route_id: isString(route.route_id) ? sanitizeProviderSafeText(route.route_id).slice(0, 80) : `mesh-${stableStringHash(JSON.stringify(normalized))}`,
          ...normalized,
        }
      })
      .filter((route) => route.workspace_hint !== '')
      .slice(0, MAX_STARTUP_ITEMS * 2)
    : []
  if (routes.length === 0) return null
  const nextConversation = value.next_conversation && typeof value.next_conversation === 'object'
    ? value.next_conversation
    : null
  return {
    schema_version: 'atlas.awis.workspace_mesh_projection.v1',
    source: 'local_awis_operational_mesh',
    readiness_score: normalizePercent(value.readiness_score),
    mesh_hash: isString(value.mesh_hash)
      ? sanitizeProviderSafeText(value.mesh_hash).slice(0, 80)
      : `mesh-${stableStringHash(JSON.stringify(routes.map((route) => [route.workspace_hint, route.relationship, route.confidence])))}`
    ,
    routes,
    next_conversation: {
      load_order: normalizeStringList(nextConversation?.load_order, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      reuse_rules: normalizeStringList(nextConversation?.reuse_rules, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      validate_with: normalizeStringList(nextConversation?.validate_with, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      human_boundary: normalizeStringList(nextConversation?.human_boundary, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    transfer_policy: {
      privacy_level: 'provider_safe_operational_mesh',
      raw_workspace_names_returned: false,
      raw_paths_returned: false,
      raw_source_returned: false,
      raw_conversation_returned: false,
      apply_only_when_stack_matches: true,
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      absolute_paths_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeCurrentTruthPackProjection(raw: unknown): AwisWorkspaceCurrentTruthPackProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceCurrentTruthPackProjection>
  if (value.schema_version !== 'atlas.awis.current_truth_pack_projection.v1') return null
  const currentTruth = value.current_truth && typeof value.current_truth === 'object' ? value.current_truth : null
  const proof = value.proof && typeof value.proof === 'object' ? value.proof : null
  const nextConversation = value.next_conversation && typeof value.next_conversation === 'object' ? value.next_conversation : null
  const mustKeep = normalizeStringList(currentTruth?.must_keep, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString)
  const activeComponents = normalizeStringList(currentTruth?.active_components, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const activeSpaces = normalizeStringList(currentTruth?.active_spaces, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const activeArtifacts = normalizeStringList(currentTruth?.active_artifacts, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const provenCommands = normalizeStringList(currentTruth?.proven_commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const meshRoutes = normalizeStringList(currentTruth?.mesh_routes, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const evidenceRefs = normalizeStringList(proof?.evidence_refs, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString)
  if (
    mustKeep.length === 0 &&
    activeComponents.length === 0 &&
    activeSpaces.length === 0 &&
    activeArtifacts.length === 0 &&
    provenCommands.length === 0 &&
    evidenceRefs.length === 0
  ) return null
  const truthPayload = {
    workspace: value.workspace_key,
    mustKeep,
    activeComponents,
    activeSpaces,
    activeArtifacts,
    provenCommands,
    meshRoutes,
    evidenceRefs,
  }
  return {
    schema_version: 'atlas.awis.current_truth_pack_projection.v1',
    source: 'local_awis_truth_compiler',
    workspace_key: isString(value.workspace_key) ? sanitizeProviderSafeText(value.workspace_key) : '',
    readiness_score: normalizePercent(value.readiness_score),
    truth_hash: isString(value.truth_hash)
      ? sanitizeProviderSafeText(value.truth_hash).slice(0, 80)
      : `truth-${stableStringHash(JSON.stringify(truthPayload))}`,
    current_truth: {
      must_keep: mustKeep,
      active_components: activeComponents,
      active_spaces: activeSpaces,
      active_artifacts: activeArtifacts,
      proven_commands: provenCommands,
      mesh_routes: meshRoutes,
    },
    proof: {
      evidence_refs: evidenceRefs,
      validate_with: normalizeStringList(proof?.validate_with, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      stale_or_unproven: normalizeStringList(proof?.stale_or_unproven, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      human_boundary: normalizeStringList(proof?.human_boundary, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    next_conversation: {
      load_first: normalizeStringList(nextConversation?.load_first, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      summarize_only: normalizeStringList(nextConversation?.summarize_only, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      promote_when: normalizeStringList(nextConversation?.promote_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      demote_when: normalizeStringList(nextConversation?.demote_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
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
  }
}

function normalizeRepositoryConstellationProjection(raw: unknown): AwisWorkspaceRepositoryConstellationProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceRepositoryConstellationProjection>
  if (value.schema_version !== 'atlas.awis.repository_constellation_projection.v1') return null
  const maturities = new Set(['new', 'learning', 'stable', 'battle_tested'])
  const repositories = Array.isArray(value.repositories)
    ? value.repositories
      .filter((repo) => Boolean(repo && typeof repo === 'object' && isString(repo.key)))
      .map((repo) => ({
        key: sanitizeComponentKey(repo.key),
        role: isString(repo.role) ? sanitizeProviderSafeText(repo.role).slice(0, 120) : 'workspace area',
        stack: normalizeStringList(repo.stack, 6).map(sanitizeProviderSafeText).filter(isString),
        maturity: maturities.has(String(repo.maturity))
          ? repo.maturity as AwisWorkspaceRepositoryConstellationProjection['repositories'][number]['maturity']
          : 'learning',
        manifests: normalizeStringList(repo.manifests, 6).map(sanitizeRelativePath).filter(isString),
        docs: normalizeStringList(repo.docs, 6).map(sanitizeRelativePath).filter(isString),
        commands: normalizeStringList(repo.commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        connected_to: normalizeStringList(repo.connected_to, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        load_when: normalizeStringList(repo.load_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        summarize_when: normalizeStringList(repo.summarize_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        validate_with: normalizeStringList(repo.validate_with, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        confidence: normalizePercent(repo.confidence),
      }))
      .filter((repo) => repo.key !== '')
      .slice(0, MAX_TOPOLOGY_COMPONENTS)
    : []
  const repoKeys = new Set(repositories.map((repo) => repo.key))
  const bridges = Array.isArray(value.bridges)
    ? value.bridges
      .filter((bridge) => Boolean(bridge && typeof bridge === 'object' && isString(bridge.from) && isString(bridge.to)))
      .map((bridge) => ({
        from: sanitizeComponentKey(bridge.from),
        to: sanitizeComponentKey(bridge.to),
        reason: isString(bridge.reason) ? sanitizeProviderSafeText(bridge.reason).slice(0, 160) : 'componentes relacionados',
        shared_stack: normalizeStringList(bridge.shared_stack, 4).map(sanitizeProviderSafeText).filter(isString),
        validation_bridge: normalizeStringList(bridge.validation_bridge, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        context_bridge: normalizeStringList(bridge.context_bridge, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
        confidence: normalizePercent(bridge.confidence),
      }))
      .filter((bridge) => bridge.from !== '' && bridge.to !== '' && bridge.from !== bridge.to && repoKeys.has(bridge.from) && repoKeys.has(bridge.to))
      .slice(0, MAX_TOPOLOGY_CONNECTIONS)
    : []
  if (repositories.length === 0 && bridges.length === 0) return null
  const nextConversation = value.next_conversation && typeof value.next_conversation === 'object' ? value.next_conversation : null
  const learningLoop = value.learning_loop && typeof value.learning_loop === 'object' ? value.learning_loop : null
  const hashSeed = JSON.stringify({
    repositories: repositories.map((repo) => `${repo.key}:${repo.maturity}:${repo.confidence}`),
    bridges: bridges.map((bridge) => `${bridge.from}->${bridge.to}:${bridge.confidence}`),
  })
  return {
    schema_version: 'atlas.awis.repository_constellation_projection.v1',
    source: 'local_awis_repository_constellation',
    readiness_score: normalizePercent(value.readiness_score),
    constellation_hash: isString(value.constellation_hash)
      ? sanitizeProviderSafeText(value.constellation_hash).slice(0, 96)
      : `repo-constellation-${stableStringHash(hashSeed)}`,
    repositories,
    bridges,
    next_conversation: {
      load_first: normalizeStringList(nextConversation?.load_first, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      compare_when: normalizeStringList(nextConversation?.compare_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      validate_with: normalizeStringList(nextConversation?.validate_with, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      preserve_as_artifact: normalizeStringList(nextConversation?.preserve_as_artifact, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      human_boundary: normalizeStringList(nextConversation?.human_boundary, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    learning_loop: {
      promote_when: normalizeStringList(learningLoop?.promote_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      revalidate_when: normalizeStringList(learningLoop?.revalidate_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      demote_when: normalizeStringList(learningLoop?.demote_when, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
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
  }
}

function normalizeLiveExecutionMemoryProjection(raw: unknown): AwisWorkspaceLiveExecutionMemoryProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceLiveExecutionMemoryProjection>
  if (value.schema_version !== 'atlas.awis.live_execution_memory_projection.v1') return null
  const startup = value.startup_packet && typeof value.startup_packet === 'object' ? value.startup_packet : null
  const automation = value.automation_loop && typeof value.automation_loop === 'object' ? value.automation_loop : null
  const promotion = value.promotion_rules && typeof value.promotion_rules === 'object' ? value.promotion_rules : null
  const learning = value.workspace_learning && typeof value.workspace_learning === 'object' ? value.workspace_learning : null
  const loadFirst = normalizeStringList(startup?.load_first, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString)
  const useAsSummary = normalizeStringList(startup?.use_as_summary, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString)
  const validateBeforeTrust = normalizeStringList(startup?.validate_before_trust, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString)
  const repositories = normalizeStringList(learning?.repositories, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const components = normalizeStringList(learning?.components, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const artifacts = normalizeStringList(learning?.artifacts, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const hashSeed = JSON.stringify({
    loadFirst,
    useAsSummary,
    validateBeforeTrust,
    repositories,
    components,
    artifacts,
  })
  if (loadFirst.length === 0 && useAsSummary.length === 0 && validateBeforeTrust.length === 0 && repositories.length === 0 && components.length === 0) return null
  const source = value.source === 'server_awis_live_execution_memory'
    ? 'server_awis_live_execution_memory'
    : 'local_awis_live_execution_memory_compiler'
  return {
    schema_version: 'atlas.awis.live_execution_memory_projection.v1',
    source,
    readiness_score: normalizePercent(value.readiness_score),
    memory_hash: isString(value.memory_hash) ? sanitizeProviderSafeText(value.memory_hash).slice(0, 120) : `live-${stableStringHash(hashSeed)}`,
    startup_packet: {
      load_first: loadFirst,
      use_as_summary: useAsSummary,
      validate_before_trust: validateBeforeTrust,
      avoid: normalizeStringList(startup?.avoid, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString),
      human_boundary: normalizeStringList(startup?.human_boundary, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    automation_loop: {
      before_send: normalizeStringList(automation?.before_send, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      after_success: normalizeStringList(automation?.after_success, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      after_failure: normalizeStringList(automation?.after_failure, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      on_drift: normalizeStringList(automation?.on_drift, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    promotion_rules: {
      promote_to_gold: normalizeStringList(promotion?.promote_to_gold, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString),
      preserve_as_artifact: normalizeStringList(promotion?.preserve_as_artifact, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      revalidate: normalizeStringList(promotion?.revalidate, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString),
      demote: normalizeStringList(promotion?.demote, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    workspace_learning: {
      repositories,
      components,
      spaces: normalizeStringList(learning?.spaces, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      artifacts,
      commands: normalizeStringList(learning?.commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
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
  }
}

function normalizeArtifact(raw: unknown): AwisWorkspaceArtifactEntry | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceArtifactEntry>
  if (value.schema_version !== 'atlas.awis.workspace_artifact.v1') return null
  if (value.artifact_type !== 'startup_snapshot') return null
  if (!isString(value.workspace_key) || !isString(value.artifact_hash) || !value.payload?.startup_snapshot) return null
  return {
    schema_version: 'atlas.awis.workspace_artifact.v1',
    artifact_type: 'startup_snapshot',
    workspace_key: value.workspace_key,
    workspace_name: isString(value.workspace_name) ? value.workspace_name : value.workspace_key,
    artifact_hash: value.artifact_hash,
    created_at: isString(value.created_at) ? value.created_at : new Date().toISOString(),
    title: isString(value.title) ? value.title : `Partida AWIS · ${value.workspace_key}`,
    summary: isString(value.summary) ? value.summary : 'Snapshot AWIS provider-safe.',
    manifest: normalizeArtifactManifest(value.manifest, value),
    payload: {
      startup_snapshot: value.payload.startup_snapshot,
      startup_briefing: normalizeStartupBriefing(value.payload.startup_briefing),
      startup_playbook: normalizeStartupPlaybook(value.payload.startup_playbook),
      continuity_projection: normalizeContinuityProjection(value.payload.continuity_projection),
      automation_projection: normalizeAutomationProjection(value.payload.automation_projection),
      confidence_projection: normalizeConfidenceProjection(value.payload.confidence_projection),
      living_graph_projection: normalizeLivingGraphProjection(value.payload.living_graph_projection),
      session_gold_projection: normalizeSessionGoldProjection(value.payload.session_gold_projection),
      context_kernel_projection: normalizeContextKernelProjection(value.payload.context_kernel_projection),
      execution_doctrine_projection: normalizeExecutionDoctrineProjection(value.payload.execution_doctrine_projection),
      provider_strategy_projection: normalizeProviderStrategyProjection(value.payload.provider_strategy_projection),
      task_router_projection: normalizeTaskRouterProjection(value.payload.task_router_projection),
      self_improvement_projection: normalizeSelfImprovementProjection(value.payload.self_improvement_projection),
      memory_freshness_projection: normalizeMemoryFreshnessProjection(value.payload.memory_freshness_projection),
      retention_projection: normalizeRetentionProjection(value.payload.retention_projection),
      memory_consolidation_projection: normalizeMemoryConsolidationProjection(value.payload.memory_consolidation_projection),
      startup_orchestration_projection: normalizeStartupOrchestrationProjection(value.payload.startup_orchestration_projection),
      preflight_projection: normalizePreflightProjection(value.payload.preflight_projection),
      workspace_twin_projection: normalizeWorkspaceTwinProjection(value.payload.workspace_twin_projection),
      launch_contract_projection: normalizeLaunchContractProjection(value.payload.launch_contract_projection),
      next_session_brain_projection: normalizeNextSessionBrainProjection(value.payload.next_session_brain_projection),
      learning_projection: normalizeLearningProjection(value.payload.learning_projection),
      topology_projection: normalizeTopologyProjection(value.payload.topology_projection),
      component_memory_projection: normalizeComponentMemoryProjection(value.payload.component_memory_projection),
      semantic_index_projection: normalizeSemanticIndexProjection(value.payload.semantic_index_projection),
      impact_map_projection: normalizeImpactMapProjection(value.payload.impact_map_projection),
      space_projection: normalizeSpaceProjection(value.payload.space_projection),
      evolution_projection: value.payload.evolution_projection ?? null,
      relation_projection: normalizeRelationProjection(value.payload.relation_projection),
      workspace_mesh_projection: normalizeWorkspaceMeshProjection(value.payload.workspace_mesh_projection),
      current_truth_pack_projection: normalizeCurrentTruthPackProjection(value.payload.current_truth_pack_projection),
      repository_constellation_projection: normalizeRepositoryConstellationProjection(value.payload.repository_constellation_projection),
      live_execution_memory_projection: normalizeLiveExecutionMemoryProjection(value.payload.live_execution_memory_projection),
      memory_operational: value.payload.memory_operational ?? null,
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeArtifactManifest(
  raw: unknown,
  artifact: Partial<AwisWorkspaceArtifactEntry>,
): AwisWorkspaceArtifactEntry['manifest'] {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Partial<AwisWorkspaceArtifactEntry['manifest']>
    : {}
  const loadFirst = normalizeStringList(value.load_first, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const validateWith = normalizeStringList(value.validate_with, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const promoteSignals = normalizeStringList(value.promote_signals, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const cautionSignals = normalizeStringList(value.caution_signals, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const linkedSpaces = normalizeStringList(value.linked_spaces, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const repositoryHints = normalizeStringList(value.repository_hints, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const legacySeed = JSON.stringify({
    hash: artifact.artifact_hash,
    summary: artifact.summary,
    loadFirst,
    validateWith,
    linkedSpaces,
  })
  const qualityScore = normalizePercent(value.quality_score) || normalizePercent(
    28
    + Math.min(18, loadFirst.length * 3)
    + Math.min(18, validateWith.length * 3)
    + Math.min(12, linkedSpaces.length * 2),
  )
  return {
    schema_version: 'atlas.awis.workspace_artifact_manifest.v1',
    quality_score: qualityScore,
    replay_priority: normalizePercent(value.replay_priority) || qualityScore,
    seed_hash: isString(value.seed_hash)
      ? sanitizeProviderSafeText(value.seed_hash).slice(0, 80)
      : `artifact-${stableStringHash(legacySeed)}`,
    load_first: loadFirst,
    validate_with: validateWith,
    promote_signals: promoteSignals,
    caution_signals: cautionSignals,
    linked_spaces: linkedSpaces,
    repository_hints: repositoryHints,
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeNextSessionBrainProjection(raw: unknown): AwisWorkspaceNextSessionBrainProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceNextSessionBrainProjection>
  if (value.schema_version !== 'atlas.awis.workspace_next_session_brain_projection.v1') return null
  const loadOrder = normalizeStringList(value.load_order, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const executionPriority = Array.isArray(value.execution_priority)
    ? value.execution_priority
      .filter((item) => Boolean(item && typeof item === 'object' && isString(item.command)))
      .map((item) => ({
        command: sanitizeProviderSafeText(String(item.command)).slice(0, 180),
        why: isString(item.why) ? sanitizeProviderSafeText(item.why).slice(0, 120) : null,
        requires_operator_approval: item.requires_operator_approval !== false,
      }))
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  const focusedRepositories = Array.isArray(value.focused_repositories)
    ? value.focused_repositories
      .filter((repo) => Boolean(repo && typeof repo === 'object' && isString(repo.repo_key)))
      .map((repo) => ({
        repo_key: sanitizeProviderSafeText(String(repo.repo_key)).slice(0, 80),
        score: normalizePercent(repo.score),
        reasons: normalizeStringList(repo.reasons, 4).map(sanitizeProviderSafeText).filter(isString),
        stack: normalizeStringList(repo.stack, 6).map(sanitizeProviderSafeText).filter(isString),
      }))
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  const context = value.context_loading
  const focusedManifestRefs = Array.isArray(context?.focused_manifest_refs)
    ? context.focused_manifest_refs
      .filter((ref) => Boolean(ref && typeof ref === 'object' && isString(ref.repo_key)))
      .map((ref) => ({
        repo_key: sanitizeProviderSafeText(String(ref.repo_key)).slice(0, 80),
        manifest_files: normalizeStringList(ref.manifest_files, 6).map(sanitizeRelativePath).filter(isString),
        stack: normalizeStringList(ref.stack, 6).map(sanitizeProviderSafeText).filter(isString),
        script_names: normalizeStringList(ref.script_names, 8).map(sanitizeProviderSafeText).filter(isString),
      }))
      .slice(0, MAX_STARTUP_ITEMS)
    : []
  if (loadOrder.length === 0 && executionPriority.length === 0 && focusedRepositories.length === 0) return null
  return {
    schema_version: 'atlas.awis.workspace_next_session_brain_projection.v1',
    source: value.source === 'server_awnsb' ? 'server_awnsb' : 'local_awis_seed',
    status: isString(value.status) ? sanitizeProviderSafeText(value.status).slice(0, 60) : 'ready',
    brain_hash: isString(value.brain_hash) ? sanitizeProviderSafeText(value.brain_hash).slice(0, 80) : null,
    readiness_score: typeof value.readiness_score === 'number' ? normalizePercent(value.readiness_score) : null,
    load_order: loadOrder,
    focused_repositories: focusedRepositories,
    focused_areas: normalizeStringList(value.focused_areas, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    artifact_refs: normalizeStringList(value.artifact_refs, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    owner_docs: normalizeStringList(value.owner_docs, MAX_STARTUP_ITEMS).map(sanitizeRelativePath).filter(isString),
    execution_priority: executionPriority,
    context_loading: {
      mode: isString(context?.mode) ? sanitizeProviderSafeText(context.mode).slice(0, 60) : null,
      repository_count: normalizeCount(context?.repository_count),
      stack_tags: normalizeStringList(context?.stack_tags, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      command_hints: normalizeStringList(context?.command_hints, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      outcome_ranked_commands: normalizeStringList(context?.outcome_ranked_commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      avoid_commands: normalizeStringList(context?.avoid_commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      flaky_commands: normalizeStringList(context?.flaky_commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      slow_commands: normalizeStringList(context?.slow_commands, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      focused_manifest_refs: focusedManifestRefs,
      hashes: {
        repository_inventory_hash: isString(context?.hashes?.repository_inventory_hash) ? context.hashes.repository_inventory_hash : null,
        working_set_hash: isString(context?.hashes?.working_set_hash) ? context.hashes.working_set_hash : null,
        context_delta_plan_hash: isString(context?.hashes?.context_delta_plan_hash) ? context.hashes.context_delta_plan_hash : null,
        learning_snapshot_hash: isString(context?.hashes?.learning_snapshot_hash) ? context.hashes.learning_snapshot_hash : null,
        live_execution_memory_hash: isString(context?.hashes?.live_execution_memory_hash) ? context.hashes.live_execution_memory_hash : null,
      },
    },
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      internal_ids_included: false,
      absolute_paths_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function summarizeAwisWorkspaceArtifacts(
  workspaceKeyValue: string,
  artifacts: AwisWorkspaceArtifactEntry[],
): AwisWorkspaceArtifactLakeSummary {
  const latest = artifacts[0] ?? null
  return {
    schema_version: 'atlas.awis.workspace_artifact_lake_summary.v1',
    workspace_key: workspaceKeyValue,
    artifact_count: artifacts.length,
    latest_artifact_hash: latest?.artifact_hash ?? null,
    latest_artifact_type: latest?.artifact_type ?? null,
    latest_created_at: latest?.created_at ?? null,
    retained_limit: MAX_WORKSPACE_ARTIFACTS,
  }
}

function buildAwisWorkspaceArtifactManifest(
  pack: AwisWorkspaceContextPack,
): AwisWorkspaceArtifactEntry['manifest'] {
  const readinessFlags = pack.startup_snapshot
    ? Object.values(pack.startup_snapshot.readiness).filter(Boolean).length
    : 0
  const loadFirst = unique([
    ...(pack.memory?.operational.context_gold.space_brain.promoted.map((item) => `space-brain-gold:${item}`) ?? []),
    ...(pack.live_execution_memory?.startup_packet.load_first ?? []),
    ...(pack.launch_contract?.startup_contract.first_load ?? []),
    ...(pack.current_truth_pack?.next_conversation.load_first ?? []),
    ...(pack.repository_constellation?.next_conversation.load_first ?? []),
    ...(pack.workspace_mesh?.next_conversation.load_order ?? []),
    ...(pack.startup_briefing?.focus.load_sequence ?? []),
    ...(pack.workspace_twin?.context_autopilot.load_first ?? []),
    ...(pack.next_session_brain?.load_order.map((item) => `brain:${item}`) ?? []),
    ...(pack.topology?.knowledge_map.load_first_docs.map((path) => `doc:${path}`) ?? []),
    ...(pack.topology?.knowledge_map.manifest_refs.map((path) => `manifest:${path}`) ?? []),
    ...(pack.context_kernel?.priority_load.map((item) => `${item.kind}:${item.label}`) ?? []),
    ...(pack.spaces?.strongest_spaces.flatMap((space) => space.brain_contract.load_first.map((item) => `space-brain:${item}`)) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const validateWith = unique([
    ...(pack.memory?.operational.context_gold.space_brain.revalidate.map((item) => `space-brain:${item}`) ?? []),
    ...(pack.live_execution_memory?.startup_packet.validate_before_trust ?? []),
    ...(pack.launch_contract?.startup_contract.validate_before_trust ?? []),
    ...(pack.current_truth_pack?.proof.validate_with ?? []),
    ...(pack.repository_constellation?.next_conversation.validate_with ?? []),
    ...(pack.workspace_mesh?.next_conversation.validate_with ?? []),
    ...(pack.startup_briefing?.automation_plan.tests_to_run ?? []),
    ...(pack.topology?.knowledge_map.validation_entrypoints ?? []),
    ...(pack.context_kernel?.validation_plan.commands ?? []),
    ...(pack.spaces?.strongest_spaces.flatMap((space) => space.brain_contract.validate_before_use.map((item) => `Space:${space.title}:${item}`)) ?? []),
    ...(pack.next_session_brain?.execution_priority.map((priority) => priority.command) ?? []),
    ...(pack.next_session_brain?.context_loading.command_hints ?? []),
    ...(pack.session_gold?.next_session_hooks.validate_with ?? []),
    ...(pack.learning?.trusted_commands.filter((command) => /test|tsc|lint|check|build/i.test(command)) ?? []),
    ...(pack.learning?.task_memory.trusted_task_commands ?? []),
    ...(pack.learning?.task_memory.validation_plans.flatMap((plan) => plan.commands) ?? []),
    ...(pack.memory?.stable_commands ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const promoteSignals = unique([
    ...(pack.memory?.operational.context_gold.space_brain.promoted.map((item) => `space-brain:${item}`) ?? []),
    ...(pack.live_execution_memory?.promotion_rules.promote_to_gold ?? []),
    ...(pack.memory_consolidation?.consolidate.promote_to_gold ?? []),
    ...(pack.launch_contract?.startup_contract.promote_after_success ?? []),
    ...(pack.current_truth_pack?.next_conversation.promote_when ?? []),
    ...(pack.repository_constellation?.learning_loop.promote_when ?? []),
    ...(pack.workspace_mesh?.next_conversation.reuse_rules.map((item) => `mesh:${item}`) ?? []),
    ...(pack.preflight?.promotion_contract.promote_when ?? []),
    ...(pack.session_gold?.strongest_outcomes.map((outcome) => `session:${outcome.label}:${outcome.confidence}`) ?? []),
    ...(pack.next_session_brain ? [`brain:${pack.next_session_brain.source}:${pack.next_session_brain.readiness_score ?? 0}`] : []),
    ...(pack.spaces?.strongest_spaces.flatMap((space) => space.brain_contract.automation_hooks.map((item) => `space-brain:${space.title}:${item}`)) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const cautionSignals = unique([
    ...(pack.memory?.operational.context_gold.space_brain.revalidate.map((item) => `space-brain-revalidate:${item}`) ?? []),
    ...(pack.live_execution_memory?.startup_packet.avoid.map((item) => `live:${item}`) ?? []),
    ...(pack.live_execution_memory?.startup_packet.human_boundary.map((item) => `live-human:${item}`) ?? []),
    ...(pack.launch_contract?.startup_contract.avoid_loading ?? []),
    ...(pack.startup_briefing?.automation_plan.warnings ?? []),
    ...(pack.memory_freshness?.evidence.revalidate.map((item) => `revalidar:${item}`) ?? []),
    ...(pack.next_session_brain?.context_loading.avoid_commands ?? []),
    ...(pack.current_truth_pack?.proof.stale_or_unproven.map((item) => `truth:${item}`) ?? []),
    ...(pack.repository_constellation?.next_conversation.human_boundary.map((item) => `repo:${item}`) ?? []),
    ...(pack.workspace_mesh?.next_conversation.human_boundary.map((item) => `mesh:${item}`) ?? []),
    ...(pack.topology?.knowledge_map.sensitive_zones.map((zone) => `sensível:${zone}`) ?? []),
    ...(pack.preflight?.gates.filter((gate) => gate.status !== 'ready').map((gate) => `${gate.status}:${gate.label}`) ?? []),
    ...(pack.spaces?.strongest_spaces.flatMap((space) => space.brain_contract.human_boundary.map((item) => `space-human:${space.title}:${item}`)) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const linkedSpaces = unique([
    ...(pack.memory?.operational.context_gold.space_brain.promoted.map((item) => `brain:${item}`) ?? []),
    ...(pack.spaces?.strongest_spaces.map((space) => `${space.title}:${space.session_count}`) ?? []),
    ...(pack.startup_snapshot?.startup_gold.strongest_spaces ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const repositoryHints = unique([
    ...(pack.live_execution_memory?.workspace_learning.repositories.map((repo) => `live:${repo}`) ?? []),
    ...(pack.live_execution_memory?.workspace_learning.components.map((component) => `live-component:${component}`) ?? []),
    ...(pack.startup_briefing?.focus.repositories ?? []),
    ...(pack.workspace_twin?.genome.apps ?? []),
    ...(pack.current_truth_pack?.current_truth.active_components ?? []),
    ...(pack.repository_constellation?.repositories.map((repo) => `${repo.key}:${repo.maturity}`) ?? []),
    ...(pack.repository_constellation?.bridges.map((bridge) => `${bridge.from}->${bridge.to}`) ?? []),
    ...(pack.workspace_mesh?.routes.map((route) => `${route.workspace_hint}:${route.relationship}`) ?? []),
    ...(pack.relations?.connection_contracts.map((contract) => `${contract.workspace_hint}:${contract.relationship}`) ?? []),
    ...(pack.topology?.components.map((component) => `${component.key}:${component.role}`) ?? []),
    ...(pack.next_session_brain?.focused_repositories.map((repo) => `${repo.repo_key}:next-session`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const qualityScore = normalizePercent(
    18
    + readinessFlags * 6
    + Math.min(14, loadFirst.length * 2)
    + Math.min(16, validateWith.length * 3)
    + Math.min(12, promoteSignals.length * 2)
    + Math.min(10, linkedSpaces.length * 2)
    - Math.min(16, cautionSignals.length * 2),
  )
  const replayPriority = normalizePercent(
    qualityScore
    + (pack.launch_contract?.launch_mode === 'deep' ? 8 : pack.launch_contract?.launch_mode === 'warm' ? 4 : 0)
    + (pack.artifact_replay ? 4 : 0)
    + (pack.memory_freshness?.state === 'fresh' ? 4 : 0)
    + (pack.live_execution_memory ? 4 : 0),
  )
  const seedHash = `artifact-${stableStringHash(JSON.stringify({
    loadFirst,
    validateWith,
    promoteSignals,
    cautionSignals,
    linkedSpaces,
    repositoryHints,
  }))}`

  return {
    schema_version: 'atlas.awis.workspace_artifact_manifest.v1',
    quality_score: qualityScore,
    replay_priority: replayPriority,
    seed_hash: seedHash,
    load_first: loadFirst,
    validate_with: validateWith,
    promote_signals: promoteSignals,
    caution_signals: cautionSignals,
    linked_spaces: linkedSpaces,
    repository_hints: repositoryHints,
    safety: {
      raw_source_included: false,
      raw_conversation_included: false,
      internal_ids_included: false,
      bounded: true,
      provider_safe: true,
    },
  }
}

function normalizeSpaceBrainContract(
  pack: AwisWorkspaceSpacePackInput,
): AwisWorkspaceSpaceProjection['strongest_spaces'][number]['brain_contract'] {
  const contract = pack.brain_contract
  const state = contract?.state === 'vivo' || contract?.state === 'pronto' || contract?.state === 'leve'
    ? contract.state
    : pack.decision_count + pack.pending_count + pack.risk_count + pack.artifact_count > 0
      ? 'vivo'
      : pack.message_count >= 2 ? 'pronto' : 'leve'
  const loadFirst = unique([
    ...(contract?.load_first ?? []),
    `Space:${pack.title}`,
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const carryForward = unique([
    ...(contract?.carry_forward ?? []),
    `${pack.thread_count} sessões relacionadas`,
    `${pack.message_count} mensagens resumidas`,
    ...pack.recommended_use,
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const validateBeforeUse = unique([
    ...(contract?.validate_before_use ?? []),
    pack.risk_count > 0 ? 'revalidar riscos do Space' : null,
    pack.pending_count > 0 ? 'checar pendências antes de executar' : null,
    pack.artifact_count > 0 ? 'confirmar artifact/context pack ainda atual' : null,
  ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS)
  const automationHooks = unique([
    ...(contract?.automation_hooks ?? []),
    'atualizar pack quando sessão do Space mudar',
    pack.message_count >= 2 ? 'promover resumo do Space para próxima conversa' : null,
  ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS)
  const humanBoundary = unique([
    ...(contract?.human_boundary ?? []),
    pack.risk_count > 0 ? 'humano confirma mudança em área de risco' : null,
    pack.pending_count > 0 ? 'humano decide pendência ambígua' : null,
  ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS)
  const artifactRefs = unique((contract?.artifact_refs ?? [])
    .map(sanitizeProviderSafeText)
    .filter(isString))
    .slice(0, MAX_STARTUP_ITEMS)
  const evidence = unique([
    ...(contract?.evidence ?? []),
    `${pack.thread_count} sessões protegidas`,
    pack.decision_count > 0 ? `${pack.decision_count} decisão(ões)` : null,
    pack.pending_count > 0 ? `${pack.pending_count} pendência(s)` : null,
    pack.risk_count > 0 ? `${pack.risk_count} risco(s)` : null,
    pack.artifact_count > 0 ? `${pack.artifact_count} artifact(s)` : null,
  ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS)
  return {
    state,
    load_first: loadFirst,
    carry_forward: carryForward,
    validate_before_use: validateBeforeUse,
    automation_hooks: automationHooks,
    human_boundary: humanBoundary,
    artifact_refs: artifactRefs,
    evidence,
  }
}

function normalizeLaunchContractProjection(raw: unknown): AwisWorkspaceLaunchContractProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Partial<AwisWorkspaceLaunchContractProjection>
  if (value.schema_version !== 'atlas.awis.workspace_launch_contract_projection.v1') return null
  const firstLoad = normalizeStringList(value.startup_contract?.first_load, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const validateBeforeTrust = normalizeStringList(value.startup_contract?.validate_before_trust, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  const maintenanceActions = normalizeStringList(value.automation_contract?.maintenance_actions, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString)
  if (firstLoad.length === 0 && validateBeforeTrust.length === 0 && maintenanceActions.length === 0) return null
  const launchMode = value.launch_mode === 'deep' || value.launch_mode === 'warm' || value.launch_mode === 'guarded'
    ? value.launch_mode
    : 'guarded'
  const seedHash = isString(value.seed_hash)
    ? sanitizeProviderSafeText(value.seed_hash).slice(0, 80)
    : `launch-${stableStringHash(JSON.stringify({ firstLoad, validateBeforeTrust, maintenanceActions }))}`
  return {
    schema_version: 'atlas.awis.workspace_launch_contract_projection.v1',
    source: 'local_awis_launch_contract_compiler',
    readiness_score: normalizePercent(value.readiness_score),
    launch_mode: launchMode,
    seed_hash: seedHash,
    startup_contract: {
      never_start_cold: true,
      first_load: firstLoad,
      validate_before_trust: validateBeforeTrust,
      summarize_only: normalizeStringList(value.startup_contract?.summarize_only, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      avoid_loading: normalizeStringList(value.startup_contract?.avoid_loading, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      promote_after_success: normalizeStringList(value.startup_contract?.promote_after_success, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      demote_after_failure: normalizeStringList(value.startup_contract?.demote_after_failure, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      preserve_artifact_after_success: value.startup_contract?.preserve_artifact_after_success === true,
      update_space_pack: value.startup_contract?.update_space_pack === true,
      needs_human_confirmation: value.startup_contract?.needs_human_confirmation === true,
    },
    automation_contract: {
      before_send: normalizeStringList(value.automation_contract?.before_send, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      after_success: normalizeStringList(value.automation_contract?.after_success, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      after_failure: normalizeStringList(value.automation_contract?.after_failure, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      maintenance_actions: maintenanceActions,
    },
    recovery_contract: {
      demote_context: normalizeStringList(value.recovery_contract?.demote_context, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      safe_resume: normalizeStringList(value.recovery_contract?.safe_resume, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      reason: isString(value.recovery_contract?.reason)
        ? sanitizeProviderSafeText(value.recovery_contract.reason).slice(0, 180)
        : 'contrato de recuperação AWIS provider-safe',
    },
    human_contract: {
      owns: normalizeStringList(value.human_contract?.owns, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      confirm_before: normalizeStringList(value.human_contract?.confirm_before, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      do_not_delegate: normalizeStringList(value.human_contract?.do_not_delegate, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    },
    next_conversation: {
      load_order: normalizeStringList(value.next_conversation?.load_order, MAX_STARTUP_ITEMS * 2).map(sanitizeProviderSafeText).filter(isString),
      context_budget: {
        max_items: Math.max(1, Math.min(MAX_STARTUP_ITEMS, normalizeCount(value.next_conversation?.context_budget?.max_items))),
        prefer_summary: value.next_conversation?.context_budget?.prefer_summary !== false,
        reason: isString(value.next_conversation?.context_budget?.reason)
          ? sanitizeProviderSafeText(value.next_conversation.context_budget.reason).slice(0, 180)
          : 'contrato de partida AWIS provider-safe',
      },
      provider_note: isString(value.next_conversation?.provider_note)
        ? sanitizeProviderSafeText(value.next_conversation.provider_note).slice(0, 180)
        : 'usar contexto provider-safe',
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
  }
}

function startupArtifactSummary(pack: AwisWorkspaceContextPack): string {
  const startup = pack.startup_snapshot
  if (!startup) return 'Snapshot AWIS provider-safe.'
  const parts = [
    startup.readiness.folder_map_ready ? 'mapa local' : null,
    startup.readiness.memory_ready ? 'memória' : null,
    startup.readiness.learning_ready ? 'aprendizado' : null,
    startup.readiness.spaces_ready ? 'Spaces' : null,
    startup.readiness.evolution_ready ? 'evolução entre repos' : null,
    startup.readiness.relations_ready ? 'relações locais' : null,
  ].filter(isString)
  return `Partida inteligente com ${parts.join(', ') || 'contexto inicial'}.`
}

function stableStringHash(input: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function normalizeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

function normalizePercent(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0
}

function ageInDays(value: string | null | undefined, now = new Date()): number | null {
  if (!value) return null
  const time = Date.parse(value)
  if (Number.isNaN(time)) return null
  return Math.max(0, Math.floor((now.getTime() - time) / 86_400_000))
}

function normalizeStringList(value: unknown, limit: number): string[] {
  return Array.isArray(value)
    ? value.filter(isString).map((item) => item.slice(0, 180)).slice(0, limit)
    : []
}

function emptyMemory(
  workspaceKeyValue: string,
  workspaceName: string,
  rootPath: string,
  now: string,
): AwisWorkspaceMemorySnapshot {
  return {
    schemaVersion: 'atlas.awis.workspace_memory.v1',
    workspaceKey: workspaceKeyValue,
    workspaceName: workspaceName || workspaceKeyValue,
    rootPath,
    firstSeenAt: now,
    lastSeenAt: now,
    scanCount: 0,
    lastFingerprint: '',
    stableSignals: [],
    stableLanguages: [],
    stableCommands: [],
    operationalSignals: [],
    interactionCount: 0,
    successCount: 0,
    failureCount: 0,
    contextPackAppliedCount: 0,
    lastInteractionAt: null,
    recentOutcomes: [],
    recentMaintenance: [],
    observations: [],
    driftEvents: [],
  }
}

function normalizeSignals(raw: unknown): AwisWorkspaceMemorySignal[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is AwisWorkspaceMemorySignal => (
      item
      && typeof item === 'object'
      && typeof (item as AwisWorkspaceMemorySignal).label === 'string'
    ))
    .map((item) => ({
      label: item.label,
      firstSeenAt: item.firstSeenAt || item.lastSeenAt || new Date().toISOString(),
      lastSeenAt: item.lastSeenAt || item.firstSeenAt || new Date().toISOString(),
      seenCount: typeof item.seenCount === 'number' ? item.seenCount : 1,
    }))
}

function normalizeOutcomes(raw: unknown): AwisWorkspaceMemoryOutcome[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Partial<AwisWorkspaceMemoryOutcome> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      occurredAt: isString(item.occurredAt) ? item.occurredAt : new Date().toISOString(),
      channel: normalizeChannel(item.channel),
      status: normalizeStatus(item.status),
      provider: isString(item.provider) ? item.provider : null,
      model: isString(item.model) ? item.model : null,
      latencyMs: typeof item.latencyMs === 'number' ? item.latencyMs : null,
      contextPackApplied: item.contextPackApplied === true,
      taskKind: normalizeTaskKind(item.taskKind),
      routeKey: sanitizeRouteKey(item.routeKey),
      routeLabel: isString(item.routeLabel) ? sanitizeProviderSafeText(item.routeLabel).slice(0, 120) : null,
      contextGoldLabels: normalizeContextGoldLabels(item.contextGoldLabels),
      validationCommands: normalizeStringList(item.validationCommands, MAX_STARTUP_ITEMS),
      componentKeys: normalizeComponentKeys(item.componentKeys),
      spaceLabels: normalizeStringList(item.spaceLabels, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      spaceBrainLabels: normalizeStringList(item.spaceBrainLabels, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      liveMemoryLabels: normalizeStringList(item.liveMemoryLabels, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
      priorityLoadLabels: normalizeStringList(item.priorityLoadLabels, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    }))
    .slice(0, MAX_RECENT_OUTCOMES)
}

function normalizeMaintenanceEvents(raw: unknown): AwisWorkspaceMaintenanceEvent[] {
  if (!Array.isArray(raw)) return []
  const actions = new Set<AwisWorkspaceMaintenanceAction>([
    'refresh_folder_map',
    'preserve_artifact',
    'open_side_by_side',
    'update_space_pack',
    'revalidate_context',
    'replay_artifacts',
    'record_outcome',
    'revalidate_command',
    'review_risk',
    'cross_workspace_transfer',
    'promote_command',
    'demote_context',
    'transfer_learning',
  ])
  const statuses = new Set(['succeeded', 'failed', 'skipped'])
  return raw
    .filter((item): item is Partial<AwisWorkspaceMaintenanceEvent> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      occurredAt: isString(item.occurredAt) ? item.occurredAt : new Date().toISOString(),
      action: actions.has(item.action as AwisWorkspaceMaintenanceAction)
        ? item.action as AwisWorkspaceMaintenanceAction
        : 'revalidate_context',
      label: isString(item.label) ? sanitizeProviderSafeText(item.label).slice(0, 140) : 'manutenção AWIS',
      status: statuses.has(String(item.status)) ? item.status as AwisWorkspaceMaintenanceEvent['status'] : 'skipped',
      reason: isString(item.reason) ? sanitizeProviderSafeText(item.reason).slice(0, 180) : null,
      evidence: normalizeStringList(item.evidence, MAX_STARTUP_ITEMS).map(sanitizeProviderSafeText).filter(isString),
    }))
    .slice(0, MAX_RECENT_MAINTENANCE)
}

function normalizeComponentKeys(raw: unknown): string[] {
  return normalizeStringList(raw, MAX_STARTUP_ITEMS)
    .map(sanitizeComponentKey)
    .filter(isString)
}

function normalizeContextGoldLabels(raw: unknown): string[] {
  return normalizeStringList(raw, MAX_STARTUP_ITEMS)
    .map((label) => sanitizeProviderSafeText(label)
      .replace(/[^a-zA-Z0-9:._/\- ]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140))
    .filter(isString)
}

function contextGoldLabel(kind: AwisWorkspaceTaskContextProjection['recommended_context']['task_gold'][number]['kind'], label: string): string {
  return `${kind}:${sanitizeProviderSafeText(label).slice(0, 120)}`
}

function selectSpaceBrainForTask(
  spaces: AwisWorkspaceSpaceProjection | null | undefined,
  promptSignals: string[],
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
  contextGold: NonNullable<NonNullable<AwisWorkspaceContextPack['memory']>['operational']['context_gold']> | null = null,
): AwisWorkspaceTaskContextProjection['recommended_context']['space_brain'] {
  const signals = promptSignals.map((signal) => signal.toLowerCase())
  const promoted = contextGold?.space_brain.promoted ?? []
  const revalidate = contextGold?.space_brain.revalidate ?? []
  return (spaces?.strongest_spaces ?? [])
    .map((space) => {
      const haystack = [
        space.title,
        space.scope_label,
        ...space.recommended_use,
        ...space.brain_contract.load_first,
        ...space.brain_contract.carry_forward,
        ...space.brain_contract.evidence,
        ...space.session_summaries.map((session) => session.title),
      ].join(' ').toLowerCase()
      const matchScore = signals.filter((signal) => haystack.includes(signal)).length * 10
      const taskBoost = taskKind === 'analysis' || taskKind === 'research'
        ? 8
        : taskKind === 'bug_fix' || taskKind === 'code_change'
          ? space.reusable_by.some((item) => /code|forge/i.test(item)) ? 8 : 0
          : 0
      const promotedMatches = promoted.filter((item) => item.toLowerCase().includes(space.title.toLowerCase()))
      const revalidateMatches = revalidate.filter((item) => item.toLowerCase().includes(space.title.toLowerCase()))
      const score = Math.min(100, Math.max(0, space.strength_score + matchScore + taskBoost + promotedMatches.length * 12 - revalidateMatches.length * 16))
      return { space, score, promotedMatches, revalidateMatches }
    })
    .filter(({ space, score }) => score >= 18 || space.brain_contract.state === 'vivo')
    .sort((a, b) => b.score - a.score || a.space.title.localeCompare(b.space.title))
    .slice(0, 2)
    .map(({ space, score, promotedMatches, revalidateMatches }) => ({
      title: space.title,
      state: revalidateMatches.length > 0 ? 'leve' : space.brain_contract.state,
      load_first: space.brain_contract.load_first.slice(0, MAX_STARTUP_ITEMS),
      carry_forward: unique([
        ...promotedMatches.map((item) => `promovido por outcome:${item}`),
        ...space.brain_contract.carry_forward,
      ]).slice(0, MAX_STARTUP_ITEMS),
      validate_before_use: unique([
        ...revalidateMatches.map((item) => `revalidar outcome:${item}`),
        ...space.brain_contract.validate_before_use,
      ]).slice(0, MAX_STARTUP_ITEMS),
      automation_hooks: space.brain_contract.automation_hooks.slice(0, MAX_STARTUP_ITEMS),
      human_boundary: space.brain_contract.human_boundary.slice(0, MAX_STARTUP_ITEMS),
      artifact_refs: space.brain_contract.artifact_refs.slice(0, MAX_STARTUP_ITEMS),
      evidence: space.brain_contract.evidence.slice(0, MAX_STARTUP_ITEMS),
      confidence: Math.min(100, Math.max(0, Math.round(score))),
    }))
}

function sanitizeRouteKey(value: unknown): string | null {
  if (!isString(value)) return null
  const clean = sanitizeProviderSafeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9:._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-:]+|[-:]+$/g, '')
    .slice(0, 96)
  return clean || null
}

function collectEvolutionStats(
  entries: Array<[string, AwisWorkspaceMemorySnapshot]>,
  selectSignals: (memory: AwisWorkspaceMemorySnapshot) => AwisWorkspaceMemorySignal[],
  kind: AwisWorkspaceEvolutionPattern['kind'],
): AwisWorkspaceEvolutionPattern[] {
  const stats = new Map<string, { workspaces: Set<string>; totalSeen: number }>()
  for (const [key, memory] of entries) {
    for (const signal of selectSignals(memory)) {
      const label = signal.label.trim()
      if (!label) continue
      const existing = stats.get(label) ?? { workspaces: new Set<string>(), totalSeen: 0 }
      existing.workspaces.add(key)
      existing.totalSeen += Math.max(1, signal.seenCount)
      stats.set(label, existing)
    }
  }
  return Array.from(stats.entries()).map(([label, stat]) => ({
    label,
    kind,
    seen_in_workspaces: stat.workspaces.size,
    total_seen: stat.totalSeen,
    recommended_use: recommendedUseForPattern(kind, label),
  }))
}

function spacePackStrength(pack: AwisWorkspaceSpacePackInput): number {
  return pack.message_count
    + pack.decision_count * 4
    + pack.pending_count * 3
    + pack.risk_count * 3
    + pack.artifact_count * 5
    + pack.mode_count
}

function spacePackFreshness(pack: AwisWorkspaceSpacePackInput): 'recente' | 'estavel' | 'frio' {
  const latestSessionAt = pack.sessions
    .map((session) => session.last_active_at)
    .filter(isString)
    .map((value) => Date.parse(value))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0]
  const generatedAt = pack.generated_at ? Date.parse(pack.generated_at) : NaN
  const timestamp = Number.isFinite(latestSessionAt)
    ? latestSessionAt
    : Number.isFinite(generatedAt)
      ? generatedAt
      : NaN
  if (!Number.isFinite(timestamp)) return 'estavel'
  const ageMs = Date.now() - timestamp
  if (ageMs <= 1000 * 60 * 60 * 24 * 3) return 'recente'
  if (ageMs <= 1000 * 60 * 60 * 24 * 21) return 'estavel'
  return 'frio'
}

function collectFailureSignatureStats(
  entries: Array<[string, AwisWorkspaceMemorySnapshot]>,
): AwisWorkspaceEvolutionPattern[] {
  const stats = new Map<string, { workspaces: Set<string>; totalSeen: number }>()
  for (const [key, memory] of entries) {
    const labels = [
      memory.failureCount > 0 ? 'envio exigiu recuperação' : null,
      ...memory.recentOutcomes
        .filter((outcome) => outcome.status === 'failed' || outcome.status === 'rejected' || outcome.status === 'cancelled' || outcome.status === 'send_failed')
        .map((outcome) => `falha:${outcome.channel}:${outcome.status}`),
      ...memory.driftEvents.map(() => 'workspace mudou desde a última leitura'),
    ].filter(isString)
    for (const label of unique(labels)) {
      const existing = stats.get(label) ?? { workspaces: new Set<string>(), totalSeen: 0 }
      existing.workspaces.add(key)
      existing.totalSeen += 1
      stats.set(label, existing)
    }
  }
  return Array.from(stats.entries()).map(([label, stat]) => ({
    label,
    kind: 'failure',
    seen_in_workspaces: stat.workspaces.size,
    total_seen: stat.totalSeen,
    recommended_use: 'antecipar checagem antes de executar ou enviar',
  }))
}

function rankSignals(labels: string[]): string[] {
  const counts = new Map<string, number>()
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label]) => label)
}

function taskSignalsFromInput(userInput: string | null | undefined): string[] {
  const value = userInput?.toLowerCase() ?? ''
  if (!value.trim()) return []
  const aliases: Array<[string, string[]]> = [
    ['bug', ['bug', 'erro', 'quebrou', 'falha', 'corrigir', 'fix', 'crash', '500']],
    ['teste', ['teste', 'test', 'tsc', 'vitest', 'phpunit', 'validar', 'build']],
    ['desktop', ['desktop', 'tauri', 'composer', 'surface', 'atlas ai', 'awis']],
    ['backend', ['backend', 'server', 'laravel', 'php', 'api', 'controller']],
    ['mobile', ['mobile', 'expo', 'ios', 'android', 'app']],
    ['docs', ['doc', 'documentação', 'documentacao', 'readme', 'agents']],
    ['space', ['space', 'sessões', 'sessoes', 'conversas', 'contexto']],
    ['workbench', ['comparar', 'lado a lado', 'pane', 'workbench']],
    ['pesquisa', ['pesquisa', 'research', 'investigar', 'analisar', 'explicar']],
    ['design', ['design', 'visual', 'ux', 'ui', 'polir', 'premium']],
    ['ops', ['deploy', 'produção', 'producao', 'terminal', 'comando', 'migration', 'banco']],
  ]
  const matched = aliases
    .filter(([, terms]) => terms.some((term) => value.includes(term)))
    .map(([label]) => label)
  const tokens = value
    .replace(/https?:\/\/\S+/g, ' ')
    .split(/[^a-z0-9._/-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && token.length <= 36 && !token.includes('/users/'))
    .slice(0, MAX_STARTUP_ITEMS)
  return unique([...matched, ...tokens]).slice(0, MAX_STARTUP_ITEMS)
}

function taskKindFromSignals(signals: string[]): AwisWorkspaceTaskContextProjection['task_kind'] {
  const joined = signals.join(' ')
  if (/bug|erro|falha|corrigir|fix|crash|500|quebrou/.test(joined)) return 'bug_fix'
  if (/design|visual|ux|ui|polir|premium/.test(joined)) return 'design'
  if (/deploy|produção|producao|terminal|migration|banco|ops/.test(joined)) return 'ops'
  if (/pesquisa|research|investigar|explicar/.test(joined)) return 'research'
  if (/analisar|analise|comparar|workbench|lado a lado/.test(joined)) return 'analysis'
  if (/codigo|código|implementar|refatorar|desktop|backend|mobile|teste/.test(joined)) return 'code_change'
  return 'unknown'
}

function buildComponentIntentRanking(
  pack: AwisWorkspaceContextPack,
  promptSignals: string[],
): AwisWorkspaceTaskContextProjection['recommended_context']['component_intent_ranking'] {
  const componentMemory = pack.component_memory?.strongest_components ?? []
  const topologyComponents = pack.topology?.components ?? []
  const hints = pack.component_memory?.routing_hints ?? []
  const ranking = componentMemory.map((component) => {
    const topology = topologyComponents.find((item) => item.key === component.key)
    const haystack = [
      component.key,
      component.role,
      ...component.stack,
      ...component.load_first,
      ...component.commands,
      ...component.docs,
      ...(topology?.manifests ?? []),
      ...(topology?.docs ?? []),
      ...(topology?.commands.map((command) => command.command) ?? []),
    ].join(' ').toLowerCase()
    const hintMatches = hints
      .filter((hint) => hint.component === component.key)
      .filter((hint) => promptSignals.some((signal) => signalMatchesText(signal, hint.signal)))
    const directMatches = promptSignals.filter((signal) => signalMatchesText(signal, haystack))
    const matched = unique([
      ...directMatches,
      ...hintMatches.map((hint) => hint.signal),
    ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
    const maturityBoost = component.maturity === 'battle_tested'
      ? 18
      : component.maturity === 'stable'
        ? 12
        : component.maturity === 'learning'
          ? 6
          : 0
    const score = clampConfidence(
      matched.length * 24
      + Math.round(component.confidence * 0.45)
      + maturityBoost
      + Math.min(18, hintMatches.length * 9)
      - component.cautions.length * 10,
    )
    const action: AwisWorkspaceTaskContextProjection['recommended_context']['component_intent_ranking'][number]['action'] =
      component.reuse_policy.validate_before_execution || component.cautions.length > 0
        ? 'revalidate'
        : score >= 72
          ? 'load_first'
          : 'summarize'
    return {
      key: component.key,
      score,
      matched,
      action,
    }
  })
    .filter((item) => item.score > 0 || item.matched.length > 0)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, MAX_STARTUP_ITEMS)
  return ranking
}

function selectSemanticMatches(
  semanticIndex: AwisWorkspaceSemanticIndexProjection | null,
  promptSignals: string[],
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
): AwisWorkspaceTaskContextProjection['recommended_context']['semantic_matches'] {
  if (!semanticIndex || promptSignals.length === 0) return []
  return semanticIndex.query_aliases
    .map((alias) => {
      const signalMatches = promptSignals.filter((signal) => (
        signalMatchesText(signal, alias.alias)
        || signalMatchesText(alias.alias, signal)
        || alias.intent.toLowerCase().includes(signal.toLowerCase())
      ))
      const taskMatch = alias.task_kinds.includes(taskKind) || taskKind === 'unknown'
      const confidence = clampConfidence(alias.confidence + signalMatches.length * 10 + (taskMatch ? 8 : -8))
      return {
        alias: alias.alias,
        intent: alias.intent,
        component_keys: alias.component_keys,
        load: alias.load,
        validate: alias.validate,
        confidence,
        matched: signalMatches.length,
      }
    })
    .filter((match) => match.matched > 0 || (taskKind !== 'unknown' && match.confidence >= 82))
    .sort((a, b) => b.confidence - a.confidence || b.matched - a.matched || a.alias.localeCompare(b.alias))
    .slice(0, 4)
    .map(({ matched: _matched, ...match }) => match)
}

function selectImpactRadius(
  impactMap: AwisWorkspaceImpactMapProjection | null,
  components: AwisWorkspaceTaskContextProjection['recommended_context']['components'],
  semanticMatches: AwisWorkspaceTaskContextProjection['recommended_context']['semantic_matches'],
): AwisWorkspaceTaskContextProjection['recommended_context']['impact_radius'] {
  const componentKeys = unique([
    ...components.map((component) => component.key),
    ...semanticMatches.flatMap((match) => match.component_keys),
  ].map(sanitizeComponentKey).filter(isString))
  const impacts = (impactMap?.component_impacts ?? [])
    .filter((impact) => componentKeys.includes(impact.component_key))
    .sort((a, b) => riskWeight(b.risk) - riskWeight(a.risk) || b.confidence - a.confidence)
  const primary = impacts[0] ?? null
  const affectedComponents = unique(impacts.flatMap((impact) => impact.affected_components)).slice(0, MAX_STARTUP_ITEMS)
  const validationCascade = unique(impacts.flatMap((impact) => impact.validation_cascade)).slice(0, MAX_STARTUP_ITEMS)
  const crossWorkspace = unique((impactMap?.cross_workspace_impacts ?? [])
    .filter((impact) => impact.trigger_components.some((component) => componentKeys.includes(component)))
    .map((impact) => impact.workspace_hint)).slice(0, MAX_STARTUP_ITEMS)
  return {
    primary_component: primary?.component_key ?? componentKeys[0] ?? null,
    affected_components: affectedComponents,
    validation_cascade: validationCascade,
    cross_workspace: crossWorkspace,
    risk: primary?.risk ?? 'low',
    reason: primary?.reason ?? (componentKeys[0] ? `impacto restrito a ${componentKeys[0]}` : 'sem componente dominante para calcular impacto'),
  }
}

function riskWeight(risk: 'low' | 'medium' | 'high'): number {
  return risk === 'high' ? 3 : risk === 'medium' ? 2 : 1
}

function buildComponentContextPacks(
  pack: AwisWorkspaceContextPack,
  ranking: AwisWorkspaceTaskContextProjection['recommended_context']['component_intent_ranking'],
  selectedComponentKeys: Set<string>,
): AwisWorkspaceTaskContextProjection['recommended_context']['component_context_packs'] {
  return ranking
    .filter((item) => selectedComponentKeys.has(item.key) || item.action === 'load_first')
    .slice(0, 3)
    .flatMap((ranked) => {
      const memory = pack.component_memory?.strongest_components.find((component) => component.key === ranked.key)
      if (!memory) return []
      const mode: AwisWorkspaceTaskContextProjection['recommended_context']['component_context_packs'][number]['mode'] =
        ranked.action === 'revalidate'
          ? 'guarded'
          : ranked.action === 'summarize'
            ? 'summary'
            : 'full'
      return [{
        key: memory.key,
        mode,
        load: unique([
          ...memory.load_first,
          ...memory.stack.map((item) => `stack:${item}`),
          ...memory.docs.map((item) => `doc:${item}`),
        ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
        validate: unique([
          ...memory.commands,
          ...(memory.reuse_policy.validate_before_execution ? [`validar área:${memory.key}`] : []),
        ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
        avoid: unique([
          ...memory.cautions,
          ...(mode === 'guarded' ? ['não executar sem validar área'] : []),
        ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
        reason: ranked.matched[0]
          ? `intenção bateu em ${ranked.matched[0]}`
          : memory.reuse_policy.reason,
      }]
    })
}

function buildFolderFocusPlan(
  pack: AwisWorkspaceContextPack,
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
  selectedComponents: AwisWorkspaceTopologyProjection['components'],
  componentPacks: AwisWorkspaceTaskContextProjection['recommended_context']['component_context_packs'],
): AwisWorkspaceTaskContextProjection['recommended_context']['folder_focus'] {
  const primary = selectedComponents[0] ?? null
  const selectedKeys = new Set(selectedComponents.map((component) => component.key))
  const otherComponents = (pack.topology?.components ?? [])
    .filter((component) => !selectedKeys.has(component.key))
    .slice(0, MAX_STARTUP_ITEMS)
  const include = unique([
    primary ? `${primary.key}/` : null,
    ...(primary?.manifests ?? []),
    ...(primary?.docs ?? []),
    ...componentPacks.flatMap((componentPack) => componentPack.load),
  ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const summarize = unique([
    ...(selectedComponents.length > 1
      ? selectedComponents.slice(1).map((component) => `${component.key}/`)
      : []),
    ...(pack.relations?.related_workspaces.map((workspace) => `relação:${workspace.workspace_hint}`) ?? []),
    ...(pack.spaces?.strongest_spaces.slice(0, 2).map((space) => `Space:${space.title}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const avoid = unique([
    ...(otherComponents.map((component) => `${component.key}/`)),
    pack.topology?.root.scan_truncated ? 'varredura bruta do workspace inteiro' : null,
    'paths absolutos do Mac',
    'arquivos fora da pasta foco sem sinal de intenção',
  ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const secondaryComponents = selectedComponents.slice(1).filter((component) => component.key !== 'docs' && component.key !== 'workspace-root')
  const taskBenefitsFromFocusedFolder = taskKind === 'bug_fix' || taskKind === 'code_change' || taskKind === 'design'
  const loadScope: AwisWorkspaceTaskContextProjection['recommended_context']['folder_focus']['load_scope'] =
    secondaryComponents.length > 0 && !taskBenefitsFromFocusedFolder
      ? 'multi_component'
      : primary
        ? 'component'
        : 'workspace_root'

  return {
    primary_component: primary?.key ?? null,
    load_scope: loadScope,
    include,
    summarize,
    avoid,
    reason: primary
      ? `carregar ${primary.key} primeiro para ${taskKind}`
      : 'sem componente dominante; usar resumo do workspace até a intenção ficar clara',
  }
}

function buildTaskGoldSelection(
  pack: AwisWorkspaceContextPack,
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
  selectedComponents: AwisWorkspaceTaskContextProjection['recommended_context']['components'],
  folderFocus: AwisWorkspaceTaskContextProjection['recommended_context']['folder_focus'],
): AwisWorkspaceTaskContextProjection['recommended_context']['task_gold'] {
  const gold: AwisWorkspaceTaskContextProjection['recommended_context']['task_gold'] = []
  const push = (item: AwisWorkspaceTaskContextProjection['recommended_context']['task_gold'][number]) => {
    const label = sanitizeProviderSafeText(item.label).slice(0, 140)
    const why = sanitizeProviderSafeText(item.why).slice(0, 160)
    if (!label || !why) return
    if (gold.some((existing) => existing.kind === item.kind && existing.label === label)) return
    const goldLabel = contextGoldLabel(item.kind, label)
    const promoted = pack.memory?.operational.context_gold.promoted.includes(goldLabel) === true
    const revalidate = pack.memory?.operational.context_gold.revalidate.includes(goldLabel) === true
    gold.push({
      kind: item.kind,
      label,
      why: revalidate ? `${why} · revalidar por outcome recente` : promoted ? `${why} · comprovado em outcome real` : why,
      confidence: normalizePercent(item.confidence + (promoted ? 10 : 0) - (revalidate ? 18 : 0)),
    })
  }

  const route = pack.task_router?.routes.find((route) => route.task_kind === taskKind) ?? null
  if (route) {
    push({
      kind: 'route',
      label: route.route_key,
      why: route.policy === 'prefer'
        ? 'rota promovida por resultados reais'
        : route.policy === 'revalidate'
          ? 'rota existe, mas precisa revalidar antes de confiar'
          : route.reason,
      confidence: route.confidence,
    })
  }

  for (const outcome of pack.session_gold?.strongest_outcomes ?? []) {
    const matchesTask = outcome.label.includes(`tarefa:${taskKind}`) || taskKind === 'unknown'
    if (!matchesTask && !outcome.label.includes('context pack')) continue
    push({
      kind: 'session_outcome',
      label: outcome.label,
      why: outcome.evidence[0] ?? 'resultado real do workspace',
      confidence: outcome.confidence,
    })
  }

  for (const command of pack.session_gold?.proven_commands ?? []) {
    const matchesTask = command.task_kinds.length === 0 || command.task_kinds.includes(taskKind)
    if (!matchesTask && taskKind !== 'bug_fix' && taskKind !== 'code_change') continue
    push({
      kind: 'command',
      label: command.command,
      why: `${command.success_count} sucesso(s) real(is)`,
      confidence: clampConfidence(68 + command.success_count * 8),
    })
  }

  for (const component of selectedComponents.slice(0, 3)) {
    push({
      kind: 'component',
      label: component.key,
      why: component.why,
      confidence: 72,
    })
  }

  const matchingSpace = pack.spaces?.strongest_spaces.find((space) => {
    const haystack = [
      space.title,
      ...space.recommended_use,
      ...space.session_summaries.map((session) => session.title),
    ].join(' ').toLowerCase()
    return taskKind === 'analysis'
      || taskKind === 'research'
      || taskKind === 'design'
      || selectedComponents.some((component) => haystack.includes(component.key.toLowerCase()))
      || (folderFocus.primary_component ? haystack.includes(folderFocus.primary_component.toLowerCase()) : false)
  }) ?? pack.spaces?.strongest_spaces[0] ?? null
  if (matchingSpace) {
    push({
      kind: 'space',
      label: matchingSpace.title,
      why: `${matchingSpace.session_count} sessões · ${matchingSpace.message_count} mensagens`,
      confidence: clampConfidence(54 + matchingSpace.session_count * 7 + matchingSpace.decision_count * 5 + matchingSpace.artifact_count * 4),
    })
  }

  if (pack.artifact_replay?.latest_artifact_hash) {
    push({
      kind: 'artifact',
      label: pack.artifact_replay.latest_artifact_hash,
      why: `${pack.artifact_replay.artifact_count} artifact(s) preservam partida anterior`,
      confidence: clampConfidence(62 + pack.artifact_replay.artifact_count * 5),
    })
  }

  return gold
    .sort((a, b) => b.confidence - a.confidence || a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label))
    .slice(0, MAX_STARTUP_ITEMS)
}

function buildTaskEvidenceGate(
  pack: AwisWorkspaceContextPack,
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
  taskGold: AwisWorkspaceTaskContextProjection['recommended_context']['task_gold'],
  componentPacks: AwisWorkspaceTaskContextProjection['recommended_context']['component_context_packs'],
  validationCommands: string[],
  cautions: string[],
): AwisWorkspaceTaskContextProjection['recommended_context']['evidence_gate'] {
  const trusted = unique([
    ...taskGold
      .filter((item) => item.confidence >= 78 && !/revalidar/i.test(item.why))
      .map((item) => `${item.kind}:${item.label}`),
    ...(pack.session_gold?.proven_commands
      .filter((command) => command.success_count > 0 && (command.task_kinds.length === 0 || command.task_kinds.includes(taskKind)))
      .map((command) => `command:${command.command}`) ?? []),
    ...(pack.context_kernel?.priority_load
      .filter((item) => item.confidence >= 80)
      .map((item) => `${item.kind}:${item.label}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  const verifyBeforeTrust = unique([
    ...validationCommands.map((command) => `validar:${command}`),
    ...taskGold
      .filter((item) => item.confidence < 78 || /revalidar/i.test(item.why))
      .map((item) => `${item.kind}:${item.label}`),
    ...componentPacks.flatMap((pack) => pack.validate.map((item) => `${pack.key}:${item}`)),
    ...(pack.memory?.operational.context_gold.revalidate ?? []),
    ...(pack.task_router?.routes
      .filter((route) => route.task_kind === taskKind && route.policy === 'revalidate')
      .map((route) => `route:${route.route_key}`) ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS * 2)

  const missingOrStale = unique([
    ...(pack.memory_freshness?.evidence.missing ?? []),
    ...(pack.memory_freshness?.evidence.revalidate ?? []),
    ...(pack.retention?.lifecycle.revalidate ?? []),
    ...(pack.artifact_replay ? [] : ['artifact replay ausente']),
    ...(pack.workspace.root_path_known ? [] : ['pasta local não vinculada']),
    ...(pack.startup_orchestration?.revalidation_gate.required_before_send ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  const humanBoundary = unique([
    ...(pack.execution_doctrine?.preflight.human_responsibility ?? []),
    ...(pack.context_kernel?.validation_plan.requires_human_confirmation ? ['confirmação humana antes de executar'] : []),
    ...(pack.startup_orchestration?.revalidation_gate.needs_human_confirmation ? ['confirmar risco antes de agir'] : []),
    ...cautions.filter((caution) => /sensível|risco|bloquead|recuper|produção|delete|destrut/i.test(caution)),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  const reason = trusted.length > 0
    ? `${trusted.length} evidência(s) fortes; ${verifyBeforeTrust.length} exigem revalidação`
    : verifyBeforeTrust.length > 0
      ? 'contexto útil, mas precisa prova antes de confiar'
      : missingOrStale.length > 0
        ? 'partida com memória incompleta ou stale'
        : 'sem evidência operacional suficiente para promover contexto'

  return {
    trusted,
    verify_before_trust: verifyBeforeTrust,
    missing_or_stale: missingOrStale,
    human_boundary: humanBoundary,
    reason,
  }
}

function buildTaskContextBudget(
  pack: AwisWorkspaceContextPack,
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
  folderFocus: AwisWorkspaceTaskContextProjection['recommended_context']['folder_focus'],
  componentPacks: AwisWorkspaceTaskContextProjection['recommended_context']['component_context_packs'],
  evidenceGate: AwisWorkspaceTaskContextProjection['recommended_context']['evidence_gate'],
): AwisWorkspaceTaskContextProjection['recommended_context']['context_budget'] {
  const kernelMode = pack.context_kernel?.budget.mode ?? 'lean'
  const hasFocusedFolder = Boolean(folderFocus.primary_component && folderFocus.load_scope === 'component')
  const needsBroadContext = taskKind === 'analysis' || taskKind === 'research' || taskKind === 'design' || folderFocus.load_scope === 'multi_component'
  const hasStaleEvidence = evidenceGate.missing_or_stale.length > 0 || evidenceGate.verify_before_trust.length > evidenceGate.trusted.length
  const mode: AwisWorkspaceTaskContextProjection['recommended_context']['context_budget']['mode'] = hasFocusedFolder && !needsBroadContext
    ? 'lean'
    : kernelMode === 'deep' && !hasStaleEvidence
      ? 'deep'
      : needsBroadContext
        ? 'balanced'
        : kernelMode
  const maxItems = mode === 'deep'
    ? MAX_STARTUP_ITEMS
    : mode === 'balanced'
      ? 7
      : 4
  const loadFull = unique([
    ...(folderFocus.include.slice(0, mode === 'lean' ? 3 : 5)),
    ...componentPacks
      .filter((pack) => pack.mode === 'full' || pack.key === folderFocus.primary_component)
      .flatMap((pack) => pack.load.slice(0, 2).map((item) => `${pack.key}:${item}`)),
    ...(pack.context_kernel?.compression_plan.send_full ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, maxItems)
  const summarize = unique([
    ...(folderFocus.summarize.length > 0 ? folderFocus.summarize : []),
    ...componentPacks
      .filter((pack) => pack.mode !== 'full')
      .flatMap((pack) => pack.load.slice(0, 2).map((item) => `${pack.key}:${item}`)),
    ...(pack.context_kernel?.compression_plan.summarize ?? []),
    ...(pack.startup_orchestration?.context_budget.prefer_summary ? ['partida:preferir resumo'] : []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const omit = unique([
    ...(folderFocus.avoid.length > 0 ? folderFocus.avoid : []),
    ...(pack.context_kernel?.compression_plan.omit ?? []),
    ...(pack.retention?.lifecycle.drop_or_summarize ?? []),
    ...(hasStaleEvidence ? evidenceGate.missing_or_stale.map((item) => `stale:${item}`) : []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const reason = hasFocusedFolder && !needsBroadContext
    ? `carregar área foco ${folderFocus.primary_component}`
    : needsBroadContext
      ? 'tarefa pede comparação ou contexto amplo'
      : hasStaleEvidence
        ? 'memória exige resumo e revalidação antes de ampliar'
        : pack.context_kernel?.budget.reason ?? 'orçamento AWIS por tarefa'

  return {
    mode,
    max_items: maxItems,
    load_full: loadFull,
    summarize,
    omit,
    reason,
  }
}

function buildTaskNextSessionContract(
  pack: AwisWorkspaceContextPack,
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
  contextBudget: AwisWorkspaceTaskContextProjection['recommended_context']['context_budget'],
  evidenceGate: AwisWorkspaceTaskContextProjection['recommended_context']['evidence_gate'],
  validationCommands: string[],
): AwisWorkspaceTaskContextProjection['learning_hooks']['next_session_contract'] {
  const matchingValidationPlans = pack.learning?.task_memory.validation_plans
    .filter((plan) => plan.task_kind === taskKind && plan.confidence >= 60) ?? []
  const firstLoad = unique([
    ...contextBudget.load_full.map((item) => `full:${item}`),
    ...contextBudget.summarize.slice(0, 3).map((item) => `summary:${item}`),
    ...matchingValidationPlans.flatMap((plan) => plan.component_keys.map((component) => `component:${component}`)),
    ...(pack.continuity?.next_session_plan.first_load ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const validateWith = unique([
    ...validationCommands,
    ...matchingValidationPlans.flatMap((plan) => plan.commands),
    ...(pack.continuity?.next_session_plan.validate_with ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const promoteWhen = unique([
    validateWith.length > 0 ? `validação verde:${validateWith[0]}` : null,
    evidenceGate.trusted[0] ? `evidência mantida:${evidenceGate.trusted[0]}` : null,
    contextBudget.mode === 'lean' ? 'orçamento lean suficiente' : null,
    ...(pack.context_kernel?.learning_contract.promote_artifact_after_success ? ['preservar artifact após sucesso'] : []),
  ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS)
  const demoteWhen = unique([
    ...evidenceGate.verify_before_trust.slice(0, 3).map((item) => `falhou revalidação:${item}`),
    ...evidenceGate.missing_or_stale.slice(0, 3).map((item) => `stale:${item}`),
    ...contextBudget.omit.slice(0, 3).map((item) => `evitar:${item}`),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)

  return {
    first_load: firstLoad,
    validate_with: validateWith,
    preserve_as_artifact: promoteWhen.length > 0 || pack.context_kernel?.learning_contract.promote_artifact_after_success === true,
    promote_when: promoteWhen,
    demote_when: demoteWhen,
  }
}

function buildTaskRecoveryPlaybook(
  pack: AwisWorkspaceContextPack,
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
  evidenceGate: AwisWorkspaceTaskContextProjection['recommended_context']['evidence_gate'],
  contextBudget: AwisWorkspaceTaskContextProjection['recommended_context']['context_budget'],
  validationCommands: string[],
): AwisWorkspaceTaskContextProjection['execution_plan']['recovery_playbook'] {
  const failedPlans = pack.learning?.task_memory.validation_plans
    .filter((plan) => plan.task_kind === taskKind && plan.failure_count > 0) ?? []
  const fallbackValidation = unique([
    ...failedPlans.flatMap((plan) => plan.commands),
    ...(pack.startup_playbook?.execution.fallback_validation_commands ?? []),
    ...(pack.execution_doctrine?.command_policy.revalidate ?? []),
    ...validationCommands.slice(1),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const demoteContext = unique([
    ...failedPlans.flatMap((plan) => [
      ...plan.context_gold.map((item) => `ouro:${item}`),
      ...plan.component_keys.map((item) => `componente:${item}`),
    ]),
    ...evidenceGate.verify_before_trust.map((item) => `revalidar:${item}`),
    ...contextBudget.omit.map((item) => `omitir:${item}`),
    ...(pack.session_gold?.recovery_patterns ?? []),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
  const retryOrder = unique([
    contextBudget.mode === 'lean' ? 'retry com budget lean' : 'retry com resumo antes de contexto full',
    fallbackValidation[0] ? `rodar fallback:${fallbackValidation[0]}` : null,
    evidenceGate.human_boundary[0] ? `confirmar humano:${evidenceGate.human_boundary[0]}` : null,
    demoteContext[0] ? `demover:${demoteContext[0]}` : null,
  ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS)
  const safeResume = unique([
    contextBudget.load_full[0] ? `retomar por:${contextBudget.load_full[0]}` : null,
    contextBudget.summarize[0] ? `resumir antes:${contextBudget.summarize[0]}` : null,
    validationCommands[0] ? `validar novamente:${validationCommands[0]}` : null,
    pack.provider_strategy?.fallback_order[0] ? `provider fallback:${pack.provider_strategy.fallback_order[0]}` : null,
  ].filter(isString).map(sanitizeProviderSafeText)).slice(0, MAX_STARTUP_ITEMS)
  const reason = failedPlans.length > 0
    ? `${failedPlans.length} plano(s) falharam para ${taskKind}; recuperar antes de promover`
    : pack.session_gold?.recovery_patterns[0]
      ? `cautela recente: ${pack.session_gold.recovery_patterns[0]}`
      : evidenceGate.verify_before_trust.length > 0
        ? 'há contexto útil que precisa revalidação antes de retry'
        : 'sem falha recente; retry seguro usa validação padrão'

  return {
    retry_order: retryOrder,
    fallback_validation: fallbackValidation,
    demote_context: demoteContext,
    safe_resume: safeResume,
    reason: sanitizeProviderSafeText(reason).slice(0, 180),
  }
}

function selectDoctrineDriversForTask(
  doctrine: AwisWorkspaceExecutionDoctrineProjection | null | undefined,
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
): string[] {
  return unique((doctrine?.doctrine_drivers ?? [])
    .filter((driver) => driver.applies_to.includes(taskKind) || driver.applies_to.includes('unknown'))
    .sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name))
    .map((driver) => `${driver.name}:${driver.gate}`))
    .slice(0, MAX_STARTUP_ITEMS)
}

function providerPolicyWeight(policy: AwisWorkspaceProviderStrategyProjection['preferred'][number]['policy']): number {
  if (policy === 'prefer') return 4
  if (policy === 'use_when_matched') return 3
  if (policy === 'revalidate') return 2
  return 1
}

function providerStrategyReason(
  policy: AwisWorkspaceProviderStrategyProjection['preferred'][number]['policy'],
  successCount: number,
  failureCount: number,
  avgLatency: number | null,
): string {
  const latency = avgLatency ? ` · latência média ${avgLatency}ms` : ''
  if (policy === 'prefer') return `${successCount} sucessos recentes sem falha${latency}`
  if (policy === 'use_when_matched') return `histórico útil, ainda em aprendizado${latency}`
  if (policy === 'revalidate') return `${failureCount} falha(s) recente(s); usar com validação${latency}`
  return `${failureCount} falha(s) recente(s); evitar até novo sucesso comprovado${latency}`
}

function intentSignalsForTaskRoute(
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
  components: string[],
  spaces: string[],
  validations: string[],
): string[] {
  const baseByTask: Record<AwisWorkspaceTaskContextProjection['task_kind'], string[]> = {
    bug_fix: ['falha', 'bug', 'corrigir', 'regressão', 'teste quebrado'],
    code_change: ['implementar', 'refatorar', 'alterar código', 'feature'],
    research: ['pesquisar', 'investigar', 'comparar', 'referência'],
    ops: ['build', 'deploy', 'execução', 'infra', 'comando'],
    design: ['interface', 'ux', 'visual', 'composer', 'surface'],
    analysis: ['analisar', 'mapear', 'explicar', 'diagnóstico'],
    unknown: ['contexto inicial'],
  }
  return unique([
    ...(baseByTask[taskKind] ?? []),
    ...components.slice(0, 2).map((component) => `área:${component}`),
    spaces.length > 0 ? 'Space disponível' : null,
    validations.length > 0 ? 'validação disponível' : null,
  ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
}

function buildTaskRouteEvidencePlan(input: {
  taskKind: AwisWorkspaceTaskContextProjection['task_kind']
  loadFirst: string[]
  useComponents: string[]
  useSpaces: string[]
  useArtifacts: string[]
  validateWith: string[]
  contextKernel: AwisWorkspaceContextKernelProjection | null
  sessionGold: AwisWorkspaceSessionGoldProjection | null
  memoryFreshness: AwisWorkspaceMemoryFreshnessProjection | null
  routePolicy: AwisWorkspaceTaskRouterProjection['routes'][number]['policy']
  routeSuccessRate: number | null
}): AwisWorkspaceTaskRouterProjection['routes'][number]['evidence_plan'] {
  const codeLike = input.taskKind === 'bug_fix' || input.taskKind === 'code_change' || input.taskKind === 'ops'
  return {
    load: unique([
      ...input.loadFirst,
      ...input.useComponents.map((component) => `carregar área:${component}`),
      ...input.useSpaces.map((space) => `resumir Space:${space}`),
      ...input.useArtifacts.slice(0, 2).map((artifact) => `replay artefato:${artifact}`),
    ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
    verify: unique([
      ...input.validateWith.map((command) => `rodar/verificar:${command}`),
      ...(input.contextKernel?.validation_plan.commands.map((command) => `kernel:${command}`) ?? []),
      ...(input.memoryFreshness?.promotion_gate.required_before_promotion.map((item) => `frescor:${item}`) ?? []),
      input.routePolicy === 'revalidate' ? 'rota teve falha recente: exigir evidência local' : null,
      codeLike && input.validateWith.length === 0 ? 'definir validação mínima antes de alterar código' : null,
    ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
    preserve: unique([
      ...(input.sessionGold?.next_session_hooks.after_send.map((item) => `ouro:${item}`) ?? []),
      input.routeSuccessRate !== null ? `resultado da rota:${input.routeSuccessRate}%` : null,
      input.useSpaces.length > 0 ? 'atualizar pack do Space usado' : null,
      input.useArtifacts.length > 0 ? 'promover artefato se a execução passar' : null,
    ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
    learn: unique([
      `registrar outcome:${input.taskKind}`,
      'registrar contexto carregado',
      'registrar validação executada',
      input.routePolicy === 'prefer' ? 'promover rota após novo sucesso' : 'recalibrar rota após resultado',
    ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
  }
}

function buildTaskRouteAutomationHooks(input: {
  taskKind: AwisWorkspaceTaskContextProjection['task_kind']
  validateWith: string[]
  useComponents: string[]
  useSpaces: string[]
  evidencePlan: AwisWorkspaceTaskRouterProjection['routes'][number]['evidence_plan']
  routePolicy: AwisWorkspaceTaskRouterProjection['routes'][number]['policy']
  providerStrategy: AwisWorkspaceProviderStrategyProjection | null
}): AwisWorkspaceTaskRouterProjection['routes'][number]['automation_hooks'] {
  return {
    before_send: unique([
      ...input.evidencePlan.load.slice(0, 3),
      input.routePolicy === 'revalidate' ? 'marcar rota como cautelosa' : null,
      input.providerStrategy?.preferred[0] ? `provider:${input.providerStrategy.preferred[0].provider}` : null,
    ].filter(isString).map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
    after_success: unique([
      `promover rota:${input.taskKind}`,
      ...input.useComponents.slice(0, 2).map((component) => `promover área:${component}`),
      ...input.useSpaces.slice(0, 1).map((space) => `atualizar Space:${space}`),
      ...input.validateWith.slice(0, 2).map((command) => `confiar validação:${command}`),
    ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
    after_failure: unique([
      `revalidar rota:${input.taskKind}`,
      ...input.validateWith.slice(0, 2).map((command) => `marcar validação para recovery:${command}`),
      'preservar handoff de falha provider-safe',
      'não promover contexto sem evidência',
    ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS),
  }
}

function taskRouterReason(
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
  loadCount: number,
  validationCount: number,
  spaceCount: number,
  policy: AwisWorkspaceTaskRouterProjection['routes'][number]['policy'] = 'use_when_matched',
  successRate: number | null = null,
): string {
  const parts = [
    `${loadCount} contexto(s) priorizado(s)`,
    validationCount > 0 ? `${validationCount} validação(ões)` : null,
    spaceCount > 0 ? `${spaceCount} Space(s) reutilizável(is)` : null,
    policy === 'prefer' && successRate !== null ? `${successRate}% sucesso recente` : null,
    policy === 'revalidate' ? 'revalidar por falha recente' : null,
  ].filter(isString)
  if (taskKind === 'bug_fix') return `rota de correção: ${parts.join(' · ')}`
  if (taskKind === 'code_change') return `rota de mudança: ${parts.join(' · ')}`
  if (taskKind === 'research') return `rota de pesquisa: ${parts.join(' · ')}`
  if (taskKind === 'analysis') return `rota de análise: ${parts.join(' · ')}`
  if (taskKind === 'design') return `rota de UX/interface: ${parts.join(' · ')}`
  if (taskKind === 'ops') return `rota operacional: ${parts.join(' · ')}`
  return `rota genérica: ${parts.join(' · ')}`
}

function signalMatchesText(signal: string, text: string): boolean {
  const left = signal.toLowerCase().trim()
  const right = text.toLowerCase()
  if (!left || !right) return false
  const normalizedLeft = left.replace(/[\s_-]+/g, '')
  const normalizedRight = right.replace(/[\s_-]+/g, '')
  return right.includes(left) || normalizedRight.includes(normalizedLeft)
}

function commandsForTaskKind(
  taskKind: AwisWorkspaceTaskContextProjection['task_kind'],
  pack: AwisWorkspaceContextPack,
): string[] {
  const topology = pack.topology
  const codeValidation = unique([
    ...(topology?.execution_map.test_commands ?? []),
    ...(topology?.execution_map.check_commands ?? []),
    ...(pack.startup_briefing?.automation_plan.tests_to_run ?? []),
    ...(pack.learning?.trusted_commands.filter((command) => /test|tsc|lint|check/i.test(command)) ?? []),
  ])
  if (taskKind === 'bug_fix' || taskKind === 'code_change') return codeValidation
  if (taskKind === 'design') {
    return unique([
      ...(topology?.execution_map.check_commands ?? []),
      ...(topology?.execution_map.build_commands ?? []),
      ...codeValidation,
    ])
  }
  if (taskKind === 'ops') {
    return unique([
      ...(topology?.execution_map.build_commands ?? []),
      ...(pack.startup_briefing?.automation_plan.commands_to_prioritize ?? []),
    ])
  }
  if (taskKind === 'analysis' || taskKind === 'research') {
    return unique([
      ...(pack.learning?.trusted_commands ?? []),
      ...(pack.startup_briefing?.automation_plan.commands_to_prioritize ?? []),
    ])
  }
  return unique([
    ...(pack.startup_playbook?.execution.primary_validation_commands ?? []),
    ...(pack.startup_briefing?.automation_plan.tests_to_run ?? []),
  ])
}

function recommendedUseForPattern(kind: AwisWorkspaceEvolutionPattern['kind'], label: string): string {
  if (kind === 'command') return 'considerar como comando operacional quando a stack combinar'
  if (kind === 'language') return 'usar como pista de stack, nunca como prova única'
  if (/test|phpunit|vitest|tsx|cargo/i.test(label)) return 'priorizar validação equivalente quando aplicável'
  return 'reutilizar como padrão abstrato quando o workspace tiver sinais compatíveis'
}

function isFailedOutcome(status: string): boolean {
  return status === 'failed' || status === 'rejected' || status === 'cancelled' || status === 'send_failed'
}

function priorityWeight(priority: AwisWorkspaceAutomationProjection['maintenance_queue'][number]['priority']): number {
  return priority === 'high' ? 3 : priority === 'medium' ? 2 : 1
}

function contextKernelKindForRestore(
  kind: AwisWorkspaceContinuityProjection['restore_priority'][number]['kind'],
): AwisWorkspaceContextKernelProjection['priority_load'][number]['kind'] {
  if (kind === 'relation') return 'relation'
  if (kind === 'task_memory') return 'task_memory'
  return kind
}

function contextKernelKindForGraphNode(
  kind: AwisWorkspaceLivingGraphProjection['nodes'][number]['kind'],
): AwisWorkspaceContextKernelProjection['priority_load'][number]['kind'] {
  if (kind === 'related_workspace') return 'relation'
  return kind
}

function contextKernelKindForPreference(
  kind: string | undefined,
): AwisWorkspaceContextKernelProjection['priority_load'][number]['kind'] {
  if (kind === 'comando') return 'command'
  if (kind === 'Space') return 'space'
  if (kind === 'artefato') return 'artifact'
  if (kind === 'transferência') return 'relation'
  return 'session_gold'
}

function componentMatchesSignal(
  component: AwisWorkspaceTopologyProjection['components'][number],
  signal: string,
): boolean {
  const normalized = signal.toLowerCase()
  return [
    component.key,
    component.role,
    ...component.stack,
    ...component.manifests,
    ...component.docs,
    ...component.commands.map((command) => command.command),
  ].some((item) => normalized.includes(item.toLowerCase()) || item.toLowerCase().includes(normalized))
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function labelsForRelation(signals: AwisWorkspaceMemorySignal[]): string[] {
  return unique(signals.map((signal) => signal.label.trim()).filter(isString))
}

function contextGoldLabelsForRelation(memory: AwisWorkspaceMemorySnapshot): string[] {
  const operationalGold = buildContextGoldOperationalMemory(memory)
  return unique([
    ...operationalGold.promoted,
    ...memory.recentOutcomes.flatMap((outcome) => isFailedOutcome(outcome.status) ? [] : contextGoldLabelsForOutcome(outcome)),
  ].map(sanitizeProviderSafeText).filter(isString)).slice(0, MAX_STARTUP_ITEMS)
}

function validationPlanLabelsForRelation(memory: AwisWorkspaceMemorySnapshot): string[] {
  return unique(memory.recentOutcomes
    .filter((outcome) => !isFailedOutcome(outcome.status))
    .flatMap((outcome) => {
      const taskKind = outcome.taskKind ?? 'unknown'
      if (taskKind === 'unknown') return []
      return normalizeStringList(outcome.validationCommands, MAX_STARTUP_ITEMS)
        .filter((command) => /test|tsc|lint|check|build/i.test(command))
        .map((command) => `${taskKind}:${command}`)
    })
    .map(sanitizeProviderSafeText)
    .filter(isString))
    .slice(0, MAX_STARTUP_ITEMS)
}

function recoveryPatternLabelsForRelation(memory: AwisWorkspaceMemorySnapshot): string[] {
  return unique(memory.recentOutcomes
    .filter((outcome) => isFailedOutcome(outcome.status))
    .flatMap((outcome) => {
      const taskKind = outcome.taskKind ?? 'unknown'
      if (taskKind === 'unknown') return []
      const status = sanitizeProviderSafeText(outcome.status)
      const commands = normalizeStringList(outcome.validationCommands, MAX_STARTUP_ITEMS)
        .filter((command) => /test|tsc|lint|check|build/i.test(command))
      if (commands.length === 0) return [`${taskKind}:${status}`]
      return commands.map((command) => `${taskKind}:${status}:${command}`)
    })
    .map(sanitizeProviderSafeText)
    .filter(isString))
    .slice(0, MAX_STARTUP_ITEMS)
}

function spaceLabelsForRelation(memory: AwisWorkspaceMemorySnapshot): string[] {
  return unique(memory.recentOutcomes
    .filter((outcome) => !isFailedOutcome(outcome.status))
    .flatMap((outcome) => outcome.spaceLabels)
    .map(sanitizeProviderSafeText)
    .filter(isString))
    .slice(0, MAX_STARTUP_ITEMS)
}

function spaceBrainLabelsForRelation(memory: AwisWorkspaceMemorySnapshot): string[] {
  return unique(memory.recentOutcomes
    .filter((outcome) => !isFailedOutcome(outcome.status))
    .flatMap((outcome) => outcome.spaceBrainLabels)
    .map(sanitizeProviderSafeText)
    .filter(isString))
    .slice(0, MAX_STARTUP_ITEMS)
}

function liveMemoryLabelsForRelation(memory: AwisWorkspaceMemorySnapshot): string[] {
  return unique(memory.recentOutcomes
    .filter((outcome) => !isFailedOutcome(outcome.status))
    .flatMap((outcome) => outcome.liveMemoryLabels)
    .map(sanitizeProviderSafeText)
    .filter(isString))
    .slice(0, MAX_STARTUP_ITEMS)
}

function priorityLoadLabelsForRelation(memory: AwisWorkspaceMemorySnapshot): string[] {
  return unique(memory.recentOutcomes
    .filter((outcome) => !isFailedOutcome(outcome.status))
    .flatMap((outcome) => outcome.priorityLoadLabels)
    .map(sanitizeProviderSafeText)
    .filter(isString))
    .slice(0, MAX_STARTUP_ITEMS)
}

function overlap(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map((item) => item.toLowerCase()))
  return left.filter((item) => rightSet.has(item.toLowerCase()))
}

function providerSafeWorkspaceHint(memory: AwisWorkspaceMemorySnapshot): string {
  const value = (memory.workspaceKey || memory.workspaceName || memory.rootPath || 'workspace')
    .trim()
    .replaceAll('\\', '/')
    .split('/')
    .filter(Boolean)
    .at(-1)
    || 'workspace'
  return sanitizeComponentKey(value)
}

function relationTransferHints(
  signals: string[],
  languages: string[],
  commands: string[],
  contextGold: string[] = [],
  validationPlans: string[] = [],
  recoveryPatterns: string[] = [],
  spaces: string[] = [],
  spaceBrain: string[] = [],
  liveMemory: string[] = [],
  priorityLoad: string[] = [],
): string[] {
  return unique([
    contextGold.length > 0 ? `ouro compatível: ${contextGold[0]}` : null,
    validationPlans.length > 0 ? `validação compatível: ${validationPlans[0]}` : null,
    recoveryPatterns.length > 0 ? `recovery compatível: ${recoveryPatterns[0]}` : null,
    spaces.length > 0 ? `Space compatível: ${spaces[0]}` : null,
    spaceBrain.length > 0 ? `Space Brain transferível: ${spaceBrain[0]}` : null,
    liveMemory.length > 0 ? `memória viva compatível: ${liveMemory[0]}` : null,
    priorityLoad.length > 0 ? `prioridade compatível: ${priorityLoad[0]}` : null,
    languages.length > 0 ? `stack compatível: ${languages.slice(0, 2).join(', ')}` : null,
    commands.length > 0 ? `validar comando equivalente: ${commands[0]}` : null,
    signals.length > 0 ? `reusar padrão abstrato: ${signals[0]}` : null,
  ].filter(isString)).slice(0, MAX_STARTUP_ITEMS)
}

function bucketKeyForWorkspace(buckets: Record<string, unknown>, workspaceKeyValue: string): string | null {
  if (Object.prototype.hasOwnProperty.call(buckets, workspaceKeyValue)) return workspaceKeyValue
  return Object.keys(buckets).find((key) => legacyWorkspaceKeyMatches(workspaceKeyValue, key)) ?? null
}

function legacyWorkspaceKeyMatches(currentKey: string, candidateKey: string | null | undefined): boolean {
  const current = normalizeWorkspaceLookupKey(currentKey)
  const candidate = normalizeWorkspaceLookupKey(candidateKey)
  if (!current || !candidate) return false
  if (current === candidate) return true
  return candidate.endsWith(`/${current}`) || candidate.split('/').filter(Boolean).at(-1) === current
}

function normalizeWorkspaceLookupKey(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replaceAll('\\', '/')
    .replace(/\/+$/, '')
    .toLowerCase()
}

function sanitizeRelativePath(path: string | null | undefined): string {
  const value = path?.trim().replaceAll('\\', '/') ?? ''
  if (!value || value.startsWith('/') || value.includes('..')) return ''
  return value.split('/').filter(Boolean).join('/').slice(0, 160)
}

function sanitizeProviderSafeText(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replaceAll('\\', '/')
    .replace(/\/Users\/[^ ]+/g, '[path]')
    .replace(/thread_id|source_thread_ids|operator_input|response_text/gi, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220)
}

function sanitizeComponentKey(key: string | null | undefined): string {
  const value = key?.trim().replaceAll('\\', '/') ?? ''
  if (!value || value.startsWith('/') || value.includes('..')) return ''
  return value
    .split('/')
    .filter(Boolean)[0]
    ?.replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(0, 80)
    || 'workspace'
}

function componentKeyForPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) return 'workspace-root'
  if (parts[0] === 'docs') return 'docs'
  return parts[0]
}

function stackForPath(path: string): string[] {
  const lower = path.toLowerCase()
  const stack: string[] = []
  if (lower.endsWith('package.json') || lower.includes('pnpm-lock') || lower.includes('package-lock')) stack.push('Node/JavaScript')
  if (lower.endsWith('composer.json') || lower.endsWith('/artisan') || lower === 'artisan') stack.push('PHP/Composer', 'Laravel')
  if (lower.endsWith('cargo.toml')) stack.push('Rust/Cargo')
  if (lower.includes('tauri.conf.')) stack.push('Tauri')
  if (lower.includes('vite.config.')) stack.push('Vite')
  if (lower.includes('next.config.')) stack.push('Next.js')
  if (lower.includes('tailwind.config.')) stack.push('Tailwind')
  if (lower.startsWith('docs/') || lower.endsWith('readme.md') || lower.endsWith('agents.md')) stack.push('Docs')
  return stack
}

function stackForCommand(command: string): string[] {
  const lower = command.toLowerCase()
  const stack: string[] = []
  if (lower.includes('npm') || lower.includes('pnpm') || lower.includes('yarn')) stack.push('Node/JavaScript')
  if (lower.includes('php artisan') || lower.includes('composer')) stack.push('PHP/Composer', 'Laravel')
  if (lower.includes('cargo')) stack.push('Rust/Cargo')
  if (lower.includes('tauri')) stack.push('Tauri')
  return stack
}

function roleForComponent(key: string, stack: string[], manifests: string[], docs: string[]): string {
  const label = `${key} ${stack.join(' ')} ${manifests.join(' ')} ${docs.join(' ')}`.toLowerCase()
  if (label.includes('desktop') || label.includes('tauri')) return 'aplicativo desktop'
  if (label.includes('server') || label.includes('laravel') || label.includes('php/composer')) return 'serviço backend'
  if (label.includes('docs') || label.includes('readme') || label.includes('agents.md')) return 'conhecimento canônico'
  if (label.includes('mobile') || label.includes('expo') || label.includes('swift')) return 'aplicativo mobile'
  if (label.includes('rust/cargo')) return 'runtime nativo'
  if (label.includes('node/javascript')) return 'frontend ou tooling'
  return 'área do workspace'
}

function inferTopologyConnections(
  components: AwisWorkspaceTopologyProjection['components'],
): AwisWorkspaceTopologyProjection['connections'] {
  const connections: AwisWorkspaceTopologyProjection['connections'] = []
  const desktop = components.find((component) => component.role === 'aplicativo desktop')
  const backend = components.find((component) => component.role === 'serviço backend')
  const docs = components.find((component) => component.role === 'conhecimento canônico')
  const native = components.find((component) => component.role === 'runtime nativo')
  if (desktop && backend) {
    connections.push({
      from: desktop.key,
      to: backend.key,
      reason: 'interface desktop consome contexto e serviços locais do backend',
    })
  }
  if (desktop && native && desktop.key !== native.key) {
    connections.push({
      from: desktop.key,
      to: native.key,
      reason: 'superfície desktop depende de runtime nativo para comandos locais',
    })
  }
  if (docs) {
    for (const component of components) {
      if (component.key === docs.key) continue
      connections.push({
        from: docs.key,
        to: component.key,
        reason: 'docs canônicos orientam implementação e validação',
      })
      if (connections.length >= MAX_TOPOLOGY_CONNECTIONS) break
    }
  }
  return connections.slice(0, MAX_TOPOLOGY_CONNECTIONS)
}

function commandsByKind(
  components: AwisWorkspaceTopologyProjection['components'],
  pattern: RegExp,
): string[] {
  return unique(components
    .flatMap((component) => component.commands)
    .filter((command) => pattern.test(command.kind) || pattern.test(command.command))
    .map((command) => command.command))
    .slice(0, MAX_STARTUP_ITEMS)
}

function uniqueCommands(
  commands: AwisWorkspaceTopologyProjection['components'][number]['commands'],
): AwisWorkspaceTopologyProjection['components'][number]['commands'] {
  const seen = new Set<string>()
  return commands.filter((command) => {
    const key = `${command.source}:${command.command}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeStatus(status: string | null | undefined): string {
  const value = status?.trim()
  return value || 'accepted'
}

function normalizeChannel(channel: unknown): AwisWorkspaceMemoryOutcome['channel'] {
  return channel === 'workbench' || channel === 'voice' ? channel : 'conversation'
}

function normalizeTaskKind(taskKind: unknown): AwisWorkspaceTaskContextProjection['task_kind'] | null {
  return taskKind === 'code_change' ||
    taskKind === 'bug_fix' ||
    taskKind === 'research' ||
    taskKind === 'ops' ||
    taskKind === 'design' ||
    taskKind === 'analysis' ||
    taskKind === 'unknown'
    ? taskKind
    : null
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim() !== '')))
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}
