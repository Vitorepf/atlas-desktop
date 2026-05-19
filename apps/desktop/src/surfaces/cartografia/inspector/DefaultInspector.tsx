import type { CartographyAtom, CartographyGraph, RecentChange } from '@atlas/domain'
import {
  CollapsedInspectorRail,
  InspectorResizeToolbar,
} from './InspectorResizeControls'
import { RecentChangesDock } from './RecentChangesDock'
import { DefaultInspectorContent } from './DefaultInspectorContent'

interface DefaultInspectorProps {
  graph: CartographyGraph | null
  recentChanges: RecentChange[]
  atomIndex: Record<string, CartographyAtom>
  onPickRecent: (graphId: string) => void
  collapsed: boolean
  width: number
  minWidth: number
  maxWidth: number
  onToggleCollapsed: () => void
  onNudgeWidth: (delta: number) => void
  onResetWidth: () => void
}

export function DefaultInspector({
  graph,
  recentChanges,
  atomIndex,
  onPickRecent,
  collapsed,
  width,
  minWidth,
  maxWidth,
  onToggleCollapsed,
  onNudgeWidth,
  onResetWidth,
}: DefaultInspectorProps) {
  return (
    <aside className={`cart-inspector${collapsed ? ' is-collapsed' : ''}`}>
      <InspectorResizeToolbar
        collapsed={collapsed}
        width={width}
        minWidth={minWidth}
        maxWidth={maxWidth}
        onToggleCollapsed={onToggleCollapsed}
        onNudgeWidth={onNudgeWidth}
        onResetWidth={onResetWidth}
      />
      {collapsed ? (
        <CollapsedInspectorRail onToggleCollapsed={onToggleCollapsed} />
      ) : (
        <div className="ins-content" aria-hidden={collapsed}>
          <DefaultInspectorContent graph={graph} />
          <RecentChangesDock
            collapsed={collapsed}
            changes={recentChanges}
            atomIndex={atomIndex}
            onPickRecent={onPickRecent}
          />
        </div>
      )}
    </aside>
  )
}
