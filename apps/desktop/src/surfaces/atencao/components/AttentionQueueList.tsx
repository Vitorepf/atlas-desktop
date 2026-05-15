import { useMemo, useState } from 'react'
import type { AttentionItem, AttentionKind, AttentionSeverity } from '../types'

interface AttentionQueueListProps {
  items: AttentionItem[]
  focusedKey: string | null
  onSelect: (item: AttentionItem) => void
}

const KIND_LABEL: Record<string, { short: string; long: string }> = {
  intake_needed: { short: 'def', long: 'Definição' },
  scope_decision: { short: 'esc', long: 'Escopo' },
  risk_approval: { short: 'risc', long: 'Risco' },
  provider_approval: { short: 'prov', long: 'Provider' },
  runtime_approval: { short: 'run', long: 'Runtime' },
  review_needed: { short: 'rev', long: 'Revisão' },
  repair_decision: { short: 'rep', long: 'Repair' },
  final_acceptance: { short: 'fim', long: 'Aceite final' },
  blocked_attention: { short: 'blk', long: 'Bloqueado' },
}

const SEVERITY_LABEL: Record<AttentionSeverity, string> = {
  high: 'crítica',
  medium: 'média',
  low: 'baixa',
}

type SeverityFilter = AttentionSeverity | 'all'
type KindFilter = AttentionKind | 'all'

