/**
 * Atlas AI · Rich Artifact · Diff (side-by-side)
 *
 * Renderiza diff antes/depois lado-a-lado com line-by-line + annotations
 * opcionais. Substitui 2 code blocks separados quando IA mostra refactor.
 *
 * Source format (JSON dentro de ```atlas:diff):
 *   {
 *     "file": "src/components/Button.tsx",
 *     "before": "...",
 *     "after": "...",
 *     "annotations": [{"line": 3, "note": "tipagem adicionada"}]  // opcional
 *   }
 *
 * DNA: slate sunken background, hairline border, mono code, accent gold pra
 * file path, ink-muted pra unchanged lines, ink-strong pra changes.
 */
import type { ReactElement } from 'react'

interface DiffAnnotation {
  line: number
  note: string
}

interface DiffData {
  file?: string
  before?: string
  after?: string
  annotations?: DiffAnnotation[]
}

function isDiffData(data: unknown): data is DiffData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (d.before !== undefined && typeof d.before !== 'string') return false
  if (d.after !== undefined && typeof d.after !== 'string') return false
  if (d.file !== undefined && typeof d.file !== 'string') return false
  return true
}

function renderColumn(label: string, source: string, tone: 'before' | 'after'): ReactElement {
  const lines = source.split('\n')
  return (
    <div className={`atlas-ai-diff-col atlas-ai-diff-col-${tone}`}>
      <header className="atlas-ai-diff-col-head">{label}</header>
      <pre className="atlas-ai-diff-pre">
        {lines.map((line, i) => (
          <span key={i} className="atlas-ai-diff-line">
            <span className="atlas-ai-diff-num">{i + 1}</span>
            <span className="atlas-ai-diff-text">{line || ' '}</span>
          </span>
        ))}
      </pre>
    </div>
  )
}

export function AtlasAiDiff({ data }: { data: unknown }): ReactElement {
  if (!isDiffData(data)) {
    return (
      <div className="atlas-ai-rich-artifact atlas-ai-rich-artifact-error">
        diff malformado · esperado {'{ file?, before, after }'}
      </div>
    )
  }
  const before = data.before ?? ''
  const after = data.after ?? ''
  const annotations = data.annotations ?? []

  return (
    <article className="atlas-ai-rich-artifact atlas-ai-rich-artifact-diff" aria-label="Diff antes/depois">
      {data.file ? (
        <header className="atlas-ai-rich-artifact-head">
          <span className="atlas-ai-rich-artifact-kind">diff</span>
          <span className="atlas-ai-rich-artifact-title">{data.file}</span>
        </header>
      ) : null}
      <div className="atlas-ai-diff-grid">
        {renderColumn('antes', before, 'before')}
        {renderColumn('depois', after, 'after')}
      </div>
      {annotations.length > 0 ? (
        <footer className="atlas-ai-diff-annotations">
          {annotations.map((a, i) => (
            <p key={i} className="atlas-ai-diff-annotation">
              <span className="atlas-ai-diff-annotation-line">L{a.line}</span>
              <span className="atlas-ai-diff-annotation-note">{a.note}</span>
            </p>
          ))}
        </footer>
      ) : null}
    </article>
  )
}
