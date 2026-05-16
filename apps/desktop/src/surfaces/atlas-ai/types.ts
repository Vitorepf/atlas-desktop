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

export type AtlasAiMode = 'general' | 'operational' | 'programming'

/** `dev`/`debug` válidos apenas em mode=programming. */
export type AtlasAiTask = 'direct' | 'plan' | 'review' | 'dev' | 'debug'

/** Mantido em sync com `provider` enum em StoreAiInteractionRequest. */
export type AtlasAiProvider =
  | 'claude_cli'
  | 'codex_cli'
  | 'gemini_cli'
  | 'claude_codex'

/** UX label "auto" → omitir `provider` e enviar decision_mode=atlas_decide. */
export type AtlasAiProviderChoice = AtlasAiProvider | 'auto'

export type AtlasAiFocus = 'general' | 'operational' | 'programming'

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
  /** IDs retornados pelo chunked-upload /ai/uploads/chunks (imagens) */
  uploaded_images?: string[]
  /** IDs retornados pelo chunked-upload /ai/uploads/chunks (PDFs/docs) */
  uploaded_documents?: string[]
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
