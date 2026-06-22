import type { CSSProperties } from 'react'
import { useActiveAgentCount } from '../surfaces/active-loops'

// PERSISTENT FLEET ALARM — a fixed, always-on-top badge shown on EVERY surface whenever any autonomous agent
// is running. The operator's hard requirement: nothing spends a provider account silently. Clicking it opens
// the Frota surface (loops ativos + histórico + DESLIGAR). Renders nothing when the machine is idle.
export function ActiveLoopsBadge({ onOpen }: { onOpen: () => void }) {
  const { count, accounts } = useActiveAgentCount()
  if (count <= 0) return null

  const accountLabel = accounts.join(' · ') || 'provider'
  return (
    <button type="button" style={styles.badge} onClick={onOpen} title="Abrir a Frota (loops ativos + DESLIGAR)">
      <span aria-hidden>🔴</span>
      <span>
        {count} {count === 1 ? 'agente ativo' : 'agentes ativos'} gastando {accountLabel}
      </span>
      <span style={styles.cta}>DESLIGAR ›</span>
    </button>
  )
}

const styles: Record<string, CSSProperties> = {
  badge: {
    position: 'fixed',
    bottom: 16,
    right: 16,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 14px',
    borderRadius: 11,
    border: 'none',
    cursor: 'pointer',
    background: 'var(--cc-danger, #8a3025)',
    color: '#fff',
    fontWeight: 600,
    fontSize: 'var(--cc-text-body, 13px)',
    fontFamily: 'var(--cc-font-sans, sans-serif)',
    boxShadow: '0 6px 22px rgba(0,0,0,0.28)',
  },
  cta: { fontWeight: 700, opacity: 0.92 },
}
