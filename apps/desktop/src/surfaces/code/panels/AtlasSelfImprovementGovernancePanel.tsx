import { useState, useTransition } from 'react'
import { PanelTitle } from '@atlas/ui'
import type { RightRailContext } from './rightRailTypes'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

const TRUST_BAND_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  high_trust: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  medium_trust: { fg: 'var(--ink2)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
  low_trust: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  low_trust_overreach: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  low_trust_too_conservative: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  insufficient_data: { fg: 'var(--ink3)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
}

/**
 * Atlas Self-Improvement Governance Panel.
 *
 * Read-only operational view of the 7-level self-improvement ladder runtime
 * for the selected Obra. Renders the trust ledger summary + strategy portfolio
 * + canonical commands the operator should run from a terminal (proposal-gate,
 * before-after, invariant-lock, regression-sentinel, maturity-score,
 * trust-ledger).
 *
 * Hard rules:
 *   - sem Obra → mostra portfólio global e bloqueia recording;
 *   - panel não promove proposta;
 *   - panel não chama provider externo;
 *   - panel não substitui o ciclo Forge — ele apenas torna o estado visível e
 *     facilita o fluxo human-review canônico.
 */
export function AtlasSelfImprovementGovernancePanel(ctx: RightRailContext) {
  const { obra, busy, selfImprovementGovernance } = ctx
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [proposalIdInput, setProposalIdInput] = useState('')
  const [reviewerInput, setReviewerInput] = useState('atlas-operator')
  const [outcomeInput, setOutcomeInput] = useState<string>('proposal_approved')

  const hasObra = !!obra?.id
  const trustLedger = selfImprovementGovernance?.trustLedger ?? null
  const portfolio = selfImprovementGovernance?.strategyPortfolio ?? null
  const trustBand = trustLedger?.summary?.trustBand ?? 'insufficient_data'
  const tone = TRUST_BAND_TONE[trustBand] ?? TRUST_BAND_TONE.insufficient_data

  const recordOutcome = () => {
    if (!hasObra) {
      setError('obra_required')
      return
    }
    setError(null)
    startTransition(() => {
      void ctx
        .onRecordSelfImprovementTrustLedgerEntry({
          outcome: outcomeInput,
          proposalId: proposalIdInput || undefined,
          reviewer: reviewerInput || undefined,
        })
        .catch((e: unknown) => setError(String(e)))
    })
  }

  return (
    <section className="rr-panel" aria-labelledby="atlas-self-improvement-governance-panel-title">
      <PanelTitle
        label="Self-Improvement Governance"
        meta={trustLedger ? trustBand : 'aguardando snapshot'}
      />

      {!selfImprovementGovernance ? (
        <EmptyText>aguardando state — selecione uma Obra para carregar trust ledger e portfólio.</EmptyText>
      ) : (
        <>
          <div
            style={{
              display: 'inline-block',
              color: tone.fg,
              background: tone.bg,
              border: '1px solid',
              borderColor: tone.border,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            trust band · {trustBand}
          </div>

          {trustLedger?.summary && (
            <>
              <Row k="proposals approved" v={String(trustLedger.summary.totalProposals ?? 0)} />
              <Row
                k="approval rate"
                v={trustLedger.summary.approvalRate !== null && trustLedger.summary.approvalRate !== undefined
                  ? `${(trustLedger.summary.approvalRate * 100).toFixed(0)}%`
                  : '—'}
              />
              <Row k="autopromotion accepted" v={String(trustLedger.summary.autopromotionAccepted ?? 0)} />
              <Row k="autopromotion reverted" v={String(trustLedger.summary.autopromotionReverted ?? 0)} />
              <Row k="overreach flagged" v={String(trustLedger.summary.overreachFlagged ?? 0)} />
              <Row k="over conservative" v={String(trustLedger.summary.overConservativeFlagged ?? 0)} />
            </>
          )}
        </>
      )}

      {portfolio && (
        <>
          <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Strategy Portfolio (8 buckets)
          </h4>
          <div style={{ display: 'grid', gap: 4 }}>
            {portfolio.buckets.map((bucket) => (
              <div
                key={bucket.bucket}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 60px 60px 1fr',
                  gap: 6,
                  fontSize: 11,
                  padding: '4px 6px',
                  border: '1px solid var(--hair-soft)',
                  borderRadius: 4,
                }}
              >
                <code>{bucket.bucket}</code>
                <span>{bucket.count} props</span>
                <span>{bucket.sharePercent}%</span>
                <span style={{ color: 'var(--ink3)' }}>
                  target {bucket.targetPercent}% · dev {bucket.deviationPercent}%
                  {bucket.underweight ? ' · underweight' : ''}
                  {bucket.overweight ? ' · overweight' : ''}
                </span>
              </div>
            ))}
          </div>
          <Row k="balance health" v={portfolio.balanceHealth} />
          {portfolio.recommendedNextBucket && (
            <Row k="next bucket" v={portfolio.recommendedNextBucket} mono />
          )}
        </>
      )}

      <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Trust ledger · record outcome
      </h4>
      {!hasObra ? (
        <EmptyText>
          sem Obra · trust ledger é por Obra · selecione uma Obra para registrar outcome.
        </EmptyText>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
          <label style={{ fontSize: 11 }}>
            outcome
            <select
              value={outcomeInput}
              onChange={(e) => setOutcomeInput(e.target.value)}
              style={{ width: '100%', marginTop: 2, fontSize: 12 }}
            >
              <option value="proposal_approved">proposal_approved</option>
              <option value="proposal_rejected">proposal_rejected</option>
              <option value="proposal_revised">proposal_revised</option>
              <option value="autopromotion_accepted">autopromotion_accepted</option>
              <option value="autopromotion_reverted">autopromotion_reverted</option>
              <option value="overreach_flagged">overreach_flagged</option>
              <option value="over_conservative_flagged">over_conservative_flagged</option>
            </select>
          </label>
          <label style={{ fontSize: 11 }}>
            proposal id (optional)
            <input
              type="text"
              value={proposalIdInput}
              onChange={(e) => setProposalIdInput(e.target.value)}
              style={{ width: '100%', marginTop: 2, fontSize: 12 }}
            />
          </label>
          <label style={{ fontSize: 11 }}>
            reviewer
            <input
              type="text"
              value={reviewerInput}
              onChange={(e) => setReviewerInput(e.target.value)}
              style={{ width: '100%', marginTop: 2, fontSize: 12 }}
            />
          </label>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => startTransition(() => void ctx.onRefreshSelfImprovementGovernance().catch((e: unknown) => setError(String(e))))}
          disabled={busy || pending}
          style={btnPrimary}
        >
          refresh
        </button>
        <button
          type="button"
          onClick={recordOutcome}
          disabled={busy || pending || !hasObra}
          style={btnPrimary}
        >
          record outcome
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 8px',
            background: 'var(--rec-red-veil, rgba(138,48,37,0.08))',
            border: '1px solid var(--rec-red, #8a3025)',
            borderRadius: 4,
            fontSize: 11,
            color: 'var(--rec-red, #8a3025)',
          }}
        >
          {error}
        </div>
      )}

      <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Canonical commands
      </h4>
      <ul style={{ fontSize: 10, color: 'var(--ink3)', paddingLeft: 16, margin: 0 }}>
        <li>php artisan atlas:self-improvement:proposal-gate --proposal=@path --json --strict</li>
        <li>php artisan atlas:self-improvement:before-after --before=@path --after=@path --json --strict</li>
        <li>php artisan atlas:self-improvement:invariant-lock --after-snapshot=@path --proposal=@path --json --strict</li>
        <li>php artisan atlas:self-improvement:regression-sentinel --before-snapshot=@path --after-snapshot=@path --json --strict</li>
        <li>php artisan atlas:self-improvement:maturity-score --descriptor=@path --json --strict</li>
        <li>php artisan atlas:self-improvement:trust-ledger --obra=&lt;uuid&gt; --json</li>
      </ul>

      <div style={{ marginTop: 12, fontSize: 10, color: 'var(--ink3)' }}>
        read-model · nunca chama provider externo · nunca promove Forge · separado de external_rivals_certification
      </div>
    </section>
  )
}
