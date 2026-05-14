import { useEffect, useMemo, useState } from 'react'
import { PanelTitle } from '@atlas/ui'
import type {
  AtlasSelfImprovementActivationCockpit,
  AtlasSelfImprovementActivationDetail,
  AtlasSelfImprovementActivationListItem,
  AtlasSelfImprovementActivationTone,
} from '@atlas/domain'
import type { RightRailContext } from './rightRailTypes'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

/**
 * Atlas Self-Improvement Activation Cockpit v1 — human-first panel.
 *
 * Reads `selfImprovementActivationCockpit` (schema
 * `atlas.self_improvement.activation_cockpit.v1`) and renders the
 * complete proposal → power gate → before snapshot → approval → Obra
 * flow as editorial linear sections (NEVER a 2D grid for time-ordered
 * content, per canon).
 *
 * Hard rules enforced by the UI:
 *   - Accept/Reject ALWAYS require reviewer + reason;
 *   - Accept ALSO requires explicit no-fast-path acknowledgement;
 *   - NEVER triggers a provider call;
 *   - NEVER triggers Fast Path automatically;
 *   - NEVER promotes a completion claim;
 *   - "Abrir Obra" only switches the current Forge context — it does not
 *     spend tokens or unlock Rivals.
 *
 * Doc: docs/engineering-knowledge-base/atlas-self-improvement-activation-cockpit-v1.md
 */
type FilterKey = 'all' | 'pending' | 'accepted' | 'rejected' | 'with_obra'

