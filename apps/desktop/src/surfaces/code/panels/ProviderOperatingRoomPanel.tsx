import { useCallback, useMemo, useState } from 'react'
import { openTerminalInWorkspace } from '../../../lib/bridge'
import type {
  AtlasCodeObservedSession,
  AtlasCodeObservedSessionDecideAction,
  AtlasCodeObservedSessionImportPayload,
  AtlasCodeObservedSessionState,
  AtlasCodeProviderGovernance,
  AtlasCodeProviderOperatingRoom,
  AtlasCodeProviderOperatingRoomAttention,
  AtlasCodeProviderOperatingRoomBoardSlot,
  AtlasCodeWorkPacket,
  AtlasCodeWorkPacketCreatePayload,
  Obra,
} from '@atlas/domain'
import {
  EmptyState,
  MetricRow,
  StatusBadge,
  WorkbenchPanel,
  WorkbenchSection,
  type WorkbenchTone,
} from '../workbench'

/**
 * Atlas Code · Provider Operating Room panel.
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-code-adaptive-provider-operating-room-v1.md
 *   - docs/engineering-knowledge-base/atlas-code-interactive-observed-provider-workflow-v1.md
 *
 * Five blocks, in canonical order (Attention first to reduce multitasking):
 *   1. Attention · the single decision the operator has to make right now
 *   2. Safety strip · subscription-only, headless blocked, workspace status
 *   3. Provider Board · bootstrap role assignments (Atlas Decide will own this later)
 *   4. Work Packets · draft/ready/exported with "create" + "open observed" CTAs
 *   5. Observed Sessions · running list with state transitions + import + decide
 *
 * Design: reuses existing workbench primitives. No new palette, no hero, no
 * decorative cards. Dense and operational, like the rest of Atlas Code.
 */
interface ProviderOperatingRoomPanelProps {
  obra: Obra | null
  governance: AtlasCodeProviderGovernance | null
  operatingRoom: AtlasCodeProviderOperatingRoom | null
  busy: boolean
  onRefreshOperatingRoom: () => Promise<void>
  onCreateWorkPacket: (payload: AtlasCodeWorkPacketCreatePayload) => Promise<AtlasCodeWorkPacket | null>
  onOpenObservedSession: (
    workPacketId: string,
    providerId: string
  ) => Promise<AtlasCodeObservedSession | null>
  onTransitionSession: (
    sessionId: string,
    nextState: 'running' | 'waiting_result_import'
  ) => Promise<AtlasCodeObservedSession | null>
  onImportResult: (
    sessionId: string,
    payload: AtlasCodeObservedSessionImportPayload
  ) => Promise<AtlasCodeObservedSession | null>
  onDecide: (
    sessionId: string,
    action: AtlasCodeObservedSessionDecideAction,
    reason?: string
  ) => Promise<AtlasCodeObservedSession | null>
  /** Advisory gates for an imported session. */
  onRunGates: (sessionId: string) => Promise<AtlasCodeObservedSession | null>
  /** Quick CTA: create packet + open session in one shot. */
  onQuickOpenClaudeCodeObserved: (
    payload: AtlasCodeWorkPacketCreatePayload,
    providerId?: string
  ) => Promise<{ session: AtlasCodeObservedSession; packet: AtlasCodeWorkPacket } | null>
}

