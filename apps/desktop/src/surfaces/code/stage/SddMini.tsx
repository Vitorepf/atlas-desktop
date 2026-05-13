import type { SddStage } from '@atlas/domain'

const stateGlyph: Record<SddStage['state'], string> = {
  done: '✓',
  now: '⏳',
  todo: '○',
  blocked: '△',
}

export function SddMini({ stages, receiptHash }: { stages: SddStage[]; receiptHash: string }) {
  const doneCount = stages.filter((s) => s.state === 'done').length
  const totalCount = stages.length

  return (
    <div className="sdd-mini">
      <span className="label">SDD</span>
      <div className="stages">
        {stages.map((s) => (
          <span key={s.id} className={`stage ${s.state}`}>
            <span className="glyph">{stateGlyph[s.state]}</span>
            {s.label}
          </span>
        ))}
      </div>
      <span className="meta">
        {doneCount}/{totalCount}
        {receiptHash ? <> · receipt <span className="v">{receiptHash.slice(0, 6)}</span></> : null}
      </span>
    </div>
  )
}
