import { useEffect, useMemo, useState, useTransition } from 'react'
import { PanelTitle } from '@atlas/ui'
import type { RightRailContext } from './rightRailTypes'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'
import { StatusBadge } from '../workbench/StatusBadge'
import type { WorkbenchTone } from '../workbench/tokens'

/**
 * Atlas Code Forge Human-First Panel · premium workbench v1.
 *
 * Tipografia sans 12h-friendly, tokens dark warm, status colors semânticos
 * (success/warning/danger/info). Diagnóstico técnico colapsado. NUNCA chama
 * provider externo, NUNCA promove completion claim.
 */

function toneFor(state: string): WorkbenchTone {
  if (state.startsWith('blocked')) return 'danger'
  if (state === 'failed' || state === 'rejected') return 'danger'
  if (state.startsWith('waiting')) return 'warning'
  if (state === 'repair_required' || state === 'rolled_back') return 'warning'
  if (state === 'completed' || state === 'prepared' || state === 'ready_to_execute') return 'success'
  if (state === 'running') return 'info'
  if (state === 'ready_to_prepare' || state === 'intake_ready') return 'accent'
  return 'neutral'
}

export function ForgeHumanPanel(ctx: RightRailContext) {
  const {
    obra,
    busy,
    forgeUxOrchestrator,
    onRefreshForgeUxOrchestrator,
    onRunForgeFastPath,
    onRefreshForgeFastPathStatus,
    onRefreshForgeReview,
  } = ctx

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const orchestrator = forgeUxOrchestrator
  const tone = orchestrator ? toneFor(orchestrator.state) : 'neutral'

  useEffect(() => {
    if (obra?.id && !orchestrator) {
      void onRefreshForgeUxOrchestrator().catch(() => undefined)
    }
  }, [obra?.id, orchestrator, onRefreshForgeUxOrchestrator])

  const blockerTranslation = orchestrator?.blockerTranslation ?? null
  const completionGating = orchestrator?.completionGating ?? null

  const primaryAction = useMemo(() => {
    if (!orchestrator) return null
    const suggested = blockerTranslation?.suggestedActionLabel ?? null
    const suggestedKind = blockerTranslation?.suggestedActionKind ?? null
    return {
      label: suggested ?? orchestrator.primaryActionLabel,
      kind: suggestedKind ?? orchestrator.primaryActionKind,
      enabled: orchestrator.primaryActionEnabled && !busy && !pending,
      disabledReason: orchestrator.primaryActionDisabledReason,
    }
  }, [orchestrator, blockerTranslation, busy, pending])

  const handlePrimary = () => {
    if (!orchestrator || !primaryAction || !primaryAction.enabled) return
    setError(null)
    startTransition(() => {
      const promise = (async () => {
        switch (primaryAction.kind) {
          case 'prepare_fast_path':
            return onRunForgeFastPath('prepare_only')
          case 'execute_fast_path':
            return onRunForgeFastPath('execute_async')
          case 'refresh_status':
          case 'wait_worker':
            return onRefreshForgeFastPathStatus()
          case 'open_review':
            return onRefreshForgeReview()
          case 'fix_scope':
          case 'open_intake':
          case 'open_advanced':
          case 'view_evidence':
          case 'plan_repair':
          case 'confirm_provider':
          case 'confirm_budget':
          case 'confirm_runtime_dispatch':
            return onRefreshForgeUxOrchestrator()
          default:
            return onRefreshForgeUxOrchestrator()
        }
      })()
      void promise.catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e))
      })
    })
  }

  if (!obra?.id) {
    return (
      <section className="rail-panel" aria-labelledby="forge-human-title">
        <PanelTitle label="Forge" />
        <EmptyText>
          Selecione ou crie uma Obra à esquerda. Atlas Code Forge é fail-closed sem Obra vinculada.
        </EmptyText>
      </section>
    )
  }

  if (!orchestrator) {
    return (
      <section className="rail-panel" aria-labelledby="forge-human-title">
        <PanelTitle label="Forge" />
        <EmptyText>Carregando estado do Forge…</EmptyText>
        <button
          type="button"
          style={{ ...btnPrimary, marginTop: 10 }}
          onClick={() => void onRefreshForgeUxOrchestrator()}
          disabled={busy || pending}
        >
          Atualizar estado
        </button>
      </section>
    )
  }

  const isBlocking = blockerTranslation?.isBlocking ?? false

  return (
    <section className="rail-panel" aria-labelledby="forge-human-title">
      <PanelTitle label="Forge" />

      {/* Status card · tom semântico, sans operacional */}
      <div
        style={{
          padding: '12px 14px',
          margin: '4px 0 14px',
          border: `1px solid var(--cc-${tone === 'neutral' ? 'border' : tone + '-border'})`,
          background: `var(--cc-${tone === 'neutral' ? 'surface-raised' : tone + '-veil'})`,
          borderRadius: 'var(--cc-radius-sm)',
          display: 'grid',
          gap: 6,
        }}
        role="status"
        aria-live="polite"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge label={orchestrator.state.replace(/_/g, ' ')} tone={tone} />
        </div>
        <div
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 14.5,
            fontWeight: 600,
            color: 'var(--cc-text-strong)',
            lineHeight: 1.3,
          }}
        >
          {orchestrator.humanStatusLabel}
        </div>
        <div
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 12.5,
            color: 'var(--cc-text-muted)',
            lineHeight: 1.6,
          }}
        >
          {orchestrator.humanStatusDetail}
        </div>
      </div>

      {/* Progress · % grande + texto descritivo separado */}
      <div
        style={{
          display: 'grid',
          gap: 10,
          padding: '14px 16px',
          marginBottom: 16,
          background: 'var(--cc-surface)',
          border: '1px solid var(--cc-border-soft)',
          borderRadius: 'var(--cc-radius-md)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <span
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--cc-text-strong)',
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            {orchestrator.progressPercent}%
          </span>
          <span
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 11,
              color: 'var(--cc-text-faint)',
              fontWeight: 500,
            }}
          >
            Progresso
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: 'var(--cc-surface-sunken)',
            position: 'relative',
            borderRadius: 999,
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.18)',
          }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={orchestrator.progressPercent}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${orchestrator.progressPercent}%`,
              background: tone === 'neutral' ? 'var(--cc-accent)' : `var(--cc-${tone})`,
              borderRadius: 999,
              transition: 'width 280ms var(--ease-i)',
            }}
          />
        </div>
        <div
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 12.5,
            color: 'var(--cc-text-muted)',
            lineHeight: 1.6,
          }}
        >
          {orchestrator.nextSafeStep}
        </div>
      </div>

      {/* Primary action · accent gold premium */}
      <button
        type="button"
        style={{
          ...btnPrimary,
          width: '100%',
          padding: '12px 16px',
          fontSize: 13.5,
          opacity: primaryAction?.enabled ? 1 : 0.45,
          cursor: primaryAction?.enabled ? 'pointer' : 'not-allowed',
        }}
        onClick={handlePrimary}
        disabled={!primaryAction?.enabled}
        aria-disabled={!primaryAction?.enabled}
      >
        {busy || pending ? 'Processando…' : (primaryAction?.label ?? 'Continuar Forge')}
      </button>
      {primaryAction?.disabledReason ? (
        <div
          style={{
            marginTop: 6,
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 11.5,
            color: 'var(--cc-text-faint)',
          }}
        >
          {primaryAction.disabledReason}
        </div>
      ) : null}

      {/* Checklist · card próprio com padding generoso */}
      <SectionCard title="Checklist">
        <ChecklistRow label="Obra" done={orchestrator.checklist.obra} />
        <ChecklistRow label="Definição" done={orchestrator.checklist.intake} />
        <ChecklistRow label="Spec / Plan" done={orchestrator.checklist.specPlan} />
        <ChecklistRow label="Provider / Modelo" done={orchestrator.checklist.provider} />
        <ChecklistRow label="Execução" done={orchestrator.checklist.execution} />
        <ChecklistRow label="Revisão" done={orchestrator.checklist.review} />
        <ChecklistRow label="Provas" done={orchestrator.checklist.evidence} last />
      </SectionCard>

      {/* Segurança · card com rows espaçadas */}
      <SectionCard title="Segurança">
        <Row
          k="Provider externo"
          v={orchestrator.safetySummary.externalProviderCall ? 'sim' : 'não'}
          ok={!orchestrator.safetySummary.externalProviderCall}
        />
        <Row
          k="Tokens gastos"
          v={String(orchestrator.safetySummary.providerTokensSpent ?? 0)}
          ok={(orchestrator.safetySummary.providerTokensSpent ?? 0) === 0}
        />
        <Row
          k="Completion promovido"
          v={orchestrator.safetySummary.completionClaimPromoted ? 'sim' : 'não'}
          ok={!orchestrator.safetySummary.completionClaimPromoted}
        />
        <Row
          k="Review gate"
          v={orchestrator.safetySummary.reviewCompletionGatePreserved ? 'preservado' : 'AUSENTE'}
          ok={orchestrator.safetySummary.reviewCompletionGatePreserved}
        />
      </SectionCard>

      <SectionCard title="Provider / Modelo">
        <Row k="Provider" v={orchestrator.providerSummary.provider ?? '—'} mono />
        <Row k="Modelo" v={orchestrator.providerSummary.model ?? '—'} mono />
        <Row k="Decision source" v={orchestrator.providerSummary.decisionSource} />
        <Row k="Capacity" v={orchestrator.providerSummary.capacityState} />
        <Row
          k="Driver configurado"
          v={orchestrator.providerSummary.driverConfigured ? 'sim' : 'não'}
          ok={orchestrator.providerSummary.driverConfigured}
        />
      </SectionCard>

      {blockerTranslation && (blockerTranslation.isBlocking || blockerTranslation.kind) ? (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            border: `1px solid var(--cc-${isBlocking ? 'danger' : 'warning'}-border)`,
            background: `var(--cc-${isBlocking ? 'danger' : 'warning'}-veil)`,
            borderRadius: 'var(--cc-radius-sm)',
            display: 'grid',
            gap: 6,
          }}
          role={isBlocking ? 'alert' : 'status'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge
              label={blockerTranslation.kind ?? 'blocker'}
              tone={isBlocking ? 'danger' : 'warning'}
            />
          </div>
          <div
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--cc-text-strong)',
            }}
          >
            {blockerTranslation.humanTitle ?? 'Bloqueado'}
          </div>
          {blockerTranslation.humanDetail ? (
            <div
              style={{
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 12.5,
                color: 'var(--cc-text-muted)',
                lineHeight: 1.6,
              }}
            >
              {blockerTranslation.humanDetail}
            </div>
          ) : null}
          {blockerTranslation.filesOutOfScope.length > 0 ? (
            <ul
              style={{
                margin: '4px 0 0',
                paddingLeft: 18,
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 11.5,
                color: 'var(--cc-danger-fg)',
                letterSpacing: 'var(--cc-tracking-data)',
              }}
            >
              {blockerTranslation.filesOutOfScope.map((f: string) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : null}
          <div
            style={{
              marginTop: 4,
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--cc-accent-strong)',
            }}
          >
            O que fazer · {orchestrator.nextSafeStep}
          </div>
          <details style={{ marginTop: 6 }}>
            <summary
              style={{
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 11.5,
                color: 'var(--cc-text-muted)',
                cursor: 'pointer',
              }}
            >
              Ver detalhes técnicos
            </summary>
            <div
              style={{
                marginTop: 6,
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 11,
                color: 'var(--cc-text-faint)',
                letterSpacing: 'var(--cc-tracking-data)',
              }}
            >
              {blockerTranslation.technicalDetail ?? orchestrator.blockers.join(', ')}
            </div>
            {orchestrator.blockers.length > 0 ? (
              <ul
                style={{
                  margin: '4px 0 0',
                  paddingLeft: 18,
                  fontFamily: 'var(--cc-font-mono)',
                  fontSize: 11,
                  color: 'var(--cc-text-faint)',
                }}
              >
                {orchestrator.blockers.map((b: string) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
          </details>
        </div>
      ) : null}

      {completionGating &&
      (completionGating.approveButtonVisible ||
        completionGating.rejectButtonVisible ||
        completionGating.rollbackButtonVisible) ? (
        <div
          style={{
            marginTop: 14,
            padding: '10px 12px',
            border: '1px solid var(--cc-accent-border)',
            background: 'var(--cc-accent-veil)',
            color: 'var(--cc-text)',
            borderRadius: 'var(--cc-radius-sm)',
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--cc-accent-strong)', fontWeight: 600 }}>
            Decisão humana pendente
          </strong>{' '}
          — abra <strong>Revisar</strong>.
        </div>
      ) : null}

      {orchestrator.state === 'waiting_provider_confirmation' ||
      orchestrator.state === 'waiting_budget_confirmation' ||
      orchestrator.state === 'waiting_runtime_dispatch_confirmation' ? (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            border: '1px solid var(--cc-warning-border)',
            background: 'var(--cc-warning-veil)',
            borderRadius: 'var(--cc-radius-sm)',
            display: 'grid',
            gap: 6,
          }}
        >
          <strong
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--cc-warning-fg)',
            }}
          >
            Confirmar Provider real
          </strong>
          <div
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 12,
              color: 'var(--cc-text-muted)',
              lineHeight: 1.6,
            }}
          >
            Para invocar provider externo real, abra <strong>Avançado &gt; Provider Invocation</strong>{' '}
            e marque <em>confirm_provider_call</em>, <em>confirm_budget</em> e{' '}
            <em>confirm_runtime_dispatch</em>. Atlas nunca chama provider sem essas três aprovações.
          </div>
        </div>
      ) : null}

      <details style={{ marginTop: 18 }}>
        <summary
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 11.5,
            fontWeight: 500,
            color: 'var(--cc-text-muted)',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          Avançado · diagnóstico técnico
        </summary>
        <div style={{ marginTop: 8 }}>
          <Row k="Schema" v={orchestrator.schemaVersion} mono />
          <Row k="Generated at" v={orchestrator.generatedAt} mono />
          <Row k="Separated from" v={orchestrator.separatedFrom} />
          <Row k="Definition status" v={orchestrator.definitionStatus} />
          <Row k="Evidence refs (obra)" v={String(orchestrator.evidenceSeparation.obraEvidenceRefCount)} mono />
          <Row k="Ledger events (obra)" v={String(orchestrator.evidenceSeparation.obraLedgerEventCount)} mono />
          <Row k="Review required" v={orchestrator.reviewSummary.reviewRequired ? 'sim' : 'não'} />
          <Row k="Review status" v={orchestrator.reviewSummary.reviewStatus} />
          <Row
            k="Final completion allowed"
            v={orchestrator.reviewSummary.finalCompletionAllowed ? 'sim' : 'não'}
          />
          {Object.entries(orchestrator.advancedRefs).map(([key, value]) => (
            <Row
              key={key}
              k={key}
              v={value === null || value === undefined ? '—' : String(value)}
              mono
            />
          ))}
          <div
            style={{
              marginTop: 8,
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 11,
              color: 'var(--cc-text-faint)',
            }}
          >
            Para diagnóstico técnico mais profundo: aba <strong>Avançado</strong> · Topology · Capacity ·
            Provider Invocation.
          </div>
        </div>
      </details>

      {error ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            border: '1px solid var(--cc-danger-border)',
            background: 'var(--cc-danger-veil)',
            color: 'var(--cc-danger-fg)',
            borderRadius: 'var(--cc-radius-sm)',
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 12,
            lineHeight: 1.5,
          }}
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </section>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        marginTop: 14,
        padding: '14px 16px',
        background: 'var(--cc-surface)',
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 'var(--cc-radius-md)',
        display: 'grid',
        gap: 4,
      }}
    >
      <header
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--cc-text-faint)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {title}
      </header>
      <div style={{ display: 'grid' }}>{children}</div>
    </section>
  )
}

function ChecklistRow({ label, done, last = false }: { label: string; done: boolean; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: last ? 'none' : '1px solid var(--cc-border-soft)',
        minHeight: 32,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 13,
          color: done ? 'var(--cc-text)' : 'var(--cc-text-muted)',
          fontWeight: done ? 500 : 400,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: 999,
            background: done ? 'var(--cc-success-veil)' : 'transparent',
            border: done ? '1px solid var(--cc-success-border)' : '1px solid var(--cc-border)',
            color: done ? 'var(--cc-success)' : 'var(--cc-text-disabled)',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {done ? '✓' : ''}
        </span>
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 10.5,
          color: done ? 'var(--cc-success-fg)' : 'var(--cc-text-faint)',
          letterSpacing: 'var(--cc-tracking-data)',
        }}
      >
        {done ? 'ok' : '—'}
      </span>
    </div>
  )
}
