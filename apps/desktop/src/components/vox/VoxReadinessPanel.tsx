/**
 * VoxReadinessPanel · compact first-run readiness checklist inside the
 * Vox overlay (Wave 7.8). 12 items covering Tauri runtime, mic, hotkey,
 * macOS permissions, Whisper model + engine, Kernel URL, /ai/vox/health,
 * governed_execute support, CLI executors, and the raw-audio invariant.
 *
 * Honesty rules (mirror voxReadiness.ts):
 *   - Probe failures land as `unavailable` items, never `passed`.
 *   - The panel never opens System Settings; it just tells the operator
 *     what to open manually.
 *   - No tokens, no transcripts, no PCM are rendered here.
 */
import { useCallback } from 'react'
import { useVoxReadiness } from './useVoxReadiness'
import { VoxSetupAssistant } from './VoxSetupAssistant'
import type {
  VoxReadinessAggregateStatus,
  VoxReadinessItemStatus,
} from '../../lib/voxReadiness'

interface VoxReadinessPanelProps {
  open: boolean
}

const AGGREGATE_LABEL: Record<VoxReadinessAggregateStatus, string> = {
  ready: 'pronto para uso real',
  partial: 'parcial · pode usar com ressalvas',
  blocked: 'bloqueado · resolver antes',
  unavailable: 'indisponível · sem sinais para checar',
}

const ITEM_GLYPH: Record<VoxReadinessItemStatus, string> = {
  passed: '●',
  warning: '◐',
  blocked: '✕',
  unavailable: '○',
  checking: '…',
}

const ITEM_LABEL: Record<VoxReadinessItemStatus, string> = {
  passed: 'pronto',
  warning: 'atenção',
  blocked: 'bloqueado',
  unavailable: 'indisponível',
  checking: 'verificando',
}

export function VoxReadinessPanel({ open }: VoxReadinessPanelProps) {
  const { summary, loading, error, refresh, lastRefreshedAt } = useVoxReadiness({ open })

  const handleRefresh = useCallback(() => {
    void refresh()
  }, [refresh])

  if (!open) return null

  return (
    <div className="vox-readiness-panel" role="status" aria-live="polite">
      <div className="vox-readiness-header">
        <div className="vox-readiness-summary">
          {summary ? (
            <>
              <span
                className={`vox-readiness-aggregate vox-readiness-aggregate-${summary.status}`}
              >
                {AGGREGATE_LABEL[summary.status]}
              </span>
              <span className="vox-readiness-counts">
                {summary.passed} prontos · {summary.warnings} atenção · {summary.blocked} bloqueados · {summary.total} totais
              </span>
            </>
          ) : (
            <span className="vox-readiness-aggregate vox-readiness-aggregate-checking">
              {loading ? 'verificando…' : 'aguardando primeira verificação'}
            </span>
          )}
        </div>
        <button
          type="button"
          className="vox-readiness-refresh"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? 'verificando…' : 'verificar novamente'}
        </button>
      </div>

      {error ? (
        <p className="vox-readiness-error">
          Falha ao verificar prontidão: {error}
        </p>
      ) : null}

      {/* Wave 7.9 · Setup Assistant — concrete actions per blocker +
          usage tier chips + "Pronto para usar agora" callout. */}
      <VoxSetupAssistant
        summary={summary}
        loading={loading}
        onRefresh={handleRefresh}
      />

      {summary ? (
        <ul className="vox-readiness-list">
          {summary.items.map((item) => (
            <li
              key={item.id}
              className={`vox-readiness-item vox-readiness-item-${item.status}`}
            >
              <span className="vox-readiness-glyph" aria-hidden="true">
                {ITEM_GLYPH[item.status]}
              </span>
              <div className="vox-readiness-body">
                <div className="vox-readiness-row">
                  <span className="vox-readiness-label">{item.label}</span>
                  <span className="vox-readiness-status">{ITEM_LABEL[item.status]}</span>
                </div>
                {item.detail ? (
                  <p className="vox-readiness-detail">{item.detail}</p>
                ) : null}
                {item.nextAction ? (
                  <p className="vox-readiness-action">→ {item.nextAction}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {lastRefreshedAt ? (
        <p className="vox-readiness-footer">
          Última verificação: {new Date(lastRefreshedAt).toLocaleTimeString('pt-BR')}
        </p>
      ) : null}
    </div>
  )
}
