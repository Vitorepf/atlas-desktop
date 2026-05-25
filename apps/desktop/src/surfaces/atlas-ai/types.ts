import type { AtlasComputeEffortChoice } from '../../lib/rich-input'
export type { AtlasComputeEffortChoice } from '../../lib/rich-input'

/**
 * Atlas AI Conversation Surface · TS contracts.
 *
 * Espelham `ai_threads`, `ai_traces` e o payload de `AtlasAiSheet.tsx`. O
 * desktop NÃO inventa thread storage: tudo passa por
 *   GET    /ai/threads
 *   POST   /ai/threads
 *   GET    /ai/threads/{id}
 *   PATCH  /ai/threads/{id}
 *   POST   /ai/interactions
 *   GET    /ai/interactions/{trace}
 *
 * Modos / tarefas / providers mirror atlas-app/lib/atlasAiModeContract.ts.
 */

/**
 * Atlas AI composer mode (UX hint sent to the backend Router Runtime).
 *
 * `auto` is the default: the Desktop does NOT assert a domain — it asks the
 * Hyperflow / Atlas Decide / Router Runtime to choose. Explicit values are
 * available so the operator can override when they know the domain (e.g.
 * "I want this to go through the cyber playbook").
 *
 * Backend ground truth (atlas-server `domain_id` enum):
 *   programming · research · finance · marketing · strategy ·
 *   personal_development · cyber · automation · conversation · general ·
 *   operational
 *
 * The Desktop sends this as `atlas_mode` and `routing_domain` hints; the
 * canonical decision lives in the trace returned by the backend.
 */
export type AtlasAiMode =
  | 'auto'
  | 'general'
  | 'operational'
  | 'programming'
  | 'research'
  | 'finance'
  | 'marketing'
  | 'strategy'
  | 'personal_development'
  | 'cyber'
  | 'automation'
  | 'conversation'

/** `dev`/`debug` válidos apenas em mode=programming. `auto` é o default neutro. */
export type AtlasAiTask = 'auto' | 'direct' | 'plan' | 'review' | 'dev' | 'debug'

/**
 * Slice atlas.ai.hyperflow.trace.v1 — projection that the backend Router
 * Runtime / Atlas Decide returns inside the trace metadata so the Desktop
 * can SHOW the real decision instead of inferring one locally. Every field
 * is optional because the projection is rolled out gradually across the
 * backend stack; the Desktop renders only what is present.
 */
export interface AtlasAiHyperflowTrace {
  schema_version?: string
  intent?: string | null
  domain_id?: string | null
  flow_id?: string | null
  runtime_mode?: string | null
  confidence?: number | null
  policy_refs?: ReadonlyArray<string> | null
  evidence_refs?: ReadonlyArray<string> | null
  decision_receipt_id?: string | null
  decision_receipt_hash?: string | null
  dispatch_status?: string | null
  handoff_target?: string | null
  handoff_reason?: string | null
  router_was_overridden?: boolean | null
  reasons?: ReadonlyArray<string> | null
}

/**
 * Backend bootstrap projection from GET /ai/router-runtime/bootstrap. Used
 * by the Desktop to pre-warm domain/flow/policy hints without making the
 * front assume any of them. Every field optional + back-compat with absent
 * endpoint (Desktop renders the same UI either way).
 */
export interface AtlasAiRouterBootstrap {
  schema_version?: string
  default_domain?: string | null
  default_flow?: string | null
  available_domains?: ReadonlyArray<string> | null
  available_flows?: ReadonlyArray<string> | null
  decision_mode?: string | null
  notes?: ReadonlyArray<string> | null
}

/** GET /ai/router-runtime/readiness projection. */
export interface AtlasAiRouterReadiness {
  schema_version?: string
  status?: 'green' | 'partial' | 'blocked' | string
  reasons?: ReadonlyArray<string> | null
  blockers?: ReadonlyArray<{ code: string; message: string }> | null
}

/**
 * `atlas.ai.runtime_readiness.v1` — aggregate gate from backend
 * `GET /atlas/ai/runtime-readiness`. All fields are optional because the
 * Desktop renders only what is present; absent endpoint = no panel section.
 */
export interface AtlasAiRuntimeReadinessCheck {
  id: string
  label: string
  status: 'passed' | 'warn' | 'failed' | string
  severity: 'critical' | 'warn' | string
  source_service?: string | null
  evidence_refs?: ReadonlyArray<string> | null
  detail?: Record<string, unknown> | null
}

