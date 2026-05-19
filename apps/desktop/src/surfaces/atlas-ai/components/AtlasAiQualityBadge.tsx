/**
 * Atlas AI · Quality Badge (editorial quiet — v2).
 *
 * UMA linha italic serif. Drop boxed pill. Drop traffic-light colors.
 *
 *   resposta aprovada · 84/100              (tone-pass, bronze leve)
 *   resposta precisa revisão · 52/100       (tone-review, bronze)
 *   resposta reprovada · 28/100             (tone-fail, bronze italic strong)
 *
 * Click expande dimensões + flags + suggested actions (mantém detalhe).
 */
import { useState } from 'react'
import type { AiQualityEvaluation } from '../types'

interface AtlasAiQualityBadgeProps {
  evaluation: AiQualityEvaluation
}

function tone(status: string): 'pass' | 'review' | 'fail' {
  if (status === 'passed') return 'pass'
  if (status === 'failed') return 'fail'
  return 'review'
}

function label(status: string): string {
  if (status === 'passed') return 'resposta aprovada'
  if (status === 'failed') return 'resposta reprovada'
  if (status === 'needs_review') return 'resposta precisa revisão'
  return status
}

export function AtlasAiQualityBadge({ evaluation }: AtlasAiQualityBadgeProps) {
  const [open, setOpen] = useState(false)
  const t = tone(evaluation.status)
  const dimensions = evaluation.dimensions ?? {}
  const flags = evaluation.flags ?? []
  const actions = evaluation.suggested_actions ?? []
  const hasDetail = Object.keys(dimensions).length > 0 || flags.length > 0 || actions.length > 0

  return (
    <div className="atlas-ai-quality-line">
      <button
        type="button"
        className={`atlas-ai-quality-text tone-${t}${hasDetail ? ' has-detail' : ''}`}
        onClick={hasDetail ? () => setOpen((v) => !v) : undefined}
        aria-expanded={hasDetail ? open : undefined}
        aria-disabled={!hasDetail}
        disabled={!hasDetail}
      >
        {label(evaluation.status)}
        {evaluation.score !== null ? (
          <span className="atlas-ai-quality-score"> · {evaluation.score}/100</span>
        ) : null}
        {flags.length > 0 ? (
          <span className="atlas-ai-quality-flagcount"> · {flags.length} flag{flags.length === 1 ? '' : 's'}</span>
        ) : null}
      </button>

      {open && hasDetail ? (
        <div className="atlas-ai-quality-detail">
          {Object.keys(dimensions).length > 0 ? (
            <dl className="atlas-ai-quality-dims">
              {Object.entries(dimensions).map(([key, value]) => (
                <span key={key} className="atlas-ai-quality-dim">
                  <dt>{key}</dt>
                  <dd>{String(value)}</dd>
                </span>
              ))}
            </dl>
          ) : null}
          {flags.length > 0 ? (
            <p className="atlas-ai-quality-flags">
              <span className="atlas-ai-quality-flags-label">flags</span>
              {flags.map((f, i) => (
                <span key={i} className="atlas-ai-quality-flag">{String(f)}</span>
              ))}
            </p>
          ) : null}
          {actions.length > 0 ? (
            <p className="atlas-ai-quality-actions">
              <span className="atlas-ai-quality-actions-label">sugestões</span>
              {actions.map((a, i) => (
                <span key={i} className="atlas-ai-quality-action">{String(a)}</span>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
