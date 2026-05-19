import type { RouteDraft } from './trailTypes'

export function pathDomId(key: string): string {
  return `trail-motion-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

export function hashDelay(from: string, to: string): number {
  const source = `${from}:${to}`
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 997
  }
  return round((hash % 120) / -100)
}

export function movementProfile(
  draft: RouteDraft,
  lane: number
): { duration: number; delay: number; packets: number } {
  const distance = Math.hypot(draft.to.cx - draft.from.cx, draft.to.cy - draft.from.cy)
  const base = draft.connection.kind === 'feedback' ? 4.2 : 3.2
  const duration = round(base + Math.min(distance / 720, 1.1) + lane * 0.18)
  const packets = draft.active ? 3 : draft.connection.kind === 'feedback' ? 2 : 2
  return {
    duration,
    delay: hashDelay(draft.connection.from, draft.connection.to),
    packets,
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
