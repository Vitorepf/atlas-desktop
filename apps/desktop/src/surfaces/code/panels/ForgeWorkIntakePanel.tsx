import { useEffect, useMemo, useState, useTransition } from 'react'
import { PanelTitle } from '@atlas/ui'
import type { AtlasCodeForgeWorkIntake, AtlasCodeForgeWorkIntakePayload } from '@atlas/domain'
import { btnPrimary, Row } from './RightRailPrimitives'

interface ForgeWorkIntakePanelProps {
  obraId: string | null
  intake: AtlasCodeForgeWorkIntake | null
  busy: boolean
  onRefresh: () => Promise<void>
  onSave: (payload: AtlasCodeForgeWorkIntakePayload) => Promise<void>
}

const READINESS_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  ready: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  blocked: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
}

/**
 * Atlas Code Forge Work Intake & Spec Governance v1 · UI.
 *
 * Operador preenche objetivo/regra de negocio/escopo/aceite/docs canonicas e
 * o backend calcula readiness. UI nao inventa readiness; somente exibe estado real.
 *
 * Doc: docs/engineering-knowledge-base/atlas-code-forge-work-intake-spec-governance-v1.md
 */
export function ForgeWorkIntakePanel({ obraId, intake, busy, onRefresh, onSave }: ForgeWorkIntakePanelProps) {
  const [objective, setObjective] = useState(intake?.objective ?? '')
  const [businessRule, setBusinessRule] = useState(intake?.businessRule ?? '')
  const [scopeInText, setScopeInText] = useState((intake?.scopeIn ?? []).join('\n'))
  const [scopeOutText, setScopeOutText] = useState((intake?.scopeOut ?? []).join('\n'))
  const [acceptanceText, setAcceptanceText] = useState((intake?.acceptanceCriteria ?? []).join('\n'))
  const [canonicalDocsText, setCanonicalDocsText] = useState((intake?.canonicalDocs ?? []).join('\n'))
  const [riskLevel, setRiskLevel] = useState(intake?.riskLevel ?? 'medium')
  const [operatorNotes, setOperatorNotes] = useState(intake?.operatorNotes ?? '')

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (! intake) return
    queueMicrotask(() => {
      setObjective(intake.objective ?? '')
      setBusinessRule(intake.businessRule ?? '')
      setScopeInText(intake.scopeIn.join('\n'))
      setScopeOutText(intake.scopeOut.join('\n'))
      setAcceptanceText(intake.acceptanceCriteria.join('\n'))
      setCanonicalDocsText(intake.canonicalDocs.join('\n'))
      setRiskLevel(intake.riskLevel || 'medium')
      setOperatorNotes(intake.operatorNotes ?? '')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intake?.intakeId, intake?.updatedAt])

  const readiness = intake?.readinessStatus ?? 'blocked'
  const tone = READINESS_TONE[readiness] ?? READINESS_TONE.blocked
  const disabledBase = ! obraId || busy || pending

  const meta = useMemo(() => {
    if (! obraId) return 'sem Obra'
    return `${readiness} · ${intake?.nextAction ?? 'awaiting_save'}`
  }, [obraId, readiness, intake?.nextAction])

  const splitLines = (value: string): string[] =>
    value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')

  function handleSave() {
    if (! obraId) {
      setError('obra_required')
      return
    }
    setError(null)
    const payload: AtlasCodeForgeWorkIntakePayload = {
      objective: objective.trim() || null,
      businessRule: businessRule.trim() || null,
      scopeIn: splitLines(scopeInText),
      scopeOut: splitLines(scopeOutText),
      acceptanceCriteria: splitLines(acceptanceText),
      canonicalDocs: splitLines(canonicalDocsText),
      riskLevel,
      operatorNotes: operatorNotes.trim() || null,
    }
    startTransition(() => {
      void onSave(payload).catch((e) => setError(e instanceof Error ? e.message : String(e)))
    })
  }

  function handleRefresh() {
    if (! obraId) {
      setError('obra_required')
      return
    }
    setError(null)
    startTransition(() => {
      void onRefresh().catch((e) => setError(e instanceof Error ? e.message : String(e)))
    })
  }

  if (! obraId) {
    return (
      <section className="ops-panel">
        <div className="ops-section">
          <PanelTitle label="Forge Work Intake" meta="sem Obra" />
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--rec-red-veil, rgba(138,48,37,0.08))',
              border: '1px solid var(--rec-red, #8a3025)',
              borderRadius: 2,
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--rec-red, #8a3025)',
              letterSpacing: '0.6px',
            }}
          >
            sem Obra · intake fail-closed · selecione uma Obra para registrar o intake
          </div>
        </div>
      </section>
    )
  }

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 48,
    padding: '6px 8px',
    fontFamily: 'var(--mono)',
    fontSize: 10.5,
    border: '1px solid var(--bronze-soft)',
    borderRadius: 2,
    background: 'var(--cream)',
    color: 'var(--ink)',
    resize: 'vertical',
  }
  const inputStyle: React.CSSProperties = {
    ...textareaStyle,
    minHeight: 28,
  }

  return (
    <section className="ops-panel">
      <div className="ops-section">
        <PanelTitle label="Forge Work Intake" meta={meta} />

        <div
          style={{
            padding: '8px 10px',
            background: tone.bg,
            border: `1px solid ${tone.border}`,
            borderRadius: 2,
            display: 'grid',
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 8.5,
              letterSpacing: '1.3px',
              color: tone.fg,
              textTransform: 'uppercase',
            }}
          >
            readiness · {readiness}
            {intake?.enterpriseReady ? ' · enterprise ready ✓' : ''}
          </div>
          <Row k="obra" v={obraId} mono />
          {intake?.workItemCode ? <Row k="work item" v={intake.workItemCode} /> : null}
          {intake?.intakeId ? <Row k="intake id" v={intake.intakeId} mono /> : null}
          {intake?.updatedAt ? <Row k="updated at" v={intake.updatedAt} /> : null}
          {intake?.blockers && intake.blockers.length > 0 ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red)' }}>
              blockers · {intake.blockers.join(' · ')}
            </div>
          ) : null}
          {intake?.nextAction ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
              next · {intake.nextAction}
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
          <label style={{ display: 'grid', gap: 2 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '1.3px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
              objective
            </span>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={disabledBase}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 2 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '1.3px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
              business rule
            </span>
            <textarea
              value={businessRule}
              onChange={(e) => setBusinessRule(e.target.value)}
              disabled={disabledBase}
              style={textareaStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 2 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '1.3px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
              acceptance criteria · uma por linha
            </span>
            <textarea
              value={acceptanceText}
              onChange={(e) => setAcceptanceText(e.target.value)}
              disabled={disabledBase}
              style={textareaStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 2 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '1.3px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
              canonical docs · uma por linha
            </span>
            <textarea
              value={canonicalDocsText}
              onChange={(e) => setCanonicalDocsText(e.target.value)}
              disabled={disabledBase}
              style={textareaStyle}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <label style={{ display: 'grid', gap: 2 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '1.3px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
                scope in
              </span>
              <textarea
                value={scopeInText}
                onChange={(e) => setScopeInText(e.target.value)}
                disabled={disabledBase}
                style={textareaStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 2 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '1.3px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
                scope out
              </span>
              <textarea
                value={scopeOutText}
                onChange={(e) => setScopeOutText(e.target.value)}
                disabled={disabledBase}
                style={textareaStyle}
              />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 6, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '1.3px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
              risk
            </span>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              disabled={disabledBase}
              style={{ ...inputStyle, padding: '4px 6px' }}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
          </div>
          <label style={{ display: 'grid', gap: 2 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '1.3px', color: 'var(--bronze)', textTransform: 'uppercase' }}>
              operator notes
            </span>
            <textarea
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              disabled={disabledBase}
              style={textareaStyle}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <button
              type="button"
              disabled={disabledBase}
              onClick={handleRefresh}
              style={{ ...btnPrimary, background: 'transparent', color: 'var(--bronze)' }}
            >
              refresh
            </button>
            <button
              type="button"
              disabled={disabledBase}
              onClick={handleSave}
              style={{ ...btnPrimary }}
            >
              ✦ save intake
            </button>
          </div>

          {error ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red, #8a3025)', wordBreak: 'break-all' }}>
              error · {error}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
