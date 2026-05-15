import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { CSSProperties } from 'react'
import { PanelTitle } from '@atlas/ui'
import type {
  AtlasCodeProviderArenaArm,
  AtlasCodeProviderArenaHistoryEntry,
  AtlasCodeProviderArenaMode,
  AtlasCodeProviderArenaModeEntry,
  AtlasCodeProviderArenaPreset,
  AtlasCodeProviderArenaRunResult,
  AtlasCodeProviderArenaSnapshot,
} from '@atlas/domain'
import type { RightRailContext } from './rightRailTypes'
import { btnPrimary, EmptyText } from './RightRailPrimitives'
import { SafetyStrip } from '../workbench/SafetyStrip'
import { StatusBadge } from '../workbench/StatusBadge'
import type { WorkbenchTone } from '../workbench/tokens'

/**
 * Atlas Code Provider Arena UI v1 — premium RightRail panel.
 *
 * Operator surface for the canonical `atlas:forge:rivals run-arena` action.
 * Reads the read-only snapshot exposed by AtlasCodeProviderArenaSnapshotService
 * and dispatches governed runs through the same dispatcher the CLI uses.
 *
 * Invariants honored everywhere:
 *   - NEVER promotes a completion claim from the UI.
 *   - NEVER calls a provider without all three operator confirmations
 *     (handled by the backend; the UI just refuses to submit otherwise).
 *   - `local_fake` is the default and never spends tokens.
 *   - external_rivals_certification remains blocked regardless of outcome.
 *   - Schema mismatch / offline ⇒ honest empty state, never invented data.
 */

const MODE_LABEL: Record<string, string> = {
  local_fake: 'Local fake · zero tokens',
  fair: 'Fair · paid · same model',
  full_power: 'Full power · paid · Atlas Decide',
}

const MODE_SHORT: Record<string, string> = {
  local_fake: 'Local fake',
  fair: 'Fair',
  full_power: 'Full power',
}

const STATUS_TONE: Record<string, WorkbenchTone> = {
  ok: 'success',
  blocked: 'danger',
  error: 'danger',
  running: 'info',
  completed: 'success',
  stalled_runner_no_heartbeat: 'warning',
}

const WINNER_TONE: Record<string, WorkbenchTone> = {
  atlas: 'success',
  arm_a: 'success',
  rival: 'info',
  arm_b: 'info',
  tie: 'neutral',
}

function statusTone(status: string | null | undefined): WorkbenchTone {
  if (!status) return 'neutral'
  return STATUS_TONE[status] ?? 'neutral'
}

function winnerTone(winner: string | null | undefined): WorkbenchTone {
  if (!winner) return 'neutral'
  return WINNER_TONE[winner] ?? 'neutral'
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const clamped = Math.max(0, Math.min(value, 1))
  return `${(clamped * 100).toFixed(0)}%`
}

function formatTimestamp(unix: number): string {
  if (!unix || !Number.isFinite(unix)) return '—'
  try {
    return new Date(unix * 1000).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

interface SectionHeaderProps {
  title: string
  meta?: string
}

function SectionHeader({ title, meta }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginTop: 16,
        marginBottom: 8,
        fontFamily: 'var(--cc-font-sans)',
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: 0,
        textTransform: 'none',
        color: 'var(--cc-text-muted)',
      }}
    >
      <span>{title}</span>
      {meta ? (
        <span style={{ color: 'var(--cc-text-faint)', fontWeight: 500 }}>{meta}</span>
      ) : null}
    </div>
  )
}

interface FieldLabelProps {
  text: string
}

function FieldLabel({ text }: FieldLabelProps) {
  return (
    <div
      style={{
        fontFamily: 'var(--cc-font-sans)',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--cc-text-faint)',
        marginBottom: 4,
        textTransform: 'none',
        letterSpacing: 0,
      }}
    >
      {text}
    </div>
  )
}

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontFamily: 'var(--cc-font-sans)',
  fontSize: 13,
  color: 'var(--cc-text-strong)',
  background: 'var(--cc-surface-sunken)',
  border: '1px solid var(--cc-border-soft)',
  borderRadius: 'var(--cc-radius-sm)',
  outline: 'none',
}

