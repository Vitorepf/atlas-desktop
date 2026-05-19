/**
 * LayoutSaveIndicator · "Salvo · há Xs" discreto (Feature #6).
 *
 * Aparece quando layout muda. Atualiza relativo a cada segundo. Some
 * gracefully depois de 30s sem mudança pra não poluir tela.
 */
import { useEffect, useState } from 'react'

interface LayoutSaveIndicatorProps {
  lastSavedAt: number | null
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

function formatAgo(secs: number): string {
  if (secs < 2) return 'agora'
  if (secs < 60) return `há ${secs}s`
  if (secs < 3600) return `há ${Math.floor(secs / 60)}min`
  return `há ${Math.floor(secs / 3600)}h`
}

export function LayoutSaveIndicator({
  lastSavedAt,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: LayoutSaveIndicatorProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!lastSavedAt) return
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [lastSavedAt])

  if (!lastSavedAt) return null
  const secsAgo = Math.floor((now - lastSavedAt) / 1000)
  // Fade out depois de 30s sem mudança
  if (secsAgo > 30) return null

  return (
    <div className="layout-save-indicator floater no-pan" aria-live="polite">
      <span className="lsi-dot" />
      <span className="lsi-text">salvo · {formatAgo(secsAgo)}</span>
      <button
        type="button"
        className="lsi-action"
        onClick={onUndo}
        disabled={!canUndo}
        title="Desfazer (⌘Z)"
        aria-label="Desfazer"
      >
        ↶
      </button>
      <button
        type="button"
        className="lsi-action"
        onClick={onRedo}
        disabled={!canRedo}
        title="Refazer (⌘⇧Z)"
        aria-label="Refazer"
      >
        ↷
      </button>
    </div>
  )
}
