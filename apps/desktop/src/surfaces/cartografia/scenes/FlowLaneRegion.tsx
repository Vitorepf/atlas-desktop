/**
 * FlowLaneRegion · renderiza UMA lane lateral (Domain Plane, HKS, etc.).
 *
 * Modo padrão: render canon (region head + atoms).
 * Modo edit (lock destravado): drag pelo region-head move a lane,
 * 8 handles nas bordas/cantos permitem resize. Drag/resize convertem
 * delta de pixel da tela pra pixel do mundo dividindo pelo `scale`
 * atual do .world transform — assim o drag fica WYSIWYG em qualquer
 * zoom.
 */
import { useCallback, useEffect, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { CartographyAtom, RecentChange } from '@atlas/domain'
import { Atom } from '../map/Atom'
import { LANE_LAYOUT } from '../map/layout'
import type { CustomLaneLayout } from '../state/useCustomLayout'
import type { FlowLaneViewModel } from './flowLaneModel'
import { LANE_EYEBROW } from './flowLaneModel'

const MIN_WIDTH = 200
const MIN_HEIGHT = 150
const SNAP_GRID = 8         // px no mundo · alinhamento Patek manuscript
const MAGNET_SNAP = 12      // px · distance até canon dentro do qual snap acontece

/** Arredonda valor pra múltiplo de step. */
function snap(value: number, step: number): number {
  return Math.round(value / step) * step
}

/** Magnetism · se candidate está dentro de MAGNET_SNAP de canon, snap exato. */
function applyMagnet(candidate: number, canon: number): number {
  const diff = Math.abs(candidate - canon)
  if (diff <= MAGNET_SNAP) return canon
  return candidate
}

interface FlowLaneRegionProps {
  model: FlowLaneViewModel
  atomIndex: Record<string, CartographyAtom>
  recentByGraphId: Record<string, RecentChange>
  isolatedId: string | null
  kinSet: Set<string>
  onHover: (graphId: string | null) => void
  onIsolate: (graphId: string) => void
  onFocus: (graphId: string) => void
  scale: number
  isEditMode: boolean
  onLayoutChange: (graphId: string, patch: Partial<CustomLaneLayout>) => void
}

type ResizeHandle = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw'

export function FlowLaneRegion({
  model,
  atomIndex,
  recentByGraphId,
  isolatedId,
  kinSet,
  onHover,
  onIsolate,
  onFocus,
  scale,
  isEditMode,
  onLayoutChange,
}: FlowLaneRegionProps) {
  const [interaction, setInteraction] = useState<{
    startClientX: number
    startClientY: number
    startLayout: { x: number; y: number; w: number; h?: number }
    mode: 'drag' | ResizeHandle
  } | null>(null)

  const beginInteraction = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>, mode: 'drag' | ResizeHandle) => {
      if (!isEditMode) return
      e.preventDefault()
      e.stopPropagation()
      setInteraction({
        startClientX: e.clientX,
        startClientY: e.clientY,
        startLayout: { ...model.layout },
        mode,
      })
    },
    [isEditMode, model.layout]
  )

  // Drag/resize loop via window mousemove/up — usa native mouse events
  // pra integrar com o pan binding existente do viewport (também mouse-based).
  useEffect(() => {
    if (!interaction) return
    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - interaction.startClientX) / scale
      const dy = (e.clientY - interaction.startClientY) / scale
      const { startLayout, mode } = interaction

      if (mode === 'drag') {
        // Snap-to-grid 8px + magnetism canon (Feature #2 · Edit Mode)
        let nx = snap(startLayout.x + dx, SNAP_GRID)
        let ny = snap(startLayout.y + dy, SNAP_GRID)
        const canon = LANE_LAYOUT[model.key]
        if (canon) {
          nx = applyMagnet(nx, canon.x)
          ny = applyMagnet(ny, canon.y)
        }
        onLayoutChange(model.lane.graphId, { x: nx, y: ny })
        return
      }

      let nx = startLayout.x
      let ny = startLayout.y
      let nw = startLayout.w
      const startH = startLayout.h ?? 600
      let nh = startH

      if (mode === 'e' || mode === 'ne' || mode === 'se') nw = startLayout.w + dx
      if (mode === 'w' || mode === 'nw' || mode === 'sw') {
        nw = startLayout.w - dx
        nx = startLayout.x + dx
      }
      if (mode === 's' || mode === 'se' || mode === 'sw') nh = startH + dy
      if (mode === 'n' || mode === 'ne' || mode === 'nw') {
        nh = startH - dy
        ny = startLayout.y + dy
      }

      if (nw < MIN_WIDTH) {
        if (mode === 'w' || mode === 'nw' || mode === 'sw') nx = startLayout.x + startLayout.w - MIN_WIDTH
        nw = MIN_WIDTH
      }
      if (nh < MIN_HEIGHT) {
        if (mode === 'n' || mode === 'ne' || mode === 'nw') ny = startLayout.y + startH - MIN_HEIGHT
        nh = MIN_HEIGHT
      }

      // Snap resize values to grid pra alinhamento Patek
      onLayoutChange(model.lane.graphId, {
        x: snap(nx, SNAP_GRID),
        y: snap(ny, SNAP_GRID),
        w: snap(nw, SNAP_GRID),
        h: snap(nh, SNAP_GRID),
      })
    }
    const handleUp = () => setInteraction(null)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [interaction, model.lane.graphId, onLayoutChange, scale])

  const isDragging = interaction != null
  return (
    <div
      id={`atom-${model.lane.graphId}`}
      className={`${model.className}${isDragging ? ' is-dragging' : ''}`}
      style={{
        left: model.layout.x,
        top: model.layout.y,
        width: model.layout.w,
        height: model.layout.h,
        position: 'absolute',
      }}
    >
      <div
        className={`region-head${isEditMode ? ' no-pan' : ''}`}
        onMouseDown={(e) => beginInteraction(e, 'drag')}
      >
        <span className="eyebrow">
          {LANE_EYEBROW[model.key] ?? 'plano lateral'}
        </span>
        <span
          className="count"
          aria-label={`${model.nodes.length} peças`}
        >
          {String(model.nodes.length).padStart(2, '0')}
        </span>
        <span className="title">{model.lane.head}</span>
        {model.lane.deck ? (
          <span className="deck">{model.lane.deck}</span>
        ) : null}
      </div>
      <RegionSignals
        relations={model.regionSignals.relations}
        risk={model.regionSignals.risk}
        recent={model.regionSignals.recent}
        evidence={model.regionSignals.evidence}
      />
      <div className="region-atoms">
        {model.nodes.map((node) => {
          const atom = atomIndex[node.graphId]
          if (!atom) return null
          return (
            <Atom
              key={node.graphId}
              atom={atom}
              recent={recentByGraphId[node.graphId] ?? null}
              isActive={isolatedId === node.graphId}
              isKin={kinSet.has(node.graphId)}
              onHover={onHover}
              onIsolate={onIsolate}
              onFocus={onFocus}
            />
          )
        })}
      </div>
      {isEditMode ? (
        <>
          <div className="region-edit-handle h-nw no-pan" onMouseDown={(e) => beginInteraction(e, 'nw')} />
          <div className="region-edit-handle h-n no-pan"  onMouseDown={(e) => beginInteraction(e, 'n')} />
          <div className="region-edit-handle h-ne no-pan" onMouseDown={(e) => beginInteraction(e, 'ne')} />
          <div className="region-edit-handle h-e no-pan"  onMouseDown={(e) => beginInteraction(e, 'e')} />
          <div className="region-edit-handle h-se no-pan" onMouseDown={(e) => beginInteraction(e, 'se')} />
          <div className="region-edit-handle h-s no-pan"  onMouseDown={(e) => beginInteraction(e, 's')} />
          <div className="region-edit-handle h-sw no-pan" onMouseDown={(e) => beginInteraction(e, 'sw')} />
          <div className="region-edit-handle h-w no-pan"  onMouseDown={(e) => beginInteraction(e, 'w')} />
        </>
      ) : null}
    </div>
  )
}

function RegionSignals({
  relations,
  risk,
  recent,
  evidence,
}: {
  relations: number
  risk: number
  recent: number
  evidence: number
}) {
  return (
    <div className="region-signals" aria-hidden="true">
      <span className={`signal-dot signal-relations${relations > 0 ? ' on' : ''}`} />
      <span className={`signal-dot signal-risk${risk > 0 ? ' on' : ''}`} />
      <span className={`signal-dot signal-recent${recent > 0 ? ' on' : ''}`} />
      <span className={`signal-dot signal-evidence${evidence > 0 ? ' on' : ''}`} />
    </div>
  )
}