const btnSecondary: CSSProperties = {
  padding: '8px 12px',
  fontFamily: 'var(--cc-font-sans)',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: 0,
  textTransform: 'none',
  color: 'var(--cc-text)',
  border: '1px solid var(--cc-border-soft)',
  borderRadius: 'var(--cc-radius-sm)',
  background: 'transparent',
  cursor: 'pointer',
  lineHeight: 1.2,
}

const btnPrimaryDisabled: CSSProperties = {
  ...btnPrimary,
  background: 'var(--cc-surface-sunken)',
  border: '1px solid var(--cc-border-soft)',
  color: 'var(--cc-text-faint)',
  cursor: 'not-allowed',
}

interface ArmPickerProps {
  role: 'A' | 'B'
  armId: string
  modelId: string
  taskCategory: string
  mode: AtlasCodeProviderArenaMode
  arms: AtlasCodeProviderArenaArm[]
  onArmChange: (nextArm: string, nextModel: string) => void
  onModelChange: (next: string) => void
}

function ArmPicker({
  role,
  armId,
  modelId,
  taskCategory,
  mode,
  arms,
  onArmChange,
  onModelChange,
}: ArmPickerProps) {
  const arm = arms.find((a) => a.armId === armId) ?? null
  const availableArms = arms.filter((a) => {
    if (mode === 'local_fake') return true
    return a.status === 'available'
  })
  const incompatible =
    arm && taskCategory && arm.allowedTaskCategories.length > 0
      ? !arm.allowedTaskCategories.includes(taskCategory)
      : false

  return (
    <div
      style={{
        background: 'var(--cc-surface-raised)',
        border: '1px solid var(--cc-border-soft)',
        borderRadius: 'var(--cc-radius-sm)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--cc-text-faint)',
            letterSpacing: 'var(--cc-tracking-data)',
          }}
        >
          ARM {role}
        </span>
        {arm ? (
          <StatusBadge
            label={
              arm.status === 'available'
                ? 'pronto'
                : arm.status === 'not_yet_executable'
                  ? 'não executável'
                  : 'placeholder'
            }
            tone={
              arm.status === 'available'
                ? 'success'
                : arm.status === 'not_yet_executable'
                  ? 'warning'
                  : 'neutral'
            }
            title={arm.notExecutableReason ?? undefined}
          />
        ) : null}
      </div>

      <div>
        <FieldLabel text="Runner" />
        <select
          aria-label={`Runner do Arm ${role}`}
          style={selectStyle}
          value={armId}
          onChange={(e) => {
            const next = e.target.value
            const target = arms.find((a) => a.armId === next)
            const nextModel = target?.modelOptions[0] ?? ''
            onArmChange(next, nextModel)
          }}
        >
          <option value="">— escolher runner —</option>
          {availableArms.map((a) => (
            <option key={a.armId} value={a.armId}>
              {a.humanLabel}
              {a.status !== 'available' ? ' (local_fake only)' : ''}
            </option>
          ))}
        </select>
        {arm ? (
          <div
            style={{
              marginTop: 6,
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 11.5,
              color: 'var(--cc-text-muted)',
              lineHeight: 1.45,
            }}
          >
            {arm.humanDescription}
          </div>
        ) : null}
        {arm?.notExecutableReason ? (
          <div
            style={{
              marginTop: 6,
              fontFamily: 'var(--cc-font-mono)',
              fontSize: 11,
              color: 'var(--cc-warning-fg)',
            }}
          >
            {arm.notExecutableReason}
          </div>
        ) : null}
      </div>

      {arm && arm.modelOptions.length > 0 ? (
        <div>
          <FieldLabel text="Modelo" />
          <select
            aria-label={`Modelo do Arm ${role}`}
            style={selectStyle}
            value={modelId}
            onChange={(e) => onModelChange(e.target.value)}
          >
            {arm.modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {incompatible ? (
        <div
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 11.5,
            color: 'var(--cc-warning-fg)',
          }}
        >
          Este runner não cobre a categoria “{taskCategory}”.
        </div>
      ) : null}

      {arm?.requiresExternalProviderCall ? (
        <div
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 11.5,
            color: 'var(--cc-text-muted)',
          }}
        >
          Provider real · custo possível · exige 3 confirmações.
        </div>
      ) : (
        <div
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 11.5,
            color: 'var(--cc-success-fg)',
          }}
        >
          Zero tokens · sem chamada externa.
        </div>
      )}
    </div>
  )
}

