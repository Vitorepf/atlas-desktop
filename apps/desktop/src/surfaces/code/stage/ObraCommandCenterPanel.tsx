import type {
  AtlasCodeObraCommandCenter,
  AtlasCodeObraCommandCenterDecision,
  AtlasCodeObraCommandCenterPhase,
  AtlasCodeObraCommandCenterProgress,
  AtlasCodeObraSelfImprovementOrigin,
} from '@atlas/domain'
import {
  EmptyState,
  LiveActivityCard,
  MetricRow,
  ObraSummaryHero,
  ProgressMilestones,
  SafetyStrip,
  StatusBadge,
  WorkbenchPanel,
  WorkbenchSection,
} from '../workbench'
import type { LiveActivityEvent, MilestoneNode, WorkbenchTone } from '../workbench'

/**
 * Atlas Code Obra Command Center · centro vivo do workbench.
 *
 * Premium Workbench Visual Comfort v1: header rico (ObraSummaryHero),
 * marcos do Forge (ProgressMilestones), atividade ao vivo, decisões
 * pendentes, diagnóstico narrativo, safety strip e advanced em camada
 * secundária colapsada. NUNCA chama provider externo, NUNCA promove
 * completion claim.
 */
export function ObraCommandCenterPanel({ snapshot }: { snapshot: AtlasCodeObraCommandCenter }) {
  const heroTone = mapStatusToTone(snapshot.status, snapshot.lifecyclePhases, snapshot.currentPhase)
  const dotKind = mapStatusDot(snapshot)
  const milestones = buildMilestones(snapshot.lifecyclePhases, snapshot.currentPhase)
  const liveEvent = buildLiveEvent(snapshot)

  return (
    <article
      className="cc-panel"
      style={{
        maxWidth: 920,
        margin: '20px auto 0',
        display: 'grid',
        gap: 16,
        fontFamily: 'var(--cc-font-sans)',
        color: 'var(--cc-text)',
      }}
      aria-label="Atlas Code Obra Command Center"
    >
      <ObraSummaryHero
        obraTitle={snapshot.obraTitle ?? snapshot.objectiveSummary ?? 'Obra sem título'}
        objectiveSummary={snapshot.objectiveSummary}
        statusLabel={snapshot.humanStatusLabel}
        statusDetail={snapshot.humanStatusDetail}
        statusKind={dotKind}
        statusTone={heroTone}
        primaryActionLabel={snapshot.primaryActionLabel}
        primaryActionDisabled={!snapshot.primaryActionEnabled}
        primaryActionDisabledReason={snapshot.primaryActionDisabledReason}
        primaryActionHint={snapshot.nextSafeAction}
      />

      <WorkbenchPanel title="Lifecycle da Obra" eyebrow="Forge governado · 8 fases">
        <ProgressMilestones milestones={milestones} />
        <details style={{ marginTop: 10 }}>
          <summary
            style={{
              cursor: 'pointer',
              fontSize: 11.5,
              color: 'var(--cc-text-muted)',
              fontFamily: 'var(--cc-font-sans)',
            }}
          >
            Detalhe de cada fase
          </summary>
          <div style={{ marginTop: 8 }}>
            <PhaseDetails phases={snapshot.lifecyclePhases} currentPhase={snapshot.currentPhase} />
          </div>
        </details>
      </WorkbenchPanel>

      <LiveActivityCard state={dotKind} primaryEvent={liveEvent} />

      {snapshot.selfImprovementOrigin ? (
        <SelfImprovementOriginCard origin={snapshot.selfImprovementOrigin} />
      ) : null}

      <BlockerCard snapshot={snapshot} />

      <ProgressGrid
        readiness={snapshot.readinessProgress}
        proven={snapshot.provenDeliveryProgress}
      />

      <DecisionInboxPanel inbox={snapshot.decisionInbox} />

      <DiagnosticsGrid snapshot={snapshot} />

      <SafetyStrip
        externalProviderCall={snapshot.safetySummary.externalProviderCall}
        providerTokensSpent={snapshot.safetySummary.providerTokensSpent}
        completionClaimPromoted={snapshot.safetySummary.completionClaimPromoted}
        reviewGatePreserved={snapshot.safetySummary.reviewCompletionGatePreserved}
        externalRivalsStatus={snapshot.safetySummary.externalRivalsCertification}
      />

      <AdvancedDetails snapshot={snapshot} />
    </article>
  )
}

