export interface WorkbenchThreadSelection {
  threadIds: string[]
  added: boolean
  atLimit: boolean
}

export interface WorkbenchScopePruneInput {
  threadIds: string[]
  availableThreadIds: Set<string>
  focusedThreadId: string | null
  pendingThreadId: string | null
  active: boolean
  limit?: number
}

export interface WorkbenchScopePruneResult {
  threadIds: string[]
  focusedThreadId: string | null
  pendingThreadId: string | null
  active: boolean
  changed: boolean
}

export function nextWorkbenchThreadSelection(
  currentThreadIds: string[],
  selectedThreadId: string | null,
  targetThreadId: string,
  limit = 4,
): WorkbenchThreadSelection {
  if (!targetThreadId) return { threadIds: currentThreadIds, added: false, atLimit: false }
  const base =
    currentThreadIds.length > 0
      ? currentThreadIds
      : selectedThreadId && selectedThreadId !== targetThreadId
        ? [selectedThreadId]
        : []
  if (base.includes(targetThreadId)) {
    return { threadIds: base, added: false, atLimit: false }
  }
  if (base.length >= limit) {
    return { threadIds: base, added: false, atLimit: true }
  }
  return { threadIds: [...base, targetThreadId], added: true, atLimit: false }
}

export function nextWorkbenchFocusAfterClose(currentThreadIds: string[], closedThreadId: string): string | null {
  const closedIndex = currentThreadIds.indexOf(closedThreadId)
  const nextThreadIds = currentThreadIds.filter((threadId) => threadId !== closedThreadId)
  if (nextThreadIds.length === 0) return null
  if (closedIndex < 0) return nextThreadIds.at(-1) ?? null
  const nextIndex = Math.min(closedIndex, nextThreadIds.length - 1)
  return nextThreadIds[nextIndex] ?? null
}

export function pickWorkbenchRecordKeys<T>(record: Record<string, T>, keys: Set<string>): Record<string, T> {
  let changed = false
  const next: Record<string, T> = {}
  for (const [key, value] of Object.entries(record)) {
    if (keys.has(key)) {
      next[key] = value
    } else {
      changed = true
    }
  }
  return changed ? next : record
}

export function pruneWorkbenchScope({
  threadIds,
  availableThreadIds,
  focusedThreadId,
  pendingThreadId,
  active,
  limit = 4,
}: WorkbenchScopePruneInput): WorkbenchScopePruneResult {
  const scopedThreadIds = Array.from(new Set(
    threadIds.filter((threadId) => availableThreadIds.has(threadId)),
  )).slice(0, limit)
  const scopedSet = new Set(scopedThreadIds)
  const nextFocusedThreadId =
    focusedThreadId && scopedSet.has(focusedThreadId)
      ? focusedThreadId
      : scopedThreadIds[0] ?? null
  const nextPendingThreadId =
    pendingThreadId && scopedSet.has(pendingThreadId)
      ? pendingThreadId
      : null
  const nextActive = active && scopedThreadIds.length > 0
  const changed =
    scopedThreadIds.length !== threadIds.length ||
    scopedThreadIds.some((threadId, index) => threadIds[index] !== threadId) ||
    nextFocusedThreadId !== focusedThreadId ||
    nextPendingThreadId !== pendingThreadId ||
    nextActive !== active

  return {
    threadIds: scopedThreadIds,
    focusedThreadId: nextFocusedThreadId,
    pendingThreadId: nextPendingThreadId,
    active: nextActive,
    changed,
  }
}
