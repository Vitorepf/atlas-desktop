import type { CSSProperties, ReactNode } from 'react'

/**
 * Premium right-rail primitives (Workbench Visual Comfort v1).
 *
 * Substituem completamente os primitives editoriais antigos (serif italic
 * uppercase tracking exagerado) por tipografia sans operacional confortável
 * para 12h. Toda cor sai de tokens `--cc-*` (warm graphite escuro dentro do
 * shell Atlas Code).
 */

export function EmptyText({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '10px 0',
        fontFamily: 'var(--cc-font-sans)',
        fontStyle: 'normal',
        fontSize: 13,
        color: 'var(--cc-text-muted)',
        lineHeight: 1.6,
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
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--cc-border-soft)',
        alignItems: 'center',
        minHeight: 32,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 13,
          letterSpacing: 0,
          color: 'var(--cc-text-muted)',
          textTransform: 'none',
          fontWeight: 500,
          flex: '0 0 auto',
        }}
      >
        {k}
      </span>
      <span
        style={{
          fontFamily: mono ? 'var(--cc-font-mono)' : 'var(--cc-font-sans)',
          fontSize: mono ? 12 : 13,
          color: ok ? 'var(--cc-success-fg)' : 'var(--cc-text-strong)',
          letterSpacing: mono ? 'var(--cc-tracking-data)' : 0,
          textAlign: 'right',
          fontWeight: 600,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '60%',
        }}
        title={v}
      >
        {v}
      </span>
    </div>
  )
}

// Botão primário premium · accent gold burnished sobre dark warm, sans 13px
// tracking 0. Calmo, legível, sem visual de "campaign poster".
// eslint-disable-next-line react-refresh/only-export-components -- style token shared with panels
export const btnPrimary: CSSProperties = {
  padding: '10px 14px',
  fontFamily: 'var(--cc-font-sans)',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0,
  textTransform: 'none',
  color: '#15212a',
  border: '1px solid var(--cc-accent-strong)',
  borderRadius: 'var(--cc-radius-sm)',
  background: 'var(--cc-accent)',
  cursor: 'pointer',
  lineHeight: 1.2,
}

// Section heading premium · sans semibold 11.5 sem uppercase brutal.
// eslint-disable-next-line react-refresh/only-export-components
export const sectionHeading: CSSProperties = {
  marginTop: 16,
  marginBottom: 8,
  fontFamily: 'var(--cc-font-sans)',
  fontSize: 11.5,
  fontWeight: 600,
  letterSpacing: 0,
  textTransform: 'none',
  color: 'var(--cc-text-muted)',
  lineHeight: 1.3,
}
