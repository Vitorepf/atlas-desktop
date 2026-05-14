import { useMemo, useRef, useState, useTransition } from 'react'
import { PanelTitle } from '@atlas/ui'
import type {
  AtlasForgeContinuumCertificationSummary,
  AtlasForgeProviderRole,
  AtlasForgeProviderTopology,
} from '@atlas/domain'
import type { RightRailContext } from './rightRailTypes'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

const STATUS_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  available: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  selected: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  rerouted: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  fallback_selected: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  unavailable: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  retry_later: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  blocked: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  provider_capacity_exhausted: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  blocked_obra_required: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  not_required: { fg: 'var(--ink3)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
}

const SIMULATE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'no simulation' },
  { value: 'rate_limit', label: 'rate_limit (reroute)' },
  { value: 'quota_exhausted', label: 'quota_exhausted (reroute)' },
  { value: 'timeout', label: 'timeout (retry_later)' },
  { value: 'context_limit', label: 'context_limit (reroute)' },
  { value: 'model_unavailable', label: 'model_unavailable (reroute)' },
  { value: 'provider_error', label: 'provider_error (retry_later)' },
  { value: 'auth_failed', label: 'auth_failed (block)' },
  { value: 'insufficient_capability', label: 'insufficient_capability (reroute|block)' },
  { value: 'provider_capacity_exhausted', label: 'provider_capacity_exhausted (BLOCK)' },
]

/**
 * Atlas Forge Provider Topology Panel.
 *
 * Operational read-model of provider roles, fallback chain, capacity and
 * governed fallback events for the Atlas Forge Continuum OS. Renders backend
 * data exclusively — never invents providers/models, never auto-completes
 * work, never overrides Atlas Decide.
 *
 * Doc: docs/engineering-knowledge-base/atlas-forge-provider-topology-and-fallback-v1.md
 *
 * Hard rules enforced by the surface:
 *   - sem Obra = fail-closed visual (CTA: bind Obra);
 *   - fallback nunca silencioso (banner explícito);
 *   - capacity exhausted = blocker vermelho;
 *   - manual override de provider/model é futuro (disabled);
 *   - todo I/O passa por useBridge (sem chamadas diretas no componente).
 */
