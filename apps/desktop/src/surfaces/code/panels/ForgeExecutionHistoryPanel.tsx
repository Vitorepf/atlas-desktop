import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

interface ForgeExecutionHistoryPanelProps {
  history: WorkStateSnapshot['forgeLiveExecutionHistory']
  selectedHistoryId?: string | null
  busy?: boolean
  onInspect?: (historyId: string) => void
}

export function ForgeExecutionHistoryPanel({ history, selectedHistoryId, busy = false, onInspect }: ForgeExecutionHistoryPanelProps) {
  const entries = history?.entries ?? []

  return (
    <div className="ops-section">
      <PanelTitle label="Forge Run History" meta={entries.length === 0 ? 'sem runs' : `${entries.length}/${history?.total ?? entries.length}`} />
      {entries.length === 0 ? (
        <EmptyText>nenhuma execucao Forge registrada para esta obra.</EmptyText>
      ) : (
        <div style={{ display: 'grid', gap: 5 }}>
          {entries.slice(0, 6).map((entry) => (
            <div
              key={entry.historyId}
              style={{
                padding: '8px 10px',
                background: 'var(--cream)',
                border: entry.completionClaimAllowed
                  ? '1px solid var(--bronze-soft)'
                  : '1px solid var(--rec-red, #8a3025)',
                borderRadius: 2,
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
                <span
                  style={{
                    fontFamily: 'var(--cc-font-mono)',
                    fontSize: 8.5,
                    letterSpacing: 0,
                    color: 'var(--bronze)',
                    textTransform: 'none',
                  }}
                >
                  {entry.status} · {entry.diffScopeStatus ?? 'scope?'}
                </span>
                <span style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9, color: 'var(--ink3)' }}>
                  {entry.lastRunAt ? new Date(entry.lastRunAt).toLocaleString('pt-BR') : '--'}
                </span>
              </div>
              <dl style={{ margin: '4px 0 0' }}>
                <Row k="run" v={entry.runId ?? entry.historyId} mono />
                <Row k="contract" v={entry.taskContractStatus ?? 'unknown'} ok={entry.taskContractStatus === 'verified'} />
                <Row
                  k="completion"
                  v={entry.completionClaimAllowed ? 'allowed' : 'blocked'}
                  ok={!!entry.completionClaimAllowed}
                />
                <Row
                  k="repair"
                  v={entry.repairTriggered ? `${entry.repairStatus ?? 'triggered'} · simulated=${entry.simulateFailure ? 'yes' : 'no'}` : 'not needed'}
                  ok={!entry.repairTriggered || entry.repairStatus === 'passed'}
                />
                {entry.evidencePackDigest ? (
                  <>
                    <Row
                      k="evidence"
                      v={`${entry.evidencePackDigest.stageReceiptCount} receipts · ${entry.evidencePackDigest.ledgerEventCount} ledger`}
                      ok={entry.evidencePackDigest.engineeringRunPersisted && entry.evidencePackDigest.engineeringEvidencePersisted}
                    />
                    <Row
                      k="pack"
                      v={entry.evidencePackDigest.evidencePackHash ?? 'missing'}
                      mono
                      ok={!!entry.evidencePackDigest.evidencePackHash}
                    />
                  </>
                ) : null}
              </dl>
              {entry.evidencePackDigest?.ledgerEventIds.length ? (
                <div
                  style={{
                    marginTop: 4,
                    fontFamily: 'var(--cc-font-mono)',
                    fontSize: 9.5,
                    color: 'var(--ink3)',
                    wordBreak: 'break-all',
                  }}
                >
                  ledger · {entry.evidencePackDigest.ledgerEventIds.slice(0, 4).join(' · ')}
                </div>
              ) : null}
              {entry.command ? (
                <div
                  style={{
                    marginTop: 4,
                    fontFamily: 'var(--cc-font-mono)',
                    fontSize: 9.5,
                    color: 'var(--ink3)',
                    wordBreak: 'break-all',
                  }}
                >
                  $ {entry.command}
                </div>
              ) : null}
              {onInspect ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onInspect(entry.historyId)}
                  style={{
                    ...btnPrimary,
                    width: '100%',
                    marginTop: 6,
                    background: selectedHistoryId === entry.historyId ? 'var(--moss)' : 'transparent',
                    color: selectedHistoryId === entry.historyId ? 'var(--cream)' : 'var(--ink)',
                    border: selectedHistoryId === entry.historyId ? '1px solid var(--moss)' : '1px solid var(--hair)',
                  }}
                >
                  {selectedHistoryId === entry.historyId ? 'run inspecionado' : 'inspecionar run'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
