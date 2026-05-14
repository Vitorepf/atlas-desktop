import type { CSSProperties, ReactNode } from 'react'

export function EmptyText({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '12px 0',
        fontFamily: 'var(--serif)',
        fontStyle: 'italic',
        fontSize: 12.5,
        color: 'var(--ink3)',
      }}
    >
      {children}
    </div>
  )
}

export function Row({
  k,
  v,
  mono = false,
  ok = false,
}: {
  k: string
  v: string
  mono?: boolean
  ok?: boolean
}) {
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

// eslint-disable-next-line react-refresh/only-export-components -- style token colocado com seus primitives para coesao visual; reuse direto sem barrel
export const btnPrimary: CSSProperties = {
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
