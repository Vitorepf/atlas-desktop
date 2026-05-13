/**
 * useSurface · which surface (Code | Cartografia) is active.
 *
 * Atlas Desktop = single .app, multiple sovereign surfaces. State lives in
 * sessionStorage so reload preserves what you were looking at, but the
 * surface doesn't bleed across browser tabs (each surface is conceptually
 * a window).
 */
import { useCallback, useEffect, useState } from 'react'

export type Surface = 'code' | 'cartografia'

const STORAGE_KEY = 'atlas-desktop:surface'

function readInitial(): Surface {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY)
    if (v === 'code' || v === 'cartografia') return v
  } catch {
    /* storage unavailable */
  }
  // Cartografia é tela 1 (mapa da verdade canônica entra antes da cabine).
  return 'cartografia'
}

export function useSurface(): {
  surface: Surface
  setSurface: (s: Surface) => void
} {
  const [surface, setSurfaceState] = useState<Surface>(readInitial)

  const setSurface = useCallback((s: Surface) => {
    setSurfaceState(s)
    try {
      sessionStorage.setItem(STORAGE_KEY, s)
    } catch {
      /* ignore */
    }
  }, [])

  // Cmd+1 / Cmd+2 keyboard shortcuts mirror macOS native conventions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === '1') {
        e.preventDefault()
        setSurface('cartografia')
      } else if (e.key === '2') {
        e.preventDefault()
        setSurface('code')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setSurface])

  return { surface, setSurface }
}
