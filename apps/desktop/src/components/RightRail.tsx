import { useState } from 'react'
import { PanelTitle } from '@atlas/ui'
import type { CoreStatus, DecisionReceipt, QualityGate } from '@atlas/domain'

interface RightRailProps {
  receipt: DecisionReceipt | null
  gates: QualityGate[]
  core: CoreStatus
  busy: boolean
  onSignReceipt: () => Promise<void>
  onRunGate: (gateId: string) => Promise<void>
}

type OpsTab = 'plan' | 'verify'

export function RightRail({ receipt, gates, core, busy, onSignReceipt, onRunGate }: RightRailProps) {
  const [tab, setTab] = useState<OpsTab>('plan')

  const passed = gates.filter((g) => g.state === 'passed').length

  return (
    <aside className="right-rail">
      <nav className="ops-tabs">
        <button
          type="button"
          className={`ops-tab${tab === 'plan' ? ' on' : ''}`}
          onClick={() => setTab('plan')}
        >
          Plan
        </button>
        <button
          type="button"
          className={`ops-tab${tab === 'verify' ? ' on' : ''}`}
          onClick={() => setTab('verify')}
        >
          Verify
        </button>
      </nav>

      {tab === 'plan' && (
        <section className="ops-panel">
          <div className="ops-section">
            <PanelTitle
              label="Decision Receipt"
              meta={receipt?.signature ? 'assinado' : receipt?.id ? 'aguardando assinatura' : 'sem receipt ainda'}
            />
            {receipt?.id ? (
              <>
                <ReceiptCard receipt={receipt} />
                {!receipt.signature && (
                  <button
                    type="button"
                    onClick={() => void onSignReceipt()}
                    disabled={busy}
                    style={{ ...btnPrimary, marginTop: 8, width: '100%' }}
                  >
                    {busy ? 'assinando…' : '✦ assinar receipt'}
                  </button>
                )}
              </>
            ) : (
              <EmptyReceipt />
            )}
          </div>

          <div className="ops-section">
            <PanelTitle label="Core local" meta={core.mode} />
            <dl style={{ margin: 0 }}>
              <Row k="pty" v={core.pty} />
              <Row k="signing" v={core.signing} />
              <Row k="db" v={core.dbPath || '—'} />
              <Row k="workspace" v={core.workspacePath || '—'} />
            </dl>
          </div>
        </section>
      )}

      {tab === 'verify' && (
        <section className="ops-panel">
          <div className="ops-section">
            <PanelTitle
              label="Quality Gates"
              meta={gates.length === 0 ? 'sem gates configurados' : `${passed}/${gates.length} passed`}
            />
            {gates.length === 0 ? (
              <div
                style={{
                  padding: '12px 0',
                  fontFamily: 'var(--serif)',
                  fontStyle: 'italic',
                  fontSize: 12.5,
                  color: 'var(--ink3)',
                }}
              >
                nenhum gate retornado pelo Kernel.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 4 }}>
                {gates.map((g) => (
                  <GateRow key={g.id} gate={g} busy={busy} onRun={() => void onRunGate(g.id)} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </aside>
  )
}

function EmptyReceipt() {
  return (
    <div
      style={{
        padding: '14px 12px',
        background: 'var(--cream)',
        border: '1px dashed var(--bronze-soft)',
        borderRadius: 2,
        fontFamily: 'var(--serif)',
        fontStyle: 'italic',
        fontSize: 13,
        color: 'var(--ink3)',
        textAlign: 'center',
      }}
    >
      aguardando primeira execução
      <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 6 }}>
        receipt aparece após a primeira Decision do Kernel.
      </div>
    </div>
  )
}

function ReceiptCard({ receipt }: { receipt: DecisionReceipt }) {
  return (
    <div
      style={{
        padding: '11px 12px',
        background: 'var(--cream)',
        border: '1px solid var(--bronze-soft)',
        borderRadius: 2,
      }}
    >
      <Row k="id" v={receipt.id} mono />
      {receipt.obraId && <Row k="obra" v={receipt.obraId} />}
      {receipt.primary && <Row k="primary" v={receipt.primary} />}
      <Row
        k="confidence"
        v={`${(receipt.confidence ?? 'med').toUpperCase()} · ${(receipt.confidenceScore ?? 0).toFixed(2)}`}
        ok
      />
      <Row
        k="budget"
        v={`est $${(receipt.budgetEstUsd ?? 0).toFixed(3)} · used $${(receipt.budgetUsedUsd ?? 0).toFixed(2)}`}
      />
      <Row k="fallback" v={(receipt.fallbackChain ?? []).join(' → ') || '—'} />
      <Row k="signature" v={receipt.signature ? 'assinado ✓' : '— pendente'} ok={!!receipt.signature} />
    </div>
  )
}

function Row({ k, v, mono = false, ok = false }: { k: string; v: string; mono?: boolean; ok?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 0',
        borderBottom: '1px solid var(--hair-soft)',
        alignItems: 'baseline',
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
        {k}
      </span>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: mono ? 11 : 10,
          color: ok ? 'var(--moss)' : 'var(--ink)',
          textAlign: 'right',
          fontWeight: mono ? 500 : 400,
          maxWidth: '60%',
          wordBreak: 'break-all',
        }}
      >
        {v}
      </span>
    </div>
  )
}

function GateRow({ gate, busy, onRun }: { gate: QualityGate; busy: boolean; onRun: () => void }) {
  const tone =
    gate.state === 'passed'
      ? { bg: 'var(--moss-veil)', border: 'var(--moss-soft)', color: 'var(--moss)', glyph: '✓' }
      : gate.state === 'failed'
      ? { bg: 'var(--rec-red-veil)', border: 'var(--rec-red-soft)', color: 'var(--rec-red)', glyph: '✗' }
      : gate.state === 'blocked'
      ? { bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)', color: 'var(--bronze)', glyph: '△' }
      : { bg: 'var(--cream)', border: 'var(--hair)', color: 'var(--ink3)', glyph: '○' }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '16px 1fr auto auto',
        gap: 8,
        padding: '5px 7px',
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: 2,
        alignItems: 'baseline',
      }}
    >
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: tone.color }}>{tone.glyph}</span>
      <span style={{ fontSize: 11.5, color: 'var(--ink)' }}>{gate.name}</span>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '1.1px',
          color: tone.color,
          textTransform: 'uppercase',
        }}
      >
        {gate.state}
      </span>
      <button
        type="button"
        onClick={onRun}
        disabled={busy}
        style={{
          padding: '1px 6px',
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: 'var(--bronze)',
          border: '1px solid var(--bronze-soft)',
          borderRadius: 2,
          background: 'transparent',
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        rodar
      </button>
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 12px',
  fontFamily: 'var(--mono)',
  fontSize: 9.5,
  letterSpacing: '1.3px',
  textTransform: 'uppercase',
  color: 'var(--cream)',
  border: '1px solid var(--ink)',
  borderRadius: 2,
  background: 'var(--ink)',
  cursor: 'pointer',
}
