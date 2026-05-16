/**
 * Atlas Dev · ReceiptCard.
 *
 * Final, persistent summary of the run. Mirrors `atlas.dev.verification_receipt.v1`
 * fields most operator-relevant: completion_state, scope_guard_status,
 * verification_status, honesty_flags, residual_risks, receipt_hash/path.
 */
import type { AtlasDevReceipt } from './types'
import styles from './atlasDev.module.css'

interface ReceiptCardProps {
  receipt: AtlasDevReceipt | null
}

function nonEmpty(list: string[] | null | undefined): string[] {
  return Array.isArray(list) ? list.filter((s) => typeof s === 'string' && s.trim() !== '') : []
}

export function ReceiptCard({ receipt }: ReceiptCardProps) {
  if (!receipt) {
    return (
      <section className={styles.panel} aria-label="Atlas Dev receipt">
        <header className={styles.panelHeader}>
          <span className={styles.panelTitle}>Receipt</span>
        </header>
        <p className={styles.empty}>Sem receipt ainda. Quando o run encerra, ele aparece aqui.</p>
      </section>
    )
  }

  const completion = receipt.completion?.status ?? 'failed'
  const honesty = nonEmpty(receipt.completion?.honesty_flags)
  const risks = nonEmpty(receipt.completion?.residual_risks)

  return (
    <section className={styles.panel} aria-label="Atlas Dev receipt">
      <header className={styles.panelHeader}>
        <span className={styles.panelTitle}>Receipt</span>
        <span>{receipt.run_id.slice(0, 8)}…</span>
      </header>

      <dl className={styles.receiptGrid}>
        <dt>completion_state</dt>
        <dd>
          <span
            className={styles.indicator}
            data-tone={
              completion === 'passed'
                ? 'positive'
                : completion === 'needs_review'
                  ? 'warning'
                  : completion === 'failed' || completion === 'blocked'
                    ? 'danger'
                    : 'neutral'
            }
          >
            {completion}
          </span>
        </dd>

        <dt>scope_guard_status</dt>
        <dd>{receipt.scope_guard_status ?? '—'}</dd>

        <dt>verification_status</dt>
        <dd>{receipt.verification_status ?? '—'}</dd>

        <dt>honesty_flags</dt>
        <dd>{honesty.length === 0 ? <span className={styles.empty}>nenhuma</span> : honesty.join(' · ')}</dd>

        <dt>residual_risks</dt>
        <dd>{risks.length === 0 ? <span className={styles.empty}>nenhum</span> : risks.join(' · ')}</dd>

        <dt>changed_files</dt>
        <dd>
          {receipt.changed_files && receipt.changed_files.length > 0
            ? receipt.changed_files.join(' · ')
            : <span className={styles.empty}>nenhum</span>}
        </dd>

        {receipt.receipt_hash ? (
          <>
            <dt>receipt_hash</dt>
            <dd>
              <code>{receipt.receipt_hash}</code>
            </dd>
          </>
        ) : null}

        {/*
          receipt_path é caminho absoluto do filesystem do servidor.
          Nunca exibir na UI — operador audita via REST /runs/{id} que retorna
          persisted_artifact_refs (workspace-relativos + hash). Mantemos o campo
          no tipo apenas para o backend de auditoria; o componente nunca o pinta.
        */}
      </dl>
    </section>
  )
}
