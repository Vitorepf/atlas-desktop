import type { FichaField } from './types'

export function Ficha({ fields }: { fields: FichaField[] }) {
  const hasAny = fields.some((field) => field.val)
  if (!hasAny) return null

  return (
    <div className="ficha-7">
      {fields.map((field) => {
        const val = field.val || '—'
        const cls = `row${field.risk && val !== '—' ? ' risk' : ''}${field.next ? ' next' : ''}`
        return (
          <div key={field.label} className={cls}>
            <span className="label">
              <span className="glyph">{field.glyph}</span>
              {field.label}
            </span>
            <span className={`value${val === '—' ? ' empty' : ''}`}>{val}</span>
          </div>
        )
      })}
    </div>
  )
}