export function ForgeProviderTopologyPanel(ctx: RightRailContext) {
  const {
    obra,
    busy,
    forgeProviderTopology,
    forgeContinuumCertification,
    forgeRuntimeDispatch,
    onRefreshForgeProviderTopology,
    onRunForgeRuntimeDispatch,
    onRefreshForgeRuntimeDispatch,
  } = ctx

  const [pending, startTransition] = useTransition()
  const [simulate, setSimulate] = useState<string>('')
  const [dispatchRole, setDispatchRole] = useState<string>('primary_builder')
  const [createChildReceipt, setCreateChildReceipt] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const obraId = obra?.id ?? null
  const topology = forgeProviderTopology
  const certification = forgeContinuumCertification
  const dispatch = forgeRuntimeDispatch

  const lifecycleTone = useMemo(() => {
    if (!topology) return STATUS_TONE.unavailable
    return STATUS_TONE[topology.status] ?? STATUS_TONE.available
  }, [topology])

  const lastEvent = topology?.lastFallbackEvent ?? null

  const blockerSet = useMemo(() => {
    const set = new Set<string>()
    for (const blocker of topology?.blockers ?? []) set.add(blocker)
    for (const blocker of certification?.blockers ?? []) set.add(blocker)
    return Array.from(set)
  }, [topology, certification])

  const capacityExhausted = blockerSet.includes('provider_capacity_exhausted')

  // Reset transient error when Obra changes, without triggering an effect.
  const lastObraIdRef = useRef<string | null>(obraId)
  if (lastObraIdRef.current !== obraId) {
    lastObraIdRef.current = obraId
    if (error !== null) setError(null)
  }

  const refresh = (override?: string) => {
    if (!obraId) {
      setError('obra_required')
      return
    }
    setError(null)
    startTransition(() => {
      void onRefreshForgeProviderTopology(
        override !== undefined
          ? { simulateProviderFailure: override === '' ? undefined : override }
          : { simulateProviderFailure: simulate === '' ? undefined : simulate },
      ).catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e))
      })
    })
  }

  if (!obraId) {
    return (
      <section className="rail-panel" aria-labelledby="forge-provider-topology-title">
        <PanelTitle label="Provider Topology" />
        <EmptyText>
          Selecione uma Obra. Atlas Forge Continuum OS é fail-closed sem Obra vinculada — Provider Topology nunca executa sem binding.
        </EmptyText>
      </section>
    )
  }

  if (!topology) {
    return (
      <section className="rail-panel" aria-labelledby="forge-provider-topology-title">
        <PanelTitle label="Provider Topology" />
        <EmptyText>
          Topologia ainda não materializada. Carregue o state ou rode atlas:forge:continuum-certify --obra={obraId} --json.
        </EmptyText>
        <button
          type="button"
          style={{ ...btnPrimary, marginTop: 10 }}
          onClick={() => refresh()}
          disabled={busy || pending}
        >
          {busy || pending ? 'loading…' : 'refresh topology'}
        </button>
      </section>
    )
  }

  return (
    <section className="rail-panel" aria-labelledby="forge-provider-topology-title">
      <PanelTitle label="Provider Topology" />

      <div
        style={{
          padding: '6px 10px',
          margin: '8px 0 12px 0',
          border: `1px solid ${lifecycleTone.border}`,
          background: lifecycleTone.bg,
          color: lifecycleTone.fg,
          fontFamily: 'var(--mono)',
          fontSize: 9.5,
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
        }}
      >
        {topology.status}
      </div>

      <Row k="topology id" v={topology.providerTopologyId || '—'} mono />
      <Row k="strategy" v={topology.strategy ?? '—'} />
      <Row k="decision source" v={topology.decisionSource ?? 'static_policy'} mono ok={topology.decisionSource === 'live_atlas_decide'} />
      <Row k="obra" v={topology.obraId ?? '—'} mono />
      <Row k="decision receipt" v={topology.decisionReceiptId ?? '—'} mono />
      <Row k="receipt hash" v={topology.decisionReceiptHash ?? '—'} mono />
      <Row k="receipt schema" v={topology.receiptSchemaVersion ?? '—'} mono />
      <Row k="runtime dispatch" v={topology.runtimeDispatchAllowed ? 'allowed' : 'blocked'} ok={Boolean(topology.runtimeDispatchAllowed)} />
      <Row k="child receipt required" v={topology.fallbackChildReceiptRequired ? 'yes' : 'no'} ok={!topology.fallbackChildReceiptRequired} />
      <Row k="fast path run" v={topology.fastPathRunId ?? '—'} mono />
      <Row k="next action" v={topology.nextAction} />
      <Row k="external provider call" v={topology.externalProviderCall ? 'yes' : 'no'} ok={!topology.externalProviderCall} />
      <Row k="is read model" v={topology.isReadModel ? 'yes' : 'no'} ok={topology.isReadModel} />

      <h3
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: 'var(--bronze)',
        }}
      >
        Roles
      </h3>
      {topology.roles.length === 0 ? (
        <EmptyText>Topologia sem roles materializadas.</EmptyText>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topology.roles.map((role) => (
            <RoleCard key={role.role} role={role} />
          ))}
        </div>
      )}

      <h3
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: 'var(--bronze)',
        }}
      >
        Fallback chain
      </h3>
      {topology.fallbackChain.length === 0 ? (
        <EmptyText>Sem fallback chain declarada para esta estratégia.</EmptyText>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {topology.fallbackChain.map((entry) => (
            <li
              key={`${entry.order}-${entry.role}-${entry.provider}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                borderBottom: '1px solid var(--hair-soft)',
                alignItems: 'baseline',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: entry.capable ? 'var(--ink)' : 'var(--ink3)',
              }}
            >
              <span>#{entry.order} · {entry.role ?? '—'}</span>
              <span>{entry.provider ?? '—'}/{entry.model ?? '—'} {entry.capable ? '· capable' : '· not capable'}</span>
            </li>
          ))}
        </ul>
      )}

      <h3
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: 'var(--bronze)',
        }}
      >
        Provider capacity
      </h3>
      {topology.providerCapacity.length === 0 ? (
        <EmptyText>Sem capacidade declarada.</EmptyText>
      ) : (
        topology.providerCapacity.map((entry) => (
          <Row
            key={entry.provider}
            k={entry.provider}
            v={`${entry.capacityState} · quota:${entry.quotaState} · rate:${entry.rateLimitState}`}
            mono
          />
        ))
      )}

      <h3
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: 'var(--bronze)',
        }}
      >
        Governed fallback
      </h3>
      {topology.decisionSource !== 'live_atlas_decide' ? (
        <div
          style={{
            padding: '6px 8px',
            margin: '4px 0 6px 0',
            border: '1px solid var(--bronze-soft)',
            background: 'var(--bronze-veil)',
            color: 'var(--bronze)',
            fontFamily: 'var(--mono)',
            fontSize: 9.5,
            letterSpacing: '1.1px',
            textTransform: 'uppercase',
          }}
        >
          static policy · aguardando Decision Receipt real do Atlas Decide
        </div>
      ) : null}
      <div
        style={{
          padding: '6px 8px',
          margin: '4px 0 6px 0',
          border: '1px solid var(--hair-soft)',
          background: 'var(--cream)',
          color: 'var(--ink2)',
          fontFamily: 'var(--mono)',
          fontSize: 9.5,
          letterSpacing: '1.1px',
          textTransform: 'uppercase',
        }}
        aria-live="polite"
      >
        fallback nunca é silencioso · todo reroute gera evento + evidence
      </div>

      {lastEvent ? (
        <div
          style={{
            padding: '6px 8px',
            margin: '6px 0',
            border: '1px solid var(--bronze-soft)',
            background: 'var(--bronze-veil)',
            fontFamily: 'var(--mono)',
            fontSize: 10,
          }}
        >
          <Row k="failure_type" v={lastEvent.failureType} mono />
          <Row k="action" v={lastEvent.action} mono />
          <Row k="blocker" v={lastEvent.blocker ?? '—'} mono />
          <Row k="failed" v={`${lastEvent.failedRole ?? '—'} · ${lastEvent.failedProvider ?? '—'}/${lastEvent.failedModel ?? '—'}`} mono />
          <Row
            k="fallback selected"
            v={`${lastEvent.selectedFallbackRole ?? '—'} · ${lastEvent.selectedFallbackProvider ?? '—'}/${lastEvent.selectedFallbackModel ?? '—'}`}
            mono
          />
          <Row k="silent" v={lastEvent.silent ? 'YES' : 'no'} ok={!lastEvent.silent} />
          <Row k="event id" v={lastEvent.eventId} mono />
          <Row k="occurred at" v={lastEvent.occurredAt} mono />
        </div>
      ) : (
        <EmptyText>Sem evento de fallback registrado para esta topologia.</EmptyText>
      )}

      {capacityExhausted ? (
        <div
          style={{
            padding: '8px 10px',
            margin: '10px 0',
            border: '1px solid var(--rec-red, #8a3025)',
            background: 'var(--rec-red-veil, rgba(138,48,37,0.08))',
            color: 'var(--rec-red, #8a3025)',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
          }}
          role="alert"
        >
          provider_capacity_exhausted · nenhum provider capaz disponível · bloqueio honesto
        </div>
      ) : null}

      <h3
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: 'var(--bronze)',
        }}
      >
        Simulate provider failure
      </h3>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={simulate}
          onChange={(e) => setSimulate(e.target.value)}
          style={{
            flex: 1,
            minWidth: 160,
            padding: '5px 8px',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            border: '1px solid var(--hair-soft)',
            background: 'var(--cream)',
            color: 'var(--ink)',
          }}
          disabled={busy || pending}
        >
          {SIMULATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          style={btnPrimary}
          onClick={() => refresh()}
          disabled={busy || pending}
        >
          {busy || pending ? 'simulating…' : 'simulate / refresh'}
        </button>
      </div>

      <button
        type="button"
        style={{
          ...btnPrimary,
          marginTop: 8,
          background: 'transparent',
          color: 'var(--ink3)',
          cursor: 'not-allowed',
        }}
        disabled
        title="Override manual de provider é futuro (Atlas Decide controla atribuição)"
      >
        manual provider override · disabled
      </button>

      {certification ? (
        <>
          <h3
            style={{
              marginTop: 16,
              marginBottom: 6,
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              color: 'var(--bronze)',
            }}
          >
            Continuum certification
          </h3>
          <Row k="status" v={certification.status} mono />
          <Row k="invariants all true" v={certification.invariantsAllTrue ? 'yes' : 'no'} ok={certification.invariantsAllTrue} />
          <Row k="external provider call" v={certification.externalProviderCall ? 'yes' : 'no'} ok={!certification.externalProviderCall} />
          <Row k="separated from" v={certification.separatedFrom} />
          {certification.evidenceCommand ? (
            <Row k="evidence command" v={certification.evidenceCommand} mono />
          ) : null}
        </>
      ) : null}

      <h3
        style={{
          marginTop: 16,
          marginBottom: 6,
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: 'var(--bronze)',
        }}
      >
        Runtime dispatch
      </h3>

      {dispatch ? (
        <>
          <Row k="status" v={dispatch.status} mono />
          <Row k="dispatch id" v={dispatch.dispatchId ?? '—'} mono />
          <Row k="role" v={dispatch.role ?? '—'} mono />
          <Row k="provider/model" v={`${dispatch.provider ?? '—'} / ${dispatch.model ?? '—'}`} mono />
          <Row k="decision_receipt_id" v={dispatch.decisionReceiptId ?? '—'} mono />
          <Row k="child_decision_receipt_id" v={dispatch.childDecisionReceiptId ?? '—'} mono />
          <Row k="runtime_dispatch_allowed" v={dispatch.runtimeDispatchAllowed ? 'yes' : 'no'} ok={dispatch.runtimeDispatchAllowed} />
          <Row k="external provider call" v={dispatch.externalProviderCall ? 'yes' : 'no'} ok={!dispatch.externalProviderCall} />
          <Row k="provider invocation planned" v={dispatch.providerInvocationPlanned ? 'yes' : 'no'} ok={!dispatch.providerInvocationPlanned} />
          <Row k="completion claim promoted" v={dispatch.completionClaimPromoted ? 'yes' : 'no'} ok={!dispatch.completionClaimPromoted} />
          <Row k="review gate preserved" v={dispatch.reviewCompletionGatePreserved ? 'yes' : 'no'} ok={dispatch.reviewCompletionGatePreserved} />
          {dispatch.fallbackEventId ? (
            <Row k="last fallback event" v={`${dispatch.fallbackFailureType ?? '—'} · ${dispatch.fallbackEventId}`} mono />
          ) : null}
          <Row k="next action" v={dispatch.nextAction ?? '—'} />
        </>
      ) : (
        <EmptyText>Sem dispatch plan registrado. Use o botao abaixo para preparar um novo (read-model governado, nao chama provider externo).</EmptyText>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
        <select
          value={dispatchRole}
          onChange={(e) => setDispatchRole(e.target.value)}
          style={{
            padding: '5px 8px',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            border: '1px solid var(--hair-soft)',
            background: 'var(--cream)',
            color: 'var(--ink)',
          }}
          disabled={busy || pending}
        >
          <option value="primary_builder">primary_builder</option>
          <option value="critical_reviewer">critical_reviewer</option>
          <option value="context_scout">context_scout</option>
          <option value="repair_agent">repair_agent</option>
          <option value="local_tool_runner">local_tool_runner</option>
        </select>
        <label style={{ fontFamily: 'var(--mono)', fontSize: 9.5, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={createChildReceipt}
            onChange={(e) => setCreateChildReceipt(e.target.checked)}
            disabled={busy || pending}
          />
          create child receipt
        </label>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button
          type="button"
          style={btnPrimary}
          onClick={() => {
            if (! obraId) {
              setError('obra_required')
              return
            }
            setError(null)
            startTransition(() => {
              void onRunForgeRuntimeDispatch({
                role: dispatchRole,
                simulateProviderFailure: simulate === '' ? undefined : simulate,
                createChildReceipt: createChildReceipt,
              }).catch((e: unknown) => {
                setError(e instanceof Error ? e.message : String(e))
              })
            })
          }}
          disabled={busy || pending}
        >
          {busy || pending ? 'planning…' : 'prepare dispatch plan'}
        </button>
        <button
          type="button"
          style={{
            ...btnPrimary,
            background: 'transparent',
            color: 'var(--ink)',
            border: '1px solid var(--hair-soft)',
          }}
          onClick={() => {
            if (! obraId) {
              setError('obra_required')
              return
            }
            setError(null)
            startTransition(() => {
              void onRefreshForgeRuntimeDispatch().catch((e: unknown) => {
                setError(e instanceof Error ? e.message : String(e))
              })
            })
          }}
          disabled={busy || pending}
        >
          refresh
        </button>
      </div>
      <div
        style={{
          padding: '6px 8px',
          margin: '6px 0',
          border: '1px solid var(--hair-soft)',
          background: 'var(--cream)',
          color: 'var(--ink2)',
          fontFamily: 'var(--mono)',
          fontSize: 9.5,
          letterSpacing: '1.1px',
          textTransform: 'uppercase',
        }}
        aria-live="polite"
      >
        dispatcher governado · nunca chama provider externo · child receipt para reroute
      </div>

      {error ? (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            border: '1px solid var(--rec-red, #8a3025)',
            color: 'var(--rec-red, #8a3025)',
            fontFamily: 'var(--mono)',
            fontSize: 10,
          }}
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </section>
  )
}

function RoleCard({ role }: { role: AtlasForgeProviderRole }) {
  const tone = STATUS_TONE[role.status] ?? STATUS_TONE.available
  return (
    <div
      style={{
        padding: '8px 10px',
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500, color: tone.fg }}>
          {role.role}
        </span>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '1.1px',
            textTransform: 'uppercase',
            color: tone.fg,
          }}
        >
          {role.status}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink2)' }}>
        {role.provider ?? '—'} / {role.model ?? '—'}
      </div>
      {role.capabilityReason ? (
        <div style={{ fontFamily: 'var(--serif)', fontSize: 11, fontStyle: 'italic', color: 'var(--ink3)' }}>
          {role.capabilityReason}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink3)' }}>
        <span>risk: {role.riskFit ?? '—'}</span>
        <span>·</span>
        <span>autonomy: {role.autonomyLevel ?? '—'}</span>
        <span>·</span>
        <span>order: #{role.fallbackOrder}</span>
      </div>
    </div>
  )
}

/**
 * Helper to render this panel inside the cockpit when a separate tab is not
 * desirable. Currently the panel ships as a standalone right-rail panel
 * registered via rightRailRegistry; this re-export preserves the option to
 * compose it inline without rewiring imports.
 */
export type { AtlasForgeProviderTopology, AtlasForgeContinuumCertificationSummary }
