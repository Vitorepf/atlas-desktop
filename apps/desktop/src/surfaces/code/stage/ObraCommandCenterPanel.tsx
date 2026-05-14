import type {
  AtlasCodeObraCommandCenter,
  AtlasCodeObraCommandCenterDecision,
  AtlasCodeObraCommandCenterPhase,
  AtlasCodeObraCommandCenterProgress,
} from '@atlas/domain'

/**
 * Atlas Code Obra Command Center · painel central canônico (Visual Ergonomics v1).
 *
 * Tokens enterprise (`--cc-*`), tipografia sans operacional em parágrafos longos,
 * status colors distintos (success/warning/danger/info/neutral) e advanced em
 * camada secundária colapsada. Responde em até 30s as 7 perguntas do diretor.
 *
 * NUNCA chama provider externo. NUNCA infere progresso ausente. Diagnóstico
 * técnico vive em `<details>Ver detalhes técnicos</details>`.
 */
export function ObraCommandCenterPanel({ snapshot }: { snapshot: AtlasCodeObraCommandCenter }) {
  return (
    <article className="cc-panel" style={wrapStyle} aria-label="Atlas Code Obra Command Center">
      <CommandCenterHeader snapshot={snapshot} />
      <LifecycleBar phases={snapshot.lifecyclePhases} currentPhase={snapshot.currentPhase} />
      <PrimaryActionStrip snapshot={snapshot} />
      <ProgressRow readiness={snapshot.readinessProgress} proven={snapshot.provenDeliveryProgress} />
      <DecisionInboxBlock inbox={snapshot.decisionInbox} />
      <DiagnosticsRow snapshot={snapshot} />
      <SafetyStrip snapshot={snapshot} />
      <AdvancedDetails snapshot={snapshot} />
    </article>
  )
}

const wrapStyle: React.CSSProperties = {
  maxWidth: 880,
  margin: '20px auto 0',
  padding: '20px 24px 28px',
  display: 'grid',
  gap: 16,
  background: 'var(--cc-surface)',
  border: '1px solid var(--cc-border-soft)',
  borderRadius: 'var(--cc-radius-md)',
  boxShadow: 'var(--cc-shadow-xs)',
  fontFamily: 'var(--cc-font-sans)',
  color: 'var(--cc-text)',
}

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--cc-font-mono)',
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--cc-text-faint)',
  fontWeight: 500,
}

function CommandCenterHeader({ snapshot }: { snapshot: AtlasCodeObraCommandCenter }) {
  const isBlocked = snapshot.status === 'blocked'
  const statusDot = mapStatusDot(snapshot)
  return (
    <header style={{ display: 'grid', gap: 6 }}>
      <span style={eyebrowStyle}>Obra · Command Center</span>
      <h1
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 'var(--cc-text-display)',
          fontWeight: 600,
          letterSpacing: 'var(--cc-tracking-tight)',
          margin: 0,
          color: 'var(--cc-text-strong)',
          lineHeight: 'var(--cc-leading-tight)',
        }}
      >
        {snapshot.obraTitle ?? snapshot.objectiveSummary ?? 'Obra sem título'}
      </h1>
      {snapshot.objectiveSummary && snapshot.obraTitle !== snapshot.objectiveSummary ? (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--cc-font-sans)',
            fontStyle: 'normal',
            fontSize: 'var(--cc-text-body)',
            color: 'var(--cc-text-muted)',
            lineHeight: 'var(--cc-leading-relaxed)',
          }}
        >
          {snapshot.objectiveSummary}
        </p>
      ) : null}
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="cc-status-dot" data-status={statusDot} aria-hidden />
        <span
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: isBlocked ? 'var(--cc-danger-fg)' : 'var(--cc-text-strong)',
          }}
        >
          {snapshot.humanStatusLabel}
        </span>
        <span
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 12.5,
            color: 'var(--cc-text-muted)',
            flex: '1 1 100%',
            lineHeight: 'var(--cc-leading-snug)',
          }}
        >
          {snapshot.humanStatusDetail}
        </span>
      </div>
    </header>
  )
}

