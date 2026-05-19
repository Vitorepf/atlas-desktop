import type { CartographyAtom } from '@atlas/domain'
import type { FichaField } from './types'

export function buildFichaFields(atom: CartographyAtom): FichaField[] {
  return [
    { label: 'Entrada', glyph: '↑', val: atom.input },
    { label: 'Saída', glyph: '↓', val: atom.output },
    {
      label: 'Depende de',
      glyph: '←',
      val: (atom.depends ?? []).map((id) => id).join(' · ') || null,
    },
    {
      label: 'Alimenta',
      glyph: '→',
      val: (atom.unblocks ?? []).map((id) => id).join(' · ') || null,
    },
    { label: 'Evidência', glyph: '☷', val: atom.evidence },
    { label: 'Gargalo', glyph: '△', val: atom.risk, risk: true },
    { label: 'Próxima ação', glyph: '✦', val: atom.next, next: true },
  ]
}
