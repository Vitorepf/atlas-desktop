import { PanelTitle } from '@atlas/ui'
import type { ForgeTaskQueueEntry, WorkStateSnapshot } from '@atlas/domain'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

interface ForgeTaskQueuePanelProps {
  queue: WorkStateSnapshot['forgeTaskQueue']
  busy: boolean
  onCreateWorkItem: () => Promise<void>
  onCompileSpecPlan: () => Promise<void>
}

export function ForgeTaskQueuePanel({ queue, busy, onCreateWorkItem, onCompileSpecPlan }: ForgeTaskQueuePanelProps) {
  const hasWorkItem = Boolean(queue?.workItemId)
  const hasSpec = Boolean(queue?.specHash)
  const hasPlan = Boolean(queue?.planHash)

  if (!queue || queue.total === 0) {
    return (
      <div className="ops-section">
        <PanelTitle
          label="Forge Task Queue"
          meta={queue?.workItemCode ? `${queue.workItemCode} · ${hasPlan ? 'plan vazio' : hasSpec ? 'sem plan' : 'sem spec'}` : 'sem tarefas'}
        />
        {queue ? <QueueBindingState queue={queue} /> : null}
        <EmptyText>
          {queue?.requiresPlan ? 'WorkItem vinculado; aguardando Spec/Plan/Tasks' : 'aguardando WorkItem ou task contract real'}
        </EmptyText>
        {!hasWorkItem ? (
          <button
            type="button"
            onClick={() => void onCreateWorkItem()}
            disabled={busy}
            style={{ ...btnPrimary, width: '100%' }}
          >
            {busy ? 'criando...' : 'criar work item'}
          </button>
        ) : null}
        {hasWorkItem && !hasPlan ? (
          <button
            type="button"
            onClick={() => void onCompileSpecPlan()}
            disabled={busy}
            style={{ ...btnPrimary, width: '100%' }}
          >
            {busy ? 'gerando...' : 'gerar spec/plan'}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="ops-section">
      <PanelTitle label="Forge Task Queue" meta={`${queue.total} items · ${queue.sourceAuthority ?? 'sem fonte'}`} />
      <div
        style={{
          display: 'grid',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 5,
          }}
        >
          <Counter label="ready" value={queue.readyCount} />
          <Counter label="blocked" value={queue.blockedCount} alert={queue.blockedCount > 0} />
          <Counter label="review" value={queue.needsReviewCount} />
          <Counter label="verified" value={queue.verifiedCount} ok={queue.verifiedCount > 0} />
        </div>

        <QueueBindingState queue={queue} />

        {queue.entries.slice(0, 5).map((entry) => (
          <QueueEntryCard key={entry.taskId} entry={entry} active={queue.activeTaskId === entry.taskId} />
        ))}
        {!hasWorkItem ? (
          <button
            type="button"
            onClick={() => void onCreateWorkItem()}
            disabled={busy}
            style={{ ...btnPrimary, width: '100%' }}
          >
            {busy ? 'vinculando...' : 'vincular work item'}
          </button>
        ) : null}
        {hasWorkItem && !hasPlan ? (
          <button
            type="button"
            onClick={() => void onCompileSpecPlan()}
            disabled={busy}
            style={{ ...btnPrimary, width: '100%' }}
          >
            {busy ? 'gerando...' : 'gerar spec/plan'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function QueueBindingState({ queue }: { queue: NonNullable<WorkStateSnapshot['forgeTaskQueue']> }) {
  return (
    <dl style={{ margin: 0 }}>
      {queue.workItemCode ? <Row k="work item" v={queue.workItemCode} mono /> : null}
      <Row k="spec" v={queue.specHash ? queue.specHash.slice(0, 18) : 'pendente'} mono ok={Boolean(queue.specHash)} />
      <Row k="plan" v={queue.planHash ? queue.planHash.slice(0, 18) : 'pendente'} mono ok={Boolean(queue.planHash)} />
      <Row k="source" v={queue.sourceAuthority ?? 'none'} />
    </dl>
  )
}

function Counter({
  label,
  value,
  ok = false,
  alert = false,
}: {
  label: string
  value: number
  ok?: boolean
  alert?: boolean
}) {
  return (
    <div
      style={{
        padding: '7px 6px',
        border: '1px solid var(--bronze-soft)',
        background: alert ? 'var(--rec-red-veil, rgba(138,48,37,0.08))' : 'var(--cream)',
        borderRadius: 2,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '1.1px',
          textTransform: 'uppercase',
          color: 'var(--bronze)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 15,
          lineHeight: 1.2,
          color: alert ? 'var(--rec-red, #8a3025)' : ok ? 'var(--moss)' : 'var(--ink)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function QueueEntryCard({ entry, active }: { entry: ForgeTaskQueueEntry; active: boolean }) {
  const blocked = entry.status === 'blocked'
  const verified = entry.status === 'verified'

  return (
    <div
      style={{
        padding: '10px 11px',
        background: 'var(--cream)',
        border: `1px solid ${blocked ? 'var(--rec-red-soft, rgba(138,48,37,0.3))' : active ? 'var(--bronze)' : 'var(--bronze-soft)'}`,
        borderRadius: 2,
        display: 'grid',
        gap: 7,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          alignItems: 'baseline',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            color: 'var(--ink2)',
            fontSize: 12.5,
            lineHeight: 1.35,
            minWidth: 0,
          }}
        >
          {entry.title}
        </div>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 8.5,
            letterSpacing: '1.1px',
            textTransform: 'uppercase',
            color: blocked ? 'var(--rec-red, #8a3025)' : verified ? 'var(--moss)' : 'var(--bronze)',
            whiteSpace: 'nowrap',
          }}
        >
          {entry.status}
        </span>
      </div>

      <dl style={{ margin: 0 }}>
        <Row k="task" v={entry.taskId} mono />
        {entry.workItemCode ? <Row k="work item" v={entry.workItemCode} mono /> : null}
        {entry.runHistoryId ? <Row k="run" v={entry.runHistoryId} mono /> : null}
        <Row k="owner" v={entry.owner ?? '—'} />
        <Row k="risk" v={entry.riskLevel ?? 'unknown'} />
        <Row k="claim" v={entry.completionClaimAllowed ? 'allowed' : 'blocked'} ok={entry.completionClaimAllowed} />
      </dl>

      <CompactList label="allowed" items={entry.allowedFiles} />
      <CompactList label="validate" items={entry.validationCommands} />
      <CompactList label="evidence" items={entry.evidenceRequired} />
      {entry.blockers.length > 0 ? <CompactList label="blockers" items={entry.blockers} alert /> : null}
      {entry.evidencePackHash ? <HashLine label="evidence" value={entry.evidencePackHash} /> : null}
      {entry.stageTimelineHash ? <HashLine label="timeline" value={entry.stageTimelineHash} /> : null}
    </div>
  )
}

function CompactList({ label, items, alert = false }: { label: string; items: string[]; alert?: boolean }) {
  if (items.length === 0) return null

  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 8.5,
          letterSpacing: '1.2px',
          color: alert ? 'var(--rec-red, #8a3025)' : 'var(--bronze)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {items.slice(0, 4).map((item) => (
        <div key={item} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink3)', wordBreak: 'break-all' }}>
          {item}
        </div>
      ))}
    </div>
  )
}

function HashLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 9.5,
        color: 'var(--ink4)',
        wordBreak: 'break-all',
      }}
    >
      {label} hash · {value.slice(0, 18)}
    </div>
  )
}
