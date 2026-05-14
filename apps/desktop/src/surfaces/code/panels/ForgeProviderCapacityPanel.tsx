import { useMemo, useState, useTransition } from 'react'
import { PanelTitle } from '@atlas/ui'
import type {
  AtlasForgeProviderCapacityEntry,
  AtlasForgeProviderFailureMemory,
} from '@atlas/domain'
import type { RightRailContext } from './rightRailTypes'
import { btnPrimary, EmptyText, Row } from './RightRailPrimitives'

const STATUS_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  available: { fg: 'var(--moss)', bg: 'var(--moss-veil)', border: 'var(--moss-soft)' },
  degraded: { fg: 'var(--bronze)', bg: 'var(--bronze-veil)', border: 'var(--bronze-soft)' },
  unavailable: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  blocked: { fg: 'var(--rec-red, #8a3025)', bg: 'var(--rec-red-veil, rgba(138,48,37,0.08))', border: 'var(--rec-red, #8a3025)' },
  unknown: { fg: 'var(--ink3)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
  not_applicable: { fg: 'var(--ink3)', bg: 'var(--cream)', border: 'var(--hair-soft)' },
}

const SIMULATE_FAILURE_OPTIONS: { value: string; label: string }[] = [
  { value: 'rate_limit', label: 'rate_limit (cooldown 60s)' },
  { value: 'quota_exhausted', label: 'quota_exhausted (cooldown 600s)' },
  { value: 'auth_failed', label: 'auth_failed (block, no cooldown)' },
  { value: 'timeout', label: 'timeout (retry 30s)' },
  { value: 'context_limit', label: 'context_limit (reroute)' },
  { value: 'model_unavailable', label: 'model_unavailable (cooldown 120s)' },
  { value: 'provider_error', label: 'provider_error (retry 30s)' },
  { value: 'insufficient_capability', label: 'insufficient_capability' },
  { value: 'provider_capacity_exhausted', label: 'provider_capacity_exhausted (BLOCK 900s)' },
]

const CANONICAL_PROVIDERS = [
  { value: 'claude_cli', label: 'Claude CLI' },
  { value: 'codex_cli', label: 'Codex CLI' },
  { value: 'gemini_cli', label: 'Gemini CLI' },
  { value: 'claude_codex', label: 'Claude orchestrating Codex' },
  { value: 'atlas-local', label: 'Atlas local runtime' },
]

const CANONICAL_ROLES = [
  { value: 'primary_builder', label: 'primary_builder' },
  { value: 'critical_reviewer', label: 'critical_reviewer' },
  { value: 'context_scout', label: 'context_scout' },
  { value: 'repair_agent', label: 'repair_agent' },
  { value: 'local_tool_runner', label: 'local_tool_runner' },
]

/**
 * Atlas Forge Provider Capacity Panel.
 *
 * Operational view of the local capacity layer that feeds Atlas Decide and
 * Provider Topology. Renders backend data exclusively. Does NOT call provider
 * externally, does NOT auto-complete work, does NOT bypass review/completion.
 *
 * Doc: docs/engineering-knowledge-base/atlas-forge-provider-capacity-continuity-v1.md
 *
 * Hard rules enforced by the surface:
 *   - sem Obra → mostra capacity global read-only e bloqueia record failure;
 *   - dropdowns são fechados (apenas providers/roles/failures canônicos);
 *   - cooldown ativo destacado; capacity_exhausted vermelho;
 *   - todo I/O via useBridge (sem chamada direta no componente).
 */
