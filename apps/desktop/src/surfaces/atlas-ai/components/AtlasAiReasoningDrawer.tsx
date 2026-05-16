/**
 * Atlas AI · Reasoning Drawer (peek into chain-of-thought).
 *
 * Botão discreto sob o bubble do Atlas: "ver raciocínio →" abre drawer
 * lateral com:
 *   I.   contexto considerado  (context_refs + context_strategy)
 *   II.  decisão de roteamento  (atlas_decision.reason + signals)
 *   III. ferramentas executadas (tool_events com input/output peek)
 *   IV.  custo & tempo         (metric_summary: tokens, $, latency_ms)
 *   V.   avaliação de qualidade (quality_evaluation: score, flags)
 *
 * Numeração romana Cormorant (DNA Atlas: minimal-luxe editorial).
 * Esconde se Calmaria mode ativo.
 *
 * Inspiração: spec inovação #3 "Drawer de razão" + gap "no chain-of-thought
 * visibility" comum a Codex/Claude/Cursor.
 */
import { useState } from 'react'
import { IconAtlasDiamond, IconAlert } from '../icons/AtlasAiIcons'
import type {
  AiAtlasDecision,
  AiQualityEvaluation,
  AiToolEvent,
  AiTraceMetricSummary,
} from '../types'

interface AtlasAiReasoningDrawerProps {
  decision?: AiAtlasDecision | null
  toolEvents?: AiToolEvent[] | null
  metricSummary?: AiTraceMetricSummary | null
  qualityEvaluation?: AiQualityEvaluation | null
  contextRefs?: ReadonlyArray<unknown> | null
}

function formatCost(microusd: number | null): string | null {
  if (microusd === null || microusd <= 0) return null
  const usd = microusd / 1_000_000
  if (usd < 0.01) return `<$0.01`
  return `$${usd.toFixed(2)}`
}

function formatLatency(ms: number | null): string | null {
  if (ms === null) return null
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60)}s`
}

export function AtlasAiReasoningDrawer({
  decision,
  toolEvents,
  metricSummary,
  qualityEvaluation,
  contextRefs,
}: AtlasAiReasoningDrawerProps) {
  const [open, setOpen] = useState(false)
  // Não renderiza se não há nenhum sinal interessante
  const hasAnything =
    !!decision?.reason ||
    !!(toolEvents && toolEvents.length > 0) ||
    !!metricSummary?.total_tokens ||
    !!qualityEvaluation ||
    !!(contextRefs && contextRefs.length > 0)
  if (!hasAnything) return null

  return (
    <div className="atlas-ai-reasoning-drawer atlas-calmaria-hide">
      <button
        type="button"
        className="atlas-ai-reasoning-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <IconAtlasDiamond size={11} />
        <span>{open ? 'ocultar raciocínio' : 'ver raciocínio →'}</span>
      </button>

      {open ? (
        <div className="atlas-ai-reasoning-content">
          {contextRefs && contextRefs.length > 0 ? (
            <section className="atlas-ai-reasoning-section">
              <h4>
                <span className="atlas-ai-reasoning-numeral">I.</span> contexto considerado
              </h4>
              <p className="atlas-ai-reasoning-text">
                {contextRefs.length} referência{contextRefs.length === 1 ? '' : 's'} carregada{contextRefs.length === 1 ? '' : 's'}
                {decision?.context_strategy ? ` · estratégia: ${decision.context_strategy}` : ''}
              </p>
            </section>
          ) : null}

          {decision?.reason ? (
            <section className="atlas-ai-reasoning-section">
              <h4>
                <span className="atlas-ai-reasoning-numeral">II.</span> decisão de roteamento
              </h4>
              <p className="atlas-ai-reasoning-text">{decision.reason}</p>
              {decision.candidates && decision.candidates.length > 0 ? (
                <p className="atlas-ai-reasoning-candidates">
                  candidatos considerados: {decision.candidates.length}
                </p>
              ) : null}
            </section>
          ) : null}

          {toolEvents && toolEvents.length > 0 ? (
            <section className="atlas-ai-reasoning-section">
              <h4>
                <span className="atlas-ai-reasoning-numeral">III.</span> ferramentas executadas
              </h4>
              <ol className="atlas-ai-reasoning-tools">
                {toolEvents.slice(0, 10).map((ev) => (
                  <li key={ev.id}>
                    <span className="atlas-ai-reasoning-tool-name">{ev.tool}</span>
                    {ev.duration_ms !== null ? (
                      <span className="atlas-ai-reasoning-tool-time">
                        · {formatLatency(ev.duration_ms)}
                      </span>
                    ) : null}
                    {ev.error || (ev.exit_code !== null && ev.exit_code !== 0) ? (
                      <span className="atlas-ai-reasoning-tool-error" aria-label="com erro">
                        <IconAlert size={10} />
                      </span>
                    ) : null}
                  </li>
                ))}
                {toolEvents.length > 10 ? (
                  <li className="atlas-ai-reasoning-tools-more">
                    … +{toolEvents.length - 10} ferramentas (clique no chip acima para ver tudo)
                  </li>
                ) : null}
              </ol>
            </section>
          ) : null}

          {metricSummary ? (
            <section className="atlas-ai-reasoning-section">
              <h4>
                <span className="atlas-ai-reasoning-numeral">IV.</span> custo &amp; tempo
              </h4>
              <dl className="atlas-ai-reasoning-cost">
                {metricSummary.total_tokens ? (
                  <>
                    <dt>tokens</dt>
                    <dd>
                      {metricSummary.prompt_tokens ?? '?'} prompt
                      {' + '}
                      {metricSummary.completion_tokens ?? '?'} resposta
                      {' = '}
                      <strong>{metricSummary.total_tokens}</strong>
                    </dd>
                  </>
                ) : null}
                {formatCost(metricSummary.cost_microusd) ? (
                  <>
                    <dt>custo</dt>
                    <dd>{formatCost(metricSummary.cost_microusd)}</dd>
                  </>
                ) : null}
                {formatLatency(metricSummary.total_latency_ms) ? (
                  <>
                    <dt>tempo</dt>
                    <dd>
                      {formatLatency(metricSummary.total_latency_ms)}
                      {metricSummary.first_token_ms
                        ? ` · primeiro token em ${formatLatency(metricSummary.first_token_ms)}`
                        : ''}
                    </dd>
                  </>
                ) : null}
              </dl>
            </section>
          ) : null}

          {qualityEvaluation ? (
            <section className="atlas-ai-reasoning-section">
              <h4>
                <span className="atlas-ai-reasoning-numeral">V.</span> avaliação de qualidade
              </h4>
              <p className="atlas-ai-reasoning-text">
                {qualityEvaluation.status === 'passed'
                  ? 'resposta aprovada pelo evaluator interno'
                  : qualityEvaluation.status === 'failed'
                    ? 'resposta reprovada — revisar antes de aplicar'
                    : 'resposta precisa de revisão humana'}
                {qualityEvaluation.score !== null ? ` · score ${qualityEvaluation.score}/100` : ''}
              </p>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
