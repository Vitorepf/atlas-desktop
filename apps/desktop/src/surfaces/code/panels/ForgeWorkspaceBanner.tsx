import type {
  DecisionReceipt,
  ForgeLiveExecutionSnapshot,
  Obra,
  ProgrammingGovernanceSnapshot,
} from '@atlas/domain'

interface ForgeWorkspaceBannerProps {
  obra: Obra | null
  receipt: DecisionReceipt | null
  governance: ProgrammingGovernanceSnapshot | null
  liveExecution: ForgeLiveExecutionSnapshot | null
  busy: boolean
  onRunLiveExecution: () => Promise<void>
}

/**
 * Forge Workspace Banner · SCOR-1.
 *
 * Mostra explicitamente o vinculo Atlas Code -> Obra -> Forge Workspace
 * -> programming.forge. Sem Obra, exibe o blocker canonico
 * `forge_workspace_blocker.v1`. Reflete decision receipt, evidence refs,
 * live execution command — sempre a partir do payload real, nunca mock.
 *
 * Doc: docs/engineering-knowledge-base/atlas-forge-live-execution-e2e-v1.md
 */
export function ForgeWorkspaceBanner({
  obra,
  receipt,
  governance,
  liveExecution,
  busy,
  onRunLiveExecution,
}: ForgeWorkspaceBannerProps) {
  const obraId = receipt?.obraId ?? obra?.id ?? liveExecution?.obraId ?? null
  const hasObra = !!obraId
  const evidenceCount = governance?.evidenceRefs?.length ?? 0
  const gateRunCount = governance?.gateRuns?.length ?? 0
  const receiptStatus = receipt?.signature
    ? 'receipt · assinado'
    : receipt?.id
      ? 'receipt · aguardando assinatura'
      : 'receipt · pendente'

  const liveCommand = hasObra
    ? `php artisan atlas:forge:live-execute --obra=${obraId} --json --strict`
    : 'php artisan atlas:forge:live-execute --json --strict (bloqueado · sem Obra)'
  const liveStatus = liveExecution?.status ?? 'sem execução'
  const contextPackStatus = liveExecution?.contextPack?.contextCompleteness ?? '—'
  const repairStatus = liveExecution?.repairLoop?.status ?? '—'

  if (!hasObra) {
    return (
      <div className="ops-section">
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--rec-red-veil, rgba(138,48,37,0.08))',
            border: '1px solid var(--rec-red, #8a3025)',
            borderRadius: 2,
            display: 'grid',
            gap: 6,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--cc-font-mono)',
              fontSize: 8.5,
              letterSpacing: 0,
              color: 'var(--rec-red, #8a3025)',
              textTransform: 'none',
            }}
          >
            forge workspace blocker · obra_required
          </div>
          <div style={{ fontFamily: 'var(--cc-font-sans)', fontStyle: 'normal', fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.4 }}>
            Atlas Code SCOR-1 opera apenas em Forge e exige Obra vinculada. Sem Obra, o ciclo
            Atlas Code → Obra → Forge Workspace → programming.forge fica bloqueado.
          </div>
          <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 10, color: 'var(--ink3)' }}>
            schema · atlas.forge_workspace_blocker.v1 · requires_obra=true
          </div>
          <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 10, color: 'var(--ink3)', wordBreak: 'break-all' }}>
            $ {liveCommand}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ops-section">
      <div
        style={{
          padding: '10px 12px',
          background: 'var(--cream)',
          border: '1px solid var(--bronze-soft)',
          borderRadius: 2,
          display: 'grid',
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 8.5,
            letterSpacing: 0,
            color: 'var(--bronze)',
            textTransform: 'none',
          }}
        >
          forge workspace · obras_shared_workspace · forge_workspace
        </div>
        <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 10.5, color: 'var(--ink)', wordBreak: 'break-all' }}>
          obra · {obraId}
        </div>
        <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
          flow · programming.forge · surface · atlas_code
        </div>
        <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
          {receiptStatus} · gate runs · {gateRunCount} · evidence refs · {evidenceCount}
        </div>
        <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
          live · {liveStatus} · context · {contextPackStatus} · repair · {repairStatus}
        </div>
        {liveExecution ? (
          <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
            stages · {liveExecution.stageCount ?? 0} · ledger · {liveExecution.ledgerEventCount ?? 0} · blockers · {liveExecution.remainingBlockers.length}
          </div>
        ) : null}
        <div style={{ fontFamily: 'var(--cc-font-mono)', fontSize: 10, color: 'var(--bronze)', wordBreak: 'break-all' }}>
          $ {liveCommand}
        </div>
        <button
          type="button"
          onClick={() => void onRunLiveExecution()}
          disabled={busy}
          style={{
            marginTop: 4,
            border: '1px solid var(--bronze)',
            background: busy ? 'var(--paper)' : 'var(--ink)',
            color: busy ? 'var(--ink4)' : 'var(--paper)',
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 9,
            letterSpacing: 0,
            textTransform: 'none',
            padding: '8px 10px',
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy ? 'executando…' : 'rodar forge live'}
        </button>
      </div>
    </div>
  )
}
