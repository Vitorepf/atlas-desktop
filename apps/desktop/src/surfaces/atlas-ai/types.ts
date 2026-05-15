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

export interface AiTrace {
  id: string
  thread_id: string | null
  source_type: string | null
  source_id: string | null
  status: string
  operator_input: string | null
  provider: string | null
  model: string | null
  response_text: string | null
  stream_url?: string | null
  latency_ms: number | null
  completed_at: string | null
  metadata: Record<string, unknown> | null
  atlas_dev_runtime?: AtlasDevRuntime | null
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