const PHASE_TONE: Record<string, { fg: string; bg: string; border: string; chip: string }> = {
  not_started: { fg: 'var(--cc-text-faint)', bg: 'transparent', border: 'var(--cc-border-soft)', chip: 'var(--cc-text-faint)' },
  ready: { fg: 'var(--cc-text)', bg: 'var(--cc-accent-veil)', border: 'var(--cc-accent-border)', chip: 'var(--cc-accent)' },
  running: { fg: 'var(--cc-info-fg)', bg: 'var(--cc-info-veil)', border: 'var(--cc-info-border)', chip: 'var(--cc-info)' },
  blocked: { fg: 'var(--cc-danger-fg)', bg: 'var(--cc-danger-veil)', border: 'var(--cc-danger-border)', chip: 'var(--cc-danger)' },
  needs_human: { fg: 'var(--cc-warning-fg)', bg: 'var(--cc-warning-veil)', border: 'var(--cc-warning-border)', chip: 'var(--cc-warning)' },
  passed: { fg: 'var(--cc-success-fg)', bg: 'var(--cc-success-veil)', border: 'var(--cc-success-border)', chip: 'var(--cc-success)' },
  completed: { fg: 'var(--cc-success-fg)', bg: 'var(--cc-success-veil)', border: 'var(--cc-success-border)', chip: 'var(--cc-success)' },
}