interface ConfirmationBlockProps {
  show: boolean
  values: { runbookReviewed: boolean; providerCost: boolean; realProviderCall: boolean }
  onChange: (key: keyof ConfirmationBlockProps['values'], next: boolean) => void
}

function ConfirmationBlock({ show, values, onChange }: ConfirmationBlockProps) {
  if (!show) return null
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        background: 'var(--cc-warning-veil)',
        border: '1px solid var(--cc-warning-border)',
        borderRadius: 'var(--cc-radius-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <strong
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--cc-warning-fg)',
        }}
      >
        Bateria real exige 3 confirmações
      </strong>
      <label
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 12,
          color: 'var(--cc-text)',
        }}
      >
        <input
          type="checkbox"
          checked={values.runbookReviewed}
          onChange={(e) => onChange('runbookReviewed', e.target.checked)}
        />
        <span>Li o runbook e estou ciente do que vai rodar.</span>
      </label>
      <label
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 12,
          color: 'var(--cc-text)',
        }}
      >
        <input
          type="checkbox"
          checked={values.providerCost}
          onChange={(e) => onChange('providerCost', e.target.checked)}
        />
        <span>Autorizo gasto de tokens nos providers configurados.</span>
      </label>
      <label
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 12,
          color: 'var(--cc-text)',
        }}
      >
        <input
          type="checkbox"
          checked={values.realProviderCall}
          onChange={(e) => onChange('realProviderCall', e.target.checked)}
        />
        <span>Confirmo: este run vai chamar provider externo de verdade.</span>
      </label>
      <span
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 11,
          color: 'var(--cc-text-muted)',
        }}
      >
        Resultado não desbloqueia external_rivals_certification.
      </span>
    </div>
  )
}

interface ModeOptionProps {
  mode: AtlasCodeProviderArenaModeEntry
  active: boolean
  onClick: () => void
}

function ModeOption({ mode, active, onClick }: ModeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1,
        minWidth: 0,
        padding: '8px 10px',
        fontFamily: 'var(--cc-font-sans)',
        fontSize: 12,
        fontWeight: 500,
        textAlign: 'left',
        color: active ? 'var(--cc-text-strong)' : 'var(--cc-text-muted)',
        background: active ? 'var(--cc-accent-veil)' : 'transparent',
        border: `1px solid ${active ? 'var(--cc-accent-border)' : 'var(--cc-border-soft)'}`,
        borderRadius: 'var(--cc-radius-sm)',
        cursor: 'pointer',
        lineHeight: 1.3,
      }}
      title={mode.note}
    >
      <div style={{ fontWeight: 600 }}>{MODE_SHORT[mode.mode] ?? mode.mode}</div>
      <div
        style={{
          fontSize: 11,
          color: mode.requiresProvider ? 'var(--cc-warning-fg)' : 'var(--cc-success-fg)',
          marginTop: 2,
        }}
      >
        {mode.requiresProvider ? 'paid · tokens' : 'sem tokens'}
      </div>
    </button>
  )
}

interface HistoryRowProps {
  entry: AtlasCodeProviderArenaHistoryEntry
}

