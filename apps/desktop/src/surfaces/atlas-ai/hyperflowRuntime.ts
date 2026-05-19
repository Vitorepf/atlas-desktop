/**
 * Atlas AI · Desktop · Hyperflow runtime consumption.
 *
 * Porte fiel do contrato `atlas.ai.hyperflow_runtime.v1` que vem na resposta
 * de `POST /ai/interactions`. Espelha `atlas-app/lib/atlasAi/hyperflowRuntime.ts`
 * com adaptação aos tipos desktop (campos opcionais em `AtlasAiHyperflowTrace`).
 *
 * Atlas AI Desktop é SURFACE Plane do Hyperflow:
 *
 *   - `domain_id` ≠ 'programming' NUNCA renderiza como `programming.dev` no front.
 *   - `domain_id === 'programming'` E `handoff_target` presente é o ÚNICO caminho
 *     válido pra UI exibir programming — vem da decisão real do backend.
 *   - `trace.hyperflow == null` => UI cai em estado "aguardando router" e NÃO
 *     fabrica decisão local.
 *
 * Duas projeções:
 *   1. Flat (`trace.hyperflow`) — projeção AiTraceResource, canon hoje.
 *   2. Nested (`trace.metadata?.hyperflow_runtime` ou `trace.payload?.hyperflow_runtime`)
 *      — raw do AtlasHyperflowEntryService. Fallback.
 */
import type { AtlasAiHyperflowTrace } from './types'

export const HYPERFLOW_RUNTIME_SCHEMA = 'atlas.ai.hyperflow_runtime.v1' as const

/**
 * Nested shape (raw) que o backend pode projetar no `payload.hyperflow_runtime`
 * ou `metadata.hyperflow_runtime`. Usado apenas internamente para normalizar
 * em `AtlasAiHyperflowTrace` (flat canon).
 */
export interface HyperflowRuntimePayload {
  schema_version?: string
  status?: 'ready' | 'blocked' | string
  intent?: {
    intent_type?: string
    confidence?: number
    ambiguity_score?: number
    signals?: Record<string, unknown>
  }
  primary_domain?: string
  flow_id?: string
  router_decision?: {
    receipt_hash?: string
    uuid?: string
    routing_mode?: string
    policy_required?: boolean
    evidence_required?: boolean
    tool_plan_required?: boolean
  }
  flow_route?: {
    flow_profile?: string
    expected_capabilities?: string[]
    required_gates?: string[]
    fallback_flows?: string[]
    runtime_mode?: string
  }
  dispatch?: {
    dispatch_target?: string
    dispatch_status?: string
    blockers?: string[]
    receipt_hash?: string
  }
  handoff_target?: {
    kind?: string
    flow_id?: string
  } | null
  decision_receipt?: {
    receipt_hash?: string
    receipt_type?: string
  }
}

/**
 * Extrai o flat shape canônico a partir de qualquer formato que o backend
 * retorne. Ordem: `trace.hyperflow` (canon) → `trace.metadata?.hyperflow_runtime`
 * → `trace.payload?.hyperflow_runtime` (nested fallbacks).
 *
 * Retorna `null` quando nenhum está presente (NÃO inventa decisão).
 */
export function extractHyperflow(trace: unknown): AtlasAiHyperflowTrace | null {
  if (!trace || typeof trace !== 'object') return null
  const record = trace as Record<string, unknown>

  const flat = record.hyperflow
  if (isHyperflowTrace(flat)) return flat

  const metadata = record.metadata
  if (metadata && typeof metadata === 'object') {
    const nested = (metadata as Record<string, unknown>).hyperflow_runtime
    if (nested && typeof nested === 'object') {
      return normalizeNestedToFlat(nested as HyperflowRuntimePayload)
    }
  }

  const payload = record.payload
  if (payload && typeof payload === 'object') {
    const nested = (payload as Record<string, unknown>).hyperflow_runtime
    if (nested && typeof nested === 'object') {
      return normalizeNestedToFlat(nested as HyperflowRuntimePayload)
    }
  }

  return null
}

