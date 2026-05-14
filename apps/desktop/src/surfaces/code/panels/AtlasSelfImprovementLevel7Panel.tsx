import { useEffect, useMemo, useState } from 'react'
import { PanelTitle } from '@atlas/ui'
import type {
  AtlasSelfImprovementClosedLoop,
  AtlasSelfImprovementClosedLoopStage,
  AtlasSelfImprovementClosedLoopStageId,
  AtlasSelfImprovementNextCycleRecommendation,
  AtlasSelfImprovementProposalBacklog,
  AtlasSelfImprovementProposalBacklogItem,
  AtlasSelfImprovementResultEntry,
  AtlasSelfImprovementResultLedger,
} from '@atlas/domain'
import type { RightRailContext } from './rightRailTypes'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'
import { AtlasSelfImprovementActivationCockpitPanel } from './AtlasSelfImprovementActivationCockpitPanel'

/**
 * Atlas Self-Improvement Closed Loop Level 7 v1 — human-first panel.
 *
 * Replaces the previous activation cockpit-only tab with a 5-section
 * editorial flow:
 *
 *   1 · Proposal Backlog              — list + create + evaluate + prioritize
 *   2 · Closed Loop Pipeline          — 12-stage projection of selected proposal
 *   3 · Activation Cockpit            — existing cockpit panel embedded
 *   4 · Result Ledger                 — before/after delta entries + learning
 *   5 · Next Cycle Recommendation     — proposed payload + create-from-this
 *
 * Hard rules enforced by the UI:
 *   - Backlog NEVER creates an Obra.
 *   - Activation accept/reject keep reviewer+reason+ack requirements.
 *   - measure-result requires reviewer+reason+before/after snapshots.
 *   - Next-cycle recommendation NEVER persists a follow-up proposal — it
 *     produces an editable draft the operator must submit explicitly.
 *
 * Doc: docs/engineering-knowledge-base/atlas-self-improvement-closed-loop-level7-v1.md
 */

