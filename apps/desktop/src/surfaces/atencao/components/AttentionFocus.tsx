import { useCallback, useState } from 'react'
import type { AttentionAction, AttentionItem, AttentionSeverity } from '../types'

interface AttentionFocusProps {
  item: AttentionItem
  pending: boolean
  error: string | null
  onDecide: (
    item: AttentionItem,
    action: AttentionAction,
    reason?: string,
    pauseHours?: number,
  ) => void
  onOpenObra: () => void
}

const ACTION_LABEL: Record<AttentionAction, string> = {
  open_obra: 'Abrir Obra',
  approve: 'Aprovar',
  reject: 'Rejeitar',
  request_repair: 'Pedir reparo',
  pause: 'Pausar',
  rollback: 'Reverter',
  refine_intake: 'Refinar definição',
  approve_scope_change: 'Aprovar mudança de escopo',
  deny_scope_change: 'Negar mudança de escopo',
  approve_provider: 'Autorizar provider',
  approve_runtime: 'Confirmar runtime dispatch',
  dismiss_with_reason: 'Adiar com razão',
}

const ACTION_TONE: Record<AttentionAction, 'primary' | 'destructive' | 'ghost' | 'caution'> = {
  open_obra: 'primary',
  approve: 'primary',
  approve_scope_change: 'primary',
  approve_provider: 'primary',
  approve_runtime: 'primary',
  reject: 'destructive',
  deny_scope_change: 'destructive',
  rollback: 'destructive',
  request_repair: 'caution',
  pause: 'ghost',
  refine_intake: 'caution',
  dismiss_with_reason: 'ghost',
}

const SEVERITY_LABEL: Record<AttentionSeverity, string> = {
  high: 'alta',
  medium: 'média',
  low: 'baixa',
}

const KIND_LABEL: Record<string, string> = {
  intake_needed: 'Definição faltando',
  scope_decision: 'Decisão de escopo',
  risk_approval: 'Aprovação de risco',
  provider_approval: 'Autorização de provider',
  runtime_approval: 'Autorização de runtime',
  review_needed: 'Revisão necessária',
  repair_decision: 'Decisão de reparo',
  final_acceptance: 'Aceite final',
  blocked_attention: 'Bloqueio governado',
}

export function AttentionFocus({
  item,
  pending,
  error,
  onDecide,
  onOpenObra,
}: AttentionFocusProps) {
  const [reason, setReason] = useState<string>('')
  const [pauseHours, setPauseHours] = useState<number>(24)
  const needsReason = useCallback(
    (action: AttentionAction): boolean =>
      action === 'dismiss_with_reason' || action === 'reject' || action === 'pause',
    [],
  )

  const handleClick = useCallback(
    (action: AttentionAction) => {
      const finalReason = reason.trim() !== '' ? reason.trim() : undefined
      const finalHours = action === 'pause' ? pauseHours : undefined
      if (needsReason(action) && !finalReason) {
        const fallback = action === 'pause' ? `pause_${pauseHours}h` : action
        onDecide(item, action, fallback, finalHours)
        return
      }
      onDecide(item, action, finalReason, finalHours)
    },
    [reason, pauseHours, item, onDecide, needsReason],
  )

  return (
    <article className={`atencao-focus severity-${item.severity}`} aria-live="polite">
      <header className="atencao-focus-header">
        <div className="atencao-focus-tags">
          <span className={`atencao-tag tag-kind`}>{KIND_LABEL[item.kind] ?? item.kind}</span>
          <span className={`atencao-tag tag-severity-${item.severity}`}>
            risco {SEVERITY_LABEL[item.severity]}
          </span>
          <span className="atencao-tag tag-workspace">{item.workspace_slug}</span>
        </div>
        <button
          type="button"
          className="atencao-action atencao-action-link"
          onClick={onOpenObra}
        >
          Abrir Obra no Atlas Code →
        </button>
      </header>

      <h2 className="atencao-focus-question">{item.human_question}</h2>
      <p className="atencao-focus-obra">
        <span className="atencao-focus-obra-title">{item.obra_title}</span>
        <span className="atencao-focus-obra-state">· {item.obra_status}</span>
      </p>

      <div className="atencao-focus-grid">
        <section className="atencao-focus-card">
          <header>Por que agora</header>
          <p>{item.why_now}</p>
        </section>
        <section className="atencao-focus-card">
          <header>Risco se ignorar</header>
          <p>{item.risk_if_ignored}</p>
        </section>
        <section className="atencao-focus-card">
          <header>Recomendação do Atlas</header>
          <p>
            <code className="atencao-recommendation">
              {ACTION_LABEL[item.recommended_action] ?? item.recommended_action}
            </code>
            <span className="atencao-recommendation-note">
              Recomendação é sugestão. A decisão é sua.
            </span>
          </p>
        </section>
        <section className="atencao-focus-card">
          <header>Evidência vinculada</header>
          {item.evidence_refs.length === 0 ? (
            <p className="atencao-empty-note">
              Nenhuma evidência registrada ainda — não trate como pronto.
            </p>
          ) : (
            <ul className="atencao-evidence-list">
              {item.evidence_refs.map((ref) => (
                <li key={ref}>
                  <code>{ref}</code>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {item.next_safe_step ? (
        <p className="atencao-focus-next">Próximo passo seguro: {item.next_safe_step}</p>
      ) : null}

      <section className="atencao-decision-panel">
        <header className="atencao-decision-panel-header">
          <label htmlFor="atencao-reason">Razão da decisão (obrigatória para pausar/rejeitar/adiar)</label>
          <textarea
            id="atencao-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Por que essa decisão? (vai virar receipt auditável)"
            rows={2}
            maxLength={600}
            disabled={pending}
          />
          {item.allowed_actions.includes('pause') ? (
            <label className="atencao-pause-input">
              Pausa por
              <input
                type="number"
                min={1}
                max={168}
                value={pauseHours}
                onChange={(e) => setPauseHours(Math.max(1, Math.min(168, Number(e.target.value))))}
                disabled={pending}
              />
              h
            </label>
          ) : null}
        </header>

        <div className="atencao-action-row">
          {item.allowed_actions.map((action) => (
            <button
              key={action}
              type="button"
              className={`atencao-action atencao-action-${ACTION_TONE[action] ?? 'ghost'} ${
                action === item.recommended_action ? 'atencao-action-recommended' : ''
              }`}
              onClick={() => handleClick(action)}
              disabled={pending}
              title={action}
            >
              {ACTION_LABEL[action] ?? action}
              {action === item.recommended_action ? ' ★' : ''}
            </button>
          ))}
        </div>
        {error ? (
          <p className="atencao-decision-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </article>
  )
}
