import { useRef } from 'react'

const DOUBLE_CLICK_MS = 320

export function useAtomActivation({
  graphId,
  onIsolate,
  onFocus,
}: {
  graphId: string
  onIsolate?: (graphId: string) => void
  onFocus?: (graphId: string) => void
}) {
  const lastClickRef = useRef<{ ts: number; timer: number | null }>({ ts: 0, timer: null })

  return function handleClick(event: React.MouseEvent) {
    event.stopPropagation()
    const now = Date.now()
    const last = lastClickRef.current
    if (now - last.ts < DOUBLE_CLICK_MS) {
      if (last.timer != null) {
        window.clearTimeout(last.timer)
        last.timer = null
      }
      last.ts = 0
      onFocus?.(graphId)
      return
    }

    last.ts = now
    if (last.timer != null) window.clearTimeout(last.timer)
    last.timer = window.setTimeout(() => {
      last.timer = null
      onIsolate?.(graphId)
    }, DOUBLE_CLICK_MS)
  }
}
