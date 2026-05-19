/**
 * Premium progress milestones · pontos canônicos da Obra visualizados em
 * trilha horizontal com nodes (passed/current/upcoming) + label humano.
 */
export interface MilestoneNode {
  key: string
  label: string
  status: 'passed' | 'current' | 'upcoming' | 'blocked'
  hint?: string
}

export function ProgressMilestones({
  milestones,
  ariaLabel = 'Marcos da Obra',
}: {
  milestones: MilestoneNode[]
  ariaLabel?: string
}) {
  if (milestones.length === 0) return null
  return (
    <section aria-label={ariaLabel} style={{ display: 'grid', gap: 8 }}>
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))`,
          gap: 4,
          position: 'relative',
        }}
      >
        {milestones.map((m, idx) => (
          <li key={m.key} style={{ display: 'grid', gap: 6, justifyItems: 'start', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
              <MilestoneDot status={m.status} />
              {idx < milestones.length - 1 ? (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background:
                      m.status === 'passed'
                        ? 'var(--cc-success)'
                        : m.status === 'blocked'
                          ? 'var(--cc-danger-border)'
                          : 'var(--cc-border-soft)',
                  }}
                  aria-hidden
                />
              ) : null}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--cc-font-sans)',
                  fontSize: 12,
                  fontWeight: m.status === 'current' ? 600 : 500,
                  color:
                    m.status === 'passed'
                      ? 'var(--cc-success-fg)'
                      : m.status === 'current'
                        ? 'var(--cc-text-strong)'
                        : m.status === 'blocked'
                          ? 'var(--cc-danger-fg)'
                          : 'var(--cc-text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={m.label}
              >
                {m.label}
              </div>
              {m.hint ? (
                <div
                  style={{
                    fontFamily: 'var(--cc-font-sans)',
                    fontSize: 11,
                    color: 'var(--cc-text-faint)',
                    lineHeight: 'var(--cc-leading-snug)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.hint}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function MilestoneDot({ status }: { status: MilestoneNode['status'] }) {
  const bg =
    status === 'passed'
      ? 'var(--cc-success)'
      : status === 'current'
        ? 'var(--cc-accent)'
        : status === 'blocked'
          ? 'var(--cc-danger)'
          : 'transparent'
  const border =
    status === 'upcoming' ? 'var(--cc-border-strong)' : status === 'blocked' ? 'var(--cc-danger)' : 'transparent'
  const size = status === 'current' ? 12 : 10
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: bg,
        border: status === 'upcoming' ? `1.5px solid ${border}` : 'none',
        boxShadow:
          status === 'current'
            ? '0 0 0 4px var(--cc-accent-veil)'
            : status === 'passed'
              ? '0 0 0 3px var(--cc-success-veil)'
              : 'none',
        flexShrink: 0,
      }}
    />
  )
}