export interface AtlasAiRuntimeReadiness {
  schema_version?: string
  status?: 'ready' | 'partial' | 'blocked' | string
  generated_at?: string | null
  summary?: {
    total?: number
    passed?: number
    partial?: number
    failed?: number
    critical_failed?: number
    warn_failed?: number
  } | null
  checks?: ReadonlyArray<AtlasAiRuntimeReadinessCheck> | null
  blockers?: ReadonlyArray<string> | null
  warnings?: ReadonlyArray<string> | null
  evidence_refs?: ReadonlyArray<string> | null
  required_commands?: ReadonlyArray<string> | null
  claim_policy?: {
    declares_benchmark?: boolean
    declares_rivals?: boolean
    declares_superiority?: boolean
    declares_teos_certification?: boolean
    invokes_provider?: boolean
    scope?: string | null
    forbidden_claims?: ReadonlyArray<string> | null
  } | null
  release_scope?: string | null
  certification_hash?: string | null
  /**
   * Lightweight UX bundle (dynamic state, NOT included in certification_hash).
   * Powers the runtime status pill — never exposed as raw JSON.
   */
  ux_bundle?: {
    schema_version?: string
    active_mission?: {
      id?: string
      title?: string
      status?: string
      mission_type?: string | null
      next_action?: string | null
    } | null
    pending_approvals_count?: number
    latest_handoff?: {
      target?: string
      reason?: string
      status?: string
      created_at?: string | null
    } | null
    assisted_execution?: {
      schema_version?: string
      status?: 'ready' | 'needs_attention' | 'unavailable' | string
      route_target?: string | null
      flow_id?: string | null
      doctrine_gate_status?: string | null
      selected_drivers?: ReadonlyArray<string> | null
      context_memory_status?: string | null
      context_must_keep_coverage?: number | null
      areg_status?: string | null
      areg_path?: string | null
      outcome_feedback_status?: string | null
      aemor_feedback_status?: string | null
      blockers?: ReadonlyArray<string> | null
      summary?: string | null
      hash?: string | null
    } | null
  } | null
}

export interface AtlasAwisLearningLoop {
  schema_version?: 'atlas.awis.workspace_intelligence_loop.v1' | string
  status?: 'ready' | 'blocked' | string
  workspace_id?: string | null
  next_action?: {
    status?: 'ready' | 'blocked' | string
    action?: string | null
    target?: string | null
    reasons?: ReadonlyArray<string> | null
  } | null
  evidence_learning?: {
    learning_score?: number | null
    missing_evidence?: ReadonlyArray<string> | null
    feedback_targets?: ReadonlyArray<string> | null
  } | null
  closed_loop?: {
    event_to_understanding?: boolean
    understanding_to_memory?: boolean
    memory_to_context?: boolean
    context_to_next_action?: boolean
    next_action_to_evidence?: boolean
    evidence_to_learning?: boolean
    loop_closed?: boolean
  } | null
  context_application?: {
    raw_conversation_included?: boolean
    provider_prompt_allowed?: boolean
    stale_policy?: string | null
  } | null
  loop_hash?: string | null
}

export interface AtlasAwisRuntimeSnapshot {
  schema_version?: string
  status?: 'ready' | 'blocked' | string
  workspace_id?: string | null
  runtime_hash?: string | null
  persisted_snapshot_id?: number | string | null
  persisted_artifact_graph_id?: number | string | null
  persisted_projection_ids?: ReadonlyArray<number | string> | null
  workspace_learning_snapshot?: {
    schema_version?: string
    status?: 'ready' | 'blocked' | string
    snapshot_hash?: string | null
    learning_score?: number | null
    workspace_state?: {
      learning_loop_closed?: boolean | null
    } | null
    source_policy?: {
      raw_file_content_returned?: boolean | null
      raw_diff_returned?: boolean | null
      raw_log_returned?: boolean | null
      raw_provider_text_returned?: boolean | null
    } | null
  } | null
  workspace_next_session_brain?: AtlasAwisNextSessionBrain | null
}

