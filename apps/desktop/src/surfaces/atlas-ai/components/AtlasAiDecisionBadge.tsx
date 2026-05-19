/**
 * Atlas AI · Decision Badge (editorial quiet — v2).
 *
 * Renderiza decisão de roteamento em UMA linha italic serif, sem box,
 * sem pílula, sem `+` button. Click expande razão.
 *
 *   claude · auto · convicção alta             (default)
 *   ────────────────────────────────────────
 *   "razão: dev simples, sem mutações; provider mais barato disponível"
 *
 * DNA: bronze peso variável, ink hierárquico. ZERO cor semafórica
 * (no red/yellow/green) — risk vira modifier italic discreet.
 */
import { useState } from 'react'
import type { AiAtlasDecision, AiRouterDecision } from '../types'

interface AtlasAiDecisionBadgeProps {
  atlasDecision?: AiAtlasDecision | null
  routerDecision?: AiRouterDecision | null
}

function convictionPhrase(score: number | null): string | null {
  if (score === null || score < 0) return null
  if (score >= 80) return 'convicção alta'
  if (score >= 50) return 'convicção média'
  return 'inferência tentativa'
}

function riskPhrase(level: string | null): string | null {
  const lc = (level ?? '').toLowerCase()
  if (lc === 'high') return 'risco a validar'
  if (lc === 'medium') return 'risco discreto'
  return null
}

export function AtlasAiDecisionBadge({ atlasDecision, routerDecision }: AtlasAiDecisionBadgeProps) {
  const [open, setOpen] = useState(false)
  if (!atlasDecision && !routerDecision) return null

  const decision = atlasDecision
  const provider = decision?.selected_provider ?? routerDecision?.selected_provider ?? null
  const wasOverridden = !!(decision?.was_overridden ?? routerDecision?.was_overridden)
  const mode = wasOverridden ? 'manual' : 'auto'
  const conviction = convictionPhrase(decision?.confidence_score ?? null)
  const risk = riskPhrase(decision?.risk_level ?? null)
  const reason = decision?.reason ?? routerDecision?.reason ?? null
  const hasDetail = !!reason || !!decision?.fallback_provider

  const parts: string[] = []
  if (provider) parts.push(provider)
  parts.push(mode)
  if (conviction) parts.push(conviction)
  if (risk) parts.push(risk)

  return (
    <div className="atlas-ai-decision-line">
      <button
        type="button"
        className={`atlas-ai-decision-text${hasDetail ? ' has-detail' : ''}`}
        onClick={hasDetail ? () => setOpen((v) => !v) : undefined}
        aria-expanded={hasDetail ? open : undefined}
        aria-disabled={!hasDetail}
        disabled={!hasDetail}
      >
        {parts.map((p, i) => (
          <span key={i} className="atlas-ai-decision-part">
            {i > 0 ? <span className="atlas-ai-decision-sep" aria-hidden="true"> · </span> : null}
            {p}
          </span>
        ))}
      </button>

      {open && reason ? (
        <p className="atlas-ai-decision-reason">{reason}</p>
      ) : null}
    </div>
  )
}