export function AttentionQueueList({ items, focusedKey, onSelect }: AttentionQueueListProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [workspaceFilter, setWorkspaceFilter] = useState<string | 'all'>('all')

  const availableWorkspaces = useMemo(() => {
    const set = new Set<string>()
    items.forEach((it) => {
      if (it.workspace_slug) set.add(it.workspace_slug)
    })
    return Array.from(set).sort()
  }, [items])

  const availableKinds = useMemo(() => {
    const set = new Set<AttentionKind>()
    items.forEach((it) => set.add(it.kind))
    return Array.from(set)
  }, [items])

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (severityFilter !== 'all' && it.severity !== severityFilter) return false
      if (kindFilter !== 'all' && it.kind !== kindFilter) return false
      if (workspaceFilter !== 'all' && it.workspace_slug !== workspaceFilter) return false
      return true
    })
  }, [items, kindFilter, severityFilter, workspaceFilter])

  /**
   * Group by Obra (so the operator sees the cluster of pending decisions
   * per Obra, never a flat list that hides ownership). Preserves the queue
   * order returned by the backend (severity → priority).
   */
  const groups = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, { obra_title: string; workspace_slug: string; items: AttentionItem[] }>()
    filtered.forEach((it) => {
      if (!map.has(it.obra_id)) {
        order.push(it.obra_id)
        map.set(it.obra_id, {
          obra_title: it.obra_title,
          workspace_slug: it.workspace_slug,
          items: [],
        })
      }
      map.get(it.obra_id)!.items.push(it)
    })
    return order.map((id) => ({ obra_id: id, ...map.get(id)! }))
  }, [filtered])

  const hidden = items.length - filtered.length

  return (
    <section className="atencao-queue" aria-label="Próximas decisões">
      <header className="atencao-queue-header">
        <h3>Próximas decisões</h3>
        <span className="atencao-queue-count">
          {filtered.length}
          {hidden > 0 ? <span className="atencao-queue-count-hidden"> · {hidden} oculto{hidden === 1 ? '' : 's'}</span> : null}
        </span>
      </header>

      <div
        className="atencao-queue-filters"
        role="group"
        aria-label="Filtros compactos"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 4,
          padding: '6px 8px',
          borderBottom: '1px solid var(--cc-border-soft, rgba(255,255,255,0.08))',
        }}
      >
        <FilterRow label="Severidade">
          <FilterChip
            label="todas"
            active={severityFilter === 'all'}
            onClick={() => setSeverityFilter('all')}
          />
          {(['high', 'medium', 'low'] as AttentionSeverity[]).map((s) => (
            <FilterChip
              key={s}
              label={SEVERITY_LABEL[s]}
              tone={s === 'high' ? 'danger' : s === 'medium' ? 'warning' : 'info'}
              active={severityFilter === s}
              onClick={() => setSeverityFilter(s)}
            />
          ))}
        </FilterRow>
        {availableKinds.length > 1 ? (
          <FilterRow label="Tipo">
            <FilterChip
              label="todos"
              active={kindFilter === 'all'}
              onClick={() => setKindFilter('all')}
            />
            {availableKinds.map((k) => (
              <FilterChip
                key={k}
                label={KIND_LABEL[k]?.long ?? k}
                active={kindFilter === k}
                onClick={() => setKindFilter(k)}
              />
            ))}
          </FilterRow>
        ) : null}
        {availableWorkspaces.length > 1 ? (
          <FilterRow label="Projeto">
            <FilterChip
              label="todos"
              active={workspaceFilter === 'all'}
              onClick={() => setWorkspaceFilter('all')}
            />
            {availableWorkspaces.map((w) => (
              <FilterChip
                key={w}
                label={w}
                active={workspaceFilter === w}
                onClick={() => setWorkspaceFilter(w)}
              />
            ))}
          </FilterRow>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div
          role="status"
          style={{
            padding: '12px 14px',
            fontFamily: 'var(--cc-font-sans, sans-serif)',
            fontSize: 12,
            color: 'var(--cc-text-muted, rgba(255,255,255,0.6))',
          }}
        >
          Nenhum item bate com os filtros atuais.
        </div>
      ) : (
        <ul className="atencao-queue-list" role="list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {groups.map((group) => (
            <li key={group.obra_id} className="atencao-queue-group" style={{ borderTop: '1px solid var(--cc-border-soft, rgba(255,255,255,0.05))' }}>
              <header
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '6px 8px',
                  fontFamily: 'var(--cc-font-mono, monospace)',
                  fontSize: 10,
                  letterSpacing: 0.4,
                  color: 'var(--cc-text-faint, rgba(255,255,255,0.5))',
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {group.obra_title}
                </span>
                <span>
                  {group.workspace_slug} · {group.items.length} item{group.items.length === 1 ? '' : 's'}
                </span>
              </header>
              <ul role="list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {group.items.map((item, index) => {
                  const selected = item.item_key === focusedKey
                  const kindMeta = KIND_LABEL[item.kind]
                  return (
                    <li
                      key={item.item_key}
                      className={`atencao-queue-item severity-${item.severity} ${selected ? 'is-focused' : ''}`}
                    >
                      <button
                        type="button"
                        className="atencao-queue-item-button"
                        onClick={() => onSelect(item)}
                        aria-current={selected ? 'true' : undefined}
                      >
                        <span className="atencao-queue-index">{index + 1}</span>
                        <span
                          className={`atencao-queue-tag severity-${item.severity}`}
                          title={kindMeta?.long ?? item.kind}
                        >
                          {kindMeta?.short ?? item.kind.slice(0, 4)}
                        </span>
                        <span className="atencao-queue-body">
                          <span className="atencao-queue-title">{item.human_question}</span>
                          {item.why_now ? (
                            <span className="atencao-queue-question">{item.why_now}</span>
                          ) : null}
                        </span>
                        <span
                          className="atencao-queue-workspace"
                          aria-label={`severidade ${SEVERITY_LABEL[item.severity]}`}
                          title={SEVERITY_LABEL[item.severity]}
                        >
                          {item.severity}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--cc-font-mono, monospace)',
        fontSize: 10,
      }}
    >
      <span
        style={{
          minWidth: 64,
          color: 'var(--cc-text-faint, rgba(255,255,255,0.45))',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

function FilterChip({
  label,
  active,
  tone,
  onClick,
}: {
  label: string
  active: boolean
  tone?: 'danger' | 'warning' | 'info'
  onClick: () => void
}) {
  const toneColor =
    tone === 'danger'
      ? 'var(--cc-danger-fg, #d4a85a)'
      : tone === 'warning'
        ? 'var(--cc-warning-fg, #d4a85a)'
        : tone === 'info'
          ? 'var(--cc-info-fg, #8aa9c7)'
          : 'var(--cc-text-muted, rgba(255,255,255,0.7))'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '2px 8px',
        height: 20,
        borderRadius: 999,
        border: active
          ? `1px solid ${toneColor}`
          : '1px solid var(--cc-border-soft, rgba(255,255,255,0.12))',
        background: active ? 'var(--cc-accent-veil, rgba(212,168,90,0.12))' : 'transparent',
        color: active ? toneColor : 'var(--cc-text-muted, rgba(255,255,255,0.7))',
        cursor: 'pointer',
        fontFamily: 'var(--cc-font-mono, monospace)',
        fontSize: 10,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  )
}
