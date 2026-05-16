/**
 * Atlas Dev · DiffViewer.
 *
 * Renders the unified-diff string surfaced via plan.ui_hints.diff_preview or
 * receipt.ui_hints.diff_preview. We never reformat / re-tokenize the diff —
 * we only colour lines client-side. For `no_patch_needed` / `blocked` the
 * panel shows an editorial empty state.
 */
import { useMemo } from 'react'
import type { CompletionState } from './types'
import styles from './atlasDev.module.css'

interface DiffViewerProps {
  diff: string | null | undefined
  completionState: CompletionState | null
}

interface DiffLine {
  kind: 'add' | 'remove' | 'header' | 'context'
  text: string
}

function classifyLine(line: string): DiffLine {
  if (line.startsWith('diff --git') || line.startsWith('@@') || line.startsWith('+++') || line.startsWith('---') || line.startsWith('index ')) {
    return { kind: 'header', text: line }
  }
  if (line.startsWith('+')) return { kind: 'add', text: line }
  if (line.startsWith('-')) return { kind: 'remove', text: line }
  return { kind: 'context', text: line }
}

export function DiffViewer({ diff, completionState }: DiffViewerProps) {
  const lines = useMemo<DiffLine[]>(() => {
    if (!diff) return []
    return diff.split(/\r?\n/).map(classifyLine)
  }, [diff])

  return (
    <section className={styles.panel} aria-label="Atlas Dev diff preview">
      <header className={styles.panelHeader}>
        <span className={styles.panelTitle}>Diff</span>
        {diff ? <span>{lines.length} linhas</span> : null}
      </header>

      {(!diff || lines.length === 0) && (
        <p className={styles.empty}>
          {completionState === 'no_patch_needed'
            ? 'Sem patch — Atlas considerou o trabalho concluído sem escrita.'
            : completionState === 'blocked'
              ? 'Run bloqueado antes do patch. Veja o receipt.'
              : 'Sem diff disponível ainda.'}
        </p>
      )}

      {lines.length > 0 ? (
        <pre className={styles.diff}>
          {lines.map((line, idx) => {
            const cls =
              line.kind === 'add'
                ? styles.diffLineAdd
                : line.kind === 'remove'
                  ? styles.diffLineRemove
                  : line.kind === 'header'
                    ? styles.diffLineHeader
                    : undefined
            return (
              <span key={idx} className={cls}>
                {line.text}
                {'\n'}
              </span>
            )
          })}
        </pre>
      ) : null}
    </section>
  )
}
