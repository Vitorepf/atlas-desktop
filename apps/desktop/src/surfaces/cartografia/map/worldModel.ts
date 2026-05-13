import type { CSSProperties } from 'react'
import type { CartographyAtom } from '@atlas/domain'
import type { VisualLens } from '../state/visualLens'
import { WORLD_HEIGHT, WORLD_WIDTH } from './layout'

interface WorldClassNameInput {
  visualLens: VisualLens
  animating: boolean
  isolatedId: string | null
  hoveredAtom: CartographyAtom | null
}

interface WorldTransformInput {
  transform: { x: number; y: number; scale: number }
}

export function worldClassName({
  visualLens,
  animating,
  isolatedId,
  hoveredAtom,
}: WorldClassNameInput): string {
  return [
    'world',
    `lens-${visualLens}`,
    !animating ? 'no-transition' : '',
    isolatedId ? 'isolate-mode' : '',
    isolatedId || hoveredAtom ? 'dim-others' : '',
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