export interface AtlasAwisArtifactIntelligence {
  schema_version?: 'atlas.workspace_artifact_intelligence.v1' | string
  status?: 'ready' | 'blocked' | string
  workspace_id?: string | null
  workspace_hash?: string | null
  artifact_intelligence_hash?: string | null
  artifact_lake?: {
    schema_version?: string
    artifact_count?: number | null
    certifiable_artifacts?: number | null
    lake_hash?: string | null
  } | null
  artifact_graph?: {
    schema_version?: string
    graph_hash?: string | null
    nodes?: ReadonlyArray<{
      id?: string | null
      type?: string | null
      status?: string | null
      consumer?: string | null
    }> | null
    edges?: ReadonlyArray<{
      from?: string | null
      to?: string | null
      relation?: string | null
    }> | null
  } | null
  artifact_replay?: {
    schema_version?: string
    replay_ready?: boolean | null
    required_inputs?: ReadonlyArray<string> | null
    raw_conversation_required?: boolean | null
  } | null
  artifact_simulation?: {
    schema_version?: string
    decision?: string | null
    blockers?: ReadonlyArray<string> | null
    likely_areas?: ReadonlyArray<string> | null
    escalate_to_forge_when?: ReadonlyArray<string> | null
  } | null
  artifact_context_compiler?: {
    schema_version?: string
    task?: string | null
    context_units?: ReadonlyArray<string> | null
    raw_conversation_included?: boolean | null
    current_truth_pack_hash?: string | null
  } | null
  artifact_quality_governor?: {
    schema_version?: string
    all_executable_artifacts_ready?: boolean | null
    minimum_executable_score?: number | null
    quality?: ReadonlyArray<{
      artifact_type?: string | null
      artifact_hash?: string | null
      quality_score?: number | null
      freshness?: string | null
      source_integrity?: string | null
      consumer_fit?: string | null
    }> | null
  } | null
  artifact_marketplace?: {
    privacy_policy?: string | null
    reusable_templates?: ReadonlyArray<string> | null
  } | null
  artifact_outcome_learning?: {
    feeds?: ReadonlyArray<string> | null
    requires_real_outcome?: boolean | null
  } | null
  blockers?: ReadonlyArray<string> | null
}

export interface AtlasAwisNextSessionBrain {
  schema_version?: 'atlas.awis.workspace_next_session_brain.v1' | string
  status?: 'ready' | 'blocked' | string
  workspace_id?: string | null
  task_hash?: string | null
  readiness_score?: number | null
  brain_hash?: string | null
  readiness_signals?: Record<string, boolean | null | undefined> | null
  resume_packet?: {
    load_order?: ReadonlyArray<string> | null
    focused_repositories?: ReadonlyArray<{
      repo_key?: string | null
      score?: number | null
      reasons?: ReadonlyArray<string> | null
      stack?: ReadonlyArray<string> | null
    }> | null
    focused_areas?: ReadonlyArray<string> | null
    owner_docs?: ReadonlyArray<string> | null
    artifact_refs?: ReadonlyArray<string> | null
    current_truth_pack_hash?: string | null
  } | null
  execution_priority?: ReadonlyArray<{
    command?: string | null
    why?: string | null
    requires_operator_approval?: boolean | null
  }> | null
  context_loading_plan?: {
    schema_version?: 'atlas.awis.context_loading_plan.v1' | string
    mode?: string | null
    repository_inventory_hash?: string | null
    repository_count?: number | null
    working_set_hash?: string | null
    context_delta_plan_hash?: string | null
    learning_snapshot_hash?: string | null
    learning_score?: number | null
    stack_tags?: ReadonlyArray<string> | null
    command_hints?: ReadonlyArray<string> | null
    outcome_ranked_commands?: ReadonlyArray<string> | null
    area_ranked_commands?: ReadonlyArray<string> | null
    flaky_commands?: ReadonlyArray<string> | null
    slow_commands?: ReadonlyArray<string> | null
    avoid_commands?: ReadonlyArray<string> | null
    focused_manifest_refs?: ReadonlyArray<{
      repo_key?: string | null
      manifest_files?: ReadonlyArray<string> | null
      stack?: ReadonlyArray<string> | null
      script_names?: ReadonlyArray<string> | null
    }> | null
    provider_policy?: {
      raw_manifest_returned?: boolean | null
      script_bodies_returned?: boolean | null
      absolute_workspace_path_returned?: boolean | null
    } | null
    cache_keys?: Record<string, string | null | undefined> | null
    refresh_triggers?: ReadonlyArray<string> | null
  } | null
  source_policy?: {
    raw_file_content_returned?: boolean | null
    raw_conversation_returned?: boolean | null
    absolute_workspace_path_returned?: boolean | null
  } | null
}

