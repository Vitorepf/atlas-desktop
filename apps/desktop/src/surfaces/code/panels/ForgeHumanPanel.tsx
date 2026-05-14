import { useEffect, useMemo, useState, useTransition } from 'react'
import { PanelTitle } from '@atlas/ui'
import type { AtlasCodeForgeUxOrchestrator } from '@atlas/domain'
import type { RightRailContext } from './rightRailTypes'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

const TONE_BLOCKED = { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' }
const TONE_WAITING = { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' }
const TONE_GO = { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' }
const TONE_NEUTRAL = { fg: 'var(--ink)', bg: 'var(--cream)', border: 'var(--hair-soft)' }
const TONE_MUTED = { fg: 'var(--ink3)', bg: 'var(--cream)', border: 'var(--hair-soft)' }

const STATE_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  no_obra: TONE_MUTED,
  idle: TONE_MUTED,
  ready_to_define: TONE_NEUTRAL,
  intake_required: TONE_WAITING,
  intake_ready: TONE_NEUTRAL,
  ready_to_prepare: TONE_NEUTRAL,
  prepared: TONE_GO,
  ready_to_execute: TONE_GO,
  running: { fg: 'var(--ink2)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
  waiting_worker: TONE_WAITING,
  waiting_provider_confirmation: TONE_WAITING,
  waiting_budget_confirmation: TONE_WAITING,
  waiting_runtime_dispatch_confirmation: TONE_WAITING,
  waiting_review: TONE_WAITING,
  repair_required: TONE_WAITING,
  blocked: TONE_BLOCKED,
  blocked_scope: TONE_BLOCKED,
  blocked_definition: TONE_WAITING,
  blocked_provider: TONE_BLOCKED,
  blocked_driver: TONE_BLOCKED,
  blocked_capacity: TONE_BLOCKED,
  blocked_governance: TONE_BLOCKED,
  completed: TONE_GO,
  failed: TONE_BLOCKED,
  rejected: TONE_BLOCKED,
  rolled_back: TONE_WAITING,
}

/**
 * Atlas Code Forge Human-First Panel.
 *
 * The single human-facing entry point for the Forge runtime. Reads the
 * canonical UX Orchestrator state and exposes:
 *   - one large primary action (no technical jargon);
 *   - safety strip (provider call, tokens, completion claim, review gate);
 *   - checklist (Obra → Intake → Spec/Plan → Provider → Execução → Revisão → Provas);
 *   - blocker card when the runtime is blocked honestly;
 *   - advanced details collapsed under a `<details>` tag.
 *
 * NEVER bypasses Atlas Decide / Provider / Review / Evidence. The primary
 * action only dispatches the safe useBridge action that maps to the current
 * state — provider real exige confirmação explícita.
 *
 * Doc: docs/engineering-knowledge-base/atlas-code-forge-human-first-ux-orchestrator-v1.md
 */
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
  const tone = STATE_TONE[orchestrator?.state ?? 'no_obra'] ?? STATE_TONE.no_obra

  useEffect(() => {
    if (obra?.id && ! orchestrator) {
      void onRefreshForgeUxOrchestrator().catch(() => undefined)
    }
  }, [obra?.id, orchestrator, onRefreshForgeUxOrchestrator])

  const blockerTranslation = orchestrator?.blockerTranslation ?? null
  const completionGating = orchestrator?.completionGating ?? null

  /**
   * Resolve the primary CTA. When a blocker translation exists with its own
   * suggested action (e.g. "Corrigir escopo" for blocked_scope), it overrides
   * the orchestrator's default primary action so the human always sees the
   * correct next safe button.
   */
  const primaryAction = useMemo(() => {
    if (! orchestrator) return null
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
    if (! orchestrator || ! primaryAction || ! primaryAction.enabled) return
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
            // Non-mutating CTAs: just refresh state so the panel reflects the
            // user's manual navigation in other tabs. Provider real ainda
            // exige caminho explícito em Avançado > Provider Invocation.
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

  if (! obra?.id) {
    return (
      <section className="rail-panel" aria-labelledby="forge-human-title">
        <PanelTitle label="Forge" />
        <EmptyText>Selecione ou crie uma Obra à esquerda. Atlas Code Forge é fail-closed sem Obra vinculada.</EmptyText>
      </section>
    )
  }

  if (! orchestrator) {
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
          atualizar estado
        </button>
      </section>
    )
  }

  return (
    <section className="rail-panel" aria-labelledby="forge-human-title">
      <PanelTitle label="Forge" />

      <div
        style={{
          padding: '10px 12px',
          margin: '8px 0 12px 0',
          border: `1px solid ${tone.border}`,
          background: tone.bg,
          color: tone.fg,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
        role="status"
        aria-live="polite"
      >
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '1.3px', textTransform: 'uppercase' }}>
          {orchestrator.state}
        </span>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 500 }}>
          {orchestrator.humanStatusLabel}
        </span>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 11.5, fontStyle: 'italic', color: 'var(--ink3)' }}>
          {orchestrator.humanStatusDetail}
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            height: 6,
            background: 'var(--hair-soft)',
            position: 'relative',
            borderRadius: 1,
            overflow: 'hidden',
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
              background: tone.fg,
              transition: 'width 200ms ease',
            }}
          />
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink3)' }}>
          {orchestrator.progressPercent}% · {orchestrator.nextSafeStep}
        </span>
      </div>

      <button
        type="button"
        style={{
          ...btnPrimary,
          width: '100%',
          padding: '14px 18px',
          fontSize: 12.5,
          letterSpacing: '1.6px',
          opacity: primaryAction?.enabled ? 1 : 0.45,
          cursor: primaryAction?.enabled ? 'pointer' : 'not-allowed',
        }}
        onClick={handlePrimary}
        disabled={! primaryAction?.enabled}
        aria-disabled={! primaryAction?.enabled}
      >
        {busy || pending ? 'processando…' : (primaryAction?.label ?? 'Continuar Forge')}
      </button>
      {primaryAction?.disabledReason ? (
        <div style={{ marginTop: 4, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
          {primaryAction.disabledReason}
        </div>
      ) : null}

      <h3
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: 'var(--bronze)',
        }}
      >
        Checklist
      </h3>
      <ChecklistRow label="Obra" done={orchestrator.checklist.obra} />
      <ChecklistRow label="Definição" done={orchestrator.checklist.intake} />
      <ChecklistRow label="Spec / Plan" done={orchestrator.checklist.specPlan} />
      <ChecklistRow label="Provider / Modelo" done={orchestrator.checklist.provider} />
      <ChecklistRow label="Execução" done={orchestrator.checklist.execution} />
      <ChecklistRow label="Revisão" done={orchestrator.checklist.review} />
      <ChecklistRow label="Provas" done={orchestrator.checklist.evidence} />

      <h3
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: 'var(--bronze)',
        }}
      >
        Segurança
      </h3>
      <Row k="external provider call" v={orchestrator.safetySummary.externalProviderCall ? 'sim' : 'não'} ok={! orchestrator.safetySummary.externalProviderCall} />
      <Row k="tokens gastos" v={String(orchestrator.safetySummary.providerTokensSpent ?? 0)} ok={(orchestrator.safetySummary.providerTokensSpent ?? 0) === 0} />
      <Row k="completion claim promovido" v={orchestrator.safetySummary.completionClaimPromoted ? 'sim' : 'não'} ok={! orchestrator.safetySummary.completionClaimPromoted} />
      <Row k="review gate preservado" v={orchestrator.safetySummary.reviewCompletionGatePreserved ? 'sim' : 'não'} ok={orchestrator.safetySummary.reviewCompletionGatePreserved} />

      <h3
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: 'var(--bronze)',
        }}
      >
        Provider / Modelo
      </h3>
      <Row k="provider" v={orchestrator.providerSummary.provider ?? '—'} mono />
      <Row k="modelo" v={orchestrator.providerSummary.model ?? '—'} mono />
      <Row k="decision source" v={orchestrator.providerSummary.decisionSource} />
      <Row k="capacity" v={orchestrator.providerSummary.capacityState} />
      <Row k="driver configurado" v={orchestrator.providerSummary.driverConfigured ? 'sim' : 'não'} ok={orchestrator.providerSummary.driverConfigured} />

      {blockerTranslation && (blockerTranslation.isBlocking || blockerTranslation.kind) ? (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            border: `1px solid ${blockerTranslation.isBlocking ? 'var(--rec-red, #8a3025)' : 'var(--bronze-soft)'}`,
            background: blockerTranslation.isBlocking
              ? 'var(--rec-red-veil, rgba(138,48,37,0.08))'
              : 'var(--bronze-veil)',
            color: blockerTranslation.isBlocking ? 'var(--rec-red, #8a3025)' : 'var(--ink)',
          }}
          role={blockerTranslation.isBlocking ? 'alert' : 'status'}
        >
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 4 }}>
            {blockerTranslation.humanTitle ?? 'Bloqueado'}
          </div>
          {blockerTranslation.humanDetail ? (
            <div style={{ fontFamily: 'var(--serif)', fontSize: 12, marginBottom: 6 }}>
              {blockerTranslation.humanDetail}
            </div>
          ) : null}
          {blockerTranslation.filesOutOfScope.length > 0 ? (
            <ul style={{ margin: '4px 0 6px', paddingLeft: 18, fontFamily: 'var(--mono)', fontSize: 10.5 }}>
              {blockerTranslation.filesOutOfScope.map((f: string) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : null}
          <div style={{ marginTop: 4, fontFamily: 'var(--serif)', fontSize: 11.5, fontStyle: 'italic' }}>
            {orchestrator.nextSafeStep}
          </div>
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', cursor: 'pointer' }}>
              Ver detalhes técnicos
            </summary>
            <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
              {blockerTranslation.technicalDetail ?? orchestrator.blockers.join(', ')}
            </div>
            {orchestrator.blockers.length > 0 ? (
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
                {orchestrator.blockers.map((b: string) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
          </details>
        </div>
      ) : null}

      {completionGating && (completionGating.approveButtonVisible
          || completionGating.rejectButtonVisible
          || completionGating.rollbackButtonVisible) ? (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            border: '1px solid var(--bronze-soft)',
            background: 'var(--bronze-veil)',
            color: 'var(--ink)',
            fontFamily: 'var(--mono)',
            fontSize: 9.5,
            letterSpacing: '1.1px',
            textTransform: 'uppercase',
          }}
        >
          Decisão humana pendente — abra <strong>Revisar</strong>.
        </div>
      ) : null}

      {orchestrator.state === 'waiting_provider_confirmation'
        || orchestrator.state === 'waiting_budget_confirmation'
        || orchestrator.state === 'waiting_runtime_dispatch_confirmation' ? (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            border: '1px solid var(--bronze-soft)',
            background: 'var(--bronze-veil)',
            color: 'var(--ink)',
          }}
        >
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 4 }}>
            Confirmar Provider real
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 11.5 }}>
            Para invocar provider externo real, abra <strong>Avançado &gt; Provider Invocation</strong> e marque
            <em> confirm_provider_call</em>, <em>confirm_budget</em> e <em>confirm_runtime_dispatch</em>. O Atlas
            nunca chama provider sem essas três aprovações explícitas.
          </div>
        </div>
      ) : null}

      <details style={{ marginTop: 18 }}>
        <summary style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '1.3px', textTransform: 'uppercase', color: 'var(--ink3)', cursor: 'pointer' }}>
          Detalhes avançados (diagnóstico)
        </summary>
        <div style={{ marginTop: 8, padding: '6px 0' }}>
          <Row k="schema" v={orchestrator.schemaVersion} mono />
          <Row k="generated_at" v={orchestrator.generatedAt} mono />
          <Row k="separated_from" v={orchestrator.separatedFrom} />
          <Row k="definition_status" v={orchestrator.definitionStatus} />
          <Row k="evidence_refs (obra)" v={String(orchestrator.evidenceSeparation.obraEvidenceRefCount)} mono />
          <Row k="ledger_events (obra)" v={String(orchestrator.evidenceSeparation.obraLedgerEventCount)} mono />
          <Row k="review_required" v={orchestrator.reviewSummary.reviewRequired ? 'sim' : 'não'} />
          <Row k="review_status" v={orchestrator.reviewSummary.reviewStatus} />
          <Row k="final_completion_allowed" v={orchestrator.reviewSummary.finalCompletionAllowed ? 'sim' : 'não'} />
          {Object.entries(orchestrator.advancedRefs).map(([key, value]) => (
            <Row key={key} k={key} v={value === null || value === undefined ? '—' : String(value)} mono />
          ))}
          <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink3)' }}>
            Para diagnóstico técnico, abra a aba <strong>Avançado</strong> · Topology · Capacity · Provider Invocation.
          </div>
        </div>
      </details>

      {error ? (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            border: '1px solid var(--rec-red, #8a3025)',
            color: 'var(--rec-red, #8a3025)',
            fontFamily: 'var(--mono)',
            fontSize: 10,
          }}
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </section>
  )
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '3px 0',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        color: done ? 'var(--moss)' : 'var(--ink3)',
      }}
    >
      <span>{done ? '✓' : '○'} {label}</span>
      <span>{done ? 'ok' : '—'}</span>
    </div>
  )
}

/**
 * Type re-export so the registry/consumer can import the orchestrator alongside
 * the panel.
 */
export type { AtlasCodeForgeUxOrchestrator }
