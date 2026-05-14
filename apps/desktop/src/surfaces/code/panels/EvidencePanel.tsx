import { PanelTitle } from '@atlas/ui'
import type { ProgrammingEvidenceReceiptSnapshot } from '@atlas/domain'
import { EmptyText } from './RightRailPrimitives'
import { ForgeWorkspaceBanner } from './ForgeWorkspaceBanner'
import type { RightRailContext } from './rightRailTypes'

export function EvidencePanel({ evidence, receipt, programmingGovernance }: RightRailContext) {
  const refs = programmingGovernance?.evidenceRefs ?? []
  const hasGovernanceRefs = refs.length > 0

  if (hasGovernanceRefs) {
    return (
      <section className="ops-panel">
        <ForgeWorkspaceBanner receipt={receipt} governance={programmingGovernance} />
        <div className="ops-section">
          <PanelTitle label="Evidence Receipts" meta={`${refs.length} · governance`} />
          <div style={{ display: 'grid', gap: 4 }}>
            {refs.map((evidenceReceipt, idx) => (
              <EvidenceReceiptCard key={evidenceReceipt.receiptId ?? `${idx}`} receipt={evidenceReceipt} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Fallback: legacy evidence list when governance has no refs yet.
  if (programmingGovernance?.workItem) {
    return (
      <section className="ops-panel">
        <ForgeWorkspaceBanner receipt={receipt} governance={programmingGovernance} />
        <div className="ops-section">
          <PanelTitle label="Evidence Receipts" meta="sem refs" />
          <EmptyText>sem evidence receipts reais</EmptyText>
        </div>
      </section>
    )
  }

  return (
    <section className="ops-panel">
      <ForgeWorkspaceBanner receipt={receipt} governance={programmingGovernance} />
      <div className="ops-section">
        <PanelTitle
          label="Evidence Ledger"
          meta={evidence.length === 0 ? 'sem evidências' : `${evidence.length} eventos`}
        />
        {evidence.length === 0 ? (
          <EmptyText>nenhuma evidência registrada para esta obra.</EmptyText>
        ) : (
          <div style={{ display: 'grid', gap: 4 }}>
            {evidence.map((e) => (
              <div
                key={e.id}
                style={{
                  padding: '6px 8px',
                  background: 'var(--cream)',
                  border: '1px solid var(--bronze-soft)',
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 8.5,
                    letterSpacing: '1.3px',
                    color: 'var(--bronze)',
                    textTransform: 'uppercase',
                  }}
                >
                  {e.kind}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink)' }}>{e.summary}</div>
                <div style={{ fontSize: 9.5, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>
                  {e.createdAt ? new Date(e.createdAt).toLocaleString('pt-BR') : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function EvidenceReceiptCard({ receipt }: { receipt: ProgrammingEvidenceReceiptSnapshot }) {
  const persisted = receipt.storage?.persisted ?? false
  const border = persisted
    ? '1px solid var(--bronze-soft)'
    : '1px solid var(--rec-red, #8a3025)'
  const bg = persisted ? 'var(--cream)' : 'var(--rec-red-veil, rgba(138,48,37,0.08))'

  const outputExcerpt = receipt.output && receipt.output.length > 200
    ? `${receipt.output.slice(0, 200)}…`
    : receipt.output

  return (
    <div
      style={{
        padding: '8px 10px',
        background: bg,
        border,
        borderRadius: 2,
        display: 'grid',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 8.5,
            letterSpacing: '1.3px',
            color: 'var(--bronze)',
            textTransform: 'uppercase',
          }}
        >
          {receipt.evidenceType || 'evidence'} · {receipt.status || 'unknown'}
        </span>
        {receipt.recordedAt ? (
          <span style={{ fontSize: 9.5, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>
            {new Date(receipt.recordedAt).toLocaleString('pt-BR')}
          </span>
        ) : null}
      </div>

      {!persisted ? (
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--rec-red, #8a3025)',
            letterSpacing: '0.6px',
          }}
        >
          evidence nao persistiu no ledger
          {receipt.storage?.reason ? ` · ${receipt.storage.reason}` : ''}
        </div>
      ) : null}

      {receipt.command ? (
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink)',
            wordBreak: 'break-all',
          }}
        >
          $ {receipt.command}
        </div>
      ) : null}

      {receipt.summary ? (
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--ink2)',
            lineHeight: 1.4,
          }}
        >
          {receipt.summary}
        </div>
      ) : null}

      {outputExcerpt ? (
        <pre
          style={{
            margin: 0,
            padding: '6px 8px',
            background: 'var(--cream-deep, rgba(0,0,0,0.04))',
            border: '1px solid var(--hair-soft)',
            borderRadius: 2,
            fontFamily: 'var(--mono)',
            fontSize: 10.5,
            color: 'var(--ink2)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 140,
            overflow: 'auto',
          }}
        >
          {outputExcerpt}
        </pre>
      ) : null}

      <MetaList label="files" items={receipt.files} />
      <MetaList label="tests" items={receipt.tests} />

      {receipt.diffPath ? (
        <div style={{ fontSize: 10.5, color: 'var(--ink2)', fontFamily: 'var(--mono)' }}>
          <span style={{ color: 'var(--bronze)' }}>diff · </span>
          <span style={{ wordBreak: 'break-all' }}>{receipt.diffPath}</span>
        </div>
      ) : null}

      {receipt.artifactUrl ? (
        <div style={{ fontSize: 10.5, color: 'var(--ink2)', fontFamily: 'var(--mono)' }}>
          <span style={{ color: 'var(--bronze)' }}>artifact · </span>
          <span style={{ wordBreak: 'break-all' }}>{receipt.artifactUrl}</span>
        </div>
      ) : null}

      {receipt.storage ? (
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 9.5,
            color: persisted ? 'var(--moss)' : 'var(--rec-red)',
            letterSpacing: '0.4px',
          }}
        >
          storage · {persisted ? 'persisted' : 'not persisted'}
          {receipt.storage.table ? ` · ${receipt.storage.table}` : ''}
          {receipt.storage.id ? ` · ${receipt.storage.id}` : ''}
        </div>
      ) : null}
    </div>
  )
}

function MetaList({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ fontSize: 10.5, color: 'var(--ink2)', fontFamily: 'var(--mono)' }}>
      <span style={{ color: 'var(--bronze)' }}>{label} · </span>
      <span style={{ wordBreak: 'break-all' }}>{items.join(' · ')}</span>
    </div>
  )
}
