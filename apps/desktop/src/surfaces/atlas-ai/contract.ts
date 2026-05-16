/**
 * Atlas AI · contract helpers shared by composer e history.
 *
 * Mantido em paridade com atlas-app/lib/atlasAiModeContract.ts e
 * atlas-app/lib/atlasAiDomainCatalog.ts. Toda mudança que afete payload precisa
 * refletir lá também — caso contrário o backend desambigua com defaults
 * canônicos (programming → dev, etc.).
 */
import type {
  AtlasAiFocus,
  AtlasAiMode,
  AtlasAiProvider,
  AtlasAiProviderChoice,
  AtlasAiTask,
} from './types'

export const ATLAS_AI_MODE_CONTRACT_VERSION = 1

/** Surfaces canônicos de Atlas AI. O backend trata surface_id≠atlas_code como
 * "não exige Obra"; usamos `atlas_desktop_ai` para distinguir do mobile. */
export const ATLAS_AI_SURFACE_ID = 'atlas_desktop_ai'
export const ATLAS_AI_APP_SURFACE = 'atlas_desktop_ai'

export const PROVIDER_OPTIONS: ReadonlyArray<{
  value: AtlasAiProviderChoice
  label: string
  sub: string
}> = [
  { value: 'auto', label: 'Auto (Atlas Decide)', sub: 'Atlas escolhe o provider ideal por contexto' },
  { value: 'claude_cli', label: 'Claude', sub: 'Anthropic via Claude CLI · vision premium' },
  { value: 'codex_cli', label: 'Codex', sub: 'OpenAI via Codex CLI · raciocínio técnico' },
  { value: 'gemini_cli', label: 'Gemini', sub: 'Google Gemini · multimodal' },
  { value: 'claude_codex', label: 'Claude+Codex council', sub: 'Dois provedores em conselho · resposta consolidada' },
]

export const MODE_OPTIONS: ReadonlyArray<{ value: AtlasAiMode; label: string; sub: string }> = [
  { value: 'general', label: 'Geral', sub: 'pesquisa, ideias, conversa leve' },
  { value: 'operational', label: 'Operacional', sub: 'diagnóstico, próxima ação' },
  { value: 'programming', label: 'Programação', sub: 'Atlas Dev: bugs, debug, review, features' },
]

export const TASK_OPTIONS_PROGRAMMING: ReadonlyArray<{ value: AtlasAiTask; label: string; sub: string }> = [
  { value: 'dev', label: 'Dev', sub: 'feature pequena/média, ajuste, refator' },
  { value: 'debug', label: 'Debug', sub: 'isolar e corrigir bug' },
  { value: 'review', label: 'Review', sub: 'revisar diff, código ou plano' },
  { value: 'plan', label: 'Plan', sub: 'planejar antes de executar' },
]

export const TASK_OPTIONS_GENERAL: ReadonlyArray<{ value: AtlasAiTask; label: string; sub: string }> = [
  { value: 'direct', label: 'Direto', sub: 'resposta direta' },
  { value: 'plan', label: 'Plan', sub: 'pensar antes de responder' },
  { value: 'review', label: 'Review', sub: 'revisar/avaliar' },
]

export const TASK_OPTIONS_OPERATIONAL: ReadonlyArray<{ value: AtlasAiTask; label: string; sub: string }> = [
  { value: 'review', label: 'Review', sub: 'auditar estado, próxima ação' },
  { value: 'plan', label: 'Plan', sub: 'plano operacional curto' },
  { value: 'direct', label: 'Direto', sub: 'resposta direta operacional' },
]

export function taskOptionsForMode(mode: AtlasAiMode) {
  if (mode === 'programming') return TASK_OPTIONS_PROGRAMMING
  if (mode === 'operational') return TASK_OPTIONS_OPERATIONAL
  return TASK_OPTIONS_GENERAL
}

export function defaultTaskForMode(mode: AtlasAiMode): AtlasAiTask {
  if (mode === 'programming') return 'dev'
  if (mode === 'operational') return 'review'
  return 'direct'
}

export function isTaskAllowedForMode(task: AtlasAiTask, mode: AtlasAiMode): boolean {
  if (mode === 'programming') return task === 'plan' || task === 'review' || task === 'dev' || task === 'debug'
  if (mode === 'operational') return task === 'direct' || task === 'plan' || task === 'review'
  return task === 'direct' || task === 'plan' || task === 'review'
}

export function focusForMode(mode: AtlasAiMode): AtlasAiFocus {
  return mode
}

/**
 * Mapa UX → flow canônico (espelha atlas-app/lib/atlasAiDomainCatalog.ts).
 * Quando o domain catalog completo do backend não estiver disponível, este
 * fallback garante flow_id correto.
 */
const UX_FLOW_MAP: Record<AtlasAiMode, Partial<Record<AtlasAiTask, string>>> = {
  general: {
    direct: 'general.answer',
    plan: 'general.answer',
    review: 'general.answer',
  },
  operational: {
    direct: 'operations.diagnostic',
    plan: 'operations.diagnostic',
    review: 'operations.diagnostic',
  },
  programming: {
    direct: 'programming.dev',
    plan: 'programming.dev',
    review: 'programming.review',
    dev: 'programming.dev',
    debug: 'programming.repair',
  },
}

export function flowIdForMode(mode: AtlasAiMode, task: AtlasAiTask): string {
  return UX_FLOW_MAP[mode]?.[task] ?? UX_FLOW_MAP[mode]?.direct ?? 'general.answer'
}

export function domainIdForFlow(flowId: string): string {
  // O backend tem o catálogo real; aqui só carregamos um chute auditável.
  const [domain] = flowId.split('.')
  return domain ?? 'general'
}

