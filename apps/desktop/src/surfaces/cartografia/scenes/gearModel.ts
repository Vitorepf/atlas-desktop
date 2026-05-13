import type { CartographyAtom } from '@atlas/domain'
import { toRoman } from '../map/layout'
import type { GearModel } from './gearTypes'

export function buildGearModel(atom: CartographyAtom, atomIndex: Record<string, CartographyAtom>): GearModel {
  const isPipeline = atom.kind === 'pipeline'
  return {
    eyebrow: isPipeline
      ? `Atlas · AI Kernel · ${toRoman(atom.graphOrder ?? 0)}`
      : `Atlas · ${atom.regionHead ?? 'Lateral'}`,
    fields: [
      { label: 'Entrada', glyph: '↑', val: atom.input },
      { label: 'Saída', glyph: '↓', val: atom.output },
      { label: 'Evidência', glyph: '☷', val: atom.evidence },
      { label: 'Gargalo', glyph: '△', val: atom.risk, risk: true },
      { label: 'Próxima ação', glyph: '✦', val: atom.next, next: true },
    ],
    depends: resolveAtoms(atom.depends, atomIndex),
    unblocks: resolveAtoms(atom.unblocks, atomIndex),
  }
}

function resolveAtoms(
  graphIds: string[] | undefined,
  atomIndex: Record<string, CartographyAtom>
): CartographyAtom[] {
  return (graphIds ?? [])
    .map((graphId) => atomIndex[graphId])
    .filter((atom): atom is CartographyAtom => Boolean(atom))
}