export interface AtlasAwisHandoffPack {
  schema_version?: 'atlas.workspace_handoff_pack.v1' | string
  generated_at?: string | null
  status?: 'ready' | 'blocked' | string
  consumer?: 'atlas_dev' | 'atlas_forge' | 'subagent_projection' | 'reviewer' | string
  handoff_hash?: string | null
  workspace?: {
    workspace_id?: string | null
    workspace_name?: string | null
    workspace_hash?: string | null
    readiness_status?: string | null
    memory_scope?: string | null
  } | null
  required_artifacts?: ReadonlyArray<string> | null
  missing_artifacts?: ReadonlyArray<string> | null
  context_units?: ReadonlyArray<{
    artifact_type?: string | null
    artifact_hash?: string | null
    status?: string | null
  }> | null
  execution_contract?: {
    provider_safe?: boolean | null
    raw_conversation_included?: boolean | null
    workspace_isolation_required?: boolean | null
    cross_workspace_memory_allowed?: boolean | null
    mutative_execution_requires_awis_gate?: boolean | null
  } | null
  scope_guard?: {
    allowed_scope?: string | null
    risk_floor?: string | null
    sensitive_areas?: ReadonlyArray<string> | null
    owner_docs?: ReadonlyArray<string> | null
  } | null
  test_contract?: {
    focused_tests?: ReadonlyArray<string> | null
    fallback_tests?: ReadonlyArray<string> | null
    skip_reason?: string | null
  } | null
  next_session_brain?: Pick<AtlasAwisNextSessionBrain, 'schema_version' | 'status' | 'brain_hash' | 'readiness_score' | 'context_loading_plan'> & {
    load_order?: ReadonlyArray<string> | null
    focused_repositories?: AtlasAwisNextSessionBrain['resume_packet'] extends infer T
      ? T extends { focused_repositories?: infer R } ? R : unknown
      : unknown
    execution_priority?: AtlasAwisNextSessionBrain['execution_priority']
    raw_content_returned?: boolean | null
  } | null
  conversation_fusion?: unknown
  claim_policy?: {
    read_only?: boolean | null
    invokes_provider?: boolean | null
    spends_tokens?: boolean | null
    safe_for_provider_prompt?: boolean | null
    raw_conversation_returned?: boolean | null
    full_message_content_returned?: boolean | null
    next_session_brain_provider_safe?: boolean | null
  } | null
  blockers?: ReadonlyArray<string> | null
}

/** Mantido em sync com `provider` enum em StoreAiInteractionRequest. */
export type AtlasAiProvider =
  | 'claude_cli'
  | 'codex_cli'
  | 'gemini_cli'
  | 'claude_codex'

/** UX label "auto" → omitir `provider` e enviar decision_mode=atlas_decide. */
export type AtlasAiProviderChoice = AtlasAiProvider | 'auto'

export type AtlasAiFocus = AtlasAiMode

export interface AiThreadSummary {
  id: string
  title: string | null
  summary: string | null
  status: string
  surface: string | null
  workspace: string | null
  source_type: string | null
  source_id: string | null
  last_trace_id: string | null
  last_provider: string | null
  message_count: number
  last_message_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
}