function LifecycleBar({
  phases,
  currentPhase,
}: {
  phases: AtlasCodeObraCommandCenterPhase[]
  currentPhase: string | null
}) {
  if (phases.length === 0) {
    return null
  }
  return (
    <section style={{ display: 'grid', gap: 8 }} aria-label="Lifecycle da Obra">
      <span style={eyebrowStyle}>Lifecycle</span>
      <ol
        style={{
          display: 'grid',
          gap: 6,
          gridTemplateColumns: `repeat(${Math.min(phases.length, 4)}, minmax(0, 1fr))`,
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {phases.map((phase, idx) => {
          const tone = PHASE_TONE[phase.status] ?? PHASE_TONE.not_started!
          const isCurrent = phase.key === currentPhase
          return (
            <li
              key={phase.key}
              title={phase.description}
              style={{
                padding: '10px 12px',
                background: tone.bg,
                border: `1px solid ${tone.border}`,
                borderWidth: isCurrent ? 2 : 1,
                borderRadius: 'var(--cc-radius-sm)',
                color: tone.fg,
                display: 'grid',
                gap: 4,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--cc-font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  color: tone.chip,
                  textTransform: 'uppercase',
                }}
              >
                {(idx + 1).toString().padStart(2, '0')} · {phase.status.replace('_', ' ')}
              </span>
              <span
                style={{
                  fontFamily: 'var(--cc-font-sans)',
                  fontSize: 13,
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
              {phase.evidenceCount > 0 || phase.blockerCount > 0 ? (
                <span
                  style={{
                    fontFamily: 'var(--cc-font-mono)',
                    fontSize: 10,
                    color: 'var(--cc-text-faint)',
                  }}
                >
                  {phase.evidenceCount > 0 ? `provas: ${phase.evidenceCount}` : ''}
                  {phase.evidenceCount > 0 && phase.blockerCount > 0 ? ' · ' : ''}
                  {phase.blockerCount > 0 ? `blockers: ${phase.blockerCount}` : ''}
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function PrimaryActionStrip({ snapshot }: { snapshot: AtlasCodeObraCommandCenter }) {
  const blocker = snapshot.blockerTranslation
  const showBlocker = blocker.kind && blocker.kind !== 'no_obra'
  return (
    <section
      style={{
        padding: 14,
        border: '1px solid var(--cc-border-soft)',
        background: 'var(--cc-surface-raised)',
        borderRadius: 'var(--cc-radius-md)',
        boxShadow: 'var(--cc-shadow-xs)',
        display: 'grid',
        gap: 8,
      }}
      aria-label="Próximo passo seguro"
    >
      <span style={eyebrowStyle}>Próximo passo seguro</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <strong
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--cc-text-strong)',
            letterSpacing: 'var(--cc-tracking-normal)',
          }}
        >
          {snapshot.primaryActionLabel}
        </strong>
        <span className="cc-badge" data-tone={snapshot.primaryActionEnabled ? 'accent' : 'warning'}>
          {snapshot.primaryActionKind} · {snapshot.primaryActionEnabled ? 'disponível' : 'bloqueado'}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--cc-font-sans)',
          fontStyle: 'normal',
          fontSize: 13,
          color: 'var(--cc-text-muted)',
          lineHeight: 'var(--cc-leading-relaxed)',
        }}
      >
        {snapshot.nextSafeAction}
      </p>
      {snapshot.primaryActionDisabledReason ? (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 11,
            color: 'var(--cc-danger-fg)',
            letterSpacing: 'var(--cc-tracking-data)',
          }}
        >
          Desabilitado: {snapshot.primaryActionDisabledReason}
        </p>
      ) : null}
      {showBlocker ? (
        <div
          style={{
            marginTop: 6,
            padding: 12,
            background: blocker.isBlocking ? 'var(--cc-danger-veil)' : 'var(--cc-warning-veil)',
            border: `1px solid ${blocker.isBlocking ? 'var(--cc-danger-border)' : 'var(--cc-warning-border)'}`,
            borderRadius: 'var(--cc-radius-sm)',
            display: 'grid',
            gap: 6,
          }}
          role="alert"
        >
          <span
            style={{
              ...eyebrowStyle,
              color: blocker.isBlocking ? 'var(--cc-danger)' : 'var(--cc-warning)',
            }}
          >
            Último blocker humano · {blocker.kind}
          </span>
          <strong
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 13.5,
              fontWeight: 600,
              color: blocker.isBlocking ? 'var(--cc-danger-fg)' : 'var(--cc-warning-fg)',
            }}
          >
            {blocker.humanTitle}
          </strong>
          {blocker.humanDetail ? (
            <span
              style={{
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 12.5,
                color: 'var(--cc-text-muted)',
                lineHeight: 'var(--cc-leading-snug)',
              }}
            >
              {blocker.humanDetail}
            </span>
          ) : null}
          {blocker.filesOutOfScope.length > 0 ? (
            <ul
              style={{
                margin: '4px 0 0 16px',
                padding: 0,
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 11,
                color: 'var(--cc-danger-fg)',
              }}
            >
              {blocker.filesOutOfScope.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : null}
          {blocker.technicalDetail ? (
            <details
              style={{
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 10.5,
                color: 'var(--cc-text-faint)',
                marginTop: 4,
              }}
            >
              <summary style={{ cursor: 'pointer' }}>Ver detalhes técnicos</summary>
              <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{blocker.technicalDetail}</pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function ProgressRow({
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
    <article
      style={{
        padding: 12,
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 'var(--cc-radius-sm)',
        background: 'var(--cc-surface-raised)',
        display: 'grid',
        gap: 6,
      }}
    >
      <span style={eyebrowStyle}>{progress.label}</span>
      <span
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--cc-text-strong)',
          letterSpacing: 'var(--cc-tracking-tight)',
        }}
      >
        {progress.percent}%{' '}
        <span style={{ fontSize: 12, color: 'var(--cc-text-faint)', fontWeight: 400 }}>
          · {progress.reached}/{progress.total}
        </span>
      </span>
      <div
        style={{
          height: 4,
          background: 'var(--cc-border-soft)',
          borderRadius: 999,
          position: 'relative',
          overflow: 'hidden',
        }}
        aria-hidden
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${Math.min(100, Math.max(0, progress.percent))}%`,
            background: accent,
            borderRadius: 999,
          }}
        />
      </div>
      <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 3 }}>
        {progress.breakdown.map((item) => (
          <li
            key={item.key}
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 12.5,
              color: item.reached ? 'var(--cc-text)' : 'var(--cc-text-muted)',
              display: 'flex',
              gap: 6,
              alignItems: 'baseline',
            }}
          >
            <span
              style={{
                color: item.reached ? accent : 'var(--cc-text-disabled)',
                fontWeight: 600,
              }}
              aria-hidden
            >
              {item.reached ? '✓' : '·'}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function DecisionInboxBlock({ inbox }: { inbox: AtlasCodeObraCommandCenterDecision[] }) {
  if (inbox.length === 0) {
    return null
  }
  return (
    <section style={{ display: 'grid', gap: 6 }} aria-label="Decision Inbox">
      <span style={eyebrowStyle}>Decision Inbox · decisões humanas pendentes</span>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
        {inbox.map((decision) => (
          <DecisionInboxItem key={decision.key} decision={decision} />
        ))}
      </ul>
    </section>
  )
}

const RISK_TONE: Record<string, { bg: string; border: string; fg: string; chip: 'info' | 'warning' | 'danger' | 'accent' }> = {
  none: { bg: 'var(--cc-surface-raised)', border: 'var(--cc-border-soft)', fg: 'var(--cc-text-muted)', chip: 'accent' },
  low: { bg: 'var(--cc-surface-raised)', border: 'var(--cc-border-soft)', fg: 'var(--cc-text)', chip: 'info' },
  medium: { bg: 'var(--cc-warning-veil)', border: 'var(--cc-warning-border)', fg: 'var(--cc-warning-fg)', chip: 'warning' },
  high: { bg: 'var(--cc-danger-veil)', border: 'var(--cc-danger-border)', fg: 'var(--cc-danger-fg)', chip: 'danger' },
}

function DecisionInboxItem({ decision }: { decision: AtlasCodeObraCommandCenterDecision }) {
  const tone = RISK_TONE[decision.risk] ?? RISK_TONE.low!
  return (
    <li
      style={{
        padding: 12,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
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
            color: tone.fg,
          }}
        >
          {decision.label}
        </strong>
        <span className="cc-badge" data-tone={tone.chip}>
          risco: {decision.risk}
        </span>
      </div>
      <span
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 12.5,
          color: 'var(--cc-text-muted)',
          lineHeight: 'var(--cc-leading-snug)',
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

function DiagnosticsRow({ snapshot }: { snapshot: AtlasCodeObraCommandCenter }) {
  const trust = snapshot.trustSummary
  const health = snapshot.operationalHealth
  const evidence = snapshot.evidenceDigest

  const healthDot = mapHealthDot(health.queueStatus)
  const trustTone = trust.evidenceStrength === 'strong'
    ? 'success'
    : trust.evidenceStrength === 'partial'
      ? 'info'
      : trust.evidenceStrength === 'weak'
        ? 'warning'
        : 'danger'

  return (
    <section
      style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr' }}
      aria-label="Diagnóstico operacional"
    >
      <DiagnosticsCard label="Trust">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--cc-text-strong)',
            }}
          >
            {trust.evidenceStrength}
          </span>
          <span className="cc-badge" data-tone={trustTone}>
            risco {trust.riskLevel}
          </span>
        </div>
        <span style={cardMetaStyle}>
          ledger: {trust.ledgerEventsCount} · receipts: {trust.receiptsCount} · testes: {trust.testsRunCount}
        </span>
        <span style={cardHintStyle}>review: {trust.reviewStatus}</span>
        {trust.missingEvidence.length > 0 ? (
          <span style={{ ...cardMetaStyle, color: 'var(--cc-warning-fg)' }}>
            falta: {trust.missingEvidence.join(', ')}
          </span>
        ) : null}
      </DiagnosticsCard>

      <DiagnosticsCard label="Operational Health">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="cc-status-dot" data-status={healthDot} aria-hidden />
          <span
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--cc-text-strong)',
            }}
          >
            queue: {health.queueStatus}
          </span>
        </div>
        <span style={cardMetaStyle}>
          worker: {health.workerStatus} · heartbeat: {health.heartbeatStatus}
          {health.currentStateAgeSeconds !== null ? ` · ${health.currentStateAgeSeconds}s` : ''}
        </span>
        <span style={cardHintStyle}>{health.humanMessage}</span>
        {health.watchdogNextAction ? (
          <span style={{ ...cardMetaStyle, color: 'var(--cc-warning-fg)' }}>
            watchdog: {health.watchdogNextAction}
          </span>
        ) : null}
      </DiagnosticsCard>

      <DiagnosticsCard label="Evidence Digest">
        <span
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--cc-text-strong)',
          }}
        >
          {evidence.obraEvidenceRefCount} provas da Obra
        </span>
        <span style={cardMetaStyle}>ledger eventos: {evidence.obraLedgerEventCount}</span>
        <span style={cardHintStyle}>
          {evidence.systemCertificationsSeparated
            ? 'Provas desta Obra separadas das Certificações do sistema.'
            : 'ATENÇÃO: separação Obra vs sistema não confirmada.'}
        </span>
      </DiagnosticsCard>
    </section>
  )
}

const cardMetaStyle: React.CSSProperties = {
  fontFamily: 'var(--cc-font-mono)',
  fontSize: 11,
  color: 'var(--cc-text-muted)',
  letterSpacing: 'var(--cc-tracking-data)',
}

const cardHintStyle: React.CSSProperties = {
  fontFamily: 'var(--cc-font-sans)',
  fontSize: 11.5,
  color: 'var(--cc-text-faint)',
  lineHeight: 'var(--cc-leading-snug)',
}

function DiagnosticsCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <article
      style={{
        padding: 12,
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 'var(--cc-radius-sm)',
        background: 'var(--cc-surface-raised)',
        display: 'grid',
        gap: 4,
      }}
    >
      <span style={eyebrowStyle}>{label}</span>
      {children}
    </article>
  )
}

function SafetyStrip({ snapshot }: { snapshot: AtlasCodeObraCommandCenter }) {
  const safety = snapshot.safetySummary
  type SafetyTone = 'success' | 'danger' | 'info' | 'neutral'
  const items: Array<{ k: string; v: string; tone: SafetyTone }> = [
    { k: 'provider externo', v: safety.externalProviderCall ? 'sim' : 'não', tone: safety.externalProviderCall ? 'danger' : 'success' },
    { k: 'tokens', v: String(safety.providerTokensSpent), tone: 'neutral' },
    { k: 'completion', v: safety.completionClaimPromoted ? 'promovido' : 'não promovido', tone: safety.completionClaimPromoted ? 'danger' : 'success' },
    { k: 'review gate', v: safety.reviewCompletionGatePreserved ? 'preservado' : 'AUSENTE', tone: safety.reviewCompletionGatePreserved ? 'success' : 'danger' },
    { k: 'external rivals', v: safety.externalRivalsCertification, tone: 'info' },
  ]
  return (
    <section
      style={{
        padding: '10px 12px',
        border: '1px solid var(--cc-border-soft)',
        background: 'var(--cc-surface-sunken)',
        borderRadius: 'var(--cc-radius-sm)',
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        fontFamily: 'var(--cc-font-mono)',
        fontSize: 11,
        color: 'var(--cc-text-muted)',
        letterSpacing: 'var(--cc-tracking-data)',
      }}
      aria-label="Safety strip"
    >
      {items.map((it) => (
        <span key={it.k} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ color: 'var(--cc-text-faint)' }}>{it.k}:</span>
          <SafetyValue tone={it.tone}>{it.v}</SafetyValue>
        </span>
      ))}
    </section>
  )
}

function SafetyValue({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'success' | 'danger' | 'info' | 'neutral'
}) {
  const color =
    tone === 'success'
      ? 'var(--cc-success-fg)'
      : tone === 'danger'
        ? 'var(--cc-danger-fg)'
        : tone === 'info'
          ? 'var(--cc-info-fg)'
          : 'var(--cc-text)'
  return <span style={{ color, fontWeight: 600 }}>{children}</span>
}

function AdvancedDetails({ snapshot }: { snapshot: AtlasCodeObraCommandCenter }) {
  const entries = Object.entries(snapshot.advancedRefs)
  if (entries.length === 0) return null
  return (
    <details
      style={{
        fontFamily: 'var(--cc-font-mono)',
        fontSize: 10.5,
        color: 'var(--cc-text-faint)',
        letterSpacing: 'var(--cc-tracking-data)',
      }}
    >
      <summary style={{ cursor: 'pointer', color: 'var(--cc-text-muted)' }}>
        Ver detalhes técnicos · advanced refs
      </summary>
      <ul
        style={{
          margin: '6px 0 0',
          padding: '0 0 0 16px',
          display: 'grid',
          gap: 2,
        }}
      >
        {entries.map(([key, value]) => (
          <li key={key}>
            <code style={{ color: 'var(--cc-text-muted)' }}>{key}</code>:{' '}
            <span style={{ color: 'var(--cc-text)' }}>
              {value === null || value === undefined ? '—' : String(value)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
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

function mapHealthDot(queueStatus: string): string {
  switch (queueStatus) {
    case 'running':
      return 'running'
    case 'queued':
      return 'queued'
    case 'stale':
      return 'blocked'
    case 'idle':
      return 'ready'
    default:
      return 'unknown'
  }
}