const TONE_STYLE: Record<AtlasSelfImprovementActivationTone, { fg: string; bg: string; border: string }> = {
  'rec-red': { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  bronze: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  moss: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  cream: { fg: 'var(--ink)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
  ink: { fg: 'var(--ink)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
}

function toneFor(tone: AtlasSelfImprovementActivationTone): { fg: string; bg: string; border: string } {
  return TONE_STYLE[tone] ?? TONE_STYLE.ink
}

export function AtlasSelfImprovementActivationCockpitPanel(ctx: RightRailContext) {
  const {
    busy,
    selfImprovementActivationCockpit: cockpit,
    onRefreshSelfImprovementActivationCockpit,
    onSelectSelfImprovementActivation,
    onAcceptSelfImprovementForgeActivation,
    onRejectSelfImprovementForgeActivation,
    onRefreshForgeWorkIntake,
  } = ctx

  const [filter, setFilter] = useState<FilterKey>('all')

  // Auto-refresh on first mount when nothing loaded yet — never re-fetches in
  // a loop; the user must click "Atualizar" explicitly afterwards.
  useEffect(() => {
    if (cockpit === null) {
      void onRefreshSelfImprovementActivationCockpit().catch(() => undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Memoize the filtered list at the top so hook order stays stable even when
  // the cockpit payload is null. We fall back to an empty array — the early
  // return below renders the empty-state UI without consulting this value.
  const filteredActivations = useMemo(
    () => (cockpit !== null ? filterActivations(cockpit.activations, filter) : []),
    [cockpit, filter],
  )

  if (cockpit === null) {
    return (
      <section className="rr-panel" aria-labelledby="atlas-self-improvement-cockpit-title">
        <PanelTitle label="Self-Improvement" meta="aguardando" />
        <EmptyText>Cockpit ainda não carregado — clique em atualizar.</EmptyText>
        <button
          type="button"
          style={btnPrimary}
          onClick={() => {
            void onRefreshSelfImprovementActivationCockpit().catch(() => undefined)
          }}
          disabled={busy}
        >
          atualizar
        </button>
      </section>
    )
  }

  const counters = cockpit.counters
  const selected = cockpit.selectedActivation

  return (
    <section className="rr-panel" aria-labelledby="atlas-self-improvement-cockpit-title">
      <PanelTitle label="Self-Improvement" meta={`${counters.total} activations`} />

      {/* 1 · Status strip */}
      <StatusStrip cockpit={cockpit} />

      {/* 2 · Propostas (lista + filtros) */}
      <Subsection label="Propostas">
        <FilterBar value={filter} onChange={setFilter} counters={counters} />
        {filteredActivations.length === 0 ? (
          <EmptyText>Nenhuma activation para o filtro selecionado.</EmptyText>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0' }}>
            {filteredActivations.map((row) => (
              <ActivationRow
                key={row.activationId}
                row={row}
                selected={selected?.activationId === row.activationId}
                onPick={() => {
                  void onSelectSelfImprovementActivation(row.activationId).catch(() => undefined)
                }}
              />
            ))}
          </ul>
        )}
      </Subsection>

      {selected !== null && (
        <>
          {/* 3 · Avaliação · proposal + power gate humanizado */}
          <Subsection label="Avaliação">
            <ProposalSummaryView selected={selected} />
            <PowerGateView selected={selected} />
          </Subsection>

          {/* 4 · Before snapshot */}
          <Subsection label="Before Snapshot">
            <BeforeSnapshotView selected={selected} />
          </Subsection>

          {/* 5 · Aprovação · accept / reject — form state is internal so that
             selecting a different activation naturally resets via the `key`
             prop (no setState-in-effect). */}
          <Subsection label="Aprovação">
            <ApprovalForm
              key={selected.activationId ?? 'none'}
              selected={selected}
              busy={busy}
              onAccept={(payload) => onAcceptSelfImprovementForgeActivation(selected.activationId ?? '', payload).then(() => undefined)}
              onReject={(payload) => onRejectSelfImprovementForgeActivation(selected.activationId ?? '', payload).then(() => undefined)}
            />
          </Subsection>

          {/* 6 · Obra criada + Abrir */}
          <Subsection label="Obra criada">
            <CreatedObraView
              selected={selected}
              busy={busy}
              onOpenObra={async () => {
                const obraId = selected.openObraAction.obraId
                if (!obraId) return
                // Switching the Forge context is the safest "open" we have —
                // it never executes Fast Path automatically.
                await ctx.onRefreshForgeUxOrchestrator().catch(() => undefined)
                await onRefreshForgeWorkIntake().catch(() => undefined)
              }}
            />
          </Subsection>

          {/* 7 · Histórico / Trust */}
          <Subsection label="Histórico / Trust">
            <TrustHistoryView cockpit={cockpit} selected={selected} />
          </Subsection>
        </>
      )}

      {/* 8 · Safety strip (sempre visível) */}
      <SafetyStrip cockpit={cockpit} />

      {/* 9 · Advanced disclosure · JSON raw para auditoria */}
      <details style={{ marginTop: 12, fontFamily: 'var(--mono)', fontSize: 10 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--bronze)', letterSpacing: '1.3px', textTransform: 'uppercase', fontSize: 9 }}>
          Avançado · hashes + evidence
        </summary>
        <pre style={{ marginTop: 6, padding: 8, background: 'var(--cream)', border: '1px solid var(--hair-soft)', borderRadius: 2, overflow: 'auto', maxHeight: 220, fontSize: 9.5 }}>
          {JSON.stringify(
            {
              schema_version: cockpit.schemaVersion,
              generated_at: cockpit.generatedAt,
              counters: cockpit.counters,
              selected: selected
                ? {
                    activation_id: selected.activationId,
                    status: selected.status,
                    approval_state: selected.approvalState,
                    receipt_hash: selected.approvalReceipt?.receiptHash ?? null,
                    proposal_hash: selected.approvalReceipt?.proposalHash ?? null,
                    evidence_refs: selected.evidenceRefs,
                  }
                : null,
              commands: cockpit.commands,
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
// Sub-components — kept colocated to preserve editorial reading order.

function Subsection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <h3
        style={{
          margin: 0,
          padding: '0 0 4px',
          fontFamily: 'var(--mono)',
          fontSize: 8.5,
          letterSpacing: '1.5px',
          color: 'var(--bronze)',
          textTransform: 'uppercase',
          borderBottom: '1px solid var(--hair-soft)',
        }}
      >
        {label}
      </h3>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  )
}

function StatusStrip({ cockpit }: { cockpit: AtlasSelfImprovementActivationCockpit }) {
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
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '1.3px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
        Atlas Self-Improvement Activation Cockpit v1
      </span>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 500 }}>{cockpit.humanSummary || '—'}</span>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 11.5, fontStyle: 'italic', color: 'var(--ink3)' }}>{cockpit.nextSafeAction || '—'}</span>
    </div>
  )
}

function FilterBar({
  value,
  onChange,
  counters,
}: {
  value: FilterKey
  onChange: (next: FilterKey) => void
  counters: AtlasSelfImprovementActivationCockpit['counters']
}) {
  const items: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: 'all', label: 'Todas', count: counters.total },
    { key: 'pending', label: 'Pendentes', count: counters.pendingHumanReview + counters.needsRevision },
    { key: 'accepted', label: 'Aceitas', count: counters.accepted + counters.obraCreated },
    { key: 'rejected', label: 'Rejeitadas', count: counters.rejected + counters.blocked },
    { key: 'with_obra', label: 'Com Obra', count: counters.withObra },
  ]
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
      {items.map((item) => {
        const active = value === item.key
        return (
          <button
            key={item.key}
            type="button"
            style={{
              padding: '4px 8px',
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              border: `1px solid ${active ? 'var(--ink)' : 'var(--hair-soft)'}`,
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--cream)' : 'var(--ink2)',
              cursor: 'pointer',
              borderRadius: 1,
            }}
            onClick={() => onChange(item.key)}
            aria-pressed={active}
          >
            {item.label} · {item.count}
          </button>
        )
      })}
    </div>
  )
}

function filterActivations(
  list: AtlasSelfImprovementActivationListItem[],
  filter: FilterKey,
): AtlasSelfImprovementActivationListItem[] {
  if (filter === 'all') return list
  if (filter === 'pending') {
    return list.filter((item) => item.status === 'pending_human_review' || item.status === 'needs_revision')
  }
  if (filter === 'accepted') {
    return list.filter((item) => item.status === 'accepted' || item.status === 'obra_created')
  }
  if (filter === 'rejected') {
    return list.filter((item) => item.status === 'rejected' || item.status === 'blocked')
  }
  if (filter === 'with_obra') {
    return list.filter((item) => item.createdObraId !== null)
  }
  return list
}

function ActivationRow({
  row,
  selected,
  onPick,
}: {
  row: AtlasSelfImprovementActivationListItem
  selected: boolean
  onPick: () => void
}) {
  const tone = toneFor(row.tone)
  return (
    <li style={{ margin: '4px 0' }}>
      <button
        type="button"
        onClick={onPick}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '8px 10px',
          border: `1px solid ${selected ? tone.fg : 'var(--hair-soft)'}`,
          background: selected ? tone.bg : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          borderRadius: 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{row.title}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '1.2px', color: tone.fg, textTransform: 'uppercase' }}>
            {row.statusLabel}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink3)' }}>
          <span>{row.strategyBucket ?? 'bucket: —'}</span>
          <span>{row.riskLevel ? `risk: ${row.riskLevel}` : 'risk: —'}</span>
          <span>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—'}</span>
        </div>
        {row.hasBlockers && (
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--rec-red, #8a3025)' }}>
            {row.blockersCount} blocker(s) — {row.nextSafeAction}
          </span>
        )}
      </button>
    </li>
  )
}

