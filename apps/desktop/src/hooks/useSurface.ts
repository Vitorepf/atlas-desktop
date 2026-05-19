/**
 * useSurface · which surface (Atlas AI | Cartografia | Code | Atenção) is active.
 *
 * Atlas Desktop = single .app, multiple sovereign surfaces. State lives in
 * sessionStorage so reload preserves what you were looking at, but the
 * surface doesn't bleed across browser tabs (each surface is conceptually
 * a window).
 *
 * Canon:
 *   - docs/engineering-knowledge-base/atlas-code-attention-control-plane-v1.md
 *   - docs/engineering-knowledge-base/atlas-ai-conversation-surface-and-atlas-dev-v1.md
 *
 * Atlas AI é a surface diária de conversa/Atlas Dev. Não substitui Code; é a
 * camada anterior à Obra. Bug pequeno, debug, review e pesquisa técnica vivem
 * aqui sem exigir Forge.
 */
import { useCallback, useEffect, useState } from 'react'

export type Surface = 'code' | 'cartografia' | 'atencao' | 'atlas_ai' | 'control_plane'

const STORAGE_KEY = 'atlas-desktop:surface'

function readInitial(): Surface {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY)
    if (
      v === 'code' ||
      v === 'cartografia' ||
      v === 'atencao' ||
      v === 'atlas_ai' ||
      v === 'control_plane'
    )
      return v
  } catch {
    /* storage unavailable */
  }
  // Atlas AI é tela 1: começar pela conversa diária. Code aprofunda,
  // Atenção decide, Cartografia audita a verdade canônica. Control Plane
  // observa o Kernel novo (Meta 1-4) e fica em ⌘5.
  return 'atlas_ai'
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

  // Cmd+1..5 keyboard shortcuts mirror the SurfaceSwitcher reading order
  // (Atlas AI → Code → Atenção → Cartografia → Control Plane).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === '1') {
        e.preventDefault()
        setSurface('atlas_ai')
      } else if (e.key === '2') {
        e.preventDefault()
        setSurface('code')
      } else if (e.key === '3') {
        e.preventDefault()
        setSurface('atencao')
      } else if (e.key === '4') {
        e.preventDefault()
        setSurface('cartografia')
      } else if (e.key === '5') {
        e.preventDefault()
        setSurface('control_plane')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setSurface])

  return { surface, setSurface }
}
