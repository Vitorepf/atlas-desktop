import type { ProgrammingGovernanceSnapshot, ProgrammingTaskContract } from '@atlas/domain'
import type { MainStageContext } from './mainStageTypes'

/**
 * SCOR-1 Plan viewer.
 *
 * Shows the plan phases + persisted Task Contracts. When the plan is null OR
 * has no tasks, the canonical empty state is shown.
 */
export function PlanStagePanel({ programmingGovernance }: MainStageContext) {
  const plan = programmingGovernance?.plan
  const tasks = programmingGovernance?.tasks ?? []
  const hasPlan = !!plan && Object.keys(plan).length > 0
  const hasTasks = tasks.length > 0

  if (!programmingGovernance || (!hasPlan && !hasTasks)) {
    return (
      <div className="conv-thread" style={{ padding: '40px 24px' }}>
        <EmptyEditorial title="Plan">aguardando plan governado</EmptyEditorial>
      </div>
    )
  }

  const phases = extractPhases(plan)

  return (
    <div className="conv-thread" style={{ padding: '24px 32px', display: 'grid', gap: 20 }}>
      <PlanHeader governance={programmingGovernance} taskCount={tasks.length} />

      {phases.length > 0 ? (
        <section>
          <Eyebrow>phases</Eyebrow>
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 14,
              lineHeight: 1.5,
              color: 'var(--ink)',
            }}
          >
            {phases.map((phase, idx) => (
              <li key={idx} style={{ marginBottom: 6 }}>
                <strong style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 11, color: 'var(--bronze)' }}>
                  {phase.title}
                </strong>
                {phase.detail ? <> · {phase.detail}</> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {hasTasks ? (
        <section>
          <Eyebrow>task contracts · {tasks.length}</Eyebrow>
          <div style={{ display: 'grid', gap: 10 }}>
            {tasks.map((task, idx) => (
              <TaskContractCard key={idx} task={task} index={idx + 1} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function PlanHeader({
  governance,
  taskCount,
}: {
  governance: ProgrammingGovernanceSnapshot
  taskCount: number
}) {
  const wi = governance.workItem
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
        plan · {wi?.code ?? wi?.id ?? '—'}
      </div>
      <div style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 22, lineHeight: 1.25, color: 'var(--ink)' }}>
        {taskCount} task contract{taskCount === 1 ? '' : 's'}
      </div>
      <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 10, color: 'var(--ink3)' }}>
        plan hash · {wi?.planHash ? wi.planHash.slice(0, 16) : '—'}
      </div>
    </div>
  )
}

function TaskContractCard({ task, index }: { task: ProgrammingTaskContract; index: number }) {
  return (
    <article
      style={{
        padding: '12px 14px',
        background: 'var(--cream)',
        border: '1px solid var(--bronze-soft)',
        borderRadius: 2,
        display: 'grid',
        gap: 6,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 10, letterSpacing: 0, color: 'var(--bronze)' }}>
          task {String(index).padStart(2, '0')}
        </span>
        {task.riskLevel ? (
          <span
            style={{
              fontFamily: 'var(--cc-font-mono)',
              fontSize: 9,
              letterSpacing: 0,
              color: 'var(--ink3)',
              textTransform: 'none',
            }}
          >
            risk · {task.riskLevel}
          </span>
        ) : null}
      </header>

      {task.owner ? <KeyValue label="owner" value={task.owner} /> : null}

      <ContractList label="allowed files" items={task.allowedFiles} />
      <ContractList label="forbidden files" items={task.forbiddenFiles} tone="rec-red" />
      <ContractList label="expected files" items={task.expectedFiles} />
      <ContractList label="dependencies" items={task.dependencies} />
      <ContractList label="validation" items={task.validationCommands} mono />
      <ContractList label="acceptance" items={task.acceptanceCriteria} />
      <ContractList label="evidence required" items={task.evidenceRequired} />
      <ContractList label="docs required" items={task.docsRequired} />

      {task.cartographyRequired ? (
        <div
          style={{
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 10,
            color: 'var(--bronze)',
            letterSpacing: 0,
          }}
        >
          cartography · required
        </div>
      ) : null}

      {task.rollback ? <KeyValue label="rollback" value={task.rollback} /> : null}
    </article>
  )
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 11, color: 'var(--ink2)' }}>
      <span style={{ color: 'var(--bronze)' }}>{label} · </span>
      <span style={{ wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}

function ContractList({
  label,
  items,
  mono = false,
  tone,
}: {
  label: string
  items: string[]
  mono?: boolean
  tone?: 'rec-red'
}) {
  if (!items || items.length === 0) return null
  const labelColor = tone === 'rec-red' ? 'var(--rec-red, #8a3025)' : 'var(--bronze)'
  return (
    <div
      style={{
        fontFamily: mono ? 'var(--mono)' : 'var(--serif)',
        fontSize: mono ? 11 : 12.5,
        color: 'var(--ink)',
        lineHeight: 1.45,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--cc-font-mono)',
          fontSize: 9,
          letterSpacing: 0,
          color: labelColor,
          textTransform: 'none',
          marginRight: 6,
        }}
      >
        {label}
      </span>
      <span style={{ wordBreak: 'break-all' }}>{items.join(mono ? ' · ' : ' · ')}</span>
    </div>
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
        marginBottom: 8,
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

interface PhaseEntry {
  title: string
  detail?: string
}

function extractPhases(plan: Record<string, unknown> | null | undefined): PhaseEntry[] {
  if (!plan) return []
  const raw = (plan.phases ?? plan.steps) as unknown
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): PhaseEntry | null => {
      if (typeof item === 'string') return { title: item }
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const title = (r.title ?? r.name ?? r.id) as string | undefined
      if (!title) return null
      const detail = (r.detail ?? r.description ?? r.summary) as string | undefined
      return { title, detail }
    })
    .filter((p): p is PhaseEntry => !!p)
}
