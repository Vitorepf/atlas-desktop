import { PanelTitle } from '@atlas/ui'
import type { AtlasCodeEnterpriseCertificationReport } from '@atlas/domain'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

interface AtlasCodeEnterpriseCertificationPanelProps {
  certification: AtlasCodeEnterpriseCertificationReport | null
  busy: boolean
  onRun: () => void
}

export function AtlasCodeEnterpriseCertificationPanel({
  certification,
  busy,
  onRun,
}: AtlasCodeEnterpriseCertificationPanelProps) {
  const status = certification?.status ?? 'sem certificacao'
  const passed = certification?.status === 'passed'

  return (
    <div className="ops-section">
      <PanelTitle
        label="Enterprise Certification"
        meta={certification ? `${status} · ${certification.stageSummary.passed}/${certification.stageSummary.total}` : status}
      />

      {certification ? (
        <div
          style={{
            display: 'grid',
            gap: 8,
            padding: '9px 10px',
            background: passed ? 'var(--moss-veil)' : 'var(--rec-red-veil, rgba(138,48,37,0.08))',
            border: passed ? '1px solid var(--moss-soft)' : '1px solid var(--rec-red, #8a3025)',
            borderRadius: 2,
          }}
        >
          <dl style={{ margin: 0 }}>
            <Row k="status" v={certification.status} ok={passed} />
            <Row k="schema" v={certification.schemaVersion ?? 'missing'} mono ok={certification.schemaVersion === 'atlas.code.enterprise_certification.v1'} />
            <Row k="stages" v={`${certification.stageSummary.passed}/${certification.stageSummary.total} passed · ${certification.stageSummary.blocked} blocked`} ok={certification.stageSummary.blocked === 0} />
            <Row k="obra" v={certification.inputs.obraId ?? 'ephemeral'} mono />
            <Row k="requires obra" v={certification.inputs.requiresObra ? 'true' : 'false'} ok={certification.inputs.requiresObra} />
            <Row k="provider" v={certification.externalProviderCall ? 'external' : 'none'} ok={!certification.externalProviderCall} />
          </dl>

          {certification.remainingBlockers.length > 0 ? (
            <div
              style={{
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 10,
                color: 'var(--rec-red, #8a3025)',
                wordBreak: 'break-word',
              }}
            >
              blockers · {certification.remainingBlockers.join(' · ')}
            </div>
          ) : null}

          <div style={{ display: 'grid', gap: 3 }}>
            {certification.stages.slice(0, 8).map((stage) => (
              <div
                key={stage.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 6,
                  fontFamily: 'var(--cc-font-mono)',
                  fontSize: 9.5,
                  color: stage.status === 'passed' ? 'var(--ink3)' : 'var(--rec-red, #8a3025)',
                }}
              >
                <span>{stage.name}</span>
                <span>{stage.status}</span>
              </div>
            ))}
          </div>

          {certification.commands.self ? (
            <div
              style={{
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 9.5,
                color: 'var(--ink3)',
                wordBreak: 'break-all',
              }}
            >
              $ {certification.commands.self}
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyText>sem pacote de certificacao enterprise nesta sessao.</EmptyText>
      )}

      <button
        type="button"
        onClick={onRun}
        disabled={busy}
        style={{ ...btnPrimary, width: '100%', marginTop: 8 }}
      >
        {busy ? 'certificando...' : 'rodar certificacao enterprise'}
      </button>
    </div>
  )
}
