import type { CSSProperties } from 'react'
import { humanDuration, type FleetAgent } from '../../lib/agentsApi'
import { useActiveLoops } from './useActiveLoops'

// FROTA — every autonomous Atlas agent the operator can see + turn off, on the desktop. The hard rule made
// visible: nothing spends a provider account silently, and one click kills any of it. No turn-ON here (that
// stays a deliberate CLI/operator act) — this surface can only ever REDUCE spend.
export function ActiveLoopsSurface() {
  const { snapshot, history, loading, error, turnOff, turnOffAll } = useActiveLoops()

  const agents = snapshot?.agents ?? []
  const active = agents.filter((a) => a.alive)
  const idle = agents.filter((a) => !a.alive)
  const accounts = (snapshot?.spending_accounts ?? []).join(' · ')

  const confirmOff = (a: FleetAgent) => {
    if (window.confirm(`Desligar ${a.label}? Gasta ${a.account}.`)) void turnOff(a.key)
  }
  const confirmOffAll = () => {
    if (window.confirm('Desligar TODA a frota? Trava os master switches; nada roda nem volta sozinho.')) void turnOffAll()
  }

  return (
    <main className="atlas-active-loops-surface" style={styles.surface} role="main">
      <header style={styles.header}>
        <h1 style={styles.title}>Frota</h1>
        <p style={styles.subtitle}>Todo agente autônomo que gasta suas contas — e como desligar.</p>
      </header>

      <section style={{ ...styles.summary, borderColor: active.length > 0 ? 'var(--cc-danger-border)' : 'var(--cc-border)' }}>
        {active.length > 0 ? (
          <div style={styles.alarm}>
            🔴 {active.length} {active.length === 1 ? 'agente ativo' : 'agentes ativos'} gastando {accounts || 'provider'}
          </div>
        ) : (
          <div style={styles.calm}>✓ Nada rodando. Nenhuma conta sendo gasta.</div>
        )}
        <div style={styles.meta}>Fleet master: {snapshot?.fleet_master ?? '—'}{loading ? ' · carregando…' : ''}</div>
        {(active.length > 0 || snapshot?.fleet_master === 'on') && (
          <button type="button" style={styles.panicButton} onClick={confirmOffAll}>
            DESLIGAR TUDO
          </button>
        )}
      </section>

      {error && (
        <p style={styles.error}>
          Não consegui ler a frota do servidor ({error.message}). {/* http mode requires VITE_ATLAS_SERVER_URL */}
        </p>
      )}

      {active.length > 0 && (
        <Section title="Ativos agora">
          {active.map((a) => (
            <AgentRow key={a.key} a={a} onOff={() => confirmOff(a)} />
          ))}
        </Section>
      )}

      <Section title="Frota">
        {idle.map((a) => (
          <AgentRow key={a.key} a={a} onOff={a.desired ? () => confirmOff(a) : undefined} />
        ))}
      </Section>

      <Section title="Histórico">
        {history.slice(0, 50).map((e, i) => (
          <div key={`${e.agent_key}-${e.at}-${i}`} style={styles.historyRow}>
            <span style={styles.historyAt}>{formatAt(e.at)}</span>
            <span style={styles.historyText}>
              {e.agent_key} · {e.event}
              {e.reason ? ` (${e.reason})` : ''}
            </span>
          </div>
        ))}
        {history.length === 0 && <div style={styles.meta}>Sem eventos ainda.</div>}
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  )
}

function AgentRow({ a, onOff }: { a: FleetAgent; onOff?: () => void }) {
  const dot =
    a.status === 'running' ? 'var(--cc-danger)' : a.status === 'desired_dead' ? 'var(--cc-warning)' : 'var(--cc-neutral)'
  return (
    <div style={styles.row}>
      <span style={{ ...styles.dot, background: dot }} />
      <div style={styles.rowMain}>
        <div style={styles.rowLabel}>{a.label}</div>
        <div style={styles.rowAccount}>{a.account}</div>
        <div style={styles.rowStatus}>
          {a.status === 'running'
            ? `rodando · ${humanDuration(a.uptime_seconds)}${a.ttl_remaining_seconds !== null ? ` · TTL ${humanDuration(a.ttl_remaining_seconds)}` : ''}`
            : a.status === 'desired_dead'
              ? 'ligado (esperando subir)'
              : 'desligado'}
        </div>
      </div>
      {onOff && (
        <button type="button" style={styles.offButton} onClick={onOff}>
          DESLIGAR
        </button>
      )}
    </div>
  )
}

function formatAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

const styles: Record<string, CSSProperties> = {
  surface: {
    height: '100%',
    overflowY: 'auto',
    padding: 'var(--cc-space-5, 20px)',
    background: 'var(--cc-bg)',
    color: 'var(--cc-text)',
    fontFamily: 'var(--cc-font-sans)',
  },
  header: { marginBottom: 18 },
  title: { fontSize: 'var(--cc-text-display, 22px)', fontWeight: 600, margin: 0 },
  subtitle: { fontSize: 'var(--cc-text-body, 13.5px)', color: 'var(--cc-text-muted)', margin: '4px 0 0' },
  summary: {
    padding: 14,
    borderRadius: 12,
    border: '1px solid var(--cc-border)',
    background: 'var(--cc-surface)',
    marginBottom: 20,
  },
  alarm: { color: 'var(--cc-danger)', fontWeight: 600, fontSize: 'var(--cc-text-section, 14px)' },
  calm: { color: 'var(--cc-success)', fontWeight: 600, fontSize: 'var(--cc-text-section, 14px)' },
  meta: { color: 'var(--cc-text-muted)', fontSize: 'var(--cc-text-caption, 11.5px)', marginTop: 4 },
  panicButton: {
    marginTop: 12,
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    background: 'var(--cc-danger)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 'var(--cc-text-body, 13.5px)',
  },
  error: { color: 'var(--cc-danger-fg)', fontSize: 'var(--cc-text-body, 13.5px)', marginBottom: 14 },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 'var(--cc-text-label, 10px)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'var(--cc-text-muted)',
    margin: '0 0 10px',
  },
  sectionBody: { display: 'flex', flexDirection: 'column', gap: 10 },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    border: '1px solid var(--cc-border)',
    background: 'var(--cc-surface)',
  },
  dot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  rowMain: { flex: 1, minWidth: 0 },
  rowLabel: { fontWeight: 600, fontSize: 'var(--cc-text-body, 13.5px)' },
  rowAccount: { color: 'var(--cc-text-muted)', fontSize: 'var(--cc-text-caption, 11.5px)' },
  rowStatus: { color: 'var(--cc-text-muted)', fontSize: 'var(--cc-text-caption, 11.5px)', marginTop: 2 },
  offButton: {
    padding: '7px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    background: 'var(--cc-danger-veil)',
    border: '1px solid var(--cc-danger-border)',
    color: 'var(--cc-danger)',
    fontWeight: 600,
    fontSize: 'var(--cc-text-caption, 11.5px)',
  },
  historyRow: { display: 'flex', gap: 10, padding: '4px 0' },
  historyAt: { width: 150, color: 'var(--cc-text-muted)', fontSize: 'var(--cc-text-caption, 11.5px)', flexShrink: 0 },
  historyText: { color: 'var(--cc-text)', fontSize: 'var(--cc-text-caption, 11.5px)' },
}
