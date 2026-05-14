import { PanelTitle } from '@atlas/ui'
import type { ProgrammingGateRunSnapshot, QualityGate } from '@atlas/domain'
import { EmptyText } from './RightRailPrimitives'
import { DiffScopeGuard } from './DiffScopeGuard'
import { ForgeGovernedExecutionPanel } from './ForgeGovernedExecutionPanel'
import { ForgeReviewCompletionPanel } from './ForgeReviewCompletionPanel'
import { ForgeReviewGate } from './ForgeReviewGate'
import { ForgeStageTimelinePanel } from './ForgeStageTimelinePanel'
import { ForgeWorkspaceBanner } from './ForgeWorkspaceBanner'
import type { RightRailContext } from './rightRailTypes'

export function VerifyPanel({
  obra,
  gates,
  busy,
  receipt,
  forgeLiveExecution,
  forgeReview,
  forgeFastPath,
  forgeFastPathStatus,
  forgeReviewPacket,
  forgeCompletionClaim,
  forgeUxOrchestrator,
  programmingGovernance,
  onRunGate,
  onRunForgeLiveExecution,
  onReviewForgeRun,
  onRollbackForgePromotion,
  onRefreshForgeReview,
  onApproveForgeReview,
  onRejectForgeReview,
  onRollbackForgeReview,
}: RightRailContext) {
  const gateRuns = programmingGovernance?.gateRuns ?? []
  const hasGovernedRuns = gateRuns.length > 0

  // Atlas Code Human Interface Upgrade v2 · completionGating
  // approve/reject/rollback só aparecem quando a UX Orchestrator confirma
  // que existe revisão real pendente. Antes disso o painel mostra apenas
  // o estado e nenhum CTA destrutivo.
  const completionGating = forgeUxOrchestrator?.completionGating ?? null
  const approveButtonVisible = completionGating?.approveButtonVisible ?? false
  const rejectButtonVisible = completionGating?.rejectButtonVisible ?? false
  const rollbackButtonVisible = completionGating?.rollbackButtonVisible ?? false
  const anyDecisionVisible = approveButtonVisible || rejectButtonVisible || rollbackButtonVisible

  // SCOR-1 preferred path: render the real Programming Governance gate runs.
  if (hasGovernedRuns) {
    const passed = gateRuns.filter((g) => g.status === 'passed').length
    return (
      <section className="ops-panel">
        <ReviewGatingHeader
          anyDecisionVisible={anyDecisionVisible}
          approveButtonVisible={approveButtonVisible}
          rejectButtonVisible={rejectButtonVisible}
          rollbackButtonVisible={rollbackButtonVisible}
        />
        <ForgeWorkspaceBanner
          obra={obra}
          receipt={receipt}
          governance={programmingGovernance}
          liveExecution={forgeLiveExecution}
          busy={busy}
          onRunLiveExecution={onRunForgeLiveExecution}
        />
        <ForgeStageTimelinePanel liveExecution={forgeLiveExecution} />
        <ForgeGovernedExecutionPanel liveExecution={forgeLiveExecution} />
        <DiffScopeGuard liveExecution={forgeLiveExecution} />
        <ForgeReviewGate
          liveExecution={forgeLiveExecution}
          review={forgeReview}
          busy={busy}
          onReview={(decision, comment) => void onReviewForgeRun(decision, comment)}
          onRollback={(promotionId, comment) => void onRollbackForgePromotion(promotionId ?? undefined, comment)}
        />
        <ForgeReviewCompletionPanel
          obraId={obra?.id ?? null}
          fastPathRunId={forgeFastPathStatus?.fastPathRunId ?? forgeFastPath?.fastPathRunId ?? null}
          packet={forgeReviewPacket}
          claim={forgeCompletionClaim}
          busy={busy}
          onRefresh={onRefreshForgeReview}
          onApprove={onApproveForgeReview}
          onReject={onRejectForgeReview}
          onRollback={onRollbackForgeReview}
        />
        <div className="ops-section">
          <PanelTitle
            label="Quality Gates"
            meta={`${passed}/${gateRuns.length} passed · governance`}
          />
          <div style={{ display: 'grid', gap: 4 }}>
            {gateRuns.map((run, idx) => (
              <GovernanceGateRow key={`${run.gateName}-${idx}`} run={run} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Fallback: legacy /tools/gate gates. When governance is bound but has no
  // runs yet, render the honest empty state instead of the legacy list.
  const passed = gates.filter((g) => g.state === 'passed').length
  return (
    <section className="ops-panel">
      <ReviewGatingHeader
        anyDecisionVisible={anyDecisionVisible}
        approveButtonVisible={approveButtonVisible}
        rejectButtonVisible={rejectButtonVisible}
        rollbackButtonVisible={rollbackButtonVisible}
      />
      <ForgeWorkspaceBanner
        obra={obra}
        receipt={receipt}
        governance={programmingGovernance}
        liveExecution={forgeLiveExecution}
        busy={busy}
        onRunLiveExecution={onRunForgeLiveExecution}
      />
      <ForgeStageTimelinePanel liveExecution={forgeLiveExecution} />
      <ForgeGovernedExecutionPanel liveExecution={forgeLiveExecution} />
      <DiffScopeGuard liveExecution={forgeLiveExecution} />
      <ForgeReviewGate
        liveExecution={forgeLiveExecution}
        review={forgeReview}
        busy={busy}
        onReview={(decision, comment) => void onReviewForgeRun(decision, comment)}
        onRollback={(promotionId, comment) => void onRollbackForgePromotion(promotionId ?? undefined, comment)}
      />
      <div className="ops-section">
        <PanelTitle
          label="Quality Gates"
          meta={
            programmingGovernance?.workItem
              ? 'sem gate runs reais'
              : gates.length === 0
                ? 'sem gates configurados'
                : `${passed}/${gates.length} passed`
          }
        />
        {programmingGovernance?.workItem ? (
          <EmptyText>sem gate runs reais</EmptyText>
        ) : gates.length === 0 ? (
          <EmptyText>nenhum gate retornado pelo Kernel.</EmptyText>
        ) : (
          <div style={{ display: 'grid', gap: 4 }}>
            {gates.map((g) => (
              <LegacyGateRow key={g.id} gate={g} busy={busy} onRun={() => void onRunGate(g.id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ReviewGatingHeader({
  anyDecisionVisible,
  approveButtonVisible,
  rejectButtonVisible,
  rollbackButtonVisible,
}: {
  anyDecisionVisible: boolean
  approveButtonVisible: boolean
  rejectButtonVisible: boolean
  rollbackButtonVisible: boolean
}) {
  if (anyDecisionVisible) {
    return (
      <div
        style={{
          padding: '8px 10px',
          margin: '0 0 8px',
          border: '1px solid var(--bronze-soft)',
          background: 'var(--bronze-veil)',
          color: 'var(--ink)',
        }}
        role="status"
      >
        <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9, letterSpacing: 0, textTransform: 'none', marginBottom: 2 }}>
          Decisão humana pendente
        </div>
        <div style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 11.5 }}>
          Revise o resultado e aprove ou rejeite abaixo. Aprovar libera completion;
          rejeitar abre reparo; rollback reverte promoção sob governança.
        </div>
        <div style={{ marginTop: 4, fontFamily: 'var(--cc-font-mono)', fontSize: 9, color: 'var(--ink3)' }}>
          approveButtonVisible={String(approveButtonVisible)} · rejectButtonVisible={String(rejectButtonVisible)} · rollbackButtonVisible={String(rollbackButtonVisible)}
        </div>
      </div>
    )
  }
  return (
    <div
      style={{
        padding: '8px 10px',
        margin: '0 0 8px',
        border: '1px solid var(--hair-soft)',
        background: 'var(--cream)',
        color: 'var(--ink3)',
      }}
      role="status"
    >
      <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9, letterSpacing: 0, textTransform: 'none', marginBottom: 2 }}>
        Aguardando resultado revisável
      </div>
      <div style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 11.5, fontStyle: 'normal' }}>
        Sem revisão real pendente. Approve/Reject/Rollback ficam ocultos até o Forge
        emitir review packet — Atlas nunca infere completion no frontend.
      </div>
    </div>
  )
}

function GovernanceGateRow({ run }: { run: ProgrammingGateRunSnapshot }) {
  const tone = governanceTone(run.status, run.blocking)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '16px 1fr auto',
        gap: 8,
        padding: '6px 8px',
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: 2,
        alignItems: 'baseline',
      }}
    >
      <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 11, color: tone.color }}>{tone.glyph}</span>
      <div style={{ display: 'grid', gap: 2 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink)' }}>
          {run.gateName}
          {run.blocking ? (
            <span
              style={{
                marginLeft: 6,
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 8,
                letterSpacing: 0,
                color: 'var(--rec-red)',
                textTransform: 'none',
              }}
            >
              blocking
            </span>
          ) : null}
        </span>
        {run.reason ? (
          <span style={{ fontSize: 10.5, color: 'var(--ink3)', lineHeight: 1.35 }}>{run.reason}</span>
        ) : null}
        {run.waiverReason ? (
          <span
            style={{
              fontSize: 10,
              color: 'var(--bronze)',
              fontFamily: 'var(--cc-font-mono)',
            }}
          >
            waiver · {run.waiverReason}
          </span>
        ) : null}
      </div>
      <span
        style={{
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 8,
          letterSpacing: 0,
          color: tone.color,
          textTransform: 'none',
        }}
      >
        {run.status}
      </span>
    </div>
  )
}

function governanceTone(status: string, blocking: boolean) {
  if (status === 'passed') {
    return {
      bg: 'var(--moss-veil)',
      border: 'var(--moss-soft)',
      color: 'var(--moss)',
      glyph: '✓',
    }
  }
  if (status === 'failed') {
    return blocking
      ? {
          bg: 'var(--rec-red-veil, rgba(138,48,37,0.12))',
          border: 'var(--rec-red, #8a3025)',
          color: 'var(--rec-red)',
          glyph: '✗',
        }
      : {
          bg: 'var(--rec-red-veil)',
          border: 'var(--rec-red-soft)',
          color: 'var(--rec-red)',
          glyph: '✗',
        }
  }
  if (status === 'waived') {
    return {
      bg: 'var(--bronze-veil)',
      border: 'var(--bronze-soft)',
      color: 'var(--bronze)',
      glyph: '◇',
    }
  }
  if (status === 'skipped') {
    return {
      bg: 'var(--cream)',
      border: 'var(--hair)',
      color: 'var(--ink3)',
      glyph: '⊘',
    }
  }
  return {
    bg: 'var(--cream)',
    border: 'var(--hair)',
    color: 'var(--ink3)',
    glyph: '○',
  }
}

function LegacyGateRow({
  gate,
  busy,
  onRun,
}: {
  gate: QualityGate
  busy: boolean
  onRun: () => void
}) {
  const tone =
    gate.state === 'passed'
      ? { bg: 'var(--moss-veil)', border: 'var(--moss-soft)', color: 'var(--moss)', glyph: '✓' }
      : gate.state === 'failed'
        ? { bg: 'var(--rec-red-veil)', border: 'var(--rec-red-soft)', color: 'var(--rec-red)', glyph: '✗' }
        : gate.state === 'blocked'
          ? { bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)', color: 'var(--bronze)', glyph: '△' }
          : { bg: 'var(--cream)', border: 'var(--hair)', color: 'var(--ink3)', glyph: '○' }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '16px 1fr auto auto',
        gap: 8,
        padding: '5px 7px',
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: 2,
        alignItems: 'baseline',
      }}
    >
      <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 11, color: tone.color }}>{tone.glyph}</span>
      <span style={{ fontSize: 11.5, color: 'var(--ink)' }}>{gate.name}</span>
      <span
        style={{
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 8,
          letterSpacing: 0,
          color: tone.color,
          textTransform: 'none',
        }}
      >
        {gate.state}
      </span>
      <button
        type="button"
        onClick={onRun}
        disabled={busy}
        style={{
          padding: '1px 6px',
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 8,
          letterSpacing: '1px',
          textTransform: 'none',
          color: 'var(--bronze)',
          border: '1px solid var(--bronze-soft)',
          borderRadius: 2,
          background: 'transparent',
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        rodar
      </button>
    </div>
  )
}
