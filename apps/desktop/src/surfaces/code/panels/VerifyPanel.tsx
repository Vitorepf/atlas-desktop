import { PanelTitle } from '@atlas/ui'
import type { QualityGate } from '@atlas/domain'
import { EmptyText } from './RightRailPrimitives'
import type { RightRailContext } from './rightRailTypes'

export function VerifyPanel({ gates, busy, onRunGate }: RightRailContext) {
  const passed = gates.filter((g) => g.state === 'passed').length

  return (
    <section className="ops-panel">
      <div className="ops-section">
        <PanelTitle
          label="Quality Gates"
          meta={gates.length === 0 ? 'sem gates configurados' : `${passed}/${gates.length} passed`}
        />
        {gates.length === 0 ? (
          <EmptyText>nenhum gate retornado pelo Kernel.</EmptyText>
        ) : (
          <div style={{ display: 'grid', gap: 4 }}>
            {gates.map((g) => (
              <GateRow key={g.id} gate={g} busy={busy} onRun={() => void onRunGate(g.id)} />
            ))}
          </div>
        )}
      </div>
    </section>
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
