import type { CartographyAtom } from '@atlas/domain'

export interface GearSceneProps {
  atom: CartographyAtom
  atomIndex: Record<string, CartographyAtom>
  onSatellite: (graphId: string) => void
  onBack: () => void
  onSubflow: () => void
  onLoop: () => void
}

export interface GearFichaField {
  label: string
  glyph: string
  val: string | null | undefined
  risk?: boolean
  next?: boolean
}

export interface GearModel {
  eyebrow: string
  fields: GearFichaField[]
  depends: CartographyAtom[]
  unblocks: CartographyAtom[]
}
