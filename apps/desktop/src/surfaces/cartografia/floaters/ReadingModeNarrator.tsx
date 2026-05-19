/**
 * ReadingModeNarrator · breadcrumb narrativo + speaker notes durante
 * reading mode (Feature #5).
 *
 * Substitui o badge "modo leitura · R sai · ← → espaço" simples do CSS
 * por um overlay editorial:
 *
 *   ┌─────────────────────────────────────────┐
 *   │ INTAKE · 2 de 3                          │
 *   │ Surface Adapter                          │
 *   │ coleta input, apresenta output, não decide│
 *   └─────────────────────────────────────────┘
 *
 * + painel "speaker notes" expandido ao lado da peça focada com nome +
 * deck longo + source path + atalhos do teclado.
 */
import type { CartographyAtom, PipelineStep } from '@atlas/domain'

interface ReadingModeNarratorProps {
  pipeline: PipelineStep[]
  focusOrder: number | null
  focusedAtom: CartographyAtom | null
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

/** Fase canônica do pipeline baseada em graphOrder. Mirror de
 *  scenes/flowModel.ts:FLOW_PHASES. */
function phaseFor(order: number): { label: string; deck: string; index: number; total: number } | null {
  if (order >= 1 && order <= 3) return { label: 'intake', deck: 'captura', index: order, total: 3 }
  if (order >= 4 && order <= 8) return { label: 'shape', deck: 'contexto', index: order - 3, total: 5 }
  if (order >= 9 && order <= 12) return { label: 'decide', deck: 'decisão', index: order - 8, total: 4 }
  if (order >= 13 && order <= 15) return { label: 'prove', deck: 'evidência', index: order - 12, total: 3 }
  if (order >= 16 && order <= 17) return { label: 'render', deck: 'saída', index: order - 15, total: 2 }
  return null
}

const ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii']

export function ReadingModeNarrator({
  pipeline,
  focusOrder,
  focusedAtom,
  onClose,
  onNext,
  onPrev,
}: ReadingModeNarratorProps) {
  if (focusOrder == null || pipeline.length === 0) return null
  const step = pipeline[focusOrder] // focusOrder is zero-indexed in state
  if (!step) return null
  const graphOrder = step.graphOrder
  const phase = phaseFor(graphOrder)
  const isFirst = focusOrder <= 0
  const isLast = focusOrder >= pipeline.length - 1

  return (
    <>
      <div className="reading-narrator floater no-pan" role="region" aria-label="Modo leitura">
        <div className="rmn-header">
          <div className="rmn-phase">
            {phase ? (
              <>
                <span className="rmn-phase-label">{phase.label}</span>
                <span className="rmn-phase-meta">
                  · {phase.index} de {phase.total}
                </span>
              </>
            ) : (
              <span className="rmn-phase-label">capítulo</span>
            )}
          </div>
          <button
            type="button"
            className="rmn-close"
            onClick={onClose}
            aria-label="Sair do modo leitura"
            title="Sair · R"
          >
            ×
          </button>
        </div>

        <div className="rmn-numeral">{ROMAN[graphOrder] ?? graphOrder}</div>

        <div className="rmn-title">{focusedAtom?.name ?? step.name}</div>

        {focusedAtom?.deck ? (
          <div className="rmn-deck">{focusedAtom.deck}</div>
        ) : null}

        {focusedAtom?.role ? (
          <div className="rmn-role">{focusedAtom.role}</div>
        ) : null}

        {focusedAtom?.next ? (
          <div className="rmn-next">
            <span className="rmn-next-label">próxima ação</span>
            <span className="rmn-next-text">{focusedAtom.next}</span>
          </div>
        ) : null}

        <div className="rmn-footer">
          <button
            type="button"
            className="rmn-nav rmn-prev"
            onClick={onPrev}
            disabled={isFirst}
            aria-label="Capítulo anterior"
            title="Anterior · ←"
          >
            ←
          </button>
          <div className="rmn-progress">
            <span className="rmn-progress-current">{focusOrder + 1}</span>
            <span className="rmn-progress-sep"> / </span>
            <span className="rmn-progress-total">{pipeline.length}</span>
          </div>
          <button
            type="button"
            className="rmn-nav rmn-next-btn"
            onClick={onNext}
            disabled={isLast}
            aria-label="Próximo capítulo"
            title="Próximo · → espaço"
          >
            →
          </button>
        </div>

        <div className="rmn-shortcuts">
          <kbd>R</kbd> sai · <kbd>←</kbd> <kbd>→</kbd> <kbd>␣</kbd>
        </div>
      </div>
    </>
  )
}