export function ProviderOperatingRoomPanel({
  obra,
  governance,
  operatingRoom,
  busy,
  onRefreshOperatingRoom,
  onCreateWorkPacket,
  onOpenObservedSession,
  onTransitionSession,
  onImportResult,
  onDecide,
  onRunGates,
  onQuickOpenClaudeCodeObserved,
}: ProviderOperatingRoomPanelProps) {
  if (!obra) {
    return (
      <WorkbenchPanel
        eyebrow="Provider Operating Room"
        title="Sem Obra selecionada"
      >
        <EmptyState
          title="Aguardando Obra"
          hint="Provider Operating Room governa Work Packets e sessões observadas dentro de uma Obra. Selecione no rail esquerdo."
        />
      </WorkbenchPanel>
    )
  }

  if (!operatingRoom) {
    return (
      <WorkbenchPanel
        eyebrow="Provider Operating Room"
        title={obra.title}
        action={
          <button
            type="button"
            className="cc-btn cc-btn-secondary"
            disabled={busy}
            onClick={() => void onRefreshOperatingRoom()}
          >
            Atualizar
          </button>
        }
      >
        <EmptyState
          title="Sem read-model"
          tone="warning"
          hint="Endpoint /forge/operating-room indisponível ou bridge offline. Verifique atlas-server."
        />
      </WorkbenchPanel>
    )
  }

  return (
    <WorkbenchPanel
      eyebrow={`Provider Operating Room · ${operatingRoom.schemaVersion}`}
      title={obra.title}
      action={
        <button
          type="button"
          className="cc-btn cc-btn-secondary"
          disabled={busy}
          onClick={() => void onRefreshOperatingRoom()}
        >
          Atualizar
        </button>
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <AttentionSection attention={operatingRoom.attention} />
        <SafetyStripSection room={operatingRoom} governance={governance} />
        <QuickOpenClaudeCodeCTA
          room={operatingRoom}
          busy={busy}
          onQuickOpen={onQuickOpenClaudeCodeObserved}
        />
        <ProviderBoardSection slots={operatingRoom.providerBoard} />
        <WorkPacketsSection
          room={operatingRoom}
          busy={busy}
          onCreateWorkPacket={onCreateWorkPacket}
          onOpenObservedSession={onOpenObservedSession}
        />
        <ObservedSessionsSection
          sessions={operatingRoom.observedSessions.all}
          busy={busy}
          workspacePath={operatingRoom.obra.workspacePath}
          onTransitionSession={onTransitionSession}
          onImportResult={onImportResult}
          onDecide={onDecide}
          onRunGates={onRunGates}
        />
      </div>
    </WorkbenchPanel>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 1 · Attention

function AttentionSection({ attention }: { attention: AtlasCodeProviderOperatingRoomAttention }) {
  const tone: WorkbenchTone = (() => {
    switch (attention.severity) {
      case 'high':
        return 'danger'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
      default:
        return 'success'
    }
  })()
  return (
    <WorkbenchSection eyebrow="Atenção · uma decisão humana por vez">
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge label={attention.kind.replace(/_/g, ' ')} tone={tone} />
          <span
            style={{
              fontSize: 11,
              letterSpacing: 'var(--cc-tracking-data, 0.04em)',
              textTransform: 'uppercase',
              color: 'var(--cc-text-muted)',
              fontFamily: 'var(--cc-font-mono)',
            }}
          >
            severidade · {attention.severity}
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 13,
            lineHeight: 'var(--cc-leading-relaxed, 1.5)',
            color: 'var(--cc-text)',
          }}
        >
          {attention.humanQuestion}
        </div>
        {attention.whyNow ? (
          <div
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 11,
              lineHeight: 1.5,
              color: 'var(--cc-text-muted)',
            }}
          >
            {attention.whyNow}
          </div>
        ) : null}
        {attention.allowedActions.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              fontFamily: 'var(--cc-font-mono)',
              fontSize: 10,
              letterSpacing: 0.4,
              color: 'var(--cc-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            <span>Ações permitidas:</span>
            {attention.allowedActions.map((a, i) => (
              <span key={a}>
                {i > 0 ? '·' : ''} {a}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </WorkbenchSection>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 2 · Safety strip

function SafetyStripSection({
  room,
  governance,
}: {
  room: AtlasCodeProviderOperatingRoom
  governance: AtlasCodeProviderGovernance | null
}) {
  const safety = room.safetySummary
  const apiKey = governance?.apiKeyDetected ?? safety.apiKeyDetected

  // The eyebrow mirrors the current effective policy so the operator can see
  // at a glance whether programmatic is loose, restricted to tests, or off.
  const policyLabel = (() => {
    switch (safety.effectivePolicy) {
      case 'allowed_now':
        return 'allowed_now · todos os modos liberados'
      case 'test_only':
        return 'test_only · Rivals/tests permitidos · productive headless bloqueado'
      case 'interactive_only':
        return 'interactive_only · apenas Claude observed'
      case 'blocked':
        return 'blocked · kill switch ativo'
      default:
        return safety.effectivePolicy
    }
  })()

  return (
    <WorkbenchSection eyebrow={`Safety · ${policyLabel}`}>
      <div style={{ display: 'grid', gap: 0 }}>
        <MetricRow
          label="Policy"
          value={
            <span
              style={{
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 11.5,
                color: 'var(--cc-text)',
              }}
            >
              {safety.claudeProgrammaticPolicy}
              {safety.effectivePolicy !== safety.claudeProgrammaticPolicy
                ? ` → ${safety.effectivePolicy}`
                : ''}
            </span>
          }
          hint={safety.hardBlockAfter ? `hard_block_after ${safety.hardBlockAfter}` : undefined}
        />
        <MetricRow
          label="Rivals / baseline"
          value={
            <SafetyValue
              ok={safety.allowRivalsProgrammatic && safety.programmaticInvocationAllowed}
              label={safety.allowRivalsProgrammatic ? 'permitido' : 'bloqueado'}
            />
          }
        />
        <MetricRow
          label="Tests programáticos"
          value={
            <SafetyValue
              ok={safety.allowProgrammaticTests && safety.programmaticInvocationAllowed}
              label={safety.allowProgrammaticTests ? 'permitido' : 'bloqueado'}
            />
          }
        />
        <MetricRow
          label="Productive headless"
          value={
            <SafetyValue
              ok={!safety.productiveHeadlessAllowed}
              label={safety.productiveHeadlessAllowed ? 'liberado' : 'bloqueado por default'}
            />
          }
        />
        <MetricRow
          label="API / PAYG"
          value={
            <SafetyValue
              ok={!safety.allowApiPayg}
              label={safety.allowApiPayg ? 'liberado' : 'desativado'}
            />
          }
          hint={apiKey ? 'API key detectada no env' : undefined}
        />
        <MetricRow
          label="Workspace path"
          value={
            <SafetyValue
              ok={safety.workspacePathResolved}
              label={safety.workspacePathResolved ? 'resolvido' : 'AUSENTE'}
            />
          }
          hint={safety.workspacePath ?? undefined}
        />
      </div>

      <PolicyLabelGrid decisions={safety.labelDecisions} />

      {safety.blockers.length > 0 ? (
        <div
          role="alert"
          style={{
            marginTop: 8,
            padding: '6px 8px',
            fontSize: 11,
            color: 'var(--cc-danger-fg, #d4a85a)',
            background: 'var(--cc-danger-veil)',
            border: '1px solid var(--cc-danger-border)',
            borderRadius: 'var(--cc-radius-md)',
            fontFamily: 'var(--cc-font-mono)',
          }}
        >
          Blockers: {safety.blockers.join(' · ')}
        </div>
      ) : null}
      <div
        style={{
          marginTop: 6,
          fontSize: 11,
          color: 'var(--cc-text-muted)',
          lineHeight: 1.5,
        }}
      >
        {safety.completionLaw}
      </div>
    </WorkbenchSection>
  )
}

function PolicyLabelGrid({
  decisions,
}: {
  decisions: AtlasCodeProviderOperatingRoom['safetySummary']['labelDecisions']
}) {
  if (decisions.length === 0) return null
  return (
    <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 'var(--cc-tracking-data, 0.04em)',
          color: 'var(--cc-text-faint)',
          fontFamily: 'var(--cc-font-mono)',
        }}
      >
        Programmatic invocation · por label
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        {decisions.map((d) => (
          <div
            key={d.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr auto',
              alignItems: 'center',
              gap: 6,
              padding: '3px 6px',
              border: '1px solid var(--cc-border-soft)',
              borderRadius: 'var(--cc-radius-md)',
              background: d.allowed ? 'var(--cc-success-veil)' : 'var(--cc-neutral-veil)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 11,
                color: 'var(--cc-text)',
              }}
            >
              {d.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 11,
                color: 'var(--cc-text-muted)',
              }}
              title={d.nextAction}
            >
              {policyDecisionLabel(d.label, d.allowed, d.reason)}
            </span>
            <StatusBadge
              label={d.allowed ? 'allowed' : 'blocked'}
              tone={d.allowed ? 'success' : d.requiresOperatorOverride ? 'warning' : 'danger'}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function policyDecisionLabel(label: string, allowed: boolean, reason: string): string {
  if (allowed) {
    switch (label) {
      case 'rivals_baseline':
      case 'benchmark':
        return 'Permitido para Rivals/baseline'
      case 'provider_integration_test':
        return 'Permitido para testes de integração'
      case 'approved_experiment':
        return 'Liberado para experimentos aprovados'
      case 'productive_headless':
        return 'Liberado (operator override)'
      default:
        return 'Permitido'
    }
  }
  switch (reason) {
    case 'policy_blocked':
      return 'Claude programático bloqueado pela policy'
    case 'policy_interactive_only':
      return 'Use Claude Code interativo observado'
    case 'productive_headless_blocked_by_default':
      return 'Bloqueado por default · requer allow_productive_headless + override'
    default:
      if (reason.startsWith('switch_off:')) {
        return 'Switch off — habilite a flag específica'
      }
      return reason || 'Bloqueado'
  }
}

function SafetyValue({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--cc-font-mono)',
        fontSize: 11.5,
        color: ok ? 'var(--cc-success-fg)' : 'var(--cc-danger-fg)',
        letterSpacing: 'var(--cc-tracking-data, 0.04em)',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 3 · Provider Board

function ProviderBoardSection({ slots }: { slots: AtlasCodeProviderOperatingRoomBoardSlot[] }) {
  return (
    <WorkbenchSection eyebrow="Provider Board · bootstrap roles · Atlas Decide assumirá dinamicamente">
      {slots.length === 0 ? (
        <EmptyState
          title="Sem providers atribuídos"
          hint="Configuração de governance vazia. Verifique atlas-server."
        />
      ) : (
        <div style={{ display: 'grid', gap: 4 }}>
          {slots.map((slot) => {
            const sess = slot.latestSession
            return (
              <div
                key={`${slot.roleSlot}-${slot.providerId}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  border: '1px solid var(--cc-border-soft)',
                  borderRadius: 'var(--cc-radius-md)',
                }}
              >
                <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--cc-font-sans)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--cc-text)',
                    }}
                  >
                    {slot.roleSlot.replace(/_/g, ' ')}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--cc-font-mono)',
                      fontSize: 10,
                      color: 'var(--cc-text-muted)',
                      letterSpacing: 0.3,
                    }}
                  >
                    {slot.providerName} · {slot.invocationMode} · confidence {slot.confidence}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  {sess ? (
                    <StatusBadge
                      label={sess.state.replace(/_/g, ' ')}
                      tone={stateToTone(sess.state)}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--cc-text-faint)',
                        fontFamily: 'var(--cc-font-mono)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                      }}
                    >
                      sem sessão
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </WorkbenchSection>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 4 · Work Packets

function WorkPacketsSection({
  room,
  busy,
  onCreateWorkPacket,
  onOpenObservedSession,
}: {
  room: AtlasCodeProviderOperatingRoom
  busy: boolean
  onCreateWorkPacket: (payload: AtlasCodeWorkPacketCreatePayload) => Promise<AtlasCodeWorkPacket | null>
  onOpenObservedSession: (workPacketId: string, providerId: string) => Promise<AtlasCodeObservedSession | null>
}) {
  const [draft, setDraft] = useState<DraftPacket>(emptyDraft())
  const [openFormVisible, setOpenFormVisible] = useState(false)
  const [activePacketId, setActivePacketId] = useState<string | null>(null)

  const packets = room.workPackets.all
  const readyPackets = useMemo(() => packets.filter((p) => p.status === 'ready'), [packets])
  const counts = room.workPackets.counts

  const submitDraft = useCallback(async () => {
    if (draft.objective.trim() === '' || draft.acceptanceCriteria.trim() === '') return
    const payload: AtlasCodeWorkPacketCreatePayload = {
      objective: draft.objective.trim(),
      contextSummary: draft.contextSummary.trim() || undefined,
      allowedFiles: splitLines(draft.allowedFiles),
      forbiddenFiles: splitLines(draft.forbiddenFiles),
      acceptanceCriteria: splitLines(draft.acceptanceCriteria),
      verificationCommands: splitLines(draft.verificationCommands),
      roleSlot: draft.roleSlot.trim() || undefined,
      riskBand: draft.riskBand.trim() || undefined,
    }
    const created = await onCreateWorkPacket(payload)
    if (created) {
      setDraft(emptyDraft())
      setOpenFormVisible(false)
    }
  }, [draft, onCreateWorkPacket])

  return (
    <WorkbenchSection
      eyebrow={`Work Packets · ${counts.total} total · ${counts.ready} ready · ${counts.exported} exported`}
    >
      <div style={{ display: 'grid', gap: 6 }}>
        {packets.length === 0 ? (
          <EmptyState
            title="Sem packets"
            hint="Crie o primeiro packet para esta Obra antes de abrir um provider interativo."
          />
        ) : (
          packets.map((p) => (
            <PacketRow
              key={p.id}
              packet={p}
              busy={busy}
              expanded={activePacketId === p.id}
              providers={room.governance.providers.map((pr) => ({ id: pr.id, name: pr.name }))}
              onToggle={() => setActivePacketId((cur) => (cur === p.id ? null : p.id))}
              onOpen={(providerId) => onOpenObservedSession(p.id, providerId)}
            />
          ))
        )}

        {!openFormVisible ? (
          <button
            type="button"
            className="cc-btn cc-btn-primary"
            disabled={busy}
            onClick={() => setOpenFormVisible(true)}
            style={{ marginTop: 4 }}
          >
            <span aria-hidden>✦</span>
            <span>Novo Work Packet</span>
          </button>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: 6,
              padding: 8,
              border: '1px solid var(--cc-border-soft)',
              borderRadius: 'var(--cc-radius-md)',
            }}
          >
            <input
              className="cc-input"
              placeholder="Objetivo (uma frase)"
              value={draft.objective}
              onChange={(e) => setDraft({ ...draft, objective: e.target.value })}
              disabled={busy}
              autoFocus
            />
            <textarea
              className="cc-textarea"
              placeholder="Contexto técnico essencial"
              rows={2}
              value={draft.contextSummary}
              onChange={(e) => setDraft({ ...draft, contextSummary: e.target.value })}
              disabled={busy}
            />
            <textarea
              className="cc-textarea"
              placeholder="Critérios de aceite (1 por linha) — obrigatório"
              rows={3}
              value={draft.acceptanceCriteria}
              onChange={(e) => setDraft({ ...draft, acceptanceCriteria: e.target.value })}
              disabled={busy}
            />
            <textarea
              className="cc-textarea"
              placeholder="Arquivos permitidos (1 por linha)"
              rows={2}
              value={draft.allowedFiles}
              onChange={(e) => setDraft({ ...draft, allowedFiles: e.target.value })}
              disabled={busy}
            />
            <textarea
              className="cc-textarea"
              placeholder="Arquivos proibidos (1 por linha)"
              rows={2}
              value={draft.forbiddenFiles}
              onChange={(e) => setDraft({ ...draft, forbiddenFiles: e.target.value })}
              disabled={busy}
            />
            <textarea
              className="cc-textarea"
              placeholder="Comandos de verificação (1 por linha)"
              rows={2}
              value={draft.verificationCommands}
              onChange={(e) => setDraft({ ...draft, verificationCommands: e.target.value })}
              disabled={busy}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <input
                className="cc-input"
                placeholder="Role slot (implementation_lead)"
                value={draft.roleSlot}
                onChange={(e) => setDraft({ ...draft, roleSlot: e.target.value })}
                disabled={busy}
              />
              <input
                className="cc-input"
                placeholder="Risk band (medium)"
                value={draft.riskBand}
                onChange={(e) => setDraft({ ...draft, riskBand: e.target.value })}
                disabled={busy}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
              <button
                type="button"
                className="cc-btn cc-btn-primary"
                disabled={busy || draft.objective.trim() === '' || draft.acceptanceCriteria.trim() === ''}
                onClick={() => void submitDraft()}
              >
                Criar packet
              </button>
              <button
                type="button"
                className="cc-btn cc-btn-secondary"
                disabled={busy}
                onClick={() => {
                  setOpenFormVisible(false)
                  setDraft(emptyDraft())
                }}
              >
                Cancelar
              </button>
            </div>
            {readyPackets.length === 0 ? (
              <div style={{ fontSize: 10, color: 'var(--cc-text-faint)' }}>
                Mínimo: objetivo + pelo menos um critério de aceite. Sem ambos, o packet fica `draft` e não pode abrir provider.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </WorkbenchSection>
  )
}

interface DraftPacket {
  objective: string
  contextSummary: string
  acceptanceCriteria: string
  allowedFiles: string
  forbiddenFiles: string
  verificationCommands: string
  roleSlot: string
  riskBand: string
}

function emptyDraft(): DraftPacket {
  return {
    objective: '',
    contextSummary: '',
    acceptanceCriteria: '',
    allowedFiles: '',
    forbiddenFiles: '',
    verificationCommands: '',
    roleSlot: 'implementation_lead',
    riskBand: 'medium',
  }
}

function splitLines(input: string): string[] {
  return input
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
}

function PacketRow({
  packet,
  busy,
  expanded,
  providers,
  onToggle,
  onOpen,
}: {
  packet: AtlasCodeWorkPacket
  busy: boolean
  expanded: boolean
  providers: Array<{ id: string; name: string }>
  onToggle: () => void
  onOpen: (providerId: string) => Promise<AtlasCodeObservedSession | null>
}) {
  const [selectedProvider, setSelectedProvider] = useState<string>(providers[0]?.id ?? 'claude_code')
  const canOpen = packet.status === 'ready' && !busy
  return (
    <div
      style={{
        display: 'grid',
        gap: 4,
        padding: 8,
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 'var(--cc-radius-md)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--cc-text)',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {packet.objective || 'Sem objetivo declarado'}
        </div>
        <span
          style={{
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 10,
            color: 'var(--cc-text-muted)',
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          {packet.roleSlot} · {packet.riskBand}
        </span>
        <StatusBadge
          label={packet.status}
          tone={packet.status === 'ready' ? 'success' : 'neutral'}
        />
      </button>
      {expanded ? (
        <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
          {packet.acceptanceCriteria.length > 0 ? (
            <PacketField label="Critérios de aceite" items={packet.acceptanceCriteria} />
          ) : null}
          {packet.allowedFiles.length > 0 ? (
            <PacketField label="Arquivos permitidos" items={packet.allowedFiles} mono />
          ) : null}
          {packet.forbiddenFiles.length > 0 ? (
            <PacketField label="Arquivos proibidos" items={packet.forbiddenFiles} mono />
          ) : null}
          {packet.verificationCommands.length > 0 ? (
            <PacketField label="Comandos de verificação" items={packet.verificationCommands} mono />
          ) : null}
          {packet.exportedAt ? (
            <div style={{ fontSize: 10, color: 'var(--cc-text-muted)', fontFamily: 'var(--cc-font-mono)' }}>
              exportado em {packet.exportedAt}
              {packet.packetMdPath ? ` · ${packet.packetMdPath}` : ''}
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, marginTop: 4 }}>
            <select
              className="cc-input"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              disabled={!canOpen}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="cc-btn cc-btn-primary"
              disabled={!canOpen}
              onClick={() => void onOpen(selectedProvider)}
              title="Atlas gera packet.md, prompt copy-safe e abre sessão observada. Você roda o provider interativamente."
            >
              Abrir observado
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PacketField({ label, items, mono = false }: { label: string; items: string[]; mono?: boolean }) {
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 'var(--cc-tracking-data, 0.04em)',
          color: 'var(--cc-text-faint)',
          fontFamily: 'var(--cc-font-mono)',
        }}
      >
        {label}
      </div>
      <ul
        style={{
          margin: 0,
          paddingLeft: 16,
          fontFamily: mono ? 'var(--cc-font-mono)' : 'var(--cc-font-sans)',
          fontSize: 11,
          color: 'var(--cc-text)',
          lineHeight: 1.5,
        }}
      >
        {items.map((it, i) => (
          <li key={`${label}-${i}`}>{it}</li>
        ))}
      </ul>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 5 · Observed Sessions

function ObservedSessionsSection({
  sessions,
  busy,
  workspacePath,
  onTransitionSession,
  onImportResult,
  onDecide,
  onRunGates,
}: {
  sessions: AtlasCodeObservedSession[]
  busy: boolean
  workspacePath: string | null
  onTransitionSession: (
    sessionId: string,
    nextState: 'running' | 'waiting_result_import'
  ) => Promise<AtlasCodeObservedSession | null>
  onImportResult: (
    sessionId: string,
    payload: AtlasCodeObservedSessionImportPayload
  ) => Promise<AtlasCodeObservedSession | null>
  onDecide: (
    sessionId: string,
    action: AtlasCodeObservedSessionDecideAction,
    reason?: string
  ) => Promise<AtlasCodeObservedSession | null>
  onRunGates: (sessionId: string) => Promise<AtlasCodeObservedSession | null>
}) {
  return (
    <WorkbenchSection eyebrow="Observed Sessions · provider rodando interativamente · Atlas observa, importa, valida">
      {sessions.length === 0 ? (
        <EmptyState title="Nenhuma sessão aberta" hint="Abra uma sessão a partir de um packet ready acima ou use a quick CTA no topo." />
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {sessions.map((s) => (
            <ObservedSessionCard
              key={s.id}
              session={s}
              busy={busy}
              workspacePath={workspacePath}
              onTransitionSession={onTransitionSession}
              onImportResult={onImportResult}
              onDecide={onDecide}
              onRunGates={onRunGates}
            />
          ))}
        </div>
      )}
    </WorkbenchSection>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Quick CTA · "Abrir Claude Code observado" one-shot

function QuickOpenClaudeCodeCTA({
  room,
  busy,
  onQuickOpen,
}: {
  room: AtlasCodeProviderOperatingRoom
  busy: boolean
  onQuickOpen: (
    payload: AtlasCodeWorkPacketCreatePayload,
    providerId?: string
  ) => Promise<{ session: AtlasCodeObservedSession; packet: AtlasCodeWorkPacket } | null>
}) {
  const [open, setOpen] = useState(false)
  const [objective, setObjective] = useState('')
  const [criteria, setCriteria] = useState('')
  const [allowed, setAllowed] = useState('')
  const [providerId, setProviderId] = useState('claude_code')
  const [lastResult, setLastResult] = useState<{
    session: AtlasCodeObservedSession
    packet: AtlasCodeWorkPacket
  } | null>(null)

  const workspaceOk = room.obra.workspacePathExists
  const providers = room.governance.providers.filter((p) => p.invocationMode === 'interactive_observed')

  const canSubmit = !busy && objective.trim() !== '' && criteria.trim() !== ''

  const submit = useCallback(async () => {
    if (!canSubmit) return
    const result = await onQuickOpen(
      {
        objective: objective.trim(),
        acceptanceCriteria: splitLines(criteria),
        allowedFiles: splitLines(allowed),
      },
      providerId
    )
    if (result) {
      setLastResult(result)
      setOpen(false)
      setObjective('')
      setCriteria('')
      setAllowed('')
    }
  }, [allowed, canSubmit, criteria, objective, onQuickOpen, providerId])

  return (
    <WorkbenchSection eyebrow="Quick · Atlas prepara packet + sessão observada em uma ação">
      {!open ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <button
            type="button"
            className="cc-btn cc-btn-primary"
            disabled={busy || !workspaceOk}
            onClick={() => setOpen(true)}
            title={
              workspaceOk
                ? 'Atlas vai gerar packet, exportar .atlas/packets/<id>.md, abrir sessão observada e devolver o prompt copy-safe.'
                : 'workspace_path não resolvido — configure o Projeto antes de abrir provider.'
            }
            style={{ width: '100%' }}
          >
            <span aria-hidden>✦</span>
            <span>Abrir Claude Code observado</span>
          </button>
          {!workspaceOk ? (
            <div
              style={{
                fontSize: 10,
                color: 'var(--cc-warning-fg)',
                fontFamily: 'var(--cc-font-mono)',
                letterSpacing: 'var(--cc-tracking-data, 0.04em)',
              }}
            >
              workspace_missing · configure workspace_path no Projeto antes de abrir.
            </div>
          ) : null}
          {lastResult ? (
            <div
              style={{
                fontSize: 11,
                color: 'var(--cc-text-muted)',
                fontFamily: 'var(--cc-font-mono)',
              }}
            >
              Última sessão: {lastResult.session.id.slice(0, 16)} · packet{' '}
              {lastResult.packet.id.slice(0, 12)} · state {lastResult.session.state}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 6,
            padding: 8,
            border: '1px solid var(--cc-border-soft)',
            borderRadius: 'var(--cc-radius-md)',
          }}
        >
          <input
            className="cc-input"
            placeholder="Objetivo (uma frase)"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            disabled={busy}
            autoFocus
          />
          <textarea
            className="cc-textarea"
            rows={3}
            placeholder="Critérios de aceite (1 por linha) — obrigatório"
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            disabled={busy}
          />
          <textarea
            className="cc-textarea"
            rows={2}
            placeholder="Arquivos permitidos (1 por linha) — recomendado para scope guard"
            value={allowed}
            onChange={(e) => setAllowed(e.target.value)}
            disabled={busy}
          />
          <select
            className="cc-input"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            disabled={busy}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.invocationMode}
              </option>
            ))}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
            <button
              type="button"
              className="cc-btn cc-btn-primary"
              disabled={!canSubmit}
              onClick={() => void submit()}
            >
              Gerar packet + abrir sessão
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-secondary"
              disabled={busy}
              onClick={() => {
                setOpen(false)
                setObjective('')
                setCriteria('')
                setAllowed('')
              }}
            >
              Cancelar
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--cc-text-faint)', lineHeight: 1.5 }}>
            Atlas grava `.atlas/packets/&lt;id&gt;.md` no workspace, gera prompt copy-safe e cria a
            sessão observada em `waiting_operator`. Você roda `claude` no terminal e cola o prompt.
            Atlas NÃO executa o provider.
          </div>
        </div>
      )}
    </WorkbenchSection>
  )
}

function GatesResultsView({ session }: { session: AtlasCodeObservedSession }) {
  if (session.gates.length === 0) return null
  return (
    <div
      style={{
        display: 'grid',
        gap: 4,
        padding: 6,
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 'var(--cc-radius-md)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 'var(--cc-tracking-data, 0.04em)',
          color: 'var(--cc-text-faint)',
          fontFamily: 'var(--cc-font-mono)',
        }}
      >
        Gates · advisory · {session.gatesSummary.total} total · {session.gatesSummary.passed} ok ·{' '}
        {session.gatesSummary.failed} fail · {session.gatesSummary.pending} pending
        {session.gatesEvaluatedAt ? ` · ${session.gatesEvaluatedAt.slice(0, 19)}` : ''}
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        {session.gates.map((g) => (
          <div
            key={g.gateId}
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr auto',
              gap: 6,
              alignItems: 'center',
              padding: '3px 6px',
              fontFamily: 'var(--cc-font-mono)',
              fontSize: 10,
              border: '1px solid var(--cc-border-soft)',
              borderRadius: 'var(--cc-radius-md)',
              background:
                g.status === 'passed'
                  ? 'var(--cc-success-veil)'
                  : g.status === 'failed'
                    ? 'var(--cc-danger-veil)'
                    : 'var(--cc-neutral-veil)',
            }}
          >
            <span style={{ color: 'var(--cc-text)' }}>{g.gateId}</span>
            <span style={{ color: 'var(--cc-text-muted)', whiteSpace: 'normal' }}>{g.detail}</span>
            <StatusBadge label={g.status} tone={gateStatusTone(g.status)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function gateStatusTone(status: string): WorkbenchTone {
  switch (status) {
    case 'passed':
      return 'success'
    case 'failed':
      return 'danger'
    case 'unsupported':
      return 'neutral'
    case 'commands_available_but_not_run':
    case 'not_configured':
      return 'warning'
    default:
      return 'info'
  }
}

function ObservedSessionCard({
  session,
  busy,
  workspacePath,
  onTransitionSession,
  onImportResult,
  onDecide,
  onRunGates,
}: {
  session: AtlasCodeObservedSession
  busy: boolean
  workspacePath: string | null
  onTransitionSession: (
    sessionId: string,
    nextState: 'running' | 'waiting_result_import'
  ) => Promise<AtlasCodeObservedSession | null>
  onImportResult: (
    sessionId: string,
    payload: AtlasCodeObservedSessionImportPayload
  ) => Promise<AtlasCodeObservedSession | null>
  onDecide: (
    sessionId: string,
    action: AtlasCodeObservedSessionDecideAction,
    reason?: string
  ) => Promise<AtlasCodeObservedSession | null>
  onRunGates: (sessionId: string) => Promise<AtlasCodeObservedSession | null>
}) {
  const [expanded, setExpanded] = useState(false)
  const [importReport, setImportReport] = useState('')
  const [importDiff, setImportDiff] = useState('')
  const [importFiles, setImportFiles] = useState('')
  const [decideReason, setDecideReason] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const [workspaceCopied, setWorkspaceCopied] = useState(false)
  const [commandCopied, setCommandCopied] = useState(false)
  const [terminalLaunch, setTerminalLaunch] = useState<string | null>(null)
  const recommendedCommand = session.terminalCommandHint
    ? `cd ${workspacePath ?? '.'} && ${session.terminalCommandHint}`
    : null
  const launchTerminal = useCallback(async () => {
    if (!workspacePath) return
    setTerminalLaunch('opening')
    const r = await openTerminalInWorkspace(workspacePath, session.terminalCommandHint ?? null)
    if (!r) {
      setTerminalLaunch('http_or_offline')
    } else if (r.ok) {
      setTerminalLaunch(`opened:${r.method}`)
    } else {
      setTerminalLaunch(`error:${r.error ?? 'unknown'}`)
    }
    window.setTimeout(() => setTerminalLaunch(null), 4000)
  }, [session.terminalCommandHint, workspacePath])

  const copyText = useCallback(
    async (text: string | null, onDone: (b: boolean) => void) => {
      if (!text) return
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
          onDone(true)
          window.setTimeout(() => onDone(false), 2500)
        }
      } catch {
        /* ignore */
      }
    },
    []
  )

  const copyPrompt = useCallback(
    () => copyText(session.prompt, setPromptCopied),
    [copyText, session.prompt]
  )

  const showRunbook =
    session.state === 'waiting_operator' ||
    session.state === 'running' ||
    session.state === 'waiting_result_import'
  const showImportForm = showRunbook

  return (
    <div
      style={{
        display: 'grid',
        gap: 6,
        padding: 8,
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 'var(--cc-radius-md)',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--cc-text)',
            }}
          >
            {session.providerName} · {session.roleSlot.replace(/_/g, ' ')}
          </div>
          <div
            style={{
              fontFamily: 'var(--cc-font-mono)',
              fontSize: 10,
              color: 'var(--cc-text-muted)',
              letterSpacing: 0.3,
            }}
          >
            packet {session.workPacketId.slice(0, 16)} · {session.invocationMode}
          </div>
        </div>
        <span
          style={{
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 10,
            color: 'var(--cc-text-faint)',
          }}
        >
          {session.id.slice(0, 12)}
        </span>
        <StatusBadge label={session.state.replace(/_/g, ' ')} tone={stateToTone(session.state)} />
      </button>

      {expanded ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {/* Operator runbook */}
          {showRunbook ? (
            <div style={{ display: 'grid', gap: 4 }}>
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--cc-tracking-data, 0.04em)',
                  color: 'var(--cc-text-faint)',
                  fontFamily: 'var(--cc-font-mono)',
                }}
              >
                Runbook humano
              </div>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: 16,
                  fontFamily: 'var(--cc-font-sans)',
                  fontSize: 11,
                  color: 'var(--cc-text)',
                  lineHeight: 1.6,
                }}
              >
                <li>
                  Abra um terminal em{' '}
                  <code
                    style={{
                      fontFamily: 'var(--cc-font-mono)',
                      fontSize: 10,
                      padding: '0 4px',
                      background: 'var(--cc-neutral-veil)',
                      borderRadius: 2,
                    }}
                  >
                    {workspacePath ?? 'workspace_path indisponível'}
                  </code>
                </li>
                {session.terminalCommandHint ? (
                  <li>
                    Execute{' '}
                    <code
                      style={{
                        fontFamily: 'var(--cc-font-mono)',
                        fontSize: 10,
                        padding: '0 4px',
                        background: 'var(--cc-neutral-veil)',
                        borderRadius: 2,
                      }}
                    >
                      {session.terminalCommandHint}
                    </code>
                  </li>
                ) : null}
                <li>Cole o prompt copy-safe abaixo na sessão interativa.</li>
                <li>Acompanhe a sessão. Quando terminar, clique "Marcar aguardando import".</li>
                <li>Importe o relatório+diff. Atlas valida e pede aceite humano.</li>
              </ol>
            </div>
          ) : null}

          {/* Prompt copy-safe */}
          {session.prompt ? (
            <div style={{ display: 'grid', gap: 4 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--cc-tracking-data, 0.04em)',
                    color: 'var(--cc-text-faint)',
                    fontFamily: 'var(--cc-font-mono)',
                  }}
                >
                  Prompt copy-safe · hash {session.promptHash.slice(0, 12)}
                </div>
                <button
                  type="button"
                  className="cc-btn cc-btn-secondary"
                  onClick={() => void copyPrompt()}
                  disabled={busy}
                >
                  {promptCopied ? 'Copiado' : 'Copiar prompt'}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 8,
                  fontFamily: 'var(--cc-font-mono)',
                  fontSize: 10,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  background: 'var(--cc-neutral-veil)',
                  border: '1px solid var(--cc-border-soft)',
                  borderRadius: 'var(--cc-radius-md)',
                  maxHeight: 240,
                  overflowY: 'auto',
                }}
              >
                {session.prompt}
              </pre>
            </div>
          ) : null}

          {session.packetMdPath ? (
            <div
              style={{
                fontSize: 10,
                color: 'var(--cc-text-muted)',
                fontFamily: 'var(--cc-font-mono)',
              }}
            >
              packet.md gravado em {session.packetMdPath}
            </div>
          ) : null}

          {/* Affordances row — copy workspace path, recommended command, open terminal */}
          {(workspacePath || recommendedCommand) && (
            <div style={{ display: 'grid', gap: 4 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 6,
                }}
              >
                {workspacePath ? (
                  <button
                    type="button"
                    className="cc-btn cc-btn-secondary"
                    onClick={() => void copyText(workspacePath, setWorkspaceCopied)}
                    disabled={busy}
                    title={workspacePath}
                  >
                    {workspaceCopied ? 'Workspace copiado' : 'Copiar workspace path'}
                  </button>
                ) : null}
                {recommendedCommand ? (
                  <button
                    type="button"
                    className="cc-btn cc-btn-secondary"
                    onClick={() => void copyText(recommendedCommand, setCommandCopied)}
                    disabled={busy}
                    title={recommendedCommand}
                  >
                    {commandCopied ? 'Comando copiado' : 'Copiar comando recomendado'}
                  </button>
                ) : null}
                {workspacePath ? (
                  <button
                    type="button"
                    className="cc-btn cc-btn-primary"
                    onClick={() => void launchTerminal()}
                    disabled={busy}
                    title="Abre o terminal nativo do sistema no workspace_path. Em HTTP mode, use 'Copiar comando'."
                  >
                    {terminalLaunch === 'opening' ? 'Abrindo…' : 'Abrir terminal no workspace'}
                  </button>
                ) : null}
              </div>
              {terminalLaunch && terminalLaunch !== 'opening' ? (
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--cc-font-mono)',
                    color: terminalLaunch.startsWith('error:') || terminalLaunch === 'http_or_offline'
                      ? 'var(--cc-warning-fg)'
                      : 'var(--cc-success-fg)',
                  }}
                >
                  {terminalLaunch === 'http_or_offline'
                    ? 'HTTP/offline mode — Tauri terminal launcher indisponível. Use "Copiar comando".'
                    : terminalLaunch.startsWith('error:')
                      ? `Falha: ${terminalLaunch.slice(6)}`
                      : `Aberto via ${terminalLaunch.slice(7)}`}
                </div>
              ) : null}
            </div>
          )}

          {/* State transition controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {session.state === 'waiting_operator' ? (
              <button
                type="button"
                className="cc-btn cc-btn-primary"
                disabled={busy}
                onClick={() => void onTransitionSession(session.id, 'running')}
              >
                Marcar rodando
              </button>
            ) : null}
            {session.state === 'running' ? (
              <button
                type="button"
                className="cc-btn cc-btn-primary"
                disabled={busy}
                onClick={() => void onTransitionSession(session.id, 'waiting_result_import')}
              >
                Marcar aguardando import
              </button>
            ) : null}
            {(session.state === 'imported' ||
              session.state === 'review_required' ||
              session.state === 'gates_passed' ||
              session.state === 'gates_failed') ? (
              <button
                type="button"
                className="cc-btn cc-btn-secondary"
                disabled={busy}
                onClick={() => void onRunGates(session.id)}
                title="Roda gates advisory: scope guard + acceptance_criteria + verification_commands (não executa comandos)"
              >
                Rodar gates
              </button>
            ) : null}
          </div>

          {/* Gates results when present (advisory) */}
          {session.gates.length > 0 ? <GatesResultsView session={session} /> : null}

          {/* Import form */}
          {showImportForm ? (
            <div
              style={{
                display: 'grid',
                gap: 4,
                padding: 6,
                border: '1px dashed var(--cc-border-soft)',
                borderRadius: 'var(--cc-radius-md)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--cc-tracking-data, 0.04em)',
                  color: 'var(--cc-text-faint)',
                  fontFamily: 'var(--cc-font-mono)',
                }}
              >
                Importar resultado
              </div>
              <textarea
                className="cc-textarea"
                rows={4}
                placeholder="Relatório final do provider (texto completo)"
                value={importReport}
                onChange={(e) => setImportReport(e.target.value)}
                disabled={busy}
              />
              <textarea
                className="cc-textarea"
                rows={3}
                placeholder="Diff excerpt (cole o output de `git diff` ou unified diff)"
                value={importDiff}
                onChange={(e) => setImportDiff(e.target.value)}
                disabled={busy}
              />
              <textarea
                className="cc-textarea"
                rows={2}
                placeholder="Arquivos tocados (1 por linha) — opcional"
                value={importFiles}
                onChange={(e) => setImportFiles(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="cc-btn cc-btn-primary"
                disabled={busy || importReport.trim() === ''}
                onClick={() => {
                  void onImportResult(session.id, {
                    reportText: importReport.trim(),
                    files: splitLines(importFiles),
                    diffExcerpt: importDiff.trim() || undefined,
                  }).then((next) => {
                    if (next) {
                      setImportReport('')
                      setImportDiff('')
                      setImportFiles('')
                    }
                  })
                }}
              >
                Importar e ir para review
              </button>
            </div>
          ) : null}

          {/* Review/decide */}
          {session.state === 'review_required' ? (
            <div
              style={{
                display: 'grid',
                gap: 4,
                padding: 6,
                border: '1px solid var(--cc-warning-border)',
                background: 'var(--cc-warning-veil)',
                borderRadius: 'var(--cc-radius-md)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--cc-tracking-data, 0.04em)',
                  color: 'var(--cc-warning-fg)',
                  fontFamily: 'var(--cc-font-mono)',
                  fontWeight: 600,
                }}
              >
                Decisão humana · completion law
              </div>
              {session.reportText ? (
                <pre
                  style={{
                    margin: 0,
                    padding: 6,
                    fontFamily: 'var(--cc-font-mono)',
                    fontSize: 10,
                    lineHeight: 1.5,
                    maxHeight: 160,
                    overflowY: 'auto',
                    background: 'var(--cc-neutral-veil)',
                    border: '1px solid var(--cc-border-soft)',
                    borderRadius: 'var(--cc-radius-md)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {session.reportText}
                </pre>
              ) : null}
              {session.diffHash ? (
                <div style={{ fontSize: 10, color: 'var(--cc-text-muted)', fontFamily: 'var(--cc-font-mono)' }}>
                  diff_hash {session.diffHash.slice(0, 16)}
                </div>
              ) : null}
              <input
                className="cc-input"
                placeholder="Motivo (opcional)"
                value={decideReason}
                onChange={(e) => setDecideReason(e.target.value)}
                disabled={busy}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                <button
                  type="button"
                  className="cc-btn cc-btn-primary"
                  disabled={busy}
                  onClick={() => void onDecide(session.id, 'accept', decideReason || undefined)}
                >
                  Aceitar
                </button>
                <button
                  type="button"
                  className="cc-btn cc-btn-secondary"
                  disabled={busy}
                  onClick={() => void onDecide(session.id, 'request_repair', decideReason || undefined)}
                >
                  Repair
                </button>
                <button
                  type="button"
                  className="cc-btn cc-btn-secondary"
                  disabled={busy}
                  onClick={() => void onDecide(session.id, 'reject', decideReason || undefined)}
                >
                  Rejeitar
                </button>
                <button
                  type="button"
                  className="cc-btn cc-btn-secondary"
                  disabled={busy}
                  onClick={() => void onDecide(session.id, 'block', decideReason || undefined)}
                >
                  Bloquear
                </button>
              </div>
            </div>
          ) : null}

          {/* Terminal states */}
          {session.state === 'accepted' && session.humanDecision ? (
            <div style={{ fontSize: 11, color: 'var(--cc-success-fg)' }}>
              Aceito em {session.humanDecision.decidedAt}
              {session.humanDecision.reason ? ` · ${session.humanDecision.reason}` : ''}
            </div>
          ) : null}
          {session.state === 'rejected' && session.humanDecision ? (
            <div style={{ fontSize: 11, color: 'var(--cc-danger-fg)' }}>
              Rejeitado em {session.humanDecision.decidedAt}
              {session.humanDecision.reason ? ` · ${session.humanDecision.reason}` : ''}
            </div>
          ) : null}
          {session.state === 'blocked' && session.blockerReason ? (
            <div style={{ fontSize: 11, color: 'var(--cc-danger-fg)' }}>
              Bloqueado: {session.blockerReason}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function stateToTone(state: AtlasCodeObservedSessionState): WorkbenchTone {
  switch (state) {
    case 'waiting_operator':
      return 'accent'
    case 'running':
      return 'info'
    case 'waiting_result_import':
      return 'warning'
    case 'imported':
      return 'warning'
    case 'review_required':
      return 'warning'
    case 'gates_running':
      return 'info'
    case 'gates_passed':
      return 'success'
    case 'gates_failed':
      return 'danger'
    case 'accepted':
      return 'success'
    case 'rejected':
      return 'danger'
    case 'repair_required':
      return 'warning'
    case 'blocked':
      return 'danger'
    default:
      return 'neutral'
  }
}
