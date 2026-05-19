/**
 * Atlas AI · Confidence Band (UNIVERSAL GAP).
 *
 * Nenhum dos concorrentes (Cursor / Claude Code / Codex / Cursor / Devin /
 * V0 / Aider / Zed) faz visualização de confiança da IA. É um gap unânime.
 *
 * Atlas usa o `atlas_decision.confidence_score` (0-100) do backend e
 * renderiza uma "band" hairline acima do bubble do Atlas com tom bronze
 * que varia em opacidade conforme a confiança:
 *   ≥80  → bronze sólido       (alta · "Atlas tem certeza")
 *   50-79→ bronze médio        (média · "Atlas considera múltiplas opções")
 *   <50  → hairline tracejada  (baixa · "Atlas inferiu, pode estar errado")
 *
 * TDAH-friendly: discretíssima, peso 0.3 a 0.85 do bronze, sem números,
 * sem percentagens visíveis. Hover/click mostra detalhe.
 *
 * Inspiração: spec inovação #2 "Glifo de convicção" + universal gap C-research.
 */

interface AtlasAiConfidenceBandProps {
  score: number | null
  reason?: string | null
}

function band(score: number | null): {
  tone: 'high' | 'medium' | 'low' | 'unknown'
  label: string
} {
  if (score === null) return { tone: 'unknown', label: 'sem sinal de confiança' }
  if (score >= 80) return { tone: 'high', label: 'Atlas com alta convicção' }
  if (score >= 50) return { tone: 'medium', label: 'Atlas considerou opções' }
  return { tone: 'low', label: 'Atlas inferiu — valide antes de aplicar' }
}

export function AtlasAiConfidenceBand({ score, reason }: AtlasAiConfidenceBandProps) {
  const { tone, label } = band(score)
  return (
    <div
      className={`atlas-ai-confidence-band tone-${tone}`}
      role="img"
      aria-label={label}
      title={reason ? `${label} · ${reason}` : label}
    >
      <span className="atlas-ai-confidence-band-line" aria-hidden="true" />
    </div>
  )
}
