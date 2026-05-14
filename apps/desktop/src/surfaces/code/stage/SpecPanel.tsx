import type { ProgrammingGovernanceSnapshot } from '@atlas/domain'
import type { MainStageContext } from './mainStageTypes'

/**
 * SCOR-1 Spec viewer.
 *
 * Renders the canonical 9-field spec persisted by `atlas:programming:spec`
 * (or its draft via `spec-compile`). When the spec is null we render the
 * canonical empty state — never a fabricated outline.
 */
export function SpecPanel({ programmingGovernance }: MainStageContext) {
  const spec = programmingGovernance?.spec
  if (!programmingGovernance || !spec || Object.keys(spec).length === 0) {
    return (
      <div className="conv-thread" style={{ padding: '40px 24px' }}>
        <EmptyEditorial title="Spec">aguardando spec governada</EmptyEditorial>
      </div>
    )
  }

  return (
    <div className="conv-thread" style={{ padding: '24px 32px', display: 'grid', gap: 18 }}>
      <SpecHeader governance={programmingGovernance} />

      <SpecField label="objective" value={spec.objective ?? spec.goal} />
      <SpecField label="context" value={spec.context ?? spec.background} />
      <SpecField label="expected behavior" value={spec.expected_behavior ?? spec.expectedBehavior} />
      <SpecFieldList label="likely files" items={asList(spec.likely_files ?? spec.likelyFiles)} />
      <SpecFieldList label="risks" items={asList(spec.risks)} />
      <SpecFieldList label="tests" items={asList(spec.tests)} />
      <SpecFieldList
        label="evidence required"
        items={asList(spec.evidence_required ?? spec.evidenceRequired)}
      />
      <SpecField label="rollback" value={spec.rollback} />
      <SpecFieldList
        label="completion criteria"
        items={asList(spec.completion_criteria ?? spec.completionCriteria)}
      />
    </div>
  )
}

function SpecHeader({ governance }: { governance: ProgrammingGovernanceSnapshot }) {
  const wi = governance.workItem
  if (!wi) return null
  return (
    <div
      style={{
        borderBottom: '1px solid var(--bronze-soft)',
        paddingBottom: 10,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 9.5,
          letterSpacing: 0,
          color: 'var(--bronze)',
          textTransform: 'none',
        }}
      >
        spec · {wi.code || wi.id}
      </div>
      <div style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 22, lineHeight: 1.25, color: 'var(--ink)' }}>
        {wi.intentText || wi.intentType || '—'}
      </div>
      <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 10, color: 'var(--ink3)' }}>
        spec hash · {wi.specHash ? wi.specHash.slice(0, 16) : '—'}
      </div>
    </div>
  )
}

function SpecField({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <section>
      <Eyebrow>{label}</Eyebrow>
      <div
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 14,
          lineHeight: 1.55,
          color: 'var(--ink)',
        }}
      >
        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
      </div>
    </section>
  )
}

function SpecFieldList({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <section>
      <Eyebrow>{label}</Eyebrow>
      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 13.5,
          lineHeight: 1.5,
          color: 'var(--ink)',
        }}
      >
        {items.map((item, idx) => (
          <li key={idx} style={{ marginBottom: 2 }}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--cc-font-mono)',
        fontSize: 9,
        letterSpacing: 0,
        color: 'var(--bronze)',
        textTransform: 'none',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  )
}

function EmptyEditorial({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', color: 'var(--ink3)' }}>
      <div
        style={{
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 9,
          letterSpacing: 0,
          color: 'var(--bronze)',
          textTransform: 'none',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontStyle: 'normal',
          fontSize: 18,
          marginTop: 8,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function asList(v: unknown): string[] {
  if (v == null) return []
  if (Array.isArray(v)) return v.map(stringify).filter(Boolean)
  if (typeof v === 'string') return v.length > 0 ? [v] : []
  return [stringify(v)].filter(Boolean)
}

function stringify(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