function isHyperflowTrace(value: unknown): value is AtlasAiHyperflowTrace {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  // Desktop's AtlasAiHyperflowTrace is permissive (all optional). We accept any
  // object that at least carries one canonical signal.
  return (
    typeof v.intent === 'string'
    || typeof v.domain_id === 'string'
    || typeof v.flow_id === 'string'
    || typeof v.schema_version === 'string'
  )
}

function normalizeNestedToFlat(nested: HyperflowRuntimePayload): AtlasAiHyperflowTrace {
  const intent = nested.intent?.intent_type ?? 'unknown'
  const handoffTarget = nested.handoff_target?.kind ?? null

  return {
    schema_version: HYPERFLOW_RUNTIME_SCHEMA,
    intent,
    domain_id: nested.primary_domain ?? 'unknown',
    flow_id: nested.flow_id ?? 'auto',
    runtime_mode: nested.router_decision?.routing_mode ?? nested.flow_route?.runtime_mode ?? 'standard',
    confidence: nested.intent?.confidence ?? 0,
    policy_refs: [],
    evidence_refs: [],
    decision_receipt_id: nested.decision_receipt?.receipt_hash ?? nested.router_decision?.uuid ?? null,
    decision_receipt_hash: nested.decision_receipt?.receipt_hash ?? nested.router_decision?.receipt_hash ?? null,
    dispatch_status: nested.dispatch?.dispatch_status ?? 'planned',
    handoff_target: handoffTarget,
    handoff_reason: null,
    router_was_overridden: false,
    reasons: [],
  }
}

/**
 * Anti-regressão auto/auto: quando `atlas_mode === 'auto'`, o payload NÃO
 * pode carregar programming_harness, capability_profile, permission_policy,
 * tool_permissions ou mobile_runtime_policy. Útil em testes e runtime guards.
 */
export function isAutoAutoCleanPayload(payload: Record<string, unknown>): boolean {
  if (payload.atlas_mode !== 'auto') return true
  const forbidden = [
    'programming_harness',
    'capability_profile',
    'permission_policy',
    'tool_permissions',
    'mobile_runtime_policy',
  ]
  return forbidden.every((key) => !(key in payload))
}

const INTENT_LABEL_BY_TYPE: Record<string, string> = {
  conversation: 'Conversa',
  research: 'Pesquisa',
  programming: 'Programação',
  debug: 'Debug',
  review: 'Review',
  explain: 'Explicar',
  plan: 'Plano',
  finance: 'Finanças',
  marketing: 'Marketing',
  strategy: 'Estratégia',
  cyber: 'Cyber',
  personal_development: 'Pessoal',
  automation: 'Automação',
  unknown: 'Indefinido',
}

export function intentLabelFor(intent: string | null | undefined): string | null {
  if (!intent) return null
  return INTENT_LABEL_BY_TYPE[intent] ?? intent
}

/**
 * Formata as razões da decisão (`reasons` array) em string compacta humana.
 * Quando reasons está vazio, usa intent/flow/runtime como composição.
 */
export function formatRoutingReason(hyperflow: AtlasAiHyperflowTrace | null): string {
  if (!hyperflow) return ''
  const reasons = hyperflow.reasons
  if (reasons && reasons.length > 0) {
    return reasons.join(' · ')
  }
  const parts: string[] = []
  const label = intentLabelFor(hyperflow.intent ?? null)
  if (label) parts.push(label)
  if (hyperflow.flow_id) parts.push(`flow:${hyperflow.flow_id}`)
  if (hyperflow.runtime_mode) parts.push(`mode:${hyperflow.runtime_mode}`)
  return parts.join(' · ')
}

/**
 * Retorna o `flow_id` canônico (backend wins) ou `null` se o backend ainda
 * não decidiu. NUNCA retorna fallback local — para fallback local usa
 * `flowIdForMode()` do contract diretamente.
 */
export function flowIdFromRuntime(hyperflow: AtlasAiHyperflowTrace | null): string | null {
  if (!hyperflow) return null
  return hyperflow.flow_id ?? null
}
