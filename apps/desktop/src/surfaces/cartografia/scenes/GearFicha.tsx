import type { GearFichaField } from './gearTypes'

export function GearFicha({ fields }: { fields: GearFichaField[] }) {
  return (
    <div className="focus-center-card">
      <div className="center-fields">
        {fields.map((field) => {
          const val = field.val || '—'
          const cls = `field-row${field.risk && val !== '—' ? ' risk' : ''}${field.next ? ' next' : ''}`
          return (
            <div key={field.label} className={cls}>
              <span className="field-label">
                <span className="fglyph">{field.glyph}</span>
                {field.label}
              </span>
              <span className="field-value">{val}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
