import type { AttentionHealth } from '../types'

interface AttentionHealthRibbonProps {
  health: AttentionHealth
  generatedAt: string
  workspaceFilter: string | null
  loading: boolean
  onRefresh: () => void
}

export function AttentionHealthRibbon({
  health,
  generatedAt,
  workspaceFilter,
  loading,
  onRefresh,
}: AttentionHealthRibbonProps) {
  return (
    <div className="atencao-health" role="status">
      <Metric label="fila" value={health.total_items} />
      <Metric label="aguardando humano" value={health.waiting_human_count} />
      <Metric label="Obras bloqueadas" value={health.blocked_obras} tone={health.blocked_obras > 0 ? 'warn' : 'ok'} />
      <Metric
        label="sem evidência"
        value={health.missing_evidence_count}
        tone={health.missing_evidence_count > 0 ? 'warn' : 'ok'}
      />
      <Metric label="estado desconhecido" value={health.unknown_state_count} />
      {workspaceFilter ? (
        <span className="atencao-health-pill">workspace · {workspaceFilter}</span>
      ) : null}
      <button
        type="button"
        className="atencao-health-refresh"
        onClick={onRefresh}
        disabled={loading}
        title={`Atualizado em ${generatedAt}`}
      >
        {loading ? 'lendo…' : 'atualizar'}
      </button>
    </div>
  )
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'warn' | 'ok'
}) {
  return (
    <span className={`atencao-health-metric tone-${tone}`}>
      <span className="atencao-health-metric-value">{value}</span>
      <span className="atencao-health-metric-label">{label}</span>
    </span>
  )
}
