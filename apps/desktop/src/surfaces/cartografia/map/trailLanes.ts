import type { RouteDraft } from './trailTypes'

export function assignOverlapLanes(drafts: RouteDraft[]): Map<RouteDraft, number> {
  const out = new Map<RouteDraft, number>()
  for (const side of ['left', 'right'] as const) {
    const openLaneEnd: number[] = []
    const sideDrafts = drafts
      .filter((draft) => draft.side === side)
      .sort((a, b) => a.minY - b.minY || b.maxY - a.maxY)

    for (const draft of sideDrafts) {
      let lane = openLaneEnd.findIndex((end) => draft.minY > end + 38)
      if (lane === -1) {
        lane = openLaneEnd.length
        openLaneEnd.push(draft.maxY)
      } else {
        openLaneEnd[lane] = draft.maxY
      }
      out.set(draft, lane)
    }
  }
  return out
}
