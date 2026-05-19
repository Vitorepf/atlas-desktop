/**
 * Atlas AI · Dev-to-Forge Promotion panel.
 *
 * Modal leve para inspecionar a recomendação de promoção da thread atual:
 * Atlas AI/Atlas Dev → Intervenção Rápida | Candidato de Obra | Obra Forge.
 *
 * Meta 8.5 reconciliation: this panel now consumes the canonical
 * `devToForgeBridge` (HTTP routes `/atlas-code/dev-to-forge/*`). The previous
 * `/atlas-code/promotion/*` client was removed during the consolidation. UI
 * preserved verbatim — only the data plane was swapped.
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-ai-conversation-surface-and-atlas-dev-v1.md
 *   - docs/engineering-knowledge-base/atlas-code-programming-obras-operating-system.md
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  devToForgeBridge,
  type AtlasCodePromotionCandidate,
  type AtlasCodePromotionPreview,
  type AtlasCodePromotionTarget,
} from '../client'

interface AtlasAiPromotionPanelProps {
  open: boolean
  threadId: string | null
  workspaceSlug?: string | null
  onClose: () => void
  onPromoted?: (candidate: AtlasCodePromotionCandidate) => void
}

type SelectableTarget = Exclude<AtlasCodePromotionTarget, 'none'>

const TARGET_LABEL: Record<AtlasCodePromotionTarget, string> = {
  none: 'Nenhuma (continuar como Atlas Dev)',
  quick_intervention: 'Intervenção Rápida',
  obra_candidate: 'Candidato de Obra',
  forge_obra: 'Obra Forge',
}

const TARGET_HINT: Record<AtlasCodePromotionTarget, string> = {
  none: 'Conversa pequena ou já resolvida — continuar no Atlas Dev. Nenhuma Obra precisa nascer.',
  quick_intervention: 'Pequeno, claro e reversível. Não cria Obra; vira um trabalho leve, executável no Atlas Dev.',
  obra_candidate: 'Trabalho com risco/escopo. Cria uma Obra candidata (não-executada) com contexto e back-link para a thread.',
  forge_obra: 'Trabalho ultra-hard ou pedido explícito do humano. Cria Obra Forge real, vinculada ao workspace.',
}

function confidenceLabel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 7) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

function allowedTargetsForRecommendation(target: AtlasCodePromotionTarget): SelectableTarget[] {
  // Operator can always pick a heavier tier; we only expose lighter tiers
  // when the recommendation is already at quick_intervention or none.
  if (target === 'forge_obra') return ['obra_candidate', 'forge_obra']
  if (target === 'obra_candidate') return ['quick_intervention', 'obra_candidate', 'forge_obra']
  return ['quick_intervention', 'obra_candidate', 'forge_obra']
}

export function AtlasAiPromotionPanel({
  open,
  threadId,
  workspaceSlug,
  onClose,
  onPromoted,
}: AtlasAiPromotionPanelProps) {
  const [preview, setPreview] = useState<AtlasCodePromotionPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chosenTarget, setChosenTarget] = useState<SelectableTarget | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !threadId) return
    let cancelled = false
    // Defer state updates to a microtask so the initial render commits before
    // any setState lands — matches the pattern used by Atenção and Atlas AI hooks.
    void Promise.resolve().then(async () => {
      if (cancelled) return
      setLoading(true)
      setError(null)
      setPreview(null)
      setChosenTarget(null)
      setReason('')
      try {
        const data = await devToForgeBridge.previewPromotion(
          threadId,
          workspaceSlug ?? undefined,
        )
        if (cancelled) return
        if (data === null) {
          setError('atlas_dev_promotion_unavailable · backend não respondeu')
          return
        }
        setPreview(data)
        const recommended = data.promotionTarget === 'none'
          ? 'quick_intervention'
          : (data.promotionTarget as SelectableTarget)
        setChosenTarget(recommended)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, threadId, workspaceSlug])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const allowedTargets = useMemo<SelectableTarget[]>(() => {
    if (!preview) return []
    return allowedTargetsForRecommendation(preview.promotionTarget)
  }, [preview])

  const requiresWorkspace = useMemo<boolean>(() => {
    if (!preview) return false
    const slug = preview.workspaceSlug?.trim() ?? ''
    // Project boundary: a candidate without workspace is incomplete. The
    // backend `DevToForgePromotionService` falls back to "atlas" when empty,
    // but we still flag it so the operator confirms the scope explicitly.
    return slug === ''
  }, [preview])

  const handlePromote = useCallback(async () => {
    if (!threadId || !preview || !chosenTarget) return
    setBusy(true)
    setError(null)
    try {
      const result = await devToForgeBridge.promoteThread(threadId, chosenTarget, {
        workspaceSlug: preview.workspaceSlug || workspaceSlug || null,
        overrides: {
          title: preview.title,
          objective: preview.objective,
          contextSummary: preview.contextSummary,
          knownFiles: preview.knownFiles,
          risks: preview.risks,
          openQuestions: preview.openQuestions,
          suggestedSuccessCriteria: preview.suggestedSuccessCriteria,
          suggestedNextStep: reason.trim() !== '' ? reason.trim() : preview.suggestedNextStep,
        },
      })
      if (result === null) {
        setError('atlas_dev_promotion_failed · backend não confirmou a promoção')
        return
      }
      onPromoted?.(result)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [threadId, preview, chosenTarget, workspaceSlug, reason, onPromoted, onClose])

  if (!open) return null

  const confidence = preview ? confidenceLabel(preview.signalReport.score) : null
  const reasonsForRecommendation = preview ? preview.signalReport.reasons : []
  // `thin_small_bug_veto` is the canon flag emitted by PromotionSignalDetector
  // when the conversation is too small to warrant any promotion at all.
  const thinSmallBugVeto =
    reasonsForRecommendation.includes('thin_small_bug_veto') ||
    Boolean((preview?.signalReport.signals as Record<string, unknown> | undefined)
      ?.thin_small_bug && (preview!.signalReport.signals as Record<string, Record<string, unknown>>)
      .thin_small_bug.detected === true)
  const alreadyPromoted =
    preview?.promotedObraId !== null && preview?.promotedObraId !== undefined && preview.promotedObraId !== ''

  return (
    <div
      className="atlas-ai-promotion-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Promover thread para Forge"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section className="atlas-ai-promotion-sheet">
        <header className="atlas-ai-promotion-header">
          <div>
            <p className="atlas-ai-promotion-eyebrow">Atlas Dev → Forge</p>
            <h2>{preview?.title || 'Promover thread'}</h2>
            <p className="atlas-ai-promotion-sub">
              {preview?.workspaceName ?? preview?.workspaceSlug ?? 'workspace —'}
              {preview?.messageCount
                ? ` · ${preview.messageCount} mensagens`
                : ''}
              {confidence ? ` · confiança ${confidence}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="atlas-ai-promotion-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        {loading ? (
          <p className="atlas-ai-promotion-empty">Calculando recomendação…</p>
        ) : error && !preview ? (
          <p className="atlas-ai-promotion-error" role="alert">{error}</p>
        ) : preview ? (
          <div className="atlas-ai-promotion-body">
            <section className="atlas-ai-promotion-section">
              <h3>Recomendação</h3>
              <p className="atlas-ai-promotion-target-name">
                {TARGET_LABEL[preview.promotionTarget]}
              </p>
              <p className="atlas-ai-promotion-target-hint">
                {TARGET_HINT[preview.promotionTarget]}
              </p>
              {reasonsForRecommendation.length > 0 ? (
                <ul className="atlas-ai-promotion-reasons">
                  {reasonsForRecommendation.map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
              ) : null}
              {thinSmallBugVeto ? (
                <p className="atlas-ai-promotion-warning">
                  ⚠ thread pequena demais para virar Obra. Atlas Dev cobre. Promova só se você
                  tiver motivo explícito.
                </p>
              ) : null}
              {alreadyPromoted ? (
                <p className="atlas-ai-promotion-warning">
                  ⚠ esta thread já tem uma Obra promovida (`{preview.promotedObraId}`).
                  Re-enviar não cria uma nova; refresca o candidato existente.
                </p>
              ) : null}
              {requiresWorkspace ? (
                <p className="atlas-ai-promotion-warning">
                  ⚠ workspace ausente no preview. Selecione um Project no topbar antes de promover.
                </p>
              ) : null}
            </section>

            <section className="atlas-ai-promotion-section">
              <h3>Resumo</h3>
              <p className="atlas-ai-promotion-paragraph">
                <strong>Objetivo:</strong> {preview.objective || '—'}
              </p>
              {preview.contextSummary ? (
                <p className="atlas-ai-promotion-paragraph">
                  <strong>Contexto:</strong> {preview.contextSummary}
                </p>
              ) : null}
              {preview.suggestedNextStep ? (
                <p className="atlas-ai-promotion-paragraph">
                  <strong>Próximo passo:</strong> {preview.suggestedNextStep}
                </p>
              ) : null}
            </section>

            <div className="atlas-ai-promotion-grid">
              <PromotionList
                title="Arquivos citados"
                items={preview.knownFiles}
                empty="nenhum arquivo identificado"
                isCode
              />
              <PromotionList
                title="Riscos"
                items={preview.risks}
                empty="nenhum risco extraído"
              />
              <PromotionList
                title="Perguntas em aberto"
                items={preview.openQuestions}
                empty="sem perguntas abertas"
              />
              <PromotionList
                title="Critérios de sucesso sugeridos"
                items={preview.suggestedSuccessCriteria}
                empty="critérios ainda não declarados — defina antes de aceitar"
              />
            </div>

            <section className="atlas-ai-promotion-section">
              <h3>Decisão</h3>
              <div className="atlas-ai-promotion-target-row" role="radiogroup" aria-label="Target da promoção">
                {allowedTargets.map((t) => (
                  <label
                    key={t}
                    className={`atlas-ai-promotion-target-option${chosenTarget === t ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="promotion-target"
                      value={t}
                      checked={chosenTarget === t}
                      onChange={() => setChosenTarget(t)}
                      disabled={busy}
                    />
                    <span>
                      <strong>{TARGET_LABEL[t]}</strong>
                      <em>{TARGET_HINT[t]}</em>
                    </span>
                  </label>
                ))}
              </div>

              <label className="atlas-ai-promotion-reason-label">
                Razão da promoção (opcional, vira `suggested_next_step` do candidato)
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={600}
                  disabled={busy}
                  placeholder="Ex: trabalho cresceu em risco; preciso de gates e revisão humana."
                />
              </label>

              {error ? <p className="atlas-ai-promotion-error">{error}</p> : null}

              <div className="atlas-ai-promotion-actions">
                <button
                  type="button"
                  className="atlas-ai-action atlas-ai-action-ghost"
                  onClick={onClose}
                  disabled={busy}
                >
                  cancelar
                </button>
                <button
                  type="button"
                  className="atlas-ai-action atlas-ai-action-primary"
                  onClick={handlePromote}
                  disabled={busy || !chosenTarget || requiresWorkspace}
                >
                  {busy
                    ? 'promovendo…'
                    : alreadyPromoted
                      ? 'atualizar candidato'
                      : 'criar candidato'}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function PromotionList({
  title,
  items,
  empty,
  isCode = false,
}: {
  title: string
  items: string[]
  empty: string
  isCode?: boolean
}) {
  return (
    <section className="atlas-ai-promotion-card">
      <header>{title}</header>
      {items.length === 0 ? (
        <p className="atlas-ai-promotion-empty-line">{empty}</p>
      ) : (
        <ul>
          {items.slice(0, 12).map((item) => (
            <li key={item}>{isCode ? <code>{item}</code> : item}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
