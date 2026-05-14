import type { CartografiaState } from '../state/cartografiaTypes'
import type { CartografiaViewModel } from '../state/useCartografiaViewModel'
import type { InspectorColumnController } from '../layout/useInspectorColumn'
import { Inspector } from './Inspector'

export function CartografiaInspectorSlot({
  cartografia,
  viewModel,
  inspectorColumn,
}: {
  cartografia: CartografiaState
  viewModel: CartografiaViewModel
  inspectorColumn: InspectorColumnController
}) {
  return (
    <Inspector
      atom={viewModel.inspectorAtom}
      recent={viewModel.inspectorRecent}
      noteCache={cartografia.noteCache}
      loadNoteFor={cartografia.loadNoteFor}
      sourceRoots={cartografia.graph?.sources ?? null}
      graph={cartografia.graph}
      recentChanges={cartografia.recentChanges}
      atomIndex={cartografia.atomIndex}
      onPickRecent={cartografia.enterGear}
      collapsed={inspectorColumn.collapsed}
      width={inspectorColumn.width}
      minWidth={inspectorColumn.minWidth}
      maxWidth={inspectorColumn.maxWidth}
      onToggleCollapsed={inspectorColumn.toggleCollapsed}
      onNudgeWidth={inspectorColumn.nudgeWidth}
      onResetWidth={inspectorColumn.resetWidth}
    />
  )
}