function BlockerCard({ snapshot }: { snapshot: AtlasCodeObraCommandCenter }) {
  const b = snapshot.blockerTranslation
  if (!b.kind || b.kind === 'no_obra') return null
  const tone: WorkbenchTone = b.isBlocking ? 'danger' : 'warning'
  return (
    <WorkbenchPanel
      title={b.humanTitle ?? 'Bloqueio humano'}
      eyebrow={`Blocker · ${b.kind}`}
      action={<StatusBadge label={b.isBlocking ? 'bloqueando' : 'atenção'} tone={tone} />}
      tone="raised"
    >
      {b.humanDetail ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--cc-text)', lineHeight: 'var(--cc-leading-relaxed)' }}>
          {b.humanDetail}
        </p>
      ) : null}
      {b.suggestedActionLabel ? (
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--cc-accent-strong)',
          }}
        >
          O que fazer agora · {b.suggestedActionLabel}
        </p>
      ) : null}
      {b.filesOutOfScope.length > 0 ? (
        <WorkbenchSection eyebrow="Arquivos fora do escopo">
          <ul
            style={{
              margin: 0,
              padding: '0 0 0 18px',
              fontFamily: 'var(--cc-font-mono)',
              fontSize: 11.5,
              color: 'var(--cc-danger-fg)',
              letterSpacing: 'var(--cc-tracking-data)',
              lineHeight: 'var(--cc-leading-relaxed)',
            }}
          >
            {b.filesOutOfScope.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </WorkbenchSection>
      ) : null}
      {b.technicalDetail ? (
        <details style={{ marginTop: 8 }}>
          <summary
            style={{
              cursor: 'pointer',
              fontSize: 11.5,
              color: 'var(--cc-text-muted)',
            }}
          >
            Ver detalhes técnicos
          </summary>
          <pre
            style={{
              margin: '6px 0 0',
              padding: 8,
              fontFamily: 'var(--cc-font-mono)',
              fontSize: 11,
              color: 'var(--cc-text-muted)',
              background: 'var(--cc-surface-sunken)',
              border: '1px solid var(--cc-border-soft)',
              borderRadius: 'var(--cc-radius-xs)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {b.technicalDetail}
          </pre>
        </details>
      ) : null}
    </WorkbenchPanel>
  )
}

function ProgressGrid({
  readiness,
  proven,
}: {
  readiness: AtlasCodeObraCommandCenterProgress
  proven: AtlasCodeObraCommandCenterProgress
}) {
  return (
    <section
      style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}
      aria-label="Progresso da Obra"
    >
      <ProgressBlock progress={readiness} tone="accent" />
      <ProgressBlock progress={proven} tone="success" />
    </section>
  )
}

