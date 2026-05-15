/**
 * Atlas Code · Atenção surface.
 *
 * Top-level surface that serializes human decisions across multiple Programming
 * Obras. Atlas works in parallel; the human decides in series; this surface
 * is the router of that series.
 *
 * Canon: docs/engineering-knowledge-base/atlas-code-attention-control-plane-v1.md
 *
 * Non-goals (explicit):
 *   - Não é dashboard de tudo que está rodando.
 *   - Não exibe terminais como elemento principal.
 *   - Não permite ações fora do `allowed_actions` do item.
 *   - Não promove completion claim; toda decisão mutante gera receipt.
 */
import { useCallback, useMemo, useState } from 'react'
import type { Surface } from '../../hooks/useSurface'
import './atencao.css'
import { AttentionEmpty } from './components/AttentionEmpty'
import { AttentionError } from './components/AttentionError'
import { AttentionFocus } from './components/AttentionFocus'
import { AttentionHealthRibbon } from './components/AttentionHealthRibbon'
import { AttentionQueueList } from './components/AttentionQueueList'
import { AttentionResolvedRail } from './components/AttentionResolvedRail'
import { useAttentionQueue } from './useAttentionQueue'
import type { AttentionAction, AttentionItem } from './types'

interface AtencaoSurfaceProps {
  activeWorkspaceSlug?: string | null
  onOpenObra?: (obraId: string, workspaceSlug?: string) => void
  /**
   * Called when the user explicitly asks to switch to the Atlas Code surface
   * for an Obra. Atencao itself never reaches into Code's state — it only
   * signals intent.
   */
  onRequestSurfaceChange?: (surface: Surface) => void
}

export function AtencaoSurface({
  activeWorkspaceSlug = null,
  onOpenObra,
  onRequestSurfaceChange,
}: AtencaoSurfaceProps) {
  const queue = useAttentionQueue(activeWorkspaceSlug)
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null)
  const [pending, setPending] = useState<boolean>(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const focusItem = useMemo<AttentionItem | null>(() => {
    if (queue.snapshot === null) return null
    if (selectedItemKey) {
      const found = queue.snapshot.queue_items.find((q) => q.item_key === selectedItemKey)
      if (found) return found
    }
    return queue.snapshot.active_focus_item
  }, [queue.snapshot, selectedItemKey])

  const handleSelect = useCallback((item: AttentionItem) => {
    setSelectedItemKey(item.item_key)
    setDecisionError(null)
  }, [])

  const handleOpenObra = useCallback(
    (item: AttentionItem) => {
      if (onOpenObra) onOpenObra(item.obra_id, item.workspace_slug)
      if (onRequestSurfaceChange) onRequestSurfaceChange('code')
    },
    [onOpenObra, onRequestSurfaceChange],
  )

  const handleDecide = useCallback(
    async (item: AttentionItem, action: AttentionAction, reason?: string, pauseHours?: number) => {
      if (action === 'open_obra') {
        handleOpenObra(item)
        return
      }
      if (!item.allowed_actions.includes(action)) {
        setDecisionError(`action_not_allowed_for_item:${action}`)
        return
      }
      setPending(true)
      setDecisionError(null)
      try {
        await queue.decide(item.obra_id, {
          item_key: item.item_key,
          action,
          reason,
          pause_hours: pauseHours,
        })
        // After a mutation the focus item is whatever the next queue head is.
        setSelectedItemKey(null)
      } catch (e) {
        setDecisionError(e instanceof Error ? e.message : String(e))
      } finally {
        setPending(false)
      }
    },
    [handleOpenObra, queue],
  )

  if (queue.mode === 'offline') {
    return (
      <main className="atencao-surface">
        <AttentionEmpty
          headline="Atenção offline"
          detail="Atlas Desktop está sem ligação com o kernel. Atenção não inventa fila — quando a conexão voltar, a próxima decisão humana aparece aqui."
        />
      </main>
    )
  }

  if (queue.error && queue.snapshot === null) {
    return (
      <main className="atencao-surface">
        <AttentionError message={queue.error} onRetry={queue.refresh} />
      </main>
    )
  }

  if (queue.snapshot === null && queue.loading) {
    return (
      <main className="atencao-surface">
        <section className="atencao-loading" role="status" aria-live="polite">
          Lendo a fila de decisões…
        </section>
      </main>
    )
  }

  const snapshot = queue.snapshot
  if (snapshot === null) {
    return (
      <main className="atencao-surface">
        <AttentionEmpty
          headline="Sem fila"
          detail="Atenção ainda não recebeu estado do Atlas Code."
        />
      </main>
    )
  }

  const empty = snapshot.queue_items.length === 0

  return (
    <main className="atencao-surface">
      <header className="atencao-header">
        <div className="atencao-header-title">
          <h1>Atenção</h1>
          <p className="atencao-header-sub">
            Atlas trabalha em paralelo. Você decide em série. Uma decisão por vez.
          </p>
        </div>
        <AttentionHealthRibbon
          health={snapshot.health}
          generatedAt={snapshot.generated_at}
          workspaceFilter={snapshot.workspace_filter}
          onRefresh={queue.refresh}
          loading={queue.loading}
        />
      </header>

      {empty ? (
        <AttentionEmpty
          headline="Nada precisa da sua decisão agora"
          detail={
            snapshot.obra_summary.length === 0
              ? 'Não há Obras vivas neste workspace. Crie uma Obra no Atlas Code para começar.'
              : 'Atlas está conduzindo Obras em paralelo sem precisar de humano. Volte quando uma decisão chegar.'
          }
          resolvedRecently={snapshot.resolved_recently}
        />
      ) : (
        <section className="atencao-body">
          <div className="atencao-focus-col">
            {focusItem ? (
              <AttentionFocus
                item={focusItem}
                pending={pending}
                error={decisionError}
                onDecide={handleDecide}
                onOpenObra={() => handleOpenObra(focusItem)}
              />
            ) : (
              <AttentionEmpty
                headline="Nenhum item selecionado"
                detail="Escolha um item da fila ao lado para focar."
              />
            )}
          </div>
          <aside className="atencao-queue-col">
            <AttentionQueueList
              items={snapshot.queue_items}
              focusedKey={focusItem?.item_key ?? null}
              onSelect={handleSelect}
            />
            <AttentionResolvedRail resolved={snapshot.resolved_recently} />
          </aside>
        </section>
      )}

      {queue.lastReceipt ? (
        <footer className="atencao-receipt-footer" aria-live="polite">
          <span className="atencao-receipt-tag">receipt</span>
          <code>{queue.lastReceipt.receipt_id}</code>
          <span>·</span>
          <span>{queue.lastReceipt.action}</span>
          <span>·</span>
          <span>{queue.lastReceipt.decided_at}</span>
        </footer>
      ) : null}
    </main>
  )
}
