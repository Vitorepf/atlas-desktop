import type { Obra } from '@atlas/domain'

interface ObraBarProps {
  obra: Obra
  decide?: { providers: string; confidence: number; gates: string; cost: string }
}

export function ObraBar({ obra, decide }: ObraBarProps) {
  const d = decide ?? {
    providers: 'claude sonnet 4 + codex',
    confidence: 0.87,
    gates: '5/9',
    cost: '$0.014',
  }

  return (
    <section className="obra-bar">
      <div style={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
        <span className="obra-id">{obra.id}</span>
        <span className="obra-objective">{obra.objective}</span>
      </div>
      <div />
      <div className="status-board">
        <span className="status-item"><span className="l">decide:</span><span className="v">{d.providers}</span></span>
        <span className="status-item"><span className="l">conf:</span><span className="v ok">{d.confidence.toFixed(2)}</span></span>
        <span className="status-item"><span className="l">gates:</span><span className="v">{d.gates}</span></span>
        <span className="status-item"><span className="l">cost:</span><span className="v">{d.cost}</span></span>
      </div>
    </section>
  )
}
