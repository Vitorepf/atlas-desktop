import type { ReactNode } from 'react'
import { StatusBadge } from './StatusBadge'
import type { StatusKind, WorkbenchTone } from './tokens'

/**
 * Premium Obra summary hero · header rico para o centro do workbench.
 * Renderiza objetivo + status humano + CTA contextual de forma calma.
 * 12h-friendly: contraste alto em title, hierarquia clara, sem ruído.
 */
export function ObraSummaryHero({
  obraTitle,
  objectiveSummary,
  statusLabel,
  statusDetail,
  statusKind,
  statusTone,
  primaryActionLabel,
  primaryActionHint,
  primaryActionDisabled,
  primaryActionDisabledReason,
  rightSlot,
}: {
  obraTitle: string
  objectiveSummary: string | null
  statusLabel: string
  statusDetail: string
  statusKind: StatusKind | string
  statusTone: WorkbenchTone
  primaryActionLabel: string
  primaryActionHint?: string
  primaryActionDisabled?: boolean
  primaryActionDisabledReason?: string | null
  rightSlot?: ReactNode
}) {
  const hasObjective = !!objectiveSummary && objectiveSummary !== obraTitle
  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: rightSlot ? 'minmax(0, 1fr) auto' : '1fr',
        gap: 18,
        padding: '20px 22px',
        background: 'var(--cc-surface-raised)',
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 'var(--cc-radius-lg)',
        boxShadow: 'var(--cc-shadow-sm)',
      }}
      aria-label="Resumo da Obra"
    >
      <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StatusBadge label={statusLabel} tone={statusTone} title={statusDetail} />
          <span
            style={{
              fontFamily: 'var(--cc-font-mono)',
              fontSize: 11,
              color: 'var(--cc-text-faint)',
              letterSpacing: 'var(--cc-tracking-data)',
            }}
          >
            {statusKind}
          </span>
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 'var(--cc-tracking-tight)',
            lineHeight: 'var(--cc-leading-tight)',
            color: 'var(--cc-text-strong)',
          }}
        >
          {obraTitle}
        </h1>
        {hasObjective ? (
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 14,
              color: 'var(--cc-text-muted)',
              lineHeight: 'var(--cc-leading-relaxed)',
              maxWidth: '60ch',
            }}
          >
            {objectiveSummary}
          </p>
        ) : null}
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 13,
            color: 'var(--cc-text)',
            lineHeight: 'var(--cc-leading-relaxed)',
          }}
        >
          {statusDetail}
        </p>
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 13,
              fontWeight: 600,
              color: primaryActionDisabled ? 'var(--cc-text-muted)' : 'var(--cc-accent-strong)',
            }}
          >
            Próximo passo seguro · {primaryActionLabel}
          </span>
          {primaryActionDisabled && primaryActionDisabledReason ? (
            <StatusBadge label={`bloqueado · ${primaryActionDisabledReason}`} tone="warning" withDot={false} />
          ) : null}
          {primaryActionHint ? (
            <span
              style={{
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 12,
                color: 'var(--cc-text-faint)',
              }}
            >
              {primaryActionHint}
            </span>
          ) : null}
        </div>
      </div>
      {rightSlot ? (
        <aside style={{ display: 'grid', gap: 8, alignContent: 'start', justifyItems: 'end', minWidth: 0 }}>
          {rightSlot}
        </aside>
      ) : null}
    </section>
  )
}