function ProposalSummaryView({ selected }: { selected: AtlasSelfImprovementActivationDetail }) {
  const proposal = selected.proposalSummary
  if (!proposal) {
    return <EmptyText>Proposta não disponível neste estado.</EmptyText>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Row k="título" v={proposal.title} />
      {proposal.problemStatement && <Row k="problema" v={proposal.problemStatement} />}
      {proposal.businessRule && <Row k="regra de negócio" v={proposal.businessRule} />}
      {proposal.targetCapability && <Row k="capacidade alvo" v={proposal.targetCapability} />}
      {proposal.whyNow && <Row k="por que agora" v={proposal.whyNow} />}
      {proposal.expectedPowerGain && <Row k="ganho esperado" v={proposal.expectedPowerGain} />}
      {proposal.riskLevel && <Row k="risco" v={proposal.riskLevel} />}
      <Row
        k="proposta cria Obra?"
        v="sim — apenas se o humano aceitar"
        ok={proposal.createsObra}
      />
      <Row k="executa Fast Path automático?" v="não · sempre humano" ok />
      <Row k="chama provider externo?" v="não · sem aprovação explícita" ok />
    </div>
  )
}

function PowerGateView({ selected }: { selected: AtlasSelfImprovementActivationDetail }) {
  const gate = selected.powerGate
  if (!gate) {
    return <EmptyText>Power gate ainda não avaliado.</EmptyText>
  }
  const tone = toneFor(gate.tone)
  return (
    <div
      style={{
        marginTop: 8,
        padding: '8px 10px',
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        color: tone.fg,
      }}
    >
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '1.3px', textTransform: 'uppercase' }}>
        power gate · {gate.outcome}
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 13, marginTop: 2 }}>{gate.label}</div>
      {gate.hardFails.length > 0 && (
        <ul style={{ marginTop: 6, paddingLeft: 18, fontFamily: 'var(--mono)', fontSize: 10 }}>
          {gate.hardFails.map((h) => (
            <li key={`hard-${h}`}>hard fail · {h}</li>
          ))}
        </ul>
      )}
      {gate.softFindings.length > 0 && (
        <ul style={{ marginTop: 4, paddingLeft: 18, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink2)' }}>
          {gate.softFindings.map((s) => (
            <li key={`soft-${s}`}>soft finding · {s}</li>
          ))}
        </ul>
      )}
      {gate.nextAction && (
        <div style={{ marginTop: 6, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11 }}>
          próxima ação → {gate.nextAction}
        </div>
      )}
    </div>
  )
}

