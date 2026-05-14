import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { EmptyText, Row } from './RightRailPrimitives'

interface ForgeEvidencePackPanelProps {
  liveExecution: WorkStateSnapshot['forgeLiveExecution']
}

export function ForgeEvidencePackPanel({ liveExecution }: ForgeEvidencePackPanelProps) {
  const pack = liveExecution?.evidencePack

  if (!pack) {
    return (
      <div className="ops-section">
        <PanelTitle label="Forge Evidence Pack" meta="sem artefato" />
        <EmptyText>aguardando evidence pack real</EmptyText>
      </div>
    )
  }

  const persisted = pack.persistence.engineeringRunPersisted && pack.persistence.engineeringEvidencePersisted
  const meta = `${pack.stageReceiptCount} receipts | ${pack.ledgerEventCount} ledger | ${persisted ? 'persisted' : 'partial'}`

  return (
    <div className="ops-section">
      <PanelTitle label="Forge Evidence Pack" meta={meta} />
      <div
        style={{
          display: 'grid',
          gap: 7,
          padding: '8px 10px',
          background: persisted ? 'var(--cream)' : 'var(--rec-red-veil, rgba(138,48,37,0.08))',
          border: persisted ? '1px solid var(--bronze-soft)' : '1px solid var(--rec-red, #8a3025)',
          borderRadius: 2,
        }}
      >
        <dl style={{ margin: 0 }}>
          <Row k="status" v={pack.status} ok={pack.status === 'passed'} />
          <Row k="run" v={pack.persistence.engineeringRunId ?? 'missing'} mono ok={pack.persistence.engineeringRunPersisted} />
          <Row k="evidence" v={pack.persistence.engineeringEvidenceId ?? 'missing'} mono ok={pack.persistence.engineeringEvidencePersisted} />
          <Row k="provider" v={pack.replay.externalProviderCall ? 'external' : 'local'} ok={!pack.replay.externalProviderCall} />
        </dl>

        {pack.replay.command ? <MonoBlock label="replay" value={`$ ${pack.replay.command}`} /> : null}
        {pack.replay.strictCommand ? <MonoBlock label="strict" value={`$ ${pack.replay.strictCommand}`} /> : null}

        <ListBlock
          label="stage receipts"
          empty="sem stage receipts"
          items={pack.stageReceipts.map((receipt) => `${receipt.index}. ${receipt.stage}:${receipt.status} ${receipt.receiptId}`)}
        />
        <ListBlock
          label="ledger events"
          empty="sem ledger events"
          items={pack.ledgerEvents.map((event) => `${event.index}. ${event.eventId}`)}
        />
        <ListBlock label="changed files" empty="sem files" items={pack.changedFiles} />

        <div style={{ display: 'grid', gap: 3 }}>
          <HashLine label="report" value={pack.integrity.reportHash} />
          <HashLine label="timeline" value={pack.integrity.stageTimelineHash} />
          <HashLine label="pack" value={pack.integrity.evidencePackHash} />
        </div>

        {pack.remainingBlockers.length > 0 ? (
          <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 10, color: 'var(--rec-red, #8a3025)', wordBreak: 'break-word' }}>
            blockers | {pack.remainingBlockers.join(' | ')}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MonoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <span
        style={{
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 8,
          letterSpacing: '1px',
          color: 'var(--bronze)',
          textTransform: 'none',
        }}
      >
        {label}
      </span>
      <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9.5, color: 'var(--ink3)', wordBreak: 'break-all' }}>
        {value}
      </div>
    </div>
  )
}

function ListBlock({ label, empty, items }: { label: string; empty: string; items: string[] }) {
  return (
    <div style={{ display: 'grid', gap: 3 }}>
      <span
        style={{
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 8,
          letterSpacing: '1px',
          color: 'var(--bronze)',
          textTransform: 'none',
        }}
      >
        {label}
      </span>
      {items.length === 0 ? (
        <span style={{ fontSize: 10.5, color: 'var(--ink3)', fontFamily: 'var(--cc-font-mono)' }}>{empty}</span>
      ) : (
        <div style={{ display: 'grid', gap: 2, maxHeight: 120, overflow: 'auto' }}>
          {items.map((item) => (
            <span key={item} style={{ fontSize: 10.5, color: 'var(--ink2)', fontFamily: 'var(--cc-font-mono)', wordBreak: 'break-all' }}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function HashLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ fontSize: 9.5, color: 'var(--ink3)', fontFamily: 'var(--cc-font-mono)', wordBreak: 'break-all' }}>
      <span style={{ color: 'var(--bronze)' }}>{label} hash | </span>
      {value}
    </div>
  )
}
