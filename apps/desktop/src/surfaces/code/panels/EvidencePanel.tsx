import { PanelTitle } from '@atlas/ui'
import { EmptyText } from './RightRailPrimitives'
import type { RightRailContext } from './rightRailTypes'

export function EvidencePanel({ evidence }: RightRailContext) {
  return (
    <section className="ops-panel">
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