function BeforeSnapshotView({ selected }: { selected: AtlasSelfImprovementActivationDetail }) {
  const snap = selected.beforeSnapshot
  if (!snap) {
    return <EmptyText>Snapshot baseline não disponível.</EmptyText>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Row k="maturidade" v={snap.maturity.label} />
      <Row k="invariant lock" v={`${snap.invariantLock.status} · ${snap.invariantLock.violationsCount} violações`} ok={snap.invariantLock.status === 'passed'} />
      <Row k="regression sentinel" v={`${snap.regressionSentinel.status} · ${snap.regressionSentinel.findingsCount} findings`} ok={snap.regressionSentinel.status === 'clear'} />
      <Row k="strategy portfolio" v={`${snap.strategyPortfolio.balanceHealth}${snap.strategyPortfolio.recommendedNextBucket ? ` · próx: ${snap.strategyPortfolio.recommendedNextBucket}` : ''}`} />
      <Row k="trust band" v={`${snap.trustLedger.trustBand} · ${snap.trustLedger.entryCount} entradas`} ok={snap.trustLedger.trustBand === 'high_trust'} />
      <Row
        k="docs canônicas"
        v={`${snap.docsStatus.requiredPresentCount}/${snap.docsStatus.requiredCount} presentes`}
        ok={snap.docsStatus.requiredPresentCount === snap.docsStatus.requiredCount}
      />
      {snap.docsStatus.missingRequired.length > 0 && (
        <EmptyText>Faltam docs: {snap.docsStatus.missingRequired.join(', ')}</EmptyText>
      )}
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--ink3)', marginTop: 4 }}>
        {snap.rationale}
      </div>
    </div>
  )
}

