import type { CartographyAtom, Lane, RecentChange } from '@atlas/domain'
import type { useCustomLayout } from '../state/useCustomLayout'
import type { useEditMode } from '../state/useEditMode'
import { FlowLaneRegion } from './FlowLaneRegion'
import { buildFlowLaneViewModel } from './flowLaneModel'

interface FlowLanesProps {
  lanes: Record<string, Lane>
  atomIndex: Record<string, CartographyAtom>
  recentByGraphId: Record<string, RecentChange>
  isolatedId: string | null
  kinSet: Set<string>
  onHover: (graphId: string | null) => void
  onIsolate: (graphId: string) => void
  onFocus: (graphId: string) => void
  scale: number
  editMode: ReturnType<typeof useEditMode>
  customLayout: ReturnType<typeof useCustomLayout>
}

export function FlowLanes({
  lanes,
  atomIndex,
  recentByGraphId,
  isolatedId,
  kinSet,
  onHover,
  onIsolate,
  onFocus,
  scale,
  editMode,
  customLayout,
}: FlowLanesProps) {
  return (
    <>
      {Object.entries(lanes).map(([key, lane]) => {
        if (!lane) return null
        const model = buildFlowLaneViewModel({
          key,
          lane,
          atomIndex,
          recentByGraphId,
          isolatedId,
          kinSet,
          customLayout: customLayout.overlay,
        })
        if (!model) return null

        return (
          <FlowLaneRegion
            key={key}
            model={model}
            atomIndex={atomIndex}
            recentByGraphId={recentByGraphId}
            isolatedId={isolatedId}
            kinSet={kinSet}
            onHover={onHover}
            onIsolate={onIsolate}
            onFocus={onFocus}
            scale={scale}
            isEditMode={editMode.isEditMode}
            onLayoutChange={customLayout.updateLane}
          />
        )
      })}
    </>
  )
}
