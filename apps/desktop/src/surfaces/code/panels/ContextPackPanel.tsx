import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { EmptyText } from './RightRailPrimitives'

interface ContextPackPanelProps {
  liveExecution: WorkStateSnapshot['forgeLiveExecution']
}

export function ContextPackPanel({ liveExecution }: ContextPackPanelProps) {
  const contextPack = liveExecution?.contextPack

  if (!contextPack) {
    return (
      <div className="ops-section">
        <PanelTitle label="Context Pack" meta="sem artefato" />
        <EmptyText>aguardando context pack real</EmptyText>
      </div>
    )
  }

  const refs = contextPack.rankedRefs ?? []
  const meta = `${contextPack.contextCompleteness ?? 'unknown'} · ${contextPack.presentRefCount ?? 0}/${contextPack.rankedRefCount ?? refs.length}`

  return (
    <div className="ops-section">
      <PanelTitle label="Context Pack" meta={meta} />
      <div
        style={{
          display: 'grid',
          gap: 5,
          padding: '8px 10px',
          background: 'var(--cream)',
          border: '1px solid var(--bronze-soft)',
          borderRadius: 2,
        }}
      >
        {contextPack.contextPackHash ? (
          <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9.5, color: 'var(--ink3)', wordBreak: 'break-all' }}>
            hash · {contextPack.contextPackHash}
          </div>
        ) : null}

        {refs.length === 0 ? (
          <EmptyText>context pack sem refs rankeadas</EmptyText>
        ) : (
          <div style={{ display: 'grid', gap: 4, maxHeight: 220, overflow: 'auto' }}>
            {refs.map((ref) => (
              <div
                key={`${ref.rank}-${ref.path}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '22px 1fr auto',
                  gap: 6,
                  padding: '5px 7px',
                  background: ref.evidenceMarker === 'present' ? 'var(--paper)' : 'var(--rec-red-veil, rgba(138,48,37,0.08))',
                  border: `1px solid ${ref.evidenceMarker === 'present' ? 'var(--hair-soft)' : 'var(--rec-red, #8a3025)'}`,
                  borderRadius: 2,
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9, color: 'var(--bronze)' }}>
                  {ref.rank}
                </span>
                <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 10.5, color: 'var(--ink)', wordBreak: 'break-all' }}>
                  {ref.path}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--cc-font-mono)',
                    fontSize: 8,
                    letterSpacing: '1px',
                    color: ref.evidenceMarker === 'present' ? 'var(--moss)' : 'var(--rec-red, #8a3025)',
                    textTransform: 'none',
                  }}
                >
                  {ref.kind} · {ref.evidenceMarker}
                </span>
                {ref.reason ? (
                  <span style={{ gridColumn: '2 / -1', fontSize: 10, color: 'var(--ink3)', lineHeight: 1.35 }}>
                    {ref.reason}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
