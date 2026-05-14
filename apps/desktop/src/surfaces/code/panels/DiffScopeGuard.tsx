import { PanelTitle } from '@atlas/ui'
import type { WorkStateSnapshot } from '@atlas/domain'
import { EmptyText } from './RightRailPrimitives'

interface DiffScopeGuardProps {
  liveExecution: WorkStateSnapshot['forgeLiveExecution']
}

export function DiffScopeGuard({ liveExecution }: DiffScopeGuardProps) {
  const diffScope = liveExecution?.diffScope

  if (!diffScope) {
    return (
      <div className="ops-section">
        <PanelTitle label="Diff / Scope Guard" meta="sem artefato" />
        <EmptyText>aguardando diff/scope artifact real</EmptyText>
      </div>
    )
  }

  const completionAllowed = diffScope.completionGate?.completionClaimAllowed ?? false
  const meta = `${diffScope.status} · ${diffScope.scopeStatus ?? 'unknown'} · ${diffScope.changedFileCount ?? diffScope.files.length} files`

  return (
    <div className="ops-section">
      <PanelTitle label="Diff / Scope Guard" meta={meta} />
      <div
        style={{
          display: 'grid',
          gap: 6,
          padding: '8px 10px',
          background: completionAllowed ? 'var(--moss-veil)' : 'var(--rec-red-veil, rgba(138,48,37,0.08))',
          border: completionAllowed ? '1px solid var(--moss-soft)' : '1px solid var(--rec-red, #8a3025)',
          borderRadius: 2,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 8.5,
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            color: completionAllowed ? 'var(--moss)' : 'var(--rec-red, #8a3025)',
          }}
        >
          completion gate · {diffScope.completionGate?.status ?? 'unknown'} · claim {completionAllowed ? 'allowed' : 'blocked'}
        </div>

        {diffScope.files.length === 0 ? (
          <EmptyText>nenhum arquivo alterado reportado pelo verifier.</EmptyText>
        ) : (
          <div style={{ display: 'grid', gap: 4 }}>
            {diffScope.files.map((file) => (
              <div
                key={file.path}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 8,
                  alignItems: 'baseline',
                  padding: '5px 7px',
                  background: 'var(--cream)',
                  border: `1px solid ${scopeColor(file.status)}`,
                  borderRadius: 2,
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink)', wordBreak: 'break-all' }}>
                  {file.path}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 8,
                    letterSpacing: '1.1px',
                    color: scopeColor(file.status),
                    textTransform: 'uppercase',
                  }}
                >
                  {file.status}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink3)', gridColumn: '1 / -1' }}>
                  {file.ownership ?? 'unclaimed'} · {file.reason ?? 'sem motivo'}
                </span>
              </div>
            ))}
          </div>
        )}

        {diffScope.blockingReasons.length > 0 ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rec-red, #8a3025)', wordBreak: 'break-word' }}>
            blockers · {diffScope.blockingReasons.join(' · ')}
          </div>
        ) : null}

        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)', wordBreak: 'break-all' }}>
          verifier · {diffScope.patchVerifier?.status ?? 'unknown'} · rollback {diffScope.rollbackAvailable ? 'available' : 'missing'} · manifest {diffScope.manifestId ?? '—'}
        </div>
      </div>
    </div>
  )
}

function scopeColor(status: string) {
  if (status === 'in_scope') return 'var(--moss)'
  if (status === 'adjacent') return 'var(--bronze)'
  if (status === 'forbidden' || status === 'needs_replan') return 'var(--rec-red, #8a3025)'
  return 'var(--ink3)'
}