export interface AtlasAiPayloadInput {
  mode: AtlasAiMode
  task: AtlasAiTask
  provider: AtlasAiProviderChoice
  workspaceSlug: string | null
  routingDomain?: string | null
  conversationContext?: Array<Record<string, unknown>>
}

export interface AtlasAiPayloadBuildResult {
  payload: Record<string, unknown>
  provider: AtlasAiProvider | undefined
}

/**
 * Constrói o payload que vai para POST /ai/interactions. Espelha
 * `AtlasAiSheet.tsx` no campo essencial; o backend ignora extras com
 * segurança. Mantemos `app_surface = surface_id = atlas_desktop_ai` para que o
 * `AiInteractionController::surfaceIdFromPayload` resolva surface_id correto
 * (não-atlas_code → sem binding de Obra).
 */
export function buildInteractionPayload(input: AtlasAiPayloadInput): AtlasAiPayloadBuildResult {
  const focus = focusForMode(input.mode)
  // Canon: backend (AtlasDecideService::cleanDecisionMode) aceita apenas
  // 'atlas_decide' ou 'manual_override'. Qualquer outro valor é descartado.
  const decisionMode = input.provider === 'auto' ? 'atlas_decide' : 'manual_override'
  const provider = input.provider === 'auto' ? undefined : input.provider
  const workflowMode = input.task === 'debug' ? 'dev' : input.task
  const flowId = flowIdForMode(input.mode, input.task)
  const domainId = domainIdForFlow(flowId)
  const routingDomain = input.routingDomain
    ?? (input.mode === 'programming' && input.workspaceSlug ? input.workspaceSlug : 'auto')

  const payload: Record<string, unknown> = {
    app_surface: ATLAS_AI_APP_SURFACE,
    surface_id: ATLAS_AI_SURFACE_ID,
    atlas_focus: focus,
    atlas_workflow_mode: workflowMode,
    atlas_mode: input.mode,
    routing_task: input.task,
    routing_domain: routingDomain,
    decision_mode: decisionMode,
    flow_id: flowId,
    domain_id: domainId,
    workspace: input.workspaceSlug ?? undefined,
    atlas_mode_contract: modeContractForRouting(input.mode, input.task),
    quality_policy: qualityPolicyForMode(input.mode),
    conversation_context: input.conversationContext ?? undefined,
  }

  if (input.mode === 'programming') {
    Object.assign(payload, programmingRuntimePolicy(input.workspaceSlug))
  }

  if (provider) {
    payload.requested_provider = provider
    payload.operator_requested_provider = provider
  }

  return { payload, provider }
}

function modeContractForRouting(mode: AtlasAiMode, task: AtlasAiTask): Record<string, unknown> {
  if (mode === 'programming') {
    return {
      schema_version: ATLAS_AI_MODE_CONTRACT_VERSION,
      mode,
      objective:
        'resolver trabalho de engenharia com contexto, plano, execucao, verificacao e evidencias',
      routing_task: task,
      default_runtime: 'engineering_harness',
      memory_scope: 'engineering_and_current_thread',
      expected_output: ['diagnostico', 'plano', 'execucao', 'testes', 'riscos', 'proximos_passos'],
      required_behaviors: ['use_tools_when_needed', 'record_evidence', 'state_tests_or_reason'],
    }
  }
  if (mode === 'operational') {
    return {
      schema_version: ATLAS_AI_MODE_CONTRACT_VERSION,
      mode,
      objective: 'explicar situacao operacional, isolar causa, medir impacto e propor proxima acao',
      routing_task: task,
      memory_scope: 'operational_context_bundle_and_current_thread',
      expected_output: [
        'resumo',
        'evidencias',
        'risco',
        'acao_recomendada',
        'quando_promover_para_programacao',
      ],
      required_behaviors: ['use_context_bundle', 'separate_fact_from_hypothesis', 'recommend_next_action'],
    }
  }
  return {
    schema_version: ATLAS_AI_MODE_CONTRACT_VERSION,
    mode,
    objective:
      'conversa geral, pesquisa, ideias e organizacao sem herdar contexto operacional ou de codigo por acidente',
    routing_task: task,
    memory_scope: 'general_current_thread',
    expected_output: ['resposta_clara', 'perguntas_necessarias', 'proximos_passos_quando_util'],
    required_behaviors: ['keep_context_light', 'do_not_assume_operational_or_code_runtime'],
  }
}

function qualityPolicyForMode(mode: AtlasAiMode): Record<string, unknown> {
  if (mode === 'programming') {
    return {
      require_plan: true,
      require_tests_or_reason: true,
      require_diff_or_reason: true,
      require_risk_summary: true,
    }
  }
  if (mode === 'operational') {
    return {
      require_evidence: true,
      require_uncertainty: true,
      require_next_actions: true,
      avoid_raw_json_as_primary_output: true,
    }
  }
  return {
    keep_context_light: true,
    avoid_operational_or_programming_assumptions: true,
  }
}

function programmingRuntimePolicy(workspace: string | null): Record<string, unknown> {
  return {
    capability_profile: 'atlas_programming',
    permission_policy: 'full_access',
    permission_mode: 'danger',
    tool_permissions: {
      mode: 'danger',
      workspace: workspace ?? undefined,
      confirmed: true,
      allow_unsandboxed_provider: true,
      source: 'atlas_desktop_ai_programming_mode',
    },
    programming_harness: {
      schema_version: ATLAS_AI_MODE_CONTRACT_VERSION,
      workspace_required: true,
      expected_artifacts: ['plan', 'diff_or_reason', 'tests_or_reason', 'risks'],
      escalation_policy: 'ask_before_destructive_or_external_write',
    },
  }
}

export function providerLabel(value: AtlasAiProviderChoice): string {
  return PROVIDER_OPTIONS.find((opt) => opt.value === value)?.label ?? value
}
