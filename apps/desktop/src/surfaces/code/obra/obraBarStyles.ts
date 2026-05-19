import type { CSSProperties } from 'react'

export const inlineInputStyle: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 100,
  padding: '5px 9px',
  border: '1px solid var(--hair)',
  borderRadius: 2,
  background: 'var(--cream)',
  fontFamily: 'var(--cc-font-sans)',
  fontStyle: 'normal',
  fontSize: 13,
  color: 'var(--ink)',
  outline: 'none',
}

export const btnGhost: CSSProperties = {
  padding: '4px 9px',
  fontFamily: 'var(--cc-font-mono)',
  fontSize: 9.5,
  letterSpacing: 0,
  textTransform: 'none',
  color: 'var(--bronze)',
  border: '1px solid var(--bronze-soft)',
  borderRadius: 2,
  background: 'transparent',
  cursor: 'pointer',
}

export const btnPrimary: CSSProperties = {
  ...btnGhost,
  background: 'var(--ink)',
  color: 'var(--cream)',
  borderColor: 'var(--ink)',
}
