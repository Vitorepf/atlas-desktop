import { StatusDot } from './StatusDot'
import type { StatusKind } from './tokens'

/**
 * Live activity card · feedback vivo do que está acontecendo agora. Quando
 * a execução está running/queued, mostra o status em tempo real com dot
 * pulsante. Quando idle, mostra o último evento conhecido honestamente.
 */
export interface LiveActivityEvent {
  kind: StatusKind | string
  label: string
  detail?: string
  timestamp?: string | null
}

export function LiveActivityCard({
  state,
  primaryEvent,
  history,
}: {
  state: StatusKind | string
  primaryEvent: LiveActivityEvent
  history?: LiveActivityEvent[]
}) {
  return (
    <section
      style={{
        display: 'grid',
        gap: 10,
        padding: 14,
        background: 'var(--cc-surface)',
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 'var(--cc-radius-md)',
      }}
      aria-label="Atividade ao vivo"
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StatusDot status={state} pulse={state === 'running' || state === 'queued' || state === 'waiting_worker'} />
        <span
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 11,
            color: 'var(--cc-text-faint)',
            fontWeight: 500,
          }}
        >
          Agora
        </span>
        <span
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 13,
            color: 'var(--cc-text-strong)',
            fontWeight: 600,
          }}
        >
          {primaryEvent.label}
        </span>
      </header>
      {primaryEvent.detail ? (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 12.5,
            color: 'var(--cc-text-muted)',
            lineHeight: 'var(--cc-leading-relaxed)',
          }}
        >
          {primaryEvent.detail}
        </p>
      ) : null}
      {history && history.length > 0 ? (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
          {history.map((ev, idx) => (
            <li
              key={`${ev.kind}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 11.5,
                color: 'var(--cc-text-muted)',
              }}
            >
              <StatusDot status={ev.kind} size={6} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ev.label}
              </span>
              {ev.timestamp ? (
                <span
                  style={{
                    fontFamily: 'var(--cc-font-mono)',
                    fontSize: 10,
                    color: 'var(--cc-text-faint)',
                    letterSpacing: 'var(--cc-tracking-data)',
                  }}
                >
                  {ev.timestamp}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

