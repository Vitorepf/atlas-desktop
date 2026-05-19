/**
 * Atlas Dev · TestsPanel.
 *
 * Lists validation/test commands surfaced by SSE `test_*` events and/or by the
 * final receipt. Status is one of: pending (no `ok` yet), passed, failed.
 */
import type { AtlasDevTestRun } from './types'
import styles from './atlasDev.module.css'

interface TestsPanelProps {
  tests: AtlasDevTestRun[]
}

function statusFor(run: AtlasDevTestRun): { label: string; tone: 'positive' | 'danger' | 'neutral' } {
  if (run.ok === true) return { label: 'passed', tone: 'positive' }
  if (run.ok === false) return { label: 'failed', tone: 'danger' }
  return { label: 'running', tone: 'neutral' }
}

function formatDuration(ms: number | null | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function TestsPanel({ tests }: TestsPanelProps) {
  return (
    <section className={styles.panel} aria-label="Atlas Dev tests">
      <header className={styles.panelHeader}>
        <span className={styles.panelTitle}>Validation commands</span>
        {tests.length > 0 ? <span>{tests.length} comando(s)</span> : null}
      </header>

      {tests.length === 0 ? (
        <p className={styles.empty}>Nenhum comando de verificação reportado ainda.</p>
      ) : (
        <table className={styles.testsTable}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Comando</th>
              <th>Duração</th>
              <th>Exit</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((run, idx) => {
              const status = statusFor(run)
              return (
                <tr key={`${run.command}-${idx}`}>
                  <td>
                    <span className={styles.indicator} data-tone={status.tone}>
                      {status.label}
                    </span>
                  </td>
                  <td className={styles.testsCommand}>{run.command}</td>
                  <td>{formatDuration(run.duration_ms ?? null)}</td>
                  <td>{run.exit_code ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
