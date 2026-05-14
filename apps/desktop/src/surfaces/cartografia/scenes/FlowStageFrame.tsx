import { Fragment } from 'react'
import { LANE_LAYOUT, PIPELINE_LAYOUT, WORLD_HEIGHT } from '../map/layout'
import { FLOW_PHASES } from './flowModel'

interface FlowStageFrameProps {
  stepYs: number[]
}

export function FlowStageFrame({ stepYs }: FlowStageFrameProps) {
  return (
    <div className="flow-stage-frame" aria-hidden="true">
      {/* Offsets mágicos canon × 5 (Pass 5×). */}
      <div
        className="flow-corridor corridor-intake"
        style={{
          left: 1800,
          top: PIPELINE_LAYOUT.y + 350,
          width: PIPELINE_LAYOUT.x - 1950,
          height: WORLD_HEIGHT - 950,
        }}
      />
      <div
        className="flow-corridor corridor-kernel"
        style={{
          left: PIPELINE_LAYOUT.x - 170,
          top: PIPELINE_LAYOUT.y + 170,
          width: PIPELINE_LAYOUT.w + 340,
          height: WORLD_HEIGHT - 640,
        }}
      />
      <div
        className="flow-corridor corridor-evidence"
        style={{
          left: PIPELINE_LAYOUT.x + PIPELINE_LAYOUT.w + 550,
          top: PIPELINE_LAYOUT.y + 430,
          width: LANE_LAYOUT['evidence-loop'].x - (PIPELINE_LAYOUT.x + PIPELINE_LAYOUT.w + 640),
          height: WORLD_HEIGHT - 1050,
        }}
      />
      <div
        className="flow-machine-spine"
        style={{
          left: PIPELINE_LAYOUT.x - 140,
          top: PIPELINE_LAYOUT.y + 250,
          height: PIPELINE_LAYOUT.runtimeHeight + PIPELINE_LAYOUT.stepHeight * 15,
        }}
      />
      {FLOW_PHASES.map((phase, idx) => {
        const phaseTop = (stepYs[phase.from - 1] ?? PIPELINE_LAYOUT.y) - 30
        return (
          <Fragment key={phase.label}>
            {/* Pass L · hairline editorial separando capítulos do pipeline.
                Pula a primeira fase (intake) — capítulo de abertura não precisa
                de quebra acima. Offsets × 5 (Pass 5×). */}
            {idx > 0 ? (
              <div
                className={`flow-phase-divider phase-${phase.label}-divider`}
                style={{
                  left: PIPELINE_LAYOUT.x - 560,
                  top: phaseTop - 90,
                  width: PIPELINE_LAYOUT.w + 660,
                }}
                aria-hidden="true"
              />
            ) : null}
            <div
              className={`flow-phase phase-${phase.label}`}
              style={{
                left: PIPELINE_LAYOUT.x - 560,
                top: phaseTop,
                height:
                  ((stepYs[phase.to - 1] ?? PIPELINE_LAYOUT.y) -
                    (stepYs[phase.from - 1] ?? PIPELINE_LAYOUT.y)) +
                  PIPELINE_LAYOUT.stepHeight -
                  50,
              }}
            >
              <span className="phase-icon">{phase.icon}</span>
              <span className="phase-label">{phase.label}</span>
              <span className="phase-deck">{phase.deck}</span>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
