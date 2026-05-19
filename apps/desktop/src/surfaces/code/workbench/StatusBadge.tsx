import type { WorkbenchTone } from './tokens'

/**
 * Premium status badge · pílula compacta com dot + label, em tom semântico.
 * Usada em rows, headers, decision inbox itens, safety strip.
 */
export function StatusBadge({
  label,
  tone = 'neutral',
  withDot = true,
  title,
}: {
  label: string
  tone?: WorkbenchTone
  withDot?: boolean
  title?: string
}) {
  return (
    <span className="cc-badge" data-tone={tone} title={title}>
      {withDot ? (
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: 999,
            background: `var(--cc-${tone === 'neutral' ? 'neutral' : tone})`,
          }}
        />
      ) : null}
      <span>{label}</span>
    </span>
  )
}