function ApprovalForm({
  selected,
  busy,
  onAccept,
  onReject,
}: {
  selected: AtlasSelfImprovementActivationDetail
  busy: boolean
  onAccept: (payload: { reviewer: string; reason: string; acknowledgesNoFastPath: boolean }) => Promise<void>
  onReject: (payload: { reviewer: string; reason: string }) => Promise<void>
}) {
  const [reviewer, setReviewer] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [acknowledgesNoFastPath, setAcknowledgesNoFastPath] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const onReviewerChange = setReviewer
  const onReasonChange = setReason
  const onAckChange = setAcknowledgesNoFastPath

  const submitAccept = async () => {
    setError(null)
    try {
      await onAccept({ reviewer, reason, acknowledgesNoFastPath })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  const submitReject = async () => {
    setError(null)
    try {
      await onReject({ reviewer, reason })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const decisionAlreadyTaken =
    selected.status === 'obra_created' ||
    selected.status === 'accepted' ||
    selected.status === 'rejected'

  if (decisionAlreadyTaken) {
    if (selected.approvalReceipt) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Row k="estado" v={selected.statusLabel} ok={selected.tone === 'moss'} />
          <Row k="reviewer" v={selected.approvalReceipt.reviewer ?? '—'} />
          <Row k="motivo" v={selected.approvalReceipt.reason ?? '—'} />
          <Row k="aprovado em" v={selected.approvalReceipt.approvedAt ?? '—'} />
          <Row k="receipt hash" v={(selected.approvalReceipt.receiptHash ?? '—').slice(0, 24) + '…'} mono />
        </div>
      )
    }
    if (selected.rejection) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Row k="estado" v={selected.statusLabel} />
          <Row k="reviewer" v={selected.rejection.reviewer ?? '—'} />
          <Row k="motivo" v={selected.rejection.reason ?? '—'} />
          <Row k="rejeitada em" v={selected.rejection.rejectedAt ?? '—'} />
        </div>
      )
    }
    return <EmptyText>Decisão registrada — sem detalhes adicionais.</EmptyText>
  }

  // Strict blocked states: cannot accept / cannot reject.
  if (selected.status === 'blocked' && selected.blockers.length > 0) {
    return (
      <div>
        <EmptyText>Activation bloqueada — não pode virar Obra.</EmptyText>
        <ul style={{ marginTop: 4, paddingLeft: 16, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red, #8a3025)' }}>
          {selected.blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    )
  }

  const acceptDisabled = !reviewer.trim() || !reason.trim() || !acknowledgesNoFastPath || busy
  const rejectDisabled = !reviewer.trim() || !reason.trim() || busy

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '1.2px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
          reviewer
        </span>
        <input
          type="text"
          value={reviewer}
          onChange={(e) => onReviewerChange(e.target.value)}
          placeholder="quem está aprovando?"
          style={{
            padding: '6px 8px',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            border: '1px solid var(--hair-soft)',
            background: 'var(--cream)',
            color: 'var(--ink)',
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '1.2px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
          motivo
        </span>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="por que aprovar/rejeitar?"
          rows={3}
          style={{
            padding: '6px 8px',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            border: '1px solid var(--hair-soft)',
            background: 'var(--cream)',
            color: 'var(--ink)',
            resize: 'vertical',
          }}
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontFamily: 'var(--serif)', fontSize: 12 }}>
        <input
          type="checkbox"
          checked={acknowledgesNoFastPath}
          onChange={(e) => onAckChange(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span>
          Entendo que isso <strong>cria uma Obra</strong>, mas <strong>não executa Forge automaticamente</strong>.
        </span>
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          style={{
            ...btnPrimary,
            flex: 1,
            background: 'var(--moss)',
            borderColor: 'var(--moss)',
            opacity: acceptDisabled ? 0.45 : 1,
            cursor: acceptDisabled ? 'not-allowed' : 'pointer',
          }}
          onClick={() => {
            void submitAccept().catch(() => undefined)
          }}
          disabled={acceptDisabled}
        >
          aceitar · criar Obra
        </button>
        <button
          type="button"
          style={{
            ...btnPrimary,
            flex: 1,
            background: 'var(--rec-red, #8a3025)',
            borderColor: 'var(--rec-red, #8a3025)',
            opacity: rejectDisabled ? 0.45 : 1,
            cursor: rejectDisabled ? 'not-allowed' : 'pointer',
          }}
          onClick={() => {
            void submitReject().catch(() => undefined)
          }}
          disabled={rejectDisabled}
        >
          rejeitar
        </button>
      </div>
      {error && (
        <div role="alert" style={{ padding: 6, border: '1px solid var(--rec-red, #8a3025)', background: 'var(--rec-red-veil, rgba(138,48,37,0.08))', color: 'var(--rec-red, #8a3025)', fontFamily: 'var(--mono)', fontSize: 10 }}>
          {error}
        </div>
      )}
    </div>
  )
}

function CreatedObraView({
  selected,
  busy,
  onOpenObra,
}: {
  selected: AtlasSelfImprovementActivationDetail
  busy: boolean
  onOpenObra: () => Promise<void>
}) {
  const obra = selected.createdObra
  if (!obra) {
    return <EmptyText>Nenhuma Obra criada — aceite a activation para materializar.</EmptyText>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Row k="obra id" v={obra.obraId.slice(0, 12) + '…'} mono />
      <Row k="título" v={obra.title} />
      <Row k="intake" v={obra.intakeStatus === 'filled' ? 'preenchido' : 'pendente'} ok={obra.intakeStatus === 'filled'} />
      {obra.objective && <Row k="objetivo" v={obra.objective} />}
      {obra.businessRule && <Row k="regra de negócio" v={obra.businessRule} />}
      <Row k="acceptance criteria" v={`${obra.acceptanceCriteriaCount} item(ns)`} />
      <Row k="docs canônicas" v={`${obra.canonicalDocsCount} arquivo(s)`} />
      <Row k="Fast Path iniciado?" v="não · ação manual no Forge" ok />
      <button
        type="button"
        style={{
          ...btnPrimary,
          marginTop: 6,
          width: '100%',
          padding: '12px 18px',
          fontSize: 11.5,
          letterSpacing: '1.5px',
          background: 'var(--moss)',
          borderColor: 'var(--moss)',
          opacity: selected.openObraAction.enabled && !busy ? 1 : 0.45,
          cursor: selected.openObraAction.enabled && !busy ? 'pointer' : 'not-allowed',
        }}
        onClick={() => {
          void onOpenObra().catch(() => undefined)
        }}
        disabled={!selected.openObraAction.enabled || busy}
        title="Abre a Obra no Atlas Code Forge — Fast Path NÃO executa automaticamente."
      >
        {selected.openObraAction.label}
      </button>
    </div>
  )
}

function TrustHistoryView({
  cockpit,
  selected,
}: {
  cockpit: AtlasSelfImprovementActivationCockpit
  selected: AtlasSelfImprovementActivationDetail
}) {
  const ledger = cockpit.trustLedger
  const portfolio = cockpit.strategyPortfolio
  const trustBand = ledger?.summary?.trustBand ?? 'insufficient_data'
  const bucket = selected.strategyBucket
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Row k="trust band" v={trustBand} ok={trustBand === 'high_trust'} />
      <Row k="entries totais" v={`${ledger?.entryCount ?? 0}`} />
      <Row k="strategy bucket" v={bucket ?? '—'} />
      {selected.portfolioDeviation && (
        <EmptyText>
          Portfolio fora do equilíbrio: {selected.portfolioReason ?? 'sem motivo'}.
        </EmptyText>
      )}
      {portfolio?.recommendedNextBucket && (
        <Row k="próximo bucket sugerido" v={portfolio.recommendedNextBucket} />
      )}
      <Row k="balance health" v={portfolio?.balanceHealth ?? 'unknown'} />
    </div>
  )
}

function SafetyStrip({ cockpit }: { cockpit: AtlasSelfImprovementActivationCockpit }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 8,
        border: '1px solid var(--hair-soft)',
        background: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Row k="provider externo" v="não" ok={!cockpit.externalProviderCall} />
      <Row k="tokens gastos" v="não" ok={!cockpit.providerTokensSpent} />
      <Row k="Fast Path auto" v="não" ok={!cockpit.autoFastPathExecuted} />
      <Row k="completion claim" v="não promovido" ok={!cockpit.completionClaimPromoted} />
      <Row k="separated from" v={cockpit.separatedFrom} ok={cockpit.separatedFrom === 'external_rivals_certification'} />
    </div>
  )
}