function HistoryRow({ entry }: HistoryRowProps) {
  const armALabel = entry.armA?.humanLabel ?? entry.armA?.armId ?? '—'
  const armBLabel = entry.armB?.humanLabel ?? entry.armB?.armId ?? '—'
  const verdictTone: WorkbenchTone =
    entry.verdict === 'comparable'
      ? 'success'
      : entry.verdict?.startsWith('invalid')
        ? 'danger'
        : entry.verdict === 'inconclusive'
          ? 'warning'
          : 'neutral'
  const winner = entry.winner ?? null
  return (
    <li
      style={{
        listStyle: 'none',
        padding: '10px 0',
        borderBottom: '1px solid var(--cc-border-soft)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 12,
            color: 'var(--cc-text)',
            letterSpacing: 'var(--cc-tracking-data)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={entry.runId}
        >
          {entry.runId}
        </span>
        <span
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 11,
            color: 'var(--cc-text-faint)',
          }}
        >
          {formatTimestamp(entry.updatedAtUnix)}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignItems: 'center',
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 12,
          color: 'var(--cc-text-muted)',
        }}
      >
        <span style={{ color: 'var(--cc-text)' }}>{armALabel}</span>
        <span style={{ color: 'var(--cc-text-faint)' }}>vs</span>
        <span style={{ color: 'var(--cc-text)' }}>{armBLabel}</span>
        {entry.taskCategory ? (
          <span
            style={{
              padding: '1px 6px',
              border: '1px solid var(--cc-border-soft)',
              borderRadius: 999,
              fontSize: 11,
              color: 'var(--cc-text-muted)',
            }}
          >
            {entry.taskCategory}
          </span>
        ) : null}
        {entry.mode ? (
          <span style={{ fontSize: 11, color: 'var(--cc-text-faint)' }}>
            {MODE_SHORT[entry.mode] ?? entry.mode}
          </span>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <StatusBadge
          label={entry.verdict ?? 'sem veredicto'}
          tone={verdictTone}
        />
        {winner ? (
          <StatusBadge label={`winner: ${winner}`} tone={winnerTone(winner)} />
        ) : (
          <StatusBadge label="sem winner" tone="neutral" />
        )}
        {entry.claimReady === false ? (
          <StatusBadge label="claim_ready: false" tone="warning" />
        ) : entry.claimReady === true ? (
          <StatusBadge label="claim_ready" tone="success" />
        ) : null}
        {entry.comparableScore != null ? (
          <span
            style={{
              fontFamily: 'var(--cc-font-mono)',
              fontSize: 11,
              color: 'var(--cc-text-muted)',
              letterSpacing: 'var(--cc-tracking-data)',
            }}
            title="comparable score"
          >
            score {formatPercent(entry.comparableScore)}
          </span>
        ) : null}
      </div>
    </li>
  )
}

interface RunResultBlockProps {
  result: AtlasCodeProviderArenaRunResult
  onDismiss: () => void
}

