import type { CSSProperties } from 'react'
import type { CartographyAtom } from '@atlas/domain'
import type { VisualLens } from '../state/visualLens'
import { WORLD_HEIGHT, WORLD_WIDTH } from './layout'

interface WorldClassNameInput {
  visualLens: VisualLens
  animating: boolean
  isolatedId: string | null
  hoveredAtom: CartographyAtom | null
  scale: number
  /** Reading mode (Agente J · narrativa sequencial). */
  readingMode?: boolean
  /** Densidade visual: comfortable cresce o ar, compact mantém canon atual. */
  density?: 'comfortable' | 'compact'
}

interface WorldTransformInput {
  transform: { x: number; y: number; scale: number }
}

export type SemanticZoomLevel = 'far' | 'mid' | 'close'

export function semanticZoomLevel(scale: number): SemanticZoomLevel {
  if (scale < 0.65) return 'far'
  if (scale < 1.15) return 'mid'
  return 'close'
}

export function worldClassName({
  visualLens,
  animating,
  isolatedId,
  hoveredAtom,
  scale,
  readingMode,
  density,
}: WorldClassNameInput): string {
  return [
    'world',
    `lens-${visualLens}`,
    `zoom-${semanticZoomLevel(scale)}`,
    !animating ? 'no-transition' : '',
    isolatedId ? 'isolate-mode' : '',
    isolatedId || hoveredAtom ? 'dim-others' : '',
    readingMode ? 'reading-mode' : '',
    density ? `density-${density}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function worldStyle({ transform }: WorldTransformInput): CSSProperties {
  return {
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  }
}
