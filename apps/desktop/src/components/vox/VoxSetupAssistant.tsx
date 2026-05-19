/**
 * VoxSetupAssistant · Wave 7.9 / Claude X.
 *
 * Compact assistant rendered at the top of the Vox Readiness panel. Helps
 * the operator clear the typical first-run blockers (mic, accessibility,
 * input monitoring, hotkey, whisper model, kernel URL, executors) with:
 *
 *   - a "Pronto para usar agora" callout when the minimum criteria are met
 *   - 4 usage tier chips (Dictation / Polish / Compile / Governed Execute)
 *   - per-blocker action rows with concrete buttons (open settings, copy
 *     model path, refresh, or instruction-only when no safe action exists)
 *
 * Hard rules (mirrored from voxReadiness.ts):
 *   - No arbitrary URL opening. Only the Rust-side allowlist (mic /
 *     accessibility / input_monitoring) is reachable from here.
 *   - No fake "pronto". Tier availability comes from `deriveUsageTiers`.
 *   - No silent automation: clipboard writes always feedback success
 *     visually so the operator knows what landed there.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  voxOpenSystemSettings,
  type VoxSystemSettingsTarget,
} from '../../lib/bridge'
import {
  deriveItemActions,
  deriveUsageTiers,
  isReadyForFirstUse,
  type VoxReadinessItem,
  type VoxReadinessSummary,
  type VoxSetupAction,
  type VoxSetupCapabilities,
} from '../../lib/voxReadiness'

interface VoxSetupAssistantProps {
  summary: VoxReadinessSummary | null
  loading: boolean
  onRefresh: () => void
}

function detectCapabilities(): VoxSetupCapabilities {
  // We use the same heuristic the readiness aggregator uses: Tauri
  // presence + macOS UA hint. The Rust side is the real gate (it always
  // returns `unsupported_platform_macos_only` outside macOS), but a
  // hint here keeps the UI honest before the round-trip.
  const isTauri =
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  const isMac =
    typeof navigator !== 'undefined'
      && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '')
  return {
    canOpenSystemSettings: Boolean(isTauri && isMac),
    canCopyToClipboard:
      typeof navigator !== 'undefined'
      && typeof navigator.clipboard !== 'undefined'
      && typeof navigator.clipboard.writeText === 'function',
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the textarea fallback.
    }
  }
  if (typeof document === 'undefined') return false
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.focus()
    el.select()
    const ok = document.execCommand?.('copy') === true
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}

export function VoxSetupAssistant({
  summary,
  loading,
  onRefresh,
}: VoxSetupAssistantProps) {
  const capabilities = useMemo<VoxSetupCapabilities>(() => detectCapabilities(), [])
  const tiers = useMemo(() => deriveUsageTiers(summary), [summary])
  const ready = useMemo(() => isReadyForFirstUse(summary), [summary])

  const blockerItems = useMemo<VoxReadinessItem[]>(() => {
    if (!summary) return []
    return summary.items.filter(
      (it) => it.status === 'blocked' || it.status === 'warning',
    )
  }, [summary])

  const [feedback, setFeedback] = useState<string | null>(null)
  useEffect(() => {
    if (!feedback) return
    const t = window.setTimeout(() => setFeedback(null), 3000)
    return () => window.clearTimeout(t)
  }, [feedback])

  const handleOpenSettings = useCallback(
    async (target: VoxSystemSettingsTarget, label: string) => {
      const result = await voxOpenSystemSettings(target)
      if (result.ok) {
        setFeedback(`${label} aberto · libere Atlas Desktop e volte aqui.`)
      } else {
        setFeedback(
          `Não consegui abrir (${result.reason ?? 'motivo desconhecido'}). Abra Ajustes do Sistema manualmente.`,
        )
      }
    },
    [],
  )

  const handleCopy = useCallback(async (text: string, successMessage: string) => {
    const ok = await copyToClipboard(text)
    setFeedback(ok ? successMessage : 'Não consegui copiar. Selecione o texto manualmente.')
  }, [])

  const handleAction = useCallback(
    async (action: VoxSetupAction) => {
      switch (action.kind) {
        case 'open_system_settings':
          await handleOpenSettings(action.target, action.label)
          break
        case 'copy_text':
          await handleCopy(action.text, action.successMessage)
          break
        case 'refresh':
          onRefresh()
          break
        case 'instruction':
          // No-op: instruction rows are display-only. We still surface a
          // brief acknowledgement so the operator knows the click was
          // intentional and they don't keep tapping waiting for action.
          setFeedback('Instrução em tela · sem ação automatizada.')
          break
      }
    },
    [handleCopy, handleOpenSettings, onRefresh],
  )

  if (!summary && !loading) return null

  return (
    <div className="vox-setup-assistant">
      {/* "Pronto para usar agora" callout */}
      <div
        className={`vox-setup-headline vox-setup-headline-${
          ready.ready ? 'ready' : 'pending'
        }`}
      >
        <span className="vox-setup-headline-label">
          {ready.ready ? 'Pronto para usar agora' : 'Falta resolver'}
        </span>
        <span className="vox-setup-headline-detail">{ready.reasoning}</span>
      </div>

      {/* Usage tier chips · honest "pode usar X agora" */}
      <ul className="vox-setup-tiers">
        {tiers.tiers.map((tier) => (
          <li
            key={tier.mode}
            className={`vox-setup-tier vox-setup-tier-${
              tier.available ? 'available' : 'pending'
            }`}
            title={tier.detail}
          >
            <span className="vox-setup-tier-glyph" aria-hidden="true">
              {tier.available ? '●' : '○'}
            </span>
            <span className="vox-setup-tier-label">
              {tier.available ? `Pode usar ${tier.label}` : `Falta ${tier.label}`}
            </span>
          </li>
        ))}
      </ul>

      {/* Concrete actions per blocker · sorted by severity */}
      {blockerItems.length > 0 ? (
        <ul className="vox-setup-actions">
          {blockerItems
            .sort((a, b) =>
              a.status === b.status ? 0 : a.status === 'blocked' ? -1 : 1,
            )
            .map((item) => {
              const actions = deriveItemActions(item, capabilities)
              if (actions.length === 0) return null
              return (
                <li
                  key={item.id}
                  className={`vox-setup-action-row vox-setup-action-row-${item.status}`}
                >
                  <div className="vox-setup-action-head">
                    <span className="vox-setup-action-label">{item.label}</span>
                    <span className="vox-setup-action-status">{item.status}</span>
                  </div>
                  {item.detail ? (
                    <p className="vox-setup-action-detail">{item.detail}</p>
                  ) : null}
                  <div className="vox-setup-action-buttons">
                    {actions.map((action, idx) => (
                      <button
                        type="button"
                        key={`${item.id}-${idx}-${action.kind}`}
                        className={`vox-setup-action-btn vox-setup-action-btn-${action.kind}`}
                        onClick={() => void handleAction(action)}
                        title={
                          action.kind === 'instruction' ? action.detail : action.label
                        }
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
        </ul>
      ) : null}

      {/* Global refresh button — always visible so the operator can
          revalidate after touching System Settings. */}
      <div className="vox-setup-footer">
        <button
          type="button"
          className="vox-setup-refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'verificando…' : 'verificar novamente'}
        </button>
        {feedback ? (
          <span className="vox-setup-feedback" role="status" aria-live="polite">
            {feedback}
          </span>
        ) : null}
      </div>
    </div>
  )
}