export interface AiThreadMessage {
  id: string
  thread_id: string
  position: number
  role: string
  content: string | null
  provider: string | null
  trace_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

export interface AiThreadDetail extends AiThreadSummary {
  messages?: AiThreadMessage[]
  last_trace?: AiTrace | null
}

export interface AiThreadMessagesPage {
  messages: AiThreadMessage[]
  pagination: {
    limit: number
    has_more_before: boolean
    oldest_position: number | null
    next_before_position: number | null
  }
}

export interface AtlasWorkspaceConversationFusion {
  schema_version?: 'atlas.workspace_conversation_fusion.v1' | string
  status?: 'ready' | 'empty' | 'blocked' | string
  workspace_id?: string | null
  workspace_name?: string | null
  source_policy?: {
    raw_conversation_returned?: boolean
    full_message_content_returned?: boolean
    hashes_are_authoritative?: boolean
    workspace_isolation_required?: boolean
  } | null
  summary?: {
    thread_count?: number
    message_count?: number
    decision_count?: number
    blocker_count?: number
    risk_count?: number
  } | null
  fusion_pack?: {
    schema_version?: string
    workspace_id?: string | null
    source_thread_ids?: string[]
    source_thread_hashes?: string[]
    summary_units?: Array<{ id?: string; label?: string; value?: string }>
    decision_ledger?: unknown[]
    blocker_ledger?: unknown[]
    risk_ledger?: unknown[]
    fusion_pack_hash?: string | null
  } | null
  persisted_artifact?: {
    artifact_id?: string | null
    artifact_type?: string | null
    artifact_hash?: string | null
    runtime_hash?: string | null
  } | null
  requested_thread_ids?: string[]
  rejected_thread_ids?: string[]
  claim_policy?: {
    read_only?: boolean
    invokes_provider?: boolean
    spends_tokens?: boolean
    cross_workspace_merge_allowed?: boolean
    safe_for_context_pack?: boolean
  } | null
  fusion_hash?: string | null
  reason?: string | null
}

export interface AtlasWorkspaceArtifactLakeEntry {
  schema_version?: 'atlas.workspace_artifact_lake_entry.v1' | string
  status?: 'ready' | 'blocked' | string
  workspace_id?: string | null
  blockers?: string[] | null
  artifact?: {
    artifact_id?: string | null
    artifact_hash?: string | null
    runtime_hash?: string | null
    artifact_type?: string | null
    status?: string | null
    consumer?: string | null
    source_hashes?: string[] | null
    quality_score?: number | null
    captured_at?: string | null
    body?: {
      schema_version?: string
      summary?: AtlasWorkspaceConversationFusion['summary']
      fusion_pack?: AtlasWorkspaceConversationFusion['fusion_pack']
      source_policy?: AtlasWorkspaceConversationFusion['source_policy']
    } | null
  } | null
  replay_contract?: {
    workspace_scope_required?: boolean
    raw_conversation_replay_allowed?: boolean
    provider_prompt_allowed?: boolean
    recommended_consumers?: string[]
  } | null
  source_policy?: AtlasWorkspaceConversationFusion['source_policy'] | null
  claim_policy?: {
    read_only?: boolean
    invokes_provider?: boolean
    spends_tokens?: boolean
    cross_workspace_read_allowed?: boolean
  } | null
}

export interface AtlasServerHealth {
  status?: 'ok' | string
  service?: string | null
  version?: string | null
  ts?: string | null
  db_connected?: boolean | null
  overall_ok?: boolean | null
  checks?: {
    database?: {
      ok?: boolean | null
    } | null
    storage?: {
      ok?: boolean | null
      writable?: boolean | null
      path?: string | null
      error?: string | null
    } | null
  } & Record<string, unknown> | null
}

/**
 * Slice atlas.dev_runtime.v1 — emitido pelo backend AtlasDevRuntimeService
 * quando uma interação Atlas AI passa por programação (Atlas Dev). Permite
 * que o Desktop exiba flow/workspace/expected_artifacts e estado do Open Brain
 * sem inferir do payload bruto.
 */
export interface AtlasDevRuntime {
  schema_version: 'atlas.dev_runtime.v1'
  enabled: boolean
  flow_id: 'programming.dev' | 'programming.review' | 'programming.repair'
  mode: 'programming'
  task: 'dev' | 'plan' | 'review' | 'debug'
  workspace: string
  decision_mode: 'atlas_decide' | 'manual_override'
  provider: string | null
  expected_artifacts: ReadonlyArray<'plan' | 'diff_or_reason' | 'tests_or_reason' | 'risks'>
  requires_obra: boolean
  workspace_source?: string
  open_brain_policy?: 'auto' | 'required' | 'off'
  open_brain_status?: string
}

/* ---------- Signal types · Phase 1 baseline parity ---------- */

/** Status canônicos do trace (mirror dos enums backend). */
export type AiTraceStatus =
  | 'queued'
  | 'processing'
  | 'running'
  | 'succeeded'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'cancelled'

/** Status do job (worker queue lifecycle). */
export type AiJobStatus =
  | 'queued'
  | 'processing'
  | 'awaiting_user_choice'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

/** Attempt individual de um job (cada retry vira uma entrada). */
export interface AiJobAttempt {
  id: string
  attempt_number: number
  status: string | null
  duration_ms: number | null
  exit_code: number | null
  error_code: string | null
  error_message: string | null
  stdout_excerpt: string | null
  stderr_excerpt: string | null
  started_at: string | null
  finished_at: string | null
}

/** Job na fila do worker (uma trace pode ter 1+ jobs em cascata). */
export interface AiJob {
  id: string
  trace_id: string | null
  client_id: string | null
  kind: string | null
  status: AiJobStatus | string
  awaiting_user_choice: boolean
  choice_options: unknown
  provider_choice_state: string | null
  priority: number | null
  agent_slug: string | null
  provider: string | null
  model: string | null
  input_text: string | null
  result_text: string | null
  error_code: string | null
  error_message: string | null
  available_at: string | null
  reserved_at: string | null
  started_at: string | null
  finished_at: string | null
  attempts: number
  max_attempts: number | null
  timeout_seconds: number | null
  worker_id: string | null
  metadata: Record<string, unknown> | null
  /**
   * Job payload — opaque to the desktop surface in general, but the
   * YouTube canonical capability reads `payload.youtube_ingestion.videos[]`
   * to render `AtlasAiYouTubeSourceBadge`. Other consumers should treat as
   * unknown and only read narrowly-typed slices.
   */
  payload?: Record<string, unknown> | null
  attempt_history?: AiJobAttempt[]
}

/** Atlas Decision · Phase 1 visibility (confidence + risk + override). */
export interface AiAtlasDecision {
  id: string
  trace_id: string | null
  router_decision_id: string | null
  policy_version: string | null
  decision_mode: 'atlas_decide' | 'manual_override' | string
  route_mode: string | null
  task_type: string | null
  risk_level: 'low' | 'medium' | 'high' | string | null
  context_strategy: string | null
  execution_strategy: string | null
  selected_provider: string | null
  selected_model: string | null
  fallback_provider: string | null
  operator_requested_provider: string | null
  was_overridden: boolean
  confidence_score: number | null
  signals: Record<string, unknown> | null
  candidates: ReadonlyArray<unknown> | null
  reason: string | null
}

/** Router Decision (mais leve que AtlasDecision, sempre presente). */
export interface AiRouterDecision {
  id: string
  mode: string | null
  selected_provider: string | null
  fallback_provider: string | null
  signals: Record<string, unknown> | null
  reason: string | null
  was_overridden: boolean
}

/** Quality Evaluation · resposta passou/falhou/precisa-review. */
export type AiQualityStatus = 'passed' | 'needs_review' | 'failed' | string

export interface AiQualityEvaluation {
  id: string
  trace_id: string | null
  provider: string | null
  model: string | null
  agent_slug: string | null
  evaluator_version: string | null
  score: number | null
  status: AiQualityStatus
  dimensions: Record<string, unknown> | null
  flags: ReadonlyArray<unknown> | null
  suggested_actions: ReadonlyArray<unknown> | null
}

/** Quality Action · remediação automática que Atlas disparou. */
export type AiQualityActionStatus = 'pending' | 'completed' | 'failed' | string

export interface AiQualityAction {
  id: string
  evaluation_id: string | null
  trace_id: string | null
  action_type: 'retry' | 'escalate' | 'remediate' | 'suppress' | string
  status: AiQualityActionStatus
  priority: number | null
  reason: string | null
  remediation_trace_id: string | null
}

/** Stream Event · ponto-a-ponto da execução do provider. */
export interface AiStreamEvent {
  id: string
  trace_id: string | null
  event_type: string
  channel: string | null
  content: string | null
  sequence: number
  occurred_at: string | null
  metadata: Record<string, unknown> | null
}

/** Tool Event · cada ferramenta executada pela IA (read/write/exec/MCP/git). */
export type AiToolKind =
  | 'read'
  | 'write'
  | 'edit'
  | 'bash'
  | 'execute'
  | 'search'
  | 'grep'
  | 'list'
  | 'glob'
  | 'mcp'
  | 'git'
  | 'web_fetch'
  | 'web_search'
  | 'agent_dispatch'
  | 'todo'
  | 'plan'
  | 'unknown'

export type AiToolPermission = 'auto' | 'approved' | 'denied' | 'pending' | string

export interface AiToolEvent {
  id: string
  trace_id: string | null
  tool: string
  kind?: AiToolKind | null
  permission_status: AiToolPermission | null
  approval_source: string | null
  input_summary: Record<string, unknown> | null
  output_summary: Record<string, unknown> | null
  changed_files: ReadonlyArray<string> | null
  exit_code: number | null
  duration_ms: number | null
  error: string | null
  occurred_at: string | null
}

/** Trace Metric Summary · cost, tokens, latency breakdown, quality scores. */
export interface AiTraceMetricSummary {
  trace_id: string | null
  app_send_to_accept_ms: number | null
  app_send_to_visible_ms: number | null
  queue_wait_ms: number | null
  first_token_ms: number | null
  provider_latency_ms: number | null
  total_latency_ms: number | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  estimated_tokens: number | null
  cost_microusd: number | null
  cost_confidence: number | null
  cost_source: string | null
  cost_mode: string | null
  context_tokens: number | null
  context_refs_count: number | null
  useful_context_refs_count: number | null
  compaction_used: boolean | null
  provider_handoff_used: boolean | null
  context_efficiency_score: number | null
  auto_quality_score: number | null
  continuity_score: number | null
  human_feedback_score: number | null
  outcome_score: number | null
  remediation_score: number | null
  final_quality_score: number | null
  final_efficiency_score: number | null
  first_pass_success: boolean | null
  needed_remediation: boolean | null
  remediation_count: number | null
  reask_detected: boolean | null
  router_mode: string | null
  router_selected_provider: string | null
  router_fallback_provider: string | null
  router_was_overridden: boolean | null
}

/* ---------- AiTrace · agora com signals completos ---------- */

export interface AiTrace {
  id: string
  trace_key?: string | null
  thread_id: string | null
  source_type: string | null
  source_id: string | null
  status: AiTraceStatus | string
  operator_input: string | null
  intent?: string | null
  agent_slug?: string | null
  provider: string | null
  model: string | null
  response_text: string | null
  stream_url?: string | null
  latency_ms: number | null
  feedback_score?: number | null
  feedback_action?: string | null
  feedback_comment?: string | null
  completed_at: string | null
  metadata: Record<string, unknown> | null
  atlas_dev_runtime?: AtlasDevRuntime | null
  /**
   * Hyperflow projection — backend dictates the canonical routing/handoff
   * decision. Desktop renders this when present; absent => front shows the
   * legacy `inferred` view derived from policy hints.
   */
  hyperflow?: AtlasAiHyperflowTrace | null
  /** Eager-loaded relations (presentes em GET /ai/interactions/{id}). */
  job?: AiJob | null
  jobs?: AiJob[] | null
  router_decision?: AiRouterDecision | null
  atlas_decision?: AiAtlasDecision | null
  decision_receipt?: Record<string, unknown> | null
  quality_evaluation?: AiQualityEvaluation | null
  quality_actions?: AiQualityAction[] | null
  stream_events?: AiStreamEvent[] | null
  /** Phase 1.2 — adicionados quando backend expõe (PR pendente em traceShowRelations). */
  tool_events?: AiToolEvent[] | null
  metric_summary?: AiTraceMetricSummary | null
  created_at: string | null
  updated_at: string | null
}

export interface AtlasAiInteractionRequest {
  input_text: string
  thread_id?: string
  new_thread?: boolean
  provider?: AtlasAiProvider
  kind?: 'interaction' | 'curation' | 'analysis' | 'council' | 'skill_test' | 'manual'
  source_type?: 'app' | 'manual'
  include_semantic_context?: boolean
  context_note_limit?: number
  payload?: Record<string, unknown>
  /** IDs retornados pelo chunked-upload /ai/uploads/chunks (imagens) — legado, mantido por compat */
  uploaded_images?: string[]
  /** IDs retornados pelo chunked-upload /ai/uploads/chunks (PDFs/docs) — legado, mantido por compat */
  uploaded_documents?: string[]
  /**
   * Universal Rich Input Payload canon (`atlas.rich_input.payload.v1`). Quando
   * presente, o backend Hyperflow + Forge intake preserva o payload completo
   * (source_manifest + hashes incluso) para auditoria e re-projeção. Convive
   * com `uploaded_images`/`uploaded_documents` legados — `StoreAiInteractionRequest`
   * aceita ambos. Mobile já envia este campo desde 2026-05-19; Desktop alinhou
   * em paralelo.
   */
  rich_input_payload?: import('../../lib/rich-input/types').AtlasRichInputPayload
}

export interface AtlasAiInteractionResponse {
  trace: AiTrace
}

export interface AiThreadListFilters {
  status?: 'active' | 'archived' | 'closed' | 'all'
  workspace?: string | null
  surface?: string | null
  limit?: number
  light?: boolean
}

/* ---------- Atlas Dev plan-only · POST /ai/interactions/atlas-dev/plan ---------- */

/**
 * Shape of the response that the Atlas Dev plan-only endpoint emits. The Desktop
 * surface treats every nested artifact as **opcional + provider-safe**: backend
 * may still be wiring some slices in (Claude 14/15/16 trabalham em paralelo), so
 * we only render what is present and never crash on missing fields.
 *
 * Backend canonical contracts:
 *   docs/engineering-knowledge-base/atlas-dev-efficient-programming-flow-contracts-v1.md
 */
export type AtlasDevPlanStatus =
  | 'ready'
  | 'blocked'
  | 'forge_promotion_preview'
  | 'unavailable'

export type AtlasDevConfidenceLevel =
  | 'confirmed_fact'
  | 'strong_inference'
  | 'hypothesis'
  | 'blocking_ambiguity'

export interface AtlasDevContextRef {
  kind: string
  ref: string
  reason: string
}

export interface AtlasDevCodeCandidate {
  path: string
  reason?: string | null
  confidence?: number | null
  symbols?: ReadonlyArray<string> | null
}

export interface AtlasDevMissingRef {
  what: string
  why_missing: string
}

export interface AtlasDevTruncation {
  truncated: boolean
  reasons?: ReadonlyArray<string> | null
}

export interface AtlasDevBudget {
  chars_requested?: number | null
  chars_used?: number | null
}

export interface AtlasDevOpenBrainProjection {
  schema_version?: string
  mode?: string
  objective_hash?: string
  memory_refs?: ReadonlyArray<AtlasDevContextRef>
  knowledge_refs?: ReadonlyArray<AtlasDevContextRef>
  code_refs?: ReadonlyArray<AtlasDevContextRef>
  missing_sources?: ReadonlyArray<string>
  truncation?: AtlasDevTruncation | null
  budget?: AtlasDevBudget | null
  provider_safe?: boolean
  projection_hash?: string
}

export interface AtlasDevContextRetrievalPlan {
  schema_version?: string
  run_id?: string
  selected_tiers?: ReadonlyArray<string>
  budget_chars?: number
  required_sources?: ReadonlyArray<string>
  optional_sources?: ReadonlyArray<string>
  missing_sources?: ReadonlyArray<string>
  truncation_policy?: Record<string, unknown> | null
  provider_safe?: boolean
  plan_hash?: string
}

export interface AtlasDevCodeDiscoveryManifest {
  schema_version?: string
  confidence?: AtlasDevConfidenceLevel | string
  likely_files?: ReadonlyArray<AtlasDevCodeCandidate>
  related_symbols?: ReadonlyArray<AtlasDevContextRef>
  related_tests?: ReadonlyArray<AtlasDevContextRef>
  related_commands?: ReadonlyArray<AtlasDevContextRef>
  forbidden_files?: ReadonlyArray<string>
  missing_refs?: ReadonlyArray<AtlasDevMissingRef>
  provider_safe?: boolean
  manifest_hash?: string
}

export interface AtlasDevMiniSpec {
  goal?: string
  non_goals?: ReadonlyArray<string>
  allowed_files?: ReadonlyArray<string>
  forbidden_files?: ReadonlyArray<string>
  expected_files?: ReadonlyArray<string>
  acceptance_criteria?: ReadonlyArray<
    | string
    | {
        id?: string
        description?: string
        verification?: string
        verification_ref?: string | null
      }
  >
  completion_criteria?: ReadonlyArray<string>
  mini_spec_hash?: string
}

export interface AtlasDevTaskContract {
  allowed_files?: ReadonlyArray<string>
  forbidden_files?: ReadonlyArray<string>
  watched_files?: ReadonlyArray<string>
  validation_commands?: ReadonlyArray<string>
  escalation_on?: ReadonlyArray<string>
  task_contract_hash?: string
}

export interface AtlasDevProviderPromptProjection {
  schema_version?: string
  rendered_prompt_hash?: string
  /**
   * Desktop never receives the raw rendered prompt; backend strips it from the
   * UI projection (it stays internal). We only show the hash + quality.
   */
  rendered_prompt_text?: string | null
  provider_safe?: boolean
  quality_checks?: Record<string, boolean>
  prompt_projection_hash?: string
}

/**
 * Inline indicator hints derived backend-side. The Desktop also computes the
 * same shape locally as fallback so we never depend on this being present.
 */
export interface AtlasDevUiHints {
  open_brain_status?: 'parcial' | 'completo' | 'bloqueado' | string
  scope_files_count?: number
  plan_ready?: boolean
  promotion_target?: 'intervencao_rapida' | 'obra_forge' | string | null
  diff_preview?: string | null
  expected_tests?: string[] | null
  expected_files?: string[] | null
}

export interface AtlasDevForgePromotionPreview {
  reason?: string
  target?: string
  recommended_action?: string
}

export interface AtlasDevBlockedReason {
  code?: string
  message: string
  question?: string | null
}

export interface AtlasDevPlanResult {
  run_id: string
  status: AtlasDevPlanStatus
  routing_decision?: string
  task_contract_hash?: string
  confirmation_token?: string
  confirmation_expires_at?: string | null
  surface_id?: string
  workspace?: string | null
  workspace_hash?: string | null
  hashes?: Record<string, unknown>
  operation_envelope?: Record<string, unknown>
  compact_sdd?: Record<string, unknown>
  context_retrieval_plan?: AtlasDevContextRetrievalPlan
  code_discovery_manifest?: AtlasDevCodeDiscoveryManifest
  open_brain_projection?: AtlasDevOpenBrainProjection
  mini_spec?: AtlasDevMiniSpec
  task_contract?: AtlasDevTaskContract
  provider_prompt_projection?: AtlasDevProviderPromptProjection
  stop_conditions?: ReadonlyArray<string>
  escalation_conditions?: ReadonlyArray<string>
  ui_hints?: AtlasDevUiHints
  forge_promotion_preview?: AtlasDevForgePromotionPreview | null
  blocked?: AtlasDevBlockedReason | null
  /** Backend may attach the persisted thread_id this plan run is tied to. */
  thread_id?: string | null
}

export interface AtlasDevPlanRequest {
  /** Operator intent — raw_intent in the envelope. */
  input_text: string
  thread_id?: string | null
  surface_id?: 'atlas_desktop_ai' | string
  workspace?: string | null
  task?: AtlasAiTask
  provider?: AtlasAiProvider
  compute_effort?: AtlasComputeEffortChoice | null
  decision_mode?: 'atlas_decide' | 'manual_override'
  payload?: Record<string, unknown>
}

export interface AtlasDevPlanResponse {
  plan: AtlasDevPlanResult
}
