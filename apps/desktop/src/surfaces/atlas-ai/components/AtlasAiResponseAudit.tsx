/**
 * Atlas AI · Response Audit.
 *
 * Renderiza, abaixo de uma mensagem do Atlas, os blocos de auditoria que o
 * PresentationContract extraiu do `response_text` (source_refs, uncertainty,
 * receipt, trace, handoff, etc.).
 *
 * É a contrapartida desktop da "auditoria da resposta" no
 * `AtlasAiContextSheet` mobile. Mantém o corpo principal editorial e expõe os
 * dados técnicos num bloco honesto, em vez de descartá-los.
 *
 * Slate dark canon · sem cor hardcoded · escondido via `atlas-calmaria-hide`
 * pelo parent quando modo calmaria está ativo.
 */

import { useState } from 'react'

interface AtlasAiResponseAuditProps {
  sections: Record<string, string[]>
}

const SECTION_LABELS: Record<string, string> = {
  source_refs: 'fontes',
  sources: 'fontes',
  uncertainty: 'incerteza',
  relevant_context_refs: 'contexto',
  context_refs: 'contexto',
  evidence_refs: 'evidência',
  evidence: 'evidência',
  trace: 'trace',
  receipt: 'receipt',
  routing: 'routing',
  confidence: 'confiança',
  handoff: 'handoff',
  context_pack: 'context pack',
  metadata: 'metadata',
}

function labelFor(key: string): string {
  return SECTION_LABELS[key] ?? key.replace(/[_-]+/g, ' ')
}

export function AtlasAiResponseAudit({ sections }: AtlasAiResponseAuditProps) {
  const [open, setOpen] = useState(false)
  const entries = Object.entries(sections).filter(([, lines]) => lines.length > 0)
  if (entries.length === 0) return null

  return (
    <details
      className="atlas-ai-response-audit"
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className="atlas-ai-response-audit-summary">
        <span className="atlas-ai-response-audit-mark" aria-hidden="true">✦</span>
        <span className="atlas-ai-response-audit-label">auditoria</span>
        <span className="atlas-ai-response-audit-count">{entries.length}</span>
      </summary>
      <div className="atlas-ai-response-audit-body">
        {entries.map(([key, lines]) => (
          <section key={key} className="atlas-ai-response-audit-section">
            <h6 className="atlas-ai-response-audit-section-label">{labelFor(key)}</h6>
            <ul className="atlas-ai-response-audit-list">
              {lines.map((line, index) => (
                <li key={`${key}-${index}`}>{line.replace(/^[-*+]\s+/, '')}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  )
}