function ProgressBlock({
  progress,
  tone,
}: {
  progress: AtlasCodeObraCommandCenterProgress
  tone: 'accent' | 'success'
}) {
  const accent = tone === 'accent' ? 'var(--cc-accent)' : 'var(--cc-success)'
  return (
    <WorkbenchPanel title={progress.label} eyebrow={`${progress.reached}/${progress.total}`} tone="raised">
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--cc-text-strong)',
              letterSpacing: 'var(--cc-tracking-tight)',
              lineHeight: 1,
            }}
          >
            {progress.percent}%
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: 'var(--cc-surface-sunken)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
          aria-hidden
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, progress.percent))}%`,
              background: accent,
              borderRadius: 999,
              transition: 'width 280ms var(--ease-i)',
            }}
          />
        </div>
        <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
          {progress.breakdown.map((item) => (
            <li
              key={item.key}
              style={{
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 12.5,
                color: item.reached ? 'var(--cc-text)' : 'var(--cc-text-muted)',
                display: 'flex',
                gap: 8,
                alignItems: 'baseline',
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 14,
                  textAlign: 'center',
                  color: item.reached ? accent : 'var(--cc-text-disabled)',
                  fontWeight: 700,
                }}
              >
                {item.reached ? '✓' : '·'}
              </span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </WorkbenchPanel>
  )
}

function DecisionInboxPanel({ inbox }: { inbox: AtlasCodeObraCommandCenterDecision[] }) {
  if (inbox.length === 0) {
    return (
      <WorkbenchPanel title="Decision Inbox" eyebrow="Decisões humanas pendentes">
        <EmptyState
          title="Nada pendente"
          hint="Quando o Forge precisar de decisão humana (escopo, provider, review, completion), aparece aqui."
        />
      </WorkbenchPanel>
    )
  }
  return (
    <WorkbenchPanel
      title="Decision Inbox"
      eyebrow={`${inbox.length} decisão${inbox.length === 1 ? '' : 'ões'} pendente${inbox.length === 1 ? '' : 's'}`}
    >
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
        {inbox.map((decision) => (
          <DecisionItem key={decision.key} decision={decision} />
        ))}
      </ul>
    </WorkbenchPanel>
  )
}

function DecisionItem({ decision }: { decision: AtlasCodeObraCommandCenterDecision }) {
  const tone: WorkbenchTone =
    decision.risk === 'high' ? 'danger' : decision.risk === 'medium' ? 'warning' : 'info'
  return (
    <li
      style={{
        padding: 12,
        background: `var(--cc-${tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'info'}-veil)`,
        border: `1px solid var(--cc-${tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'info'}-border)`,
        borderRadius: 'var(--cc-radius-sm)',
        display: 'grid',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <strong
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--cc-text-strong)',
          }}
        >
          {decision.label}
        </strong>
        <StatusBadge label={`risco · ${decision.risk}`} tone={tone} />
      </div>
      <span
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 12.5,
          color: 'var(--cc-text-muted)',
          lineHeight: 'var(--cc-leading-relaxed)',
        }}
      >
        {decision.reason}
      </span>
      <span
        style={{
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 11,
          color: 'var(--cc-text-faint)',
          letterSpacing: 'var(--cc-tracking-data)',
        }}
      >
        recomendado: {decision.recommendedAction}
        {decision.allowedActions.length > 0 ? ` · ações: ${decision.allowedActions.join(', ')}` : ''}
      </span>
    </li>
  )
}

function DiagnosticsGrid({ snapshot }: { snapshot: AtlasCodeObraCommandCenter }) {
  const trust = snapshot.trustSummary
  const health = snapshot.operationalHealth
  const evidence = snapshot.evidenceDigest
  const provider = snapshot.providerSummary

  const trustTone: WorkbenchTone =
    trust.evidenceStrength === 'strong'
      ? 'success'
      : trust.evidenceStrength === 'partial'
        ? 'info'
        : trust.evidenceStrength === 'weak'
          ? 'warning'
          : 'danger'

  return (
    <section
      style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
      aria-label="Diagnóstico operacional"
    >
      <WorkbenchPanel title="Trust" eyebrow="Evidência da Obra" tone="raised" density="compact">
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--cc-text-strong)' }}>
            {trust.evidenceStrength}
          </span>
          <StatusBadge label={`risco · ${trust.riskLevel}`} tone={trustTone} />
        </div>
        <div style={{ marginTop: 6 }}>
          <MetricRow label="Ledger" value={String(trust.ledgerEventsCount)} tone="mono" />
          <MetricRow label="Receipts" value={String(trust.receiptsCount)} tone="mono" />
          <MetricRow label="Tests run" value={String(trust.testsRunCount)} tone="mono" />
          <MetricRow label="Review" value={trust.reviewStatus} tone="muted" />
        </div>
        {trust.missingEvidence.length > 0 ? (
          <div style={{ marginTop: 8 }}>
            <span
              style={{
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 11,
                color: 'var(--cc-warning-fg)',
                fontWeight: 500,
              }}
            >
              Falta · {trust.missingEvidence.join(', ')}
            </span>
          </div>
        ) : null}
      </WorkbenchPanel>

      <WorkbenchPanel title="Operational Health" eyebrow="Fila e worker" tone="raised" density="compact">
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--cc-text-strong)' }}>
            {health.queueStatus}
          </span>
          <StatusBadge label={health.heartbeatStatus} tone={health.stale ? 'warning' : 'neutral'} />
        </div>
        <div style={{ marginTop: 6 }}>
          <MetricRow label="Queue" value={health.queueName} tone="mono" />
          <MetricRow label="Worker" value={health.workerStatus} tone="muted" />
          {health.currentStateAgeSeconds !== null ? (
            <MetricRow label="Idade do estado" value={`${health.currentStateAgeSeconds}s`} tone="mono" />
          ) : null}
        </div>
        {health.humanMessage ? (
          <p
            style={{
              margin: '8px 0 0',
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 12,
              color: 'var(--cc-text-muted)',
              lineHeight: 'var(--cc-leading-relaxed)',
            }}
          >
            {health.humanMessage}
          </p>
        ) : null}
      </WorkbenchPanel>

      <WorkbenchPanel title="Evidence Digest" eyebrow="Provas desta Obra" tone="raised" density="compact">
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cc-text-strong)' }}>
          {evidence.obraEvidenceRefCount} provas
        </div>
        <div style={{ marginTop: 6 }}>
          <MetricRow label="Ledger eventos" value={String(evidence.obraLedgerEventCount)} tone="mono" />
          {evidence.latestEvidenceAt ? (
            <MetricRow label="Última prova" value={evidence.latestEvidenceAt} tone="muted" />
          ) : null}
        </div>
        <p
          style={{
            margin: '8px 0 0',
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 11.5,
            color: 'var(--cc-text-faint)',
            lineHeight: 'var(--cc-leading-relaxed)',
          }}
        >
          {evidence.systemCertificationsSeparated
            ? 'Separadas das Certificações do sistema Atlas.'
            : 'ATENÇÃO · separação Obra vs sistema não confirmada.'}
        </p>
      </WorkbenchPanel>

      <WorkbenchPanel title="Provider / Modelo" eyebrow="Atlas Decide" tone="raised" density="compact">
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cc-text-strong)' }}>
          {provider.provider ?? '—'} · {provider.model ?? '—'}
        </div>
        <div style={{ marginTop: 6 }}>
          <MetricRow label="Decisão" value={provider.decisionSource} tone="muted" />
          <MetricRow label="Capacity" value={provider.capacityState} tone="muted" />
          <MetricRow
            label="Driver"
            value={provider.driverConfigured ? 'configurado' : 'não configurado'}
            tone="muted"
          />
        </div>
      </WorkbenchPanel>
    </section>
  )
}

function PhaseDetails({
  phases,
  currentPhase,
}: {
  phases: AtlasCodeObraCommandCenterPhase[]
  currentPhase: string | null
}) {
  return (
    <ol
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 8,
      }}
    >
      {phases.map((phase, idx) => {
        const tone = phaseToTone(phase.status)
        const isCurrent = phase.key === currentPhase
        return (
          <li
            key={phase.key}
            title={phase.description}
            style={{
              padding: 10,
              background: `var(--cc-${tone}-veil)`,
              border: `1px solid var(--cc-${tone}-border)`,
              borderWidth: isCurrent ? 1.5 : 1,
              borderRadius: 'var(--cc-radius-sm)',
              display: 'grid',
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 10,
                color: `var(--cc-${tone}-fg)`,
                letterSpacing: 'var(--cc-tracking-data)',
                textTransform: 'none',
              }}
            >
              {String(idx + 1).padStart(2, '0')} · {phase.status.replace('_', ' ')}
            </span>
            <span
              style={{
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--cc-text-strong)',
              }}
            >
              {phase.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 11.5,
                color: 'var(--cc-text-muted)',
                lineHeight: 'var(--cc-leading-snug)',
              }}
            >
              {phase.nextAction}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function AdvancedDetails({ snapshot }: { snapshot: AtlasCodeObraCommandCenter }) {
  const entries = Object.entries(snapshot.advancedRefs)
  if (entries.length === 0) return null
  return (
    <details
      style={{
        fontFamily: 'var(--cc-font-sans)',
        fontSize: 12,
        color: 'var(--cc-text-muted)',
      }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Avançado · advanced refs</summary>
      <ul
        style={{
          margin: '8px 0 0',
          padding: '0 0 0 16px',
          display: 'grid',
          gap: 4,
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 11,
          letterSpacing: 'var(--cc-tracking-data)',
        }}
      >
        {entries.map(([key, value]) => (
          <li key={key}>
            <span style={{ color: 'var(--cc-text-faint)' }}>{key}</span>
            <span style={{ color: 'var(--cc-text-muted)' }}>: </span>
            <span style={{ color: 'var(--cc-text)' }}>
              {value === null || value === undefined ? '—' : String(value)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}

function phaseToTone(status: string): WorkbenchTone {
  switch (status) {
    case 'passed':
    case 'completed':
      return 'success'
    case 'blocked':
      return 'danger'
    case 'needs_human':
      return 'warning'
    case 'running':
      return 'info'
    case 'ready':
      return 'accent'
    default:
      return 'neutral'
  }
}

function buildMilestones(
  phases: AtlasCodeObraCommandCenterPhase[],
  currentPhase: string | null,
): MilestoneNode[] {
  return phases.map((p) => {
    const status: MilestoneNode['status'] =
      p.status === 'passed' || p.status === 'completed'
        ? 'passed'
        : p.status === 'blocked'
          ? 'blocked'
          : p.key === currentPhase
            ? 'current'
            : p.status === 'running' || p.status === 'needs_human'
              ? 'current'
              : 'upcoming'
    return {
      key: p.key,
      label: p.label,
      status,
      hint: status === 'current' ? p.nextAction : undefined,
    }
  })
}

function buildLiveEvent(snapshot: AtlasCodeObraCommandCenter): LiveActivityEvent {
  const dot = mapStatusDot(snapshot)
  return {
    kind: dot,
    label: snapshot.humanStatusLabel,
    detail: snapshot.humanStatusDetail,
  }
}

function mapStatusDot(snapshot: AtlasCodeObraCommandCenter): string {
  if (snapshot.status === 'blocked') return 'blocked'
  if (snapshot.status === 'no_obra') return 'unknown'
  const phase = snapshot.lifecyclePhases.find((p) => p.key === snapshot.currentPhase)
  switch (phase?.status) {
    case 'running':
      return 'running'
    case 'blocked':
      return 'blocked'
    case 'needs_human':
      return 'review'
    case 'passed':
    case 'completed':
      return 'passed'
    case 'ready':
      return 'ready'
    default:
      return 'unknown'
  }
}

function mapStatusToTone(
  status: string,
  phases: AtlasCodeObraCommandCenterPhase[],
  currentPhase: string | null,
): WorkbenchTone {
  if (status === 'blocked') return 'danger'
  if (status === 'no_obra') return 'neutral'
  const phase = phases.find((p) => p.key === currentPhase)
  switch (phase?.status) {
    case 'running':
      return 'info'
    case 'blocked':
      return 'danger'
    case 'needs_human':
      return 'warning'
    case 'passed':
    case 'completed':
      return 'success'
    case 'ready':
      return 'accent'
    default:
      return 'neutral'
  }
}

function SelfImprovementOriginCard({ origin }: { origin: AtlasCodeObraSelfImprovementOrigin }) {
  const tone: WorkbenchTone =
    origin.deltaGrade === 'regressed' || origin.deltaGrade === 'invalid'
      ? 'danger'
      : origin.deltaGrade === 'major_improvement' || origin.deltaGrade === 'improved'
        ? 'success'
        : origin.deltaGrade === 'neutral'
          ? 'warning'
          : 'info'
  const eyebrow =
    origin.deltaGrade === null
      ? 'Origem · Self-Improvement (sem resultado medido)'
      : `Origem · Self-Improvement (${origin.deltaGrade})`
  return (
    <WorkbenchPanel
      title="Origem da Obra"
      eyebrow={eyebrow}
      action={<StatusBadge label={origin.deltaGrade ?? 'pendente'} tone={tone} />}
      tone="raised"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--cc-font-sans)' }}>
        <div style={{ fontSize: 14, color: 'var(--cc-text)' }}>{origin.humanMessage}</div>
        <MetricRow label="proposta" value={origin.proposalId ?? '—'} />
        <MetricRow label="activation" value={origin.activationId ?? '—'} />
        {origin.targetCapability ? <MetricRow label="capacidade alvo" value={origin.targetCapability} /> : null}
        {origin.expectedPowerGain ? <MetricRow label="ganho esperado" value={origin.expectedPowerGain} /> : null}
        {origin.reviewer ? <MetricRow label="aprovado por" value={origin.reviewer} /> : null}
        {origin.resultEntryId ? <MetricRow label="result entry" value={origin.resultEntryId} /> : null}
        <div
          style={{
            marginTop: 4,
            padding: '6px 8px',
            border: '1px solid var(--cc-border-soft)',
            borderRadius: 'var(--cc-radius-xs)',
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 11,
            color: 'var(--cc-text-muted)',
            wordBreak: 'break-all',
          }}
          aria-label={origin.measureResultAction.enabled ? 'Como medir resultado' : 'Resultado já medido'}
          title={
            origin.measureResultAction.enabled
              ? 'Rode este comando para medir o delta. A UI nunca dispara provider ou Fast Path.'
              : 'Resultado já foi medido para esta Obra.'
          }
        >
          {origin.measureResultAction.enabled
            ? `${origin.measureResultAction.label}: ${origin.measureResultAction.commandHint}`
            : `Comando: ${origin.measureResultAction.commandHint}`}
        </div>
      </div>
    </WorkbenchPanel>
  )
}
