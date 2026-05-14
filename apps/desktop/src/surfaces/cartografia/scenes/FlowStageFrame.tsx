import { Fragment } from 'react'
import { LANE_LAYOUT, PIPELINE_LAYOUT, WORLD_HEIGHT } from '../map/layout'
import { FLOW_PHASES } from './flowModel'

interface FlowStageFrameProps {
  stepYs: number[]
}

export function FlowStageFrame({ stepYs }: FlowStageFrameProps) {
  return (
    <div className="flow-stage-frame" aria-hidden="true">
      <div
        className="flow-corridor corridor-intake"
        style={{
          left: 360,
          top: PIPELINE_LAYOUT.y + 70,
          width: PIPELINE_LAYOUT.x - 390,
          height: WORLD_HEIGHT - 190,
        }}
      />
      <div
        className="flow-corridor corridor-kernel"
        style={{
          left: PIPELINE_LAYOUT.x - 34,
          top: PIPELINE_LAYOUT.y + 34,
          width: PIPELINE_LAYOUT.w + 68,
          height: WORLD_HEIGHT - 128,
        }}
      />
      <div
        className="flow-corridor corridor-evidence"
        style={{
          left: PIPELINE_LAYOUT.x + PIPELINE_LAYOUT.w + 110,
          top: PIPELINE_LAYOUT.y + 86,
          width: LANE_LAYOUT['evidence-loop'].x - (PIPELINE_LAYOUT.x + PIPELINE_LAYOUT.w + 128),
          height: WORLD_HEIGHT - 210,
        }}
      />
      <div
        className="flow-machine-spine"
        style={{
          left: PIPELINE_LAYOUT.x - 28,
          top: PIPELINE_LAYOUT.y + 50,
          height: PIPELINE_LAYOUT.runtimeHeight + PIPELINE_LAYOUT.stepHeight * 15,
        }}
      />
      {FLOW_PHASES.map((phase, idx) => {
        const phaseTop = (stepYs[phase.from - 1] ?? PIPELINE_LAYOUT.y) - 6
        return (
          <Fragment key={phase.label}>
            {/* Pass L · hairline editorial separando capítulos do pipeline.
                Pula a primeira fase (intake) — capítulo de abertura não precisa
                de quebra acima. */}
            {idx > 0 ? (
              <div
                className={`flow-phase-divider phase-${phase.label}-divider`}
                style={{
                  left: PIPELINE_LAYOUT.x - 112,
                  top: phaseTop - 18,
                  width: PIPELINE_LAYOUT.w + 132,
                }}
                aria-hidden="true"
              />
            ) : null}
            <div
              className={`flow-phase phase-${phase.label}`}
              style={{
                left: PIPELINE_LAYOUT.x - 112,
                top: phaseTop,
                height:
                  ((stepYs[phase.to - 1] ?? PIPELINE_LAYOUT.y) -
                    (stepYs[phase.from - 1] ?? PIPELINE_LAYOUT.y)) +
                  PIPELINE_LAYOUT.stepHeight -
                  10,
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
