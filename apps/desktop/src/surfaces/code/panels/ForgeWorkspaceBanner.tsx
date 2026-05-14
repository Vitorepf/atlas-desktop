import type {
  DecisionReceipt,
  ProgrammingGovernanceSnapshot,
} from '@atlas/domain'

interface ForgeWorkspaceBannerProps {
  receipt: DecisionReceipt | null
  governance: ProgrammingGovernanceSnapshot | null
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
export function ForgeWorkspaceBanner({ receipt, governance }: ForgeWorkspaceBannerProps) {
  const obraId = governance?.workItem?.id ?? receipt?.obraId ?? null
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
              fontFamily: 'var(--mono)',
              fontSize: 8.5,
              letterSpacing: '1.3px',
              color: 'var(--rec-red, #8a3025)',
              textTransform: 'uppercase',
            }}
          >
            forge workspace blocker · obra_required
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.4 }}>
            Atlas Code SCOR-1 opera apenas em Forge e exige Obra vinculada. Sem Obra, o ciclo
            Atlas Code → Obra → Forge Workspace → programming.forge fica bloqueado.
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink3)' }}>
            schema · atlas.forge_workspace_blocker.v1 · requires_obra=true
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink3)', wordBreak: 'break-all' }}>
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
            fontFamily: 'var(--mono)',
            fontSize: 8.5,
            letterSpacing: '1.3px',
            color: 'var(--bronze)',
            textTransform: 'uppercase',
          }}
        >
          forge workspace · obras_shared_workspace · forge_workspace
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink)', wordBreak: 'break-all' }}>
          obra · {obraId}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
          flow · programming.forge · surface · atlas_code
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink3)' }}>
          {receiptStatus} · gate runs · {gateRunCount} · evidence refs · {evidenceCount}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bronze)', wordBreak: 'break-all' }}>
          $ {liveCommand}
        </div>
      </div>
    </div>
  )
}
