import { PanelTitle } from '@atlas/ui'
import type { ProgrammingGateRunSnapshot, QualityGate } from '@atlas/domain'
import { EmptyText } from './RightRailPrimitives'
import { ForgeWorkspaceBanner } from './ForgeWorkspaceBanner'
import type { RightRailContext } from './rightRailTypes'

export function VerifyPanel({ gates, busy, receipt, programmingGovernance, onRunGate }: RightRailContext) {
  const gateRuns = programmingGovernance?.gateRuns ?? []
  const hasGovernedRuns = gateRuns.length > 0

  // SCOR-1 preferred path: render the real Programming Governance gate runs.
  if (hasGovernedRuns) {
    const passed = gateRuns.filter((g) => g.status === 'passed').length
    return (
      <section className="ops-panel">
        <ForgeWorkspaceBanner receipt={receipt} governance={programmingGovernance} />
        <div className="ops-section">
          <PanelTitle
            label="Quality Gates"
            meta={`${passed}/${gateRuns.length} passed · governance`}
          />
          <div style={{ display: 'grid', gap: 4 }}>
            {gateRuns.map((run, idx) => (
              <GovernanceGateRow key={`${run.gateName}-${idx}`} run={run} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Fallback: legacy /tools/gate gates. When governance is bound but has no
  // runs yet, render the honest empty state instead of the legacy list.
  const passed = gates.filter((g) => g.state === 'passed').length
  return (
    <section className="ops-panel">
      <ForgeWorkspaceBanner receipt={receipt} governance={programmingGovernance} />
      <div className="ops-section">
        <PanelTitle
          label="Quality Gates"
          meta={
            programmingGovernance?.workItem
              ? 'sem gate runs reais'
              : gates.length === 0
                ? 'sem gates configurados'
                : `${passed}/${gates.length} passed`
          }
        />
        {programmingGovernance?.workItem ? (
          <EmptyText>sem gate runs reais</EmptyText>
        ) : gates.length === 0 ? (
          <EmptyText>nenhum gate retornado pelo Kernel.</EmptyText>
        ) : (
          <div style={{ display: 'grid', gap: 4 }}>
            {gates.map((g) => (
              <LegacyGateRow key={g.id} gate={g} busy={busy} onRun={() => void onRunGate(g.id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function GovernanceGateRow({ run }: { run: ProgrammingGateRunSnapshot }) {
  const tone = governanceTone(run.status, run.blocking)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '16px 1fr auto',
        gap: 8,
        padding: '6px 8px',
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: 2,
        alignItems: 'baseline',
      }}
    >
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: tone.color }}>{tone.glyph}</span>
      <div style={{ display: 'grid', gap: 2 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink)' }}>
          {run.gateName}
          {run.blocking ? (
            <span
              style={{
                marginLeft: 6,
                fontFamily: 'var(--mono)',
                fontSize: 8,
                letterSpacing: '1.1px',
                color: 'var(--rec-red)',
                textTransform: 'uppercase',
              }}
            >
              blocking
            </span>
          ) : null}
        </span>
        {run.reason ? (
          <span style={{ fontSize: 10.5, color: 'var(--ink3)', lineHeight: 1.35 }}>{run.reason}</span>
        ) : null}
        {run.waiverReason ? (
          <span
            style={{
              fontSize: 10,
              color: 'var(--bronze)',
              fontFamily: 'var(--mono)',
            }}
          >
            waiver · {run.waiverReason}
          </span>
        ) : null}
      </div>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '1.1px',
          color: tone.color,
          textTransform: 'uppercase',
        }}
      >
        {run.status}
      </span>
    </div>
  )
}

function governanceTone(status: string, blocking: boolean) {
  if (status === 'passed') {
    return {
      bg: 'var(--moss-veil)',
      border: 'var(--moss-soft)',
      color: 'var(--moss)',
      glyph: '✓',
    }
  }
  if (status === 'failed') {
    return blocking
      ? {
          bg: 'var(--rec-red-veil, rgba(138,48,37,0.12))',
          border: 'var(--rec-red, #8a3025)',
          color: 'var(--rec-red)',
          glyph: '✗',
        }
      : {
          bg: 'var(--rec-red-veil)',
          border: 'var(--rec-red-soft)',
          color: 'var(--rec-red)',
          glyph: '✗',
        }
  }
  if (status === 'waived') {
    return {
      bg: 'var(--bronze-veil)',
      border: 'var(--bronze-soft)',
      color: 'var(--bronze)',
      glyph: '◇',
    }
  }
  if (status === 'skipped') {
    return {
      bg: 'var(--cream)',
      border: 'var(--hair)',
      color: 'var(--ink3)',
      glyph: '⊘',
    }
  }
  return {
    bg: 'var(--cream)',
    border: 'var(--hair)',
    color: 'var(--ink3)',
    glyph: '○',
  }
}

function LegacyGateRow({
  gate,
  busy,
  onRun,
}: {
  gate: QualityGate
  busy: boolean
  onRun: () => void
}) {
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