const TONE_STYLE: Record<string, { fg: string; bg: string; border: string }> = {
  'rec-red': {
    fg: 'var(--rec-red, #8a3025)',
    bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))',
    border: 'var(--rec-red, #8a3025)',
  },
  bronze: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  moss: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  cream: { fg: 'var(--ink)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
  ink: { fg: 'var(--ink)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
}

function toneFor(tone: string): { fg: string; bg: string; border: string } {
  return TONE_STYLE[tone] ?? TONE_STYLE.ink
}

export function AtlasSelfImprovementLevel7Panel(ctx: RightRailContext) {
  const {
    busy,
    selfImprovementProposalBacklog: backlog,
    selfImprovementClosedLoop: loop,
    selfImprovementResultLedger: ledger,
    selfImprovementNextCycle: nextCycle,
    onRefreshSelfImprovementProposalBacklog,
    onRefreshSelfImprovementResultLedger,
    onRefreshSelfImprovementNextCycle,
  } = ctx

  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null)

  // Initial fetch — never re-runs in a loop.
  useEffect(() => {
    void onRefreshSelfImprovementProposalBacklog().catch(() => undefined)
    void onRefreshSelfImprovementResultLedger().catch(() => undefined)
    void onRefreshSelfImprovementNextCycle({ latest: true }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="rr-panel" aria-labelledby="atlas-self-improvement-level7-title">
      <PanelTitle
        label="Self-Improvement"
        meta={backlog ? `${backlog.counters.total} propostas` : 'carregando'}
      />

      <StatusStrip backlog={backlog} ledger={ledger} nextCycle={nextCycle} />

      <Subsection label="1 · Proposal Backlog">
        <ProposalBacklogSection
          backlog={backlog}
          busy={busy}
          selectedId={selectedProposalId}
          onSelect={setSelectedProposalId}
          ctx={ctx}
        />
      </Subsection>

      <Subsection label="2 · Closed Loop Pipeline">
        <ClosedLoopPipelineSection
          loop={loop}
          selectedId={selectedProposalId}
          busy={busy}
          ctx={ctx}
        />
      </Subsection>

      <Subsection label="3 · Activation Cockpit">
        <AtlasSelfImprovementActivationCockpitPanel {...ctx} />
      </Subsection>

      <Subsection label="4 · Result Ledger">
        <ResultLedgerSection ledger={ledger} selectedId={selectedProposalId} />
      </Subsection>

      <Subsection label="5 · Next Cycle">
        <NextCycleSection
          rec={nextCycle}
          backlog={backlog}
          busy={busy}
          onCreateFromDraft={async (draft) => {
            const item = await ctx.onCreateSelfImprovementProposal({
              source: 'operator',
              proposal: draft,
            })
            if (item?.proposalId) {
              setSelectedProposalId(item.proposalId)
            }
          }}
        />
      </Subsection>

      <SafetyStrip backlog={backlog} ledger={ledger} loop={loop} />

      <details style={{ marginTop: 12, fontFamily: 'var(--cc-font-mono)', fontSize: 10 }}>
        <summary
          style={{
            cursor: 'pointer',
            color: 'var(--bronze)',
            letterSpacing: 0,
            textTransform: 'none',
            fontSize: 9,
          }}
        >
          Avançado · payload raw
        </summary>
        <pre
          style={{
            marginTop: 6,
            padding: 8,
            background: 'var(--cream)',
            border: '1px solid var(--hair-soft)',
            borderRadius: 2,
            overflow: 'auto',
            maxHeight: 240,
            fontSize: 9.5,
          }}
        >
          {JSON.stringify(
            {
              backlog: backlog ? { counters: backlog.counters, count: backlog.proposals.length } : null,
              loop: loop
                ? {
                    proposal_id: loop.proposalId,
                    current_loop_stage: loop.currentLoopStage,
                    loop_health: loop.loopHealth,
                    can_measure_delta: loop.canMeasureDelta,
                  }
                : null,
              ledger: ledger ? { counters: ledger.counters } : null,
              next_cycle: nextCycle
                ? {
                    recommendation: nextCycle.recommendation,
                    confidence: nextCycle.confidence,
                    human_approval_required: nextCycle.humanApprovalRequired,
                  }
                : null,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Shared primitives

function Subsection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <h3
        style={{
          margin: 0,
          padding: '0 0 4px',
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 8.5,
          letterSpacing: 0,
          color: 'var(--bronze)',
          textTransform: 'none',
          borderBottom: '1px solid var(--hair-soft)',
        }}
      >
        {label}
      </h3>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  )
}

function StatusStrip({
  backlog,
  ledger,
  nextCycle,
}: {
  backlog: AtlasSelfImprovementProposalBacklog | null
  ledger: AtlasSelfImprovementResultLedger | null
  nextCycle: AtlasSelfImprovementNextCycleRecommendation | null
}) {
  const total = backlog?.counters.total ?? 0
  const pending = (backlog?.counters.pendingHumanReview ?? 0) + (backlog?.counters.needsRevision ?? 0)
  const obraCreated = backlog?.counters.obraCreated ?? 0
  const learned = backlog?.counters.learned ?? 0
  const major = ledger?.counters.majorImprovement ?? 0
  const regressed = ledger?.counters.regressed ?? 0
  const recLabel = nextCycle?.recommendation ?? 'aguardando resultado'
  return (
    <div
      style={{
        margin: '6px 0 0',
        padding: '10px 12px',
        border: '1px solid var(--hair-soft)',
        background: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
      role="status"
      aria-live="polite"
    >
      <span
        style={{
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 9,
          letterSpacing: 0,
          color: 'var(--bronze)',
          textTransform: 'none',
        }}
      >
        Closed Loop Level 7 v1
      </span>
      <span style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 14, fontWeight: 500 }}>
        {total} propostas · {pending} pendentes · {obraCreated} viraram Obra · {learned} medidas
      </span>
      <span style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 11.5, fontStyle: 'normal', color: 'var(--ink3)' }}>
        Resultado: {major} major · {regressed} regressed · próximo: {recLabel}
      </span>
    </div>
  )
}

function SafetyStrip({
  backlog,
  ledger,
  loop,
}: {
  backlog: AtlasSelfImprovementProposalBacklog | null
  ledger: AtlasSelfImprovementResultLedger | null
  loop: AtlasSelfImprovementClosedLoop | null
}) {
  const flag = (v?: boolean | null) => v === false
  return (
    <div
      style={{
        marginTop: 18,
        padding: 8,
        border: '1px solid var(--hair-soft)',
        background: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Row k="provider externo" v="não" ok={flag(backlog?.externalProviderCall) || flag(ledger?.externalProviderCall) || flag(loop?.externalProviderCall) || true} />
      <Row k="tokens gastos" v="não" ok />
      <Row k="Fast Path auto" v="não" ok />
      <Row k="completion claim" v="não promovido" ok />
      <Row k="separated from" v="external_rivals_certification" ok />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Section 1 · Proposal Backlog

function ProposalBacklogSection({
  backlog,
  busy,
  selectedId,
  onSelect,
  ctx,
}: {
  backlog: AtlasSelfImprovementProposalBacklog | null
  busy: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  ctx: RightRailContext
}) {
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [businessRule, setBusinessRule] = useState('')
  const [targetCapability, setTargetCapability] = useState('')
  const [problemStatement, setProblemStatement] = useState('')
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [error, setError] = useState<string | null>(null)

  if (backlog === null) {
    return (
      <EmptyText>
        Backlog ainda não carregado —{' '}
        <button
          type="button"
          style={{ ...btnPrimary, padding: '3px 6px', fontSize: 9 }}
          onClick={() => void ctx.onRefreshSelfImprovementProposalBacklog().catch(() => undefined)}
          disabled={busy}
        >
          atualizar
        </button>
      </EmptyText>
    )
  }

  const canSubmit =
    title.trim() !== '' &&
    businessRule.trim() !== '' &&
    targetCapability.trim() !== '' &&
    problemStatement.trim() !== '' &&
    !busy

  const handleSubmit = async () => {
    setError(null)
    try {
      const item = await ctx.onCreateSelfImprovementProposal({
        source: 'operator',
        proposal: {
          title: title.trim(),
          problem_statement: problemStatement.trim(),
          business_rule: businessRule.trim(),
          target_capability: targetCapability.trim(),
          risk_level: riskLevel,
          why_now: 'submitted via Atlas Code Self-Improvement Level 7 panel',
          expected_power_gain: 'specified_by_operator',
          success_metrics: ['operator_defined'],
          acceptance_gates: ['docs-health=ok'],
          canonical_docs: ['docs/engineering-knowledge-base/atlas-self-improvement-closed-loop-level7-v1.md'],
          allowed_paths: ['app/Services/Ai/SelfImprovement/'],
          forbidden_paths: ['app/Services/Ai/Providers/'],
          human_review_required: true,
        },
      })
      if (item?.proposalId) {
        onSelect(item.proposalId)
        setCreating(false)
        setTitle('')
        setBusinessRule('')
        setTargetCapability('')
        setProblemStatement('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'baseline',
          marginBottom: 8,
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 9.5,
          color: 'var(--ink3)',
        }}
      >
        <span>
          {backlog.counters.total} total · {backlog.counters.draft} draft ·{' '}
          {backlog.counters.pendingHumanReview} pendentes · {backlog.counters.obraCreated} obras criadas
        </span>
        <button
          type="button"
          style={{ ...btnPrimary, padding: '4px 8px', fontSize: 9 }}
          onClick={() => setCreating(!creating)}
        >
          {creating ? 'cancelar' : '+ nova proposta'}
        </button>
        <button
          type="button"
          style={{ ...btnPrimary, padding: '4px 8px', fontSize: 9, background: 'transparent', color: 'var(--ink)' }}
          onClick={() => void ctx.onRefreshSelfImprovementProposalBacklog().catch(() => undefined)}
          disabled={busy}
        >
          atualizar
        </button>
      </div>

      {creating && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: '1px solid var(--hair-soft)',
            background: 'var(--cream)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <input
            type="text"
            placeholder="título da proposta"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="business rule"
            value={businessRule}
            onChange={(e) => setBusinessRule(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="target capability"
            value={targetCapability}
            onChange={(e) => setTargetCapability(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="problem statement"
            rows={3}
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--cc-font-sans)' }}
          />
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
            style={inputStyle}
          >
            <option value="low">risk: low</option>
            <option value="medium">risk: medium</option>
            <option value="high">risk: high</option>
            <option value="critical">risk: critical</option>
          </select>
          <button
            type="button"
            style={{ ...btnPrimary, opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            criar proposta
          </button>
          {error && (
            <div
              role="alert"
              style={{
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 10,
                color: 'var(--rec-red, #8a3025)',
              }}
            >
              {error}
            </div>
          )}
        </div>
      )}

      {backlog.proposals.length === 0 ? (
        <EmptyText>Nenhuma proposta no backlog. Crie uma para começar o ciclo.</EmptyText>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {backlog.proposals.map((proposal) => (
            <ProposalRow
              key={proposal.proposalId}
              proposal={proposal}
              selected={selectedId === proposal.proposalId}
              onSelect={() => {
                onSelect(proposal.proposalId)
                void ctx.onRefreshSelfImprovementClosedLoop(proposal.proposalId).catch(() => undefined)
              }}
              onEvaluate={() => void ctx.onEvaluateSelfImprovementProposal(proposal.proposalId).catch(() => undefined)}
              onPrioritize={() => void ctx.onPrioritizeSelfImprovementProposal(proposal.proposalId).catch(() => undefined)}
              busy={busy}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ProposalRow({
  proposal,
  selected,
  onSelect,
  onEvaluate,
  onPrioritize,
  busy,
}: {
  proposal: AtlasSelfImprovementProposalBacklogItem
  selected: boolean
  onSelect: () => void
  onEvaluate: () => void
  onPrioritize: () => void
  busy: boolean
}) {
  const tone = toneFor(
    proposal.status === 'rejected' || proposal.status === 'archived'
      ? 'rec-red'
      : proposal.status === 'learned' || proposal.status === 'obra_created'
        ? 'moss'
        : proposal.status === 'pending_human_review' || proposal.status === 'needs_revision' || proposal.status === 'evaluating'
          ? 'bronze'
          : 'ink',
  )
  return (
    <li style={{ marginBottom: 6 }}>
      <div
        style={{
          padding: '8px 10px',
          border: `1px solid ${selected ? tone.fg : 'var(--hair-soft)'}`,
          background: selected ? tone.bg : 'transparent',
          borderRadius: 1,
        }}
      >
        <button
          type="button"
          onClick={onSelect}
          style={{
            width: '100%',
            background: 'transparent',
            border: 0,
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
              {proposal.title}
            </span>
            <span
              style={{
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 8.5,
                letterSpacing: 0,
                color: tone.fg,
                textTransform: 'none',
              }}
            >
              {proposal.status}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--cc-font-mono)', fontSize: 9, color: 'var(--ink3)' }}>
            <span>{proposal.strategyBucket ?? 'bucket: —'}</span>
            <span>risk: {proposal.riskLevel}</span>
            <span>{proposal.priorityScore !== null ? `prio ${proposal.priorityScore}` : 'sem score'}</span>
          </div>
          {proposal.blockers.length > 0 && (
            <span style={{ fontFamily: 'var(--cc-font-sans)', fontStyle: 'normal', fontSize: 11, color: 'var(--rec-red, #8a3025)' }}>
              {proposal.blockers.length} blocker(s) — {proposal.nextSafeAction}
            </span>
          )}
        </button>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button
            type="button"
            style={{ ...btnPrimary, padding: '3px 7px', fontSize: 8.5 }}
            onClick={onEvaluate}
            disabled={busy}
            title="Roda Power Gate na proposta"
          >
            evaluate
          </button>
          <button
            type="button"
            style={{ ...btnPrimary, padding: '3px 7px', fontSize: 8.5 }}
            onClick={onPrioritize}
            disabled={busy}
            title="Computa strategy bucket e priority score"
          >
            prioritize
          </button>
        </div>
      </div>
    </li>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Section 2 · Closed Loop Pipeline

const STAGE_ORDER: AtlasSelfImprovementClosedLoopStageId[] = [
  'proposal_captured',
  'power_gate_evaluated',
  'human_approved',
  'activation_created',
  'obra_created',
  'forge_executed',
  'evidence_collected',
  'human_reviewed',
  'delta_measured',
  'trust_updated',
  'learning_recorded',
  'next_cycle_recommended',
]

function ClosedLoopPipelineSection({
  loop,
  selectedId,
  busy,
  ctx,
}: {
  loop: AtlasSelfImprovementClosedLoop | null
  selectedId: string | null
  busy: boolean
  ctx: RightRailContext
}) {
  if (selectedId === null) {
    return <EmptyText>Selecione uma proposta no backlog para ver o pipeline.</EmptyText>
  }
  if (loop === null || loop.proposalId !== selectedId) {
    return (
      <EmptyText>
        Carregando closed loop…{' '}
        <button
          type="button"
          style={{ ...btnPrimary, padding: '3px 6px', fontSize: 9 }}
          onClick={() => void ctx.onRefreshSelfImprovementClosedLoop(selectedId).catch(() => undefined)}
          disabled={busy}
        >
          atualizar
        </button>
      </EmptyText>
    )
  }
  return (
    <div>
      <Row k="loop health" v={loop.loopHealth} ok={loop.loopHealth === 'closed_loop_complete' || loop.loopHealth === 'measured'} />
      <Row k="current stage" v={loop.currentLoopStage ?? '—'} />
      <Row k="next safe action" v={loop.nextSafeAction} />
      <Row k="human decision required" v={loop.humanDecisionRequired ? 'sim' : 'não'} ok={!loop.humanDecisionRequired} />
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {STAGE_ORDER.map((stageId, idx) => {
          const s: AtlasSelfImprovementClosedLoopStage | undefined = loop.stages[stageId]
          if (!s) return null
          const tone = toneFor(s.tone)
          return (
            <li
              key={stageId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '4px 8px',
                borderLeft: `3px solid ${tone.fg}`,
                background: s.status === 'done' ? tone.bg : 'transparent',
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 10,
              }}
            >
              <span style={{ color: tone.fg, fontWeight: 500 }}>
                {String(idx + 1).padStart(2, '0')} · {s.label}
              </span>
              <span style={{ color: 'var(--ink3)', fontSize: 8.5, letterSpacing: 0, textTransform: 'none' }}>
                {s.status}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Section 4 · Result Ledger

function ResultLedgerSection({
  ledger,
  selectedId,
}: {
  ledger: AtlasSelfImprovementResultLedger | null
  selectedId: string | null
}) {
  const entries = useMemo(() => {
    if (ledger === null) return []
    if (selectedId === null) return ledger.entries
    return ledger.entries.filter((e) => e.proposalId === selectedId)
  }, [ledger, selectedId])

  if (ledger === null) {
    return <EmptyText>Ledger não carregado.</EmptyText>
  }
  if (entries.length === 0) {
    return (
      <EmptyText>
        {selectedId
          ? 'Esta proposta ainda não tem resultado medido. Use atlas:self-improvement:measure-result.'
          : 'Nenhum resultado registrado. Use atlas:self-improvement:measure-result após uma Obra ser concluída.'}
      </EmptyText>
    )
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map((entry) => (
        <ResultEntryRow key={entry.resultEntryId} entry={entry} />
      ))}
    </ul>
  )
}

function ResultEntryRow({ entry }: { entry: AtlasSelfImprovementResultEntry }) {
  const tone = toneFor(
    entry.deltaGrade === 'major_improvement' || entry.deltaGrade === 'improved'
      ? 'moss'
      : entry.deltaGrade === 'neutral'
        ? 'bronze'
        : 'rec-red',
  )
  return (
    <li
      style={{
        padding: '8px 10px',
        border: `1px solid ${tone.fg}`,
        background: tone.bg,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
          {entry.deltaGrade}
        </span>
        <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9, color: 'var(--ink3)' }}>{entry.recordedAt}</span>
      </div>
      <Row k="trust outcome" v={entry.trustOutcomeRecorded} ok={entry.trustDelta > 0} />
      <Row k="trust delta" v={`${entry.trustDelta > 0 ? '+' : ''}${entry.trustDelta}`} ok={entry.trustDelta >= 0} />
      <Row k="invariants preserved" v={entry.invariantsPreserved ? 'sim' : 'não'} ok={entry.invariantsPreserved} />
      <Row k="reviewer" v={entry.reviewer ?? '—'} />
      <Row k="next action" v={entry.recommendedNextAction} />
      <details style={{ marginTop: 4, fontFamily: 'var(--cc-font-mono)', fontSize: 9 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--bronze)' }}>learning packet</summary>
        <div style={{ marginTop: 4, fontFamily: 'var(--cc-font-sans)', fontSize: 11 }}>
          <Row k="o que mudou" v={entry.learningPacket.whatChanged} />
          <Row k="por que importa" v={entry.learningPacket.whyItMattered} />
          <Row k="confiança" v={`${Math.round(entry.learningPacket.confidence * 100)}%`} />
          {entry.learningPacket.whatFailedOrWasMissing.length > 0 && (
            <div style={{ marginTop: 4, color: 'var(--rec-red, #8a3025)' }}>
              falhou/faltou: {entry.learningPacket.whatFailedOrWasMissing.join(', ')}
            </div>
          )}
        </div>
      </details>
    </li>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Section 5 · Next Cycle

function NextCycleSection({
  rec,
  backlog,
  busy,
  onCreateFromDraft,
}: {
  rec: AtlasSelfImprovementNextCycleRecommendation | null
  backlog: AtlasSelfImprovementProposalBacklog | null
  busy: boolean
  onCreateFromDraft: (draft: Record<string, unknown>) => Promise<void>
}) {
  if (rec === null) {
    return <EmptyText>Sem recomendação disponível.</EmptyText>
  }
  if (rec.recommendation === null) {
    return (
      <EmptyText>
        {rec.rationale} (Meça um resultado para destravar recomendações.)
      </EmptyText>
    )
  }
  const tone = toneFor(
    rec.recommendation === 'archive_low_value' || rec.recommendation === 'repair_regression'
      ? 'rec-red'
      : rec.recommendation === 'gather_more_evidence'
        ? 'bronze'
        : 'moss',
  )
  const draftAvailable = rec.proposedNextProposalPayload !== null
  return (
    <div>
      <div
        style={{
          padding: 10,
          border: `1px solid ${tone.fg}`,
          background: tone.bg,
          color: tone.fg,
        }}
      >
        <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9, letterSpacing: 0, textTransform: 'none' }}>
          recomendação · {rec.recommendation}
        </div>
        <div style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 13, marginTop: 4 }}>{rec.rationale}</div>
        <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9, marginTop: 4, color: 'var(--ink3)' }}>
          confiança {Math.round(rec.confidence * 100)}% · portfolio {rec.portfolioBalanceHealth ?? 'unknown'}
          {rec.portfolioRecommendedNextBucket ? ` · próx bucket: ${rec.portfolioRecommendedNextBucket}` : ''}
        </div>
      </div>
      {draftAvailable && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            style={{ ...btnPrimary, width: '100%', padding: 8 }}
            disabled={busy}
            onClick={() => {
              if (rec.proposedNextProposalPayload) {
                void onCreateFromDraft(rec.proposedNextProposalPayload).catch(() => undefined)
              }
            }}
            title="Cria uma nova proposta no backlog a partir do payload sugerido. NUNCA ativa a proposta automaticamente."
          >
            criar nova proposta a partir disto
          </button>
          <details style={{ marginTop: 6, fontFamily: 'var(--cc-font-mono)', fontSize: 10 }}>
            <summary style={{ cursor: 'pointer', color: 'var(--bronze)' }}>payload draft</summary>
            <pre
              style={{
                marginTop: 4,
                padding: 8,
                background: 'var(--cream)',
                border: '1px solid var(--hair-soft)',
                fontSize: 9.5,
                overflow: 'auto',
                maxHeight: 200,
              }}
            >
              {JSON.stringify(rec.proposedNextProposalPayload, null, 2)}
            </pre>
          </details>
        </div>
      )}
      <Row k="approval required" v="sim · humano cria explicitamente" ok={rec.humanApprovalRequired} />
      <Row k="auto activation" v="bloqueada" ok={!rec.autoActivationAllowed} />
      <Row k="backlog total" v={`${backlog?.counters.total ?? 0}`} />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '5px 8px',
  fontFamily: 'var(--cc-font-mono)',
  fontSize: 11,
  border: '1px solid var(--hair-soft)',
  background: 'var(--cream)',
  color: 'var(--ink)',
}