function RunResultBlock({ result, onDismiss }: RunResultBlockProps) {
  const tone = statusTone(result.status)
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        background:
          tone === 'success'
            ? 'var(--cc-success-veil)'
            : tone === 'danger'
              ? 'var(--cc-danger-veil)'
              : tone === 'warning'
                ? 'var(--cc-warning-veil)'
                : 'var(--cc-surface-raised)',
        border: `1px solid ${
          tone === 'success'
            ? 'var(--cc-success-border)'
            : tone === 'danger'
              ? 'var(--cc-danger-border)'
              : tone === 'warning'
                ? 'var(--cc-warning-border)'
                : 'var(--cc-border-soft)'
        }`,
        borderRadius: 'var(--cc-radius-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <StatusBadge label={result.status} tone={tone} />
          {result.runId ? (
            <span
              style={{
                fontFamily: 'var(--cc-font-mono)',
                fontSize: 11,
                color: 'var(--cc-text-muted)',
                letterSpacing: 'var(--cc-tracking-data)',
              }}
              title={result.runId}
            >
              run {result.runId}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          style={{ ...btnSecondary, padding: '4px 8px' }}
          aria-label="Fechar resultado"
        >
          fechar
        </button>
      </div>
      {result.note ? (
        <div
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 12,
            color: 'var(--cc-text)',
          }}
        >
          {result.note}
        </div>
      ) : null}
      {result.winner ? (
        <div style={{ fontFamily: 'var(--cc-font-sans)', fontSize: 12 }}>
          Winner:{' '}
          <StatusBadge label={result.winner} tone={winnerTone(result.winner)} />
        </div>
      ) : null}
      {result.blockers.length > 0 ? (
        <div
          style={{
            fontFamily: 'var(--cc-font-sans)',
            fontSize: 12,
            color: 'var(--cc-text)',
          }}
        >
          <strong style={{ color: 'var(--cc-danger-fg)', fontWeight: 600 }}>Bloqueios:</strong>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {result.blockers.map((b) => (
              <li
                key={b}
                style={{
                  fontFamily: 'var(--cc-font-mono)',
                  fontSize: 11,
                  color: 'var(--cc-text-muted)',
                }}
              >
                {b}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.nextCommand ? (
        <div
          style={{
            fontFamily: 'var(--cc-font-mono)',
            fontSize: 11,
            color: 'var(--cc-text-faint)',
            letterSpacing: 'var(--cc-tracking-data)',
            wordBreak: 'break-all',
          }}
        >
          {result.nextCommand}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 11,
          color: 'var(--cc-text-muted)',
        }}
      >
        Resultado não desbloqueia external_rivals_certification.
      </div>
    </div>
  )
}

interface ConfigState {
  armA: string
  armB: string
  armAModel: string
  armBModel: string
  taskCategory: string
  mode: AtlasCodeProviderArenaMode
  preset: AtlasCodeProviderArenaPreset
  confirmations: { runbookReviewed: boolean; providerCost: boolean; realProviderCall: boolean }
}

interface PartialConfig {
  armA: string | null
  armB: string | null
  armAModel: string | null
  armBModel: string | null
  taskCategory: string | null
  mode: AtlasCodeProviderArenaMode
  preset: AtlasCodeProviderArenaPreset
  confirmations: { runbookReviewed: boolean; providerCost: boolean; realProviderCall: boolean }
}

const EMPTY_PARTIAL: PartialConfig = {
  armA: null,
  armB: null,
  armAModel: null,
  armBModel: null,
  taskCategory: null,
  mode: 'local_fake',
  preset: 'smoke',
  confirmations: { runbookReviewed: false, providerCost: false, realProviderCall: false },
}

/**
 * Derive the effective config the panel uses for rendering and dispatch.
 *
 * The operator's explicit choices (in `partial`) always win. Anything they
 * have not touched falls back to the snapshot's first available defaults.
 * Doing this in `useMemo` keeps state purely user-driven — no setState in
 * useEffect is needed to bootstrap defaults when the snapshot arrives.
 */
function resolveConfig(
  partial: PartialConfig,
  snapshot: AtlasCodeProviderArenaSnapshot | null,
): ConfigState {
  const arms = snapshot?.armRegistry.arms ?? []
  const availableArm = arms.find((a) => a.status === 'available') ?? arms[0] ?? null
  const defaultRunner = availableArm?.armId ?? ''
  const defaultModel = availableArm?.modelOptions[0] ?? ''
  const defaultTask = snapshot?.armRegistry.taskCategories[0] ?? 'tests'

  const armA = partial.armA ?? defaultRunner
  const armB = partial.armB ?? defaultRunner

  const armAEntry = arms.find((a) => a.armId === armA) ?? null
  const armBEntry = arms.find((a) => a.armId === armB) ?? null

  const armAModel =
    partial.armAModel && armAEntry?.modelOptions.includes(partial.armAModel)
      ? partial.armAModel
      : (armAEntry?.modelOptions[0] ?? defaultModel)
  const armBModel =
    partial.armBModel && armBEntry?.modelOptions.includes(partial.armBModel)
      ? partial.armBModel
      : (armBEntry?.modelOptions[0] ?? defaultModel)

  return {
    armA,
    armB,
    armAModel,
    armBModel,
    taskCategory: partial.taskCategory ?? defaultTask,
    mode: partial.mode,
    preset: partial.preset,
    confirmations: partial.confirmations,
  }
}

function describePrimaryAction(
  snapshot: AtlasCodeProviderArenaSnapshot | null,
  config: ConfigState,
): { label: string; enabled: boolean; reason: string | null; kind: 'configure' | 'local_fake' | 'real' } {
  if (!snapshot) {
    return {
      label: 'Carregar snapshot',
      enabled: false,
      reason: 'Aguardando snapshot do backend.',
      kind: 'configure',
    }
  }
  if (!config.armA || !config.armB) {
    return {
      label: 'Escolher runners',
      enabled: false,
      reason: 'Defina os dois braços antes de continuar.',
      kind: 'configure',
    }
  }
  if (!config.taskCategory) {
    return {
      label: 'Escolher categoria',
      enabled: false,
      reason: 'Defina a categoria da tarefa.',
      kind: 'configure',
    }
  }
  if (config.mode === 'local_fake') {
    return { label: 'Rodar simulação local', enabled: true, reason: null, kind: 'local_fake' }
  }
  const allConfirmed =
    config.confirmations.runbookReviewed
    && config.confirmations.providerCost
    && config.confirmations.realProviderCall
  if (!allConfirmed) {
    return {
      label: 'Confirmar para rodar bateria real',
      enabled: false,
      reason: 'Marque as 3 confirmações para gastar tokens.',
      kind: 'real',
    }
  }
  return { label: 'Rodar bateria real', enabled: true, reason: null, kind: 'real' }
}

export function ProviderArenaPanel(ctx: RightRailContext) {
  const {
    providerArena,
    providerArenaLastResult,
    busy,
    onRefreshProviderArena,
    onRunProviderArena,
    onClearProviderArenaLastResult,
  } = ctx

  const [partial, setPartial] = useState<PartialConfig>(EMPTY_PARTIAL)
  const [pending, startTransition] = useTransition()
  const didRequestInitialRef = useRef(false)

  // Try to refresh the snapshot once when the panel mounts (covers the case
  // where the initial bridge boot failed). Pure side effect — never sets state
  // inside the effect body; the hook does that when the request resolves.
  useEffect(() => {
    if (didRequestInitialRef.current) return
    didRequestInitialRef.current = true
    if (!providerArena) {
      void onRefreshProviderArena().catch(() => undefined)
    }
  }, [providerArena, onRefreshProviderArena])

  const arms = useMemo(() => providerArena?.armRegistry.arms ?? [], [providerArena])
  const modes = providerArena?.modes ?? []
  const presets = providerArena?.presets ?? []
  const taskCategories = providerArena?.armRegistry.taskCategories ?? []
  const history = providerArena?.history ?? []
  const safetyPromises = providerArena?.safetyPromises ?? null

  const config = useMemo(() => resolveConfig(partial, providerArena), [partial, providerArena])

  const armALive = useMemo(() => arms.find((a) => a.armId === config.armA) ?? null, [arms, config.armA])
  const armBLive = useMemo(() => arms.find((a) => a.armId === config.armB) ?? null, [arms, config.armB])

  const updatePartial = useCallback((mutator: (prev: PartialConfig) => PartialConfig) => {
    setPartial((prev) => mutator(prev))
  }, [])

  const needsConfirmations =
    config.mode !== 'local_fake'
    && (armALive?.requiresExternalProviderCall === true
      || armBLive?.requiresExternalProviderCall === true)

  const primary = useMemo(
    () => describePrimaryAction(providerArena, config),
    [providerArena, config],
  )

  const handleSelectMode = (mode: AtlasCodeProviderArenaMode) => {
    updatePartial((prev) => ({ ...prev, mode }))
  }

  const handleRun = () => {
    if (!primary.enabled || pending) return
    startTransition(() => {
      void onRunProviderArena({
        armA: config.armA,
        armB: config.armB,
        armAModel: config.armAModel,
        armBModel: config.armBModel,
        taskCategory: config.taskCategory,
        mode: config.mode,
        preset: config.preset,
        sourceRef: 'HEAD',
        confirmations: config.confirmations,
      }).catch(() => undefined)
    })
  }

  const handleRefresh = () => {
    void onRefreshProviderArena().catch(() => undefined)
  }

  // Empty state — fail-closed honest. Single sentence + CTA.
  if (!providerArena) {
    return (
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PanelTitle label="Provider Arena" meta="aguardando snapshot" />
        <EmptyText>
          Backend ainda não respondeu o snapshot da Arena. Verifique se o
          atlas-server está rodando.
        </EmptyText>
        <button type="button" style={btnSecondary} onClick={handleRefresh} disabled={busy || pending}>
          Tentar de novo
        </button>
      </div>
    )
  }

  const hasNoArms = arms.length === 0

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PanelTitle
        label="Provider Arena"
        meta={`v1 · ${providerArena.armRegistry.armCount} runners · ${providerArena.historyCount} runs`}
      />

      <SafetyStrip
        externalProviderCall={providerArena.externalProviderCall}
        providerTokensSpent={providerArena.providerTokensSpent ? 'sim' : 'não'}
        completionClaimPromoted={false}
        reviewGatePreserved={safetyPromises?.replayRequiredBeforeWinner ?? true}
        externalRivalsStatus="blocked"
      />

      {hasNoArms ? (
        <EmptyText>
          Registry vazio. Atualize o atlas-server e tente novamente.
        </EmptyText>
      ) : (
        <>
          <SectionHeader title="Arena" meta="braços vão competir lado a lado" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
              gap: 8,
              alignItems: 'stretch',
            }}
          >
            <ArmPicker
              role="A"
              armId={config.armA}
              modelId={config.armAModel}
              taskCategory={config.taskCategory}
              mode={config.mode}
              arms={arms}
              onArmChange={(nextArm, nextModel) =>
                updatePartial((p) => ({ ...p, armA: nextArm, armAModel: nextModel }))
              }
              onModelChange={(next) => updatePartial((p) => ({ ...p, armAModel: next }))}
            />
            <div
              aria-hidden
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 13,
                color: 'var(--cc-text-faint)',
                padding: '0 4px',
              }}
            >
              vs
            </div>
            <ArmPicker
              role="B"
              armId={config.armB}
              modelId={config.armBModel}
              taskCategory={config.taskCategory}
              mode={config.mode}
              arms={arms}
              onArmChange={(nextArm, nextModel) =>
                updatePartial((p) => ({ ...p, armB: nextArm, armBModel: nextModel }))
              }
              onModelChange={(next) => updatePartial((p) => ({ ...p, armBModel: next }))}
            />
          </div>

          <SectionHeader title="Configuração" meta="categoria · modo · preset" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            <div>
              <FieldLabel text="Categoria da tarefa" />
              <select
                aria-label="Categoria da tarefa"
                style={selectStyle}
                value={config.taskCategory}
                onChange={(e) => updatePartial((p) => ({ ...p, taskCategory: e.target.value }))}
              >
                {taskCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel text="Preset" />
              <select
                aria-label="Preset"
                style={selectStyle}
                value={config.preset}
                onChange={(e) =>
                  updatePartial((p) => ({ ...p, preset: e.target.value as AtlasCodeProviderArenaPreset }))
                }
              >
                {presets.map((p) => (
                  <option key={p.preset} value={p.preset}>
                    {p.preset} · {p.caseCount} caso{p.caseCount === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {modes.map((m) => (
              <ModeOption
                key={m.mode}
                mode={m}
                active={config.mode === m.mode}
                onClick={() => handleSelectMode(m.mode as AtlasCodeProviderArenaMode)}
              />
            ))}
          </div>
          <div
            style={{
              fontFamily: 'var(--cc-font-sans)',
              fontSize: 11.5,
              color: 'var(--cc-text-muted)',
              lineHeight: 1.45,
            }}
          >
            {MODE_LABEL[config.mode] ?? config.mode}
            {' · '}
            {modes.find((m) => m.mode === config.mode)?.note ?? ''}
          </div>

          <ConfirmationBlock
            show={needsConfirmations}
            values={config.confirmations}
            onChange={(key, next) =>
              updatePartial((p) => ({ ...p, confirmations: { ...p.confirmations, [key]: next } }))
            }
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              style={primary.enabled ? btnPrimary : btnPrimaryDisabled}
              onClick={handleRun}
              disabled={!primary.enabled || pending || busy}
              aria-disabled={!primary.enabled}
              title={primary.reason ?? undefined}
            >
              {pending ? 'Executando…' : primary.label}
            </button>
            <button
              type="button"
              style={btnSecondary}
              onClick={handleRefresh}
              disabled={busy || pending}
            >
              Atualizar histórico
            </button>
          </div>
          {primary.reason ? (
            <div
              style={{
                fontFamily: 'var(--cc-font-sans)',
                fontSize: 11.5,
                color: 'var(--cc-text-muted)',
              }}
            >
              {primary.reason}
            </div>
          ) : null}
        </>
      )}

      {providerArenaLastResult ? (
        <RunResultBlock
          result={providerArenaLastResult}
          onDismiss={onClearProviderArenaLastResult}
        />
      ) : null}

      <SectionHeader title="Últimos runs" meta={`limite ${providerArena.historyLimit}`} />
      {history.length === 0 ? (
        <EmptyText>
          Sem runs ainda. Comece por “Rodar simulação local” — não gasta tokens
          e produz evidence inteira para inspecionar.
        </EmptyText>
      ) : (
        <ul style={{ margin: 0, padding: 0 }}>
          {history.map((h) => (
            <HistoryRow key={h.runId} entry={h} />
          ))}
        </ul>
      )}

      <SectionHeader title="Garantias da Arena" />
      <ul
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'var(--cc-font-sans)',
          fontSize: 11.5,
          color: 'var(--cc-text-muted)',
          lineHeight: 1.5,
          listStyle: 'none',
        }}
      >
        <li>· Resultado não promove completion claim.</li>
        <li>· Resultado não desbloqueia external_rivals_certification.</li>
        <li>· Bateria real precisa de 3 confirmações simultâneas.</li>
        <li>· Local fake nunca chama provider real.</li>
        <li>· Replay + evidence obrigatórios antes de qualquer winner.</li>
      </ul>
    </div>
  )
}
