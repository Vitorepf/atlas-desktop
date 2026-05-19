/**
 * Atlas AI · Desktop · hook React para consumir hyperflow runtime de um trace.
 *
 * Backend é sempre a ground truth. O hook NUNCA inventa decisão local.
 *
 * Uso típico no ContextPanel:
 *
 * ```tsx
 * const hyperflow = useHyperflowRuntime(trace)
 * if (hyperflow.isReady) {
 *   showBadge(`${hyperflow.intentLabel} · ${hyperflow.flowId}`)
 * }
 * ```
 */
import { useMemo } from 'react'
import type { AtlasAiHyperflowTrace } from './types'
import {
  extractHyperflow,
  flowIdFromRuntime,
  formatRoutingReason,
  intentLabelFor,
} from './hyperflowRuntime'

export interface HyperflowRuntimeView {
  /** Raw flat shape canon, null se backend ainda não decidiu. */
  raw: AtlasAiHyperflowTrace | null
  /** True quando há decisão real do backend (não null, não pendente). */
  isReady: boolean
  /** True enquanto o trace estiver `queued`/`processing` SEM hyperflow ainda. */
  isPending: boolean
  /** Intent type (ex: 'research', 'programming') ou null. */
  intent: string | null
  /** Label humano do intent (ex: 'Pesquisa', 'Programação'). */
  intentLabel: string | null
  /** Domain inferido (ex: 'research', 'programming') ou null. */
  domainId: string | null
  /** Flow ID canônico (backend wins). Null se ainda não decidido. */
  flowId: string | null
  /** Runtime mode: lightweight | standard | deep | forge | blocked. */
  runtimeMode: string | null
  /** Confiança 0..1 ou null. */
  confidence: number | null
  /** SHA-256 64-chars hex do receipt persistido em Postgres, audit trail. */
  receiptHash: string | null
  /** Alvo de handoff (atlas_dev/atlas_forge) ou null quando não há. */
  handoffTarget: string | null
  /** Razão textual do handoff, ou null. */
  handoffReason: string | null
  /** Status do dispatch: planned | dispatched | simulated | blocked | completed. */
  dispatchStatus: string | null
  /** Razões textuais da decisão (ex: ['intent_type:research', ...]). */
  reasons: string[]
  /** Resumo textual compacto pra UI (ex: 'Pesquisa · flow:atlas_research · mode:deep'). */
  routingReasonSummary: string
  /**
   * Sinaliza handoff para Atlas Forge (Obra/trabalho pesado) com base no
   * `handoff_target` real do backend. Útil para painéis condicionais.
   */
  isForgeHandoff: boolean
  /** Sinaliza handoff para Atlas Dev (programação leve/média). */
  isDevHandoff: boolean
}

interface TraceLikeWithStatus {
  status?: string
}

export function useHyperflowRuntime(trace: unknown): HyperflowRuntimeView {
  return useMemo(() => buildHyperflowRuntimeView(trace), [trace])
}

/**
 * Versão pura da projeção, exposta para testes diretos sem React renderer.
 */
export function buildHyperflowRuntimeView(trace: unknown): HyperflowRuntimeView {
  const raw = extractHyperflow(trace)
  const status = (trace as TraceLikeWithStatus | null)?.status ?? null
  const isProcessing = status === 'queued' || status === 'processing'

  if (!raw) {
    return {
      raw: null,
      isReady: false,
      isPending: isProcessing,
      intent: null,
      intentLabel: null,
      domainId: null,
      flowId: null,
      runtimeMode: null,
      confidence: null,
      receiptHash: null,
      handoffTarget: null,
      handoffReason: null,
      dispatchStatus: null,
      reasons: [],
      routingReasonSummary: '',
      isForgeHandoff: false,
      isDevHandoff: false,
    }
  }

  const handoffTarget = raw.handoff_target ?? null
  const handoffLower = typeof handoffTarget === 'string' ? handoffTarget.toLowerCase() : ''

  return {
    raw,
    isReady: true,
    isPending: false,
    intent: raw.intent ?? null,
    intentLabel: intentLabelFor(raw.intent ?? null),
    domainId: raw.domain_id ?? null,
    flowId: flowIdFromRuntime(raw),
    runtimeMode: raw.runtime_mode ?? null,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : null,
    receiptHash: raw.decision_receipt_hash ?? null,
    handoffTarget,
    handoffReason: raw.handoff_reason ?? null,
    dispatchStatus: raw.dispatch_status ?? null,
    reasons: raw.reasons ? Array.from(raw.reasons) : [],
    routingReasonSummary: formatRoutingReason(raw),
    isForgeHandoff: handoffLower.includes('forge'),
    isDevHandoff: handoffLower === 'atlas_dev' || handoffLower === 'dev',
  }
}
