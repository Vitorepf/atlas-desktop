import type { CSSProperties } from 'react'
import { useActiveAgentCount } from '../surfaces/active-loops'

// PERSISTENT FLEET ALARM — a fixed, always-on-top badge shown on EVERY surface whenever any autonomous agent
// is running. The operator's hard requirement: nothing spends a provider account silently. Clicking it opens
// the Frota surface (loops ativos + histórico + DESLIGAR). Renders nothing when the machine is idle.
//
// Polish (03/07): capped width so it stays in the bottom-right gutter and never overlaps the composer's
// primary "enviar" action (it used to straddle the send button); crisp CSS status dot instead of the
// inconsistently-rendered 🔴 emoji; refined border/shadow; the spending detail truncates with a full-text
// tooltip so the count + DESLIGAR are always legible.
export function ActiveLoopsBadge({ onOpen }: { onOpen: () => void }) {
  const { count, accounts } = useActiveAgentCount()
  if (count <= 0) return null

  const accountLabel = accounts.join(' · ') || 'provider'
  const full = `${count} ${count === 1 ? 'agente ativo' : 'agentes ativos'} gastando ${accountLabel} — clique para DESLIGAR`
  return (
    <button type="button" style={styles.badge} onClick={onOpen} title={full} aria-label={full}>
      <span style={styles.dot} aria-hidden />
      <span style={styles.label}>
        <strong style={styles.count}>{count}</strong> {count === 1 ? 'ativo' : 'ativos'}
        <span style={styles.spend}> · {accountLabel}</span>
      </span>
      <span style={styles.cta}>DESLIGAR&nbsp;›</span>
    </button>
  )
}

const styles: Record<string, CSSProperties> = {
  badge: {
    position: 'fixed',
    bottom: 16,
    // BOTTOM-LEFT, não right: o composer é docado no rodapé e sua ação primária
    // (enviar) fica no canto inferior DIREITO. Com o painel de contexto recolhido
    // o composer se estende pra direita e um alarme bottom-right volta a encostar
    // no enviar (medido no app real 03/07). No canto esquerdo o alarme fica sobre
    // a trilha de navegação (scrollável, sem ação primária) — nunca bloqueia o
    // send em nenhum estado de painel. Padrão consagrado p/ status persistente.
    left: 16,
    zIndex: 9999,
    maxWidth: 'min(340px, 42vw)',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '8px 13px',
    borderRadius: 999,
    border: '1px solid rgba(255, 255, 255, 0.16)',
    cursor: 'pointer',
    background: 'var(--cc-danger, #8a3025)',
    color: '#fff',
    fontWeight: 600,
    fontSize: 'var(--cc-text-body, 13px)',
    fontFamily: 'var(--cc-font-sans, sans-serif)',
    lineHeight: 1.2,
    boxShadow: '0 8px 26px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
    WebkitBackdropFilter: 'saturate(1.1)',
  },
  dot: {
    flexShrink: 0,
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#ff6a5a',
    boxShadow: '0 0 0 3px rgba(255, 106, 90, 0.28), 0 0 7px rgba(255, 106, 90, 0.9)',
  },
  // The spending detail truncates; count + DESLIGAR stay pinned and legible.
  label: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  count: { fontWeight: 700 },
  spend: { opacity: 0.9 },
  cta: { flexShrink: 0, fontWeight: 700, letterSpacing: '0.01em' },
}
