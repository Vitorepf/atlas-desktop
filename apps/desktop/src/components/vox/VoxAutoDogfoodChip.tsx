/**
 * V6-E · VoxAutoDogfoodChip
 *
 * Chip discreto que aparece logo após o auto-dogfood concluir. Substitui o
 * antigo formulário `VoxSessionCloseout` no fluxo principal — o
 * formulário completo continua disponível dentro de Detalhes Avançados.
 *
 * Variantes visuais:
 *   • `recorded`    → "Sessão registrada · Funcionou bem | Marcar como ruim"
 *   • `unavailable` → "Diário Vox indisponível agora." (sem botões)
 *   • `failed`      → "Não consegui salvar. Sigo." (sem botões)
 *   • `submitting`  → "Registrando…"
 *   • `idle`        → nada renderiza.
 *
 * Falha não bloqueia nada: o overlay segue normal. Se o feedback `good`/`bad`
 * falhar, mostra mensagem curta — nunca stack trace, nunca enum cru.
 */
import { useEffect, useState } from 'react'

import type { UseVoxAutoDogfoodResult } from './useVoxAutoDogfood'

interface VoxAutoDogfoodChipProps {
  /** Controller do `useVoxAutoDogfood`. Aceita `undefined` quando o overlay
   * é renderizado em harness SSR/teste com controller minimal — o chip
   * simplesmente não aparece nesse caso. */
  autoDogfood: UseVoxAutoDogfoodResult | undefined
}

const OUTCOME_LABEL: Record<string, string> = {
  success: 'sucesso',
  partial: 'parcial',
  failed: 'falhou',
  cancelled: 'cancelada',
}

export function VoxAutoDogfoodChip({ autoDogfood }: VoxAutoDogfoodChipProps) {
  // V6-E · sempre invoque os hooks ANTES de qualquer early-return (regra do
  // React). Quando `autoDogfood` está ausente, o efeito vira no-op via
  // dependência `null`.
  const [transientHidden, setTransientHidden] = useState<boolean>(false)

  const lastFeedback = autoDogfood?.feedback.lastResult ?? null

  // V6-E · ao receber feedback ok, mantemos o chip por 6 s mostrando
  // "Anotado" + outcome final, depois recolhemos pra não poluir o overlay.
  useEffect(() => {
    if (lastFeedback === null) {
      setTransientHidden(false)
      return
    }
    setTransientHidden(false)
    const t = window.setTimeout(() => setTransientHidden(true), 6_000)
    return () => window.clearTimeout(t)
  }, [lastFeedback])

  if (!autoDogfood) return null
  const { result, feedback } = autoDogfood
  if (result.kind === 'idle') return null
  if (transientHidden) return null

  if (result.kind === 'submitting') {
    return (
      <div
        className="vox-auto-dogfood vox-auto-dogfood-submitting"
        role="status"
        aria-live="polite"
      >
        <span className="vox-auto-dogfood-dot" aria-hidden="true" />
        <span className="vox-auto-dogfood-text">Registrando sessão…</span>
      </div>
    )
  }

  if (result.kind === 'unavailable') {
    return (
      <div
        className="vox-auto-dogfood vox-auto-dogfood-unavailable"
        role="status"
        aria-live="polite"
      >
        <span className="vox-auto-dogfood-text">
          Diário de uso indisponível agora. Sigo sem registrar.
        </span>
      </div>
    )
  }

  if (result.kind === 'failed') {
    return (
      <div
        className="vox-auto-dogfood vox-auto-dogfood-failed"
        role="status"
        aria-live="polite"
      >
        <span className="vox-auto-dogfood-text">
          Não consegui salvar essa sessão. Sigo.
        </span>
      </div>
    )
  }

  // result.kind === 'recorded'
  const outcomeLabel = OUTCOME_LABEL[result.outcome] ?? result.outcome
  if (feedback.lastResult !== null) {
    // Já recebeu um clique — mostra estado calmo.
    return (
      <div
        className="vox-auto-dogfood vox-auto-dogfood-resolved"
        role="status"
        aria-live="polite"
      >
        <span className="vox-auto-dogfood-text">
          {feedback.lastResult === 'good'
            ? 'Anotado: funcionou.'
            : 'Anotado: ruim — você pode corrigir depois.'}
        </span>
      </div>
    )
  }

  return (
    <div
      className="vox-auto-dogfood vox-auto-dogfood-recorded"
      role="status"
      aria-live="polite"
    >
      <span className="vox-auto-dogfood-text">
        Funcionou?
        <span className="vox-auto-dogfood-outcome"> · {outcomeLabel}</span>
      </span>
      <div className="vox-auto-dogfood-actions">
        <button
          type="button"
          className="vox-auto-dogfood-btn vox-auto-dogfood-btn-good"
          onClick={() => {
            void feedback.submitGood()
          }}
          disabled={feedback.busy || !feedback.available}
          title="Marca como sucesso real."
        >
          Funcionou
        </button>
        <button
          type="button"
          className="vox-auto-dogfood-btn vox-auto-dogfood-btn-bad"
          onClick={() => {
            void feedback.submitBad()
          }}
          disabled={feedback.busy || !feedback.available}
          title="Marca como ruim — você pode contar depois o motivo."
        >
          Ruim
        </button>
      </div>
      {feedback.error ? (
        <span className="vox-auto-dogfood-feedback-error" role="status">
          {/* Mensagem curta — nunca stack trace cru. */}
          Não consegui registrar feedback agora.
        </span>
      ) : null}
    </div>
  )
}
