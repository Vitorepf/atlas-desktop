import type { CartographyAtom, RecentChange } from '@atlas/domain'
import { TimelineFloater } from '../timeline/TimelineFloater'

interface RecentChangesDockProps {
  collapsed: boolean
  changes: RecentChange[]
  atomIndex: Record<string, CartographyAtom>
  onPickRecent: (graphId: string) => void
}

export function RecentChangesDock({
  collapsed,
  changes,
  atomIndex,
  onPickRecent,
}: RecentChangesDockProps) {
  if (collapsed) return null
  return (
    <div className="ins-recent-dock">
      <TimelineFloater changes={changes} atomIndex={atomIndex} onPick={onPickRecent} />
    </div>
  )
}
