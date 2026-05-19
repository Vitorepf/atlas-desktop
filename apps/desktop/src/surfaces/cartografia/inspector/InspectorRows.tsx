export function FitRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="fit-row">
      <span>{label}</span>
      <strong className={mono ? 'mono' : ''}>{value}</strong>
    </div>
  )
}

export function ActionRow({
  label,
  glyph,
  onClick,
  disabled = false,
}: {
  label: string
  glyph: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className="ins-action"
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: 'none',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        padding: 0,
        font: 'inherit',
        color: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span className="a-label">{label}</span>
      <span className="a-glyph">{glyph}</span>
    </button>
  )
}
