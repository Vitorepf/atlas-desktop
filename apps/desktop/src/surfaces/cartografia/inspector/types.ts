export interface FichaField {
  label: string
  glyph: string
  val: string | null | undefined
  risk?: boolean
  next?: boolean
}
