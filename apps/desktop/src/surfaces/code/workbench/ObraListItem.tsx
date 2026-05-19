import { StatusDot } from './StatusDot'
import type { StatusKind } from './tokens'

/**
 * Premium Obra row · short_id em mono + título em sans semibold + meta
 * (status/workspace/última atividade). Active state inequívoco com borda
 * lateral accent. Hover/focus calmos. Estado animado em "running"/"queued".
 */
export function ObraListItem({
  shortId,
  title,
  status,
  statusLabel,
  hint,
  active = false,
  disabled = false,
  onClick,
}: {
  shortId: string
  title: string
  status: StatusKind | string
  statusLabel: string
  hint?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="listitem"
      className="cc-obra-row"
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? 'true' : undefined}
      aria-label={`Obra ${shortId} · ${title} · ${statusLabel}`}
      title={title}
    >
      <div className="cc-obra-row-head">
        <StatusDot status={status} />
        <span className="cc-obra-row-id">{shortId}</span>
        <span className="cc-obra-row-title">{title}</span>
      </div>
      <div className="cc-obra-row-meta">
        <span>{statusLabel}</span>
        {hint ? (
          <>
            <span className="sep">·</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {hint}
            </span>
          </>
        ) : null}
      </div>
    </button>
  )
}
