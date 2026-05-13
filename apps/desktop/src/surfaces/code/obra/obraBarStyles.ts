import type { CSSProperties } from 'react'

export const inlineInputStyle: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 100,
  padding: '5px 9px',
  border: '1px solid var(--hair)',
  borderRadius: 2,
  background: 'var(--cream)',
  fontFamily: 'var(--serif)',
  fontStyle: 'italic',
  fontSize: 13,
  color: 'var(--ink)',
  outline: 'none',
}

export const btnGhost: CSSProperties = {
  padding: '4px 9px',
  fontFamily: 'var(--mono)',
  fontSize: 9.5,
  letterSpacing: '1.3px',
  textTransform: 'uppercase',
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