export function ForgeProviderCapacityPanel(ctx: RightRailContext) {
  const {
    obra,
    busy,
    forgeProviderCapacity,
    forgeProviderFailureMemory,
    onRefreshForgeProviderCapacity,
    onRecordForgeProviderFailure,
  } = ctx

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [simulateProvider, setSimulateProvider] = useState<string>('claude_cli')
  const [simulateRole, setSimulateRole] = useState<string>('primary_builder')
  const [simulateFailure, setSimulateFailure] = useState<string>('rate_limit')

  const hasObra = !!obra?.id
  const capacity = forgeProviderCapacity
  const memory = forgeProviderFailureMemory

  const topTone = useMemo(() => {
    if (!capacity) return STATUS_TONE.unknown
    return STATUS_TONE[capacity.status] ?? STATUS_TONE.unknown
  }, [capacity])

  const cooldownActive = useMemo(() => {
    if (!capacity) return false
    return capacity.providers.some((p) => p.cooldownUntil && new Date(p.cooldownUntil) > new Date())
  }, [capacity])

  const refresh = () => {
    setError(null)
    startTransition(() => {
      void onRefreshForgeProviderCapacity().catch((e: unknown) => setError(String(e)))
    })
  }

  const recordFailure = () => {
    if (!hasObra) {
      setError('obra_required')
      return
    }
    setError(null)
    startTransition(() => {
      void onRecordForgeProviderFailure({
        provider: simulateProvider,
        failureType: simulateFailure,
        role: simulateRole,
        reason: `cockpit-simulated:${simulateFailure}`,
      })
        .then(() => onRefreshForgeProviderCapacity())
        .catch((e: unknown) => setError(String(e)))
    })
  }

  const counts = capacity
    ? `available=${capacity.availableCount} · degraded=${capacity.degradedCount} · unavailable=${capacity.unavailableCount} · unknown=${capacity.unknownCount}`
    : '—'

  return (
    <section className="rr-panel" aria-labelledby="forge-provider-capacity-panel-title">
      <PanelTitle
        label="Forge Provider Capacity"
        meta={capacity ? capacity.status : 'aguardando'}
      />

      {!capacity ? (
        <EmptyText>aguardando snapshot — clique refresh para carregar capacity local.</EmptyText>
      ) : (
        <>
          <div
            style={{
              display: 'inline-block',
              color: topTone.fg,
              background: topTone.bg,
              borderColor: topTone.border,
              border: '1px solid',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            status · {capacity.status}
          </div>
          <Row k="best available" v={capacity.bestAvailableProvider ?? '—'} mono />
          <Row k="counts" v={counts} />
          <Row
            k="runtime dispatch"
            v={capacity.runtimeDispatchAllowed ? 'allowed' : 'blocked'}
            ok={capacity.runtimeDispatchAllowed}
          />
          <Row k="snapshot id" v={capacity.snapshotId} mono />
          <Row k="next action" v={capacity.nextAction} mono />

          {capacity.blockers.length > 0 && (
            <div
              style={{
                marginTop: 8,
                padding: '6px 8px',
                background: 'var(--rec-red-veil, rgba(138,48,37,0.08))',
                border: '1px solid var(--rec-red, #8a3025)',
                borderRadius: 4,
                fontSize: 12,
                color: 'var(--rec-red, #8a3025)',
              }}
            >
              <strong>blockers:</strong> {capacity.blockers.join(', ')}
            </div>
          )}

          {cooldownActive && (
            <div
              style={{
                marginTop: 8,
                padding: '6px 8px',
                background: 'var(--bronze-veil)',
                border: '1px solid var(--bronze-soft)',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              cooldown ativo em pelo menos um provider — fallback governado em vigor.
            </div>
          )}

          <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Providers (5 canônicos)
          </h4>
          <ProviderTable providers={capacity.providers} />
        </>
      )}

      {memory && memory.events.length > 0 && (
        <>
          <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Failure Memory (últimos 5)
          </h4>
          <FailureMemoryTable memory={memory} />
        </>
      )}

      <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Ações operacionais
      </h4>
      {!hasObra ? (
        <EmptyText>
          sem Obra · capacity é global read-only · selecione uma Obra para registrar failure memory.
        </EmptyText>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
          <label style={{ fontSize: 11 }}>
            provider
            <select
              value={simulateProvider}
              onChange={(e) => setSimulateProvider(e.target.value)}
              style={{ width: '100%', marginTop: 2, fontSize: 12 }}
            >
              {CANONICAL_PROVIDERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 11 }}>
            role
            <select
              value={simulateRole}
              onChange={(e) => setSimulateRole(e.target.value)}
              style={{ width: '100%', marginTop: 2, fontSize: 12 }}
            >
              {CANONICAL_ROLES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 11 }}>
            failure
            <select
              value={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.value)}
              style={{ width: '100%', marginTop: 2, fontSize: 12 }}
            >
              {SIMULATE_FAILURE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={refresh} disabled={busy || pending} style={btnPrimary}>
          refresh capacity
        </button>
        <button
          type="button"
          onClick={recordFailure}
          disabled={busy || pending || !hasObra}
          style={btnPrimary}
        >
          record failure
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 8px',
            background: 'var(--rec-red-veil, rgba(138,48,37,0.08))',
            border: '1px solid var(--rec-red, #8a3025)',
            borderRadius: 4,
            fontSize: 11,
            color: 'var(--rec-red, #8a3025)',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 10, color: 'var(--ink3)' }}>
        read-model local · nunca chama provider externo · failure memory NUNCA reduz quality gates · dispatcher é eixo separado
      </div>
    </section>
  )
}

function ProviderTable({ providers }: { providers: AtlasForgeProviderCapacityEntry[] }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {providers.map((entry) => {
        const tone = STATUS_TONE[entry.status ?? 'unknown'] ?? STATUS_TONE.unknown
        return (
          <div
            key={entry.provider}
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 90px 1fr',
              gap: 6,
              alignItems: 'baseline',
              fontSize: 11,
              padding: '4px 6px',
              border: '1px solid var(--hair-soft)',
              borderRadius: 4,
            }}
          >
            <code style={{ fontSize: 11 }}>{entry.provider}</code>
            <span
              style={{
                color: tone.fg,
                background: tone.bg,
                borderColor: tone.border,
                border: '1px solid',
                padding: '1px 6px',
                borderRadius: 3,
                fontSize: 10,
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              {entry.status ?? '—'}
            </span>
            <div style={{ display: 'flex', gap: 8, color: 'var(--ink3)', fontSize: 10 }}>
              <span>cap={entry.capacityState}</span>
              <span>rate={entry.rateLimitState}</span>
              <span>quota={entry.quotaState}</span>
              <span>auth={entry.authState ?? '—'}</span>
              {entry.cooldownUntil && <span>cooldown→{shortTime(entry.cooldownUntil)}</span>}
            </div>
            {entry.blockers && entry.blockers.length > 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  fontSize: 10,
                  color: 'var(--rec-red, #8a3025)',
                }}
              >
                blockers: {entry.blockers.join(', ')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function FailureMemoryTable({ memory }: { memory: AtlasForgeProviderFailureMemory }) {
  const recent = memory.events.slice(0, 5)
  return (
    <div style={{ display: 'grid', gap: 3, fontSize: 10, color: 'var(--ink3)' }}>
      {recent.map((event) => (
        <div
          key={event.eventId}
          style={{
            display: 'grid',
            gridTemplateColumns: '110px 110px 1fr 90px',
            gap: 6,
            padding: '2px 6px',
            border: '1px solid var(--hair-soft)',
            borderRadius: 3,
          }}
        >
          <code>{event.provider}</code>
          <code>{event.failureType}</code>
          <span>action={event.action ?? '—'} · before={event.providerStatusBefore ?? '—'} → after={event.providerStatusAfter ?? '—'}</span>
          <span>{shortTime(event.occurredAt)}</span>
        </div>
      ))}
      <div style={{ marginTop: 4 }}>
        eventos: {memory.eventCount} · max: {memory.maxEvents ?? 50} · dedupe: {memory.dedupeWindowSeconds ?? 60}s
      </div>
    </div>
  )
}

function shortTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString()
  } catch {
    return iso
  }
}
